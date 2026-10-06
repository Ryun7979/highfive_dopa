// 休けいお知らせ（docs/spec.md §10）。続けて遊んだ時間を数え、プレイが終わったときにだけ知らせる。
// ページを開いているあいだだけ覚えておけばよいので、保存はしない。

// これより長く間があいたら、休けいしたとみなして数えなおす
export const BREAK_RESET_MS = 5 * 60 * 1000;

let spanStart: number | null = null; // 続けて遊びはじめた時刻
let lastEnd = 0;                     // 最後にプレイが終わった時刻

export const notePlayStart = (now: number = Date.now()): void => {
  if (spanStart === null || now - lastEnd > BREAK_RESET_MS) spanStart = now;
};

// プレイが終わったときに呼ぶ。設定の分数を超えていたら true を返し、数えなおす
export const checkBreak = (minutes: number, now: number = Date.now()): boolean => {
  lastEnd = now;
  if (minutes <= 0 || spanStart === null) return false;
  if (now - spanStart < minutes * 60 * 1000) return false;
  spanStart = null;
  return true;
};

export const resetBreakTimer = (): void => {
  spanStart = null;
  lastEnd = 0;
};
