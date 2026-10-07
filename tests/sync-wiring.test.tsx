import React, { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncStatus } from '../src/components/SyncStatus';

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
    vi.restoreAllMocks();
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
        };
      });

      storage = await import('../src/services/db');
      const backup = await import('../src/utils/backup');
      const { useAppStorage } = await import('../src/hooks/useAppStorage');
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

      const renderStorage = () => hookHarness.render(() => useAppStorage('import-owner', false));
      let appStorage = renderStorage();
      await hookHarness.runEffects();
      for (let attempt = 0; attempt < 20 && !appStorage.isStorageLoaded; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        appStorage = renderStorage();
        await hookHarness.runEffects();
      }
      expect(appStorage.isStorageLoaded).toBe(true);
      await storage.flushScopedStorageWrites(ownerScope);

      const modalHarness = createHookHarness();
      const modalProps = {
        isOpen: true,
        onClose: vi.fn(),
        ...appStorage,
        isPremiumActive: true,
        onImportComplete: (
          catalog: typeof appStorage.catalog,
          routines: typeof appStorage.routines,
          rmLogs: typeof appStorage.rmLogs,
          workoutHistory: typeof appStorage.workoutHistory,
          exerciseDiary: typeof appStorage.exerciseDiary,
        ) => appStorage.applyImportData(catalog, routines, rmLogs, workoutHistory, exerciseDiary),
      };
      const parsedData = backup.parseImportedData(createBackupJson());
      modalHarness.slots[0] = { value: 'import', initialized: true };
      modalHarness.slots[1] = {
        value: { name: 'backup.json' } as File,
        initialized: true,
      };
      modalHarness.slots[2] = { value: parsedData, initialized: true };
      modalHarness.slots[4] = { value: mode, initialized: true };

      const renderModal = async () =>
        await modalHarness.render(() => DataBackupModal(modalProps));
      let modal = await renderModal();
      if (mode === 'overwrite') {
        findElement(modal, (element) => element.props.id === 'radio-import-overwrite')
          ?.props.onChange?.();
        modal = await renderModal();
      }
      findElement(modal, (element) => element.props.id === 'btn-confirm-import')
        ?.props.onClick?.();

      appStorage = renderStorage();
      await hookHarness.runEffects();
      await storage.flushScopedStorageWrites(ownerScope);

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
        appStorage.routines,
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
      isAuthenticated: true,
      isPremiumActive: true,
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
    const free = renderStatus({
      ...base,
      isAuthenticated: false,
      isPremiumActive: false,
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
    const entitlementLoading = renderStatus({
      ...base,
      isPremiumActive: false,
      isEntitlementLoading: true,
      isOnline: true,
      status: { state: 'idle', error: null, lastSyncedAt: null },
    });

    expect(free).toContain('Solo en este dispositivo');
    expect(entitlementLoading).toContain('comprobando tu plan');
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
      isAuthenticated: true,
      isPremiumActive: true,
      isOnline: true,
      pendingChanges: 1,
      status: { state: 'error', error: 'Network unavailable', lastSyncedAt: null },
      onRetry,
    });
    const retry = findElement(errorStatus, (element) => element.type === 'button');

    retry?.props.onClick?.();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
