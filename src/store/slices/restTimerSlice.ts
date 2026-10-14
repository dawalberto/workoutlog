import type { StateCreator } from 'zustand/vanilla';
import type { ActiveRestTimer } from '../../types';
import {
  clearActiveRestTimer,
  loadActiveRestTimer,
  saveActiveRestTimer,
} from '../../utils/restTimer';
import type { AppState } from '../appStore';

export interface RestTimerSlice {
  activeRestTimer: ActiveRestTimer | null;
  startRestTimer: (timer: ActiveRestTimer) => void;
  closeRestTimer: () => void;
}

export const createRestTimerSlice: StateCreator<AppState, [], [], RestTimerSlice> = (set) => ({
  activeRestTimer: loadActiveRestTimer(),
  startRestTimer: (activeRestTimer) => {
    set({ activeRestTimer });
    saveActiveRestTimer(activeRestTimer);
  },
  closeRestTimer: () => {
    set({ activeRestTimer: null });
    clearActiveRestTimer();
  },
});
