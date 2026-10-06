import React from 'react';
import { TierLevel } from '../utils/gameRules';

interface DopaBackgroundProps {
  level?: TierLevel; // コンボ段階。上がるほど色が派手に、流れが速くなる
  fever?: boolean;
  calm?: boolean;    // 演出のつよさ「ひかえめ」。動きを止める
}

const BG_CLASS = ['dopa-bg-0', 'dopa-bg-1', 'dopa-bg-2', 'dopa-bg-3', 'dopa-bg-4'];
const SPIN_SECONDS = [48, 24, 12, 7, 4];
const SLIDE_SECONDS = [4, 2, 1, 0.6, 0.35];

// 背景レイヤー。夜色の上に、放射状の光・ななめストライプ・網点・奥へ流れるネオンの床を重ねる。
const DopaBackground: React.FC<DopaBackgroundProps> = ({ level = 0, fever = false, calm = false }) => {
  const style = {
    '--spin': `${fever ? 3 : SPIN_SECONDS[level]}s`,
    '--slide': `${fever ? 0.3 : SLIDE_SECONDS[level]}s`,
  } as React.CSSProperties;

  return (
    <div className={`dopa-bg ${fever ? 'dopa-bg-fever' : BG_CLASS[level]} ${calm ? 'dopa-calm' : ''}`} style={style} aria-hidden>
      <div className="dopa-sunburst" />
      <div className="dopa-stripes" />
      <div className="dopa-dots" />
      <div className="dopa-floor" />
      {(level >= 3 || fever) && <div className="dopa-vignette" />}
    </div>
  );
};

export default DopaBackground;
