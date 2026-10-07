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
  premiumActive: boolean;
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

export function useSync(options: UseSyncOptions): UseSyncResult {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const coordinatorRef = useRef<SyncCoordinator | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<UseSyncStatus>(initialStatus);
  const [isOnline, setIsOnline] = useState(isBrowserOnline);
  const [pendingState, setPendingState] = useState<{
    ownerId: string | null;
    count: number;
  }>({ ownerId: options.ownerId, count: 0 });
  const pendingChanges =
    pendingState.ownerId === options.ownerId ? pendingState.count : 0;

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
    } catch {
      return;
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
    const handleOnline = () => setIsOnline(isBrowserOnline());
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
    if (!options.ownerId || !options.isStorageLoaded) {
      setPendingState({ ownerId: options.ownerId, count: 0 });
      return;
    }
    void refreshPendingChanges(options.ownerId);
  }, [
    options.ownerId,
    options.isStorageLoaded,
    options.routines,
    options.catalog,
    options.activeSessions,
    options.rmLogs,
    options.workoutHistory,
    options.exerciseDiary,
    refreshPendingChanges,
  ]);

  useEffect(() => {
    const current = optionsRef.current;
    if (
      !current.ownerId ||
      !current.premiumActive ||
      !current.isStorageLoaded ||
      !current.isOwnerHydrationComplete
    ) {
      coordinatorRef.current?.dispose();
      coordinatorRef.current = null;
      setStatus((previous) => ({
        ...previous,
        state: 'idle',
        error: null,
      }));
      return;
    }

    if (!coordinatorRef.current) {
      const runSync = async () => {
        const latest = optionsRef.current;
        if (
          !latest.ownerId ||
          !latest.premiumActive ||
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

          const syncOwnerId = latest.ownerId;
          const isCurrentSync = () => {
            const current = optionsRef.current;
            return (
              mountedRef.current &&
              current.ownerId === syncOwnerId &&
              current.premiumActive &&
              current.isStorageLoaded &&
              current.isOwnerHydrationComplete &&
              isBrowserOnline()
            );
          };
          const result = await syncCloudData({
            ownerId: latest.ownerId,
            accessToken: session.access_token,
            premiumActive: latest.premiumActive,
            online: isBrowserOnline(),
            canSync: isCurrentSync,
          });
          if (!isCurrentSync()) {
            if (mountedRef.current) setStatus(initialStatus);
            return;
          }
          if (result.status === 'skipped') {
            if (mountedRef.current) setStatus(initialStatus);
            return;
          }
          if (result.pulled > 0) await latest.onSynced();
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
              !current.ownerId ||
              !current.premiumActive ||
              !current.isStorageLoaded ||
              !current.isOwnerHydrationComplete ||
              !isBrowserOnline()
            ) {
              setStatus(initialStatus);
              return;
            }
            await refreshPendingChanges(current.ownerId);
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
    void coordinatorRef.current.run();
  }, [
    options.ownerId,
    options.premiumActive,
    options.isStorageLoaded,
    options.isOwnerHydrationComplete,
    options.onSynced,
    options.routines,
    options.catalog,
    options.activeSessions,
    options.rmLogs,
    options.workoutHistory,
    options.exerciseDiary,
    refreshPendingChanges,
  ]);

  const retry = () => {
    if (isOnline) void coordinatorRef.current?.run();
  };

  return { status, isOnline, pendingChanges, retry };
}
