import { describe, expect, it } from 'vitest';
import { buildImportSummaryMessage } from '../../src/utils/backup';
import type { BackupImportSummary } from '../../src/utils/backup';

const emptyData = {
  catalog: [],
  routines: [],
  rmLogs: [],
  workoutHistory: [],
  exerciseDiary: [],
};

describe('buildImportSummaryMessage', () => {
  it('reports overwritten collection totals and diary note count', () => {
    expect(buildImportSummaryMessage({
      exercisesAdded: 1,
      exercisesReplaced: 0,
      routinesAdded: 1,
      mode: 'overwrite',
    }, {
      ...emptyData,
      catalog: [{ id: 'exercise-1', name: 'Sentadilla' }],
      routines: [{ id: 'routine-1', name: 'Piernas', exercises: [], createdAt: '', updatedAt: '' }],
      rmLogs: [{
        id: 'rm-1',
        exerciseName: 'Sentadilla',
        records: [],
        createdAt: '',
        updatedAt: '',
      }],
      workoutHistory: [{
        id: 'history-1',
        routineId: 'routine-1',
        routineName: 'Piernas',
        startTime: 1,
        endTime: 2,
        durationSeconds: 1,
        completedSetsCount: 0,
        totalSetsCount: 0,
        completionPercentage: 0,
        exercisesSummary: [],
        completedAt: '',
      }],
      exerciseDiary: [{
        id: 'diary-1',
        exerciseName: 'Sentadilla',
        entries: [
          { id: 'entry-1', date: '2026-10-13', note: 'Nota' },
          { id: 'entry-2', date: '2026-10-14', note: 'Otra nota' },
        ],
        createdAt: '',
        updatedAt: '',
      }],
    })).toBe(
      'Copia restaurada: 1 ejercicios, 1 rutinas, 1 RMs, 1 sesiones y 2 notas de diario.',
    );
  });

  it('reports each positive merge counter in its established order', () => {
    const summary: BackupImportSummary = {
      exercisesAdded: 1,
      exercisesReplaced: 2,
      routinesAdded: 3,
      exercisesInRoutinesUpdated: 4,
      rmLogsAdded: 5,
      rmLogsUpdated: 6,
      historyAdded: 7,
      diaryAdded: 8,
      diaryUpdated: 9,
      mode: 'merge',
    };

    expect(buildImportSummaryMessage(summary, emptyData)).toBe(
      'Importación completada: 1 ejerc. añadidos, 2 ejerc. actualizados, 4 en rutinas, 3 rutinas añadidas, 5 RMs añadidos, 6 RMs actualizados, 7 sesiones añadidas, 8 entradas diario añadidas, 9 entradas diario actualizadas.',
    );
  });

  it('uses the existing empty-merge fallback when every counter is zero', () => {
    expect(buildImportSummaryMessage({
      exercisesAdded: 0,
      exercisesReplaced: 0,
      routinesAdded: 0,
      exercisesInRoutinesUpdated: 0,
      rmLogsAdded: 0,
      rmLogsUpdated: 0,
      historyAdded: 0,
      diaryAdded: 0,
      diaryUpdated: 0,
      mode: 'merge',
    }, emptyData)).toBe('Datos combinados con éxito.');
  });
});
