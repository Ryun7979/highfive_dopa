import React, { useLayoutEffect, useRef } from 'react';

interface FitScreenProps {
  className?: string;      // 外側（画面いっぱいの枠）
  innerClassName?: string; // 内側（縮める中身）
  footer?: React.ReactNode; // 操作ボタンの段。中身とは別に画面の下へ固定し、いつでも押せるようにする
  reserveBottom?: number;  // 画面の下に空けておく高さ（px）。固定表示の帯などに中身がかぶらないようにする
  children: React.ReactNode;
}

// これより小さく縮めないと収まらないとき（スマホなど）は、縮めずに中身だけスクロールさせる
const MIN_SCALE = 0.6;

// 画面の高さに収まるよう、中身をまとめて縮める入れ物。メニュー系の画面をスクロールなしで見せる。
// 縮めた分だけ中身の幅を広げてから scale をかけるので、横幅はいつも画面いっぱいに使える。
// もどる・決定などのボタンは footer に渡す。中身がスクロールになっても、ボタンは画面の下に残る。
// プレイ画面では使わない（出題文字の大きさを変えないため）。
const FitScreen: React.FC<FitScreenProps> = ({ className = '', innerClassName = '', footer, reserveBottom = 0, children }) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const inner = innerRef.current;
    if (!body || !inner) return;
    let timer = 0;

    // z 倍に縮めたときの、縮める前の高さを返す（offsetHeight は子の transform の影響を受けない）
    const apply = (z: number): number => {
      inner.style.width = `${100 / z}%`;
      inner.style.transform = z < 1 ? `scale(${z})` : '';
      return inner.offsetHeight;
    };

    const fit = () => {
      const H = body.clientHeight;
      let z = 1;
      const h = apply(1);
      if (h > H) {
        // 縮めると幅が広がって中身の高さも変わる（低くなる画面も、正方形のカードのように高くなる画面もある）。
        // そのつど測りなおしながら、収まる範囲でいちばん大きい倍率を二分探索でさがす
        let lo = MIN_SCALE / 2;
        let hi = 1;
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          if (apply(mid) * mid <= H) lo = mid;
          else hi = mid;
        }
        z = lo;
        apply(z);
      }
      const scroll = z < MIN_SCALE;
      if (scroll) apply(1);
      body.style.overflowY = scroll ? 'auto' : 'hidden';
      body.style.alignItems = scroll ? 'flex-start' : 'center';
    };

    // rAF は裏に回ったタブで止まるので、タイマーで起こす
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(fit, 0);
    };
    fit();
    const ro = new ResizeObserver(schedule);
    ro.observe(body);
    ro.observe(inner);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className={`h-screen flex flex-col ${className}`}
      style={reserveBottom ? { height: `calc(100vh - ${reserveBottom}px)` } : undefined}
    >
      <div ref={bodyRef} className="flex-1 min-h-0 overflow-x-hidden dopa-scroll flex justify-center">
        <div ref={innerRef} className={`shrink-0 origin-center ${innerClassName}`}>
          {children}
        </div>
      </div>
      {footer && (
        <div className="shrink-0 relative z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 pt-3 pb-5 bg-neon-ink/70 border-t-4 border-neon-ink">
          {footer}
        </div>
      )}
    </div>
  );
};

export default FitScreen;
