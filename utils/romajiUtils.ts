export interface Mora {
  kana: string;
  romaji: string[]; 
}

const PREF_STORAGE_KEY = 'TYPING_MINI_ROMAJI_PREFS_V1';

let _memCache: Record<string, string> = {};
// 解析済みMora配列のキャッシュ
const _parseCache = new Map<string, Mora[]>();

export const getRomajiPreferences = (): Record<string, string> => {
  if (typeof window === 'undefined') return _memCache;
  try {
    const saved = localStorage.getItem(PREF_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      _memCache = parsed;
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load romaji preferences', e);
  }
  return _memCache;
};

export const saveRomajiPreferences = (prefs: Record<string, string>) => {
  _memCache = { ...prefs };
  _parseCache.clear(); // 設定変更時はキャッシュをクリア
  try {
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save romaji preferences', e);
  }
};

const SINGLE_KANA: Record<string, string[]> = {
  'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu', 'whu'], 'え': ['e'], 'お': ['o'],
  'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],
  'さ': ['sa'], 'し': ['si', 'shi', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],
  'た': ['ta'], 'ち': ['ti', 'chi'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
  'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
  'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
  'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
  'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
  'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
  'わ': ['wa'], 'を': ['wo'], 'ん': ['nn', 'xn', "n'"],
  'ー': ['-'],
  'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
  'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
  'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
  'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
  'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
  'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li'], 'ぅ': ['xu', 'lu'], 'ぇ': ['xe', 'le'], 'ぉ': ['xo', 'lo'],
  'ゃ': ['xya', 'lya'], 'ゅ': ['xyu', 'lyu'], 'ょ': ['xyo', 'lyo'],
  'っ': ['xtu', 'ltu', 'ltsu'], 
  'ゎ': ['xwa', 'lwa'],
  'ヵ': ['xka', 'lka'], 'ヶ': ['xke', 'lke']
};

const COMPOUNDS: Record<string, string[]> = {
  'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
  'しゃ': ['sya', 'sha'], 'しゅ': ['syu', 'shu'], 'しょ': ['syo', 'sho'],
  'ちゃ': ['tya', 'cha', 'cya'], 'ちゅ': ['tyu', 'chu', 'cyu'], 'ちょ': ['tyo', 'cho', 'cyo'],
  'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
  'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
  'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
  'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
  'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
  'じゃ': ['ja', 'zya', 'jya'], 'じゅ': ['ju', 'zyu', 'jyu'], 'じょ': ['jo', 'zyo', 'jyo'],
  'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
  'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
  'ふぁ': ['fa', 'fwa'], 'ふぃ': ['fi', 'fyi'], 'ふぇ': ['fe', 'fye'], 'ふぉ': ['fo', 'fwo'],
  'うぃ': ['wi', 'whi'], 'うぇ': ['we', 'whe'], 
  'ヴぁ': ['va'], 'ヴぃ': ['vi'], 'ヴ': ['vu'], 'ヴぇ': ['ve'], 'ヴぉ': ['vo'],
  'てぃ': ['thi'], 'でぃ': ['dhi'], 'どぅ': ['dwu'], 'とぅ': ['twu'],
  'ちぇ': ['tye', 'che', 'cye'], 'じぇ': ['je', 'zye', 'jye'], 'しぇ': ['sye', 'she']
};

const COMPOUND_KEYS = Object.keys(COMPOUNDS).sort((a, b) => b.length - a.length);
const SINGLE_KEYS = Object.keys(SINGLE_KANA).sort((a, b) => b.length - a.length);

export const getAllDefinitions = () => ({ SINGLE_KANA, COMPOUNDS });

const combine = (prefixes: string[], suffixes: string[]): string[] => {
  const result: string[] = [];
  for (const p of prefixes) {
    for (const s of suffixes) result.push(p + s);
  }
  return result;
};

export const parseKanaToMora = (text: string, preferredRomaji?: string): Mora[] | null => {
  if (!text) return null;
  
  // キャッシュヒット確認
  const cacheKey = `${text}_${preferredRomaji || ''}`;
  if (_parseCache.has(cacheKey)) return _parseCache.get(cacheKey)!;

  const currentPrefs = getRomajiPreferences();
  const normalized = text
    .replace(/[０-９ａ-ｚＡ-Ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));

  const initialTokens: { kana: string, romaji: string[], isSokuon?: boolean, isN?: boolean }[] = [];
  let i = 0;

  while (i < normalized.length) {
    let matched = false;
    const remaining = normalized.substring(i);
    
    for (const key of COMPOUND_KEYS) {
      if (remaining.startsWith(key)) {
        let romajiList = [...COMPOUNDS[key]];
        if (SINGLE_KANA[key[0]] && SINGLE_KANA[key[1]]) {
           romajiList.push(...combine(SINGLE_KANA[key[0]], SINGLE_KANA[key[1]]));
        }
        initialTokens.push({ kana: key, romaji: Array.from(new Set(romajiList)) });
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (remaining.startsWith('っ')) {
      initialTokens.push({ kana: 'っ', romaji: [...SINGLE_KANA['っ']], isSokuon: true });
      i += 1;
    } else if (remaining.startsWith('ん')) {
      initialTokens.push({ kana: 'ん', romaji: [...SINGLE_KANA['ん']], isN: true });
      i += 1;
    } else {
      let foundSingle = false;
      for (const key of SINGLE_KEYS) {
        if (remaining.startsWith(key)) {
          initialTokens.push({ kana: key, romaji: [...SINGLE_KANA[key]] });
          i += key.length;
          foundSingle = true;
          break;
        }
      }
      if (!foundSingle) {
         const char = remaining[0];
         initialTokens.push({ kana: char, romaji: [char.toLowerCase()] });
         i++;
      }
    }
  }

  const processedTokens: { kana: string, romaji: string[] }[] = [];
  for (let j = 0; j < initialTokens.length; j++) {
    const current = initialTokens[j];
    const next = initialTokens[j + 1];

    if (current.isSokuon && next) {
      const combinedKana = current.kana + next.kana;
      const combinedRomaji: string[] = [];
      
      next.romaji.forEach(nextR => {
        const firstChar = nextR[0].toLowerCase();
        if (!['a', 'i', 'u', 'e', 'o', 'n'].includes(firstChar)) {
          combinedRomaji.push(firstChar + nextR);
        }
        current.romaji.forEach(sokuonR => {
          combinedRomaji.push(sokuonR + nextR);
        });
      });
      
      processedTokens.push({ kana: combinedKana, romaji: Array.from(new Set(combinedRomaji)) });
      j++;
      continue;
    }

    if (current.isN && next) {
      const nextChar = next.romaji[0][0].toLowerCase(); 
      const adjustedRomaji = [...current.romaji];
      if (!['a', 'i', 'u', 'e', 'o', 'n', 'y'].includes(nextChar)) {
        adjustedRomaji.push('n');
      }
      processedTokens.push({ kana: current.kana, romaji: Array.from(new Set(adjustedRomaji)) });
      continue;
    }

    processedTokens.push({ kana: current.kana, romaji: current.romaji });
  }

  const result: Mora[] = processedTokens.map(token => {
    const userPref = currentPrefs[token.kana]?.toLowerCase();
    const defaultOrder = (COMPOUNDS[token.kana] || SINGLE_KANA[token.kana] || []).map(r => r.toLowerCase());

    const sortedRomaji = Array.from(new Set(token.romaji)).sort((a, b) => {
      const lowA = a.toLowerCase();
      const lowB = b.toLowerCase();

      if (userPref) {
        if (lowA === userPref) return -1;
        if (lowB === userPref) return 1;
      }
      
      const indexA = defaultOrder.indexOf(lowA);
      const indexB = defaultOrder.indexOf(lowB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return a.length - b.length;
    });

    return { kana: token.kana, romaji: sortedRomaji };
  });

  _parseCache.set(cacheKey, result);
  return result;
};
