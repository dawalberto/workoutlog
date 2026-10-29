import { describe, expect, it } from 'vitest';
import type { ExerciseDefinition, ExerciseRmLog, RmRecord } from '../../src/types';
import {
  addRmRecordToLogs,
  createRmLog,
  createRmRecord,
  deleteRmRecordFromLogs,
  editRmRecordInLogs,
  filterRmLogs,
  getAvailableRmCatalog,
  sortRmRecordsByDate,
  updateRmLogsForCatalogExercise,
} from '../../src/utils/rmLogs';

const exercise: ExerciseDefinition = {
  id: 'exercise-press',
  name: 'Press de Banca',
  category: 'Pecho',
};

const newestRecord: RmRecord = {
  id: 'record-newest',
  weight: 85,
  date: '2026-06-10',
};

const olderRecord: RmRecord = {
  id: 'record-older',
  weight: 80,
  date: '2026-05-10',
  notes: 'RPE 9',
};

const log: ExerciseRmLog = {
  id: 'rm-log-press',
  exerciseId: exercise.id,
  exerciseName: exercise.name,
  category: exercise.category,
  records: [newestRecord, olderRecord],
  createdAt: '2026-05-10T12:00:00.000Z',
  updatedAt: '2026-06-10T12:00:00.000Z',
};

describe('RM log transformations', () => {
  it('creates records and logs with the supplied values', () => {
    const record = createRmRecord('record-initial', 60, '2026-06-01', 'First mark');

    expect(record).toEqual({
      id: 'record-initial',
      weight: 60,
      date: '2026-06-01',
      notes: 'First mark',
    });
    expect(createRmLog(exercise, record, 'log-initial', 'created', 'updated')).toEqual({
      id: 'log-initial',
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      records: [record],
      createdAt: 'created',
      updatedAt: 'updated',
    });
  });

  it('sorts records by descending date without mutating the input', () => {
    const records = [olderRecord, newestRecord];

    expect(sortRmRecordsByDate(records)).toEqual([newestRecord, olderRecord]);
    expect(records).toEqual([olderRecord, newestRecord]);
  });

  it('adds a record and sorts the updated history by date', () => {
    const insertedRecord = createRmRecord('record-middle', 82, '2026-05-20');

    expect(addRmRecordToLogs([log], log.id, insertedRecord, 'now')[0]).toEqual({
      ...log,
      records: [newestRecord, insertedRecord, olderRecord],
      updatedAt: 'now',
    });
  });

  it('edits a record, preserves its ID and re-sorts history', () => {
    expect(editRmRecordInLogs(
      [log],
      log.id,
      olderRecord.id,
      90,
      '2026-07-10',
      'New note',
      'now',
    )[0]).toEqual({
      ...log,
      records: [
        { ...olderRecord, weight: 90, date: '2026-07-10', notes: 'New note' },
        newestRecord,
      ],
      updatedAt: 'now',
    });
  });

  it('deletes a record and updates the containing log timestamp', () => {
    expect(deleteRmRecordFromLogs([log], log.id, olderRecord.id, 'now')[0]).toEqual({
      ...log,
      records: [newestRecord],
      updatedAt: 'now',
    });
  });

  it('filters RM logs by normalized exercise name or category', () => {
    const rowLog = {
      ...log,
      id: 'rm-log-row',
      exerciseId: 'exercise-row',
      exerciseName: 'Remo con Barra',
      category: 'Espalda',
    };

    expect(filterRmLogs([log, rowLog], '  REMO  ')).toEqual([rowLog]);
    expect(filterRmLogs([log, rowLog], 'espalda')).toEqual([rowLog]);
    expect(filterRmLogs([log, rowLog], '')).toEqual([log, rowLog]);
  });

  it('matches any group in a multi-group RM log', () => {
    const multiLog = {
      ...log,
      id: 'rm-log-multi',
      exerciseId: 'exercise-plank',
      exerciseName: 'Plancha',
      category: 'Core',
      categories: ['Core', 'Piernas'],
    };

    expect(filterRmLogs([multiLog], 'piernas')).toEqual([multiLog]);
    expect(filterRmLogs([multiLog], 'core')).toEqual([multiLog]);
    expect(filterRmLogs([multiLog], 'pecho')).toEqual([]);
  });

  it('propagates multiple groups from a catalog edit into the RM log', () => {
    const updatedDefinition: ExerciseDefinition = {
      id: 'exercise-press',
      name: 'Press de Banca',
      category: 'Core',
      categories: ['Core', 'Piernas'],
    };

    const { rmLogs, updatedLogsCount } = updateRmLogsForCatalogExercise(
      [log],
      updatedDefinition,
    );

    expect(updatedLogsCount).toBe(1);
    expect(rmLogs[0]).toMatchObject({ categories: ['Core', 'Piernas'] });
  });

  it('excludes tracked names and tracked definition IDs from catalog choices', () => {
    const trackedByName = { ...exercise, name: 'Press de Banca' };
    const trackedById = { id: 'exercise-press', name: 'Banca Inclinada', category: 'Pecho' };
    const available = { ...exercise, id: 'exercise-row', name: 'Remo con Barra', category: 'Espalda' };

    expect(getAvailableRmCatalog([trackedByName, trackedById, available], [log], '')).toEqual([available]);
  });

  it('updates matching RM log when catalog exercise is renamed', () => {
    const renamedExercise: ExerciseDefinition = {
      id: 'exercise-press',
      name: 'Press Plano Barra',
      category: 'Pectoral',
    };

    const { rmLogs, updatedLogsCount } = updateRmLogsForCatalogExercise(
      [log],
      renamedExercise,
      'Press de Banca',
    );

    expect(updatedLogsCount).toBe(1);
    expect(rmLogs[0]).toMatchObject({
      id: log.id,
      exerciseId: 'exercise-press',
      exerciseName: 'Press Plano Barra',
      category: 'Pectoral',
      records: log.records,
    });
  });

  it('merges duplicate RM logs when both old and new names exist', () => {
    const oldLog: ExerciseRmLog = {
      ...log,
      id: 'rm-log-old',
      exerciseName: 'push-up',
      records: [{ id: 'rec-1', weight: 20, date: '2026-01-01' }],
    };
    const newLog: ExerciseRmLog = {
      ...log,
      id: 'rm-log-new',
      exerciseName: 'PushUp',
      records: [{ id: 'rec-2', weight: 25, date: '2026-02-01' }],
    };

    const updatedDef: ExerciseDefinition = {
      id: oldLog.exerciseId!,
      name: 'PushUp',
      category: 'Calistenia',
    };

    const { rmLogs, updatedLogsCount } = updateRmLogsForCatalogExercise(
      [oldLog, newLog],
      updatedDef,
      'push-up',
    );

    expect(updatedLogsCount).toBe(2);
    expect(rmLogs).toHaveLength(1);
    expect(rmLogs[0].exerciseName).toBe('PushUp');
    expect(rmLogs[0].records).toHaveLength(2);
    expect(rmLogs[0].records[0].weight).toBe(25);
    expect(rmLogs[0].records[1].weight).toBe(20);
  });
});

