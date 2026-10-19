// Main Application Controller for Rotation Reminder & Habit Engine
import './style.css';
import { audio, RINGTONES } from './audio.js';
import { haptics } from './haptics.js';
import { escapeHtml, getLocalDateString } from './utils.js';
import {
  PROFILE_CATEGORIES,
  CATEGORY_THEMES,
  timeToMinutes,
  minutesToTime,
  formatDisplayTime,
  getProfileRemainingText,
  isProfileExpired,
  calculateProfileDailySlots,
  calculateMergedMultiProfileSchedule
} from './scheduleEngine.js';
import {
  storage,
  ALARM_TEMPLATES,
  DEFAULT_BODY_PROFILE,
  calculateBMI,
  getBMICategory,
  calculateMilestoneLadder
} from './storage.js';
import { notifications } from './notifications.js';
import { PacerController } from './pacer.js';
import { appLock } from './applock.js';
import { onboardingWizard } from './onboarding.js';

class RotationReminderApp {
  constructor() {
    this.profiles = [];
    this.completions = {};
    this.activeTab = 'alarms'; // Default to Alarms Home Screen
    this.currentSchedule = [];
    this.nextSlot = null;
    this.countdownTimer = null;
    this.pacer = null;
    this.currentDateKey = getLocalDateString();

    // Weight, Body Profile & Goals state (100% clean, zero fake assumed data)
    this.weightSettings = { unit: 'lbs', startWeight: null, currentWeight: null, goalWeight: null, isConfigured: false };
    this.bodyProfile = { ...DEFAULT_BODY_PROFILE };
    this.weightLogs = [];
    this.chartRange = '7d';
    this.customGoals = [];
    this.goalLogs = {};

    // Profile editor modal state
    this.editingProfileId = null;
    this.editorCategory = PROFILE_CATEGORIES.ROTATION;
    this.editorInterval = 120;
    this.editorFixedTimes = [];
    this.editorDurationType = 'days';
    this.editorDurationValue = 7;
    this.editorRingtone = 'ring_classic';
    this.editorAlertMode = 'sound_vibrate';
    this.editorLinkedGoalId = null;

    // Custom Goal modal state
    this.newGoalIcon = '💧';
    this.newGoalType = 'counter';

    this.init();
  }

  async reloadAllData() {
    this.profiles = await storage.getProfiles();
    this.completions = await storage.getCompletions();
    this.weightSettings = await storage.getWeightSettings();
    this.bodyProfile = await storage.getBodyProfile();
    this.weightLogs = await storage.getWeightLogs();
    this.customGoals = await storage.getCustomGoals();
    this.goalLogs = await storage.getGoalLogs();
  }

  async init() {
    // 0. Startup check: clear any pre-assumed fake seed data if onboarding not completed
    await storage.checkAndClearPreAssumedDataIfNeeded();

    // 0b. Initialize App Lock (locks screen if enabled)
    await appLock.init();

    // 1. Load persisted data
    await this.reloadAllData();

    // 1b. Check onboarding status & setup wizard
    onboardingWizard.bindDOMEvents();
    const onboardingDone = await storage.isOnboardingCompleted();
    if (!onboardingDone) {
      onboardingWizard.open(false, async () => {
        await this.reloadAllData();
        this.refreshAll();
      });
    }

    // 2. Initialize Pacer modal controller
    this.pacer = new PacerController({
      onComplete: (slot) => this.onPacerCompletedSlot(slot)
    });

    // 3. Initialize Native Notifications & handle interactive actions
    await notifications.init((extra, actionId) => {
      const slotId = extra?.slotId;
      const targetSlot = this.currentSchedule.find(s => s.id === slotId) || this.nextSlot;

      if (actionId === 'MARK_DONE' && slotId) {
        storage.markSlotCompleted(slotId).then(all => {
          this.completions = all;
          this.refreshAll();
        });
        return;
      }

      if (actionId === 'LOG_HABIT') {
        if (extra.actionType === 'log_water') {
          this.triggerGoalIncrement('goal_water', slotId);
        } else if (extra.customGoalId) {
          this.triggerGoalIncrement(extra.customGoalId, slotId);
        } else if (slotId) {
          storage.markSlotCompleted(slotId).then(all => {
            this.completions = all;
            this.refreshAll();
          });
        }
        return;
      }

      if (extra.actionType === 'pacer_40' || extra.category === 'rotation' || extra.category === 'satkin' || actionId === 'OPEN_PACER') {
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
    this.bindBodyProfileEvents();
    this.bindCustomGoalEvents();

    const versionBadge = document.getElementById('app-version-badge');
    if (versionBadge) {
      versionBadge.textContent = import.meta.env.VITE_APP_VERSION || 'v1.0.0';
    }

    // 5. Initial Render
    this.updateHeaderDate();
    this.refreshAll();

    // 6. Start live 1-second countdown clock
    this.startCountdownLoop();

    // 7. Schedule next 5 days of multi-profile notifications
    notifications.rescheduleMultiProfileNext5Days(this.profiles);

    // 8. Check notification and exact alarm permissions
    this.checkNotificationPermissions();
  }

  getTodayKey() {
    return getLocalDateString();
  }

  async checkNotificationPermissions() {
    const banner = document.getElementById('permission-warning-banner');
    if (!banner) return;
    try {
      const hasPermission = await notifications.checkPermission();
      if (!hasPermission) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    } catch (e) {
      console.warn('Could not check notification permissions:', e);
    }
  }

  checkMidnightDateRollover() {
    const todayKey = this.getTodayKey();
    if (todayKey !== this.currentDateKey) {
      this.currentDateKey = todayKey;
      this.updateHeaderDate();
      this.refreshAll();
      notifications.rescheduleMultiProfileNext5Days(this.profiles);
    }
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
    // Top Permission Banner Enable Action
    document.getElementById('btn-request-notification-perms')?.addEventListener('click', async () => {
      haptics.tap();
      const granted = await notifications.requestPermission();
      const banner = document.getElementById('permission-warning-banner');
      if (granted) {
        if (banner) banner.classList.add('hidden');
        haptics.success();
        await notifications.rescheduleMultiProfileNext5Days(this.profiles);
      } else {
        alert('Notification & alarm permissions are required for rotation reminders to ring while phone is locked.');
      }
    });

    // Check permissions and midnight rollover on app visibility resume
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkNotificationPermissions();
        this.checkMidnightDateRollover();
      }
    });

    // Header Test Chime
    document.getElementById('header-test-chime')?.addEventListener('click', () => {
      audio.playSingleRing();
      haptics.milestone();
    });

    // Tab Navigation
    document.getElementById('nav-btn-alarms')?.addEventListener('click', () => this.switchTab('alarms'));
    document.getElementById('nav-btn-goals')?.addEventListener('click', () => this.switchTab('goals'));
    document.getElementById('nav-btn-profile')?.addEventListener('click', () => this.switchTab('profile'));

    // Backward-compat aliases
    document.getElementById('nav-btn-today')?.addEventListener('click', () => this.switchTab('alarms'));
    document.getElementById('nav-btn-stats')?.addEventListener('click', () => this.switchTab('goals'));

    // Manage Alarms Button
    document.getElementById('today-manage-profiles-btn')?.addEventListener('click', () => {
      this.switchTab('alarms');
    });

    // Create Alarm buttons (Header & Floating FAB)
    document.getElementById('alarms-create-header-btn')?.addEventListener('click', () => {
      this.openAlarmWizard(null);
    });

    document.getElementById('alarms-floating-add-btn')?.addEventListener('click', () => {
      this.openAlarmWizard(null);
    });

    // Top Summary Quick 40x Pacer Button
    document.getElementById('alarms-top-pacer-btn')?.addEventListener('click', () => {
      this.pacer.open(this.nextSlot || null);
    });

    // Hero Action Buttons (if present)
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
      const ring = this.nextSlot?.ringtone || 'ring_classic';
      audio.playRingtone(ring);
      haptics.milestone();
    });

    // Sync button
    document.getElementById('timeline-sync-btn')?.addEventListener('click', async () => {
      haptics.tick();
      const count = await notifications.rescheduleMultiProfileNext5Days(this.profiles);
      this.refreshAll();
      alert(`Synchronized! ${count} notifications scheduled across the next 5 days.`);
    });
  }

  switchTab(rawTab) {
    haptics.tick();
    let tab = rawTab;
    if (tab === 'today') tab = 'alarms';
    if (tab === 'stats') tab = 'goals';
    if (tab === 'profiles') tab = 'alarms';
    this.activeTab = tab;

    const tabs = ['alarms', 'goals', 'profile'];
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

    if (tab === 'alarms') {
      this.renderAlarmsList();
      this.updateAlarmsTopSummary();
    } else if (tab === 'goals') {
      this.renderCustomGoalsSection();
      this.renderWeightSection();
    } else if (tab === 'profile') {
      this.renderBodyProfileAndMilestones();
    }
  }

  refreshAll() {
    // 1. Calculate unified schedule
    this.currentSchedule = calculateMergedMultiProfileSchedule(this.profiles, this.completions, new Date());

    // 2. Determine next upcoming slot
    this.nextSlot = this.currentSchedule.find(s => s.status === 'next_up') ||
                    this.currentSchedule.find(s => !s.isCompleted) ||
                    this.currentSchedule[0];

    // 3. Render Alarms Home Screen
    this.updateAlarmsTopSummary();
    this.renderAlarmsList();

    // 4. Render Goals & Weight Tab
    this.renderCustomGoalsSection();
    this.renderWeightSection();

    // 5. Render Profile Tab
    this.renderBodyProfileAndMilestones();
  }

  updateAlarmsTopSummary() {
    const timeEl = document.getElementById('alarms-top-next-time');
    const titleEl = document.getElementById('alarms-top-next-title');

    if (!this.nextSlot) {
      if (timeEl) timeEl.textContent = 'All Done!';
      if (titleEl) titleEl.textContent = 'All scheduled rings completed for today.';
      return;
    }

    if (timeEl) timeEl.textContent = this.nextSlot.displayTime;
    if (titleEl) titleEl.textContent = `${this.nextSlot.profileName} • ${this.nextSlot.badgeLabel}`;
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
        <span>${escapeHtml(p.name)}</span>
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
    const topCountdownEl = document.getElementById('alarms-top-countdown');
    if (!this.nextSlot) {
      if (topCountdownEl) topCountdownEl.textContent = '--:--:--';
      return;
    }

    const now = new Date();
    const target = new Date();
    const h = Math.floor(this.nextSlot.minutes / 60);
    const m = this.nextSlot.minutes % 60;
    target.setHours(h, m, 0, 0);

    let diffMs = target.getTime() - now.getTime();

    if (this.nextSlot.isCompleted) {
      if (countdownEl) {
        countdownEl.textContent = 'DONE';
        countdownEl.className = 'text-2xl font-mono font-bold text-emerald-400 tabular-nums';
      }
      if (topCountdownEl) topCountdownEl.textContent = 'DONE';
      return;
    }

    if (diffMs < 0) {
      const overdueSecs = Math.abs(Math.floor(diffMs / 1000));
      const mm = String(Math.floor(overdueSecs / 60)).padStart(2, '0');
      const ss = String(overdueSecs % 60).padStart(2, '0');
      const text = `+${mm}:${ss}`;
      if (countdownEl) {
        countdownEl.textContent = text;
        countdownEl.className = 'text-2xl font-mono font-bold text-rose-400 tabular-nums animate-pulse';
      }
      if (topCountdownEl) topCountdownEl.textContent = text;
      return;
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    const clockText = `${hrs}:${mins}:${secs}`;

    if (countdownEl) {
      countdownEl.textContent = clockText;
      countdownEl.className = 'text-2xl font-mono font-bold text-amber-400 tabular-nums';
    }
    if (topCountdownEl) topCountdownEl.textContent = clockText;
  }

  startCountdownLoop() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.checkMidnightDateRollover();
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
                ${escapeHtml(slot.displayTime)}
              </span>
              <span class="text-[10px] px-2 py-0.5 font-bold rounded-full ${theme.badgeClass}">
                ${escapeHtml(slot.profileName)}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-400">${escapeHtml(slot.badgeLabel)}</span>
              <span class="text-slate-600">•</span>
              ${statusBadge}
            </div>
          </div>
        </div>

        <button data-slot-action="${slot.id}" class="active-press min-h-[44px] min-w-[70px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm ${actionBtnClass}">
          <span>${escapeHtml(actionBtnLabel)}</span>
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

  // --- TAB 1: ALARMS & REMINDERS HOME SCREEN ---
  renderAlarmsList() {
    const container = document.getElementById('alarms-list-container');
    const badgeCount = document.getElementById('alarms-active-count-badge');
    if (!container) return;
    container.innerHTML = '';

    const activeCount = this.profiles.filter(p => p.enabled && !isProfileExpired(p)).length;
    if (badgeCount) {
      badgeCount.textContent = `${activeCount} Active`;
    }

    if (this.profiles.length === 0) {
      container.innerHTML = `
        <div class="p-8 rounded-2xl glass-card text-center text-slate-400 border border-slate-800 space-y-3">
          <div class="text-4xl">⏰</div>
          <h3 class="text-base font-bold text-white">No Alarms Configured</h3>
          <p class="text-xs text-slate-400 max-w-xs mx-auto">Create your first alarm or pick from 8 pre-made templates like 2h Rotation.</p>
          <button id="alarms-empty-add-btn" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg active-press transition">
            + Choose a Template
          </button>
        </div>
      `;
      document.getElementById('alarms-empty-add-btn')?.addEventListener('click', () => this.openAlarmWizard(null));
      return;
    }

    const todayDateKey = this.getTodayKey();
    const todayCompleted = this.completions[todayDateKey] || {};

    this.profiles.forEach(p => {
      const theme = CATEGORY_THEMES[p.category] || CATEGORY_THEMES.rotation || CATEGORY_THEMES.satkin;
      const isExpired = isProfileExpired(p);
      const remainingText = getProfileRemainingText(p);
      const ringKey = p.ringtone || 'ring_classic';
      const ringMeta = RINGTONES.find(r => r.id === ringKey) || RINGTONES[0];
      const alertMode = p.alertMode || 'sound_vibrate';

      let alertModeBadge = '';
      if (alertMode === 'vibrate_only') {
        alertModeBadge = '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">📳 Vibrate Only</span>';
      } else if (alertMode === 'sound_only') {
        alertModeBadge = '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">🔉 Sound Only</span>';
      } else {
        alertModeBadge = '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">🔊 Sound & Vibe</span>';
      }

      let audioPreviewRow = '';
      if (alertMode === 'vibrate_only') {
        audioPreviewRow = `
          <div class="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-xs">📳</span>
              <span class="text-slate-300 text-[11px] font-semibold">Vibrate Only (Silent Alarm)</span>
            </div>
            <button type="button" data-test-vibe="${p.id}" class="active-press px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-[11px] border border-indigo-500/20 flex items-center gap-1 transition">
              <span>📳</span>
              <span>Test Vibe</span>
            </button>
          </div>
        `;
      } else {
        audioPreviewRow = `
          <div class="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-xs">${ringMeta.icon}</span>
              <span class="text-slate-300 text-[11px] font-semibold">${ringMeta.name}</span>
            </div>
            <button type="button" data-test-ringtone="${ringKey}" class="active-press px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[11px] border border-amber-500/20 flex items-center gap-1 transition">
              <span>🔊</span>
              <span>Test Sound</span>
            </button>
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = `p-4 rounded-2xl glass-card border border-slate-800/80 space-y-3 transition-all ${
        p.enabled && !isExpired ? 'ring-1 ring-indigo-500/20 shadow-lg shadow-black/30' : 'opacity-70 bg-slate-950/40'
      }`;

      let scheduleCadence = '';
      if (p.intervalMinutes > 0) {
        scheduleCadence = `Every ${p.intervalMinutes >= 60 ? (p.intervalMinutes / 60) + 'h' : p.intervalMinutes + 'm'}`;
      } else {
        scheduleCadence = 'Fixed Times Only';
      }

      // Calculate today's exact ring times pills for this profile
      const dailySlots = calculateProfileDailySlots(p, new Date());
      let slotsPillsHtml = '';

      if (dailySlots.length === 0) {
        slotsPillsHtml = '<span class="text-[11px] text-slate-500 italic">No rings scheduled for today</span>';
      } else {
        slotsPillsHtml = dailySlots.map(slot => {
          const isDone = !!todayCompleted[slot.id];
          const isSpecial = !!slot.isSpecial;
          const starIcon = isSpecial ? '⭐ ' : '';
          const checkIcon = isDone ? '✓ ' : '';

          let pillClasses = 'px-2 py-0.5 rounded text-[11px] font-mono font-medium transition cursor-pointer active-press ';
          if (isDone) {
            pillClasses += 'bg-emerald-950/60 text-emerald-300 line-through border border-emerald-800/50';
          } else if (isSpecial) {
            pillClasses += 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40';
          } else {
            pillClasses += 'bg-slate-800/90 text-slate-300 border border-slate-700 hover:border-indigo-500';
          }

          return `<button type="button" data-slot-id="${slot.id}" class="${pillClasses}">${checkIcon}${starIcon}${slot.displayTime}</button>`;
        }).join('');
      }

      let expiredBanner = '';
      if (isExpired) {
        const cycleDays = p.durationValue || 10;
        expiredBanner = `
          <div class="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-2">
            <div class="space-y-0.5">
              <div class="text-xs font-bold flex items-center gap-1.5 text-amber-300">
                <span>🏁</span>
                <span>${cycleDays}-Day Block Concluded</span>
              </div>
              <p class="text-[11px] text-amber-300/80">Completed your cycle! Ready to begin the next 10-day block?</p>
            </div>
            <button type="button" data-restart-cycle="${p.id}" class="active-press px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shadow transition">
              Restart ${cycleDays}d Block
            </button>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${theme.badgeClass}">
                ${theme.label}
              </span>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                ${remainingText}
              </span>
              ${alertModeBadge}
            </div>
            <h3 class="text-sm font-bold text-white pt-0.5">${escapeHtml(p.name)}</h3>
            <div class="flex items-center gap-2 text-[11px] text-slate-400">
              <span>⏰ ${formatDisplayTime(p.startTime || '07:00')} – ${formatDisplayTime(p.endTime || '23:00')}</span>
              <span>•</span>
              <span class="text-slate-300 font-medium">${scheduleCadence}</span>
            </div>
          </div>

          <!-- Instant ON/OFF Switch -->
          <label class="switch-toggle shrink-0 ml-3">
            <input type="checkbox" data-toggle-profile="${p.id}" ${p.enabled && !isExpired ? 'checked' : ''} />
            <span class="switch-slider ${theme.colorName}"></span>
          </label>
        </div>

        <!-- 10-Day Block Concluded Prompt Banner -->
        ${expiredBanner}

        <!-- Alert Mode & Sound / Vibe Preview Row -->
        ${audioPreviewRow}

        <!-- Today's exact ring times expandable / horizontal flow -->
        <div class="space-y-1 pt-1 border-t border-slate-800/60">
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span class="font-semibold text-slate-300">Today's Ring Times (${dailySlots.length}):</span>
            <span class="text-[10px] text-slate-500">Tap time to action</span>
          </div>
          <div class="flex flex-wrap gap-1.5 pt-0.5">
            ${slotsPillsHtml}
          </div>
        </div>

        <!-- Card Footer -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs">
          <span class="text-[11px] text-slate-500">
            Duration: <span class="text-slate-300 font-medium">${p.durationType === 'indefinite' ? 'Always On' : escapeHtml(p.durationValue) + ' ' + escapeHtml(p.durationType)}</span>
          </span>

          <div class="flex items-center gap-2">
            <button data-edit-profile="${p.id}" class="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold active-press transition flex items-center justify-center">
              Edit
            </button>
            <button data-delete-profile="${p.id}" class="min-h-[44px] px-3 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-semibold border border-rose-800/30 active-press transition flex items-center justify-center">
              Delete
            </button>
          </div>
        </div>
      `;

      // Restart expired cycle block button
      card.querySelector('[data-restart-cycle]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        haptics.success();
        const cycleDays = p.durationValue || 10;
        p.activatedAt = Date.now();
        p.enabled = true;
        if (p.durationType === 'days') {
          p.expiresAt = p.activatedAt + (cycleDays * 24 * 60 * 60 * 1000);
        }
        this.profiles = await storage.saveProfile(p);
        await notifications.rescheduleMultiProfileNext5Days(this.profiles);
        this.refreshAll();
      });

      // Toggle profile enabled switch
      card.querySelector('[data-toggle-profile]')?.addEventListener('change', async () => {
        haptics.tick();
        this.profiles = await storage.toggleProfileEnabled(p.id);
        await notifications.rescheduleMultiProfileNext5Days(this.profiles);
        this.refreshAll();
      });

      // Test sound preview
      card.querySelector('[data-test-ringtone]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const rKey = e.currentTarget.getAttribute('data-test-ringtone') || 'ring_classic';
        audio.playRingtone(rKey);
        haptics.milestone();
      });

      // Test vibration preview
      card.querySelector('[data-test-vibe]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        haptics.milestone();
      });

      // Edit profile
      card.querySelector('[data-edit-profile]')?.addEventListener('click', () => {
        this.openAlarmWizard(p);
      });

      // Delete profile
      card.querySelector('[data-delete-profile]')?.addEventListener('click', async () => {
        if (confirm(`Delete alarm "${p.name}"?`)) {
          haptics.tick();
          this.profiles = await storage.deleteProfile(p.id);
          await notifications.rescheduleMultiProfileNext5Days(this.profiles);
          this.refreshAll();
        }
      });

      // Today's slot pills click (open Pacer or toggle done)
      card.querySelectorAll('[data-slot-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const sId = e.currentTarget.getAttribute('data-slot-id');
          const matchedSlot = dailySlots.find(s => s.id === sId);
          if (matchedSlot) {
            this.triggerSlotAction(matchedSlot);
          }
        });
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

    const start = this.weightSettings.startWeight;
    const current = this.weightSettings.currentWeight;
    const goal = this.weightSettings.goalWeight;

    if (startEl) startEl.textContent = start !== null ? `${start.toFixed(1)} ${unit}` : '--';
    if (currentEl) currentEl.textContent = current !== null ? `${current.toFixed(1)} ${unit}` : '--';
    if (goalEl) goalEl.textContent = goal !== null ? `${goal.toFixed(1)} ${unit}` : '--';

    if (start !== null && current !== null) {
      const diff = Math.round((current - start) * 10) / 10;
      if (totalLostEl) {
        totalLostEl.textContent = diff <= 0 ? `Lost: ${Math.abs(diff).toFixed(1)} ${unit}` : `Change: +${diff.toFixed(1)} ${unit}`;
        totalLostEl.className = diff <= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
      }
    } else {
      if (totalLostEl) {
        totalLostEl.textContent = 'Total: --';
        totalLostEl.className = 'text-slate-400 font-semibold';
      }
    }

    if (current !== null && goal !== null) {
      const toGoal = Math.round((current - goal) * 10) / 10;
      if (remainingEl) {
        remainingEl.textContent = toGoal > 0 ? `${toGoal.toFixed(1)} ${unit} to goal` : `Goal reached! 🎉`;
      }
      if (progressFill && start !== null) {
        const totalSpan = start - goal;
        const progressSpan = start - current;
        const pct = totalSpan > 0 ? Math.min(100, Math.max(0, Math.round((progressSpan / totalSpan) * 100))) : (toGoal <= 0 ? 100 : 0);
        progressFill.style.width = `${pct}%`;
      }
    } else {
      if (remainingEl) remainingEl.textContent = '-- to goal';
      if (progressFill) progressFill.style.width = '0%';
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
          <span class="font-bold text-white">${entry.weight.toFixed(1)} ${escapeHtml(unit)}</span>
          ${deltaText}
          <span class="text-[10px] text-slate-500">${escapeHtml(entry.date)}</span>
          ${entry.note ? `<span class="text-[10px] text-slate-400 italic">• ${escapeHtml(entry.note)}</span>` : ''}
        </div>
        <button data-del-weight="${entry.id}" class="text-slate-500 hover:text-rose-400 px-2 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-base">×</button>
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

    if (this.customGoals.length === 0) {
      container.innerHTML = `
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          No custom goals yet. Tap "+ Goal" above to track habits like hydration or walking.
        </div>
      `;
      return;
    }

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
          <button data-toggle-bool="${goal.id}" class="active-press min-h-[44px] min-w-[90px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            isComplete
              ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }">
            <span>${isComplete ? 'Done ✓' : 'Mark Done'}</span>
          </button>
        `;
      } else {
        actionControl = `
          <div class="flex items-center gap-1.5">
            <button data-sub-goal="${goal.id}" class="active-press min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-base flex items-center justify-center border border-slate-700">-</button>
            <button data-add-goal="${goal.id}" class="active-press min-h-[44px] min-w-[54px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm">
              <span>+${escapeHtml(goal.stepAmount)}</span>
            </button>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${escapeHtml(goal.icon)}</span>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>${escapeHtml(goal.title)}</span>
                ${streak > 0 ? `<span class="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">🔥 ${streak}d</span>` : ''}
              </div>
              <div class="text-[11px] text-slate-400 font-mono">
                ${currentVal} / ${escapeHtml(goal.targetValue)} ${escapeHtml(goal.unit)}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${actionControl}
            <button data-del-goal="${goal.id}" class="text-slate-500 hover:text-rose-400 min-h-[44px] min-w-[44px] flex items-center justify-center text-lg font-bold ml-1">×</button>
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


  // --- ALARM WIZARD & PROFILE EDITOR LOGIC ---
  bindProfileEditorEvents() {
    const modal = document.getElementById('profile-modal');
    const closeWizard = () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
    };

    document.getElementById('wizard-templates-close')?.addEventListener('click', closeWizard);
    document.getElementById('profile-modal-close')?.addEventListener('click', closeWizard);
    document.getElementById('edit-cancel-btn')?.addEventListener('click', closeWizard);

    // Back button from Step B to Step A
    document.getElementById('wizard-back-to-templates')?.addEventListener('click', () => {
      haptics.tick();
      document.getElementById('wizard-step-templates')?.classList.remove('hidden');
      document.getElementById('wizard-step-customize')?.classList.add('hidden');
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
      this.updateWizardLivePreview();
    });

    // Time window inputs change
    document.getElementById('edit-start-time')?.addEventListener('input', () => this.updateWizardLivePreview());
    document.getElementById('edit-end-time')?.addEventListener('input', () => this.updateWizardLivePreview());

    // Interval pills
    document.querySelectorAll('.int-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = e.currentTarget.getAttribute('data-interval');
        this.setEditorInterval(val);
        this.updateWizardLivePreview();
      });
    });

    document.getElementById('edit-custom-interval')?.addEventListener('input', () => {
      this.editorInterval = parseInt(document.getElementById('edit-custom-interval')?.value, 10) || 120;
      this.updateWizardLivePreview();
    });

    // Duration & Cycle Length buttons
    document.getElementById('dur-btn-10days')?.addEventListener('click', () => {
      haptics.tick();
      this.setEditorDuration('days', 10);
    });
    document.getElementById('dur-btn-7days')?.addEventListener('click', () => {
      haptics.tick();
      this.setEditorDuration('days', 7);
    });
    document.getElementById('dur-btn-indefinite')?.addEventListener('click', () => {
      haptics.tick();
      this.setEditorDuration('indefinite', 0);
    });
    document.getElementById('dur-btn-custom')?.addEventListener('click', () => {
      haptics.tick();
      const valInput = document.getElementById('edit-duration-value');
      const cur = parseInt(valInput?.value, 10) || 14;
      this.setEditorDuration('days', cur);
      valInput?.focus();
    });
    document.getElementById('edit-duration-value')?.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10) || 1;
      this.setEditorDuration('days', v);
    });

    // Special fixed quick toggle chips (2 PM, 3 PM, 4 PM, 7 PM)
    document.querySelectorAll('.special-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        haptics.tick();
        const timeVal = e.currentTarget.getAttribute('data-special');
        if (!timeVal) return;
        if (this.editorFixedTimes.includes(timeVal)) {
          this.editorFixedTimes = this.editorFixedTimes.filter(t => t !== timeVal);
        } else {
          this.editorFixedTimes.push(timeVal);
          this.editorFixedTimes.sort();
        }
        this.updateSpecialChipsUI();
        this.renderEditorFixedChips();
        this.updateWizardLivePreview();
      });
    });

    // Special fixed clear button
    document.getElementById('fixed-preset-clear')?.addEventListener('click', () => {
      haptics.tick();
      this.editorFixedTimes = [];
      this.updateSpecialChipsUI();
      this.renderEditorFixedChips();
      this.updateWizardLivePreview();
    });

    // Add custom fixed time
    document.getElementById('edit-add-fixed-btn')?.addEventListener('click', () => {
      const input = document.getElementById('edit-new-fixed-time');
      const val = input?.value;
      if (val && !this.editorFixedTimes.includes(val)) {
        haptics.tick();
        this.editorFixedTimes.push(val);
        this.editorFixedTimes.sort();
        this.updateSpecialChipsUI();
        this.renderEditorFixedChips();
        this.updateWizardLivePreview();
      }
    });

    // Alert Mode buttons (Sound & Vibe, Sound Only, Vibrate Only)
    document.getElementById('alert-mode-sv')?.addEventListener('click', () => {
      haptics.tick();
      this.setEditorAlertMode('sound_vibrate');
    });
    document.getElementById('alert-mode-so')?.addEventListener('click', () => {
      haptics.tick();
      this.setEditorAlertMode('sound_only');
    });
    document.getElementById('alert-mode-vo')?.addEventListener('click', () => {
      haptics.tick();
      this.setEditorAlertMode('vibrate_only');
    });
    document.getElementById('alert-mode-test-vibe-btn')?.addEventListener('click', () => {
      haptics.milestone();
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

  openAlarmWizard(profile = null) {
    const modal = document.getElementById('profile-modal');
    const stepTemplates = document.getElementById('wizard-step-templates');
    const stepCustomize = document.getElementById('wizard-step-customize');
    const modalTitle = document.getElementById('profile-modal-title');
    const nameInput = document.getElementById('edit-profile-name');
    const actionSelect = document.getElementById('edit-action-type');
    const startInput = document.getElementById('edit-start-time');
    const endInput = document.getElementById('edit-end-time');
    const durValueInput = document.getElementById('edit-duration-value');
    const linkedRow = document.getElementById('linked-goal-row');

    if (profile) {
      // Direct Edit Mode (Step B)
      this.editingProfileId = profile.id;
      if (stepTemplates) stepTemplates.classList.add('hidden');
      if (stepCustomize) stepCustomize.classList.remove('hidden');
      if (modalTitle) modalTitle.textContent = 'Edit Alarm / Reminder';

      if (nameInput) nameInput.value = profile.name;
      if (actionSelect) actionSelect.value = profile.actionType || 'pacer_40';
      if (startInput) startInput.value = profile.startTime || '07:00';
      if (endInput) endInput.value = profile.endTime || '23:00';
      const durVal = profile.durationValue !== undefined && profile.durationValue !== null ? profile.durationValue : 10;
      if (durValueInput) durValueInput.value = durVal;

      this.editorCategory = profile.category || PROFILE_CATEGORIES.ROTATION;
      this.editorInterval = profile.intervalMinutes !== undefined ? profile.intervalMinutes : 120;
      this.editorFixedTimes = [...(profile.specialFixedTimes || [])];
      this.editorDurationType = profile.durationType || 'days';
      this.editorDurationValue = durVal;
      this.editorRingtone = profile.ringtone || 'ring_classic';
      this.editorAlertMode = profile.alertMode || 'sound_vibrate';
      this.editorLinkedGoalId = profile.customGoalId || null;

      if (profile.actionType === 'custom_goal') {
        linkedRow?.classList.remove('hidden');
        this.populateLinkedGoalSelect();
      } else {
        linkedRow?.classList.add('hidden');
      }

      this.setEditorCategory(this.editorCategory);
      this.setEditorInterval(this.editorInterval);
      this.setEditorDuration(this.editorDurationType, this.editorDurationValue);
      this.setEditorAlertMode(this.editorAlertMode);
      this.updateSpecialChipsUI();
      this.renderEditorFixedChips();
      this.renderRingtonePicker();
      this.updateWizardLivePreview();
    } else {
      // Create Mode (Step A: Template Picker)
      this.editingProfileId = null;
      if (stepTemplates) stepTemplates.classList.remove('hidden');
      if (stepCustomize) stepCustomize.classList.add('hidden');
      this.renderWizardTemplates();
    }

    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
    haptics.tick();
  }

  renderWizardTemplates() {
    const grid = document.getElementById('wizard-templates-grid');
    if (!grid) return;
    grid.innerHTML = '';

    ALARM_TEMPLATES.forEach(tpl => {
      const theme = CATEGORY_THEMES[tpl.category] || CATEGORY_THEMES.satkin;
      const card = document.createElement('div');
      card.className = 'active-press p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition shadow-md flex items-start justify-between gap-3';

      let timeSummary = `⏰ ${formatDisplayTime(tpl.startTime)} – ${formatDisplayTime(tpl.endTime)}`;
      if (tpl.intervalMinutes > 0) {
        timeSummary += ` • Every ${tpl.intervalMinutes >= 60 ? (tpl.intervalMinutes / 60) + 'h' : tpl.intervalMinutes + 'm'}`;
      } else {
        timeSummary += ' • Fixed Time';
      }

      if (tpl.specialFixedTimes && tpl.specialFixedTimes.length > 0) {
        timeSummary += ` • ⭐ ${tpl.specialFixedTimes.map(formatDisplayTime).join(', ')}`;
      }

      const ringMeta = RINGTONES.find(r => r.id === tpl.ringtone) || RINGTONES[0];

      card.innerHTML = `
        <div class="space-y-1 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-base">${escapeHtml(tpl.icon || '⏰')}</span>
            <span class="text-xs font-bold text-white">${escapeHtml(tpl.name)}</span>
            <span class="text-[10px] px-2 py-0.2 rounded-full font-bold ${theme.badgeClass}">${escapeHtml(tpl.badge)}</span>
          </div>
          <p class="text-[11px] text-slate-400 leading-snug">${escapeHtml(tpl.description)}</p>
          <div class="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
            <span class="text-slate-300 font-mono">${escapeHtml(timeSummary)}</span>
            <span>•</span>
            <span class="text-amber-300">${escapeHtml(ringMeta.icon)} ${escapeHtml(ringMeta.name)}</span>
          </div>
        </div>
        <div class="shrink-0 self-center">
          <span class="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-xs font-bold">
            →
          </span>
        </div>
      `;

      card.addEventListener('click', () => {
        haptics.tap();
        this.applyTemplateToEditor(tpl);
      });

      grid.appendChild(card);
    });
  }

  applyTemplateToEditor(tpl) {
    this.editingProfileId = null;
    const stepTemplates = document.getElementById('wizard-step-templates');
    const stepCustomize = document.getElementById('wizard-step-customize');
    const modalTitle = document.getElementById('profile-modal-title');
    const nameInput = document.getElementById('edit-profile-name');
    const actionSelect = document.getElementById('edit-action-type');
    const startInput = document.getElementById('edit-start-time');
    const endInput = document.getElementById('edit-end-time');
    const durValueInput = document.getElementById('edit-duration-value');
    const linkedRow = document.getElementById('linked-goal-row');

    if (modalTitle) modalTitle.textContent = `Customize: ${tpl.name}`;
    if (nameInput) nameInput.value = tpl.name;
    if (actionSelect) actionSelect.value = tpl.actionType || 'pacer_40';
    if (startInput) startInput.value = tpl.startTime || '07:00';
    if (endInput) endInput.value = tpl.endTime || '23:00';
    const durVal = tpl.durationValue !== undefined && tpl.durationValue !== null ? tpl.durationValue : 10;
    if (durValueInput) durValueInput.value = durVal;

    this.editorCategory = tpl.category || PROFILE_CATEGORIES.ROTATION;
    this.editorInterval = tpl.intervalMinutes !== undefined ? tpl.intervalMinutes : 120;
    this.editorFixedTimes = [...(tpl.specialFixedTimes || [])];
    this.editorDurationType = tpl.durationType || 'days';
    this.editorDurationValue = durVal;
    this.editorRingtone = tpl.ringtone || 'ring_classic';
    this.editorAlertMode = tpl.alertMode || 'sound_vibrate';
    this.editorLinkedGoalId = null;

    if (tpl.actionType === 'custom_goal') {
      linkedRow?.classList.remove('hidden');
      this.populateLinkedGoalSelect();
    } else {
      linkedRow?.classList.add('hidden');
    }

    this.setEditorCategory(this.editorCategory);
    this.setEditorInterval(this.editorInterval);
    this.setEditorDuration(this.editorDurationType, this.editorDurationValue);
    this.setEditorAlertMode(this.editorAlertMode);
    this.updateSpecialChipsUI();
    this.renderEditorFixedChips();
    this.renderRingtonePicker();
    this.updateWizardLivePreview();

    // Transition to Step B
    stepTemplates?.classList.add('hidden');
    stepCustomize?.classList.remove('hidden');
  }

  renderRingtonePicker() {
    const container = document.getElementById('ringtone-picker-list');
    if (!container) return;
    container.innerHTML = '';

    RINGTONES.forEach(ring => {
      const isSelected = this.editorRingtone === ring.id;
      const item = document.createElement('div');
      item.className = `flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer active-press ${
        isSelected
          ? 'bg-indigo-600/15 border-indigo-500/60 ring-1 ring-indigo-500/40 text-white'
          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
      }`;

      item.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div class="w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'}">
            ${isSelected ? '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>' : ''}
          </div>
          <div>
            <div class="text-xs font-bold flex items-center gap-1.5">
              <span>${ring.icon}</span>
              <span>${ring.name}</span>
            </div>
            <div class="text-[10px] text-slate-400">${ring.desc}</div>
          </div>
        </div>

        <button type="button" data-preview-sound="${ring.id}" class="active-press px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold border border-amber-500/20 flex items-center gap-1 transition">
          <span>🔊</span>
          <span>Test Sound</span>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-preview-sound]')) return;
        this.editorRingtone = ring.id;
        haptics.tick();
        this.renderRingtonePicker();
      });

      item.querySelector('[data-preview-sound]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        haptics.milestone();
        audio.playRingtone(ring.id);
      });

      container.appendChild(item);
    });
  }

  updateSpecialChipsUI() {
    document.querySelectorAll('.special-chip').forEach(btn => {
      const timeVal = btn.getAttribute('data-special');
      if (this.editorFixedTimes.includes(timeVal)) {
        btn.className = 'special-chip active-press px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-sm';
      } else {
        btn.className = 'special-chip active-press px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600';
      }
    });
  }

  updateWizardLivePreview() {
    const chipsContainer = document.getElementById('wizard-preview-chips');
    const countBadge = document.getElementById('wizard-preview-count');
    if (!chipsContainer) return;

    const startInput = document.getElementById('edit-start-time');
    const endInput = document.getElementById('edit-end-time');

    const tempProfile = {
      id: 'preview_temp',
      name: 'Preview',
      category: this.editorCategory,
      enabled: true,
      startTime: startInput?.value || '07:00',
      endTime: endInput?.value || '23:00',
      intervalMinutes: this.editorInterval,
      specialFixedTimes: this.editorFixedTimes,
      durationType: 'indefinite',
      durationValue: 0
    };

    const slots = calculateProfileDailySlots(tempProfile, new Date());

    if (countBadge) {
      countBadge.textContent = `${slots.length} Rings Today`;
    }

    if (slots.length === 0) {
      chipsContainer.innerHTML = '<span class="text-xs text-slate-500 italic">No ring times generated with current settings. Check start/cutoff times or interval.</span>';
      return;
    }

    chipsContainer.innerHTML = slots.map(slot => {
      const isSpecial = !!slot.isSpecial;
      const star = isSpecial ? '⭐ ' : '';
      const classes = isSpecial
        ? 'px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50'
        : 'px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700';
      return `<span class="${classes}">${star}${slot.displayTime}</span>`;
    }).join('');
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

    this.updateWizardLivePreview();
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

  setEditorDuration(type, daysVal = 10) {
    this.editorDurationType = type;
    this.editorDurationValue = daysVal;

    const btn10 = document.getElementById('dur-btn-10days');
    const btn7 = document.getElementById('dur-btn-7days');
    const btnIndefinite = document.getElementById('dur-btn-indefinite');
    const btnCustom = document.getElementById('dur-btn-custom');
    const valueRow = document.getElementById('duration-value-row');
    const valInput = document.getElementById('edit-duration-value');
    const unitLabel = document.getElementById('duration-unit-label');

    [btn10, btn7, btnIndefinite, btnCustom].forEach(b => {
      b?.classList.remove('bg-indigo-600', 'text-white', 'font-bold', 'shadow');
      b?.classList.add('bg-slate-900', 'border-slate-800', 'text-slate-300', 'font-medium');
    });

    if (type === 'indefinite') {
      btnIndefinite?.classList.add('bg-indigo-600', 'text-white', 'font-bold', 'shadow');
      btnIndefinite?.classList.remove('bg-slate-900', 'text-slate-300', 'font-medium');
      valueRow?.classList.add('hidden');
    } else {
      valueRow?.classList.remove('hidden');
      if (valInput) valInput.value = daysVal;

      if (daysVal === 10) {
        btn10?.classList.add('bg-indigo-600', 'text-white', 'font-bold', 'shadow');
        btn10?.classList.remove('bg-slate-900', 'text-slate-300', 'font-medium');
        if (unitLabel) unitLabel.textContent = 'Days from activation (Dietitian 10-day standard)';
      } else if (daysVal === 7) {
        btn7?.classList.add('bg-indigo-600', 'text-white', 'font-bold', 'shadow');
        btn7?.classList.remove('bg-slate-900', 'text-slate-300', 'font-medium');
        if (unitLabel) unitLabel.textContent = 'Days from activation (7-day block)';
      } else {
        btnCustom?.classList.add('bg-indigo-600', 'text-white', 'font-bold', 'shadow');
        btnCustom?.classList.remove('bg-slate-900', 'text-slate-300', 'font-medium');
        if (unitLabel) unitLabel.textContent = 'Days from activation (Custom length)';
      }
    }
  }

  setEditorDurationType(type) {
    const valInput = document.getElementById('edit-duration-value');
    const val = parseInt(valInput?.value, 10) || 10;
    this.setEditorDuration(type, val);
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
      chip.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 text-xs text-amber-300 border border-slate-700 shadow-sm';
      chip.innerHTML = `
        <span>⭐ ${escapeHtml(formatDisplayTime(tStr))}</span>
        <button type="button" data-remove-time="${escapeHtml(tStr)}" class="text-slate-400 hover:text-rose-400 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center font-bold text-sm">×</button>
      `;
      chip.querySelector('[data-remove-time]')?.addEventListener('click', (e) => {
        const timeToRemove = e.currentTarget.getAttribute('data-remove-time');
        this.editorFixedTimes = this.editorFixedTimes.filter(t => t !== timeToRemove);
        this.updateSpecialChipsUI();
        this.renderEditorFixedChips();
        this.updateWizardLivePreview();
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
      alert('Please enter an alarm / reminder name.');
      return;
    }

    const durationVal = this.editorDurationType === 'indefinite' ? 0 : (parseInt(durValueInput?.value, 10) || 10);
    const actionType = actionSelect?.value || 'pacer_40';
    const customGoalId = actionType === 'custom_goal' ? linkedGoalSelect?.value : null;

    const profileData = {
      id: this.editingProfileId || `prof_${Date.now()}`,
      name,
      category: this.editorCategory,
      enabled: true,
      startTime: startInput?.value || '07:00',
      endTime: endInput?.value || '23:00', // Default 11:00 PM cutoff
      intervalMinutes: this.editorInterval,
      specialFixedTimes: this.editorFixedTimes,
      durationType: this.editorDurationType,
      durationValue: durationVal,
      ringtone: this.editorRingtone || 'ring_classic',
      alertMode: this.editorAlertMode || 'sound_vibrate',
      activatedAt: Date.now(),
      expiresAt: this.editorDurationType === 'days' && durationVal > 0
        ? Date.now() + (durationVal * 24 * 60 * 60 * 1000)
        : Infinity,
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

  setEditorAlertMode(mode = 'sound_vibrate') {
    this.editorAlertMode = mode;
    const btnSV = document.getElementById('alert-mode-sv');
    const btnSO = document.getElementById('alert-mode-so');
    const btnVO = document.getElementById('alert-mode-vo');
    const vibeRow = document.getElementById('alert-mode-vibrate-test-row');
    const ringtoneContainer = document.getElementById('wizard-ringtone-container');

    [btnSV, btnSO, btnVO].forEach(b => {
      b?.classList.remove('bg-indigo-600', 'text-white', 'font-bold', 'border-indigo-500', 'shadow');
      b?.classList.add('bg-slate-900', 'border-slate-800', 'text-slate-300', 'font-medium');
    });

    if (mode === 'vibrate_only') {
      btnVO?.classList.add('bg-indigo-600', 'text-white', 'font-bold', 'border-indigo-500', 'shadow');
      btnVO?.classList.remove('bg-slate-900', 'border-slate-800', 'text-slate-300', 'font-medium');
      vibeRow?.classList.remove('hidden');
      if (ringtoneContainer) ringtoneContainer.classList.add('opacity-40', 'pointer-events-none');
    } else if (mode === 'sound_only') {
      btnSO?.classList.add('bg-indigo-600', 'text-white', 'font-bold', 'border-indigo-500', 'shadow');
      btnSO?.classList.remove('bg-slate-900', 'border-slate-800', 'text-slate-300', 'font-medium');
      vibeRow?.classList.add('hidden');
      if (ringtoneContainer) ringtoneContainer.classList.remove('opacity-40', 'pointer-events-none');
    } else {
      btnSV?.classList.add('bg-indigo-600', 'text-white', 'font-bold', 'border-indigo-500', 'shadow');
      btnSV?.classList.remove('bg-slate-900', 'border-slate-800', 'text-slate-300', 'font-medium');
      vibeRow?.classList.add('hidden');
      if (ringtoneContainer) ringtoneContainer.classList.remove('opacity-40', 'pointer-events-none');
    }
  }

  // --- LOCAL PERSONAL BODY PROFILE, SOUND DIAGNOSTICS & UPDATES ---
  bindBodyProfileEvents() {
    // 1. Height Unit Toggle
    document.getElementById('body-height-unit-toggle')?.addEventListener('click', () => {
      haptics.tick();
      this.bodyProfile.heightUnit = this.bodyProfile.heightUnit === 'cm' ? 'ft_in' : 'cm';
      this.syncBodyProfileHeightUI();
      this.renderBodyProfileAndMilestones();
    });

    // 2. Weight Unit Toggle in Profile Card
    document.getElementById('profile-weight-unit-toggle')?.addEventListener('click', async () => {
      haptics.tick();
      this.weightSettings.unit = this.weightSettings.unit === 'kg' ? 'lbs' : 'kg';
      await storage.saveWeightSettings(this.weightSettings);
      this.renderBodyProfileAndMilestones();
      this.renderWeightSection();
    });

    // 3. Save Unified Body Profile & Weight Targets
    const saveProfileHandler = async () => {
      const nameEl = document.getElementById('profile-name-input');
      const feetEl = document.getElementById('body-height-feet');
      const inchesEl = document.getElementById('body-height-inches');
      const cmEl = document.getElementById('body-height-cm');
      const startWeightEl = document.getElementById('profile-start-weight-input');
      const currentWeightEl = document.getElementById('profile-current-weight-input');
      const goalWeightEl = document.getElementById('profile-goal-weight-input');

      // Validate & save name
      const cleanName = nameEl?.value?.trim();
      if (cleanName) {
        this.bodyProfile.name = cleanName;
      }

      // Validate & save height
      if (this.bodyProfile.heightUnit === 'cm') {
        const cm = parseFloat(cmEl?.value);
        if (isNaN(cm) || cm < 50 || cm > 260) {
          alert('Please enter a valid height in centimeters (50 - 260 cm).');
          return;
        }
        this.bodyProfile.heightCm = Math.round(cm);
      } else {
        const ft = parseInt(feetEl?.value, 10);
        const inc = parseFloat(inchesEl?.value);
        if (isNaN(ft) || ft < 2 || ft > 8 || isNaN(inc) || inc < 0 || inc >= 12) {
          alert('Please enter valid feet (2-8) and inches (0-11.9).');
          return;
        }
        this.bodyProfile.heightFeet = ft;
        this.bodyProfile.heightInches = Math.round(inc * 10) / 10;
      }

      // Validate & save weight settings
      const startW = parseFloat(startWeightEl?.value);
      const currW = parseFloat(currentWeightEl?.value);
      const goalW = parseFloat(goalWeightEl?.value);

      if (!isNaN(startW) && startW > 0) this.weightSettings.startWeight = Math.round(startW * 10) / 10;
      if (!isNaN(currW) && currW > 0) {
        this.weightSettings.currentWeight = Math.round(currW * 10) / 10;
        // Also log this current weight if latest log is different
        const latest = this.weightLogs[this.weightLogs.length - 1];
        if (!latest || Math.abs(latest.weight - this.weightSettings.currentWeight) > 0.05) {
          const { logs } = await storage.addWeightLog({
            weight: this.weightSettings.currentWeight,
            note: 'Updated from Profile'
          });
          this.weightLogs = logs;
        }
      }
      if (!isNaN(goalW) && goalW > 0) this.weightSettings.goalWeight = Math.round(goalW * 10) / 10;

      await storage.saveBodyProfile(this.bodyProfile);
      await storage.saveWeightSettings(this.weightSettings);
      haptics.success();

      this.renderBodyProfileAndMilestones();
      this.renderWeightSection();
      this.updateAlarmsTopSummary();

      const btn = document.getElementById('save-body-profile-btn');
      if (btn) {
        const origText = btn.innerHTML;
        btn.innerHTML = '<span>✅ Profile Saved!</span>';
        btn.classList.add('bg-emerald-600');
        setTimeout(() => {
          btn.innerHTML = origText;
          btn.classList.remove('bg-emerald-600');
        }, 1500);
      }
    };

    document.getElementById('save-body-profile-btn')?.addEventListener('click', saveProfileHandler);
    document.getElementById('body-height-save-btn')?.addEventListener('click', saveProfileHandler);

    // 4. Card 3: Ringtone Audition Buttons
    document.querySelectorAll('#profile-ringtones-preview-list [data-test-ringtone]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ringId = e.currentTarget.getAttribute('data-test-ringtone');
        if (ringId) {
          audio.playRingtone(ringId);
          haptics.milestone();
        }
      });
    });

    // Haptics Test Button
    document.getElementById('profile-test-vibe-btn')?.addEventListener('click', () => {
      haptics.notification();
    });

    // 5. Card 3: Notification Sync & Test
    document.getElementById('profile-sync-notifs-btn')?.addEventListener('click', async () => {
      haptics.tick();
      const count = await notifications.rescheduleMultiProfileNext5Days(this.profiles);
      alert(`Synchronized! ${count} notifications scheduled across the next 5 days.`);
    });

    document.getElementById('profile-test-notif-btn')?.addEventListener('click', async () => {
      haptics.tick();
      const activeAlarm = this.profiles.find(p => p.enabled) || this.profiles[0];
      const ring = activeAlarm?.ringtone || 'ring_classic';
      const ok = await notifications.scheduleTestNotification(activeAlarm?.name || 'Rotation Reminder', ring);
      if (ok) {
        alert('Test alert scheduled in 5 seconds! Background the app to audition notification sound and locked-screen display.');
      }
    });

    // Onboarding Setup Shortcut
    document.getElementById('btn-restart-onboarding')?.addEventListener('click', () => {
      haptics.tap();
      onboardingWizard.open(true, async () => {
        await this.reloadAllData();
        this.refreshAll();
      });
    });

    // App Lock & Security Events
    const appLockToggle = document.getElementById('profile-applock-toggle');
    const appLockOptions = document.getElementById('profile-applock-options');
    const changePinBtn = document.getElementById('profile-applock-change-pin-btn');
    const bioRow = document.getElementById('profile-applock-bio-row');
    const bioToggle = document.getElementById('profile-applock-bio-toggle');
    const timingSelect = document.getElementById('profile-applock-timing-select');

    const updateAppLockUI = async () => {
      const s = await storage.getAppLockSettings();
      if (appLockToggle) appLockToggle.checked = !!s.enabled;
      if (appLockOptions) {
        if (s.enabled) appLockOptions.classList.remove('hidden');
        else appLockOptions.classList.add('hidden');
      }
      if (bioToggle) bioToggle.checked = !!s.biometricsEnabled;
      if (timingSelect) timingSelect.value = s.lockTiming || 'immediate';

      if (appLock.biometricsAvailable && bioRow) {
        bioRow.classList.remove('hidden');
      }
    };
    updateAppLockUI();

    appLockToggle?.addEventListener('change', async () => {
      haptics.tap();
      const s = await storage.getAppLockSettings();
      if (appLockToggle.checked) {
        if (!s.pinHash) {
          await appLock.startSetupPinFlow();
        } else {
          s.enabled = true;
          await storage.saveAppLockSettings(s);
        }
      } else {
        if (confirm('Disable App Lock?')) {
          s.enabled = false;
          await storage.saveAppLockSettings(s);
        } else {
          appLockToggle.checked = true;
        }
      }
      await updateAppLockUI();
    });

    changePinBtn?.addEventListener('click', async () => {
      haptics.tap();
      await appLock.startSetupPinFlow();
      await updateAppLockUI();
    });

    bioToggle?.addEventListener('change', async () => {
      haptics.tap();
      const s = await storage.getAppLockSettings();
      s.biometricsEnabled = bioToggle.checked;
      await storage.saveAppLockSettings(s);
    });

    timingSelect?.addEventListener('change', async () => {
      haptics.tap();
      const s = await storage.getAppLockSettings();
      s.lockTiming = timingSelect.value;
      await storage.saveAppLockSettings(s);
    });

    // 7. Card 4: Data Export & Import (JSON)
    document.getElementById('backup-export-btn')?.addEventListener('click', async () => {
      haptics.tick();
      try {
        const jsonStr = await storage.exportAllData();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rotation-reminder-backup-${getLocalDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        haptics.success();
      } catch (err) {
        console.warn('Backup export failed:', err);
        alert('Failed to generate backup JSON.');
      }
    });

    const importBtn = document.getElementById('backup-import-btn');
    const importFileInput = document.getElementById('backup-import-file');
    importBtn?.addEventListener('click', () => {
      haptics.tap();
      importFileInput?.click();
    });

    importFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const res = await storage.importAllData(text);
        if (res.success) {
          haptics.success();
          await this.reloadAllData();
          await notifications.rescheduleMultiProfileNext5Days(this.profiles);
          await updateAppLockUI();
          this.refreshAll();
          alert('Backup data successfully restored!');
        } else {
          alert(`Import failed: ${res.error || 'Invalid backup file format'}`);
        }
      } catch (err) {
        alert(`Failed to read backup file: ${err.message}`);
      }
      importFileInput.value = '';
    });

    // Privacy Policy In-App Modal
    const privacyModal = document.getElementById('privacy-policy-modal');
    document.getElementById('btn-view-privacy-policy')?.addEventListener('click', () => {
      haptics.tap();
      privacyModal?.classList.remove('hidden');
      privacyModal?.classList.add('flex');
    });

    const closePrivacyModal = () => {
      privacyModal?.classList.add('hidden');
      privacyModal?.classList.remove('flex');
    };

    document.getElementById('privacy-policy-close')?.addEventListener('click', closePrivacyModal);
    document.getElementById('privacy-policy-close-btn')?.addEventListener('click', closePrivacyModal);

    // 8. Card 4: Reset Today's Completions
    document.getElementById('profile-reset-today-btn')?.addEventListener('click', async () => {
      if (confirm("Reset today's completion checkmarks across all routines?")) {
        const todayKey = this.getTodayKey();
        delete this.completions[todayKey];
        await storage.set('rotation_completions', this.completions);
        await storage.set('satkin_completions', this.completions);
        this.refreshAll();
        haptics.tick();
      }
    });

    // 9. Card 4: Reset All Data to Defaults
    document.getElementById('profile-reset-all-btn')?.addEventListener('click', async () => {
      const confirmed = confirm("Are you sure you want to reset ALL data (profiles, weight logs, custom goals) back to factory defaults?");
      if (confirmed) {
        haptics.milestone();
        await storage.resetAllToDefaults();
        await this.reloadAllData();
        await notifications.rescheduleMultiProfileNext5Days(this.profiles);
        await updateAppLockUI();
        this.refreshAll();
        alert('All app settings, profiles, and logs have been reset to initial defaults.');
      }
    });
  }

  syncBodyProfileHeightUI() {
    const isCm = this.bodyProfile.heightUnit === 'cm';
    const labelEl = document.getElementById('body-height-unit-label');
    const impRow = document.getElementById('body-height-imperial-row');
    const metricRow = document.getElementById('body-height-metric-row');
    const feetEl = document.getElementById('body-height-feet');
    const inchesEl = document.getElementById('body-height-inches');
    const cmEl = document.getElementById('body-height-cm');

    if (labelEl) labelEl.textContent = isCm ? 'cm' : 'ft / in';

    if (isCm) {
      impRow?.classList.add('hidden');
      metricRow?.classList.remove('hidden');
      if (cmEl) cmEl.value = this.bodyProfile.heightCm !== null ? this.bodyProfile.heightCm : '';
    } else {
      metricRow?.classList.add('hidden');
      impRow?.classList.remove('hidden');
      if (feetEl) feetEl.value = this.bodyProfile.heightFeet !== null ? this.bodyProfile.heightFeet : '';
      if (inchesEl) inchesEl.value = this.bodyProfile.heightInches !== null ? this.bodyProfile.heightInches : '';
    }
  }

  renderBodyProfileAndMilestones() {
    this.syncBodyProfileHeightUI();

    // Populate Name
    const nameEl = document.getElementById('profile-name-input');
    if (nameEl) {
      nameEl.value = this.bodyProfile.name || '';
    }

    // Populate Height Badge
    const badgeDisplay = document.getElementById('body-height-display-badge');
    const isCm = this.bodyProfile.heightUnit === 'cm';
    if (badgeDisplay) {
      if (isCm && this.bodyProfile.heightCm) {
        badgeDisplay.textContent = `${this.bodyProfile.heightCm} cm`;
      } else if (!isCm && (this.bodyProfile.heightFeet !== null || this.bodyProfile.heightInches !== null)) {
        badgeDisplay.textContent = `${this.bodyProfile.heightFeet || 0} ft ${this.bodyProfile.heightInches || 0} in`;
      } else {
        badgeDisplay.textContent = 'Not configured';
      }
    }

    // Populate Weights in Card 1
    const startWeightEl = document.getElementById('profile-start-weight-input');
    const currentWeightEl = document.getElementById('profile-current-weight-input');
    const goalWeightEl = document.getElementById('profile-goal-weight-input');
    const weightUnitLabelEl = document.getElementById('profile-weight-unit-label');

    const currentWeight = this.weightSettings.currentWeight;
    const startWeight = this.weightSettings.startWeight;
    const goalWeight = this.weightSettings.goalWeight;
    const unit = this.weightSettings.unit || 'lbs';

    if (startWeightEl) startWeightEl.value = startWeight !== null ? startWeight.toFixed(1) : '';
    if (currentWeightEl) currentWeightEl.value = currentWeight !== null ? currentWeight.toFixed(1) : '';
    if (goalWeightEl) goalWeightEl.value = goalWeight !== null ? goalWeight.toFixed(1) : '';
    if (weightUnitLabelEl) weightUnitLabelEl.textContent = unit;

    // Calculate BMI
    const bmiVal = calculateBMI(currentWeight, unit, this.bodyProfile);
    const bmiCategory = getBMICategory(bmiVal);

    const bmiValEl = document.getElementById('body-bmi-value');
    const bmiBadgeEl = document.getElementById('body-bmi-badge');
    const currentWeightRefEl = document.getElementById('body-current-weight-ref');

    if (bmiValEl) bmiValEl.textContent = bmiVal ? bmiVal.toFixed(1) : '--';
    if (bmiBadgeEl) {
      if (bmiVal) {
        bmiBadgeEl.textContent = bmiCategory.label;
        bmiBadgeEl.className = `px-2 py-0.5 rounded-full text-[11px] font-bold ${bmiCategory.badgeClass}`;
      } else {
        bmiBadgeEl.textContent = 'Unconfigured';
        bmiBadgeEl.className = 'px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700';
      }
    }
    if (currentWeightRefEl) {
      currentWeightRefEl.textContent = currentWeight !== null ? `${currentWeight.toFixed(1)} ${unit}` : '--';
    }

    // Milestone Ladder
    const ladderContainer = document.getElementById('body-milestone-ladder-list');
    if (!ladderContainer) return;
    ladderContainer.innerHTML = '';

    if (!currentWeight || currentWeight <= 0 || (!this.bodyProfile.heightFeet && !this.bodyProfile.heightCm)) {
      ladderContainer.innerHTML = `
        <div class="p-3 text-center text-xs text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800/80">
          Enter height and weight to view milestone progression ladder.
        </div>
      `;
      return;
    }

    const milestones = calculateMilestoneLadder(currentWeight, unit, this.bodyProfile);
    let immediateTargetFound = false;

    milestones.forEach(m => {
      const card = document.createElement('div');

      if (m.isAchieved) {
        card.className = 'p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between transition-all';
        card.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="text-base text-emerald-400">✅</span>
            <div>
              <div class="text-xs font-bold text-slate-200">${escapeHtml(m.name)}</div>
              <div class="text-[10px] text-slate-400">${escapeHtml(m.badge)} • Target: ${m.targetWeight} ${escapeHtml(unit)}</div>
            </div>
          </div>
          <span class="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">Achieved</span>
        `;
      } else if (!immediateTargetFound) {
        // Immediate Next Milestone
        immediateTargetFound = true;
        const baseStart = this.weightSettings.startWeight || (currentWeight + 5);
        const totalSpan = Math.max(1, baseStart - m.targetWeight);
        const progressSpan = Math.max(0, baseStart - currentWeight);
        const progressPct = Math.min(100, Math.max(0, Math.round((progressSpan / totalSpan) * 100)));

        card.className = 'p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-lg space-y-2 transition-all';
        card.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-base animate-pulse">🎯</span>
              <div>
                <div class="text-xs font-black text-white flex items-center gap-1.5">
                  <span>${escapeHtml(m.name)}</span>
                  <span class="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">Next Target</span>
                </div>
                <div class="text-[10px] text-indigo-300 font-semibold">${escapeHtml(m.badge)} • Target: ${m.targetWeight} ${escapeHtml(unit)}</div>
              </div>
            </div>
            <span class="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
              -${m.remainingWeight} ${escapeHtml(unit)} left
            </span>
          </div>

          <div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Progress towards milestone</span>
              <span class="font-bold text-slate-300 font-mono">${progressPct}%</span>
            </div>
            <div class="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div class="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 transition-all duration-500" style="width: ${progressPct}%"></div>
            </div>
          </div>
        `;
      } else {
        // Future Milestone
        card.className = 'p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between opacity-70 transition-all';
        card.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="text-base text-slate-500">⏳</span>
            <div>
              <div class="text-xs font-semibold text-slate-300">${escapeHtml(m.name)}</div>
              <div class="text-[10px] text-slate-500">${escapeHtml(m.badge)} • Target: ${m.targetWeight} ${escapeHtml(unit)}</div>
            </div>
          </div>
          <span class="text-[11px] font-mono text-slate-400">-${m.remainingWeight} ${escapeHtml(unit)}</span>
        `;
      }

      ladderContainer.appendChild(card);
    });
  }
}

// Bootstrap app on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  window.rotationApp = new RotationReminderApp();
  window.satkinApp = window.rotationApp;
});
