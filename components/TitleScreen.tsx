
import React, { useEffect, useRef, useState } from 'react';
import { Star, Zap, Crown, Baby, MessageCircle, Volume2, Settings, SlidersHorizontal, Timer, ListChecks, Check, Lock, GitBranch, Coins, Gift, BookOpen, Flame } from 'lucide-react';
import { Difficulty, Mode } from '../types';
import { audioManager, VolumeLevel } from '../utils/audioManager';
import { EffectLevel, mutateSave } from '../utils/saveData';
import { ALL_CLEAR_COINS, currentStreak, getMission, refreshDaily } from '../utils/daily';
import { GACHA_COST } from '../utils/gacha';
import { expToNext } from '../utils/progression';
import { isDifficultyUnlocked } from '../utils/skills';
import DopaBackground from './DopaBackground';
import EffectCanvas, { EffectHandle } from './EffectCanvas';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

interface TitleScreenProps {
  initialMode?: Mode;
  effectLevel?: EffectLevel;
  onStart: (mode: Mode, difficulty: Difficulty) => void;
  onOpenSettings: () => void;
  onOpenOptions: () => void;
  onOpenSkillTree: () => void;
  onOpenGacha: () => void;
  onOpenCollection: () => void;
}

// ロゴ「はちゃめちゃ」。1文字ずつ色と傾きを変えて暴れさせる
const LOGO_CHARS = [
  { ch: 'は', color: 'text-neon-pink', rot: '-8deg' },
  { ch: 'ち', color: 'text-neon-yellow', rot: '6deg' },
  { ch: 'ゃ', color: 'text-neon-cyan', rot: '-4deg' },
  { ch: 'め', color: 'text-neon-lime', rot: '7deg' },
  { ch: 'ち', color: 'text-neon-orange', rot: '-6deg' },
  { ch: 'ゃ', color: 'text-white', rot: '5deg' },
];

const TICKER = 'コンボを つなげ！ ★ FEVER を ねらえ！ ★ ノーミスで PERFECT!! ★ うてば うつほど きもちいい！ ★ めざせ SSS ランク！ ★ ';

const TitleScreen: React.FC<TitleScreenProps> = ({ initialMode = 'practice', effectLevel = 'max', onStart, onOpenSettings, onOpenOptions, onOpenSkillTree, onOpenGacha, onOpenCollection }) => {
  const [volume, setVolume] = useState<VolumeLevel>(audioManager.getVolume());
  const [mode, setMode] = useState<Mode>(initialMode);
  // 日付が変わっていたら、ここで今日のミッションに入れ替わる
  const [save] = useState(() => mutateSave(data => refreshDaily(data)));
  const { bests, player, skills, daily } = save;
  const streak = currentStreak(daily);
  const fxRef = useRef<EffectHandle>(null);
  const leftRef = useRef<RabidopaHandle>(null);
  const rightRef = useRef<RabidopaHandle>(null);
  const calm = effectLevel === 'low';

  // タイトルでもキャラが騒ぐ：ときどきジャンプして花火が上がる
  useEffect(() => {
    if (calm) return;
    const interval = window.setInterval(() => {
      (Math.random() < 0.5 ? leftRef : rightRef).current?.play('clear');
      fxRef.current?.firework();
    }, 1700);
    return () => clearInterval(interval);
  }, [calm]);

  const handleStart = (diff: Difficulty) => {
    // まだ解放していないレベルは、スキルツリーへ案内する
    if (!isDifficultyUnlocked(diff, skills)) {
      audioManager.playCancel();
      onOpenSkillTree();
      return;
    }
    audioManager.playSelect();
    onStart(mode, diff);
  };

  const handleMode = (next: Mode) => {
    audioManager.playSelect();
    setMode(next);
    fxRef.current?.confetti(calm ? 10 : 40);
    leftRef.current?.play('type');
    rightRef.current?.play('type');
  };

  const handleVolumeChange = (level: VolumeLevel) => {
    audioManager.setVolume(level);
    setVolume(level);
    if (level !== 'OFF') {
      audioManager.playSelect();
    }
  };

  const difficulties = [
    { id: Difficulty.EASY, label: "かんたん", desc: "1もじ", icon: Baby, color: "hx-lime", stars: 1 },
    { id: Difficulty.NORMAL, label: "ふつう", desc: "2〜5もじ", icon: Star, color: "hx-cyan", stars: 2 },
    { id: Difficulty.HARD, label: "むずかしい", desc: "ネタ・なまえ(短)", icon: Zap, color: "hx-orange", stars: 3 },
    { id: Difficulty.MASTER, label: "マスター", desc: "ネタ・なまえ", icon: Crown, color: "hx-purple", stars: 4 },
    { id: Difficulty.CONVERSATION, label: "かいわ", desc: "SNS・おしゃべり", icon: MessageCircle, color: "hx-pink", stars: 4 },
  ];

  const modes = [
    { id: 'practice' as Mode, label: 'れんしゅうモード', desc: '10もん じっくり', icon: ListChecks, color: 'hx-lime' },
    { id: 'arcade' as Mode, label: 'アーケードモード', desc: '60びょう うちまくれ！', icon: Timer, color: 'hx-red' },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DopaBackground level={0} calm={calm} />
      <EffectCanvas ref={fxRef} maxParticles={calm ? 150 : 300} ambient={calm ? 0 : 10} />

      <div className="relative z-30 h-screen overflow-y-auto overflow-x-hidden dopa-scroll">
        <div className="relative flex flex-col items-center justify-center min-h-full text-center px-5 md:px-10 pt-4 pb-16 gap-4 md:gap-5 animate-fade-in w-full max-w-7xl mx-auto font-pop">

          {/* おとの大きさ / オプション */}
          <div className="absolute top-3 right-3 md:top-5 md:right-6 z-20 flex items-center gap-4">
            <div className="hx-tag flex items-center px-2 py-1" style={{ '--edge': 'var(--purple)' } as React.CSSProperties}>
              <div className="px-2 text-neon-cyan">
                <Volume2 size={20} strokeWidth={3} />
              </div>
              <div className="flex gap-1">
                {(['OFF', 'LOW', 'MEDIUM', 'HIGH'] as VolumeLevel[]).map((level) => {
                  const labelMap = { OFF: 'OFF', LOW: '小', MEDIUM: '中', HIGH: '大' };
                  const isActive = volume === level;
                  return (
                    <button
                       key={level}
                       onClick={() => handleVolumeChange(level)}
                       className={`px-3 py-1 rounded-lg text-xs md:text-sm transition-all ${isActive ? 'bg-neon-cyan text-neon-ink scale-110' : 'text-white/60 hover:bg-white/20'}`}
                    >
                      {labelMap[level]}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              onClick={() => { audioManager.playSelect(); onOpenOptions(); }}
              className="hx-btn hx-purple px-4 py-2"
            >
              <span className="hx-btn-in gap-2">
                <SlidersHorizontal size={22} strokeWidth={3} />
                <span className="text-sm md:text-lg">オプション</span>
              </span>
            </button>
          </div>

          {/* レベル・EXP と スキルツリーの入口 */}
          <div className="absolute top-3 left-3 md:top-5 md:left-6 z-20 flex items-center gap-4">
            <div className="hx-tag px-3 py-1" style={{ '--edge': 'var(--cyan)' } as React.CSSProperties}>
              <div className="hx-unskew flex items-center gap-2">
                <span className="hx-num text-xl md:text-3xl text-white whitespace-nowrap">Lv {player.level}</span>
                <div className="hidden lg:block w-28 hx-gauge h-4">
                  <div className="h-full dopa-gauge-fill" style={{ width: `${Math.min(100, (player.exp / expToNext(player.level)) * 100)}%` }} />
                </div>
              </div>
            </div>
            <div className={player.sp > 0 && !calm ? 'dopa-throb' : ''}>
              <button
                onClick={() => { audioManager.playSelect(); onOpenSkillTree(); }}
                className="hx-btn hx-yellow px-4 py-2"
              >
                <span className="hx-btn-in gap-2">
                  <GitBranch size={22} strokeWidth={3} />
                  <span className="hidden lg:inline text-lg whitespace-nowrap">スキルツリー</span>
                  {player.sp > 0 && (
                    <span className="hx-num text-sm md:text-lg bg-neon-ink text-neon-yellow rounded-lg px-2 whitespace-nowrap">SP {player.sp}</span>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* タイトルロゴ。両わきでラビッドパが騒ぐ */}
          <div className="pt-12 md:pt-8 flex items-end justify-center gap-0 md:gap-2">
            <Rabidopa ref={leftRef} anim={calm ? 'idle' : 'fever'} aura={calm ? 0 : 3} className="relative z-10 shrink-0 w-[110px] h-[107px] -mt-10 md:w-[190px] md:h-[185px] md:-mt-16" />
            <h1 className="relative leading-none whitespace-nowrap">
              <span className="block text-[3.2rem] md:text-[6.5rem] tracking-tight">
                {LOGO_CHARS.map((c, i) => (
                  <span
                    key={i}
                    className={`dopa-title-char hx-sticker ${c.color}`}
                    style={{ animationDelay: `${i * 0.1}s`, '--r': c.rot } as React.CSSProperties}
                  >
                    {c.ch}
                  </span>
                ))}
              </span>
              <span className="relative inline-flex items-center -mt-2 md:-mt-4">
                <span className="hx-skew inline-block dopa-rainbow-fill border-[5px] border-neon-ink rounded-2xl px-8 md:px-12 py-1 shadow-[8px_9px_0_#0B0320]">
                  <span className="hx-unskew hx-sticker text-white text-4xl md:text-6xl tracking-[0.2em]">タイプ</span>
                </span>
                <span className="absolute -right-16 md:-right-24 -top-4 md:-top-6 w-16 h-16 md:w-24 md:h-24 flex items-center justify-center dopa-wiggle">
                  <span className="absolute inset-0 hx-burst bg-neon-ink" />
                  <span className="absolute inset-[5px] hx-burst bg-neon-yellow" />
                  <span className="relative text-neon-ink text-lg md:text-3xl">!!</span>
                </span>
              </span>
            </h1>
            <Rabidopa ref={rightRef} anim={calm ? 'idle' : 'shout'} aura={calm ? 0 : 2} className="relative z-10 shrink-0 w-[110px] h-[107px] -mt-10 md:w-[190px] md:h-[185px] md:-mt-16" />
          </div>

          {/* ① モード */}
          <div className="w-full">
            <div className="flex justify-start mb-3">
              <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--yellow)' } as React.CSSProperties}>
                <span className="hx-unskew text-neon-yellow text-lg md:text-2xl">① モードを えらぶ</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 px-2">
              {modes.map(m => {
                const isActive = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMode(m.id)}
                    className={`hx-btn ${isActive ? m.color : 'hx-off'} p-3 md:p-4`}
                  >
                    <span className="hx-btn-in gap-4">
                      <m.icon className="w-10 h-10 md:w-14 md:h-14" strokeWidth={3} />
                      <span className="text-left">
                        <span className={`block text-2xl md:text-4xl whitespace-nowrap ${isActive ? 'hx-sticker' : ''}`}>{m.label}</span>
                        <span className="block text-base md:text-xl whitespace-nowrap">{m.desc}</span>
                      </span>
                      {isActive && (
                        <span className="ml-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-neon-ink text-neon-yellow border-4 border-white dopa-throb">
                          <Check strokeWidth={4} />
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ② レベル */}
          <div className="w-full">
            <div className="flex justify-start mb-3">
              <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--cyan)' } as React.CSSProperties}>
                <span className="hx-unskew text-neon-cyan text-lg md:text-2xl">② レベルを えらんで スタート！</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 px-2">
              {difficulties.map((diff) => {
                const best = bests[`${mode}_${diff.id}`];
                const unlocked = isDifficultyUnlocked(diff.id, skills);
                return (
                  <button
                    key={diff.id}
                    onClick={() => handleStart(diff.id)}
                    className={`hx-btn ${unlocked ? diff.color : 'hx-off'} p-3 md:p-4`}
                  >
                    <span className="hx-btn-in flex-col w-full">
                      <span className="flex items-center gap-2">
                        <diff.icon className="w-8 h-8 md:w-10 md:h-10" strokeWidth={3} />
                        <span className="flex text-neon-yellow">
                          {Array.from({ length: diff.stars }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" stroke="#0B0320" strokeWidth={2} />
                          ))}
                        </span>
                      </span>
                      <span className="hx-sticker text-2xl md:text-4xl mt-1 whitespace-nowrap">{diff.label}</span>
                      <span className="text-sm md:text-base bg-neon-ink/40 px-3 py-0.5 rounded-full mt-1 whitespace-nowrap">{diff.desc}</span>
                      {unlocked ? (
                        <span className="hx-num text-sm md:text-lg mt-2 bg-neon-ink text-neon-yellow px-3 py-0.5 rounded-lg whitespace-nowrap">
                          {best ? `BEST ${best.score.toLocaleString()} [${best.rank}]` : 'BEST ---'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm md:text-base mt-2 bg-neon-ink text-white px-3 py-0.5 rounded-lg whitespace-nowrap">
                          <Lock size={16} strokeWidth={3} /> スキルツリーで かいほう
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ③ ごほうび：きょうのミッションと、ガチャ・ずかんの入口 */}
          <div className="w-full">
            <div className="flex flex-wrap items-center justify-start gap-3 mb-3">
              <div className="hx-tag px-5 py-1" style={{ '--edge': 'var(--pink)' } as React.CSSProperties}>
                <span className="hx-unskew text-neon-pink text-lg md:text-2xl">③ きょうの ミッション</span>
              </div>
              <span className="flex items-center gap-1 text-base md:text-xl text-neon-orange whitespace-nowrap">
                <Flame className="w-6 h-6" strokeWidth={3} />
                {streak > 0 ? <><span className="hx-num text-2xl md:text-3xl">{streak}</span>にち れんぞく！</> : 'きょうも あそぼう！'}
              </span>
              <span className="text-sm md:text-base text-white/70 whitespace-nowrap">
                {daily.bonusDone ? 'ぜんぶ たっせい！ すごい！' : `ぜんぶ できたら コイン +${ALL_CLEAR_COINS}`}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 px-2 items-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {daily.missions.map(m => {
                  const def = getMission(m.id);
                  if (!def) return null;
                  return (
                    <div key={m.id} className="hx-tag px-3 py-1.5" style={{ '--edge': m.done ? 'var(--lime)' : 'var(--purple)' } as React.CSSProperties}>
                      <div className="hx-unskew flex items-center gap-2 text-left">
                        <span className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-[3px] ${m.done ? 'bg-neon-lime border-neon-ink text-neon-ink' : 'border-white/50 text-transparent'}`}>
                          <Check strokeWidth={4} size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm md:text-base leading-tight ${m.done ? 'text-neon-lime' : 'text-white'}`}>{def.label}</span>
                          <span className="block text-sm text-white/70 whitespace-nowrap">
                            <span className="hx-num">{m.progress.toLocaleString()}/{def.target.toLocaleString()}</span>
                            <span className="ml-2 text-neon-yellow">{def.reward.coins ? `コイン +${def.reward.coins}` : `EXP +${def.reward.exp}`}</span>
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="hx-tag px-4 py-1" style={{ '--edge': 'var(--yellow)' } as React.CSSProperties}>
                  <div className="hx-unskew flex items-center gap-2">
                    <Coins className="w-7 h-7 text-neon-yellow" strokeWidth={3} />
                    <span className="hx-num text-2xl md:text-3xl text-white whitespace-nowrap">{player.coins.toLocaleString()}</span>
                  </div>
                </div>
                <div className={player.coins >= GACHA_COST && !calm ? 'dopa-throb' : ''}>
                  <button onClick={() => { audioManager.playSelect(); onOpenGacha(); }} className="hx-btn hx-yellow px-5 py-2">
                    <span className="hx-btn-in gap-2">
                      <Gift size={26} strokeWidth={3} />
                      <span className="text-xl md:text-2xl whitespace-nowrap">ガチャ</span>
                    </span>
                  </button>
                </div>
                <button onClick={() => { audioManager.playSelect(); onOpenCollection(); }} className="hx-btn hx-cyan px-5 py-2">
                  <span className="hx-btn-in gap-2">
                    <BookOpen size={26} strokeWidth={3} />
                    <span className="text-xl md:text-2xl whitespace-nowrap">ずかん</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Discrete Dev Settings Entry */}
          <button
            onClick={onOpenSettings}
            className="absolute right-2 bottom-16 p-2 text-white/30 hover:text-white hover:bg-white/20 rounded-full transition-all duration-300"
            title="Dev Settings"
          >
            <Settings size={22} />
          </button>
        </div>
      </div>

      {/* 下を流れる帯 */}
      <div className="fixed bottom-2 inset-x-0 z-30 pointer-events-none">
        <div className="hx-ticker py-1 font-pop text-lg md:text-2xl">
          <div className={`hx-ticker-track ${calm ? 'dopa-calm' : ''}`}>
            {TICKER.repeat(6)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitleScreen;
