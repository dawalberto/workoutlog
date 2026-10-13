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
  updateRequired?: boolean;
}

export interface UseSyncResult {
  status: UseSyncStatus;
  isOnline: boolean;
  pendingChanges: number;
  retry: () => void;
  syncNow: () => Promise<void>;
  stopSync: () => Promise<void>;
  resumeSync: () => void;
}

const initialStatus: UseSyncStatus = {
  state: 'idle',
  error: null,
  lastSyncedAt: null,
  updateRequired: false,
};

function isBrowserOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Cloud sync failed.';
}

function isUpdateRequiredError(error: unknown): boolean {
  return error instanceof Error &&
    'updateRequired' in error &&
    error.updateRequired === true;
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
  const blockedOwnerIdRef = useRef<string | null>(null);
  const updateRequiredOwnerIdRef = useRef<string | null>(null);
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
    if (blockedOwnerIdRef.current && blockedOwnerIdRef.current !== options.ownerId) {
      blockedOwnerIdRef.current = null;
    }
    if (
      updateRequiredOwnerIdRef.current &&
      updateRequiredOwnerIdRef.current !== options.ownerId
    ) {
      updateRequiredOwnerIdRef.current = null;
    }
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
          blockedOwnerIdRef.current === syncOwnerId ||
          !latest.syncEnabled ||
          !latest.isStorageLoaded ||
          !latest.isOwnerHydrationComplete ||
          updateRequiredOwnerIdRef.current === syncOwnerId ||
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
              blockedOwnerIdRef.current !== syncOwnerId &&
              current.syncEnabled &&
              current.isStorageLoaded &&
              current.isOwnerHydrationComplete &&
              updateRequiredOwnerIdRef.current !== syncOwnerId &&
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
              updateRequired: false,
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
            const updateRequired = isUpdateRequiredError(error);
            if (updateRequired) {
              updateRequiredOwnerIdRef.current = syncOwnerId;
            }
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
              updateRequired,
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
      if (
        blockedOwnerIdRef.current === syncOwnerId ||
        updateRequiredOwnerIdRef.current === syncOwnerId
      ) return;
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
      if (
        !isBrowserOnline() ||
        failedPendingSignatureRef.current !== null ||
        blockedOwnerIdRef.current === options.ownerId ||
        updateRequiredOwnerIdRef.current === options.ownerId
      ) return;
      pullRequestedRef.current = true;
      void coordinatorRef.current?.run();
    }, 30_000);
    return () => clearInterval(timer);
  }, [
    options.ownerId, options.syncEnabled,
    options.isStorageLoaded, options.isOwnerHydrationComplete,
  ]);

  const retry = () => {
    if (
      isOnline &&
      blockedOwnerIdRef.current !== optionsRef.current.ownerId &&
      updateRequiredOwnerIdRef.current !== optionsRef.current.ownerId
    ) {
      failedPendingSignatureRef.current = null;
      pullRequestedRef.current = true;
      void coordinatorRef.current?.run();
    }
  };

  const syncNow = useCallback(async () => {
    const current = optionsRef.current;
    if (
      !current.ownerId ||
      blockedOwnerIdRef.current === current.ownerId ||
      updateRequiredOwnerIdRef.current === current.ownerId ||
      !current.syncEnabled ||
      !current.isStorageLoaded ||
      !current.isOwnerHydrationComplete ||
      !isBrowserOnline()
    ) {
      return;
    }
    await flushScopedStorageWrites({ ownerId: current.ownerId });
    pullRequestedRef.current = true;
    await coordinatorRef.current?.run();
  }, []);

  const stopSync = useCallback(async () => {
    const ownerId = optionsRef.current.ownerId;
    if (!ownerId) return;
    blockedOwnerIdRef.current = ownerId;
    try {
      await coordinatorRef.current?.run();
    } catch {
      // The blocked pass retains pending changes; the sign-out flow checks the durable outbox.
    }
  }, []);

  const resumeSync = useCallback(() => {
    const ownerId = optionsRef.current.ownerId;
    if (ownerId && blockedOwnerIdRef.current === ownerId) {
      blockedOwnerIdRef.current = null;
      pullRequestedRef.current = true;
      void coordinatorRef.current?.run();
    }
  }, []);

  return { status, isOnline, pendingChanges, retry, syncNow, stopSync, resumeSync };
}
