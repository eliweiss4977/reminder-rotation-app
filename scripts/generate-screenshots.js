import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const assetsDir = path.join(projectRoot, 'assets', 'screenshots');
const publicDir = path.join(projectRoot, 'public', 'screenshots');
const iosAssetsDir = path.join(assetsDir, 'ios');
const iosPublicDir = path.join(publicDir, 'ios');

for (const dir of [assetsDir, publicDir, iosAssetsDir, iosPublicDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const SANS = "Arial, 'Segoe UI', Helvetica, sans-serif";
const MONO = "'Consolas', 'Courier New', monospace, sans-serif";

// Bottom Navigation Bar component for the mockup screen
function renderBottomNav(activeTab = 'alarms') {
  const tabs = [
    { id: 'alarms', label: 'Alarms', icon: '<path d="M12 4v2m0 12v2M4 12H2m20 0h-2m-2.93-6.07l1.41-1.41M5.52 18.48l1.41-1.41M18.48 18.48l-1.41-1.41M6.93 5.52L5.52 4.11M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>' },
    { id: 'pacer', label: '40x Pacer', icon: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' },
    { id: 'goals', label: 'Goals', icon: '<path d="M4 19h16M4 15l4-5 4 3 5-7 3 2" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id: 'settings', label: 'Settings', icon: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2.2" fill="none"/>' }
  ];

  let itemsSvg = '';
  tabs.forEach((tab, index) => {
    const isActive = tab.id === activeTab;
    const x = 50 + index * 185;
    const color = isActive ? '#10B981' : '#64748B';
    const bgPill = isActive ? `<rect x="-42" y="10" width="84" height="34" rx="17" fill="#064E3B" fill-opacity="0.8"/>` : '';

    itemsSvg += `
      <g transform="translate(${x}, 0)">
        ${bgPill}
        <g transform="translate(-12, 15)" color="${color}">${tab.icon}</g>
        <text x="0" y="62" fill="${color}" font-family="${SANS}" font-size="13" font-weight="${isActive ? '800' : '600'}" text-anchor="middle">${tab.label}</text>
      </g>
    `;
  });

  return `
    <!-- Bottom Navigation Bar -->
    <g transform="translate(0, 1420)">
      <rect width="808" height="104" fill="#090D16" fill-opacity="0.98"/>
      <line x1="0" y1="0" x2="808" y2="0" stroke="#1E293B" stroke-width="2"/>
      <g transform="translate(80, 0)">
        ${itemsSvg}
      </g>
    </g>
  `;
}

// Android Phone Mockup Wrapper (1080x1920)
function wrapInPhoneMockup(tagline, title, subtitle, screenSvgContent, activeTab = 'alarms', accentColor = '#6366F1') {
  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#04060C"/>
      <stop offset="45%" stop-color="#0B1120"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <radialGradient id="topGlow" cx="50%" cy="8%" r="60%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.36"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="phoneBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#64748B"/>
      <stop offset="25%" stop-color="#334155"/>
      <stop offset="75%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <filter id="phoneShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="32" stdDeviation="40" flood-color="#000000" flood-opacity="0.95"/>
    </filter>
    <clipPath id="screenClip">
      <rect x="136" y="270" width="808" height="1568" rx="46"/>
    </clipPath>
  </defs>

  <!-- Background Base -->
  <rect width="1080" height="1920" fill="url(#bgGrad)"/>
  <rect width="1080" height="1920" fill="url(#topGlow)"/>

  <!-- Top Marketing Copy -->
  <g text-anchor="middle">
    <!-- Tag Pill -->
    <rect x="330" y="50" width="420" height="42" rx="21" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-opacity="0.6" stroke-width="1.8"/>
    <text x="540" y="77" fill="#E0E7FF" font-family="${SANS}" font-size="16" font-weight="800" letter-spacing="2.5">${tagline}</text>

    <!-- Main Headline -->
    <text x="540" y="142" fill="#FFFFFF" font-family="${SANS}" font-size="44" font-weight="900" letter-spacing="-0.8">${title}</text>

    <!-- Subtitle -->
    <text x="540" y="186" fill="#94A3B8" font-family="${SANS}" font-size="21" font-weight="500">${subtitle}</text>
  </g>

  <!-- Smartphone Outer Titanium Bezel & Drop Shadow -->
  <g filter="url(#phoneShadow)">
    <rect x="122" y="256" width="836" height="1596" rx="56" fill="#0F172A" stroke="url(#phoneBorderGrad)" stroke-width="7"/>
  </g>

  <!-- Inner Display (Clipped) -->
  <g clip-path="url(#screenClip)">
    <rect x="136" y="270" width="808" height="1568" fill="#070B14"/>

    <!-- Screen Status Bar -->
    <rect x="136" y="270" width="808" height="44" fill="#070B14"/>
    <text x="180" y="300" fill="#FFFFFF" font-family="${SANS}" font-size="16" font-weight="700">9:41</text>
    
    <!-- Modern Punch-Hole Camera -->
    <circle cx="540" cy="292" r="9" fill="#000000"/>
    <circle cx="540" cy="292" r="5" fill="#0F172A"/>

    <!-- Status Icons -->
    <text x="890" y="300" fill="#CBD5E1" font-family="${SANS}" font-size="14" font-weight="600" text-anchor="end">5G   100%</text>

    <!-- Screen Scroll Content -->
    <g transform="translate(136, 314)">
      ${screenSvgContent}
      ${renderBottomNav(activeTab)}
    </g>

    <!-- Android Gesture Pill / Home Bar -->
    <rect x="440" y="1815" width="200" height="5" rx="2.5" fill="#FFFFFF" opacity="0.45"/>
  </g>
</svg>
`;
}

// iOS Mockup Wrapper (1290x2796)
function wrapInIosMockup(tagline, title, subtitle, screenSvgContent, activeTab = 'alarms', accentColor = '#6366F1') {
  return `
<svg width="1290" height="2796" viewBox="0 0 1290 2796" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradIos" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#04060C"/>
      <stop offset="45%" stop-color="#0B1120"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <radialGradient id="topGlowIos" cx="50%" cy="8%" r="60%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.36"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="phoneBorderGradIos" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#64748B"/>
      <stop offset="25%" stop-color="#334155"/>
      <stop offset="75%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <filter id="phoneShadowIos" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="40" stdDeviation="50" flood-color="#000000" flood-opacity="0.95"/>
    </filter>
    <clipPath id="screenClipIos">
      <rect x="90" y="380" width="1110" height="2360" rx="64"/>
    </clipPath>
  </defs>

  <rect width="1290" height="2796" fill="url(#bgGradIos)"/>
  <rect width="1290" height="2796" fill="url(#topGlowIos)"/>

  <!-- Top Marketing Copy -->
  <g text-anchor="middle">
    <rect x="425" y="80" width="440" height="52" rx="26" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-opacity="0.6" stroke-width="2"/>
    <text x="645" y="113" fill="#E0E7FF" font-family="${SANS}" font-size="20" font-weight="800" letter-spacing="2.5">${tagline}</text>
    <text x="645" y="195" fill="#FFFFFF" font-family="${SANS}" font-size="54" font-weight="900" letter-spacing="-1">${title}</text>
    <text x="645" y="255" fill="#94A3B8" font-family="${SANS}" font-size="26" font-weight="500">${subtitle}</text>
  </g>

  <!-- iPhone Outer Titanium Bezel -->
  <g filter="url(#phoneShadowIos)">
    <rect x="74" y="364" width="1142" height="2392" rx="74" fill="#0F172A" stroke="url(#phoneBorderGradIos)" stroke-width="9"/>
  </g>

  <!-- Screen Content Clipped to iPhone Display -->
  <g clip-path="url(#screenClipIos)">
    <rect x="90" y="380" width="1110" height="2360" fill="#070B14"/>

    <!-- Screen Status Bar -->
    <text x="180" y="445" fill="#FFFFFF" font-family="${SANS}" font-size="26" font-weight="700">9:41</text>
    
    <!-- Dynamic Island -->
    <rect x="495" y="415" width="300" height="62" rx="31" fill="#000000"/>
    <circle cx="530" cy="446" r="10" fill="#1E293B"/>
    <circle cx="750" cy="446" r="8" fill="#064E3B"/>

    <text x="1100" y="445" fill="#FFFFFF" font-family="${SANS}" font-size="24" font-weight="600" text-anchor="end">100%</text>

    <!-- Scaled Screen Graphics to fill 1110px width -->
    <g transform="translate(100, 480) scale(1.36)">
      ${screenSvgContent}
      ${renderBottomNav(activeTab)}
    </g>

    <!-- Home Indicator Bar -->
    <rect x="475" y="2710" width="340" height="8" rx="4" fill="#FFFFFF" opacity="0.6"/>
  </g>
</svg>
`;
}

// -------------------------------------------------------------
// SCREEN 1: SMART INTERVAL ALARMS & DAY TIMELINE
// -------------------------------------------------------------
const screen1Content = `
  <!-- Top App Header -->
  <rect x="0" y="0" width="808" height="74" fill="#0F172A"/>
  <circle cx="50" cy="37" r="22" fill="#4F46E5"/>
  <text x="50" y="44" fill="#FFFFFF" font-family="${SANS}" font-size="16" font-weight="900" text-anchor="middle">RR</text>
  <text x="85" y="36" fill="#FFFFFF" font-family="${SANS}" font-size="21" font-weight="900">Rotation Reminder</text>
  <text x="85" y="56" fill="#10B981" font-family="${SANS}" font-size="13" font-weight="700">● Active Protocol: Standard 10-Day Block</text>

  <!-- Hero Next Alarm Card -->
  <g transform="translate(30, 96)">
    <rect width="748" height="260" rx="24" fill="#18153A" stroke="#6366F1" stroke-width="2"/>
    
    <text x="35" y="45" fill="#A5B4FC" font-family="${SANS}" font-size="13" font-weight="800" letter-spacing="1.2">NEXT SCHEDULED ROTATION</text>
    <rect x="580" y="24" width="132" height="32" rx="16" fill="#312E81"/>
    <text x="646" y="45" fill="#C7D2FE" font-family="${SANS}" font-size="12" font-weight="800" text-anchor="middle">Every 2 Hours</text>

    <!-- Live Glowing Countdown -->
    <text x="35" y="130" fill="#FFFFFF" font-family="${MONO}" font-size="64" font-weight="900">01:42:15</text>
    <text x="35" y="172" fill="#E0E7FF" font-family="${SANS}" font-size="18" font-weight="700">Next alarm rings at 2:00 PM</text>

    <!-- Action Buttons -->
    <rect x="35" y="194" width="310" height="48" rx="14" fill="#4F46E5"/>
    <text x="190" y="224" fill="#FFFFFF" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">Start 40x Pacer ▶</text>

    <rect x="365" y="194" width="180" height="48" rx="14" fill="#059669"/>
    <text x="455" y="224" fill="#FFFFFF" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">Mark Done ✓</text>

    <rect x="565" y="194" width="148" height="48" rx="14" fill="#1E293B"/>
    <text x="639" y="224" fill="#94A3B8" font-family="${SANS}" font-size="14" font-weight="700" text-anchor="middle">Snooze 5m</text>
  </g>

  <!-- Section Header -->
  <text x="35" y="392" fill="#FFFFFF" font-family="${SANS}" font-size="20" font-weight="900">Today's Schedule &amp; Timeline</text>
  <text x="770" y="392" fill="#818CF8" font-family="${SANS}" font-size="13" font-weight="700" text-anchor="end">Cutoff: 11:00 PM</text>

  <!-- Timeline Cards -->
  <!-- 1. Completed Slot 10:00 AM -->
  <g transform="translate(30, 414)">
    <rect width="748" height="92" rx="18" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="48" cy="46" r="22" fill="#064E3B"/>
    <polyline points="40,46 46,52 57,40" fill="none" stroke="#34D399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="86" y="42" fill="#FFFFFF" font-family="${SANS}" font-size="20" font-weight="900">10:00 AM</text>
    <text x="86" y="66" fill="#94A3B8" font-family="${SANS}" font-size="14">Morning Rotation • 40 Reps Completed</text>
    <rect x="625" y="30" width="90" height="32" rx="16" fill="#064E3B"/>
    <text x="670" y="51" fill="#34D399" font-family="${SANS}" font-size="13" font-weight="800" text-anchor="middle">Done ✓</text>
  </g>

  <!-- 2. Completed Slot 12:00 PM -->
  <g transform="translate(30, 522)">
    <rect width="748" height="92" rx="18" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="48" cy="46" r="22" fill="#064E3B"/>
    <polyline points="40,46 46,52 57,40" fill="none" stroke="#34D399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="86" y="42" fill="#FFFFFF" font-family="${SANS}" font-size="20" font-weight="900">12:00 PM</text>
    <text x="86" y="66" fill="#94A3B8" font-family="${SANS}" font-size="14">Midday Rotation • 40 Reps Completed</text>
    <rect x="625" y="30" width="90" height="32" rx="16" fill="#064E3B"/>
    <text x="670" y="51" fill="#34D399" font-family="${SANS}" font-size="13" font-weight="800" text-anchor="middle">Done ✓</text>
  </g>

  <!-- 3. Active Upcoming Slot 2:00 PM -->
  <g transform="translate(30, 630)">
    <rect width="748" height="98" rx="20" fill="#1C1844" stroke="#6366F1" stroke-width="2"/>
    <circle cx="48" cy="49" r="22" fill="#4F46E5"/>
    <circle cx="48" cy="49" r="11" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
    <polyline points="48,43 48,49 53,51" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
    <text x="86" y="44" fill="#FFFFFF" font-family="${SANS}" font-size="22" font-weight="900">02:00 PM</text>
    <text x="86" y="70" fill="#C7D2FE" font-family="${SANS}" font-size="14" font-weight="600">Interval Cadence • Next Ring in 1h 42m</text>
    <rect x="600" y="32" width="115" height="34" rx="17" fill="#4F46E5"/>
    <text x="657" y="54" fill="#FFFFFF" font-family="${SANS}" font-size="13" font-weight="900" text-anchor="middle">NEXT UP ⚡</text>
  </g>

  <!-- 4. Afternoon Slot 4:00 PM -->
  <g transform="translate(30, 744)">
    <rect width="748" height="92" rx="18" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="48" cy="46" r="22" fill="#1E293B"/>
    <circle cx="48" cy="46" r="10" fill="none" stroke="#64748B" stroke-width="2"/>
    <text x="86" y="42" fill="#CBD5E1" font-family="${SANS}" font-size="20" font-weight="800">04:00 PM</text>
    <text x="86" y="66" fill="#64748B" font-family="${SANS}" font-size="14">Afternoon Interval • Scheduled</text>
    <rect x="615" y="30" width="100" height="32" rx="16" fill="#1E293B"/>
    <text x="665" y="51" fill="#94A3B8" font-family="${SANS}" font-size="12" font-weight="700" text-anchor="middle">Scheduled</text>
  </g>

  <!-- 5. Special Fixed Hour Slot 7:00 PM -->
  <g transform="translate(30, 852)">
    <rect width="748" height="92" rx="18" fill="#161208" stroke="#D97706" stroke-width="1.5"/>
    <circle cx="48" cy="46" r="22" fill="#78350F"/>
    <path d="M 48,37 L 50.5,43 L 57,43.5 L 52,48 L 53.5,54.5 L 48,51 L 42.5,54.5 L 44,48 L 39,43.5 L 45.5,43 Z" fill="#FBBF24"/>
    <text x="86" y="42" fill="#FEF3C7" font-family="${SANS}" font-size="20" font-weight="900">07:00 PM</text>
    <text x="86" y="66" fill="#D97706" font-family="${SANS}" font-size="14" font-weight="700">Special Fixed Checkpoint • Evening Focus</text>
    <rect x="595" y="30" width="120" height="32" rx="16" fill="#78350F"/>
    <text x="655" y="51" fill="#FDE68A" font-family="${SANS}" font-size="12" font-weight="800" text-anchor="middle">★ Special Hour</text>
  </g>

  <!-- 6. Night Slot 9:00 PM -->
  <g transform="translate(30, 960)">
    <rect width="748" height="92" rx="18" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="48" cy="46" r="22" fill="#1E293B"/>
    <circle cx="48" cy="46" r="10" fill="none" stroke="#64748B" stroke-width="2"/>
    <text x="86" y="42" fill="#CBD5E1" font-family="${SANS}" font-size="20" font-weight="800">09:00 PM</text>
    <text x="86" y="66" fill="#64748B" font-family="${SANS}" font-size="14">Evening Interval • Scheduled</text>
    <rect x="615" y="30" width="100" height="32" rx="16" fill="#1E293B"/>
    <text x="665" y="51" fill="#94A3B8" font-family="${SANS}" font-size="12" font-weight="700" text-anchor="middle">Scheduled</text>
  </g>

  <!-- 7. Bedtime Cutoff 11:00 PM -->
  <g transform="translate(30, 1068)">
    <rect width="748" height="88" rx="18" fill="#070B14" stroke="#334155" stroke-dasharray="6,6" stroke-width="1.5"/>
    <circle cx="48" cy="44" r="22" fill="#1E293B"/>
    <path d="M 46,36 A 9,9 0 0,0 54,48 A 11,11 0 1,1 46,36 Z" fill="#94A3B8"/>
    <text x="86" y="40" fill="#94A3B8" font-family="${SANS}" font-size="18" font-weight="800">11:00 PM — Bedtime Cutoff Active</text>
    <text x="86" y="62" fill="#64748B" font-family="${SANS}" font-size="13">Rings automatically muted overnight until 8:00 AM</text>
  </g>
`;

// -------------------------------------------------------------
// SCREEN 2: 40x SEATED ROTATION PACER
// -------------------------------------------------------------
const screen2Content = `
  <!-- Top Header -->
  <rect x="0" y="0" width="808" height="74" fill="#0F172A"/>
  <text x="404" y="46" fill="#FFFFFF" font-family="${SANS}" font-size="22" font-weight="900" text-anchor="middle">Seated 40x Rotation Pacer</text>

  <!-- Keep Screen Awake Glowing Badge -->
  <g transform="translate(144, 95)">
    <rect width="520" height="42" rx="21" fill="#064E3B" stroke="#10B981" stroke-width="1.5"/>
    <circle cx="30" cy="21" r="8" fill="#10B981"/>
    <polyline points="26,21 29,24 35,18" fill="none" stroke="#064E3B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="270" y="27" fill="#D1FAE5" font-family="${SANS}" font-size="14" font-weight="800" text-anchor="middle">Screen Awake Active • Display Won't Sleep</text>
  </g>

  <!-- Giant Radial Progress Pacer Ring -->
  <g transform="translate(404, 460)">
    <circle cx="0" cy="0" r="250" fill="#064E3B" fill-opacity="0.25"/>
    <circle cx="0" cy="0" r="215" fill="#111827"/>
    
    <circle cx="0" cy="0" r="195" fill="none" stroke="#1E293B" stroke-width="26"/>
    <circle cx="0" cy="0" r="195" fill="none" stroke="#10B981" stroke-width="26" stroke-dasharray="1225" stroke-dashoffset="367" stroke-linecap="round" transform="rotate(-90)"/>

    <text x="0" y="-45" fill="#94A3B8" font-family="${SANS}" font-size="16" font-weight="800" letter-spacing="3" text-anchor="middle">ROTATIONS</text>
    <text x="0" y="48" fill="#FFFFFF" font-family="${MONO}" font-size="96" font-weight="900" text-anchor="middle">28</text>
    <text x="0" y="96" fill="#34D399" font-family="${SANS}" font-size="22" font-weight="900" text-anchor="middle">OF 40 REPS</text>
    <text x="0" y="132" fill="#94A3B8" font-family="${SANS}" font-size="15" font-weight="600" text-anchor="middle">Smooth 1.2s Paced Cadence</text>
  </g>

  <!-- Interactive Controls: Chimes & Vibration -->
  <g transform="translate(90, 770)">
    <rect width="295" height="58" rx="16" fill="#18153A" stroke="#6366F1" stroke-width="2"/>
    <text x="147" y="36" fill="#C7D2FE" font-family="${SANS}" font-size="16" font-weight="800" text-anchor="middle">🔊 Audio Chimes: ON</text>

    <rect x="330" y="0" width="295" height="58" rx="16" fill="#18153A" stroke="#6366F1" stroke-width="2"/>
    <text x="477" y="36" fill="#C7D2FE" font-family="${SANS}" font-size="16" font-weight="800" text-anchor="middle">📳 Wrist Haptics: ON</text>
  </g>

  <!-- Pacer Mode Selector Bar -->
  <g transform="translate(50, 855)">
    <rect width="708" height="60" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <rect x="6" y="6" width="345" height="48" rx="12" fill="#059669"/>
    <text x="178" y="36" fill="#FFFFFF" font-family="${SANS}" font-size="16" font-weight="900" text-anchor="middle">▶ Auto-Pacer (1.2s)</text>

    <text x="532" y="36" fill="#94A3B8" font-family="${SANS}" font-size="16" font-weight="700" text-anchor="middle">Manual Tap Mode</text>
  </g>

  <!-- Posture & Technique Card -->
  <g transform="translate(50, 940)">
    <rect width="708" height="175" rx="22" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="35" y="42" fill="#FFFFFF" font-family="${SANS}" font-size="19" font-weight="900">Posture &amp; Acupressure Instructions</text>
    <text x="35" y="78" fill="#CBD5E1" font-family="${SANS}" font-size="15">• Sit tall in an upright chair with shoulders back and relaxed.</text>
    <text x="35" y="108" fill="#CBD5E1" font-family="${SANS}" font-size="15">• Rotate acupressure ear balls smoothly with each audio click.</text>
    <text x="35" y="138" fill="#34D399" font-family="${SANS}" font-size="15" font-weight="800">✓ Auto-saves completion &amp; increments your daily streak.</text>
  </g>

  <!-- Finish & Complete Button -->
  <g transform="translate(50, 1130)">
    <rect width="708" height="74" rx="20" fill="#059669"/>
    <text x="354" y="46" fill="#FFFFFF" font-family="${SANS}" font-size="21" font-weight="900" text-anchor="middle">✓  Finish &amp; Log 40 Rotations</text>
  </g>

  <!-- Today's Pacer Streak Summary Card -->
  <g transform="translate(50, 1220)">
    <rect width="708" height="150" rx="22" fill="#0C1425" stroke="#1E293B" stroke-width="2"/>
    <text x="35" y="40" fill="#FFFFFF" font-family="${SANS}" font-size="18" font-weight="900">Today's Daily Rotation Streak</text>
    <text x="673" y="40" fill="#F59E0B" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="end">🔥 4 Day Streak</text>
    
    <!-- Progress Bar -->
    <rect x="35" y="60" width="638" height="18" rx="9" fill="#1E293B"/>
    <rect x="35" y="60" width="446" height="18" rx="9" fill="#10B981"/>
    
    <text x="35" y="106" fill="#94A3B8" font-family="${SANS}" font-size="14">Completed: <tspan fill="#34D399" font-weight="800">4 of 6 intervals</tspan> (160 total ear ball rotations today)</text>
    <text x="35" y="130" fill="#818CF8" font-family="${SANS}" font-size="13" font-weight="700">Next scheduled rotation: 02:00 PM</text>
  </g>
`;

// -------------------------------------------------------------
// SCREEN 3: WEIGHT TRACKER, BMI & MILESTONE LADDER
// -------------------------------------------------------------
const screen3Content = `
  <!-- Top Header -->
  <rect x="0" y="0" width="808" height="74" fill="#0F172A"/>
  <text x="404" y="46" fill="#FFFFFF" font-family="${SANS}" font-size="22" font-weight="900" text-anchor="middle">Weight &amp; Health Milestones</text>

  <!-- Hero Weight Card: Start -> Current -> Goal -->
  <g transform="translate(30, 96)">
    <rect width="748" height="235" rx="24" fill="#18153A" stroke="#6366F1" stroke-width="2"/>
    
    <g transform="translate(45, 26)">
      <text x="55" y="24" fill="#94A3B8" font-family="${SANS}" font-size="13" font-weight="800" text-anchor="middle">START</text>
      <text x="55" y="68" fill="#CBD5E1" font-family="${MONO}" font-size="30" font-weight="900" text-anchor="middle">212.0</text>
      <text x="55" y="92" fill="#64748B" font-family="${SANS}" font-size="14" font-weight="600" text-anchor="middle">lbs</text>
    </g>

    <text x="245" y="90" fill="#6366F1" font-family="${SANS}" font-size="28" font-weight="900" text-anchor="middle">→</text>

    <!-- Current Weight Card Highlight -->
    <g transform="translate(285, 18)">
      <rect width="180" height="114" rx="18" fill="#312E81"/>
      <text x="90" y="30" fill="#A5B4FC" font-family="${SANS}" font-size="13" font-weight="900" text-anchor="middle">CURRENT</text>
      <text x="90" y="76" fill="#FFFFFF" font-family="${MONO}" font-size="42" font-weight="900" text-anchor="middle">201.4</text>
      <text x="90" y="102" fill="#818CF8" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">lbs</text>
    </g>

    <text x="510" y="90" fill="#6366F1" font-family="${SANS}" font-size="28" font-weight="900" text-anchor="middle">→</text>

    <g transform="translate(545, 26)">
      <text x="55" y="24" fill="#94A3B8" font-family="${SANS}" font-size="13" font-weight="800" text-anchor="middle">GOAL</text>
      <text x="55" y="68" fill="#34D399" font-family="${MONO}" font-size="30" font-weight="900" text-anchor="middle">185.0</text>
      <text x="55" y="92" fill="#059669" font-family="${SANS}" font-size="14" font-weight="600" text-anchor="middle">lbs</text>
    </g>

    <!-- Stat Badges Row -->
    <g transform="translate(35, 160)">
      <rect width="215" height="46" rx="14" fill="#064E3B"/>
      <text x="107" y="29" fill="#34D399" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">▼ -10.6 lbs Lost</text>

      <rect x="235" y="0" width="220" height="46" rx="14" fill="#1E293B"/>
      <text x="345" y="29" fill="#E2E8F0" font-family="${SANS}" font-size="15" font-weight="700" text-anchor="middle">16.4 lbs to Target</text>

      <rect x="475" y="0" width="205" height="46" rx="14" fill="#064E3B"/>
      <text x="577" y="29" fill="#34D399" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">BMI: 24.2 (Normal)</text>
    </g>
  </g>

  <!-- Visual Trend Graph Card -->
  <g transform="translate(30, 355)">
    <rect width="748" height="185" rx="22" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
    <text x="35" y="38" fill="#FFFFFF" font-family="${SANS}" font-size="17" font-weight="800">30-Day Weight Trajectory</text>
    <text x="715" y="38" fill="#10B981" font-family="${SANS}" font-size="14" font-weight="800" text-anchor="end">Consistent Progress</text>

    <!-- Graph Grid Lines -->
    <line x1="35" y1="65" x2="715" y2="65" stroke="#1E293B" stroke-dasharray="4,4"/>
    <line x1="35" y1="110" x2="715" y2="110" stroke="#1E293B" stroke-dasharray="4,4"/>
    <line x1="35" y1="155" x2="715" y2="155" stroke="#1E293B" stroke-dasharray="4,4"/>

    <!-- Beautiful Smooth Curve Trajectory -->
    <path d="M 45,75 Q 180,95 320,115 T 600,140 T 705,150" fill="none" stroke="#10B981" stroke-width="4" stroke-linecap="round"/>
    <path d="M 45,75 Q 180,95 320,115 T 600,140 T 705,150 L 705,170 L 45,170 Z" fill="#10B981" fill-opacity="0.12"/>
    
    <circle cx="45" cy="75" r="5" fill="#10B981"/>
    <circle cx="705" cy="150" r="6" fill="#34D399" stroke="#FFFFFF" stroke-width="2"/>
    <text x="705" y="132" fill="#34D399" font-family="${SANS}" font-size="13" font-weight="800" text-anchor="middle">201.4</text>
  </g>

  <!-- 1-Tap Weight Logger Bar -->
  <g transform="translate(30, 560)">
    <rect width="748" height="96" rx="20" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="35" y="32" fill="#FFFFFF" font-family="${SANS}" font-size="16" font-weight="800">1-Tap Daily Weigh-In</text>

    <rect x="35" y="45" width="85" height="40" rx="10" fill="#1E293B"/>
    <text x="77" y="70" fill="#FFFFFF" font-family="${SANS}" font-size="16" font-weight="800" text-anchor="middle">-0.2</text>

    <rect x="135" y="45" width="280" height="40" rx="10" fill="#4F46E5"/>
    <text x="275" y="70" fill="#FFFFFF" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">Log 201.4 lbs Today</text>

    <rect x="430" y="45" width="85" height="40" rx="10" fill="#1E293B"/>
    <text x="472" y="70" fill="#FFFFFF" font-family="${SANS}" font-size="16" font-weight="800" text-anchor="middle">+0.2</text>

    <rect x="530" y="45" width="185" height="40" rx="10" fill="#1E293B"/>
    <text x="622" y="70" fill="#94A3B8" font-family="${SANS}" font-size="14" font-weight="700" text-anchor="middle">Custom Value...</text>
  </g>

  <!-- 7-Step Milestone Ladder -->
  <text x="35" y="692" fill="#FFFFFF" font-family="${SANS}" font-size="20" font-weight="900">7-Step Milestone Celebration Ladder</text>

  <!-- Milestone 1 -->
  <g transform="translate(30, 712)">
    <rect width="748" height="88" rx="18" fill="#064E3B" fill-opacity="0.3" stroke="#10B981" stroke-width="1.5"/>
    <circle cx="48" cy="44" r="22" fill="#10B981"/>
    <text x="48" y="52" fill="#FFFFFF" font-family="${SANS}" font-size="20" text-anchor="middle">🏆</text>
    <text x="86" y="38" fill="#FFFFFF" font-family="${SANS}" font-size="19" font-weight="900">Milestone 1: First 5 lbs Off</text>
    <text x="86" y="64" fill="#6EE7B7" font-family="${SANS}" font-size="14">Passed at 207.0 lbs • Milestone Celebrated!</text>
    <rect x="620" y="28" width="95" height="32" rx="16" fill="#064E3B"/>
    <text x="667" y="49" fill="#34D399" font-family="${SANS}" font-size="13" font-weight="900" text-anchor="middle">DONE ✓</text>
  </g>

  <!-- Milestone 2 -->
  <g transform="translate(30, 818)">
    <rect width="748" height="94" rx="20" fill="#18153A" stroke="#818CF8" stroke-width="2"/>
    <circle cx="48" cy="47" r="22" fill="#4F46E5"/>
    <text x="48" y="55" fill="#FFFFFF" font-family="${SANS}" font-size="20" text-anchor="middle">🎉</text>
    <text x="86" y="42" fill="#FFFFFF" font-family="${SANS}" font-size="19" font-weight="900">Milestone 2: Double Digits (-10 lbs)</text>
    <text x="86" y="68" fill="#C7D2FE" font-family="${SANS}" font-size="14">Unlocked at 202.0 lbs • Gold Badge Awarded!</text>
    <rect x="595" y="30" width="120" height="34" rx="17" fill="#4F46E5"/>
    <text x="655" y="52" fill="#FFFFFF" font-family="${SANS}" font-size="13" font-weight="900" text-anchor="middle">NEW BEST 🏅</text>
  </g>

  <!-- Milestone 3 -->
  <g transform="translate(30, 930)">
    <rect width="748" height="88" rx="18" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="48" cy="44" r="22" fill="#1E293B"/>
    <text x="48" y="52" fill="#94A3B8" font-family="${SANS}" font-size="20" text-anchor="middle">🎯</text>
    <text x="86" y="38" fill="#CBD5E1" font-family="${SANS}" font-size="19" font-weight="800">Milestone 3: -15 lbs Milestone</text>
    <text x="86" y="64" fill="#64748B" font-family="${SANS}" font-size="14">Target: 197.0 lbs • 4.4 lbs to next badge</text>
    <rect x="605" y="28" width="110" height="32" rx="16" fill="#1E293B"/>
    <text x="660" y="49" fill="#94A3B8" font-family="${SANS}" font-size="13" font-weight="700" text-anchor="middle">In Progress</text>
  </g>

  <!-- Milestone 4 -->
  <g transform="translate(30, 1036)">
    <rect width="748" height="88" rx="18" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="48" cy="44" r="22" fill="#1E293B"/>
    <text x="48" y="52" fill="#64748B" font-family="${SANS}" font-size="20" text-anchor="middle">🔒</text>
    <text x="86" y="38" fill="#64748B" font-family="${SANS}" font-size="19" font-weight="700">Milestone 4: -20 lbs Milestone</text>
    <text x="86" y="64" fill="#475569" font-family="${SANS}" font-size="14">Target: 192.0 lbs</text>
  </g>
`;

// -------------------------------------------------------------
// SCREEN 4: HOME SCREEN WIDGET & GOOGLE WEAR OS COMPANION
// -------------------------------------------------------------
const screen4Content = `
  <!-- Top Header -->
  <rect x="0" y="0" width="808" height="74" fill="#0F172A"/>
  <text x="404" y="46" fill="#FFFFFF" font-family="${SANS}" font-size="22" font-weight="900" text-anchor="middle">Desktop Widget &amp; Google Wear OS</text>

  <!-- Feature 1: Native Android Home Screen Widget Mockup Card -->
  <g transform="translate(30, 96)">
    <text x="0" y="0" fill="#A5B4FC" font-family="${SANS}" font-size="14" font-weight="900" letter-spacing="1">PHONE DESKTOP HOME SCREEN WIDGET</text>
    
    <g transform="translate(0, 15)">
      <rect width="748" height="250" rx="26" fill="#18153A" stroke="#6366F1" stroke-width="2.5"/>
      
      <!-- Top Row -->
      <g transform="translate(35, 30)">
        <circle cx="16" cy="16" r="16" fill="#4F46E5"/>
        <text x="16" y="22" fill="#FFFFFF" font-family="${SANS}" font-size="13" font-weight="900" text-anchor="middle">RR</text>
        <text x="44" y="17" fill="#FFFFFF" font-family="${SANS}" font-size="17" font-weight="900">Rotation Reminder</text>
        <text x="44" y="34" fill="#A5B4FC" font-family="${SANS}" font-size="13">(Standard 10-Day Block)</text>

        <rect x="540" y="2" width="130" height="30" rx="15" fill="#312E81"/>
        <text x="605" y="22" fill="#C7D2FE" font-family="${SANS}" font-size="12" font-weight="800" text-anchor="middle">Every 2 Hours</text>
      </g>

      <!-- Center Countdown -->
      <g transform="translate(35, 100)">
        <text x="0" y="0" fill="#94A3B8" font-family="${SANS}" font-size="12" font-weight="800" letter-spacing="1">NEXT ROTATION</text>
        <text x="0" y="42" fill="#FFFFFF" font-family="${SANS}" font-size="44" font-weight="900">02:00 PM</text>
        <text x="230" y="38" fill="#34D399" font-family="${SANS}" font-size="15" font-weight="800">● Scheduled</text>
      </g>

      <!-- 1-Tap Widget Pacer Launch Button -->
      <rect x="35" y="175" width="678" height="52" rx="16" fill="#059669"/>
      <text x="374" y="207" fill="#FFFFFF" font-family="${SANS}" font-size="17" font-weight="900" text-anchor="middle">Start 40x Pacer ▶</text>
    </g>
  </g>

  <!-- Feature 2: Wear OS Smartwatch Companion Tile -->
  <g transform="translate(30, 400)">
    <text x="0" y="0" fill="#34D399" font-family="${SANS}" font-size="14" font-weight="900" letter-spacing="1">GOOGLE WEAR OS COMPANION TILE &amp; APPLET</text>

    <!-- Outer Container -->
    <g transform="translate(0, 15)">
      <rect width="748" height="440" rx="26" fill="#0C1425" stroke="#1E293B" stroke-width="2"/>

      <!-- Round Watch Simulation -->
      <g transform="translate(374, 220)">
        <!-- Watch Body / Case -->
        <circle cx="0" cy="0" r="165" fill="#020617" stroke="#334155" stroke-width="12"/>
        <circle cx="0" cy="0" r="153" fill="#0B132B"/>
        
        <!-- Tile Circular Progress Ring -->
        <circle cx="0" cy="0" r="132" fill="none" stroke="#1E293B" stroke-width="14"/>
        <circle cx="0" cy="0" r="132" fill="none" stroke="#10B981" stroke-width="14" stroke-dasharray="829" stroke-dashoffset="248" stroke-linecap="round" transform="rotate(-90)"/>

        <!-- Tile Text Content -->
        <text x="0" y="-48" fill="#94A3B8" font-family="${SANS}" font-size="12" font-weight="800" letter-spacing="1" text-anchor="middle">NEXT ROTATION</text>
        <text x="0" y="0" fill="#FFFFFF" font-family="${SANS}" font-size="36" font-weight="900" text-anchor="middle">02:00 PM</text>
        <text x="0" y="28" fill="#A5B4FC" font-family="${SANS}" font-size="12" font-weight="700" text-anchor="middle">(Standard 10-Day Block)</text>

        <!-- Tap for Pacer Chip -->
        <rect x="-90" y="48" width="180" height="36" rx="18" fill="#059669"/>
        <text x="0" y="71" fill="#FFFFFF" font-family="${SANS}" font-size="14" font-weight="900" text-anchor="middle">40x Wrist Pacer ▶</text>
      </g>
    </g>
  </g>

  <!-- Feature Badges -->
  <g transform="translate(30, 900)">
    <rect width="360" height="92" rx="18" fill="#18153A" stroke="#6366F1" stroke-width="1.5"/>
    <text x="180" y="38" fill="#FFFFFF" font-family="${SANS}" font-size="17" font-weight="900" text-anchor="middle">Seamless Sync</text>
    <text x="180" y="64" fill="#A5B4FC" font-family="${SANS}" font-size="13" text-anchor="middle">Phone &amp; watch always matched</text>

    <rect x="388" y="0" width="360" height="92" rx="18" fill="#064E3B" fill-opacity="0.4" stroke="#10B981" stroke-width="1.5"/>
    <text x="568" y="38" fill="#FFFFFF" font-family="${SANS}" font-size="17" font-weight="900" text-anchor="middle">Wrist Haptics</text>
    <text x="568" y="64" fill="#6EE7B7" font-family="${SANS}" font-size="13" text-anchor="middle">Tactile pulse for each rotation</text>
  </g>

  <g transform="translate(30, 1014)">
    <rect width="748" height="68" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="1.5"/>
    <text x="374" y="41" fill="#E2E8F0" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">⚡ Zero battery drain • Instant glance access on your home screen</text>
  </g>

  <!-- How-To Guide Cards -->
  <g transform="translate(30, 1100)">
    <!-- Widget Guide -->
    <rect width="360" height="260" rx="20" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="${SANS}" font-size="17" font-weight="900">Phone Widget Setup</text>
    <text x="25" y="72" fill="#CBD5E1" font-family="${SANS}" font-size="14">1. Long-press phone home screen</text>
    <text x="25" y="104" fill="#CBD5E1" font-family="${SANS}" font-size="14">2. Tap "Widgets" &gt; Rotation Reminder</text>
    <text x="25" y="136" fill="#CBD5E1" font-family="${SANS}" font-size="14">3. Place card on your desktop</text>
    <rect x="25" y="170" width="310" height="60" rx="12" fill="#18153A"/>
    <text x="180" y="206" fill="#A5B4FC" font-family="${SANS}" font-size="13" font-weight="700" text-anchor="middle">✓ Countdown + 1-Tap Pacer</text>

    <!-- Watch Guide -->
    <g transform="translate(388, 0)">
      <rect width="360" height="260" rx="20" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
      <text x="25" y="38" fill="#FFFFFF" font-family="${SANS}" font-size="17" font-weight="900">Google Watch Tile</text>
      <text x="25" y="72" fill="#CBD5E1" font-family="${SANS}" font-size="14">1. Swipe left on your Google Watch</text>
      <text x="25" y="104" fill="#CBD5E1" font-family="${SANS}" font-size="14">2. Tap "+" to add a new watch tile</text>
      <text x="25" y="136" fill="#CBD5E1" font-family="${SANS}" font-size="14">3. Select "Rotation Reminder"</text>
      <rect x="25" y="170" width="310" height="60" rx="12" fill="#064E3B" fill-opacity="0.4"/>
      <text x="180" y="206" fill="#34D399" font-family="${SANS}" font-size="13" font-weight="800" text-anchor="middle">✓ Wrist Haptics + Sync</text>
    </g>
  </g>
`;

// -------------------------------------------------------------
// SCREEN 5: 100% OFFLINE PRIVACY & BIOMETRIC APP LOCK
// -------------------------------------------------------------
const screen5Content = `
  <!-- Top Header -->
  <rect x="0" y="0" width="808" height="74" fill="#0F172A"/>
  <text x="404" y="46" fill="#FFFFFF" font-family="${SANS}" font-size="22" font-weight="900" text-anchor="middle">Security &amp; 100% Offline Privacy</text>

  <!-- Card 1: 100% Offline Local Privacy Banner -->
  <g transform="translate(30, 96)">
    <rect width="748" height="210" rx="24" fill="#18153A" stroke="#6366F1" stroke-width="2"/>
    
    <circle cx="55" cy="50" r="28" fill="#312E81"/>
    <!-- Shield Icon -->
    <path d="M 55,34 L 69,40 C 69,54 55,64 55,64 C 55,64 41,54 41,40 Z" fill="#818CF8"/>
    <polyline points="49,50 54,54 62,44" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

    <text x="100" y="44" fill="#FFFFFF" font-family="${SANS}" font-size="21" font-weight="900">100% Offline Local Privacy</text>
    <text x="100" y="68" fill="#34D399" font-family="${SANS}" font-size="14" font-weight="800">✓ Zero Trackers • Zero Cloud Telemetry • No Accounts</text>

    <!-- 3 Core Security Pillars -->
    <g transform="translate(30, 105)">
      <rect width="210" height="75" rx="14" fill="#0C1425" stroke="#334155" stroke-width="1.5"/>
      <text x="105" y="32" fill="#FFFFFF" font-family="${SANS}" font-size="14" font-weight="900" text-anchor="middle">Device Keystore</text>
      <text x="105" y="55" fill="#94A3B8" font-family="${SANS}" font-size="12" text-anchor="middle">Encrypted locally</text>

      <rect x="235" y="0" width="220" height="75" rx="14" fill="#0C1425" stroke="#334155" stroke-width="1.5"/>
      <text x="345" y="32" fill="#FFFFFF" font-family="${SANS}" font-size="14" font-weight="900" text-anchor="middle">Zero Internet Reqd</text>
      <text x="345" y="55" fill="#94A3B8" font-family="${SANS}" font-size="12" text-anchor="middle">Works 100% offline</text>

      <rect x="480" y="0" width="210" height="75" rx="14" fill="#064E3B" fill-opacity="0.5" stroke="#10B981" stroke-width="1.5"/>
      <text x="585" y="32" fill="#34D399" font-family="${SANS}" font-size="14" font-weight="900" text-anchor="middle">Google Play Safe</text>
      <text x="585" y="55" fill="#6EE7B7" font-family="${SANS}" font-size="12" text-anchor="middle">Policy compliant</text>
    </g>
  </g>

  <!-- Card 2: Biometric & Fingerprint Lock -->
  <g transform="translate(30, 330)">
    <rect width="748" height="150" rx="22" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    
    <circle cx="55" cy="50" r="26" fill="#064E3B"/>
    <!-- Lock Icon -->
    <rect x="44" y="48" width="22" height="17" rx="4" fill="#34D399"/>
    <path d="M 48,48 V 42 C 48,37 62,37 62,42 V 48" fill="none" stroke="#34D399" stroke-width="3" stroke-linecap="round"/>

    <text x="96" y="44" fill="#FFFFFF" font-family="${SANS}" font-size="20" font-weight="900">Biometric &amp; Fingerprint App Lock</text>
    <text x="96" y="68" fill="#94A3B8" font-family="${SANS}" font-size="14">Protect health logs with Touch ID / Fingerprint / PIN</text>

    <!-- Active Toggle Switch -->
    <g transform="translate(635, 36)">
      <rect width="70" height="38" rx="19" fill="#059669"/>
      <circle cx="50" cy="19" r="14" fill="#FFFFFF"/>
    </g>

    <rect x="35" y="98" width="678" height="34" rx="10" fill="#064E3B" fill-opacity="0.3"/>
    <text x="374" y="120" fill="#6EE7B7" font-family="${SANS}" font-size="13" font-weight="800" text-anchor="middle">✓ Biometric Authentication Active • Immediate Lock on Background</text>
  </g>

  <!-- Card 3: High Priority Alarm Sound Diagnostic Channels -->
  <g transform="translate(30, 505)">
    <rect width="748" height="240" rx="22" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    
    <circle cx="55" cy="46" r="26" fill="#78350F"/>
    <!-- Speaker Icon -->
    <polygon points="46,46 53,40 53,52" fill="#FDE047"/>
    <rect x="41" y="43" width="6" height="6" rx="1" fill="#FDE047"/>
    <path d="M 58,40 A 9,9 0 0,1 58,52" fill="none" stroke="#FDE047" stroke-width="2.5" stroke-linecap="round"/>

    <text x="96" y="40" fill="#FFFFFF" font-family="${SANS}" font-size="20" font-weight="900">High-Priority Alarm Stream Channels</text>
    <text x="96" y="64" fill="#94A3B8" font-family="${SANS}" font-size="14">Configured with sound + double vibration to bypass Do Not Disturb</text>

    <!-- Ringtone Options -->
    <g transform="translate(30, 90)">
      <!-- Selected Ringtone -->
      <rect width="688" height="54" rx="14" fill="#18153A" stroke="#6366F1" stroke-width="2"/>
      <text x="25" y="33" fill="#FFFFFF" font-family="${SANS}" font-size="16" font-weight="800">Classic Single Ring (Default Alarm)</text>
      <rect x="560" y="12" width="105" height="30" rx="15" fill="#4F46E5"/>
      <text x="612" y="32" fill="#FFFFFF" font-family="${SANS}" font-size="12" font-weight="900" text-anchor="middle">ACTIVE ✓</text>

      <!-- Audition Row -->
      <g transform="translate(0, 68)">
        <rect width="688" height="54" rx="14" fill="#0C1425" stroke="#1E293B" stroke-width="1.5"/>
        <text x="25" y="33" fill="#94A3B8" font-family="${SANS}" font-size="15" font-weight="700">Crystal Chime, Marimba &amp; Woodblock</text>
        <rect x="560" y="12" width="105" height="30" rx="15" fill="#1E293B"/>
        <text x="612" y="32" fill="#818CF8" font-family="${SANS}" font-size="13" font-weight="800" text-anchor="middle">Audition ▶</text>
      </g>
    </g>
  </g>

  <!-- Card 4: Local JSON Backup & Portability -->
  <g transform="translate(30, 770)">
    <rect width="748" height="150" rx="22" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="35" y="38" fill="#FFFFFF" font-family="${SANS}" font-size="18" font-weight="900">Offline Data Portability &amp; Backup</text>
    <text x="35" y="62" fill="#94A3B8" font-family="${SANS}" font-size="14">Export or restore your full history anytime without accounts</text>

    <g transform="translate(35, 82)">
      <rect width="325" height="48" rx="14" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
      <text x="162" y="30" fill="#CBD5E1" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">Export Backup (JSON)</text>

      <rect x="350" y="0" width="325" height="48" rx="14" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
      <text x="512" y="30" fill="#CBD5E1" font-family="${SANS}" font-size="15" font-weight="800" text-anchor="middle">Import Backup (JSON)</text>
    </g>
  </g>

  <g transform="translate(30, 940)">
    <rect width="748" height="60" rx="16" fill="#18153A"/>
    <text x="374" y="36" fill="#C7D2FE" font-family="${SANS}" font-size="14" font-weight="800" text-anchor="middle">🔒 Complete Offline Data Isolation • Zero Cloud Transmission</text>
  </g>
`;

// -------------------------------------------------------------
// LIST OF 5 PRODUCTION SCREENSHOTS
// -------------------------------------------------------------
const screenshots = [
  {
    name: 'screenshot-1-alarms.png',
    tagline: 'INTERVAL REMINDERS',
    title: 'Smart Interval Alarms',
    subtitle: 'Repeating 2h interval alarms with automatic 11 PM cutoff',
    content: screen1Content,
    activeTab: 'alarms',
    accent: '#6366F1'
  },
  {
    name: 'screenshot-2-pacer.png',
    tagline: 'GUIDED CADENCE PACER',
    title: '40x Rotation Pacer',
    subtitle: 'Rhythmic circular pacing with Screen-Awake Lock &amp; chimes',
    content: screen2Content,
    activeTab: 'pacer',
    accent: '#10B981'
  },
  {
    name: 'screenshot-3-weight.png',
    tagline: 'HEALTH &amp; GOALS',
    title: 'Weight &amp; BMI Ladder',
    subtitle: '7-step milestone celebration ladder with 1-tap logging',
    content: screen3Content,
    activeTab: 'goals',
    accent: '#F59E0B'
  },
  {
    name: 'screenshot-4-widget-wear.png',
    tagline: 'WIDGET &amp; WEAR OS',
    title: 'Home Widget &amp; Watch Tile',
    subtitle: 'Glance at countdown on desktop or track on Google Watch',
    content: screen4Content,
    activeTab: 'alarms',
    accent: '#34D399'
  },
  {
    name: 'screenshot-5-privacy.png',
    tagline: 'SECURITY &amp; PRIVACY',
    title: 'Biometric Lock &amp; Privacy',
    subtitle: '100% offline device security with zero cloud telemetry',
    content: screen5Content,
    activeTab: 'settings',
    accent: '#8B5CF6'
  }
];

async function generateScreenshots() {
  console.log('Generating 5 production 1080x1920 Google Play Phone Screenshots...');

  for (let i = 0; i < screenshots.length; i++) {
    const s = screenshots[i];
    const fullSvg = wrapInPhoneMockup(s.tagline, s.title, s.subtitle, s.content, s.activeTab, s.accent);
    const svgBuffer = Buffer.from(fullSvg);

    const assetPath = path.join(assetsDir, s.name);
    const publicPath = path.join(publicDir, s.name);

    await sharp(svgBuffer)
      .resize(1080, 1920)
      .png({ quality: 100 })
      .toFile(assetPath);

    fs.copyFileSync(assetPath, publicPath);

    // Also copy to legacy screenshot-4-privacy.png name for backward compatibility
    if (s.name === 'screenshot-5-privacy.png') {
      const legacyAssetPath = path.join(assetsDir, 'screenshot-4-privacy.png');
      const legacyPublicPath = path.join(publicDir, 'screenshot-4-privacy.png');
      fs.copyFileSync(assetPath, legacyAssetPath);
      fs.copyFileSync(assetPath, legacyPublicPath);
    }

    console.log(`✓ Generated ${s.name} (1080x1920)`);
  }

  console.log('All 5 Android phone screenshots generated successfully!');

  console.log('Generating 5 Apple App Store 6.7" Super Retina XDR Screenshots (1290x2796)...');
  for (let i = 0; i < screenshots.length; i++) {
    const s = screenshots[i];
    const iosSvg = wrapInIosMockup(s.tagline, s.title, s.subtitle, s.content, s.activeTab, s.accent);
    const iosSvgBuffer = Buffer.from(iosSvg);

    const iosName = `ios-${s.name}`;
    const iosAssetPath = path.join(iosAssetsDir, iosName);
    const iosPublicPath = path.join(iosPublicDir, iosName);

    await sharp(iosSvgBuffer)
      .resize(1290, 2796)
      .png({ quality: 100 })
      .toFile(iosAssetPath);

    fs.copyFileSync(iosAssetPath, iosPublicPath);

    if (s.name === 'screenshot-5-privacy.png') {
      const legacyIosAssetPath = path.join(iosAssetsDir, 'ios-screenshot-4-privacy.png');
      const legacyIosPublicPath = path.join(iosPublicDir, 'ios-screenshot-4-privacy.png');
      fs.copyFileSync(iosAssetPath, legacyIosAssetPath);
      fs.copyFileSync(iosAssetPath, legacyIosPublicPath);
    }

    console.log(`✓ Generated ${iosName} (1290x2796)`);
  }
  console.log('All 5 iOS App Store screenshots generated successfully!');
}

generateScreenshots().catch(err => {
  console.error('Screenshot generation failed:', err);
  process.exit(1);
});
