import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontScale = 1 | 1.15 | 1.3;
export type AppLang = 'en' | 'te';

interface SettingsStore {
  fontScale: FontScale;
  lang: AppLang;
  setFontScale: (scale: FontScale) => Promise<void>;
  setLang: (lang: AppLang) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const useSettingsStore = create<SettingsStore>((set) => ({
  fontScale: 1,
  lang: 'en',

  setFontScale: async (scale) => {
    set({ fontScale: scale });
    await AsyncStorage.setItem('fontScale', String(scale));
  },

  setLang: async (lang) => {
    set({ lang });
    await AsyncStorage.setItem('appLang', lang);
  },

  loadSettings: async () => {
    try {
      const [savedScale, savedLang] = await Promise.all([
        AsyncStorage.getItem('fontScale'),
        AsyncStorage.getItem('appLang'),
      ]);
      if (savedScale) set({ fontScale: parseFloat(savedScale) as FontScale });
      if (savedLang) set({ lang: savedLang as AppLang });
    } catch (_) {}
  },
}));

export default useSettingsStore;
