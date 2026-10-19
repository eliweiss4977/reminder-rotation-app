// 5-Screen Interactive Onboarding & Personal Setup Wizard
import { storage, calculateBMI, getBMICategory, calculateMilestoneLadder, calculateTotalHeightInches } from './storage.js';
import { notifications } from './notifications.js';
import { audioService, RINGTONES } from './audio.js';
import { hashPin, checkBiometricAvailability } from './applock.js';
import { calculateTodaySlots } from './scheduleEngine.js';

class OnboardingWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 5;
    this.onCompleteCallback = null;

    // Temporary wizard draft state
    this.draft = {
      // Step 2: Body & Weight
      name: '',
      heightUnit: 'ft_in', // 'ft_in' | 'cm'
      heightFeet: null,
      heightInches: null,
      heightCm: null,
      weightUnit: 'lbs', // 'lbs' | 'kg'
      currentWeight: null,
      goalWeight: null,

      // Step 3: Alarm Schedule
      enableAlarm: true,
      alarmTemplateId: 'template_rotation_2h_2_7',
      alarmName: 'Every 2h + 2:00 & 7:00 PM (Rotation 40x)',
      startTime: '07:00',
      endTime: '23:00',
      intervalMinutes: 120,
      specialFixedTimes: ['14:00', '19:00'],
      ringtone: 'ring_classic',
      alertMode: 'sound_vibrate',
      durationType: 'days',
      durationValue: 7,

      // Step 4: Habits & Extra Reminders
      habits: {
        water: { enabled: true, target: 8, intervalMinutes: 120 },
        walk: { enabled: true, target: 8000, reminderTime: '18:00' },
        weighIn: { enabled: true, reminderTime: '07:15' },
        custom: { enabled: false, title: '', target: 1, unit: 'times' }
      },

      // Step 5: Security & App Lock
      appLockEnabled: false,
      pin: '',
      pinConfirm: '',
      biometricsEnabled: false,
      lockTiming: 'immediate',
      notificationsGranted: false
    };
  }

  async open(isRestart = false, onComplete = null) {
    this.onCompleteCallback = onComplete;
    this.currentStep = 1;

    // If restarting from profile, prefill existing user settings if configured
    if (isRestart) {
      const body = await storage.getBodyProfile();
      const weight = await storage.getWeightSettings();
      if (body.isConfigured) {
        this.draft.name = body.name || '';
        this.draft.heightUnit = body.heightUnit || 'ft_in';
        this.draft.heightFeet = body.heightFeet;
        this.draft.heightInches = body.heightInches;
        this.draft.heightCm = body.heightCm;
      }
      if (weight.isConfigured) {
        this.draft.weightUnit = weight.unit || 'lbs';
        this.draft.currentWeight = weight.currentWeight;
        this.draft.goalWeight = weight.goalWeight;
      }
    }

    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.renderStep(1);
  }

  close() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;
    this.currentStep = step;
    this.renderStep(step);
  }

  renderStep(step) {
    // Update step indicator & progress bar
    const indicator = document.getElementById('onboard-step-indicator');
    const progressBar = document.getElementById('onboard-progress-bar');
    if (indicator) indicator.textContent = `Step ${step} of ${this.totalSteps}`;
    if (progressBar) {
      const pct = (step / this.totalSteps) * 100;
      progressBar.style.width = `${pct}%`;
    }

    // Toggle screen containers
    for (let i = 1; i <= this.totalSteps; i++) {
      const screen = document.getElementById(`onboard-screen-${i}`);
      if (screen) {
        if (i === step) {
          screen.classList.remove('hidden');
          screen.classList.add('flex');
        } else {
          screen.classList.add('hidden');
          screen.classList.remove('flex');
        }
      }
    }

    // Step-specific bindings and updates
    if (step === 2) {
      this.setupStep2BodyMetrics();
    } else if (step === 3) {
      this.setupStep3Alarms();
    } else if (step === 4) {
      this.setupStep4Habits();
    } else if (step === 5) {
      this.setupStep5PermissionsAndLock();
    }
  }

  // --- STEP 2: BODY PROFILE & LIVE MILESTONE LADDER ---
  setupStep2BodyMetrics() {
    const nameInput = document.getElementById('onboard-body-name');
    const ftInput = document.getElementById('onboard-height-ft');
    const inInput = document.getElementById('onboard-height-in');
    const cmInput = document.getElementById('onboard-height-cm');
    const curWeightInput = document.getElementById('onboard-current-weight');
    const goalWeightInput = document.getElementById('onboard-goal-weight');

    if (nameInput) nameInput.value = this.draft.name || '';
    if (ftInput) ftInput.value = this.draft.heightFeet ?? '';
    if (inInput) inInput.value = this.draft.heightInches ?? '';
    if (cmInput) cmInput.value = this.draft.heightCm ?? '';
    if (curWeightInput) curWeightInput.value = this.draft.currentWeight ?? '';
    if (goalWeightInput) goalWeightInput.value = this.draft.goalWeight ?? '';

    // Height Unit Toggles
    const unitFtBtn = document.getElementById('onboard-hunit-ft');
    const unitCmBtn = document.getElementById('onboard-hunit-cm');
    const ftRow = document.getElementById('onboard-ft-row');
    const cmRow = document.getElementById('onboard-cm-row');

    const updateHeightUnitUI = (unit) => {
      this.draft.heightUnit = unit;
      if (unit === 'cm') {
        ftRow?.classList.add('hidden');
        cmRow?.classList.remove('hidden');
        unitCmBtn?.classList.add('bg-indigo-600', 'text-white');
        unitCmBtn?.classList.remove('bg-slate-900', 'text-slate-400');
        unitFtBtn?.classList.remove('bg-indigo-600', 'text-white');
        unitFtBtn?.classList.add('bg-slate-900', 'text-slate-400');
      } else {
        ftRow?.classList.remove('hidden');
        cmRow?.classList.add('hidden');
        unitFtBtn?.classList.add('bg-indigo-600', 'text-white');
        unitFtBtn?.classList.remove('bg-slate-900', 'text-slate-400');
        unitCmBtn?.classList.remove('bg-indigo-600', 'text-white');
        unitCmBtn?.classList.add('bg-slate-900', 'text-slate-400');
      }
      this.updateStep2Calculations();
    };

    unitFtBtn?.addEventListener('click', () => updateHeightUnitUI('ft_in'));
    unitCmBtn?.addEventListener('click', () => updateHeightUnitUI('cm'));
    updateHeightUnitUI(this.draft.heightUnit);

    // Weight Unit Toggles
    const unitLbsBtn = document.getElementById('onboard-wunit-lbs');
    const unitKgBtn = document.getElementById('onboard-wunit-kg');
    const curUnitLabel = document.getElementById('onboard-cur-weight-unit');
    const goalUnitLabel = document.getElementById('onboard-goal-weight-unit');

    const updateWeightUnitUI = (unit) => {
      this.draft.weightUnit = unit;
      if (curUnitLabel) curUnitLabel.textContent = unit;
      if (goalUnitLabel) goalUnitLabel.textContent = unit;

      if (unit === 'kg') {
        unitKgBtn?.classList.add('bg-amber-600', 'text-white');
        unitKgBtn?.classList.remove('bg-slate-900', 'text-slate-400');
        unitLbsBtn?.classList.remove('bg-amber-600', 'text-white');
        unitLbsBtn?.classList.add('bg-slate-900', 'text-slate-400');
      } else {
        unitLbsBtn?.classList.add('bg-amber-600', 'text-white');
        unitLbsBtn?.classList.remove('bg-slate-900', 'text-slate-400');
        unitKgBtn?.classList.remove('bg-amber-600', 'text-white');
        unitKgBtn?.classList.add('bg-slate-900', 'text-slate-400');
      }
      this.updateStep2Calculations();
    };

    unitLbsBtn?.addEventListener('click', () => updateWeightUnitUI('lbs'));
    unitKgBtn?.addEventListener('click', () => updateWeightUnitUI('kg'));
    updateWeightUnitUI(this.draft.weightUnit);

    // Live input listeners
    [nameInput, ftInput, inInput, cmInput, curWeightInput, goalWeightInput].forEach(inp => {
      if (inp) {
        inp.addEventListener('input', () => {
          this.draft.name = nameInput?.value?.trim() || '';
          this.draft.heightFeet = ftInput?.value ? parseInt(ftInput.value, 10) : null;
          this.draft.heightInches = inInput?.value ? parseFloat(inInput.value) : null;
          this.draft.heightCm = cmInput?.value ? parseFloat(cmInput.value) : null;
          this.draft.currentWeight = curWeightInput?.value ? parseFloat(curWeightInput.value) : null;
          this.draft.goalWeight = goalWeightInput?.value ? parseFloat(goalWeightInput.value) : null;
          this.updateStep2Calculations();
        });
      }
    });

    this.updateStep2Calculations();
  }

  updateStep2Calculations() {
    const curWeight = this.draft.currentWeight;
    const bodyProfile = {
      heightUnit: this.draft.heightUnit,
      heightFeet: this.draft.heightFeet,
      heightInches: this.draft.heightInches,
      heightCm: this.draft.heightCm
    };

    const bmi = calculateBMI(curWeight, this.draft.weightUnit, bodyProfile);
    const bmiCategory = getBMICategory(bmi);

    const bmiValueEl = document.getElementById('onboard-bmi-value');
    const bmiBadgeEl = document.getElementById('onboard-bmi-badge');

    if (bmiValueEl) {
      bmiValueEl.textContent = bmi ? bmi.toFixed(1) : '--.-';
    }
    if (bmiBadgeEl) {
      if (bmi) {
        bmiBadgeEl.textContent = bmiCategory.label;
        bmiBadgeEl.className = `px-2 py-0.5 rounded-full text-xs font-bold ${bmiCategory.badgeClass}`;
      } else {
        bmiBadgeEl.textContent = 'Enter height & weight';
        bmiBadgeEl.className = 'px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700';
      }
    }

    // Personalized Milestone Ladder Cards
    const ladderContainer = document.getElementById('onboard-milestone-ladder');
    if (!ladderContainer) return;

    if (!curWeight || curWeight <= 0 || (!bodyProfile.heightFeet && !bodyProfile.heightCm)) {
      ladderContainer.innerHTML = `
        <div class="p-3 text-center text-xs text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800/80">
          Enter your height and current weight above to generate your custom Milestone Weight Ladder.
        </div>
      `;
      return;
    }

    const milestones = calculateMilestoneLadder(curWeight, this.draft.weightUnit, bodyProfile);
    if (!milestones || milestones.length === 0) {
      ladderContainer.innerHTML = '';
      return;
    }

    ladderContainer.innerHTML = milestones.map((m) => {
      const isSelected = this.draft.goalWeight && Math.abs(this.draft.goalWeight - m.targetWeight) < 0.2;
      return `
        <div data-target-weight="${m.targetWeight}" class="onboard-milestone-card cursor-pointer p-3 rounded-xl border transition-all ${
          isSelected
            ? 'bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500'
            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
        } flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-base">${m.isAchieved ? '🏆' : isSelected ? '🎯' : '📍'}</span>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                ${m.name}
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">${m.badge}</span>
              </div>
              <div class="text-[11px] text-slate-400">
                ${m.isAchieved ? '<span class="text-emerald-400 font-bold">Goal Achieved!</span>' : `${m.remainingWeight.toFixed(1)} ${this.draft.weightUnit} to lose`}
              </div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-sm font-extrabold text-amber-400 font-mono">${m.targetWeight}</span>
            <span class="text-[10px] text-slate-400 block">${this.draft.weightUnit}</span>
          </div>
        </div>
      `;
    }).join('');

    // Milestone card tap-to-select goal
    ladderContainer.querySelectorAll('.onboard-milestone-card').forEach(card => {
      card.addEventListener('click', () => {
        const target = parseFloat(card.getAttribute('data-target-weight'));
        this.draft.goalWeight = target;
        const goalInput = document.getElementById('onboard-goal-weight');
        if (goalInput) goalInput.value = target;
        this.updateStep2Calculations();
      });
    });
  }

  // --- STEP 3: ROTATION ALARM SCHEDULE ---
  setupStep3Alarms() {
    const templates = [
      {
        id: 'template_rotation_2h_2_7',
        name: 'Every 2h + 2:00 & 7:00 PM',
        badge: 'Recommended',
        desc: 'Every 2 hours + priority afternoon (2 PM) & evening (7 PM) 40x acupressure',
        interval: 120,
        fixed: ['14:00', '19:00'],
        ringtone: 'ring_classic'
      },
      {
        id: 'template_rotation_2h',
        name: 'Every 2 Hours (Standard)',
        badge: 'Popular',
        desc: 'Steady 2h pacing from 7:00 AM to 11:00 PM',
        interval: 120,
        fixed: [],
        ringtone: 'ring_classic'
      },
      {
        id: 'template_rotation_2h_3_7',
        name: 'Every 2h + 3:00 & 7:00 PM',
        badge: 'Alternative',
        desc: '2h schedule with 3 PM & 7 PM checkpoints',
        interval: 120,
        fixed: ['15:00', '19:00'],
        ringtone: 'ring_crystal'
      },
      {
        id: 'template_rotation_1_5h_4_7',
        name: 'Every 1.5h + 4:00 & 7:00 PM',
        badge: 'Intense',
        desc: 'Accelerated 90-min protocol with 4 PM & 7 PM checkpoints',
        interval: 90,
        fixed: ['16:00', '19:00'],
        ringtone: 'ring_crystal'
      }
    ];

    const grid = document.getElementById('onboard-alarm-templates-grid');
    if (grid) {
      grid.innerHTML = templates.map(t => {
        const isSelected = this.draft.alarmTemplateId === t.id;
        return `
          <div data-tid="${t.id}" class="onboard-tpl-card cursor-pointer p-3 rounded-2xl border transition ${
            isSelected
              ? 'bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🔄</span> ${t.name}
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
                t.badge === 'Recommended' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
              }">${t.badge}</span>
            </div>
            <p class="text-[11px] text-slate-400">${t.desc}</p>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('.onboard-tpl-card').forEach(card => {
        card.addEventListener('click', () => {
          const tid = card.getAttribute('data-tid');
          const tpl = templates.find(t => t.id === tid);
          if (tpl) {
            this.draft.alarmTemplateId = tpl.id;
            this.draft.alarmName = `${tpl.name} (Rotation 40x)`;
            this.draft.intervalMinutes = tpl.interval;
            this.draft.specialFixedTimes = [...tpl.fixed];
            this.draft.ringtone = tpl.ringtone;
            this.setupStep3Alarms();
          }
        });
      });
    }

    // Start/End inputs
    const startInp = document.getElementById('onboard-alarm-start');
    const endInp = document.getElementById('onboard-alarm-end');
    if (startInp) {
      startInp.value = this.draft.startTime;
      startInp.onchange = () => { this.draft.startTime = startInp.value; this.updateStep3Preview(); };
    }
    if (endInp) {
      endInp.value = this.draft.endTime;
      endInp.onchange = () => { this.draft.endTime = endInp.value; this.updateStep3Preview(); };
    }

    // Ringtone picker
    const ringtoneList = document.getElementById('onboard-ringtone-list');
    if (ringtoneList) {
      ringtoneList.innerHTML = RINGTONES.map(r => {
        const isSelected = this.draft.ringtone === r.id;
        return `
          <div data-rid="${r.id}" class="onboard-ring-item flex items-center justify-between p-2 rounded-xl border cursor-pointer transition ${
            isSelected ? 'bg-indigo-600/25 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }">
            <div class="flex items-center gap-2">
              <span class="text-sm">${r.icon}</span>
              <div>
                <div class="text-xs font-bold leading-tight">${r.name}</div>
                <div class="text-[10px] text-slate-400">${r.desc}</div>
              </div>
            </div>
            <button type="button" data-play-rid="${r.id}" class="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 active-press flex items-center gap-1">
              <span>🔊</span> Test
            </button>
          </div>
        `;
      }).join('');

      ringtoneList.querySelectorAll('.onboard-ring-item').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('[data-play-rid]')) return;
          const rid = el.getAttribute('data-rid');
          this.draft.ringtone = rid;
          this.setupStep3Alarms();
        });
      });

      ringtoneList.querySelectorAll('[data-play-rid]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const rid = btn.getAttribute('data-play-rid');
          audioService.playRingtone(rid);
        });
      });
    }

    // Alert Mode buttons
    const svBtn = document.getElementById('onboard-mode-sv');
    const soBtn = document.getElementById('onboard-mode-so');
    const voBtn = document.getElementById('onboard-mode-vo');

    const updateModeUI = (mode) => {
      this.draft.alertMode = mode;
      [svBtn, soBtn, voBtn].forEach(b => {
        b?.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-500');
        b?.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-800');
      });
      const activeBtn = mode === 'sound_vibrate' ? svBtn : mode === 'sound_only' ? soBtn : voBtn;
      activeBtn?.classList.add('bg-indigo-600', 'text-white', 'border-indigo-500');
      activeBtn?.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-800');
    };

    svBtn?.addEventListener('click', () => updateModeUI('sound_vibrate'));
    soBtn?.addEventListener('click', () => updateModeUI('sound_only'));
    voBtn?.addEventListener('click', () => updateModeUI('vibrate_only'));
    updateModeUI(this.draft.alertMode);

    this.updateStep3Preview();
  }

  updateStep3Preview() {
    const previewCountEl = document.getElementById('onboard-preview-count');
    const previewChipsEl = document.getElementById('onboard-preview-chips');

    const dummyProfile = {
      id: 'draft',
      startTime: this.draft.startTime,
      endTime: this.draft.endTime,
      intervalMinutes: this.draft.intervalMinutes,
      specialFixedTimes: this.draft.specialFixedTimes
    };

    const slots = calculateTodaySlots(dummyProfile);
    if (previewCountEl) previewCountEl.textContent = `${slots.length} Rings Today`;

    if (previewChipsEl) {
      previewChipsEl.innerHTML = slots.map(s => `
        <span class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
          s.isSpecial ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300 border border-slate-700'
        }">
          ${s.timeFormatted} ${s.isSpecial ? '⭐' : ''}
        </span>
      `).join('');
    }
  }

  // --- STEP 4: HABITS & EXTRA REMINDERS ---
  setupStep4Habits() {
    const waterCb = document.getElementById('onboard-habit-water');
    const walkCb = document.getElementById('onboard-habit-walk');
    const weighInCb = document.getElementById('onboard-habit-weighin');
    const customCb = document.getElementById('onboard-habit-custom');

    if (waterCb) {
      waterCb.checked = this.draft.habits.water.enabled;
      waterCb.onchange = () => { this.draft.habits.water.enabled = waterCb.checked; };
    }
    if (walkCb) {
      walkCb.checked = this.draft.habits.walk.enabled;
      walkCb.onchange = () => { this.draft.habits.walk.enabled = walkCb.checked; };
    }
    if (weighInCb) {
      weighInCb.checked = this.draft.habits.weighIn.enabled;
      weighInCb.onchange = () => { this.draft.habits.weighIn.enabled = weighInCb.checked; };
    }
    if (customCb) {
      customCb.checked = this.draft.habits.custom.enabled;
      const customRow = document.getElementById('onboard-habit-custom-fields');
      customCb.onchange = () => {
        this.draft.habits.custom.enabled = customCb.checked;
        if (customCb.checked) customRow?.classList.remove('hidden');
        else customRow?.classList.add('hidden');
      };
    }
  }

  // --- STEP 5: PERMISSIONS & APP LOCK ---
  async setupStep5PermissionsAndLock() {
    // 1. Permissions button
    const permBtn = document.getElementById('onboard-grant-perms-btn');
    const permStatus = document.getElementById('onboard-perm-status');

    const updatePermUI = (isGranted) => {
      this.draft.notificationsGranted = isGranted;
      if (isGranted) {
        if (permBtn) {
          permBtn.textContent = '✅ Notifications Active';
          permBtn.className = 'w-full py-3 px-4 rounded-xl bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/50 cursor-default';
          permBtn.disabled = true;
        }
        if (permStatus) {
          permStatus.textContent = 'Full alarm audio stream permissions granted.';
          permStatus.className = 'text-[11px] text-emerald-400 font-medium';
        }
      }
    };

    permBtn?.addEventListener('click', async () => {
      const ok = await notifications.requestPermission();
      updatePermUI(ok);
    });

    // Check current status
    const currentGranted = await notifications.checkPermission();
    if (currentGranted) updatePermUI(true);

    // 2. App Lock Toggle
    const lockToggle = document.getElementById('onboard-applock-toggle');
    const lockFields = document.getElementById('onboard-applock-fields');
    const bioContainer = document.getElementById('onboard-applock-bio-row');
    const bioToggle = document.getElementById('onboard-applock-bio-toggle');

    const hasBiometrics = await checkBiometricAvailability();
    if (hasBiometrics && bioContainer) {
      bioContainer.classList.remove('hidden');
    }

    if (lockToggle) {
      lockToggle.checked = this.draft.appLockEnabled;
      lockToggle.onchange = () => {
        this.draft.appLockEnabled = lockToggle.checked;
        if (lockToggle.checked) {
          lockFields?.classList.remove('hidden');
        } else {
          lockFields?.classList.add('hidden');
        }
      };
    }

    if (bioToggle) {
      bioToggle.checked = this.draft.biometricsEnabled;
      bioToggle.onchange = () => {
        this.draft.biometricsEnabled = bioToggle.checked;
      };
    }

    const timingSelect = document.getElementById('onboard-lock-timing');
    if (timingSelect) {
      timingSelect.value = this.draft.lockTiming;
      timingSelect.onchange = () => {
        this.draft.lockTiming = timingSelect.value;
      };
    }
  }

  // --- FINISH WIZARD & SAVE ALL SELECTIONS ---
  async finishSetup() {
    const finishBtn = document.getElementById('onboard-finish-btn');
    if (finishBtn) {
      finishBtn.disabled = true;
      finishBtn.innerHTML = '<span>Saving & Scheduling...</span>';
    }

    try {
      // 1. Save Body Profile
      const bodyConfigured = !!(this.draft.heightFeet !== null || this.draft.heightCm !== null);
      await storage.saveBodyProfile({
        name: this.draft.name,
        heightUnit: this.draft.heightUnit,
        heightFeet: this.draft.heightFeet,
        heightInches: this.draft.heightInches,
        heightCm: this.draft.heightCm,
        isConfigured: bodyConfigured
      });

      // 2. Save Weight Settings
      const weightConfigured = !!(this.draft.currentWeight !== null || this.draft.goalWeight !== null);
      await storage.saveWeightSettings({
        unit: this.draft.weightUnit,
        startWeight: this.draft.currentWeight,
        currentWeight: this.draft.currentWeight,
        goalWeight: this.draft.goalWeight,
        isConfigured: weightConfigured
      });

      // If initial weight was logged, add first log entry
      if (this.draft.currentWeight && this.draft.currentWeight > 0) {
        await storage.addWeightLog({
          weight: this.draft.currentWeight,
          note: 'Setup weigh-in'
        });
      }

      // 3. Save Selected Rotation Alarm Schedule
      const initialProfiles = [];
      if (this.draft.enableAlarm) {
        const rotationProfile = {
          id: `prof_rotation_${Date.now()}`,
          name: this.draft.alarmName,
          category: 'rotation',
          actionType: 'pacer_40',
          enabled: true,
          startTime: this.draft.startTime,
          endTime: this.draft.endTime,
          intervalMinutes: this.draft.intervalMinutes,
          specialFixedTimes: this.draft.specialFixedTimes,
          ringtone: this.draft.ringtone,
          alertMode: this.draft.alertMode,
          durationType: this.draft.durationType,
          durationValue: this.draft.durationValue,
          activatedAt: Date.now()
        };
        initialProfiles.push(rotationProfile);
      }

      // 4. Save Extra Habits & Alarms
      const initialGoals = [];

      // Hydration
      if (this.draft.habits.water.enabled) {
        initialGoals.push({
          id: 'goal_water',
          title: 'Drink Water',
          icon: '💧',
          goalType: 'counter',
          targetValue: this.draft.habits.water.target || 8,
          unit: 'glasses',
          stepAmount: 1
        });

        // Add matching water alarm
        initialProfiles.push({
          id: `prof_water_${Date.now()}`,
          name: 'Drink 1 Glass of Water',
          category: 'water',
          actionType: 'log_water',
          enabled: true,
          startTime: this.draft.startTime,
          endTime: this.draft.endTime,
          intervalMinutes: this.draft.habits.water.intervalMinutes || 120,
          specialFixedTimes: [],
          ringtone: 'ring_double',
          alertMode: 'sound_vibrate',
          durationType: 'indefinite',
          durationValue: 0,
          activatedAt: Date.now()
        });
      }

      // Daily Movement / Walk
      if (this.draft.habits.walk.enabled) {
        initialGoals.push({
          id: 'goal_walk',
          title: 'Daily Walk & Steps',
          icon: '🚶',
          goalType: 'counter',
          targetValue: this.draft.habits.walk.target || 8000,
          unit: 'steps',
          stepAmount: 500
        });

        initialProfiles.push({
          id: `prof_walk_${Date.now()}`,
          name: 'Walk / Movement Break',
          category: 'habit',
          actionType: 'check_off',
          enabled: true,
          startTime: this.draft.habits.walk.reminderTime || '18:00',
          endTime: '21:00',
          intervalMinutes: 0,
          specialFixedTimes: [this.draft.habits.walk.reminderTime || '18:00'],
          ringtone: 'ring_marimba',
          alertMode: 'sound_vibrate',
          durationType: 'indefinite',
          durationValue: 0,
          activatedAt: Date.now()
        });
      }

      // Morning Weigh-In
      if (this.draft.habits.weighIn.enabled) {
        initialProfiles.push({
          id: 'prof_morning_weigh_in',
          name: 'Morning Weigh-In',
          category: 'weight',
          actionType: 'log_weight',
          enabled: true,
          startTime: this.draft.habits.weighIn.reminderTime || '07:15',
          endTime: '08:30',
          intervalMinutes: 0,
          specialFixedTimes: [this.draft.habits.weighIn.reminderTime || '07:15'],
          ringtone: 'ring_woodblock',
          alertMode: 'sound_vibrate',
          durationType: 'indefinite',
          durationValue: 0,
          activatedAt: Date.now()
        });
      }

      // Custom Habit
      if (this.draft.habits.custom.enabled && this.draft.habits.custom.title.trim()) {
        initialGoals.push({
          id: `goal_custom_${Date.now()}`,
          title: this.draft.habits.custom.title.trim(),
          icon: '🎯',
          goalType: 'counter',
          targetValue: this.draft.habits.custom.target || 1,
          unit: this.draft.habits.custom.unit || 'times',
          stepAmount: 1
        });
      }

      await storage.saveProfiles(initialProfiles);
      await storage.saveCustomGoals(initialGoals);

      // 5. Save App Lock Settings
      if (this.draft.appLockEnabled) {
        const pinInp = document.getElementById('onboard-pin-input')?.value;
        const pinConfirmInp = document.getElementById('onboard-pin-confirm')?.value;
        if (pinInp && pinInp.length === 4 && pinInp === pinConfirmInp) {
          const pinHash = await hashPin(pinInp);
          await storage.saveAppLockSettings({
            enabled: true,
            pinHash,
            biometricsEnabled: this.draft.biometricsEnabled,
            lockTiming: this.draft.lockTiming
          });
        }
      }

      // 6. Schedule notifications
      await notifications.scheduleMultiProfile(initialProfiles);

      // 7. Mark onboarding complete
      await storage.setOnboardingCompleted(true);

      this.close();

      if (typeof this.onCompleteCallback === 'function') {
        this.onCompleteCallback();
      }
    } catch (err) {
      console.error('Error during onboarding completion:', err);
      alert(`Setup error: ${err?.message || 'Please try again.'}`);
      if (finishBtn) {
        finishBtn.disabled = false;
        finishBtn.innerHTML = '<span>🚀 Finish & Launch My App</span>';
      }
    }
  }

  bindDOMEvents() {
    // Navigation buttons
    document.getElementById('onboard-step1-next')?.addEventListener('click', () => this.goToStep(2));

    document.getElementById('onboard-step2-back')?.addEventListener('click', () => this.goToStep(1));
    document.getElementById('onboard-step2-next')?.addEventListener('click', () => this.goToStep(3));
    document.getElementById('onboard-step2-skip')?.addEventListener('click', () => this.goToStep(3));

    document.getElementById('onboard-step3-back')?.addEventListener('click', () => this.goToStep(2));
    document.getElementById('onboard-step3-next')?.addEventListener('click', () => this.goToStep(4));
    document.getElementById('onboard-step3-skip')?.addEventListener('click', () => {
      this.draft.enableAlarm = false;
      this.goToStep(4);
    });

    document.getElementById('onboard-step4-back')?.addEventListener('click', () => this.goToStep(3));
    document.getElementById('onboard-step4-next')?.addEventListener('click', () => this.goToStep(5));

    document.getElementById('onboard-step5-back')?.addEventListener('click', () => this.goToStep(4));
    document.getElementById('onboard-finish-btn')?.addEventListener('click', () => this.finishSetup());
  }
}

export const onboardingWizard = new OnboardingWizard();
