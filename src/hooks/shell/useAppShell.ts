import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import {
  selectActiveRoutine,
  selectPersistedData,
} from '../../store/selectors';

export function useAppShell() {
  const data = useAppStore(useShallow(selectPersistedData));
  const activeRoutineId = useAppStore((state) => state.activeRoutineId);
  const routineSubMode = useAppStore((state) => state.routineSubMode);
  const activeRoutine = useAppStore(selectActiveRoutine);
  const activeRestTimer = useAppStore((state) => state.activeRestTimer);
  const closeRoutine = useAppStore((state) => state.closeRoutine);
  const saveRoutine = useAppStore((state) => state.saveRoutine);
  const startSession = useAppStore((state) => state.startSession);
  const toggleSetComplete = useAppStore((state) => state.toggleSetComplete);
  const resetSession = useAppStore((state) => state.resetSession);
  const finishSession = useAppStore((state) => state.finishSession);
  const createCatalogExercise = useAppStore((state) => state.createCatalogExercise);
  const checkRmWeight = useAppStore((state) => state.checkRmWeight);
  const openDiary = useAppStore((state) => state.openExerciseDiary);
  const startRestTimer = useAppStore((state) => state.startRestTimer);
  const closeRestTimer = useAppStore((state) => state.closeRestTimer);

  const onBack = () => {
    closeRoutine();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return {
    ...data,
    activeRoutineId,
    routineSubMode,
    activeRoutine,
    activeRestTimer,
    onBack,
    saveRoutine,
    startSession,
    toggleSetComplete,
    resetSession,
    finishSession,
    createCatalogExercise,
    checkRmWeight,
    openDiary,
    startRestTimer,
    closeRestTimer,
  };
}
