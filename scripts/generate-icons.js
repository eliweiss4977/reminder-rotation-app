// Script to generate custom App Icons (PNGs + Adaptive Vector XML) and Notification Shade Icon
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// CRC32 calculation table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBody = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcBody);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Minimal lossless RGBA PNG encoder using Node zlib
function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // standard filter
  ihdrData[12] = 0; // non-interlaced
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with 0x00 filter byte prepended
  const stride = width * 4;
  const rawScanlines = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (stride + 1)] = 0; // Filter None
    rgbaBuffer.copy(rawScanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate an icon image buffer (RGBA)
// Features: Deep indigo gradient squircle, circular rotation arrows, center emerald chime bell
function generateIconRGBA(size, isRound = false) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.46;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      // Check boundary (squircle vs round)
      let inside = false;
      if (isRound) {
        inside = distFromCenter <= radius;
      } else {
        // Squircle / rounded rect
        const qx = Math.max(0, Math.abs(dx) - (cx - cornerRadius));
        const qy = Math.max(0, Math.abs(dy) - (cy - cornerRadius));
        const distCorner = Math.sqrt(qx * qx + qy * qy);
        inside = distCorner <= cornerRadius;
      }

      if (!inside) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Base background: Deep Indigo (#312E81) to Violet (#4F46E5) diagonal gradient
      const t = (x + y) / (size * 2);
      let r = Math.round(49 + (79 - 49) * t);
      let g = Math.round(46 + (70 - 46) * t);
      let b = Math.round(129 + (229 - 129) * t);
      let a = 255;

      // Outer ring track
      const ringRadius = size * 0.28;
      const ringThickness = size * 0.055;
      const distToRing = Math.abs(distFromCenter - ringRadius);

      // Angle from -PI to PI
      const angle = Math.atan2(dy, dx); // [-PI, PI]
      const normAngle = (angle + 2 * Math.PI) % (2 * Math.PI); // [0, 2*PI]

      // Arc 1: [0.15*PI to 0.85*PI]
      // Arc 2: [1.15*PI to 1.85*PI]
      const inArc1 = normAngle >= 0.15 * Math.PI && normAngle <= 0.85 * Math.PI;
      const inArc2 = normAngle >= 1.15 * Math.PI && normAngle <= 1.85 * Math.PI;

      if (distToRing < ringThickness && (inArc1 || inArc2)) {
        // Crisp white / bright cyan rotation ring
        r = 255;
        g = 255;
        b = 255;
      }

      // Arrow heads at ends of arcs
      // Arrow 1 near 0.88*PI
      const a1x = cx + ringRadius * Math.cos(0.88 * Math.PI);
      const a1y = cy + ringRadius * Math.sin(0.88 * Math.PI);
      if (Math.hypot(x - a1x, y - a1y) < size * 0.065) {
        r = 255; g = 255; b = 255;
      }

      // Arrow 2 near 1.88*PI
      const a2x = cx + ringRadius * Math.cos(1.88 * Math.PI);
      const a2y = cy + ringRadius * Math.sin(1.88 * Math.PI);
      if (Math.hypot(x - a2x, y - a2y) < size * 0.065) {
        r = 255; g = 255; b = 255;
      }

      // Center chime bell / circle: Emerald (#10B981) with warm Gold (#F59E0B) ring
      const bellRadius = size * 0.14;
      if (distFromCenter <= bellRadius) {
        if (distFromCenter >= bellRadius * 0.75) {
          // Gold accent rim
          r = 245; g = 158; b = 11;
        } else {
          // Vibrant Emerald center bell
          r = 16; g = 185; b = 129;
        }
      }

      // Center clapper white dot
      if (distFromCenter <= size * 0.038) {
        r = 255; g = 255; b = 255;
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return buf;
}

// Generate the Android Notification Shade Vector Icon (24x24dp pure white #FFFFFF on transparent)
function generateNotificationShadeXml() {
  return `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <!-- Notification Shade Small Icon: Dual Circular Rotation Arrows + Chime Center -->
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,4V1L8,5l4,4V6c3.31,0 6,2.69 6,6 0,1.01 -0.25,1.97 -0.7,2.8l1.46,1.46C19.54,15.03 20,13.57 20,12c0,-4.42 -3.58,-8 -8,-8zM12,18c-3.31,0 -6,-2.69 -6,-6 0,-1.01 0.25,-1.97 0.7,-2.8L5.24,7.74C4.46,8.97 4,10.43 4,12c0,4.42 3.58,8 8,8v3l4,-4 -4,-4v3z"/>
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,10a2,2 0 1,0 0,4 2,2 0 1,0 0,-4z"/>
</vector>
`;
}

// Android Adaptive Icon: Foreground (108dp x 108dp)
function generateAdaptiveForegroundXml() {
  return `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- Rotation Arrows: Crisp White -->
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M54,32V23l-11,11 11,11v-9c12.15,0 22,9.85 22,22 0,3.71 -0.92,7.23 -2.57,10.27l6.81,6.81C84.31,69.45 86,61.92 86,54c0,-17.67 -14.33,-32 -32,-32zM54,76c-12.15,0 -22,-9.85 -22,-22 0,-3.71 0.92,-7.23 2.57,-10.27l-6.81,-6.81C21.69,38.55 20,46.08 20,54c0,17.67 14.33,32 32,32v9l11,-11 -11,-11v9z"/>
    <!-- Center Bell: Emerald Core with Gold Rim -->
    <path
        android:fillColor="#F59E0B"
        android:pathData="M54,40a14,14 0 1,0 0,28 14,14 0 1,0 0,-28z"/>
    <path
        android:fillColor="#10B981"
        android:pathData="M54,43a11,11 0 1,0 0,22 11,11 0 1,0 0,-22z"/>
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M54,50a4,4 0 1,0 0,8 4,4 0 1,0 0,-8z"/>
</vector>
`;
}

// Android Adaptive Icon: Background (108dp x 108dp)
function generateAdaptiveBackgroundXml() {
  return `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:startX="0"
                android:startY="0"
                android:endX="108"
                android:endY="108"
                android:type="linear">
                <item android:offset="0.0" android:color="#FF312E81" />
                <item android:offset="0.5" android:color="#FF3730A3" />
                <item android:offset="1.0" android:color="#FF4F46E5" />
            </gradient>
        </aapt:attr>
    </path>
</vector>
`;
}

// Favicon SVG
function generateFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312E81"/>
      <stop offset="50%" stop-color="#3730A3"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg)"/>
  <!-- Circular Rotation Arrows -->
  <path d="M256,128 V80 L196,140 L256,200 V152 C313.6,152 360,198.4 360,256 C360,277.6 353.4,297.6 342.2,314.2 L379.8,351.8 C401.4,324.6 414,291.8 414,256 C414,168.8 343.2,98 256,98 Z" fill="#FFFFFF"/>
  <path d="M256,384 C198.4,384 152,337.6 152,280 C152,258.4 158.6,238.4 169.8,221.8 L132.2,184.2 C110.6,211.4 98,244.2 98,280 C98,367.2 168.8,438 256,438 V486 L316,426 L256,366 Z" fill="#FFFFFF"/>
  <!-- Center Chime Bell -->
  <circle cx="256" cy="256" r="64" fill="#F59E0B"/>
  <circle cx="256" cy="256" r="50" fill="#10B981"/>
  <circle cx="256" cy="256" r="18" fill="#FFFFFF"/>
</svg>
`;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  console.log('Generating custom Rotation Reminder icons...');

  // 1. Android Notification Shade Icon (24dp pure white VectorDrawable)
  const drawableDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'drawable');
  ensureDir(drawableDir);
  const notifXmlPath = path.join(drawableDir, 'ic_stat_rotation.xml');
  fs.writeFileSync(notifXmlPath, generateNotificationShadeXml(), 'utf8');
  console.log('✓ Generated:', notifXmlPath);

  // 2. Adaptive vector backgrounds & foregrounds
  const bgXmlPath = path.join(drawableDir, 'ic_launcher_background.xml');
  fs.writeFileSync(bgXmlPath, generateAdaptiveBackgroundXml(), 'utf8');
  console.log('✓ Generated:', bgXmlPath);

  const fgXmlPath = path.join(drawableDir, 'ic_launcher_foreground.xml');
  fs.writeFileSync(fgXmlPath, generateAdaptiveForegroundXml(), 'utf8');
  console.log('✓ Generated:', fgXmlPath);

  const drawableV24Dir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'drawable-v24');
  ensureDir(drawableV24Dir);
  const fgV24XmlPath = path.join(drawableV24Dir, 'ic_launcher_foreground.xml');
  fs.writeFileSync(fgV24XmlPath, generateAdaptiveForegroundXml(), 'utf8');
  console.log('✓ Generated:', fgV24XmlPath);

  // 3. Android mipmaps
  const mipmapSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
  };

  for (const [folder, size] of Object.entries(mipmapSizes)) {
    const dir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', folder);
    ensureDir(dir);

    // Standard squircle icon
    const squircleRGBA = generateIconRGBA(size, false);
    const squirclePng = encodePNG(size, size, squircleRGBA);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), squirclePng);

    // Round icon
    const roundRGBA = generateIconRGBA(size, true);
    const roundPng = encodePNG(size, size, roundRGBA);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundPng);

    console.log(`✓ Generated ${folder} (${size}x${size})`);
  }

  // 4. Web assets in public/
  const publicDir = path.join(rootDir, 'public');
  ensureDir(publicDir);

  const p192 = encodePNG(192, 192, generateIconRGBA(192, false));
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), p192);

  const p512 = encodePNG(512, 512, generateIconRGBA(512, false));
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), p512);

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), generateFaviconSvg(), 'utf8');
  console.log('✓ Generated public/icon-192.png, public/icon-512.png, public/favicon.svg');

  console.log('All custom icons generated successfully.');
}

main();
