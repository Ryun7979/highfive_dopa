import React from 'react';

// カットインの叫び文字（FEVER!! など）。1文字ずつ箱に分けるだけで、
// ふち・立体・グラデーション・光沢は index.css の hx-shout-* が重ねる。
interface ShoutTextProps {
  text: string;
  tone?: 'gold' | 'pink';
  className?: string;
  style?: React.CSSProperties;
  letterClass?: string;   // 1文字ごとのアニメ（hx-fever-letter など）
  delay?: number;         // 1文字めが出るまでの秒
  step?: number;          // 1文字ごとにずらす秒
}

const kindOf = (word: string, c: string) => {
  if (c === '!' || c === '?') return 'hx-shout-bang';
  // 「W ボーナス」の W のように、英字1文字だけの語は大きなエンブレムにする
  if (word.length === 1 && /[A-Za-z]/.test(c)) return 'hx-shout-big';
  return '';
};

export const ShoutText: React.FC<ShoutTextProps> = ({ text, tone = 'gold', className = '', style, letterClass = '', delay, step = 0 }) => {
  let n = 0;
  return (
    <div className={`hx-shout ${tone === 'pink' ? 'hx-shout-pink' : ''} ${className}`} style={style} aria-label={text}>
      {text.split(' ').map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 && <span className="hx-shout-sp" />}
          {word.split('').map((c, i) => {
            const d = delay === undefined ? undefined : `${delay + n * step}s`;
            n += 1;
            return (
              <span key={i} className="hx-shout-slot">
                <span data-c={c} aria-hidden className={`hx-shout-ch ${kindOf(word, c)} ${letterClass}`} style={d ? { animationDelay: d } : undefined}>{c}</span>
              </span>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

// 「スコア ×4」の札。倍率（×4）だけ大きく出す
export const ShoutSub: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => (
  <div className={`hx-shout-sub ${className}`}>
    {text.split(/(×\d+)/).map((part, i) => /^×\d+$/.test(part)
      ? <span key={i} className="hx-shout-mult">{part}</span>
      : <span key={i}>{part}</span>)}
  </div>
);

export default ShoutText;
