# 🍎 Apple App Store Listing & Metadata Guide
**App Name:** Rotation Reminder  
**Bundle ID:** `com.rotationreminder.app`  
**Primary Language:** English (U.S.) – `en-US`  
**SKU:** `ROTATION-REMINDER-IOS`

---

## 1. App Store Product Page Information

### App Name (30 characters max)
```text
Rotation Reminder
```
*(17 characters — Clean, memorable, and compliant)*

---

### Subtitle (30 characters max)
```text
Smart Alarms & 40x Pacer
```
*(24 characters — High keyword relevancy for interval alarms, seated pacer, and routines)*

**Alternative Options:**
- `Interval Reminders & Pacer` *(27 characters)*
- `Seated 40x Pacer & Alarms` *(25 characters)*
- `Posture & Interval Reminder` *(27 characters)*

---

### Promotional Text (170 characters max)
*(Can be updated at any time without submitting a new binary build)*
```text
Stay consistent with smart 2h interval alarms, rhythmic seated 40x rotation pacer, milestone weight tracking, and complete offline privacy secured with Face ID.
```
*(167 characters)*

---

### Keywords (100 characters max, comma-separated, no spaces after commas recommended to save space)
```text
rotation,reminder,habit,tracker,interval,alarm,pacer,seated,routine,weight,milestone,timer,wellness,health
```
*(99 characters)*

---

### Categories
- **Primary Category:** `Health & Fitness`
- **Secondary Category:** `Utilities`

---

## 2. Description (4,000 characters max)

*Copy and paste the text below into the Description field in App Store Connect:*

```text
Take control of your daily wellness, posture routines, and habit consistency with Rotation Reminder—the smart interval alarm, seated 40x rotation pacer, and personal health milestone tracker designed with 100% offline privacy and Face ID protection.

Whether you practice targeted interval rotations, timed seated desk stretches, hourly hydration reminders, or progressive weight milestones, Rotation Reminder keeps you on cadence throughout the day with zero distractions.

⏰ SMART INTERVAL & SPECIAL-HOUR ALARMS
• Interval Cadence: Set automatic repeating intervals (Every 2 Hours, Every 1.5 Hours, or custom intervals).
• Special Ring Hours: Schedule specific fixed checkpoints (such as 2:00 PM and 7:00 PM) alongside regular intervals.
• Sensible Evening Cutoff: Built-in default cutoff at 11:00 PM (23:00) prevents unexpected alerts while you sleep.
• Interactive Notification Actions: Directly from the iOS notification banner or Lock Screen, tap "Count 40x Now" to launch the pacer, "Counted (Done)" to mark it completed, or "Snooze 2m" / "Snooze 5m" without unlocking.
• Crystal Clear Custom Chimes: 5 distinct synthesized bell & chime tones (Classic Singing Bowl, Crystal Desk Bell, Soft Double Chime, Zen Woodblock, and Warm Marimba) designed to cut through background noise.

⚡ SEATED 40x ROTATION PACER
• Visual & Audio Cadence: Follow a smooth, rhythmic circular progress ring paced at a calm 1.2-second rhythm for 40 repetitions.
• Keep Screen Awake: Screen-awake lock prevents your iPhone display from dimming or sleeping midway through your seated routine.
• Audio Pacer Ticks: High and low synthesized chimes keep you focused without needing to look at your screen.
• Taptic Feedback: Precision haptic vibrations mark each repetition and celebrate milestone completion.

⚖️ BODY WEIGHT & BMI MILESTONE LADDER
• Progress Hero Card: Track Start Weight ➔ Current Weight ➔ Goal Weight with total weight lost and remaining delta.
• Fast 1-Tap Weight Logging: Log weigh-ins with quick steppers (-0.2 / +0.2) or direct numeric entry with notes.
• Visual BMI Classification: Automatic BMI calculation showing standard categories (Underweight, Normal, Overweight, Obese) based on your height and weight.
• 7-Step Milestone Ladder: Automatically celebrates progress toward your goal with celebratory milestone badges and confetti.

🎯 CUSTOM DAILY HABITS
• Track essential wellness goals: Drink Water, Daily Steps / Walking, Stretching, Meditation, Reading, and more.
• Customizable frequency, target quantities, and personalized ringtimes.
• Single-tap completion directly from your schedule timeline.

🔒 COMPLETE PRIVACY & BIOMETRIC SECURITY
• 100% Offline: No servers, no tracking, no analytics, no third-party ads. Your data never leaves your device.
• Biometric Lock: Protect your health data with Face ID, Touch ID, or a secure 4-digit PIN.
• Local Data Export & Import: Backup and restore your complete schedule and logs anytime in clean JSON format.

Download Rotation Reminder today and establish seamless daily rhythm, posture mobility, and milestone consistency.
```

---

## 3. App Store Connect URLs
- **Support URL:** `https://github.com/<your-username>/Reminder-rotation-app#readme` (or your personal support page)
- **Marketing URL (Optional):** `https://github.com/<your-username>/Reminder-rotation-app`
- **Privacy Policy URL:** `https://github.com/<your-username>/Reminder-rotation-app/blob/main/PRIVACY.md` (or hosted GitHub Pages URL)

---

## 4. App Privacy Nutrition Label ("Data Not Collected")

In App Store Connect under **App Privacy**:
1. Click **Get Started**.
2. When asked *"Do you or your third-party partners collect data from this app?"*, select:
   **No, we do not collect data from this app.**
3. Confirm and publish.  
   *(Rotation Reminder stores 100% of reminder schedules, logs, and biometrics in local encrypted/sandboxed storage on the device; no remote endpoints or trackers exist).*

---

## 5. Age Rating Questionnaire Answers

In App Store Connect under **Age Rating**:
- **Violence:** None
- **Sexual Content or Nudity:** None
- **Profanity or Crude Humor:** None
- **Alcohol, Tobacco, or Drug Use or References:** None
- **Simulated Gambling:** None
- **Horror / Fear Themes:** None
- **Medical / Treatment Information:** None *(App provides posture pacer and personal milestone tracking, not medical diagnoses or treatment)*
- **Unrestricted Web Access:** None
- **Gambling and Contests:** None

**Resulting Rating:** **4+** (Suitable for all ages).

---

## 6. App Review Information & Demo Notes

Provide the following in the **App Review Information** section:

### Sign-In Information
- Check **"Sign-in required"**: **No** *(The app works entirely out of the box without registration or cloud accounts).*

### App Review Notes
```text
Rotation Reminder is a 100% offline personal interval reminder, seated 40x rotation pacer, and weight milestone tracker.

Key Features to Review:
1. Smart Interval Alarms: Upon launch, the app prompts for Notification permission so local notifications can chime at user-configured cadences (e.g., every 2 hours). Custom WAV audio chimes are bundled directly inside the app bundle.
2. 40x Pacer: Tap the "Pacer" tab or tap "Start Pacer" from the dashboard. The app maintains the screen awake lock and triggers Taptic haptics for each repetition.
3. App Lock / Face ID: In the Profile tab, users can toggle "App Lock (PIN & Biometrics)". You can set a test PIN (e.g. 1234) and verify Face ID unlocking.

No user account, subscription, or external network connection is required.
```

---

## 7. App Store Graphics Asset Checklist

| Asset | Specifications | Location in Repository | Status |
| :--- | :--- | :--- | :--- |
| **App Store Icon** | 1024 x 1024 px, PNG, RGB, No Alpha / Transparency | `assets/app-store-icon-1024.png` | ✅ Generated & Verified (RGB, 0 alpha) |
| **Universal iOS AppIcon** | 1024 x 1024 px in Asset Catalog | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` | ✅ Synchronized |
| **6.7" iPhone Screenshots** | 1290 x 2796 px, 72 dpi, PNG | `assets/screenshots/ios/ios-screenshot-*.png` | ✅ 4 Master Screenshots Generated |
| **Audio Notification Chimes**| 5 PCM WAV files (< 30s) bundled in Target Resources | `ios/App/App/ring_*.wav` | ✅ Added to `project.pbxproj` |
