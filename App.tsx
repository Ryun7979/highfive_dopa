import React, { useState, useRef, useEffect, useCallback } from 'react';
import TitleScreen from './components/TitleScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import LoadingScreen from './components/LoadingScreen';
import DevSettingsScreen from './components/DevSettingsScreen';
import { GameState, GameStats, Difficulty, WordDefinition } from './types';
import { streamGeneratedWords } from './utils/wordGenerator';
import { getSettings, FontType } from './utils/settingsManager';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [gameStats, setGameStats] = useState<GameStats>({ correctChars: 0, missedChars: 0, timeElapsed: 0, difficulty: Difficulty.NORMAL });
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [gameWords, setGameWords] = useState<WordDefinition[]>([]);
  const [fontType, setFontType] = useState<FontType>('POP');
  
  const playedWordsRef = useRef<Set<string>>(new Set());

  // 初期設定読み込み
  useEffect(() => {
    setFontType(getSettings().fontType);
  }, []);

  // 設定画面からの復帰用
  const refreshSettings = useCallback(() => {
    setFontType(getSettings().fontType);
  }, []);

  const fetchWordsForGame = async (difficulty: Difficulty) => {
    setGameWords([]);
    const stream = streamGeneratedWords(difficulty, playedWordsRef.current);
    for await (const word of stream) {
      setGameWords(prev => {
        const next = [...prev, word];
        // 最初の5単語が揃ったらロード完了とする
        if (next.length === 5) {
          setGameState(GameState.PLAYING);
        }
        return next;
      });
      playedWordsRef.current.add(word.text);
    }
  };

  const startGame = (difficulty: Difficulty) => {
    setCurrentDifficulty(difficulty);
    setGameState(GameState.LOADING);
    fetchWordsForGame(difficulty);
  };

  const restartGame = useCallback(() => {
    setGameState(GameState.TITLE);
    setGameWords([]);
  }, []);

  const handleGameEnd = useCallback((stats: GameStats) => {
    setGameStats(stats);
    setGameState(GameState.RESULT);
  }, []);

  return (
    <div className="min-h-screen bg-brand-yellow bg-grid-pattern text-slate-800 font-sans overflow-hidden">
      <main className="relative z-10 w-full h-full">
        {gameState === GameState.TITLE && (
          <TitleScreen onStart={startGame} onPrefetch={() => {}} onOpenSettings={() => setGameState(GameState.DEV_SETTINGS)} />
        )}
        {gameState === GameState.DEV_SETTINGS && (
          <DevSettingsScreen onBack={() => setGameState(GameState.TITLE)} onSettingsSaved={refreshSettings} />
        )}
        {gameState === GameState.LOADING && <LoadingScreen />}
        {gameState === GameState.PLAYING && (
          <GameScreen 
            difficulty={currentDifficulty} 
            words={gameWords} 
            onGameEnd={handleGameEnd} 
            onExitGame={restartGame} 
            fontType={fontType} 
          />
        )}
        {gameState === GameState.RESULT && (
          <ResultScreen stats={gameStats} onRestart={restartGame} onPrefetch={() => {}} />
        )}
      </main>
    </div>
  );
};

export default App;
