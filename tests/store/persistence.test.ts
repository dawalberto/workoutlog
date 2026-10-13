import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../src/store/appStore';
import {
  renderSelectedStoreValue,
  resetAppStore,
  seedAppStore,
  useCurrentStateAsServerSnapshot,
} from '../store-test-utils';
import type { Routine } from '../../src/types';

type StorageModule = typeof import('../../src/services/db');
type PersistenceModule = typeof import('../../src/store/persistence');
type AppStore = ReturnType<typeof createAppStore>;
type AppStorageData = Awaited<ReturnType<StorageModule['initAndMigrateStorage']>>;

let storage: StorageModule;
let persistence: PersistenceModule;
let store: AppStore;
let unsubscribe: (() => void) | undefined;

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

function createRoutine(id: string, name: string): Routine {
  return {
    id,
    name,
    exercises: [],
    createdAt: '2026-10-13T00:00:00.000Z',
    updatedAt: '2026-10-13T00:00:00.000Z',
  };
}

function createStorageData(routines: Routine[] = []): AppStorageData {
  return {
    routines,
    catalog: [],
    activeSessions: {},
    rmLogs: [],
    workoutHistory: [],
    exerciseDiary: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitForHydration(): Promise<void> {
  await vi.waitFor(() => expect(store.getState().isStorageLoaded).toBe(true));
}

beforeEach(async () => {
  vi.resetModules();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      indexedDB: new IDBFactory(),
      localStorage: createLocalStorage(),
    },
  });
  storage = await import('../../src/services/db');
  persistence = await import('../../src/store/persistence');
  store = createAppStore();
  unsubscribe = persistence.startPersistence(store);
});

afterEach(async () => {
  unsubscribe?.();
  if (storage) (await storage.getDatabase()).close();
  Reflect.deleteProperty(globalThis, 'window');
  resetAppStore();
  vi.restoreAllMocks();
});

describe('app store persistence', () => {
  it('handles a cancelled StrictMode-like lifecycle without duplicate persistence', async () => {
    const firstLoad = deferred<AppStorageData>();
    const secondLoad = deferred<AppStorageData>();
    vi.spyOn(storage, 'initAndMigrateStorage')
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    unsubscribe?.();
    const firstUnsubscribe = persistence.startPersistence(store);
    firstUnsubscribe();
    unsubscribe = persistence.startPersistence(store);

    const cancelFirstHydration = persistence.hydrateStorage(store, 'strict-owner');
    cancelFirstHydration();
    const cancelSecondHydration = persistence.hydrateStorage(store, 'strict-owner');

    firstLoad.resolve(createStorageData([createRoutine('stale', 'Stale routine')]));
    secondLoad.resolve(createStorageData([createRoutine('current', 'Current routine')]));
    await waitForHydration();

    expect(store.getState().routines).toEqual([createRoutine('current', 'Current routine')]);

    const setStoredItem = vi.spyOn(storage, 'setScopedStoredItem');
    await storage.flushScopedStorageWrites({ ownerId: 'strict-owner' });
    const pendingBeforeEdit = await storage.getPendingSyncOperations({ ownerId: 'strict-owner' });
    store.getState().setRoutines([
      createRoutine('current', 'Current routine'),
      createRoutine('edited', 'Edited routine'),
    ]);
    await storage.flushScopedStorageWrites({ ownerId: 'strict-owner' });
    const pendingAfterEdit = await storage.getPendingSyncOperations({ ownerId: 'strict-owner' });

    expect(setStoredItem).toHaveBeenCalledTimes(1);
    expect(pendingAfterEdit).toHaveLength(pendingBeforeEdit.length + 1);
    expect(
      pendingAfterEdit.flatMap((operation) => operation.request.changes)
        .filter((change) => change.record.id === 'edited'),
    ).toHaveLength(1);

    cancelSecondHydration();
  });

  it('ignores a cancelled guest hydration after switching to an owner scope', async () => {
    const guestLoad = deferred<AppStorageData>();
    const ownerLoad = deferred<AppStorageData>();
    vi.spyOn(storage, 'initAndMigrateStorage')
      .mockReturnValueOnce(guestLoad.promise)
      .mockReturnValueOnce(ownerLoad.promise);

    const cancelGuestHydration = persistence.hydrateStorage(store);
    cancelGuestHydration();
    const cancelOwnerHydration = persistence.hydrateStorage(store, 'owner-x');

    guestLoad.resolve(createStorageData([createRoutine('guest-stale', 'Guest stale routine')]));
    await guestLoad.promise;
    expect(store.getState().isStorageLoaded).toBe(false);
    expect(store.getState().routines).toEqual([]);

    ownerLoad.resolve(createStorageData([createRoutine('owner-current', 'Owner routine')]));
    await waitForHydration();

    expect(store.getState().routines).toEqual([
      createRoutine('owner-current', 'Owner routine'),
    ]);

    store.getState().setRoutines([createRoutine('owner-edit', 'Owner edit')]);
    await storage.flushScopedStorageWrites({ ownerId: 'owner-x' });

    expect(
      (await storage.loadScopedAppStorageData({ ownerId: 'owner-x' })).routines,
    ).toEqual([createRoutine('owner-edit', 'Owner edit')]);
    expect((await storage.loadScopedAppStorageData()).routines).toEqual([]);
    expect(await storage.getPendingSyncOperations()).toEqual([]);
    expect(
      (await storage.getPendingSyncOperations({ ownerId: 'owner-x' }))
        .flatMap((operation) => operation.request.changes)
        .filter((change) => change.record.id === 'owner-edit'),
    ).toHaveLength(1);

    cancelOwnerHydration();
  });

  it('does not write changes before the current scope hydrates', async () => {
    store.getState().setRoutines([createRoutine('premature', 'Premature')]);

    await storage.flushScopedStorageWrites(storage.GUEST_STORAGE_SCOPE);

    expect(await storage.loadScopedAppStorageData()).toMatchObject({ routines: [] });
    expect(await storage.getPendingSyncOperations()).toEqual([]);
  });

  it('persists a hydrated collection and enqueues its scoped outbox change', async () => {
    const cancelHydration = persistence.hydrateStorage(store);
    await waitForHydration();

    store.getState().setCatalog([{ id: 'definition-1', name: 'Sentadilla' }]);
    await storage.flushScopedStorageWrites();

    expect(await storage.loadScopedAppStorageData()).toMatchObject({
      catalog: [{ id: 'definition-1', name: 'Sentadilla' }],
    });
    expect(
      (await storage.getPendingSyncOperations()).some((operation) =>
        operation.request.changes.some(
          (change) =>
            change.table === 'exercise_definitions' &&
            change.record.id === 'definition-1',
        ),
      ),
    ).toBe(true);

    cancelHydration();
  });

  it('transfers guest data to the owner scope without cross-scope persistence', async () => {
    const cancelGuestHydration = persistence.hydrateStorage(store);
    await waitForHydration();
    store.getState().setRoutines([createRoutine('guest-routine', 'Guest routine')]);
    await storage.flushScopedStorageWrites();
    cancelGuestHydration();

    const cancelOwnerHydration = persistence.hydrateStorage(store, 'owner@example.test', true);
    expect(store.getState().isStorageLoaded).toBe(false);
    expect(store.getState().routines).toEqual([]);
    await waitForHydration();
    await storage.flushScopedStorageWrites({ ownerId: 'owner@example.test' });

    expect(
      (await storage.loadScopedAppStorageData({ ownerId: 'owner@example.test' })).routines,
    ).toEqual([createRoutine('guest-routine', 'Guest routine')]);
    expect((await storage.loadScopedAppStorageData()).routines).toEqual([]);
    expect(
      (await storage.getPendingSyncOperations({ ownerId: 'owner@example.test' })).some(
        (operation) => operation.request.changes.some(
          (change) => change.record.id === 'guest-routine',
        ),
      ),
    ).toBe(true);
    expect(store.getState().isGuestTransferComplete).toBe(true);

    cancelOwnerHydration();
  });

  it('keeps transfer failures visible while allowing owner hydration to finish', async () => {
    vi.spyOn(storage, 'transferGuestDataToOwnerOnce').mockRejectedValue(
      new Error('Guest transfer failed'),
    );
    const cancelHydration = persistence.hydrateStorage(store, 'failed-owner', true);

    await waitForHydration();

    expect(store.getState().isGuestTransferComplete).toBe(false);
    expect(store.getState().storageError).toBe('Guest transfer failed');
    cancelHydration();
  });

  it('preserves collection edits made while sync refresh reads are pending', async () => {
    const cancelHydration = persistence.hydrateStorage(store, 'refresh-owner');
    await waitForHydration();

    const baseline = [createRoutine('routine-1', 'Before refresh')];
    store.getState().setRoutines(baseline);
    await storage.flushScopedStorageWrites({ ownerId: 'refresh-owner' });

    let resolveLoad!: (value: Awaited<ReturnType<StorageModule['loadScopedAppStorageData']>>) => void;
    vi.spyOn(storage, 'loadScopedAppStorageData').mockImplementation(
      () => new Promise((resolve) => { resolveLoad = resolve; }),
    );
    const refresh = persistence.refreshFromStorage(store, 'refresh-owner');
    await vi.waitFor(() => expect(resolveLoad).toBeTypeOf('function'));

    store.getState().setRoutines([createRoutine('routine-1', 'Edited during refresh')]);
    resolveLoad({
      routines: [createRoutine('routine-1', 'Remote value'), createRoutine('routine-2', 'Remote addition')],
      catalog: [],
      activeSessions: {},
      rmLogs: [],
      workoutHistory: [],
      exerciseDiary: [],
    });
    await refresh;

    expect(store.getState().routines).toEqual([
      createRoutine('routine-1', 'Edited during refresh'),
      createRoutine('routine-2', 'Remote addition'),
    ]);

    cancelHydration();
  });

  it('does not apply a pending refresh after switching owner scopes', async () => {
    await storage.setScopedStoredItem(
      storage.DB_KEYS.ROUTINES,
      [createRoutine('owner-y', 'Owner Y routine')],
      { ownerId: 'owner-y' },
    );
    await storage.flushScopedStorageWrites({ ownerId: 'owner-y' });

    const cancelOwnerXHydration = persistence.hydrateStorage(store, 'owner-x');
    await waitForHydration();
    store.getState().setRoutines([createRoutine('owner-x', 'Owner X routine')]);
    await storage.flushScopedStorageWrites({ ownerId: 'owner-x' });

    const pendingRefresh = deferred<AppStorageData>();
    const loadStorage = vi.spyOn(storage, 'loadScopedAppStorageData')
      .mockReturnValue(pendingRefresh.promise);
    const refresh = persistence.refreshFromStorage(store, 'owner-x');
    await vi.waitFor(() => expect(loadStorage).toHaveBeenCalledOnce());

    const cancelOwnerYHydration = persistence.hydrateStorage(store, 'owner-y');
    await waitForHydration();
    expect(store.getState().routines).toEqual([createRoutine('owner-y', 'Owner Y routine')]);

    pendingRefresh.resolve(createStorageData([
      createRoutine('owner-x-remote', 'Owner X remote routine'),
    ]));
    await refresh;

    expect(store.getState().routines).toEqual([createRoutine('owner-y', 'Owner Y routine')]);

    cancelOwnerXHydration();
    cancelOwnerYHydration();
  });

  it('applies backup collections through the scoped persistence subscription', async () => {
    const cancelHydration = persistence.hydrateStorage(store, 'import-owner');
    await waitForHydration();
    const importedRoutine = createRoutine('import-routine', 'Imported routine');

    persistence.applyImportData(
      store,
      [{ id: 'import-definition', name: 'Imported exercise' }],
      [importedRoutine],
      [{ id: 'import-rm', exerciseName: 'Imported exercise', records: [], createdAt: '2026-10-13', updatedAt: '2026-10-13' }],
      [],
      [],
    );
    await storage.flushScopedStorageWrites({ ownerId: 'import-owner' });

    const imported = await storage.loadScopedAppStorageData({ ownerId: 'import-owner' });
    expect(imported.catalog).toEqual([{ id: 'import-definition', name: 'Imported exercise' }]);
    expect(imported.routines).toEqual([importedRoutine]);
    expect(imported.rmLogs).toHaveLength(1);
    expect(
      (await storage.getPendingSyncOperations({ ownerId: 'import-owner' })).some(
        (operation) => operation.request.changes.some(
          (change) => change.record.id === 'import-definition',
        ),
      ),
    ).toBe(true);

    cancelHydration();
  });

  it('writes once for each changed collection and does not write unchanged collections', async () => {
    const setStoredItem = vi.spyOn(storage, 'setScopedStoredItem');
    const cancelHydration = persistence.hydrateStorage(store, 'write-owner');
    await waitForHydration();
    setStoredItem.mockClear();

    store.setState({
      catalog: [{ id: 'definition-2', name: 'Press banca' }],
      rmLogs: [{
        id: 'rm-2',
        exerciseName: 'Press banca',
        records: [],
        createdAt: '2026-10-13',
        updatedAt: '2026-10-13',
      }],
    });

    expect(setStoredItem).toHaveBeenCalledTimes(2);
    expect(setStoredItem.mock.calls.map(([key]) => key).sort()).toEqual([
      storage.DB_KEYS.CATALOG,
      storage.DB_KEYS.RM_LOGS,
    ]);
    expect(setStoredItem.mock.calls.every(([, , scope]) =>
      scope !== undefined && scope !== storage.GUEST_STORAGE_SCOPE && scope.ownerId === 'write-owner',
    )).toBe(true);

    cancelHydration();
  });

  it('renders seeded singleton state with the Zustand 5 server snapshot', () => {
    seedAppStore({ routines: [createRoutine('seeded', 'Seeded routine')] });
    useCurrentStateAsServerSnapshot();

    const html = renderSelectedStoreValue((state) => state.routines[0]?.name ?? '');
    expect(html).toBe('<span>Seeded routine</span>');
  });
});
