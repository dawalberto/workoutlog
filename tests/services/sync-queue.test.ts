import { describe, expect, it } from 'vitest';
import {
  orderSyncOperations,
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
