// App Lock & Biometrics Engine for Rotation Reminder
import { storage } from './storage.js';

export async function hashPin(pin) {
  if (!pin) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(`rotation_salt_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(enteredPin, targetHash) {
  if (!enteredPin || !targetHash) return false;
  const hash = await hashPin(enteredPin);
  return hash === targetHash;
}

export async function checkBiometricAvailability() {
  try {
    if (window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (e) {
    console.warn('Biometric availability check failed:', e?.message);
  }
  return false;
}

export async function promptBiometrics() {
  try {
    if (!window.PublicKeyCredential) return false;
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred'
      }
    });
    return !!credential;
  } catch (err) {
    console.warn('Biometrics prompt cancelled or failed:', err?.message);
    return false;
  }
}

class AppLockEngine {
  constructor() {
    this.locked = false;
    this.currentInput = '';
    this.backgroundedAt = 0;
    this.unlockResolve = null;
    this.mode = 'unlock'; // 'unlock' | 'set_pin' | 'confirm_pin'
    this.tempPin = '';
    this.biometricsAvailable = false;
  }

  async init() {
    this.biometricsAvailable = await checkBiometricAvailability();
    this.bindEvents();
    this.setupLifecycleMonitoring();

    const settings = await storage.getAppLockSettings();
    if (settings.enabled && settings.pinHash) {
      this.lock();
    }
  }

  bindEvents() {
    const lockScreen = document.getElementById('applock-screen');
    if (!lockScreen) return;

    // Digit buttons
    const numKeys = lockScreen.querySelectorAll('[data-lock-key]');
    numKeys.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = btn.getAttribute('data-lock-key');
        this.handleKeyPress(key);
      });
    });

    // Biometrics button
    const bioBtn = document.getElementById('applock-bio-btn');
    if (bioBtn) {
      bioBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.tryBiometricUnlock();
      });
    }

    // Physical keyboard input support
    window.addEventListener('keydown', (e) => {
      if (!this.locked) return;
      if (e.key >= '0' && e.key <= '9') {
        this.handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        this.handleKeyPress('backspace');
      } else if (e.key === 'Escape') {
        this.handleKeyPress('clear');
      }
    });
  }

  setupLifecycleMonitoring() {
    document.addEventListener('visibilitychange', async () => {
      const settings = await storage.getAppLockSettings();
      if (!settings.enabled || !settings.pinHash) return;

      if (document.hidden) {
        this.backgroundedAt = Date.now();
      } else {
        const elapsedSec = (Date.now() - (this.backgroundedAt || Date.now())) / 1000;
        if (settings.lockTiming === 'immediate') {
          this.lock();
        } else if (settings.lockTiming === '1min' && elapsedSec >= 60) {
          this.lock();
        }
      }
    });
  }

  async tryBiometricUnlock() {
    const settings = await storage.getAppLockSettings();
    if (!settings.biometricsEnabled) return false;
    const ok = await promptBiometrics();
    if (ok) {
      await this.unlock();
      return true;
    }
    return false;
  }

  lock(title = 'Enter 4-Digit PIN') {
    this.locked = true;
    this.currentInput = '';
    this.mode = 'unlock';
    this.updateDots();

    const lockScreen = document.getElementById('applock-screen');
    const titleEl = document.getElementById('applock-title');
    const errorEl = document.getElementById('applock-error-msg');
    const bioBtn = document.getElementById('applock-bio-btn');

    if (titleEl) titleEl.textContent = title;
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
    if (bioBtn) {
      storage.getAppLockSettings().then(s => {
        if (s.biometricsEnabled && this.biometricsAvailable) {
          bioBtn.classList.remove('hidden');
        } else {
          bioBtn.classList.add('hidden');
        }
      });
    }

    if (lockScreen) {
      lockScreen.classList.remove('hidden');
      lockScreen.classList.add('flex');
    }

    // Attempt automatic biometric prompt if enabled
    setTimeout(async () => {
      const s = await storage.getAppLockSettings();
      if (this.locked && s.biometricsEnabled && this.biometricsAvailable) {
        this.tryBiometricUnlock();
      }
    }, 300);

    return new Promise((resolve) => {
      this.unlockResolve = resolve;
    });
  }

  async unlock() {
    this.locked = false;
    this.currentInput = '';
    const lockScreen = document.getElementById('applock-screen');
    if (lockScreen) {
      lockScreen.classList.add('hidden');
      lockScreen.classList.remove('flex');
    }

    const settings = await storage.getAppLockSettings();
    settings.lastUnlockedAt = Date.now();
    await storage.saveAppLockSettings(settings);

    if (typeof this.unlockResolve === 'function') {
      this.unlockResolve(true);
      this.unlockResolve = null;
    }
  }

  async handleKeyPress(key) {
    if (key === 'clear') {
      this.currentInput = '';
      this.updateDots();
      return;
    }
    if (key === 'backspace') {
      if (this.currentInput.length > 0) {
        this.currentInput = this.currentInput.slice(0, -1);
        this.updateDots();
      }
      return;
    }
    if (key >= '0' && key <= '9') {
      if (this.currentInput.length < 4) {
        this.currentInput += key;
        this.updateDots();
        if (this.currentInput.length === 4) {
          await this.evaluatePin();
        }
      }
    }
  }

  updateDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`lock-dot-${i}`);
      if (dot) {
        if (i < this.currentInput.length) {
          dot.classList.add('bg-indigo-500', 'border-indigo-400', 'scale-110');
          dot.classList.remove('bg-slate-800', 'border-slate-700');
        } else {
          dot.classList.remove('bg-indigo-500', 'border-indigo-400', 'scale-110');
          dot.classList.add('bg-slate-800', 'border-slate-700');
        }
      }
    }
  }

  async evaluatePin() {
    const pin = this.currentInput;
    const settings = await storage.getAppLockSettings();
    const errorEl = document.getElementById('applock-error-msg');
    const dotsContainer = document.getElementById('lock-dots-container');

    if (this.mode === 'unlock') {
      const isValid = await verifyPin(pin, settings.pinHash);
      if (isValid) {
        await this.unlock();
      } else {
        this.showError('Incorrect PIN. Please try again.');
        this.shakeDots();
        this.currentInput = '';
        setTimeout(() => this.updateDots(), 400);
      }
    } else if (this.mode === 'set_pin') {
      this.tempPin = pin;
      this.mode = 'confirm_pin';
      this.currentInput = '';
      this.updateDots();
      const titleEl = document.getElementById('applock-title');
      if (titleEl) titleEl.textContent = 'Confirm 4-Digit PIN';
      if (errorEl) errorEl.classList.add('hidden');
    } else if (this.mode === 'confirm_pin') {
      if (pin === this.tempPin) {
        const hash = await hashPin(pin);
        settings.enabled = true;
        settings.pinHash = hash;
        await storage.saveAppLockSettings(settings);
        this.showSuccess('PIN successfully set!');
        setTimeout(async () => {
          await this.unlock();
        }, 600);
      } else {
        this.showError('PINs did not match. Enter new PIN again.');
        this.shakeDots();
        this.mode = 'set_pin';
        this.tempPin = '';
        this.currentInput = '';
        const titleEl = document.getElementById('applock-title');
        if (titleEl) titleEl.textContent = 'Create 4-Digit PIN';
        setTimeout(() => this.updateDots(), 500);
      }
    }
  }

  showError(msg) {
    const errorEl = document.getElementById('applock-error-msg');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden', 'text-emerald-400');
      errorEl.classList.add('text-rose-400');
    }
  }

  showSuccess(msg) {
    const errorEl = document.getElementById('applock-error-msg');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden', 'text-rose-400');
      errorEl.classList.add('text-emerald-400');
    }
  }

  shakeDots() {
    const dotsContainer = document.getElementById('lock-dots-container');
    if (dotsContainer) {
      dotsContainer.classList.add('animate-shake');
      setTimeout(() => dotsContainer.classList.remove('animate-shake'), 400);
    }
  }

  startSetupPinFlow() {
    this.locked = true;
    this.currentInput = '';
    this.mode = 'set_pin';
    this.tempPin = '';
    this.updateDots();

    const lockScreen = document.getElementById('applock-screen');
    const titleEl = document.getElementById('applock-title');
    const errorEl = document.getElementById('applock-error-msg');
    const bioBtn = document.getElementById('applock-bio-btn');

    if (titleEl) titleEl.textContent = 'Create 4-Digit PIN';
    if (errorEl) errorEl.classList.add('hidden');
    if (bioBtn) bioBtn.classList.add('hidden');

    if (lockScreen) {
      lockScreen.classList.remove('hidden');
      lockScreen.classList.add('flex');
    }

    return new Promise((resolve) => {
      this.unlockResolve = resolve;
    });
  }
}

export const appLock = new AppLockEngine();
