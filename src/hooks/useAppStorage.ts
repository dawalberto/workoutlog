/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
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
} from '../services/db';

export interface UseAppStorageReturn {
  isStorageLoaded: boolean;
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
}

/**
 * Custom hook that manages the IndexedDB storage lifecycle, automatic
 * migration from legacy localStorage, and reactive persistence.
 */
export function useAppStorage(ownerId?: string): UseAppStorageReturn {
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
  const isStorageLoaded = loadedScope === scopeIdentity;

  // 1. Initial hydration from IndexedDB (with transparent localStorage migration)
  useEffect(() => {
    let isMounted = true;

    setLoadedScope(null);
    initAndMigrateStorage(storageScope)
      .then((data: AppStorageData) => {
        if (!isMounted) return;
        setRoutines(data.routines);
        setCatalog(data.catalog);
        setActiveSessions(data.activeSessions);
        setRmLogs(data.rmLogs);
        setWorkoutHistory(data.workoutHistory);
        setExerciseDiary(data.exerciseDiary);
        setLoadedScope(scopeIdentity);
      })
      .catch((err) => {
        console.error('[useAppStorage] Error initializing storage:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [scopeIdentity, storageScope]);

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

  return {
    isStorageLoaded,
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
  };
}
