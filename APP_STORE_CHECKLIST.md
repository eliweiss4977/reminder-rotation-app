# 🚀 Apple iOS & TestFlight Packaging Checklist

This guide walks you through testing, archiving, and deploying **Rotation Reminder** (`com.rotationreminder.app`) to Apple TestFlight and the Apple App Store.

---

## 📋 Overview of What We Configured

1. **Bundle Identifier:** Standardized to `com.rotationreminder.app` across Capacitor config, Xcode Debug, and Xcode Release configurations.
2. **Display Name:** Set to `Rotation Reminder` in `Info.plist`.
3. **Face ID Permission:** Added `NSFaceIDUsageDescription` for biometric lock compliance.
4. **Export Compliance:** Added `ITSAppUsesNonExemptEncryption = false` so you won't have to submit export compliance forms on every TestFlight build.
5. **Background Audio & In-App Pacer Audio:** Configured `AVAudioSession` with `.playback` and `.mixWithOthers` in `AppDelegate.swift` so sound cues and pacer ticks play even when the iPhone hardware mute switch is flipped to silent.
6. **Custom Notification Audio Bundling:** Registered all 6 custom `.wav` files (`ring_classic.wav`, `ring_crystal.wav`, `ring_double.wav`, `ring_marimba.wav`, `ring_woodblock.wav`, `single_ring.wav`) into the Xcode `project.pbxproj` `PBXResourcesBuildPhase`. When local notifications trigger, iOS native `UNUserNotificationCenter` will play the exact selected ringtone.
7. **App Store Icon:** Generated `assets/app-store-icon-1024.png` and updated `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` with 1024x1024 RGB flattened image (0 alpha channels, compliant with App Store validator).
8. **App Store 6.7" Super Retina XDR Screenshots:** Generated 4 high-resolution 1290x2796 screenshots in `assets/screenshots/ios/`.

---

## 🛠️ Step 1: Transfer or Clone to macOS / Mac Environment

> [!NOTE]
> iOS builds, codesigning, Simulator testing, and TestFlight archiving require Xcode on macOS (or a macOS CI/CD runner like GitHub Actions).
> Push your latest changes to GitHub:
> ```bash
> git add .
> git commit -m "Configure iOS App Store build, audio bundling, icons, and permissions"
> git push origin main
> ```

On your Mac, clone the repository and run:
```bash
npm install
npm run build
npx cap sync ios
```

---

## 🖥️ Step 2: Open Project in Xcode

Open the project workspace in Xcode:
```bash
npx cap open ios
```
*Or manually open the `.xcworkspace` file (NOT `.xcodeproj`):*
```text
ios/App/App.xcworkspace
```

---

## 🔐 Step 3: Configure Signing & Developer Team

1. In the Xcode left-hand Project Navigator, select the root **`App`** project (blue icon).
2. Under **TARGETS**, select **`App`**.
3. Click the **Signing & Capabilities** tab at the top.
4. Check **Automatically manage signing**.
5. In the **Team** dropdown, select your active **Apple Developer Account** (Personal Team or Company Team).
6. Verify the **Bundle Identifier** shows:
   ```text
   com.rotationreminder.app
   ```
7. Xcode will automatically generate the provisioning profile and signing certificate.

---

## 📱 Step 4: Test on iOS Simulator & Physical Device

### A. Testing on iOS Simulator:
1. In Xcode's top destination toolbar, select an iOS Simulator (e.g., **iPhone 16 Pro** or **iPhone 15**).
2. Press `Cmd + R` (or click the **Play** button).
3. The simulator will boot and launch Rotation Reminder.
4. Test:
   - Allow Notifications prompt.
   - Run the 40x Pacer and hear the rhythmic tick chimes.
   - Change ringtone in settings / profile and preview audio.

### B. Testing on a Physical iPhone:
1. Connect your iPhone to your Mac via USB or ensure wireless debugging is enabled.
2. Select your physical iPhone in the Xcode destination bar.
3. If running iOS 16 or later, ensure **Developer Mode** is enabled on the phone:
   - On iPhone: **Settings > Privacy & Security > Developer Mode > On** (reboot when prompted).
4. Press `Cmd + R` to install directly onto your iPhone.
5. Verify:
   - Taptic Engine haptics during the 40x pacer.
   - Lock screen notification alerts with custom sound.
   - Face ID prompt if App Lock is enabled in Profile.

---

## 📦 Step 5: Create Archive for TestFlight

1. In the top destination toolbar, change the build destination to **Any iOS Device (arm64)** (do not select a simulator).
2. In the top menu bar, select:
   **Product > Archive**
3. Xcode will compile the production Swift code, bundle web assets, package the SPM plugins, and open the **Organizer** window once complete.

---

## ☁️ Step 6: Validate & Upload to App Store Connect

1. In the **Organizer** window, select your newly created archive.
2. Click **Distribute App** (blue button on the right).
3. Select **App Store Connect** as the distribution method, then click **Distribute**.
4. Select destination: **Upload** (click **Next**).
5. Distribution options:
   - Keep default selections checked:
     - *Upload your app's symbols to receive symbolicated crash logs*
     - *Manage Version and Build Number*
6. Click **Next** to let Xcode review signing and entitlements.
7. Click **Upload**.
8. Xcode will upload the build to App Store Connect. Within 5–15 minutes, Apple will process the build and send an email confirmation.

---

## 🧪 Step 7: TestFlight Setup in App Store Connect

1. Navigate to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) and click **Apps > Rotation Reminder** (or click **+ New App** if not yet created).
   - If creating New App:
     - Platform: **iOS**
     - Name: **Rotation Reminder**
     - Primary Language: **English (U.S.)**
     - Bundle ID: Select **`com.rotationreminder.app`**
     - SKU: `ROTATION-REMINDER-IOS`
     - User Access: Full Access
2. Go to the **TestFlight** tab.
3. You will see your uploaded build under **iOS**.
4. **Internal Testing:**
   - Under *Internal Groups*, add yourself or team members.
   - Builds become available to internal testers **immediately** without Apple review!
   - Install the **TestFlight** app from the App Store on your iPhone and accept the invitation.
5. **External Testing (Optional):**
   - Under *External Groups*, add external testers (requires brief Apple Beta Review, typically approved within 24 hours).

---

## 🚀 Step 8: App Store Submission

Once TestFlight verification is satisfactory:
1. In App Store Connect, go to the **App Store** tab > **1.0 Prepare for Submission**.
2. **App Store Icon:** Automatically populated from your build binary (`assets/app-store-icon-1024.png` is embedded in the build).
3. **Screenshots:** Drag and drop the 4 screenshots from `assets/screenshots/ios/` into the **6.7" Display** section.
4. **Metadata:** Copy text from `APP_STORE_LISTING.md` into:
   - Subtitle
   - Promotional Text
   - Description
   - Keywords
   - Support URL
5. **App Privacy:** Complete the nutrition label ("No, we do not collect data from this app").
6. **Age Rating:** Answer questions (4+ rating).
7. **Select Build:** Click **+** under Build and select your TestFlight build.
8. Click **Save**, then **Add for Review** / **Submit to App Review**.
