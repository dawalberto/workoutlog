import type { StoreApi } from 'zustand/vanilla';
import {
  DB_KEYS,
  GUEST_STORAGE_SCOPE,
  flushScopedStorageWrites,
  initAndMigrateStorage,
  loadScopedAppStorageData,
  mergeSyncRefresh,
  setScopedStoredItem,
  transferGuestDataToOwnerOnce,
  type AppStorageData,
  type StorageScope,
} from '../services/db';
import type { AppState } from './appStore';

const collectionKeys = [
  [DB_KEYS.ROUTINES, 'routines'],
  [DB_KEYS.CATALOG, 'catalog'],
  [DB_KEYS.ACTIVE_SESSIONS, 'activeSessions'],
  [DB_KEYS.RM_LOGS, 'rmLogs'],
  [DB_KEYS.WORKOUT_HISTORY, 'workoutHistory'],
  [DB_KEYS.EXERCISE_DIARY, 'exerciseDiary'],
] as const;

function getScope(ownerId?: string): StorageScope {
  return ownerId ? { ownerId } : GUEST_STORAGE_SCOPE;
}

export function getStorageScopeKey(ownerId?: string): string {
  return ownerId ? `owner:${encodeURIComponent(ownerId)}` : GUEST_STORAGE_SCOPE;
}

function clearCollectionData(): Pick<
  AppStorageData,
  'routines' | 'catalog' | 'activeSessions' | 'rmLogs' | 'workoutHistory' | 'exerciseDiary'
> {
  return {
    routines: [],
    catalog: [],
    activeSessions: {},
    rmLogs: [],
    workoutHistory: [],
    exerciseDiary: [],
  };
}

export function startPersistence(store: StoreApi<AppState>): () => void {
  let previous = store.getState();

  return store.subscribe((state) => {
    if (
      state.isStorageLoaded &&
      state.hydratedScopeKey !== null &&
      state.hydratedScopeKey === state.activeScopeKey
    ) {
      const scope = state.activeScopeKey === GUEST_STORAGE_SCOPE
        ? GUEST_STORAGE_SCOPE
        : {
          ownerId: decodeURIComponent(state.activeScopeKey.slice('owner:'.length)),
        };
      for (const [storageKey, stateKey] of collectionKeys) {
        if (previous[stateKey] !== state[stateKey]) {
          setScopedStoredItem(storageKey, state[stateKey], scope);
        }
      }
    }

    previous = state;
  });
}

export function hydrateStorage(
  store: StoreApi<AppState>,
  ownerId?: string,
  transferGuestData = false,
): () => void {
  const requestedScopeKey = getStorageScopeKey(ownerId);
  const scope = getScope(ownerId);
  let isCurrent = true;

  store.setState({
    ...clearCollectionData(),
    activeScopeKey: requestedScopeKey,
    hydratedScopeKey: null,
    isStorageLoaded: false,
    isGuestTransferComplete: !ownerId || !transferGuestData,
    storageError: null,
  });

  const loadStorage = async () => {
    let transferError: string | null = null;
    if (ownerId && transferGuestData) {
      if (isCurrent) store.setState({ isGuestTransferComplete: false });
      try {
        await transferGuestDataToOwnerOnce(ownerId);
        if (isCurrent) store.setState({ isGuestTransferComplete: true });
      } catch (error) {
        transferError =
          error instanceof Error ? error.message : 'Account data transfer failed.';
        if (isCurrent) store.setState({ storageError: transferError });
      }
    }

    const data = await initAndMigrateStorage(scope);
    if (!isCurrent) return;
    store.setState({
      ...data,
      storageError: transferError,
      hydratedScopeKey: requestedScopeKey,
      isStorageLoaded: true,
    });
  };

  void loadStorage().catch((error) => {
    console.error('[useStorageLifecycle] Error initializing storage:', error);
  });

  return () => {
    isCurrent = false;
  };
}

export async function refreshFromStorage(
  store: StoreApi<AppState>,
  ownerId?: string,
): Promise<void> {
  if (!ownerId) return;
  const requestedScopeKey = getStorageScopeKey(ownerId);
  const requestedScope = getScope(ownerId);
  const baselineState = store.getState();
  if (
    !baselineState.isStorageLoaded ||
    baselineState.activeScopeKey !== requestedScopeKey ||
    baselineState.hydratedScopeKey !== requestedScopeKey
  ) {
    return;
  }

  const baseline: AppStorageData = {
    routines: baselineState.routines,
    catalog: baselineState.catalog,
    activeSessions: baselineState.activeSessions,
    rmLogs: baselineState.rmLogs,
    workoutHistory: baselineState.workoutHistory,
    exerciseDiary: baselineState.exerciseDiary,
  };

  await flushScopedStorageWrites(requestedScope);
  const data = await loadScopedAppStorageData(requestedScope);
  const current = store.getState();
  if (
    !current.isStorageLoaded ||
    current.activeScopeKey !== requestedScopeKey ||
    current.hydratedScopeKey !== requestedScopeKey
  ) {
    return;
  }

  store.setState({
    routines: mergeSyncRefresh(baseline.routines, current.routines, data.routines, 'routines'),
    catalog: mergeSyncRefresh(baseline.catalog, current.catalog, data.catalog, 'catalog'),
    activeSessions: mergeSyncRefresh(
      baseline.activeSessions,
      current.activeSessions,
      data.activeSessions,
      'activeSessions',
    ),
    rmLogs: mergeSyncRefresh(baseline.rmLogs, current.rmLogs, data.rmLogs, 'rmLogs'),
    workoutHistory: mergeSyncRefresh(
      baseline.workoutHistory,
      current.workoutHistory,
      data.workoutHistory,
      'workoutHistory',
    ),
    exerciseDiary: mergeSyncRefresh(
      baseline.exerciseDiary,
      current.exerciseDiary,
      data.exerciseDiary,
      'exerciseDiary',
    ),
  });
}
