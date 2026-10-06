// 途中で止められるタイマー。hold() のあいだは残り時間が減らず、release() で続きから数える。
// hold 中に start() したものは、release() されてから数えはじめる。
export interface HoldTimer {
  start: (ms: number, fn: () => void) => void;
  hold: () => void;
  release: () => void;
  clear: () => void;
}

export const createHoldTimer = (): HoldTimer => {
  let id: number | null = null;
  let left = 0;
  let endAt = 0;
  let fn: (() => void) | null = null;
  let held = false;

  const run = () => {
    endAt = Date.now() + left;
    id = window.setTimeout(() => {
      id = null;
      const f = fn;
      fn = null;
      f?.();
    }, left);
  };
  const clear = () => {
    if (id !== null) clearTimeout(id);
    id = null;
    fn = null;
  };

  return {
    start: (ms, f) => {
      clear();
      fn = f;
      left = ms;
      if (!held) run();
    },
    hold: () => {
      if (held) return;
      held = true;
      if (id === null) return;
      clearTimeout(id);
      id = null;
      left = Math.max(0, endAt - Date.now());
    },
    release: () => {
      if (!held) return;
      held = false;
      if (fn) run();
    },
    clear,
  };
};
