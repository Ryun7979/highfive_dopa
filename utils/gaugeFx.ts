// FEVER ゲージが増えた・減ったときの見た目（docs/spec.md §6.3）。
// ゲージの数値や進み方には触れない。DOM に直接アニメを当てるだけで、React の再描画にも乗せない。
//
// wrap はゲージ（.hx-gauge）を1つだけ包む、傾いていない入れ物。
// ゲージ本体は skewX で傾けてあり overflow: hidden なので、ゆれ・はみ出す枠・数字は入れ物のほうに付ける。

export type GaugeFxKind = 'gain' | 'max' | 'loss';

export interface GaugeFxOptions {
  label: string;     // とび出す文字（「+3」「MAX!!」「-10」）
  pct: number;       // いまのゲージ（0〜100）。文字を出す横位置
  fromPct?: number;  // loss：減る前のゲージ。減った分が赤く残って消える
  big?: boolean;     // 単語クリアなど、大きめに出す
  calm?: boolean;    // 演出ひかえめ：ゆれ・光・枠の広がりを出さない（文字と赤い残りだけ）
}

const COLOR: Record<GaugeFxKind, string> = { gain: '#B6FF00', max: '#FFE600', loss: '#FF2440' };
const SKEW = 'skewX(-14deg)'; // .hx-gauge と同じ傾き

const clamp = (v: number) => Math.max(0, Math.min(100, v));

// ゲージに重ねて出す数字。増えたときは上へはねて消え、減ったときは落ちて消える。
// すぐ上の出題エリアに入りこまないよう、ゲージの高さの中で動かす（位置は自分の高さに対する割合）
const floater = (wrap: HTMLElement, kind: GaugeFxKind, o: GaugeFxOptions) => {
  const el = document.createElement('span');
  el.className = 'hx-num hx-sticker dopa-gauge-float';
  el.textContent = o.label;
  el.style.left = `${clamp(o.pct)}%`;
  el.style.color = COLOR[kind];
  el.style.fontSize = kind === 'max' || o.big ? 'clamp(1.7rem, 3.4vw, 2.8rem)' : 'clamp(1.4rem, 2.8vw, 2.3rem)';
  wrap.appendChild(el);
  const dx = Math.round((Math.random() * 2 - 1) * 16);
  const tilt = (Math.random() * 2 - 1) * 10;
  const frames = kind === 'loss'
    ? [
        { transform: `translate(calc(-50% + ${dx}px), -85%) scale(1.5) rotate(${tilt}deg)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), -50%) scale(1.1) rotate(${tilt}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(calc(-50% + ${dx}px), -15%) scale(0.9) rotate(${tilt * 2}deg)`, opacity: 0 },
      ]
    : [
        { transform: `translate(calc(-50% + ${dx}px), -30%) scale(0.4) rotate(${tilt}deg)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), -60%) scale(${kind === 'max' ? 1.5 : 1.25}) rotate(${-tilt}deg)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${dx}px), -85%) scale(1) rotate(0deg)`, opacity: 0 },
      ];
  el.animate(frames, { duration: kind === 'gain' ? 480 : 620, easing: 'ease-out' }).onfinish = () => el.remove();
};

// 満タンからさらに増えたとき：枠がひとまわり外へ広がって消える
const shockwave = (wrap: HTMLElement) => {
  const el = document.createElement('div');
  el.className = 'dopa-gauge-wave';
  wrap.appendChild(el);
  el.animate(
    [
      { transform: `${SKEW} scale(1, 1)`, opacity: 0.95 },
      { transform: `${SKEW} scale(1.1, 2.6)`, opacity: 0 },
    ],
    { duration: 380, easing: 'ease-out' }
  ).onfinish = () => el.remove();
};

export const playGaugeFx = (wrap: HTMLElement | null, kind: GaugeFxKind, o: GaugeFxOptions): void => {
  if (!wrap) return;
  floater(wrap, kind, o);

  // 減った分が赤く残り、ちぢみながら消える
  if (kind === 'loss' && o.fromPct !== undefined) {
    wrap.querySelector<HTMLElement>('.dopa-gauge-trail')?.animate(
      [
        { width: `${clamp(o.fromPct)}%`, opacity: 1 },
        { width: `${clamp(o.fromPct)}%`, opacity: 1, offset: 0.3 },
        { width: `${clamp(o.pct)}%`, opacity: 0 },
      ],
      { duration: 480, easing: 'ease-in' }
    );
  }
  if (o.calm) return;

  // ゲージの中が光る（増えたら白〜黄、減ったら赤）
  const shine = wrap.querySelector<HTMLElement>('.dopa-gauge-shine');
  if (shine) {
    shine.style.background = kind === 'loss' ? COLOR.loss : kind === 'max' ? '#FFFFFF' : '#FFFDE0';
    shine.animate(
      [{ opacity: kind === 'gain' ? 0.6 : 0.95 }, { opacity: 0 }],
      { duration: kind === 'gain' ? 150 : 260, easing: 'ease-out' }
    );
  }

  if (kind === 'loss') {
    // ガタガタゆれる
    wrap.animate(
      [0, -11, 9, -6, 4, 0].map(x => ({ transform: `translateX(${x}px)` })),
      { duration: 260 }
    );
    return;
  }
  // ふくらんで戻る。満タンのときは大きくふくらみ、枠が外へ広がる
  const sy = kind === 'max' ? 1.55 : o.big ? 1.4 : 1.25;
  const sx = kind === 'max' ? 1.05 : 1.03;
  wrap.animate(
    [{ transform: `scale(${sx}, ${sy})`, filter: 'brightness(1.6)' }, { transform: 'scale(1, 1)', filter: 'brightness(1)' }],
    { duration: kind === 'max' ? 200 : 140, easing: 'ease-out' }
  );
  if (kind === 'max') shockwave(wrap);
};
