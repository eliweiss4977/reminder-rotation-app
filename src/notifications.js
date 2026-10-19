// Native Notifications Manager for iOS & Android via @capacitor/local-notifications
import { LocalNotifications } from '@capacitor/local-notifications';
import { calculateMultiProfile5DaysNotificationSlots } from './scheduleEngine.js';

export const NOTIFICATION_CHANNELS = {
  ring_classic: { id: 'channel_ring_classic', name: 'Classic Single Ring', sound: 'ring_classic.wav' },
  ring_crystal: { id: 'channel_ring_crystal', name: 'Crystal Desk Bell', sound: 'ring_crystal.wav' },
  ring_double: { id: 'channel_ring_double', name: 'Soft Double Chime', sound: 'ring_double.wav' },
  ring_woodblock: { id: 'channel_ring_woodblock', name: 'Zen Woodblock', sound: 'ring_woodblock.wav' },
  ring_marimba: { id: 'channel_ring_marimba', name: 'Warm Marimba', sound: 'ring_marimba.wav' }
};

export const DEFAULT_CHANNEL_ID = 'alarm_classic_sv_v3';

/**
 * Resolves the precise native channel and sound configuration based on ringtone and alert mode.
 * Matches MainActivity.java channels:
 * - alarm_${tone}_sv_v3 (Sound & Vibrate)
 * - alarm_${tone}_so_v3 (Sound Only)
 * - alarm_vibrate_only_v3 (Vibrate Only / Silent)
 */
export function resolveNotificationChannel(ringtone = 'ring_classic', alertMode = 'sound_vibrate') {
  const toneKey = (ringtone || 'ring_classic').replace('ring_', '');
  const soundFile = `${ringtone || 'ring_classic'}.wav`;

  if (alertMode === 'vibrate_only') {
    return {
      channelId: 'alarm_vibrate_only_v3',
      sound: undefined
    };
  }

  if (alertMode === 'sound_only') {
    return {
      channelId: `alarm_${toneKey}_so_v3`,
      sound: soundFile
    };
  }

  // Default: sound_vibrate
  return {
    channelId: `alarm_${toneKey}_sv_v3`,
    sound: soundFile
  };
}

class NotificationManager {
  constructor() {
    this.isSupported = true;
    this.onNotificationTapCallback = null;
    this.initDone = false;
  }

  async init(onNotificationTap) {
    if (this.initDone) return;
    this.onNotificationTapCallback = onNotificationTap;

    try {
      // 1. Setup Android High Importance Notification Channels
      await this.setupChannels();

      // 2. Register Interactive Action Types (Rotations & Habits)
      await this.registerActionTypes();

      // 3. Listen for notification action / tap
      await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
        const actionId = action.actionId;
        const extra = action.notification?.extra || {};

        if (actionId === 'SNOOZE_2M') {
          await this.scheduleSnooze(action.notification, 2);
          return;
        }

        if (actionId === 'SNOOZE_5M') {
          await this.scheduleSnooze(action.notification, 5);
          return;
        }

        if (actionId === 'DISMISS') {
          return;
        }

        if (this.onNotificationTapCallback) {
          this.onNotificationTapCallback(extra, actionId);
        }
      });

      this.initDone = true;
    } catch (e) {
      console.warn('Local notifications initialization skipped (web environment or unsupported):', e);
      this.isSupported = false;
    }
  }

  async setupChannels() {
    try {
      const tones = ['classic', 'crystal', 'double', 'woodblock', 'marimba'];

      // Register the alarm stream channels with Capacitor
      for (const tone of tones) {
        const soundFile = `ring_${tone}.wav`;
        const toneLabel = tone.charAt(0).toUpperCase() + tone.slice(1);

        // Sound + Vibrate
        await LocalNotifications.createChannel({
          id: `alarm_${tone}_sv_v3`,
          name: `Rotation: ${toneLabel} (Sound & Vibrate)`,
          description: 'Alarm audio stream with double-pulse vibration',
          importance: 5,
          visibility: 1,
          sound: soundFile,
          vibration: true,
          lights: true,
          lightColor: '#4F46E5'
        });

        // Sound Only
        await LocalNotifications.createChannel({
          id: `alarm_${tone}_so_v3`,
          name: `Rotation: ${toneLabel} (Sound Only)`,
          description: 'Alarm audio stream without vibration',
          importance: 5,
          visibility: 1,
          sound: soundFile,
          vibration: false,
          lights: true,
          lightColor: '#4F46E5'
        });
      }

      // Vibrate Only (Silent)
      await LocalNotifications.createChannel({
        id: 'alarm_vibrate_only_v3',
        name: 'Rotation: Vibrate Only (Silent)',
        description: 'High-priority silent alert with triple-pulse vibration',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#4F46E5'
      });

      // Legacy fallback channel
      await LocalNotifications.createChannel({
        id: 'satkin_single_ring',
        name: 'Rotation Chimes (Legacy)',
        description: 'Legacy channel for 40x acupressure ear rotations',
        importance: 5,
        visibility: 1,
        sound: 'single_ring.wav',
        vibration: true,
        lights: true,
        lightColor: '#4F46E5'
      });
    } catch (e) {
      console.warn('Could not create notification channels:', e);
    }
  }

  async registerActionTypes() {
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'ROTATION_ACTIONS',
            actions: [
              { id: 'OPEN_PACER', title: '▶️ Count 40x Now' },
              { id: 'MARK_DONE', title: '✅ Counted (Done)' },
              { id: 'SNOOZE_2M', title: '💤 Snooze 2m' },
              { id: 'DISMISS', title: '✕ Dismiss', destructive: true }
            ]
          },
          {
            id: 'HABIT_ACTIONS',
            actions: [
              { id: 'LOG_HABIT', title: '✅ Log +1 Now' },
              { id: 'SNOOZE_5M', title: '💤 Snooze 5m' },
              { id: 'DISMISS', title: '✕ Dismiss', destructive: true }
            ]
          }
        ]
      });
    } catch (e) {
      console.warn('Could not register action types:', e);
    }
  }

  async requestPermission() {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (e) {
      console.warn('Notification permission request error:', e);
      return false;
    }
  }

  async checkPermission() {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch (e) {
      return false;
    }
  }

  /**
   * Reschedules the next 5 days of notifications across all active profiles.
   */
  async rescheduleMultiProfileNext5Days(profiles) {
    try {
      // 1. Cancel all pending notifications
      const pending = await LocalNotifications.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
      }

      // 2. Calculate next 5 days slots across all enabled profiles
      const slots = calculateMultiProfile5DaysNotificationSlots(profiles, new Date());
      if (slots.length === 0) {
        return 0;
      }

      // 3. Format notifications payload for Capacitor
      const notifications = slots.map(slot => {
        const ringKey = slot.ringtone || 'ring_classic';
        const alertMode = slot.alertMode || 'sound_vibrate';
        const { channelId, sound } = resolveNotificationChannel(ringKey, alertMode);
        const isRotation = slot.category === 'rotation' || slot.category === 'satkin' || slot.actionType === 'pacer_40';

        const notif = {
          id: slot.id,
          title: slot.title,
          body: slot.body,
          channelId,
          actionTypeId: isRotation ? 'ROTATION_ACTIONS' : 'HABIT_ACTIONS',
          schedule: {
            at: slot.at,
            allowWhileIdle: true
          },
          smallIcon: 'ic_stat_rotation',
          iconColor: '#4F46E5',
          extra: {
            slotId: slot.slotId,
            profileId: slot.profileId,
            category: slot.category === 'satkin' ? 'rotation' : slot.category,
            actionType: slot.actionType,
            customGoalId: slot.customGoalId || null,
            displayTime: slot.displayTime,
            badgeLabel: slot.badgeLabel,
            ringtone: ringKey,
            alertMode
          }
        };

        if (sound) {
          notif.sound = sound;
        }

        return notif;
      });

      // 4. Batch schedule
      await LocalNotifications.schedule({ notifications });
      return notifications.length;
    } catch (e) {
      console.warn('Error rescheduling multi-profile notifications:', e);
      return 0;
    }
  }

  /**
   * Schedule a snooze notification (e.g. +2 minutes or +5 minutes).
   */
  async scheduleSnooze(originalNotification, minutes = 2) {
    try {
      const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
      const snoozeId = Math.floor(Date.now() % 100000000);
      const extra = originalNotification.extra || {};
      const ringKey = extra.ringtone || 'ring_classic';
      const alertMode = extra.alertMode || 'sound_vibrate';
      const { channelId, sound } = resolveNotificationChannel(ringKey, alertMode);
      const isRotation = extra.category === 'rotation' || extra.actionType === 'pacer_40';

      const snoozeNotif = {
        id: snoozeId,
        title: `💤 Snoozed: ${originalNotification.title || 'Reminder'}`,
        body: originalNotification.body || 'Time for your scheduled rotation / habit.',
        channelId: channelId || originalNotification.channelId,
        actionTypeId: isRotation ? 'ROTATION_ACTIONS' : 'HABIT_ACTIONS',
        schedule: {
          at: snoozeTime,
          allowWhileIdle: true
        },
        smallIcon: 'ic_stat_rotation',
        iconColor: '#4F46E5',
        extra: {
          ...extra,
          isSnoozed: true
        }
      };

      if (sound) {
        snoozeNotif.sound = sound;
      }

      await LocalNotifications.schedule({ notifications: [snoozeNotif] });
      return true;
    } catch (e) {
      console.warn('Could not schedule snooze notification:', e);
      return false;
    }
  }

  // Quick 5-second test notification
  async scheduleTestNotification(profileName = 'Rotation Protocol', ringtoneId = 'ring_classic', alertMode = 'sound_vibrate') {
    try {
      await this.requestPermission();
      const testTime = new Date(Date.now() + 5000);
      const ringKey = ringtoneId || 'ring_classic';
      const { channelId, sound } = resolveNotificationChannel(ringKey, alertMode);

      const testNotif = {
        id: 99999,
        title: `🔄 ${profileName} [TEST]`,
        body: 'Sit down comfortably and rotate ear balls 40 times. Tap to open the 40x Pacer.',
        channelId,
        actionTypeId: 'ROTATION_ACTIONS',
        schedule: {
          at: testTime,
          allowWhileIdle: true
        },
        smallIcon: 'ic_stat_rotation',
        iconColor: '#4F46E5',
        extra: {
          slotId: 'test_slot',
          actionType: 'pacer_40',
          category: 'rotation',
          displayTime: 'Now',
          ringtone: ringKey,
          alertMode
        }
      };

      if (sound) {
        testNotif.sound = sound;
      }

      await LocalNotifications.schedule({ notifications: [testNotif] });
      return true;
    } catch (e) {
      console.warn('Test notification failed:', e);
      return false;
    }
  }

  async getPendingCount() {
    try {
      const pending = await LocalNotifications.getPending();
      return pending?.notifications?.length || 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Alias for rescheduleMultiProfileNext5Days
   */
  async scheduleMultiProfile(profiles) {
    return this.rescheduleMultiProfileNext5Days(profiles);
  }
}

export const notifications = new NotificationManager();

export async function scheduleMultiProfile(profiles) {
  return notifications.scheduleMultiProfile(profiles);
}

