import { describe, expect, it } from 'vitest';
import type { Routine } from '../../src/types';
import { getRoutineViewProgress } from '../../src/utils/routineView';

const routine: Routine = {
  id: 'routine', name: 'Rutina', createdAt: '', updatedAt: '',
  exercises: ['a', 'b', 'c'].map((id) => ({
    id, name: id, isOptional: id === 'c',
    sets: [{ id: `set-${id}`, setNumber: 1, reps: 10, weight: 0, restSeconds: 60 }],
  })),
};

describe('optional exercise progress', () => {
  it('reaches 100% after completing only required exercises', () => {
    expect(getRoutineViewProgress(routine, ['set-a', 'set-b'])).toMatchObject({
      totalSetsCount: 2, completedSetsCount: 2, completionPercentage: 100, allExercisesCompleted: true,
    });
  });

  it('keeps optional completions for exercise display without counting them', () => {
    const result = getRoutineViewProgress(routine, ['set-a', 'set-c']);
    expect(result).toMatchObject({ totalSetsCount: 2, completedSetsCount: 1, completionPercentage: 50 });
    expect(result.completedSetIds.has('set-c')).toBe(true);
  });

  it('keeps zero progress when there are no required sets', () => {
    const result = getRoutineViewProgress({ ...routine, exercises: [routine.exercises[2]] }, ['set-c']);
    expect(result).toMatchObject({ totalSetsCount: 0, completedSetsCount: 0, completionPercentage: 0, allExercisesCompleted: false });
  });
});
