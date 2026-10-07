/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Routine,
  ExerciseDefinition,
  ActiveWorkoutSession,
  ExerciseRmLog,
  WorkoutHistoryLog,
  ExerciseDiary,
} from '../types';
import {
  initAndMigrateStorage,
  setScopedStoredItem,
  DB_KEYS,
  AppStorageData,
  GUEST_STORAGE_SCOPE,
  transferGuestDataToOwnerOnce,
  loadScopedAppStorageData,
} from '../services/db';

export interface UseAppStorageReturn {
  isStorageLoaded: boolean;
  isGuestTransferComplete: boolean;
  storageError: string | null;
  routines: Routine[];
  setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
  catalog: ExerciseDefinition[];
  setCatalog: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  activeSessions: Record<string, ActiveWorkoutSession>;
  setActiveSessions: React.Dispatch<React.SetStateAction<Record<string, ActiveWorkoutSession>>>;
  rmLogs: ExerciseRmLog[];
  setRmLogs: React.Dispatch<React.SetStateAction<ExerciseRmLog[]>>;
  workoutHistory: WorkoutHistoryLog[];
  setWorkoutHistory: React.Dispatch<React.SetStateAction<WorkoutHistoryLog[]>>;
  exerciseDiary: ExerciseDiary[];
  setExerciseDiary: React.Dispatch<React.SetStateAction<ExerciseDiary[]>>;
  applyImportData: (
    newCatalog: ExerciseDefinition[],
    newRoutines: Routine[],
    newRmLogs: ExerciseRmLog[],
    newHistory: WorkoutHistoryLog[],
    newDiary: ExerciseDiary[]
  ) => void;
  refreshStorage: () => Promise<void>;
}

/**
 * Custom hook that manages the IndexedDB storage lifecycle, automatic
 * migration from legacy localStorage, and reactive persistence.
 */
export function useAppStorage(
  ownerId?: string,
  transferGuestData = false,
): UseAppStorageReturn {
  const storageScope = useMemo(
    () => (ownerId ? { ownerId } : GUEST_STORAGE_SCOPE),
    [ownerId],
  );
  const scopeIdentity = ownerId ? `owner:${ownerId}` : GUEST_STORAGE_SCOPE;
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [catalog, setCatalog] = useState<ExerciseDefinition[]>([]);
  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveWorkoutSession>>({});
  const [rmLogs, setRmLogs] = useState<ExerciseRmLog[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryLog[]>([]);
  const [exerciseDiary, setExerciseDiary] = useState<ExerciseDiary[]>([]);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [isGuestTransferComplete, setIsGuestTransferComplete] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const isStorageLoaded = loadedScope === scopeIdentity;
  const scopeIdentityRef = useRef(scopeIdentity);
  const loadedScopeRef = useRef(loadedScope);
  scopeIdentityRef.current = scopeIdentity;
  loadedScopeRef.current = loadedScope;

  // 1. Initial hydration from IndexedDB (with transparent localStorage migration)
  useEffect(() => {
    let isMounted = true;

    setLoadedScope(null);
    setStorageError(null);
    setIsGuestTransferComplete(!ownerId || !transferGuestData);
    const loadStorage = async () => {
      let transferError: string | null = null;
      if (ownerId && transferGuestData) {
        setIsGuestTransferComplete(false);
        try {
          await transferGuestDataToOwnerOnce(ownerId);
          if (isMounted) setIsGuestTransferComplete(true);
        } catch (error) {
          transferError =
            error instanceof Error ? error.message : 'Account data transfer failed.';
          if (isMounted) setStorageError(transferError);
        }
      }

      const data = await initAndMigrateStorage(storageScope);
      return { data, transferError };
    };

    loadStorage()
      .then(({ data, transferError }: { data: AppStorageData; transferError: string | null }) => {
        if (!isMounted) return;
        setRoutines(data.routines);
        setCatalog(data.catalog);
        setActiveSessions(data.activeSessions);
        setRmLogs(data.rmLogs);
        setWorkoutHistory(data.workoutHistory);
        setExerciseDiary(data.exerciseDiary);
        setStorageError(transferError);
        setLoadedScope(scopeIdentity);
      })
      .catch((err) => {
        console.error('[useAppStorage] Error initializing storage:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [scopeIdentity, storageScope, ownerId, transferGuestData]);

  // 2. Reactive persistence effects to IndexedDB (only after initial hydration completes)
  useEffect(() => {
    if (!isStorageLoaded) return;
    setScopedStoredItem(DB_KEYS.ROUTINES, routines, storageScope);
  }, [routines, isStorageLoaded, storageScope]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setScopedStoredItem(DB_KEYS.CATALOG, catalog, storageScope);
  }, [catalog, isStorageLoaded, storageScope]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setScopedStoredItem(DB_KEYS.ACTIVE_SESSIONS, activeSessions, storageScope);
  }, [activeSessions, isStorageLoaded, storageScope]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setScopedStoredItem(DB_KEYS.RM_LOGS, rmLogs, storageScope);
  }, [rmLogs, isStorageLoaded, storageScope]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setScopedStoredItem(DB_KEYS.WORKOUT_HISTORY, workoutHistory, storageScope);
  }, [workoutHistory, isStorageLoaded, storageScope]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setScopedStoredItem(DB_KEYS.EXERCISE_DIARY, exerciseDiary, storageScope);
  }, [exerciseDiary, isStorageLoaded, storageScope]);

  const applyImportData = (
    newCatalog: ExerciseDefinition[],
    newRoutines: Routine[],
    newRmLogs: ExerciseRmLog[],
    newHistory: WorkoutHistoryLog[],
    newDiary: ExerciseDiary[]
  ) => {
    setCatalog(newCatalog);
    setRoutines(newRoutines);
    setRmLogs(newRmLogs);
    setWorkoutHistory(newHistory);
    setExerciseDiary(newDiary);
  };

  const refreshStorage = useCallback(async () => {
    if (!isStorageLoaded) return;
    const requestedScope = scopeIdentity;
    const data = await loadScopedAppStorageData(storageScope);
    if (
      scopeIdentityRef.current !== requestedScope ||
      loadedScopeRef.current !== requestedScope
    ) {
      return;
    }
    setRoutines(data.routines);
    setCatalog(data.catalog);
    setActiveSessions(data.activeSessions);
    setRmLogs(data.rmLogs);
    setWorkoutHistory(data.workoutHistory);
    setExerciseDiary(data.exerciseDiary);
  }, [isStorageLoaded, scopeIdentity, storageScope]);

  return {
    isStorageLoaded,
    isGuestTransferComplete,
    storageError,
    routines: isStorageLoaded ? routines : [],
    setRoutines,
    catalog: isStorageLoaded ? catalog : [],
    setCatalog,
    activeSessions: isStorageLoaded ? activeSessions : {},
    setActiveSessions,
    rmLogs: isStorageLoaded ? rmLogs : [],
    setRmLogs,
    workoutHistory: isStorageLoaded ? workoutHistory : [],
    setWorkoutHistory,
    exerciseDiary: isStorageLoaded ? exerciseDiary : [],
    setExerciseDiary,
    applyImportData,
    refreshStorage,
  };
}
