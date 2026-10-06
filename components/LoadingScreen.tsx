import React from 'react';
import DopaBackground from './DopaBackground';
import Rabidopa from './Rabidopa';

const LoadingScreen: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DopaBackground level={1} />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-6 w-full animate-fade-in font-pop">
        <Rabidopa anim="groove" aura={1} className="w-[38vh] h-[37vh]" />
        <h2 className="hx-sticker text-4xl md:text-6xl text-neon-yellow -mt-2">
          じゅんびちゅう…
        </h2>
        <div className="flex space-x-3 mt-6">
          <div className="w-5 h-5 bg-neon-pink border-2 border-neon-ink rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-5 h-5 bg-neon-cyan border-2 border-neon-ink rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-5 h-5 bg-neon-yellow border-2 border-neon-ink rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-5 h-5 bg-neon-lime border-2 border-neon-ink rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
