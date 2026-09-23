import { Exercise, Routine, WorkoutSet } from '../types';

/**
 * Calculates estimated active work time in seconds for a set based on repetitions.
 * Assuming average 4 seconds per rep (2s eccentric, 1s pause/concentric).
 */
export function getSetActiveTimeSeconds(reps: number | string): number {
  const num = Number(reps) || 0;
  if (num <= 0) return 20;
  return Math.max(15, num * 4);
}

/**
 * Calculates estimated total duration for a single set including rest time.
 */
export function getSetTotalSeconds(set: WorkoutSet): number {
  const activeTime = getSetActiveTimeSeconds(set.reps);
  const restTime = Number(set.restSeconds) || 0;
  return activeTime + restTime;
}

/**
 * Calculates estimated total duration for an exercise including all its sets and rests.
 */
export function getExerciseTotalSeconds(exercise: Exercise): number {
  if (!exercise.sets || exercise.sets.length === 0) return 0;
  return exercise.sets.reduce((sum, set) => sum + getSetTotalSeconds(set), 0);
}

/**
 * Calculates estimated total duration for the entire routine in seconds.
 * Includes a modest 60s transition buffer between different exercises.
 */
export function getRoutineTotalSeconds(routine: Routine): number {
  if (!routine.exercises || routine.exercises.length === 0) return 0;
  
  const exercisesTotal = routine.exercises.reduce((sum, ex) => sum + getExerciseTotalSeconds(ex), 0);
  const transitionTime = Math.max(0, (routine.exercises.length - 1) * 60);
  return exercisesTotal + transitionTime;
}

/**
 * Formats a duration in seconds into a friendly human-readable format.
 * Examples: "45s", "1m 30s", "48 min", "1h 15m"
 */
export function formatSecondsToTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0s';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    if (seconds === 0) return `${minutes} min`;
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Formats seconds into clock style MM:SS (e.g. for rest timers).
 */
export function formatStopwatch(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
