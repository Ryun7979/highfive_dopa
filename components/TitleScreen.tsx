
import React, { useState } from 'react';
import { Keyboard, Star, Zap, Crown, Baby, MessageCircle, Volume2, Settings } from 'lucide-react';
import { Difficulty } from '../types';
import { audioManager, VolumeLevel } from '../utils/audioManager';

interface TitleScreenProps {
  onStart: (difficulty: Difficulty) => void;
  onPrefetch: (difficulty: Difficulty) => void;
  onOpenSettings: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onOpenSettings }) => {
  const [volume, setVolume] = useState<VolumeLevel>(audioManager.getVolume());
  
  const handleStart = (diff: Difficulty) => {
    audioManager.playSelect();
    onStart(diff);
  };

  const handleVolumeChange = (level: VolumeLevel) => {
    audioManager.setVolume(level);
    setVolume(level);
    if (level !== 'OFF') {
      audioManager.playSelect();
    }
  };

  const difficulties = [
    { 
      id: Difficulty.EASY, 
      label: "かんたん", 
      desc: "1もじ", 
      icon: Baby, 
      bgColor: "bg-green-400",
      borderColor: "border-green-600",
      textColor: "text-white",
      iconColor: "text-white"
    },
    { 
      id: Difficulty.NORMAL, 
      label: "ふつう", 
      desc: "2〜5もじ", 
      icon: Star, 
      bgColor: "bg-brand-blue",
      borderColor: "border-blue-800",
      textColor: "text-white",
      iconColor: "text-white"
    },
    { 
      id: Difficulty.HARD, 
      label: "むずかしい", 
      desc: "ネタ・なまえ(短)", 
      icon: Zap, 
      bgColor: "bg-brand-red",
      borderColor: "border-red-800",
      textColor: "text-white",
      iconColor: "text-white"
    },
    { 
      id: Difficulty.MASTER, 
      label: "マスター", 
      desc: "ネタ・なまえ", 
      icon: Crown, 
      bgColor: "bg-purple-500",
      borderColor: "border-purple-700",
      textColor: "text-white",
      iconColor: "text-white"
    },
    { 
      id: Difficulty.CONVERSATION, 
      label: "かいわ", 
      desc: "SNS・おしゃべり", 
      icon: MessageCircle, 
      bgColor: "bg-orange-400",
      borderColor: "border-orange-600",
      textColor: "text-white",
      iconColor: "text-white"
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 md:p-8 space-y-8 animate-fade-in w-full max-w-7xl mx-auto font-pop relative">
      
      {/* Volume Control */}
      <div className="absolute top-0 right-0 md:top-6 md:right-6 z-20">
        <div className="flex items-center bg-white/80 backdrop-blur-sm border-[4px] border-white rounded-full p-1.5 shadow-xl">
          <div className="px-2 text-brand-blue">
             <Volume2 size={20} strokeWidth={3} />
          </div>
          <div className="flex bg-slate-200 rounded-full p-1 gap-1">
            {(['OFF', 'LOW', 'MEDIUM', 'HIGH'] as VolumeLevel[]).map((level) => {
              const labelMap = { OFF: 'OFF', LOW: '小', MEDIUM: '中', HIGH: '大' };
              const isActive = volume === level;
              return (
                <button
                   key={level}
                   onClick={() => handleVolumeChange(level)}
                   className={`
                     px-3 py-1 rounded-full text-xs md:text-sm font-black transition-all
                     ${isActive 
                       ? 'bg-brand-blue text-white shadow-md transform scale-105' 
                       : 'text-slate-500 hover:bg-slate-300'
                     }
                   `}
                >
                  {labelMap[level]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="w-full bg-brand-yellow border-[8px] md:border-[12px] border-brand-blue rounded-[3rem] p-6 md:p-12 shadow-2xl relative">
        
        {/* Header Title Pill */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
           <div className="bg-brand-blue text-white px-12 py-5 rounded-full border-4 border-white shadow-lg whitespace-nowrap">
             <div className="flex items-center gap-4">
               <Keyboard className="w-10 h-10 md:w-12 md:h-12" />
               <h1 className="text-4xl md:text-6xl font-black tracking-wider leading-none">
                  TYPING MINI
               </h1>
             </div>
           </div>
        </div>

        <div className="mt-16 md:mt-20">
          <div className="w-full">
            <h2 className="text-3xl md:text-5xl text-brand-blue font-black mb-10 flex items-center justify-center gap-3 drop-shadow-sm">
               ▼ どのレベルであそぶ？
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {difficulties.map((diff) => (
                <button
                  key={diff.id}
                  onClick={() => handleStart(diff.id)}
                  className={`
                    group relative flex flex-col items-center justify-center p-8 
                    rounded-3xl border-b-[8px] border-r-4 border-l-2 border-t-2
                    transition-all duration-150 active:border-b-2 active:translate-y-2
                    ${diff.bgColor} ${diff.borderColor} shadow-xl hover:brightness-110 hover:scale-105 transform
                  `}
                >
                  {/* Lego Studs */}
                  <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex space-x-4 opacity-20">
                    <div className="w-6 h-3 bg-black rounded-full shadow-inner"></div>
                    <div className="w-6 h-3 bg-black rounded-full shadow-inner"></div>
                  </div>

                  <div className={`mt-2 mb-4 p-4 bg-white/20 rounded-full`}>
                    <diff.icon className={`w-12 h-12 md:w-14 md:h-14 ${diff.iconColor}`} />
                  </div>
                  
                  <div className={`text-3xl md:text-4xl font-black ${diff.textColor} mb-2 drop-shadow-md whitespace-nowrap`}>{diff.label}</div>
                  <div className={`text-white text-lg font-bold bg-black/20 px-4 py-1 rounded-full whitespace-nowrap`}>{diff.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info & Hidden Settings */}
        <div className="mt-12 w-full flex justify-center items-center gap-8 relative">
           <div className="flex flex-col items-center opacity-40">
             <span className="text-brand-blue font-mono font-bold text-sm">OFFLINE MASTER EDITION</span>
           </div>
           
           {/* Discrete Dev Settings Entry */}
           <button 
             onClick={onOpenSettings}
             className="absolute right-0 p-3 text-brand-blue/40 hover:text-brand-blue hover:bg-white/20 rounded-full transition-all duration-300"
             title="Dev Settings"
           >
             <Settings size={24} />
           </button>
        </div>

      </div>
    </div>
  );
};

export default TitleScreen;
