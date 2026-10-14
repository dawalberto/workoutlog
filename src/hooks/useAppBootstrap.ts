import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useStorageLifecycle } from './useStorageLifecycle';
import { useSync } from './useSync';
import { appStore, useAppStore } from '../store/appStore';
import { selectPersistedData } from '../store/selectors';
import { refreshFromStorage } from '../store/persistence';
import { useShallow } from 'zustand/react/shallow';

export function useAppBootstrap(): void {
  const account = useAuth();
  useStorageLifecycle(account.user?.id, account.isSyncEnabled);

  const persistedData = useAppStore(useShallow(selectPersistedData));
  const isGuestTransferComplete = useAppStore(
    (state) => state.isGuestTransferComplete,
  );
  const activeTab = useAppStore((state) => state.activeTab);

  useSync({
    ownerId: account.user?.id ?? null,
    syncEnabled: account.isSyncEnabled,
    isStorageLoaded: persistedData.isStorageLoaded,
    isOwnerHydrationComplete: isGuestTransferComplete,
    onSynced: () => refreshFromStorage(appStore, account.user?.id),
    routines: persistedData.routines,
    catalog: persistedData.catalog,
    activeSessions: persistedData.activeSessions,
    rmLogs: persistedData.rmLogs,
    workoutHistory: persistedData.workoutHistory,
    exerciseDiary: persistedData.exerciseDiary,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);
}
