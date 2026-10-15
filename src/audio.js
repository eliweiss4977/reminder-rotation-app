// Audio Engine for Satkin Rotation & Habit Pacer
// High-fidelity 528Hz crystal bell chime and pacing tick generator

class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.fallbackAudio = null;
    this.isMuted = false;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play the authentic 528Hz crystal bell chime via Web Audio synthesis
  playSingleRing() {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) {
        this.playFallbackAudio();
        return;
      }

      const now = ctx.currentTime;
      const duration = 2.2;

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      // Fast smooth attack (8ms)
      masterGain.gain.linearRampToValueAtTime(0.9, now + 0.008);
      // Exponential decay
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      masterGain.connect(ctx.destination);

      // Fundamental 528 Hz (Solfeggio Crystal Bowl Tone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(528, now);
      gain1.gain.setValueAtTime(0.68, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc1.connect(gain1);
      gain1.connect(masterGain);

      // Harmonic 1056 Hz (1st Octave Overtone)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1056, now);
      gain2.gain.setValueAtTime(0.26, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      // 3rd Harmonic 1584 Hz (Shimmer overtone)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1584, now);
      gain3.gain.setValueAtTime(0.06, now);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.6);
      osc3.connect(gain3);
      gain3.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);

      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);
      osc3.stop(now + duration + 0.05);
    } catch (err) {
      console.warn('Web Audio synthesis failed, falling back to audio element:', err);
      this.playFallbackAudio();
    }
  }

  // Fallback to HTML5 audio element with generated single_ring.wav
  playFallbackAudio() {
    try {
      if (!this.fallbackAudio) {
        this.fallbackAudio = new Audio('/single_ring.wav');
      }
      this.fallbackAudio.currentTime = 0;
      this.fallbackAudio.play().catch(e => console.log('Audio autoplay prevented:', e));
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  }

  // Soft soothing tick for 40x rotation pacing (every 1.2s)
  playPacerTick(isMilestone = false) {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freq = isMilestone ? 880 : 587.33; // D5 warm wood tick or A5 milestone
      const duration = isMilestone ? 0.09 : 0.045;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isMilestone ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(isMilestone ? 0.35 : 0.22, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch (e) {
      // Ignore background tick audio errors
    }
  }

  // Final completion fanfare (pleasant double chime)
  playCompletionChime() {
    this.playSingleRing();
    setTimeout(() => {
      this.playSingleRing();
    }, 450);
  }

  setMuted(muted) {
    this.isMuted = muted;
  }
}

export const audio = new AudioEngine();
