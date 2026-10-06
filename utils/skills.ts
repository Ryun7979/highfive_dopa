import { Difficulty } from '../types';
import { BONUS_SECONDS, FEVER_SECONDS, GAUGE_KEEP_ON_MISS, GOLDEN_RATE } from './gameRules';
import { SaveData, mutateSave } from './saveData';

// スキルツリー（docs/spec.md §8）。SP でノードを解放する。振り直しは無料で何度でも。

export type SkillBranch = 'play' | 'boost' | 'fx';

export interface SkillNode {
  id: string;
  branch: SkillBranch;
  label: string;
  desc: string;
  cost: number;
  requires?: string; // 先に取っておくノード
}

export const SKILL_BRANCHES: { id: SkillBranch; label: string; desc: string }[] = [
  { id: 'play', label: 'あそび', desc: 'あそべる レベルが ふえる' },
  { id: 'boost', label: 'ブースト', desc: 'スコアが のびやすくなる' },
  { id: 'fx', label: 'えんしゅつ', desc: 'もっと ド派手に なる' },
];

export const SKILL_NODES: SkillNode[] = [
  { id: 'unlock_hard', branch: 'play', label: 'むずかしい', desc: 'レベル「むずかしい」で あそべる', cost: 1 },
  { id: 'unlock_master', branch: 'play', label: 'マスター', desc: 'レベル「マスター」で あそべる', cost: 2, requires: 'unlock_hard' },
  { id: 'unlock_conversation', branch: 'play', label: 'かいわ', desc: 'レベル「かいわ」で あそべる', cost: 2 },
  { id: 'ghost', branch: 'play', label: 'ゴーストたいせん', desc: 'じこベストの じぶんと スコアで しょうぶ', cost: 3 },

  { id: 'fever_1', branch: 'boost', label: 'FEVER えんちょう 1', desc: 'FEVER ゲージの へりが おそくなる', cost: 1 },
  { id: 'fever_2', branch: 'boost', label: 'FEVER えんちょう 2', desc: 'FEVER ゲージの へりが さらに おそくなる', cost: 2, requires: 'fever_1' },
  { id: 'fever_3', branch: 'boost', label: 'FEVER えんちょう 3', desc: 'FEVER ゲージの へりが さらに おそくなる', cost: 3, requires: 'fever_2' },
  { id: 'gauge_guard', branch: 'boost', label: 'ゲージまもり', desc: 'ミスしても ゲージが へりにくい', cost: 3, requires: 'fever_1' },
  { id: 'golden_1', branch: 'boost', label: 'ゴールデン アップ 1', desc: 'ゴールデンワードが でやすくなる', cost: 1 },
  { id: 'golden_2', branch: 'boost', label: 'ゴールデン アップ 2', desc: 'ゴールデンワードが もっと でやすくなる', cost: 2, requires: 'golden_1' },
  { id: 'golden_3', branch: 'boost', label: 'ゴールデン アップ 3', desc: 'ゴールデンワードが すごく でやすくなる', cost: 3, requires: 'golden_2' },
  { id: 'bonus_long', branch: 'boost', label: 'ボーナス えんちょう', desc: 'ボーナスタイムが 5びょう ながくなる', cost: 2, requires: 'golden_1' },

  { id: 'lucky', branch: 'fx', label: 'ラッキーえんしゅつ', desc: 'クリアで ときどき スペシャルな はなび', cost: 1 },
  { id: 'scale', branch: 'fx', label: 'おんかい ついか', desc: 'うつ おとを わふう・ゲームふうに かえられる', cost: 1 },
  { id: 'result_flashy', branch: 'fx', label: 'リザルト はでか', desc: 'ランクはっぴょうが もっと はでに', cost: 2, requires: 'lucky' },
  { id: 'awaken', branch: 'fx', label: 'かくせい えんしゅつ', desc: '100コンボで ラビッドパが だいかくせい', cost: 3, requires: 'result_flashy' },
];

const NODE_BY_ID = new Map(SKILL_NODES.map(n => [n.id, n]));

export type SkillState = 'owned' | 'open' | 'locked';

// owned: 解放済み / open: 前提がそろっていて SP があれば取れる / locked: 前提がまだ
export const getSkillState = (node: SkillNode, skills: string[]): SkillState => {
  if (skills.includes(node.id)) return 'owned';
  return !node.requires || skills.includes(node.requires) ? 'open' : 'locked';
};

export const unlockSkill = (id: string): SaveData =>
  mutateSave(data => {
    const node = NODE_BY_ID.get(id);
    if (!node || getSkillState(node, data.skills) !== 'open' || data.player.sp < node.cost) return;
    data.player.sp -= node.cost;
    data.skills.push(id);
  });

// 振り直し：使った SP をぜんぶ返して、ノードを空にする
export const resetSkills = (): SaveData =>
  mutateSave(data => {
    const spent = data.skills.reduce((sum, id) => sum + (NODE_BY_ID.get(id)?.cost ?? 0), 0);
    data.player.sp += spent;
    data.skills = [];
    data.settings.scale = 'doremi';
  });

const DIFFICULTY_SKILL: Partial<Record<Difficulty, string>> = {
  [Difficulty.HARD]: 'unlock_hard',
  [Difficulty.MASTER]: 'unlock_master',
  [Difficulty.CONVERSATION]: 'unlock_conversation',
};

// かんたん・ふつう は最初から遊べる
export const isDifficultyUnlocked = (difficulty: Difficulty, skills: string[]): boolean => {
  const need = DIFFICULTY_SKILL[difficulty];
  return !need || skills.includes(need);
};

// スキルを反映したあとのルール値。プレイ画面はこれだけを見る
export interface GameMods {
  feverSeconds: number;
  goldenRate: number;
  bonusSeconds: number;
  gaugeKeepOnMiss: number;
  lucky: boolean;
  awaken: boolean;
  ghost: boolean;
  resultFlashy: boolean;
  scaleChoice: boolean;
}

export const getMods = (skills: string[]): GameMods => {
  const count = (prefix: string) => skills.filter(id => id.startsWith(prefix)).length;
  return {
    feverSeconds: FEVER_SECONDS + count('fever_'),
    goldenRate: GOLDEN_RATE + 0.05 * count('golden_'),
    bonusSeconds: BONUS_SECONDS + (skills.includes('bonus_long') ? 5 : 0),
    // ゲージ守り：ミスで減る量を半分にする
    gaugeKeepOnMiss: skills.includes('gauge_guard') ? 1 - (1 - GAUGE_KEEP_ON_MISS) / 2 : GAUGE_KEEP_ON_MISS,
    lucky: skills.includes('lucky'),
    awaken: skills.includes('awaken'),
    ghost: skills.includes('ghost'),
    resultFlashy: skills.includes('result_flashy'),
    scaleChoice: skills.includes('scale'),
  };
};

export const DEFAULT_MODS: GameMods = getMods([]);
