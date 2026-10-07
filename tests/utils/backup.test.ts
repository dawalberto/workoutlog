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
