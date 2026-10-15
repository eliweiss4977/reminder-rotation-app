// The Satkin Protocol Schedule Engine
// Calculates base intervals, special fixed time overlays, deduplication, and multi-day notification timestamps

export const INTERVAL_MODES = {
  TWO_HOURS: '2_HOURS',       // 120 minutes
  ONE_POINT_FIVE_HOURS: '1_5_HOURS', // 90 minutes
  CUSTOM: 'CUSTOM_INTERVAL'
};

export const SPECIAL_MODES = {
  PLUS_2_AND_7: 'PLUS_2_AND_7', // 14:00 and 19:00
  PLUS_4_AND_7: 'PLUS_4_AND_7', // 16:00 and 19:00
  NONE: 'NONE',                 // Interval only
  CUSTOM: 'CUSTOM_FIXED'        // User defined array of HH:MM
};

export const DEFAULT_CONFIG = {
  startTime: '07:00',
  cutoffTime: '22:30',
  intervalMode: INTERVAL_MODES.TWO_HOURS,
  customIntervalMinutes: 120,
  specialMode: SPECIAL_MODES.PLUS_2_AND_7,
  customFixedTimes: ['14:00', '19:00'],
  pacerTicksGoal: 40,
  waterGlassesGoal: 8,
};

// Convert "HH:MM" (24h) to total minutes from 00:00
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Convert total minutes to "HH:MM" 24h string
export function minutesToTime(totalMins) {
  const norm = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Format "HH:MM" or minutes into friendly 12h display e.g. "7:00 AM", "2:00 PM"
export function formatDisplayTime(input) {
  let mins = typeof input === 'number' ? input : timeToMinutes(input);
  mins = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${ampm}`;
}

// Get the active interval duration in minutes
export function getIntervalDurationMinutes(config) {
  if (config.intervalMode === INTERVAL_MODES.TWO_HOURS) return 120;
  if (config.intervalMode === INTERVAL_MODES.ONE_POINT_FIVE_HOURS) return 90;
  if (config.intervalMode === INTERVAL_MODES.CUSTOM) {
    const custom = parseInt(config.customIntervalMinutes, 10);
    return !isNaN(custom) && custom > 15 ? custom : 120;
  }
  return 120;
}

// Get active special overlay fixed minutes
export function getSpecialFixedMinutes(config) {
  if (config.specialMode === SPECIAL_MODES.PLUS_2_AND_7) {
    // 2:00 PM (14:00 = 840) and 7:00 PM (19:00 = 1140)
    return [
      { minutes: 840, label: 'Special (2:00 PM)' },
      { minutes: 1140, label: 'Special (7:00 PM)' }
    ];
  }
  if (config.specialMode === SPECIAL_MODES.PLUS_4_AND_7) {
    // 4:00 PM (16:00 = 960) and 7:00 PM (19:00 = 1140)
    return [
      { minutes: 960, label: 'Special (4:00 PM)' },
      { minutes: 1140, label: 'Special (7:00 PM)' }
    ];
  }
  if (config.specialMode === SPECIAL_MODES.CUSTOM) {
    const list = Array.isArray(config.customFixedTimes) ? config.customFixedTimes : [];
    return list.map(tStr => {
      const mins = timeToMinutes(tStr);
      return { minutes: mins, label: `Special (${formatDisplayTime(mins)})` };
    });
  }
  return [];
}

/**
 * Calculates a single day's merged and deduplicated Satkin schedule.
 */
export function calculateDailySchedule(config = DEFAULT_CONFIG) {
  const startMins = timeToMinutes(config.startTime || '07:00');
  const cutoffMins = timeToMinutes(config.cutoffTime || '22:30');
  const intervalMins = getIntervalDurationMinutes(config);

  const slotMap = new Map(); // minutes -> Slot object

  // 1. Generate Base Interval Slots
  let curr = startMins;
  while (curr <= cutoffMins) {
    const time24 = minutesToTime(curr);
    slotMap.set(curr, {
      id: `slot_${time24.replace(':', '')}`,
      minutes: curr,
      time24,
      displayTime: formatDisplayTime(curr),
      isInterval: true,
      isSpecial: false,
      badgeLabel: 'Interval',
      badgeType: 'interval' // 'interval', 'special', 'merged'
    });
    curr += intervalMins;
  }

  // 2. Generate and Merge Special Fixed Times
  const specialList = getSpecialFixedMinutes(config);
  for (const item of specialList) {
    const m = item.minutes;
    // Check if slot already exists at this exact minute
    if (slotMap.has(m)) {
      const existing = slotMap.get(m);
      existing.isSpecial = true;
      existing.badgeLabel = 'Interval + Special';
      existing.badgeType = 'merged';
    } else {
      const time24 = minutesToTime(m);
      slotMap.set(m, {
        id: `slot_${time24.replace(':', '')}`,
        minutes: m,
        time24,
        displayTime: formatDisplayTime(m),
        isInterval: false,
        isSpecial: true,
        badgeLabel: item.label,
        badgeType: 'special'
      });
    }
  }

  // 3. Sort Chronologically
  const sorted = Array.from(slotMap.values()).sort((a, b) => a.minutes - b.minutes);
  return sorted;
}

/**
 * Calculates slot statuses for today:
 * - 'completed': user has checked it off / finished 40x
 * - 'next_up': the upcoming or current rotation
 * - 'missed': elapsed by > 35 minutes and not completed
 * - 'upcoming': future slot
 */
export function computeScheduleWithStatuses(schedule, completedMap = {}, currentDate = new Date()) {
  const currentMins = currentDate.getHours() * 60 + currentDate.getMinutes();
  const dateKey = currentDate.toISOString().split('T')[0];
  const dayCompleted = completedMap[dateKey] || {};

  // First pass: assign completion & timing relative to now
  const enriched = schedule.map(slot => {
    const isCompleted = !!dayCompleted[slot.id];
    const completedAt = dayCompleted[slot.id]?.completedAt || null;
    const diff = slot.minutes - currentMins;

    return {
      ...slot,
      isCompleted,
      completedAt,
      diffMinutes: diff,
      isPast: diff < -5
    };
  });

  // Find the single 'next_up' slot:
  // First uncompleted slot that is not far in the past, or first upcoming
  let nextUpId = null;
  for (const slot of enriched) {
    if (!slot.isCompleted) {
      if (slot.diffMinutes >= -30) {
        nextUpId = slot.id;
        break;
      }
    }
  }

  // If all future ones completed or all past, check first future uncompleted
  if (!nextUpId) {
    const futureUncompleted = enriched.find(s => !s.isCompleted && s.diffMinutes > 0);
    if (futureUncompleted) {
      nextUpId = futureUncompleted.id;
    }
  }

  return enriched.map(slot => {
    let status = 'upcoming';
    if (slot.isCompleted) {
      status = 'completed';
    } else if (slot.id === nextUpId) {
      status = 'next_up';
    } else if (slot.diffMinutes < -35) {
      status = 'missed';
    } else {
      status = 'upcoming';
    }
    return { ...slot, status };
  });
}

/**
 * Calculates notifications for the next 5 days.
 * Keeps count safely between 40-55 notifications (< 64 iOS ceiling).
 */
export function calculateNext5DaysNotificationSlots(config = DEFAULT_CONFIG, startDate = new Date()) {
  const dailySlots = calculateDailySchedule(config);
  const scheduledNotifications = [];
  const now = startDate.getTime();

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setSeconds(0, 0);

    for (const slot of dailySlots) {
      const slotDate = new Date(targetDate);
      const h = Math.floor(slot.minutes / 60);
      const m = slot.minutes % 60;
      slotDate.setHours(h, m, 0, 0);

      const timestamp = slotDate.getTime();

      // Only schedule if at least 15 seconds in the future
      if (timestamp > now + 15000) {
        const dateStr = slotDate.toISOString().slice(0, 10).replace(/-/g, '');
        // Stable integer ID for Capacitor LocalNotifications
        const notifId = parseInt(`${dayOffset + 1}${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`, 10);

        scheduledNotifications.push({
          id: notifId,
          slotId: slot.id,
          at: slotDate,
          timestamp,
          time24: slot.time24,
          displayTime: slot.displayTime,
          badgeLabel: slot.badgeLabel,
          title: 'Rotate Ear Balls (40x Sitting)',
          body: `Sit down comfortably and rotate 40 times. (${slot.displayTime} ${slot.badgeLabel}). Tap to open the 40x Pacer.`
        });
      }
    }
  }

  return scheduledNotifications;
}
