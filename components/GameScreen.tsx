import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { GameStats, WordDefinition, Difficulty, Mode } from '../types';
import { TOTAL_QUESTIONS } from '../constants';
import { Flame, Loader2, LogOut } from 'lucide-react';
import { KeyboardHint } from './KeyboardHint';
import { parseKanaToMora, Mora } from '../utils/romajiUtils';
import { audioManager } from '../utils/audioManager';
import { FontType } from '../utils/settingsManager';
import { EffectLevel, TextSize } from '../utils/saveData';
import { ARCADE_SECONDS, AWAKEN_COMBO, COMBO_CUTIN_EVERY, FEVER_MAX, GAUGE_PER_KEY, GAUGE_PER_WORD, HINT_IDLE_MS, HINT_MISS_COUNT, LUCKY_RATE, getComboTier, keyScore, wordScore } from '../utils/gameRules';
import { DEFAULT_MODS, GameMods } from '../utils/skills';
import EffectCanvas, { EffectHandle, RAINBOW } from './EffectCanvas';
import DopaBackground from './DopaBackground';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

// タイマー表示専用コンポーネント。親のリ描画を抑える。
// limitMs を渡すと残り時間のカウントダウンになる（アーケードモード）。
const GameTimer = memo(({ startTime, limitMs }: { startTime: number; limitMs?: number }) => {
  const [display, setDisplay] = useState(limitMs ? (limitMs / 1000).toFixed(1) : "0.00");
  const [hurry, setHurry] = useState(false);
  const requestRef = useRef<number>(0);

  const update = useCallback(() => {
    if (startTime !== 0) {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      if (limitMs) {
        const remain = Math.max(0, limitMs / 1000 - elapsed);
        setDisplay(remain.toFixed(1));
        setHurry(remain <= 10);
      } else {
        setDisplay(elapsed.toFixed(2));
      }
    }
    requestRef.current = requestAnimationFrame(update);
  }, [startTime, limitMs]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  return (
    <div className={`hx-num text-3xl md:text-5xl leading-none tracking-tighter ${hurry ? 'text-neon-red dopa-blink' : 'text-white'}`}>
      {display}
    </div>
  );
});

interface GameScreenProps {
  difficulty: Difficulty;
  mode: Mode;
  words: WordDefinition[];
  onGameEnd: (stats: GameStats) => void;
  onExitGame: () => void;
  fontType?: FontType;
  effectLevel?: EffectLevel;
  textSize?: TextSize;
  mods?: GameMods;         // スキルを反映したルール値
  ghostTrace?: number[];   // 自己ベストの1秒ごとのスコア（スキル「ゴースト対戦」）
}

// 出題文字のサイズ（docs/spec.md §3.1 が下限）。normal は元アプリのまま。
// large / max は index.css で max(下限, …) にしてあり、下限を割らない。
const KANA_SIZE: Record<TextSize, { short: string; long: string }> = {
  normal: { short: 'text-[5rem] md:text-[8rem] lg:text-[10rem]', long: 'text-[4rem] md:text-[6rem]' },
  large: { short: 'kana-large', long: 'kana-large-long' },
  max: { short: 'kana-max', long: 'kana-max-long' },
};
const ROMAJI_SIZE: Record<TextSize, string> = {
  normal: 'text-5xl md:text-7xl lg:text-8xl',
  large: 'romaji-large',
  max: 'romaji-max',
};

const COMBO_COLOR = ['text-white', 'text-neon-yellow', 'text-neon-orange', 'text-neon-pink', 'text-neon-cyan'];
const PARTICLES_PER_KEY = [8, 14, 20, 28, 40];
const AMBIENT_PER_SEC = [0, 2, 6, 14, 30];

const EDGE_WIDTH = ['4px', '6px', '8px', '10px', '14px'];

// カットイン：○コンボの節目（上の帯）／段階アップ（ラビッドパが中央へ飛び出す）／FEVER 突入（中央の大帯）
// ／ボーナスタイム突入（金の帯）／100コンボの覚醒（スキル）
interface CutIn {
  id: number;
  type: 'combo' | 'tier' | 'fever' | 'bonus' | 'awaken';
  text: string;
  sub?: string;
}
const CUTIN_RANK: Record<CutIn['type'], number> = { combo: 1, tier: 2, fever: 3, bonus: 3, awaken: 4 };
const CUTIN_MS: Record<CutIn['type'], number> = { combo: 1000, tier: 1200, fever: 1400, bonus: 1400, awaken: 1800 };

interface Popup {
  id: number;
  kind: 'word' | 'banner';
  text: string;
  sub?: string;
  perfect?: boolean;
}

const GameScreen: React.FC<GameScreenProps> = ({ difficulty, mode, words, onGameEnd, onExitGame, fontType = 'POP', effectLevel = 'max', textSize = 'normal', mods = DEFAULT_MODS, ghostTrace }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<WordDefinition | null>(null);
  const [moras, setMoras] = useState<Mora[]>([]);
  const [currentMoraIndex, setCurrentMoraIndex] = useState(0);
  const [typedMoraInput, setTypedMoraInput] = useState("");
  const [isWaitingForWord, setIsWaitingForWord] = useState(false);

  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [activeHintKey, setActiveHintKey] = useState("");

  // 画面に出す値。正本は gameRef（キー入力の中ですぐ読み書きするため）
  const [hud, setHud] = useState({ score: 0, combo: 0, gauge: 0, words: 0 });
  const [isFever, setIsFever] = useState(false);
  const [started, setStarted] = useState(false);
  const [isGolden, setIsGolden] = useState(false);
  const [isBonus, setIsBonus] = useState(false);
  const [bonusId, setBonusId] = useState(0);
  const [rival, setRival] = useState<number | null>(null); // ゴーストとのスコア差
  const [popups, setPopups] = useState<Popup[]>([]);

  const startTimeRef = useRef<number>(0);
  const lastInputTimeRef = useRef<number>(Date.now());
  const missCountRef = useRef<number>(0);
  const wordsQueueRef = useRef<WordDefinition[]>([]);

  const gameRef = useRef({
    correct: 0, missed: 0, score: 0, combo: 0, maxCombo: 0, gauge: 0,
    words: 0, perfects: 0, feverCount: 0, fever: false,
    wordMiss: false, wordStart: 0, wordKeys: 0, finished: false,
    golden: false, bonus: false, bonusScore: 0, goldenCleared: 0, trace: [] as number[],
  });
  const feverTimerRef = useRef<number | null>(null);
  const bonusTimerRef = useRef<number | null>(null);
  const popupIdRef = useRef(0);
  const [cutin, setCutin] = useState<CutIn | null>(null);
  const [ghost, setGhost] = useState<{ id: number; n: number } | null>(null);
  const cutinTimerRef = useRef<number | null>(null);
  const cutinRankRef = useRef(0);
  const kanaRef = useRef<HTMLDivElement>(null);
  const lastTickRef = useRef(0);

  const fxRef = useRef<EffectHandle>(null);
  const rabbitRef = useRef<RabidopaHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const curMoraRef = useRef<HTMLDivElement>(null);

  const calm = effectLevel === 'low';
  const fxScale = effectLevel === 'max' ? 1 : effectLevel === 'normal' ? 0.6 : 0;

  const syncHud = useCallback(() => {
    const g = gameRef.current;
    setHud({ score: g.score, combo: g.combo, gauge: g.gauge, words: g.words });
  }, []);

  const addPopup = useCallback((popup: Omit<Popup, 'id'>) => {
    const id = ++popupIdRef.current;
    setPopups(prev => [...prev.slice(-3), { ...popup, id }]);
    window.setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 1500);
  }, []);

  // カットイン。強いもの（FEVER ＞ 段階アップ ＞ ○コンボ）の最中は弱いもので上書きしない。
  // ひかえめでは出さず、下の帯だけにする
  const showCutin = useCallback((c: Omit<CutIn, 'id'>) => {
    if (calm) {
      addPopup({ kind: 'banner', text: c.text, sub: c.sub });
      return;
    }
    const rank = CUTIN_RANK[c.type];
    if (cutinTimerRef.current !== null) {
      if (rank < cutinRankRef.current) return;
      clearTimeout(cutinTimerRef.current);
    }
    cutinRankRef.current = rank;
    setCutin({ ...c, id: ++popupIdRef.current });
    cutinTimerRef.current = window.setTimeout(() => {
      cutinTimerRef.current = null;
      cutinRankRef.current = 0;
      setCutin(null);
    }, CUTIN_MS[c.type]);
  }, [addPopup, calm]);

  // 画面シェイク。ひかえめでは無効
  const shake = useCallback((power: number, duration: number) => {
    if (fxScale === 0 || !stageRef.current) return;
    const p = power * fxScale;
    const r = () => (Math.random() * 2 - 1) * p;
    stageRef.current.animate(
      [
        { transform: `translate(${r()}px, ${r()}px) rotate(${r() * 0.05}deg)` },
        { transform: `translate(${r()}px, ${r()}px) rotate(${r() * 0.05}deg)` },
        { transform: `translate(${r()}px, ${r()}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration }
    );
  }, [fxScale]);

  // ズームパルス。拡大方向だけ（出題文字が下限より小さくならない）
  const zoomPulse = useCallback((scale: number) => {
    if (fxScale === 0 || !questionRef.current) return;
    questionRef.current.animate(
      [{ transform: `scale(${1 + (scale - 1) * fxScale})` }, { transform: 'scale(1)' }],
      { duration: 140, easing: 'ease-out' }
    );
  }, [fxScale]);

  const invertFlash = useCallback(() => {
    const el = stageRef.current;
    if (fxScale < 1 || !el) return;
    el.classList.remove('dopa-invert');
    void el.offsetWidth;
    el.classList.add('dopa-invert');
  }, [fxScale]);

  const endFever = useCallback(() => {
    const g = gameRef.current;
    feverTimerRef.current = null;
    g.fever = false;
    g.gauge = 0;
    setIsFever(false);
    audioManager.setBgmRate(1);
    audioManager.playFeverEnd();
    syncHud();
  }, [syncHud]);

  const startFever = useCallback(() => {
    const g = gameRef.current;
    g.fever = true;
    g.feverCount += 1;
    setIsFever(true);
    audioManager.playFeverStart();
    audioManager.setBgmRate(2);
    // ボーナスタイムと重なったら「W ボーナス」
    showCutin(g.bonus
      ? { type: 'bonus', text: 'W ボーナス!!', sub: 'スコア ×4' }
      : { type: 'fever', text: 'FEVER TIME!!', sub: 'スコア ×2' });
    fxRef.current?.confetti(calm ? 40 : 120);
    fxRef.current?.firework();
    fxRef.current?.firework();
    fxRef.current?.firework();
    if (fxScale > 0) fxRef.current?.flash('#FFFFFF', 0.8 * fxScale);
    shake(26, 500);
    feverTimerRef.current = window.setTimeout(endFever, mods.feverSeconds * 1000);
  }, [showCutin, calm, endFever, fxScale, shake, mods.feverSeconds]);

  // スコアを足す。ボーナスタイム中の分は別に数えておく（コインが ×2 になる）
  const addScore = useCallback((points: number) => {
    const g = gameRef.current;
    g.score += points;
    if (g.bonus) g.bonusScore += points;
  }, []);

  const endBonus = useCallback(() => {
    bonusTimerRef.current = null;
    gameRef.current.bonus = false;
    setIsBonus(false);
    audioManager.playBonusEnd();
  }, []);

  // ボーナスタイム（§6.4）。ゴールデンワードをクリアすると始まる。続けて取ると時間が延びなおす
  const startBonus = useCallback(() => {
    const g = gameRef.current;
    g.bonus = true;
    setIsBonus(true);
    setBonusId(n => n + 1);
    audioManager.playBonusStart(g.fever);
    showCutin(g.fever
      ? { type: 'bonus', text: 'W ボーナス!!', sub: 'スコア ×4' }
      : { type: 'bonus', text: 'ボーナスタイム!!', sub: 'スコア・コイン ×2' });
    fxRef.current?.confetti(calm ? 30 : 100);
    fxRef.current?.firework();
    fxRef.current?.firework();
    if (fxScale > 0) fxRef.current?.flash('#FFD600', 0.7 * fxScale);
    shake(20, 400);
    if (bonusTimerRef.current !== null) clearTimeout(bonusTimerRef.current);
    bonusTimerRef.current = window.setTimeout(endBonus, mods.bonusSeconds * 1000);
  }, [showCutin, calm, endBonus, fxScale, shake, mods.bonusSeconds]);

  // 正打鍵 1回分のコンボ・スコア・ゲージ・演出
  const registerCorrect = useCallback((char: string) => {
    const g = gameRef.current;
    const prevLevel = getComboTier(g.combo).level;
    g.correct += 1;
    g.combo += 1;
    g.maxCombo = Math.max(g.maxCombo, g.combo);
    const tier = getComboTier(g.combo);
    addScore(keyScore(g.combo, g.fever, g.bonus));

    audioManager.playTypeNote(g.combo);
    rabbitRef.current?.play('type');

    const fx = fxRef.current;
    const rect = curMoraRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    if (fx) {
      const count = PARTICLES_PER_KEY[tier.level] * (g.fever ? 1.5 : 1) * (calm ? 0.5 : 1);
      fx.burst(x, y, Math.round(count), 0.8 + tier.level * 0.15);
      fx.flyChar(x, y, char.toUpperCase());
      if (tier.level >= 1) fx.ring(x, y);
      if (fxScale > 0) {
        const color = g.fever || tier.level >= 3 ? RAINBOW[g.combo % RAINBOW.length] : '#FFFFFF';
        fx.flash(color, (0.1 + tier.level * 0.03 + (g.fever ? 0.06 : 0)) * fxScale);
      }
    }
    if (tier.level >= 2 || g.fever) shake(3 + tier.level * 3, 110);
    if (tier.level >= 3 || g.fever) zoomPulse(1.03 + (tier.level - 2) * 0.01);

    // 段階アップ
    if (tier.level > prevLevel) {
      audioManager.playComboUp(tier.level);
      audioManager.setBgmIntensity(tier.level);
      showCutin({ type: 'tier', text: tier.shout, sub: `${g.combo} コンボ  スコア ×${tier.mult}` });
      fx?.confetti(calm ? 20 : 30 * tier.level);
      for (let i = 0; i < tier.level; i++) fx?.firework();
      shake(10 + tier.level * 5, 350);
    } else if (g.combo % COMBO_CUTIN_EVERY === 0) {
      // ○コンボごとの節目
      audioManager.playMilestone(g.combo / COMBO_CUTIN_EVERY);
      showCutin({ type: 'combo', text: `${g.combo} コンボ!!` });
      fx?.confetti(calm ? 10 : 40);
      fx?.firework();
    }
    // スキル「覚醒演出」：100コンボでラビッドパが大覚醒
    if (mods.awaken && g.combo === AWAKEN_COMBO) {
      audioManager.playFeverStart();
      showCutin({ type: 'awaken', text: 'だいかくせい!!!!!', sub: `${AWAKEN_COMBO} コンボ たっせい！` });
      fx?.confetti(calm ? 40 : 150);
      for (let i = 0; i < 6; i++) fx?.firework();
      shake(30, 600);
    }

    // 出題文字が1打ごとに跳ねて光る。拡大方向だけなので下限サイズは割らない
    if (fxScale > 0 && kanaRef.current) {
      kanaRef.current.animate(
        [
          { transform: `scale(${1 + 0.08 * fxScale}) rotate(${g.combo % 2 ? -1.5 : 1.5}deg)`, filter: 'brightness(1.7)' },
          { transform: 'scale(1) rotate(0deg)', filter: 'brightness(1)' },
        ],
        { duration: 170, easing: 'ease-out' }
      );
    }
    // 5コンボごとに、コンボ数が画面いっぱいに一瞬出る（ふちどりだけなので出題は読める）
    if (!calm && g.combo % 5 === 0) setGhost({ id: ++popupIdRef.current, n: g.combo });

    // フィーバーゲージ
    if (!g.fever) {
      g.gauge = Math.min(FEVER_MAX, g.gauge + GAUGE_PER_KEY);
      if (g.gauge >= FEVER_MAX) startFever();
    }
    syncHud();
  }, [addScore, showCutin, calm, fxScale, shake, startFever, syncHud, zoomPulse, mods.awaken]);

  // 次の文字ヒントを更新
  const updateHintKey = useCallback((currentMoras: Mora[], moraIdx: number, currentInput: string) => {
    if (moraIdx >= currentMoras.length) {
      setActiveHintKey("");
      return;
    }
    const candidates = currentMoras[moraIdx].romaji;
    const valid = candidates.filter(c => c.startsWith(currentInput));
    if (valid.length > 0) {
      const target = valid[0];
      const nextChar = target[currentInput.length];
      setActiveHintKey(nextChar ? nextChar.toUpperCase() : "");
    } else {
      setActiveHintKey("");
    }
  }, []);

  // 単語読み込み
  const loadWord = useCallback((word: WordDefinition) => {
    setCurrentWord(word);
    const parsed = parseKanaToMora(word.text, word.romaji);
    if (!parsed) return;

    const g = gameRef.current;
    g.wordMiss = false;
    g.wordStart = Date.now();
    g.wordKeys = parsed.reduce((sum, m) => sum + (m.romaji[0]?.length ?? 1), 0);
    // ゴールデンワード（§6.4）。金色に光るだけで、文字の大きさは変えない
    g.golden = Math.random() < mods.goldenRate;
    setIsGolden(g.golden);
    if (g.golden) {
      audioManager.playGolden();
      addPopup({ kind: 'banner', text: 'ゴールデンワード!!', sub: 'クリアで ボーナスタイム！' });
    }

    setMoras(parsed);
    setCurrentMoraIndex(0);
    setTypedMoraInput("");
    updateHintKey(parsed, 0, "");
  }, [updateHintKey, addPopup, mods.goldenRate]);

  useEffect(() => {
    wordsQueueRef.current = words;
    if (currentWordIndex === 0 && !currentWord && words.length > 0) {
       loadWord(words[0]);
       startTimeRef.current = Date.now();
       lastInputTimeRef.current = Date.now();
       setStarted(true);
    } else if (isWaitingForWord && words.length > currentWordIndex) {
      setIsWaitingForWord(false);
      loadWord(words[currentWordIndex]);
    }
  }, [words, isWaitingForWord, currentWordIndex, currentWord, loadWord]);

  // BGM はプレイ中だけ鳴らす
  useEffect(() => {
    if (!started) return;
    audioManager.startBgm();
    return () => audioManager.stopBgm();
  }, [started]);

  useEffect(() => {
    return () => {
      if (feverTimerRef.current !== null) clearTimeout(feverTimerRef.current);
      if (bonusTimerRef.current !== null) clearTimeout(bonusTimerRef.current);
      if (cutinTimerRef.current !== null) clearTimeout(cutinTimerRef.current);
    };
  }, []);

  // 1秒ごとのスコアを残す（次回のゴースト用）。ゴーストがいれば差を出す
  useEffect(() => {
    if (!started) return;
    const interval = window.setInterval(() => {
      const g = gameRef.current;
      if (g.finished) return;
      g.trace.push(g.score);
      if (ghostTrace && ghostTrace.length > 0) {
        setRival(g.score - ghostTrace[Math.min(g.trace.length, ghostTrace.length) - 1]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [started, ghostTrace]);

  // アイドル監視（ヒント表示）
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (startTimeRef.current === 0 || isWaitingForWord) return;
      if (Date.now() - lastInputTimeRef.current > HINT_IDLE_MS) {
        setShowHint(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isWaitingForWord]);

  // ゲーム終了処理
  const finishGame = useCallback(() => {
    const g = gameRef.current;
    if (g.finished) return;
    g.finished = true;
    if (feverTimerRef.current !== null) clearTimeout(feverTimerRef.current);
    if (bonusTimerRef.current !== null) clearTimeout(bonusTimerRef.current);
    audioManager.setBgmRate(1);
    audioManager.stopBgm();
    const elapsed = Date.now() - startTimeRef.current;
    onGameEnd({
      correctChars: g.correct,
      missedChars: g.missed,
      timeElapsed: mode === 'arcade' ? Math.min(elapsed, ARCADE_SECONDS * 1000) : elapsed,
      difficulty,
      mode,
      score: g.score,
      maxCombo: g.maxCombo,
      wordsCleared: g.words,
      perfectWords: g.perfects,
      feverCount: g.feverCount,
      bonusScore: g.bonusScore,
      goldenCleared: g.goldenCleared,
      trace: [...g.trace, g.score],
    });
  }, [onGameEnd, difficulty, mode]);

  // アーケードモード：60秒で終了。残り5秒からカウント音
  useEffect(() => {
    if (mode !== 'arcade') return;
    const interval = window.setInterval(() => {
      if (startTimeRef.current === 0 || gameRef.current.finished) return;
      const remain = ARCADE_SECONDS * 1000 - (Date.now() - startTimeRef.current);
      const sec = Math.ceil(remain / 1000);
      if (sec <= 5 && sec > 0 && sec !== lastTickRef.current) {
        lastTickRef.current = sec;
        audioManager.playTick();
      }
      if (remain <= 0) {
        audioManager.playTimeUp();
        finishGame();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [mode, finishGame]);

  // 単語の進行
  const nextWord = useCallback(() => {
    const nextIndex = currentWordIndex + 1;
    if (mode === 'practice' && nextIndex >= TOTAL_QUESTIONS) {
      finishGame();
      return;
    }
    const queue = wordsQueueRef.current;
    if (nextIndex < queue.length || (mode === 'arcade' && queue.length > 0)) {
      setCurrentWordIndex(nextIndex);
      // アーケードで出題を使い切ったら先頭から回す
      loadWord(queue[nextIndex % queue.length]);
      setShowHint(false);
      missCountRef.current = 0;
      lastInputTimeRef.current = Date.now();
    } else {
      setCurrentWordIndex(nextIndex);
      setIsWaitingForWord(true);
      setCurrentWord(null);
    }
  }, [currentWordIndex, loadWord, finishGame, mode]);

  // 単語クリア時のスコア・演出
  const registerWordClear = useCallback(() => {
    const g = gameRef.current;
    const perfect = !g.wordMiss;
    const tier = getComboTier(g.combo);
    addScore(wordScore(g.wordKeys, Date.now() - g.wordStart, perfect));
    g.words += 1;
    if (perfect) g.perfects += 1;
    const wasGolden = g.golden;
    g.golden = false;

    audioManager.playWordClear(perfect);
    rabbitRef.current?.play('clear');
    addPopup({ kind: 'word', text: perfect ? 'PERFECT!!' : 'GREAT!', perfect });

    const fx = fxRef.current;
    const rect = questionRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    if (fx) {
      fx.burst(cx, cy, calm ? 20 : perfect ? 70 : 40, 1.5);
      fx.ring(cx, cy, '#FFD600');
      fx.ring(cx, cy, '#FFFFFF');
      fx.confetti(calm ? 10 : perfect ? 50 : 24);
      if (perfect) fx.firework();
      if (fxScale > 0) fx.flash(perfect ? '#FFD600' : '#FFFFFF', 0.45 * fxScale);
    }
    shake(perfect ? 14 : 8, 220);
    zoomPulse(1.05);
    if (tier.level >= 3) invertFlash();
    // スキル「ラッキー演出」：ときどき特大の花火
    if (mods.lucky && Math.random() < LUCKY_RATE) {
      audioManager.playLucky();
      addPopup({ kind: 'banner', text: 'ラッキー!!' });
      fx?.confetti(calm ? 40 : 140);
      for (let i = 0; i < 5; i++) fx?.firework();
      invertFlash();
    }
    if (wasGolden) {
      g.goldenCleared += 1;
      startBonus();
    }
    // 単語クリアでもゲージがたまる
    if (!g.fever) {
      g.gauge = Math.min(FEVER_MAX, g.gauge + GAUGE_PER_WORD);
      if (g.gauge >= FEVER_MAX) startFever();
    }
    syncHud();
  }, [addPopup, addScore, calm, fxScale, invertFlash, shake, startBonus, startFever, syncHud, zoomPulse, mods.lucky]);

  // モーラの進行
  const advanceMora = useCallback((nextInputForState: string, isLookaheadSkip: boolean = false) => {
    const nextMoraIdx = currentMoraIndex + 1;
    if (nextMoraIdx >= moras.length) {
      registerWordClear();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        nextWord();
      }, 150);
    } else {
      setCurrentMoraIndex(nextMoraIdx);
      if (isLookaheadSkip) {
        setTypedMoraInput(nextInputForState);
        const nextMora = moras[nextMoraIdx];
        const exact = nextMora.romaji.filter(r => r === nextInputForState);
        const hasLonger = nextMora.romaji.some(r => r.length > nextInputForState.length);
        if (exact.length > 0 && !hasLonger) {
           setTimeout(() => advanceMora("", false), 0);
        } else {
           updateHintKey(moras, nextMoraIdx, nextInputForState);
        }
      } else {
        setTypedMoraInput("");
        updateHintKey(moras, nextMoraIdx, "");
      }
    }
  }, [currentMoraIndex, moras, nextWord, updateHintKey, registerWordClear]);

  // ミス処理（やさしめ：コンボは 0、ゲージは半分残る。FEVER 中は FEVER が続く）
  const handleMiss = useCallback(() => {
    const g = gameRef.current;
    g.missed += 1;
    g.wordMiss = true;
    g.combo = 0;
    if (!g.fever) g.gauge = Math.floor(g.gauge * mods.gaugeKeepOnMiss);
    audioManager.playCrash();
    audioManager.setBgmIntensity(0);
    rabbitRef.current?.play('miss');
    if (fxScale > 0) fxRef.current?.flash('#FF1744', 0.55 * fxScale);
    shake(22, 320);
    syncHud();

    setIsError(true);
    setTimeout(() => setIsError(false), 200);
    missCountRef.current += 1;
    if (missCountRef.current >= HINT_MISS_COUNT) setShowHint(true);
  }, [fxScale, shake, syncHud, mods.gaugeKeepOnMiss]);

  // キー入力ハンドラ
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.isComposing || !currentWord || isWaitingForWord || currentMoraIndex >= moras.length) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key.length !== 1 || !/^[a-zA-Z-]$/.test(e.key)) return;
    if (gameRef.current.finished || isSuccess) return;

    lastInputTimeRef.current = Date.now();
    const inputChar = e.key.toLowerCase();
    const currentMora = moras[currentMoraIndex];
    const nextInputSequence = typedMoraInput + inputChar;
    const matchesCurrent = currentMora.romaji.filter(r => r.startsWith(nextInputSequence));

    if (matchesCurrent.length > 0) {
      registerCorrect(inputChar);
      setIsError(false);
      setShowHint(false);
      missCountRef.current = 0;

      const exactMatches = matchesCurrent.filter(r => r === nextInputSequence);
      const isComplete = exactMatches.length > 0;
      const hasLongerCandidates = matchesCurrent.some(r => r.length > nextInputSequence.length);

      if (isComplete && !hasLongerCandidates) {
        advanceMora(nextInputSequence);
      } else {
        setTypedMoraInput(nextInputSequence);
        updateHintKey(moras, currentMoraIndex, nextInputSequence);
      }
    } else {
      // 次のモーラの先読み対応
      const prevIsComplete = currentMora.romaji.includes(typedMoraInput);
      if (prevIsComplete) {
        const nextMoraIdx = currentMoraIndex + 1;
        if (nextMoraIdx < moras.length) {
          const nextMora = moras[nextMoraIdx];
          if (nextMora.romaji.some(r => r.startsWith(inputChar))) {
             registerCorrect(inputChar);
             setIsError(false);
             setShowHint(false);
             missCountRef.current = 0;
             advanceMora(inputChar, true);
             return;
          }
        }
      }
      handleMiss();
    }
  }, [currentWord, moras, currentMoraIndex, typedMoraInput, isWaitingForWord, isSuccess, advanceMora, updateHintKey, handleMiss, registerCorrect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const fontClass = fontType === 'ROUNDED' ? 'font-rounded' : 'font-pop';
  const tier = getComboTier(hud.combo);
  const rabbitAnim = isFever || tier.level >= 3 ? 'fever' : tier.level === 2 ? 'shout' : tier.level === 1 ? 'groove' : 'idle';
  const kanaSize = currentWord && currentWord.text.length > 9 ? KANA_SIZE[textSize].long : KANA_SIZE[textSize].short;
  const romajiKeys = moras.reduce((sum, m) => sum + (m.romaji[0]?.length ?? 1), 0);
  const multiplier = tier.mult * (isFever ? 2 : 1) * (isBonus ? 2 : 1);

  return (
    <div className="relative w-full min-h-screen overflow-hidden font-pop">
      {/* レイヤー1: 背景 */}
      <DopaBackground level={tier.level} fever={isFever} calm={calm} />

      {/* レイヤー2: 出題エリアと UI（シェイク・色反転はここにかける） */}
      <div ref={stageRef} className="relative z-10 flex flex-col items-center min-h-screen w-full">
        <div className="w-full px-4 lg:px-8 pt-3 md:pt-4 flex justify-between items-center gap-2 lg:gap-4 max-w-[1600px] mx-auto z-20">
          <div className="flex items-center gap-3 md:gap-5">
            <button
              onClick={() => { audioManager.playCancel(); onExitGame(); }}
              className="hx-btn hx-dark px-3 py-2 md:px-4 md:py-3"
            >
              <span className="hx-btn-in gap-2">
                <LogOut className="w-6 h-6 md:w-8 md:h-8" />
                <span className="hidden lg:inline text-lg tracking-wider">やめる</span>
              </span>
            </button>
            <div className="hx-tag px-4 py-1 md:px-5 md:py-2" style={{ '--edge': 'var(--lime)' } as React.CSSProperties}>
              <div className="hx-unskew text-center">
                {mode === 'practice' ? (
                  <>
                    <div className="text-xs md:text-sm text-neon-lime leading-none">もんだい</div>
                    <div className="flex items-baseline justify-center">
                      <span className="hx-num text-3xl md:text-5xl text-white leading-none">{Math.min(currentWordIndex + 1, TOTAL_QUESTIONS)}</span>
                      <span className="hx-num text-lg md:text-2xl text-white/60">/{TOTAL_QUESTIONS}</span>
                    </div>
                    <div className="hidden lg:flex gap-1 mt-1">
                      {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                        <div key={i} className={`h-2 w-2 md:w-3 rounded-sm ${i < currentWordIndex ? 'bg-neon-lime' : i === currentWordIndex ? 'bg-neon-yellow dopa-blink' : 'bg-white/20'}`} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs md:text-sm text-neon-lime leading-none">クリア</div>
                    <div key={hud.words} className="hx-num dopa-combo-pop text-4xl md:text-6xl text-white leading-none">{hud.words}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className={`hx-tag px-5 lg:px-12 py-1 md:py-2 ${isFever ? 'dopa-rainbow-border' : ''}`}>
              <div className="hx-unskew text-center">
                {rival === null ? (
                  <div className="text-xs md:text-base text-neon-cyan tracking-[0.4em] leading-none">SCORE</div>
                ) : (
                  <div className={`hx-num text-xs md:text-base leading-none whitespace-nowrap ${rival >= 0 ? "text-neon-lime" : "text-neon-red"}`}>
                    ゴースト {rival >= 0 ? "+" : "−"}{Math.abs(rival).toLocaleString()}
                  </div>
                )}
                <div key={hud.score} className={`hx-num dopa-combo-pop text-4xl md:text-6xl leading-none ${isFever ? 'dopa-rainbow-text' : 'text-neon-yellow'}`}>
                  {hud.score.toLocaleString()}
                </div>
              </div>
            </div>
            {isBonus && (
              <>
                <div className="absolute -left-8 -top-2 z-10 dopa-wiggle">
                  <div className="hx-gold-fill -rotate-12 border-4 border-neon-ink rounded-lg px-2 py-0.5 text-neon-ink text-sm md:text-xl whitespace-nowrap shadow-[3px_4px_0_#0B0320]">ボーナス!</div>
                </div>
                <div className="absolute left-3 right-3 -bottom-3 h-2 md:h-3 rounded-full bg-neon-ink border-2 border-neon-ink overflow-hidden">
                  <div key={bonusId} className="h-full hx-gold-fill hx-bonus-drain" style={{ "--bonus": `${mods.bonusSeconds}s` } as React.CSSProperties} />
                </div>
              </>
            )}
            {/* 倍率のギザギザバッジ */}
            <div className="absolute -right-14 lg:-right-24 -top-2 w-16 h-16 lg:w-24 lg:h-24">
              <div className={`relative w-full h-full flex items-center justify-center ${multiplier > 1 ? 'dopa-wiggle' : ''}`}>
                <div className="absolute inset-0 hx-burst bg-neon-ink" />
                <div className={`absolute inset-[5px] hx-burst ${multiplier >= 4 ? 'dopa-rainbow-fill' : multiplier > 1 ? 'bg-neon-pink' : 'bg-slate-500'}`} />
                <span className="relative hx-num hx-sticker text-lg lg:text-3xl text-white">×{multiplier.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="w-24 lg:w-44 text-center">
              {hud.combo >= 2 && (
                <div className={tier.level >= 1 ? 'dopa-wiggle' : ''}>
                  <div key={hud.combo} className={`hx-num hx-sticker dopa-combo-pop text-5xl md:text-7xl leading-none ${COMBO_COLOR[tier.level]} ${tier.level >= 2 && !calm ? 'hx-fire' : ''}`}>
                    {hud.combo}
                  </div>
                  <div className="hx-num hx-sticker text-xl md:text-3xl text-white leading-none">COMBO</div>
                </div>
              )}
            </div>
            <div className="hx-tag px-3 py-1 lg:px-5 lg:py-2 min-w-[6rem] lg:min-w-[9rem]" style={{ '--edge': 'var(--pink)' } as React.CSSProperties}>
              <div className="hx-unskew text-center">
                <div className="text-xs md:text-sm text-neon-pink leading-none">{mode === 'arcade' ? 'のこり' : 'タイム'}</div>
                <GameTimer startTime={startTimeRef.current} limitMs={mode === 'arcade' ? ARCADE_SECONDS * 1000 : undefined} />
              </div>
            </div>
          </div>
        </div>

        <div className={`flex-1 flex flex-col items-center justify-center w-full py-2 ${isError ? 'animate-shake' : ''}`}>
          {/* 出題エリア。画面高さの50%以上（§3.2-2）。キャラや UI を中に置かない */}
          <div
            ref={questionRef}
            className={`w-full bg-neon-ink border-y-[10px] overflow-hidden min-h-[50vh] flex items-center justify-center py-6 relative ${isGolden ? 'hx-gold-border' : isFever ? 'dopa-rainbow-border' : tier.level >= 2 ? 'border-neon-yellow dopa-glow-border' : 'border-neon-cyan dopa-glow-cyan'}`}
          >
              {/* 上下のふちを走るテープ。文字にはかからない */}
              <div className={`hx-tape top-0 ${calm ? 'dopa-calm' : ''}`} />
              <div className={`hx-tape bottom-0 ${calm ? 'dopa-calm' : ''}`} />
              <div className="relative z-10 w-full max-w-[95%] mx-auto">
                 {isWaitingForWord || !currentWord ? (
                   <div className="flex flex-col items-center justify-center animate-pulse py-12">
                      <Loader2 className="w-20 h-20 text-neon-yellow animate-spin mb-4" />
                      <p className="text-3xl text-white font-bold">つぎのもんだいをつくってるよ！</p>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center space-y-8 w-full">
                      <div
                        ref={kanaRef}
                        className={`text-white font-black ${fontClass} tracking-wider text-center break-keep leading-tight drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${kanaSize} ${isGolden ? 'hx-gold-text' : isFever ? 'dopa-rainbow-text' : ''}`}
                        style={{ '--chars': currentWord.text.length } as React.CSSProperties}
                      >
                        {currentWord.text}
                      </div>
                      <div
                        className="flex flex-wrap justify-center gap-x-4 md:gap-x-6 px-8 py-6 rounded-3xl bg-white/5 border-4 border-neon-pink/70"
                        style={{ '--rchars': romajiKeys } as React.CSSProperties}
                      >
                        {moras.map((mora, idx) => {
                          const input = idx === currentMoraIndex ? typedMoraInput.toUpperCase() : "";
                          const candidates = mora.romaji.map(r => r.toUpperCase());
                          const displayString = (idx === currentMoraIndex && candidates.find(c => c.startsWith(input))) || candidates[0];
                          const typedPart = idx < currentMoraIndex ? displayString : input;
                          const untypedPart = idx < currentMoraIndex ? "" : displayString.substring(input.length);

                          return (
                             <div
                               key={idx}
                               ref={idx === currentMoraIndex ? curMoraRef : undefined}
                               className={`flex ${ROMAJI_SIZE[textSize]} font-mono font-bold mx-1 md:mx-2 relative tracking-widest`}
                             >
                               <span className="text-neon-yellow drop-shadow-[0_4px_0_rgba(0,0,0,0.8)]">
                                 {/* 打った文字は1文字ずつはじけて入る */}
                                 {typedPart.split('').map((c, i) => (
                                   <span key={i} className={calm ? '' : 'hx-char-hit'}>{c}</span>
                                 ))}
                               </span>
                               <span className="text-slate-400">{untypedPart}</span>
                               {idx === currentMoraIndex && (
                                 <div className="absolute -bottom-4 left-0 w-full h-3 bg-neon-yellow animate-pulse rounded-full shadow-[0_0_14px_rgba(255,230,0,0.9)]" />
                               )}
                             </div>
                          );
                        })}
                      </div>
                   </div>
                 )}
              </div>
          </div>
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
               <div className="hx-num text-[12rem] md:text-[16rem] text-neon-red drop-shadow-[0_8px_0_rgba(0,0,0,1)] animate-bounce-short opacity-80">X</div>
            </div>
          )}
        </div>

        {/* フッター: FEVER ゲージ。右側はラビッドパの立ち位置 */}
        <div className={`relative w-full flex flex-col items-center justify-start gap-2 px-4 pb-3 ${textSize === 'normal' ? 'min-h-[15vh]' : ''}`}>
          <div className="w-[min(72vw,900px)] mr-[18vh] lg:mr-0 flex items-center gap-4">
            <span className={`hx-num hx-sticker shrink-0 flex items-center gap-1 text-2xl md:text-4xl ${isFever ? 'dopa-rainbow-text dopa-wiggle' : 'text-neon-orange'}`}>
              <Flame className="w-7 h-7 md:w-10 md:h-10" strokeWidth={3} />
              {isFever ? 'FEVER!!' : 'FEVER'}
            </span>
            <div className={`hx-gauge h-8 md:h-10 flex-1 ${isFever ? 'dopa-rainbow-border' : ''}`}>
              {isFever ? (
                <div className="h-full dopa-gauge-fever" style={{ '--fever': `${mods.feverSeconds}s` } as React.CSSProperties} />
              ) : (
                <div className={`h-full dopa-gauge-fill ${hud.gauge >= FEVER_MAX * 0.8 ? 'dopa-blink' : ''}`} style={{ width: `${Math.min(100, (hud.gauge / FEVER_MAX) * 100)}%` }} />
              )}
            </div>
            <span className="hx-num hx-sticker shrink-0 w-24 md:w-32 text-left text-xl md:text-2xl text-white">
              {isFever ? (isBonus ? 'スコア×4' : 'スコア×2') : `${hud.gauge}%`}
            </span>
          </div>
          {textSize === 'normal' && (
            <div className={`mr-[18vh] lg:mr-0 transition-opacity duration-300 ${!isWaitingForWord && currentWord && hud.combo === 0 ? 'opacity-100' : 'opacity-0'}`}>
              <div className="hx-tag px-8 py-1" style={{ '--edge': 'var(--yellow)' } as React.CSSProperties}>
                 <p className="hx-unskew text-xl md:text-3xl text-neon-yellow tracking-wide animate-pulse">キーボードで もじを うとう！</p>
              </div>
            </div>
          )}
          {/* レイヤー4: ラビッドパ。フッターの高さに合わせて立たせ、ふだんの姿勢では出題エリアにかからない（体は箱の下62%）。手足・耳は演出で伸びてはみ出してよい */}
          <Rabidopa
            ref={rabbitRef}
            anim={rabbitAnim}
            aura={tier.level}
            rainbow={isFever}
            className="absolute right-0 bottom-0 z-30 h-[161%] aspect-[720/700]"
          />
        </div>
      </div>

      {/* レイヤー3: 演出（Canvas） */}
      <EffectCanvas ref={fxRef} maxParticles={calm ? 150 : 300} ambient={calm ? 0 : isFever ? 40 : AMBIENT_PER_SEC[tier.level]} />

      {/* 画面のふちを走るネオン。コンボ段階で太く速くなる */}
      {!calm && (
        <div
          className={isFever || tier.level >= 3 ? 'hx-edge-rainbow' : ''}
          style={{ '--edge-w': isFever ? '18px' : EDGE_WIDTH[tier.level], '--edge-spd': isFever ? '0.5s' : `${2.4 - tier.level * 0.45}s` } as React.CSSProperties}
        >
          <div className="hx-edge hx-edge-top" />
          <div className="hx-edge hx-edge-bottom" />
          <div className="hx-edge hx-edge-left" />
          <div className="hx-edge hx-edge-right" />
        </div>
      )}

      {/* 集中線。コンボ 12 以上と FEVER 中 */}
      {!calm && (tier.level >= 2 || isFever) && <div className="hx-speedlines" />}

      {/* 5コンボごとに画面いっぱいのコンボ数（ふちどりだけ） */}
      {ghost && (
        <div key={ghost.id} className="fixed inset-0 z-[44] pointer-events-none overflow-hidden">
          <div className="hx-ghost-combo hx-num">{ghost.n}</div>
        </div>
      )}

      {/* カットイン */}
      {cutin && (
        <div key={cutin.id} className="fixed inset-0 z-[46] pointer-events-none overflow-hidden font-pop">
          {cutin.type === 'combo' && (
            <div className="hx-cutin-band hx-cutin-slide top-[1vh] h-[15vh] bg-neon-pink">
              <div className="hx-cutin-speed" />
              <Rabidopa anim="shout" className="relative h-[24vh] aspect-[720/700] -mt-[6vh]" />
              <div className="relative hx-num hx-sticker text-neon-yellow text-6xl md:text-8xl whitespace-nowrap">{cutin.text}</div>
              <Rabidopa anim="shout" className="relative h-[24vh] aspect-[720/700] -mt-[6vh]" />
            </div>
          )}
          {(cutin.type === 'tier' || cutin.type === 'awaken') && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="hx-cutin-rays" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="hx-cutin-jump">
                  <Rabidopa anim={cutin.type === "awaken" ? "fever" : "shout"} aura={4} rainbow={cutin.type === "awaken"} className="h-[78vh] aspect-[720/700]" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-[5vh] flex justify-center">
                <div className="hx-cutin-slam text-center">
                  <div className={`hx-sticker text-7xl md:text-9xl whitespace-nowrap ${cutin.type === "awaken" ? "dopa-rainbow-text" : "text-neon-yellow"}`}>{cutin.text}</div>
                  {cutin.sub && <div className="hx-sticker text-white text-2xl md:text-4xl whitespace-nowrap">{cutin.sub}</div>}
                </div>
              </div>
            </>
          )}
          {cutin.type === 'bonus' && (
            <div className="absolute inset-0">
              <div className="hx-cutin-band hx-cutin-open top-[30vh] h-[40vh] hx-gold-fill">
                <div className="hx-cutin-speed" />
                <Rabidopa anim="shout" aura={4} className="relative h-[36vh] aspect-[720/700] -mt-[6vh] shrink-0" />
                <div className="relative hx-cutin-slam text-center">
                  <div className="hx-sticker text-white text-[6.5vw] leading-none whitespace-nowrap">{cutin.text}</div>
                  {cutin.sub && <div className="hx-sticker text-neon-yellow text-3xl md:text-6xl whitespace-nowrap">{cutin.sub}</div>}
                </div>
                <Rabidopa anim="shout" aura={4} className="relative h-[36vh] aspect-[720/700] -mt-[6vh] shrink-0" />
              </div>
            </div>
          )}
          {cutin.type === 'fever' && (
            <div className="absolute inset-0">
              <div className="hx-cutin-band hx-cutin-open top-[26vh] h-[48vh] dopa-rainbow-fill">
                <div className="hx-cutin-speed" />
                <Rabidopa anim="fever" rainbow className="relative h-[42vh] aspect-[720/700] -mt-[8vh] shrink-0" />
                <div className="relative hx-cutin-slam text-center">
                  <div className="hx-num hx-sticker text-white text-[10vw] leading-none whitespace-nowrap">FEVER!!</div>
                  {cutin.sub && <div className="hx-sticker text-neon-yellow text-3xl md:text-6xl whitespace-nowrap">{cutin.sub}</div>}
                </div>
                <Rabidopa anim="fever" rainbow className="relative h-[42vh] aspect-[720/700] -mt-[8vh] shrink-0" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* GREAT! / PERFECT!! の文字（ひかえめのときは 段階アップ / FEVER の帯もここ） */}
      <div className="fixed inset-0 z-[45] pointer-events-none overflow-hidden font-pop">
        {popups.map(p => p.kind === 'word' ? (
          <div key={p.id} className="absolute inset-x-0 top-[9vh] flex justify-center">
            <div className={`dopa-pop-word hx-num hx-sticker text-7xl md:text-9xl ${p.perfect ? 'dopa-rainbow-text' : 'text-neon-yellow'}`}>
              {p.text}
            </div>
          </div>
        ) : (
          <div key={p.id} className="absolute inset-x-0 bottom-[2vh] flex justify-center">
            <div className="dopa-pop-banner dopa-rainbow-fill border-y-[6px] border-neon-ink px-16 py-1 text-center shadow-[0_0_60px_rgba(255,255,255,0.8)]">
              <div className="hx-sticker text-white text-5xl md:text-7xl whitespace-nowrap">{p.text}</div>
              {p.sub && <div className="hx-sticker text-neon-yellow text-xl md:text-3xl whitespace-nowrap">{p.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {showHint && activeHintKey && !isWaitingForWord && (
        <KeyboardHint activeKey={activeHintKey} />
      )}
    </div>
  );
};

export default GameScreen;
