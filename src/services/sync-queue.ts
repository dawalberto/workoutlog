import type {
  ActiveWorkoutSession,
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutHistoryLog,
} from '../types';

export type SyncTable =
  | 'exercise_definitions'
  | 'routines'
  | 'routine_exercises'
  | 'workout_sets'
  | 'active_workout_sessions'
  | 'active_session_completed_sets'
  | 'rm_logs'
  | 'rm_records'
  | 'workout_history'
  | 'workout_history_exercises'
  | 'exercise_diaries'
  | 'exercise_diary_entries';

export type SyncCollection =
  | 'routines'
  | 'catalog'
  | 'activeSessions'
  | 'rmLogs'
  | 'workoutHistory'
  | 'exerciseDiary';

export interface SyncChange {
  table: SyncTable;
  id: string;
  operation: 'upsert' | 'delete';
  record: Record<string, unknown>;
}

export interface SyncPushChange {
  table: SyncTable;
  operation: 'upsert' | 'delete';
  baseRevision: string;
  record: Record<string, unknown>;
}

export interface SyncQueueEntry {
  sequence: number;
  request: {
    operationId: string;
    changes: [SyncPushChange];
  };
}

interface SyncRecord {
  table: SyncTable;
  id: string;
  record: Record<string, unknown>;
}

const deleteOrder: Record<SyncTable, number> = {
  workout_sets: 0,
  routine_exercises: 1,
  routines: 2,
  active_session_completed_sets: 3,
  active_workout_sessions: 4,
  rm_records: 5,
  rm_logs: 6,
  workout_history_exercises: 7,
  workout_history: 8,
  exercise_diary_entries: 9,
  exercise_diaries: 10,
  exercise_definitions: 11,
};

const identityColumns: Record<SyncTable, string[]> = {
  exercise_definitions: ['id'],
  routines: ['id'],
  routine_exercises: ['id'],
  workout_sets: ['id'],
  active_workout_sessions: ['routine_id'],
  active_session_completed_sets: ['routine_id', 'set_id'],
  rm_logs: ['id'],
  rm_records: ['id'],
  workout_history: ['id'],
  workout_history_exercises: ['history_id', 'position'],
  exercise_diaries: ['id'],
  exercise_diary_entries: ['id'],
};

export function getSyncCollection(key: string): SyncCollection | null {
  switch (key) {
    case 'workout_planner_catalog_v2':
      return 'catalog';
    case 'workout_planner_routines_v2':
      return 'routines';
    case 'workout_active_sessions_v1':
      return 'activeSessions';
    case 'workout_planner_rm_logs_v1':
      return 'rmLogs';
    case 'workout_planner_history_v1':
      return 'workoutHistory';
    case 'workout_planner_diary_v1':
      return 'exerciseDiary';
    default:
      return null;
  }
}

export function diffSyncCollection(
  collection: SyncCollection,
  previousValue: unknown,
  nextValue: unknown,
): SyncChange[] {
  const previous = new Map(
    flattenSyncCollection(collection, previousValue).map((item) => [
      JSON.stringify([item.table, item.id]),
      item,
    ]),
  );
  const next = new Map(
    flattenSyncCollection(collection, nextValue).map((item) => [
      JSON.stringify([item.table, item.id]),
      item,
    ]),
  );
  const changes: SyncChange[] = [];
  const removed: SyncChange[] = [];

  for (const [key, item] of next) {
    const previousItem = previous.get(key);
    if (previousItem && stableSerialize(previousItem.record) === stableSerialize(item.record)) {
      continue;
    }
    changes.push({
      table: item.table,
      id: item.id,
      operation: 'upsert',
      record: item.record,
    });
  }

  for (const [key, item] of previous) {
    if (next.has(key)) continue;
    removed.push({
      table: item.table,
      id: item.id,
      operation: 'delete',
      record: identityRecord(item.table, item.record),
    });
  }

  removed.sort((left, right) => deleteOrder[left.table] - deleteOrder[right.table]);
  return [...changes, ...removed];
}

function flattenSyncCollection(collection: SyncCollection, value: unknown): SyncRecord[] {
  switch (collection) {
    case 'catalog':
      return flattenCatalog(value);
    case 'routines':
      return flattenRoutines(value);
    case 'activeSessions':
      return flattenActiveSessions(value);
    case 'rmLogs':
      return flattenRmLogs(value);
    case 'workoutHistory':
      return flattenWorkoutHistory(value);
    case 'exerciseDiary':
      return flattenExerciseDiary(value);
  }
}

function flattenCatalog(value: unknown): SyncRecord[] {
  return arrayOf<ExerciseDefinition>(value).flatMap((definition) => {
    const record = compactRecord({
      id: definition.id,
      name: definition.name,
      category: definition.category,
      image_url: definition.imageUrl,
      video_url: definition.videoUrl,
      notes: definition.notes,
      default_sets: definition.defaultSetsCount,
      default_reps: definition.defaultReps,
      default_weight: definition.defaultWeight,
      default_rest_seconds: definition.defaultRestSeconds,
      created_at: definition.createdAt,
    });
    return asSyncRecord('exercise_definitions', definition.id, record);
  });
}

function flattenRoutines(value: unknown): SyncRecord[] {
  const records: SyncRecord[] = [];
  for (const routine of arrayOf<Routine>(value)) {
    records.push(
      ...asSyncRecord(
        'routines',
        routine.id,
        compactRecord({
          id: routine.id,
          name: routine.name,
          notes: routine.notes,
          created_at: routine.createdAt,
          updated_at: routine.updatedAt,
        }),
      ),
    );

    routine.exercises.forEach((exercise, exercisePosition) => {
      records.push(
        ...asSyncRecord(
          'routine_exercises',
          exercise.id,
          compactRecord({
            id: exercise.id,
            routine_id: routine.id,
            definition_id: exercise.definitionId,
            name: exercise.name,
            category: exercise.category,
            notes: exercise.notes,
            image_url: exercise.imageUrl,
            video_url: exercise.videoUrl,
            position: exercisePosition,
          }),
        ),
      );

      exercise.sets.forEach((set, setPosition) => {
        records.push(
          ...asSyncRecord(
            'workout_sets',
            set.id,
            compactRecord({
              id: set.id,
              routine_id: routine.id,
              routine_exercise_id: exercise.id,
              position: setPosition,
              reps: set.reps,
              weight: set.weight,
              rest_seconds: set.restSeconds,
            }),
          ),
        );
      });
    });
  }
  return records;
}

function flattenActiveSessions(value: unknown): SyncRecord[] {
  const records: SyncRecord[] = [];
  if (!isRecord(value)) return records;

  for (const [routineKey, rawSession] of Object.entries(value)) {
    if (!isRecord(rawSession)) continue;
    const session = rawSession as unknown as ActiveWorkoutSession;
    const routineId = session.routineId || routineKey;
    records.push(
      ...asSyncRecord(
        'active_workout_sessions',
        routineId,
        compactRecord({
          routine_id: routineId,
          started_at: toIsoString(session.startTime),
        }),
      ),
    );

    for (const setId of Array.isArray(session.completedSetIds) ? session.completedSetIds : []) {
      const id = JSON.stringify([routineId, setId]);
      records.push(
        ...asSyncRecord(
          'active_session_completed_sets',
          id,
          compactRecord({
            routine_id: routineId,
            set_id: setId,
          }),
        ),
      );
    }
  }
  return records;
}

function flattenRmLogs(value: unknown): SyncRecord[] {
  const records: SyncRecord[] = [];
  for (const log of arrayOf<ExerciseRmLog>(value)) {
    records.push(
      ...asSyncRecord(
        'rm_logs',
        log.id,
        compactRecord({
          id: log.id,
          definition_id: log.exerciseId,
          exercise_name: log.exerciseName,
          category: log.category,
          created_at: log.createdAt,
          updated_at: log.updatedAt,
        }),
      ),
    );

    for (const item of log.records) {
      records.push(
        ...asSyncRecord(
          'rm_records',
          item.id,
          compactRecord({
            id: item.id,
            log_id: log.id,
            weight: item.weight,
            recorded_on: item.date,
            notes: item.notes,
          }),
        ),
      );
    }
  }
  return records;
}

function flattenWorkoutHistory(value: unknown): SyncRecord[] {
  const records: SyncRecord[] = [];
  for (const history of arrayOf<WorkoutHistoryLog>(value)) {
    records.push(
      ...asSyncRecord(
        'workout_history',
        history.id,
        compactRecord({
          id: history.id,
          routine_id: history.routineId,
          routine_name: history.routineName,
          started_at: toIsoString(history.startTime),
          completed_at: history.completedAt || toIsoString(history.endTime),
          duration_seconds: history.durationSeconds,
          exercises_completed: history.exercisesSummary.filter(
            (exercise) => exercise.completedSets > 0,
          ).length,
          sets_completed: history.completedSetsCount,
          created_at: history.completedAt,
          updated_at: history.completedAt,
        }),
      ),
    );

    history.exercisesSummary.forEach((exercise, position) => {
      const id = JSON.stringify([history.id, position]);
      records.push(
        ...asSyncRecord(
          'workout_history_exercises',
          id,
          compactRecord({
            history_id: history.id,
            position,
            exercise_name: exercise.name,
            exercises_completed: exercise.completedSets > 0 ? 1 : 0,
            sets_completed: exercise.completedSets,
          }),
        ),
      );
    });
  }
  return records;
}

function flattenExerciseDiary(value: unknown): SyncRecord[] {
  const records: SyncRecord[] = [];
  for (const diary of arrayOf<ExerciseDiary>(value)) {
    records.push(
      ...asSyncRecord(
        'exercise_diaries',
        diary.id,
        compactRecord({
          id: diary.id,
          definition_id: diary.exerciseId,
          exercise_name: diary.exerciseName,
          category: diary.category,
          created_at: diary.createdAt,
          updated_at: diary.updatedAt,
        }),
      ),
    );

    for (const entry of diary.entries) {
      records.push(
        ...asSyncRecord(
          'exercise_diary_entries',
          entry.id,
          compactRecord({
            id: entry.id,
            diary_id: diary.id,
            recorded_on: entry.date,
            note: entry.note,
            feeling: entry.feeling,
            created_at: entry.createdAt,
            updated_at: entry.updatedAt,
          }),
        ),
      );
    }
  }
  return records;
}

function asSyncRecord(
  table: SyncTable,
  id: string,
  record: Record<string, unknown>,
): SyncRecord[] {
  if (typeof id !== 'string' || id.length === 0) return [];
  return [{ table, id, record }];
}

function identityRecord(table: SyncTable, record: Record<string, unknown>) {
  return Object.fromEntries(identityColumns[table].map((column) => [column, record[column]]));
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toIsoString(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? String(value);
}
