export type VolumeLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'OFF';

const VOLUME_STORAGE_KEY = 'TYPING_MINI_VOLUME_V1';

// 打鍵の音階（半音の並び）。コンボが続くほど先へ進み、最後まで行くと頭に戻る
export const SCALES = {
  doremi: [0, 2, 4, 5, 7, 9, 11, 12],
  wafu: [0, 2, 3, 7, 8, 12, 14, 15],
  game: [0, 4, 7, 12, 7, 12, 16, 19],
};

// 打鍵音の音色（ガチャの「おと」アイテムで切り替える）。音階（SCALES）とは別物
export interface TypeVoice {
  main: OscillatorType;
  over: OscillatorType;
  overShift: number;  // 重ねる音を何半音ずらすか
  dur: number;
  mainVol?: number;
  overVol?: number;
  slide?: number;     // 周波数をこの倍率まで滑らせる
  sparkle?: boolean;  // 高いキラキラを足す
}
const DEFAULT_VOICE: TypeVoice = { main: 'triangle', over: 'square', overShift: 12, dur: 0.16 };

// BGM の曲（public/assets/sounds/bgm/。Gemini で作成。docs/assets.md）
export type MusicTrack = 'title' | 'play' | 'fever' | 'result';
const MUSIC_SRC: Record<MusicTrack, string> = {
  title: '/assets/sounds/bgm/bgm_title.mp3',
  play: '/assets/sounds/bgm/bgm_play.mp3',
  fever: '/assets/sounds/bgm/bgm_fever.mp3',
  result: '/assets/sounds/bgm/bgm_result.mp3',
};
// 曲の大きさ。4曲とも元の平均は -14dB で、0.38 で約 -22.4dB、0.55 で約 -19.2dB になる。
// FEVER はにぎやかにしたいので大きくしてある
const MUSIC_GAIN: Record<MusicTrack, number> = { title: 0.38, play: 0.38, fever: 0.55, result: 0.38 };
// 成功の音が鳴るあいだ、曲をこの倍率まで下げる。FEVER 中は曲を主役のままにするので浅くする
const DUCK_DEPTH = 0.45;
const DUCK_DEPTH_FEVER = 0.75;
const MUSIC_FADE = 0.35; // 曲を切り替えるときに重ねる秒数
// ランク発表のジングル（public/assets/sounds/jingle/。Gemini で作成。docs/assets.md）
const JINGLE_RANK_SRC = '/assets/sounds/jingle/jingle_rank.mp3';
// ジングルもメロディのある曲なので、鳴っているあいだは BGM をほとんど聞こえないところまで下げる
const DUCK_DEPTH_JINGLE = 0.12;

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
      // 効果音を大きくしても音が割れないよう、出口にリミッターをはさむ
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 4;
      limiter.ratio.value = 14;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      this.masterGain.connect(limiter);
      limiter.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.masterGain);
      
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
      
      source.connect(this.sfxOut || this.masterGain);
      source.start(0);
    }
  }

  // Public Methods
  public playSelect() {
    if (!this.ready()) return;
    this.boosted(1.4, 0, () => this.playBuffer('SELECT'));
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
    if (!this.ready()) return;
    this.boosted(2.2, 1.2, () => this.playBuffer('FANFARE'));
  }

  // --- ここから highfive_dopa の追加分（その場で合成して鳴らす） ---

  private noiseBuffer: AudioBuffer | null = null;

  // --- 音のバランス（数値は測ってから決める。LEARNINGS.md） ---
  // body の中で鳴らす音を vol 倍にする。duck 秒のあいだ、曲を下げて効果音を前に出す
  private sfxOut: AudioNode | null = null;
  private musicBus: GainNode | null = null;

  private boosted(vol: number, duck: number, body: () => void) {
    if (!this.ctx || !this.masterGain) return;
    const out = this.ctx.createGain();
    out.gain.value = vol;
    out.connect(this.masterGain);
    this.sfxOut = out;
    try {
      body();
    } finally {
      this.sfxOut = null;
    }
    if (duck > 0) this.duckMusic(duck);
  }

  private duckEnd = 0;   // いま曲を下げている区間の終わり（ctx の時刻）
  private duckLevel = 1; // その区間で曲を下げている倍率

  // 下げているさいちゅうに重ねて呼ばれたら、長いほう・深いほうを残す
  // （長いジングルの途中で短い効果音が鳴っても、曲が先に戻ってこないように）
  private duckMusic(sec: number, depth: number = this.musicNow === 'fever' ? DUCK_DEPTH_FEVER : DUCK_DEPTH) {
    if (!this.ctx || !this.musicBus) return;
    const g = this.musicBus.gain;
    const now = this.ctx.currentTime;
    const active = now < this.duckEnd;
    this.duckLevel = active ? Math.min(depth, this.duckLevel) : depth;
    this.duckEnd = active ? Math.max(this.duckEnd, now + sec) : now + sec;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.duckLevel, now + 0.03);
    g.setValueAtTime(this.duckLevel, this.duckEnd);
    g.linearRampToValueAtTime(1, this.duckEnd + 0.35);
  }

  // --- ジングル（曲のファイルを1回だけ鳴らす）---
  private jingleBuffer: AudioBuffer | null = null;
  private jingleLoading = false;
  private jingleNow: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  // 発表の前（ドラムロールのあいだ）に読んでおく
  public preloadRankJingle() {
    const ctx = this.ready();
    if (!ctx || this.jingleBuffer || this.jingleLoading) return;
    this.jingleLoading = true;
    fetch(JINGLE_RANK_SRC)
      .then(res => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
      .then(data => ctx.decodeAudioData(data))
      .then(buffer => { if (this.ctx === ctx) this.jingleBuffer = buffer; })
      .catch(() => {})
      .finally(() => { this.jingleLoading = false; });
  }

  // ランク発表のファンファーレ。まだ読めていなければ、合成のファンファーレで代える
  public playRankJingle() {
    const ctx = this.ready();
    if (!ctx) return;
    const buffer = this.jingleBuffer;
    if (!buffer) {
      this.playFanfare();
      return;
    }
    this.stopJingle();
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    // 切りだした終わりがぷつっと切れないよう、最後だけ絞る
    gain.gain.setValueAtTime(1, now + Math.max(0, buffer.duration - 0.2));
    gain.gain.linearRampToValueAtTime(0, now + buffer.duration);
    source.connect(gain);
    gain.connect(this.masterGain!);
    source.start(now);
    const playing = { source, gain };
    this.jingleNow = playing;
    source.onended = () => { if (this.jingleNow === playing) this.jingleNow = null; };
    this.duckMusic(buffer.duration, DUCK_DEPTH_JINGLE);
  }

  // 画面をはなれるときに止める（8秒あるので、次のプレイにかぶらないように）
  public stopJingle() {
    const playing = this.jingleNow;
    if (!playing || !this.ctx) return;
    this.jingleNow = null;
    const now = this.ctx.currentTime;
    playing.gain.gain.cancelScheduledValues(now);
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, now);
    playing.gain.gain.linearRampToValueAtTime(0, now + 0.15);
    playing.source.stop(now + 0.2);
    // 下げていた曲を戻す
    this.duckEnd = 0;
    if (this.musicBus) {
      const g = this.musicBus.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(1, now + 0.35);
    }
  }

  // 成功の音に足す「ドン」という低い打撃
  private punch(t: number, vol: number = 0.25) {
    this.tone(170, t, 0.18, 'sine', vol, 45);
  }
  private music = new Map<MusicTrack, { el: HTMLAudioElement; gain: GainNode }>();
  private musicWanted: MusicTrack | null = null;
  private musicNow: MusicTrack | null = null;
  private musicArmed = false;
  private musicRetry = 0;
  private musicRetries = 0;
  private bgmOn = false;

  // 鳴らせる状態なら AudioContext を返す
  private ready(): AudioContext | null {
    if (this.currentLevel === 'OFF') return null;
    this.init();
    return this.ctx && this.masterGain ? this.ctx : null;
  }

  private midi(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // 1音。slideTo を渡すと周波数を滑らせる
  private tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, dest?: AudioNode) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(dest || this.sfxOut || this.masterGain!);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, dest?: AudioNode, sweepTo?: number) {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) {
      this.noiseBuffer = this.createBuffer(1);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(freq, start);
    if (sweepTo) biquad.frequency.exponentialRampToValueAtTime(sweepTo, start + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(biquad);
    biquad.connect(gain);
    gain.connect(dest || this.sfxOut || this.masterGain!);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  // 打鍵の音階パターン（ドレミ／和風／ゲーム風）。スキル「音階パターン追加」で選べるようになる
  private scale: number[] = SCALES.doremi;

  public setScale(pattern: keyof typeof SCALES) {
    this.scale = SCALES[pattern] ?? SCALES.doremi;
  }

  private voice: TypeVoice = DEFAULT_VOICE;

  public setTypeVoice(voice?: TypeVoice) {
    this.voice = voice ?? DEFAULT_VOICE;
  }

  // ゴールデンワードが出た合図
  public playGolden() {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(1.9, 0.5, () => {
      const t = ctx.currentTime;
      [91, 96, 100, 103].forEach((n, i) => {
        this.tone(this.midi(n), t + i * 0.06, 0.35, 'sine', 0.3);
        this.tone(this.midi(n + 12), t + i * 0.06, 0.2, 'triangle', 0.15);
      });
      this.noise(t, 0.5, 0.2, 'highpass', 7000);
    });
  }

  // ボーナスタイム突入。double は FEVER と重なった「W ボーナス」
  public playBonusStart(double: boolean) {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(2.0, 0.9, () => {
      const t = ctx.currentTime;
      this.tone(400, t, 0.3, 'square', 0.25, 1600);
      this.noise(t, 0.4, 0.3, 'bandpass', 500, undefined, 8000);
      const notes = double ? [79, 84, 88, 91, 96, 100, 103, 108] : [79, 84, 88, 91, 96];
      notes.forEach((n, i) => {
        this.tone(this.midi(n), t + 0.3 + i * 0.05, 0.45, 'triangle', 0.3);
        this.tone(this.midi(n), t + 0.3 + i * 0.05, 0.2, 'square', 0.1);
      });
      this.punch(t + 0.3);
    });
  }

  public playBonusEnd() {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(1200, ctx.currentTime, 0.35, 'triangle', 0.25, 300);
  }

  // スキル「ラッキー演出」
  public playLucky() {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(1.8, 0.6, () => {
      const t = ctx.currentTime;
      [84, 91, 88, 96, 91, 100, 108].forEach((n, i) => this.tone(this.midi(n), t + i * 0.04, 0.3, 'square', 0.14));
      this.noise(t, 0.6, 0.3, 'highpass', 6000);
    });
  }

  public playLevelUp() {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(2.2, 1.2, () => {
      const t = ctx.currentTime;
      [72, 76, 79, 84, 79, 84, 88, 96].forEach((n, i) => {
        this.tone(this.midi(n), t + i * 0.09, 0.3, 'square', 0.16);
        this.tone(this.midi(n + 12), t + i * 0.09, 0.3, 'triangle', 0.22);
      });
      this.noise(t + 0.7, 0.8, 0.35, 'highpass', 5000);
      this.punch(t);
      this.punch(t + 0.72, 0.3);
    });
  }

  // スキル解放・ガチャの当たりなどの「ジャジャーン」
  public playUnlock() {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(1.7, 0.8, () => {
      const t = ctx.currentTime;
      this.tone(200, t, 0.25, 'sawtooth', 0.3, 1200);
      [72, 76, 79, 84].forEach(n => this.tone(this.midi(n), t + 0.22, 0.6, 'square', 0.14));
      this.tone(this.midi(96), t + 0.22, 0.7, 'triangle', 0.3);
      this.noise(t + 0.22, 0.6, 0.3, 'highpass', 6000);
      this.punch(t + 0.22, 0.3);
    });
  }

  // 正打鍵。コンボが続くほどドレミ…と音階が上がる（1オクターブでループ）
  public playTypeNote(combo: number) {
    const ctx = this.ready();
    if (!ctx) return;
    const scale = this.scale;
    const note = 72 + scale[(Math.max(1, combo) - 1) % scale.length];
    const t = ctx.currentTime;
    this.playBuffer('TYPE', (Math.random() * 50) - 25);
    const v = this.voice;
    const freq = this.midi(note);
    this.tone(freq, t, v.dur, v.main, v.mainVol ?? 0.55, v.slide ? freq * v.slide : undefined);
    this.tone(this.midi(note + v.overShift), t, v.dur * 0.45, v.over, v.overVol ?? 0.1);
    if (v.sparkle) this.tone(this.midi(note + 31), t + 0.05, 0.18, 'sine', 0.18);
  }

  // 単語クリア。ノーミス（PERFECT）はキラキラを足す
  public playWordClear(perfect: boolean) {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(perfect ? 2.1 : 2.0, perfect ? 0.55 : 0.25, () => {
      const t = ctx.currentTime;
      const notes = perfect ? [84, 88, 91, 96, 100, 103] : [84, 88, 91, 96];
      notes.forEach((n, i) => {
        this.tone(this.midi(n), t + i * 0.045, 0.22, 'triangle', 0.4);
        this.tone(this.midi(n), t + i * 0.045, 0.1, 'square', 0.08);
      });
      if (perfect) {
        this.noise(t, 0.5, 0.25, 'highpass', 6000);
        this.tone(this.midi(108), t + 0.28, 0.5, 'sine', 0.3);
        // もう1オクターブ上でかけ上がる「やったー」
        [96, 100, 103, 108].forEach((n, i) => this.tone(this.midi(n), t + 0.27 + i * 0.04, 0.3, 'triangle', 0.25));
        this.noise(t, 0.4, 0.2, 'bandpass', 800, undefined, 6000);
      }
      this.punch(t, perfect ? 0.3 : 0.2);
    });
  }

  // ミスの「ガシャーン」
  public playCrash() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.noise(t, 0.55, 0.9, 'highpass', 2500);
    this.noise(t, 0.25, 0.9, 'lowpass', 500);
    [523, 1337, 2113, 3301, 4409].forEach((f, i) => {
      this.tone(f, t + i * 0.012, 0.35 - i * 0.04, 'square', 0.12);
    });
    this.tone(160, t, 0.3, 'sawtooth', 0.5, 40);
  }

  // コンボ段階アップ
  public playComboUp(level: number) {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(2.0, 0.7, () => {
      const t = ctx.currentTime;
      this.tone(220, t, 0.3, 'sawtooth', 0.3, 880 * (1 + level * 0.25));
      this.noise(t, 0.35, 0.3, 'bandpass', 400, undefined, 6000);
      const root = 72 + level * 2;
      [0, 4, 7, 12].forEach(n => this.tone(this.midi(root + n), t + 0.28, 0.4, 'square', 0.14));
      this.punch(t + 0.28, 0.3);
      [12, 16, 19, 24].forEach(n => this.tone(this.midi(root + n), t + 0.28, 0.5, 'triangle', 0.16));
      this.noise(t + 0.28, 0.5, 0.25, 'highpass', 5000);
    });
  }

  // ○コンボの節目の「ジャキーン」。step が大きいほど高い
  public playMilestone(step: number) {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(2.0, 0.4, () => {
      const t = ctx.currentTime;
      const root = 76 + Math.min(step, 8) * 2;
      this.noise(t, 0.25, 0.4, 'highpass', 5000);
      this.tone(this.midi(root), t, 0.12, 'square', 0.2);
      this.tone(this.midi(root + 7), t + 0.07, 0.4, 'square', 0.18);
      this.tone(this.midi(root + 12), t + 0.07, 0.5, 'triangle', 0.3);
      this.punch(t, 0.25);
    });
  }

  public playFeverStart() {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(1.5, 1.5, () => {
      const t = ctx.currentTime;
      this.tone(300, t, 0.35, 'sawtooth', 0.35, 1800);
      this.tone(300, t + 0.35, 0.35, 'sawtooth', 0.35, 2400);
      this.noise(t, 0.7, 0.35, 'bandpass', 300, undefined, 9000);
      [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => {
        this.tone(this.midi(n), t + 0.7 + i * 0.05, 0.5, 'square', 0.16);
        this.tone(this.midi(n + 7), t + 0.7 + i * 0.05, 0.5, 'triangle', 0.2);
      });
      this.noise(t + 0.7, 0.9, 0.5, 'highpass', 5000);
      this.punch(t + 0.7, 0.4);
    });
  }

  public playFeverEnd() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(1400, t, 0.5, 'sawtooth', 0.25, 180);
    this.noise(t, 0.5, 0.2, 'bandpass', 5000, undefined, 300);
  }

  // アーケードモードの残り時間カウント
  public playTick() {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(1760, ctx.currentTime, 0.08, 'square', 0.3);
  }

  public playTimeUp() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(2200, t, 0.9, 'square', 0.3, 1900);
    this.tone(2330, t, 0.9, 'square', 0.3, 2000);
    this.noise(t, 0.9, 0.3, 'highpass', 4000);
  }

  // リザルトのドラムロール（dur 秒）
  public playDrumroll(dur: number) {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(3.0, 0, () => {
      const t = ctx.currentTime;
      for (let s = 0; s < dur; s += 0.045) {
        this.noise(t + s, 0.05, 0.25 + 0.4 * (s / dur), 'bandpass', 1800);
      }
    });
  }

  // ランクのスタンプが叩きつけられる音。big はランク S 以上
  public playRankSlam(big: boolean) {
    const ctx = this.ready();
    if (!ctx) return;
    this.boosted(1.0, 1.6, () => {
      const t = ctx.currentTime;
      this.tone(180, t, 0.6, 'sine', 1.0, 35);
      this.noise(t, 0.8, 0.8, 'lowpass', 1200);
      this.noise(t, 1.2, 0.5, 'highpass', 4000);
      const chord = big ? [60, 64, 67, 72, 76, 79, 84] : [60, 64, 67, 72];
      chord.forEach((n, i) => {
        this.tone(this.midi(n), t + 0.05 + i * 0.03, big ? 1.6 : 0.9, 'sawtooth', 0.09);
        this.tone(this.midi(n + 12), t + 0.05 + i * 0.03, big ? 1.6 : 0.9, 'triangle', 0.14);
      });
    });
  }

  public playCountBlip(step: number) {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(this.midi(84 + (step % 12)), ctx.currentTime, 0.05, 'square', 0.12);
  }

  // --- BGM（曲のファイル。docs/assets.md）---
  // タイトル・プレイ・FEVER・リザルトの4曲を、場面ごとに切り替えて流す。

  // 場面の曲を流す。null で止める。ブラウザが音を許すまでは、覚えておくだけ
  public playMusic(track: MusicTrack | null) {
    this.musicWanted = track;
    if (!this.musicArmed) {
      this.musicArmed = true;
      window.addEventListener('pointerdown', this.unlockMusic);
      window.addEventListener('keydown', this.unlockMusic);
      document.addEventListener('visibilitychange', this.onVisibility);
      // ウィンドウに戻ってきたときも、止まっていたら流しなおす
      window.addEventListener('focus', this.wakeMusic);
      window.addEventListener('pageshow', this.wakeMusic);
      // 再読み込みのあとなど、ブラウザが許してくれるなら、操作を待たずにすぐ流す。
      // 許されないときは、最初のクリックかキー入力で流れはじめる
      this.init();
    }
    this.wakeMusic();
  }

  private unlockMusic = () => {
    this.init();
    this.wakeMusic();
  };

  // 音の出口が止まっていたら起こしてから、場面の曲を流す
  private wakeMusic = () => {
    const ctx = this.ctx;
    if (!ctx || document.hidden) return;
    if (ctx.state === 'running') this.syncMusic();
    else ctx.resume().then(() => this.syncMusic()).catch(() => {});
  };

  // タブが裏に回ったら曲を止め、戻ってきたら流しなおす（開いたまま忘れたタブで鳴りつづけないように）
  private onVisibility = () => {
    window.clearTimeout(this.musicRetry);
    this.musicRetries = 0;
    for (const m of this.music.values()) m.el.pause();
    this.musicNow = null;
    this.wakeMusic();
  };

  private syncMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain || ctx.state !== 'running' || document.hidden) return;
    const want = this.musicWanted;
    const from = this.musicNow;
    if (want === from) return;
    this.musicNow = want;
    if (!want) {
      this.fadeOthers(null);
      return;
    }
    let cur = this.music.get(want);
    if (!cur) {
      const el = new Audio(MUSIC_SRC[want]);
      el.loop = true;
      el.preload = 'auto';
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(el).connect(gain);
      gain.connect(this.musicBus ?? this.masterGain);
      cur = { el, gain };
      this.music.set(want, cur);
    }
    // FEVER が終わってプレイ曲に戻るときだけ、止めたところから続ける
    if (!(want === 'play' && from === 'fever')) cur.el.currentTime = 0;
    // 新しい曲が鳴りはじめてから前の曲を消す。読みこめなかったら前の曲を流しつづける
    cur.el.play().then(() => {
      // 鳴りはじめるまでのあいだに、もう別の曲に替わっていることがある
      this.musicRetries = 0;
      if (this.musicNow === want) this.fadeMusic(want, MUSIC_GAIN[want]);
      this.fadeOthers(this.musicNow);
    }).catch(() => {
      if (this.musicNow === want) this.musicNow = from;
      // タブに戻った直後などは、ブラウザが再生をことわることがある。少し待ってやり直す
      window.clearTimeout(this.musicRetry);
      if (this.musicRetries++ < 5) this.musicRetry = window.setTimeout(this.wakeMusic, 700);
    });
  }

  // いまの曲のほかは、ぜんぶ消して止める
  private fadeOthers(keep: MusicTrack | null) {
    for (const track of this.music.keys()) {
      if (track !== keep) this.fadeMusic(track, 0);
    }
  }

  private fadeMusic(track: MusicTrack, to: number) {
    const m = this.music.get(track);
    if (!m || !this.ctx) return;
    const now = this.ctx.currentTime;
    m.gain.gain.cancelScheduledValues(now);
    m.gain.gain.setValueAtTime(m.gain.gain.value, now);
    m.gain.gain.linearRampToValueAtTime(to, now + MUSIC_FADE);
    if (to === 0) window.setTimeout(() => { if (this.musicNow !== track) m.el.pause(); }, MUSIC_FADE * 1000 + 50);
  }

  // プレイ中の BGM。FEVER（rate=2）のあいだは FEVER の曲に切り替える
  public startBgm() {
    this.bgmOn = true;
    this.playMusic('play');
  }

  public stopBgm() {
    this.bgmOn = false;
    this.playMusic(null);
  }

  public setBgmRate(rate: number) {
    if (this.bgmOn) this.playMusic(rate > 1 ? 'fever' : 'play');
  }

  // 鳴っている音をぜんぶ止めて、片づける
  public dispose() {
    window.removeEventListener('pointerdown', this.unlockMusic);
    window.removeEventListener('keydown', this.unlockMusic);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('focus', this.wakeMusic);
    window.removeEventListener('pageshow', this.wakeMusic);
    window.clearTimeout(this.musicRetry);
    for (const m of this.music.values()) m.el.pause();
    this.music.clear();
    this.jingleNow = null; // 鳴っていても、下の ctx.close() で止まる
    this.jingleBuffer = null;
    this.musicWanted = null;
    this.musicNow = null;
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    this.musicBus = null;
  }
}

// 開発中にこのファイルが差し替わると、このファイルが読みなおされて audioManager が作りなおされる。
// 前の audioManager の曲が鳴りつづけて新しい曲と重なるので、作りなおす前に止める
const holder = globalThis as { __dopaAudio?: AudioManager };
holder.__dopaAudio?.dispose();
export const audioManager = holder.__dopaAudio = new AudioManager();
