import React, { useEffect, useRef, useState } from 'react';
import { GameStats, Rank } from '../types';
import { RefreshCw, CheckCircle, XCircle, Clock, CornerDownLeft, Flame, Keyboard, Home, Sparkles } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { BestRecord, EffectLevel } from '../utils/saveData';
import { getNextRank, RANKS } from '../utils/gameRules';
import DopaBackground from './DopaBackground';
import EffectCanvas, { EffectHandle } from './EffectCanvas';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

interface ResultScreenProps {
  stats: GameStats;
  rank: Rank;
  isNewBest: boolean;
  prevBest?: BestRecord;
  effectLevel?: EffectLevel;
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

const ResultScreen: React.FC<ResultScreenProps> = ({ stats, rank, isNewBest, prevBest, effectLevel = 'max', onRetry, onBackToTitle }) => {
  const [revealed, setRevealed] = useState(false);
  const [shownScore, setShownScore] = useState(0);
  const fxRef = useRef<EffectHandle>(null);
  const rabbitRef = useRef<RabidopaHandle>(null);

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
    const reveal = window.setTimeout(() => {
      setRevealed(true);
      audioManager.playRankSlam(rankIndex >= 3);
      if (rankIndex >= 2) audioManager.playFanfare();
      rabbitRef.current?.play('clear');
      const fx = fxRef.current;
      if (fx) {
        if (!calm) fx.flash('#FFFFFF', 0.9);
        fx.confetti(calm ? 40 : 80 + rankIndex * 30);
        for (let i = 0; i <= rankIndex; i++) fx.firework();
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
      clearInterval(fireworks);
      cancelAnimationFrame(raf);
    };
  }, [stats.score, rankIndex, calm]);

  // Enter で即リトライ、Esc でタイトルへ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [onRetry, onBackToTitle]);

  const tiles = [
    { label: 'MAX コンボ', value: `${stats.maxCombo}`, icon: Flame, edge: 'var(--orange)', text: 'text-neon-orange' },
    stats.mode === 'practice'
      ? { label: 'タイム', value: `${seconds}s`, icon: Clock, edge: 'var(--cyan)', text: 'text-neon-cyan' }
      : { label: 'だけんすう', value: `${stats.correctChars}`, icon: Keyboard, edge: 'var(--cyan)', text: 'text-neon-cyan' },
    { label: 'せいかくさ', value: `${accuracy}%`, icon: CheckCircle, edge: 'var(--lime)', text: 'text-neon-lime' },
    { label: 'PERFECT', value: `${stats.perfectWords}/${stats.wordsCleared}`, icon: Sparkles, edge: 'var(--pink)', text: 'text-neon-pink' },
    { label: 'ミス', value: `${stats.missedChars}`, icon: XCircle, edge: '#8E87B5', text: 'text-slate-300' },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DopaBackground level={revealed ? (Math.min(4, Math.max(1, rankIndex)) as 1 | 2 | 3 | 4) : 0} fever={revealed && rankIndex >= 5} calm={calm} />
      <EffectCanvas ref={fxRef} maxParticles={calm ? 150 : 300} ambient={calm || !revealed ? 0 : 6 + rankIndex * 4} />

      <Rabidopa
        ref={rabbitRef}
        anim={!revealed ? 'idle' : rankIndex >= 3 ? 'fever' : rankIndex >= 1 ? 'groove' : 'idle'}
        aura={revealed ? (Math.min(4, rankIndex) as 0 | 1 | 2 | 3 | 4) : 0}
        rainbow={revealed && rankIndex >= 5}
        className="fixed right-0 bottom-0 w-[30vh] h-[29vh] md:w-[40vh] md:h-[39vh] z-40"
      />

      <div className="relative z-30 h-screen overflow-y-auto overflow-x-hidden dopa-scroll flex flex-col items-center p-5 pt-10 md:p-8 md:pt-12 animate-fade-in w-full font-pop">
        <div className="hx-panel w-full max-w-5xl my-auto p-5 md:p-8" style={{ '--edge': 'var(--pink)' } as React.CSSProperties}>

          {/* 見出しの札 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-2xl px-12 py-2 shadow-[8px_9px_0_#0B0320] whitespace-nowrap">
              <h2 className="hx-unskew hx-sticker text-white text-3xl md:text-5xl tracking-wider leading-none">けっか はっぴょう！</h2>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12">
            {/* ランク：回るギザギザバッジの上にスタンプ */}
            <div className="relative w-56 h-56 md:w-72 md:h-72 shrink-0 flex items-center justify-center">
              <div className={`absolute inset-0 hx-burst bg-neon-ink ${calm ? '' : revealed ? 'hx-spin-fast' : 'hx-spin'}`} />
              <div className={`absolute inset-[10px] hx-burst ${revealed ? RANK_FILL[rank] : 'bg-neon-panel'} ${calm ? '' : revealed ? 'hx-spin-fast' : 'hx-spin'}`} />
              <div className="relative flex flex-col items-center">
                <span className="hx-sticker text-white text-xl md:text-2xl tracking-[0.3em]">RANK</span>
                {revealed ? (
                  <span className={`dopa-rank-slam hx-num hx-sticker text-white leading-none ${rank.length >= 3 ? 'text-6xl md:text-7xl' : 'text-8xl md:text-[10rem]'}`}>
                    {rank}
                  </span>
                ) : (
                  <span className="dopa-drumroll hx-num hx-sticker text-8xl md:text-[10rem] text-white/50 leading-none">?</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className={`hx-sticker text-3xl md:text-5xl text-neon-yellow ${revealed ? 'dopa-wiggle' : 'opacity-0'}`}>
                {RANK_WORD[rank]}
              </div>
              <div className="hx-tag px-8 md:px-14 py-2">
                <div className="hx-unskew text-center">
                  <div className="text-base md:text-xl text-neon-cyan tracking-[0.4em] leading-none">SCORE</div>
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
              <div className="text-lg md:text-xl text-white/70">
                {stats.mode === 'practice' ? 'れんしゅうモード' : 'アーケードモード'} / <span className="uppercase">{stats.difficulty}</span>
              </div>
            </div>
          </div>

          {/* 記録 */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4 px-2">
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

          {/* 次の目標（もう1回の導線） */}
          <div className="mt-4 flex flex-col items-center gap-1 min-h-[4.5rem]">
            {next && (
              <div className="hx-sticker text-2xl md:text-4xl text-neon-pink dopa-throb">
                あと {next.remain.toLocaleString()} てんで {next.rank} ランク！
              </div>
            )}
            {bestGap > 0 && (
              <div className="hx-sticker text-xl md:text-2xl text-neon-cyan">
                じこベストまで あと {bestGap.toLocaleString()} てん！
              </div>
            )}
          </div>

          <div className="mt-3 mb-2 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
            <div className="dopa-throb">
              <button
                onClick={() => { audioManager.playSelect(); onRetry(); }}
                className="hx-btn hx-yellow group px-12 py-4 text-3xl md:text-4xl"
              >
                <span className="hx-btn-in">
                  <RefreshCw className="w-10 h-10 mr-4 group-hover:rotate-180 transition-transform duration-500" strokeWidth={3} />
                  <span className="hx-sticker">もういっかい！</span>
                  <span className="ml-4 flex items-center gap-1 text-lg bg-neon-ink/60 rounded-lg px-3 py-1">
                    <CornerDownLeft size={18} /> Enter
                  </span>
                </span>
              </button>
            </div>
            <button
              onClick={() => { audioManager.playCancel(); onBackToTitle(); }}
              className="hx-btn hx-dark px-7 py-3 text-xl md:text-2xl"
            >
              <span className="hx-btn-in">
                <Home className="w-7 h-7 mr-2" />
                タイトルへ
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
