import { useEffect, useRef, useState } from 'react';
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

export function useSync(options: UseSyncOptions): UseSyncStatus {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const coordinatorRef = useRef<SyncCoordinator | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<UseSyncStatus>(initialStatus);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      coordinatorRef.current?.dispose();
      coordinatorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const current = optionsRef.current;
    if (
      !current.ownerId ||
      !current.premiumActive ||
      !current.isStorageLoaded ||
      !current.isOwnerHydrationComplete
    ) {
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
  ]);

  return status;
}
