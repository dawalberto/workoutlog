import { useAppStore } from '../../store/appStore';
import { selectActiveRoutine } from '../../store/selectors';
import { getRoutineViewProgress } from '../../utils/routineView';

export function useWorkoutFinishConfirmModal() {
  const routine = useAppStore(selectActiveRoutine);
  const session = useAppStore((state) =>
    routine ? state.activeSessions[routine.id] : undefined,
  );
  const progress = routine
    ? getRoutineViewProgress(routine, session?.completedSetIds)
    : null;

  return {
    routineName: routine?.name ?? '',
    completedSetsCount: progress?.completedSetsCount ?? 0,
    totalSetsCount: progress?.totalSetsCount ?? 0,
    completionPercentage: progress?.completionPercentage ?? 0,
    isAllCompleted: progress?.allExercisesCompleted ?? false,
    remainingSets: Math.max(
      0,
      (progress?.totalSetsCount ?? 0) - (progress?.completedSetsCount ?? 0),
    ),
  };
}
