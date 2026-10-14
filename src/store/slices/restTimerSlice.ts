import type { StateCreator } from 'zustand/vanilla';
import type { ActiveRestTimer } from '../../types';
import {
  clearActiveRestTimer,
  extendRestTimer as extendTimer,
  loadActiveRestTimer,
  pauseRestTimer as pauseTimer,
  resumeRestTimer as resumeTimer,
  saveActiveRestTimer,
} from '../../utils/restTimer';
import type { AppState } from '../appStore';

export interface RestTimerSlice {
  activeRestTimer: ActiveRestTimer | null;
  startRestTimer: (timer: ActiveRestTimer) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  extendRestTimer: (seconds: number) => void;
  closeRestTimer: () => void;
}

export const createRestTimerSlice: StateCreator<AppState, [], [], RestTimerSlice> = (set, get) => ({
  activeRestTimer: loadActiveRestTimer(),
  startRestTimer: (activeRestTimer) => {
    set({ activeRestTimer });
    saveActiveRestTimer(activeRestTimer);
  },
  pauseRestTimer: () => {
    const activeRestTimer = get().activeRestTimer;
    if (!activeRestTimer) return;
    const pausedTimer = pauseTimer(activeRestTimer, Date.now());
    if (pausedTimer === activeRestTimer) return;
    set({ activeRestTimer: pausedTimer });
    saveActiveRestTimer(pausedTimer);
  },
  resumeRestTimer: () => {
    const activeRestTimer = get().activeRestTimer;
    if (!activeRestTimer) return;
    const resumedTimer = resumeTimer(activeRestTimer, Date.now());
    if (resumedTimer === activeRestTimer) return;
    set({ activeRestTimer: resumedTimer });
    saveActiveRestTimer(resumedTimer);
  },
  extendRestTimer: (seconds) => {
    const activeRestTimer = get().activeRestTimer;
    if (!activeRestTimer) return;
    const extendedTimer = extendTimer(activeRestTimer, seconds, Date.now());
    if (extendedTimer === activeRestTimer) return;
    set({ activeRestTimer: extendedTimer });
    saveActiveRestTimer(extendedTimer);
  },
  closeRestTimer: () => {
    set({ activeRestTimer: null });
    clearActiveRestTimer();
  },
});
