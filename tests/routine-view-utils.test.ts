import { describe, expect, it } from 'vitest';
import type { Routine } from '../src/types';
import { findActiveRoutineExerciseId, getRoutineViewProgress } from '../src/utils/routineView';

const routine: Routine = {
  id: 'routine',
  name: 'Rutina',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  exercises: [
    {
      id: 'press',
      name: 'Press de Banca',
      sets: [
        { id: 'press-1', setNumber: 1, reps: 8, weight: 60, restSeconds: 90 },
        { id: 'press-2', setNumber: 2, reps: 8, weight: 60, restSeconds: 90 },
      ],
    },
    {
      id: 'row',
      name: 'Remo con Barra',
      sets: [{ id: 'row-1', setNumber: 1, reps: 10, weight: 45, restSeconds: 75 }],
    },
  ],
};

describe('routineView calculations', () => {
  it('calculates partial progress and handles empty routines', () => {
    expect(getRoutineViewProgress(routine, ['press-1'])).toEqual({
      completedSetIds: new Set(['press-1']),
      totalSetsCount: 3,
      completedSetsCount: 1,
      allExercisesCompleted: false,
      completionPercentage: 33,
    });
    expect(getRoutineViewProgress({ ...routine, exercises: [] })).toEqual({
      completedSetIds: new Set(),
      totalSetsCount: 0,
      completedSetsCount: 0,
      allExercisesCompleted: false,
      completionPercentage: 0,
    });
  });

  it('selects the rest-timer exercise before the session progression', () => {
    expect(findActiveRoutineExerciseId(
      routine,
      { routineId: routine.id, startTime: 1, completedSetIds: ['press-1'] },
      {
        routineId: routine.id,
        initialSeconds: 60,
        targetEndTime: 1000,
        exerciseName: '  REMO CON BARRA ',
      },
    )).toBe('row');
  });

  it('keeps the last-touched incomplete exercise active, then advances to the next incomplete one', () => {
    expect(findActiveRoutineExerciseId(routine, {
      routineId: routine.id,
      startTime: 1,
      completedSetIds: ['press-1'],
    })).toBe('press');
    expect(findActiveRoutineExerciseId(routine, {
      routineId: routine.id,
      startTime: 1,
      completedSetIds: ['press-1', 'press-2'],
    })).toBe('row');
  });

  it('falls back to the first exercise when all sets are complete and to empty for no exercises', () => {
    expect(findActiveRoutineExerciseId(routine, {
      routineId: routine.id,
      startTime: 1,
      completedSetIds: ['press-1', 'press-2', 'row-1'],
    })).toBe('press');
    expect(findActiveRoutineExerciseId({ ...routine, exercises: [] })).toBe('');
  });
});
