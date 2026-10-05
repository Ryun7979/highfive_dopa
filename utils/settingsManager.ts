export type FontType = 'POP' | 'ROUNDED';

const SETTINGS_STORAGE_KEY = 'TYPING_MINI_SETTINGS_V1';

export interface GameSettings {
  fontType: FontType;
}

const defaultSettings: GameSettings = {
  fontType: 'POP'
};

export const saveSettings = (settings: GameSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
};

export const getSettings = (): GameSettings => {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load settings', e);
  }
  return defaultSettings;
};