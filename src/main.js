// Main Application Controller for Satkin Rotation & Habit Pacer
import './style.css';
import { audio } from './audio.js';
import { haptics } from './haptics.js';
import {
  INTERVAL_MODES,
  SPECIAL_MODES,
  DEFAULT_CONFIG,
  calculateDailySchedule,
  computeScheduleWithStatuses,
  timeToMinutes,
  formatDisplayTime,
  getIntervalDurationMinutes
} from './scheduleEngine.js';
import { storage } from './storage.js';
import { notifications } from './notifications.js';
import { PacerController } from './pacer.js';

class SatkinApp {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.completions = {};
    this.waterData = { count: 0, goal: 8 };
    this.activeTab = 'schedule';
    this.currentSchedule = [];
    this.nextSlot = null;
    this.countdownTimer = null;
    this.pacer = null;

    this.init();
  }

  async init() {
    // 1. Load persisted data
    this.config = await storage.getConfig();
    this.completions = await storage.getCompletions();
    this.waterData = await storage.getWaterData();

    // 2. Initialize Pacer modal controller
    this.pacer = new PacerController({
      onComplete: (slot) => this.onPacerCompletedSlot(slot)
    });

    // 3. Initialize Native Notifications & handle notification action tap
    await notifications.init((slotId) => {
      console.log('App resumed from notification tap for slot:', slotId);
      const targetSlot = this.currentSchedule.find(s => s.id === slotId) || this.nextSlot;
      this.pacer.open(targetSlot);
    });

    // 4. Bind UI event listeners
    this.bindEvents();

    // 5. Initial Render
    this.updateHeaderDate();
    this.renderProtocolControls();
    this.renderSettingsInputs();
    this.renderWaterTracker();
    this.refreshScheduleAndUI();

    // 6. Start live 1-second countdown clock
    this.startCountdownLoop();

    // 7. Schedule next 5 days of notifications
    notifications.rescheduleNext5Days(this.config);
  }

  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  updateHeaderDate() {
    const el = document.getElementById('header-today-date');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  bindEvents() {
    // Top Bar Chime Test
    document.getElementById('header-test-chime')?.addEventListener('click', () => {
      audio.playSingleRing();
      haptics.milestone();
    });

    // Hero Card Action Buttons
    document.getElementById('hero-start-pacer-btn')?.addEventListener('click', () => {
      this.pacer.open(this.nextSlot);
    });

    document.getElementById('hero-mark-done-btn')?.addEventListener('click', async () => {
      if (this.nextSlot) {
        haptics.tap();
        await storage.markSlotCompleted(this.nextSlot.id);
        this.completions = await storage.getCompletions();
        this.refreshScheduleAndUI();
      }
    });

    document.getElementById('hero-test-sound-btn')?.addEventListener('click', () => {
      audio.playSingleRing();
      haptics.milestone();
    });

    // Sync button
    document.getElementById('timeline-refresh-btn')?.addEventListener('click', async () => {
      haptics.tick();
      await notifications.rescheduleNext5Days(this.config);
      this.refreshScheduleAndUI();
      alert('Schedule refreshed & 5-day notifications synced.');
    });

    // Tab Navigation
    document.getElementById('nav-btn-schedule')?.addEventListener('click', () => this.switchTab('schedule'));
    document.getElementById('nav-btn-habits')?.addEventListener('click', () => this.switchTab('habits'));
    document.getElementById('nav-btn-settings')?.addEventListener('click', () => this.switchTab('settings'));

    // Protocol Base Interval buttons
    document.getElementById('proto-base-2h')?.addEventListener('click', () => this.setBaseInterval(INTERVAL_MODES.TWO_HOURS));
    document.getElementById('proto-base-15h')?.addEventListener('click', () => this.setBaseInterval(INTERVAL_MODES.ONE_POINT_FIVE_HOURS));
    document.getElementById('proto-base-custom')?.addEventListener('click', () => {
      this.switchTab('settings');
      document.getElementById('settings-custom-interval')?.focus();
    });

    // Protocol Special Overlay buttons
    document.getElementById('proto-special-2and7')?.addEventListener('click', () => this.setSpecialMode(SPECIAL_MODES.PLUS_2_AND_7));
    document.getElementById('proto-special-4and7')?.addEventListener('click', () => this.setSpecialMode(SPECIAL_MODES.PLUS_4_AND_7));
    document.getElementById('proto-special-none')?.addEventListener('click', () => this.setSpecialMode(SPECIAL_MODES.NONE));
    document.getElementById('proto-special-custom')?.addEventListener('click', () => {
      this.switchTab('settings');
      document.getElementById('settings-new-fixed-time')?.focus();
    });

    // Settings Tab Controls
    const startTimeInput = document.getElementById('settings-start-time');
    const cutoffTimeInput = document.getElementById('settings-cutoff-time');

    startTimeInput?.addEventListener('change', async (e) => {
      this.config.startTime = e.target.value;
      await this.saveConfigAndSync();
    });

    cutoffTimeInput?.addEventListener('change', async (e) => {
      this.config.cutoffTime = e.target.value;
      await this.saveConfigAndSync();
    });

    document.getElementById('settings-apply-interval-btn')?.addEventListener('click', async () => {
      const val = parseInt(document.getElementById('settings-custom-interval').value, 10);
      if (val >= 15) {
        this.config.intervalMode = INTERVAL_MODES.CUSTOM;
        this.config.customIntervalMinutes = val;
        await this.saveConfigAndSync();
      }
    });

    document.getElementById('settings-add-fixed-btn')?.addEventListener('click', async () => {
      const timeVal = document.getElementById('settings-new-fixed-time').value;
      if (timeVal) {
        if (!this.config.customFixedTimes.includes(timeVal)) {
          this.config.customFixedTimes.push(timeVal);
          this.config.customFixedTimes.sort();
          this.config.specialMode = SPECIAL_MODES.CUSTOM;
          await this.saveConfigAndSync();
          this.renderSettingsInputs();
        }
      }
    });

    document.getElementById('settings-reschedule-btn')?.addEventListener('click', async () => {
      haptics.tick();
      const count = await notifications.rescheduleNext5Days(this.config);
      alert(`Successfully scheduled ${count} rotation chimes for the next 5 days.`);
    });

    document.getElementById('settings-test-notif-btn')?.addEventListener('click', async () => {
      haptics.tick();
      const ok = await notifications.scheduleTestNotification();
      if (ok) {
        alert('Test chime notification scheduled in 5 seconds! Put app in background to test banner.');
      } else {
        alert('Could not schedule notification. Please check app notification permissions.');
      }
    });

    document.getElementById('settings-reset-today-btn')?.addEventListener('click', async () => {
      if (confirm("Reset today's completion checkmarks?")) {
        const todayKey = this.getTodayKey();
        delete this.completions[todayKey];
        await storage.set('satkin_completions', this.completions);
        this.refreshScheduleAndUI();
        haptics.tick();
      }
    });
  }

  async setBaseInterval(mode) {
    haptics.tick();
    this.config.intervalMode = mode;
    await this.saveConfigAndSync();
  }

  async setSpecialMode(mode) {
    haptics.tick();
    this.config.specialMode = mode;
    await this.saveConfigAndSync();
  }

  async saveConfigAndSync() {
    await storage.saveConfig(this.config);
    this.renderProtocolControls();
    this.refreshScheduleAndUI();
    notifications.rescheduleNext5Days(this.config);
  }

  async onPacerCompletedSlot(slot) {
    if (slot && slot.id) {
      await storage.markSlotCompleted(slot.id);
      this.completions = await storage.getCompletions();
      this.refreshScheduleAndUI();
    }
  }

  switchTab(tab) {
    haptics.tick();
    this.activeTab = tab;

    const tabs = ['schedule', 'habits', 'settings'];
    tabs.forEach(t => {
      const content = document.getElementById(`tab-content-${t}`);
      const btn = document.getElementById(`nav-btn-${t}`);

      if (t === tab) {
        content?.classList.remove('hidden');
        btn?.classList.add('text-emerald-400');
        btn?.classList.remove('text-slate-400');
      } else {
        content?.classList.add('hidden');
        btn?.classList.remove('text-emerald-400');
        btn?.classList.add('text-slate-400');
      }
    });

    if (tab === 'habits') {
      this.renderWaterTracker();
    } else if (tab === 'settings') {
      this.renderSettingsInputs();
    }
  }

  renderProtocolControls() {
    // 1. Base interval buttons
    const btn2h = document.getElementById('proto-base-2h');
    const btn15h = document.getElementById('proto-base-15h');
    const btnCustom = document.getElementById('proto-base-custom');

    const activeClasses = ['bg-emerald-600', 'text-white', 'shadow-sm'];
    const inactiveClasses = ['text-slate-400'];

    const setBtn = (el, isActive) => {
      if (!el) return;
      if (isActive) {
        el.classList.add(...activeClasses);
        el.classList.remove(...inactiveClasses);
      } else {
        el.classList.remove(...activeClasses);
        el.classList.add(...inactiveClasses);
      }
    };

    setBtn(btn2h, this.config.intervalMode === INTERVAL_MODES.TWO_HOURS);
    setBtn(btn15h, this.config.intervalMode === INTERVAL_MODES.ONE_POINT_FIVE_HOURS);
    setBtn(btnCustom, this.config.intervalMode === INTERVAL_MODES.CUSTOM);

    // 2. Special overlay buttons
    const btn2and7 = document.getElementById('proto-special-2and7');
    const btn4and7 = document.getElementById('proto-special-4and7');
    const btnNone = document.getElementById('proto-special-none');
    const btnSpecCustom = document.getElementById('proto-special-custom');

    const setSpecialBtn = (el, isActive) => {
      if (!el) return;
      if (isActive) {
        el.className = 'special-btn active-press py-1.5 px-1 font-semibold rounded-lg text-amber-300 bg-amber-500/20 border border-amber-500/40 shadow-sm transition truncate text-center';
      } else {
        el.className = 'special-btn active-press py-1.5 px-1 font-semibold rounded-lg text-slate-400 hover:text-white transition truncate text-center';
      }
    };

    setSpecialBtn(btn2and7, this.config.specialMode === SPECIAL_MODES.PLUS_2_AND_7);
    setSpecialBtn(btn4and7, this.config.specialMode === SPECIAL_MODES.PLUS_4_AND_7);
    setSpecialBtn(btnNone, this.config.specialMode === SPECIAL_MODES.NONE);
    setSpecialBtn(btnSpecCustom, this.config.specialMode === SPECIAL_MODES.CUSTOM);

    // 3. Summary badge
    const summaryBadge = document.getElementById('protocol-summary-badge');
    if (summaryBadge) {
      let baseText = '2h base';
      if (this.config.intervalMode === INTERVAL_MODES.ONE_POINT_FIVE_HOURS) baseText = '1.5h base';
      if (this.config.intervalMode === INTERVAL_MODES.CUSTOM) baseText = `${this.config.customIntervalMinutes}m base`;

      let specText = 'No Overlays';
      if (this.config.specialMode === SPECIAL_MODES.PLUS_2_AND_7) specText = '+ 2:00 & 7:00 PM';
      if (this.config.specialMode === SPECIAL_MODES.PLUS_4_AND_7) specText = '+ 4:00 & 7:00 PM';
      if (this.config.specialMode === SPECIAL_MODES.CUSTOM) specText = `+ ${this.config.customFixedTimes.length} Custom`;

      summaryBadge.textContent = `${baseText} • ${specText}`;
    }
  }

  renderSettingsInputs() {
    const startTimeInput = document.getElementById('settings-start-time');
    const cutoffTimeInput = document.getElementById('settings-cutoff-time');
    const customIntervalInput = document.getElementById('settings-custom-interval');

    if (startTimeInput) startTimeInput.value = this.config.startTime || '07:00';
    if (cutoffTimeInput) cutoffTimeInput.value = this.config.cutoffTime || '22:30';
    if (customIntervalInput) customIntervalInput.value = this.config.customIntervalMinutes || 120;

    // Render custom fixed times tag list
    const listEl = document.getElementById('settings-fixed-times-list');
    if (listEl) {
      listEl.innerHTML = '';
      const list = this.config.customFixedTimes || [];
      if (list.length === 0) {
        listEl.innerHTML = '<span class="text-[11px] text-slate-500 italic">No custom fixed times defined</span>';
      } else {
        list.forEach(tStr => {
          const tag = document.createElement('span');
          tag.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-amber-300 border border-slate-700';
          tag.innerHTML = `
            <span>${formatDisplayTime(tStr)}</span>
            <button data-remove="${tStr}" class="text-slate-400 hover:text-rose-400 ml-0.5">×</button>
          `;
          tag.querySelector('button')?.addEventListener('click', async (e) => {
            const timeToRemove = e.target.getAttribute('data-remove');
            this.config.customFixedTimes = this.config.customFixedTimes.filter(t => t !== timeToRemove);
            await this.saveConfigAndSync();
            this.renderSettingsInputs();
          });
          listEl.appendChild(tag);
        });
      }
    }
  }

  refreshScheduleAndUI() {
    // 1. Calculate schedule for today
    const rawSchedule = calculateDailySchedule(this.config);
    this.currentSchedule = computeScheduleWithStatuses(rawSchedule, this.completions, new Date());

    // 2. Identify next upcoming slot
    this.nextSlot = this.currentSchedule.find(s => s.status === 'next_up') ||
                    this.currentSchedule.find(s => !s.isCompleted) ||
                    this.currentSchedule[0];

    // 3. Render Hero Countdown Card
    this.renderHeroCard();

    // 4. Render Today's Timeline
    this.renderTimelineList();
  }

  renderHeroCard() {
    const targetTimeEl = document.getElementById('hero-target-time');
    const badgeEl = document.getElementById('hero-badge');
    const markDoneBtn = document.getElementById('hero-mark-done-btn');
    const markDoneText = document.getElementById('hero-mark-done-text');

    if (!this.nextSlot) {
      if (targetTimeEl) targetTimeEl.textContent = 'All Completed!';
      return;
    }

    if (targetTimeEl) {
      targetTimeEl.textContent = this.nextSlot.displayTime;
    }

    if (badgeEl) {
      badgeEl.textContent = this.nextSlot.badgeLabel;
      if (this.nextSlot.badgeType === 'merged') {
        badgeEl.className = 'px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-gradient-to-r from-emerald-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40';
      } else if (this.nextSlot.badgeType === 'special') {
        badgeEl.className = 'px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30';
      } else {
        badgeEl.className = 'px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      }
    }

    if (markDoneBtn && markDoneText) {
      if (this.nextSlot.isCompleted) {
        markDoneText.textContent = 'Completed ✓';
        markDoneBtn.classList.add('bg-emerald-950/40', 'border-emerald-500/40', 'text-emerald-300');
      } else {
        markDoneText.textContent = 'Mark Done';
        markDoneBtn.classList.remove('bg-emerald-950/40', 'border-emerald-500/40', 'text-emerald-300');
      }
    }

    this.updateCountdownDisplay();
  }

  updateCountdownDisplay() {
    const countdownEl = document.getElementById('hero-countdown');
    if (!countdownEl || !this.nextSlot) return;

    const now = new Date();
    const target = new Date();
    const h = Math.floor(this.nextSlot.minutes / 60);
    const m = this.nextSlot.minutes % 60;
    target.setHours(h, m, 0, 0);

    let diffMs = target.getTime() - now.getTime();

    if (this.nextSlot.isCompleted) {
      countdownEl.textContent = 'DONE';
      countdownEl.className = 'text-2xl font-mono font-bold text-emerald-400 tabular-nums';
      return;
    }

    if (diffMs < 0) {
      // Past due
      const overdueSecs = Math.abs(Math.floor(diffMs / 1000));
      const mm = String(Math.floor(overdueSecs / 60)).padStart(2, '0');
      const ss = String(overdueSecs % 60).padStart(2, '0');
      countdownEl.textContent = `+${mm}:${ss}`;
      countdownEl.className = 'text-2xl font-mono font-bold text-rose-400 tabular-nums animate-pulse';
      return;
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');

    countdownEl.textContent = `${hrs}:${mins}:${secs}`;
    countdownEl.className = 'text-2xl font-mono font-bold text-amber-400 tabular-nums';
  }

  startCountdownLoop() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.updateCountdownDisplay();
    }, 1000);
  }

  renderTimelineList() {
    const container = document.getElementById('timeline-slots-container');
    const statsSummary = document.getElementById('timeline-stats-summary');
    if (!container) return;

    container.innerHTML = '';
    const completedCount = this.currentSchedule.filter(s => s.isCompleted).length;
    const totalCount = this.currentSchedule.length;

    if (statsSummary) {
      statsSummary.textContent = `${completedCount} of ${totalCount} completed today (${Math.round((completedCount / (totalCount || 1)) * 100)}%)`;
    }

    this.currentSchedule.forEach((slot) => {
      const card = document.createElement('div');
      
      // Visual styling based on status
      let cardBorder = 'border-slate-800';
      let cardBg = 'bg-slate-900/60';
      let statusBadge = '';

      if (slot.isCompleted) {
        cardBorder = 'border-emerald-900/40';
        cardBg = 'bg-emerald-950/15 opacity-75';
        statusBadge = `<span class="text-[10px] text-emerald-400 font-medium">Done at ${slot.completedAt || 'today'}</span>`;
      } else if (slot.status === 'next_up') {
        cardBorder = 'border-emerald-500/60 ring-1 ring-emerald-500/30';
        cardBg = 'bg-slate-800/90 shadow-md shadow-emerald-950/40';
        statusBadge = `<span class="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 animate-pulse">Next Up</span>`;
      } else if (slot.status === 'missed') {
        cardBorder = 'border-amber-900/40';
        cardBg = 'bg-slate-900/40';
        statusBadge = `<span class="text-[10px] text-amber-400/80 font-medium">Past window</span>`;
      } else {
        cardBorder = 'border-slate-800/80';
        cardBg = 'bg-slate-900/40';
        statusBadge = `<span class="text-[10px] text-slate-500">Upcoming</span>`;
      }

      // Slot badge tag (Special vs Interval vs Merged)
      let typeBadge = '';
      if (slot.badgeType === 'merged') {
        typeBadge = `<span class="text-[10px] px-2 py-0.5 font-bold rounded-full bg-gradient-to-r from-emerald-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40">Interval + Special</span>`;
      } else if (slot.badgeType === 'special') {
        typeBadge = `<span class="text-[10px] px-2 py-0.5 font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">${slot.badgeLabel}</span>`;
      } else {
        typeBadge = `<span class="text-[10px] px-2 py-0.5 font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">Interval</span>`;
      }

      card.className = `p-3 rounded-xl border ${cardBorder} ${cardBg} flex items-center justify-between transition-all`;
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <!-- Checkmark Toggle Button -->
          <button data-slot-id="${slot.id}" class="slot-toggle-btn active-press w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            slot.isCompleted
              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/50'
              : 'border-slate-700 bg-slate-800/60 text-transparent hover:border-emerald-500/60'
          }">
            <svg class="w-4 h-4 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>

          <!-- Time and Tags -->
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold ${slot.isCompleted ? 'text-slate-400 line-through' : 'text-white'}">
                ${slot.displayTime}
              </span>
              ${typeBadge}
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              ${statusBadge}
            </div>
          </div>
        </div>

        <!-- Quick 40x Pacer Button -->
        <button data-pace-slot="${slot.id}" class="active-press px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
          slot.status === 'next_up'
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
        }">
          <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Pace</span>
        </button>
      `;

      // Event handlers for this card
      card.querySelector('.slot-toggle-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        haptics.tap();
        await storage.toggleSlotCompletion(slot.id);
        this.completions = await storage.getCompletions();
        this.refreshScheduleAndUI();
      });

      card.querySelector('[data-pace-slot]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pacer.open(slot);
      });

      container.appendChild(card);
    });
  }

  // Water Tracker
  async renderWaterTracker() {
    this.waterData = await storage.getWaterData();
    const count = this.waterData.count || 0;
    const goal = this.waterData.goal || 8;

    const badge = document.getElementById('water-intake-badge');
    const fill = document.getElementById('water-progress-fill');
    const vol = document.getElementById('water-volume-text');
    const grid = document.getElementById('water-glasses-grid');

    if (badge) badge.textContent = `${count} / ${goal} Glasses`;
    const pct = Math.min(100, Math.round((count / goal) * 100));
    if (fill) fill.style.width = `${pct}%`;
    if (vol) vol.textContent = `${(count * 0.25).toFixed(1)} Liters`;

    if (grid) {
      grid.innerHTML = '';
      for (let i = 1; i <= goal; i++) {
        const isFilled = i <= count;
        const btn = document.createElement('button');
        btn.className = `active-press py-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
          isFilled
            ? 'bg-sky-500/20 border-sky-500/40 text-sky-400 shadow-sm'
            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
        }`;
        btn.innerHTML = `
          <svg class="w-6 h-6 transition-transform ${isFilled ? 'scale-110 text-sky-400' : 'text-slate-600'}" viewBox="0 0 24 24" fill="${isFilled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
          <span class="text-[10px] font-bold mt-1">${i}</span>
        `;

        btn.addEventListener('click', async () => {
          haptics.tap();
          const newCount = (count === i) ? i - 1 : i;
          this.waterData = await storage.setWaterGlasses(newCount, goal);
          this.renderWaterTracker();
        });

        grid.appendChild(btn);
      }
    }
  }
}

// Bootstrap app on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  window.satkinApp = new SatkinApp();
});
