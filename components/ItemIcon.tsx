import React from 'react';
import { Music, Star } from 'lucide-react';
import { ItemDef, Rarity } from '../utils/items';
import Rabidopa from './Rabidopa';

// レア度ごとの色。Tailwind のクラスは完全な文字列で書く
export const RARITY_STYLE: Record<Rarity, { fill: string; text: string; edge: string }> = {
  N: { fill: 'bg-slate-400', text: 'text-slate-200', edge: '#94A3B8' },
  R: { fill: 'bg-neon-cyan', text: 'text-neon-cyan', edge: 'var(--cyan)' },
  SR: { fill: 'bg-neon-yellow', text: 'text-neon-yellow', edge: 'var(--yellow)' },
  SSR: { fill: 'dopa-rainbow-fill', text: 'text-neon-pink', edge: 'var(--pink)' },
};

export const RarityBadge: React.FC<{ rarity: Rarity; className?: string }> = ({ rarity, className = '' }) => (
  <span className={`hx-num inline-block ${RARITY_STYLE[rarity].fill} text-neon-ink border-[3px] border-neon-ink rounded-lg px-2 leading-tight ${className}`}>
    {rarity}
  </span>
);

const STAR_SPOTS = [
  { left: '50%', top: '46%', size: '46%' },
  { left: '22%', top: '26%', size: '26%' },
  { left: '78%', top: '24%', size: '22%' },
  { left: '24%', top: '76%', size: '20%' },
  { left: '76%', top: '74%', size: '28%' },
];

interface ItemIconProps {
  item: ItemDef;
  locked?: boolean; // 未入手。シルエットで見せる
  className?: string;
}

// アイテムの見た目。素材がまだ無いので、すべてコードで描く（図鑑・ガチャで共用）
const ItemIcon: React.FC<ItemIconProps> = ({ item, locked = false, className = '' }) => {
  let body: React.ReactNode = null;
  if (item.category === 'costume') {
    body = <Rabidopa costume={item.id} anim="idle" className="absolute inset-0 scale-[1.45] origin-bottom" />;
  } else if (item.category === 'effect') {
    const colors = item.colors ?? ['#FFFFFF'];
    body = STAR_SPOTS.map((s, i) => (
      <Star
        key={i}
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: s.left, top: s.top, width: s.size, height: s.size, color: colors[i % colors.length] }}
        fill="currentColor"
        stroke="#FFFFFF"
        strokeWidth={1.5}
      />
    ));
  } else if (item.category === 'sound') {
    body = (
      <div className="absolute inset-[12%] rounded-full bg-neon-ink border-4 flex items-center justify-center" style={{ borderColor: item.tint ?? '#FFFFFF' }}>
        <Music className="w-3/5 h-3/5" style={{ color: item.tint ?? '#00F0FF' }} strokeWidth={3} />
      </div>
    );
  } else {
    body = (
      <div className={`absolute inset-[8%] rounded-xl border-4 border-neon-ink overflow-hidden bg-neon-night dopa-bg-0 ${item.bgClass ?? ''}`}>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-neon-cyan/70 to-transparent" />
      </div>
    );
  }
  return (
    <div className={`relative aspect-square ${className}`}>
      <div className="absolute inset-0" style={locked ? { filter: 'brightness(0)', opacity: 0.55 } : undefined}>{body}</div>
      {locked && <span className="absolute inset-0 flex items-center justify-center hx-num hx-sticker text-white text-4xl md:text-5xl">?</span>}
    </div>
  );
};

export default ItemIcon;
