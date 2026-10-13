import { useAppStore } from '../../store/appStore';
import { selectActiveRoutine } from '../../store/selectors';
import { getRoutineTotalSeconds } from '../../utils/timeCalculations';
import { getRoutineViewProgress } from '../../utils/routineView';

export function useRoutineHeader() {
  const routine = useAppStore(selectActiveRoutine);
  const session = useAppStore((state) =>
    routine ? state.activeSessions[routine.id] : undefined,
  );
  const closeRoutine = useAppStore((state) => state.closeRoutine);
  const selectRoutine = useAppStore((state) => state.selectRoutine);
  const progress = routine
    ? getRoutineViewProgress(routine, session?.completedSetIds)
    : null;

  const onBack = () => {
    closeRoutine();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  const onModeChange = (mode: 'edit' | 'execute') => {
    if (routine) selectRoutine(routine.id, mode);
  };

  return {
    routine,
    session,
    totalWorkoutSeconds: routine ? getRoutineTotalSeconds(routine) : 0,
    allExercisesCompleted: progress?.allExercisesCompleted ?? false,
    onBack,
    onModeChange,
  };
}
