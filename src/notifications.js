// Native Notifications Manager for iOS & Android via @capacitor/local-notifications
import { LocalNotifications } from '@capacitor/local-notifications';
import { calculateMultiProfile5DaysNotificationSlots } from './scheduleEngine.js';

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
      // 1. Setup Android High Importance Notification Channel
      await this.setupChannel();

      // 2. Listen for notification action / tap
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('User tapped notification action:', action);
        if (this.onNotificationTapCallback) {
          const extra = action.notification?.extra || {};
          this.onNotificationTapCallback(extra);
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
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Satkin Rotation Chimes',
        description: 'Chimes for 40x sitting acupressure ear rotations and habits',
        importance: 5, // High importance (heads-up banner and sound)
        visibility: 1, // Public on lockscreen
        sound: 'single_ring.wav',
        vibration: true,
        lights: true,
        lightColor: '#6366f1'
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
        console.log('No upcoming notification slots to schedule.');
        return 0;
      }

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
        iconColor: slot.category === 'satkin' ? '#6366f1' : slot.category === 'water' ? '#06b6d4' : '#10b981',
        extra: {
          slotId: slot.slotId,
          profileId: slot.profileId,
          category: slot.category,
          actionType: slot.actionType,
          displayTime: slot.displayTime,
          badgeLabel: slot.badgeLabel
        }
      }));

      // 4. Batch schedule
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} multi-profile notifications across the next 5 days.`);
      return notifications.length;
    } catch (e) {
      console.warn('Error rescheduling multi-profile notifications:', e);
      return 0;
    }
  }

  // Quick 5-second test notification
  async scheduleTestNotification(profileName = 'Satkin Protocol') {
    try {
      await this.requestPermission();
      const testTime = new Date(Date.now() + 5000);
      const testNotif = {
        id: 99999,
        title: `🔄 ${profileName} [TEST]`,
        body: 'Sit down comfortably and rotate ear balls 40 times. Tap to open the 40x Pacer.',
        channelId: NOTIFICATION_CHANNEL_ID,
        sound: 'single_ring.wav',
        schedule: {
          at: testTime,
          allowWhileIdle: true
        },
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#6366f1',
        extra: {
          slotId: 'test_slot',
          actionType: 'pacer_40',
          category: 'satkin',
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
