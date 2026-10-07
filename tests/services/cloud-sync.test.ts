import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPremiumEntitlementActive } from '../../src/services/auth';

type DbModule = typeof import('../../src/services/db');
type CloudSyncModule = typeof import('../../src/services/cloud-sync');

let indexedDB: IDBFactory;
let storage: DbModule;
let cloudSync: CloudSyncModule;

function createLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function makeFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): typeof fetch {
  return vi.fn(handler) as unknown as typeof fetch;
}

function pullResponse(
  changes: unknown[] = [],
  nextCursor = '0',
  hasMore = false,
) {
  return { changes, nextCursor, hasMore };
}

const account = {
  ownerId: 'owner-1',
  accessToken: 'signed-in-token',
  premiumActive: true,
  online: true,
  apiOrigin: 'https://backend.invalid',
};

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
  cloudSync = await import('../../src/services/cloud-sync');
});

afterEach(async () => {
  if (storage) {
    (await storage.getDatabase()).close();
  }
  Reflect.deleteProperty(globalThis, 'window');
  vi.restoreAllMocks();
});

describe('cloud sync', () => {
  it('sends the authenticated bearer token and retries an uncertain push with the same operation', async () => {
    const scope = { ownerId: account.ownerId };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [{ id: 'definition-1', name: 'Bench press' }],
      scope,
    );
    const [queued] = await storage.getPendingSyncOperations(scope);
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let pushCount = 0;
    const fetcher = makeFetch(async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      expect(new Headers(init?.headers).get('Authorization')).toBe(
        `Bearer ${account.accessToken}`,
      );
      if (init?.method === 'POST') {
        pushCount += 1;
        if (pushCount === 1) throw new Error('connection lost after send');
        return jsonResponse({
          operationId: queued!.request.operationId,
          changes: [
            {
              table: 'exercise_definitions',
              id: 'definition-1',
              revision: '5',
              deletedAt: null,
            },
          ],
        });
      }
      return jsonResponse(pullResponse());
    });

    await cloudSync.syncCloudData({ ...account, fetcher });

    const pushes = calls.filter(({ init }) => init?.method === 'POST');
    expect(pushes).toHaveLength(2);
    expect(pushes[0]?.init?.body).toBe(pushes[1]?.init?.body);
    expect(JSON.parse(String(pushes[0]?.init?.body))).toEqual({
      operationId: queued!.request.operationId,
      changes: [
        {
          table: 'exercise_definitions',
          operation: 'upsert',
          baseRevision: '0',
          record: {
            id: 'definition-1',
            name: 'Bench press',
          },
        },
      ],
    });
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
    expect(
      await storage.getRecordMetadata('exercise_definitions', 'definition-1', scope),
    ).toMatchObject({ serverRevision: '5', deleted: false });
  });

  it('replaces an operation ID when an acknowledgement rebases its queued payload', async () => {
    const scope = { ownerId: account.ownerId };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [{ id: 'definition-1', name: 'First edit' }],
      scope,
    );
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [{ id: 'definition-1', name: 'Later edit' }],
      scope,
    );
    const before = await storage.getPendingSyncOperations(scope);
    expect(before).toHaveLength(2);
    const pushes: Array<{ operationId: string; baseRevision: string; name: string }> = [];
    const fetcher = makeFetch(async (_input, init) => {
      if (init?.method !== 'POST') return jsonResponse(pullResponse());
      const request = JSON.parse(String(init.body));
      const change = request.changes[0];
      pushes.push({
        operationId: request.operationId,
        baseRevision: change.baseRevision,
        name: change.record.name,
      });
      const revision = pushes.length === 1 ? '5' : '6';
      return jsonResponse({
        operationId: request.operationId,
        changes: [
          {
            table: change.table,
            id: change.record.id,
            revision,
            deletedAt: null,
          },
        ],
      });
    });

    await cloudSync.syncCloudData({ ...account, fetcher });

    expect(pushes[0]).toEqual({
      operationId: before[0]!.request.operationId,
      baseRevision: '0',
      name: 'First edit',
    });
    expect(pushes[1]).toMatchObject({
      baseRevision: '5',
      name: 'Later edit',
    });
    expect(pushes[1]?.operationId).not.toBe(before[1]!.request.operationId);
    expect(pushes[1]?.operationId).not.toBe(pushes[0]?.operationId);
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope),
    ).toEqual([{ id: 'definition-1', name: 'Later edit' }]);
  });

  it('makes no request while signed out, offline, Free, or Premium-expired', async () => {
    const fetcher = makeFetch(async () => {
      throw new Error('fetch must not be called');
    });
    const expiredPremium = isPremiumEntitlementActive(
      {
        userId: account.ownerId,
        premium: true,
        entitlement: { tier: 'premium', validUntil: '2000-01-01T00:00:00.000Z' },
      },
    );

    await cloudSync.syncCloudData({
      ...account,
      ownerId: null,
      fetcher,
    });
    await cloudSync.syncCloudData({ ...account, online: false, fetcher });
    await cloudSync.syncCloudData({ ...account, premiumActive: false, fetcher });
    await cloudSync.syncCloudData({
      ...account,
      premiumActive: expiredPremium,
      fetcher,
    });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it('pulls from the stored cursor and applies tombstones without re-enqueuing them', async () => {
    const scope = { ownerId: account.ownerId };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [
        { id: 'deleted-definition', name: 'Old record' },
        { id: 'local-definition', name: 'Local edit' },
      ],
      scope,
    );
    await storage.setServerCursor('10', scope);
    const fetcher = makeFetch(async (input, init) => {
      expect(new Headers(init?.headers).get('Authorization')).toBe(
        `Bearer ${account.accessToken}`,
      );
      if (init?.method === 'POST') {
        const request = JSON.parse(String(init.body));
        expect(request.changes[0].record.id).toBe('local-definition');
        return jsonResponse({
          operationId: request.operationId,
          changes: [
            {
              table: 'exercise_definitions',
              id: 'local-definition',
              revision: '13',
              deletedAt: null,
            },
          ],
        });
      }

      const url = new URL(String(input));
      expect(url.pathname).toBe('/api/v1/sync/pull');
      expect(url.searchParams.get('cursor')).toBe('10');
      expect(url.searchParams.get('limit')).toBe('500');
      return jsonResponse(
        pullResponse(
          [
            {
              table: 'exercise_definitions',
              id: 'deleted-definition',
              revision: '12',
              deletedAt: '2026-10-07T12:00:00.000Z',
              record: {
                id: 'deleted-definition',
                name: 'Old record',
                created_at: '2026-10-01T00:00:00.000Z',
              },
            },
          ],
          '12',
        ),
      );
    });

    await cloudSync.syncCloudData({ ...account, fetcher });

    expect(await storage.getServerCursor(scope)).toBe('12');
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope)).toEqual([
      { id: 'local-definition', name: 'Local edit' },
    ]);
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
  });

  it('applies remote rows to all six persisted collections', async () => {
    const records = [
      {
        table: 'exercise_definitions',
        id: 'definition-1',
        record: { id: 'definition-1', name: 'Press' },
      },
      {
        table: 'routines',
        id: 'routine-1',
        record: {
          id: 'routine-1',
          name: 'Strength',
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z',
        },
      },
      {
        table: 'routine_exercises',
        id: 'exercise-1',
        record: {
          id: 'exercise-1',
          routine_id: 'routine-1',
          definition_id: 'definition-1',
          name: 'Press',
          position: 0,
        },
      },
      {
        table: 'workout_sets',
        id: 'set-1',
        record: {
          id: 'set-1',
          routine_id: 'routine-1',
          routine_exercise_id: 'exercise-1',
          position: 0,
          reps: 8,
          weight: 50,
          rest_seconds: 60,
        },
      },
      {
        table: 'active_workout_sessions',
        id: 'routine-1',
        record: {
          routine_id: 'routine-1',
          started_at: '2026-10-07T10:00:00.000Z',
        },
      },
      {
        table: 'active_session_completed_sets',
        id: JSON.stringify(['routine-1', 'set-1']),
        record: { routine_id: 'routine-1', set_id: 'set-1' },
      },
      {
        table: 'rm_logs',
        id: 'rm-log-1',
        record: {
          id: 'rm-log-1',
          exercise_name: 'Press',
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z',
        },
      },
      {
        table: 'rm_records',
        id: 'rm-record-1',
        record: {
          id: 'rm-record-1',
          log_id: 'rm-log-1',
          weight: 80,
          recorded_on: '2026-10-07',
        },
      },
      {
        table: 'workout_history',
        id: 'history-1',
        record: {
          id: 'history-1',
          routine_id: 'routine-1',
          routine_name: 'Strength',
          started_at: '2026-10-07T10:00:00.000Z',
          completed_at: '2026-10-07T10:10:00.000Z',
          duration_seconds: 600,
          exercises_completed: 1,
          sets_completed: 2,
          created_at: '2026-10-07T10:10:00.000Z',
          updated_at: '2026-10-07T10:10:00.000Z',
        },
      },
      {
        table: 'workout_history_exercises',
        id: JSON.stringify(['history-1', 0]),
        record: {
          history_id: 'history-1',
          position: 0,
          exercise_name: 'Press',
          exercises_completed: 1,
          sets_completed: 2,
        },
      },
      {
        table: 'exercise_diaries',
        id: 'diary-1',
        record: {
          id: 'diary-1',
          exercise_name: 'Press',
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z',
        },
      },
      {
        table: 'exercise_diary_entries',
        id: 'diary-entry-1',
        record: {
          id: 'diary-entry-1',
          diary_id: 'diary-1',
          recorded_on: '2026-10-07',
          note: 'Good session',
          feeling: 'good',
        },
      },
    ].map((change, index) => ({
      ...change,
      revision: String(index + 1),
      deletedAt: null,
    }));
    const fetcher = makeFetch(async () =>
      jsonResponse(pullResponse(records, '12')),
    );

    await cloudSync.syncCloudData({ ...account, fetcher });

    const scope = { ownerId: account.ownerId };
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope)).toMatchObject([
      { id: 'definition-1', name: 'Press' },
    ]);
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [], scope)).toMatchObject([
      {
        id: 'routine-1',
        name: 'Strength',
        exercises: [
          {
            id: 'exercise-1',
            definitionId: 'definition-1',
            name: 'Press',
            sets: [
              {
                id: 'set-1',
                setNumber: 1,
                reps: 8,
                weight: 50,
                restSeconds: 60,
              },
            ],
          },
        ],
      },
    ]);
    expect(
      await storage.getScopedStoredItem(
        storage.DB_KEYS.ACTIVE_SESSIONS,
        {},
        scope,
      ),
    ).toMatchObject({
      'routine-1': {
        routineId: 'routine-1',
        completedSetIds: ['set-1'],
      },
    });
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.RM_LOGS, [], scope)).toMatchObject([
      {
        id: 'rm-log-1',
        records: [{ id: 'rm-record-1', weight: 80, date: '2026-10-07' }],
      },
    ]);
    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [], scope),
    ).toMatchObject([
      {
        id: 'history-1',
        exercisesSummary: [{ name: 'Press', completedSets: 2, totalSets: 0 }],
      },
    ]);
    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.EXERCISE_DIARY, [], scope),
    ).toMatchObject([
      {
        id: 'diary-1',
        entries: [
          {
            id: 'diary-entry-1',
            date: '2026-10-07',
            note: 'Good session',
            feeling: 'good',
          },
        ],
      },
    ]);
    expect(await storage.getServerCursor(scope)).toBe('12');
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
  });

  it('lets the server win stale conflicts and retains unrelated pending edits', async () => {
    const scope = { ownerId: account.ownerId };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [
        { id: 'conflicting-definition', name: 'This loses' },
        { id: 'unrelated-definition', name: 'Keep this edit' },
      ],
      scope,
    );
    let pullCount = 0;
    const pushedRecords: string[] = [];
    const fetcher = makeFetch(async (_input, init) => {
      if (init?.method === 'POST') {
        const request = JSON.parse(String(init.body));
        const recordId = request.changes[0].record.id as string;
        pushedRecords.push(recordId);
        if (recordId === 'conflicting-definition') {
          return jsonResponse(
            {
              statusCode: 409,
              error: 'Conflict',
              message: 'This sync change conflicts with the current server revision',
              code: 'sync_stale_revision_conflict',
            },
            409,
          );
        }
        return jsonResponse({
          operationId: request.operationId,
          changes: [
            {
              table: 'exercise_definitions',
              id: recordId,
              revision: '8',
              deletedAt: null,
            },
          ],
        });
      }

      pullCount += 1;
      if (pullCount === 1) return jsonResponse(pullResponse());
      return jsonResponse(
        pullResponse(
          [
            {
              table: 'exercise_definitions',
              id: 'conflicting-definition',
              revision: '7',
              deletedAt: null,
              record: {
                id: 'conflicting-definition',
                name: 'Server accepted version',
                created_at: '2026-10-01T00:00:00.000Z',
              },
            },
          ],
          '7',
        ),
      );
    });

    await cloudSync.syncCloudData({ ...account, fetcher });

    expect(pullCount).toBe(2);
    expect(pushedRecords).toEqual([
      'conflicting-definition',
      'unrelated-definition',
    ]);
    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope),
    ).toEqual([
      {
        id: 'conflicting-definition',
        name: 'Server accepted version',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
      { id: 'unrelated-definition', name: 'Keep this edit' },
    ]);
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
  });

  it('surfaces operation-ID payload conflicts without retrying or dropping local data', async () => {
    const scope = { ownerId: account.ownerId };
    const localRecord = { id: 'conflicting-operation', name: 'Local value' };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [localRecord],
      scope,
    );
    const fetcher = makeFetch(async (_input, init) =>
      init?.method === 'POST'
        ? jsonResponse(
            {
              statusCode: 409,
              error: 'Conflict',
              message: 'This operation ID was already used with a different payload',
              code: 'sync_operation_conflict',
            },
            409,
          )
        : jsonResponse(pullResponse()),
    );

    await expect(
      cloudSync.syncCloudData({ ...account, fetcher }),
    ).rejects.toThrow('reused operation ID');

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope),
    ).toEqual([localRecord]);
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(1);
  });

  it('retries pending work when the browser comes online', async () => {
    const target = new EventTarget();
    let online = false;
    let attempts = 0;
    const coordinator = cloudSync.createSyncCoordinator(
      async () => {
        attempts += 1;
      },
      () => online,
      target,
    );

    await coordinator.run();
    expect(attempts).toBe(0);

    online = true;
    target.dispatchEvent(new Event('online'));
    await coordinator.run();
    expect(attempts).toBe(1);

    coordinator.dispose();
  });

  it('coalesces overlapping sync requests into serial coordinator passes', async () => {
    const target = new EventTarget();
    let active = 0;
    let maximumActive = 0;
    const releases: Array<() => void> = [];
    const sync = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          releases.push(() => {
            active -= 1;
            resolve();
          });
        }),
    );
    const coordinator = cloudSync.createSyncCoordinator(
      sync,
      () => true,
      target,
    );

    const first = coordinator.run();
    await Promise.resolve();
    const second = coordinator.run();
    expect(sync).toHaveBeenCalledTimes(1);

    releases[0]!();
    await Promise.resolve();
    await Promise.resolve();
    expect(sync).toHaveBeenCalledTimes(2);
    releases[1]!();
    await Promise.all([first, second]);

    expect(maximumActive).toBe(1);
    coordinator.dispose();
  });

  it('keeps local data and its queued operation after bounded service failures', async () => {
    const scope = { ownerId: account.ownerId };
    const localRecord = { id: 'offline-edit', name: 'Keep me local' };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [localRecord],
      scope,
    );
    const queuedBefore = await storage.getPendingSyncOperations(scope);
    const fetcher = makeFetch(async () => {
      throw new Error('service unavailable');
    });

    await expect(
      cloudSync.syncCloudData({ ...account, fetcher }),
    ).rejects.toThrow();

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(
      await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope),
    ).toEqual([localRecord]);
    expect(await storage.getPendingSyncOperations(scope)).toEqual(queuedBefore);
  });
});
