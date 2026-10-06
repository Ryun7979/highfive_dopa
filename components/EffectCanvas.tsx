import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ITEMS, getEquipped, getItem } from '../utils/items';

export const RAINBOW = ['#FF1744', '#FF9100', '#FFD600', '#00E676', '#00E5FF', '#2962FF', '#D500F9', '#F50057'];

export interface EffectHandle {
  burst: (x: number, y: number, count: number, power?: number) => void; // はじけるパーティクル
  flyChar: (x: number, y: number, ch: string) => void;                  // 打った文字が画面外へ飛ぶ
  ring: (x: number, y: number, color?: string) => void;                 // 広がる輪
  firework: (x?: number, y?: number) => void;                           // 花火
  confetti: (count: number) => void;                                    // 紙ふぶき
  flash: (color: string, alpha: number) => void;                        // 画面全体のフラッシュ
}

interface EffectCanvasProps {
  maxParticles?: number; // 60fps 維持のための同時数の上限（docs/spec.md §12）
  ambient?: number;      // 1秒あたりに下からわき上がるキラキラの数
  effect?: string;       // 打鍵エフェクトのアイテム ID。省くと、いま装備しているもの
}

type Kind = 'dot' | 'star' | 'char' | 'conf' | 'ring' | 'img';
interface Particle {
  kind: Kind; x: number; y: number; vx: number; vy: number; g: number;
  life: number; max: number; size: number; color: string; rot: number; vr: number; ch?: string; img?: HTMLImageElement;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// エフェクトの絵（1種につき4枚。docs/assets.md）。読みこめた絵だけを配列に入れる
const SPRITES_PER_EFFECT = 4;
const spriteCache = new Map<string, HTMLImageElement[]>();
const loadSprites = (name: string): HTMLImageElement[] => {
  let list = spriteCache.get(name);
  if (list) return list;
  list = [];
  spriteCache.set(name, list);
  for (let n = 1; n <= SPRITES_PER_EFFECT; n++) {
    const img = new Image();
    img.onload = () => list!.push(img);
    img.src = `/assets/images/fx/fx_${name}_${n}.webp`;
  }
  return list;
};

const drawStar = (ctx: CanvasRenderingContext2D, r: number) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
};

// 演出レイヤー（Canvas）。親からは ref 経由で命令し、React の再描画を起こさない。
const EffectCanvas = forwardRef<EffectHandle, EffectCanvasProps>(({ maxParticles = 300, ambient = 0, effect }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const flashRef = useRef<{ color: string; a: number }>({ color: '#fff', a: 0 });
  const maxRef = useRef(maxParticles);
  const ambientRef = useRef(ambient);
  // パーティクルの色表は装備中のエフェクトで決まる
  const [equipped] = useState(() => getEquipped('effect'));
  const colorsRef = useRef<string[]>(RAINBOW);
  const item = (effect && getItem(effect)) || equipped;
  colorsRef.current = item.colors ?? RAINBOW;
  // 絵がまだ読みこめていない・読みこめなかったときは空のままで、丸と星を描く
  const spritesRef = useRef<HTMLImageElement[]>([]);
  spritesRef.current = item.sprite ? loadSprites(item.sprite) : [];
  // その場で切り替える画面（図鑑）では、切り替えた直後から絵で出せるように全種を先に読みこむ
  useEffect(() => {
    if (effect) ITEMS.forEach(i => i.sprite && loadSprites(i.sprite));
  }, []);
  maxRef.current = maxParticles;
  ambientRef.current = ambient;

  const push = (p: Particle) => {
    const list = particles.current;
    list.push(p);
    if (list.length > maxRef.current) list.splice(0, list.length - maxRef.current);
  };

  useImperativeHandle(ref, () => ({
    burst: (x, y, count, power = 1) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(200, 900) * power;
        const max = rand(0.35, 0.8);
        const sprites = spritesRef.current;
        if (sprites.length && Math.random() < 0.5) {
          push({ kind: 'img', img: pick(sprites), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, g: 1400,
            life: max, max, size: rand(22, 44) * Math.min(1.6, power), color: '', rot: rand(-0.6, 0.6), vr: rand(-6, 6) });
          continue;
        }
        push({ kind: Math.random() < 0.4 ? 'star' : 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, g: 1400,
          life: max, max, size: rand(6, 18) * Math.min(1.6, power), color: pick(colorsRef.current), rot: rand(0, 6), vr: rand(-10, 10) });
      }
    },
    flyChar: (x, y, ch) => {
      const max = 0.9;
      push({ kind: 'char', x, y, vx: rand(-700, 700), vy: rand(-1500, -900), g: 2200, life: max, max,
        size: rand(48, 84), color: pick(colorsRef.current), rot: 0, vr: rand(-12, 12), ch });
    },
    ring: (x, y, color) => {
      push({ kind: 'ring', x, y, vx: 0, vy: 0, g: 0, life: 0.5, max: 0.5, size: 20, color: color || pick(colorsRef.current), rot: 0, vr: 0 });
    },
    firework: (x, y) => {
      const cx = x ?? rand(window.innerWidth * 0.15, window.innerWidth * 0.85);
      const cy = y ?? rand(window.innerHeight * 0.1, window.innerHeight * 0.5);
      const color = pick(colorsRef.current);
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const sp = rand(350, 650);
        const max = rand(0.7, 1.1);
        push({ kind: 'dot', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 500, life: max, max,
          size: rand(6, 11), color: i % 3 === 0 ? '#FFFFFF' : color, rot: 0, vr: 0 });
      }
      push({ kind: 'ring', x: cx, y: cy, vx: 0, vy: 0, g: 0, life: 0.6, max: 0.6, size: 30, color, rot: 0, vr: 0 });
    },
    confetti: (count) => {
      for (let i = 0; i < count; i++) {
        const max = rand(1.2, 2.2);
        push({ kind: 'conf', x: rand(0, window.innerWidth), y: rand(-80, -10), vx: rand(-150, 150), vy: rand(200, 700), g: 500,
          life: max, max, size: rand(10, 22), color: pick(colorsRef.current), rot: rand(0, 6), vr: rand(-12, 12) });
      }
    },
    flash: (color, alpha) => {
      // 強いフラッシュの最中に弱いフラッシュが来ても、色と強さを上書きしない
      if (alpha >= flashRef.current.a) flashRef.current = { color, a: alpha };
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let ambientAcc = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = window.innerWidth, H = window.innerHeight;

      ambientAcc += ambientRef.current * dt;
      while (ambientAcc >= 1) {
        ambientAcc -= 1;
        const max = rand(1.2, 2.4);
        const sprites = spritesRef.current;
        if (sprites.length) {
          push({ kind: 'img', img: pick(sprites), x: rand(0, W), y: H + 20, vx: rand(-40, 40), vy: rand(-520, -220), g: 0, life: max, max,
            size: rand(24, 48), color: '', rot: rand(-0.5, 0.5), vr: rand(-2, 2) });
          continue;
        }
        push({ kind: 'star', x: rand(0, W), y: H + 20, vx: rand(-40, 40), vy: rand(-520, -220), g: 0, life: max, max,
          size: rand(8, 20), color: pick(colorsRef.current), rot: rand(0, 6), vr: rand(-4, 4) });
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const list = particles.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt;
        if (p.life <= 0 || p.y > H + 200) { list.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const k = p.life / p.max; // 1 → 0
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = Math.min(1, k * 2);
        if (p.kind === 'ring') {
          const r = p.size + (1 - k) * 260;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 14 * k + 2;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === 'char' && p.ch) {
          ctx.rotate(p.rot);
          const s = p.size * (1 + (1 - k) * 0.8);
          ctx.font = `800 ${s}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = s * 0.14;
          ctx.strokeStyle = '#1e1033';
          ctx.strokeText(p.ch, 0, 0);
          ctx.fillStyle = p.color;
          ctx.fillText(p.ch, 0, 0);
        } else if (p.kind === 'conf') {
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.rot * 1.7)); // ひらひら
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size / 1.5);
        } else if (p.kind === 'img' && p.img) {
          ctx.rotate(p.rot);
          // 縦長・横長の絵でも、長いほうの辺が size になるようにそろえる
          const s = p.size * (0.5 + k * 0.5) / Math.max(p.img.naturalWidth, p.img.naturalHeight);
          const w = p.img.naturalWidth * s, h = p.img.naturalHeight * s;
          ctx.drawImage(p.img, -w / 2, -h / 2, w, h);
        } else if (p.kind === 'star') {
          ctx.rotate(p.rot);
          drawStar(ctx, p.size * (0.5 + k * 0.5));
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (0.3 + k * 0.7) / 2 + 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      const f = flashRef.current;
      if (f.a > 0.01) {
        ctx.globalAlpha = f.a;
        ctx.fillStyle = f.color;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        f.a *= Math.pow(0.00001, dt); // 約0.1秒で消える（連打でも出題文字が白くかすまない）
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-40" />;
});

export default EffectCanvas;
