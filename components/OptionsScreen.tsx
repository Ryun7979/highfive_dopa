import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { audioManager, VolumeLevel } from '../utils/audioManager';
import { FontType, getSettings, saveSettings } from '../utils/settingsManager';
import { BreakMinutes, EffectLevel, ScalePattern, TextSize, loadSave, updateGameSettings } from '../utils/saveData';
import { getMods } from '../utils/skills';
import DopaBackground from './DopaBackground';

interface OptionsScreenProps {
  onBack: () => void;
}

interface Choice<T> {
  value: T;
  label: string;
  desc?: string;
}

const VOLUMES: Choice<VolumeLevel>[] = [
  { value: 'OFF', label: 'OFF' },
  { value: 'LOW', label: '小' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '大' },
];
const EFFECTS: Choice<EffectLevel>[] = [
  { value: 'low', label: 'ひかえめ', desc: 'ピカピカ・ゆれ なし' },
  { value: 'normal', label: 'ふつう', desc: 'ほどほど' },
  { value: 'max', label: 'MAX', desc: 'ぜんぶ もり！' },
];
const TEXT_SIZES: Choice<TextSize>[] = [
  { value: 'normal', label: 'ふつう', desc: 'いつもの大きさ' },
  { value: 'large', label: 'おおきい', desc: 'もっと大きく' },
  { value: 'max', label: 'さいだい', desc: 'がめんいっぱい' },
];
const SCALE_CHOICES: Choice<ScalePattern>[] = [
  { value: 'doremi', label: 'ドレミ' },
  { value: 'wafu', label: 'わふう' },
  { value: 'game', label: 'ゲームふう' },
];
// ChoiceRow の値は文字列なので、分数は文字列で持って数に直す
const BREAKS: Choice<string>[] = [
  { value: '0', label: 'OFF' },
  { value: '15', label: '15ふん' },
  { value: '30', label: '30ぷん' },
  { value: '45', label: '45ふん' },
  { value: '60', label: '60ぷん' },
];
const FONTS: Choice<FontType>[] = [
  { value: 'POP', label: 'ポップ' },
  { value: 'ROUNDED', label: 'まるゴシック' },
];

function ChoiceRow<T extends string>({ title, color, edge, choices, value, onChange }: { title: string; color: string; edge: string; choices: Choice<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="bg-neon-ink/50 rounded-2xl border-4 border-neon-ink p-3 pb-5">
      <div className="flex justify-start mb-3">
        <div className="hx-tag px-4 py-0.5" style={{ '--edge': edge } as React.CSSProperties}>
          <span className="hx-unskew text-white text-xl md:text-2xl">{title}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 px-2">
        {choices.map(c => {
          const isActive = c.value === value;
          return (
            <button
              key={c.value}
              onClick={() => onChange(c.value)}
              className={`hx-btn ${isActive ? color : 'hx-off'} flex-1 min-w-[6.5rem] px-3 py-2`}
            >
              <span className="hx-btn-in flex-col">
                <span className={`text-2xl md:text-3xl whitespace-nowrap ${isActive ? 'hx-sticker' : ''}`}>{c.label}</span>
                {c.desc && <span className="text-sm md:text-base whitespace-nowrap">{c.desc}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// オプション画面（docs/spec.md §11-7）。ロックなしで誰でも変えられる。
const OptionsScreen: React.FC<OptionsScreenProps> = ({ onBack }) => {
  const [volume, setVolume] = useState<VolumeLevel>(audioManager.getVolume());
  const [settings, setSettings] = useState(() => loadSave().settings);
  const [fontType, setFontType] = useState<FontType>(() => getSettings().fontType);
  // スキル「音階パターン追加」を取っていると選べる
  const [scaleChoice] = useState(() => getMods(loadSave().skills).scaleChoice);

  const changeVolume = (level: VolumeLevel) => {
    audioManager.setVolume(level);
    setVolume(level);
    if (level !== 'OFF') audioManager.playSelect();
  };
  const changeEffect = (effectLevel: EffectLevel) => {
    audioManager.playSelect();
    setSettings(updateGameSettings({ effectLevel }).settings);
  };
  const changeTextSize = (textSize: TextSize) => {
    audioManager.playSelect();
    setSettings(updateGameSettings({ textSize }).settings);
  };
  const changeScale = (scale: ScalePattern) => {
    setSettings(updateGameSettings({ scale }).settings);
    audioManager.setScale(scale);
    // えらんだ音階をためしに鳴らす
    [1, 2, 3, 4, 5].forEach((n, i) => window.setTimeout(() => audioManager.playTypeNote(n), i * 110));
  };
  const changeBreak = (value: string) => {
    audioManager.playSelect();
    setSettings(updateGameSettings({ breakMinutes: Number(value) as BreakMinutes }).settings);
  };
  const changeFont = (next: FontType) => {
    audioManager.playSelect();
    saveSettings({ ...getSettings(), fontType: next });
    setFontType(next);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DopaBackground level={1} calm={settings.effectLevel === 'low'} />
      <div className="relative z-10 h-screen overflow-y-auto overflow-x-hidden dopa-scroll flex flex-col items-center p-5 pt-10 md:p-8 md:pt-12 animate-fade-in w-full font-pop">
        <div className="hx-panel w-full max-w-6xl my-auto p-5 md:p-8" style={{ '--edge': 'var(--purple)' } as React.CSSProperties}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="hx-skew dopa-rainbow-fill border-[5px] border-neon-ink rounded-2xl px-12 py-2 shadow-[8px_9px_0_#0B0320] whitespace-nowrap">
              <h2 className="hx-unskew hx-sticker text-white text-3xl md:text-5xl tracking-wider leading-none">オプション</h2>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChoiceRow title="おとの大きさ" color="hx-cyan" edge="var(--cyan)" choices={VOLUMES} value={volume} onChange={changeVolume} />
            <ChoiceRow title="えんしゅつのつよさ" color="hx-pink" edge="var(--pink)" choices={EFFECTS} value={settings.effectLevel} onChange={changeEffect} />
            <ChoiceRow title="もじの大きさ" color="hx-yellow" edge="var(--yellow)" choices={TEXT_SIZES} value={settings.textSize} onChange={changeTextSize} />
            <ChoiceRow title="フォント" color="hx-lime" edge="var(--lime)" choices={FONTS} value={fontType} onChange={changeFont} />
            <div className="lg:col-span-2">
              <ChoiceRow title="きゅうけいの おしらせ" color="hx-purple" edge="var(--purple)" choices={BREAKS} value={String(settings.breakMinutes)} onChange={changeBreak} />
            </div>
            {scaleChoice && (
              <ChoiceRow title="うつ おとの おんかい" color="hx-orange" edge="var(--orange)" choices={SCALE_CHOICES} value={settings.scale} onChange={changeScale} />
            )}
          </div>

          <div className="mt-6 mb-2 flex justify-center">
            <button
              onClick={() => { audioManager.playCancel(); onBack(); }}
              className="hx-btn hx-red px-12 py-3 text-2xl md:text-3xl"
            >
              <span className="hx-btn-in">
                <ArrowLeft className="w-8 h-8 mr-3" strokeWidth={3} />
                <span className="hx-sticker">もどる</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsScreen;
