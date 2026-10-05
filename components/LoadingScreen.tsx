import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 w-full animate-fade-in">
      
      <div className="bg-white p-12 rounded-[3rem] border-[8px] border-brand-blue shadow-2xl flex flex-col items-center relative">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand-yellow px-6 py-2 rounded-full border-4 border-brand-blue font-black text-brand-blue">
           NOW LOADING
        </div>

        <Loader2 className="w-20 h-20 text-brand-blue animate-spin mb-8 mt-4" />
        
        <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
          じゅんび中...
        </h2>
        
        <div className="flex space-x-3 mt-4">
          <div className="w-5 h-5 bg-brand-red rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0s' }}></div>
          <div className="w-5 h-5 bg-brand-blue rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-5 h-5 bg-brand-yellow rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-5 h-5 bg-brand-green rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;