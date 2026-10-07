import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Coins, Gem, Gift } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { GACHA_COST, GACHA_PITY, GACHA_RATES, GachaResult, SHARDS_TO_EXCHANGE, pullGacha } from '../utils/gacha';
import { GACHA_CUTIN_MS, GACHA_DROP_MS, GachaStep, buildGachaShow } from '../utils/gachaShow';
import { TierLevel } from '../utils/gameRules';
import { RARITIES } from '../utils/items';
import { EffectLevel, loadSave } from '../utils/saveData';
import DopaBackground from './DopaBackground';
import FitScreen from './FitScreen';
import EffectCanvas, { EffectHandle } from './EffectCanvas';
import GachaCapsule, { CapsuleBottom, CapsuleTop } from './GachaCapsule';
import ItemIcon, { RARITY_STYLE, RarityBadge } from './ItemIcon';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

interface GachaScreenProps {
  effectLevel?: EffectLevel;
  onBack: () => void;
  onOpenCollection: () => void;
}

// idle: まわす前 / drop〜up: カプセルの演出 / cutin: SSR の全画面カットイン / result: 出たアイテム
type Phase = 'idle' | 'drop' | 'shake' | 'stop' | 'up' | 'cutin' | 'result';

const RARITY_SHOUT = { N: 'ゲット！', R: 'レア！！', SR: 'スーパーレア！！！', SSR: 'ちょうげきレア！！！！' };
// カプセルの色が上がったときのひとこと（色の段階ごと）
const TIER_TEASE = ['なにが でるかな…！', 'おっ！？ あお！', 'きんいろ！！', 'にじいろ！？！？'];
const TIER_TEXT = ['text-white/80', 'text-neon-cyan', 'text-neon-yellow', 'dopa-rainbow-text'];
const TIER_RAY = ['', 'var(--cyan)', 'var(--yellow)', ''];
const TIER_FLASH = ['', '#00F0FF', '#FFE600', '#FF2E93'];

// ガチャ画面（docs/spec.md §9.1）。コインだけで回す。排出率と天井までの回数を画面に出す
const GachaScreen: React.FC<GachaScreenProps> = ({ effectLevel = 'max', onBack, onOpenCollection }) => {
  const [save, setSave] = useState(() => loadSave());
  const [phase, setPhase] = useState<Phase>('idle');
  const [tier, setTier] = useState(0); // 演出中のカプセルの色
  const [result, setResult] = useState<GachaResult | null>(null);
  const [pulls, setPulls] = useState(0); // この画面で回した回数（アニメのやり直し用の key）
  const fxRef = useRef<EffectHandle>(null);
  const rabbitRef = useRef<RabidopaHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef(0);                         // 演出の次の段へ進むタイマー
  const laterRef = useRef<number[]>([]);              // 当たったあとに続く花火などのタイマー
  const pendingRef = useRef<GachaResult | null>(null); // 演出中の結果（保存は済んでいる）
  const stopRattleRef = useRef<() => void>(() => {});
  const calm = effectLevel === 'low';
  const { player, gacha } = save;
  const rolling = phase !== 'idle' && phase !== 'result';
  const canPull = player.coins >= GACHA_COST && !rolling;

  const clearLater = () => {
    laterRef.current.forEach(id => clearTimeout(id));
    laterRef.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    laterRef.current.push(window.setTimeout(fn, ms));
  };

  const stagePoint = () => {
    const rect = stageRef.current?.getBoundingClientRect();
    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
  };

  // パネルをゆらす。big は SSR（ズームもする）
  const shakePanel = (big: boolean) => {
    if (calm) return;
    const s = big ? 1.06 : 1;
    panelRef.current?.animate(
      [
        { transform: `translate(0, 0) scale(${s})` },
        { transform: `translate(-14px, 8px) scale(${s})` },
        { transform: `translate(12px, -10px) scale(${s})` },
        { transform: `translate(-9px, -6px) scale(${s})` },
        { transform: 'translate(7px, 5px) scale(1)' },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: big ? 700 : 400, easing: 'ease-out' }
    );
  };

  // 結果を見せる。レア度が高いほど長く派手に
  const finish = () => {
    const r = pendingRef.current;
    if (!r) return;
    pendingRef.current = null;
    clearTimeout(timerRef.current);
    stopRattleRef.current();
    setPhase('result');
    setResult(r);
    const level = RARITIES.indexOf(r.item.rarity);
    audioManager.playGachaOpen();
    if (level >= 3) {
      audioManager.playRankSlam(true);
      audioManager.playSsr();
    } else if (level >= 2) {
      audioManager.playUnlock(true);
    } else {
      audioManager.playWordClear(level >= 1);
    }
    rabbitRef.current?.play('clear');
    const fx = fxRef.current;
    if (!fx) return;
    const { x, y } = stagePoint();
    fx.burst(x, y, (calm ? 20 : 50) + level * 30, 1 + level * 0.3);
    fx.ring(x, y, TIER_FLASH[level] || undefined);
    fx.confetti((calm ? 15 : 40) * (level + 1));
    for (let i = 0; i < level * 2; i++) fx.firework();
    if (level >= 1) later(() => fx.ring(x, y, TIER_FLASH[level]), 160);
    if (calm) return;
    if (level < 2) {
      fx.flash('#FFFFFF', 0.35);
      return;
    }
    fx.flash(TIER_FLASH[level], 0.8);
    shakePanel(level === 3);
    // 花火と紙ふぶきを、しばらく打ち上げつづける（SR 2秒 / SSR 4秒）
    const span = level === 3 ? 4000 : 2000;
    for (let t = 250; t <= span; t += level === 3 ? 200 : 300) later(() => fx.firework(), t);
    for (let t = 600; t <= span; t += 600) {
      later(() => {
        fx.confetti(60);
        fx.burst(x, y, 40, 1.4);
        fx.ring(x, y, TIER_FLASH[level]);
      }, t);
    }
  };

  // カプセルが開く。SSR だけ、アイテムを見せる前に全画面カットインをはさむ
  const open = () => {
    const r = pendingRef.current;
    if (!r) return;
    stopRattleRef.current();
    if (r.item.rarity !== 'SSR' || calm) {
      finish();
      return;
    }
    setPhase('cutin');
    audioManager.playGachaOpen();
    audioManager.playFeverStart(false); // すぐあとに SSR のジングルが鳴るので、ここは合成の音
    fxRef.current?.flash('#FFFFFF', 0.9);
    timerRef.current = window.setTimeout(finish, GACHA_CUTIN_MS);
  };

  const runSteps = (steps: GachaStep[], i: number) => {
    if (i >= steps.length) {
      open();
      return;
    }
    const s = steps[i];
    stopRattleRef.current();
    setTier(s.tier);
    setPhase(s.type);
    if (s.type === 'shake') {
      stopRattleRef.current = audioManager.playGachaRattle(s.ms / 1000, s.tier);
    } else if (s.type === 'up') {
      audioManager.playGachaUp(s.tier);
      rabbitRef.current?.play('clear');
      const fx = fxRef.current;
      if (fx) {
        const { x, y } = stagePoint();
        fx.ring(x, y, TIER_FLASH[s.tier]);
        fx.burst(x, y, (calm ? 10 : 25) * s.tier, 1 + s.tier * 0.2);
        if (!calm) fx.flash(TIER_FLASH[s.tier], 0.25 + s.tier * 0.1);
      }
    }
    timerRef.current = window.setTimeout(() => runSteps(steps, i + 1), s.ms);
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
    clearLater();
    pendingRef.current = r;
    setResult(null);
    setSave(pulled.save);
    setPulls(n => n + 1);
    setTier(0);
    setPhase('drop');
    audioManager.playGachaDrop();
    const steps = buildGachaShow(RARITIES.indexOf(r.item.rarity));
    timerRef.current = window.setTimeout(() => runSteps(steps, 0), GACHA_DROP_MS);
  };

  // 演出中はクリック・Enter・スペースで結果まで飛ばせる（結果は保存済みなので中身は変わらない）
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!pendingRef.current || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      if (!e.repeat) finishRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timerRef.current);
      laterRef.current.forEach(id => clearTimeout(id));
      stopRattleRef.current();
    };
  }, []);

  const level = result ? RARITIES.indexOf(result.item.rarity) : -1;
  const high = level >= 2;
  // 背景・集中線・ステージの色に使う段階（演出中はカプセルの色、結果ではレア度）
  const glow = rolling ? tier : Math.max(level, 0);
  const lit = rolling || !!result;
  const bgLevel = (rolling ? Math.min(tier + 1, 4) : level === 3 ? 4 : high ? 3 : 1) as TierLevel;
  const spin = calm ? '' : lit ? 'hx-spin-fast' : 'hx-spin';

  // 操作ボタンは画面の下に固定する（中身がスクロールになっても押せるように）
  const footer = (
    <>
      <div className={canPull && !calm ? 'dopa-throb' : ''}>
        <button onClick={handlePull} className={`hx-btn ${canPull ? 'hx-yellow' : 'hx-off'} px-10 py-4 text-2xl md:text-4xl`}>
          <span className="hx-btn-in whitespace-nowrap">
            <Gift className="w-9 h-9 mr-3" strokeWidth={3} />
            <span className={canPull ? 'hx-sticker' : ''}>{rolling ? 'ドキドキ…！' : player.coins >= GACHA_COST ? 'ガチャを まわす！' : 'コインが たりない…'}</span>
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
      <DopaBackground level={bgLevel} fever={lit && glow === 3} calm={calm} />
      {/* 演出中はまわりを暗くして、ステージに目を集める */}
      {rolling && !calm && <div className="fixed inset-0 z-20 pointer-events-none hx-gacha-dim" />}
      <EffectCanvas ref={fxRef} maxParticles={calm ? 150 : 300} ambient={calm ? 0 : 8} />
      <FitScreen className="relative z-30 animate-fade-in font-pop" footer={footer} innerClassName="flex flex-col items-center p-5 pt-10 md:p-8 md:pt-12">
        <div ref={panelRef} className="hx-panel w-full max-w-5xl my-auto p-5 md:p-8" style={{ '--edge': 'var(--orange)' } as React.CSSProperties}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-2xl px-12 py-2 shadow-[8px_9px_0_#0B0320] whitespace-nowrap">
              <h2 className="hx-unskew hx-sticker text-white text-3xl md:text-5xl tracking-wider leading-none">ガチャ</h2>
            </div>
          </div>

          {/* もちもの */}
          <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-5">
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

          {/* ステージ：カプセルと、出たアイテム */}
          <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10">
            <Rabidopa
              ref={rabbitRef}
              anim={rolling ? 'shout' : result ? 'fever' : 'groove'}
              aura={(rolling ? Math.min(tier + 1, 4) : high ? 4 : 0) as 0 | 1 | 2 | 3 | 4}
              rainbow={lit && glow === 3}
              className="relative z-10 w-[120px] h-[117px] md:w-[190px] md:h-[185px] shrink-0"
            />
            <div ref={stageRef} className="relative w-56 h-56 md:w-72 md:h-72 shrink-0 flex items-center justify-center">
              {/* 色が上がるほど強くなる集中線 */}
              {!calm && lit && glow >= 1 && (
                <div className="hx-gacha-rays-box">
                  <div className={`hx-gacha-rays ${glow === 3 ? 'hx-gacha-rays-rainbow' : ''}`} style={{ '--ray': TIER_RAY[glow] } as React.CSSProperties} />
                </div>
              )}
              <div className={`absolute inset-0 hx-burst bg-neon-ink ${spin}`} />
              <div className={`absolute inset-[10px] hx-burst ${lit ? RARITY_STYLE[RARITIES[glow]].fill : 'bg-neon-panel'} ${spin}`} />
              {result ? (
                <>
                  <div key={pulls} className="relative w-[58%] dopa-rank-slam">
                    <div className={`rounded-2xl bg-neon-ink/80 border-4 border-neon-ink ${level === 3 && !calm ? 'hx-gacha-ssr' : ''}`}>
                      <ItemIcon item={result.item} />
                    </div>
                  </div>
                  {/* 割れたカプセルが飛んでいく。飛んだ先がスクロール領域を広げないよう、外側の入れ物で切る */}
                  <div key={`pop${pulls}`} className="absolute -inset-[35%] overflow-hidden pointer-events-none">
                    <div className="absolute inset-[32%]">
                      <div className="absolute inset-0 hx-capsule-pop-top"><CapsuleTop tier={level} /></div>
                      <div className="absolute inset-0 hx-capsule-pop-bottom"><CapsuleBottom /></div>
                    </div>
                  </div>
                </>
              ) : rolling ? (
                phase !== 'cutin' && (
                  <GachaCapsule key={pulls} tier={tier} motion={phase as 'drop' | 'shake' | 'stop' | 'up'} calm={calm} className="w-[62%]" />
                )
              ) : (
                <span className="relative hx-num hx-sticker text-8xl md:text-[9rem] leading-none text-white/50">?</span>
              )}
            </div>
            <div className="relative z-10 flex flex-col items-center gap-2 min-h-[9rem] md:w-80 justify-center">
              {result ? (
                <>
                  <div key={`shout${pulls}`} className="hx-gacha-pop">
                    <div className={`hx-sticker text-2xl md:text-3xl ${RARITY_STYLE[result.item.rarity].text} ${calm ? '' : 'dopa-wiggle'} whitespace-nowrap`}>
                      {RARITY_SHOUT[result.item.rarity]}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RarityBadge rarity={result.item.rarity} className="text-xl md:text-2xl" />
                    <span className="hx-sticker text-white text-3xl md:text-4xl whitespace-nowrap">{result.item.label}</span>
                  </div>
                  {result.isNew ? (
                    <div key={`new${pulls}`} className="hx-gacha-stamp">
                      <div className="hx-skew dopa-rainbow-fill border-4 border-neon-ink rounded-xl px-5 shadow-[4px_5px_0_#0B0320]">
                        <span className="hx-unskew hx-sticker text-white text-xl md:text-2xl whitespace-nowrap">NEW!! ずかんに ついか</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-lg md:text-xl text-neon-cyan whitespace-nowrap">もってる！ かけら +1</div>
                  )}
                </>
              ) : rolling ? (
                <>
                  <div key={`${phase === 'stop' ? 'stop' : 'tease'}${tier}`} className="hx-gacha-pop">
                    <div className={`hx-sticker text-2xl md:text-3xl whitespace-nowrap ${TIER_TEXT[tier]}`}>
                      {phase === 'stop' ? '…………！' : TIER_TEASE[tier]}
                    </div>
                  </div>
                  <div className="text-sm md:text-base text-white/60 whitespace-nowrap">クリックで とばせるよ</div>
                </>
              ) : (
                <div className="text-lg md:text-xl text-white/80 text-center leading-snug whitespace-nowrap">
                  コインで ガチャを まわそう！<br />いしょうや エフェクトが でるよ
                </div>
              )}
            </div>
          </div>

          {/* 排出率と天井 */}
          <div className="relative z-10 mt-4 bg-neon-ink/50 rounded-2xl border-4 border-neon-ink px-4 py-2 flex flex-col items-center gap-1">
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
              あと <span className="hx-num text-xl md:text-2xl">{Math.max(1, GACHA_PITY - gacha.pityCount)}</span> かい までに SR いじょうが かならず でる！
              <span className="text-white/70">　おなじ ものは かけらに なり、{SHARDS_TO_EXCHANGE}こで すきな アイテムと こうかん</span>
            </div>
          </div>
        </div>
      </FitScreen>

      {/* 演出中は画面のどこを押しても結果まで飛ばせる */}
      {rolling && <button aria-label="えんしゅつを とばす" onClick={finish} className="fixed inset-0 z-40 cursor-pointer" />}

      {/* SSR：アイテムを見せる前の全画面カットイン（長さは GACHA_CUTIN_MS） */}
      {phase === 'cutin' && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden font-pop hx-fever-dim" style={{ animationDuration: `${GACHA_CUTIN_MS}ms` }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="hx-fever-rays" style={{ animationDuration: `${GACHA_CUTIN_MS}ms` }} />
          </div>
          <div className="hx-cutin-band hx-fever-band top-[28vh] h-[44vh] dopa-rainbow-fill" style={{ animationDuration: `${GACHA_CUTIN_MS}ms` }}>
            <div className="hx-cutin-speed" />
            <Rabidopa anim="shout" aura={4} rainbow className="relative h-[36vh] aspect-[720/700] -mt-[6vh] shrink-0" />
            <div className="relative hx-cutin-slam text-center">
              <div className="hx-num hx-sticker text-neon-yellow text-[9vw] leading-none whitespace-nowrap">SSR</div>
              <div className="hx-sticker text-white text-[4.5vw] leading-none whitespace-nowrap">{RARITY_SHOUT.SSR}</div>
            </div>
            <Rabidopa anim="shout" aura={4} rainbow className="relative h-[36vh] aspect-[720/700] -mt-[6vh] shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
};

export default GachaScreen;
