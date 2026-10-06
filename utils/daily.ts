import { GameStats } from '../types';
import { DailyMissionState, SaveData } from './saveData';

// デイリーミッション（docs/spec.md §9.2）。1日3つ、端末のローカル日付で入れ替わる。数値はすべて【仮】

type MissionKind = 'plays' | 'combo' | 'golden' | 'perfect' | 'keys' | 'fever' | 'score';

export interface MissionDef {
  id: string;
  kind: MissionKind;
  label: string;
  target: number;
  reward: { coins?: number; exp?: number };
}

export const MISSIONS: MissionDef[] = [
  { id: 'plays_3', kind: 'plays', label: '3かい あそぶ', target: 3, reward: { coins: 50 } },
  { id: 'plays_5', kind: 'plays', label: '5かい あそぶ', target: 5, reward: { coins: 80 } },
  { id: 'combo_20', kind: 'combo', label: '20コンボ だす', target: 20, reward: { exp: 80 } },
  { id: 'combo_50', kind: 'combo', label: '50コンボ だす', target: 50, reward: { coins: 80 } },
  { id: 'golden_1', kind: 'golden', label: 'ゴールデンを 1かい クリア', target: 1, reward: { coins: 60 } },
  { id: 'perfect_10', kind: 'perfect', label: 'PERFECT を 10かい', target: 10, reward: { coins: 50 } },
  { id: 'keys_200', kind: 'keys', label: '200もじ うつ', target: 200, reward: { exp: 100 } },
  { id: 'fever_2', kind: 'fever', label: 'FEVER に 2かい はいる', target: 2, reward: { coins: 50 } },
  { id: 'score_5000', kind: 'score', label: 'あわせて 5000てん とる', target: 5000, reward: { exp: 100 } },
];

const MISSION_BY_ID = new Map(MISSIONS.map(m => [m.id, m]));
export const getMission = (id: string): MissionDef | undefined => MISSION_BY_ID.get(id);

export const DAILY_COUNT = 3;
export const ALL_CLEAR_COINS = 100;  // 3つ全部できたときのボーナス
export const STREAK_EVERY = 7;       // ○日つづけるごとに
export const STREAK_COINS = 200;     // もらえるごほうび

const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const prevDateKey = (d: Date): string => dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));

// 日付の文字列から決まる乱数（同じ日は何度開いても同じミッションになる）
const seededRandom = (seed: string): (() => number) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
};

// その日のミッション。同じ種類（kind）は重ならないように選ぶ
export const pickMissions = (date: string): MissionDef[] => {
  const rnd = seededRandom(date);
  const pool = [...MISSIONS];
  const picked: MissionDef[] = [];
  while (picked.length < DAILY_COUNT && pool.length > 0) {
    const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    if (!picked.some(p => p.kind === m.kind)) picked.push(m);
  }
  return picked;
};

// 日付が変わっていたら、ミッションを入れ替える
export const refreshDaily = (data: SaveData, now: Date = new Date()): void => {
  const today = dateKey(now);
  if (data.daily.date === today && data.daily.missions.length > 0) return;
  data.daily.date = today;
  data.daily.missions = pickMissions(today).map(m => ({ id: m.id, progress: 0, done: false }));
  data.daily.bonusDone = false;
};

// 表示用の連続日数。きのうもきょうも遊んでいなければ 0（罰はなく、また 1 から数えなおすだけ）
export const currentStreak = (daily: SaveData['daily'], now: Date = new Date()): number =>
  daily.lastPlayDate === dateKey(now) || daily.lastPlayDate === prevDateKey(now) ? daily.streak : 0;

const advance = (kind: MissionKind, progress: number, stats: GameStats): number => {
  switch (kind) {
    case 'plays': return progress + 1;
    case 'combo': return Math.max(progress, stats.maxCombo);
    case 'golden': return progress + stats.goldenCleared;
    case 'perfect': return progress + stats.perfectWords;
    case 'keys': return progress + stats.correctChars;
    case 'fever': return progress + stats.feverCount;
    case 'score': return progress + stats.score;
  }
};

export interface DailyResult {
  missions: (DailyMissionState & { justDone: boolean })[];
  allClear: boolean;    // このプレイで3つ全部そろった
  streak: number;
  streakUp: boolean;    // このプレイで連続日数がのびた
  streakReward: boolean;
  coins: number;        // このプレイでもらえたコイン（ミッション＋全達成＋連続日数）
  exp: number;
}

// 1プレイ分をミッションと連続日数に反映する。コインはここで足し、EXP は呼ぶ側がレベル計算に通す
export const applyDailyPlay = (data: SaveData, stats: GameStats, now: Date = new Date()): DailyResult => {
  refreshDaily(data, now);
  const daily = data.daily;
  const today = dateKey(now);
  let coins = 0;
  let exp = 0;

  const missions = daily.missions.map(state => {
    const def = MISSION_BY_ID.get(state.id);
    if (!def || state.done) return { ...state, justDone: false };
    state.progress = Math.min(def.target, advance(def.kind, state.progress, stats));
    state.done = state.progress >= def.target;
    if (state.done) {
      coins += def.reward.coins ?? 0;
      exp += def.reward.exp ?? 0;
    }
    return { ...state, justDone: state.done };
  });

  const allClear = !daily.bonusDone && daily.missions.length > 0 && daily.missions.every(m => m.done);
  if (allClear) {
    daily.bonusDone = true;
    coins += ALL_CLEAR_COINS;
  }

  const streakUp = daily.lastPlayDate !== today;
  if (streakUp) {
    daily.streak = daily.lastPlayDate === prevDateKey(now) ? daily.streak + 1 : 1;
    daily.lastPlayDate = today;
  }
  const streakReward = streakUp && daily.streak % STREAK_EVERY === 0;
  if (streakReward) coins += STREAK_COINS;

  data.player.coins += coins;
  return { missions, allClear, streak: daily.streak, streakUp, streakReward, coins, exp };
};
