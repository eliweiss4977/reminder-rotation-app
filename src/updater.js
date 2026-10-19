// In-App GitHub Auto-Updater Service
// Queries GitHub API for the latest release, compares build numbers, and triggers native APK download.

import { storage } from './storage.js';

export const DEFAULT_APP_VERSION = import.meta.env.VITE_APP_VERSION || 'v1.0.0-local';
export const DEFAULT_GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'eliweiss4977/reminder-rotation-app';

class AppUpdater {
  constructor() {
    this.currentVersion = DEFAULT_APP_VERSION;
    this.repoSlug = DEFAULT_GITHUB_REPO;
    this.latestRelease = null;
    this.hasUpdate = false;
    this.isChecking = false;
    this.onUpdateListeners = [];
    this.dismissedVersion = null;

    this.init();
  }

  async init() {
    // Check if custom repo override exists in storage
    const customRepo = await storage.get('satkin_custom_github_repo', null);
    if (customRepo) {
      this.repoSlug = customRepo.trim();
    }

    // Auto-check on startup (with 1.5s delay to let main view load smoothly)
    setTimeout(() => {
      this.checkForUpdates(false);
    }, 1500);

    // Auto-check on app resume / tab visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates(false);
      }
    });
  }

  async setRepoSlug(newSlug) {
    if (!newSlug || typeof newSlug !== 'string') return;
    this.repoSlug = newSlug.trim();
    await storage.set('satkin_custom_github_repo', this.repoSlug);
    return await this.checkForUpdates(true);
  }

  getRepoSlug() {
    return this.repoSlug;
  }

  getCurrentVersion() {
    return this.currentVersion;
  }

  // Parse build number from "v1.0.14" -> 14. If "v1.0.0-local", returns 0.
  parseBuildNumber(tag) {
    if (!tag) return 0;
    const match = tag.match(/v?1\.0\.(\d+)/i) || tag.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async checkForUpdates(isManual = false) {
    if (this.isChecking) return null;
    this.isChecking = true;
    this.notifyListeners({ status: 'checking', isManual });

    const fallbackUrl = `https://github.com/${this.repoSlug}/releases/latest/download/rotation-reminder.apk`;

    try {
      const url = `https://api.github.com/repos/${this.repoSlug}/releases/latest?t=${Date.now()}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const data = await response.json();
      const latestTag = data.tag_name || 'v1.0.0';
      const publishedAt = data.published_at ? new Date(data.published_at) : new Date();
      const body = data.body || '';

      // Find APK asset
      let apkDownloadUrl = fallbackUrl;
      if (Array.isArray(data.assets)) {
        const apkAsset = data.assets.find(a => a.name && a.name.endsWith('.apk'));
        if (apkAsset && apkAsset.browser_download_url) {
          apkDownloadUrl = apkAsset.browser_download_url;
        }
      }

      const localBuild = this.parseBuildNumber(this.currentVersion);
      const remoteBuild = this.parseBuildNumber(latestTag);

      // A newer version is available if remote build number > local build number,
      // or if running in local dev build and a release exists on GitHub.
      const hasUpdate = (remoteBuild > localBuild) || (this.currentVersion.includes('local') && remoteBuild > 0);

      this.latestRelease = {
        tagName: latestTag,
        publishedAt,
        body,
        downloadUrl: apkDownloadUrl,
        remoteBuild,
        localBuild
      };
      this.hasUpdate = hasUpdate;

      const result = {
        status: hasUpdate ? 'update_available' : 'up_to_date',
        hasUpdate,
        isManual,
        currentVersion: this.currentVersion,
        latestVersion: latestTag,
        downloadUrl: apkDownloadUrl,
        publishedAt,
        releaseNotes: body
      };

      this.isChecking = false;
      this.notifyListeners(result);
      return result;
    } catch (err) {
      console.warn('In-app updater check failed:', err);
      this.isChecking = false;

      const result = {
        status: 'error',
        error: err.message,
        isManual,
        currentVersion: this.currentVersion,
        latestVersion: this.latestRelease?.tagName || 'Unknown',
        downloadUrl: fallbackUrl
      };

      this.notifyListeners(result);
      return result;
    }
  }

  // Open direct download link in Android native system downloader
  installUpdate(url = null) {
    const targetUrl = url || this.latestRelease?.downloadUrl || `https://github.com/${this.repoSlug}/releases/latest/download/rotation-reminder.apk`;
    console.log('Opening APK download URL:', targetUrl);

    try {
      // In Capacitor/Android WebView, '_system' passes the URL to Android Download Manager
      window.open(targetUrl, '_system');
    } catch (e) {
      // Fallback
      const a = document.createElement('a');
      a.href = targetUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }
  }

  dismissUpdate(version) {
    this.dismissedVersion = version;
    this.notifyListeners({ status: 'dismissed', version });
  }

  isDismissed(version) {
    return this.dismissedVersion === version;
  }

  addListener(callback) {
    this.onUpdateListeners.push(callback);
    if (this.latestRelease) {
      callback({
        status: this.hasUpdate ? 'update_available' : 'up_to_date',
        hasUpdate: this.hasUpdate,
        currentVersion: this.currentVersion,
        latestVersion: this.latestRelease.tagName,
        downloadUrl: this.latestRelease.downloadUrl,
        publishedAt: this.latestRelease.publishedAt,
        releaseNotes: this.latestRelease.body
      });
    }
  }

  notifyListeners(data) {
    this.onUpdateListeners.forEach(cb => {
      try { cb(data); } catch (e) {}
    });
  }
}

export const updater = new AppUpdater();
