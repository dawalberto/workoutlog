import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTab, type ActiveRestTimer } from '../src/types';

type TestElement = ReactElement<Record<string, unknown> & { children?: ReactNode }>;

function findComponent(node: ReactNode, name: string): TestElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findComponent(child, name);
      if (match) return match;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (typeof node.type === 'function' && node.type.name === name) {
    return node as TestElement;
  }
  return findComponent((node as TestElement).props.children as ReactNode, name);
}

function createHookHarness() {
  const slots: Array<{ value?: unknown; initialized?: boolean }> = [];
  let cursor = 0;
  let activeHarness: ReturnType<typeof createHookHarness> | null = null;
  return {
    render<T>(callback: () => T): T {
      cursor = 0;
      activeHarness = this;
      try {
        return callback();
      } finally {
        activeHarness = null;
      }
    },
    useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void] {
      const slot = slots[cursor] ??= {};
      cursor += 1;
      if (!slot.initialized) {
        slot.value = typeof initial === 'function' ? (initial as () => T)() : initial;
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
      const slot = slots[cursor] ??= {};
      cursor += 1;
      if (!slot.initialized) {
        slot.value = { current: initial };
        slot.initialized = true;
      }
      return slot.value as { current: T };
    },
    useEffect() {
      cursor += 1;
    },
    current() {
      return activeHarness;
    },
  };
}

function createSessionStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  let failRead = false;
  let failWrite = false;
  let failRemove = false;
  return {
    values,
    setFailures(failures: { read?: boolean; write?: boolean; remove?: boolean }) {
      failRead = Boolean(failures.read);
      failWrite = Boolean(failures.write);
      failRemove = Boolean(failures.remove);
    },
    getItem(key: string) {
      if (failRead) throw new Error('Storage read failed');
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (failWrite) throw new Error('Storage write failed');
      values.set(key, value);
    },
    removeItem(key: string) {
      if (failRemove) throw new Error('Storage remove failed');
      values.delete(key);
    },
  };
}

describe('App state characterization', () => {
  let harness: ReturnType<typeof createHookHarness>;
  let sessionStorage: ReturnType<typeof createSessionStorage>;
  let activeRoutineId: string | null;
  let app: typeof import('../src/App').default;

  const renderApp = () => harness.render(() => app());
  const getProps = (tree: ReactNode, name: string) =>
    findComponent(tree, name)?.props ?? {};

  beforeEach(async () => {
    vi.resetModules();
    harness = createHookHarness();
    sessionStorage = createSessionStorage();
    activeRoutineId = null;
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: sessionStorage,
    });

    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        default: {
          ...actual,
          useEffect: () => harness.current()!.useEffect(),
        },
        useState: (initial: unknown) => harness.current()!.useState(initial),
        useRef: (initial: unknown) => harness.current()!.useRef(initial),
        useEffect: () => harness.current()!.useEffect(),
      };
    });
    vi.doMock('../src/hooks/useAuth', () => ({
      useAuth: () => ({
        cleanupPending: false,
        error: null,
        isLoading: false,
        isSigningIn: false,
        isSigningOut: false,
        isSyncEligibilityLoading: false,
        isSyncEnabled: false,
        retryLocalCleanup: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
        user: null,
      }),
    }));
    vi.doMock('../src/hooks/useStorageLifecycle', () => ({
      useStorageLifecycle: vi.fn(),
    }));
    vi.doMock('../src/store/appStore', () => ({
      appStore: {},
      useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector({
        activeSessions: {},
        catalog: [],
        exerciseDiary: [],
        activeScopeKey: 'guest',
        hydratedScopeKey: 'guest',
        isGuestTransferComplete: true,
        isStorageLoaded: true,
        rmLogs: [],
        routines: [],
        setActiveSessions: vi.fn(),
        setCatalog: vi.fn(),
        setExerciseDiary: vi.fn(),
        setRmLogs: vi.fn(),
        setRoutines: vi.fn(),
        setWorkoutHistory: vi.fn(),
        storageError: null,
        workoutHistory: [],
      }),
    }));
    vi.doMock('../src/store/persistence', () => ({
      applyImportData: vi.fn(),
      refreshFromStorage: vi.fn(),
    }));
    vi.doMock('zustand/react/shallow', () => ({
      useShallow: (selector: (state: Record<string, unknown>) => unknown) => selector,
    }));
    vi.doMock('../src/hooks/useSync', () => ({
      useSync: () => ({
        isOnline: true,
        resumeSync: vi.fn(),
        stopSync: vi.fn(),
        syncNow: vi.fn(),
      }),
    }));
    vi.doMock('../src/hooks/useRoutines', () => ({
      useRoutines: () => ({
        activeRoutine: activeRoutineId ? { id: activeRoutineId, exercises: [] } : null,
        activeRoutineId,
        closeRoutine: vi.fn(),
        createCatalogExercise: vi.fn(),
        createRoutine: vi.fn(),
        deleteCatalogExercise: vi.fn(),
        deleteRoutine: vi.fn(),
        duplicateRoutine: vi.fn(),
        routineSubMode: 'execute',
        saveRoutine: vi.fn(),
        selectRoutine: vi.fn(),
        updateCatalogExercise: vi.fn(),
      }),
    }));
    vi.doMock('../src/hooks/useWorkoutSession', () => ({
      useWorkoutSession: () => ({
        deleteHistoryLog: vi.fn(),
        dismissWorkoutSummary: vi.fn(),
        finishSession: vi.fn(),
        inProgressRoutine: null,
        inProgressSessionEntry: null,
        resetSession: vi.fn(),
        startSession: vi.fn(),
        toggleSetComplete: vi.fn(),
        workoutSummary: null,
      }),
    }));
    vi.doMock('../src/hooks/useRmTracker', () => ({
      useRmTracker: () => ({
        checkRmWeight: vi.fn(),
        confirmRmAlert: vi.fn(),
        dismissRmAlert: vi.fn(),
        pendingRmAlert: null,
      }),
    }));
    vi.doMock('../src/hooks/useExerciseDiaryNavigation', () => ({
      useExerciseDiaryNavigation: () => ({
        clearDiaryNavigationState: vi.fn(),
        diaryAutoOpenCreate: false,
        diaryTargetExerciseName: null,
        openExerciseDiary: vi.fn(),
      }),
    }));
    vi.doMock('../src/services/db', () => ({
      flushScopedStorageWrites: vi.fn(),
      loadScopedAppStorageData: vi.fn(),
      mergeSyncRefresh: vi.fn(),
    }));
    app = (await import('../src/App')).default;
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
    vi.doUnmock('react');
    vi.doUnmock('../src/hooks/useAuth');
    vi.doUnmock('../src/hooks/useStorageLifecycle');
    vi.doUnmock('../src/store/appStore');
    vi.doUnmock('../src/store/persistence');
    vi.doUnmock('zustand/react/shallow');
    vi.doUnmock('../src/hooks/useSync');
    vi.doUnmock('../src/hooks/useRoutines');
    vi.doUnmock('../src/hooks/useWorkoutSession');
    vi.doUnmock('../src/hooks/useRmTracker');
    vi.doUnmock('../src/hooks/useExerciseDiaryNavigation');
    vi.doUnmock('../src/services/db');
    vi.useRealTimers();
  });

  it('hydrates an active rest timer and ignores one expired beyond the grace period', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const active: ActiveRestTimer = {
      exerciseName: 'Sentadilla',
      initialSeconds: 60,
      key: 101,
      routineId: 'routine-1',
      setNumber: 2,
      targetEndTime: Date.now() + 30_000,
    };
    sessionStorage.values.set('current_rest_timer', JSON.stringify(active));
    expect(findComponent(renderApp(), 'RestTimerBar')?.props.targetEndTime)
      .toBe(active.targetEndTime);

    sessionStorage.values.set(
      'current_rest_timer',
      JSON.stringify({ ...active, targetEndTime: Date.now() - 60_001 }),
    );
    harness = createHookHarness();
    expect(findComponent(renderApp(), 'RestTimerBar')).toBeUndefined();
  });

  it('ignores malformed or inaccessible session storage during hydration', () => {
    sessionStorage.values.set('current_rest_timer', '{invalid json');
    expect(findComponent(renderApp(), 'RestTimerBar')).toBeUndefined();

    sessionStorage.setFailures({ read: true });
    harness = createHookHarness();
    expect(() => renderApp()).not.toThrow();
    expect(findComponent(renderApp(), 'RestTimerBar')).toBeUndefined();
  });

  it('starts and closes a rest timer while tolerating storage write and removal failures', () => {
    activeRoutineId = 'routine-1';
    const timer: ActiveRestTimer = {
      exerciseName: 'Sentadilla',
      initialSeconds: 60,
      key: 102,
      routineId: activeRoutineId,
      setNumber: 1,
      targetEndTime: Date.now() + 60_000,
    };
    sessionStorage.setFailures({ write: true });
    const routineView = getProps(renderApp(), 'RoutineView');
    (routineView.onStartRestTimer as (value: ActiveRestTimer) => void)(timer);

    const restTimer = findComponent(renderApp(), 'RestTimerBar');
    expect(restTimer?.props.targetEndTime).toBe(timer.targetEndTime);
    expect(() => (restTimer?.props.onClose as () => void)()).not.toThrow();
    expect(findComponent(renderApp(), 'RestTimerBar')).toBeUndefined();

    sessionStorage.setFailures({ remove: true });
    (getProps(renderApp(), 'RoutineView').onStartRestTimer as (value: ActiveRestTimer) => void)(timer);
    expect(() => (findComponent(renderApp(), 'RestTimerBar')?.props.onClose as () => void)())
      .not.toThrow();
    expect(findComponent(renderApp(), 'RestTimerBar')).toBeUndefined();
  });

  it('updates the selected tab and toggles the sidebar and backup modal', () => {
    let tree = renderApp();
    (getProps(tree, 'AppHeader').onSelectTab as (tab: AppTab) => void)(AppTab.EXERCISES);
    tree = renderApp();
    expect(getProps(tree, 'AppHeader').activeTab).toBe(AppTab.EXERCISES);
    expect(findComponent(tree, 'ExerciseCatalog')).toBeDefined();

    (getProps(tree, 'AppHeader').onOpenMenu as () => void)();
    tree = renderApp();
    expect(getProps(tree, 'SidebarMenu').isOpen).toBe(true);
    (getProps(tree, 'SidebarMenu').onOpenBackup as () => void)();
    tree = renderApp();
    expect(getProps(tree, 'DataBackupModal').isOpen).toBe(true);
    (getProps(tree, 'SidebarMenu').onClose as () => void)();
    tree = renderApp();
    expect(getProps(tree, 'SidebarMenu').isOpen).toBe(false);
  });
});
