import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncRecordId } from '../../src/services/sync-queue';
import type { Routine, WorkoutHistoryLog } from '../../src/types';

type DbModule = typeof import('../../src/services/db');

let indexedDB: IDBFactory;
let storage: DbModule;

function createLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

async function readStoredOutbox(scope: string) {
  const db = await storage.getDatabase();
  const transaction = db.transaction(storage.SYNC_OUTBOX_STORE, 'readonly');
  const request = transaction.objectStore(storage.SYNC_OUTBOX_STORE).index('scope').getAll(scope);
  return new Promise<
    Array<{
      sequence: number;
      operationId: string;
      scope: string;
      recordId: string;
      change: {
        table: string;
        operation: 'upsert' | 'delete';
        baseRevision: string;
        record: Record<string, unknown>;
      };
    }>
  >((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function createV1Database(
  values: Record<string, unknown> = {},
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('WorkoutLogDB', 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore('app_state');
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('app_state', 'readwrite');
      const store = transaction.objectStore('app_state');
      for (const [key, value] of Object.entries(values)) {
        store.put(value, key);
      }
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  });
}

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      indexedDB,
      localStorage: createLocalStorage(),
    },
  });
  storage = await import('../../src/services/db');
});

afterEach(async () => {
  if (storage) {
    (await storage.getDatabase()).close();
  }
  Reflect.deleteProperty(globalThis, 'window');
  vi.restoreAllMocks();
});

describe('IndexedDB storage', () => {
  it('commits a tombstone followed by an orphan child and preserves pending operations', async () => {
    const scope = { ownerId: 'history-tombstone-owner' };
    const history = {
      id: 'history-tombstone',
      routineId: 'routine-1',
      routineName: 'Saved routine',
      startTime: 1700000000000,
      endTime: 1700000300000,
      durationSeconds: 300,
      completedSetsCount: 1,
      totalSetsCount: 1,
      completionPercentage: 100,
      exercisesSummary: [
        { name: 'Existing exercise', completedSets: 1, totalSets: 1, position: 0 },
      ],
      completedAt: '2024-01-01T00:05:00.000Z',
    };
    await storage.setScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [history], scope);
    for (const operation of await storage.getPendingSyncOperations(scope)) {
      const change = operation.request.changes[0]!;
      await storage.acknowledgeSyncOperation(
        operation.request.operationId,
        {
          table: change.table,
          id: syncRecordId(change.table, change.record),
          revision: '2',
          deletedAt: null,
        },
        scope,
      );
    }
    await storage.setScopedStoredItem(
      storage.DB_KEYS.ROUTINES,
      [{ id: 'pending-routine', name: 'Pending routine', exercises: [] }],
      scope,
    );
    await storage.setServerCursor('5', scope);
    const outboxBefore = await storage.getPendingSyncOperations(scope);
    const childRecord = {
      history_id: history.id,
      position: 0,
      exercise_name: 'Sentadilla',
      sets_completed: 3,
      sets_total: 3,
    };

    await storage.applyRemoteSyncChanges(
      [
        {
          table: 'workout_history',
          id: history.id,
          revision: '6',
          deletedAt: '2024-01-02T00:00:00.000Z',
          record: { id: history.id },
        },
        {
          table: 'workout_history_exercises',
          id: syncRecordId('workout_history_exercises', childRecord),
          revision: '7',
          deletedAt: null,
          record: childRecord,
        },
        {
          table: 'exercise_definitions',
          id: 'remote-definition',
          revision: '8',
          deletedAt: null,
          record: { name: 'Press' },
        },
      ],
      '8',
      scope,
    );

    expect(await storage.getScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [], scope)).toEqual([]);
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope)).toEqual([
      expect.objectContaining({ id: 'remote-definition', name: 'Press' }),
    ]);
    expect(await storage.getServerCursor(scope)).toBe('8');
    expect(await storage.getPendingSyncOperations(scope)).toEqual(outboxBefore);
  });

  it('applies a history child even when its parent appears later in the pull batch', async () => {
    const historyId = 'history-out-of-order';
    const childRecord = {
      history_id: historyId,
      position: 0,
      exercise_name: 'Sentadilla',
      sets_completed: 3,
      sets_total: 3,
    };

    await storage.applyRemoteSyncChanges(
      [
        {
          table: 'workout_history_exercises',
          id: syncRecordId('workout_history_exercises', childRecord),
          revision: '2',
          deletedAt: null,
          record: childRecord,
        },
        {
          table: 'workout_history',
          id: historyId,
          revision: '3',
          deletedAt: null,
          record: {
            id: historyId,
            routine_id: 'routine-1',
            routine_name: 'Saved routine',
            started_at: '2024-01-01T00:00:00.000Z',
            completed_at: '2024-01-01T00:05:00.000Z',
            duration_seconds: 300,
            sets_completed: 3,
            total_sets_count: 3,
            completion_percentage: 100,
          },
        },
      ],
      '3',
    );

    const histories = await storage.getScopedStoredItem<WorkoutHistoryLog[]>(
      storage.DB_KEYS.WORKOUT_HISTORY,
      [],
    );
    expect(histories).toHaveLength(1);
    expect(histories[0]!.exercisesSummary).toEqual([
      {
        name: 'Sentadilla',
        completedSets: 3,
        totalSets: 3,
        position: 0,
      },
    ]);
  });

  it('merges edits during refresh while retaining remote additions and local deletions', () => {
    const baseline = [{ id: 'edit', name: 'Old' }, { id: 'deleted', name: 'Delete' }];
    const current = [{ id: 'edit', name: 'Typed during refresh' }];
    const remote = [{ id: 'edit', name: 'Remote' }, { id: 'deleted', name: 'Delete' }, { id: 'new', name: 'Other device' }];
    expect(storage.mergeSyncRefresh(baseline, current, remote, 'catalog')).toEqual([
      { id: 'edit', name: 'Typed during refresh' }, { id: 'new', name: 'Other device' },
    ]);
    expect(storage.mergeSyncRefresh(baseline, [...baseline], remote, 'catalog')).toEqual(remote);
    expect(storage.mergeSyncRefresh(baseline, current, [], 'catalog')).toEqual([]);
  });
  it.each(['local', 'remote'] as const)('retains remote nested set edits and %s deletion during a local routine rename', async (deletion) => {
    const scope = { ownerId: 'nested-refresh-owner' };
    const baseline: Routine[] = [{
      id: 'routine-string', name: 'Before', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      exercises: [{
        id: 'exercise-string', name: 'Snapshot', sets: [
          { id: 'set-string', setNumber: 1, reps: '8', weight: 20, restSeconds: '60' },
          { id: 'deleted-set', setNumber: 2, reps: '8', weight: 30, restSeconds: '60' },
        ],
      }],
    }];
    await storage.setScopedStoredItem(storage.DB_KEYS.ROUTINES, baseline, scope);
    for (const operation of await storage.getPendingSyncOperations(scope)) {
      const change = operation.request.changes[0];
      await storage.acknowledgeSyncOperation(operation.request.operationId, {
        table: change.table, id: change.record.id as string, revision: '1', deletedAt: null,
      }, scope);
    }
    const pendingAtPullStart = new Set<string>();
    const current = [{
      ...baseline[0]!, name: 'Renamed during refresh',
      exercises: [{
        ...baseline[0]!.exercises[0]!,
        sets: baseline[0]!.exercises[0]!.sets.filter((set) => deletion !== 'local' || set.id !== 'deleted-set'),
      }],
    }];
    await storage.setScopedStoredItem(storage.DB_KEYS.ROUTINES, current, scope);
    await storage.applyRemoteSyncChanges([
      {
        table: 'workout_sets', id: 'set-string', revision: '2', deletedAt: null,
        record: { id: 'set-string', routine_id: 'routine-string', routine_exercise_id: 'exercise-string', position: 0, reps: '8', weight: 40, rest_seconds: '60' },
      },
      ...(deletion === 'remote' ? [{
        table: 'workout_sets' as const, id: 'deleted-set', revision: '3', deletedAt: '2024-01-02',
        record: { id: 'deleted-set', routine_id: 'routine-string', routine_exercise_id: 'exercise-string' },
      }] : []),
    ], '3', scope, undefined, pendingAtPullStart);
    const remote = (await storage.loadScopedAppStorageData(scope)).routines;
    const merged = storage.mergeSyncRefresh(baseline, current, remote, 'routines');
    expect(merged[0]!.name).toBe('Renamed during refresh');
    expect(merged[0]!.exercises[0]!.sets).toEqual([{
      id: 'set-string', setNumber: 1, reps: '8', weight: 40, restSeconds: '60',
    }]);
    await storage.setScopedStoredItem(storage.DB_KEYS.ROUTINES, merged, scope);
    const pending = await storage.getPendingSyncOperations(scope);
    expect(pending.some((operation) => operation.request.changes.some(
      (change) => change.table === 'workout_sets' && change.operation === 'upsert',
    ))).toBe(false);
    expect(pending.some((operation) => operation.request.changes.some(
      (change) => change.table === 'routines' && change.record.name === 'Renamed during refresh',
    ))).toBe(true);
  });
  it('repairs only the rejected optional reference with a new operation identity and unchanged snapshot', async () => {
    const scope = { ownerId: 'owner-repair' };
    const logs = [{ id: 'rm', exerciseId: 'missing', exerciseName: 'Snapshot', records: [] }];
    await storage.setScopedStoredItem(storage.DB_KEYS.RM_LOGS, logs, scope);
    const [original] = await storage.getPendingSyncOperations(scope);
    expect(await storage.repairRejectedSyncReference(original!.request.operationId, 'definition_id', 'missing', scope)).toBe(true);
    const [repaired] = await storage.getPendingSyncOperations(scope);
    expect(repaired!.request.operationId).not.toBe(original!.request.operationId);
    expect(repaired!.sequence).toBe(original!.sequence);
    expect(repaired!.request.changes[0]).toEqual({
      ...original!.request.changes[0], record: { ...original!.request.changes[0].record, definition_id: null },
    });
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.RM_LOGS, [], scope)).toEqual(logs);
    expect(await storage.repairRejectedSyncReference(repaired!.request.operationId, 'definition_id', 'missing', { ownerId: 'other' })).toBe(false);
  });
  it('upgrades v1 while preserving collection IDs and nested snapshots', async () => {
    const expected = {
      routines: [
        {
          id: 'routine-stable',
          name: 'Existing routine',
          exercises: [
            {
              id: 'exercise-stable',
              name: 'Existing exercise snapshot',
              sets: [
                {
                  id: 'set-stable',
                  setNumber: 1,
                  reps: '8',
                  weight: '42.5',
                  restSeconds: 90,
                },
              ],
            },
          ],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
      catalog: [{ id: 'definition-stable', name: 'Saved definition' }],
      activeSessions: {
        'routine-stable': {
          routineId: 'routine-stable',
          startTime: 1700000000000,
          completedSetIds: ['set-stable'],
        },
      },
      rmLogs: [
        {
          id: 'rm-stable',
          exerciseName: 'Saved RM snapshot',
          records: [{ id: 'record-stable', weight: 50, date: '2024-01-01' }],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
      workoutHistory: [
        {
          id: 'history-stable',
          routineId: 'routine-stable',
          routineName: 'Snapshot name',
          startTime: 1700000000000,
          endTime: 1700000300000,
          durationSeconds: 300,
          completedSetsCount: 1,
          totalSetsCount: 1,
          completionPercentage: 100,
          exercisesSummary: [{ name: 'Snapshot exercise', completedSets: 1, totalSets: 1 }],
          completedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
      exerciseDiary: [
        {
          id: 'diary-stable',
          exerciseName: 'Snapshot exercise',
          entries: [
            {
              id: 'entry-stable',
              date: '2024-01-01',
              note: 'Existing note',
            },
          ],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
    };
    const { DB_KEYS, DB_VERSION } = storage;

    await createV1Database({
      [DB_KEYS.ROUTINES]: expected.routines,
      [DB_KEYS.CATALOG]: expected.catalog,
      [DB_KEYS.ACTIVE_SESSIONS]: expected.activeSessions,
      [DB_KEYS.RM_LOGS]: expected.rmLogs,
      [DB_KEYS.WORKOUT_HISTORY]: expected.workoutHistory,
      [DB_KEYS.EXERCISE_DIARY]: expected.exerciseDiary,
    });

    const actual = await storage.initAndMigrateStorage();
    const upgraded = await storage.getDatabase();

    expect(DB_VERSION).toBeGreaterThan(1);
    expect(upgraded.version).toBe(DB_VERSION);
    expect(actual).toEqual(expected);
    const migratedOperations = await storage.getPendingSyncOperations();
    const migratedTables = new Set(
      migratedOperations.flatMap((operation) =>
        operation.request.changes.map((change) => change.table),
      ),
    );
    expect(migratedTables.size).toBe(12);
    expect(migratedOperations.every((operation) => operation.request.changes[0]?.baseRevision === '0')).toBe(true);
  });

  it('seeds editable starter records once on true first use', async () => {
    const first = await storage.initAndMigrateStorage();
    const initialOutbox = await storage.getPendingSyncOperations();
    const second = await storage.initAndMigrateStorage();

    expect(first.catalog.length).toBeGreaterThanOrEqual(3);
    expect(first.routines).toHaveLength(2);
    expect(second.catalog).toEqual(first.catalog);
    expect(second.routines).toEqual(first.routines);
    expect(await storage.getPendingSyncOperations()).toEqual(initialOutbox);
  });

  it('keeps hydrated IndexedDB data ahead of conflicting legacy localStorage', async () => {
    const existing = [{ id: 'existing', name: 'Hydrated routine', exercises: [] }];
    const localStorage = createLocalStorage({
      workout_planner_routines_v1: JSON.stringify([
        { id: 'legacy', name: 'Must not overwrite', exercises: [] },
      ]),
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { indexedDB, localStorage },
    });

    await createV1Database({
      [storage.DB_KEYS.ROUTINES]: existing,
    });

    const actual = await storage.initAndMigrateStorage();

    expect(actual.routines).toEqual(existing);
    expect(actual.catalog).toEqual([]);
  });

  it('migrates legacy localStorage records without changing IDs or snapshots', async () => {
    const routine = {
      id: 'legacy-routine-id',
      name: 'Legacy snapshot',
      exercises: [
        {
          id: 'legacy-exercise-id',
          name: 'Snapshot exercise',
          sets: [{ id: 'legacy-set-id', setNumber: 1, reps: '6', weight: '20', restSeconds: 90 }],
        },
      ],
      createdAt: '2022-01-01T00:00:00.000Z',
      updatedAt: '2022-01-02T00:00:00.000Z',
    };
    const localStorage = createLocalStorage({
      workout_planner_routines_v1: JSON.stringify([routine]),
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { indexedDB, localStorage },
    });

    const actual = await storage.initAndMigrateStorage();

    expect(actual.routines).toEqual([routine]);
    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.MIGRATION_FLAG, false),
    ).toBe(true);
  });

  it('isolates collection values between the guest and authenticated owner scopes', async () => {
    const guestRoutines = [{ id: 'guest-routine', name: 'Guest', exercises: [] }];
    const accountRoutines = [{ id: 'account-routine', name: 'Account', exercises: [] }];
    const accountScope = { ownerId: 'account-42' };

    await storage.setScopedStoredItem(
      storage.DB_KEYS.ROUTINES,
      guestRoutines,
      storage.GUEST_STORAGE_SCOPE,
    );
    await storage.setScopedStoredItem(storage.DB_KEYS.ROUTINES, accountRoutines, accountScope);

    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [], storage.GUEST_STORAGE_SCOPE),
    ).toEqual(guestRoutines);
    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [], accountScope),
    ).toEqual(accountRoutines);
    expect(await storage.getPendingSyncOperations(storage.GUEST_STORAGE_SCOPE)).toHaveLength(1);
    expect(await storage.getPendingSyncOperations(accountScope)).toHaveLength(1);
  });

  it('does not import guest localStorage into an authenticated owner scope', async () => {
    const guestData = [{ id: 'legacy-private', name: 'Guest-only routine', exercises: [] }];
    const localStorage = createLocalStorage({
      workout_planner_routines_v1: JSON.stringify(guestData),
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { indexedDB, localStorage },
    });

    const account = await storage.initAndMigrateStorage({ ownerId: 'new-account' });
    const guest = await storage.initAndMigrateStorage();

    expect(account.routines.map((routine) => routine.id)).not.toContain('legacy-private');
    expect(guest.routines).toEqual(guestData);
  });

  it('stores all six persisted collections and nested rows in the sync outbox', async () => {
    const exercise = {
      id: 'definition-1',
      name: 'Press',
      category: 'Chest',
      defaultSetsCount: 2,
      defaultReps: 8,
      defaultWeight: 20,
      defaultRestSeconds: 60,
    };
    const routine = {
      id: 'routine-1',
      name: 'Push',
      exercises: [
        {
          id: 'routine-exercise-1',
          definitionId: 'definition-1',
          name: 'Press',
          sets: [
            {
              id: 'set-1',
              setNumber: 1,
              reps: 8,
              weight: 20,
              restSeconds: 60,
            },
          ],
        },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    await storage.setStoredItem(storage.DB_KEYS.CATALOG, [exercise]);
    await storage.setStoredItem(storage.DB_KEYS.ROUTINES, [routine]);
    await storage.setStoredItem(storage.DB_KEYS.ACTIVE_SESSIONS, {
      'routine-1': {
        routineId: 'routine-1',
        startTime: 1700000000000,
        completedSetIds: ['set-1'],
      },
    });
    await storage.setStoredItem(storage.DB_KEYS.RM_LOGS, [
      {
        id: 'rm-log-1',
        exerciseId: 'definition-1',
        exerciseName: 'Press snapshot',
        records: [{ id: 'rm-record-1', weight: 30, date: '2024-01-01' }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    await storage.setStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [
      {
        id: 'history-1',
        routineId: 'routine-1',
        routineName: 'Saved routine snapshot',
        startTime: 1700000000000,
        endTime: 1700000300000,
        completedAt: '2024-01-01T00:05:00.000Z',
        durationSeconds: 300,
        completedSetsCount: 1,
        totalSetsCount: 1,
        completionPercentage: 100,
        exercisesSummary: [{ name: 'Press snapshot', completedSets: 1, totalSets: 1 }],
      },
    ]);
    await storage.setStoredItem(storage.DB_KEYS.EXERCISE_DIARY, [
      {
        id: 'diary-1',
        exerciseId: 'definition-1',
        exerciseName: 'Press snapshot',
        entries: [
          {
            id: 'diary-entry-1',
            date: '2024-01-01',
            note: 'Felt strong',
            feeling: 'good',
          },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const operations = await storage.getPendingSyncOperations();
    const tables = new Set(
      operations.flatMap((operation) =>
        operation.request.changes.map((change) => change.table),
      ),
    );

    expect(tables).toEqual(
      new Set([
        'exercise_definitions',
        'routines',
        'routine_exercises',
        'workout_sets',
        'active_workout_sessions',
        'active_session_completed_sets',
        'rm_logs',
        'rm_records',
        'workout_history',
        'workout_history_exercises',
        'exercise_diaries',
        'exercise_diary_entries',
      ]),
    );
  });

  it('orders a guest queue child-first but transfers catalog parents before routine children', async () => {
    const definition = { id: 'transfer-definition', name: 'Transfer definition' };
    const routine = {
      id: 'transfer-routine',
      name: 'Transfer routine',
      exercises: [
        {
          id: 'transfer-routine-exercise',
          definitionId: definition.id,
          name: definition.name,
          sets: [],
        },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    await storage.setStoredItem(storage.DB_KEYS.ROUTINES, [routine]);
    await storage.setStoredItem(storage.DB_KEYS.CATALOG, [definition]);

    const guestOutbox = await readStoredOutbox('guest');
    expect(guestOutbox.map((operation) => operation.change.table)).toEqual([
      'routines',
      'routine_exercises',
      'exercise_definitions',
    ]);

    expect(await storage.transferGuestDataToOwnerOnce('transfer-owner')).toBe(true);
    const ownerStoredOutbox = await readStoredOutbox('owner:transfer-owner');
    expect(ownerStoredOutbox.map((operation) => operation.change.table)).toEqual([
      'exercise_definitions',
      'routines',
      'routine_exercises',
    ]);
    const ownerOutbox = await storage.getPendingSyncOperations({ ownerId: 'transfer-owner' });
    expect(
      ownerOutbox.map((operation) => operation.request.changes[0]?.table),
    ).toEqual(['exercise_definitions', 'routines', 'routine_exercises']);
    expect(ownerOutbox[2]?.request.changes[0]?.record).toMatchObject({
      routine_id: routine.id,
      definition_id: definition.id,
    });
  });

  it('sorts an already-persisted child-first queue without changing stored operations', async () => {
    const definition = { id: 'queued-definition', name: 'Queued definition' };
    const routine = {
      id: 'queued-routine',
      name: 'Queued routine',
      exercises: [
        {
          id: 'queued-routine-exercise',
          definitionId: definition.id,
          name: definition.name,
          sets: [],
        },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    await storage.setStoredItem(storage.DB_KEYS.ROUTINES, [routine]);
    await storage.setStoredItem(storage.DB_KEYS.CATALOG, [definition]);

    const storedBefore = await readStoredOutbox('guest');
    expect(storedBefore.map((operation) => operation.change.table)).toEqual([
      'routines',
      'routine_exercises',
      'exercise_definitions',
    ]);

    const pending = await storage.getPendingSyncOperations();
    expect(pending.map((operation) => operation.request.changes[0]?.table)).toEqual([
      'routines',
      'exercise_definitions',
      'routine_exercises',
    ]);
    expect(pending.map((operation) => operation.sequence)).toEqual([
      storedBefore[0]?.sequence,
      storedBefore[2]?.sequence,
      storedBefore[1]?.sequence,
    ]);
    expect(pending.map((operation) => operation.request.operationId)).toEqual([
      storedBefore[0]?.operationId,
      storedBefore[2]?.operationId,
      storedBefore[1]?.operationId,
    ]);
    expect(
      pending.map((operation) => operation.request.changes[0]),
    ).toEqual([
      storedBefore[0]?.change,
      storedBefore[2]?.change,
      storedBefore[1]?.change,
    ]);
    expect(await readStoredOutbox('guest')).toEqual(storedBefore);
  });

  it('atomically records a local upsert, its server revision, and a later tombstone', async () => {
    const definition = { id: 'definition-delete', name: 'Temporary exercise' };
    await storage.setStoredItem(storage.DB_KEYS.CATALOG, [definition]);

    const stored = await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, []);
    const [upsert] = await storage.getPendingSyncOperations();

    expect(stored).toEqual([definition]);
    expect(Object.keys(upsert!.request).sort()).toEqual(['changes', 'operationId']);
    expect(upsert?.request.changes[0]).toMatchObject({
      table: 'exercise_definitions',
      operation: 'upsert',
      baseRevision: '0',
      record: definition,
    });
    expect(Object.keys(upsert!.request.changes[0]!).sort()).toEqual([
      'baseRevision',
      'operation',
      'record',
      'table',
    ]);

    await storage.acknowledgeSyncOperation(upsert!.request.operationId, {
      table: 'exercise_definitions',
      id: definition.id,
      revision: '41',
      deletedAt: null,
    });
    await storage.setStoredItem(storage.DB_KEYS.CATALOG, []);

    const [tombstone] = await storage.getPendingSyncOperations();
    expect(tombstone?.request.changes[0]).toEqual({
      table: 'exercise_definitions',
      operation: 'delete',
      baseRevision: '41',
      record: { id: definition.id },
    });
    expect(
      await storage.getRecordMetadata('exercise_definitions', definition.id),
    ).toMatchObject({ serverRevision: '41', localRevision: 2, deleted: true });
  });

  it('rolls back the collection write when its outbox transaction fails', async () => {
    const original = [{ id: 'atomic-definition', name: 'Before' }];
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await storage.setStoredItem(storage.DB_KEYS.CATALOG, original);
    await storage.setStoredItem(storage.DB_KEYS.CATALOG, [
      { id: 'atomic-definition', name: 'After' },
    ]);

    expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [])).toEqual(original);
    expect(await storage.getPendingSyncOperations()).toHaveLength(1);
    expect(
      await storage.getRecordMetadata('exercise_definitions', 'atomic-definition'),
    ).toMatchObject({ localRevision: 1 });
  });

  it('stores server cursors separately for each account', async () => {
    const accountScope = { ownerId: 'cursor-owner' };
    await storage.setServerCursor('12', accountScope);

    expect(await storage.getServerCursor(accountScope)).toBe('12');
    expect(await storage.getServerCursor()).toBe('0');
  });

  it('clears every local record for one owner without affecting other scopes', async () => {
    const firstOwner = { ownerId: 'signout-owner' };
    const secondOwner = { ownerId: 'other-owner' };
    const guestRoutine: Routine = {
      id: 'guest-routine',
      name: 'Guest routine',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      exercises: [],
    };
    const firstCatalog = [{ id: 'first-exercise', name: 'Sentadilla' }];
    const secondCatalog = [{ id: 'second-exercise', name: 'Press banca' }];

    await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, firstCatalog, firstOwner);
    await storage.setScopedStoredItem(storage.DB_KEYS.STARTER_DATA_FLAG, true, firstOwner);
    await storage.setServerCursor('10', firstOwner);
    await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, secondCatalog, secondOwner);
    await storage.setServerCursor('20', secondOwner);
    await storage.setScopedStoredItem(storage.DB_KEYS.ROUTINES, [guestRoutine]);

    await storage.clearOwnerLocalData(firstOwner.ownerId);

    expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], firstOwner)).toEqual([]);
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.STARTER_DATA_FLAG, false, firstOwner))
      .toBe(false);
    expect(await storage.getPendingSyncOperations(firstOwner)).toEqual([]);
    expect(await storage.getServerCursor(firstOwner)).toBe('0');
    expect(await storage.getRecordMetadata('exercise_definitions', 'first-exercise', firstOwner))
      .toBeUndefined();
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], secondOwner))
      .toEqual(secondCatalog);
    expect(await storage.getPendingSyncOperations(secondOwner)).toHaveLength(1);
    expect(await storage.getServerCursor(secondOwner)).toBe('20');
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [])).toEqual([guestRoutine]);
  });

  it('keeps device analytics consent across guest and owner cleanup', async () => {
    await storage.setDeviceStoredItem(storage.DEVICE_KEYS.ANALYTICS_CONSENT, 'granted');
    await storage.setScopedStoredItem(storage.DB_KEYS.STARTER_DATA_FLAG, true);
    await storage.setScopedStoredItem(
      storage.DB_KEYS.STARTER_DATA_FLAG,
      true,
      { ownerId: 'signout-owner' },
    );

    await storage.clearGuestLocalData();
    await storage.clearOwnerLocalData('signout-owner');

    expect(await storage.getDeviceStoredItem(storage.DEVICE_KEYS.ANALYTICS_CONSENT, 'unknown'))
      .toBe('granted');
    expect(() => {
      void storage.setDeviceStoredItem('analytics_consent', 'denied');
    }).toThrow('Device storage keys must start with "device:".');
  });

  it('clears the guest scope so fresh starter data is restored on hydration', async () => {
    await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, [
      { id: 'previous-account-exercise', name: 'Private exercise' },
    ]);
    await storage.setScopedStoredItem(storage.DB_KEYS.STARTER_DATA_FLAG, true);

    await storage.clearGuestLocalData();
    const freshGuestData = await storage.initAndMigrateStorage();

    expect(freshGuestData.catalog.some((item) => item.id === 'previous-account-exercise'))
      .toBe(false);
    expect(freshGuestData.catalog.length).toBeGreaterThan(0);
    expect(freshGuestData.routines.length).toBeGreaterThan(0);
  });

  it('surfaces localStorage removal errors during guest cleanup', async () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        removeItem: () => {
          throw new Error('Storage access denied');
        },
      },
    });

    await expect(storage.clearGuestLocalData()).rejects.toThrow('Storage access denied');
  });

  it('surfaces IndexedDB failures during owner cleanup', async () => {
    (await storage.getDatabase()).close();

    await expect(storage.clearOwnerLocalData('cleanup-owner')).rejects.toThrow();
  });
});
