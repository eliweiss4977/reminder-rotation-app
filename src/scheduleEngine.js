// Multi-Profile Reminder & Habit Engine
// Supports independent reminder profiles (Satkin, Water, Habit), custom durations, active windows,
// smart timeline merging, and native 5-day notifications scheduling.

export const PROFILE_CATEGORIES = {
  SATKIN: 'satkin',
  WATER: 'water',
  HABIT: 'habit'
};

export const CATEGORY_THEMES = {
  satkin: {
    label: 'Satkin 40x',
    colorName: 'indigo',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
    dotClass: 'bg-indigo-400',
    btnClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    icon: 'rotate'
  },
  water: {
    label: 'Hydration',
    colorName: 'cyan',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
    dotClass: 'bg-cyan-400',
    btnClass: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    icon: 'water'
  },
  habit: {
    label: 'Habit',
    colorName: 'emerald',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    dotClass: 'bg-emerald-400',
    btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    icon: 'check'
  }
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
  const m = normMinutes(mins % 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

function normMinutes(m) {
  return String(m).padStart(2, '0');
}

/**
 * Calculates expiration timestamp in milliseconds for a profile.
 * Returns Infinity if indefinite.
 */
export function getProfileExpirationTimestamp(profile) {
  if (!profile || profile.durationType === 'indefinite' || !profile.durationValue) {
    return Infinity;
  }
  const activatedAt = profile.activatedAt || Date.now();
  if (profile.durationType === 'days') {
    return activatedAt + (profile.durationValue * 24 * 60 * 60 * 1000);
  }
  if (profile.durationType === 'hours') {
    return activatedAt + (profile.durationValue * 60 * 60 * 1000);
  }
  return Infinity;
}

/**
 * Checks if a profile has expired based on its duration setting.
 */
export function isProfileExpired(profile, now = Date.now()) {
  if (!profile.enabled) return false;
  const exp = getProfileExpirationTimestamp(profile);
  return now >= exp;
}

/**
 * Friendly badge text for profile duration (e.g., "Active • 5 days left", "Active • 4h 20m left")
 */
export function getProfileRemainingText(profile, now = Date.now()) {
  if (!profile.enabled) return 'Inactive';
  if (profile.durationType === 'indefinite') return 'Always Active';

  const exp = getProfileExpirationTimestamp(profile);
  const remainingMs = exp - now;

  if (remainingMs <= 0) return 'Expired';

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  if (totalHours >= 24) {
    const days = Math.ceil(totalHours / 24);
    return `Active • ${days}d left`;
  } else {
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Active • ${hours}h ${mins}m left`;
  }
}

/**
 * Calculates daily slots for a single profile.
 */
export function calculateProfileDailySlots(profile, targetDate = new Date()) {
  // If disabled or expired at the target date, produce no slots
  const targetMidnight = new Date(targetDate);
  targetMidnight.setHours(0, 0, 0, 0);

  if (!profile.enabled) return [];
  const exp = getProfileExpirationTimestamp(profile);
  if (targetMidnight.getTime() >= exp) return [];

  const startMins = timeToMinutes(profile.startTime || '07:00');
  const endMins = timeToMinutes(profile.endTime || '22:30');
  const intervalMins = parseInt(profile.intervalMinutes, 10) || 0;

  const slotMap = new Map();

  // 1. Base interval generation (if interval > 0)
  if (intervalMins > 0) {
    let curr = startMins;
    while (curr <= endMins) {
      const time24 = minutesToTime(curr);
      const slotId = `${profile.id}_${time24.replace(':', '')}`;
      slotMap.set(curr, {
        id: slotId,
        profileId: profile.id,
        profileName: profile.name,
        category: profile.category,
        actionType: profile.actionType || 'check_off',
        minutes: curr,
        time24,
        displayTime: formatDisplayTime(curr),
        isInterval: true,
        isSpecial: false,
        badgeLabel: 'Interval',
        badgeType: 'interval'
      });
      curr += intervalMins;
    }
  }

  // 2. Special fixed times overlay
  const fixedTimes = Array.isArray(profile.specialFixedTimes) ? profile.specialFixedTimes : [];
  for (const timeStr of fixedTimes) {
    const m = timeToMinutes(timeStr);
    const time24 = minutesToTime(m);
    const slotId = `${profile.id}_${time24.replace(':', '')}`;

    if (slotMap.has(m)) {
      // Landed on exact same minute: merge
      const existing = slotMap.get(m);
      existing.isSpecial = true;
      existing.badgeLabel = 'Interval + Special';
      existing.badgeType = 'merged';
    } else {
      slotMap.set(m, {
        id: slotId,
        profileId: profile.id,
        profileName: profile.name,
        category: profile.category,
        actionType: profile.actionType || 'check_off',
        minutes: m,
        time24,
        displayTime: formatDisplayTime(m),
        isInterval: false,
        isSpecial: true,
        badgeLabel: `Special (${formatDisplayTime(m)})`,
        badgeType: 'special'
      });
    }
  }

  return Array.from(slotMap.values());
}

/**
 * Merges all active profiles into a single unified daily schedule with statuses.
 */
export function calculateMergedMultiProfileSchedule(profiles, completedMap = {}, currentDate = new Date()) {
  const currentMins = currentDate.getHours() * 60 + currentDate.getMinutes();
  const dateKey = currentDate.toISOString().split('T')[0];
  const dayCompleted = completedMap[dateKey] || {};

  const allSlots = [];

  for (const profile of profiles) {
    if (profile.enabled && !isProfileExpired(profile, currentDate.getTime())) {
      const profileSlots = calculateProfileDailySlots(profile, currentDate);
      allSlots.push(...profileSlots);
    }
  }

  // Sort chronologically by minutes; tiebreaker by category (satkin first, then water, then habit)
  const categoryOrder = { satkin: 1, water: 2, habit: 3 };
  allSlots.sort((a, b) => {
    if (a.minutes !== b.minutes) return a.minutes - b.minutes;
    return (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
  });

  // Assign completed status & calculate next up
  const enriched = allSlots.map(slot => {
    const isCompleted = !!dayCompleted[slot.id];
    const completedAt = dayCompleted[slot.id]?.completedAt || null;
    const diff = slot.minutes - currentMins;

    return {
      ...slot,
      isCompleted,
      completedAt,
      diffMinutes: diff
    };
  });

  // Find next upcoming uncompleted slot
  let nextUpId = null;
  for (const slot of enriched) {
    if (!slot.isCompleted && slot.diffMinutes >= -30) {
      nextUpId = slot.id;
      break;
    }
  }
  if (!nextUpId) {
    const future = enriched.find(s => !s.isCompleted && s.diffMinutes > 0);
    if (future) nextUpId = future.id;
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
 * Calculates multi-profile notifications across the next 5 days.
 * Respects each profile's duration expiration and category notification templates.
 */
export function calculateMultiProfile5DaysNotificationSlots(profiles, startDate = new Date()) {
  const scheduledNotifications = [];
  const now = startDate.getTime();

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);

    for (const profile of profiles) {
      if (!profile.enabled) continue;
      const expirationMs = getProfileExpirationTimestamp(profile);

      const profileSlots = calculateProfileDailySlots(profile, targetDate);

      for (const slot of profileSlots) {
        const slotDate = new Date(targetDate);
        const h = Math.floor(slot.minutes / 60);
        const m = slot.minutes % 60;
        slotDate.setHours(h, m, 0, 0);

        const timestamp = slotDate.getTime();

        // Must be in future, and before the profile's duration expiration
        if (timestamp > now + 15000 && timestamp <= expirationMs) {
          // Generate a stable 32-bit positive integer notification ID
          const profileHash = Math.abs(hashCode(profile.id)) % 1000;
          const notifId = (dayOffset + 1) * 100000 + profileHash * 100 + (h * 60 + m) % 100;

          // Notification title & body customized per category
          let title = `🔄 ${profile.name}`;
          let body = 'Sit down and rotate ear balls 40 times.';

          if (profile.category === PROFILE_CATEGORIES.WATER) {
            title = `💧 ${profile.name}`;
            body = 'Time to drink a glass of water!';
          } else if (profile.category === PROFILE_CATEGORIES.HABIT) {
            title = `✨ ${profile.name}`;
            body = 'Time for your scheduled habit check-in.';
          }

          scheduledNotifications.push({
            id: notifId,
            slotId: slot.id,
            profileId: profile.id,
            category: profile.category,
            actionType: profile.actionType,
            at: slotDate,
            timestamp,
            title,
            body,
            displayTime: slot.displayTime,
            badgeLabel: slot.badgeLabel
          });
        }
      }
    }
  }

  // Sort chronologically and cap at 55 to stay safely under iOS 64 limit
  scheduledNotifications.sort((a, b) => a.timestamp - b.timestamp);
  return scheduledNotifications.slice(0, 55);
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
