export type VolumeLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'OFF';

const VOLUME_STORAGE_KEY = 'TYPING_MINI_VOLUME_V1';

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentLevel: VolumeLevel = 'LOW'; // Default is Low
  private buffers: Map<string, AudioBuffer> = new Map();
  private isLoaded: boolean = false;

  constructor() {
    // Load volume preference from localStorage on instantiation
    if (typeof window !== 'undefined') {
      try {
        const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
        if (savedVolume && ['HIGH', 'MEDIUM', 'LOW', 'OFF'].includes(savedVolume)) {
          this.currentLevel = savedVolume as VolumeLevel;
        }
      } catch (e) {
        console.warn('Failed to load volume settings from localStorage', e);
      }
    }
  }

  private getGain(level: VolumeLevel): number {
    switch (level) {
      case 'HIGH': return 0.6;
      case 'MEDIUM': return 0.3;
      case 'LOW': return 0.1;
      case 'OFF': return 0;
      default: return 0.1;
    }
  }

  public setVolume(level: VolumeLevel) {
    this.currentLevel = level;
    
    // Save preference
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, level);
    } catch (e) {
      console.warn('Failed to save volume settings to localStorage', e);
    }

    // Initialize context on user interaction
    if (!this.ctx) {
      this.init();
    }
    
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.getGain(level), now + 0.1);
    }
  }

  public getVolume(): VolumeLevel {
    return this.currentLevel;
  }

  private init() {
    if (!this.ctx) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.getGain(this.currentLevel);
      this.masterGain.connect(this.ctx.destination);
      
      // Generate sounds in memory (Procedural Audio)
      this.generateAllSounds();
    }
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Procedural Sound Generation (Creates AudioBuffers in memory) ---
  private generateAllSounds() {
    if (!this.ctx || this.isLoaded) return;

    this.buffers.set('TYPE', this.generateMechanicalSwitch());
    this.buffers.set('SELECT', this.generatePopSound());
    this.buffers.set('CANCEL', this.generateCancelSound());
    this.buffers.set('MISS', this.generateMissSound());
    this.buffers.set('FANFARE', this.generateFanfareSound());

    this.isLoaded = true;
  }

  private createBuffer(duration: number): AudioBuffer {
    // Standard sample rate (usually 44100 or 48000)
    const sr = this.ctx!.sampleRate;
    return this.ctx!.createBuffer(1, sr * duration, sr);
  }

  // 1. Plastic Mechanical Switch (Click + Thock)
  private generateMechanicalSwitch(): AudioBuffer {
    const duration = 0.1; // Short
    const buffer = this.createBuffer(duration);
    const data = buffer.getChannelData(0);
    const sr = this.ctx!.sampleRate;

    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      
      // A. "Click": High frequency noise burst (Plastic impact)
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 90);
      
      // B. "Thock": Rapidly dropping low sine wave (Key bottoming out)
      const freq = 400 * Math.exp(-t * 25); 
      const sine = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 15);
      
      // Mix: More sine for "Thocky" feel, dash of noise for "Click"
      data[i] = (noise * 0.2 + sine * 0.8) * 0.8; 
    }
    return buffer;
  }

  // 2. Select Pop (Bubble sound)
  private generatePopSound(): AudioBuffer {
    const duration = 0.1;
    const buffer = this.createBuffer(duration);
    const data = buffer.getChannelData(0);
    const sr = this.ctx!.sampleRate;

    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      // Fast sine sweep down
      const freq = 800 - 600 * Math.sin(Math.PI * (t / duration)); 
      // Envelope: Fast attack, fast decay
      const envelope = Math.exp(-t * 40);
      
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
    }
    return buffer;
  }

  // 3. Cancel/Back (Swoosh/Low bloop)
  private generateCancelSound(): AudioBuffer {
    const duration = 0.15;
    const buffer = this.createBuffer(duration);
    const data = buffer.getChannelData(0);
    const sr = this.ctx!.sampleRate;

    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const freq = 300 * Math.exp(-t * 10); // Pitch down
      const envelope = Math.exp(-t * 20);
      // Square-ish wave for retro feel
      const wave = Math.sign(Math.sin(2 * Math.PI * freq * t));
      data[i] = wave * envelope * 0.3;
    }
    return buffer;
  }

  // 4. Miss (Buzzer/Thud)
  private generateMissSound(): AudioBuffer {
    const duration = 0.2;
    const buffer = this.createBuffer(duration);
    const data = buffer.getChannelData(0);
    const sr = this.ctx!.sampleRate;

    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      // Sawtooth for harshness
      const freq = 100 - t * 200; 
      const val = (sr * t * freq) % 1; // Simple saw approximation
      const envelope = Math.exp(-t * 15);
      data[i] = (val - 0.5) * envelope * 0.5;
    }
    return buffer;
  }

  // 5. Fanfare (Arpeggio Chord)
  private generateFanfareSound(): AudioBuffer {
    const duration = 1.5;
    const buffer = this.createBuffer(duration);
    const data = buffer.getChannelData(0);
    const sr = this.ctx!.sampleRate;

    // C Major Arpeggio frequencies
    const notes = [
      { f: 523.25, start: 0.0, dur: 0.4 }, // C5
      { f: 659.25, start: 0.1, dur: 0.4 }, // E5
      { f: 783.99, start: 0.2, dur: 0.4 }, // G5
      { f: 1046.50, start: 0.3, dur: 0.8 }, // C6
    ];

    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      let sample = 0;

      for (const note of notes) {
        if (t >= note.start && t < note.start + note.dur) {
          const localT = t - note.start;
          const freq = note.f;
          // Sine with a bit of triangle harmonic
          const tone = Math.sin(2 * Math.PI * freq * localT) + 0.5 * Math.sin(4 * Math.PI * freq * localT);
          // Envelope
          const envelope = Math.max(0, 1 - (localT / note.dur)); 
          sample += tone * envelope * 0.15;
        }
      }
      data[i] = sample;
    }
    return buffer;
  }

  // --- Playback ---

  private playBuffer(key: string, detune: number = 0) {
    if (this.currentLevel === 'OFF') return;
    
    // Ensure initialization
    this.init();
    
    if (!this.ctx || !this.masterGain) return;

    const buffer = this.buffers.get(key);
    if (buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      if (detune !== 0) {
        source.detune.value = detune;
      }
      
      source.connect(this.masterGain);
      source.start(0);
    }
  }

  // Public Methods
  public playSelect() {
    this.playBuffer('SELECT');
  }

  public playCancel() {
    this.playBuffer('CANCEL');
  }

  public playType() {
    // Slight pitch variation for realism
    const randomDetune = (Math.random() * 50) - 25; 
    this.playBuffer('TYPE', randomDetune);
  }

  public playMiss() {
    this.playBuffer('MISS');
  }

  public playFanfare() {
    this.playBuffer('FANFARE');
  }
}

export const audioManager = new AudioManager();