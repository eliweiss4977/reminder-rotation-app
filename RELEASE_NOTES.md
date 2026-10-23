# 📝 Google Play Console Release Notes Log

This file tracks the exact, policy-compliant release notes (under 500 characters) for every build, formatted for direct copy-and-paste into the Google Play Console release editor.

---

## 🚀 Build #28 (v1.0.28) — Current Play Store Release
**Target SDK:** Android API Level 36  
**Version Code:** 28  
**Status:** Play Store Production, Sound & Dismissal Reliability Fix

### Copy & Paste for Google Play Console:
```text
What's new in Rotation Reminder:
• Notification Dismissal: Tapping dismiss now quietly clears the reminder without opening the app.
• Audio Reliability: Upgraded high-priority alarm channels, proactive audio priming, and foreground chimes.
• Test Alert Fix: Double-testing alerts now reliably triggers sound and vibration every time.
• Android Home Screen Widget & Wear OS Watch Tile: Live countdowns and wrist haptics.
• 100% Offline & Private: Zero telemetry.
```
*(402 characters / 500 max)*

---

## 📜 Previous Builds & Changelog

### Build #27 (v1.0.27)
- Android Home Screen Widget and Wear OS companion applet.
- Redesigned 5-pack store screenshots with crisp typography and bottom navigation.

### Build #26 (v1.0.26)
- Native Android Home Screen Widget (`AppWidgetProvider`) with live countdown and deep link.
- Google Wear OS Companion module (`wear/`) with Tile service and wrist haptic pacer.

### Build #25 (v1.0.25)
- Redesigned Screenshot 4 with authentic vector graphics for Biometric Lock and Profile.

### Build #23 (v1.0.23)
- Removed in-app APK self-updater and external GitHub query inputs to guarantee 100% compliance with Google Play Device and Network Abuse policies.
- Streamlined "My Profile" with verified Google Play Edition status badge and offline data management.

### Build #21 (v1.0.21)
- Bumped `compileSdkVersion` and `targetSdkVersion` to 36 (Android 16) to satisfy Google Play's 2026 minimum API level requirement.

### Build #20 (v1.0.20)
- Configured dedicated developer support contact (`rotationreminder@gmail.com`).
- Hosted static Privacy Policy document on GitHub Pages.
