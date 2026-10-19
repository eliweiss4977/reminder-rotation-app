// Persistence engine using @capacitor/preferences with localStorage fallback
import { Preferences } from '@capacitor/preferences';

export const ALARM_TEMPLATES = [
  {
    id: 'template_rotation_2h',
    name: 'Every 2 Hours (Rotation 40x)',
    category: 'rotation',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: [],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_classic',
    alertMode: 'sound_vibrate',
    badge: 'Popular',
    icon: '🔄',
    description: 'Standard 40x acupressure rotation every 2h from 7 AM to 11 PM'
  },
  {
    id: 'template_rotation_2h_2_7',
    name: 'Every 2h + 2:00 & 7:00 PM (Rotation 40x)',
    category: 'rotation',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: ['14:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_classic',
    alertMode: 'sound_vibrate',
    badge: 'Recommended',
    icon: '⭐',
    description: '2h schedule + afternoon (2 PM) & evening (7 PM) priority acupressure'
  },
  {
    id: 'template_rotation_2h_3_7',
    name: 'Every 2h + 3:00 & 7:00 PM (Rotation 40x)',
    category: 'rotation',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: ['15:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_crystal',
    alertMode: 'sound_vibrate',
    badge: 'Alternative',
    icon: '🕒',
    description: '2h schedule with 3:00 PM & 7:00 PM key acupressure checkpoints'
  },
  {
    id: 'template_rotation_1_5h_4_7',
    name: 'Every 1.5h + 4:00 & 7:00 PM (Rotation 40x)',
    category: 'rotation',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 90,
    specialFixedTimes: ['16:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_crystal',
    alertMode: 'sound_vibrate',
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
    alertMode: 'sound_vibrate',
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
    alertMode: 'sound_vibrate',
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
    alertMode: 'sound_vibrate',
    badge: 'Daily',
    icon: '⚖️',
    description: 'Consistent morning weigh-in right after waking up'
  },
  {
    id: 'template_custom_alarm',
    name: 'Custom Alarm / Reminder',
    category: 'rotation',
    actionType: 'pacer_40',
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: [],
    durationType: 'indefinite',
    durationValue: 0,
    ringtone: 'ring_classic',
    alertMode: 'sound_vibrate',
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
    alertMode: 'sound_vibrate',
    activatedAt: Date.now(),
    actionType: 'log_weight'
  },
  {
    id: 'prof_rotation_a',
    name: 'Rotation Protocol (2h + 2:00 & 7:00)',
    category: 'rotation',
    enabled: true,
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 120,
    specialFixedTimes: ['14:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_classic',
    alertMode: 'sound_vibrate',
    activatedAt: Date.now(),
    actionType: 'pacer_40'
  },
  {
    id: 'prof_rotation_b',
    name: 'Rotation Protocol (1.5h + 4:00 & 7:00)',
    category: 'rotation',
    enabled: false,
    startTime: '07:00',
    endTime: '23:00',
    intervalMinutes: 90,
    specialFixedTimes: ['16:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    ringtone: 'ring_crystal',
    alertMode: 'sound_vibrate',
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
    alertMode: 'sound_vibrate',
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
    alertMode: 'sound_vibrate',
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

export const DEFAULT_BODY_PROFILE = {
  heightUnit: 'ft_in', // 'ft_in' | 'cm'
  heightFeet: 5,
  heightInches: 10,
  heightCm: 178
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
    id: 'goal_seated_rotation',
    title: 'All Rotations Seated',
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

// BMI & Milestone Helper Functions
export function calculateTotalHeightInches(bodyProfile) {
  if (!bodyProfile) return 70;
  if (bodyProfile.heightUnit === 'cm') {
    return (parseFloat(bodyProfile.heightCm) || 178) / 2.54;
  }
  return (parseInt(bodyProfile.heightFeet, 10) || 5) * 12 + (parseFloat(bodyProfile.heightInches) || 0);
}

export function calculateTotalHeightMeters(bodyProfile) {
  if (!bodyProfile) return 1.78;
  if (bodyProfile.heightUnit === 'cm') {
    return (parseFloat(bodyProfile.heightCm) || 178) / 100;
  }
  return calculateTotalHeightInches(bodyProfile) * 0.0254;
}

export function calculateBMI(weightValue, weightUnit, bodyProfile) {
  if (!weightValue || weightValue <= 0) return null;
  const hMeters = calculateTotalHeightMeters(bodyProfile);
  if (!hMeters || hMeters <= 0) return null;
  const weightKg = weightUnit === 'lbs' ? weightValue * 0.45359237 : weightValue;
  const bmi = weightKg / (hMeters * hMeters);
  return Math.round(bmi * 10) / 10;
}

export function getBMICategory(bmi) {
  if (!bmi) return { label: 'Unknown', color: 'slate', badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700' };
  if (bmi < 18.5) {
    return { label: 'Underweight', color: 'blue', badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/40' };
  }
  if (bmi < 25.0) {
    return { label: 'Healthy Weight', color: 'emerald', badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' };
  }
  if (bmi < 30.0) {
    return { label: 'Overweight', color: 'amber', badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' };
  }
  if (bmi < 35.0) {
    return { label: 'Obesity Class I', color: 'orange', badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40' };
  }
  if (bmi < 40.0) {
    return { label: 'Obesity Class II', color: 'rose', badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' };
  }
  return { label: 'Obesity Class III', color: 'red', badgeClass: 'bg-red-500/20 text-red-300 border border-red-500/40' };
}

export function calculateMilestoneLadder(currentWeight, weightUnit, bodyProfile) {
  const hMeters = calculateTotalHeightMeters(bodyProfile);
  if (!hMeters || !currentWeight) return [];

  const milestones = [
    { id: 'exit_class_3', name: 'Exit Obesity Class III', targetBMI: 39.9, badge: '< 40.0 BMI' },
    { id: 'exit_class_2', name: 'Exit Obesity Class II', targetBMI: 34.9, badge: '< 35.0 BMI' },
    { id: 'exit_class_1', name: 'Exit Class I / Overweight', targetBMI: 29.9, badge: '< 30.0 BMI' },
    { id: 'reach_healthy', name: 'Enter Healthy Weight', targetBMI: 24.9, badge: '< 25.0 BMI' }
  ];

  return milestones.map(m => {
    const targetKg = m.targetBMI * (hMeters * hMeters);
    const targetWeight = weightUnit === 'lbs' ? Math.round((targetKg / 0.45359237) * 10) / 10 : Math.round(targetKg * 10) / 10;
    const diff = Math.round((currentWeight - targetWeight) * 10) / 10;
    const isAchieved = currentWeight <= targetWeight;

    return {
      ...m,
      targetWeight,
      remainingWeight: Math.max(0, diff),
      isAchieved
    };
  });
}

const KEYS = {
  PROFILES: 'rotation_profiles',
  LEGACY_PROFILES: 'satkin_profiles',
  COMPLETIONS: 'rotation_completions',
  LEGACY_COMPLETIONS: 'satkin_completions',
  WATER: 'rotation_water',
  WEIGHT_SETTINGS: 'rotation_weight_settings',
  LEGACY_WEIGHT_SETTINGS: 'satkin_weight_settings',
  WEIGHT_LOGS: 'rotation_weight_logs',
  LEGACY_WEIGHT_LOGS: 'satkin_weight_logs',
  CUSTOM_GOALS: 'rotation_custom_goals',
  LEGACY_CUSTOM_GOALS: 'satkin_custom_goals',
  GOAL_LOGS: 'rotation_goal_logs',
  LEGACY_GOAL_LOGS: 'satkin_goal_logs',
  BODY_PROFILE: 'rotation_body_profile'
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
      // Fallback check legacy satkin_profiles
      profiles = await this.get(KEYS.LEGACY_PROFILES, null);
    }

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      await this.saveProfiles(INITIAL_PROFILES);
      return INITIAL_PROFILES;
    }

    let modified = false;
    profiles.forEach(p => {
      if (p.category === 'satkin') {
        p.category = 'rotation';
        modified = true;
      }
      if (!p.alertMode) {
        p.alertMode = 'sound_vibrate';
        modified = true;
      }
      if (p.name && p.name.includes('Satkin')) {
        p.name = p.name.replace(/Satkin/g, 'Rotation');
        modified = true;
      }
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

  // --- Body Profile Operations ---
  async getBodyProfile() {
    const saved = await this.get(KEYS.BODY_PROFILE, null);
    return saved ? { ...DEFAULT_BODY_PROFILE, ...saved } : { ...DEFAULT_BODY_PROFILE };
  }

  async saveBodyProfile(bodyProfile) {
    await this.set(KEYS.BODY_PROFILE, bodyProfile);
    return bodyProfile;
  }

  // --- Weight Engine Operations ---
  async getWeightSettings() {
    let saved = await this.get(KEYS.WEIGHT_SETTINGS, null);
    if (!saved) {
      saved = await this.get(KEYS.LEGACY_WEIGHT_SETTINGS, null);
    }
    return saved ? { ...DEFAULT_WEIGHT_SETTINGS, ...saved } : { ...DEFAULT_WEIGHT_SETTINGS };
  }

  async saveWeightSettings(settings) {
    await this.set(KEYS.WEIGHT_SETTINGS, settings);
    return settings;
  }

  async getWeightLogs() {
    let logs = await this.get(KEYS.WEIGHT_LOGS, null);
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      logs = await this.get(KEYS.LEGACY_WEIGHT_LOGS, null);
    }
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
    let goals = await this.get(KEYS.CUSTOM_GOALS, null);
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      goals = await this.get(KEYS.LEGACY_CUSTOM_GOALS, null);
    }
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      await this.set(KEYS.CUSTOM_GOALS, INITIAL_CUSTOM_GOALS);
      return INITIAL_CUSTOM_GOALS;
    }
    // Rename any legacy seated goal title
    let modified = false;
    goals.forEach(g => {
      if (g.id === 'goal_seated_satkin' || (g.title && g.title.includes('Satkin'))) {
        g.title = g.title.replace(/Satkin/g, 'Rotation');
        modified = true;
      }
    });
    if (modified) {
      await this.saveCustomGoals(goals);
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
    let logs = await this.get(KEYS.GOAL_LOGS, null);
    if (!logs) {
      logs = await this.get(KEYS.LEGACY_GOAL_LOGS, {});
    }
    return logs || {};
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
    let comps = await this.get(KEYS.COMPLETIONS, null);
    if (!comps) {
      comps = await this.get(KEYS.LEGACY_COMPLETIONS, {});
    }
    return comps || {};
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
