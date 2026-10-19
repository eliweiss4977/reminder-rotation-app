/**
 * Rotation Reminder Automated QA & Security Test Suite
 * Tests Schedule Generation, Deduplication, BMI / Milestone Engine,
 * Audio / Icon Assets, and Production Build Integrity.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateProfileDailySlots,
  calculateMergedMultiProfileSchedule,
  calculateMultiProfile5DaysNotificationSlots,
  timeToMinutes
} from '../src/scheduleEngine.js';
import {
  ALARM_TEMPLATES,
  calculateBMI,
  getBMICategory,
  calculateMilestoneLadder,
  calculateTotalHeightMeters
} from '../src/storage.js';
import {
  escapeHtml,
  getLocalDateString,
  safeJsonParse,
  sanitizeLogString
} from '../src/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING ROTATION REMINDER AUTOMATED QA TEST SUITE');
  console.log('====================================================\n');

  // ---------------------------------------------------------------------------
  // TEST SUITE 1: SCHEDULE GENERATION & DEDUPLICATION LOGIC
  // ---------------------------------------------------------------------------
  console.log('📋 [Suite 1] Schedule Generation & Deduplication Logic');

  // Test Template 1: Every 2 Hours (07:00 to 23:00) -> 9 slots (07:00, 09:00, 11:00, 13:00, 15:00, 17:00, 19:00, 21:00, 23:00)
  const tpl2h = ALARM_TEMPLATES.find(t => t.id === 'template_rotation_2h');
  const slots2h = calculateProfileDailySlots({ ...tpl2h, enabled: true });
  assertEqual(slots2h.length, 9, 'Template 2h generates exactly 9 slots between 07:00 and 23:00');
  assert(isChronological(slots2h), 'Template 2h slots are in strictly ascending chronological order');
  assert(hasZeroDuplicates(slots2h), 'Template 2h slots contain 0 duplicate timestamps');

  // Test Template 2: Every 2h + 2:00 & 7:00 PM (14:00 & 19:00)
  // 14:00 is not on the 2h interval starting at 07:00 (07, 09, 11, 13, 15, 17, 19, 21, 23).
  // 19:00 IS on the 2h interval (19:00).
  // So: 9 interval slots + 1 additional fixed slot (14:00) - 1 merged slot (19:00) = 10 unique slots.
  const tpl2h_2_7 = ALARM_TEMPLATES.find(t => t.id === 'template_rotation_2h_2_7');
  const slots2h_2_7 = calculateProfileDailySlots({ ...tpl2h_2_7, enabled: true });
  assertEqual(slots2h_2_7.length, 10, 'Template 2h + 2&7 PM generates exactly 10 slots (9 interval + 1 non-overlapping fixed at 14:00)');
  assert(isChronological(slots2h_2_7), 'Template 2h + 2&7 PM slots are sorted strictly in chronological order');
  assert(hasZeroDuplicates(slots2h_2_7), 'Template 2h + 2&7 PM has zero duplicate timestamps');
  const slot19 = slots2h_2_7.find(s => s.time24 === '19:00');
  assert(slot19 && slot19.isSpecial && slot19.badgeType === 'merged', '19:00 interval slot is merged with fixed time without duplicate alarm');

  // Test Template 3: Every 2h + 3:00 & 7:00 PM (15:00 & 19:00)
  // Both 15:00 and 19:00 land EXACTLY on the 2h interval from 07:00!
  // Interval slots: 07, 09, 11, 13, 15, 17, 19, 21, 23 = 9 slots total.
  // Both fixed times must be deduplicated/merged, yielding EXACTLY 9 slots, 0 duplicates.
  const tpl2h_3_7 = ALARM_TEMPLATES.find(t => t.id === 'template_rotation_2h_3_7');
  const slots2h_3_7 = calculateProfileDailySlots({ ...tpl2h_3_7, enabled: true });
  assertEqual(slots2h_3_7.length, 9, 'Template 2h + 3&7 PM deduplicates 15:00 and 19:00 into exactly 9 unique slots');
  assert(isChronological(slots2h_3_7), 'Template 2h + 3&7 PM slots are in strict chronological order');
  assert(hasZeroDuplicates(slots2h_3_7), 'Template 2h + 3&7 PM has zero duplicate timestamps');
  const slot15 = slots2h_3_7.find(s => s.time24 === '15:00');
  assert(slot15 && slot15.badgeType === 'merged', '15:00 is marked as merged interval + special slot');

  // Test Template 4: Every 1.5h + 4:00 & 7:00 PM (16:00 & 19:00)
  // 1.5h intervals from 07:00: 07:00, 08:30, 10:00, 11:30, 13:00, 14:30, 16:00, 17:30, 19:00, 20:30, 22:00 -> 11 slots
  // 16:00 matches interval, 19:00 matches interval. Total 11 unique slots.
  const tpl15h_4_7 = ALARM_TEMPLATES.find(t => t.id === 'template_rotation_1_5h_4_7');
  const slots15h_4_7 = calculateProfileDailySlots({ ...tpl15h_4_7, enabled: true });
  assertEqual(slots15h_4_7.length, 11, 'Template 1.5h + 4&7 PM generates 11 unique slots between 07:00 and 23:00');
  assert(isChronological(slots15h_4_7), 'Template 1.5h + 4&7 PM slots are in chronological order');
  assert(hasZeroDuplicates(slots15h_4_7), 'Template 1.5h + 4&7 PM has zero duplicate timestamps');

  // Test 5-Day Multi-Profile Notification Generation & Collision Resistance
  const testProfiles = [
    { ...tpl2h_2_7, id: 'prof_rot_1', enabled: true },
    { id: 'prof_water', name: 'Drink Water', category: 'water', enabled: true, startTime: '07:00', endTime: '23:00', intervalMinutes: 120 }
  ];
  const notifs = calculateMultiProfile5DaysNotificationSlots(testProfiles, new Date('2026-10-19T06:00:00'));
  assert(notifs.length > 0, 'Generates pending notifications for active profiles');
  const notifIds = notifs.map(n => n.id);
  const uniqueNotifIds = new Set(notifIds);
  assertEqual(uniqueNotifIds.size, notifIds.length, 'All 5-day notification IDs are 100% collision-free');
  assert(notifs.every(n => n.id > 0 && n.id <= 2147483647), 'All notification IDs fit within 32-bit positive integer range');

  console.log('\n----------------------------------------------------');

  // ---------------------------------------------------------------------------
  // TEST SUITE 2: BMI & MILESTONE LADDER ENGINE
  // ---------------------------------------------------------------------------
  console.log('⚖️  [Suite 2] BMI & Milestone Ladder Engine');

  const standardImperialProfile = { heightUnit: 'ft_in', heightFeet: 5, heightInches: 10 };
  const standardMetricProfile = { heightUnit: 'cm', heightCm: 177.8 };

  // Imperial BMI Calculation
  // 180 lbs at 5 ft 10 in (70 in = 1.778 m) -> 81.646 kg / (1.778)^2 = 25.82 -> 25.8 BMI
  const bmiImp = calculateBMI(180, 'lbs', standardImperialProfile);
  assertEqual(bmiImp, 25.8, 'Imperial BMI calculated accurately (180 lbs @ 5\'10" = 25.8 BMI)');
  assertEqual(getBMICategory(bmiImp).label, 'Overweight', 'BMI 25.8 correctly classified as Overweight');

  // Metric BMI Calculation
  const bmiMetric = calculateBMI(81.65, 'kg', standardMetricProfile);
  assertEqual(bmiMetric, 25.8, 'Metric BMI calculated consistently with Imperial');

  // Safe Edge Cases
  assertEqual(calculateBMI(0, 'lbs', standardImperialProfile), null, 'Zero weight safely returns null');
  assertEqual(calculateBMI(-10, 'lbs', standardImperialProfile), null, 'Negative weight safely returns null');
  assertEqual(calculateBMI(180, 'lbs', { heightUnit: 'ft_in', heightFeet: 0, heightInches: 0 }), null, 'Zero height safely returns null (no divide-by-zero / NaN)');
  assertEqual(getBMICategory(null).label, 'Unknown', 'Null BMI categorized safely as Unknown');

  // Milestone Ladder Threshold Tests
  // At 240 lbs (BMI ~ 34.4), Obesity Class I
  const ladderHeavy = calculateMilestoneLadder(240, 'lbs', standardImperialProfile);
  assertEqual(ladderHeavy.length, 4, 'Milestone ladder generates 4 standard BMI checkpoints');
  const exitClass3 = ladderHeavy.find(m => m.id === 'exit_class_3');
  assert(exitClass3 && exitClass3.isAchieved, 'Exit Class III (<40.0) marked as already achieved for 240 lbs');
  const exitClass2 = ladderHeavy.find(m => m.id === 'exit_class_2');
  assert(exitClass2 && exitClass2.isAchieved, 'Exit Class II (<35.0) marked as already achieved for 240 lbs');
  const reachHealthy = ladderHeavy.find(m => m.id === 'reach_healthy');
  assert(reachHealthy && !reachHealthy.isAchieved && reachHealthy.remainingWeight > 0, 'Healthy Weight target marked as unachieved with remaining weight > 0');

  // Edge case: Already healthy weight (150 lbs)
  const ladderLight = calculateMilestoneLadder(150, 'lbs', standardImperialProfile);
  assert(ladderLight.every(m => m.isAchieved), 'All milestones marked as achieved when user is already at healthy weight');
  assert(ladderLight.every(m => m.remainingWeight === 0), 'Remaining weight is 0 for all achieved milestones');

  console.log('\n----------------------------------------------------');

  // ---------------------------------------------------------------------------
  // TEST SUITE 3: SECURITY, XSS & STORAGE SAFETY
  // ---------------------------------------------------------------------------
  console.log('🔒 [Suite 3] Security, XSS & Storage Safety');

  // XSS Escaping
  const maliciousInput = '<script>alert("hacked")</script>&"\'';
  const escaped = escapeHtml(maliciousInput);
  assert(!escaped.includes('<script>'), 'escapeHtml removes unescaped <script>');
  assert(escaped.includes('&lt;script&gt;'), 'escapeHtml converts < and > into &lt; and &gt;');
  assert(escaped.includes('&amp;') && escaped.includes('&quot;') && escaped.includes('&#39;'), 'escapeHtml escapes quotes and ampersands');
  assertEqual(escapeHtml(null), '', 'escapeHtml handles null safely');
  assertEqual(escapeHtml(undefined), '', 'escapeHtml handles undefined safely');

  // Secret & Token Log Sanitization
  const logWithPat = 'Error connecting with github_pat_11ABC123XYZ and Bearer secret_token_456';
  const cleanLog = sanitizeLogString(logWithPat);
  assert(!cleanLog.includes('github_pat_11ABC123XYZ'), 'sanitizeLogString redacts github_pat_ tokens');
  assert(!cleanLog.includes('secret_token_456'), 'sanitizeLogString redacts Bearer tokens');

  // Corrupted Storage JSON Parsing
  assertEqual(safeJsonParse('{"valid": 123}', {}).valid, 123, 'safeJsonParse parses valid JSON');
  assertEqual(safeJsonParse('{invalid-json: undefined', 'fallback_val'), 'fallback_val', 'safeJsonParse catches corrupted JSON without crashing');
  assertEqual(safeJsonParse(null, 'default'), 'default', 'safeJsonParse handles null safely');

  // Timezone-safe Date String
  const localDateStr = getLocalDateString(new Date());
  assert(/^\d{4}-\d{2}-\d{2}$/.test(localDateStr), `getLocalDateString returns valid YYYY-MM-DD: ${localDateStr}`);

  // Android Cleartext Traffic Check
  const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  assert(manifestContent.includes('android:usesCleartextTraffic="false"'), 'AndroidManifest.xml sets android:usesCleartextTraffic="false"');
  assert(manifestContent.includes('android:exported="true"'), 'MainActivity has android:exported="true"');

  console.log('\n----------------------------------------------------');

  // ---------------------------------------------------------------------------
  // TEST SUITE 4: AUDIO, ICON & NATIVE ASSETS VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('🎨 [Suite 4] Audio & Icon Assets Verification');

  const ringtones = [
    'ring_classic.wav',
    'ring_crystal.wav',
    'ring_double.wav',
    'ring_woodblock.wav',
    'ring_marimba.wav'
  ];

  // Verify Web Audio Files
  ringtones.forEach(file => {
    const webPath = path.join(projectRoot, 'public', 'sounds', file);
    assert(fs.existsSync(webPath) && fs.statSync(webPath).size > 1000, `Audio asset public/sounds/${file} exists and is non-empty`);
  });

  // Verify Android Raw Audio Files
  ringtones.forEach(file => {
    const rawPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw', file);
    assert(fs.existsSync(rawPath) && fs.statSync(rawPath).size > 1000, `Android raw audio android/res/raw/${file} exists and is non-empty`);
  });

  // Verify single_ring.wav backward compatibility
  const singleRingWeb = path.join(projectRoot, 'public', 'single_ring.wav');
  const singleRingAndroid = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw', 'single_ring.wav');
  assert(fs.existsSync(singleRingWeb), 'Backward compatibility single_ring.wav exists in public/');
  assert(fs.existsSync(singleRingAndroid), 'Backward compatibility single_ring.wav exists in android res/raw/');

  // Verify Notification Shade Icon Vector
  const notifIconPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable', 'ic_stat_rotation.xml');
  assert(fs.existsSync(notifIconPath), 'Notification shade icon ic_stat_rotation.xml exists');
  const notifIconContent = fs.readFileSync(notifIconPath, 'utf8');
  assert(notifIconContent.includes('<vector') && notifIconContent.includes('android:viewportWidth="24"'), 'ic_stat_rotation.xml is valid vector drawable');

  // Verify Launcher Vector Drawables
  const bgVector = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable', 'ic_launcher_background.xml');
  const fgVector = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable', 'ic_launcher_foreground.xml');
  assert(fs.existsSync(bgVector), 'Launcher background vector drawable exists');
  assert(fs.existsSync(fgVector), 'Launcher foreground vector drawable exists');

  // Verify Mipmap PNGs (Standard, Round, and Adaptive Foreground & Background)
  const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  densities.forEach(density => {
    const iconPng = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`, 'ic_launcher.png');
    const roundPng = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`, 'ic_launcher_round.png');
    const fgPng = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`, 'ic_launcher_foreground.png');
    const bgPng = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`, 'ic_launcher_background.png');
    assert(fs.existsSync(iconPng), `Mipmap ic_launcher.png exists for ${density}`);
    assert(fs.existsSync(roundPng), `Mipmap ic_launcher_round.png exists for ${density}`);
    assert(fs.existsSync(fgPng), `Adaptive mipmap ic_launcher_foreground.png exists for ${density}`);
    assert(fs.existsSync(bgPng), `Adaptive mipmap ic_launcher_background.png exists for ${density}`);
  });

  // Verify Master 1024x1024 Assets
  assert(fs.existsSync(path.join(projectRoot, 'assets', 'icon-foreground.png')), 'High-res assets/icon-foreground.png exists');
  assert(fs.existsSync(path.join(projectRoot, 'assets', 'icon-background.png')), 'High-res assets/icon-background.png exists');
  assert(fs.existsSync(path.join(projectRoot, 'assets', 'icon-only.png')), 'High-res assets/icon-only.png exists');

  // Verify Web Favicon & PWA Icons
  assert(fs.existsSync(path.join(projectRoot, 'public', 'favicon.svg')), 'Favicon SVG exists in public/');
  assert(fs.existsSync(path.join(projectRoot, 'public', 'icon-192.png')), 'PWA icon-192.png exists in public/');
  assert(fs.existsSync(path.join(projectRoot, 'public', 'icon-512.png')), 'PWA icon-512.png exists in public/');

  // ---------------------------------------------------------------------------
  // TEST SUITE 5: 3-TAB UX ARCHITECTURE INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n📱 [Suite 5] 3-Tab Bottom Navigation & Profile Architecture');
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  assert(indexHtml.includes('id="tab-content-alarms"'), 'Tab 1: tab-content-alarms exists in DOM');
  assert(indexHtml.includes('id="tab-content-goals"'), 'Tab 2: tab-content-goals exists in DOM');
  assert(indexHtml.includes('id="tab-content-profile"'), 'Tab 3: tab-content-profile exists in DOM');
  assert(indexHtml.includes('id="nav-btn-alarms"'), 'Nav button for Alarms exists');
  assert(indexHtml.includes('id="nav-btn-goals"'), 'Nav button for Goals & Weight exists');
  assert(indexHtml.includes('id="nav-btn-profile"'), 'Nav button for My Profile exists');
  assert(indexHtml.includes('id="profile-name-input"'), 'Personal Body Profile name input exists');
  assert(indexHtml.includes('id="save-body-profile-btn"'), 'Save Profile button exists');
  assert(indexHtml.includes('id="github-token-input"'), 'GitHub read-only token input exists');
  assert(indexHtml.includes('id="backup-export-btn"'), 'Data Export (JSON) button exists');

  // ---------------------------------------------------------------------------
  // TEST SUITE 6: ONBOARDING, APP LOCK & ZERO PRE-ASSUMED DATA VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n🔐 [Suite 6] Onboarding, App Lock & Zero Pre-Assumed Data Verification');

  const { storage, INITIAL_PROFILES, INITIAL_WEIGHT_LOGS, INITIAL_CUSTOM_GOALS, DEFAULT_WEIGHT_SETTINGS, DEFAULT_BODY_PROFILE } = await import('../src/storage.js');
  const { hashPin, verifyPin } = await import('../src/applock.js');

  // Verify Zero Pre-Assumed Fake Seed Data
  assertEqual(INITIAL_PROFILES.length, 0, 'INITIAL_PROFILES array is completely empty (0 alarms assumed)');
  assertEqual(INITIAL_WEIGHT_LOGS.length, 0, 'INITIAL_WEIGHT_LOGS array is completely empty (0 weigh-ins assumed)');
  assertEqual(INITIAL_CUSTOM_GOALS.length, 0, 'INITIAL_CUSTOM_GOALS array is completely empty (0 goals assumed)');
  assertEqual(DEFAULT_WEIGHT_SETTINGS.startWeight, null, 'DEFAULT_WEIGHT_SETTINGS startWeight is null (not 185)');
  assertEqual(DEFAULT_WEIGHT_SETTINGS.currentWeight, null, 'DEFAULT_WEIGHT_SETTINGS currentWeight is null (not 181.4)');
  assertEqual(DEFAULT_WEIGHT_SETTINGS.goalWeight, null, 'DEFAULT_WEIGHT_SETTINGS goalWeight is null (not 170)');
  assertEqual(DEFAULT_BODY_PROFILE.heightFeet, null, 'DEFAULT_BODY_PROFILE heightFeet is null (not 5)');
  assertEqual(DEFAULT_BODY_PROFILE.heightInches, null, 'DEFAULT_BODY_PROFILE heightInches is null (not 10)');
  assertEqual(DEFAULT_BODY_PROFILE.heightCm, null, 'DEFAULT_BODY_PROFILE heightCm is null (not 178)');
  assertEqual(DEFAULT_BODY_PROFILE.isConfigured, false, 'DEFAULT_BODY_PROFILE isConfigured starts false');

  // Verify App Lock SHA-256 PIN Hashing & Verification
  const testPin = '2468';
  const hashedPin = await hashPin(testPin);
  assert(typeof hashedPin === 'string' && hashedPin.length === 64, 'hashPin produces valid 64-char SHA-256 hex string');
  assert(await verifyPin('2468', hashedPin), 'verifyPin returns true for matching PIN');
  assert(!await verifyPin('1111', hashedPin), 'verifyPin returns false for incorrect PIN');
  assert(!await verifyPin('', hashedPin), 'verifyPin returns false for empty PIN');

  // Verify Export / Import Data Engine
  const exportedJson = await storage.exportAllData();
  assert(typeof exportedJson === 'string' && exportedJson.includes('exportVersion'), 'exportAllData generates valid JSON with version metadata');
  const parsedExport = JSON.parse(exportedJson);
  assert(Array.isArray(parsedExport.profiles), 'Exported data includes profiles array');
  assert(parsedExport.bodyProfile && typeof parsedExport.bodyProfile === 'object', 'Exported data includes bodyProfile object');
  const importResult = await storage.importAllData(exportedJson);
  assert(importResult && importResult.success === true, 'importAllData successfully imports exported backup data');

  // Verify Privacy Policy & Play Store Readiness
  const privacyHtmlPath = path.join(projectRoot, 'public', 'privacy-policy.html');
  assert(fs.existsSync(privacyHtmlPath), 'public/privacy-policy.html exists on disk');
  const privacyContent = fs.readFileSync(privacyHtmlPath, 'utf8');
  assert(privacyContent.includes('100% Offline & Local Storage'), 'Privacy policy explicitly mentions offline local storage');
  assert(privacyContent.includes('Zero Analytics'), 'Privacy policy confirms zero analytics and zero tracking');

  // Verify Android SDK 35 & Dynamic VersionCode
  const variablesGradle = fs.readFileSync(path.join(projectRoot, 'android', 'variables.gradle'), 'utf8');
  assert(variablesGradle.includes('targetSdkVersion = 35'), 'android/variables.gradle sets targetSdkVersion = 35');
  assert(variablesGradle.includes('compileSdkVersion = 35'), 'android/variables.gradle sets compileSdkVersion = 35');

  const appBuildGradle = fs.readFileSync(path.join(projectRoot, 'android', 'app', 'build.gradle'), 'utf8');
  assert(appBuildGradle.includes('GITHUB_RUN_NUMBER'), 'android/app/build.gradle dynamically reads GITHUB_RUN_NUMBER for versionCode');

  // Verify Onboarding and Security DOM Elements in index.html
  assert(indexHtml.includes('id="onboarding-modal"'), 'Onboarding modal #onboarding-modal exists in index.html');
  assert(indexHtml.includes('id="onboard-screen-1"'), 'Onboarding Screen 1 exists in DOM');
  assert(indexHtml.includes('id="onboard-screen-2"'), 'Onboarding Screen 2 exists in DOM');
  assert(indexHtml.includes('id="onboard-screen-3"'), 'Onboarding Screen 3 exists in DOM');
  assert(indexHtml.includes('id="onboard-screen-4"'), 'Onboarding Screen 4 exists in DOM');
  assert(indexHtml.includes('id="onboard-screen-5"'), 'Onboarding Screen 5 exists in DOM');
  assert(indexHtml.includes('id="applock-screen"'), 'App Lock screen #applock-screen exists in index.html');
  assert(indexHtml.includes('id="privacy-policy-modal"'), 'Privacy policy modal #privacy-policy-modal exists in index.html');
  assert(indexHtml.includes('id="btn-restart-onboarding"'), 'Restart onboarding button exists in index.html');
  assert(indexHtml.includes('id="profile-applock-toggle"'), 'App Lock toggle switch exists in index.html');
  assert(indexHtml.includes('id="backup-import-btn"'), 'Import backup button exists in index.html');
  assert(indexHtml.includes('id="btn-view-privacy-policy"'), 'View privacy policy button exists in index.html');

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

function isChronological(slots) {
  for (let i = 0; i < slots.length - 1; i++) {
    if (slots[i].minutes >= slots[i + 1].minutes) {
      return false;
    }
  }
  return true;
}

function hasZeroDuplicates(slots) {
  const times = slots.map(s => s.minutes);
  return new Set(times).size === times.length;
}

runTestSuite().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
