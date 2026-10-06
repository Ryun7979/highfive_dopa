// ガチャの演出の台本（docs/spec.md §9.1）。見せ方だけを決める。中身（utils/gacha.ts）には触れない
// カプセルが落ちる → ゆれる → 色が1段ずつ上がる → 止まる → 開く、の「ゆれる〜止まる」をここで組み立てる

export type GachaStepType = 'shake' | 'stop' | 'up';

export interface GachaStep {
  type: GachaStepType; // shake: ゆれる / stop: ピタッと止まる / up: 色が tier に上がる
  tier: number;        // そのときのカプセルの色（0: 白 / 1: 青 / 2: 金 / 3: にじ）
  ms: number;
}

export const GACHA_DROP_MS = 500;    // カプセルが落ちてくる
export const GACHA_CUTIN_MS = 1300;  // SSR の全画面カットイン
const UP_SHAKE_MS = [1000, 850, 700];  // 色が上がる前のゆれ（1段め・2段め・3段め。だんだん短くたたみかける）
const UP_MS = 250;                   // 色が上がる瞬間
const LAST_SHAKE_MS = 600;           // 最後の色でのゆれ
const N_SHAKE_MS = 900;              // 白のまま終わるときのゆれ
const N_LONG_SHAKE_MS = 1800;        // 白のまま長くゆれる（長さだけで結果が読めないように）
const FEINT_MS = 600;                // 「止まった…」と見せる時間
const FEINT_RATE = 1 / 3;            // R 以上で、最後の1段の前にフェイントが入る割合
const N_LONG_RATE = 1 / 4;

// level はレア度の番号（N: 0 〜 SSR: 3）
export const buildGachaShow = (level: number, rnd: () => number = Math.random): GachaStep[] => {
  const steps: GachaStep[] = [];
  const feint = level >= 1 && rnd() < FEINT_RATE;
  for (let tier = 1; tier <= level; tier++) {
    steps.push({ type: 'shake', tier: tier - 1, ms: UP_SHAKE_MS[tier - 1] });
    if (feint && tier === level) steps.push({ type: 'stop', tier: tier - 1, ms: FEINT_MS });
    steps.push({ type: 'up', tier, ms: UP_MS });
  }
  const last = level > 0 ? LAST_SHAKE_MS : rnd() < N_LONG_RATE ? N_LONG_SHAKE_MS : N_SHAKE_MS;
  steps.push({ type: 'shake', tier: level, ms: last });
  // 開く前のため。当たりほど長く待たせる
  steps.push({ type: 'stop', tier: level, ms: 450 + level * 150 });
  return steps;
};

// 落下から開くまでの長さ（SSR のカットインは含まない）
export const gachaShowLength = (steps: GachaStep[]): number =>
  GACHA_DROP_MS + steps.reduce((sum, s) => sum + s.ms, 0);
