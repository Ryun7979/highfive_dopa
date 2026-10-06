import { Difficulty, GameStats, Mode, Rank } from '../types';

// 保存データ（docs/spec.md §12.2）。v2 で成長（P2）と収集・継続（P3）の項目を足した。
// キー名は V1 のまま使い、中の version で形を見分ける（v1 の自己ベスト・設定はそのまま引き継ぐ）。
const SAVE_STORAGE_KEY = 'HIGHFIVE_DOPA_SAVE_V1';
const SAVE_VERSION = 2;

export type EffectLevel = 'low' | 'normal' | 'max';
export type TextSize = 'normal' | 'large' | 'max';
export type ScalePattern = 'doremi' | 'wafu' | 'game';
export type BreakMinutes = 0 | 15 | 30 | 45 | 60;
export type BestKey = `${Mode}_${Difficulty}`;

export interface BestRecord {
  score: number;
  rank: Rank;
  time?: number;
  trace?: number[]; // 1秒ごとのスコア（ゴースト対戦用）
}

export interface PlayerData {
  level: number;
  exp: number;   // 今のレベルになってからためた分
  sp: number;    // まだ使っていないスキルポイント
  coins: number;
  shards: number;
}

export interface DailyMissionState {
  id: string;
  progress: number;
  done: boolean;
}

export interface SaveData {
  version: number;
  player: PlayerData;
  bests: Partial<Record<BestKey, BestRecord>>;
  stats: { maxCombo: number; totalKeys: number; totalPlays: number };
  skills: string[];
  inventory: string[];
  equipped: { costume: string; effect: string; sound: string; bg: string };
  gacha: { pityCount: number };
  daily: { date: string; missions: DailyMissionState[]; bonusDone: boolean; streak: number; lastPlayDate: string };
  settings: { effectLevel: EffectLevel; textSize: TextSize; scale: ScalePattern; breakMinutes: BreakMinutes };
}

const defaultSave = (): SaveData => ({
  version: SAVE_VERSION,
  // はじめて遊ぶ人は、ガチャ1回ぶんのコインを持って始まる
  player: { level: 1, exp: 0, sp: 0, coins: 100, shards: 0 },
  bests: {},
  stats: { maxCombo: 0, totalKeys: 0, totalPlays: 0 },
  skills: [],
  inventory: [],
  equipped: { costume: 'costume_pink', effect: 'effect_star', sound: 'sound_pop', bg: 'bg_night' },
  gacha: { pityCount: 0 },
  daily: { date: '', missions: [], bonusDone: false, streak: 0, lastPlayDate: '' },
  settings: { effectLevel: 'max', textSize: 'normal', scale: 'doremi', breakMinutes: 30 },
});

export const loadSave = (): SaveData => {
  const base = defaultSave();
  if (typeof window === 'undefined') return base;
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 足りない項目は初期値で埋める（v1 → v2 の引き継ぎもこれで済む）
      return {
        ...base,
        ...parsed,
        version: SAVE_VERSION,
        player: { ...base.player, ...parsed.player },
        stats: { ...base.stats, ...parsed.stats },
        equipped: { ...base.equipped, ...parsed.equipped },
        gacha: { ...base.gacha, ...parsed.gacha },
        daily: { ...base.daily, ...parsed.daily },
        settings: { ...base.settings, ...parsed.settings },
      };
    }
  } catch (e) {
    console.warn('Failed to load save data', e);
  }
  return base;
};

const writeSave = (data: SaveData) => {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to write save data', e);
  }
};

// 読む → 書き換える → 保存する、を1か所にまとめる
export const mutateSave = (fn: (data: SaveData) => void): SaveData => {
  const data = loadSave();
  fn(data);
  writeSave(data);
  return data;
};

export const updateGameSettings = (patch: Partial<SaveData['settings']>): SaveData =>
  mutateSave(data => {
    data.settings = { ...data.settings, ...patch };
  });

export const getBest = (mode: Mode, difficulty: Difficulty): BestRecord | undefined =>
  loadSave().bests[`${mode}_${difficulty}`];

// プレイ結果を記録する。自己ベストを更新したら true
export const recordResult = (stats: GameStats, rank: Rank): boolean => {
  let isNewBest = false;
  mutateSave(data => {
    const key: BestKey = `${stats.mode}_${stats.difficulty}`;
    const prev = data.bests[key];
    isNewBest = !prev || stats.score > prev.score;
    if (isNewBest) {
      data.bests[key] = { score: stats.score, rank, time: stats.timeElapsed, trace: stats.trace };
    }
    data.stats = {
      maxCombo: Math.max(data.stats.maxCombo, stats.maxCombo),
      totalKeys: data.stats.totalKeys + stats.correctChars,
      totalPlays: data.stats.totalPlays + 1,
    };
  });
  return isNewBest;
};
