
export enum GameState {
  TITLE = 'TITLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  RESULT = 'RESULT',
  DEV_SETTINGS = 'DEV_SETTINGS',
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  MASTER = 'MASTER',
  CONVERSATION = 'CONVERSATION'
}

export interface GameStats {
  correctChars: number;
  missedChars: number;
  timeElapsed: number; // in milliseconds
  difficulty: Difficulty;
}

export interface WordDefinition {
  text: string;
  romaji: string;
}