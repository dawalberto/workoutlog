import type { StateCreator } from 'zustand/vanilla';
import type { AppState } from '../appStore';
import { browserLanguage, type Language, type Preferences, type WeightUnit } from '../../utils/preferences';

export interface PreferencesSlice extends Preferences {
  preferencesReady: boolean;
  setPreferences: (preferences: Preferences) => void;
  setLanguage: (language: Language) => void;
  setWeightUnit: (weightUnit: WeightUnit) => void;
}

export const createPreferencesSlice: StateCreator<AppState, [], [], PreferencesSlice> = (set) => ({
  language: browserLanguage(typeof window === 'undefined' || !window.navigator ? [] : window.navigator.languages?.length ? window.navigator.languages : [window.navigator.language]),
  weightUnit: 'kg',
  languageExplicit: false,
  preferencesReady: false,
  setPreferences: (preferences) => set({ ...preferences, preferencesReady: true }),
  setLanguage: (language) => set({ language, languageExplicit: true }),
  setWeightUnit: (weightUnit) => set({ weightUnit }),
});
