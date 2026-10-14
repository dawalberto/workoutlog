import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../src/store/appStore';
import {
  selectIsStorageReady,
  selectPersistedData,
} from '../../src/store/selectors';
import { AppTab, type ActiveRestTimer, type ExerciseDiary } from '../../src/types';
import { resetAppStore } from '../store-test-utils';

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

function createRestTimer(targetEndTime = Date.now() + 30_000): ActiveRestTimer {
  return {
    exerciseName: 'Sentadilla',
    initialSeconds: 60,
    key: 101,
    routineId: 'routine-1',
    setNumber: 2,
    targetEndTime,
  };
}

function createDiary(): ExerciseDiary {
  return {
    id: 'diary-1',
    exerciseName: 'Sentadilla',
    entries: [
      {
        id: 'entry-1',
        date: '2026-10-13',
        note: 'Primera nota',
      },
    ],
    createdAt: '2026-10-13T00:00:00.000Z',
    updatedAt: '2026-10-13T00:00:00.000Z',
  };
}

describe('app store UI and lifecycle slices', () => {
  let sessionStorage: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    sessionStorage = createSessionStorage();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: sessionStorage,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
    vi.useRealTimers();
    resetAppStore();
  });

  it('updates the selected tab, sidebar, backup modal, and feedback message', () => {
    const store = createAppStore();
    const state = store.getState();

    state.setActiveTab(AppTab.EXERCISES);
    state.openMenu();
    state.openBackupModal();
    state.notify('Cambios guardados');
    expect(store.getState()).toMatchObject({
      activeTab: AppTab.EXERCISES,
      isMenuOpen: true,
      isBackupModalOpen: true,
      feedbackMessage: 'Cambios guardados',
    });

    state.closeMenu();
    state.closeBackupModal();
    state.clearFeedback();
    expect(store.getState()).toMatchObject({
      isMenuOpen: false,
      isBackupModalOpen: false,
      feedbackMessage: null,
    });
  });

  it('resolves sign-out confirmation with the user response', async () => {
    const store = createAppStore();
    const confirmed = store.getState().requestSignOutConfirmation();
    expect(store.getState().isSignOutConfirmOpen).toBe(true);
    store.getState().resolveSignOutConfirmation(true);
    await expect(confirmed).resolves.toBe(true);
    expect(store.getState().isSignOutConfirmOpen).toBe(false);

    const declined = store.getState().requestSignOutConfirmation();
    store.getState().resolveSignOutConfirmation(false);
    await expect(declined).resolves.toBe(false);
    expect(store.getState().isSignOutConfirmOpen).toBe(false);
  });

  it('hydrates a non-expired rest timer and ignores an expired timer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const active = createRestTimer(Date.now() + 30_000);
    sessionStorage.values.set('current_rest_timer', JSON.stringify(active));
    expect(createAppStore().getState().activeRestTimer).toEqual(active);

    sessionStorage.values.set(
      'current_rest_timer',
      JSON.stringify(createRestTimer(Date.now() - 60_001)),
    );
    expect(createAppStore().getState().activeRestTimer).toBeNull();
  });

  it('ignores malformed or inaccessible session storage during hydration', () => {
    sessionStorage.values.set('current_rest_timer', '{invalid json');
    expect(() => createAppStore()).not.toThrow();
    expect(createAppStore().getState().activeRestTimer).toBeNull();

    sessionStorage.setFailures({ read: true });
    expect(() => createAppStore()).not.toThrow();
    expect(createAppStore().getState().activeRestTimer).toBeNull();
  });

  it('starts and closes a rest timer while tolerating storage failures', () => {
    const store = createAppStore();
    const timer = createRestTimer();
    sessionStorage.setFailures({ write: true });
    expect(() => store.getState().startRestTimer(timer)).not.toThrow();
    expect(store.getState().activeRestTimer).toEqual(timer);
    expect(() => store.getState().closeRestTimer()).not.toThrow();
    expect(store.getState().activeRestTimer).toBeNull();

    sessionStorage.setFailures({ remove: true });
    store.getState().startRestTimer(timer);
    expect(() => store.getState().closeRestTimer()).not.toThrow();
    expect(store.getState().activeRestTimer).toBeNull();
  });

  it('opens exercise diary and closes related routine and summary state', () => {
    const store = createAppStore();
    store.getState().setExerciseDiary([createDiary()]);
    store.setState({
      activeRoutineId: 'routine-1',
      workoutSummary: {
        routineId: 'routine-1',
        routineName: 'Rutina',
        startTime: 1,
        endTime: 2,
        durationSeconds: 1,
        completedSetsCount: 0,
        totalSetsCount: 0,
        completionPercentage: 0,
        exercisesSummary: [],
      },
    });

    store.getState().openExerciseDiary('Sentadilla', 'exercise-1');
    expect(store.getState()).toMatchObject({
      activeTab: AppTab.DIARY,
      diaryTargetExerciseName: 'Sentadilla',
      diaryAutoOpenCreate: false,
      activeRoutineId: null,
      workoutSummary: null,
    });

    store.getState().openExerciseDiary('Press banca');
    expect(store.getState()).toMatchObject({
      diaryTargetExerciseName: 'Press banca',
      diaryAutoOpenCreate: true,
    });
    store.getState().clearDiaryNavigationState();
    expect(store.getState()).toMatchObject({
      diaryTargetExerciseName: undefined,
      diaryAutoOpenCreate: false,
    });
  });

  it('gates persisted values until the account scope has hydrated', () => {
    const store = createAppStore();
    const routine = {
      id: 'routine-1',
      name: 'Rutina anterior',
      exercises: [],
      createdAt: '2026-10-13T00:00:00.000Z',
      updatedAt: '2026-10-13T00:00:00.000Z',
    };
    store.setState({
      user: { id: 'owner-1', email: 'owner@example.test' },
      routines: [routine],
      isStorageLoaded: true,
      activeScopeKey: 'owner:owner-1',
      hydratedScopeKey: 'owner:owner-1',
    });
    expect(selectIsStorageReady(store.getState())).toBe(true);
    expect(selectPersistedData(store.getState()).routines).toEqual([routine]);

    store.setState({
      user: { id: 'owner-2', email: 'owner@example.test' },
    });
    expect(selectIsStorageReady(store.getState())).toBe(false);
    expect(selectPersistedData(store.getState()).routines).toEqual([]);
    expect(selectPersistedData(store.getState()).isStorageLoaded).toBe(false);
  });

  it('orchestrates sign-out, syncing only when enabled and online, then resets UI state', async () => {
    const store = createAppStore();
    const syncNow = vi.fn(async () => undefined);
    const signOut = vi.fn(async (options: {
      syncBeforeSignOut: () => Promise<void>;
      confirmPendingChanges: (count: number) => Promise<boolean>;
      stopSync?: () => Promise<void>;
      resumeSync?: () => void;
    }) => {
      await options.syncBeforeSignOut();
      if (!await options.confirmPendingChanges(1)) return false;
      await options.stopSync?.();
      return true;
    });
    store.getState().registerSyncControls({
      retry: vi.fn(),
      syncNow,
      stopSync: vi.fn(async () => undefined),
      resumeSync: vi.fn(),
    });
    store.getState().registerAccountControls({
      signInWithGoogle: vi.fn(async () => undefined),
      signOut,
      retryLocalCleanup: vi.fn(async () => false),
      refreshSyncEligibility: vi.fn(async () => false),
    });
    store.setState({
      isSyncEnabled: true,
      isOnline: true,
      activeTab: AppTab.HISTORY,
      isMenuOpen: true,
      isBackupModalOpen: true,
      user: { id: 'owner-1', email: 'owner@example.test' },
      activeRestTimer: createRestTimer(),
      diaryTargetExerciseName: 'Sentadilla',
      diaryAutoOpenCreate: true,
      activeRoutineId: 'routine-1',
      workoutSummary: {
        routineId: 'routine-1',
        routineName: 'Rutina',
        startTime: 1,
        endTime: 2,
        durationSeconds: 1,
        completedSetsCount: 0,
        totalSetsCount: 0,
        completionPercentage: 0,
        exercisesSummary: [],
      },
      pendingRmAlert: {
        logId: 'rm-1',
        exerciseName: 'Sentadilla',
        newWeight: 90,
        previousRmWeight: 80,
      },
    });

    const signOutPromise = store.getState().signOut();
    await vi.waitFor(() => expect(store.getState().isSignOutConfirmOpen).toBe(true));
    store.getState().resolveSignOutConfirmation(true);
    await expect(signOutPromise).resolves.toBe(true);

    expect(syncNow).toHaveBeenCalledOnce();
    expect(store.getState()).toMatchObject({
      activeTab: AppTab.ROUTINES,
      isMenuOpen: false,
      isBackupModalOpen: false,
      activeRestTimer: null,
      diaryTargetExerciseName: undefined,
      diaryAutoOpenCreate: false,
      activeRoutineId: null,
      workoutSummary: null,
      pendingRmAlert: null,
    });
  });

  it('keeps UI state when sign-out confirmation is declined', async () => {
    const store = createAppStore();
    const signOut = vi.fn(async (options: {
      syncBeforeSignOut: () => Promise<void>;
      confirmPendingChanges: (count: number) => Promise<boolean>;
      stopSync?: () => Promise<void>;
      resumeSync?: () => void;
    }) => await options.confirmPendingChanges(1));
    store.getState().registerAccountControls({
      signInWithGoogle: vi.fn(async () => undefined),
      signOut,
      retryLocalCleanup: vi.fn(async () => false),
      refreshSyncEligibility: vi.fn(async () => false),
    });
    store.setState({
      activeTab: AppTab.HISTORY,
      isMenuOpen: true,
      isBackupModalOpen: true,
    });

    const signOutPromise = store.getState().signOut();
    await vi.waitFor(() => expect(store.getState().isSignOutConfirmOpen).toBe(true));
    store.getState().resolveSignOutConfirmation(false);

    await expect(signOutPromise).resolves.toBe(false);
    expect(store.getState()).toMatchObject({
      activeTab: AppTab.HISTORY,
      isMenuOpen: true,
      isBackupModalOpen: true,
    });
  });

  it('resets UI state after local cleanup is retried successfully', async () => {
    const store = createAppStore();
    store.getState().registerAccountControls({
      signInWithGoogle: vi.fn(async () => undefined),
      signOut: vi.fn(async () => false),
      retryLocalCleanup: vi.fn(async () => true),
      refreshSyncEligibility: vi.fn(async () => false),
    });
    store.setState({
      activeTab: AppTab.HISTORY,
      isMenuOpen: true,
      isBackupModalOpen: true,
      activeRestTimer: createRestTimer(),
      diaryTargetExerciseName: 'Sentadilla',
      diaryAutoOpenCreate: true,
      activeRoutineId: 'routine-1',
      workoutSummary: {
        routineId: 'routine-1',
        routineName: 'Rutina',
        startTime: 1,
        endTime: 2,
        durationSeconds: 1,
        completedSetsCount: 0,
        totalSetsCount: 0,
        completionPercentage: 0,
        exercisesSummary: [],
      },
      pendingRmAlert: {
        logId: 'rm-1',
        exerciseName: 'Sentadilla',
        newWeight: 90,
        previousRmWeight: 80,
      },
    });

    await expect(store.getState().retryLocalCleanup()).resolves.toBe(true);

    expect(store.getState()).toMatchObject({
      activeTab: AppTab.ROUTINES,
      isMenuOpen: false,
      isBackupModalOpen: false,
      activeRestTimer: null,
      diaryTargetExerciseName: undefined,
      diaryAutoOpenCreate: false,
      activeRoutineId: null,
      workoutSummary: null,
      pendingRmAlert: null,
    });
  });

  it('keeps account and sync commands inert until lifecycle controls register', async () => {
    const store = createAppStore();
    await expect(store.getState().signInWithGoogle()).resolves.toBeUndefined();
    await expect(store.getState().signOut()).resolves.toBe(false);
    await expect(store.getState().retryLocalCleanup()).resolves.toBe(false);
    await expect(store.getState().refreshSyncEligibility()).resolves.toBe(false);
    expect(() => store.getState().retrySync()).not.toThrow();
    await expect(store.getState().syncNow()).resolves.toBeUndefined();
    await expect(store.getState().stopSync()).resolves.toBeUndefined();
    expect(() => store.getState().resumeSync()).not.toThrow();
  });

  it.each([
    { isSyncEnabled: false, isOnline: true },
    { isSyncEnabled: true, isOnline: false },
  ])('does not run a final sync when sync is disabled or offline (%o)', async (syncState) => {
    const store = createAppStore();
    const syncNow = vi.fn(async () => undefined);
    const signOut = vi.fn(async (options: {
      syncBeforeSignOut: () => Promise<void>;
      confirmPendingChanges: (count: number) => Promise<boolean>;
      stopSync?: () => Promise<void>;
      resumeSync?: () => void;
    }) => {
      await options.syncBeforeSignOut();
      return false;
    });
    store.getState().registerSyncControls({
      retry: vi.fn(),
      syncNow,
      stopSync: vi.fn(async () => undefined),
      resumeSync: vi.fn(),
    });
    store.getState().registerAccountControls({
      signInWithGoogle: vi.fn(async () => undefined),
      signOut,
      retryLocalCleanup: vi.fn(async () => false),
      refreshSyncEligibility: vi.fn(async () => false),
    });
    store.setState(syncState);

    await store.getState().signOut();

    expect(syncNow).not.toHaveBeenCalled();
  });
});
