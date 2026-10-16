// Persistence engine using @capacitor/preferences with localStorage fallback
import { Preferences } from '@capacitor/preferences';

export const INITIAL_PROFILES = [
  {
    id: 'prof_satkin_a',
    name: 'Satkin Protocol A (2h + 2:00 & 7:00)',
    category: 'satkin',
    enabled: true,
    startTime: '07:00',
    endTime: '22:30',
    intervalMinutes: 120,
    specialFixedTimes: ['14:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    activatedAt: Date.now(),
    actionType: 'pacer_40'
  },
  {
    id: 'prof_satkin_b',
    name: 'Satkin Protocol B (1.5h + 4:00 & 7:00)',
    category: 'satkin',
    enabled: false,
    startTime: '07:00',
    endTime: '22:30',
    intervalMinutes: 90,
    specialFixedTimes: ['16:00', '19:00'],
    durationType: 'days',
    durationValue: 7,
    activatedAt: Date.now(),
    actionType: 'pacer_40'
  },
  {
    id: 'prof_water_daily',
    name: 'Drink 1 Glass of Water',
    category: 'water',
    enabled: true,
    startTime: '07:30',
    endTime: '21:30',
    intervalMinutes: 120,
    specialFixedTimes: [],
    durationType: 'indefinite',
    durationValue: 0,
    activatedAt: Date.now(),
    actionType: 'log_water'
  },
  {
    id: 'prof_posture_evening',
    name: 'Evening Posture / Stretch Check',
    category: 'habit',
    enabled: false,
    startTime: '07:00',
    endTime: '22:30',
    intervalMinutes: 0,
    specialFixedTimes: ['21:00'],
    durationType: 'indefinite',
    durationValue: 0,
    activatedAt: Date.now(),
    actionType: 'check_off'
  }
];

const KEYS = {
  PROFILES: 'satkin_profiles',
  COMPLETIONS: 'satkin_completions',
  WATER: 'satkin_water',
  STATS: 'satkin_stats'
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
    const profiles = await this.get(KEYS.PROFILES, null);
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      await this.saveProfiles(INITIAL_PROFILES);
      return INITIAL_PROFILES;
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

  // --- Completion Tracking ---
  async getCompletions() {
    return await this.get(KEYS.COMPLETIONS, {});
  }

  async toggleSlotCompletion(slotId, dateStr = new Date().toISOString().split('T')[0]) {
    const all = await this.getCompletions();
    if (!all[dateStr]) {
      all[dateStr] = {};
    }
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
    if (!all[dateStr]) {
      all[dateStr] = {};
    }
    all[dateStr][slotId] = {
      completed: true,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };
    await this.set(KEYS.COMPLETIONS, all);
    return all;
  }

  // --- Water Hydration Tracker ---
  async getWaterData(dateStr = new Date().toISOString().split('T')[0]) {
    const all = await this.get(KEYS.WATER, {});
    return all[dateStr] || { count: 0, goal: 8 };
  }

  async setWaterGlasses(count, goal = 8, dateStr = new Date().toISOString().split('T')[0]) {
    const all = await this.get(KEYS.WATER, {});
    all[dateStr] = { count: Math.max(0, count), goal };
    await this.set(KEYS.WATER, all);
    return all[dateStr];
  }

  async incrementWater(dateStr = new Date().toISOString().split('T')[0]) {
    const current = await this.getWaterData(dateStr);
    const newCount = (current.count || 0) + 1;
    return await this.setWaterGlasses(newCount, current.goal || 8, dateStr);
  }
}

export const storage = new StorageEngine();
