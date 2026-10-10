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
        premiumActive: true,
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
      premiumActive: true,
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

  it('preserves local-only behavior when signed out, offline, unentitled, or unconfigured', async () => {
    const client = createClient();
    for (const options of [
      { ownerId: null, premiumActive: true, online: true, client },
      { ownerId: 'owner-1', premiumActive: true, online: false, client },
      { ownerId: 'owner-1', premiumActive: false, online: true, client },
      { ownerId: 'owner-1', premiumActive: true, online: true, client: null },
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
      premiumActive: true,
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
