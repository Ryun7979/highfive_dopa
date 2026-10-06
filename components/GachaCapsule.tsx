import React from 'react';

export type CapsuleMotion = 'drop' | 'shake' | 'stop' | 'up';

interface GachaCapsuleProps {
  tier: number;          // 色の段階（0: 白 / 1: 青 / 2: 金 / 3: にじ）
  motion: CapsuleMotion;
  calm?: boolean;        // 演出のつよさ「ひかえめ」。ゆれを小さくする
  className?: string;
}

// 上半分の色。Tailwind のクラスは完全な文字列で書く
const TOP_FILL = ['bg-slate-400', 'bg-neon-cyan', 'bg-neon-yellow', 'dopa-rainbow-fill'];
const SHAKE = ['hx-capsule-shake-0', 'hx-capsule-shake-1', 'hx-capsule-shake-2', 'hx-capsule-shake-3'];
const GLOW = ['', 'hx-capsule-glow-1', 'hx-capsule-glow-2', 'hx-capsule-glow-3'];

// カプセルの上半分・下半分（割れるときにも同じ絵を使う）
export const CapsuleTop: React.FC<{ tier: number }> = ({ tier }) => (
  <div className={`absolute inset-x-0 top-0 h-1/2 rounded-t-full border-[6px] border-neon-ink overflow-hidden ${TOP_FILL[tier]}`}>
    <div className="absolute left-[16%] top-[18%] w-[26%] h-[34%] rounded-full bg-white/80 -rotate-[28deg]" />
    <div className="absolute left-[46%] top-[14%] w-[9%] h-[14%] rounded-full bg-white/70" />
  </div>
);

export const CapsuleBottom: React.FC = () => (
  <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-full border-[6px] border-neon-ink bg-white overflow-hidden">
    <div className="absolute inset-x-0 bottom-0 h-[45%] bg-slate-300/70" />
  </div>
);

// ガチャのカプセル。見た目だけで、進行は GachaScreen が決める
const GachaCapsule: React.FC<GachaCapsuleProps> = ({ tier, motion, calm = false, className = '' }) => {
  const move =
    motion === 'drop' ? 'hx-capsule-drop'
    : motion === 'shake' ? `${SHAKE[tier]} ${calm ? 'hx-capsule-calm' : ''}`
    : '';
  return (
    <div className={`relative aspect-square ${className}`}>
      <div className={`absolute inset-0 ${move}`}>
        {/* 色が上がった瞬間にふくらんで光る。key で毎回やり直す */}
        <div key={tier} className={`absolute inset-0 rounded-full ${tier > 0 ? 'hx-capsule-up' : ''} ${GLOW[tier]}`}>
          <CapsuleBottom />
          <CapsuleTop tier={tier} />
          <div className="absolute inset-x-[-3%] top-1/2 -translate-y-1/2 h-[9%] rounded-full bg-neon-ink" />
        </div>
      </div>
    </div>
  );
};

export default GachaCapsule;
