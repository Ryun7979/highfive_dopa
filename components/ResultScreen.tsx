import React, { useEffect } from 'react';
import { GameStats, Difficulty } from '../types';
import { Trophy, RefreshCw, CheckCircle, XCircle, Clock, CornerDownLeft } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface ResultScreenProps {
  stats: GameStats;
  onRestart: () => void;
  onPrefetch: (difficulty: Difficulty) => void;
}

const Confetti: React.FC = () => {
  const colors = ['#2962FF', '#FF1744', '#00E676', '#FFD600', '#F50057'];
  const pieces = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDuration: 3 + Math.random() * 3,
    animationDelay: Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 10 + Math.random() * 15,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-40px] rounded-sm opacity-90 shadow-sm"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `fall ${p.animationDuration}s linear ${p.animationDelay}s infinite`,
            transformOrigin: 'center center',
          }}
        />
      ))}
    </div>
  );
};

const ResultScreen: React.FC<ResultScreenProps> = ({ stats, onRestart, onPrefetch }) => {
  const seconds = (stats.timeElapsed / 1000).toFixed(2);
  const accuracy = stats.correctChars + stats.missedChars > 0 
    ? Math.round((stats.correctChars / (stats.correctChars + stats.missedChars)) * 100)
    : 0;

  useEffect(() => {
    onPrefetch(stats.difficulty);
    // Play fanfare on mount
    audioManager.playFanfare();
  }, [stats.difficulty, onPrefetch]);

  const handleRestart = () => {
    audioManager.playSelect();
    onRestart();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 md:p-8 animate-fade-in w-full overflow-hidden">
      
      {/* Confetti Animation */}
      <Confetti />

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-5xl bg-brand-yellow border-[12px] border-brand-blue rounded-[3rem] p-6 md:p-12 shadow-2xl">
        
        {/* Header Title Pill - Overlapping Top */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
           <div className="bg-brand-blue text-white px-20 py-5 rounded-full border-4 border-white shadow-lg whitespace-nowrap">
             <h2 className="text-4xl md:text-6xl font-black tracking-wider leading-none">
                RESULTS
             </h2>
           </div>
        </div>

        {/* Content Box */}
        <div className="mt-12 bg-white/60 backdrop-blur-md rounded-[2rem] p-8 md:p-12 border-4 border-white">
          
          <div className="text-center mb-10">
            <div className="inline-block p-6 bg-brand-yellow rounded-full border-4 border-white shadow-md mb-6 animate-bounce-short">
               <Trophy className="w-20 h-20 text-brand-blue" />
            </div>
            <h3 className="text-5xl md:text-7xl font-black text-brand-blue tracking-tighter drop-shadow-sm">
              すごい！クリア！
            </h3>
            <div className="mt-4 text-2xl font-bold text-slate-500">
               LEVEL: <span className="text-brand-blue uppercase text-3xl">{stats.difficulty}</span>
            </div>
          </div>

          {/* Stats Circles */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-12">
            
            {/* Time */}
            <div className="w-36 h-36 md:w-44 md:h-44 bg-white rounded-full border-[6px] border-brand-blue flex flex-col items-center justify-center shadow-lg">
               <Clock className="w-8 h-8 text-brand-blue mb-1" />
               <span className="text-sm font-bold text-slate-400">TIME</span>
               <div className="text-3xl md:text-4xl font-black text-slate-800">
                 {seconds}<span className="text-lg ml-1">s</span>
               </div>
            </div>

            {/* Accuracy */}
            <div className="w-36 h-36 md:w-44 md:h-44 bg-white rounded-full border-[6px] border-brand-green flex flex-col items-center justify-center shadow-lg">
               <CheckCircle className="w-8 h-8 text-brand-green mb-1" />
               <span className="text-sm font-bold text-slate-400">ACCURACY</span>
               <div className="text-3xl md:text-4xl font-black text-slate-800">
                 {accuracy}<span className="text-lg ml-1">%</span>
               </div>
            </div>

            {/* Miss */}
            <div className="w-36 h-36 md:w-44 md:h-44 bg-white rounded-full border-[6px] border-brand-red flex flex-col items-center justify-center shadow-lg">
               <XCircle className="w-8 h-8 text-brand-red mb-1" />
               <span className="text-sm font-bold text-slate-400">MISS</span>
               <div className="text-3xl md:text-4xl font-black text-slate-800">
                 {stats.missedChars}
               </div>
            </div>

          </div>

          <div className="text-center flex flex-col items-center gap-2">
            <button
              onClick={handleRestart}
              className="group relative inline-flex items-center justify-center px-16 py-6 bg-brand-blue hover:brightness-110 text-white font-black rounded-full border-b-[8px] border-blue-900 active:border-b-0 active:translate-y-2 transition-all duration-100 text-3xl shadow-xl overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                <RefreshCw className="w-10 h-10 mr-4 group-hover:rotate-180 transition-transform duration-500" />
                もういっかい！
              </span>
              <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
            </button>
            <div className="flex items-center gap-2 text-slate-400 font-bold text-sm animate-pulse">
               <CornerDownLeft size={16} />
               <span>Press Enter</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ResultScreen;