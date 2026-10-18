// Persistence engine using @capacitor/preferences with localStorage fallback
import { Preferences } from '@capacitor/preferences';

export const ALARM_TEMPLATES = [
  {
    id: 'template_satkin_2h',
    name: 'Every 2 Hours (Satkin 40x)',
    category: 'satkin',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: [],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_classic',
    badge: 'Popular',
    icon: '🔄',
    description: 'Standard 40x acupressure rotation every 2h from 7 AM to 11 PM'
  },
  {
    id: 'template_satkin_2h_2_7',
    name: 'Every 2h + 2:00 & 7:00 PM (Satkin 40x)',
    category: 'satkin',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: ['14:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_classic',
    badge: 'Recommended',
    icon: '⭐',
    description: '2h schedule + afternoon (2 PM) & evening (7 PM) priority acupressure'
  },
  {
    id: 'template_satkin_2h_3_7',
    name: 'Every 2h + 3:00 & 7:00 PM (Satkin 40x)',
    category: 'satkin',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: ['15:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_crystal',
    badge: 'Alternative',
    icon: '🕒',
    description: '2h schedule with 3:00 PM & 7:00 PM key acupressure checkpoints'
  },
  {
    id: 'template_satkin_1_5h_4_7',
    name: 'Every 1.5h + 4:00 & 7:00 PM (Satkin 40x)',
    category: 'satkin',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 90,
    specialFixedTimes: ['16:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_crystal',
    badge: 'Intense',
    icon: '⚡',
    description: 'Accelerated 90-min protocol with 4 PM & 7 PM checkpoints'
  },
  {
    id: 'template_drink_water',
    name: 'Drink 1 Glass of Water',
    category: 'water',
    actionType: 'log_water',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: [],
    durationType: 'indefinite',
    durationValue: 0,
    ringtone: 'ring_double',
    badge: 'Hydration',
    icon: '💧',
    description: 'Stay hydrated with a glass of water every 2 hours until 11 PM'
  },
  {
    id: 'template_walk_movement',
    name: 'Walk / Movement Break',
    category: 'habit',
    actionType: 'check_off',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 180,
    specialFixedTimes: [],
    durationType: 'indefinite',
    durationValue: 0,
    ringtone: 'ring_marimba',
    badge: 'Posture',
    icon: '🚶',
    description: 'Stand up, stretch and walk for 5 minutes every 3 hours'
  },
  {
    id: 'template_morning_weigh_in',
    name: 'Morning Weigh-In',
    category: 'weight',
    actionType: 'log_weight',
    startTime: '07:15',
    endTime: '08:30',
    intervalMinutes: 0,
    specialFixedTimes: ['07:15'],
    durationType: 'indefinite',
    durationValue: 0,
    ringtone: 'ring_woodblock',
    badge: 'Daily',
    icon: '⚖️',
    description: 'Consistent morning weigh-in right after waking up'
  },
  {
    id: 'template_custom_alarm',
    name: 'Custom Alarm / Reminder',
    category: 'satkin',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: [],
    durationType: 'indefinite',
    durationValue: 0,
    ringtone: 'ring_classic',
    badge: 'Custom',
    icon: '🎯',
    description: 'Build your own custom reminder times, cadence & ringtone'
  }
];

export const INITIAL_PROFILES = [
  {
    id: 'prof_morning_weigh_in',
    name: 'Morning Weigh-In',
    category: 'weight',
    enabled: true,
    startTime: '07:15',
    endTime: '08:30',
    intervalMinutes: 0,
    specialFixedTimes: ['07:15'],
    durationType: 'indefinite',
    durationValue: 0,
    ringtone: 'ring_woodblock',
    activatedAt: Date.now(),
    actionType: 'log_weight'
  },
  {
    id: 'prof_satkin_a',
    name: 'Satkin Protocol (2h + 2:00 & 7:00)',
    category: 'satkin',
    enabled: true,
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: ['14:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_classic',
    activatedAt: Date.now(),
    actionType: 'pacer_40'
  },
  {
    id: 'prof_satkin_b',
    name: 'Satkin Protocol (1.5h + 4:00 & 7:00)',
    category: 'satkin',
    enabled: false,
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 90,
    specialFixedTimes: ['16:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_crystal',
    activatedAt: Date.now(),
    actionType: 'pacer_40'
  },
  {
    id: 'prof_water_daily',
    name: 'Drink 1 Glass of Water',
    category: 'water',
    enabled: true,
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: [],
    durationType: 'indefinite',
    durationValue: 0,
    ringtone: 'ring_double',
    activatedAt: Date.now(),
    actionType: 'log_water'
  },
  {
    id: 'prof_posture_evening',
    name: 'Evening Posture / Stretch Check',
    category: 'habit',
    enabled: false,
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 0,
    specialFixedTimes: ['21:00'],
    durationType: 'indefinite',
    durationValue: 0,
    ringtone: 'ring_marimba',
    activatedAt: Date.now(),
    actionType: 'check_off'
  }
];

export const DEFAULT_WEIGHT_SETTINGS = {
  unit: 'lbs', // 'lbs' | 'kg'
  startWeight: 185.0,
  currentWeight: 181.4,
  goalWeight: 170.0
};

export const INITIAL_WEIGHT_LOGS = [
  { id: 'w_1', date: getPastDateStr(6), timestamp: Date.now() - 6 * 86400000, weight: 185.0, note: 'Initial weigh-in' },
  { id: 'w_2', date: getPastDateStr(4), timestamp: Date.now() - 4 * 86400000, weight: 183.8, note: 'Seated protocol day 3' },
  { id: 'w_3', date: getPastDateStr(2), timestamp: Date.now() - 2 * 86400000, weight: 182.2, note: 'Good hydration' },
  { id: 'w_4', date: getPastDateStr(0), timestamp: Date.now(), weight: 181.4, note: 'Morning weigh-in' }
];

export const INITIAL_CUSTOM_GOALS = [
  {
    id: 'goal_water',
    title: 'Drink Water',
    icon: '💧',
    goalType: 'counter',
    targetValue: 8,
    unit: 'glasses',
    stepAmount: 1
  },
  {
    id: 'goal_seated_satkin',
    title: 'All Satkin Rotations Seated',
    icon: '🪑',
    goalType: 'boolean',
    targetValue: 1,
    unit: 'done',
    stepAmount: 1
  },
  {
    id: 'goal_daily_walk',
    title: 'Daily Walk / Movement',
    icon: '🚶',
    goalType: 'counter',
    targetValue: 30,
    unit: 'mins',
    stepAmount: 10
  }
];

function getPastDateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const KEYS = {
  PROFILES: 'satkin_profiles',
  COMPLETIONS: 'satkin_completions',
  WATER: 'satkin_water',
  WEIGHT_SETTINGS: 'satkin_weight_settings',
  WEIGHT_LOGS: 'satkin_weight_logs',
  CUSTOM_GOALS: 'satkin_custom_goals',
  GOAL_LOGS: 'satkin_goal_logs'
};

class StorageEngine {
  async get(key, defaultValue = null) {
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null && value !== undefined) {
        return JSON.parse(value);
      }
    } catch (e) {
      try {
        const item = localStorage.getItem(key);
        if (item !== null) return JSON.parse(item);
      } catch (err) {}
    }
    return defaultValue;
  }

  async set(key, value) {
    const serialized = JSON.stringify(value);
    try {
      await Preferences.set({ key, value: serialized });
    } catch (e) {
      try {
        localStorage.setItem(key, serialized);
      } catch (err) {}
    }
  }

  // --- Profile Operations ---
  async getProfiles() {
    let profiles = await this.get(KEYS.PROFILES, null);
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      await this.saveProfiles(INITIAL_PROFILES);
      return INITIAL_PROFILES;
    }
    let modified = false;
    profiles.forEach(p => {
      if (!p.ringtone) {
        p.ringtone = p.category === 'weight' ? 'ring_woodblock' : p.category === 'water' ? 'ring_double' : 'ring_classic';
        modified = true;
      }
      if (!p.endTime || p.endTime === '22:30') {
        p.endTime = '23:00';
        modified = true;
      }
    });
    // Ensure pre-seeded Morning Weigh-In exists
    if (!profiles.some(p => p.actionType === 'log_weight' || p.id === 'prof_morning_weigh_in')) {
      profiles.unshift(INITIAL_PROFILES[0]);
      modified = true;
    }
    if (modified) {
      await this.saveProfiles(profiles);
    }
    return profiles;
  }

  async saveProfiles(profiles) {
    await this.set(KEYS.PROFILES, profiles);
    return profiles;
  }

  async saveProfile(profile) {
    const profiles = await this.getProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = { ...profiles[index], ...profile };
    } else {
      profiles.push(profile);
    }
    await this.saveProfiles(profiles);
    return profiles;
  }

  async deleteProfile(profileId) {
    const profiles = await this.getProfiles();
    const updated = profiles.filter(p => p.id !== profileId);
    await this.saveProfiles(updated);
    return updated;
  }

  async toggleProfileEnabled(profileId) {
    const profiles = await this.getProfiles();
    const target = profiles.find(p => p.id === profileId);
    if (target) {
      target.enabled = !target.enabled;
      if (target.enabled) {
        target.activatedAt = Date.now();
      }
      await this.saveProfiles(profiles);
    }
    return profiles;
  }

  // --- Weight Engine Operations ---
  async getWeightSettings() {
    const saved = await this.get(KEYS.WEIGHT_SETTINGS, null);
    return saved ? { ...DEFAULT_WEIGHT_SETTINGS, ...saved } : { ...DEFAULT_WEIGHT_SETTINGS };
  }

  async saveWeightSettings(settings) {
    await this.set(KEYS.WEIGHT_SETTINGS, settings);
    return settings;
  }

  async getWeightLogs() {
    const logs = await this.get(KEYS.WEIGHT_LOGS, null);
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      await this.set(KEYS.WEIGHT_LOGS, INITIAL_WEIGHT_LOGS);
      return INITIAL_WEIGHT_LOGS;
    }
    return logs;
  }

  async addWeightLog({ weight, note = '', date = new Date().toISOString().split('T')[0] }) {
    const logs = await this.getWeightLogs();
    const cleanWeight = Math.round(parseFloat(weight) * 10) / 10;
    const newEntry = {
      id: `w_${Date.now()}`,
      date,
      timestamp: Date.now(),
      weight: cleanWeight,
      note: note.trim()
    };
    logs.push(newEntry);
    logs.sort((a, b) => a.timestamp - b.timestamp);
    await this.set(KEYS.WEIGHT_LOGS, logs);

    // Update current weight in settings
    const settings = await this.getWeightSettings();
    settings.currentWeight = cleanWeight;
    if (!settings.startWeight) settings.startWeight = cleanWeight;
    await this.saveWeightSettings(settings);

    return { logs, settings, newEntry };
  }

  async deleteWeightLog(logId) {
    let logs = await this.getWeightLogs();
    logs = logs.filter(l => l.id !== logId);
    await this.set(KEYS.WEIGHT_LOGS, logs);

    const settings = await this.getWeightSettings();
    if (logs.length > 0) {
      settings.currentWeight = logs[logs.length - 1].weight;
    }
    await this.saveWeightSettings(settings);

    return { logs, settings };
  }

  // --- Custom Goals Engine Operations ---
  async getCustomGoals() {
    const goals = await this.get(KEYS.CUSTOM_GOALS, null);
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      await this.set(KEYS.CUSTOM_GOALS, INITIAL_CUSTOM_GOALS);
      return INITIAL_CUSTOM_GOALS;
    }
    return goals;
  }

  async saveCustomGoals(goals) {
    await this.set(KEYS.CUSTOM_GOALS, goals);
    return goals;
  }

  async addCustomGoal(goal) {
    const goals = await this.getCustomGoals();
    const newGoal = {
      id: goal.id || `goal_${Date.now()}`,
      title: goal.title,
      icon: goal.icon || '🎯',
      goalType: goal.goalType || 'counter',
      targetValue: parseFloat(goal.targetValue) || 1,
      unit: goal.unit || 'times',
      stepAmount: parseFloat(goal.stepAmount) || 1
    };
    goals.push(newGoal);
    await this.saveCustomGoals(goals);
    return goals;
  }

  async deleteCustomGoal(goalId) {
    let goals = await this.getCustomGoals();
    goals = goals.filter(g => g.id !== goalId);
    await this.saveCustomGoals(goals);
    return goals;
  }

  async getGoalLogs() {
    return await this.get(KEYS.GOAL_LOGS, {});
  }

  async getTodayGoalValue(goalId, dateStr = new Date().toISOString().split('T')[0]) {
    const all = await this.getGoalLogs();
    const day = all[dateStr] || {};
    return day[goalId] !== undefined ? day[goalId] : 0;
  }

  async setGoalValue(goalId, value, dateStr = new Date().toISOString().split('T')[0]) {
    const all = await this.getGoalLogs();
    if (!all[dateStr]) all[dateStr] = {};
    all[dateStr][goalId] = Math.max(0, value);
    await this.set(KEYS.GOAL_LOGS, all);
    return all[dateStr][goalId];
  }

  async incrementGoal(goalId, step = 1, dateStr = new Date().toISOString().split('T')[0]) {
    const current = await this.getTodayGoalValue(goalId, dateStr);
    const updated = Math.max(0, Math.round((current + step) * 10) / 10);
    await this.setGoalValue(goalId, updated, dateStr);
    return updated;
  }

  async calculateGoalStreak(goalId, targetValue) {
    const all = await this.getGoalLogs();
    let streak = 0;
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const val = all[key]?.[goalId] || 0;

      if (val >= targetValue) {
        streak++;
      } else if (i === 0) {
        // Today not reached yet: check yesterday before breaking streak
        continue;
      } else {
        break;
      }
    }
    return streak;
  }

  // --- Completion Tracking ---
  async getCompletions() {
    return await this.get(KEYS.COMPLETIONS, {});
  }

  async toggleSlotCompletion(slotId, dateStr = new Date().toISOString().split('T')[0]) {
    const all = await this.getCompletions();
    if (!all[dateStr]) all[dateStr] = {};
    const currentSlot = all[dateStr][slotId];
    if (currentSlot) {
      delete all[dateStr][slotId];
    } else {
      all[dateStr][slotId] = {
        completed: true,
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
    }
    await this.set(KEYS.COMPLETIONS, all);
    return all;
  }

  async markSlotCompleted(slotId, dateStr = new Date().toISOString().split('T')[0]) {
    const all = await this.getCompletions();
    if (!all[dateStr]) all[dateStr] = {};
    all[dateStr][slotId] = {
      completed: true,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };
    await this.set(KEYS.COMPLETIONS, all);
    return all;
  }

  // --- Backward-compatible Water Methods ---
  async getWaterData(dateStr = new Date().toISOString().split('T')[0]) {
    const count = await this.getTodayGoalValue('goal_water', dateStr);
    return { count, goal: 8 };
  }

  async setWaterGlasses(count, goal = 8, dateStr = new Date().toISOString().split('T')[0]) {
    await this.setGoalValue('goal_water', count, dateStr);
    return { count, goal };
  }

  async incrementWater(dateStr = new Date().toISOString().split('T')[0]) {
    const count = await this.incrementGoal('goal_water', 1, dateStr);
    return { count, goal: 8 };
  }
}

export const storage = new StorageEngine();
