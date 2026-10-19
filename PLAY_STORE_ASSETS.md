# 🎨 Google Play Store Graphics & Assets Checklist
**App Name:** Rotation Reminder  
**Package:** `com.rotationreminder.app`

This document details the exact visual assets required by Google Play Console, their precise technical specifications, and where each ready-to-upload asset is located in this repository.

---

## 1. Master Assets Summary Table

| Asset Type | Dimensions | Format | Max File Size | File Location in Repo |
| :--- | :--- | :--- | :--- | :--- |
| **App Icon** | 512 x 512 px | 32-bit PNG (with alpha) | 1,024 KB | [`public/icon-512.png`](file:///c:/Users/User/Downloads/Reminder-rotation-app/public/icon-512.png) or [`assets/icon-only.png`](file:///c:/Users/User/Downloads/Reminder-rotation-app/assets/icon-only.png) |
| **Feature Graphic** | 1024 x 500 px | 24-bit PNG or JPEG (no alpha) | 15 MB | [`assets/play-store-feature-graphic.png`](file:///c:/Users/User/Downloads/Reminder-rotation-app/assets/play-store-feature-graphic.png) |
| **Phone Screenshots** | 1080 x 2400 px (or 1080 x 1920) | PNG or 24-bit JPEG | 8 MB each | Min 2, Max 8 screenshots (see Capture Guide below) |

---

## 2. Detailed Asset Specifications

### A. App Icon (Required)
- **Dimensions:** 512 x 512 pixels
- **Format:** 32-bit PNG with alpha channel
- **Color Profile:** sRGB
- **Max Size:** 1,024 KB (1 MB)
- **Design Elements:**
  - Background: Deep Indigo squircle gradient (`#1E1B4B` to `#4F46E5`).
  - Foregrounds: Clockwise dual-tone rotation arcs (Emerald `#34D399` and Golden Amber `#FDE047`).
  - Centerpiece: Warm brass chime bell with subtle drop shadow.
- **Repository Path:**  
  `public/icon-512.png` *(Pre-rendered at 512x512, ~88 KB)*  
  `assets/icon-only.png` *(High-res 1024x1024 master, ~220 KB)*

---

### B. Feature Graphic (Required)
Google Play displays the Feature Graphic at the top of your store listing on mobile devices and across Google Play search results.
- **Dimensions:** 1024 x 500 pixels (Exact aspect ratio 16:7.8 / ~2.04:1)
- **Format:** PNG or JPEG (no alpha transparency)
- **Color Profile:** sRGB
- **Max Size:** 15 MB
- **Design Elements:**
  - Left Safe Zone: Centered Rotation Reminder emblem with glowing squircle background.
  - Right Safe Zone: Bold typography *"Rotation Reminder"*, subhead *"Smart Interval Alarms & Seated 40x Pacer"*, and feature badge pills (*⏰ Every 2h Routine*, *⚡ 40x Pacer Tick*, *🔒 100% Offline*).
  - Background: Deep midnight violet gradient (`#090D16` ➔ `#1E1B4B` ➔ `#2E1065`) with subtle radial indigo light.
- **Repository Path:**  
  `assets/play-store-feature-graphic.png` *(Pre-rendered at 1024x500, ~142 KB)*  
  `public/feature-graphic.png`

---

### C. Phone Screenshots (Required: Minimum 2, Recommended 4)
Google Play requires a minimum of 2 screenshots (up to 8 per device form factor). Screenshots must be clean, vertical (portrait), and unadorned by fake device hands.

#### Recommended Resolutions:
- **Aspect Ratio:** 9:16 or 9:20 (Vertical Portrait)
- **Recommended Size:** `1080 x 2400 px` or `1080 x 1920 px`
- **Minimum Size:** `320 px` on the shortest side, `1080 px` recommended.
- **Maximum Size:** `3840 px`
- **File Format:** JPEG or 24-bit PNG (without alpha)
- **File Size:** Under 8 MB each

#### The 4 Core Screenshots to Capture:

| # | Screen Name | Tab / View | Key UI Elements to Highlight |
| :--- | :--- | :--- | :--- |
| **1** | **Alarms Home & Timeline** | Tab 1: `⏰ Alarms` | • Next Upcoming Alarm Hero Card with live countdown.<br>• Today's Ring-time chips.<br>• Scheduled Alarms list with big toggle switches.<br>• Alert Mode badges (`🔊+📳`, `🔊`, `📳`) and Ringtone selector badge. |
| **2** | **40x Rotation Pacer** | Active Pacer Modal | • High-contrast circular progress ring (0 to 40).<br>• Large live repetition counter.<br>• 1.2s cadence pulse and Milestone markers.<br>• "Screen Keep-Awake Active" indicator. |
| **3** | **Goals, Weight & BMI Ladder** | Tab 2: `🎯 Goals & Weight` | • Weight Progress Hero Card (`Start ➔ Current ➔ Goal`).<br>• Visual BMI Classification badge (Normal / Overweight / etc.).<br>• Interactive 1-tap `+ Log Weight` modal.<br>• 7-Step Milestone Ladder with celebratory badges. |
| **4** | **Personal Profile & App Lock** | Tab 3: `👤 My Profile` | • Local Body Profile (Height, Goal Weight).<br>• Security App Lock toggle (Biometric Fingerprint / Face Unlock / PIN).<br>• Offline Backup & Restore buttons.<br>• 100% Offline Privacy guarantee badge. |

---

## 3. How to Capture High-Res Screenshots (2 Easy Methods)

### Method 1: Using Chrome / Edge DevTools (Fastest & Pixel-Perfect)
1. Run the local dev server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:5173` in Google Chrome or Microsoft Edge.
3. Open DevTools (`F12` or `Ctrl + Shift + I`).
4. Click the **Toggle device toolbar** button (`Ctrl + Shift + M`).
5. In the top dimension selector:
   - Select **Dimensions: Responsive**
   - Enter **Width:** `1080` and **Height:** `2400` (or `412 x 915` with Device Pixel Ratio `2.625`).
6. Navigate to the desired screen (e.g. Alarms tab, launch the 40x Pacer, or open Goals tab).
7. In DevTools, press `Ctrl + Shift + P`, type **"Capture screenshot"**, and press Enter.
8. Chrome will automatically save a pristine `1080 x 2400` PNG screenshot directly to your Downloads folder!

### Method 2: On Your Android Phone
1. Download and install the latest APK on your phone:
   `https://github.com/eliweiss4977/reminder-rotation-app/releases/latest/download/rotation-reminder.apk`
2. Open the app, configure your routine.
3. Press **Power + Volume Down** on your phone to capture the screen.
4. Transfer the screenshots from your phone to your computer.

---

## 4. Play Console Upload Locations

| Asset | Where to Upload in Play Console |
| :--- | :--- |
| **App Icon** | Console ➔ **Grow** ➔ **Store presence** ➔ **Main store listing** ➔ **App icon** |
| **Feature Graphic** | Console ➔ **Main store listing** ➔ **Feature graphic** |
| **Phone Screenshots** | Console ➔ **Main store listing** ➔ **Phone screenshots** *(Drag & drop min 2)* |
| **App Bundle (.aab)** | Console ➔ **Release** ➔ **Testing** ➔ **Internal testing** ➔ **Create new release** |
