import { describe, expect, it } from 'vitest';
import { parseImportedData } from '../../src/utils/backup';

describe('parseImportedData workout history metrics', () => {
  it('preserves missing legacy history metrics as unknown', () => {
    const imported = parseImportedData(JSON.stringify({
      workoutHistory: [{
        id: 'workout-log-1',
        routineId: 'routine-1',
        routineName: 'Strength',
        startTime: 1_000,
        endTime: 2_000,
        completedAt: '1970-01-01T00:00:02.000Z',
        durationSeconds: 1,
        completedSetsCount: 0,
        exercisesSummary: [{
          name: 'Squat',
          completedSets: 0,
        }],
      }],
    }));

    expect(imported.workoutHistory[0]).toMatchObject({
      totalSetsCount: null,
      completionPercentage: null,
      exercisesSummary: [{
        name: 'Squat',
        totalSets: null,
      }],
    });
  });

  it('preserves explicit zero history metrics', () => {
    const imported = parseImportedData(JSON.stringify({
      workoutHistory: [{
        routineName: 'Strength',
        totalSetsCount: 0,
        completionPercentage: 0,
        exercisesSummary: [{
          name: 'Squat',
          totalSets: 0,
        }],
      }],
    }));

    expect(imported.workoutHistory[0]).toMatchObject({
      totalSetsCount: 0,
      completionPercentage: 0,
      exercisesSummary: [{
        name: 'Squat',
        totalSets: 0,
      }],
    });
  });

  it('preserves nonzero history metrics exactly', () => {
    const imported = parseImportedData(JSON.stringify({
      workoutHistory: [{
        routineName: 'Strength',
        totalSetsCount: 12,
        completionPercentage: 75.5,
        exercisesSummary: [{
          name: 'Squat',
          totalSets: 4,
        }],
      }],
    }));

    expect(imported.workoutHistory[0]).toMatchObject({
      totalSetsCount: 12,
      completionPercentage: 75.5,
      exercisesSummary: [{
        name: 'Squat',
        totalSets: 4,
      }],
    });
  });
});

describe('parseImportedData muscle groups', () => {
  it('reads an explicit categories array', () => {
    const imported = parseImportedData(JSON.stringify({
      catalog: [{
        id: 'def-plank',
        name: 'Plancha',
        category: 'Core',
        categories: ['Core', 'Piernas'],
      }],
    }));

    expect(imported.catalog[0]).toMatchObject({
      category: 'Core',
      categories: ['Core', 'Piernas'],
    });
  });

  it('keeps legacy records without a categories array', () => {
    const imported = parseImportedData(JSON.stringify({
      catalog: [{ id: 'def-press', name: 'Press', category: 'Pecho' }],
      routines: [{
        id: 'routine-1',
        name: 'Fuerza',
        exercises: [{ id: 'ex-1', name: 'Press', category: 'Pecho' }],
      }],
    }));

    expect(imported.catalog[0]).toMatchObject({ category: 'Pecho' });
    expect(imported.catalog[0].categories).toBeUndefined();
    expect(imported.routines[0].exercises[0]).toMatchObject({ category: 'Pecho' });
    expect(imported.routines[0].exercises[0].categories).toBeUndefined();
  });
});

describe('normalizeExerciseTitle', () => {
  it('normalizes accents, spaces, and casing', async () => {
    const { normalizeExerciseTitle } = await import('../../src/utils/backup');
    expect(normalizeExerciseTitle('  Press de Banca Plana  ')).toBe('press de banca plana');
    expect(normalizeExerciseTitle('Extensión Cuádriceps')).toBe('extension cuadriceps');
  });

  it('safely returns an empty string for non-string inputs', async () => {
    const { normalizeExerciseTitle } = await import('../../src/utils/backup');
    expect(normalizeExerciseTitle(undefined as unknown as string)).toBe('');
    expect(normalizeExerciseTitle(null as unknown as string)).toBe('');
    expect(normalizeExerciseTitle({} as unknown as string)).toBe('');
    expect(normalizeExerciseTitle(123 as unknown as string)).toBe('');
    expect(normalizeExerciseTitle(true as unknown as string)).toBe('');
    expect(normalizeExerciseTitle(() => {})).toBe('');
  });
});

