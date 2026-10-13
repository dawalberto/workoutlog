import { useAppStore } from '../../store/appStore';
import { selectActiveRoutine } from '../../store/selectors';
import { formatExerciseSummary } from '../../utils/timeCalculations';
import { getRoutineViewProgress } from '../../utils/routineView';
import type { WorkoutCompletionSummary } from '../../types';

export function useWorkoutProgressPanel() {
  const routine = useAppStore(selectActiveRoutine);
  const session = useAppStore((state) =>
    routine ? state.activeSessions[routine.id] : undefined,
  );
  const startSession = useAppStore((state) => state.startSession);
  const resetSession = useAppStore((state) => state.resetSession);
  const finishSession = useAppStore((state) => state.finishSession);
  const progress = routine
    ? getRoutineViewProgress(routine, session?.completedSetIds)
    : null;

  const handleResetSession = () => {
    if (!routine || !window.confirm('¿Reiniciar el progreso de la sesión actual?')) return;
    resetSession(routine.id);
  };

  const handleConfirmFinish = () => {
    if (!routine) return;
    const now = Date.now();
    const startTime = session?.startTime || now;
    const summary: WorkoutCompletionSummary = {
      routineId: routine.id,
      routineName: routine.name || 'Rutina de entrenamiento',
      startTime,
      endTime: now,
      durationSeconds: Math.max(0, Math.floor((now - startTime) / 1000)),
      completedSetsCount: progress?.completedSetsCount ?? 0,
      totalSetsCount: progress?.totalSetsCount ?? 0,
      completionPercentage: progress?.completionPercentage ?? 0,
      exercisesSummary: routine.exercises.map((exercise) => ({
        name: exercise.name,
        completedSets: exercise.sets.filter((set) =>
          progress?.completedSetIds.has(set.id),
        ).length,
        totalSets: exercise.sets.length,
        summaryText: formatExerciseSummary(exercise.sets),
        sets: exercise.sets,
      })),
    };
    finishSession(summary);
  };

  return {
    routine,
    session,
    completedSetsCount: progress?.completedSetsCount ?? 0,
    totalSetsCount: progress?.totalSetsCount ?? 0,
    completionPercentage: progress?.completionPercentage ?? 0,
    onStartSession: () => routine && startSession(routine.id),
    onResetSession: handleResetSession,
    onConfirmFinish: handleConfirmFinish,
  };
}
