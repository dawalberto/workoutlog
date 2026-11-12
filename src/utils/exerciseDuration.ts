import type { ActiveWorkoutSession, Exercise, WorkoutHistoryLog } from '../types';

function normalizedValue(value: number | string): number | string {
  if (typeof value === 'string' && !value.trim()) return '';
  const number = Number(value);
  return Number.isFinite(number) ? number : String(value).trim();
}

/** A configuration ignores set IDs and rest, but preserves the order of weights and reps. */
export function exerciseDurationConfiguration(exercise: Exercise): string {
  return JSON.stringify(exercise.sets.map(({ reps, weight }) => [normalizedValue(reps), normalizedValue(weight)]));
}

export interface ExerciseDurationMeasurement {
  routineId: string;
  exerciseId: string;
  configuration: string;
  durationSeconds: number;
}

/** Return an average only when at least three complete executions match. */
export function averageExerciseDuration(
  routineId: string,
  exercise: Exercise,
  measurements: readonly ExerciseDurationMeasurement[],
): number | null {
  const configuration = exerciseDurationConfiguration(exercise);
  const matches = measurements.filter((item) =>
    item.routineId === routineId && item.exerciseId === exercise.id &&
    item.configuration === configuration && Number.isFinite(item.durationSeconds) && item.durationSeconds >= 0,
  );
  if (matches.length < 3) return null;
  return matches.reduce((total, item) => total + item.durationSeconds, 0) / matches.length;
}

export function measurementsFromHistory(history: readonly WorkoutHistoryLog[]): ExerciseDurationMeasurement[] {
  return history.flatMap((log) => log.exercisesSummary.flatMap((exercise) =>
    exercise.durationMeasurement ? [{ routineId: log.routineId, ...exercise.durationMeasurement }] : [],
  ));
}

export function completedExerciseMeasurement(exercise: Exercise, session: ActiveWorkoutSession | undefined): WorkoutHistoryLog['exercisesSummary'][number]['durationMeasurement'] {
  const timing = session?.exerciseTimings?.[exercise.id];
  if (!timing || timing.completedAt === undefined || !exercise.sets.length ||
      !exercise.sets.every((set) => session.completedSetIds.includes(set.id)) ||
      timing.configuration !== exerciseDurationConfiguration(exercise)) return undefined;
  return { exerciseId: exercise.id, configuration: timing.configuration,
    durationSeconds: Math.max(0, (timing.completedAt - timing.startedAt) / 1000) + (timing.restSeconds ?? 0) };
}
