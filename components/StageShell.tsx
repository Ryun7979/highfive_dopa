import React, { useEffect, useRef, useState } from 'react';

// 仮の画面の高さ。表示領域がこれより低いとき、ゲームをこの高さの画面に描いてから縮める（docs/spec.md §11.1 の下限）
export const STAGE_MIN_HEIGHT = 720;

// 枠（iframe）の中で動いているか。中ではふつうにゲームを出す
export const isInsideStage = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

// 表示領域が低すぎて、縮めて出す必要があるか（Windows の文字の大きさ 225% など）
export const needsStage = (): boolean => !isInsideStage() && window.innerHeight < STAGE_MIN_HEIGHT;

const measure = () => {
  // 裏で読みこまれて高さが 0 のあいだは等倍にしておく（表に出たときの resize で測りなおす）
  const scale = window.innerHeight > 0 ? Math.min(1, window.innerHeight / STAGE_MIN_HEIGHT) : 1;
  return { scale, width: window.innerWidth / scale, height: window.innerHeight / scale };
};

// 低い表示領域のための入れ物。同じページを広い枠の中に開き、全体を縮めて表示領域に収める。
// 枠の中は本物の広い画面として動く（vh・vw・画面幅の切り替えがそのまま効く）ので、ゲーム本体には手を入れない。
const StageShell: React.FC = () => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [box, setBox] = useState(measure);

  useEffect(() => {
    const onResize = () => setBox(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // キー入力は枠の中のゲームが受ける。外側に来たキーは中へ渡し、次からは中に直接届くようにする
  useEffect(() => {
    const focusFrame = () => frameRef.current?.contentWindow?.focus();
    const forward = (e: KeyboardEvent) => {
      const win = frameRef.current?.contentWindow as (Window & typeof globalThis) | null | undefined;
      if (!win) return;
      const copy = new win.KeyboardEvent(e.type, {
        key: e.key, code: e.code, repeat: e.repeat,
        ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
        bubbles: true, cancelable: true,
      });
      if (!win.dispatchEvent(copy)) e.preventDefault();
      win.focus();
    };
    window.addEventListener('focus', focusFrame);
    window.addEventListener('keydown', forward);
    window.addEventListener('keyup', forward);
    return () => {
      window.removeEventListener('focus', focusFrame);
      window.removeEventListener('keydown', forward);
      window.removeEventListener('keyup', forward);
    };
  }, []);

  return (
    <iframe
      ref={frameRef}
      src={window.location.href}
      title="はちゃめちゃタイプ"
      onLoad={() => frameRef.current?.contentWindow?.focus()}
      allow="autoplay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: box.width,
        height: box.height,
        border: 0,
        transform: `scale(${box.scale})`,
        transformOrigin: '0 0',
      }}
    />
  );
};

export default StageShell;
