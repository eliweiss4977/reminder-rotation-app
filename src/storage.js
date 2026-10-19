// Persistence engine using @capacitor/preferences with localStorage fallback
import { Preferences } from '@capacitor/preferences';
import { safeJsonParse, getLocalDateString } from './utils.js';

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

export const INITIAL_PROFILES = [];

export const DEFAULT_WEIGHT_SETTINGS = {
  unit: 'lbs', // 'lbs' | 'kg'
  startWeight: null,
  currentWeight: null,
  goalWeight: null,
  isConfigured: false
};

export const DEFAULT_BODY_PROFILE = {
  name: '',
  heightUnit: 'ft_in', // 'ft_in' | 'cm'
  heightFt: null,
  heightIn: null,
  heightCm: null,
  heightFeet: null,
  heightInches: null,
  isConfigured: false
};

export const INITIAL_WEIGHT_LOGS = [];

export const INITIAL_CUSTOM_GOALS = [];

// BMI & Milestone Helper Functions
export function calculateTotalHeightInches(bodyProfile) {
  if (!bodyProfile) return 0;
  if (bodyProfile.heightUnit === 'cm') {
    const cm = parseFloat(bodyProfile.heightCm);
    return (cm && cm > 0) ? cm / 2.54 : 0;
  }
  const feet = parseInt(bodyProfile.heightFeet ?? bodyProfile.heightFt, 10);
  const inches = parseFloat(bodyProfile.heightInches ?? bodyProfile.heightIn ?? 0);
  if (isNaN(feet) && isNaN(inches)) return 0;
  const totalInches = (isNaN(feet) ? 0 : feet * 12) + (isNaN(inches) ? 0 : inches);
  return totalInches > 0 ? totalInches : 0;
}

export function calculateTotalHeightMeters(bodyProfile) {
  if (!bodyProfile) return 0;
  if (bodyProfile.heightUnit === 'cm') {
    const cm = parseFloat(bodyProfile.heightCm);
    return (cm && cm > 0) ? cm / 100 : 0;
  }
  const totalInches = calculateTotalHeightInches(bodyProfile);
  return totalInches > 0 ? totalInches * 0.0254 : 0;
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
  if (!bmi || bmi <= 0) return { label: 'Unknown', color: 'slate', badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700' };
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
  if (!hMeters || hMeters <= 0 || !currentWeight || currentWeight <= 0) return [];

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

export const KEYS = {
  ONBOARDING_COMPLETED: 'rotation_onboarding_completed',
  APP_LOCK_SETTINGS: 'rotation_app_lock_settings',
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

export const DEFAULT_APP_LOCK_SETTINGS = {
  enabled: false,
  pinHash: null,
  biometricsEnabled: false,
  lockTiming: 'immediate', // 'immediate' | '1min' | 'restart'
  lastUnlockedAt: 0
};

class StorageEngine {
  async get(key, defaultValue = null) {
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null && value !== undefined) {
        const parsed = safeJsonParse(value, null);
        if (parsed !== null) return parsed;
      }
    } catch (e) {
      console.warn(`Preferences.get failed for key "${key}":`, e?.message);
    }

    try {
      const item = localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = safeJsonParse(item, null);
        if (parsed !== null) return parsed;
      }
    } catch (err) {
      console.warn(`localStorage.getItem failed for key "${key}":`, err?.message);
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

  // --- Onboarding & App Lock Operations ---
  async isOnboardingCompleted() {
    const val = await this.get(KEYS.ONBOARDING_COMPLETED, null);
    return val === true || val === 'true';
  }

  async setOnboardingCompleted(completed = true) {
    await this.set(KEYS.ONBOARDING_COMPLETED, !!completed);
  }

  async checkAndClearPreAssumedDataIfNeeded() {
    const completed = await this.isOnboardingCompleted();
    if (!completed) {
      // Clear any legacy seeded data so onboarding starts with completely blank slate
      await this.set(KEYS.PROFILES, []);
      await this.set(KEYS.WEIGHT_SETTINGS, DEFAULT_WEIGHT_SETTINGS);
      await this.set(KEYS.BODY_PROFILE, DEFAULT_BODY_PROFILE);
      await this.set(KEYS.WEIGHT_LOGS, []);
      await this.set(KEYS.CUSTOM_GOALS, []);
      await this.set(KEYS.COMPLETIONS, {});
      await this.set(KEYS.GOAL_LOGS, {});
      try {
        localStorage.removeItem(KEYS.LEGACY_PROFILES);
        localStorage.removeItem(KEYS.LEGACY_WEIGHT_SETTINGS);
        localStorage.removeItem(KEYS.LEGACY_WEIGHT_LOGS);
        localStorage.removeItem(KEYS.LEGACY_CUSTOM_GOALS);
      } catch (e) {}
    }
  }

  async getAppLockSettings() {
    const saved = await this.get(KEYS.APP_LOCK_SETTINGS, null);
    return { ...DEFAULT_APP_LOCK_SETTINGS, ...(saved || {}) };
  }

  async saveAppLockSettings(settings) {
    const current = await this.getAppLockSettings();
    const updated = { ...current, ...settings };
    await this.set(KEYS.APP_LOCK_SETTINGS, updated);
    return updated;
  }

  // --- Profile Operations ---
  async getProfiles() {
    let profiles = await this.get(KEYS.PROFILES, null);
    if (!profiles || !Array.isArray(profiles)) {
      // Fallback check legacy satkin_profiles
      profiles = await this.get(KEYS.LEGACY_PROFILES, null);
    }

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return [];
    }

    let modified = false;
    const sanitized = [];

    profiles.forEach(p => {
      if (!p || typeof p !== 'object') return;
      const clean = { ...p };

      if (clean.category === 'satkin') {
        clean.category = 'rotation';
        modified = true;
      }
      if (!clean.alertMode) {
        clean.alertMode = 'sound_vibrate';
        modified = true;
      }
      if (clean.name && clean.name.includes('Satkin')) {
        clean.name = clean.name.replace(/Satkin/g, 'Rotation');
        modified = true;
      }
      if (!clean.ringtone) {
        clean.ringtone = clean.category === 'weight' ? 'ring_woodblock' : clean.category === 'water' ? 'ring_double' : 'ring_classic';
        modified = true;
      }
      if (!clean.endTime || clean.endTime === '22:30') {
        clean.endTime = '23:00';
        modified = true;
      }
      sanitized.push(clean);
    });

    if (modified) {
      await this.saveProfiles(sanitized);
    }
    return sanitized;
  }

  async saveProfiles(profiles) {
    if (!Array.isArray(profiles)) return [];
    await this.set(KEYS.PROFILES, profiles);
    return profiles;
  }

  async saveProfile(profile) {
    if (!profile || !profile.id) return await this.getProfiles();
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
    let saved = await this.get(KEYS.BODY_PROFILE, null);
    if (!saved || typeof saved !== 'object') {
      return { ...DEFAULT_BODY_PROFILE };
    }
    const heightFeet = saved.heightFeet !== undefined && saved.heightFeet !== null && saved.heightFeet !== ''
      ? parseInt(saved.heightFeet, 10)
      : (saved.heightFt !== undefined && saved.heightFt !== null && saved.heightFt !== '' ? parseInt(saved.heightFt, 10) : null);
    const heightInches = saved.heightInches !== undefined && saved.heightInches !== null && saved.heightInches !== ''
      ? parseFloat(saved.heightInches)
      : (saved.heightIn !== undefined && saved.heightIn !== null && saved.heightIn !== '' ? parseFloat(saved.heightIn) : null);
    const heightCm = saved.heightCm !== undefined && saved.heightCm !== null && saved.heightCm !== ''
      ? parseFloat(saved.heightCm)
      : null;

    const isConfigured = !!(saved.isConfigured || (heightFeet !== null || heightCm !== null));

    return {
      name: (typeof saved.name === 'string' && saved.name.trim()) ? saved.name.trim() : '',
      heightUnit: saved.heightUnit === 'cm' ? 'cm' : 'ft_in',
      heightFeet,
      heightInches,
      heightFt: heightFeet,
      heightIn: heightInches,
      heightCm,
      isConfigured
    };
  }

  async saveBodyProfile(bodyProfile) {
    if (!bodyProfile || typeof bodyProfile !== 'object') return { ...DEFAULT_BODY_PROFILE };
    const current = await this.getBodyProfile();
    const updated = { ...current, ...bodyProfile };
    if (updated.heightFeet !== null || updated.heightCm !== null) {
      updated.isConfigured = true;
    }
    await this.set(KEYS.BODY_PROFILE, updated);
    return updated;
  }

  async resetAllToDefaults() {
    await this.set(KEYS.ONBOARDING_COMPLETED, false);
    await this.set(KEYS.APP_LOCK_SETTINGS, DEFAULT_APP_LOCK_SETTINGS);
    await this.set(KEYS.PROFILES, []);
    await this.set(KEYS.WEIGHT_SETTINGS, DEFAULT_WEIGHT_SETTINGS);
    await this.set(KEYS.BODY_PROFILE, DEFAULT_BODY_PROFILE);
    await this.set(KEYS.WEIGHT_LOGS, []);
    await this.set(KEYS.CUSTOM_GOALS, []);
    await this.set(KEYS.COMPLETIONS, {});
    await this.set(KEYS.GOAL_LOGS, {});
    return true;
  }

  // --- Weight Engine Operations ---
  async getWeightSettings() {
    let saved = await this.get(KEYS.WEIGHT_SETTINGS, null);
    if (!saved || typeof saved !== 'object') {
      saved = await this.get(KEYS.LEGACY_WEIGHT_SETTINGS, null);
    }
    if (!saved || typeof saved !== 'object') {
      return { ...DEFAULT_WEIGHT_SETTINGS };
    }
    const startWeight = saved.startWeight !== undefined && saved.startWeight !== null && saved.startWeight !== '' ? parseFloat(saved.startWeight) : null;
    const currentWeight = saved.currentWeight !== undefined && saved.currentWeight !== null && saved.currentWeight !== '' ? parseFloat(saved.currentWeight) : null;
    const goalWeight = saved.goalWeight !== undefined && saved.goalWeight !== null && saved.goalWeight !== '' ? parseFloat(saved.goalWeight) : null;
    const isConfigured = !!(saved.isConfigured || startWeight !== null || currentWeight !== null || goalWeight !== null);

    return {
      unit: saved.unit === 'kg' ? 'kg' : 'lbs',
      startWeight,
      currentWeight,
      goalWeight,
      isConfigured
    };
  }

  async saveWeightSettings(settings) {
    const current = await this.getWeightSettings();
    const updated = { ...current, ...settings };
    if (updated.startWeight !== null || updated.currentWeight !== null || updated.goalWeight !== null) {
      updated.isConfigured = true;
    }
    await this.set(KEYS.WEIGHT_SETTINGS, updated);
    return updated;
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
    return logs.filter(l => l && typeof l === 'object' && l.weight !== undefined);
  }

  async addWeightLog({ weight, note = '', date = getLocalDateString() }) {
    const logs = await this.getWeightLogs();
    const cleanWeight = Math.round(parseFloat(weight) * 10) / 10;
    const newEntry = {
      id: `w_${Date.now()}`,
      date,
      timestamp: Date.now(),
      weight: cleanWeight,
      note: String(note || '').trim()
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
      if (g && (g.id === 'goal_seated_satkin' || (g.title && g.title.includes('Satkin')))) {
        g.title = g.title.replace(/Satkin/g, 'Rotation');
        modified = true;
      }
    });
    if (modified) {
      await this.saveCustomGoals(goals);
    }
    return goals.filter(g => g && typeof g === 'object');
  }

  async saveCustomGoals(goals) {
    if (!Array.isArray(goals)) return [];
    await this.set(KEYS.CUSTOM_GOALS, goals);
    return goals;
  }

  async addCustomGoal(goal) {
    const goals = await this.getCustomGoals();
    const newGoal = {
      id: goal.id || `goal_${Date.now()}`,
      title: String(goal.title || 'Goal').trim(),
      icon: goal.icon || '🎯',
      goalType: goal.goalType || 'counter',
      targetValue: parseFloat(goal.targetValue) || 1,
      unit: String(goal.unit || 'times').trim(),
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
    if (!logs || typeof logs !== 'object' || Array.isArray(logs)) {
      logs = await this.get(KEYS.LEGACY_GOAL_LOGS, {});
    }
    return (logs && typeof logs === 'object' && !Array.isArray(logs)) ? logs : {};
  }

  async getTodayGoalValue(goalId, dateStr = getLocalDateString()) {
    const all = await this.getGoalLogs();
    const day = all[dateStr] || {};
    return day[goalId] !== undefined ? day[goalId] : 0;
  }

  async setGoalValue(goalId, value, dateStr = getLocalDateString()) {
    const all = await this.getGoalLogs();
    if (!all[dateStr]) all[dateStr] = {};
    all[dateStr][goalId] = Math.max(0, value);
    await this.set(KEYS.GOAL_LOGS, all);
    return all[dateStr][goalId];
  }

  async incrementGoal(goalId, step = 1, dateStr = getLocalDateString()) {
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
      const key = getLocalDateString(d);
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
    if (!comps || typeof comps !== 'object' || Array.isArray(comps)) {
      comps = await this.get(KEYS.LEGACY_COMPLETIONS, {});
    }
    return (comps && typeof comps === 'object' && !Array.isArray(comps)) ? comps : {};
  }

  async toggleSlotCompletion(slotId, dateStr = getLocalDateString()) {
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

  async markSlotCompleted(slotId, dateStr = getLocalDateString()) {
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

  // --- Data Export & Import Operations ---
  async exportAllData() {
    const data = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      onboardingCompleted: await this.isOnboardingCompleted(),
      profiles: await this.getProfiles(),
      bodyProfile: await this.getBodyProfile(),
      weightSettings: await this.getWeightSettings(),
      weightLogs: await this.getWeightLogs(),
      customGoals: await this.getCustomGoals(),
      goalLogs: await this.getGoalLogs(),
      completions: await this.getCompletions(),
      appLockSettings: await this.getAppLockSettings()
    };
    return JSON.stringify(data, null, 2);
  }

  async importAllData(jsonString) {
    try {
      const data = safeJsonParse(jsonString, null);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON backup data format');
      }

      if (Array.isArray(data.profiles)) {
        await this.saveProfiles(data.profiles);
      }
      if (data.bodyProfile && typeof data.bodyProfile === 'object') {
        await this.saveBodyProfile(data.bodyProfile);
      }
      if (data.weightSettings && typeof data.weightSettings === 'object') {
        await this.saveWeightSettings(data.weightSettings);
      }
      if (Array.isArray(data.weightLogs)) {
        await this.set(KEYS.WEIGHT_LOGS, data.weightLogs);
      }
      if (Array.isArray(data.customGoals)) {
        await this.saveCustomGoals(data.customGoals);
      }
      if (data.goalLogs && typeof data.goalLogs === 'object') {
        await this.set(KEYS.GOAL_LOGS, data.goalLogs);
      }
      if (data.completions && typeof data.completions === 'object') {
        await this.set(KEYS.COMPLETIONS, data.completions);
      }
      if (data.appLockSettings && typeof data.appLockSettings === 'object') {
        await this.saveAppLockSettings(data.appLockSettings);
      }
      if (data.onboardingCompleted !== undefined) {
        await this.setOnboardingCompleted(!!data.onboardingCompleted);
      }
      return { success: true };
    } catch (err) {
      console.error('importAllData error:', err);
      return { success: false, error: err.message };
    }
  }
}

export const storage = new StorageEngine();
