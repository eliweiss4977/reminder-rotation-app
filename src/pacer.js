// 40x Sitting Acupressure Ear Ball Rotation Pacer
import { audio } from './audio.js';
import { haptics } from './haptics.js';
import confetti from 'canvas-confetti';

export class PacerController {
  constructor(options = {}) {
    this.modalEl = document.getElementById('pacer-modal');
    this.targetSlot = null;
    this.count = 0;
    this.targetCount = 40;
    this.mode = 'auto'; // 'auto' or 'tap'
    this.isRunning = false;
    this.timerId = null;
    this.paceIntervalMs = 1200; // 1.2s per rotation as required
    this.onComplete = options.onComplete || (() => {});

    // Elements
    this.counterEl = document.getElementById('pacer-count-display');
    this.progressRing = document.getElementById('pacer-progress-circle');
    this.statusTextEl = document.getElementById('pacer-status-text');
    this.slotTitleEl = document.getElementById('pacer-slot-title');
    this.autoBtn = document.getElementById('pacer-mode-auto');
    this.tapBtn = document.getElementById('pacer-mode-tap');
    this.actionBtn = document.getElementById('pacer-action-btn');
    this.actionBtnText = document.getElementById('pacer-action-btn-text');
    this.tapTargetEl = document.getElementById('pacer-tap-target');
    this.closeBtn = document.getElementById('pacer-close-btn');
    this.resetBtn = document.getElementById('pacer-reset-btn');
    this.celebrationEl = document.getElementById('pacer-celebration');

    this.radius = 110;
    this.circumference = 2 * Math.PI * this.radius;

    this.bindEvents();
    this.updateProgressRing(0);
  }

  bindEvents() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.resetBtn?.addEventListener('click', () => this.reset());

    this.autoBtn?.addEventListener('click', () => {
      this.setMode('auto');
    });

    this.tapBtn?.addEventListener('click', () => {
      this.setMode('tap');
    });

    this.actionBtn?.addEventListener('click', () => {
      if (this.mode === 'auto') {
        if (this.isRunning) {
          this.pauseAutoPacer();
        } else {
          this.startAutoPacer();
        }
      } else {
        this.incrementCount();
      }
    });

    this.tapTargetEl?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.mode === 'tap') {
        this.incrementCount();
      } else if (this.mode === 'auto' && !this.isRunning && this.count < this.targetCount) {
        this.startAutoPacer();
      }
    });
  }

  open(slot = null) {
    this.targetSlot = slot;
    this.count = 0;
    this.isRunning = false;
    clearInterval(this.timerId);

    const slotLabel = slot ? `${slot.displayTime} (${slot.badgeLabel})` : 'Rotation Session';
    if (this.slotTitleEl) {
      this.slotTitleEl.textContent = slotLabel;
    }

    if (this.celebrationEl) {
      this.celebrationEl.classList.add('hidden');
    }

    this.updateUI();
    this.modalEl?.classList.remove('hidden');
    this.modalEl?.classList.add('flex');
    document.body.classList.add('overflow-hidden');

    // Trigger initial gentle haptic
    haptics.tick();
  }

  close() {
    this.pauseAutoPacer();
    this.modalEl?.classList.add('hidden');
    this.modalEl?.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  setMode(mode) {
    if (this.isRunning) {
      this.pauseAutoPacer();
    }
    this.mode = mode;

    if (mode === 'auto') {
      this.autoBtn?.classList.add('bg-emerald-600', 'text-white', 'shadow');
      this.autoBtn?.classList.remove('text-slate-400');
      this.tapBtn?.classList.remove('bg-emerald-600', 'text-white', 'shadow');
      this.tapBtn?.classList.add('text-slate-400');
    } else {
      this.tapBtn?.classList.add('bg-emerald-600', 'text-white', 'shadow');
      this.tapBtn?.classList.remove('text-slate-400');
      this.autoBtn?.classList.remove('bg-emerald-600', 'text-white', 'shadow');
      this.autoBtn?.classList.add('text-slate-400');
    }

    this.updateUI();
  }

  startAutoPacer() {
    if (this.count >= this.targetCount) {
      this.count = 0;
    }
    this.isRunning = true;
    this.updateUI();

    // Trigger first rotation tick immediately
    this.tickAutoPacer();

    this.timerId = setInterval(() => {
      this.tickAutoPacer();
    }, this.paceIntervalMs);
  }

  tickAutoPacer() {
    this.count++;
    const isMilestone = this.count % 10 === 0 || this.count === this.targetCount;
    audio.playPacerTick(isMilestone);
    
    if (isMilestone) {
      haptics.milestone();
    } else {
      haptics.tick();
    }

    this.updateProgressRing(this.count);
    this.updateUI();

    if (this.count >= this.targetCount) {
      this.finishSession();
    }
  }

  pauseAutoPacer() {
    this.isRunning = false;
    clearInterval(this.timerId);
    this.updateUI();
  }

  incrementCount() {
    if (this.count >= this.targetCount) return;

    this.count++;
    const isMilestone = this.count % 10 === 0 || this.count === this.targetCount;
    audio.playPacerTick(isMilestone);

    if (isMilestone) {
      haptics.milestone();
    } else {
      haptics.tap();
    }

    // Quick visual bounce
    this.tapTargetEl?.classList.add('scale-95');
    setTimeout(() => this.tapTargetEl?.classList.remove('scale-95'), 80);

    this.updateProgressRing(this.count);
    this.updateUI();

    if (this.count >= this.targetCount) {
      this.finishSession();
    }
  }

  reset() {
    this.pauseAutoPacer();
    this.count = 0;
    this.updateProgressRing(0);
    if (this.celebrationEl) this.celebrationEl.classList.add('hidden');
    this.updateUI();
    haptics.tick();
  }

  finishSession() {
    this.pauseAutoPacer();
    this.count = this.targetCount;
    this.updateProgressRing(this.targetCount);

    // Celebration
    audio.playCompletionChime();
    haptics.success();

    // Trigger colorful confetti
    this.launchConfetti();

    if (this.celebrationEl) {
      this.celebrationEl.classList.remove('hidden');
    }

    // Call completion callback to mark slot done
    if (this.onComplete && this.targetSlot) {
      this.onComplete(this.targetSlot);
    }

    this.updateUI();
  }

  launchConfetti() {
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#34d399']
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0.2, y: 0.65 },
          colors: ['#10b981', '#f59e0b', '#ec4899']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 0.8, y: 0.65 },
          colors: ['#10b981', '#f59e0b', '#6366f1']
        });
      }, 250);
    } catch (e) {}
  }

  updateProgressRing(currentCount) {
    if (!this.progressRing) return;
    const offset = this.circumference - (currentCount / this.targetCount) * this.circumference;
    this.progressRing.style.strokeDashoffset = offset;
  }

  updateUI() {
    if (this.counterEl) {
      this.counterEl.textContent = `${this.count}`;
    }

    if (this.statusTextEl) {
      if (this.count >= this.targetCount) {
        this.statusTextEl.textContent = '40 Rotations Completed!';
      } else if (this.mode === 'auto') {
        this.statusTextEl.textContent = this.isRunning ? 'Auto-Pacing (1.2s cadence)...' : 'Tap Start to begin 1.2s Auto-Pace';
      } else {
        this.statusTextEl.textContent = 'Tap circle on each rotation';
      }
    }

    if (this.actionBtnText) {
      if (this.count >= this.targetCount) {
        this.actionBtnText.textContent = 'Completed (Done)';
      } else if (this.mode === 'auto') {
        this.actionBtnText.textContent = this.isRunning ? 'Pause Pacer' : 'Start Auto-Pacer';
      } else {
        this.actionBtnText.textContent = `Tap to Rotate (${this.count}/40)`;
      }
    }
  }
}
