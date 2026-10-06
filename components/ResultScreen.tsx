import React, { useEffect, useRef, useState } from 'react';
import { GameStats, Rank } from '../types';
import { RefreshCw, CheckCircle, XCircle, Clock, CornerDownLeft, Flame, Keyboard, Home, Sparkles, GitBranch, Coins, Gift, Check } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { BestRecord, EffectLevel } from '../utils/saveData';
import { getNextRank, RANKS } from '../utils/gameRules';
import { PlayRewards, expToNext } from '../utils/progression';
import { ALL_CLEAR_COINS, STREAK_COINS, getMission } from '../utils/daily';
import { GACHA_COST } from '../utils/gacha';
import DopaBackground from './DopaBackground';
import FitScreen from './FitScreen';
import EffectCanvas, { EffectHandle } from './EffectCanvas';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

interface ResultScreenProps {
  stats: GameStats;
  rank: Rank;
  isNewBest: boolean;
  prevBest?: BestRecord;
  rewards?: PlayRewards;
  flashy?: boolean; // スキル「リザルト派手化」
  suggestBreak?: boolean; // 休けいお知らせ（§10）を出す
  onOpenGacha: () => void;
  effectLevel?: EffectLevel;
  onOpenSkillTree: () => void;
  onRetry: () => void;
  onBackToTitle: () => void;
}

// ランクごとのギザギザバッジの色
const RANK_FILL: Record<Rank, string> = {
  'C': 'bg-slate-400',
  'B': 'bg-neon-lime',
  'A': 'bg-neon-cyan',
  'S': 'bg-neon-yellow',
  'SS': 'bg-neon-orange',
  'SSS': 'bg-neon-pink',
  '∞': 'dopa-rainbow-fill',
};
const RANK_WORD: Record<Rank, string> = {
  'C': 'ナイスファイト！',
  'B': 'いいかんじ！',
  'A': 'すごい！！',
  'S': 'めちゃすごい！！！',
  'SS': 'かみってる！！！！',
  'SSS': 'でんせつ！！！！！',
  '∞': 'うちゅう！！！！！！',
};

const DRUMROLL_MS = 1000;
const COUNT_MS = 1000;

const ResultScreen: React.FC<ResultScreenProps> = ({ stats, rank, isNewBest, prevBest, rewards, flashy = false, suggestBreak = false, effectLevel = 'max', onOpenSkillTree, onOpenGacha, onRetry, onBackToTitle }) => {
  const [breakOpen, setBreakOpen] = useState(suggestBreak);
  const daily = rewards?.daily;
  const canGacha = !!rewards && rewards.coinsAfter >= GACHA_COST;
  const [revealed, setRevealed] = useState(false);
  const [shownScore, setShownScore] = useState(0);
  const fxRef = useRef<EffectHandle>(null);
  const rabbitRef = useRef<RabidopaHandle>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const leveledUp = !!rewards && rewards.levelAfter > rewards.levelBefore;

  const calm = effectLevel === 'low';
  const rankIndex = RANKS.indexOf(rank);
  const seconds = (stats.timeElapsed / 1000).toFixed(2);
  const accuracy = stats.correctChars + stats.missedChars > 0
    ? Math.round((stats.correctChars / (stats.correctChars + stats.missedChars)) * 100)
    : 0;
  const next = getNextRank(stats.score, stats.mode, stats.difficulty);
  const bestGap = !isNewBest && prevBest ? prevBest.score - stats.score : 0;

  // ランク発表：ドラムロール → スタンプ → スコアがカウントアップ
  useEffect(() => {
    audioManager.playDrumroll(DRUMROLL_MS / 1000);
    let fireworks = 0;
    let raf = 0;
    let levelUpTimer = 0;
    const reveal = window.setTimeout(() => {
      setRevealed(true);
      audioManager.playRankSlam(rankIndex >= 3);
      if (rankIndex >= 2) audioManager.playFanfare();
      rabbitRef.current?.play('clear');
      // スキル「リザルト派手化」：発表の瞬間にカメラが寄って揺れる
      if (flashy && !calm) {
        panelRef.current?.animate(
          [
            { transform: 'scale(1.35) rotate(-4deg)', filter: 'brightness(2.2) hue-rotate(90deg)' },
            { transform: 'scale(0.94) rotate(2deg)', filter: 'brightness(1.2) hue-rotate(0deg)', offset: 0.45 },
            { transform: 'scale(1.06) rotate(-1deg)', filter: 'none', offset: 0.7 },
            { transform: 'scale(1) rotate(0deg)', filter: 'none' },
          ],
          { duration: 900, easing: 'ease-out' }
        );
      }
      if (leveledUp) levelUpTimer = window.setTimeout(() => audioManager.playLevelUp(), COUNT_MS + 200);
      const fx = fxRef.current;
      if (fx) {
        if (!calm) fx.flash('#FFFFFF', 0.9);
        fx.confetti(calm ? 40 : 80 + rankIndex * 30 + (flashy ? 80 : 0));
        for (let i = 0; i <= rankIndex + (flashy ? 4 : 0); i++) fx.firework();
        fx.burst(window.innerWidth / 2, window.innerHeight * 0.3, calm ? 30 : 90, 1.6);
      }
      // ランクが高いほど花火が止まらない
      if (!calm) {
        fireworks = window.setInterval(() => {
          fxRef.current?.firework();
          if (rankIndex >= 3) fxRef.current?.confetti(12);
        }, Math.max(250, 1400 - rankIndex * 200));
      }
      // スコアのカウントアップ
      const startAt = performance.now();
      let lastBlip = 0;
      const tick = (now: number) => {
        const k = Math.min(1, (now - startAt) / COUNT_MS);
        setShownScore(Math.round(stats.score * k));
        if (now - lastBlip > 60 && k < 1) {
          lastBlip = now;
          audioManager.playCountBlip(Math.floor(k * 24));
        }
        if (k < 1) raf = requestAnimationFrame(tick);
        else audioManager.playWordClear(true);
      };
      raf = requestAnimationFrame(tick);
    }, DRUMROLL_MS);
    return () => {
      clearTimeout(reveal);
      clearTimeout(levelUpTimer);
      clearInterval(fireworks);
      cancelAnimationFrame(raf);
    };
  }, [stats.score, rankIndex, calm, flashy, leveledUp]);

  // Enter で即リトライ、Esc でタイトルへ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 休けいのお知らせが出ているあいだは、閉じるだけ（いきなり次のプレイに進まない）
      if (breakOpen) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          audioManager.playSelect();
          setBreakOpen(false);
        }
        return;
      }
      if (e.key === 'Enter') {
        audioManager.playSelect();
        onRetry();
      } else if (e.key === 'Escape') {
        audioManager.playCancel();
        onBackToTitle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRetry, onBackToTitle, breakOpen]);

  const tiles = [
    { label: 'MAX コンボ', value: `${stats.maxCombo}`, icon: Flame, edge: 'var(--orange)', text: 'text-neon-orange' },
    stats.mode === 'practice'
      ? { label: 'タイム', value: `${seconds}s`, icon: Clock, edge: 'var(--cyan)', text: 'text-neon-cyan' }
      : { label: 'だけんすう', value: `${stats.correctChars}`, icon: Keyboard, edge: 'var(--cyan)', text: 'text-neon-cyan' },
    { label: 'せいかくさ', value: `${accuracy}%`, icon: CheckCircle, edge: 'var(--lime)', text: 'text-neon-lime' },
    { label: 'PERFECT', value: `${stats.perfectWords}/${stats.wordsCleared}`, icon: Sparkles, edge: 'var(--pink)', text: 'text-neon-pink' },
    { label: 'ミス', value: `${stats.missedChars}`, icon: XCircle, edge: '#8E87B5', text: 'text-slate-300' },
  ];

  // 操作ボタンは画面の下に固定する（中身がスクロールになっても押せるように）
  const footer = (
    <>
      <div className="dopa-throb">
        <button
          onClick={() => { audioManager.playSelect(); onRetry(); }}
          className="hx-btn hx-yellow group px-7 py-3 text-3xl md:text-4xl"
        >
          <span className="hx-btn-in whitespace-nowrap">
            <RefreshCw className="w-9 h-9 mr-3 group-hover:rotate-180 transition-transform duration-500" strokeWidth={3} />
            <span className="hx-sticker">もういっかい！</span>
            <span className="ml-3 flex items-center gap-1 text-lg bg-neon-ink/60 rounded-lg px-2 py-1">
              <CornerDownLeft size={18} /> Enter
            </span>
          </span>
        </button>
      </div>
      {leveledUp && (
        <button
          onClick={() => { audioManager.playSelect(); onOpenSkillTree(); }}
          className="hx-btn hx-purple px-5 py-3 text-xl md:text-2xl"
        >
          <span className="hx-btn-in whitespace-nowrap">
            <GitBranch className="w-7 h-7 mr-2" strokeWidth={3} />
            スキルツリーへ
          </span>
        </button>
      )}
      {canGacha && (
        <button
          onClick={() => { audioManager.playSelect(); onOpenGacha(); }}
          className="hx-btn hx-orange px-5 py-3 text-xl md:text-2xl"
        >
          <span className="hx-btn-in whitespace-nowrap">
            <Gift className="w-7 h-7 mr-2" strokeWidth={3} />
            ガチャへ
          </span>
        </button>
      )}
      <button
        onClick={() => { audioManager.playCancel(); onBackToTitle(); }}
        className="hx-btn hx-dark px-5 py-3 text-xl md:text-2xl"
      >
        <span className="hx-btn-in whitespace-nowrap">
          <Home className="w-7 h-7 mr-2" />
          タイトルへ
        </span>
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DopaBackground level={revealed ? (Math.min(4, Math.max(1, rankIndex)) as 1 | 2 | 3 | 4) : 0} fever={revealed && rankIndex >= 5} calm={calm} />
      <EffectCanvas ref={fxRef} maxParticles={calm ? 150 : 300} ambient={calm || !revealed ? 0 : 6 + rankIndex * 4} />

      <FitScreen className="relative z-30 animate-fade-in font-pop" footer={footer} innerClassName="flex flex-col items-center p-5 pt-10 md:p-8 md:pt-12">
        <div ref={panelRef} className="hx-panel w-full max-w-7xl p-5 md:p-8" style={{ '--edge': 'var(--pink)' } as React.CSSProperties}>

          {/* ラビッドパはパネルの右上の角に乗せる（ボタンや記録に重ならない位置） */}
          <Rabidopa
            ref={rabbitRef}
            anim={!revealed ? 'idle' : rankIndex >= 3 ? 'fever' : rankIndex >= 1 ? 'groove' : 'idle'}
            aura={revealed ? (Math.min(4, rankIndex) as 0 | 1 | 2 | 3 | 4) : 0}
            rainbow={revealed && rankIndex >= 5}
            className="absolute -top-14 -right-3 z-10 w-[120px] h-[117px] md:w-[190px] md:h-[185px]"
          />

          {/* 見出しの札 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-2xl px-12 py-2 shadow-[8px_9px_0_#0B0320] whitespace-nowrap">
              <h2 className="hx-unskew hx-sticker text-white text-3xl md:text-5xl tracking-wider leading-none">けっか はっぴょう！</h2>
            </div>
          </div>

          <div className="mt-8 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
            {/* ランク：回るギザギザバッジの上にスタンプ */}
            <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative w-56 h-56 md:w-60 md:h-60 shrink-0 flex items-center justify-center">
              <div className={`absolute inset-0 hx-burst bg-neon-ink ${calm ? '' : revealed ? 'hx-spin-fast' : 'hx-spin'}`} />
              <div className={`absolute inset-[10px] hx-burst ${revealed ? RANK_FILL[rank] : 'bg-neon-panel'} ${calm ? '' : revealed ? 'hx-spin-fast' : 'hx-spin'}`} />
              <div className="relative flex flex-col items-center">
                <span className="hx-sticker text-white text-xl md:text-2xl tracking-[0.3em] mb-4">RANK</span>
                {revealed ? (
                  <span className={`dopa-rank-slam hx-num hx-sticker text-white leading-none ${rank.length >= 3 ? 'text-5xl md:text-6xl' : 'text-8xl md:text-[8rem]'}`}>
                    {rank}
                  </span>
                ) : (
                  <span className="dopa-drumroll hx-num hx-sticker text-8xl md:text-[8rem] text-white/50 leading-none">?</span>
                )}
              </div>
            </div>
              <div className={`hx-sticker text-2xl md:text-4xl text-neon-yellow whitespace-nowrap ${revealed ? 'dopa-wiggle' : 'opacity-0'}`}>
                {RANK_WORD[rank]}
              </div>
            </div>

            <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <div className="hx-tag px-8 md:px-12 py-2">
                <div className="hx-unskew text-center">
                  <div className="text-base md:text-xl text-neon-cyan tracking-[0.4em] leading-none mb-2 md:mb-3">SCORE</div>
                  <div className="hx-num text-6xl md:text-8xl text-neon-yellow leading-none">
                    {shownScore.toLocaleString()}
                  </div>
                </div>
              </div>
              {isNewBest && revealed && (
                <div className="dopa-throb">
                  <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-xl px-8 py-1 shadow-[6px_7px_0_#0B0320]">
                    <span className="hx-unskew hx-sticker text-white text-2xl md:text-4xl">じこベスト こうしん！！</span>
                  </div>
                </div>
              )}
              <div className="text-lg md:text-xl text-white/70 whitespace-nowrap">
                {stats.mode === 'practice' ? 'れんしゅうモード' : 'アーケードモード'} / <span className="uppercase">{stats.difficulty}</span>
              </div>
            </div>

          {/* 記録 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-2">
            {tiles.map(t => (
              <div key={t.label} className="hx-tag py-2" style={{ '--edge': t.edge } as React.CSSProperties}>
                <div className="hx-unskew flex flex-col items-center">
                  <div className={`flex items-center gap-1 text-sm md:text-base ${t.text}`}>
                    <t.icon className="w-5 h-5" />
                    {t.label}
                  </div>
                  <div className="hx-num text-3xl md:text-4xl text-white">{t.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* もらえたもの：コイン・EXP とレベル */}
          {rewards && (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--yellow)' } as React.CSSProperties}>
                <div className="hx-unskew flex items-center gap-2">
                  <Coins className="w-7 h-7 text-neon-yellow" strokeWidth={3} />
                  <span className="hx-num text-2xl md:text-3xl text-neon-yellow whitespace-nowrap">コイン +{rewards.coins.toLocaleString()}</span>
                  <span className="text-sm md:text-base text-white/70 whitespace-nowrap">もってる {rewards.coinsAfter.toLocaleString()}</span>
                </div>
              </div>
              <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--cyan)' } as React.CSSProperties}>
                <div className="hx-unskew flex items-center gap-3">
                  <span className="hx-num text-2xl md:text-3xl text-neon-cyan whitespace-nowrap">EXP +{rewards.exp.toLocaleString()}</span>
                  <span className="hx-num text-2xl md:text-3xl text-white whitespace-nowrap">Lv {rewards.levelAfter}</span>
                  <div className="w-24 md:w-28 hx-gauge h-4">
                    <div className="h-full dopa-gauge-fill" style={{ width: `${Math.min(100, (rewards.expAfter / expToNext(rewards.levelAfter)) * 100)}%` }} />
                  </div>
                </div>
              </div>
              {leveledUp && revealed && (
                <div className="dopa-throb">
                  <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-xl px-6 py-1 shadow-[6px_7px_0_#0B0320]">
                    <span className="hx-unskew hx-sticker text-white text-xl md:text-3xl whitespace-nowrap">レベルアップ！！ スキルポイント +{rewards.spGain}</span>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          </div>

          {/* きょうのミッションの進みぐあい */}
          {daily && daily.missions.length > 0 && (
            <div className="mt-4 bg-neon-ink/50 rounded-2xl border-4 border-neon-ink px-3 py-2">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-2 text-base md:text-lg">
                <span className="text-neon-pink">きょうの ミッション</span>
                <span className="flex items-center gap-1 text-neon-orange whitespace-nowrap">
                  <Flame className="w-5 h-5" strokeWidth={3} />
                  <span className="hx-num text-xl md:text-2xl">{daily.streak}</span>にち れんぞく{daily.streakUp ? '！' : ''}
                </span>
                {daily.streakReward && <span className="hx-sticker text-neon-yellow whitespace-nowrap">れんぞく ごほうび コイン +{STREAK_COINS}！</span>}
                {daily.allClear && <span className="hx-sticker text-neon-yellow whitespace-nowrap">ぜんぶ たっせい！ コイン +{ALL_CLEAR_COINS}！</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1">
                {daily.missions.map(m => {
                  const def = getMission(m.id);
                  if (!def) return null;
                  const reward = def.reward.coins ? `コイン +${def.reward.coins}` : `EXP +${def.reward.exp}`;
                  return (
                    <div key={m.id} className={`flex items-center gap-2 text-left ${m.justDone && revealed ? 'dopa-throb' : ''}`}>
                      <span className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-[3px] ${m.done ? 'bg-neon-lime border-neon-ink text-neon-ink' : 'border-white/50 text-transparent'}`}>
                        <Check strokeWidth={4} size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm md:text-base leading-tight ${m.done ? 'text-neon-lime' : 'text-white'}`}>{def.label}</span>
                        <span className="block text-sm whitespace-nowrap">
                          <span className="hx-num text-white/70">{m.progress.toLocaleString()}/{def.target.toLocaleString()}</span>
                          <span className={`ml-2 ${m.justDone ? 'hx-sticker text-neon-yellow' : 'text-white/60'}`}>{m.justDone ? `たっせい！ ${reward}` : reward}</span>
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 次の目標（もう1回の導線） */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-1 min-h-[2.5rem]">
            {next && (
              <div className="hx-sticker text-2xl md:text-3xl text-neon-pink dopa-throb whitespace-nowrap">
                あと {next.remain.toLocaleString()} てんで {next.rank} ランク！
              </div>
            )}
            {bestGap > 0 && (
              <div className="hx-sticker text-xl md:text-2xl text-neon-cyan whitespace-nowrap">
                じこベストまで あと {bestGap.toLocaleString()} てん！
              </div>
            )}
          </div>
        </div>
      </FitScreen>

      {/* 休けいのお知らせ。プレイが終わったここでだけ出す */}
      {breakOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-neon-ink/90 font-pop">
          <div className="hx-panel w-full max-w-2xl p-6 md:p-8 flex flex-col items-center gap-3 text-center" style={{ '--edge': 'var(--lime)' } as React.CSSProperties}>
            <Rabidopa anim="idle" className="w-[150px] h-[146px] md:w-[210px] md:h-[204px] -mt-4" />
            <div className="hx-sticker text-neon-lime text-2xl md:text-4xl whitespace-nowrap">ちょっと きゅうけい しよう！</div>
            <div className="text-lg md:text-2xl text-white leading-snug">
              たくさん あそんだね！<br />とおくを みて、からだを のばそう。
            </div>
            <button
              onClick={() => { audioManager.playSelect(); setBreakOpen(false); }}
              className="hx-btn hx-lime mt-2 px-12 py-3 text-2xl md:text-3xl"
            >
              <span className="hx-btn-in whitespace-nowrap">
                <span className="hx-sticker">わかった！</span>
                <span className="ml-4 flex items-center gap-1 text-lg bg-neon-ink/60 rounded-lg px-3 py-1">
                  <CornerDownLeft size={18} /> Enter
                </span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultScreen;
