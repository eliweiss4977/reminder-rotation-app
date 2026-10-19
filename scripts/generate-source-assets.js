import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Background SVG (1024x1024)
const bgSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glowGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#1E1B4B" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0F0D2E" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1B4B"/>
      <stop offset="50%" stop-color="#2E1065"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bgGrad)"/>
  <rect width="1024" height="1024" fill="url(#glowGrad)"/>
</svg>
`;

// 2. Foreground SVG (1024x1024, safe zone in center 512,512, diameter ~500px)
const fgSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <g filter="url(#dropShadow)" transform="translate(512, 512)">
    <!-- Clockwise Rotation Arc 1: Emerald Top/Right (from -140 deg to 30 deg) -->
    <!-- Arc radius 200px, stroke 38px -->
    <path d="M -153,-128 A 200,200 0 0,1 173,-100" fill="none" stroke="url(#emeraldGrad)" stroke-width="36" stroke-linecap="round"/>
    <!-- Arrowhead 1 (Emerald) -->
    <polygon points="173,-100 215,-70 185,-30" fill="#34D399"/>

    <!-- Clockwise Rotation Arc 2: Gold Bottom/Left (from 40 deg to 210 deg) -->
    <path d="M 153,128 A 200,200 0 0,1 -173,100" fill="none" stroke="url(#goldGrad)" stroke-width="36" stroke-linecap="round"/>
    <!-- Arrowhead 2 (Gold) -->
    <polygon points="-173,100 -215,70 -185,30" fill="#FDE047"/>

    <!-- Center Icon: Crisp White & Gold Alarm Bell -->
    <!-- Bell Dome -->
    <path d="M -70,50 C -70,-20 -50,-85 0,-85 C 50,-85 70,-20 70,50 Z" fill="#FFFFFF"/>
    <!-- Bell Top Ring/Handle -->
    <circle cx="0" cy="-95" r="16" fill="none" stroke="#FFFFFF" stroke-width="10"/>
    <!-- Bell Inner Core Glow / Accent -->
    <path d="M -50,45 C -50,-10 -35,-65 0,-65 C 35,-65 50,-10 50,45 Z" fill="#F8FAFC" opacity="0.9"/>
    <!-- Bell Rim -->
    <rect x="-85" y="48" width="170" height="20" rx="10" fill="url(#goldGrad)"/>
    <!-- Bell Clapper -->
    <circle cx="0" cy="74" r="18" fill="url(#goldGrad)"/>
    <!-- Central Ear Acupressure Ball Accent inside Bell -->
    <circle cx="0" cy="5" r="18" fill="#10B981" stroke="#FFFFFF" stroke-width="5"/>
  </g>
</svg>
`;

// 3. Composite Full Icon (Background + Foreground)
const fullIconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1B4B"/>
      <stop offset="50%" stop-color="#2E1065"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
    <radialGradient id="glowGrad2" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#1E1B4B" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0F0D2E" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="emeraldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <filter id="dropShadow2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
  </defs>

  <rect width="1024" height="1024" fill="url(#bgGrad2)"/>
  <rect width="1024" height="1024" fill="url(#glowGrad2)"/>

  <g filter="url(#dropShadow2)" transform="translate(512, 512)">
    <!-- Rotation Arc 1 -->
    <path d="M -170,-140 A 220,220 0 0,1 190,-110" fill="none" stroke="url(#emeraldGrad2)" stroke-width="40" stroke-linecap="round"/>
    <polygon points="190,-110 236,-77 203,-33" fill="#34D399"/>

    <!-- Rotation Arc 2 -->
    <path d="M 170,140 A 220,220 0 0,1 -190,110" fill="none" stroke="url(#goldGrad2)" stroke-width="40" stroke-linecap="round"/>
    <polygon points="-190,110 -236,77 -203,33" fill="#FDE047"/>

    <!-- Center Icon: Crisp White & Gold Alarm Bell -->
    <circle cx="0" cy="-105" r="18" fill="none" stroke="#FFFFFF" stroke-width="12"/>
    <path d="M -77,55 C -77,-22 -55,-95 0,-95 C 55,-95 77,-22 77,55 Z" fill="#FFFFFF"/>
    <rect x="-95" y="52" width="190" height="22" rx="11" fill="url(#goldGrad2)"/>
    <circle cx="0" cy="80" r="20" fill="url(#goldGrad2)"/>
    <!-- Acupressure Ear Ball Core -->
    <circle cx="0" cy="5" r="20" fill="#10B981" stroke="#FFFFFF" stroke-width="6"/>
  </g>
</svg>
`;

async function main() {
  console.log('Generating high-resolution 1024x1024 master assets in assets/...');

  // Generate assets/icon-background.png
  await sharp(Buffer.from(bgSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-background.png'));
  console.log('✓ Created assets/icon-background.png (1024x1024)');

  // Generate assets/icon-foreground.png
  await sharp(Buffer.from(fgSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-foreground.png'));
  console.log('✓ Created assets/icon-foreground.png (1024x1024)');

  // Generate assets/icon-only.png
  await sharp(Buffer.from(fullIconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-only.png'));
  console.log('✓ Created assets/icon-only.png (1024x1024)');

  // Generate public PWA icons
  const publicDir = path.join(projectRoot, 'public');
  await sharp(Buffer.from(fullIconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(Buffer.from(fullIconSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Created public/icon-192.png and public/icon-512.png');

  // Also generate standard Android mipmap sizes directly
  const androidResDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  const mipmapSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
  };

  const foregroundSizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432
  };

  for (const [folder, size] of Object.entries(mipmapSizes)) {
    const targetDir = path.join(androidResDir, folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png
    await sharp(Buffer.from(fullIconSvg))
      .resize(size, size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#fff"/></svg>`
    );
    await sharp(Buffer.from(fullIconSvg))
      .resize(size, size)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png (USED BY ADAPTIVE ICONS ON ANDROID 8+)
    const fgSize = foregroundSizes[folder];
    await sharp(Buffer.from(fgSvg))
      .resize(fgSize, fgSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    // ic_launcher_background.png (USED BY ADAPTIVE ICONS ON ANDROID 8+)
    await sharp(Buffer.from(bgSvg))
      .resize(fgSize, fgSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_background.png'));

    console.log(`✓ Generated ${folder} (launcher ${size}x${size}, fg/bg ${fgSize}x${fgSize})`);
  }

  // Generate Notification Shade Vector Icon
  const notifDir = path.join(androidResDir, 'drawable');
  if (!fs.existsSync(notifDir)) fs.mkdirSync(notifDir, { recursive: true });
  const notifXmlPath = path.join(notifDir, 'ic_stat_rotation.xml');
  fs.writeFileSync(notifXmlPath, `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,4V1L8,5l4,4V6c3.31,0 6,2.69 6,6 0,1.01 -0.25,1.97 -0.7,2.8l1.46,1.46C19.54,15.03 20,13.57 20,12c0,-4.42 -3.58,-8 -8,-8zM12,18c-3.31,0 -6,-2.69 -6,-6 0,-1.01 0.25,-1.97 0.7,-2.8L5.24,7.74C4.46,8.97 4,10.43 4,12c0,4.42 3.58,8 8,8v3l4,-4 -4,-4v3z"/>
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,10a2,2 0 1,0 0,4 2,2 0 1,0 0,-4z"/>
</vector>
`, 'utf8');
  console.log('✓ Generated ic_stat_rotation.xml');

  // Favicon SVG in public/
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1B4B"/>
      <stop offset="50%" stop-color="#2E1065"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="140" fill="none" stroke="#34D399" stroke-width="28"/>
  <circle cx="256" cy="256" r="48" fill="#F59E0B"/>
  <circle cx="256" cy="256" r="36" fill="#10B981"/>
  <circle cx="256" cy="256" r="14" fill="#FFFFFF"/>
</svg>
`, 'utf8');
  console.log('✓ Generated public/favicon.svg');

  // Generate splash images
  const splashSvg = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090D16"/>
      <stop offset="50%" stop-color="#1E1B4B"/>
      <stop offset="100%" stop-color="#090D16"/>
    </linearGradient>
  </defs>
  <rect width="2732" height="2732" fill="url(#splashBg)"/>
</svg>
  `;
  await sharp(Buffer.from(splashSvg))
    .resize(2732, 2732)
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  await sharp(Buffer.from(splashSvg))
    .resize(2732, 2732)
    .png()
    .toFile(path.join(assetsDir, 'splash-dark.png'));
  console.log('✓ Created assets/splash.png & assets/splash-dark.png');

  // Generate 1024x500 Google Play Store Feature Graphic
  const featureGraphicSvg = `
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fgBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090D16"/>
      <stop offset="45%" stop-color="#1E1B4B"/>
      <stop offset="85%" stop-color="#2E1065"/>
      <stop offset="100%" stop-color="#4338CA"/>
    </linearGradient>
    <radialGradient id="fgGlow" cx="28%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.5"/>
      <stop offset="70%" stop-color="#1E1B4B" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#090D16" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fgEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="fgGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <filter id="fgShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="500" fill="url(#fgBg)"/>
  <rect width="1024" height="500" fill="url(#fgGlow)"/>

  <!-- Left: Rotation Emblem (Center ~ 230, 250) -->
  <g filter="url(#fgShadow)" transform="translate(220, 250)">
    <!-- Squircle badge background -->
    <rect x="-140" y="-140" width="280" height="280" rx="64" fill="#131138" stroke="#312E81" stroke-width="4"/>
    
    <!-- Clockwise Arc 1: Emerald Top/Right -->
    <path d="M -80,-67 A 105,105 0 0,1 91,-52" fill="none" stroke="url(#fgEmerald)" stroke-width="19" stroke-linecap="round"/>
    <polygon points="91,-52 113,-36 97,-16" fill="#34D399"/>

    <!-- Clockwise Arc 2: Gold Bottom/Left -->
    <path d="M 80,67 A 105,105 0 0,1 -91,52" fill="none" stroke="url(#fgGold)" stroke-width="19" stroke-linecap="round"/>
    <polygon points="-91,52 -113,36 -97,16" fill="#FDE047"/>

    <!-- Center Bell Element -->
    <path d="M -30,22 C -30,22 -32,-30 0,-40 C 32,-30 30,22 30,22 Z" fill="url(#fgGold)"/>
    <ellipse cx="0" cy="22" rx="35" ry="11" fill="#F59E0B"/>
    <circle cx="0" cy="27" r="8" fill="#D97706"/>
    <circle cx="0" cy="-44" r="7" fill="#FDE047"/>
  </g>

  <!-- Right: Branding & Feature Text (X ~ 430 to 950) -->
  <g transform="translate(430, 160)">
    <!-- Title -->
    <text x="0" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">
      Rotation Reminder
    </text>

    <!-- Subtitle -->
    <text x="0" y="76" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="21" font-weight="600" fill="#34D399" letter-spacing="0.2">
      Smart Interval Alarms &amp; Seated 40x Pacer
    </text>

    <!-- Description line -->
    <text x="0" y="116" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="400" fill="#94A3B8">
      Custom routines • High-priority chimes • BMI milestone ladder
    </text>

    <!-- Feature Pill Badges -->
    <g transform="translate(0, 148)">
      <!-- Pill 1: Alarms -->
      <g>
        <rect x="0" y="0" width="138" height="36" rx="18" fill="#1E1B4B" stroke="#4F46E5" stroke-width="1.5"/>
        <text x="69" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#E0E7FF" text-anchor="middle">⏰ Every 2h Routine</text>
      </g>
      <!-- Pill 2: 40x Pacer -->
      <g transform="translate(148, 0)">
        <rect x="0" y="0" width="128" height="36" rx="18" fill="#064E3B" stroke="#059669" stroke-width="1.5"/>
        <text x="64" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#A7F3D0" text-anchor="middle">⚡ 40x Pacer Tick</text>
      </g>
      <!-- Pill 3: Offline Privacy -->
      <g transform="translate(286, 0)">
        <rect x="0" y="0" width="138" height="36" rx="18" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
        <text x="69" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#F1F5F9" text-anchor="middle">🔒 100% Offline</text>
      </g>
    </g>
  </g>
</svg>
  `;

  await sharp(Buffer.from(featureGraphicSvg))
    .resize(1024, 500)
    .png()
    .toFile(path.join(assetsDir, 'play-store-feature-graphic.png'));
  await sharp(Buffer.from(featureGraphicSvg))
    .resize(1024, 500)
    .png()
    .toFile(path.join(publicDir, 'feature-graphic.png'));
  console.log('✓ Created assets/play-store-feature-graphic.png & public/feature-graphic.png (1024x500)');
}

main().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
