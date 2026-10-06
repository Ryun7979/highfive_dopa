import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Coins, Gem, Gift } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { GACHA_COST, GACHA_PITY, GACHA_RATES, GachaResult, SHARDS_TO_EXCHANGE, pullGacha } from '../utils/gacha';
import { RARITIES } from '../utils/items';
import { EffectLevel, loadSave } from '../utils/saveData';
import DopaBackground from './DopaBackground';
import FitScreen from './FitScreen';
import EffectCanvas, { EffectHandle } from './EffectCanvas';
import ItemIcon, { RARITY_STYLE, RarityBadge } from './ItemIcon';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

interface GachaScreenProps {
  effectLevel?: EffectLevel;
  onBack: () => void;
  onOpenCollection: () => void;
}

const ROLL_MS = 900;
const RARITY_SHOUT = { N: 'ゲット！', R: 'レア！！', SR: 'スーパーレア！！！', SSR: 'ちょうげきレア！！！！' };

// ガチャ画面（docs/spec.md §9.1）。コインだけで回す。排出率と天井までの回数を画面に出す
const GachaScreen: React.FC<GachaScreenProps> = ({ effectLevel = 'max', onBack, onOpenCollection }) => {
  const [save, setSave] = useState(() => loadSave());
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);
  const fxRef = useRef<EffectHandle>(null);
  const rabbitRef = useRef<RabidopaHandle>(null);
  const timerRef = useRef(0);
  const calm = effectLevel === 'low';
  const { player, gacha } = save;
  const canPull = player.coins >= GACHA_COST && !rolling;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const reveal = (r: GachaResult) => {
    setRolling(false);
    setResult(r);
    const level = RARITIES.indexOf(r.item.rarity);
    if (level >= 2) {
      audioManager.playUnlock();
      audioManager.playFanfare();
    } else {
      audioManager.playWordClear(level >= 1);
    }
    rabbitRef.current?.play('clear');
    const fx = fxRef.current;
    if (fx) {
      const x = window.innerWidth / 2, y = window.innerHeight * 0.4;
      fx.burst(x, y, (calm ? 20 : 50) + level * 30, 1 + level * 0.3);
      fx.ring(x, y, level >= 2 ? '#FFE600' : undefined);
      fx.confetti((calm ? 15 : 40) * (level + 1));
      for (let i = 0; i < level * 2; i++) fx.firework();
      if (!calm && level >= 2) fx.flash(level === 3 ? '#FF2E93' : '#FFE600', 0.8);
    }
  };

  const handlePull = () => {
    if (!canPull) {
      audioManager.playCancel();
      return;
    }
    // 結果はここで決めて保存し、見せ方だけを遅らせる
    const pulled = pullGacha();
    if (!pulled.result) return;
    const r = pulled.result;
    setResult(null);
    setRolling(true);
    setSave(pulled.save);
    audioManager.playDrumroll(ROLL_MS / 1000);
    timerRef.current = window.setTimeout(() => reveal(r), ROLL_MS);
  };

  const high = result && RARITIES.indexOf(result.item.rarity) >= 2;

  // 操作ボタンは画面の下に固定する（中身がスクロールになっても押せるように）
  const footer = (
    <>
      <div className={canPull && !calm ? 'dopa-throb' : ''}>
        <button onClick={handlePull} className={`hx-btn ${canPull ? 'hx-yellow' : 'hx-off'} px-10 py-4 text-2xl md:text-4xl`}>
          <span className="hx-btn-in whitespace-nowrap">
            <Gift className="w-9 h-9 mr-3" strokeWidth={3} />
            <span className={canPull ? 'hx-sticker' : ''}>{player.coins >= GACHA_COST ? 'ガチャを まわす！' : 'コインが たりない…'}</span>
            <span className="ml-4 flex items-center gap-1 text-lg md:text-xl bg-neon-ink/60 rounded-lg px-3 py-1 whitespace-nowrap">
              <Coins size={20} /> {GACHA_COST}
            </span>
          </span>
        </button>
      </div>
      <button onClick={() => { audioManager.playSelect(); onOpenCollection(); }} className="hx-btn hx-cyan px-7 py-3 text-xl md:text-2xl">
        <span className="hx-btn-in whitespace-nowrap">
          <BookOpen className="w-7 h-7 mr-2" strokeWidth={3} />
          ずかんへ
        </span>
      </button>
      <button onClick={() => { audioManager.playCancel(); onBack(); }} className="hx-btn hx-red px-7 py-3 text-xl md:text-2xl">
        <span className="hx-btn-in whitespace-nowrap">
          <ArrowLeft className="w-7 h-7 mr-2" strokeWidth={3} />
          もどる
        </span>
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DopaBackground level={high ? 3 : 1} fever={!!result && result.item.rarity === 'SSR'} calm={calm} />
      <EffectCanvas ref={fxRef} maxParticles={calm ? 150 : 300} ambient={calm ? 0 : 8} />
      <FitScreen className="relative z-30 animate-fade-in font-pop" footer={footer} innerClassName="flex flex-col items-center p-5 pt-10 md:p-8 md:pt-12">
        <div className="hx-panel w-full max-w-5xl my-auto p-5 md:p-8" style={{ '--edge': 'var(--orange)' } as React.CSSProperties}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-2xl px-12 py-2 shadow-[8px_9px_0_#0B0320] whitespace-nowrap">
              <h2 className="hx-unskew hx-sticker text-white text-3xl md:text-5xl tracking-wider leading-none">ガチャ</h2>
            </div>
          </div>

          {/* もちもの */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
            <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--yellow)' } as React.CSSProperties}>
              <div className="hx-unskew flex items-center gap-2">
                <Coins className="w-8 h-8 text-neon-yellow" strokeWidth={3} />
                <span className="text-lg md:text-xl text-neon-yellow whitespace-nowrap">コイン</span>
                <span className="hx-num text-3xl md:text-4xl text-white">{player.coins.toLocaleString()}</span>
              </div>
            </div>
            <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--cyan)' } as React.CSSProperties}>
              <div className="hx-unskew flex items-center gap-2">
                <Gem className="w-7 h-7 text-neon-cyan" strokeWidth={3} />
                <span className="text-lg md:text-xl text-neon-cyan whitespace-nowrap">かけら</span>
                <span className="hx-num text-3xl md:text-4xl text-white">{player.shards}</span>
              </div>
            </div>
          </div>

          {/* ステージ：出たアイテム */}
          <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10">
            <Rabidopa
              ref={rabbitRef}
              anim={rolling ? 'shout' : result ? 'fever' : 'groove'}
              aura={high ? 4 : rolling ? 2 : 0}
              className="w-[120px] h-[117px] md:w-[190px] md:h-[185px] shrink-0"
            />
            <div className="relative w-56 h-56 md:w-72 md:h-72 shrink-0 flex items-center justify-center">
              <div className={`absolute inset-0 hx-burst bg-neon-ink ${calm ? '' : rolling || result ? 'hx-spin-fast' : 'hx-spin'}`} />
              <div className={`absolute inset-[10px] hx-burst ${result ? RARITY_STYLE[result.item.rarity].fill : 'bg-neon-panel'} ${calm ? '' : rolling || result ? 'hx-spin-fast' : 'hx-spin'}`} />
              {result ? (
                <div key={result.item.id + gacha.pityCount + player.coins} className="relative w-[58%] dopa-rank-slam">
                  <div className="rounded-2xl bg-neon-ink/80 border-4 border-neon-ink">
                    <ItemIcon item={result.item} />
                  </div>
                </div>
              ) : (
                <span className={`relative hx-num hx-sticker text-8xl md:text-[9rem] leading-none ${rolling ? 'dopa-drumroll text-white' : 'text-white/50'}`}>?</span>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 min-h-[9rem] md:w-80 justify-center">
              {result ? (
                <>
                  <div className={`hx-sticker text-2xl md:text-3xl ${RARITY_STYLE[result.item.rarity].text} ${calm ? '' : 'dopa-wiggle'} whitespace-nowrap`}>
                    {RARITY_SHOUT[result.item.rarity]}
                  </div>
                  <div className="flex items-center gap-2">
                    <RarityBadge rarity={result.item.rarity} className="text-xl md:text-2xl" />
                    <span className="hx-sticker text-white text-3xl md:text-4xl whitespace-nowrap">{result.item.label}</span>
                  </div>
                  {result.isNew ? (
                    <div className="hx-skew dopa-rainbow-fill border-4 border-neon-ink rounded-xl px-5 shadow-[4px_5px_0_#0B0320]">
                      <span className="hx-unskew hx-sticker text-white text-xl md:text-2xl whitespace-nowrap">NEW!! ずかんに ついか</span>
                    </div>
                  ) : (
                    <div className="text-lg md:text-xl text-neon-cyan whitespace-nowrap">もってる！ かけら +1</div>
                  )}
                </>
              ) : (
                <div className="text-lg md:text-xl text-white/80 text-center leading-snug whitespace-nowrap">
                  {rolling ? 'なにが でるかな…！' : <>コインで ガチャを まわそう！<br />いしょうや エフェクトが でるよ</>}
                </div>
              )}
            </div>
          </div>

          {/* 排出率と天井 */}
          <div className="mt-4 bg-neon-ink/50 rounded-2xl border-4 border-neon-ink px-4 py-2 flex flex-col items-center gap-1">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-base md:text-lg">
              <span className="text-white/80">でる かくりつ</span>
              {RARITIES.map(r => (
                <span key={r} className="flex items-center gap-1 whitespace-nowrap">
                  <RarityBadge rarity={r} className="text-sm md:text-base" />
                  <span className="hx-num text-white text-lg md:text-xl">{GACHA_RATES[r]}%</span>
                </span>
              ))}
            </div>
            <div className="text-sm md:text-base text-neon-yellow text-center">
              あと <span className="hx-num text-xl md:text-2xl">{GACHA_PITY - gacha.pityCount}</span> かい までに SR いじょうが かならず でる！
              <span className="text-white/70">　おなじ ものは かけらに なり、{SHARDS_TO_EXCHANGE}こで すきな アイテムと こうかん</span>
            </div>
          </div>
        </div>
      </FitScreen>
    </div>
  );
};

export default GachaScreen;
