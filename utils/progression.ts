import { GameStats } from '../types';
import { DailyResult, applyDailyPlay } from './daily';
import { PlayerData, mutateSave } from './saveData';

// プレイ後にもらえるもの（docs/spec.md §7.3）。数値はすべて【仮】

// あそんだごほうび：スコアに関係なく1プレイごとにもらえる。はじめての子でも、ほぼ毎回ガチャが引ける量
export const PLAY_BONUS_COINS = 50;
export const PLAY_BONUS_EXP = 30;

// 次のレベルまでに必要な EXP。低学年でも最初の1プレイで上がり、後半は数プレイに1回になる
export const expToNext = (level: number): number => 100 + 35 * (level - 1);

export const calcExp = (score: number): number => Math.floor(score / 10);

// コインはごほうび用スコア ÷ 100。ボーナスタイム中にかせいだ分は ×2 で数える
export const calcCoins = (stats: GameStats): number => Math.floor((stats.rewardScore + stats.bonusScore) / 100);

// EXP を足してレベルを上げる。上がった回数だけ SP がもらえる
export const addExp = (player: PlayerData, exp: number): number => {
  let levelUps = 0;
  player.exp += exp;
  while (player.exp >= expToNext(player.level)) {
    player.exp -= expToNext(player.level);
    player.level += 1;
    player.sp += 1;
    levelUps += 1;
  }
  return levelUps;
};

export interface PlayRewards {
  coins: number;      // プレイでもらえた分。あそんだごほうびを含む（ミッションのごほうびは daily.coins）
  coinsAfter: number;
  daily?: DailyResult;
  exp: number;        // プレイでもらえた分。あそんだごほうびを含む（ミッションのごほうびは daily.exp）
  levelBefore: number;
  levelAfter: number;
  expAfter: number;
  spGain: number;
}

export const grantPlayRewards = (stats: GameStats): PlayRewards => {
  const exp = calcExp(stats.rewardScore) + PLAY_BONUS_EXP;
  const coins = calcCoins(stats) + PLAY_BONUS_COINS;
  let rewards: PlayRewards = { coins, coinsAfter: coins, exp, levelBefore: 1, levelAfter: 1, expAfter: 0, spGain: 0 };
  mutateSave(data => {
    const levelBefore = data.player.level;
    data.player.coins += coins;
    const daily = applyDailyPlay(data, stats);
    const spGain = addExp(data.player, exp + daily.exp);
    rewards = { coins, coinsAfter: data.player.coins, daily, exp, levelBefore, levelAfter: data.player.level, expAfter: data.player.exp, spGain };
  });
  return rewards;
};
