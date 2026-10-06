import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { getEquipped, getItem } from '../utils/items';
import { ANIMS, LoopAnim, OneShotAnim, renderRabidopa } from '../utils/rabidopaRig';

export interface RabidopaHandle {
  play: (name: OneShotAnim) => void;
}

interface RabidopaProps {
  anim?: LoopAnim;          // ループさせる基本の動き
  aura?: 0 | 1 | 2 | 3 | 4; // オーラの段階（コンボ段階に合わせる）
  rainbow?: boolean;        // FEVER 中の虹色
  costume?: string;         // 衣装のアイテム ID。省くと、いま装備している衣装
  className?: string;
}

const AURA_CLASS = ['', 'rb-aura-1', 'rb-aura-2', 'rb-aura-3', 'rb-aura-4'];

// 相棒キャラ「ラビッドパ」。毎フレーム pose を計算して SVG を描き直す。
const Rabidopa = forwardRef<RabidopaHandle, RabidopaProps>(({ anim = 'idle', aura = 0, rainbow = false, costume, className = '' }, ref) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<LoopAnim>(anim);
  const shotRef = useRef<{ name: OneShotAnim; start: number } | null>(null);
  const clipId = 'rb' + useId().replace(/[^a-zA-Z0-9]/g, '');

  const [equipped] = useState(() => getEquipped('costume'));
  const item = (costume && getItem(costume)) || equipped;
  const paletteRef = useRef(item.palette);

  animRef.current = anim;
  paletteRef.current = item.palette;

  useImperativeHandle(ref, () => ({
    play: (name) => {
      const now = performance.now() / 1000;
      const cur = shotRef.current;
      // 正打鍵は、ジャンプやずっこけの見せ場（前半）を上書きしない
      if (name === 'type' && cur && cur.name !== 'type' && now - cur.start < ANIMS[cur.name].dur * 0.6) return;
      shotRef.current = { name, start: now };
    },
  }), []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now() / 1000;
      let pose = null;
      const shot = shotRef.current;
      if (shot) {
        const t = now - shot.start;
        if (t >= ANIMS[shot.name].dur) shotRef.current = null;
        else pose = ANIMS[shot.name].f(t);
      }
      if (!pose) {
        const loop = ANIMS[animRef.current];
        pose = loop.f(now % loop.dur);
      }
      if (hostRef.current) hostRef.current.innerHTML = renderRabidopa(pose, clipId, paletteRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clipId]);

  return (
    <div className={`pointer-events-none select-none ${className}`}>
      <div className={`relative w-full h-full ${AURA_CLASS[aura]} ${rainbow ? 'rb-rainbow' : ''}`}>
        {aura > 0 && <div className="rb-aura-glow" />}
        <div ref={hostRef} className={`relative w-full h-full ${item.rainbow ? 'rb-costume-rainbow' : ''}`} />
      </div>
    </div>
  );
});

export default Rabidopa;
