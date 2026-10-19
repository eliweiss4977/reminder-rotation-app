import { defineConfig } from 'vite';
import { execSync } from 'child_process';

function getGitRepoSlug() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
  } catch (e) {}
  return 'eliweiss4977/reminder-rotation-app';
}

const appVersion = process.env.GITHUB_RUN_NUMBER
  ? `v1.0.${process.env.GITHUB_RUN_NUMBER}`
  : 'v1.0.0-local';

const repoSlug = getGitRepoSlug();

export default defineConfig({
  base: './',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_GITHUB_REPO': JSON.stringify(repoSlug),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true,
  }
});
