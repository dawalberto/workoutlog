/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Routine,
  ExerciseDefinition,
  ActiveWorkoutSession,
  ExerciseRmLog,
  WorkoutHistoryLog,
  ExerciseDiary,
} from '../types';

export const DB_NAME = 'WorkoutLogDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'app_state';

export const DB_KEYS = {
  ROUTINES: 'workout_planner_routines_v2',
  CATALOG: 'workout_planner_catalog_v2',
  ACTIVE_SESSIONS: 'workout_active_sessions_v1',
  RM_LOGS: 'workout_planner_rm_logs_v1',
  WORKOUT_HISTORY: 'workout_planner_history_v1',
  EXERCISE_DIARY: 'workout_planner_diary_v1',
  MIGRATION_FLAG: 'workout_migrated_from_localstorage_v1',
} as const;

export interface AppStorageData {
  routines: Routine[];
  catalog: ExerciseDefinition[];
  activeSessions: Record<string, ActiveWorkoutSession>;
  rmLogs: ExerciseRmLog[];
  workoutHistory: WorkoutHistoryLog[];
  exerciseDiary: ExerciseDiary[];
}

let dbInstancePromise: Promise<IDBDatabase> | null = null;

/**
 * Opens and caches the IndexedDB connection for the application.
 */
export function getDatabase(): Promise<IDBDatabase> {
  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbInstancePromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbInstancePromise = null;
      reject(request.error || new Error('Could not open IndexedDB.'));
    };

    request.onblocked = () => {
      console.warn('[WorkoutLogDB] Database open blocked by another tab or connection.');
    };
  });

  return dbInstancePromise;
}

/**
 * Retrieves a single stored item from IndexedDB with an optional fallback.
 */
export async function getStoredItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDatabase();
    return new Promise<T>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result !== undefined && req.result !== null) {
            resolve(req.result as T);
          } else {
            resolve(defaultValue);
          }
        };

        req.onerror = () => {
          console.warn(`[WorkoutLogDB] Error getting key "${key}":`, req.error);
          resolve(defaultValue);
        };
      } catch (err) {
        console.warn(`[WorkoutLogDB] Transaction error getting key "${key}":`, err);
        resolve(defaultValue);
      }
    });
  } catch (err) {
    console.warn(`[WorkoutLogDB] Failed to get key "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Raw internal put operation to IndexedDB.
 */
async function rawSetStoredItem<T>(key: string, value: T): Promise<void> {
  const db = await getDatabase();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error || new Error(`Error setting key "${key}"`));
      };

      tx.onabort = () => {
        reject(tx.error || new Error(`Transaction aborted for key "${key}"`));
      };
    } catch (err) {
      reject(err);
    }
  });
}

// Queue writes sequentially per key to prevent transaction collisions
const writeQueues = new Map<string, Promise<void>>();

/**
 * Stores an item in IndexedDB safely and sequentially.
 */
export function setStoredItem<T>(key: string, value: T): Promise<void> {
  const currentQueue = writeQueues.get(key) || Promise.resolve();
  const next = currentQueue
    .then(() => rawSetStoredItem(key, value))
    .catch((err) => {
      console.error(`[WorkoutLogDB] Error persisting "${key}":`, err);
    });

  writeQueues.set(key, next);
  return next;
}

/**
 * Removes a specific item from IndexedDB.
 */
export async function removeStoredItem(key: string): Promise<void> {
  try {
    const db = await getDatabase();
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.error(`[WorkoutLogDB] Error deleting key "${key}":`, err);
  }
}

/**
 * Clears all data in the object store.
 */
export async function clearAllStoredData(): Promise<void> {
  try {
    const db = await getDatabase();
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.error('[WorkoutLogDB] Error clearing database:', err);
  }
}

/**
 * Helper to safely read and parse a JSON key from localStorage.
 */
function readLocalStorageJson<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const item = window.localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (e) {
    console.warn(`[WorkoutLogDB] Error reading localStorage key "${key}":`, e);
    return null;
  }
}

/**
 * Initializes IndexedDB and performs an automatic, zero-friction, lossless
 * migration of any existing data from localStorage into IndexedDB.
 *
 * If data exists in localStorage and not yet in IndexedDB, it is copied
 * into IndexedDB immediately so the user experiences zero interruption
 * or loss of data.
 */
export async function initAndMigrateStorage(): Promise<AppStorageData> {
  // 1. Ensure database is open
  await getDatabase();

  // 2. Read all keys from IndexedDB
  const idbRoutines = await getStoredItem<Routine[] | null>(DB_KEYS.ROUTINES, null);
  const idbCatalog = await getStoredItem<ExerciseDefinition[] | null>(DB_KEYS.CATALOG, null);
  const idbActiveSessions = await getStoredItem<Record<string, ActiveWorkoutSession> | null>(
    DB_KEYS.ACTIVE_SESSIONS,
    null
  );
  const idbRmLogs = await getStoredItem<ExerciseRmLog[] | null>(DB_KEYS.RM_LOGS, null);
  const idbWorkoutHistory = await getStoredItem<WorkoutHistoryLog[] | null>(
    DB_KEYS.WORKOUT_HISTORY,
    null
  );
  const idbExerciseDiary = await getStoredItem<ExerciseDiary[] | null>(
    DB_KEYS.EXERCISE_DIARY,
    null
  );
  const isMigrated = await getStoredItem<boolean>(DB_KEYS.MIGRATION_FLAG, false);

  let finalRoutines = Array.isArray(idbRoutines) ? idbRoutines : [];
  let finalCatalog = Array.isArray(idbCatalog) ? idbCatalog : [];
  let finalActiveSessions =
    idbActiveSessions && typeof idbActiveSessions === 'object' ? idbActiveSessions : {};
  let finalRmLogs = Array.isArray(idbRmLogs) ? idbRmLogs : [];
  let finalWorkoutHistory = Array.isArray(idbWorkoutHistory) ? idbWorkoutHistory : [];
  let finalExerciseDiary = Array.isArray(idbExerciseDiary) ? idbExerciseDiary : [];

  let migratedAny = false;

  // 3. If migration hasn't been recorded yet, check localStorage for existing data
  if (!isMigrated) {
    console.log('[WorkoutLogDB] Checking localStorage for automatic migration to IndexedDB...');

    // Routines (check v2, then fallback to v1)
    if (finalRoutines.length === 0) {
      const lsRoutines =
        readLocalStorageJson<Routine[]>('workout_planner_routines_v2') ||
        readLocalStorageJson<Routine[]>('workout_planner_routines_v1');
      if (Array.isArray(lsRoutines) && lsRoutines.length > 0) {
        finalRoutines = lsRoutines;
        await setStoredItem(DB_KEYS.ROUTINES, finalRoutines);
        migratedAny = true;
      }
    }

    // Catalog (check v2, then fallback to v1)
    if (finalCatalog.length === 0) {
      const lsCatalog =
        readLocalStorageJson<ExerciseDefinition[]>('workout_planner_catalog_v2') ||
        readLocalStorageJson<ExerciseDefinition[]>('workout_planner_catalog_v1');
      if (Array.isArray(lsCatalog) && lsCatalog.length > 0) {
        finalCatalog = lsCatalog;
        await setStoredItem(DB_KEYS.CATALOG, finalCatalog);
        migratedAny = true;
      }
    }

    // Active Sessions
    if (Object.keys(finalActiveSessions).length === 0) {
      const lsSessions = readLocalStorageJson<Record<string, ActiveWorkoutSession>>(
        'workout_active_sessions_v1'
      );
      if (lsSessions && typeof lsSessions === 'object') {
        finalActiveSessions = lsSessions;
        await setStoredItem(DB_KEYS.ACTIVE_SESSIONS, finalActiveSessions);
        migratedAny = true;
      }
    }

    // RM Logs
    if (finalRmLogs.length === 0) {
      const lsRmLogs = readLocalStorageJson<ExerciseRmLog[]>('workout_planner_rm_logs_v1');
      if (Array.isArray(lsRmLogs) && lsRmLogs.length > 0) {
        finalRmLogs = lsRmLogs;
        await setStoredItem(DB_KEYS.RM_LOGS, finalRmLogs);
        migratedAny = true;
      }
    }

    // Workout History
    if (finalWorkoutHistory.length === 0) {
      const lsHistory = readLocalStorageJson<WorkoutHistoryLog[]>('workout_planner_history_v1');
      if (Array.isArray(lsHistory) && lsHistory.length > 0) {
        finalWorkoutHistory = lsHistory;
        await setStoredItem(DB_KEYS.WORKOUT_HISTORY, finalWorkoutHistory);
        migratedAny = true;
      }
    }

    // Exercise Diary
    if (finalExerciseDiary.length === 0) {
      const lsDiary = readLocalStorageJson<ExerciseDiary[]>('workout_planner_diary_v1');
      if (Array.isArray(lsDiary) && lsDiary.length > 0) {
        finalExerciseDiary = lsDiary;
        await setStoredItem(DB_KEYS.EXERCISE_DIARY, finalExerciseDiary);
        migratedAny = true;
      }
    }

    // Mark migration as completed in IndexedDB
    await setStoredItem(DB_KEYS.MIGRATION_FLAG, true);

    if (migratedAny) {
      console.log(
        `[WorkoutLogDB] Migración completada con éxito: ${finalRoutines.length} rutinas, ${finalCatalog.length} ejercicios, ${finalRmLogs.length} RMs, ${finalWorkoutHistory.length} sesiones y ${finalExerciseDiary.length} diarios transferidos a IndexedDB.`
      );
    }
  }

  return {
    routines: finalRoutines,
    catalog: finalCatalog,
    activeSessions: finalActiveSessions,
    rmLogs: finalRmLogs,
    workoutHistory: finalWorkoutHistory,
    exerciseDiary: finalExerciseDiary,
  };
}
