import React, { useEffect, useRef, useState } from 'react';
import { audioManager } from '../utils/audioManager';
import Rabidopa, { RabidopaHandle } from './Rabidopa';

// プレイ開始のカウントダウン（docs/spec.md §6.7）。「よーい… → 3 → 2 → 1 → GO!!」
// 見た目・進行・音だけを受けもつ。画面全体の演出とゲームの開始は onStep を受けた側が行う。
const READY_MS = 300;
const STEP_MS = 700;
const GO_MS = 800;

type Step = 'ready' | 3 | 2 | 1 | 'go';

const NUM_TEXT: Record<3 | 2 | 1, string> = { 3: 'text-neon-cyan', 2: 'text-neon-yellow', 1: 'text-neon-pink' };
const STEP_COLOR: Record<Step, string> = { ready: '#FFFFFF', 3: '#00F0FF', 2: '#FFE600', 1: '#FF2E93', go: '#FFFFFF' };
const AURA: Record<Step, 0 | 1 | 2 | 3 | 4> = { ready: 0, 3: 1, 2: 2, 1: 3, go: 4 };
// 帯の傾き。数字ごとに左右へ切りかわる
const TILT: Record<Step, string> = { ready: 'hx-count-band-in', 3: 'hx-count-tilt-r', 2: 'hx-count-tilt-l', 1: 'hx-count-tilt-r', go: 'hx-count-band-out' };
const TICKER = Array.from({ length: 12 });

interface StartCountdownProps {
  calm?: boolean;                 // 演出のつよさ「ひかえめ」
  onStep: (n: 3 | 2 | 1 | 0) => void; // 数字が出た瞬間。0 は GO!!（ここでゲームを始める）
  onEnd: () => void;              // GO!! が消えたあと
}

const StartCountdown: React.FC<StartCountdownProps> = ({ calm = false, onStep, onEnd }) => {
  const [step, setStep] = useState<Step>('ready');
  const rabbitRef = useRef<RabidopaHandle>(null);
  const rabbitBoxRef = useRef<HTMLDivElement>(null);
  const onStepRef = useRef(onStep);
  const onEndRef = useRef(onEnd);
  onStepRef.current = onStep;
  onEndRef.current = onEnd;

  // 進行は setTimeout（rAF は裏のタブで止まる）
  useEffect(() => {
    const box = () => rabbitBoxRef.current;
    // 下からとびだして着地
    box()?.animate(
      [
        { transform: 'translateY(90vh) rotate(-30deg) scale(0.6)' },
        { transform: 'translateY(-6vh) rotate(6deg) scale(1.08, 0.94)', offset: 0.7 },
        { transform: 'translateY(0) scale(1.16, 0.82)', offset: 0.88 },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: READY_MS, easing: 'ease-out' }
    );
    // 数字ごとに左右へとびはねる。「1」は1回転
    const hop = (dir: number, spin: boolean) => box()?.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg) scale(1.2, 0.78)' },
        { transform: `translate(${dir * 5}vw, -15vh) rotate(${spin ? 180 : dir * 16}deg) scale(0.94, 1.1)`, offset: 0.42 },
        { transform: `translate(0, 0) rotate(${spin ? 360 : 0}deg) scale(1.22, 0.76)`, offset: 0.78 },
        { transform: `translate(0, 0) rotate(${spin ? 360 : 0}deg) scale(1)` },
      ],
      { duration: 520, easing: 'ease-out' }
    );
    // GO!!：とびあがって、フッター右の立ち位置へ飛んでいく
    const launch = () => {
      const el = box();
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = window.innerWidth - (r.left + r.width / 2) - window.innerHeight * 0.13;
      const dy = window.innerHeight - (r.top + r.height / 2) - window.innerHeight * 0.16;
      el.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg) scale(1.25, 0.75)' },
          { transform: 'translate(0, -17vh) rotate(-10deg) scale(1.3)', offset: 0.22 },
          { transform: 'translate(0, -13vh) rotate(8deg) scale(1.22)', offset: 0.62 },
          { transform: `translate(${dx}px, ${dy}px) rotate(360deg) scale(0.3)` },
        ],
        { duration: GO_MS, easing: 'ease-in-out', fill: 'forwards' }
      );
    };
    const count = (n: 3 | 2 | 1) => () => {
      setStep(n);
      audioManager.playCountBeep(n);
      if (!calm) {
        rabbitRef.current?.play('count');
        hop(n === 2 ? 1 : -1, n === 1);
      }
      onStepRef.current(n);
    };
    const timers = [
      window.setTimeout(count(3), READY_MS),
      window.setTimeout(count(2), READY_MS + STEP_MS),
      window.setTimeout(count(1), READY_MS + STEP_MS * 2),
      window.setTimeout(() => {
        setStep('go');
        audioManager.playGo();
        rabbitRef.current?.play('clear');
        launch();
        onStepRef.current(0);
      }, READY_MS + STEP_MS * 3),
      window.setTimeout(() => onEndRef.current(), READY_MS + STEP_MS * 3 + GO_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [calm]);

  const go = step === 'go';
  const color = STEP_COLOR[step];
  const ticker = (
    <div className="hx-ticker-track hx-count-ticker-track hx-num">
      {TICKER.map((_, i) => <span key={i} className="mx-[2vw]">{go ? 'GO!! ★ GO!! ★' : 'READY? ★ READY? ★'}</span>)}
    </div>
  );

  return (
    <>
      {/* うしろを暗くする幕。パーティクル（z-40）より下に置く */}
      <div className={`fixed inset-0 z-[39] pointer-events-none bg-neon-ink/60 ${go ? 'hx-count-fade' : 'animate-fade-in'}`} />
      <div className="fixed inset-0 z-[47] pointer-events-none overflow-hidden font-pop" style={{ '--count': color } as React.CSSProperties}>
        {/* 画面いっぱいの、ふちどりだけの数字 */}
        {!calm && typeof step === 'number' && <div key={step} className="hx-ghost-combo hx-num">{step}</div>}
        {!calm && go && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="hx-cutin-rays hx-count-gorays" />
          </div>
        )}

        <div className="absolute inset-x-0 top-[22vh] h-[56vh]">
          {/* 帯。中身（ラビッドパと数字）とは別に動かす */}
          <div className={`hx-cutin-band hx-count-band inset-y-0 overflow-hidden ${go ? 'dopa-rainbow-fill' : 'bg-neon-ink'} ${TILT[step]}`}>
            {!calm && <div className="hx-cutin-speed" />}
            <div className="hx-count-ticker top-0">{ticker}</div>
            <div className="hx-count-ticker hx-count-ticker-rev bottom-0">{ticker}</div>
          </div>

          <div className="relative h-full flex items-center justify-center gap-[2vw]">
            <div ref={rabbitBoxRef} className="relative shrink-0">
              <Rabidopa ref={rabbitRef} anim={go ? 'shout' : 'ready'} aura={AURA[step]} rainbow={go} className="hx-count-rabbit aspect-[720/700]" />
            </div>
            <div className="hx-count-slot relative shrink-0 flex items-center justify-center">
              {step === 'ready' && (
                <div className="hx-count-ready hx-sticker text-white whitespace-nowrap">
                  {'よーい…'.split('').map((c, i) => (
                    <span key={i} className="hx-count-letter" style={{ animationDelay: `${i * 0.07}s` }}>{c}</span>
                  ))}
                </div>
              )}
              {typeof step === 'number' && (
                <div key={step} className="absolute inset-0 flex items-center justify-center">
                  {!calm && (
                    <>
                      <div className="hx-count-rays" />
                      <div className="hx-count-wave" />
                      <div className="hx-count-wave hx-count-wave-2" />
                    </>
                  )}
                  {/* ギザギザの爆発マーク */}
                  <div className="hx-count-burst hx-count-pop">
                    <div className={`absolute inset-0 hx-burst ${calm ? '' : 'hx-spin-fast'}`} style={{ background: color }} />
                    <div className={`absolute inset-[6%] hx-burst hx-count-burst-in ${calm ? '' : 'hx-spin-fast'}`} />
                  </div>
                  <div className="relative hx-count-slam">
                    <div className={`hx-count-num hx-num hx-sticker leading-none ${NUM_TEXT[step]} ${calm ? '' : 'dopa-wiggle'}`}>{step}</div>
                  </div>
                </div>
              )}
              {go && (
                <div className="hx-count-go hx-count-go-slam hx-num hx-sticker leading-none text-white whitespace-nowrap">
                  {'GO!!'.split('').map((c, i) => (
                    <span key={i} className="hx-count-letter" style={{ animationDelay: `${i * 0.06}s` }}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StartCountdown;
