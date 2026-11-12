import { describe, expect, it } from 'vitest';
import type { Exercise } from '../../src/types';
import { averageExerciseDuration, completedExerciseMeasurement, exerciseDurationConfiguration } from '../../src/utils/exerciseDuration';

const exercise: Exercise = {
  id: 'exercise-1', name: 'Sentadilla', sets: [
    { id: 'set-1', setNumber: 1, reps: 10, weight: 40, restSeconds: 60 },
    { id: 'set-2', setNumber: 2, reps: 8, weight: 45, restSeconds: 90 },
  ],
};
const measurement = (durationSeconds: number) => ({
  routineId: 'routine-1', exerciseId: exercise.id,
  configuration: exerciseDurationConfiguration(exercise), durationSeconds,
});

describe('exercise duration cohorts', () => {
  it('requires three matching complete measurements and averages all matches', () => {
    expect(averageExerciseDuration('routine-1', exercise, [measurement(60), measurement(90)])).toBeNull();
    expect(averageExerciseDuration('routine-1', exercise, [measurement(60), measurement(90), measurement(120), measurement(130)])).toBe(100);
  });

  it('isolates routine, exercise, set count, weights and repetitions', () => {
    const records = [measurement(60), measurement(90), measurement(120)];
    expect(averageExerciseDuration('routine-2', exercise, records)).toBeNull();
    expect(averageExerciseDuration('routine-1', { ...exercise, id: 'other' }, records)).toBeNull();
    expect(averageExerciseDuration('routine-1', { ...exercise, sets: exercise.sets.slice(0, 1) }, records)).toBeNull();
    expect(averageExerciseDuration('routine-1', { ...exercise, sets: [{ ...exercise.sets[0], reps: 9 }, exercise.sets[1]] }, records)).toBeNull();
    expect(averageExerciseDuration('routine-1', { ...exercise, sets: [{ ...exercise.sets[0], weight: 41 }, exercise.sets[1]] }, records)).toBeNull();
    expect(averageExerciseDuration('routine-1', exercise, records)).toBe(90);
  });

  it('does not collapse distinct nonnumeric values', () => {
    const range = { ...exercise, sets: [{ ...exercise.sets[0], reps: '8-10' }] };
    const other = { ...range, sets: [{ ...range.sets[0], reps: '10-12' }] };
    expect(exerciseDurationConfiguration(range)).not.toBe(exerciseDurationConfiguration(other));
  });

  it('normalizes numeric inputs and does not separate configurations by rest or IDs', () => {
    const changed = { ...exercise, sets: exercise.sets.map((set) => ({ ...set, id: set.id + '-new', reps: String(set.reps), weight: String(set.weight), restSeconds: 10 })) };
    expect(exerciseDurationConfiguration(changed)).toBe(exerciseDurationConfiguration(exercise));
  });
});

describe('completed exercise measurements', () => {
  it('counts only complete matching executions and adds the final rest', () => {
    const session = { routineId: 'routine-1', startTime: 0, completedSetIds: ['set-1', 'set-2'], exerciseTimings: {
      'exercise-1': { startedAt: 1000, completedAt: 61000, restSeconds: 90, configuration: exerciseDurationConfiguration(exercise) },
    } };
    expect(completedExerciseMeasurement(exercise, session)?.durationSeconds).toBe(150);
    expect(completedExerciseMeasurement(exercise, { ...session, completedSetIds: ['set-1'] })).toBeUndefined();
    expect(completedExerciseMeasurement({ ...exercise, sets: exercise.sets.slice(0, 1) }, session)).toBeUndefined();
    expect(completedExerciseMeasurement(exercise, undefined)).toBeUndefined();
  });
});
