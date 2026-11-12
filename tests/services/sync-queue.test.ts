import { describe, expect, it } from 'vitest';
import {
  applyRemoteSyncChange,
  diffSyncCollection,
  orderSyncOperations,
  optionalSyncReference,
  type SyncPushChange,
  type SyncTable,
} from '../../src/services/sync-queue';

interface TestOperation {
  sequence: number;
  operationId: string;
  recordId: string;
  change: SyncPushChange;
}

function operation(
  sequence: number,
  table: SyncTable,
  id: string,
  operationType: 'upsert' | 'delete',
  record: Record<string, unknown>,
): TestOperation {
  return {
    sequence,
    operationId: `operation-${sequence}`,
    recordId: id,
    change: {
      table,
      operation: operationType,
      baseRevision: '0',
      record,
    },
  };
}

describe('sync queue ordering', () => {
  it('round-trips timing and completed duration snapshots through sync', () => {
    const timings = { exercise: { startedAt: 1000, completedAt: 5000, configuration: 'cfg', restSeconds: 60 } };
    const session = { routineId: 'routine', startTime: 1000, completedSetIds: [], exerciseTimings: timings };
    expect(diffSyncCollection('activeSessions', undefined, { routine: session }).find((item) => item.table === 'active_workout_sessions')?.record.exercise_timings).toEqual(timings);
    const pulledSession = applyRemoteSyncChange({}, { table: 'active_workout_sessions', id: 'routine', revision: '1', deletedAt: null, record: { routine_id: 'routine', started_at: '1970-01-01T00:00:01Z', exercise_timings: timings } }) as Record<string, typeof session>;
    expect(pulledSession.routine.exerciseTimings).toEqual(timings);
    const measurement = { exerciseId: 'exercise', configuration: 'cfg', durationSeconds: 64 };
    const history = { id: 'history', routineId: 'routine', routineName: 'Rutina', startTime: 0, endTime: 1000, completedAt: '1970-01-01T00:00:01Z', durationSeconds: 1, completedSetsCount: 1, totalSetsCount: 1, completionPercentage: 100, exercisesSummary: [{ name: 'Press', completedSets: 1, totalSets: 1, durationMeasurement: measurement }] };
    expect(diffSyncCollection('workoutHistory', undefined, [history]).find((item) => item.table === 'workout_history_exercises')?.record.duration_measurement).toEqual(measurement);
    const pulled = applyRemoteSyncChange([{ ...history, exercisesSummary: [] }], { table: 'workout_history_exercises', id: '["history",0]', revision: '1', deletedAt: null, record: { history_id: 'history', position: 0, exercise_name: 'Press', sets_completed: 1, sets_total: 1, duration_measurement: measurement } }) as typeof history[];
    expect(pulled[0].exercisesSummary[0].durationMeasurement).toEqual(measurement);
  });

  it('syncs optional history snapshots in both directions', () => {
    const history = { id: 'history', routineId: 'routine', routineName: 'Rutina', startTime: 0, endTime: 1,
      completedAt: '1970-01-01T00:00:01.000Z', durationSeconds: 1, completedSetsCount: 0,
      totalSetsCount: 1, completionPercentage: 0, exercisesSummary: [{ name: 'Press', completedSets: 0, totalSets: 1, isOptional: true }] };
    const changes = diffSyncCollection('workoutHistory', undefined, [history]);
    expect(changes.find((item) => item.table === 'workout_history_exercises')?.record.is_optional).toBe(true);
    const pulled = applyRemoteSyncChange([{ ...history, exercisesSummary: [] }], {
      table: 'workout_history_exercises', id: '["history",0]', revision: '1', deletedAt: null,
      record: { history_id: 'history', position: 0, exercise_name: 'Press', sets_completed: 0, sets_total: 1, is_optional: true },
    }) as typeof history[];
    expect(pulled[0].exercisesSummary[0].isOptional).toBe(true);
  });

  it('syncs optional exercise choices in both directions', () => {
    const routine = { id: 'routine', name: 'Rutina', createdAt: '', updatedAt: '', exercises: [
      { id: 'exercise', name: 'Press', isOptional: true, sets: [] },
    ] };
    const changes = diffSyncCollection('routines', undefined, [routine]);
    expect(changes.find((item) => item.table === 'routine_exercises')?.record.is_optional).toBe(true);
    const pulled = applyRemoteSyncChange([{ ...routine, exercises: [] }], {
      table: 'routine_exercises', id: 'exercise', revision: '1', deletedAt: null,
      record: { id: 'exercise', routine_id: 'routine', name: 'Press', position: 0, is_optional: true },
    }) as typeof routine[];
    expect(pulled[0].exercises[0].isOptional).toBe(true);
  });

  it('drops a remote history exercise when its parent history is missing', () => {
    const record = {
      history_id: 'missing-history',
      position: 0,
      exercise_name: 'Sentadilla',
      sets_completed: 3,
      sets_total: 3,
    };

    expect(() =>
      applyRemoteSyncChange([], {
        table: 'workout_history_exercises',
        id: JSON.stringify(['missing-history', 0]),
        revision: '1',
        deletedAt: null,
        record,
      }),
    ).not.toThrow();
    expect(
      applyRemoteSyncChange([], {
        table: 'workout_history_exercises',
        id: JSON.stringify(['missing-history', 0]),
        revision: '1',
        deletedAt: null,
        record,
      }),
    ).toEqual([]);
  });

  it('drops other nested child upserts when their required parents are missing', () => {
    const change = (
      table: SyncTable,
      id: string,
      record: Record<string, unknown>,
    ) => ({
      table,
      id,
      revision: '1',
      deletedAt: null,
      record,
    });

    expect(
      applyRemoteSyncChange(
        [],
        change('routine_exercises', 'exercise', {
          id: 'exercise',
          routine_id: 'missing-routine',
        }),
      ),
    ).toEqual([]);
    expect(
      applyRemoteSyncChange(
        [],
        change('workout_sets', 'set', {
          id: 'set',
          routine_id: 'missing-routine',
          routine_exercise_id: 'missing-exercise',
        }),
      ),
    ).toEqual([]);
    expect(
      applyRemoteSyncChange(
        {},
        change('active_session_completed_sets', 'completion', {
          routine_id: 'missing-routine',
          set_id: 'missing-set',
        }),
      ),
    ).toEqual({});
    expect(
      applyRemoteSyncChange(
        [],
        change('rm_records', 'record', { id: 'record', log_id: 'missing-log' }),
      ),
    ).toEqual([]);
    expect(
      applyRemoteSyncChange(
        [],
        change('exercise_diary_entries', 'entry', {
          id: 'entry',
          diary_id: 'missing-diary',
        }),
      ),
    ).toEqual([]);
  });

  it.each(['routine_exercises', 'rm_logs', 'exercise_diaries', 'workout_history'] as const)(
    'identifies only the optional snapshot reference for %s',
    (table) => {
      const column = table === 'workout_history' ? 'routine_id' : 'definition_id';
      const change: SyncPushChange = { table, operation: 'upsert', baseRevision: '0', record: { [column]: 'parent' } };
      expect(optionalSyncReference(change)).toEqual({
        column, parentTable: table === 'workout_history' ? 'routines' : 'exercise_definitions', parentId: 'parent',
      });
      expect(optionalSyncReference({ ...change, operation: 'delete' })).toBeNull();
      expect(optionalSyncReference({ ...change, record: { [column]: null } })).toBeNull();
    },
  );
  it('does not normalize required parents as optional references', () => {
    expect(optionalSyncReference({ table: 'active_workout_sessions', operation: 'upsert', baseRevision: '0', record: { routine_id: 'missing' } })).toBeNull();
  });
  it('moves pending parent upserts before children across the foreign-key graph', () => {
    const queued = [
      operation(0, 'active_session_completed_sets', 'completion', 'upsert', {
        routine_id: 'routine',
        set_id: 'set',
      }),
      operation(1, 'workout_sets', 'set', 'upsert', {
        id: 'set',
        routine_id: 'routine',
        routine_exercise_id: 'routine-exercise',
      }),
      operation(2, 'routine_exercises', 'routine-exercise', 'upsert', {
        id: 'routine-exercise',
        routine_id: 'routine',
        definition_id: 'definition',
      }),
      operation(3, 'active_workout_sessions', 'routine', 'upsert', {
        routine_id: 'routine',
      }),
      operation(4, 'routines', 'routine', 'upsert', { id: 'routine' }),
      operation(5, 'exercise_definitions', 'definition', 'upsert', {
        id: 'definition',
      }),
      operation(6, 'rm_records', 'rm-record', 'upsert', { id: 'rm-record', log_id: 'rm-log' }),
      operation(7, 'rm_logs', 'rm-log', 'upsert', {
        id: 'rm-log',
        definition_id: 'definition',
      }),
      operation(8, 'workout_history_exercises', 'history-exercise', 'upsert', {
        history_id: 'history',
        position: 0,
      }),
      operation(9, 'workout_history', 'history', 'upsert', {
        id: 'history',
        routine_id: 'routine',
      }),
      operation(10, 'exercise_diary_entries', 'diary-entry', 'upsert', {
        id: 'diary-entry',
        diary_id: 'diary',
      }),
      operation(11, 'exercise_diaries', 'diary', 'upsert', {
        id: 'diary',
        definition_id: 'definition',
      }),
    ];

    const ordered = orderSyncOperations(queued);
    const position = (table: SyncTable, id: string) =>
      ordered.findIndex(
        (item) => item.change.table === table && item.recordId === id,
      );

    expect(position('routines', 'routine')).toBeLessThan(
      position('routine_exercises', 'routine-exercise'),
    );
    expect(position('exercise_definitions', 'definition')).toBeLessThan(
      position('routine_exercises', 'routine-exercise'),
    );
    expect(position('routine_exercises', 'routine-exercise')).toBeLessThan(
      position('workout_sets', 'set'),
    );
    expect(position('routines', 'routine')).toBeLessThan(
      position('active_workout_sessions', 'routine'),
    );
    expect(position('active_workout_sessions', 'routine')).toBeLessThan(
      position('active_session_completed_sets', 'completion'),
    );
    expect(position('workout_sets', 'set')).toBeLessThan(
      position('active_session_completed_sets', 'completion'),
    );
    expect(position('rm_logs', 'rm-log')).toBeLessThan(
      position('rm_records', 'rm-record'),
    );
    expect(position('workout_history', 'history')).toBeLessThan(
      position('workout_history_exercises', 'history-exercise'),
    );
    expect(position('exercise_diaries', 'diary')).toBeLessThan(
      position('exercise_diary_entries', 'diary-entry'),
    );
  });

  it('orders child deletes before their parents but leaves ON DELETE SET NULL pairs stable', () => {
    const queued = [
      operation(0, 'routines', 'routine', 'delete', { id: 'routine' }),
      operation(1, 'routine_exercises', 'routine-exercise', 'delete', {
        id: 'routine-exercise',
      }),
      operation(2, 'workout_sets', 'set', 'delete', { id: 'set' }),
      operation(3, 'active_workout_sessions', 'routine', 'delete', {
        routine_id: 'routine',
      }),
      operation(4, 'active_session_completed_sets', 'completion', 'delete', {
        routine_id: 'routine',
        set_id: 'set',
      }),
      operation(5, 'rm_logs', 'rm-log', 'delete', { id: 'rm-log' }),
      operation(6, 'rm_records', 'rm-record', 'delete', { id: 'rm-record' }),
      operation(7, 'workout_history', 'history', 'delete', { id: 'history' }),
      operation(8, 'workout_history_exercises', 'history-exercise', 'delete', {
        history_id: 'history',
        position: 0,
      }),
      operation(9, 'exercise_diaries', 'diary', 'delete', { id: 'diary' }),
      operation(10, 'exercise_diary_entries', 'diary-entry', 'delete', {
        id: 'diary-entry',
      }),
    ];
    const ordered = orderSyncOperations(queued);
    const position = (table: SyncTable, id: string) =>
      ordered.findIndex(
        (item) => item.change.table === table && item.recordId === id,
      );

    expect(position('workout_sets', 'set')).toBeLessThan(
      position('routine_exercises', 'routine-exercise'),
    );
    expect(position('routine_exercises', 'routine-exercise')).toBeLessThan(
      position('routines', 'routine'),
    );
    expect(position('active_session_completed_sets', 'completion')).toBeLessThan(
      position('active_workout_sessions', 'routine'),
    );
    expect(position('active_session_completed_sets', 'completion')).toBeLessThan(
      position('workout_sets', 'set'),
    );
    expect(position('active_workout_sessions', 'routine')).toBeLessThan(
      position('routines', 'routine'),
    );
    expect(position('rm_records', 'rm-record')).toBeLessThan(
      position('rm_logs', 'rm-log'),
    );
    expect(position('workout_history_exercises', 'history-exercise')).toBeLessThan(
      position('workout_history', 'history'),
    );
    expect(position('exercise_diary_entries', 'diary-entry')).toBeLessThan(
      position('exercise_diaries', 'diary'),
    );

    const setNullDefinitionDeletes = [
      operation(0, 'exercise_definitions', 'definition', 'delete', {
        id: 'definition',
      }),
      operation(1, 'routine_exercises', 'routine-exercise', 'delete', {
        id: 'routine-exercise',
      }),
      operation(2, 'rm_logs', 'rm-log', 'delete', { id: 'rm-log' }),
      operation(3, 'exercise_diaries', 'diary', 'delete', { id: 'diary' }),
    ];
    expect(orderSyncOperations(setNullDefinitionDeletes)).toEqual(
      setNullDefinitionDeletes,
    );

    const setNullRoutineDelete = [
      operation(0, 'routines', 'routine', 'delete', { id: 'routine' }),
      operation(1, 'workout_history', 'history', 'delete', { id: 'history' }),
    ];
    expect(orderSyncOperations(setNullRoutineDelete)).toEqual(setNullRoutineDelete);
  });

  it('preserves same-record upsert/delete order and unrelated FIFO order', () => {
    const sameRecord = [
      operation(0, 'routine_exercises', 'routine-exercise', 'delete', {
        id: 'routine-exercise',
      }),
      operation(1, 'routines', 'routine', 'delete', { id: 'routine' }),
      operation(2, 'routine_exercises', 'routine-exercise', 'upsert', {
        id: 'routine-exercise',
        routine_id: 'routine',
        definition_id: 'definition',
      }),
      operation(3, 'exercise_definitions', 'definition', 'upsert', {
        id: 'definition',
      }),
      operation(4, 'routines', 'routine', 'upsert', { id: 'routine' }),
    ];
    const orderedSameRecord = orderSyncOperations(sameRecord);

    for (const [table, id] of [
      ['routine_exercises', 'routine-exercise'],
      ['routines', 'routine'],
    ] as const) {
      expect(
        orderedSameRecord
          .filter((item) => item.change.table === table && item.recordId === id)
          .map((item) => item.operationId),
      ).toEqual(
        sameRecord
          .filter((item) => item.change.table === table && item.recordId === id)
          .map((item) => item.operationId),
      );
    }

    const unrelated = [
      operation(5, 'rm_logs', 'rm-log', 'upsert', { id: 'rm-log' }),
      operation(6, 'workout_history', 'history', 'upsert', { id: 'history' }),
      operation(7, 'exercise_diaries', 'diary', 'upsert', { id: 'diary' }),
    ];
    expect(orderSyncOperations(unrelated)).toEqual(unrelated);
  });
});

describe('exercise muscle groups in the sync payload', () => {
  it('sends the full category list and derives it from the primary value', () => {
    const changes = diffSyncCollection('catalog', undefined, [
      { id: 'definition-multi', name: 'Plancha', category: 'Core', categories: ['Core', 'Piernas'] },
      { id: 'definition-legacy', name: 'Press', category: 'Pecho' },
    ]);

    const byId = new Map(changes.map((change) => [change.id, change.record]));
    expect(byId.get('definition-multi')).toMatchObject({
      categories: ['Core', 'Piernas'],
      category: 'Core',
    });
    expect(byId.get('definition-legacy')).toMatchObject({ categories: ['Pecho'] });
  });

  it('applies a remote multi-group array', () => {
    const result = applyRemoteSyncChange([], {
      table: 'exercise_definitions',
      id: 'definition-multi',
      revision: '1',
      deletedAt: null,
      record: { id: 'definition-multi', name: 'Plancha', category: 'Core', categories: ['Core', 'Piernas'] },
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'definition-multi',
        category: 'Core',
        categories: ['Core', 'Piernas'],
      }),
    ]);
  });

  it('derives the group list from legacy records that only carry a category', () => {
    const result = applyRemoteSyncChange([], {
      table: 'rm_logs',
      id: 'rm-legacy',
      revision: '1',
      deletedAt: null,
      record: { id: 'rm-legacy', exercise_name: 'Press', category: 'Pecho' },
    });

    expect(result).toEqual([
      expect.objectContaining({ id: 'rm-legacy', category: 'Pecho', categories: ['Pecho'] }),
    ]);
  });

  it('clears groups when the remote record sends an empty list without a category', () => {
    const current = [
      { id: 'diary-multi', exerciseName: 'Plancha', category: 'Core', categories: ['Core', 'Piernas'], entries: [] },
    ];

    const result = applyRemoteSyncChange(current, {
      table: 'exercise_diaries',
      id: 'diary-multi',
      revision: '2',
      deletedAt: null,
      record: { id: 'diary-multi', exercise_name: 'Plancha', category: null, categories: [] },
    }) as Array<Record<string, unknown>>;

    expect(result[0]).toMatchObject({ id: 'diary-multi' });
    expect(result[0].categories).toBeUndefined();
  });
});

describe('sync queue RM record metric', () => {
  const baseLog = [
    {
      id: 'rm-log-comba',
      exerciseName: 'Comba',
      records: [] as Array<Record<string, unknown>>,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];

  it('applies the reps metric from a remote rm_records change', () => {
    const result = applyRemoteSyncChange(baseLog, {
      table: 'rm_records',
      id: 'record-reps',
      revision: '2',
      deletedAt: null,
      record: {
        id: 'record-reps',
        log_id: 'rm-log-comba',
        weight: 120,
        metric: 'reps',
        recorded_on: '2026-10-31',
      },
    }) as Array<{ records: Array<Record<string, unknown>> }>;

    expect(result[0].records[0]).toMatchObject({ weight: 120, metric: 'reps' });
  });

  it('defaults a legacy null metric to weight', () => {
    const result = applyRemoteSyncChange(baseLog, {
      table: 'rm_records',
      id: 'record-legacy',
      revision: '2',
      deletedAt: null,
      record: {
        id: 'record-legacy',
        log_id: 'rm-log-comba',
        weight: 80,
        metric: null,
        recorded_on: '2026-10-30',
      },
    }) as Array<{ records: Array<Record<string, unknown>> }>;

    expect(result[0].records[0]).toMatchObject({ weight: 80, metric: 'weight' });
  });

  it('sends the metric in the push payload and defaults legacy weight records', () => {
    const changes = diffSyncCollection('rmLogs', undefined, [
      {
        id: 'rm-log-comba',
        exerciseName: 'Comba',
        records: [
          { id: 'record-reps', weight: 120, metric: 'reps', date: '2026-10-31' },
          { id: 'record-legacy', weight: 80, date: '2026-10-30' },
        ],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ]);

    const byId = new Map(changes.map((change) => [change.id, change.record]));
    expect(byId.get('record-reps')).toMatchObject({ metric: 'reps', weight: 120 });
    expect(byId.get('record-legacy')).toMatchObject({ metric: 'weight', weight: 80 });
  });
});
