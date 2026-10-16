// Main Application Controller for Satkin Multi-Profile Reminder, Weight & Habit Engine
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
    this.activeTab = 'today';
    this.currentSchedule = [];
    this.nextSlot = null;
    this.countdownTimer = null;
    this.pacer = null;

    // Weight & Goals state
    this.weightSettings = { unit: 'lbs', startWeight: 185.0, currentWeight: 181.4, goalWeight: 170.0 };
    this.weightLogs = [];
    this.chartRange = '7d';
    this.customGoals = [];
    this.goalLogs = {};

    // Profile editor modal state
    this.editingProfileId = null;
    this.editorCategory = PROFILE_CATEGORIES.SATKIN;
    this.editorInterval = 120;
    this.editorFixedTimes = [];
    this.editorDurationType = 'days';
    this.editorLinkedGoalId = null;

    // Custom Goal modal state
    this.newGoalIcon = '💧';
    this.newGoalType = 'counter';

    this.init();
  }

  async init() {
    // 1. Load persisted data
    this.profiles = await storage.getProfiles();
    this.completions = await storage.getCompletions();
    this.weightSettings = await storage.getWeightSettings();
    this.weightLogs = await storage.getWeightLogs();
    this.customGoals = await storage.getCustomGoals();
    this.goalLogs = await storage.getGoalLogs();

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
      } else if (extra.actionType === 'log_weight' || extra.category === 'weight') {
        this.openWeightModal(slotId);
      } else if (extra.actionType === 'custom_goal' && extra.customGoalId) {
        this.triggerGoalIncrement(extra.customGoalId, slotId);
      } else if (extra.actionType === 'log_water') {
        this.triggerGoalIncrement('goal_water', slotId);
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
    this.bindWeightEvents();
    this.bindCustomGoalEvents();

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

    // Stats tab notification actions
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
      this.renderWeightSection();
      this.renderCustomGoalsSection();
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
    this.renderWeightSection();
    this.renderCustomGoalsSection();
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

    // Dynamic hero action button text & styling
    if (actionBtn && actionText) {
      if (this.nextSlot.actionType === 'pacer_40' || this.nextSlot.category === 'satkin') {
        actionText.textContent = 'Start 40x Sitting Pacer';
        actionBtn.className = 'active-press col-span-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-950/60 flex items-center justify-center gap-2 transition';
      } else if (this.nextSlot.actionType === 'log_weight' || this.nextSlot.category === 'weight') {
        actionText.textContent = "⚖️ Log Today's Weight";
        actionBtn.className = 'active-press col-span-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-white font-bold text-sm shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 transition';
      } else if (this.nextSlot.actionType === 'custom_goal') {
        const goal = this.customGoals.find(g => g.id === this.nextSlot.customGoalId);
        actionText.textContent = goal ? `${goal.icon} ${goal.title} (+${goal.stepAmount})` : 'Update Custom Goal';
        actionBtn.className = 'active-press col-span-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition';
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
    } else if (slot.actionType === 'log_weight' || slot.category === 'weight') {
      this.openWeightModal(slot.id);
    } else if (slot.actionType === 'custom_goal') {
      const goalId = slot.customGoalId || 'goal_water';
      this.triggerGoalIncrement(goalId, slot.id);
    } else if (slot.actionType === 'log_water') {
      this.triggerGoalIncrement('goal_water', slot.id);
    } else {
      haptics.tap();
      storage.markSlotCompleted(slot.id).then(all => {
        this.completions = all;
        this.refreshAll();
      });
    }
  }

  async triggerGoalIncrement(goalId, slotId = null) {
    haptics.tap();
    const goal = this.customGoals.find(g => g.id === goalId);
    const step = goal ? (goal.stepAmount || 1) : 1;
    await storage.incrementGoal(goalId, step);
    this.goalLogs = await storage.getGoalLogs();

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

      // Slot action button label
      let actionBtnLabel = 'Pace';
      let actionBtnClass = 'bg-indigo-600 hover:bg-indigo-500 text-white';

      if (slot.actionType === 'log_weight' || slot.category === 'weight') {
        actionBtnLabel = 'Log Wt';
        actionBtnClass = 'bg-amber-600 hover:bg-amber-500 text-white';
      } else if (slot.actionType === 'log_water') {
        actionBtnLabel = '+1 Glass';
        actionBtnClass = 'bg-cyan-600 hover:bg-cyan-500 text-white';
      } else if (slot.actionType === 'custom_goal') {
        const goal = this.customGoals.find(g => g.id === slot.customGoalId);
        actionBtnLabel = goal ? `+${goal.stepAmount} ${goal.unit}` : 'Done';
        actionBtnClass = 'bg-emerald-600 hover:bg-emerald-500 text-white';
      } else if (slot.actionType === 'check_off') {
        actionBtnLabel = 'Done';
        actionBtnClass = 'bg-emerald-600 hover:bg-emerald-500 text-white';
      }

      card.className = `p-3 rounded-xl border ${cardBorder} ${cardBg} flex items-center justify-between transition-all`;
      card.innerHTML = `
        <div class="flex items-center gap-3">
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

  // --- TAB 2: PROFILES MANAGEMENT ---
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

      let scheduleText = '';
      if (p.intervalMinutes > 0) {
        scheduleText = `Every ${p.intervalMinutes >= 60 ? (p.intervalMinutes / 60) + 'h' : p.intervalMinutes + 'm'} (${p.startTime} - ${p.endTime})`;
      } else {
        scheduleText = `Fixed times (${p.startTime} - ${p.endTime})`;
      }

      if (p.specialFixedTimes && p.specialFixedTimes.length > 0) {
        scheduleText += ` • Fixed: ${p.specialFixedTimes.join(', ')}`;
      }

      let actionLabel = '40x Sitting Pacer';
      if (p.actionType === 'log_weight') actionLabel = "Log Today's Weight";
      if (p.actionType === 'log_water') actionLabel = '+1 Glass Water';
      if (p.actionType === 'custom_goal') {
        const goal = this.customGoals.find(g => g.id === p.customGoalId);
        actionLabel = goal ? `Goal: ${goal.title}` : 'Custom Goal';
      }
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

      card.querySelector('[data-toggle-profile]')?.addEventListener('change', async () => {
        haptics.tick();
        this.profiles = await storage.toggleProfileEnabled(p.id);
        await notifications.rescheduleMultiProfileNext5Days(this.profiles);
        this.refreshAll();
      });

      card.querySelector('[data-edit-profile]')?.addEventListener('click', () => {
        this.openProfileEditor(p);
      });

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

  // --- TAB 3: WEIGHT & CUSTOM GOALS ENGINE ---
  bindWeightEvents() {
    // Unit Toggle
    document.getElementById('weight-unit-toggle')?.addEventListener('click', async () => {
      haptics.tap();
      const currentUnit = this.weightSettings.unit || 'lbs';
      const newUnit = currentUnit === 'lbs' ? 'kg' : 'lbs';

      // Convert stored values smoothly
      const factor = newUnit === 'kg' ? (1 / 2.20462) : 2.20462;
      this.weightSettings.unit = newUnit;
      this.weightSettings.startWeight = Math.round(this.weightSettings.startWeight * factor * 10) / 10;
      this.weightSettings.currentWeight = Math.round(this.weightSettings.currentWeight * factor * 10) / 10;
      this.weightSettings.goalWeight = Math.round(this.weightSettings.goalWeight * factor * 10) / 10;

      await storage.saveWeightSettings(this.weightSettings);
      this.renderWeightSection();
    });

    // Chart Range Buttons
    document.getElementById('chart-range-7d')?.addEventListener('click', () => this.setChartRange('7d'));
    document.getElementById('chart-range-30d')?.addEventListener('click', () => this.setChartRange('30d'));
    document.getElementById('chart-range-all')?.addEventListener('click', () => this.setChartRange('all'));

    // Open Log Weight Modal
    document.getElementById('open-log-weight-btn')?.addEventListener('click', () => {
      this.openWeightModal(null);
    });

    // Weight modal close / cancel
    document.getElementById('weight-modal-close')?.addEventListener('click', () => this.closeWeightModal());
    document.getElementById('weight-modal-cancel')?.addEventListener('click', () => this.closeWeightModal());

    // Weight steppers
    document.getElementById('step-minus-1')?.addEventListener('click', () => this.adjustWeightInput(-1.0));
    document.getElementById('step-minus-02')?.addEventListener('click', () => this.adjustWeightInput(-0.2));
    document.getElementById('step-plus-02')?.addEventListener('click', () => this.adjustWeightInput(0.2));
    document.getElementById('step-plus-1')?.addEventListener('click', () => this.adjustWeightInput(1.0));

    // Save Weigh-In
    document.getElementById('weight-modal-save')?.addEventListener('click', async () => {
      await this.saveWeightEntry();
    });
  }

  setChartRange(range) {
    this.chartRange = range;
    ['7d', '30d', 'all'].forEach(r => {
      const btn = document.getElementById(`chart-range-${r}`);
      if (r === range) {
        btn?.classList.add('bg-amber-500/20', 'text-amber-300', 'border', 'border-amber-500/40', 'font-bold');
        btn?.classList.remove('text-slate-400');
      } else {
        btn?.classList.remove('bg-amber-500/20', 'text-amber-300', 'border', 'border-amber-500/40', 'font-bold');
        btn?.classList.add('text-slate-400');
      }
    });
    this.renderWeightChart();
  }

  openWeightModal(slotId = null) {
    this.pendingWeightSlotId = slotId;
    const modal = document.getElementById('weight-modal');
    const valInput = document.getElementById('weight-input-value');
    const noteInput = document.getElementById('weight-input-note');
    const goalInput = document.getElementById('weight-input-goal-target');
    const unitLabel = document.getElementById('weight-input-unit-label');
    const goalUnitLabel = document.getElementById('weight-goal-unit-label');

    const unit = this.weightSettings.unit || 'lbs';
    if (unitLabel) unitLabel.textContent = unit;
    if (goalUnitLabel) goalUnitLabel.textContent = unit;
    if (valInput) valInput.value = (this.weightSettings.currentWeight || 180.0).toFixed(1);
    if (goalInput) goalInput.value = (this.weightSettings.goalWeight || 170.0).toFixed(1);
    if (noteInput) noteInput.value = '';

    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
    haptics.tick();
  }

  closeWeightModal() {
    const modal = document.getElementById('weight-modal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
    this.pendingWeightSlotId = null;
  }

  adjustWeightInput(delta) {
    haptics.tick();
    const valInput = document.getElementById('weight-input-value');
    if (!valInput) return;
    const curr = parseFloat(valInput.value) || 180.0;
    valInput.value = (Math.round((curr + delta) * 10) / 10).toFixed(1);
  }

  async saveWeightEntry() {
    const valInput = document.getElementById('weight-input-value');
    const noteInput = document.getElementById('weight-input-note');
    const goalInput = document.getElementById('weight-input-goal-target');

    const weightVal = parseFloat(valInput?.value);
    if (isNaN(weightVal) || weightVal <= 0) {
      alert('Please enter a valid weight.');
      return;
    }

    if (goalInput?.value) {
      this.weightSettings.goalWeight = parseFloat(goalInput.value);
    }

    const { logs, settings } = await storage.addWeightLog({
      weight: weightVal,
      note: noteInput?.value || ''
    });

    this.weightLogs = logs;
    this.weightSettings = settings;

    // If triggered by a Today slot or active Morning Weigh-In slot, mark completed!
    if (this.pendingWeightSlotId) {
      await storage.markSlotCompleted(this.pendingWeightSlotId);
      this.completions = await storage.getCompletions();
    } else {
      const weighInSlot = this.currentSchedule.find(s => s.actionType === 'log_weight');
      if (weighInSlot) {
        await storage.markSlotCompleted(weighInSlot.id);
        this.completions = await storage.getCompletions();
      }
    }

    audio.playSingleRing();
    haptics.success();
    this.closeWeightModal();
    this.refreshAll();
  }

  renderWeightSection() {
    const unit = this.weightSettings.unit || 'lbs';
    const unitLabel = document.getElementById('weight-unit-label');
    if (unitLabel) unitLabel.textContent = unit;

    const startEl = document.getElementById('stat-weight-start');
    const currentEl = document.getElementById('stat-weight-current');
    const goalEl = document.getElementById('stat-weight-goal');
    const totalLostEl = document.getElementById('stat-weight-total-lost');
    const remainingEl = document.getElementById('stat-weight-remaining');
    const progressFill = document.getElementById('weight-progress-fill');

    const start = this.weightSettings.startWeight || 185.0;
    const current = this.weightSettings.currentWeight || start;
    const goal = this.weightSettings.goalWeight || 170.0;

    if (startEl) startEl.textContent = `${start.toFixed(1)} ${unit}`;
    if (currentEl) currentEl.textContent = `${current.toFixed(1)} ${unit}`;
    if (goalEl) goalEl.textContent = `${goal.toFixed(1)} ${unit}`;

    const diff = Math.round((current - start) * 10) / 10;
    const toGoal = Math.round((current - goal) * 10) / 10;

    if (totalLostEl) {
      totalLostEl.textContent = diff <= 0 ? `Lost: ${Math.abs(diff).toFixed(1)} ${unit}` : `Change: +${diff.toFixed(1)} ${unit}`;
      totalLostEl.className = diff <= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
    }

    if (remainingEl) {
      remainingEl.textContent = toGoal > 0 ? `${toGoal.toFixed(1)} ${unit} to goal` : `Goal reached! 🎉`;
    }

    if (progressFill) {
      const totalSpan = start - goal;
      const progressSpan = start - current;
      const pct = totalSpan > 0 ? Math.min(100, Math.max(0, Math.round((progressSpan / totalSpan) * 100))) : 100;
      progressFill.style.width = `${pct}%`;
    }

    this.renderWeightChart();
    this.renderWeightHistory();
  }

  renderWeightChart() {
    const container = document.getElementById('weight-chart-container');
    if (!container) return;

    let entries = [...this.weightLogs];
    if (this.chartRange === '7d') {
      const cutoff = Date.now() - 7 * 86400000;
      entries = entries.filter(e => e.timestamp >= cutoff);
    } else if (this.chartRange === '30d') {
      const cutoff = Date.now() - 30 * 86400000;
      entries = entries.filter(e => e.timestamp >= cutoff);
    }

    if (entries.length < 2) {
      container.innerHTML = '<div class="text-[11px] text-slate-500 italic">Log at least 2 entries to see trend line</div>';
      return;
    }

    const width = 340;
    const height = 130;
    const padX = 25;
    const padY = 20;

    const weights = entries.map(e => e.weight);
    const goal = this.weightSettings.goalWeight || 170.0;
    const allVals = [...weights, goal];

    const minVal = Math.min(...allVals) - 1.0;
    const maxVal = Math.max(...allVals) + 1.0;
    const valRange = maxVal - minVal || 1;

    const points = entries.map((e, idx) => {
      const x = padX + (idx / (entries.length - 1)) * (width - padX * 2);
      const y = height - padY - ((e.weight - minVal) / valRange) * (height - padY * 2);
      return { x, y, weight: e.weight, date: e.date };
    });

    const goalY = height - padY - ((goal - minVal) / valRange) * (height - padY * 2);

    const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const firstP = points[0];
    const lastP = points[points.length - 1];
    const areaPoints = `${firstP.x},${height - 10} ` + polylinePoints + ` ${lastP.x},${height - 10}`;

    const dotsSvg = points.map(p => `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#f59e0b" stroke="#090d16" stroke-width="2"></circle>
      <text x="${p.x.toFixed(1)}" y="${(p.y - 7).toFixed(1)}" fill="#fcd34d" font-size="9" font-weight="bold" text-anchor="middle">${p.weight}</text>
    `).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02"/>
          </linearGradient>
        </defs>

        <!-- Area fill under line -->
        <polygon points="${areaPoints}" fill="url(#weightGrad)"/>

        <!-- Dashed Goal Line -->
        <line x1="${padX}" y1="${goalY.toFixed(1)}" x2="${width - padX}" y2="${goalY.toFixed(1)}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.8"/>
        <text x="${width - padX + 2}" y="${(goalY + 3).toFixed(1)}" fill="#10b981" font-size="9" font-weight="bold">Goal ${goal}</text>

        <!-- Trend Line -->
        <polyline fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}"/>

        <!-- Data point dots & values -->
        ${dotsSvg}
      </svg>
    `;
  }

  renderWeightHistory() {
    const listEl = document.getElementById('weight-history-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const unit = this.weightSettings.unit || 'lbs';
    const sorted = [...this.weightLogs].reverse();

    if (sorted.length === 0) {
      listEl.innerHTML = '<span class="text-[11px] text-slate-500 italic">No entries logged yet.</span>';
      return;
    }

    sorted.forEach((entry, idx) => {
      const prevEntry = sorted[idx + 1];
      let deltaText = '';
      if (prevEntry) {
        const diff = Math.round((entry.weight - prevEntry.weight) * 10) / 10;
        if (diff < 0) deltaText = `<span class="text-emerald-400 font-bold">↓ ${Math.abs(diff).toFixed(1)}</span>`;
        else if (diff > 0) deltaText = `<span class="text-amber-400 font-bold">↑ ${diff.toFixed(1)}</span>`;
        else deltaText = `<span class="text-slate-500">- 0.0</span>`;
      }

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="font-bold text-white">${entry.weight.toFixed(1)} ${unit}</span>
          ${deltaText}
          <span class="text-[10px] text-slate-500">${entry.date}</span>
          ${entry.note ? `<span class="text-[10px] text-slate-400 italic">• ${entry.note}</span>` : ''}
        </div>
        <button data-del-weight="${entry.id}" class="text-slate-500 hover:text-rose-400 px-1 font-bold">×</button>
      `;

      row.querySelector('[data-del-weight]')?.addEventListener('click', async () => {
        if (confirm(`Delete entry ${entry.weight} ${unit} from ${entry.date}?`)) {
          haptics.tick();
          const { logs, settings } = await storage.deleteWeightLog(entry.id);
          this.weightLogs = logs;
          this.weightSettings = settings;
          this.renderWeightSection();
        }
      });

      listEl.appendChild(row);
    });
  }

  // --- CUSTOM GOALS TRACKER LOGIC ---
  bindCustomGoalEvents() {
    document.getElementById('open-add-goal-btn')?.addEventListener('click', () => {
      this.openGoalModal();
    });

    document.getElementById('goal-modal-close')?.addEventListener('click', () => this.closeGoalModal());
    document.getElementById('goal-modal-cancel')?.addEventListener('click', () => this.closeGoalModal());

    // Emoji Picker
    document.querySelectorAll('.goal-emoji-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.goal-emoji-btn').forEach(b => b.classList.replace('border-emerald-500', 'border-slate-800'));
        e.currentTarget.classList.replace('border-slate-800', 'border-emerald-500');
        this.newGoalIcon = e.currentTarget.textContent.trim();
      });
    });

    // Goal Type buttons
    const btnCounter = document.getElementById('goal-type-counter-btn');
    const btnBool = document.getElementById('goal-type-boolean-btn');
    const counterRow = document.getElementById('goal-counter-config-row');

    btnCounter?.addEventListener('click', () => {
      this.newGoalType = 'counter';
      btnCounter.className = 'active-press py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white border border-emerald-500 shadow';
      btnBool.className = 'active-press py-2 rounded-xl text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800';
      counterRow?.classList.remove('hidden');
    });

    btnBool?.addEventListener('click', () => {
      this.newGoalType = 'boolean';
      btnBool.className = 'active-press py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white border border-emerald-500 shadow';
      btnCounter.className = 'active-press py-2 rounded-xl text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800';
      counterRow?.classList.add('hidden');
    });

    // Save Goal
    document.getElementById('goal-modal-save')?.addEventListener('click', async () => {
      await this.saveCustomGoal();
    });
  }

  openGoalModal() {
    const modal = document.getElementById('goal-modal');
    const titleInput = document.getElementById('goal-input-title');
    if (titleInput) titleInput.value = '';
    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
    haptics.tick();
  }

  closeGoalModal() {
    const modal = document.getElementById('goal-modal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  }

  async saveCustomGoal() {
    const titleInput = document.getElementById('goal-input-title');
    const targetInput = document.getElementById('goal-input-target');
    const unitInput = document.getElementById('goal-input-unit');
    const stepInput = document.getElementById('goal-input-step');

    const title = titleInput?.value?.trim();
    if (!title) {
      alert('Please enter a goal title.');
      return;
    }

    const goalData = {
      id: `goal_${Date.now()}`,
      title,
      icon: this.newGoalIcon || '🎯',
      goalType: this.newGoalType,
      targetValue: this.newGoalType === 'boolean' ? 1 : (parseFloat(targetInput?.value) || 8),
      unit: this.newGoalType === 'boolean' ? 'done' : (unitInput?.value || 'times'),
      stepAmount: this.newGoalType === 'boolean' ? 1 : (parseFloat(stepInput?.value) || 1)
    };

    haptics.success();
    this.customGoals = await storage.addCustomGoal(goalData);
    this.closeGoalModal();
    this.renderCustomGoalsSection();
  }

  async renderCustomGoalsSection() {
    const container = document.getElementById('custom-goals-container');
    if (!container) return;
    container.innerHTML = '';

    const today = this.getTodayKey();

    for (const goal of this.customGoals) {
      const currentVal = await storage.getTodayGoalValue(goal.id, today);
      const streak = await storage.calculateGoalStreak(goal.id, goal.targetValue);
      const isComplete = currentVal >= goal.targetValue;
      const pct = Math.min(100, Math.round((currentVal / (goal.targetValue || 1)) * 100));

      const card = document.createElement('div');
      card.className = `p-3.5 rounded-xl border transition-all ${
        isComplete
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
          : 'bg-slate-900/70 border-slate-800'
      }`;

      // Stepper vs Checkbox control
      let actionControl = '';
      if (goal.goalType === 'boolean') {
        actionControl = `
          <button data-toggle-bool="${goal.id}" class="active-press px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            isComplete
              ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }">
            <span>${isComplete ? 'Done ✓' : 'Mark Done'}</span>
          </button>
        `;
      } else {
        actionControl = `
          <div class="flex items-center gap-1">
            <button data-sub-goal="${goal.id}" class="active-press w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white font-bold text-sm flex items-center justify-center">-</button>
            <button data-add-goal="${goal.id}" class="active-press px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1">
              <span>+${goal.stepAmount}</span>
            </button>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${goal.icon}</span>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>${goal.title}</span>
                ${streak > 0 ? `<span class="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">🔥 ${streak}d</span>` : ''}
              </div>
              <div class="text-[11px] text-slate-400 font-mono">
                ${currentVal} / ${goal.targetValue} ${goal.unit}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${actionControl}
            <button data-del-goal="${goal.id}" class="text-slate-600 hover:text-rose-400 text-sm font-bold ml-1">×</button>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300" style="width: ${pct}%"></div>
        </div>
      `;

      // Event handlers
      card.querySelector('[data-add-goal]')?.addEventListener('click', async () => {
        haptics.tap();
        await storage.incrementGoal(goal.id, goal.stepAmount);
        this.renderCustomGoalsSection();
      });

      card.querySelector('[data-sub-goal]')?.addEventListener('click', async () => {
        haptics.tick();
        await storage.incrementGoal(goal.id, -goal.stepAmount);
        this.renderCustomGoalsSection();
      });

      card.querySelector('[data-toggle-bool]')?.addEventListener('click', async () => {
        haptics.tap();
        const nextVal = currentVal >= 1 ? 0 : 1;
        await storage.setGoalValue(goal.id, nextVal);
        if (nextVal >= 1) audio.playSingleRing();
        this.renderCustomGoalsSection();
      });

      card.querySelector('[data-del-goal]')?.addEventListener('click', async () => {
        if (confirm(`Delete goal "${goal.title}"?`)) {
          haptics.tick();
          this.customGoals = await storage.deleteCustomGoal(goal.id);
          this.renderCustomGoalsSection();
        }
      });

      container.appendChild(card);
    }
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

    // Category pills (Satkin / Weight / Water / Habit)
    document.getElementById('cat-btn-satkin')?.addEventListener('click', () => this.setEditorCategory(PROFILE_CATEGORIES.SATKIN));
    document.getElementById('cat-btn-weight')?.addEventListener('click', () => this.setEditorCategory(PROFILE_CATEGORIES.WEIGHT));
    document.getElementById('cat-btn-water')?.addEventListener('click', () => this.setEditorCategory(PROFILE_CATEGORIES.WATER));
    document.getElementById('cat-btn-habit')?.addEventListener('click', () => this.setEditorCategory(PROFILE_CATEGORIES.HABIT));

    // Action Type change
    document.getElementById('edit-action-type')?.addEventListener('change', (e) => {
      const val = e.target.value;
      const linkedRow = document.getElementById('linked-goal-row');
      if (val === 'custom_goal') {
        linkedRow?.classList.remove('hidden');
        this.populateLinkedGoalSelect();
      } else {
        linkedRow?.classList.add('hidden');
      }
    });

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

  populateLinkedGoalSelect() {
    const select = document.getElementById('edit-linked-goal-select');
    if (!select) return;
    select.innerHTML = '';
    this.customGoals.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${g.icon} ${g.title} (${g.targetValue} ${g.unit})`;
      if (g.id === this.editorLinkedGoalId) opt.selected = true;
      select.appendChild(opt);
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
    const linkedRow = document.getElementById('linked-goal-row');

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
      this.editorLinkedGoalId = profile.customGoalId || null;

      if (profile.actionType === 'custom_goal') {
        linkedRow?.classList.remove('hidden');
        this.populateLinkedGoalSelect();
      } else {
        linkedRow?.classList.add('hidden');
      }
    } else {
      this.editingProfileId = null;
      if (modalTitle) modalTitle.textContent = 'Create Reminder Profile';
      if (nameInput) nameInput.value = '';
      if (actionSelect) actionSelect.value = 'pacer_40';
      if (startInput) startInput.value = '07:00';
      if (endInput) endInput.value = '22:30';
      if (durValueInput) durValueInput.value = 7;
      linkedRow?.classList.add('hidden');

      this.editorCategory = PROFILE_CATEGORIES.SATKIN;
      this.editorInterval = 120;
      this.editorFixedTimes = ['14:00', '19:00'];
      this.editorDurationType = 'days';
      this.editorLinkedGoalId = null;
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
    const btnWeight = document.getElementById('cat-btn-weight');
    const btnWater = document.getElementById('cat-btn-water');
    const btnHabit = document.getElementById('cat-btn-habit');
    const actionSelect = document.getElementById('edit-action-type');

    [btnSatkin, btnWeight, btnWater, btnHabit].forEach(b => {
      b?.classList.remove('bg-indigo-500/20', 'border-indigo-500/50', 'text-indigo-300',
                          'bg-amber-500/20', 'border-amber-500/50', 'text-amber-300',
                          'bg-cyan-500/20', 'border-cyan-500/50', 'text-cyan-300',
                          'bg-emerald-500/20', 'border-emerald-500/50', 'text-emerald-300');
      b?.classList.add('bg-slate-900', 'border-slate-800', 'text-slate-400');
    });

    if (cat === PROFILE_CATEGORIES.SATKIN) {
      btnSatkin?.classList.add('bg-indigo-500/20', 'border-indigo-500/50', 'text-indigo-300');
      if (actionSelect) actionSelect.value = 'pacer_40';
    } else if (cat === PROFILE_CATEGORIES.WEIGHT) {
      btnWeight?.classList.add('bg-amber-500/20', 'border-amber-500/50', 'text-amber-300');
      if (actionSelect) actionSelect.value = 'log_weight';
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
    const linkedGoalSelect = document.getElementById('edit-linked-goal-select');

    const name = nameInput?.value?.trim();
    if (!name) {
      alert('Please enter a profile name.');
      return;
    }

    const durationVal = this.editorDurationType === 'indefinite' ? 0 : (parseInt(durValueInput?.value, 10) || 7);
    const actionType = actionSelect?.value || 'pacer_40';
    const customGoalId = actionType === 'custom_goal' ? linkedGoalSelect?.value : null;

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
      actionType,
      customGoalId
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
