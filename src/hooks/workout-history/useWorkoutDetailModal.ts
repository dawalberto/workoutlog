import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import { useShallow } from 'zustand/react/shallow';

export function useWorkoutDetailModal(logId: string | null) {
  const { workoutHistory, rmLogs, exerciseDiary, routines, catalog } =
    useAppStore(useShallow(selectPersistedData));
  const deleteHistoryLog = useAppStore((state) => state.deleteHistoryLog);
  const openDiary = useAppStore((state) => state.openExerciseDiary);

  return {
    log: logId ? workoutHistory.find((item) => item.id === logId) ?? null : null,
    rmLogs,
    exerciseDiary,
    routines,
    catalog,
    onOpenDiary: openDiary,
    onDelete: deleteHistoryLog,
  };
}
