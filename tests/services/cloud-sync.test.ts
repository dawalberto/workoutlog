import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DbModule = typeof import('../../src/services/db');
type CloudSyncModule = typeof import('../../src/services/cloud-sync');

let indexedDB: IDBFactory;
let storage: DbModule;
let cloudSync: CloudSyncModule;

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

function createClient(
  rows: Record<
    string,
    Array<Record<string, unknown>> | (() => Array<Record<string, unknown>>)
  > = {},
  rpc: ReturnType<typeof vi.fn> = vi.fn(async () => ({
    data: { operationId: 'operation', changes: [] },
    error: null,
  })),
) {
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      gt: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: typeof rows[table] === 'function' ? rows[table]() : rows[table] ?? [],
            error: null,
          })),
        })),
      })),
    })),
  }));
  return { from, rpc };
}

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { indexedDB, localStorage: createLocalStorage() },
  });
  storage = await import('../../src/services/db');
  cloudSync = await import('../../src/services/cloud-sync');
});

afterEach(async () => {
  (await storage.getDatabase()).close();
  Reflect.deleteProperty(globalThis, 'window');
  vi.restoreAllMocks();
});

describe('cloud sync', () => {
  const history = {
    id: 'snapshot', routineId: 'missing-routine', routineName: 'Preserved snapshot',
    startTime: 1700000000000, endTime: 1700000300000,
    completedAt: '2024-01-01T00:05:00.000Z', durationSeconds: 300,
    completedSetsCount: 1, totalSetsCount: 1, completionPercentage: 100,
    exercisesSummary: [{ name: 'Press snapshot', completedSets: 1, totalSets: 1 }],
  };

  function acknowledgingRpc() {
    let revision = 100;
    return vi.fn(async (_name: string, args: Record<string, unknown>) => {
      const change = (args.p_changes as Array<{ table: string; record: Record<string, unknown> }>)[0]!;
      return {
        data: { operationId: args.p_operation_id, changes: [{
          table: change.table,
          id: change.table === 'workout_history_exercises'
            ? JSON.stringify([change.record.history_id, change.record.position])
            : change.record.id,
          revision: String(++revision), deletedAt: null,
        }] },
        error: null,
      };
    });
  }

  it('pushes only the changed record without reads or advancing the download cursor', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setServerCursor('7', scope);
    await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, [{ id: 'edit', name: 'Edited' }], scope);
    const client = createClient({}, acknowledgingRpc());
    await cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never,
      pull: false,
    });
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(await storage.getServerCursor(scope)).toBe('7');
  });

  it('repairs an already queued orphan snapshot only after a definitive FK rejection', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [history], scope);
    const [original] = await storage.getPendingSyncOperations(scope);
    const rpc = acknowledgingRpc();
    rpc.mockImplementationOnce(async () => ({
      data: null as never,
      error: { code: '23503', message: 'foreign key violation' } as never,
    }));
    const client = createClient({}, rpc);
    client.from.mockImplementation((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })),
      })),
    }) as never);
    await cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
    });
    expect(rpc).toHaveBeenCalledTimes(3);
    const repaired = rpc.mock.calls[1]![1];
    expect(repaired.p_operation_id).not.toBe(original!.request.operationId);
    expect(repaired.p_changes).toEqual([{
      ...original!.request.changes[0],
      record: { ...original!.request.changes[0].record, routine_id: null },
    }]);
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [], scope)).toEqual([history]);
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
  });

  it('preserves a valid remote-only routine reference in a snapshot', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [history], scope);
    const rpc = acknowledgingRpc();
    const client = createClient({}, rpc);
    await cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
    });
    expect(client.from).not.toHaveBeenCalled();
    expect(rpc.mock.calls[0]![1].p_changes).toEqual([
      expect.objectContaining({ record: expect.objectContaining({ routine_id: history.routineId }) }),
    ]);
  });

  it('retains an optional reference and its operation identity when the remote parent exists', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [history], scope);
    const original = await storage.getPendingSyncOperations(scope);
    const rpc = vi.fn(async () => ({
      data: null, error: { code: '23503', message: 'foreign key violation' },
    }));
    const client = createClient({}, rpc);
    client.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ limit: async () => ({
        data: [{ id: history.routineId }], error: null,
      }) }) }),
    }) as never);
    await expect(cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
    })).rejects.toThrow('unresolved foreign key');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(await storage.getPendingSyncOperations(scope)).toEqual(original);
  });

  it('does not retry deterministic FK failures or discard required-parent operations', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(storage.DB_KEYS.ACTIVE_SESSIONS, {
      missing: { routineId: 'missing', startTime: 1700000000000, completedSetIds: [] },
    }, scope);
    const rpc = vi.fn(async () => ({ data: null, error: { code: '23503', message: 'foreign key violation' } }));
    const client = createClient({}, rpc);
    await expect(cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
    })).rejects.toThrow('foreign key');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(1);
  });

  it('reports optional-parent lookup errors without changing the rejected queue payload', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [history], scope);
    const original = await storage.getPendingSyncOperations(scope);
    const client = createClient({}, vi.fn(async () => ({
      data: null, error: { code: '23503', message: 'foreign key violation' },
    })));
    client.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ limit: async () => ({
        data: null, error: { message: 'Parent lookup unavailable' },
      }) }) }),
    }) as never);
    await expect(cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
    })).rejects.toThrow('Parent lookup unavailable');
    expect(await storage.getPendingSyncOperations(scope)).toEqual(original);
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [], scope)).toEqual([history]);
  });

  it('bounds continuously arriving edits to three queue drain rounds and retains the remainder', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, [{ id: 'edit', name: 'First' }], scope);
    const rpc = acknowledgingRpc();
    const acknowledge = rpc.getMockImplementation()!;
    let edit = 0;
    rpc.mockImplementation(async (name, args) => {
      await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, [{ id: 'edit', name: `Edit ${++edit}` }], scope);
      return acknowledge(name, args);
    });
    const client = createClient({}, rpc);
    await expect(cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
    })).rejects.toThrow('queue drain rounds');
    expect(rpc).toHaveBeenCalledTimes(3);
    const pending = await storage.getPendingSyncOperations(scope);
    expect(pending).toHaveLength(1);
    expect(pending[0]!.request.changes[0].record.name).toBe('Edit 3');
  });

  it('drains edits arriving while a push is active without a pull', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, [{ id: 'edit', name: 'First' }], scope);
    const rpc = acknowledgingRpc();
    const acknowledge = rpc.getMockImplementation()!;
    rpc.mockImplementationOnce(async (name, args) => {
      await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, [{ id: 'edit', name: 'Second' }], scope);
      return acknowledge(name, args);
    });
    const client = createClient({}, rpc);
    await cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('downloads an unseen revision below a push acknowledgement on the next pull', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, [{ id: 'local', name: 'Local' }], scope);
    const client = createClient({
      routines: [{ id: 'remote', name: 'Other device', server_revision: 50, deleted_at: null }],
    }, acknowledgingRpc());
    await cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
    });
    await cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never,
    });
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [], scope)).toEqual([
      expect.objectContaining({ id: 'remote', name: 'Other device' }),
    ]);
    expect(await storage.getServerCursor(scope, 'routines')).toBe('50');
    expect(await storage.getServerCursor(scope, 'exercise_definitions')).toBe('0');
  });

  it('preserves and rebases edits created while a remote pull is in progress', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.applyRemoteSyncChanges([{
      table: 'exercise_definitions', id: 'edit', revision: '1', deletedAt: null,
      record: { id: 'edit', name: 'Baseline' },
    }], '1', scope);
    const client = createClient({}, acknowledgingRpc());
    const originalFrom = client.from.getMockImplementation()!;
    client.from.mockImplementation((table: string) => {
      if (table !== 'exercise_definitions') return originalFrom(table);
      return { select: () => ({ gt: () => ({ order: () => ({ limit: async () => {
        await storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, [{ id: 'edit', name: 'During pull' }], scope);
        return { data: [{ id: 'edit', name: 'Remote before edit', server_revision: 2, deleted_at: null }], error: null };
      } }) }) }) } as never;
    });
    await cloudSync.syncCloudData({
      ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never,
    });
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope)).toEqual([{ id: 'edit', name: 'During pull' }]);
    expect(client.rpc).toHaveBeenCalledWith('sync_push', expect.objectContaining({
      p_changes: [expect.objectContaining({ baseRevision: '2', record: expect.objectContaining({ name: 'During pull' }) })],
    }));
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
  });

  it.each(['routine_exercises', 'rm_logs', 'exercise_diaries'] as const)(
    'recovers an absent optional catalog reference in %s without dropping snapshots',
    async (table) => {
      const scope = { ownerId: 'owner-1' };
      if (table === 'routine_exercises') {
        await storage.applyRemoteSyncChanges([{
          table: 'routines', id: 'routine', revision: '1', deletedAt: null, record: { id: 'routine', name: 'Routine' },
        }], '1', scope);
        const baseline = await storage.loadScopedAppStorageData(scope);
        await storage.setScopedStoredItem(storage.DB_KEYS.ROUTINES, baseline.routines.map((routine) => ({
          ...routine, exercises: [{ id: 'snapshot', name: 'Snapshot', definitionId: 'missing', sets: [] }],
        })), scope);
      } else {
        await storage.setScopedStoredItem(
          table === 'rm_logs' ? storage.DB_KEYS.RM_LOGS : storage.DB_KEYS.EXERCISE_DIARY,
          [{ id: 'snapshot', exerciseId: 'missing', exerciseName: 'Snapshot', records: [], entries: [] }], scope,
        );
      }
      const rpc = acknowledgingRpc();
      rpc.mockImplementationOnce(async () => ({
        data: null as never, error: { code: '23503', message: 'foreign key violation' } as never,
      }));
      const client = createClient({}, rpc);
      client.from.mockImplementation(() => ({
        select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }),
      }) as never);
      await cloudSync.syncCloudData({
        ownerId: scope.ownerId, syncEnabled: true, online: true, client: client as never, pull: false,
      });
      expect(rpc).toHaveBeenCalledTimes(2);
      expect(rpc.mock.calls[1]![1].p_changes).toEqual([
        expect.objectContaining({ table, record: expect.objectContaining({ definition_id: null }) }),
      ]);
      expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
    },
  );

  it('uses RLS-safe Supabase table reads without issuing HTTP sync requests', async () => {
    const client = createClient({
      exercise_definitions: [
        {
          id: 'definition-1',
          name: 'Press',
          deleted_at: null,
          server_revision: 12,
        },
      ],
    });

    await expect(
      cloudSync.syncCloudData({
        ownerId: 'owner-1',
        syncEnabled: true,
        online: true,
        client: client as never,
      }),
    ).resolves.toEqual({ status: 'synced', pulled: 1, pushed: 0 });

    expect(client.from).toHaveBeenCalledWith('exercise_definitions');
    expect(client.rpc).not.toHaveBeenCalled();
    expect(await storage.getServerCursor({ ownerId: 'owner-1' })).toBe('12');
  });

  it('pushes queued changes with the typed sync_push RPC and acknowledges revisions', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [{ id: 'definition-1', name: 'Bench press' }],
      scope,
    );
    const [queued] = await storage.getPendingSyncOperations(scope);
    const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => ({
      data: {
        operationId: args.p_operation_id,
        changes: [
          {
            table: 'exercise_definitions',
            id: 'definition-1',
            revision: '5',
            deletedAt: null,
          },
        ],
      },
      error: null,
    }));
    const client = createClient({}, rpc);

    await cloudSync.syncCloudData({
      ownerId: scope.ownerId,
      syncEnabled: true,
      online: true,
      client: client as never,
    });

    expect(rpc).toHaveBeenCalledWith('sync_push', {
      p_operation_id: queued!.request.operationId,
      p_changes: queued!.request.changes,
    });
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
    expect(
      await storage.getRecordMetadata('exercise_definitions', 'definition-1', scope),
    ).toMatchObject({ serverRevision: '5', deleted: false });
  });

  it('retains pending operations when sync_push exhausts its retry budget', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [{ id: 'definition-1', name: 'Bench press' }],
      scope,
    );
    const rpc = vi.fn(async () => ({
      data: null,
      error: new Error('RPC unavailable'),
    }));
    const client = createClient({}, rpc);

    await expect(
      cloudSync.syncCloudData({
        ownerId: scope.ownerId,
        syncEnabled: true,
        online: true,
        client: client as never,
      }),
    ).rejects.toThrow('Sync push failed after 3 attempts: RPC unavailable');

    expect(rpc).toHaveBeenCalledTimes(3);
    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(1);
  });

  it('preserves local-only behavior when signed out, offline, unentitled, or unconfigured', async () => {
    const client = createClient();
    for (const options of [
      { ownerId: null, syncEnabled: true, online: true, client },
      { ownerId: 'owner-1', syncEnabled: true, online: false, client },
      { ownerId: 'owner-1', syncEnabled: false, online: true, client },
      { ownerId: 'owner-1', syncEnabled: true, online: true, client: null },
    ]) {
      await expect(cloudSync.syncCloudData(options as never)).resolves.toEqual({
        status: 'skipped',
        pulled: 0,
        pushed: 0,
      });
    }
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('recovers stale revisions by pulling from the beginning before later queued work', async () => {
    const scope = { ownerId: 'owner-1' };
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [{ id: 'conflict', name: 'Local version' }, { id: 'other', name: 'Keep me' }],
      scope,
    );
    let calls = 0;
    const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => {
      calls += 1;
      if (calls === 1) {
        return { data: null, error: new Error('sync_stale_revision_conflict') };
      }
      const change = (args.p_changes as Array<{ record: { id: string } }>)[0]!;
      return {
        data: {
          operationId: args.p_operation_id,
          changes: [{
            table: 'exercise_definitions',
            id: change.record.id,
            revision: String(calls + 5),
            deletedAt: null,
          }],
        },
        error: null,
      };
    });
    let exerciseDefinitionReads = 0;
    const client = createClient({
      exercise_definitions: () => {
        exerciseDefinitionReads += 1;
        return exerciseDefinitionReads === 1
          ? []
          : [{
              id: 'conflict',
              name: 'Server version',
              deleted_at: null,
              server_revision: 4,
            }];
      },
    }, rpc);

    await cloudSync.syncCloudData({
      ownerId: scope.ownerId,
      syncEnabled: true,
      online: true,
      client: client as never,
    });

    expect(await storage.getPendingSyncOperations(scope)).toHaveLength(0);
    expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], scope)).toEqual([
      { id: 'conflict', name: 'Server version' },
      { id: 'other', name: 'Keep me' },
    ]);
  });
});
