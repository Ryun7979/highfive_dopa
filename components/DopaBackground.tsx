import React, { useState } from 'react';
import { getEquipped, getItem } from '../utils/items';
import { TierLevel } from '../utils/gameRules';

interface DopaBackgroundProps {
  level?: TierLevel; // コンボ段階。上がるほど色が派手に、流れが速くなる
  fever?: boolean;
  calm?: boolean;    // 演出のつよさ「ひかえめ」。動きを止める
  theme?: string;    // 背景のアイテム ID。省くと、いま装備している背景
}

const BG_CLASS = ['dopa-bg-0', 'dopa-bg-1', 'dopa-bg-2', 'dopa-bg-3', 'dopa-bg-4'];
const SPIN_SECONDS = [48, 24, 12, 7, 4];
const SLIDE_SECONDS = [4, 2, 1, 0.6, 0.35];
// 背景をのぼっていく文字と星
const GLYPHS = ['A', '★', 'あ', 'K', '!', '♪', 'S', '★', 'ん', 'T', '?', '♪', 'E', '★', 'か', 'Y'];

// 背景レイヤー。夜色の上に、放射状の光・ななめストライプ・網点・奥へ流れるネオンの床を重ねる。
const DopaBackground: React.FC<DopaBackgroundProps> = ({ level = 0, fever = false, calm = false, theme }) => {
  const [equipped] = useState(() => getEquipped('bg'));
  const themeClass = ((theme && getItem(theme)) || equipped).bgClass ?? '';
  const style = {
    '--spin': `${fever ? 3 : SPIN_SECONDS[level]}s`,
    '--slide': `${fever ? 0.3 : SLIDE_SECONDS[level]}s`,
  } as React.CSSProperties;

  // 背景の文字はコンボ段階が上がるほど速くのぼる
  const speed = fever ? 0.25 : [1, 0.7, 0.5, 0.35, 0.25][level];

  return (
    <div className={`dopa-bg ${fever ? 'dopa-bg-fever' : BG_CLASS[level]} ${themeClass} ${calm ? 'dopa-calm' : ''}`} style={style} aria-hidden>
      <div className="dopa-sunburst" />
      <div className="dopa-stripes" />
      <div className="dopa-dots" />
      <div className="dopa-floor" />
      {GLYPHS.map((ch, i) => (
        <span
          key={i}
          className="dopa-glyph"
          style={{
            left: `${(i * 37 + 5) % 96}%`,
            fontSize: `${4 + (i % 4) * 2.5}vh`,
            '--d': `${(7 + (i % 5) * 2.2) * speed}s`,
            animationDelay: `${-(i * 1.3)}s`,
          } as React.CSSProperties}
        >
          {ch}
        </span>
      ))}
      {(level >= 3 || fever) && <div className="dopa-vignette" />}
    </div>
  );
};

export default DopaBackground;
