import type { StateCreator } from 'zustand/vanilla';
import { AppTab } from '../../types';
import { getDiaryEntriesCount } from '../../utils/diaryCalculations';
import type { AppState } from '../appStore';

export interface DiaryNavigationCallbacks {
  closeRoutine?: () => void;
  dismissWorkoutSummary?: () => void;
}

export interface DiaryNavigationSlice {
  diaryTargetExerciseName: string | undefined;
  diaryAutoOpenCreate: boolean;
  openExerciseDiary: (
    exerciseName: string,
    exerciseId?: string,
    callbacks?: DiaryNavigationCallbacks,
  ) => void;
  clearDiaryNavigationState: () => void;
}

export const createDiaryNavigationSlice:
  StateCreator<AppState, [], [], DiaryNavigationSlice> = (set, get) => ({
  diaryTargetExerciseName: undefined,
  diaryAutoOpenCreate: false,
  openExerciseDiary: (exerciseName, exerciseId, callbacks) => {
    if (!exerciseName) return;
    const diaryAutoOpenCreate =
      getDiaryEntriesCount(get().exerciseDiary, exerciseName, exerciseId) === 0;
    set({
      diaryTargetExerciseName: exerciseName,
      diaryAutoOpenCreate,
      activeTab: AppTab.DIARY,
    });
    callbacks?.closeRoutine?.();
    callbacks?.dismissWorkoutSummary?.();
  },
  clearDiaryNavigationState: () => set({
    diaryTargetExerciseName: undefined,
    diaryAutoOpenCreate: false,
  }),
});
