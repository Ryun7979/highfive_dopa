
export enum GameState {
  TITLE = 'TITLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  RESULT = 'RESULT',
  DEV_SETTINGS = 'DEV_SETTINGS',
  SKILL_TREE = 'SKILL_TREE',
  OPTIONS = 'OPTIONS',
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  MASTER = 'MASTER',
  CONVERSATION = 'CONVERSATION'
}

// 練習モード（10問固定）／アーケードモード（60秒タイムアタック）
export type Mode = 'practice' | 'arcade';

export type Rank = 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | '∞';

export interface GameStats {
  correctChars: number;
  missedChars: number;
  timeElapsed: number; // in milliseconds
  difficulty: Difficulty;
  mode: Mode;
  score: number;
  maxCombo: number;
  wordsCleared: number;
  perfectWords: number;
  feverCount: number;
  bonusScore: number;    // ボーナスタイム中にかせいだスコア（コインが ×2 になる分）
  goldenCleared: number; // クリアしたゴールデンワードの数
  trace: number[];       // 1秒ごとのスコア（ゴースト対戦用）
}

export interface WordDefinition {
  text: string;
  romaji: string;
}
