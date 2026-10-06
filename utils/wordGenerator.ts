
import { Difficulty, WordDefinition } from "../types";
import { TOTAL_QUESTIONS } from "../constants";
import { getAllWords } from "./wordListManager";

/**
 * AIステータス（現在は常にOFFLINE固定）
 */
export const getAIStatus = () => {
  return {
    isOffline: true,
    status: 'OFFLINE',
  };
};

/**
 * 通信テスト（現在は不要なため常にfalse/互換性のために残す）
 */
export const testAIConnection = async (): Promise<boolean> => {
  return false;
};

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

// 濁音・半濁音・拗音（小さい ゃゅょ）をふくむ文字
const VOICED_OR_YOON = /[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょ]/;
export const isVoicedOrYoon = (text: string): boolean => VOICED_OR_YOON.test(text);

// 「かんたん」で、濁音・半濁音・拗音を清音の何倍 出やすくするか
const EASY_FOCUS_WEIGHT = 3;

/**
 * 重みつきシャッフル。重みが大きいものほど前に来やすい（同じものは2度出ない）
 */
export function weightedShuffle<T>(
  array: T[],
  weightOf: (item: T) => number,
  rnd: () => number = Math.random
): T[] {
  return array
    .map(item => ({ item, key: Math.pow(rnd(), 1 / weightOf(item)) }))
    .sort((a, b) => b.key - a.key)
    .map(x => x.item);
}

// 出題順。「かんたん」だけ濁音・半濁音・拗音を多めにする
function orderWords(difficulty: Difficulty): WordDefinition[] {
  const words = getAllWords(difficulty);
  if (difficulty !== Difficulty.EASY) return shuffleArray(words);
  return weightedShuffle(words, w => (isVoicedOrYoon(w.text) ? EASY_FOCUS_WEIGHT : 1));
}

/**
 * 単語リストから重複を避けてストリーム形式で返す
 */
export async function* streamGeneratedWords(
  difficulty: Difficulty,
  excludeWords: Set<string> = new Set(),
  count: number = TOTAL_QUESTIONS
): AsyncGenerator<WordDefinition> {
  const allWords = orderWords(difficulty);
  let yieldedCount = 0;

  for (const word of allWords) {
    if (yieldedCount >= count) break;

    if (!excludeWords.has(word.text)) {
      yield word;
      yieldedCount++;
    }
  }

  // もしリストが足りない場合は、除外ワードを無視して再度シャッフルして補填
  if (yieldedCount < count) {
    const reshuffled = orderWords(difficulty);
    for (const word of reshuffled) {
      if (yieldedCount >= count) break;
      yield word;
      yieldedCount++;
    }
  }
}
