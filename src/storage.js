// Persistence engine using @capacitor/preferences with localStorage fallback
import { Preferences } from '@capacitor/preferences';
import { DEFAULT_CONFIG } from './scheduleEngine.js';

const KEYS = {
  CONFIG: 'satkin_config',
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

  async getConfig() {
    const saved = await this.get(KEYS.CONFIG, null);
    return saved ? { ...DEFAULT_CONFIG, ...saved } : { ...DEFAULT_CONFIG };
  }

  async saveConfig(config) {
    await this.set(KEYS.CONFIG, config);
  }

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
}

export const storage = new StorageEngine();
