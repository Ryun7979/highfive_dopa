
import { Difficulty, WordDefinition } from '../types';
import { getWordsByDifficulty as getDefaultWords } from '../constants';

const CUSTOM_WORDS_KEY = 'TYPING_MINI_CUSTOM_WORDS_V1';
const MAX_WORDS_PER_DIFFICULTY = 2000;

export type CustomWordMap = Record<Difficulty, WordDefinition[]>;

let mergedCache: Partial<Record<Difficulty, WordDefinition[]>> = {};

const getCustomWords = (): CustomWordMap | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(CUSTOM_WORDS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load custom words from storage', e);
    return null;
  }
};

export const clearWordCache = () => {
  mergedCache = {};
};

export const getAllWords = (difficulty: Difficulty): WordDefinition[] => {
  if (mergedCache[difficulty]) return mergedCache[difficulty]!;

  const defaults = getDefaultWords(difficulty);
  const customs = getCustomWords();
  
  const customList = customs?.[difficulty] || [];
  const seen = new Set(customList.map(w => w.text));
  
  const merged = [
    ...customList,
    ...defaults.filter(d => !seen.has(d.text))
  ].slice(0, MAX_WORDS_PER_DIFFICULTY * 2);

  mergedCache[difficulty] = merged;
  return merged;
};

export const exportWordsAsJson = (): string => {
  const currentData: Partial<CustomWordMap> = {};
  Object.values(Difficulty).forEach(diff => {
    currentData[diff] = getAllWords(diff);
  });
  return JSON.stringify(currentData, null, 2);
};

export const importWordsFromJson = (jsonString: string): { success: boolean; message: string } => {
  try {
    const data = JSON.parse(jsonString);
    const validatedData: Partial<CustomWordMap> = {};

    Object.values(Difficulty).forEach(diff => {
      if (Array.isArray(data[diff])) {
        validatedData[diff] = data[diff]
          .filter((w: any) => w?.text && typeof w.text === 'string')
          .map((w: any) => ({ text: w.text, romaji: w.romaji || "" }))
          .slice(0, MAX_WORDS_PER_DIFFICULTY);
      }
    });

    if (Object.keys(validatedData).length === 0) {
      return { success: false, message: '有効なデータが見つかりませんでした。' };
    }

    clearWordCache();

    try {
      localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(validatedData));
      return { success: true, message: 'インポートに成功しました！' };
    } catch (e) {
      return { success: false, message: 'ブラウザの保存容量がいっぱいです。' };
    }
  } catch (e) {
    return { success: false, message: 'ファイルの形式が正しくありません。' };
  }
};

export const resetCustomWords = () => {
  localStorage.removeItem(CUSTOM_WORDS_KEY);
  clearWordCache();
};
