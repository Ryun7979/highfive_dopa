import React, { useRef, useState } from 'react';
import { ArrowLeft, Check, Gem, Gift, Lock } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { SHARDS_TO_EXCHANGE, exchangeShards } from '../utils/gacha';
import { CATEGORIES, ITEMS, ItemDef, equipItem, equippedItem, isOwned } from '../utils/items';
import { EffectLevel, loadSave } from '../utils/saveData';
import DopaBackground from './DopaBackground';
import FitScreen from './FitScreen';
import EffectCanvas, { EffectHandle } from './EffectCanvas';
import ItemIcon, { RarityBadge } from './ItemIcon';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

interface CollectionScreenProps {
  effectLevel?: EffectLevel;
  onBack: () => void;
  onOpenGacha: () => void;
}

// 図鑑（docs/spec.md §9.1）。カテゴリ別の収集数、未入手はシルエット、持っているものは押して装備
const CollectionScreen: React.FC<CollectionScreenProps> = ({ effectLevel = 'max', onBack, onOpenGacha }) => {
  const [save, setSave] = useState(() => loadSave());
  const fxRef = useRef<EffectHandle>(null);
  const rabbitRef = useRef<RabidopaHandle>(null);
  const calm = effectLevel === 'low';
  const { player, inventory, equipped } = save;
  const canExchange = player.shards >= SHARDS_TO_EXCHANGE;
  const ownedTotal = ITEMS.filter(i => isOwned(i.id, inventory)).length;

  // 装備したものをその場でためす
  const tryOut = (item: ItemDef, e: React.MouseEvent) => {
    rabbitRef.current?.play('clear');
    if (item.category === 'sound') {
      audioManager.setTypeVoice(item.voice);
      [1, 2, 3, 4, 5].forEach((n, i) => window.setTimeout(() => audioManager.playTypeNote(n), i * 110));
    } else {
      audioManager.playSelect();
    }
    // 色表の切り替えが描画に乗ってから、はじけさせる
    const x = e.clientX, y = e.clientY;
    window.setTimeout(() => {
      fxRef.current?.burst(x, y, calm ? 20 : 50, 1.2);
      fxRef.current?.ring(x, y);
    }, 30);
  };

  const handleItem = (item: ItemDef, e: React.MouseEvent) => {
    if (isOwned(item.id, inventory)) {
      setSave(equipItem(item.id));
      tryOut(item, e);
      return;
    }
    if (!canExchange) {
      audioManager.playCancel();
      return;
    }
    // かけらと交換して、そのまま装備する
    exchangeShards(item.id);
    setSave(equipItem(item.id));
    audioManager.playUnlock();
    fxRef.current?.confetti(calm ? 20 : 70);
    fxRef.current?.firework();
    tryOut(item, e);
  };

  // 操作ボタンは画面の下に固定する（中身がスクロールになっても押せるように）
  const footer = (
    <>
      <button onClick={() => { audioManager.playCancel(); onBack(); }} className="hx-btn hx-red px-12 py-3 text-2xl md:text-3xl">
        <span className="hx-btn-in whitespace-nowrap">
          <ArrowLeft className="w-8 h-8 mr-3" strokeWidth={3} />
          <span className="hx-sticker">もどる</span>
        </span>
      </button>
      <button onClick={() => { audioManager.playSelect(); onOpenGacha(); }} className="hx-btn hx-yellow px-7 py-3 text-xl md:text-2xl">
        <span className="hx-btn-in whitespace-nowrap">
          <Gift className="w-7 h-7 mr-2" strokeWidth={3} />
          ガチャへ
        </span>
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DopaBackground level={0} calm={calm} theme={equipped.bg} />
      <EffectCanvas ref={fxRef} maxParticles={calm ? 150 : 300} ambient={calm ? 0 : 8} effect={equipped.effect} />
      <FitScreen className="relative z-30 animate-fade-in font-pop" footer={footer} innerClassName="flex flex-col items-center p-5 pt-10 md:p-8 md:pt-12">
        <div className="hx-panel w-full max-w-7xl my-auto p-5 md:p-8" style={{ '--edge': 'var(--cyan)' } as React.CSSProperties}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-2xl px-12 py-2 shadow-[8px_9px_0_#0B0320] whitespace-nowrap">
              <h2 className="hx-unskew hx-sticker text-white text-3xl md:text-5xl tracking-wider leading-none">ずかん</h2>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
            <Rabidopa ref={rabbitRef} anim="groove" costume={equipped.costume} className="w-[90px] h-[88px] md:w-[130px] md:h-[126px] -my-4" />
            <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--yellow)' } as React.CSSProperties}>
              <div className="hx-unskew flex items-center gap-2">
                <span className="text-lg md:text-xl text-neon-yellow whitespace-nowrap">あつめた かず</span>
                <span className="hx-num text-3xl md:text-4xl text-white whitespace-nowrap">{ownedTotal}/{ITEMS.length}</span>
              </div>
            </div>
            <div className={canExchange && !calm ? 'dopa-throb' : ''}>
              <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--cyan)' } as React.CSSProperties}>
                <div className="hx-unskew flex items-center gap-2">
                  <Gem className="w-7 h-7 text-neon-cyan" strokeWidth={3} />
                  <span className="text-lg md:text-xl text-neon-cyan whitespace-nowrap">かけら</span>
                  <span className="hx-num text-3xl md:text-4xl text-white">{player.shards}</span>
                </div>
              </div>
            </div>
            <div className="text-base md:text-lg text-white/80">
              {canExchange ? `「？」を おすと かけら ${SHARDS_TO_EXCHANGE}こで こうかん できるよ！` : `もってる ものを おすと つけかえ。かけら ${SHARDS_TO_EXCHANGE}こで すきな ものと こうかん`}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {CATEGORIES.map(cat => {
              const items = ITEMS.filter(i => i.category === cat.id);
              const owned = items.filter(i => isOwned(i.id, inventory)).length;
              const current = equippedItem(cat.id, equipped, inventory);
              return (
                <div key={cat.id} className="bg-neon-ink/50 rounded-2xl border-4 border-neon-ink p-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="hx-tag px-4 py-0.5" style={{ '--edge': 'var(--pink)' } as React.CSSProperties}>
                      <span className="hx-unskew text-xl md:text-2xl text-white">{cat.label}</span>
                    </div>
                    <span className="hx-num text-xl md:text-2xl text-neon-yellow">{owned}/{items.length}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {items.map(item => {
                      const has = isOwned(item.id, inventory);
                      const isOn = current.id === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={(e) => handleItem(item, e)}
                          className={`relative flex flex-col items-center rounded-2xl border-4 p-1.5 transition-transform hover:scale-105 active:scale-95 ${isOn ? 'border-neon-yellow bg-neon-panel shadow-[0_0_18px_#FFE600]' : has ? 'border-neon-ink bg-neon-panel' : 'border-neon-ink bg-neon-ink/70'}`}
                        >
                          <ItemIcon item={item} locked={!has} className="w-full" />
                          <RarityBadge rarity={item.rarity} className="absolute top-1 left-1 text-xs md:text-sm" />
                          <span className={`mt-1 text-sm md:text-base leading-tight whitespace-nowrap ${has ? 'text-white' : 'text-white/50'}`}>{has ? item.label : '？？？'}</span>
                          <span className="mt-0.5 h-6 flex items-center justify-center text-xs md:text-sm whitespace-nowrap">
                            {isOn ? (
                              <span className="flex items-center gap-0.5 text-neon-lime"><Check size={16} strokeWidth={4} />つけてる</span>
                            ) : has ? (
                              <span className="text-white/70">つける</span>
                            ) : canExchange ? (
                              <span className="flex items-center gap-0.5 text-neon-cyan"><Gem size={14} strokeWidth={3} />こうかん</span>
                            ) : (
                              <Lock className="text-white/40" size={16} strokeWidth={3} />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FitScreen>
    </div>
  );
};

export default CollectionScreen;
