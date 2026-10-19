import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const assetsDir = path.join(projectRoot, 'assets', 'screenshots');
const publicDir = path.join(projectRoot, 'public', 'screenshots');

for (const dir of [assetsDir, publicDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');
}

// Common SVG background template helper
function wrapInPhoneMockup(tagline, title, subtitle, screenSvgContent, accentColor = '#6366F1') {
  const safeTag = escapeXml(tagline);
  const safeTitle = escapeXml(title);
  const safeSub = escapeXml(subtitle);
  const safeScreen = escapeXml(screenSvgContent);

  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090D16"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0B0F19"/>
    </linearGradient>
    <radialGradient id="topGlow" cx="50%" cy="15%" r="45%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="phoneBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="50%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <filter id="phoneShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
    <clipPath id="screenClip">
      <rect x="136" y="296" width="808" height="1568" rx="46"/>
    </clipPath>
  </defs>

  <!-- Background Base -->
  <rect width="1080" height="1920" fill="url(#bgGrad)"/>
  <rect width="1080" height="1920" fill="url(#topGlow)"/>

  <!-- Top Marketing Copy -->
  <g text-anchor="middle">
    <!-- Tag Pill -->
    <rect x="360" y="60" width="360" height="42" rx="21" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-opacity="0.4" stroke-width="2"/>
    <text x="540" y="87" fill="#E0E7FF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="800" letter-spacing="2">${safeTag}</text>

    <!-- Main Headline -->
    <text x="540" y="152" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="900" letter-spacing="-0.5">${safeTitle}</text>

    <!-- Subtitle -->
    <text x="540" y="196" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="500">${safeSub}</text>
  </g>

  <!-- Phone Mockup Shadow and Bezel -->
  <g filter="url(#phoneShadow)">
    <rect x="120" y="280" width="840" height="1600" rx="58" fill="#0F172A" stroke="url(#phoneBorderGrad)" stroke-width="8"/>
  </g>

  <!-- Screen Content Clipped to Phone -->
  <g clip-path="url(#screenClip)">
    <rect x="136" y="296" width="808" height="1568" fill="#020617"/>

    <!-- Screen Status Bar -->
    <text x="180" y="336" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="600">9:41</text>
    <!-- Punch Hole Camera Island -->
    <rect x="460" y="312" width="160" height="26" rx="13" fill="#000000"/>
    <circle cx="480" cy="325" r="5" fill="#1E293B"/>
    <!-- Icons (5G, WiFi, Battery) -->
    <text x="880" y="336" fill="#FFFFFF" font-family="sans-serif" font-size="16" font-weight="600" text-anchor="end">100%</text>

    <!-- Render Inner Screen Graphics -->
    <g transform="translate(136, 350)">
      ${safeScreen}
    </g>
  </g>
</svg>
`;
}

// SCREEN 1: SMART INTERVAL ALARMS & TIMELINE
const screen1Content = `
  <!-- Top App Header -->
  <rect x="0" y="0" width="808" height="70" fill="#0F172A"/>
  <circle cx="50" cy="35" r="20" fill="#4F46E5"/>
  <text x="50" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="middle">RR</text>
  <text x="85" y="36" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="800">Rotation Reminder</text>
  <text x="85" y="54" fill="#10B981" font-family="sans-serif" font-size="12" font-weight="600">&#9679; Active Protocol: Standard 10-Day Block</text>

  <!-- Next Alarm Hero Card -->
  <g transform="translate(30, 95)">
    <rect width="748" height="250" rx="24" fill="#1E1B4B" stroke="#6366F1" stroke-width="2"/>
    <text x="35" y="45" fill="#A5B4FC" font-family="sans-serif" font-size="14" font-weight="800" letter-spacing="1">NEXT SCHEDULED ROTATION</text>
    <rect x="580" y="24" width="130" height="30" rx="15" fill="#312E81"/>
    <text x="645" y="44" fill="#C7D2FE" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle">Every 2 Hours</text>

    <!-- Giant Countdown -->
    <text x="35" y="125" fill="#FFFFFF" font-family="sans-serif" font-size="64" font-weight="900">01:42:15</text>
    <text x="35" y="165" fill="#E0E7FF" font-family="sans-serif" font-size="18" font-weight="600">Next Alarm rings at 2:00 PM</text>

    <!-- Interactive Action Buttons -->
    <rect x="35" y="185" width="320" height="46" rx="14" fill="#4F46E5"/>
    <text x="195" y="214" fill="#FFFFFF" font-family="sans-serif" font-size="15" font-weight="800" text-anchor="middle">Count Now (40x Pacer)</text>

    <rect x="380" y="185" width="160" height="46" rx="14" fill="#059669"/>
    <text x="460" y="214" fill="#FFFFFF" font-family="sans-serif" font-size="15" font-weight="800" text-anchor="middle">Mark Done</text>

    <rect x="560" y="185" width="150" height="46" rx="14" fill="#334155"/>
    <text x="635" y="214" fill="#94A3B8" font-family="sans-serif" font-size="15" font-weight="700" text-anchor="middle">Snooze 2m</text>
  </g>

  <!-- Section Title -->
  <text x="40" y="390" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="800">Today's Schedule &amp; Timeline</text>
  <text x="740" y="390" fill="#818CF8" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="end">Cutoff: 11:00 PM</text>

  <!-- Alarm Cards Timeline -->
  <!-- Card 1: Completed 10:00 AM -->
  <g transform="translate(30, 415)">
    <rect width="748" height="90" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="45" cy="45" r="22" fill="#065F46"/>
    <text x="45" y="52" fill="#34D399" font-family="sans-serif" font-size="18" text-anchor="middle">&#10003;</text>
    <text x="85" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="800">10:00 AM</text>
    <text x="85" y="64" fill="#94A3B8" font-family="sans-serif" font-size="14">Morning Rotation &#8226; 40 Reps</text>
    <rect x="620" y="30" width="95" height="30" rx="15" fill="#065F46"/>
    <text x="667" y="50" fill="#34D399" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle">Done</text>
  </g>

  <!-- Card 2: Completed 12:00 PM -->
  <g transform="translate(30, 520)">
    <rect width="748" height="90" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="45" cy="45" r="22" fill="#065F46"/>
    <text x="45" y="52" fill="#34D399" font-family="sans-serif" font-size="18" text-anchor="middle">&#10003;</text>
    <text x="85" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="800">12:00 PM</text>
    <text x="85" y="64" fill="#94A3B8" font-family="sans-serif" font-size="14">Midday Rotation &#8226; 40 Reps</text>
    <rect x="620" y="30" width="95" height="30" rx="15" fill="#065F46"/>
    <text x="667" y="50" fill="#34D399" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle">Done</text>
  </g>

  <!-- Card 3: Upcoming Active 2:00 PM -->
  <g transform="translate(30, 625)">
    <rect width="748" height="95" rx="18" fill="#1E1B4B" stroke="#6366F1" stroke-width="2"/>
    <circle cx="45" cy="47" r="22" fill="#4F46E5"/>
    <text x="45" y="54" fill="#FFFFFF" font-family="sans-serif" font-size="18" text-anchor="middle">&#9200;</text>
    <text x="85" y="44" fill="#FFFFFF" font-family="sans-serif" font-size="22" font-weight="900">02:00 PM</text>
    <text x="85" y="68" fill="#A5B4FC" font-family="sans-serif" font-size="14" font-weight="600">Interval Cadence &#8226; Every 2h</text>
    <rect x="590" y="32" width="125" height="32" rx="16" fill="#4F46E5"/>
    <text x="652" y="53" fill="#FFFFFF" font-family="sans-serif" font-size="13" font-weight="800" text-anchor="middle">NEXT UP</text>
  </g>

  <!-- Card 4: Upcoming 4:00 PM -->
  <g transform="translate(30, 735)">
    <rect width="748" height="90" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="45" cy="45" r="22" fill="#1E293B"/>
    <text x="45" y="52" fill="#94A3B8" font-family="sans-serif" font-size="18" text-anchor="middle">&#9201;</text>
    <text x="85" y="42" fill="#CBD5E1" font-family="sans-serif" font-size="20" font-weight="700">04:00 PM</text>
    <text x="85" y="64" fill="#64748B" font-family="sans-serif" font-size="14">Afternoon Interval</text>
    <rect x="610" y="30" width="105" height="30" rx="15" fill="#1E293B"/>
    <text x="662" y="50" fill="#94A3B8" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle">Scheduled</text>
  </g>

  <!-- Card 5: Special Hour 7:00 PM -->
  <g transform="translate(30, 840)">
    <rect width="748" height="90" rx="18" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5" stroke-opacity="0.4"/>
    <circle cx="45" cy="45" r="22" fill="#78350F"/>
    <text x="45" y="52" fill="#FBBF24" font-family="sans-serif" font-size="18" text-anchor="middle">&#9733;</text>
    <text x="85" y="42" fill="#FDE68A" font-family="sans-serif" font-size="20" font-weight="800">07:00 PM</text>
    <text x="85" y="64" fill="#B45309" font-family="sans-serif" font-size="14">Special Fixed Hour &#8226; Evening Check</text>
    <rect x="600" y="30" width="115" height="30" rx="15" fill="#78350F"/>
    <text x="657" y="50" fill="#FDE68A" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle">Special Hour</text>
  </g>

  <!-- Card 6: Bedtime Cutoff 11:00 PM -->
  <g transform="translate(30, 945)">
    <rect width="748" height="80" rx="18" fill="#0F172A" stroke="#334155" stroke-dasharray="6,6"/>
    <text x="45" y="47" fill="#64748B" font-family="sans-serif" font-size="22" text-anchor="middle">&#9790;</text>
    <text x="85" y="38" fill="#94A3B8" font-family="sans-serif" font-size="18" font-weight="700">11:00 PM &#8212; Bedtime Cutoff</text>
    <text x="85" y="58" fill="#64748B" font-family="sans-serif" font-size="13">Alarms automatically muted until morning</text>
  </g>
`;

// SCREEN 2: SEATED 40x ROTATION PACER
const screen2Content = `
  <!-- Header -->
  <rect x="0" y="0" width="808" height="70" fill="#0F172A"/>
  <text x="404" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="22" font-weight="900" text-anchor="middle">Seated 40x Rotation Pacer</text>

  <!-- Screen Awake Pill -->
  <g transform="translate(180, 85)">
    <rect width="448" height="36" rx="18" fill="#065F46" stroke="#10B981" stroke-width="1.5"/>
    <text x="224" y="23" fill="#D1FAE5" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="middle">Keep Screen Awake Active &#8226; Display Won't Dim</text>
  </g>

  <!-- Big Central Radial Pacer -->
  <g transform="translate(404, 400)">
    <!-- Outer Glow -->
    <circle cx="0" cy="0" r="230" fill="#312E81" fill-opacity="0.3"/>
    <!-- Background Track -->
    <circle cx="0" cy="0" r="190" fill="none" stroke="#1E293B" stroke-width="26"/>
    <!-- Progress Arc: 28 of 40 (70% circle ~ 252 deg) -->
    <circle cx="0" cy="0" r="190" fill="none" stroke="#10B981" stroke-width="28" stroke-dasharray="1194" stroke-dashoffset="358" stroke-linecap="round" transform="rotate(-90)"/>

    <!-- Center Content -->
    <text x="0" y="-30" fill="#94A3B8" font-family="sans-serif" font-size="16" font-weight="800" letter-spacing="3" text-anchor="middle">REPETITIONS</text>
    <text x="0" y="45" fill="#FFFFFF" font-family="sans-serif" font-size="82" font-weight="900" text-anchor="middle">28</text>
    <text x="0" y="85" fill="#6EE7B7" font-family="sans-serif" font-size="20" font-weight="800" text-anchor="middle">OF 40 REPS</text>
    <text x="0" y="115" fill="#94A3B8" font-family="sans-serif" font-size="14" text-anchor="middle">Smooth 1.2s Paced Cadence</text>
  </g>

  <!-- Audio & Haptics Indicator Row -->
  <g transform="translate(140, 680)">
    <rect width="250" height="50" rx="16" fill="#1E1B4B" stroke="#6366F1" stroke-width="1.5"/>
    <text x="125" y="31" fill="#C7D2FE" font-family="sans-serif" font-size="15" font-weight="700" text-anchor="middle">Pacer Chimes ON</text>

    <rect x="280" y="0" width="250" height="50" rx="16" fill="#1E1B4B" stroke="#6366F1" stroke-width="1.5"/>
    <text x="405" y="31" fill="#C7D2FE" font-family="sans-serif" font-size="15" font-weight="700" text-anchor="middle">Tactile Vibration ON</text>
  </g>

  <!-- Protocol Guidance Card -->
  <g transform="translate(40, 760)">
    <rect width="728" height="150" rx="20" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="35" y="40" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800">Posture &amp; Rotation Instructions</text>
    <text x="35" y="70" fill="#94A3B8" font-family="sans-serif" font-size="15">&#8226; Sit tall in an upright seated position with feet flat.</text>
    <text x="35" y="96" fill="#94A3B8" font-family="sans-serif" font-size="15">&#8226; Rotate torso steadily following each chime click.</text>
    <text x="35" y="122" fill="#34D399" font-family="sans-serif" font-size="15" font-weight="700">&#10003; Auto-saves completion &amp; logs to your daily streaks.</text>
  </g>

  <!-- Big Finish Button -->
  <g transform="translate(40, 940)">
    <rect width="728" height="70" rx="20" fill="#059669"/>
    <text x="364" y="44" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="900" text-anchor="middle">&#10003; Finish &amp; Log 40 Rotations</text>
  </g>
`;

// SCREEN 3: WEIGHT TRACKER & BMI LADDER
const screen3Content = `
  <!-- Header -->
  <rect x="0" y="0" width="808" height="70" fill="#0F172A"/>
  <text x="404" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="22" font-weight="900" text-anchor="middle">Body Profile &amp; Weight Goals</text>

  <!-- Hero Card: Start -> Current -> Goal -->
  <g transform="translate(30, 95)">
    <rect width="748" height="230" rx="24" fill="#1E1B4B" stroke="#6366F1" stroke-width="2"/>
    
    <!-- 3 Columns -->
    <g transform="translate(40, 30)">
      <text x="60" y="25" fill="#94A3B8" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle">START</text>
      <text x="60" y="65" fill="#CBD5E1" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="middle">212.0</text>
      <text x="60" y="90" fill="#64748B" font-family="sans-serif" font-size="13" text-anchor="middle">lbs</text>
    </g>

    <text x="240" y="90" fill="#6366F1" font-family="sans-serif" font-size="24" text-anchor="middle">&#8594;</text>

    <g transform="translate(280, 20)">
      <rect width="180" height="110" rx="16" fill="#312E81"/>
      <text x="90" y="30" fill="#A5B4FC" font-family="sans-serif" font-size="14" font-weight="800" text-anchor="middle">CURRENT</text>
      <text x="90" y="75" fill="#FFFFFF" font-family="sans-serif" font-size="38" font-weight="900" text-anchor="middle">201.4</text>
      <text x="90" y="100" fill="#818CF8" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle">lbs</text>
    </g>

    <text x="500" y="90" fill="#6366F1" font-family="sans-serif" font-size="24" text-anchor="middle">&#8594;</text>

    <g transform="translate(540, 30)">
      <text x="60" y="25" fill="#94A3B8" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle">GOAL</text>
      <text x="60" y="65" fill="#34D399" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="middle">185.0</text>
      <text x="60" y="90" fill="#059669" font-family="sans-serif" font-size="13" text-anchor="middle">lbs</text>
    </g>

    <!-- Bottom Stat Badges -->
    <g transform="translate(40, 160)">
      <rect width="210" height="42" rx="12" fill="#065F46"/>
      <text x="105" y="27" fill="#6EE7B7" font-family="sans-serif" font-size="15" font-weight="800" text-anchor="middle">-10.6 lbs Lost</text>

      <rect x="230" y="0" width="200" height="42" rx="12" fill="#1E293B"/>
      <text x="330" y="27" fill="#CBD5E1" font-family="sans-serif" font-size="15" font-weight="700" text-anchor="middle">16.4 lbs to Goal</text>

      <rect x="450" y="0" width="210" height="42" rx="12" fill="#065F46"/>
      <text x="555" y="27" fill="#6EE7B7" font-family="sans-serif" font-size="15" font-weight="800" text-anchor="middle">BMI: 24.2 (Normal)</text>
    </g>
  </g>

  <!-- 1-Tap Weight Logger -->
  <g transform="translate(30, 350)">
    <rect width="748" height="110" rx="20" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="30" y="38" fill="#FFFFFF" font-family="sans-serif" font-size="16" font-weight="800">Quick Daily Weigh-In Stepper</text>

    <!-- Stepper Buttons -->
    <rect x="30" y="55" width="80" height="42" rx="12" fill="#1E293B"/>
    <text x="70" y="82" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800" text-anchor="middle">-0.2</text>

    <rect x="125" y="55" width="280" height="42" rx="12" fill="#4F46E5"/>
    <text x="265" y="82" fill="#FFFFFF" font-family="sans-serif" font-size="16" font-weight="800" text-anchor="middle">Log 201.4 lbs Today</text>

    <rect x="420" y="55" width="80" height="42" rx="12" fill="#1E293B"/>
    <text x="460" y="82" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800" text-anchor="middle">+0.2</text>

    <rect x="515" y="55" width="200" height="42" rx="12" fill="#1E293B"/>
    <text x="615" y="82" fill="#94A3B8" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle">Direct Number...</text>
  </g>

  <!-- Milestone Ladder -->
  <text x="40" y="495" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="800">7-Step Milestone Ladder</text>

  <!-- Milestone 1: Reached -->
  <g transform="translate(30, 520)">
    <rect width="748" height="80" rx="16" fill="#065F46" fill-opacity="0.4" stroke="#10B981" stroke-width="1.5"/>
    <circle cx="45" cy="40" r="20" fill="#10B981"/>
    <text x="45" y="47" fill="#FFFFFF" font-family="sans-serif" font-size="16" text-anchor="middle">&#127942;</text>
    <text x="85" y="36" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800">Milestone 1: First 5 lbs Off</text>
    <text x="85" y="58" fill="#6EE7B7" font-family="sans-serif" font-size="13">Completed at 207.0 lbs &#8226; Unlocked</text>
    <text x="700" y="46" fill="#10B981" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="end">DONE &#10003;</text>
  </g>

  <!-- Milestone 2: Just Reached! -->
  <g transform="translate(30, 615)">
    <rect width="748" height="85" rx="16" fill="#1E1B4B" stroke="#818CF8" stroke-width="2"/>
    <circle cx="45" cy="42" r="22" fill="#4F46E5"/>
    <text x="45" y="50" fill="#FFFFFF" font-family="sans-serif" font-size="18" text-anchor="middle">&#127881;</text>
    <text x="85" y="38" fill="#FFFFFF" font-family="sans-serif" font-size="19" font-weight="900">Milestone 2: Double Digits (-10 lbs)</text>
    <text x="85" y="62" fill="#A5B4FC" font-family="sans-serif" font-size="13">Celebrated at 202.0 lbs &#8226; Badge Awarded!</text>
    <rect x="610" y="27" width="105" height="30" rx="15" fill="#4F46E5"/>
    <text x="662" y="47" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="800" text-anchor="middle">NEW BEST</text>
  </g>

  <!-- Milestone 3: Next Target -->
  <g transform="translate(30, 715)">
    <rect width="748" height="80" rx="16" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>
    <circle cx="45" cy="40" r="20" fill="#1E293B"/>
    <text x="45" y="47" fill="#94A3B8" font-family="sans-serif" font-size="16" text-anchor="middle">&#127919;</text>
    <text x="85" y="36" fill="#CBD5E1" font-family="sans-serif" font-size="18" font-weight="700">Milestone 3: -15 lbs Milestone</text>
    <text x="85" y="58" fill="#64748B" font-family="sans-serif" font-size="13">Target: 197.0 lbs &#8226; 4.4 lbs to unlock</text>
    <text x="700" y="46" fill="#94A3B8" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="end">In Progress</text>
  </g>

  <!-- Milestone 4: Locked -->
  <g transform="translate(30, 810)">
    <rect width="748" height="80" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="45" cy="40" r="20" fill="#1E293B"/>
    <text x="45" y="47" fill="#64748B" font-family="sans-serif" font-size="16" text-anchor="middle">&#128274;</text>
    <text x="85" y="36" fill="#64748B" font-family="sans-serif" font-size="18" font-weight="700">Milestone 4: -20 lbs Milestone</text>
    <text x="85" y="58" fill="#475569" font-family="sans-serif" font-size="13">Target: 192.0 lbs</text>
  </g>
`;

// SCREEN 4: PRIVACY & LOCAL SECURITY
const screen4Content = `
  <!-- Header -->
  <rect x="0" y="0" width="808" height="70" fill="#0F172A"/>
  <text x="404" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="22" font-weight="900" text-anchor="middle">100% Offline Local Privacy</text>

  <!-- Hero Shield -->
  <g transform="translate(404, 160)">
    <circle cx="0" cy="0" r="60" fill="#312E81" fill-opacity="0.5"/>
    <circle cx="0" cy="0" r="45" fill="#4F46E5"/>
    <text x="0" y="16" fill="#FFFFFF" font-family="sans-serif" font-size="44" text-anchor="middle">&#128737;</text>
  </g>
  <text x="404" y="260" fill="#FFFFFF" font-family="sans-serif" font-size="24" font-weight="900" text-anchor="middle">Zero Telemetry &#8226; Zero Cloud Storage</text>
  <text x="404" y="290" fill="#94A3B8" font-family="sans-serif" font-size="15" text-anchor="middle">Your weight, alarms, and routines stay 100% on your device.</text>

  <!-- Feature Cards -->
  <g transform="translate(30, 330)">
    <rect width="748" height="95" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="40" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="26">&#128274;</text>
    <text x="85" y="40" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800">No Account or Cloud Login Required</text>
    <text x="85" y="65" fill="#94A3B8" font-family="sans-serif" font-size="14">No email, passwords, subscriptions, or tracking servers.</text>
  </g>

  <g transform="translate(30, 445)">
    <rect width="748" height="95" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="40" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="26">&#128683;</text>
    <text x="85" y="40" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800">Zero Analytics or Ad Trackers</text>
    <text x="85" y="65" fill="#94A3B8" font-family="sans-serif" font-size="14">No Google Firebase analytics, Facebook SDKs, or third-party ads.</text>
  </g>

  <g transform="translate(30, 560)">
    <rect width="748" height="95" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="40" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="26">&#128273;</text>
    <text x="85" y="40" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800">Biometric &amp; PIN App Lock</text>
    <text x="85" y="65" fill="#94A3B8" font-family="sans-serif" font-size="14">Secure your personal health milestones with fingerprint or PIN.</text>
  </g>

  <g transform="translate(30, 675)">
    <rect width="748" height="95" rx="18" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="40" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="26">&#128190;</text>
    <text x="85" y="40" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800">Offline JSON Export &amp; 1-Tap Wipe</text>
    <text x="85" y="65" fill="#94A3B8" font-family="sans-serif" font-size="14">Backup your full data locally or permanently wipe it anytime.</text>
  </g>

  <!-- Support Card -->
  <g transform="translate(30, 790)">
    <rect width="748" height="110" rx="18" fill="#1E1B4B" stroke="#6366F1" stroke-width="1.5"/>
    <text x="40" y="45" fill="#FFFFFF" font-family="sans-serif" font-size="26">&#128236;</text>
    <text x="85" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="800">Direct Developer Support</text>
    <text x="85" y="66" fill="#A5B4FC" font-family="sans-serif" font-size="14">Open source codebase &amp; direct support contact:</text>
    <text x="85" y="90" fill="#818CF8" font-family="sans-serif" font-size="14" font-weight="800">rotationreminder@gmail.com</text>
  </g>
`;

const screenshots = [
  {
    name: 'screenshot-1-alarms.png',
    tagline: 'INTERVAL REMINDERS',
    title: 'Smart Interval Alarms',
    subtitle: 'Every 2h cadence, custom fixed hours &amp; 11 PM cutoff',
    content: screen1Content,
    accent: '#6366F1'
  },
  {
    name: 'screenshot-2-pacer.png',
    tagline: 'SEATED ROUTINE',
    title: '40x Rotation Pacer',
    subtitle: 'Rhythmic circular pacing with screen-awake lock',
    content: screen2Content,
    accent: '#10B981'
  },
  {
    name: 'screenshot-3-weight.png',
    tagline: 'HEALTH MILESTONES',
    title: 'Weight &amp; BMI Ladder',
    subtitle: '7-step milestone ladder, BMI classification &amp; 1-tap logs',
    content: screen3Content,
    accent: '#F59E0B'
  },
  {
    name: 'screenshot-4-privacy.png',
    tagline: 'PRIVACY FIRST',
    title: '100% Offline Privacy',
    subtitle: 'Encrypted local storage with zero cloud tracking',
    content: screen4Content,
    accent: '#8B5CF6'
  }
];

async function generateScreenshots() {
  console.log('Generating 4 production 1080x1920 Google Play Phone Screenshots...');

  for (let i = 0; i < screenshots.length; i++) {
    const s = screenshots[i];
    const fullSvg = wrapInPhoneMockup(s.tagline, s.title, s.subtitle, s.content, s.accent);
    const svgBuffer = Buffer.from(fullSvg);

    const assetPath = path.join(assetsDir, s.name);
    const publicPath = path.join(publicDir, s.name);

    await sharp(svgBuffer)
      .resize(1080, 1920)
      .png({ quality: 100 })
      .toFile(assetPath);

    fs.copyFileSync(assetPath, publicPath);
    console.log(`✓ Generated ${s.name} (1080x1920)`);
  }

  console.log('All 4 phone screenshots generated successfully!');
}

generateScreenshots().catch(err => {
  console.error('Screenshot generation failed:', err);
  process.exit(1);
});
