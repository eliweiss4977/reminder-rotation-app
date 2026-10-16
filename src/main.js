// Main Application Controller for Satkin Multi-Profile Reminder & Habit Engine
import './style.css';
import { audio } from './audio.js';
import { haptics } from './haptics.js';
import {
  PROFILE_CATEGORIES,
  CATEGORY_THEMES,
  timeToMinutes,
  minutesToTime,
  formatDisplayTime,
  getProfileRemainingText,
  isProfileExpired,
  calculateMergedMultiProfileSchedule
} from './scheduleEngine.js';
import { storage } from './storage.js';
import { notifications } from './notifications.js';
import { PacerController } from './pacer.js';

class SatkinApp {
  constructor() {
    this.profiles = [];
    this.completions = {};
    this.waterData = { count: 0, goal: 8 };
    this.activeTab = 'today';
    this.currentSchedule = [];
    this.nextSlot = null;
    this.countdownTimer = null;
    this.pacer = null;

    // Modal state for profile editor
    this.editingProfileId = null;
    this.editorCategory = PROFILE_CATEGORIES.SATKIN;
    this.editorInterval = 120;
    this.editorFixedTimes = [];
    this.editorDurationType = 'days';

    this.init();
  }

  async init() {
    // 1. Load profiles and completions
    this.profiles = await storage.getProfiles();
    this.completions = await storage.getCompletions();
    this.waterData = await storage.getWaterData();

    // 2. Initialize Pacer modal controller
    this.pacer = new PacerController({
      onComplete: (slot) => this.onPacerCompletedSlot(slot)
    });

    // 3. Initialize Native Notifications & handle notification action tap
    await notifications.init((extra) => {
      console.log('App opened from notification tap with extra:', extra);
      const slotId = extra.slotId;
      const targetSlot = this.currentSchedule.find(s => s.id === slotId) || this.nextSlot;
      
      if (extra.actionType === 'pacer_40' || extra.category === 'satkin') {
        this.pacer.open(targetSlot);
      } else if (extra.actionType === 'log_water') {
        this.logWaterAction(slotId);
      } else if (slotId) {
        storage.markSlotCompleted(slotId).then(all => {
          this.completions = all;
          this.refreshAll();
        });
      }
    });

    // 4. Bind UI event listeners
    this.bindEvents();
    this.bindProfileEditorEvents();

    // 5. Initial Render
    this.updateHeaderDate();
    this.refreshAll();

    // 6. Start live 1-second countdown clock
    this.startCountdownLoop();

    // 7. Schedule next 5 days of multi-profile notifications
    notifications.rescheduleMultiProfileNext5Days(this.profiles);
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
    // Header Test Chime
    document.getElementById('header-test-chime')?.addEventListener('click', () => {
      audio.playSingleRing();
      haptics.milestone();
    });

    // Tab Navigation
    document.getElementById('nav-btn-today')?.addEventListener('click', () => this.switchTab('today'));
    document.getElementById('nav-btn-profiles')?.addEventListener('click', () => this.switchTab('profiles'));
    document.getElementById('nav-btn-stats')?.addEventListener('click', () => this.switchTab('stats'));

    // Manage Profiles Button from Today tab
    document.getElementById('today-manage-profiles-btn')?.addEventListener('click', () => {
      this.switchTab('profiles');
    });

    // Hero Action Buttons
    document.getElementById('hero-action-btn')?.addEventListener('click', () => {
      if (!this.nextSlot) return;
      this.triggerSlotAction(this.nextSlot);
    });

    document.getElementById('hero-mark-done-btn')?.addEventListener('click', async () => {
      if (this.nextSlot) {
        haptics.tap();
        await storage.markSlotCompleted(this.nextSlot.id);
        this.completions = await storage.getCompletions();
        this.refreshAll();
      }
    });

    document.getElementById('hero-test-sound-btn')?.addEventListener('click', () => {
      audio.playSingleRing();
      haptics.milestone();
    });

    // Sync button
    document.getElementById('timeline-sync-btn')?.addEventListener('click', async () => {
      haptics.tick();
      const count = await notifications.rescheduleMultiProfileNext5Days(this.profiles);
      this.refreshAll();
      alert(`Synchronized! ${count} notifications scheduled across the next 5 days.`);
    });

    // Stats tab buttons
    document.getElementById('stats-sync-notifs-btn')?.addEventListener('click', async () => {
      haptics.tick();
      const count = await notifications.rescheduleMultiProfileNext5Days(this.profiles);
      alert(`Synced ${count} notifications for active profiles.`);
    });

    document.getElementById('stats-test-notif-btn')?.addEventListener('click', async () => {
      haptics.tick();
      const activeSatkin = this.profiles.find(p => p.enabled && p.category === 'satkin') || this.profiles[0];
      const ok = await notifications.scheduleTestNotification(activeSatkin?.name || 'Satkin Protocol');
      if (ok) {
        alert('Test alert scheduled in 5 seconds! Background the app to test notification sound.');
      }
    });

    document.getElementById('stats-reset-today-btn')?.addEventListener('click', async () => {
      if (confirm("Reset today's completion checkmarks across all routines?")) {
        const todayKey = this.getTodayKey();
        delete this.completions[todayKey];
        await storage.set('satkin_completions', this.completions);
        this.refreshAll();
        haptics.tick();
      }
    });

    // Open Profile Creator
    document.getElementById('profiles-create-btn')?.addEventListener('click', () => {
      this.openProfileEditor(null);
    });
  }

  switchTab(tab) {
    haptics.tick();
    this.activeTab = tab;

    const tabs = ['today', 'profiles', 'stats'];
    tabs.forEach(t => {
      const content = document.getElementById(`tab-content-${t}`);
      const btn = document.getElementById(`nav-btn-${t}`);

      if (t === tab) {
        content?.classList.remove('hidden');
        btn?.classList.add('text-indigo-400');
        btn?.classList.remove('text-slate-400');
      } else {
        content?.classList.add('hidden');
        btn?.classList.remove('text-indigo-400');
        btn?.classList.add('text-slate-400');
      }
    });

    if (tab === 'profiles') {
      this.renderProfilesList();
    } else if (tab === 'stats') {
      this.renderWaterTracker();
      this.renderAdherenceStats();
    }
  }

  refreshAll() {
    // 1. Calculate unified schedule
    this.currentSchedule = calculateMergedMultiProfileSchedule(this.profiles, this.completions, new Date());

    // 2. Determine next upcoming slot
    this.nextSlot = this.currentSchedule.find(s => s.status === 'next_up') ||
                    this.currentSchedule.find(s => !s.isCompleted) ||
                    this.currentSchedule[0];

    // 3. Render Today Tab
    this.renderActiveProfileChips();
    this.renderHeroCard();
    this.renderTimelineList();

    // 4. Render Profiles & Stats
    this.renderProfilesList();
    this.renderWaterTracker();
    this.renderAdherenceStats();
  }

  // --- TODAY TAB RENDERING ---
  renderActiveProfileChips() {
    const container = document.getElementById('today-active-chips');
    if (!container) return;
    container.innerHTML = '';

    const activeList = this.profiles.filter(p => p.enabled && !isProfileExpired(p));

    if (activeList.length === 0) {
      container.innerHTML = `
        <div class="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
          No profiles active. <button id="chip-activate-btn" class="text-indigo-400 font-bold underline ml-1">Activate a profile</button>
        </div>
      `;
      document.getElementById('chip-activate-btn')?.addEventListener('click', () => this.switchTab('profiles'));
      return;
    }

    activeList.forEach(p => {
      const theme = CATEGORY_THEMES[p.category] || CATEGORY_THEMES.satkin;
      const chip = document.createElement('span');
      chip.className = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${theme.badgeClass}`;
      chip.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full ${theme.dotClass}"></span>
        <span>${p.name}</span>
      `;
      container.appendChild(chip);
    });
  }

  renderHeroCard() {
    const targetTimeEl = document.getElementById('hero-target-time');
    const profileNameEl = document.getElementById('hero-profile-name');
    const badgeEl = document.getElementById('hero-badge');
    const actionBtn = document.getElementById('hero-action-btn');
    const actionText = document.getElementById('hero-action-text');
    const markDoneBtn = document.getElementById('hero-mark-done-btn');
    const markDoneText = document.getElementById('hero-mark-done-text');

    if (!this.nextSlot) {
      if (targetTimeEl) targetTimeEl.textContent = 'All Done!';
      if (profileNameEl) profileNameEl.textContent = 'All scheduled routines completed for today.';
      if (badgeEl) badgeEl.textContent = 'Complete';
      if (actionBtn) actionBtn.classList.add('opacity-50');
      return;
    }

    if (actionBtn) actionBtn.classList.remove('opacity-50');
    if (targetTimeEl) targetTimeEl.textContent = this.nextSlot.displayTime;
    if (profileNameEl) profileNameEl.textContent = `${this.nextSlot.profileName} • ${this.nextSlot.badgeLabel}`;

    const theme = CATEGORY_THEMES[this.nextSlot.category] || CATEGORY_THEMES.satkin;

    if (badgeEl) {
      badgeEl.textContent = theme.label;
      badgeEl.className = `px-2.5 py-0.5 text-[11px] font-bold rounded-full ${theme.badgeClass}`;
    }

    // Adapt hero action button according to actionType
    if (actionBtn && actionText) {
      if (this.nextSlot.actionType === 'pacer_40' || this.nextSlot.category === 'satkin') {
        actionText.textContent = 'Start 40x Sitting Pacer';
        actionBtn.className = 'active-press col-span-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-950/60 flex items-center justify-center gap-2 transition';
      } else if (this.nextSlot.actionType === 'log_water') {
        actionText.textContent = '+1 Glass Water (Log)';
        actionBtn.className = 'active-press col-span-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 text-white font-bold text-sm shadow-lg shadow-cyan-950/60 flex items-center justify-center gap-2 transition';
      } else {
        actionText.textContent = 'Complete Check-in';
        actionBtn.className = 'active-press col-span-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition';
      }
    }

    if (markDoneBtn && markDoneText) {
      if (this.nextSlot.isCompleted) {
        markDoneText.textContent = 'Completed ✓';
        markDoneBtn.classList.add('bg-emerald-950/40', 'border-emerald-500/40', 'text-emerald-300');
      } else {
        markDoneText.textContent = 'Mark Completed';
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

  triggerSlotAction(slot) {
    if (slot.actionType === 'pacer_40' || slot.category === 'satkin') {
      this.pacer.open(slot);
    } else if (slot.actionType === 'log_water') {
      this.logWaterAction(slot.id);
    } else {
      haptics.tap();
      storage.markSlotCompleted(slot.id).then(all => {
        this.completions = all;
        this.refreshAll();
      });
    }
  }

  async logWaterAction(slotId) {
    haptics.tap();
    await storage.incrementWater();
    this.waterData = await storage.getWaterData();
    if (slotId) {
      await storage.markSlotCompleted(slotId);
      this.completions = await storage.getCompletions();
    }
    this.refreshAll();
  }

  async onPacerCompletedSlot(slot) {
    if (slot && slot.id) {
      await storage.markSlotCompleted(slot.id);
      this.completions = await storage.getCompletions();
      this.refreshAll();
    }
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

    if (this.currentSchedule.length === 0) {
      container.innerHTML = `
        <div class="p-6 rounded-2xl glass-card text-center text-slate-400 border border-slate-800">
          <p class="text-xs">No active reminders scheduled for today.</p>
          <button id="timeline-activate-profiles" class="mt-2 text-xs font-bold text-indigo-400 underline">Enable Profiles</button>
        </div>
      `;
      document.getElementById('timeline-activate-profiles')?.addEventListener('click', () => this.switchTab('profiles'));
      return;
    }

    this.currentSchedule.forEach((slot) => {
      const theme = CATEGORY_THEMES[slot.category] || CATEGORY_THEMES.satkin;
      const card = document.createElement('div');

      let cardBorder = 'border-slate-800';
      let cardBg = 'bg-slate-900/60';
      let statusBadge = '';

      if (slot.isCompleted) {
        cardBorder = 'border-emerald-900/40';
        cardBg = 'bg-emerald-950/15 opacity-75';
        statusBadge = `<span class="text-[10px] text-emerald-400 font-medium">Done at ${slot.completedAt || 'today'}</span>`;
      } else if (slot.status === 'next_up') {
        cardBorder = 'border-indigo-500/60 ring-1 ring-indigo-500/30';
        cardBg = 'bg-slate-800/90 shadow-md shadow-indigo-950/40';
        statusBadge = `<span class="text-[10px] text-indigo-300 font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 animate-pulse">Next Up</span>`;
      } else if (slot.status === 'missed') {
        cardBorder = 'border-amber-900/40';
        cardBg = 'bg-slate-900/40';
        statusBadge = `<span class="text-[10px] text-amber-400/80 font-medium">Past window</span>`;
      } else {
        cardBorder = 'border-slate-800/80';
        cardBg = 'bg-slate-900/40';
        statusBadge = `<span class="text-[10px] text-slate-500">Upcoming</span>`;
      }

      // Action button text and styling
      let actionBtnLabel = 'Pace';
      let actionBtnClass = 'bg-indigo-600 hover:bg-indigo-500 text-white';

      if (slot.actionType === 'log_water') {
        actionBtnLabel = '+1 Glass';
        actionBtnClass = 'bg-cyan-600 hover:bg-cyan-500 text-white';
      } else if (slot.actionType === 'check_off') {
        actionBtnLabel = 'Done';
        actionBtnClass = 'bg-emerald-600 hover:bg-emerald-500 text-white';
      }

      card.className = `p-3 rounded-xl border ${cardBorder} ${cardBg} flex items-center justify-between transition-all`;
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <!-- Checkmark Toggle -->
          <button data-slot-id="${slot.id}" class="slot-toggle-btn active-press w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            slot.isCompleted
              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/50'
              : 'border-slate-700 bg-slate-800/60 text-transparent hover:border-emerald-500/60'
          }">
            <svg class="w-4 h-4 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>

          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold ${slot.isCompleted ? 'text-slate-400 line-through' : 'text-white'}">
                ${slot.displayTime}
              </span>
              <span class="text-[10px] px-2 py-0.5 font-bold rounded-full ${theme.badgeClass}">
                ${slot.profileName}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-400">${slot.badgeLabel}</span>
              <span class="text-slate-600">•</span>
              ${statusBadge}
            </div>
          </div>
        </div>

        <!-- Slot Action Button -->
        <button data-slot-action="${slot.id}" class="active-press px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm ${actionBtnClass}">
          <span>${actionBtnLabel}</span>
        </button>
      `;

      card.querySelector('.slot-toggle-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        haptics.tap();
        await storage.toggleSlotCompletion(slot.id);
        this.completions = await storage.getCompletions();
        this.refreshAll();
      });

      card.querySelector('[data-slot-action]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerSlotAction(slot);
      });

      container.appendChild(card);
    });
  }

  // --- TAB 2: PROFILES MANAGEMENT SCREEN ---
  renderProfilesList() {
    const container = document.getElementById('profiles-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (this.profiles.length === 0) {
      container.innerHTML = `
        <div class="p-6 rounded-2xl glass-card text-center text-slate-400 border border-slate-800">
          <p class="text-xs">No reminder profiles configured.</p>
        </div>
      `;
      return;
    }

    this.profiles.forEach(p => {
      const theme = CATEGORY_THEMES[p.category] || CATEGORY_THEMES.satkin;
      const isExpired = isProfileExpired(p);
      const remainingText = getProfileRemainingText(p);

      const card = document.createElement('div');
      card.className = `p-4 rounded-2xl glass-card border border-slate-800/80 space-y-3 transition-all ${
        p.enabled && !isExpired ? 'ring-1 ring-indigo-500/20' : 'opacity-85'
      }`;

      // Interval & Fixed info text
      let scheduleText = '';
      if (p.intervalMinutes > 0) {
        scheduleText = `Every ${p.intervalMinutes >= 60 ? (p.intervalMinutes / 60) + 'h' : p.intervalMinutes + 'm'} (${p.startTime} - ${p.endTime})`;
      } else {
        scheduleText = `Fixed times (${p.startTime} - ${p.endTime})`;
      }

      if (p.specialFixedTimes && p.specialFixedTimes.length > 0) {
        scheduleText += ` • Fixed: ${p.specialFixedTimes.join(', ')}`;
      }

      // Action type label
      let actionLabel = '40x Sitting Pacer';
      if (p.actionType === 'log_water') actionLabel = '+1 Glass Water';
      if (p.actionType === 'check_off') actionLabel = '1-Tap Check-off';

      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded-full font-bold ${theme.badgeClass}">
                ${theme.label}
              </span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                ${remainingText}
              </span>
            </div>
            <h3 class="text-sm font-bold text-white pt-0.5">${p.name}</h3>
            <p class="text-[11px] text-slate-400 leading-snug">${scheduleText}</p>
            <p class="text-[11px] text-slate-500">Action: <span class="text-slate-300 font-medium">${actionLabel}</span></p>
          </div>

          <!-- Instant ON/OFF Toggle Switch -->
          <label class="switch-toggle shrink-0">
            <input type="checkbox" data-toggle-profile="${p.id}" ${p.enabled && !isExpired ? 'checked' : ''} />
            <span class="switch-slider ${theme.colorName}"></span>
          </label>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs">
          <span class="text-[11px] text-slate-500">
            Duration: <span class="text-slate-300">${p.durationType === 'indefinite' ? 'Indefinite' : p.durationValue + ' ' + p.durationType}</span>
          </span>

          <div class="flex items-center gap-2">
            <button data-edit-profile="${p.id}" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold active-press transition">
              Edit
            </button>
            <button data-delete-profile="${p.id}" class="px-2.5 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-semibold border border-rose-800/30 active-press transition">
              Delete
            </button>
          </div>
        </div>
      `;

      // Event: Toggle Enabled
      card.querySelector('[data-toggle-profile]')?.addEventListener('change', async (e) => {
        haptics.tick();
        this.profiles = await storage.toggleProfileEnabled(p.id);
        await notifications.rescheduleMultiProfileNext5Days(this.profiles);
        this.refreshAll();
      });

      // Event: Edit Profile
      card.querySelector('[data-edit-profile]')?.addEventListener('click', () => {
        this.openProfileEditor(p);
      });

      // Event: Delete Profile
      card.querySelector('[data-delete-profile]')?.addEventListener('click', async () => {
        if (confirm(`Delete profile "${p.name}"?`)) {
          haptics.tick();
          this.profiles = await storage.deleteProfile(p.id);
          await notifications.rescheduleMultiProfileNext5Days(this.profiles);
          this.refreshAll();
        }
      });

      container.appendChild(card);
    });
  }

  // --- TAB 3: WATER & STATS RENDERING ---
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
            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-sm'
            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
        }`;
        btn.innerHTML = `
          <svg class="w-6 h-6 transition-transform ${isFilled ? 'scale-110 text-cyan-400' : 'text-slate-600'}" viewBox="0 0 24 24" fill="${isFilled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
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

  renderAdherenceStats() {
    const container = document.getElementById('stats-profiles-breakdown');
    if (!container) return;
    container.innerHTML = '';

    const todaySlots = this.currentSchedule;
    const activeProfiles = this.profiles.filter(p => p.enabled && !isProfileExpired(p));

    if (activeProfiles.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500">No active routines.</p>';
      return;
    }

    activeProfiles.forEach(p => {
      const theme = CATEGORY_THEMES[p.category] || CATEGORY_THEMES.satkin;
      const profileSlots = todaySlots.filter(s => s.profileId === p.id);
      const completed = profileSlots.filter(s => s.isCompleted).length;
      const total = profileSlots.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'space-y-1';
      row.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-slate-200 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${theme.dotClass}"></span>
            ${p.name}
          </span>
          <span class="text-slate-400 font-mono">${completed}/${total} (${pct}%)</span>
        </div>
        <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full bg-indigo-500 rounded-full" style="width: ${pct}%"></div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // --- PROFILE CREATE / EDIT MODAL LOGIC ---
  bindProfileEditorEvents() {
    const modal = document.getElementById('profile-modal');
    document.getElementById('profile-modal-close')?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
    });

    document.getElementById('edit-cancel-btn')?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
    });

    // Category pills
    document.getElementById('cat-btn-satkin')?.addEventListener('click', () => this.setEditorCategory(PROFILE_CATEGORIES.SATKIN));
    document.getElementById('cat-btn-water')?.addEventListener('click', () => this.setEditorCategory(PROFILE_CATEGORIES.WATER));
    document.getElementById('cat-btn-habit')?.addEventListener('click', () => this.setEditorCategory(PROFILE_CATEGORIES.HABIT));

    // Interval pills
    document.querySelectorAll('.int-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = e.currentTarget.getAttribute('data-interval');
        this.setEditorInterval(val);
      });
    });

    // Duration pills
    document.getElementById('dur-btn-indefinite')?.addEventListener('click', () => this.setEditorDurationType('indefinite'));
    document.getElementById('dur-btn-days')?.addEventListener('click', () => this.setEditorDurationType('days'));
    document.getElementById('dur-btn-hours')?.addEventListener('click', () => this.setEditorDurationType('hours'));

    // Special fixed time presets
    document.getElementById('fixed-preset-2and7')?.addEventListener('click', () => {
      this.editorFixedTimes = ['14:00', '19:00'];
      this.renderEditorFixedChips();
    });

    document.getElementById('fixed-preset-4and7')?.addEventListener('click', () => {
      this.editorFixedTimes = ['16:00', '19:00'];
      this.renderEditorFixedChips();
    });

    document.getElementById('fixed-preset-clear')?.addEventListener('click', () => {
      this.editorFixedTimes = [];
      this.renderEditorFixedChips();
    });

    // Add custom fixed time
    document.getElementById('edit-add-fixed-btn')?.addEventListener('click', () => {
      const input = document.getElementById('edit-new-fixed-time');
      const val = input?.value;
      if (val && !this.editorFixedTimes.includes(val)) {
        this.editorFixedTimes.push(val);
        this.editorFixedTimes.sort();
        this.renderEditorFixedChips();
      }
    });

    // Save profile button
    document.getElementById('edit-save-btn')?.addEventListener('click', () => {
      this.saveEditorProfile();
    });
  }

  openProfileEditor(profile = null) {
    const modal = document.getElementById('profile-modal');
    const modalTitle = document.getElementById('profile-modal-title');
    const nameInput = document.getElementById('edit-profile-name');
    const actionSelect = document.getElementById('edit-action-type');
    const startInput = document.getElementById('edit-start-time');
    const endInput = document.getElementById('edit-end-time');
    const durValueInput = document.getElementById('edit-duration-value');

    if (profile) {
      this.editingProfileId = profile.id;
      if (modalTitle) modalTitle.textContent = 'Edit Reminder Profile';
      if (nameInput) nameInput.value = profile.name;
      if (actionSelect) actionSelect.value = profile.actionType || 'pacer_40';
      if (startInput) startInput.value = profile.startTime || '07:00';
      if (endInput) endInput.value = profile.endTime || '22:30';
      if (durValueInput) durValueInput.value = profile.durationValue || 7;

      this.editorCategory = profile.category || PROFILE_CATEGORIES.SATKIN;
      this.editorInterval = profile.intervalMinutes !== undefined ? profile.intervalMinutes : 120;
      this.editorFixedTimes = [...(profile.specialFixedTimes || [])];
      this.editorDurationType = profile.durationType || 'days';
    } else {
      this.editingProfileId = null;
      if (modalTitle) modalTitle.textContent = 'Create Reminder Profile';
      if (nameInput) nameInput.value = '';
      if (actionSelect) actionSelect.value = 'pacer_40';
      if (startInput) startInput.value = '07:00';
      if (endInput) endInput.value = '22:30';
      if (durValueInput) durValueInput.value = 7;

      this.editorCategory = PROFILE_CATEGORIES.SATKIN;
      this.editorInterval = 120;
      this.editorFixedTimes = ['14:00', '19:00'];
      this.editorDurationType = 'days';
    }

    this.setEditorCategory(this.editorCategory);
    this.setEditorInterval(this.editorInterval);
    this.setEditorDurationType(this.editorDurationType);
    this.renderEditorFixedChips();

    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
    haptics.tick();
  }

  setEditorCategory(cat) {
    this.editorCategory = cat;
    const btnSatkin = document.getElementById('cat-btn-satkin');
    const btnWater = document.getElementById('cat-btn-water');
    const btnHabit = document.getElementById('cat-btn-habit');
    const actionSelect = document.getElementById('edit-action-type');

    [btnSatkin, btnWater, btnHabit].forEach(b => {
      b?.classList.remove('bg-indigo-500/20', 'border-indigo-500/50', 'text-indigo-300',
                          'bg-cyan-500/20', 'border-cyan-500/50', 'text-cyan-300',
                          'bg-emerald-500/20', 'border-emerald-500/50', 'text-emerald-300');
      b?.classList.add('bg-slate-900', 'border-slate-800', 'text-slate-400');
    });

    if (cat === PROFILE_CATEGORIES.SATKIN) {
      btnSatkin?.classList.add('bg-indigo-500/20', 'border-indigo-500/50', 'text-indigo-300');
      if (actionSelect) actionSelect.value = 'pacer_40';
    } else if (cat === PROFILE_CATEGORIES.WATER) {
      btnWater?.classList.add('bg-cyan-500/20', 'border-cyan-500/50', 'text-cyan-300');
      if (actionSelect) actionSelect.value = 'log_water';
    } else {
      btnHabit?.classList.add('bg-emerald-500/20', 'border-emerald-500/50', 'text-emerald-300');
      if (actionSelect) actionSelect.value = 'check_off';
    }
  }

  setEditorInterval(val) {
    const customRow = document.getElementById('custom-interval-input-row');
    const customInput = document.getElementById('edit-custom-interval');

    document.querySelectorAll('.int-pill').forEach(btn => {
      btn.className = 'int-pill active-press py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300';
    });

    if (val === 'custom') {
      customRow?.classList.remove('hidden');
      const activeBtn = document.querySelector('[data-interval="custom"]');
      if (activeBtn) activeBtn.className = 'int-pill active-press py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white';
      this.editorInterval = parseInt(customInput?.value, 10) || 120;
    } else {
      customRow?.classList.add('hidden');
      const num = parseInt(val, 10);
      this.editorInterval = num;
      const activeBtn = document.querySelector(`[data-interval="${num}"]`);
      if (activeBtn) activeBtn.className = 'int-pill active-press py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white';
    }
  }

  setEditorDurationType(type) {
    this.editorDurationType = type;
    const btnIndefinite = document.getElementById('dur-btn-indefinite');
    const btnDays = document.getElementById('dur-btn-days');
    const btnHours = document.getElementById('dur-btn-hours');
    const valueRow = document.getElementById('duration-value-row');
    const unitLabel = document.getElementById('duration-unit-label');

    [btnIndefinite, btnDays, btnHours].forEach(b => {
      b?.classList.remove('bg-indigo-600', 'text-white', 'font-bold');
      b?.classList.add('bg-slate-900', 'border-slate-800', 'text-slate-300', 'font-medium');
    });

    if (type === 'indefinite') {
      btnIndefinite?.classList.add('bg-indigo-600', 'text-white', 'font-bold');
      valueRow?.classList.add('hidden');
    } else {
      valueRow?.classList.remove('hidden');
      if (type === 'days') {
        btnDays?.classList.add('bg-indigo-600', 'text-white', 'font-bold');
        if (unitLabel) unitLabel.textContent = 'Days from activation';
      } else {
        btnHours?.classList.add('bg-indigo-600', 'text-white', 'font-bold');
        if (unitLabel) unitLabel.textContent = 'Hours from activation';
      }
    }
  }

  renderEditorFixedChips() {
    const container = document.getElementById('edit-fixed-chips-list');
    if (!container) return;
    container.innerHTML = '';

    if (this.editorFixedTimes.length === 0) {
      container.innerHTML = '<span class="text-[11px] text-slate-500 italic">No extra fixed times</span>';
      return;
    }

    this.editorFixedTimes.forEach(tStr => {
      const chip = document.createElement('span');
      chip.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-xs text-amber-300 border border-slate-700';
      chip.innerHTML = `
        <span>${formatDisplayTime(tStr)}</span>
        <button type="button" data-remove-time="${tStr}" class="text-slate-400 hover:text-rose-400 ml-0.5 font-bold">×</button>
      `;
      chip.querySelector('[data-remove-time]')?.addEventListener('click', (e) => {
        const timeToRemove = e.currentTarget.getAttribute('data-remove-time');
        this.editorFixedTimes = this.editorFixedTimes.filter(t => t !== timeToRemove);
        this.renderEditorFixedChips();
      });
      container.appendChild(chip);
    });
  }

  async saveEditorProfile() {
    const nameInput = document.getElementById('edit-profile-name');
    const actionSelect = document.getElementById('edit-action-type');
    const startInput = document.getElementById('edit-start-time');
    const endInput = document.getElementById('edit-end-time');
    const durValueInput = document.getElementById('edit-duration-value');

    const name = nameInput?.value?.trim();
    if (!name) {
      alert('Please enter a profile name.');
      return;
    }

    const durationVal = this.editorDurationType === 'indefinite' ? 0 : (parseInt(durValueInput?.value, 10) || 7);

    const profileData = {
      id: this.editingProfileId || `prof_${Date.now()}`,
      name,
      category: this.editorCategory,
      enabled: true,
      startTime: startInput?.value || '07:00',
      endTime: endInput?.value || '22:30',
      intervalMinutes: this.editorInterval,
      specialFixedTimes: this.editorFixedTimes,
      durationType: this.editorDurationType,
      durationValue: durationVal,
      activatedAt: Date.now(),
      actionType: actionSelect?.value || 'pacer_40'
    };

    haptics.success();
    this.profiles = await storage.saveProfile(profileData);
    await notifications.rescheduleMultiProfileNext5Days(this.profiles);

    const modal = document.getElementById('profile-modal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');

    this.refreshAll();
  }
}

// Bootstrap app on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  window.satkinApp = new SatkinApp();
});
