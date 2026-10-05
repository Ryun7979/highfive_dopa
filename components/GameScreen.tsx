import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { GameStats, WordDefinition, Difficulty } from '../types';
import { TOTAL_QUESTIONS } from '../constants';
import { Loader2, LogOut } from 'lucide-react';
import { KeyboardHint } from './KeyboardHint';
import { parseKanaToMora, Mora } from '../utils/romajiUtils';
import { audioManager } from '../utils/audioManager';
import { FontType } from '../utils/settingsManager';

// タイマー表示専用コンポーネント。親のリ描画を抑える。
const GameTimer = memo(({ startTime }: { startTime: number }) => {
  const [display, setDisplay] = useState("0.00");
  const requestRef = useRef<number>(0);

  const update = useCallback(() => {
    if (startTime !== 0) {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      setDisplay(elapsed.toFixed(2));
    }
    requestRef.current = requestAnimationFrame(update);
  }, [startTime]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  return (
    <div className="text-3xl md:text-4xl font-black text-slate-800 font-mono tracking-tighter">
      {display}
    </div>
  );
});

interface GameScreenProps {
  difficulty: Difficulty;
  words: WordDefinition[];
  onGameEnd: (stats: GameStats) => void;
  onExitGame: () => void;
  fontType?: FontType;
}

const GameScreen: React.FC<GameScreenProps> = ({ difficulty, words, onGameEnd, onExitGame, fontType = 'POP' }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<WordDefinition | null>(null);
  const [moras, setMoras] = useState<Mora[]>([]);
  const [currentMoraIndex, setCurrentMoraIndex] = useState(0);
  const [typedMoraInput, setTypedMoraInput] = useState("");
  const [isWaitingForWord, setIsWaitingForWord] = useState(false);
  
  const [stats, setStats] = useState<GameStats>({ correctChars: 0, missedChars: 0, timeElapsed: 0, difficulty });
  
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [activeHintKey, setActiveHintKey] = useState("");
  
  const startTimeRef = useRef<number>(0);
  const lastInputTimeRef = useRef<number>(Date.now());
  const missCountRef = useRef<number>(0);
  const wordsQueueRef = useRef<WordDefinition[]>([]);

  // 次の文字ヒントを更新
  const updateHintKey = useCallback((currentMoras: Mora[], moraIdx: number, currentInput: string) => {
    if (moraIdx >= currentMoras.length) {
      setActiveHintKey("");
      return;
    }
    const candidates = currentMoras[moraIdx].romaji;
    const valid = candidates.filter(c => c.startsWith(currentInput));
    if (valid.length > 0) {
      const target = valid[0];
      const nextChar = target[currentInput.length];
      setActiveHintKey(nextChar ? nextChar.toUpperCase() : "");
    } else {
      setActiveHintKey("");
    }
  }, []);

  // 単語読み込み
  const loadWord = useCallback((word: WordDefinition) => {
    setCurrentWord(word);
    const parsed = parseKanaToMora(word.text, word.romaji);
    if (!parsed) return;

    setMoras(parsed);
    setCurrentMoraIndex(0);
    setTypedMoraInput("");
    updateHintKey(parsed, 0, "");
  }, [updateHintKey]);

  useEffect(() => {
    wordsQueueRef.current = words;
    if (currentWordIndex === 0 && !currentWord && words.length > 0) {
       loadWord(words[0]);
       startTimeRef.current = Date.now();
       lastInputTimeRef.current = Date.now();
    } else if (isWaitingForWord && words.length > currentWordIndex) {
      setIsWaitingForWord(false);
      loadWord(words[currentWordIndex]);
    }
  }, [words, isWaitingForWord, currentWordIndex, currentWord, loadWord]);

  // アイドル監視（ヒント表示）
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (startTimeRef.current === 0 || isWaitingForWord) return;
      if (Date.now() - lastInputTimeRef.current > 10000) {
        setShowHint(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isWaitingForWord]);

  // ゲーム終了処理
  const finishGame = useCallback(() => {
    const finalTime = Date.now() - startTimeRef.current;
    onGameEnd({ ...stats, timeElapsed: finalTime });
  }, [onGameEnd, stats]);

  // 単語の進行
  const nextWord = useCallback(() => {
    const nextIndex = currentWordIndex + 1;
    if (nextIndex >= TOTAL_QUESTIONS) {
      finishGame();
      return;
    }
    if (nextIndex < wordsQueueRef.current.length) {
      setCurrentWordIndex(nextIndex);
      loadWord(wordsQueueRef.current[nextIndex]);
      setShowHint(false);
      missCountRef.current = 0;
      lastInputTimeRef.current = Date.now();
    } else {
      setCurrentWordIndex(nextIndex);
      setIsWaitingForWord(true);
      setCurrentWord(null);
    }
  }, [currentWordIndex, loadWord, finishGame]);

  // モーラの進行
  const advanceMora = useCallback((nextInputForState: string, isLookaheadSkip: boolean = false) => {
    const nextMoraIdx = currentMoraIndex + 1;
    if (nextMoraIdx >= moras.length) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        nextWord();
      }, 150);
    } else {
      setCurrentMoraIndex(nextMoraIdx);
      if (isLookaheadSkip) {
        setTypedMoraInput(nextInputForState);
        const nextMora = moras[nextMoraIdx];
        const exact = nextMora.romaji.filter(r => r === nextInputForState);
        const hasLonger = nextMora.romaji.some(r => r.length > nextInputForState.length);
        if (exact.length > 0 && !hasLonger) {
           setTimeout(() => advanceMora("", false), 0); 
        } else {
           updateHintKey(moras, nextMoraIdx, nextInputForState);
        }
      } else {
        setTypedMoraInput("");
        updateHintKey(moras, nextMoraIdx, "");
      }
    }
  }, [currentMoraIndex, moras, nextWord, updateHintKey]);

  // ミス処理
  const handleMiss = useCallback(() => {
    audioManager.playMiss();
    setStats(prev => ({ ...prev, missedChars: prev.missedChars + 1 }));
    setIsError(true);
    setTimeout(() => setIsError(false), 200);
    missCountRef.current += 1;
    if (missCountRef.current >= 5) setShowHint(true);
  }, []);

  // キー入力ハンドラ
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.isComposing || !currentWord || isWaitingForWord || currentMoraIndex >= moras.length) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key.length !== 1 || !/^[a-zA-Z-]$/.test(e.key)) return;

    lastInputTimeRef.current = Date.now();
    const inputChar = e.key.toLowerCase();
    const currentMora = moras[currentMoraIndex];
    const nextInputSequence = typedMoraInput + inputChar;
    const matchesCurrent = currentMora.romaji.filter(r => r.startsWith(nextInputSequence));
    
    if (matchesCurrent.length > 0) {
      audioManager.playType();
      setStats(prev => ({ ...prev, correctChars: prev.correctChars + 1 }));
      setIsError(false);
      setShowHint(false);
      missCountRef.current = 0;
      
      const exactMatches = matchesCurrent.filter(r => r === nextInputSequence);
      const isComplete = exactMatches.length > 0;
      const hasLongerCandidates = matchesCurrent.some(r => r.length > nextInputSequence.length);
      
      if (isComplete && !hasLongerCandidates) {
        advanceMora(nextInputSequence);
      } else {
        setTypedMoraInput(nextInputSequence);
        updateHintKey(moras, currentMoraIndex, nextInputSequence);
      }
    } else {
      // 次のモーラの先読み対応
      const prevIsComplete = currentMora.romaji.includes(typedMoraInput);
      if (prevIsComplete) {
        const nextMoraIdx = currentMoraIndex + 1;
        if (nextMoraIdx < moras.length) {
          const nextMora = moras[nextMoraIdx];
          if (nextMora.romaji.some(r => r.startsWith(inputChar))) {
             audioManager.playType();
             setStats(prev => ({ ...prev, correctChars: prev.correctChars + 1 }));
             setIsError(false);
             setShowHint(false);
             missCountRef.current = 0;
             advanceMora(inputChar, true);
             return;
          }
        }
      }
      handleMiss();
    }
  }, [currentWord, moras, currentMoraIndex, typedMoraInput, isWaitingForWord, advanceMora, updateHintKey, handleMiss]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const fontClass = fontType === 'ROUNDED' ? 'font-rounded' : 'font-pop';

  return (
    <div className={`flex flex-col items-center min-h-screen w-full relative`}>
      <div className="absolute top-6 left-6 z-50">
         <button 
           onClick={() => { audioManager.playCancel(); onExitGame(); }}
           className="group flex items-center gap-3 bg-white border-[6px] border-slate-200 text-slate-500 hover:border-brand-red hover:text-brand-red hover:bg-red-50 rounded-full px-8 py-4 transition-all font-black shadow-lg active:translate-y-1 transform hover:scale-105"
         >
           <LogOut className="w-8 h-8 md:w-10 md:h-10" />
           <span className="hidden md:inline text-xl md:text-2xl tracking-wider">やめる</span>
         </button>
      </div>

      <div className="w-full p-4 md:p-8 flex justify-between items-start max-w-7xl mx-auto z-20 pointer-events-none">
        <div className="flex flex-col items-center animate-slide-up">
          <div className="w-28 h-28 md:w-36 md:h-36 bg-white rounded-full border-[6px] border-brand-green flex flex-col items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
             <span className="text-sm md:text-base font-bold text-brand-green">MONDAI</span>
             <div className="flex items-baseline">
                <span className="text-4xl md:text-6xl font-black text-slate-800">{currentWordIndex + 1}</span>
                <span className="text-slate-400 text-xl md:text-2xl font-bold">/{TOTAL_QUESTIONS}</span>
             </div>
          </div>
        </div>
        <div className="flex space-x-4 md:space-x-8 animate-slide-up">
          <div className="w-28 h-28 md:w-36 md:h-36 bg-white rounded-full border-[6px] border-brand-red flex flex-col items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
             <span className="text-sm md:text-base font-bold text-brand-red">TIME</span>
             <GameTimer startTime={startTimeRef.current} />
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center w-full pb-32 ${isError ? 'animate-shake' : ''}`}>
        <div className="w-full bg-slate-900 border-y-[12px] border-brand-blue shadow-2xl overflow-hidden min-h-[50vh] flex items-center justify-center py-12 relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="relative z-10 w-full max-w-[95%] mx-auto">
               {isWaitingForWord || !currentWord ? (
                 <div className="flex flex-col items-center justify-center animate-pulse py-12">
                    <Loader2 className="w-20 h-20 text-brand-yellow animate-spin mb-4" />
                    <p className="text-3xl text-white font-bold">つぎのもんだいをつくってるよ！</p>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center space-y-8 w-full">
                    <div className={`text-white font-black ${fontClass} tracking-wider text-center break-keep leading-tight drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${currentWord.text.length > 9 ? 'text-[4rem] md:text-[6rem]' : 'text-[5rem] md:text-[8rem] lg:text-[10rem]'}`}>
                      {currentWord.text}
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-4 md:gap-x-6 px-8 py-6 rounded-3xl bg-black/40 border-4 border-white/10">
                      {moras.map((mora, idx) => {
                        const input = idx === currentMoraIndex ? typedMoraInput.toUpperCase() : "";
                        const candidates = mora.romaji.map(r => r.toUpperCase());
                        const displayString = (idx === currentMoraIndex && candidates.find(c => c.startsWith(input))) || candidates[0];
                        const typedPart = idx < currentMoraIndex ? displayString : input;
                        const untypedPart = idx < currentMoraIndex ? "" : displayString.substring(input.length);
                        
                        return (
                           <div key={idx} className={`flex text-5xl md:text-7xl lg:text-8xl font-mono font-bold mx-1 md:mx-2 relative tracking-widest`}>
                             <span className="text-brand-yellow drop-shadow-[0_4px_0_rgba(0,0,0,0.8)]">{typedPart}</span>
                             <span className="text-slate-500">{untypedPart}</span>
                             {idx === currentMoraIndex && (
                               <div className="absolute -bottom-4 left-0 w-full h-3 bg-brand-yellow animate-pulse rounded-full shadow-[0_0_10px_rgba(255,214,0,0.8)]" />
                             )}
                           </div>
                        );
                      })}
                    </div>
                 </div>
               )}
            </div>
        </div>
        <div className={`mt-8 text-center transition-opacity duration-300 ${!isWaitingForWord && currentWord ? 'opacity-100' : 'opacity-0'}`}>
          <div className="inline-block bg-brand-blue/90 text-white px-10 py-4 rounded-full shadow-lg">
             <p className="text-3xl md:text-4xl font-black tracking-wide animate-pulse drop-shadow-md">キーボードから文字を入力！</p>
          </div>
        </div>
        {isError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
             <div className="text-[12rem] md:text-[16rem] font-black text-brand-red drop-shadow-[0_8px_0_rgba(0,0,0,1)] animate-bounce-short opacity-80">X</div>
          </div>
        )}
      </div>
      {showHint && activeHintKey && !isWaitingForWord && (
        <KeyboardHint activeKey={activeHintKey} />
      )}
    </div>
  );
};

export default GameScreen;
