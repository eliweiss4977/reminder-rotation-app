import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const SAMPLE_RATE = 44100;

function createWavHeader(numSamples) {
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

function bufferFromSamples(samples) {
  const header = createWavHeader(samples.length);
  const data = Buffer.alloc(samples.length * 2);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-32767, Math.min(32767, Math.round(samples[i] * 28000)));
    data.writeInt16LE(s, i * 2);
  }

  return Buffer.concat([header, data]);
}

// 1. Classic Single Ring (528Hz + 1056Hz singing bowl chime, 2.2s)
function generateClassic() {
  const duration = 2.2;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);
  const f1 = 528.0;
  const f2 = 1056.0;
  const f3 = 1584.0;
  const attack = 0.008;
  const tau = 0.62;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let env = t < attack ? Math.sin((Math.PI / 2) * (t / attack)) : Math.exp(-(t - attack) / tau);
    if (t > duration - 0.05) env *= Math.max(0, (duration - t) / 0.05);

    const wave = 0.68 * Math.sin(2 * Math.PI * f1 * t) +
                 0.26 * Math.sin(2 * Math.PI * f2 * t) +
                 0.06 * Math.sin(2 * Math.PI * f3 * t);
    samples[i] = wave * env;
  }
  return bufferFromSamples(samples);
}

// 2. Crystal Desk Bell (Crisp 1046Hz high bell ding, 1.5s)
function generateCrystal() {
  const duration = 1.6;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);
  const f1 = 1046.5; // C6
  const f2 = 2093.0; // C7
  const f3 = 3139.5; // G7
  const attack = 0.004;
  const tau = 0.42;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let env = t < attack ? Math.sin((Math.PI / 2) * (t / attack)) : Math.exp(-(t - attack) / tau);
    if (t > duration - 0.04) env *= Math.max(0, (duration - t) / 0.04);

    const wave = 0.62 * Math.sin(2 * Math.PI * f1 * t) +
                 0.30 * Math.sin(2 * Math.PI * f2 * t) +
                 0.08 * Math.sin(2 * Math.PI * f3 * t);
    samples[i] = wave * env;
  }
  return bufferFromSamples(samples);
}

// 3. Soft Double Chime (528Hz -> 660Hz two gentle notes, 1.8s)
function generateDouble() {
  const duration = 1.8;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  const t1 = 0.0;
  const f1 = 528.0;
  const t2 = 0.28;
  const f2 = 660.0; // E5

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;

    // Note 1
    if (t >= t1) {
      const dt = t - t1;
      let env1 = dt < 0.006 ? (dt / 0.006) : Math.exp(-dt / 0.38);
      s += 0.5 * (Math.sin(2 * Math.PI * f1 * dt) + 0.3 * Math.sin(2 * Math.PI * f1 * 2 * dt)) * env1;
    }

    // Note 2
    if (t >= t2) {
      const dt = t - t2;
      let env2 = dt < 0.006 ? (dt / 0.006) : Math.exp(-dt / 0.52);
      s += 0.58 * (Math.sin(2 * Math.PI * f2 * dt) + 0.25 * Math.sin(2 * Math.PI * f2 * 2 * dt)) * env2;
    }

    if (t > duration - 0.05) s *= Math.max(0, (duration - t) / 0.05);
    samples[i] = s;
  }
  return bufferFromSamples(samples);
}

// 4. Zen Woodblock (Percussive warm knock, 0.8s)
function generateWoodblock() {
  const duration = 0.8;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);
  const f1 = 440.0;
  const f2 = 880.0;
  const f3 = 1320.0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t / 0.07); // rapid woody decay
    const noise = (Math.random() * 2 - 1) * Math.exp(-t / 0.015) * 0.25; // transient pop
    const wave = 0.6 * Math.sin(2 * Math.PI * f1 * t) +
                 0.3 * Math.sin(2 * Math.PI * f2 * t) +
                 0.1 * Math.sin(2 * Math.PI * f3 * t);

    samples[i] = (wave + noise) * env;
  }
  return bufferFromSamples(samples);
}

// 5. Warm Marimba (Ascending arpeggio C5-E5-G5, 1.6s)
function generateMarimba() {
  const duration = 1.6;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  const notes = [
    { start: 0.00, freq: 523.25 }, // C5
    { start: 0.18, freq: 659.25 }, // E5
    { start: 0.36, freq: 783.99 }  // G5
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;

    for (const note of notes) {
      if (t >= note.start) {
        const dt = t - note.start;
        const env = dt < 0.005 ? (dt / 0.005) : Math.exp(-dt / 0.42);
        const wave = 0.7 * Math.sin(2 * Math.PI * note.freq * dt) +
                     0.3 * Math.sin(2 * Math.PI * note.freq * 2 * dt);
        s += wave * env * 0.45;
      }
    }

    if (t > duration - 0.05) s *= Math.max(0, (duration - t) / 0.05);
    samples[i] = s;
  }
  return bufferFromSamples(samples);
}

export function generateAllRingtones() {
  console.log('Synthesizing 5 distinct ringtone WAV files...');
  const ringtones = {
    'ring_classic.wav': generateClassic(),
    'ring_crystal.wav': generateCrystal(),
    'ring_double.wav': generateDouble(),
    'ring_woodblock.wav': generateWoodblock(),
    'ring_marimba.wav': generateMarimba()
  };

  const targetDirs = [
    path.join(projectRoot, 'public', 'sounds'),
    path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw'),
    path.join(projectRoot, 'ios', 'App', 'App')
  ];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Write all 5 ringtones
  for (const [filename, buffer] of Object.entries(ringtones)) {
    for (const dir of targetDirs) {
      const dest = path.join(dir, filename);
      try {
        fs.writeFileSync(dest, buffer);
        console.log(`✓ Generated ${filename} -> ${dest}`);
      } catch (err) {
        console.warn(`Could not write to ${dest}:`, err.message);
      }
    }
  }

  // Backward compatibility: also ensure single_ring.wav is populated
  const classicBuffer = ringtones['ring_classic.wav'];
  const legacyDestinations = [
    path.join(projectRoot, 'public', 'single_ring.wav'),
    path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw', 'single_ring.wav'),
    path.join(projectRoot, 'ios', 'App', 'App', 'single_ring.wav')
  ];
  for (const dest of legacyDestinations) {
    try {
      fs.writeFileSync(dest, classicBuffer);
    } catch (e) {}
  }
  console.log('All 5 ringtones generated and deployed successfully.');
}

// Execute
generateAllRingtones();
