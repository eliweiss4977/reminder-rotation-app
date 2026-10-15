// Haptic feedback controller using @capacitor/haptics with web navigator.vibrate fallback
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

class HapticsEngine {
  constructor() {
    this.enabled = true;
  }

  setEnabled(val) {
    this.enabled = !!val;
  }

  async tick() {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  }

  async tap() {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      if (navigator.vibrate) {
        navigator.vibrate(25);
      }
    }
  }

  async milestone() {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }
  }

  async success() {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      if (navigator.vibrate) {
        navigator.vibrate([40, 60, 80]);
      }
    }
  }
}

export const haptics = new HapticsEngine();
