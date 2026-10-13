import type { Database } from '../types/database.types';

export const SYNC_CONTRACT_VERSION = 1;

export type SyncCollection =
  | 'routines'
  | 'catalog'
  | 'activeSessions'
  | 'rmLogs'
  | 'workoutHistory'
  | 'exerciseDiary';

export type SyncStorageKey =
  | 'workout_planner_routines_v2'
  | 'workout_planner_catalog_v2'
  | 'workout_active_sessions_v1'
  | 'workout_planner_rm_logs_v1'
  | 'workout_planner_history_v1'
  | 'workout_planner_diary_v1';

type PublicTables = Database['public']['Tables'];

type SyncTableDefinition = {
  [T in keyof PublicTables]: {
    name: T;
    writableColumns: readonly (keyof PublicTables[T]['Row'])[];
    identity: readonly (keyof PublicTables[T]['Row'])[];
    collection: SyncCollection;
    storageKey: SyncStorageKey;
  };
}[keyof PublicTables];

export const SYNC_CONTRACT_TABLES = [
  {
    name: 'exercise_definitions',
    writableColumns: [
      'id', 'name', 'category', 'image_url', 'video_url', 'notes', 'default_sets',
      'default_reps', 'default_weight', 'default_rest_seconds', 'created_at', 'updated_at',
    ],
    identity: ['id'],
    collection: 'catalog',
    storageKey: 'workout_planner_catalog_v2',
  },
  {
    name: 'routines',
    writableColumns: ['id', 'name', 'notes', 'created_at', 'updated_at'],
    identity: ['id'],
    collection: 'routines',
    storageKey: 'workout_planner_routines_v2',
  },
  {
    name: 'routine_exercises',
    writableColumns: [
      'id', 'routine_id', 'definition_id', 'name', 'category', 'notes', 'image_url',
      'video_url', 'position', 'created_at', 'updated_at',
    ],
    identity: ['id'],
    collection: 'routines',
    storageKey: 'workout_planner_routines_v2',
  },
  {
    name: 'workout_sets',
    writableColumns: [
      'id', 'routine_id', 'routine_exercise_id', 'position', 'reps', 'weight',
      'rest_seconds', 'created_at', 'updated_at',
    ],
    identity: ['id'],
    collection: 'routines',
    storageKey: 'workout_planner_routines_v2',
  },
  {
    name: 'active_workout_sessions',
    writableColumns: ['routine_id', 'started_at', 'created_at', 'updated_at'],
    identity: ['routine_id'],
    collection: 'activeSessions',
    storageKey: 'workout_active_sessions_v1',
  },
  {
    name: 'active_session_completed_sets',
    writableColumns: ['routine_id', 'set_id', 'created_at', 'updated_at'],
    identity: ['routine_id', 'set_id'],
    collection: 'activeSessions',
    storageKey: 'workout_active_sessions_v1',
  },
  {
    name: 'rm_logs',
    writableColumns: [
      'id', 'definition_id', 'exercise_name', 'category', 'created_at', 'updated_at',
    ],
    identity: ['id'],
    collection: 'rmLogs',
    storageKey: 'workout_planner_rm_logs_v1',
  },
  {
    name: 'rm_records',
    writableColumns: [
      'id', 'log_id', 'weight', 'recorded_on', 'notes', 'created_at', 'updated_at',
    ],
    identity: ['id'],
    collection: 'rmLogs',
    storageKey: 'workout_planner_rm_logs_v1',
  },
  {
    name: 'workout_history',
    writableColumns: [
      'id', 'routine_id', 'routine_name', 'started_at', 'completed_at',
      'duration_seconds', 'exercises_completed', 'sets_completed', 'total_sets_count',
      'completion_percentage', 'created_at', 'updated_at',
    ],
    identity: ['id'],
    collection: 'workoutHistory',
    storageKey: 'workout_planner_history_v1',
  },
  {
    name: 'workout_history_exercises',
    writableColumns: [
      'history_id', 'position', 'exercise_name', 'exercises_completed',
      'sets_completed', 'sets_total', 'created_at', 'updated_at',
    ],
    identity: ['history_id', 'position'],
    collection: 'workoutHistory',
    storageKey: 'workout_planner_history_v1',
  },
  {
    name: 'exercise_diaries',
    writableColumns: [
      'id', 'definition_id', 'exercise_name', 'category', 'created_at', 'updated_at',
    ],
    identity: ['id'],
    collection: 'exerciseDiary',
    storageKey: 'workout_planner_diary_v1',
  },
  {
    name: 'exercise_diary_entries',
    writableColumns: [
      'id', 'diary_id', 'recorded_on', 'note', 'feeling', 'created_at', 'updated_at',
    ],
    identity: ['id'],
    collection: 'exerciseDiary',
    storageKey: 'workout_planner_diary_v1',
  },
] as const satisfies readonly SyncTableDefinition[];

export type SyncTable = (typeof SYNC_CONTRACT_TABLES)[number]['name'];

export const SYNC_TABLES: readonly SyncTable[] = SYNC_CONTRACT_TABLES.map(
  ({ name }) => name,
);

export interface SyncForeignKey {
  parentTable: SyncTable;
  childTable: SyncTable;
  parentColumns: readonly string[];
  childColumns: readonly string[];
  deleteChildFirst: boolean;
}

export const SYNC_FOREIGN_KEYS: readonly SyncForeignKey[] = [
  {
    parentTable: 'routines',
    childTable: 'routine_exercises',
    parentColumns: ['id'],
    childColumns: ['routine_id'],
    deleteChildFirst: true,
  },
  {
    parentTable: 'exercise_definitions',
    childTable: 'routine_exercises',
    parentColumns: ['id'],
    childColumns: ['definition_id'],
    deleteChildFirst: false,
  },
  {
    parentTable: 'routine_exercises',
    childTable: 'workout_sets',
    parentColumns: ['routine_id', 'id'],
    childColumns: ['routine_id', 'routine_exercise_id'],
    deleteChildFirst: true,
  },
  {
    parentTable: 'routines',
    childTable: 'active_workout_sessions',
    parentColumns: ['id'],
    childColumns: ['routine_id'],
    deleteChildFirst: true,
  },
  {
    parentTable: 'active_workout_sessions',
    childTable: 'active_session_completed_sets',
    parentColumns: ['routine_id'],
    childColumns: ['routine_id'],
    deleteChildFirst: true,
  },
  {
    parentTable: 'workout_sets',
    childTable: 'active_session_completed_sets',
    parentColumns: ['routine_id', 'id'],
    childColumns: ['routine_id', 'set_id'],
    deleteChildFirst: true,
  },
  {
    parentTable: 'exercise_definitions',
    childTable: 'rm_logs',
    parentColumns: ['id'],
    childColumns: ['definition_id'],
    deleteChildFirst: false,
  },
  {
    parentTable: 'rm_logs',
    childTable: 'rm_records',
    parentColumns: ['id'],
    childColumns: ['log_id'],
    deleteChildFirst: true,
  },
  {
    parentTable: 'routines',
    childTable: 'workout_history',
    parentColumns: ['id'],
    childColumns: ['routine_id'],
    deleteChildFirst: false,
  },
  {
    parentTable: 'workout_history',
    childTable: 'workout_history_exercises',
    parentColumns: ['id'],
    childColumns: ['history_id'],
    deleteChildFirst: true,
  },
  {
    parentTable: 'exercise_definitions',
    childTable: 'exercise_diaries',
    parentColumns: ['id'],
    childColumns: ['definition_id'],
    deleteChildFirst: false,
  },
  {
    parentTable: 'exercise_diaries',
    childTable: 'exercise_diary_entries',
    parentColumns: ['id'],
    childColumns: ['diary_id'],
    deleteChildFirst: true,
  },
];

export function getSyncContractSnapshot(): {
  version: number;
  tables: Array<{
    name: SyncTable;
    writableColumns: string[];
    identity: string[];
  }>;
} {
  return {
    version: SYNC_CONTRACT_VERSION,
    tables: SYNC_CONTRACT_TABLES.map(({ name, writableColumns, identity }) => ({
      name,
      writableColumns: [...writableColumns],
      identity: [...identity],
    })),
  };
}
