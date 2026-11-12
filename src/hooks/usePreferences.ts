import { useEffect } from 'react';
import { DEVICE_KEYS, getDeviceStoredItem, setDeviceStoredItem } from '../services/db';
import { appStore } from '../store/appStore';
import { parsePreferences } from '../utils/preferences';

export function usePreferences(): void {
  useEffect(() => {
    let cancelled = false;
    let hydrated = false;
    const unsubscribe = appStore.subscribe((state, previous) => {
      if (state.language !== previous.language) document.documentElement.lang = state.language;
      if (hydrated && (state.language !== previous.language || state.weightUnit !== previous.weightUnit || state.languageExplicit !== previous.languageExplicit)) {
        void setDeviceStoredItem(DEVICE_KEYS.PREFERENCES, { ...(state.languageExplicit ? { language: state.language } : {}), weightUnit: state.weightUnit });
      }
    });
    document.documentElement.lang = appStore.getState().language;
    void getDeviceStoredItem<unknown>(DEVICE_KEYS.PREFERENCES, null).then((value) => {
      if (cancelled) return;
      const current = appStore.getState();
      current.setPreferences(parsePreferences(value, current.language));
      hydrated = true;
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);
}
