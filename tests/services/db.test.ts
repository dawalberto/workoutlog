import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
});
