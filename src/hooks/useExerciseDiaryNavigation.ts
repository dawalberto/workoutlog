/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ExerciseDiary, AppTab } from '../types';
import { getDiaryEntriesCount } from '../utils/diaryCalculations';

export interface UseExerciseDiaryNavigationProps {
  exerciseDiary: ExerciseDiary[];
  onNavigateToTab: (tab: AppTab) => void;
  onCloseActiveRoutine?: () => void;
  onDismissWorkoutSummary?: () => void;
}

export interface UseExerciseDiaryNavigationReturn {
  diaryTargetExerciseName: string | undefined;
  diaryAutoOpenCreate: boolean;
  openExerciseDiary: (exerciseName: string, exerciseId?: string) => void;
  clearDiaryNavigationState: () => void;
}

export function useExerciseDiaryNavigation({
  exerciseDiary,
  onNavigateToTab,
  onCloseActiveRoutine,
  onDismissWorkoutSummary,
}: UseExerciseDiaryNavigationProps): UseExerciseDiaryNavigationReturn {
  const [diaryTargetExerciseName, setDiaryTargetExerciseName] = useState<string | undefined>(undefined);
  const [diaryAutoOpenCreate, setDiaryAutoOpenCreate] = useState<boolean>(false);

  const openExerciseDiary = (exerciseName: string, exerciseId?: string) => {
    if (!exerciseName) return;

    const count = getDiaryEntriesCount(exerciseDiary, exerciseName, exerciseId);
    const hasEntries = count > 0;

    setDiaryTargetExerciseName(exerciseName);
    setDiaryAutoOpenCreate(!hasEntries);

    onNavigateToTab(AppTab.DIARY);
    onCloseActiveRoutine?.();
    onDismissWorkoutSummary?.();
  };

  const clearDiaryNavigationState = () => {
    setDiaryTargetExerciseName(undefined);
    setDiaryAutoOpenCreate(false);
  };

  return {
    diaryTargetExerciseName,
    diaryAutoOpenCreate,
    openExerciseDiary,
    clearDiaryNavigationState,
  };
}
