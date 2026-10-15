// Native Notifications Manager for iOS & Android via @capacitor/local-notifications
import { LocalNotifications } from '@capacitor/local-notifications';
import { calculateNext5DaysNotificationSlots } from './scheduleEngine.js';

export const NOTIFICATION_CHANNEL_ID = 'satkin_single_ring';

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
      // 1. Create Android High Importance Notification Channel
      await this.setupChannel();

      // 2. Listen for notification action / tap
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('User tapped notification action:', action);
        if (this.onNotificationTapCallback) {
          const slotId = action.notification?.extra?.slotId || null;
          this.onNotificationTapCallback(slotId);
        }
      });

      this.initDone = true;
    } catch (e) {
      console.warn('Local notifications initialization skipped (web environment or unsupported):', e);
      this.isSupported = false;
    }
  }

  async setupChannel() {
    try {
      // Create high-importance channel with custom sound
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Satkin Rotation Chimes',
        description: 'Chimes for 40x sitting acupressure ear rotations',
        importance: 5, // High importance (heads-up banner and sound)
        visibility: 1, // Public on lockscreen
        sound: 'single_ring.wav',
        vibration: true,
        lights: true,
        lightColor: '#10b981'
      });
    } catch (e) {
      console.warn('Could not create notification channel:', e);
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
   * Reschedules the next 5 days of notifications based on current protocol config.
   * Total scheduled count is typically ~45-55, well below the iOS 64 ceiling.
   */
  async rescheduleNext5Days(config) {
    try {
      // 1. Cancel all pending notifications
      const pending = await LocalNotifications.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
      }

      // 2. Calculate next 5 days slots
      const slots = calculateNext5DaysNotificationSlots(config, new Date());
      if (slots.length === 0) return 0;

      // 3. Format notifications payload for Capacitor
      const notifications = slots.map(slot => ({
        id: slot.id,
        title: slot.title,
        body: slot.body,
        channelId: NOTIFICATION_CHANNEL_ID,
        sound: 'single_ring.wav',
        schedule: {
          at: slot.at,
          allowWhileIdle: true
        },
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#10b981',
        extra: {
          slotId: slot.slotId,
          displayTime: slot.displayTime,
          badgeLabel: slot.badgeLabel
        }
      }));

      // 4. Batch schedule
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} Satkin notifications across the next 5 days.`);
      return notifications.length;
    } catch (e) {
      console.warn('Error rescheduling notifications:', e);
      return 0;
    }
  }

  // Quick 5-second test notification
  async scheduleTestNotification() {
    try {
      await this.requestPermission();
      const testTime = new Date(Date.now() + 5000);
      const testNotif = {
        id: 99999,
        title: 'Rotate Ear Balls (40x Sitting) [TEST]',
        body: 'Sit down comfortably and rotate 40 times. Tap to open the 40x Pacer.',
        channelId: NOTIFICATION_CHANNEL_ID,
        sound: 'single_ring.wav',
        schedule: {
          at: testTime,
          allowWhileIdle: true
        },
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#10b981',
        extra: {
          slotId: 'test_slot',
          displayTime: 'Now'
        }
      };

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
}

export const notifications = new NotificationManager();
