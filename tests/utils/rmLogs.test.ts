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

  it('excludes tracked names from catalog choices before applying search', () => {
    const tracked = { ...exercise, name: 'Press de Banca' };
    const available = { ...exercise, id: 'exercise-row', name: 'Remo con Barra', category: 'Espalda' };

    expect(getAvailableRmCatalog([tracked, available], [log], 'ESPALDA')).toEqual([available]);
    expect(getAvailableRmCatalog([tracked, available], [log], '')).toEqual([available]);
  });
});
