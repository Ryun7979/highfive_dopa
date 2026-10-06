import { Difficulty, Mode, Rank } from '../types';

// 数値はすべて【仮】。P4 のテストプレイで決める（docs/spec.md §6.2 §6.3 §7）
// ランクしきい値は 2026-10-06 に腕前ごとの試算で一度ならした（§7.2）

export const ARCADE_SECONDS = 60;
export const ARCADE_WORD_POOL = 200;
export const FEVER_MAX = 100;
export const FEVER_SECONDS = 10;
// ゴールデンワードの出る確率と、クリアしたあとのボーナスタイム（スコア・コイン ×2）の長さ。スキルで伸びる
export const GOLDEN_RATE = 0.1;
export const BONUS_SECONDS = 10;
// スキル「ラッキー演出」が出る確率と、「覚醒演出」が出るコンボ数
export const LUCKY_RATE = 0.15;
export const AWAKEN_COMBO = 100;
// 小学校低学年でも1プレイのうちに FEVER に届くよう、1打で 5、単語クリアで 10 たまる
export const GAUGE_PER_KEY = 5;
export const GAUGE_PER_WORD = 10;
// ミスしてもゲージは 4分の3 残る
export const GAUGE_KEEP_ON_MISS = 0.75;
// ○コンボごとにカットインを出す
export const COMBO_CUTIN_EVERY = 10;
// ヒント（キーボード図）を出すまでの無入力時間と連続ミス数
export const HINT_IDLE_MS = 5000;
export const HINT_MISS_COUNT = 3;

export type TierLevel = 0 | 1 | 2 | 3 | 4;

export interface ComboTier {
  min: number;
  mult: number;
  level: TierLevel;
  shout: string; // 段階が上がったときに画面に出す言葉
}

export const COMBO_TIERS: ComboTier[] = [
  { min: 0, mult: 1.0, level: 0, shout: '' },
  { min: 5, mult: 1.2, level: 1, shout: 'ノリノリ！' },
  { min: 12, mult: 1.5, level: 2, shout: 'さけべ！！' },
  { min: 25, mult: 2.0, level: 3, shout: 'おどれ！！！' },
  { min: 50, mult: 3.0, level: 4, shout: 'かくせい！！！！' },
];

export const getComboTier = (combo: number): ComboTier => {
  let tier = COMBO_TIERS[0];
  for (const t of COMBO_TIERS) {
    if (combo >= t.min) tier = t;
  }
  return tier;
};

export const keyScore = (combo: number, fever: boolean, bonus: boolean = false): number =>
  Math.round(10 * getComboTier(combo).mult * (fever ? 2 : 1) * (bonus ? 2 : 1));

// 目安時間（1打鍵 1.2秒。低学年のペース）より速いほどスピードボーナスが最大 +50
export const wordScore = (keyCount: number, elapsedMs: number, perfect: boolean): number => {
  const target = Math.max(1, keyCount) * 1200;
  const speed = Math.round(50 * Math.max(0, Math.min(1, 1 - elapsedMs / (target * 2))));
  return 50 + speed + (perfect ? 30 : 0);
};

export const RANKS: Rank[] = ['C', 'B', 'A', 'S', 'SS', 'SSS', '∞'];

const BASE_THRESHOLDS: Record<Mode, number[]> = {
  practice: [0, 800, 1400, 2000, 2800, 3600, 6000],
  // B・A は、はじめての子（2秒に1打）でも ふつう で B に届く高さ
  arcade: [0, 400, 1200, 3000, 5000, 8000, 20000],
};

const DIFFICULTY_FACTOR: Record<Mode, Record<Difficulty, number>> = {
  practice: {
    [Difficulty.EASY]: 0.7,
    [Difficulty.NORMAL]: 1,
    [Difficulty.HARD]: 1.6,
    [Difficulty.MASTER]: 2.4,
    // かいわ は1問が「ふつう」に近い長さ（平均 6.7打。ふつう は 5.4打）
    [Difficulty.CONVERSATION]: 1.2,
  },
  // 長い単語ほど単語クリアの点が入る回数がへるので、むずかしいほど係数は小さい
  arcade: {
    [Difficulty.EASY]: 0.8,
    [Difficulty.NORMAL]: 1,
    [Difficulty.HARD]: 0.8,
    [Difficulty.MASTER]: 0.65,
    [Difficulty.CONVERSATION]: 0.9,
  },
};

// 係数では合わない組み合わせは、ここに直接書く。
// れんしゅう × かんたん は1問が 1〜3打で点の幅がせまいので、SS より上を届く高さにつめてある
const FIXED_THRESHOLDS: Partial<Record<`${Mode}_${Difficulty}`, number[]>> = {
  [`practice_${Difficulty.EASY}`]: [0, 560, 980, 1400, 1700, 2000, 2300],
};

export const getRankThresholds = (mode: Mode, difficulty: Difficulty): number[] =>
  FIXED_THRESHOLDS[`${mode}_${difficulty}`] ?? BASE_THRESHOLDS[mode].map(v => Math.round(v * DIFFICULTY_FACTOR[mode][difficulty]));

export const getRank = (score: number, mode: Mode, difficulty: Difficulty): Rank => {
  const th = getRankThresholds(mode, difficulty);
  let rank: Rank = 'C';
  th.forEach((v, i) => {
    if (score >= v) rank = RANKS[i];
  });
  return rank;
};

// 「あと○点で S ランク！」用。最高ランクなら null
export const getNextRank = (score: number, mode: Mode, difficulty: Difficulty): { rank: Rank; remain: number } | null => {
  const th = getRankThresholds(mode, difficulty);
  for (let i = 0; i < th.length; i++) {
    if (score < th[i]) return { rank: RANKS[i], remain: th[i] - score };
  }
  return null;
};
