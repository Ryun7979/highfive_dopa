
import React from 'react';
import { Hand } from 'lucide-react';

interface KeyboardHintProps {
  activeKey: string;
}

const KEYS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '-'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

interface FingerStyle {
  text: string;
  color: string;
  border: string;
  textCol: string;
}

const FINGER_MAP: Record<string, FingerStyle> = {
  'Q': { text: 'ひだりて こゆび', color: 'bg-pink-400', border: 'border-pink-600', textCol: 'text-pink-300' },
  'A': { text: 'ひだりて こゆび', color: 'bg-pink-400', border: 'border-pink-600', textCol: 'text-pink-300' },
  'Z': { text: 'ひだりて こゆび', color: 'bg-pink-400', border: 'border-pink-600', textCol: 'text-pink-300' },
  'W': { text: 'ひだりて くすりゆび', color: 'bg-purple-400', border: 'border-purple-600', textCol: 'text-purple-300' },
  'S': { text: 'ひだりて くすりゆび', color: 'bg-purple-400', border: 'border-purple-600', textCol: 'text-purple-300' },
  'X': { text: 'ひだりて くすりゆび', color: 'bg-purple-400', border: 'border-purple-600', textCol: 'text-purple-300' },
  'E': { text: 'ひだりて なかゆび', color: 'bg-blue-400', border: 'border-blue-600', textCol: 'text-blue-300' },
  'D': { text: 'ひだりて なかゆび', color: 'bg-blue-400', border: 'border-blue-600', textCol: 'text-blue-300' },
  'C': { text: 'ひだりて なかゆび', color: 'bg-blue-400', border: 'border-blue-600', textCol: 'text-blue-300' },
  'R': { text: 'ひだりて ひとさしゆび', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-300' },
  'T': { text: 'ひだりて ひとさしゆび', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-300' },
  'F': { text: 'ひだりて ひとさしゆび', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-300' },
  'G': { text: 'ひだりて ひとさしゆび', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-300' },
  'V': { text: 'ひだりて ひとさしゆび', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-300' },
  'B': { text: 'ひだりて ひとさしゆび', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-300' },
  'Y': { text: 'みぎて ひとさしゆび', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-300' },
  'U': { text: 'みぎて ひとさしゆび', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-300' },
  'H': { text: 'みぎて ひとさしゆび', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-300' },
  'J': { text: 'みぎて ひとさしゆび', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-300' },
  'N': { text: 'みぎて ひとさしゆび', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-300' },
  'M': { text: 'みぎて ひとさしゆび', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-300' },
  'I': { text: 'みぎて なかゆび', color: 'bg-yellow-400', border: 'border-yellow-600', textCol: 'text-yellow-300' },
  'K': { text: 'みぎて なかゆび', color: 'bg-yellow-400', border: 'border-yellow-600', textCol: 'text-yellow-300' },
  'O': { text: 'みぎて くすりゆび', color: 'bg-orange-400', border: 'border-orange-600', textCol: 'text-orange-300' },
  'L': { text: 'みぎて くすりゆび', color: 'bg-orange-400', border: 'border-orange-600', textCol: 'text-orange-300' },
  'P': { text: 'みぎて こゆび', color: 'bg-red-400', border: 'border-red-600', textCol: 'text-red-300' },
  '-': { text: 'みぎて こゆび', color: 'bg-red-400', border: 'border-red-600', textCol: 'text-red-300' },
};

const DEFAULT_FINGER: FingerStyle = { text: '', color: 'bg-slate-300', border: 'border-slate-400', textCol: 'text-slate-300' };

export const KeyboardHint: React.FC<KeyboardHintProps> = ({ activeKey }) => {
  const target = activeKey.toUpperCase();
  const fingerInfo = FINGER_MAP[target] || DEFAULT_FINGER;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 bg-neon-ink/95 border-t-[6px] border-neon-cyan shadow-[0_-10px_50px_rgba(0,240,255,0.5)] animate-slide-up transition-all duration-300 backdrop-blur-md font-pop">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
        
        <div className="flex items-center gap-4 md:gap-8 bg-neon-panel px-8 py-3 rounded-2xl border-4 border-neon-yellow shadow-[6px_7px_0_#000]">
          <Hand className={`w-12 h-12 md:w-16 md:h-16 ${fingerInfo.textCol}`} />
          <div className="flex items-baseline gap-4">
             <span className={`text-xl md:text-2xl font-bold text-white px-4 py-1 rounded-lg border-b-4 ${fingerInfo.color} ${fingerInfo.border}`}>
               {fingerInfo.text}
             </span>
             <span className="text-xl md:text-2xl text-white font-bold">で</span>
             <span className={`text-5xl md:text-6xl font-mono font-black ${fingerInfo.textCol} drop-shadow-sm`}>
               {target}
             </span>
             <span className="text-xl md:text-2xl text-white font-bold">をおしてね</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-5xl select-none p-3 bg-neon-panel rounded-2xl border-4 border-neon-purple">
          {KEYS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-2 md:gap-3">
              {row.map((key) => {
                const isActive = key === target;
                const fInfo = FINGER_MAP[key] || DEFAULT_FINGER;
                return (
                  <div
                    key={key}
                    className={`
                      relative flex items-center justify-center
                      w-10 h-12 md:w-20 md:h-20 lg:w-24 lg:h-24
                      rounded-lg md:rounded-xl border-b-4 md:border-b-8
                      transition-all duration-150
                      ${isActive 
                        ? `${fInfo.color} ${fInfo.border} -translate-y-1 shadow-md z-10 text-white` 
                        : 'bg-white/10 border-white/20 text-white/40'
                      }
                    `}
                  >
                    <span className="font-mono text-xl md:text-3xl lg:text-4xl font-black">
                      {key}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
