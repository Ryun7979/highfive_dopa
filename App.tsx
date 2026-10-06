import React, { useState, useRef, useCallback } from 'react';
import TitleScreen from './components/TitleScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import LoadingScreen from './components/LoadingScreen';
import DevSettingsScreen from './components/DevSettingsScreen';
import OptionsScreen from './components/OptionsScreen';
import SkillTreeScreen from './components/SkillTreeScreen';
import { GameState, GameStats, Difficulty, Mode, Rank, WordDefinition } from './types';
import { streamGeneratedWords } from './utils/wordGenerator';
import { getSettings, FontType } from './utils/settingsManager';
import { BestRecord, getBest, loadSave, recordResult } from './utils/saveData';
import { ARCADE_WORD_POOL, getRank } from './utils/gameRules';
import { PlayRewards, grantPlayRewards } from './utils/progression';
import { DEFAULT_MODS, GameMods, getMods } from './utils/skills';
import { audioManager } from './utils/audioManager';

interface ResultInfo {
  rank: Rank;
  isNewBest: boolean;
  prevBest?: BestRecord;
  rewards?: PlayRewards;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [resultInfo, setResultInfo] = useState<ResultInfo>({ rank: 'C', isNewBest: false });
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [currentMode, setCurrentMode] = useState<Mode>('practice');
  const [gameWords, setGameWords] = useState<WordDefinition[]>([]);
  const [fontType, setFontType] = useState<FontType>(() => getSettings().fontType);
  const [gameSettings, setGameSettings] = useState(() => loadSave().settings);
  // プレイ開始時点のスキルを反映したルール値と、ゴースト（自己ベストのスコア推移）
  const [gameMods, setGameMods] = useState<GameMods>(DEFAULT_MODS);
  const [ghostTrace, setGhostTrace] = useState<number[] | undefined>(undefined);

  const playedWordsRef = useRef<Set<string>>(new Set());
  const loadRunRef = useRef(0);

  // 設定画面からの復帰用
  const refreshSettings = useCallback(() => {
    setFontType(getSettings().fontType);
    setGameSettings(loadSave().settings);
  }, []);

  const fetchWordsForGame = async (mode: Mode, difficulty: Difficulty) => {
    const run = ++loadRunRef.current;
    setGameWords([]);
    // アーケードは 60 秒で何問でも出るので多めに用意し、既出除外の対象にしない
    const stream = mode === 'arcade'
      ? streamGeneratedWords(difficulty, new Set(), ARCADE_WORD_POOL)
      : streamGeneratedWords(difficulty, playedWordsRef.current);
    for await (const word of stream) {
      if (run !== loadRunRef.current) return; // やり直しで古い読み込みが残らないように
      setGameWords(prev => {
        const next = [...prev, word];
        // 最初の5単語が揃ったらロード完了とする
        if (next.length === 5) {
          setGameState(GameState.PLAYING);
        }
        return next;
      });
      if (mode === 'practice') playedWordsRef.current.add(word.text);
    }
  };

  const startGame = useCallback((mode: Mode, difficulty: Difficulty) => {
    const save = loadSave();
    const mods = getMods(save.skills);
    setGameMods(mods);
    setGhostTrace(mods.ghost ? save.bests[`${mode}_${difficulty}`]?.trace : undefined);
    audioManager.setScale(mods.scaleChoice ? save.settings.scale : 'doremi');
    setCurrentMode(mode);
    setCurrentDifficulty(difficulty);
    setGameState(GameState.LOADING);
    fetchWordsForGame(mode, difficulty);
  }, []);

  const backToTitle = useCallback(() => {
    loadRunRef.current++;
    setGameState(GameState.TITLE);
    setGameWords([]);
  }, []);

  // リザルトから Enter 一発で同じモード・難易度をもう一度（docs/spec.md §9.3）
  const retryGame = useCallback(() => {
    startGame(currentMode, currentDifficulty);
  }, [startGame, currentMode, currentDifficulty]);

  const handleGameEnd = useCallback((stats: GameStats) => {
    const rank = getRank(stats.score, stats.mode, stats.difficulty);
    const prevBest = getBest(stats.mode, stats.difficulty);
    const isNewBest = recordResult(stats, rank);
    const rewards = grantPlayRewards(stats);
    setResultInfo({ rank, isNewBest, prevBest, rewards });
    setGameStats(stats);
    setGameState(GameState.RESULT);
  }, []);

  return (
    <div className="min-h-screen bg-neon-night text-white font-sans overflow-hidden">
      <main className="relative z-10 w-full h-full">
        {gameState === GameState.TITLE && (
          <TitleScreen
            initialMode={currentMode}
            effectLevel={gameSettings.effectLevel}
            onStart={startGame}
            onOpenSettings={() => setGameState(GameState.DEV_SETTINGS)}
            onOpenOptions={() => setGameState(GameState.OPTIONS)}
            onOpenSkillTree={() => setGameState(GameState.SKILL_TREE)}
          />
        )}
        {gameState === GameState.DEV_SETTINGS && (
          <DevSettingsScreen onBack={() => setGameState(GameState.TITLE)} onSettingsSaved={refreshSettings} />
        )}
        {gameState === GameState.OPTIONS && (
          <OptionsScreen onBack={() => { refreshSettings(); setGameState(GameState.TITLE); }} />
        )}
        {gameState === GameState.SKILL_TREE && (
          <SkillTreeScreen effectLevel={gameSettings.effectLevel} onBack={() => setGameState(GameState.TITLE)} />
        )}
        {gameState === GameState.LOADING && <LoadingScreen />}
        {gameState === GameState.PLAYING && (
          <GameScreen
            difficulty={currentDifficulty}
            mode={currentMode}
            words={gameWords}
            onGameEnd={handleGameEnd}
            onExitGame={backToTitle}
            fontType={fontType}
            effectLevel={gameSettings.effectLevel}
            textSize={gameSettings.textSize}
            mods={gameMods}
            ghostTrace={ghostTrace}
          />
        )}
        {gameState === GameState.RESULT && gameStats && (
          <ResultScreen
            stats={gameStats}
            rank={resultInfo.rank}
            isNewBest={resultInfo.isNewBest}
            prevBest={resultInfo.prevBest}
            rewards={resultInfo.rewards}
            flashy={gameMods.resultFlashy}
            onOpenSkillTree={() => setGameState(GameState.SKILL_TREE)}
            effectLevel={gameSettings.effectLevel}
            onRetry={retryGame}
            onBackToTitle={backToTitle}
          />
        )}
      </main>
    </div>
  );
};

export default App;
