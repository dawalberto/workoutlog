import { AppTab } from '../../types';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { selectPersistedData } from '../../store/selectors';

export function useTabContent() {
  const data = useAppStore(useShallow(selectPersistedData));
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const createRoutine = useAppStore((state) => state.createRoutine);
  const selectRoutine = useAppStore((state) => state.selectRoutine);
  const duplicateRoutine = useAppStore((state) => state.duplicateRoutine);
  const deleteRoutine = useAppStore((state) => state.deleteRoutine);
  const createCatalogExercise = useAppStore((state) => state.createCatalogExercise);
  const updateCatalogExercise = useAppStore((state) => state.updateCatalogExercise);
  const deleteCatalogExercise = useAppStore((state) => state.deleteCatalogExercise);
  const checkRmWeight = useAppStore((state) => state.checkRmWeight);
  const openDiary = useAppStore((state) => state.openExerciseDiary);
  const deleteHistoryLog = useAppStore((state) => state.deleteHistoryLog);
  const diaryTargetExerciseName = useAppStore((state) => state.diaryTargetExerciseName);
  const diaryAutoOpenCreate = useAppStore((state) => state.diaryAutoOpenCreate);
  const clearDiaryNavigationState = useAppStore((state) => state.clearDiaryNavigationState);

  return {
    ...data,
    activeTab,
    createRoutine,
    selectRoutine,
    duplicateRoutine,
    deleteRoutine,
    createCatalogExercise,
    updateCatalogExercise,
    deleteCatalogExercise,
    checkRmWeight,
    openDiary,
    deleteHistoryLog,
    diaryTargetExerciseName,
    diaryAutoOpenCreate,
    clearDiaryNavigationState,
    onGoToCatalog: () => setActiveTab(AppTab.EXERCISES),
    onGoToRoutines: () => setActiveTab(AppTab.ROUTINES),
  };
}
