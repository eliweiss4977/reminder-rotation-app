import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function generateWavBuffer() {
  const sampleRate = 44100;
  const duration = 2.2; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Synthesis: 528Hz crystal bell chime with 1056Hz harmonic & exponential decay
  const f1 = 528.0;   // Solfeggio 528 Hz crystal singing bowl
  const f2 = 1056.0;  // First octave overtone (1056 Hz)
  const f3 = 1584.0;  // 3rd harmonic bell chime shimmer

  const attackTime = 0.008; // 8ms fast smooth attack
  const decayTau = 0.62;    // Exponential decay time constant

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Smooth attack envelope
    let env = 1.0;
    if (t < attackTime) {
      env = Math.sin((Math.PI / 2) * (t / attackTime));
    } else {
      env = Math.exp(-(t - attackTime) / decayTau);
    }

    // End release fade out to avoid clicks
    if (t > duration - 0.05) {
      const release = (duration - t) / 0.05;
      env *= Math.max(0, Math.min(1, release));
    }

    // Combined harmonic tone
    const wave = 0.68 * Math.sin(2 * Math.PI * f1 * t) +
                 0.26 * Math.sin(2 * Math.PI * f2 * t) +
                 0.06 * Math.sin(2 * Math.PI * f3 * t);

    const sample = wave * env;
    // Scale to 16-bit signed integer (-32768 to 32767) with headroom
    const intSample = Math.max(-32767, Math.min(32767, Math.round(sample * 28000)));

    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

export function saveChimeToDestinations() {
  const wavBuffer = generateWavBuffer();

  const destinations = [
    path.join(projectRoot, 'public', 'single_ring.wav'),
    path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw', 'single_ring.wav'),
    path.join(projectRoot, 'ios', 'App', 'App', 'single_ring.wav')
  ];

  for (const dest of destinations) {
    const dir = path.dirname(dest);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dest, wavBuffer);
      console.log(`Generated chime successfully at: ${dest}`);
    } catch (err) {
      console.warn(`Could not write to ${dest} (directory may not exist yet):`, err.message);
    }
  }
}

// Run directly if executed as main script
saveChimeToDestinations();
