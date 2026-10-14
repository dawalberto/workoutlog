import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { createAccountSlice, type AccountSlice } from './slices/accountSlice';
import { createDataSlice, type DataSlice } from './slices/dataSlice';
import { createDiaryNavigationSlice, type DiaryNavigationSlice } from './slices/diaryNavigationSlice';
import { createRestTimerSlice, type RestTimerSlice } from './slices/restTimerSlice';
import { createSyncSlice, type SyncSlice } from './slices/syncSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createRoutineSlice, type RoutineSlice } from './slices/routineSlice';
import { createWorkoutSlice, type WorkoutSlice } from './slices/workoutSlice';
import { createRmSlice, type RmSlice } from './slices/rmSlice';

export type AppState =
  & DataSlice
  & UiSlice
  & RestTimerSlice
  & DiaryNavigationSlice
  & AccountSlice
  & SyncSlice
  & RoutineSlice
  & WorkoutSlice
  & RmSlice;

export const createAppStore = (initial?: Partial<AppState>) =>
  createStore<AppState>()((...args) => ({
    ...createDataSlice(...args),
    ...createUiSlice(...args),
    ...createRestTimerSlice(...args),
    ...createDiaryNavigationSlice(...args),
    ...createAccountSlice(...args),
    ...createSyncSlice(...args),
    ...createRoutineSlice(...args),
    ...createWorkoutSlice(...args),
    ...createRmSlice(...args),
    ...initial,
  }));

export const appStore = createAppStore();

export const useAppStore = <T,>(selector: (state: AppState) => T): T =>
  useStore(appStore, selector);
