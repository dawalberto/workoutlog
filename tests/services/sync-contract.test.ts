import { describe, expect, it } from 'vitest';
import {
  getSyncContractSnapshot,
  SYNC_CONTRACT_TABLES,
  SYNC_CONTRACT_VERSION,
  SYNC_FOREIGN_KEYS,
} from '../../src/sync/contract';

const expectedTables = [
  {
    name: 'exercise_definitions',
    writableColumns: [
      'id', 'name', 'category', 'image_url', 'video_url', 'notes', 'default_sets',
      'default_reps', 'default_weight', 'default_rest_seconds', 'created_at', 'updated_at',
    ],
    identity: ['id'],
  },
  {
    name: 'routines',
    writableColumns: ['id', 'name', 'notes', 'created_at', 'updated_at'],
    identity: ['id'],
  },
  {
    name: 'routine_exercises',
    writableColumns: [
      'id', 'routine_id', 'definition_id', 'name', 'category', 'notes', 'image_url',
      'video_url', 'position', 'created_at', 'updated_at',
    ],
    identity: ['id'],
  },
  {
    name: 'workout_sets',
    writableColumns: [
      'id', 'routine_id', 'routine_exercise_id', 'position', 'reps', 'weight',
      'rest_seconds', 'created_at', 'updated_at',
    ],
    identity: ['id'],
  },
  {
    name: 'active_workout_sessions',
    writableColumns: ['routine_id', 'started_at', 'created_at', 'updated_at'],
    identity: ['routine_id'],
  },
  {
    name: 'active_session_completed_sets',
    writableColumns: ['routine_id', 'set_id', 'created_at', 'updated_at'],
    identity: ['routine_id', 'set_id'],
  },
  {
    name: 'rm_logs',
    writableColumns: [
      'id', 'definition_id', 'exercise_name', 'category', 'created_at', 'updated_at',
    ],
    identity: ['id'],
  },
  {
    name: 'rm_records',
    writableColumns: [
      'id', 'log_id', 'weight', 'recorded_on', 'notes', 'created_at', 'updated_at',
    ],
    identity: ['id'],
  },
  {
    name: 'workout_history',
    writableColumns: [
      'id', 'routine_id', 'routine_name', 'started_at', 'completed_at',
      'duration_seconds', 'exercises_completed', 'sets_completed', 'total_sets_count',
      'completion_percentage', 'created_at', 'updated_at',
    ],
    identity: ['id'],
  },
  {
    name: 'workout_history_exercises',
    writableColumns: [
      'history_id', 'position', 'exercise_name', 'exercises_completed',
      'sets_completed', 'sets_total', 'created_at', 'updated_at',
    ],
    identity: ['history_id', 'position'],
  },
  {
    name: 'exercise_diaries',
    writableColumns: [
      'id', 'definition_id', 'exercise_name', 'category', 'created_at', 'updated_at',
    ],
    identity: ['id'],
  },
  {
    name: 'exercise_diary_entries',
    writableColumns: [
      'id', 'diary_id', 'recorded_on', 'note', 'feeling', 'created_at', 'updated_at',
    ],
    identity: ['id'],
  },
] as const;

describe('sync contract', () => {
  it('lists all twelve tables in pull order with the exact writable columns and identities', () => {
    expect(SYNC_CONTRACT_VERSION).toBe(1);
    expect(
      SYNC_CONTRACT_TABLES.map(({ name, writableColumns, identity }) => ({
        name,
        writableColumns: [...writableColumns],
        identity: [...identity],
      })),
    ).toEqual(expectedTables);
  });

  it('orders every foreign-key parent before its child for pull and upsert', () => {
    const tablePosition = new Map(
      SYNC_CONTRACT_TABLES.map(({ name }, index) => [name, index]),
    );

    for (const edge of SYNC_FOREIGN_KEYS) {
      expect(tablePosition.get(edge.parentTable)).toBeLessThan(
        tablePosition.get(edge.childTable)!,
      );
    }
  });

  it('exports a JSON-serializable SQL parity snapshot', () => {
    const snapshot = getSyncContractSnapshot();

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual({
      version: 1,
      tables: expectedTables,
    });
  });
});
