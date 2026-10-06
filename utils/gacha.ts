import { GACHA_POOL, ItemDef, Rarity, getItem, isOwned } from './items';
import { SaveData, mutateSave } from './saveData';

// ガチャ（docs/spec.md §9.1）。数値はすべて【仮】。課金・広告なし、コインだけで回す

export const GACHA_COST = 100;
// 排出率（%）。画面にもこのまま表示する
export const GACHA_RATES: Record<Rarity, number> = { N: 60, R: 30, SR: 8, SSR: 2 };
// 天井：この回数めには SR 以上が必ず出る
export const GACHA_PITY = 30;
// 重複は「かけら」1個になり、この数で好きな未入手アイテムと交換できる
export const SHARDS_TO_EXCHANGE = 10;

const isHigh = (r: Rarity) => r === 'SR' || r === 'SSR';

// pityCount は「SR 以上が出ないまま回した回数」
export const rollRarity = (pityCount: number, rnd: () => number = Math.random): Rarity => {
  const guaranteed = pityCount >= GACHA_PITY - 1;
  const rates: [Rarity, number][] = guaranteed
    ? [['SR', GACHA_RATES.SR], ['SSR', GACHA_RATES.SSR]]
    : [['N', GACHA_RATES.N], ['R', GACHA_RATES.R], ['SR', GACHA_RATES.SR], ['SSR', GACHA_RATES.SSR]];
  const total = rates.reduce((sum, [, w]) => sum + w, 0);
  let x = rnd() * total;
  for (const [rarity, w] of rates) {
    x -= w;
    if (x < 0) return rarity;
  }
  return rates[rates.length - 1][0];
};

export interface GachaResult {
  item: ItemDef;
  isNew: boolean; // false なら重複で、かけら +1
}

// 保存データを書き換えて1回ひく（コインの確認は呼ぶ側）
export const drawGacha = (data: SaveData, rnd: () => number = Math.random): GachaResult => {
  const rarity = rollRarity(data.gacha.pityCount, rnd);
  const pool = GACHA_POOL.filter(i => i.rarity === rarity);
  const item = pool[Math.floor(rnd() * pool.length)];
  const isNew = !isOwned(item.id, data.inventory);
  if (isNew) data.inventory.push(item.id);
  else data.player.shards += 1;
  data.gacha.pityCount = isHigh(rarity) ? 0 : data.gacha.pityCount + 1;
  return { item, isNew };
};

// コインを払って1回ひく。コインが足りなければ result は null
export const pullGacha = (): { save: SaveData; result: GachaResult | null } => {
  let result: GachaResult | null = null;
  const save = mutateSave(data => {
    if (data.player.coins < GACHA_COST) return;
    data.player.coins -= GACHA_COST;
    result = drawGacha(data);
  });
  return { save, result };
};

// かけらを使って、まだ持っていないアイテムと交換する
export const exchangeShards = (id: string): SaveData =>
  mutateSave(data => {
    if (!getItem(id) || isOwned(id, data.inventory) || data.player.shards < SHARDS_TO_EXCHANGE) return;
    data.player.shards -= SHARDS_TO_EXCHANGE;
    data.inventory.push(id);
  });
