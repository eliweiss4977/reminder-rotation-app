# 🚀 Google Play Console Submission & Launch Checklist
**App Name:** Rotation Reminder  
**Package Name:** `com.rotationreminder.app`  
**Bundle File:** `rotation-reminder-release.aab`

Follow this step-by-step checklist to set up your app in the Google Play Console, pass policy checks, and launch an Internal Testing release with private tester links.

---

## Phase 1: Create the App in Google Play Console

1. Navigate to [Google Play Console](https://play.google.com/console/) and sign in with your Google Play Developer Account.
2. In the top right corner, click **"Create app"**.
3. Fill in the initial application details:
   - **App name:** `Rotation Reminder`
   - **Default language:** `English (United States) – en-US`
   - **App or game:** Select **App**
   - **Free or paid:** Select **Free**
4. Check both required declarations:
   - [x] *Developer Program Policies*
   - [x] *US export laws*
5. Click **"Create app"** at the bottom right.

---

## Phase 2: Complete the Policy & Content Declarations ("Set up your app")

On your app dashboard, scroll down to the **"Set up your app"** section and complete the following tasks:

### 1. Privacy Policy
- Click **"Set privacy policy"**.
- Enter your public privacy policy URL:
  ```text
  https://eliweiss4977.github.io/reminder-rotation-app/privacy-policy.html
  ```
  *(Or your deployed Vercel / GitHub Pages URL where `public/privacy-policy.html` is hosted).*
- Click **Save**.

### 2. App Access
- Click **"App access"**.
- Select **"All functionality is available without special access"**.
- Click **Save**.

### 3. Ads Declaration
- Click **"Ads"**.
- Select **"No, my app does not contain ads"**.
- Click **Save**.

### 4. Content Rating (IARC Questionnaire)
- Click **"Content ratings"** ➔ **"Start questionnaire"**.
- Enter your email address for certificate delivery.
- Select category: **"Utility, Productivity, Communication, or Other"**.
- Answer the questionnaire:
  - Violence: **No**
  - Sexuality: **No**
  - Language: **No**
  - Controlled Substances: **No**
  - Gambling: **No**
  - Location sharing / chat: **No**
  - Purchases: **No**
- Click **Save** ➔ **Next** ➔ **Submit**.
- Result will grant: **PEGI 3 / ESRB Everyone / USK 0**.

### 5. Target Audience & Content
- Click **"Target audience and content"**.
- Select age group: **18 and over** *(Recommended for fastest review without child privacy policy hurdles)*.
- Could your store listing appeal to children?: Select **No**.
- Click **Save**.

### 6. News Apps
- Click **"News apps"** ➔ Select **"No"** ➔ Click **Save**.

### 7. COVID-19 Contact Tracing & Status Apps
- Click **"COVID-19 apps"** ➔ Select **"My app is not a publicly available COVID-19 contact tracing or status app"** ➔ Click **Save**.

### 8. Data Safety Form (Crucial Step)
- Click **"Data safety"** ➔ **"Next"**.
- **Data Collection & Sharing:**
  - *"Does your app collect or share any of the required user data types?"* ➔ Select **NO**.
- **Security Practices:**
  - *"Is all user data collected by your app encrypted in transit?"* ➔ (Automatically disabled since no data is collected).
  - *"Do you provide a way for users to request that their data be deleted?"* ➔ Select **YES** *(Because the app includes a 1-tap "Reset All App Data" option in settings)*.
- Click **Next** ➔ Review Summary (confirms *"No data shared with third parties"* and *"No data collected"*) ➔ Click **Submit**.

### 9. Government Apps
- Select **"My app is not affiliated with or endorsed by a government entity"** ➔ Click **Save**.

### 10. Financial Features
- Select **"My app doesn't provide any financial features"** ➔ Click **Save**.

### 11. Health Apps Declaration
- Click **"Health apps"**.
- Select **"My app is a health app"** ➔ Select **Fitness and wellness** (Timer / habit reminders).
- Certify that it is **not a medical device** and does not provide clinical diagnosis.
- Click **Save**.

---

## Phase 3: Main Store Listing & Graphics

In the left navigation menu, go to **Grow** ➔ **Store presence** ➔ **Main store listing**:

1. **Listing Details:**
   - **App name:** `Rotation Reminder`
   - **Short description:**
     ```text
     Smart interval alarms, 40x rotation pacer, and daily health milestone tracking.
     ```
   - **Full description:** Copy and paste the complete text from [`PLAY_STORE_LISTING.md`](file:///c:/Users/User/Downloads/Reminder-rotation-app/PLAY_STORE_LISTING.md).

2. **App Icon:**
   - Upload [`public/icon-512.png`](file:///c:/Users/User/Downloads/Reminder-rotation-app/public/icon-512.png) (512 x 512 px PNG).

3. **Feature Graphic:**
   - Upload [`assets/play-store-feature-graphic.png`](file:///c:/Users/User/Downloads/Reminder-rotation-app/assets/play-store-feature-graphic.png) (1024 x 500 px PNG).

4. **Phone Screenshots:**
   - Upload at least 2 vertical phone screenshots (e.g. Alarms Timeline, 40x Pacer, Weight Ladder).
   - *(Refer to [`PLAY_STORE_ASSETS.md`](file:///c:/Users/User/Downloads/Reminder-rotation-app/PLAY_STORE_ASSETS.md) for screenshot capture steps).*

5. Click **"Save"** at the bottom of the page.

---

## Phase 4: Upload Android App Bundle (.aab) to Internal Testing

Internal testing allows you to distribute the real signed release bundle to up to 100 testers immediately without waiting for standard Google Play review!

1. In the left navigation menu, go to **Release** ➔ **Testing** ➔ **Internal testing**.
2. Click **"Create new release"** (top right).
3. **App Integrity / Play App Signing:**
   - If prompted for *Play App Signing*, click **"Use Google-generated key"** (recommended) or choose to provide your upload key.
4. **App Bundles Upload:**
   - Drag and drop [`rotation-reminder-release.aab`](https://github.com/eliweiss4977/reminder-rotation-app/releases/latest/download/rotation-reminder-release.aab) into the upload area.
   - Wait for the upload to complete and verify:
     - Version name: `1.0.X`
     - Version code: matches your build number.
5. **Release Notes:**
   - Enter release notes:
     ```text
     Initial release of Rotation Reminder:
     • Smart interval reminders with 11:00 PM cutoff
     • Seated 40x rotation pacer with screen-awake lock
     • Body profile, weight tracking, and BMI milestone ladder
     • 100% offline local privacy
     ```
6. Click **"Next"** (bottom right).
7. Review warnings (any general advisory notices) and click **"Save and publish"** (or **"Start rollout to Internal testing"**).

---

## Phase 5: Add Testers & Get the Instant Private Download Link

1. Under the **Internal testing** page, select the **"Testers"** tab.
2. Click **"Create email list"** (e.g., name it `Alpha Testers`).
3. Enter your email address and any tester emails (comma-separated or file upload).
4. Check the box next to your tester list and click **"Save changes"**.
5. Scroll down to the **"How testers join your test"** section:
   - Copy the **"Join on Android"** link:
     ```text
     https://play.google.com/apps/internaltest/...
     ```
   - Or copy the **"Join on Web"** link.
6. Open the link on your Android phone (logged into the tester Google account), tap **"Accept Invite"**, and tap **"Download on Google Play"**!

---

## 🎯 Verification Complete!
Your app is now live on Google Play's internal testing ring. When you are ready for a wider public launch, you can promote this exact release from **Internal testing** ➔ **Closed testing** ➔ **Production** with a single click in the Play Console.
