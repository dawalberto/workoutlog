import type { StateCreator } from 'zustand/vanilla';
import { AppTab } from '../../types';
import { getDiaryEntriesCount } from '../../utils/diaryCalculations';
import type { AppState } from '../appStore';

export interface DiaryNavigationSlice {
  diaryTargetExerciseName: string | undefined;
  diaryAutoOpenCreate: boolean;
  openExerciseDiary: (
    exerciseName: string,
    exerciseId?: string,
  ) => void;
  clearDiaryNavigationState: () => void;
}

export const createDiaryNavigationSlice:
  StateCreator<AppState, [], [], DiaryNavigationSlice> = (set, get) => ({
  diaryTargetExerciseName: undefined,
  diaryAutoOpenCreate: false,
  openExerciseDiary: (exerciseName, exerciseId) => {
    if (!exerciseName) return;
    const diaryAutoOpenCreate =
      getDiaryEntriesCount(get().exerciseDiary, exerciseName, exerciseId) === 0;
    set({
      diaryTargetExerciseName: exerciseName,
      diaryAutoOpenCreate,
      activeTab: AppTab.DIARY,
    });
    get().closeRoutine();
    get().dismissWorkoutSummary();
  },
  clearDiaryNavigationState: () => set({
    diaryTargetExerciseName: undefined,
    diaryAutoOpenCreate: false,
  }),
});
