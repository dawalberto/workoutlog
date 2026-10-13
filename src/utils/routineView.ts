import type {
  ActiveRestTimer,
  ActiveWorkoutSession,
  Routine,
} from '../types';

export interface RoutineViewProgress {
  completedSetIds: Set<string>;
  totalSetsCount: number;
  completedSetsCount: number;
  allExercisesCompleted: boolean;
  completionPercentage: number;
}

export function getRoutineViewProgress(
  routine: Routine,
  sessionCompletedSetIds: string[] = [],
): RoutineViewProgress {
  const completedSetIds = new Set(sessionCompletedSetIds);
  const totalSetsCount = routine.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const completedSetsCount = routine.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => completedSetIds.has(set.id)).length,
    0,
  );

  return {
    completedSetIds,
    totalSetsCount,
    completedSetsCount,
    allExercisesCompleted: totalSetsCount > 0 && completedSetsCount === totalSetsCount,
    completionPercentage: totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0,
  };
}

export function findActiveRoutineExerciseId(
  routine: Routine,
  session?: ActiveWorkoutSession | null,
  activeRestTimer?: ActiveRestTimer | null,
): string {
  if (routine.exercises.length === 0) return '';

  if (activeRestTimer?.routineId === routine.id && activeRestTimer.exerciseName) {
    const match = routine.exercises.find(
      (exercise) => exercise.name.trim().toLowerCase() === activeRestTimer.exerciseName?.trim().toLowerCase(),
    );
    if (match) return match.id;
  }

  if (session?.completedSetIds && session.completedSetIds.length > 0) {
    const completedSetIdSet = new Set(session.completedSetIds);
    for (let index = session.completedSetIds.length - 1; index >= 0; index--) {
      const setId = session.completedSetIds[index];
      const exercise = routine.exercises.find((item) => item.sets.some((set) => set.id === setId));
      if (exercise) {
        const isComplete = exercise.sets.every((set) => completedSetIdSet.has(set.id));
        if (!isComplete) return exercise.id;
      }
    }

    const nextIncomplete = routine.exercises.find(
      (exercise) => !exercise.sets.every((set) => completedSetIdSet.has(set.id)),
    );
    if (nextIncomplete) return nextIncomplete.id;
  }

  const completedSetIdSet = new Set(session?.completedSetIds || []);
  const firstIncomplete = routine.exercises.find(
    (exercise) => !exercise.sets.every((set) => completedSetIdSet.has(set.id)),
  );
  return firstIncomplete ? firstIncomplete.id : routine.exercises[0]?.id || '';
}
