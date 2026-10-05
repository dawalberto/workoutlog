/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
  setStoredItem,
  DB_KEYS,
  AppStorageData,
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
export function useAppStorage(): UseAppStorageReturn {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [catalog, setCatalog] = useState<ExerciseDefinition[]>([]);
  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveWorkoutSession>>({});
  const [rmLogs, setRmLogs] = useState<ExerciseRmLog[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryLog[]>([]);
  const [exerciseDiary, setExerciseDiary] = useState<ExerciseDiary[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);

  // 1. Initial hydration from IndexedDB (with transparent localStorage migration)
  useEffect(() => {
    let isMounted = true;

    initAndMigrateStorage()
      .then((data: AppStorageData) => {
        if (!isMounted) return;
        setRoutines(data.routines);
        setCatalog(data.catalog);
        setActiveSessions(data.activeSessions);
        setRmLogs(data.rmLogs);
        setWorkoutHistory(data.workoutHistory);
        setExerciseDiary(data.exerciseDiary);
        setIsStorageLoaded(true);
      })
      .catch((err) => {
        console.error('[useAppStorage] Error initializing storage:', err);
        if (isMounted) setIsStorageLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Reactive persistence effects to IndexedDB (only after initial hydration completes)
  useEffect(() => {
    if (!isStorageLoaded) return;
    setStoredItem(DB_KEYS.ROUTINES, routines);
  }, [routines, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setStoredItem(DB_KEYS.CATALOG, catalog);
  }, [catalog, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setStoredItem(DB_KEYS.ACTIVE_SESSIONS, activeSessions);
  }, [activeSessions, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setStoredItem(DB_KEYS.RM_LOGS, rmLogs);
  }, [rmLogs, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setStoredItem(DB_KEYS.WORKOUT_HISTORY, workoutHistory);
  }, [workoutHistory, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    setStoredItem(DB_KEYS.EXERCISE_DIARY, exerciseDiary);
  }, [exerciseDiary, isStorageLoaded]);

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
    routines,
    setRoutines,
    catalog,
    setCatalog,
    activeSessions,
    setActiveSessions,
    rmLogs,
    setRmLogs,
    workoutHistory,
    setWorkoutHistory,
    exerciseDiary,
    setExerciseDiary,
    applyImportData,
  };
}
