import { GameStats } from '../types';
import { DailyResult, applyDailyPlay } from './daily';
import { PlayerData, mutateSave } from './saveData';

// プレイ後にもらえるもの（docs/spec.md §7.3）。数値はすべて【仮】

// 次のレベルまでに必要な EXP。低学年でも最初の1プレイで上がる量にしてある
export const expToNext = (level: number): number => 100 + 50 * (level - 1);

export const calcExp = (score: number): number => Math.floor(score / 10);

// コインはスコア ÷ 100。ボーナスタイム中にかせいだ分は ×2 で数える
export const calcCoins = (stats: GameStats): number => Math.floor((stats.score + stats.bonusScore) / 100);

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
  coins: number;      // プレイでもらえた分（ミッションのごほうびは daily.coins）
  coinsAfter: number;
  daily?: DailyResult;
  exp: number;        // プレイでもらえた分（ミッションのごほうびは daily.exp）
  levelBefore: number;
  levelAfter: number;
  expAfter: number;
  spGain: number;
}

export const grantPlayRewards = (stats: GameStats): PlayRewards => {
  const exp = calcExp(stats.score);
  const coins = calcCoins(stats);
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
