import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import { useShallow } from 'zustand/react/shallow';

export function useWorkoutSummaryModal() {
  const summary = useAppStore((state) => state.workoutSummary);
  const { rmLogs, exerciseDiary, routines, catalog } =
    useAppStore(useShallow(selectPersistedData));
  const openDiary = useAppStore((state) => state.openExerciseDiary);
  const dismissWorkoutSummary = useAppStore((state) => state.dismissWorkoutSummary);

  return {
    summary,
    rmLogs,
    exerciseDiary,
    routines,
    catalog,
    onOpenDiary: openDiary,
    onClose: dismissWorkoutSummary,
  };
}
