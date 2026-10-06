
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

/**
 * 単語リストから重複を避けてストリーム形式で返す
 */
export async function* streamGeneratedWords(
  difficulty: Difficulty,
  excludeWords: Set<string> = new Set(),
  count: number = TOTAL_QUESTIONS
): AsyncGenerator<WordDefinition> {
  const allWords = shuffleArray(getAllWords(difficulty));
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
    const reshuffled = shuffleArray(getAllWords(difficulty));
    for (const word of reshuffled) {
      if (yieldedCount >= count) break;
      yield word;
      yieldedCount++;
    }
  }
}
