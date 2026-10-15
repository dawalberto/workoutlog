import React, { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from '../src/components/AppHeader';
import { SyncStatus } from '../src/components/SyncStatus';
import type { UseSyncOptions } from '../src/hooks/useSync';

type HookHarness = ReturnType<typeof createHookHarness>;

let activeHarness: HookHarness | null = null;

function createHookHarness() {
  const slots: Array<{
    value?: unknown;
    deps?: readonly unknown[];
    cleanup?: () => void;
    initialized?: boolean;
  }> = [];
  const pendingEffects: Array<{
    index: number;
    callback: () => void | (() => void);
  }> = [];
  let cursor = 0;

  const harness = {
    slots,
    render<T>(callback: () => T): T {
      cursor = 0;
      activeHarness = harness;
      try {
        return callback();
      } finally {
        activeHarness = null;
      }
    },
    useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void] {
      const index = cursor++;
      const slot = (slots[index] ??= {});
      if (!slot.initialized) {
        slot.value = typeof initial === 'function'
          ? (initial as () => T)()
          : initial;
        slot.initialized = true;
      }
      return [
        slot.value as T,
        (next) => {
          slot.value = typeof next === 'function'
            ? (next as (previous: T) => T)(slot.value as T)
            : next;
        },
      ];
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      const slot = (slots[index] ??= {});
      if (!slot.initialized) {
        slot.value = { current: initial };
        slot.initialized = true;
      }
      return slot.value as { current: T };
    },
    useMemo<T>(factory: () => T, deps: readonly unknown[]) {
      const index = cursor++;
      const slot = (slots[index] ??= {});
      if (
        !slot.initialized ||
        !slot.deps ||
        deps.some((value, depIndex) => !Object.is(value, slot.deps?.[depIndex]))
      ) {
        slot.value = factory();
        slot.deps = deps;
        slot.initialized = true;
      }
      return slot.value as T;
    },
    useEffect(callback: () => void | (() => void), deps?: readonly unknown[]) {
      const index = cursor++;
      const slot = (slots[index] ??= {});
      const changed =
        deps === undefined ||
        !slot.initialized ||
        !slot.deps ||
        deps.some((value, depIndex) => !Object.is(value, slot.deps?.[depIndex]));
      if (changed) {
        pendingEffects.push({ index, callback });
        slot.deps = deps;
        slot.initialized = true;
      }
    },
    async runEffects() {
      while (pendingEffects.length > 0) {
        const effects = pendingEffects.splice(0);
        for (const effect of effects) {
          const slot = slots[effect.index]!;
          slot.cleanup?.();
          const cleanup = effect.callback();
          slot.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
        }
      }
    },
    dispose() {
      slots.forEach((slot) => slot.cleanup?.());
    },
  };
  return harness;
}

function findElement(
  node: ReactNode,
  predicate: (element: React.ReactElement<TestElementProps>) => boolean,
): React.ReactElement<TestElementProps> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return undefined;
  }
  if (!isValidElement<TestElementProps>(node)) return undefined;
  if (predicate(node)) return node;
  return findElement(node.props.children as ReactNode, predicate);
}

interface TestElementProps {
  children?: ReactNode;
  id?: string;
  onChange?: () => void;
  onClick?: () => void;
}

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

function mockSyncStore(): void {
  const state = {
    publishSyncState: vi.fn(),
    registerSyncControls: vi.fn(),
  };
  vi.doMock('../src/store/appStore', () => ({
    useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
  }));
}

function createBaseline() {
  return {
    catalog: [{ id: 'old-definition', name: 'Existing exercise' }],
    routines: [
      {
        id: 'old-routine',
        name: 'Existing routine',
        exercises: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    activeSessions: {
      'old-routine': {
        routineId: 'old-routine',
        startTime: 1700000000000,
        completedSetIds: ['old-set'],
      },
    },
    rmLogs: [
      {
        id: 'old-rm',
        exerciseName: 'Existing exercise',
        records: [{ id: 'old-rm-record', weight: 40, date: '2024-01-01' }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    workoutHistory: [
      {
        id: 'old-history',
        routineId: 'old-routine',
        routineName: 'Existing routine snapshot',
        startTime: 1700000000000,
        endTime: 1700000300000,
        completedAt: '2024-01-01T00:05:00.000Z',
        durationSeconds: 300,
        completedSetsCount: 1,
        totalSetsCount: null,
        completionPercentage: null,
        exercisesSummary: [{ name: 'Existing exercise', completedSets: 1, totalSets: null }],
      },
    ],
    exerciseDiary: [
      {
        id: 'old-diary',
        exerciseName: 'Existing exercise',
        entries: [{ id: 'old-entry', date: '2024-01-01', note: 'Existing note' }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  };
}

function createBackupJson() {
  return JSON.stringify({
    app: 'WorkoutLog',
    version: 1,
    exportedAt: '2024-01-02T00:00:00.000Z',
    type: 'all',
    catalog: [{ id: 'import-definition', name: 'Imported exercise' }],
    routines: [
      {
        id: 'import-routine',
        name: 'Imported routine',
        exercises: [
          {
            id: 'import-exercise-snapshot',
            definitionId: 'import-definition',
            name: 'Imported exercise',
            sets: [
              {
                id: 'import-set',
                setNumber: 1,
                reps: 8,
                weight: 30,
                restSeconds: 60,
              },
            ],
          },
        ],
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ],
    rmLogs: [
      {
        id: 'import-rm',
        exerciseName: 'Imported RM exercise',
        records: [{ id: 'import-rm-record', weight: 50, date: '2024-01-02' }],
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ],
    workoutHistory: [
      {
        id: 'import-history',
        routineId: 'import-routine',
        routineName: 'Imported routine snapshot',
        startTime: 1700000000000,
        endTime: 1700000300000,
        completedAt: '2024-01-02T00:05:00.000Z',
        durationSeconds: 300,
        completedSetsCount: 1,
        totalSetsCount: null,
        completionPercentage: null,
        exercisesSummary: [{ name: 'Imported exercise', completedSets: 1, totalSets: null }],
      },
    ],
    exerciseDiary: [
      {
        id: 'import-diary',
        exerciseName: 'Imported exercise',
        entries: [{ id: 'import-entry', date: '2024-01-02', note: 'Imported note' }],
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ],
  });
}

describe('sync wiring', () => {
  let indexedDB: IDBFactory;
  let storage: typeof import('../src/services/db');

  beforeEach(async () => {
    vi.resetModules();
    indexedDB = new IDBFactory();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { indexedDB, localStorage: createLocalStorage() },
    });
  });

  afterEach(async () => {
    if (storage) (await storage.getDatabase()).close();
    Reflect.deleteProperty(globalThis, 'window');
    vi.doUnmock('react');
    vi.doUnmock('../src/store/appStore');
    vi.doUnmock('../src/store/persistence');
    vi.doUnmock('zustand/react/shallow');
    vi.restoreAllMocks();
  });

  it('defers guest hydration until initial authentication is resolved', async () => {
    const harness = createHookHarness();
    const store = {};
    const startPersistence = vi.fn(() => vi.fn());
    const hydrateStorage = vi.fn(() => vi.fn());

    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        useEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) =>
          activeHarness!.useEffect(callback, deps),
      };
    });
    vi.doMock('../src/store/appStore', () => ({ appStore: store }));
    vi.doMock('../src/store/persistence', () => ({
      hydrateStorage,
      startPersistence,
    }));

    const { useStorageLifecycle } = await import('../src/hooks/useStorageLifecycle');
    const render = (authResolved: boolean) =>
      harness.render(() => useStorageLifecycle(undefined, false, authResolved));

    render(false);
    await harness.runEffects();
    expect(startPersistence).toHaveBeenCalledOnce();
    expect(hydrateStorage).not.toHaveBeenCalled();

    render(true);
    await harness.runEffects();
    expect(hydrateStorage).toHaveBeenCalledOnce();
    expect(hydrateStorage).toHaveBeenCalledWith(store, undefined, false);
    harness.dispose();
  });

  it.each(['merge', 'overwrite'] as const)(
    'persists a confirmed %s backup through the owner-scoped outbox',
    async (mode) => {
      const hookHarness = createHookHarness();
      vi.doMock('react', async (importOriginal) => {
        const actual = await importOriginal<typeof import('react')>();
        return {
          ...actual,
          useState: (initial: unknown) => activeHarness!.useState(initial),
          useRef: (initial: unknown) => activeHarness!.useRef(initial),
          useMemo: (factory: () => unknown, deps: readonly unknown[]) =>
            activeHarness!.useMemo(factory, deps),
          useCallback: (callback: (...args: never[]) => unknown, deps: readonly unknown[]) =>
            activeHarness!.useMemo(() => callback, deps),
          useEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) =>
            activeHarness!.useEffect(callback, deps),
          useLayoutEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) =>
            activeHarness!.useEffect(callback, deps),
        };
      });

      storage = await import('../src/services/db');
      const backup = await import('../src/utils/backup');
      const storeModule = await import('../src/store/appStore');
      const { appStore } = storeModule;
      const persistence = await import('../src/store/persistence');
      vi.doMock('../src/store/appStore', () => ({
        ...storeModule,
        useAppStore: (selector: (state: ReturnType<typeof appStore.getState>) => unknown) =>
          selector(appStore.getState()),
      }));
      vi.doMock('zustand/react/shallow', () => ({
        useShallow: (selector: unknown) => selector,
      }));
      const { DataBackupModal } = await import('../src/components/DataBackupModal');
      const ownerScope = { ownerId: 'import-owner' };
      const baseline = createBaseline();

      await Promise.all([
        storage.setScopedStoredItem(storage.DB_KEYS.CATALOG, baseline.catalog, ownerScope),
        storage.setScopedStoredItem(storage.DB_KEYS.ROUTINES, baseline.routines, ownerScope),
        storage.setScopedStoredItem(storage.DB_KEYS.ACTIVE_SESSIONS, baseline.activeSessions, ownerScope),
        storage.setScopedStoredItem(storage.DB_KEYS.RM_LOGS, baseline.rmLogs, ownerScope),
        storage.setScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, baseline.workoutHistory, ownerScope),
        storage.setScopedStoredItem(storage.DB_KEYS.EXERCISE_DIARY, baseline.exerciseDiary, ownerScope),
      ]);

      const stopPersistence = persistence.startPersistence(appStore);
      const stopHydration = persistence.hydrateStorage(appStore, 'import-owner', false);
      await vi.waitFor(() => expect(appStore.getState().isStorageLoaded).toBe(true));
      appStore.setState({ isBackupModalOpen: true, isSyncEnabled: true });
      await storage.flushScopedStorageWrites(ownerScope);

      const modalHarness = createHookHarness();
      const parsedData = backup.parseImportedData(createBackupJson());
      modalHarness.slots[0] = { value: 'import', initialized: true };
      modalHarness.slots[1] = {
        value: { name: 'backup.json' } as File,
        initialized: true,
      };
      modalHarness.slots[2] = { value: parsedData, initialized: true };
      modalHarness.slots[4] = { value: mode, initialized: true };

      const renderModal = async () =>
        await modalHarness.render(() => DataBackupModal({}));
      let modal = await renderModal();
      if (mode === 'overwrite') {
        findElement(modal, (element) => element.props.id === 'radio-import-overwrite')
          ?.props.onChange?.();
        modal = await renderModal();
      }
      findElement(modal, (element) => element.props.id === 'btn-confirm-import')
        ?.props.onClick?.();

      await storage.flushScopedStorageWrites(ownerScope);
      stopHydration();
      stopPersistence();

      const operations = await storage.getPendingSyncOperations(ownerScope);
      const changes = operations.flatMap((operation) => operation.request.changes);
      const hasUpsert = (id: string) =>
        changes.some(
          (change) =>
            change.operation === 'upsert' &&
            'id' in change.record &&
            change.record.id === id,
        );
      const hasDelete = (table: string, id: string) =>
        changes.some(
          (change) =>
            change.table === table &&
            change.operation === 'delete' &&
            change.record.id === id,
        );
      const hasUpsertInTable = (table: string) =>
        changes.some(
          (change) => change.table === table && change.operation === 'upsert',
        );

      expect(hasUpsert('import-definition')).toBe(true);
      expect(hasUpsert('import-routine')).toBe(true);
      expect(hasUpsert('import-history')).toBe(true);
      expect(hasUpsertInTable('exercise_definitions')).toBe(true);
      expect(hasUpsertInTable('routines')).toBe(true);
      expect(hasUpsertInTable('active_workout_sessions')).toBe(true);
      expect(hasUpsertInTable('rm_logs')).toBe(true);
      expect(hasUpsertInTable('workout_history')).toBe(true);
      expect(hasUpsertInTable('exercise_diaries')).toBe(true);
      expect(hasUpsertInTable('routine_exercises')).toBe(true);
      expect(hasUpsertInTable('workout_sets')).toBe(true);
      expect(
        changes.some(
          (change) =>
            change.table === 'workout_sets' &&
            change.operation === 'upsert' &&
            change.record.reps === 8 &&
            change.record.weight === 30 &&
            change.record.rest_seconds === 60,
        ),
      ).toBe(true);
      expect(
        changes.some(
          (change) =>
            change.table === 'rm_logs' &&
            change.operation === 'upsert' &&
            'exercise_name' in change.record &&
            change.record.exercise_name === 'Imported RM exercise',
        ),
      ).toBe(true);
      expect(
        changes.some(
          (change) =>
            change.table === 'exercise_diaries' &&
            change.operation === 'upsert' &&
            'exercise_name' in change.record &&
            change.record.exercise_name === 'Imported exercise',
        ),
      ).toBe(true);
      expect(
        changes.some(
          (change) =>
            change.table === 'active_workout_sessions' &&
            change.operation === 'delete' &&
            change.record.id === 'old-routine',
        ),
      ).toBe(false);

      if (mode === 'overwrite') {
        expect(hasDelete('exercise_definitions', 'old-definition')).toBe(true);
        expect(hasDelete('routines', 'old-routine')).toBe(true);
        expect(hasDelete('rm_logs', 'old-rm')).toBe(true);
        expect(hasDelete('workout_history', 'old-history')).toBe(true);
        expect(hasDelete('exercise_diaries', 'old-diary')).toBe(true);
        expect(await storage.getScopedStoredItem(storage.DB_KEYS.ACTIVE_SESSIONS, {}, ownerScope))
          .toEqual(baseline.activeSessions);
        expect(
          changes.some(
            (change) =>
              change.table === 'active_workout_sessions' &&
              change.operation === 'delete',
          ),
        ).toBe(false);
      }

      expect(await storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], ownerScope))
        .toEqual(mode === 'overwrite' ? parsedData.catalog : expect.arrayContaining(parsedData.catalog));
      const storedRoutines = await storage.getScopedStoredItem(
        storage.DB_KEYS.ROUTINES,
        appStore.getState().routines,
        ownerScope,
      );
      expect(storedRoutines)
        .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'import-routine' })]));
      const importedRoutine = storedRoutines.find((routine) => routine.id === 'import-routine');
      expect(importedRoutine?.exercises[0]?.sets[0]).toMatchObject({
        id: mode === 'overwrite' ? 'import-set' : expect.any(String),
        setNumber: 1,
        reps: 8,
        weight: 30,
        restSeconds: 60,
      });
      expect(await storage.getScopedStoredItem(storage.DB_KEYS.RM_LOGS, [], ownerScope))
        .toEqual(expect.arrayContaining([expect.objectContaining({ exerciseName: 'Imported RM exercise' })]));
      expect(await storage.getScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [], ownerScope))
        .toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: 'import-history',
            completionPercentage: null,
            totalSetsCount: null,
          }),
        ]));
      expect(await storage.getScopedStoredItem(storage.DB_KEYS.EXERCISE_DIARY, [], ownerScope))
        .toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: mode === 'overwrite' ? 'import-diary' : expect.any(String),
            exerciseName: 'Imported exercise',
            entries: expect.arrayContaining([
              expect.objectContaining({ id: 'import-entry' }),
            ]),
          }),
        ]));
    },
  );

  it('shows offline, successful, and failed sync as distinct user-visible states', () => {
    const renderStatus = (props: React.ComponentProps<typeof SyncStatus>) =>
      renderToStaticMarkup(<SyncStatus {...props} />);
    const base = {
      isSyncEnabled: true,
      pendingChanges: 0,
      onRetry: vi.fn(),
    };
    const offline = renderStatus({
      ...base,
      isOnline: false,
      status: { state: 'idle', error: null, lastSyncedAt: null },
    });
    const synced = renderStatus({
      ...base,
      isOnline: true,
      status: { state: 'synced', error: null, lastSyncedAt: 1 },
    });
    const failed = renderStatus({
      ...base,
      isOnline: true,
      status: { state: 'error', error: 'Network unavailable', lastSyncedAt: null },
    });
    const localOnly = renderStatus({
      ...base,
      isSyncEnabled: false,
      isOnline: true,
      status: { state: 'idle', error: null, lastSyncedAt: null },
    });
    const pending = renderStatus({
      ...base,
      isOnline: true,
      pendingChanges: 2,
      status: { state: 'idle', error: null, lastSyncedAt: null },
    });
    const syncing = renderStatus({
      ...base,
      isOnline: true,
      status: { state: 'syncing', error: null, lastSyncedAt: null },
    });
    expect(localOnly).toContain('Solo en este dispositivo');
    expect(localOnly).toContain('Tus datos se guardan solo en este dispositivo.');
    expect(localOnly).not.toContain(['Pre', 'mium'].join(''));
    const header = renderToStaticMarkup(<AppHeader />);
    expect(header).not.toContain(['Pre', 'mium'].join(''));
    expect(offline).toContain('Sin conexión');
    expect(offline).toContain('Tus datos locales están a salvo');
    expect(pending).toContain('Cambios pendientes');
    expect(syncing).toContain('Sincronizando');
    expect(synced).toContain('Sincronizado');
    expect(failed).toContain('Error de sincronización');
    expect(failed).toContain('Reintentar');
    expect(failed).not.toContain('Sincronizado');
  });

  it('runs the retry action from a recoverable sync error', async () => {
    const onRetry = vi.fn();
    const errorStatus = await SyncStatus({
      isSyncEnabled: true,
      isOnline: true,
      pendingChanges: 1,
      status: { state: 'error', error: 'Network unavailable', lastSyncedAt: null },
      onRetry,
    });
    const retry = findElement(errorStatus, (element) => element.type === 'button');

    retry?.props.onClick?.();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows an update-required notice and runs the app update action', async () => {
    const onUpdate = vi.fn();
    const updateRequired = await SyncStatus({
      isSyncEnabled: true,
      isOnline: true,
      pendingChanges: 1,
      status: {
        state: 'error',
        error: 'sync_contract_version_unsupported',
        lastSyncedAt: null,
        updateRequired: true,
      },
      onRetry: vi.fn(),
      onUpdate,
    });
    const markup = renderToStaticMarkup(updateRequired);
    const updateButton = findElement(updateRequired, (element) => element.type === 'button');

    expect(markup).toContain('Actualiza la app para continuar sincronizando.');
    expect(markup).toContain('Actualizar');
    expect(markup).toContain('min-h-[48px]');
    updateButton?.props.onClick?.();
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('sets update-required status and does not retry the blocked owner', async () => {
    const hookHarness = createHookHarness();
    const queued = {
      request: {
        operationId: 'pending-operation',
        changes: [{ table: 'exercise_definitions', operation: 'upsert' }],
      },
    };
    const updateError = Object.assign(
      new Error('sync_contract_version_unsupported'),
      { updateRequired: true },
    );
    const syncCloudData = vi.fn(async () => {
      throw updateError;
    });
    vi.doMock('react', async (importOriginal) => ({
      ...await importOriginal<typeof import('react')>(),
      useState: (initial: unknown) => activeHarness!.useState(initial),
      useRef: (initial: unknown) => activeHarness!.useRef(initial),
      useMemo: (factory: () => unknown, deps: readonly unknown[]) =>
        activeHarness!.useMemo(factory, deps),
      useCallback: (callback: (...args: never[]) => unknown, deps: readonly unknown[]) =>
        activeHarness!.useMemo(() => callback, deps),
      useEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) =>
        activeHarness!.useEffect(callback, deps),
      useLayoutEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) =>
        activeHarness!.useEffect(callback, deps),
    }));
    vi.doMock('../src/services/db', () => ({
      flushScopedStorageWrites: vi.fn(async () => undefined),
      getPendingSyncOperations: vi.fn(async () => [queued]),
    }));
    vi.doMock('../src/services/cloud-sync', () => ({
      createSyncCoordinator: (run: () => Promise<void>) => ({
        run,
        dispose: vi.fn(),
      }),
      syncCloudData,
    }));
    vi.doMock('../src/services/supabase', () => ({
      getSupabaseBrowserClient: () => ({
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: 'owner-1' } } },
            error: null,
          }),
        },
      }),
    }));
    Object.assign(window, {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    mockSyncStore();
    const { useSync } = await import('../src/hooks/useSync');
    const options: UseSyncOptions = {
      ownerId: 'owner-1',
      syncEnabled: true,
      isStorageLoaded: true,
      isOwnerHydrationComplete: true,
      onSynced: vi.fn(async () => undefined),
      routines: [],
      catalog: [],
      activeSessions: {},
      rmLogs: [],
      workoutHistory: [],
      exerciseDiary: [],
    };
    const render = () => hookHarness.render(() => useSync(options));

    render();
    await hookHarness.runEffects();
    for (let attempt = 0; attempt < 20; attempt += 1) await Promise.resolve();

    expect(render().status).toMatchObject({
      state: 'error',
      updateRequired: true,
      error: 'sync_contract_version_unsupported',
    });
    expect(render().pendingChanges).toBe(1);
    render().retry();
    for (let attempt = 0; attempt < 5; attempt += 1) await Promise.resolve();
    expect(syncCloudData).toHaveBeenCalledOnce();
    hookHarness.dispose();
  });

  it('does not restart a failed sync when storage refreshes collections', async () => {
    const hookHarness = createHookHarness();
    const pendingOperation = {
      request: {
        operationId: 'failed-operation',
        changes: [{ table: 'exercise_definitions', operation: 'upsert' }],
      },
    };
    const syncCloudData = vi.fn(async (): Promise<{
      status: 'synced';
      pulled: number;
      pushed: number;
    }> => {
      throw new Error('RPC unavailable');
    });

    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        useState: (initial: unknown) => activeHarness!.useState(initial),
        useRef: (initial: unknown) => activeHarness!.useRef(initial),
        useMemo: (factory: () => unknown, deps: readonly unknown[]) =>
          activeHarness!.useMemo(factory, deps),
        useCallback: (callback: (...args: never[]) => unknown, deps: readonly unknown[]) =>
          activeHarness!.useMemo(() => callback, deps),
        useEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) =>
          activeHarness!.useEffect(callback, deps),
        useLayoutEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) =>
          activeHarness!.useEffect(callback, deps),
      };
    });
    vi.doMock('../src/services/db', () => ({
      flushScopedStorageWrites: vi.fn(async () => undefined),
      getPendingSyncOperations: vi.fn(async () => [pendingOperation]),
    }));
    vi.doMock('../src/services/cloud-sync', () => ({
      createSyncCoordinator: (sync: () => Promise<void>) => ({
        run: sync,
        dispose: vi.fn(),
      }),
      syncCloudData,
    }));
    vi.doMock('../src/services/supabase', () => ({
      getSupabaseBrowserClient: () => ({
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: 'owner-1' } } },
            error: null,
          }),
        },
      }),
    }));
    Object.assign(window, {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    mockSyncStore();
    const { useSync } = await import('../src/hooks/useSync');
    type SyncCollections = Pick<
      UseSyncOptions,
      | 'routines'
      | 'catalog'
      | 'activeSessions'
      | 'rmLogs'
      | 'workoutHistory'
      | 'exerciseDiary'
    >;
    const defaultCollections: SyncCollections = {
      routines: [],
      catalog: [],
      activeSessions: {},
      rmLogs: [],
      workoutHistory: [],
      exerciseDiary: [],
    };
    const renderSync = (collections: SyncCollections = defaultCollections) =>
      hookHarness.render(() => useSync({
        ownerId: 'owner-1',
        syncEnabled: true,
        isStorageLoaded: true,
        isOwnerHydrationComplete: true,
        onSynced: vi.fn(async () => undefined),
        ...collections,
      }));

    renderSync();
    await hookHarness.runEffects();
    for (let attempt = 0; attempt < 10 && syncCloudData.mock.calls.length === 0; attempt += 1) {
      await Promise.resolve();
    }
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await Promise.resolve();
    }

    const remoteCollections: SyncCollections = {
      routines: [],
      catalog: [{ id: 'remote-definition', name: 'Pulled during sync' }],
      activeSessions: {},
      rmLogs: [],
      workoutHistory: [],
      exerciseDiary: [],
    };
    renderSync(remoteCollections);
    await hookHarness.runEffects();
    await Promise.resolve();

    expect(syncCloudData).toHaveBeenCalledTimes(1);

    syncCloudData.mockResolvedValueOnce({
      status: 'synced',
      pulled: 1,
      pushed: 0,
    });
    const { retry } = renderSync(remoteCollections);
    retry();
    for (let attempt = 0; attempt < 10 && syncCloudData.mock.calls.length < 2; attempt += 1) {
      await Promise.resolve();
    }
    renderSync({
      ...remoteCollections,
      catalog: [...remoteCollections.catalog],
    });
    await hookHarness.runEffects();
    await Promise.resolve();

    expect(syncCloudData).toHaveBeenCalledTimes(2);
    hookHarness.dispose();
  });

  it.each([false, true])('handles reactive scheduling and reports queue startup failure (%s)', async (failStartup) => {
    vi.useFakeTimers();
    const harness = createHookHarness();
    let pending: Array<{ request: { operationId: string; changes: unknown[] } }> = [];
    const syncCloudData = vi.fn(async () => {
      pending = [];
      return { status: 'synced', pulled: 0, pushed: 1 };
    });
    vi.doMock('react', async (original) => ({
      ...await original<typeof import('react')>(),
      useState: (initial: unknown) => activeHarness!.useState(initial),
      useRef: (initial: unknown) => activeHarness!.useRef(initial),
      useCallback: (callback: unknown, deps: readonly unknown[]) => activeHarness!.useMemo(() => callback, deps),
      useEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) => activeHarness!.useEffect(callback, deps),
      useLayoutEffect: (callback: () => void | (() => void), deps?: readonly unknown[]) => activeHarness!.useEffect(callback, deps),
    }));
    let rejectQueueRead = false;
    const getPendingSyncOperations = vi.fn(async () => {
      if (rejectQueueRead) throw new Error('IndexedDB queue unavailable');
      return pending;
    });
    vi.doMock('../src/services/db', () => ({
      flushScopedStorageWrites: vi.fn(async () => undefined),
      getPendingSyncOperations,
    }));
    vi.doMock('../src/services/cloud-sync', async (original) => ({
      ...await original<typeof import('../src/services/cloud-sync')>(), syncCloudData,
    }));
    vi.doMock('../src/services/supabase', () => ({
      getSupabaseBrowserClient: () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'owner-1' } } }, error: null }) },
      }),
    }));
    const target = new EventTarget();
    Object.assign(window, {
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    mockSyncStore();
    const { useSync } = await import('../src/hooks/useSync');
    const options: UseSyncOptions = {
      ownerId: 'owner-1', syncEnabled: true, isStorageLoaded: true, isOwnerHydrationComplete: true,
      onSynced: vi.fn(async () => undefined), routines: [], catalog: [], activeSessions: {},
      rmLogs: [], workoutHistory: [], exerciseDiary: [],
    };
    const render = () => harness.render(() => useSync(options));
    const settle = async () => { await harness.runEffects(); await vi.advanceTimersByTimeAsync(0); };
    try {
      options.isOwnerHydrationComplete = false;
      render(); await settle();
      expect(syncCloudData).not.toHaveBeenCalled();
      options.isOwnerHydrationComplete = true;
      render(); await settle();
      expect(syncCloudData).toHaveBeenLastCalledWith(expect.objectContaining({ pull: true }));
      options.catalog = [{ id: 'local', name: 'Edited' }];
      pending = [{ request: { operationId: 'edit', changes: [{}] } }];
      if (failStartup) {
        // First count the pending operation, then fail the reactive startup read.
        render(); await harness.runEffects(); await vi.advanceTimersByTimeAsync(0);
        pending = [{ request: { operationId: 'retained', changes: [{}] } }];
        options.catalog = [{ id: 'local', name: 'Second edit' }];
        getPendingSyncOperations.mockResolvedValueOnce(pending);
        rejectQueueRead = true;
        render(); await settle();
        expect(render().status).toMatchObject({ state: 'error', error: 'IndexedDB queue unavailable' });
        expect(render().pendingChanges).toBe(1);
        expect(pending).toHaveLength(1);
        expect(syncCloudData).toHaveBeenCalledTimes(2);
        rejectQueueRead = false;
        render().retry(); await settle();
        expect(render().status.state).toBe('synced');
        expect(pending).toHaveLength(0);
        return;
      }
      render(); await settle();
      expect(syncCloudData).toHaveBeenCalledTimes(2);
      expect(syncCloudData).toHaveBeenLastCalledWith(expect.objectContaining({ pull: false }));
      options.catalog = [...options.catalog];
      render(); await settle();
      expect(syncCloudData).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(syncCloudData).toHaveBeenLastCalledWith(expect.objectContaining({ pull: true }));
      expect(syncCloudData).toHaveBeenCalledTimes(3);
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      target.dispatchEvent(new Event('offline'));
      pending = [{ request: { operationId: 'offline-edit', changes: [{}] } }];
      options.catalog = [{ id: 'local', name: 'Offline edit' }];
      render(); await settle();
      expect(syncCloudData).toHaveBeenCalledTimes(3);
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      target.dispatchEvent(new Event('online')); await settle();
      expect(syncCloudData).toHaveBeenCalledTimes(4);
      expect(syncCloudData).toHaveBeenLastCalledWith(expect.objectContaining({ pull: true }));
      render().retry(); await settle();
      expect(syncCloudData).toHaveBeenCalledTimes(5);
      expect(syncCloudData).toHaveBeenLastCalledWith(expect.objectContaining({ pull: true }));
      options.ownerId = 'owner-2';
      render(); await settle();
      expect(syncCloudData).toHaveBeenCalledTimes(5);
    } finally {
      harness.dispose();
      vi.useRealTimers();
      vi.doUnmock('../src/services/db');
      vi.doUnmock('../src/services/cloud-sync');
      vi.doUnmock('../src/services/supabase');
    }
  });
});
