import type { TypeVoice } from './audioManager';
import { PALETTE, Palette } from './rabidopaRig';
import { SaveData, loadSave, mutateSave } from './saveData';

// ガチャで集めるアイテム（docs/spec.md §9.1）。4カテゴリ × 6種。
// いまは全部コードだけで作ってある。素材ができたら、ここの定義に足す・差し替える。

export type ItemCategory = 'costume' | 'effect' | 'sound' | 'bg';
export type Rarity = 'N' | 'R' | 'SR' | 'SSR';

export interface ItemDef {
  id: string;
  category: ItemCategory;
  rarity: Rarity;
  label: string;
  palette?: Palette;   // costume: ラビッドパの色
  rainbow?: boolean;   // costume: 色がぐるぐる変わる
  colors?: string[];   // effect: パーティクルの色表
  voice?: TypeVoice;   // sound: 打鍵音の音色
  tint?: string;       // sound: 図鑑のアイコンの色
  bgClass?: string;    // bg: .dopa-bg に足すクラス（index.css の dopa-theme-*）
}

export const CATEGORIES: { id: ItemCategory; label: string }[] = [
  { id: 'costume', label: 'いしょう' },
  { id: 'effect', label: 'エフェクト' },
  { id: 'sound', label: 'おと' },
  { id: 'bg', label: 'はいけい' },
];

export const RARITIES: Rarity[] = ['N', 'R', 'SR', 'SSR'];

// 最初から持っている装備
export const DEFAULT_EQUIPPED: SaveData['equipped'] = { costume: 'costume_pink', effect: 'effect_star', sound: 'sound_pop', bg: 'bg_night' };

export const ITEMS: ItemDef[] = [
  { id: 'costume_pink', category: 'costume', rarity: 'N', label: 'ピンク', palette: PALETTE },
  { id: 'costume_blue', category: 'costume', rarity: 'N', label: 'そらいろ', palette: { main: '#8EC9F5', shade: '#6AAEE6', light: '#DDF0FD', line: '#264C7A', cheek: '#F0607F', nose: '#E8603C' } },
  { id: 'costume_mint', category: 'costume', rarity: 'N', label: 'ミント', palette: { main: '#9BE8C4', shade: '#74D4A8', light: '#E0FAEE', line: '#1F6B52', cheek: '#F58CA6', nose: '#E8603C' } },
  { id: 'costume_lemon', category: 'costume', rarity: 'R', label: 'レモン', palette: { main: '#FFE270', shade: '#F5C73D', light: '#FFF7CF', line: '#7A5A12', cheek: '#FF8A65', nose: '#E8603C' } },
  { id: 'costume_night', category: 'costume', rarity: 'SR', label: 'くろうさぎ', palette: { main: '#4A3A8C', shade: '#352869', light: '#8CFBFF', line: '#12082E', cheek: '#FF2E93', nose: '#FFE600' } },
  { id: 'costume_rainbow', category: 'costume', rarity: 'SSR', label: 'にじいろ', rainbow: true, palette: { main: '#FF8FC0', shade: '#FF5FA2', light: '#FFF1B8', line: '#6A1B9A', cheek: '#FF4081', nose: '#FF6D00' } },

  { id: 'effect_star', category: 'effect', rarity: 'N', label: 'にじスター', colors: ['#FF1744', '#FF9100', '#FFD600', '#00E676', '#00E5FF', '#2962FF', '#D500F9', '#F50057'] },
  { id: 'effect_fire', category: 'effect', rarity: 'N', label: 'ほのお', colors: ['#FF1744', '#FF3D00', '#FF9100', '#FFC400', '#FFEA00', '#FFFFFF'] },
  { id: 'effect_ice', category: 'effect', rarity: 'N', label: 'こおり', colors: ['#E0F7FA', '#80DEEA', '#00E5FF', '#40C4FF', '#2979FF', '#FFFFFF'] },
  { id: 'effect_candy', category: 'effect', rarity: 'R', label: 'キャンディ', colors: ['#FF9ECF', '#FFD59E', '#FFF59D', '#B9F6CA', '#A7E8FF', '#D1B3FF'] },
  { id: 'effect_gold', category: 'effect', rarity: 'SR', label: 'ゴールド', colors: ['#FFD700', '#FFC400', '#FFE57F', '#FFF8E1', '#FFAB00', '#FFFFFF'] },
  { id: 'effect_galaxy', category: 'effect', rarity: 'SSR', label: 'ギャラクシー', colors: ['#D500F9', '#651FFF', '#00E5FF', '#FF2E93', '#B388FF', '#FFFFFF', '#FFE600'] },

  { id: 'sound_pop', category: 'sound', tint: '#00F0FF', rarity: 'N', label: 'ポップ', voice: { main: 'triangle', over: 'square', overShift: 12, dur: 0.16 } },
  { id: 'sound_piko', category: 'sound', tint: '#B6FF00', rarity: 'N', label: 'ピコピコ', voice: { main: 'square', over: 'square', overShift: 12, dur: 0.09, mainVol: 0.3 } },
  { id: 'sound_bell', category: 'sound', tint: '#FFE600', rarity: 'N', label: 'ベル', voice: { main: 'sine', over: 'sine', overShift: 19, dur: 0.4, overVol: 0.25 } },
  { id: 'sound_buzz', category: 'sound', tint: '#FF7A00', rarity: 'R', label: 'ブザー', voice: { main: 'sawtooth', over: 'square', overShift: -12, dur: 0.12, mainVol: 0.3 } },
  { id: 'sound_space', category: 'sound', tint: '#C99BFF', rarity: 'SR', label: 'うちゅう', voice: { main: 'sine', over: 'triangle', overShift: 7, dur: 0.22, slide: 2 } },
  { id: 'sound_kira', category: 'sound', tint: '#FF8CC6', rarity: 'SSR', label: 'キラキラ', voice: { main: 'triangle', over: 'sine', overShift: 24, dur: 0.3, overVol: 0.3, sparkle: true } },

  { id: 'bg_night', category: 'bg', rarity: 'N', label: 'よるのネオン', bgClass: '' },
  { id: 'bg_sea', category: 'bg', rarity: 'N', label: 'うみ', bgClass: 'dopa-theme-sea' },
  { id: 'bg_jungle', category: 'bg', rarity: 'N', label: 'ジャングル', bgClass: 'dopa-theme-jungle' },
  { id: 'bg_sunset', category: 'bg', rarity: 'R', label: 'ゆうやけ', bgClass: 'dopa-theme-sunset' },
  { id: 'bg_gold', category: 'bg', rarity: 'SR', label: 'おうごん', bgClass: 'dopa-theme-gold' },
  { id: 'bg_rainbow', category: 'bg', rarity: 'SSR', label: 'レインボー', bgClass: 'dopa-theme-rainbow' },
];

const ITEM_BY_ID = new Map(ITEMS.map(i => [i.id, i]));

export const getItem = (id: string): ItemDef | undefined => ITEM_BY_ID.get(id);

const DEFAULT_IDS: string[] = Object.values(DEFAULT_EQUIPPED);

export const isOwned = (id: string, inventory: string[]): boolean =>
  DEFAULT_IDS.includes(id) || inventory.includes(id);

// ガチャから出るもの（最初から持っている4つは出ない）
export const GACHA_POOL: ItemDef[] = ITEMS.filter(i => !DEFAULT_IDS.includes(i.id));

// カテゴリの装備中アイテム。保存データが壊れていても初期装備に戻す
export const equippedItem = (category: ItemCategory, equipped: SaveData['equipped'], inventory: string[]): ItemDef => {
  const item = ITEM_BY_ID.get(equipped[category]);
  return item && item.category === category && isOwned(item.id, inventory) ? item : ITEM_BY_ID.get(DEFAULT_EQUIPPED[category])!;
};

// いまの装備。多くの画面で使うので、props で配らずここから読む
export const getEquipped = (category: ItemCategory): ItemDef => {
  const save = loadSave();
  return equippedItem(category, save.equipped, save.inventory);
};

export const equipItem = (id: string): SaveData =>
  mutateSave(data => {
    const item = ITEM_BY_ID.get(id);
    if (!item || !isOwned(id, data.inventory)) return;
    data.equipped[item.category] = id;
  });
