
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
  'Q': { text: '左手 小指', color: 'bg-pink-400', border: 'border-pink-600', textCol: 'text-pink-600' },
  'A': { text: '左手 小指', color: 'bg-pink-400', border: 'border-pink-600', textCol: 'text-pink-600' },
  'Z': { text: '左手 小指', color: 'bg-pink-400', border: 'border-pink-600', textCol: 'text-pink-600' },
  'W': { text: '左手 薬指', color: 'bg-purple-400', border: 'border-purple-600', textCol: 'text-purple-600' },
  'S': { text: '左手 薬指', color: 'bg-purple-400', border: 'border-purple-600', textCol: 'text-purple-600' },
  'X': { text: '左手 薬指', color: 'bg-purple-400', border: 'border-purple-600', textCol: 'text-purple-600' },
  'E': { text: '左手 中指', color: 'bg-blue-400', border: 'border-blue-600', textCol: 'text-blue-600' },
  'D': { text: '左手 中指', color: 'bg-blue-400', border: 'border-blue-600', textCol: 'text-blue-600' },
  'C': { text: '左手 中指', color: 'bg-blue-400', border: 'border-blue-600', textCol: 'text-blue-600' },
  'R': { text: '左手 人差指', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-600' },
  'T': { text: '左手 人差指', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-600' },
  'F': { text: '左手 人差指', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-600' },
  'G': { text: '左手 人差指', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-600' },
  'V': { text: '左手 人差指', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-600' },
  'B': { text: '左手 人差指', color: 'bg-cyan-400', border: 'border-cyan-600', textCol: 'text-cyan-600' },
  'Y': { text: '右手 人差指', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-600' },
  'U': { text: '右手 人差指', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-600' },
  'H': { text: '右手 人差指', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-600' },
  'J': { text: '右手 人差指', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-600' },
  'N': { text: '右手 人差指', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-600' },
  'M': { text: '右手 人差指', color: 'bg-green-400', border: 'border-green-600', textCol: 'text-green-600' },
  'I': { text: '右手 中指', color: 'bg-yellow-400', border: 'border-yellow-600', textCol: 'text-yellow-600' },
  'K': { text: '右手 中指', color: 'bg-yellow-400', border: 'border-yellow-600', textCol: 'text-yellow-600' },
  'O': { text: '右手 薬指', color: 'bg-orange-400', border: 'border-orange-600', textCol: 'text-orange-600' },
  'L': { text: '右手 薬指', color: 'bg-orange-400', border: 'border-orange-600', textCol: 'text-orange-600' },
  'P': { text: '右手 小指', color: 'bg-red-400', border: 'border-red-600', textCol: 'text-red-600' },
  '-': { text: '右手 小指', color: 'bg-red-400', border: 'border-red-600', textCol: 'text-red-600' },
};

const DEFAULT_FINGER: FingerStyle = { text: '', color: 'bg-slate-300', border: 'border-slate-400', textCol: 'text-slate-500' };

export const KeyboardHint: React.FC<KeyboardHintProps> = ({ activeKey }) => {
  const target = activeKey.toUpperCase();
  const fingerInfo = FINGER_MAP[target] || DEFAULT_FINGER;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 bg-white/90 border-t-8 border-slate-200 shadow-[0_-10px_50px_rgba(0,0,0,0.1)] animate-slide-up transition-all duration-300 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
        
        <div className="flex items-center gap-4 md:gap-8 bg-white px-8 py-3 rounded-2xl border-4 border-slate-100 shadow-block">
          <Hand className={`w-12 h-12 md:w-16 md:h-16 ${fingerInfo.textCol}`} />
          <div className="flex items-baseline gap-4">
             <span className={`text-xl md:text-2xl font-bold text-white px-4 py-1 rounded-lg border-b-4 ${fingerInfo.color} ${fingerInfo.border}`}>
               {fingerInfo.text}
             </span>
             <span className="text-xl md:text-2xl text-slate-600 font-bold">で</span>
             <span className={`text-5xl md:text-6xl font-mono font-black ${fingerInfo.textCol} drop-shadow-sm`}>
               {target}
             </span>
             <span className="text-xl md:text-2xl text-slate-600 font-bold">をおしてね</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-5xl select-none p-2 bg-slate-200 rounded-xl border-4 border-slate-300">
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
                        : 'bg-white border-slate-300 text-slate-300'
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
