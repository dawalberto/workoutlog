import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ActiveWorkoutSession,
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutHistoryLog,
} from '../types';
import {
  createSyncCoordinator,
  syncCloudData,
  type SyncCoordinator,
} from '../services/cloud-sync';
import {
  flushScopedStorageWrites,
  getPendingSyncOperations,
} from '../services/db';
import { getSupabaseBrowserClient } from '../services/supabase';

export interface UseSyncOptions {
  ownerId: string | null;
  syncEnabled: boolean;
  isStorageLoaded: boolean;
  isOwnerHydrationComplete: boolean;
  onSynced: () => Promise<void>;
  routines: Routine[];
  catalog: ExerciseDefinition[];
  activeSessions: Record<string, ActiveWorkoutSession>;
  rmLogs: ExerciseRmLog[];
  workoutHistory: WorkoutHistoryLog[];
  exerciseDiary: ExerciseDiary[];
}

export interface UseSyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error';
  error: string | null;
  lastSyncedAt: number | null;
}

export interface UseSyncResult {
  status: UseSyncStatus;
  isOnline: boolean;
  pendingChanges: number;
  retry: () => void;
}

const initialStatus: UseSyncStatus = {
  state: 'idle',
  error: null,
  lastSyncedAt: null,
};

function isBrowserOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Cloud sync failed.';
}

function pendingOperationsSignature(
  operations: Awaited<ReturnType<typeof getPendingSyncOperations>>,
): string {
  return operations.map((operation) => JSON.stringify(operation.request)).join('\n');
}

export function useSync(options: UseSyncOptions): UseSyncResult {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const coordinatorRef = useRef<SyncCoordinator | null>(null);
  const failedPendingSignatureRef = useRef<string | null>(null);
  const pullRequestedRef = useRef(true);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<UseSyncStatus>(initialStatus);
  const [isOnline, setIsOnline] = useState(isBrowserOnline);
  const [pendingState, setPendingState] = useState<{
    ownerId: string | null;
    count: number;
  }>({ ownerId: options.ownerId, count: 0 });
  const pendingChanges =
    pendingState.ownerId === options.ownerId ? pendingState.count : 0;
  const collectionContentsSignature = JSON.stringify([
    options.routines,
    options.catalog,
    options.activeSessions,
    options.rmLogs,
    options.workoutHistory,
    options.exerciseDiary,
  ]);

  const refreshPendingChanges = useCallback(async (ownerId: string) => {
    try {
      const scope = { ownerId };
      await flushScopedStorageWrites(scope);
      const operations = await getPendingSyncOperations(scope);
      if (mountedRef.current && optionsRef.current.ownerId === ownerId) {
        setPendingState({
          ownerId,
          count: operations.reduce(
            (total, operation) => total + operation.request.changes.length,
            0,
          ),
        });
      }
    } catch (error) {
      if (mountedRef.current && optionsRef.current.ownerId === ownerId) {
        setStatus((previous) => ({
          ...previous,
          state: 'error',
          error: errorMessage(error),
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      coordinatorRef.current?.dispose();
      coordinatorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      pullRequestedRef.current = true;
      failedPendingSignatureRef.current = null;
      setIsOnline(isBrowserOnline());
    };
    const handleOffline = () => {
      setIsOnline(false);
      setStatus((previous) => ({
        ...previous,
        state: 'idle',
        error: null,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    coordinatorRef.current?.dispose();
    coordinatorRef.current = null;
    pullRequestedRef.current = true;
    failedPendingSignatureRef.current = null;
  }, [
    options.ownerId, options.syncEnabled,
    options.isStorageLoaded, options.isOwnerHydrationComplete,
  ]);

  useEffect(() => {
    if (!options.ownerId || !options.isStorageLoaded) {
      setPendingState({ ownerId: options.ownerId, count: 0 });
      return;
    }
    void refreshPendingChanges(options.ownerId);
  }, [
    options.ownerId,
    options.isStorageLoaded,
    collectionContentsSignature,
    refreshPendingChanges,
  ]);

  useEffect(() => {
    const current = optionsRef.current;
    if (
      !current.ownerId ||
      !current.syncEnabled ||
      !current.isStorageLoaded ||
      !current.isOwnerHydrationComplete
    ) {
      coordinatorRef.current?.dispose();
      coordinatorRef.current = null;
      failedPendingSignatureRef.current = null;
      setStatus((previous) => ({
        ...previous,
        state: 'idle',
        error: null,
      }));
      return;
    }

    const syncOwnerId = current.ownerId;
    if (!coordinatorRef.current) {
      const runSync = async () => {
        const latest = optionsRef.current;
        if (latest.ownerId !== syncOwnerId) return;
        if (
          !latest.ownerId ||
          !latest.syncEnabled ||
          !latest.isStorageLoaded ||
          !latest.isOwnerHydrationComplete ||
          !isBrowserOnline()
        ) {
          if (mountedRef.current) setStatus(initialStatus);
          return;
        }

        if (mountedRef.current) {
          setStatus((previous) => ({
            ...previous,
            state: 'syncing',
            error: null,
          }));
        }

        try {
          const client = getSupabaseBrowserClient();
          if (!client) {
            if (mountedRef.current) setStatus(initialStatus);
            return;
          }
          const { data, error } = await client.auth.getSession();
          if (error) throw error;
          const session = data.session;
          if (!session || session.user.id !== latest.ownerId) {
            if (mountedRef.current) setStatus(initialStatus);
            return;
          }
          if (optionsRef.current.ownerId !== latest.ownerId) return;

          const isCurrentSync = () => {
            const current = optionsRef.current;
            return (
              mountedRef.current &&
              current.ownerId === syncOwnerId &&
              current.syncEnabled &&
              current.isStorageLoaded &&
              current.isOwnerHydrationComplete &&
              isBrowserOnline()
            );
          };
          const pull = pullRequestedRef.current;
          pullRequestedRef.current = false;
          const result = await syncCloudData({
            ownerId: latest.ownerId,
            syncEnabled: latest.syncEnabled,
            online: isBrowserOnline(),
            client,
            canSync: isCurrentSync,
            pull,
          });
          if (!isCurrentSync()) {
            if (mountedRef.current) setStatus(initialStatus);
            return;
          }
          if (result.status === 'skipped') {
            if (mountedRef.current) setStatus(initialStatus);
            return;
          }
          failedPendingSignatureRef.current = null;
          if (pull || result.pulled > 0) await optionsRef.current.onSynced();
          await refreshPendingChanges(syncOwnerId);
          if (mountedRef.current) {
            setStatus({
              state: 'synced',
              error: null,
              lastSyncedAt: Date.now(),
            });
          }
        } catch (error) {
          if (mountedRef.current) {
            const current = optionsRef.current;
            if (
              current.ownerId !== syncOwnerId ||
              !current.ownerId ||
              !current.syncEnabled ||
              !current.isStorageLoaded ||
              !current.isOwnerHydrationComplete ||
              !isBrowserOnline()
            ) {
              setStatus(initialStatus);
              return;
            }
            await refreshPendingChanges(current.ownerId);
            try {
              const operations = await getPendingSyncOperations({
                ownerId: syncOwnerId,
              });
              failedPendingSignatureRef.current =
                pendingOperationsSignature(operations);
            } catch {
              failedPendingSignatureRef.current = null;
            }
            setStatus((previous) => ({
              ...previous,
              state: 'error',
              error: errorMessage(error),
            }));
          }
        }
      };

      coordinatorRef.current = createSyncCoordinator(
        runSync,
        isBrowserOnline,
        window,
      );
    }
    const startReactiveSync = async () => {
      const failedPendingSignature = failedPendingSignatureRef.current;
      await flushScopedStorageWrites({ ownerId: syncOwnerId });
      const operations = await getPendingSyncOperations({ ownerId: syncOwnerId });
      if (!pullRequestedRef.current && operations.length === 0) return;
      if (failedPendingSignature !== null) {
        try {
          if (pendingOperationsSignature(operations) === failedPendingSignature) {
            return;
          }
          failedPendingSignatureRef.current = null;
        } catch {
          failedPendingSignatureRef.current = null;
        }
      }
      void coordinatorRef.current?.run();
    };
    void startReactiveSync().catch((error) => {
      const current = optionsRef.current;
      if (
        mountedRef.current &&
        current.ownerId === syncOwnerId &&
        current.syncEnabled &&
        current.isStorageLoaded &&
        current.isOwnerHydrationComplete
      ) {
        setStatus((previous) => ({
          ...previous,
          state: 'error',
          error: errorMessage(error),
        }));
      }
    });
  }, [
    options.ownerId,
    options.syncEnabled,
    options.isStorageLoaded,
    options.isOwnerHydrationComplete,
    collectionContentsSignature,
    refreshPendingChanges,
  ]);

  useEffect(() => {
    if (!options.ownerId || !options.syncEnabled ||
      !options.isStorageLoaded || !options.isOwnerHydrationComplete) return;
    const timer = setInterval(() => {
      if (!isBrowserOnline() || failedPendingSignatureRef.current !== null) return;
      pullRequestedRef.current = true;
      void coordinatorRef.current?.run();
    }, 30_000);
    return () => clearInterval(timer);
  }, [
    options.ownerId, options.syncEnabled,
    options.isStorageLoaded, options.isOwnerHydrationComplete,
  ]);

  const retry = () => {
    if (isOnline) {
      failedPendingSignatureRef.current = null;
      pullRequestedRef.current = true;
      void coordinatorRef.current?.run();
    }
  };

  return { status, isOnline, pendingChanges, retry };
}
