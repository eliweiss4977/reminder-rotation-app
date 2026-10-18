export const RINGTONES = [
  { id: 'ring_classic', name: 'Classic Single Ring', desc: '528Hz + 1056Hz Crystal Chime', icon: '🔔', file: '/sounds/ring_classic.wav' },
  { id: 'ring_crystal', name: 'Crystal Desk Bell', desc: 'Crisp High 1046Hz Ding', icon: '✨', file: '/sounds/ring_crystal.wav' },
  { id: 'ring_double', name: 'Soft Double Chime', desc: 'Gentle 528Hz -> 660Hz Notes', icon: '🎵', file: '/sounds/ring_double.wav' },
  { id: 'ring_woodblock', name: 'Zen Woodblock', desc: 'Warm 400Hz Percussive Knock', icon: '🪵', file: '/sounds/ring_woodblock.wav' },
  { id: 'ring_marimba', name: 'Warm Marimba', desc: 'Ascending C5-E5-G5 Arpeggio', icon: '🎶', file: '/sounds/ring_marimba.wav' }
];

class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.fallbackAudio = null;
    this.ringtoneAudios = {};
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

  // Play a specific ringtone by ID ('ring_classic', 'ring_crystal', etc.)
  playRingtone(ringtoneId = 'ring_classic') {
    if (this.isMuted) return;

    const normalizedId = ringtoneId.startsWith('ring_') ? ringtoneId : `ring_${ringtoneId}`;

    try {
      if (!this.ringtoneAudios[normalizedId]) {
        this.ringtoneAudios[normalizedId] = new Audio(`/sounds/${normalizedId}.wav`);
      }
      const audioEl = this.ringtoneAudios[normalizedId];
      audioEl.currentTime = 0;
      audioEl.play().catch(e => {
        console.warn('Audio element play failed, falling back to Web Audio synthesis:', e);
        this.playSynthesizedTone(normalizedId);
      });
    } catch (err) {
      console.warn('playRingtone exception, falling back:', err);
      this.playSynthesizedTone(normalizedId);
    }
  }

  // Synthesized tone fallback based on ringtone type
  playSynthesizedTone(ringtoneId) {
    if (ringtoneId === 'ring_woodblock') {
      this.playWoodblockTone();
    } else if (ringtoneId === 'ring_crystal') {
      this.playCrystalDing();
    } else if (ringtoneId === 'ring_double') {
      this.playDoubleChime();
    } else if (ringtoneId === 'ring_marimba') {
      this.playMarimbaArpeggio();
    } else {
      this.playSingleRing();
    }
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
      masterGain.gain.linearRampToValueAtTime(0.9, now + 0.008);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      masterGain.connect(ctx.destination);

      // Fundamental 528 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(528, now);
      gain1.gain.setValueAtTime(0.68, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc1.connect(gain1);
      gain1.connect(masterGain);

      // Harmonic 1056 Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1056, now);
      gain2.gain.setValueAtTime(0.26, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      // 3rd Harmonic 1584 Hz
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

  playCrystalDing() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.55);
    } catch (e) {}
  }

  playDoubleChime() {
    this.playTone(528, 0.7, 0);
    setTimeout(() => this.playTone(660, 0.7, 0), 220);
  }

  playWoodblockTone() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {}
  }

  playMarimbaArpeggio() {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.6, 0.8), idx * 180);
    });
  }

  playTone(freq, vol = 0.5, dur = 0.8) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    } catch (e) {}
  }

  // Fallback to HTML5 audio element with generated single_ring.wav
  playFallbackAudio() {
    try {
      if (!this.fallbackAudio) {
        this.fallbackAudio = new Audio('/sounds/ring_classic.wav');
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
