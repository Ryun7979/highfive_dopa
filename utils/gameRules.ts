import { Difficulty, Mode, Rank } from '../types';

// 数値はすべて【仮】。P4 のテストプレイで決める（docs/spec.md §6.2 §6.3 §7）

export const ARCADE_SECONDS = 60;
export const ARCADE_WORD_POOL = 200;
export const FEVER_MAX = 100;
export const FEVER_SECONDS = 8;

export type TierLevel = 0 | 1 | 2 | 3 | 4;

export interface ComboTier {
  min: number;
  mult: number;
  level: TierLevel;
  shout: string; // 段階が上がったときに画面に出す言葉
}

export const COMBO_TIERS: ComboTier[] = [
  { min: 0, mult: 1.0, level: 0, shout: '' },
  { min: 10, mult: 1.2, level: 1, shout: 'ノリノリ！' },
  { min: 25, mult: 1.5, level: 2, shout: 'さけべ！！' },
  { min: 50, mult: 2.0, level: 3, shout: 'おどれ！！！' },
  { min: 100, mult: 3.0, level: 4, shout: 'かくせい！！！！' },
];

export const getComboTier = (combo: number): ComboTier => {
  let tier = COMBO_TIERS[0];
  for (const t of COMBO_TIERS) {
    if (combo >= t.min) tier = t;
  }
  return tier;
};

export const keyScore = (combo: number, fever: boolean): number =>
  Math.round(10 * getComboTier(combo).mult * (fever ? 2 : 1));

// 目安時間（1打鍵 450ms）より速いほどスピードボーナスが最大 +50
export const wordScore = (keyCount: number, elapsedMs: number, perfect: boolean): number => {
  const target = Math.max(1, keyCount) * 450;
  const speed = Math.round(50 * Math.max(0, Math.min(1, 1 - elapsedMs / (target * 2))));
  return 50 + speed + (perfect ? 30 : 0);
};

export const RANKS: Rank[] = ['C', 'B', 'A', 'S', 'SS', 'SSS', '∞'];

const BASE_THRESHOLDS: Record<Mode, number[]> = {
  practice: [0, 1200, 1700, 2200, 2700, 3300, 5000],
  arcade: [0, 2000, 4000, 7000, 11000, 16000, 30000],
};

const DIFFICULTY_FACTOR: Record<Mode, Record<Difficulty, number>> = {
  practice: {
    [Difficulty.EASY]: 0.7,
    [Difficulty.NORMAL]: 1,
    [Difficulty.HARD]: 1.6,
    [Difficulty.MASTER]: 2.4,
    [Difficulty.CONVERSATION]: 2.4,
  },
  arcade: {
    [Difficulty.EASY]: 0.8,
    [Difficulty.NORMAL]: 1,
    [Difficulty.HARD]: 1.1,
    [Difficulty.MASTER]: 1.2,
    [Difficulty.CONVERSATION]: 1.2,
  },
};

export const getRankThresholds = (mode: Mode, difficulty: Difficulty): number[] =>
  BASE_THRESHOLDS[mode].map(v => Math.round(v * DIFFICULTY_FACTOR[mode][difficulty]));

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
