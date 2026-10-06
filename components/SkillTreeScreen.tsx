import React, { useRef, useState } from 'react';
import { ArrowLeft, Check, Lock, RotateCcw, Star } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { EffectLevel, loadSave } from '../utils/saveData';
import { expToNext } from '../utils/progression';
import { SKILL_BRANCHES, SKILL_NODES, SkillBranch, SkillNode, getSkillState, resetSkills, unlockSkill } from '../utils/skills';
import DopaBackground from './DopaBackground';
import FitScreen from './FitScreen';
import EffectCanvas, { EffectHandle } from './EffectCanvas';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

interface SkillTreeScreenProps {
  effectLevel?: EffectLevel;
  onBack: () => void;
}

const BRANCH_STYLE: Record<SkillBranch, { btn: string; edge: string; text: string }> = {
  play: { btn: 'hx-lime', edge: 'var(--lime)', text: 'text-neon-lime' },
  boost: { btn: 'hx-orange', edge: 'var(--orange)', text: 'text-neon-orange' },
  fx: { btn: 'hx-pink', edge: 'var(--pink)', text: 'text-neon-pink' },
};

// スキルツリー画面（docs/spec.md §8）。SP でノードを解放する。振り直しは無料
const SkillTreeScreen: React.FC<SkillTreeScreenProps> = ({ effectLevel = 'max', onBack }) => {
  const [save, setSave] = useState(() => loadSave());
  const fxRef = useRef<EffectHandle>(null);
  const rabbitRef = useRef<RabidopaHandle>(null);
  const calm = effectLevel === 'low';
  const { player, skills } = save;

  const handleNode = (node: SkillNode, e: React.MouseEvent) => {
    const state = getSkillState(node, skills);
    if (state !== 'open' || player.sp < node.cost) {
      audioManager.playCancel();
      return;
    }
    setSave(unlockSkill(node.id));
    audioManager.playUnlock();
    rabbitRef.current?.play('clear');
    const fx = fxRef.current;
    if (fx) {
      fx.burst(e.clientX, e.clientY, calm ? 30 : 80, 1.5);
      fx.ring(e.clientX, e.clientY, '#FFE600');
      fx.confetti(calm ? 20 : 70);
      fx.firework();
      if (!calm) fx.flash('#FFFFFF', 0.5);
    }
  };

  const handleReset = () => {
    if (skills.length === 0) {
      audioManager.playCancel();
      return;
    }
    audioManager.playSelect();
    setSave(resetSkills());
  };

  // 操作ボタンは画面の下に固定する（中身がスクロールになっても押せるように）
  const footer = (
    <>
      <button
        onClick={() => { audioManager.playCancel(); onBack(); }}
        className="hx-btn hx-red px-12 py-3 text-2xl md:text-3xl"
      >
        <span className="hx-btn-in">
          <ArrowLeft className="w-8 h-8 mr-3" strokeWidth={3} />
          <span className="hx-sticker">もどる</span>
        </span>
      </button>
      <button onClick={handleReset} className="hx-btn hx-dark px-6 py-3 text-lg md:text-xl">
        <span className="hx-btn-in">
          <RotateCcw className="w-6 h-6 mr-2" strokeWidth={3} />
          ふりなおす（タダ）
        </span>
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DopaBackground level={2} calm={calm} />
      <EffectCanvas ref={fxRef} maxParticles={calm ? 150 : 300} ambient={calm ? 0 : 8} />
      <FitScreen className="relative z-30 animate-fade-in font-pop" footer={footer} innerClassName="flex flex-col items-center p-5 pt-10 md:p-8 md:pt-12">
        <div className="hx-panel w-full max-w-[1600px] p-5 md:p-8" style={{ '--edge': 'var(--yellow)' } as React.CSSProperties}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-2xl px-12 py-2 shadow-[8px_9px_0_#0B0320] whitespace-nowrap">
              <h2 className="hx-unskew hx-sticker text-white text-3xl md:text-5xl tracking-wider leading-none">スキルツリー</h2>
            </div>
          </div>

          {/* レベル・EXP・のこり SP */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
            <Rabidopa
              ref={rabbitRef}
              anim={player.sp > 0 ? 'shout' : 'groove'}
              aura={player.sp > 0 ? 2 : 0}
              className="w-[90px] h-[88px] md:w-[130px] md:h-[126px] -my-4"
            />
            <div className="hx-tag px-5 py-2" style={{ '--edge': 'var(--cyan)' } as React.CSSProperties}>
              <div className="hx-unskew flex items-center gap-3">
                <span className="hx-num text-3xl md:text-4xl text-white whitespace-nowrap">Lv {player.level}</span>
                <div className="w-32 md:w-48">
                  <div className="hx-gauge h-4">
                    <div className="h-full dopa-gauge-fill" style={{ width: `${Math.min(100, (player.exp / expToNext(player.level)) * 100)}%` }} />
                  </div>
                  <div className="mt-3 text-xs md:text-sm text-neon-cyan whitespace-nowrap">つぎの レベルまで {expToNext(player.level) - player.exp} EXP</div>
                </div>
              </div>
            </div>
            <div className={player.sp > 0 ? 'dopa-throb' : ''}>
              <div className="hx-tag px-6 py-1" style={{ '--edge': 'var(--yellow)' } as React.CSSProperties}>
                <div className="hx-unskew flex items-center gap-2">
                  <Star className="w-8 h-8 text-neon-yellow" fill="currentColor" />
                  <span className="text-lg md:text-xl text-neon-yellow whitespace-nowrap">スキルポイント</span>
                  <span className="hx-num text-4xl md:text-5xl text-white">{player.sp}</span>
                </div>
              </div>
            </div>
            <div className="text-base md:text-lg text-white/80">レベルが あがると 1 もらえるよ！</div>
          </div>

          {/* 3本の枝 */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-4">
            {SKILL_BRANCHES.map(branch => {
              const style = BRANCH_STYLE[branch.id];
              return (
                <div key={branch.id} className={`bg-neon-ink/50 rounded-2xl border-4 border-neon-ink p-3 pb-5 ${branch.id === 'boost' ? 'lg:col-span-2' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="hx-tag px-4 py-0.5" style={{ '--edge': style.edge } as React.CSSProperties}>
                      <span className={`hx-unskew text-xl md:text-2xl ${style.text}`}>{branch.label}</span>
                    </div>
                    <span className="text-sm md:text-base text-white/70">{branch.desc}</span>
                  </div>
                  <div className={`grid grid-cols-1 gap-4 px-2 ${branch.id === 'boost' ? 'lg:grid-cols-2 lg:grid-rows-4 lg:grid-flow-col lg:gap-x-6' : ''}`}>
                    {SKILL_NODES.filter(n => n.branch === branch.id).map(node => {
                      const state = getSkillState(node, skills);
                      const affordable = state === 'open' && player.sp >= node.cost;
                      return (
                        <div key={node.id} className={`${affordable && !calm ? 'dopa-throb' : ''} ${node.requires ? 'ml-6' : ''}`}>
                          <button
                            onClick={(e) => handleNode(node, e)}
                            className={`hx-btn ${state === 'owned' || affordable ? style.btn : 'hx-off'} w-full px-3 py-2`}
                          >
                            <span className="hx-btn-in w-full justify-between gap-3">
                              <span className="text-left min-w-0">
                                <span className={`block text-lg md:text-xl leading-tight ${state === 'owned' ? 'hx-sticker' : ''}`}>{node.label}</span>
                                <span className="block text-xs md:text-sm">{node.desc}</span>
                              </span>
                              <span className="shrink-0 flex items-center justify-center min-w-[3.5rem] h-12 px-2 rounded-xl bg-neon-ink/70 border-2 border-white/60">
                                {state === 'owned' ? (
                                  <Check className="text-neon-lime" strokeWidth={4} />
                                ) : state === 'locked' ? (
                                  <Lock className="text-white/60" strokeWidth={3} />
                                ) : (
                                  <span className="hx-num text-xl text-neon-yellow whitespace-nowrap">SP {node.cost}</span>
                                )}
                              </span>
                            </span>
                          </button>
                        </div>
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

export default SkillTreeScreen;
