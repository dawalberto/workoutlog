import type {
  ActiveWorkoutSession,
  DiaryFeeling,
  Exercise,
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseDiaryEntry,
  ExerciseRmLog,
  RmRecord,
  Routine,
  WorkoutSet,
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

export interface SyncRemoteChange {
  table: SyncTable;
  id: string;
  revision: string;
  deletedAt: string | null;
  record: Record<string, unknown>;
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
    const historyRecord = compactRecord({
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
      total_sets_count: history.totalSetsCount ?? null,
      completion_percentage: history.completionPercentage ?? null,
      created_at: history.completedAt,
      updated_at: history.completedAt,
    });
    validateWorkoutHistoryRecord('workout_history', history.id, historyRecord);
    records.push(
      ...asSyncRecord(
        'workout_history',
        history.id,
        historyRecord,
      ),
    );

    history.exercisesSummary.forEach((exercise, index) => {
      const position = exercise.position ?? index;
      const id = JSON.stringify([history.id, position]);
      const record = compactRecord({
        history_id: history.id,
        position,
        exercise_name: exercise.name,
        exercises_completed: exercise.completedSets > 0 ? 1 : 0,
        sets_completed: exercise.completedSets,
        sets_total: exercise.totalSets ?? null,
      });
      validateWorkoutHistoryRecord(
        'workout_history_exercises',
        id,
        record,
      );
      records.push(
        ...asSyncRecord(
          'workout_history_exercises',
          id,
          record,
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

export function syncRecordId(
  table: SyncTable,
  record: Record<string, unknown>,
): string {
  const identity = identityColumns[table].map((column) => record[column]);
  if (identity.some((value) => value === null || value === undefined)) {
    throw new Error('Sync record identity is incomplete.');
  }
  return identity.length === 1 ? String(identity[0]) : JSON.stringify(identity);
}

export function validateWorkoutHistoryRecord(
  table: SyncTable,
  id: string,
  record: Record<string, unknown>,
  validateMetrics = true,
): void {
  if (table === 'workout_history') {
    if (requiredStringValue(record, 'id') !== id) {
      throw new TypeError('Workout history record ID does not match its sync ID.');
    }
    if (!validateMetrics) return;
    requiredNonNegativeIntegerValue(record, 'sets_completed');
    requiredNullableNonNegativeIntegerValue(record, 'total_sets_count');
    requiredNullablePercentageValue(record, 'completion_percentage');
  } else if (table === 'workout_history_exercises') {
    requiredStringValue(record, 'history_id');
    requiredNonNegativeIntegerValue(record, 'position');
    requiredStringValue(record, 'exercise_name');
    if (syncRecordId(table, record) !== id) {
      throw new TypeError('Workout history exercise ID does not match its sync ID.');
    }
    if (!validateMetrics) return;
    requiredNonNegativeIntegerValue(record, 'sets_completed');
    requiredNullableNonNegativeIntegerValue(record, 'sets_total');
  }
}

export function applyRemoteSyncChange(
  value: unknown,
  change: SyncRemoteChange,
): unknown {
  const record = change.record;
  const deleted = change.deletedAt !== null;
  if (
    change.table === 'workout_history' ||
    change.table === 'workout_history_exercises'
  ) {
    validateWorkoutHistoryRecord(
      change.table,
      change.id,
      record,
      !deleted,
    );
  }

  switch (change.table) {
    case 'exercise_definitions': {
      const items = arrayOf<ExerciseDefinition>(value);
      if (deleted) return items.filter((item) => item.id !== change.id);
      const current = items.find((item) => item.id === change.id);
      const definition: ExerciseDefinition = {
        id: change.id,
        name: stringValue(record, 'name', current?.name ?? ''),
        category: nullableString(record, 'category', current?.category),
        imageUrl: nullableString(record, 'image_url', current?.imageUrl),
        videoUrl: nullableString(record, 'video_url', current?.videoUrl),
        notes: nullableString(record, 'notes', current?.notes),
        defaultSetsCount: optionalNumber(record, 'default_sets', current?.defaultSetsCount),
        defaultReps: optionalNumber(record, 'default_reps', current?.defaultReps),
        defaultWeight: optionalNumber(record, 'default_weight', current?.defaultWeight),
        defaultRestSeconds: optionalNumber(
          record,
          'default_rest_seconds',
          current?.defaultRestSeconds,
        ),
        createdAt: nullableString(record, 'created_at', current?.createdAt),
      };
      return replaceById(items, change.id, definition);
    }
    case 'routines':
      return applyRoutineChange(value, change);
    case 'routine_exercises':
      return applyRoutineExerciseChange(value, change);
    case 'workout_sets':
      return applyWorkoutSetChange(value, change);
    case 'active_workout_sessions':
      return applyActiveSessionChange(value, change);
    case 'active_session_completed_sets':
      return applyCompletedSetChange(value, change);
    case 'rm_logs':
      return applyRmLogChange(value, change);
    case 'rm_records':
      return applyRmRecordChange(value, change);
    case 'workout_history':
      return applyWorkoutHistoryChange(value, change);
    case 'workout_history_exercises':
      return applyWorkoutHistoryExerciseChange(value, change);
    case 'exercise_diaries':
      return applyExerciseDiaryChange(value, change);
    case 'exercise_diary_entries':
      return applyExerciseDiaryEntryChange(value, change);
  }
}

function applyRoutineChange(value: unknown, change: SyncRemoteChange): Routine[] {
  const routines = arrayOf<Routine>(value);
  if (change.deletedAt !== null) {
    return routines.filter((routine) => routine.id !== change.id);
  }
  const current = routines.find((routine) => routine.id === change.id);
  const routine: Routine = {
    id: change.id,
    name: stringValue(change.record, 'name', current?.name ?? ''),
    notes: nullableString(change.record, 'notes', current?.notes),
    createdAt: stringValue(
      change.record,
      'created_at',
      current?.createdAt ?? '1970-01-01T00:00:00.000Z',
    ),
    updatedAt: stringValue(
      change.record,
      'updated_at',
      current?.updatedAt ?? '1970-01-01T00:00:00.000Z',
    ),
    exercises: current?.exercises ?? [],
  };
  return replaceById(routines, change.id, routine);
}

function applyRoutineExerciseChange(value: unknown, change: SyncRemoteChange): Routine[] {
  const routines = arrayOf<Routine>(value);
  const routineId = stringValue(change.record, 'routine_id', '');
  if (change.deletedAt !== null && !routines.some((routine) => routine.id === routineId)) {
    return routines;
  }
  const exerciseId = stringValue(change.record, 'id', change.id);
  const position = integerValue(change.record, 'position', 0);
  return updateRoutine(routines, routineId, (routine) => {
    const current = routine.exercises.find((exercise) => exercise.id === exerciseId);
    if (change.deletedAt !== null) {
      return {
        ...routine,
        exercises: routine.exercises.filter((exercise) => exercise.id !== exerciseId),
      };
    }
    const exercise: Exercise = {
      id: exerciseId,
      definitionId: nullableString(change.record, 'definition_id', current?.definitionId),
      name: stringValue(change.record, 'name', current?.name ?? ''),
      category: nullableString(change.record, 'category', current?.category),
      notes: nullableString(change.record, 'notes', current?.notes),
      imageUrl: nullableString(change.record, 'image_url', current?.imageUrl),
      videoUrl: nullableString(change.record, 'video_url', current?.videoUrl),
      sets: current?.sets ?? [],
    };
    return {
      ...routine,
      exercises: replaceAtPosition(routine.exercises, exerciseId, position, exercise),
    };
  });
}

function applyWorkoutSetChange(value: unknown, change: SyncRemoteChange): Routine[] {
  const routines = arrayOf<Routine>(value);
  const routineId = stringValue(change.record, 'routine_id', '');
  const exerciseId = stringValue(change.record, 'routine_exercise_id', '');
  if (
    change.deletedAt !== null &&
    !routines.some(
      (routine) =>
        routine.id === routineId &&
        routine.exercises.some((exercise) => exercise.id === exerciseId),
    )
  ) {
    return routines;
  }
  const setId = stringValue(change.record, 'id', change.id);
  const position = integerValue(change.record, 'position', 0);
  return updateRoutine(routines, routineId, (routine) => ({
    ...routine,
    exercises: routine.exercises.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise;
      if (change.deletedAt !== null) {
        return {
          ...exercise,
          sets: exercise.sets.filter((set) => set.id !== setId),
        };
      }
      const current = exercise.sets.find((set) => set.id === setId);
      const set: WorkoutSet = {
        id: setId,
        setNumber: position + 1,
        reps: change.record.reps as number | string ?? current?.reps ?? 0,
        weight: change.record.weight as number | string ?? current?.weight ?? 0,
        restSeconds:
          change.record.rest_seconds as number | string ?? current?.restSeconds ?? 0,
      };
      return {
        ...exercise,
        sets: replaceAtPosition(exercise.sets, setId, position, set),
      };
    }),
  }));
}

function applyActiveSessionChange(
  value: unknown,
  change: SyncRemoteChange,
): Record<string, ActiveWorkoutSession> {
  const sessions = isRecord(value) ? (value as Record<string, ActiveWorkoutSession>) : {};
  const routineId = stringValue(change.record, 'routine_id', change.id);
  if (change.deletedAt !== null) {
    const next = { ...sessions };
    delete next[routineId];
    return next;
  }
  const current = sessions[routineId];
  return {
    ...sessions,
    [routineId]: {
      routineId,
      startTime: timestampValue(change.record.started_at, current?.startTime ?? 0),
      completedSetIds: current?.completedSetIds ?? [],
    },
  };
}

function applyCompletedSetChange(
  value: unknown,
  change: SyncRemoteChange,
): Record<string, ActiveWorkoutSession> {
  const sessions = isRecord(value) ? (value as Record<string, ActiveWorkoutSession>) : {};
  const routineId = stringValue(change.record, 'routine_id', '');
  const setId = stringValue(change.record, 'set_id', '');
  if (change.deletedAt !== null && !sessions[routineId]) return sessions;
  const current = sessions[routineId] ?? {
    routineId,
    startTime: 0,
    completedSetIds: [],
  };
  const completedSetIds =
    change.deletedAt !== null
      ? current.completedSetIds.filter((id) => id !== setId)
      : current.completedSetIds.includes(setId)
        ? current.completedSetIds
        : [...current.completedSetIds, setId];
  return { ...sessions, [routineId]: { ...current, completedSetIds } };
}

function applyRmLogChange(value: unknown, change: SyncRemoteChange): ExerciseRmLog[] {
  const logs = arrayOf<ExerciseRmLog>(value);
  if (change.deletedAt !== null) return logs.filter((log) => log.id !== change.id);
  const current = logs.find((log) => log.id === change.id);
  return replaceById(logs, change.id, {
    id: change.id,
    exerciseId: nullableString(change.record, 'definition_id', current?.exerciseId),
    exerciseName: stringValue(
      change.record,
      'exercise_name',
      current?.exerciseName ?? '',
    ),
    category: nullableString(change.record, 'category', current?.category),
    createdAt: stringValue(
      change.record,
      'created_at',
      current?.createdAt ?? '1970-01-01T00:00:00.000Z',
    ),
    updatedAt: stringValue(
      change.record,
      'updated_at',
      current?.updatedAt ?? '1970-01-01T00:00:00.000Z',
    ),
    records: current?.records ?? [],
  });
}

function applyRmRecordChange(value: unknown, change: SyncRemoteChange): ExerciseRmLog[] {
  const logs = arrayOf<ExerciseRmLog>(value);
  const logId = stringValue(change.record, 'log_id', '');
  if (change.deletedAt !== null && !logs.some((log) => log.id === logId)) return logs;
  const recordId = stringValue(change.record, 'id', change.id);
  return updateRmLog(logs, logId, (log) => {
    if (change.deletedAt !== null) {
      return { ...log, records: log.records.filter((record) => record.id !== recordId) };
    }
    const current = log.records.find((record) => record.id === recordId);
    const record: RmRecord = {
      id: recordId,
      weight: numberValue(change.record, 'weight', current?.weight ?? 0),
      date: stringValue(change.record, 'recorded_on', current?.date ?? ''),
      notes: nullableString(change.record, 'notes', current?.notes),
    };
    return { ...log, records: replaceById(log.records, recordId, record) };
  });
}

function applyWorkoutHistoryChange(
  value: unknown,
  change: SyncRemoteChange,
): WorkoutHistoryLog[] {
  const logs = arrayOf<WorkoutHistoryLog>(value);
  if (change.deletedAt !== null) return logs.filter((log) => log.id !== change.id);
  const current = logs.find((log) => log.id === change.id);
  const completedAt = stringValue(
    change.record,
    'completed_at',
    current?.completedAt ?? '',
  );
  const startTime = timestampValue(
    change.record.started_at,
    current?.startTime ?? 0,
  );
  const endTime = timestampValue(completedAt, current?.endTime ?? startTime);
  const completedSetsCount = requiredNonNegativeIntegerValue(
    change.record,
    'sets_completed',
  );
  const totalSetsCount = requiredNullableNonNegativeIntegerValue(
    change.record,
    'total_sets_count',
  );
  return replaceById(logs, change.id, {
    id: change.id,
    routineId: stringValue(change.record, 'routine_id', current?.routineId ?? ''),
    routineName: stringValue(
      change.record,
      'routine_name',
      current?.routineName ?? '',
    ),
    startTime,
    endTime,
    durationSeconds: numberValue(
      change.record,
      'duration_seconds',
      current?.durationSeconds ?? 0,
    ),
    completedSetsCount,
    totalSetsCount,
    completionPercentage: requiredNullablePercentageValue(
      change.record,
      'completion_percentage',
    ),
    exercisesSummary: current?.exercisesSummary ?? [],
    completedAt,
  });
}

function applyWorkoutHistoryExerciseChange(
  value: unknown,
  change: SyncRemoteChange,
): WorkoutHistoryLog[] {
  const logs = arrayOf<WorkoutHistoryLog>(value);
  const historyId = stringValue(change.record, 'history_id', '');
  if (change.deletedAt !== null && !logs.some((log) => log.id === historyId)) return logs;
  if (!logs.some((log) => log.id === historyId)) {
    throw new Error('Workout history exercise has no matching history record.');
  }
  const position = requiredNonNegativeIntegerValue(change.record, 'position');
  return updateWorkoutHistory(logs, historyId, (history) => {
    const positionedExercises = history.exercisesSummary.map(
      (exercise, index) => ({
        position: exercise.position ?? index,
        exercise,
      }),
    );
    const currentIndex = positionedExercises.findIndex(
      (item) => item.position === position,
    );
    if (change.deletedAt !== null) {
      if (currentIndex >= 0) positionedExercises.splice(currentIndex, 1);
    } else {
      const exercise = {
        name: requiredStringValue(change.record, 'exercise_name'),
        completedSets: requiredNonNegativeIntegerValue(
          change.record,
          'sets_completed',
        ),
        totalSets: requiredNullableNonNegativeIntegerValue(
          change.record,
          'sets_total',
        ),
        position,
      };
      if (currentIndex >= 0) {
        positionedExercises[currentIndex] = { position, exercise };
      } else {
        positionedExercises.push({ position, exercise });
      }
    }
    positionedExercises.sort((left, right) => left.position - right.position);
    return {
      ...history,
      exercisesSummary: positionedExercises.map((item) => ({
        ...item.exercise,
        position: item.position,
      })),
    };
  });
}

function applyExerciseDiaryChange(value: unknown, change: SyncRemoteChange): ExerciseDiary[] {
  const diaries = arrayOf<ExerciseDiary>(value);
  if (change.deletedAt !== null) return diaries.filter((diary) => diary.id !== change.id);
  const current = diaries.find((diary) => diary.id === change.id);
  return replaceById(diaries, change.id, {
    id: change.id,
    exerciseId: nullableString(change.record, 'definition_id', current?.exerciseId),
    exerciseName: stringValue(
      change.record,
      'exercise_name',
      current?.exerciseName ?? '',
    ),
    category: nullableString(change.record, 'category', current?.category),
    createdAt: stringValue(
      change.record,
      'created_at',
      current?.createdAt ?? '1970-01-01T00:00:00.000Z',
    ),
    updatedAt: stringValue(
      change.record,
      'updated_at',
      current?.updatedAt ?? '1970-01-01T00:00:00.000Z',
    ),
    entries: current?.entries ?? [],
  });
}

function applyExerciseDiaryEntryChange(
  value: unknown,
  change: SyncRemoteChange,
): ExerciseDiary[] {
  const diaries = arrayOf<ExerciseDiary>(value);
  const diaryId = stringValue(change.record, 'diary_id', '');
  if (change.deletedAt !== null && !diaries.some((diary) => diary.id === diaryId)) {
    return diaries;
  }
  const entryId = stringValue(change.record, 'id', change.id);
  return updateExerciseDiary(diaries, diaryId, (diary) => {
    if (change.deletedAt !== null) {
      return { ...diary, entries: diary.entries.filter((entry) => entry.id !== entryId) };
    }
    const current = diary.entries.find((entry) => entry.id === entryId);
    const entry: ExerciseDiaryEntry = {
      id: entryId,
      date: stringValue(change.record, 'recorded_on', current?.date ?? ''),
      note: stringValue(change.record, 'note', current?.note ?? ''),
      feeling: diaryFeeling(change.record.feeling, current?.feeling),
      createdAt: nullableString(change.record, 'created_at', current?.createdAt),
      updatedAt: nullableString(change.record, 'updated_at', current?.updatedAt),
    };
    return { ...diary, entries: replaceById(diary.entries, entryId, entry) };
  });
}

function updateRoutine(
  value: unknown,
  routineId: string,
  update: (routine: Routine) => Routine,
): Routine[] {
  const routines = arrayOf<Routine>(value);
  const current = routines.find((routine) => routine.id === routineId) ?? {
    id: routineId,
    name: '',
    notes: '',
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
    exercises: [],
  };
  return replaceById(routines, routineId, update(current));
}

function updateRmLog(
  value: unknown,
  logId: string,
  update: (log: ExerciseRmLog) => ExerciseRmLog,
): ExerciseRmLog[] {
  const logs = arrayOf<ExerciseRmLog>(value);
  const current = logs.find((log) => log.id === logId) ?? {
    id: logId,
    exerciseName: '',
    records: [],
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
  return replaceById(logs, logId, update(current));
}

function updateWorkoutHistory(
  value: unknown,
  historyId: string,
  update: (history: WorkoutHistoryLog) => WorkoutHistoryLog,
): WorkoutHistoryLog[] {
  const logs = arrayOf<WorkoutHistoryLog>(value);
  const current = logs.find((log) => log.id === historyId) ?? {
    id: historyId,
    routineId: '',
    routineName: '',
    startTime: 0,
    endTime: 0,
    durationSeconds: 0,
    completedSetsCount: 0,
    totalSetsCount: null,
    completionPercentage: null,
    exercisesSummary: [],
    completedAt: '',
  };
  return replaceById(logs, historyId, update(current));
}

function updateExerciseDiary(
  value: unknown,
  diaryId: string,
  update: (diary: ExerciseDiary) => ExerciseDiary,
): ExerciseDiary[] {
  const diaries = arrayOf<ExerciseDiary>(value);
  const current = diaries.find((diary) => diary.id === diaryId) ?? {
    id: diaryId,
    exerciseName: '',
    entries: [],
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
  return replaceById(diaries, diaryId, update(current));
}

function replaceById<T extends { id: string }>(items: T[], id: string, item: T): T[] {
  const index = items.findIndex((current) => current.id === id);
  if (index < 0) return [...items, item];
  const next = [...items];
  next[index] = item;
  return next;
}

function replaceAtPosition<T extends { id: string }>(
  items: T[],
  id: string,
  position: number,
  item: T,
): T[] {
  const next = items.filter((current) => current.id !== id);
  next.splice(Math.min(Math.max(position, 0), next.length), 0, item);
  return next;
}

function stringValue(
  record: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  return typeof record[key] === 'string' ? (record[key] as string) : fallback;
}

function nullableString(
  record: Record<string, unknown>,
  key: string,
  fallback: string | undefined,
): string | undefined {
  const value = record[key];
  if (typeof value === 'string') return value;
  return value === null ? undefined : fallback;
}

function diaryFeeling(
  value: unknown,
  fallback: DiaryFeeling | undefined,
): DiaryFeeling | undefined {
  if (value === 'good' || value === 'neutral' || value === 'bad') return value;
  return value === null ? undefined : fallback;
}

function optionalNumber(
  record: Record<string, unknown>,
  key: string,
  fallback: number | undefined,
): number | undefined {
  return typeof record[key] === 'number' && Number.isFinite(record[key])
    ? (record[key] as number)
    : fallback;
}

function numberValue(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function integerValue(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = record[key];
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}

function requiredStringValue(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`Workout history field ${key} is invalid.`);
  }
  return value;
}

function requiredNonNegativeIntegerValue(
  record: Record<string, unknown>,
  key: string,
): number {
  const value = record[key];
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError(`Workout history field ${key} is invalid.`);
  }
  return value;
}

function requiredNullableNonNegativeIntegerValue(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  if (value === null) return null;
  return requiredNonNegativeIntegerValue(record, key);
}

function requiredNullablePercentageValue(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  if (value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new TypeError(`Workout history field ${key} is invalid.`);
  }
  return value;
}

function timestampValue(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : fallback;
}
