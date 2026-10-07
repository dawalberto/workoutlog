/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Routine,
  ExerciseDefinition,
  ActiveWorkoutSession,
  ExerciseRmLog,
  WorkoutHistoryLog,
  ExerciseDiary,
} from '../types';
import { getStarterData } from '../data/initialData';
import {
  diffSyncCollection,
  getSyncCollection,
  type SyncQueueEntry,
  type SyncPushChange,
  type SyncTable,
} from './sync-queue';

export const DB_NAME = 'WorkoutLogDB';
export const DB_VERSION = 2;
export const STORE_NAME = 'app_state';
export const RECORD_META_STORE = 'record_metadata';
export const SYNC_OUTBOX_STORE = 'sync_outbox';
export const SYNC_CURSOR_STORE = 'sync_cursors';
export const GUEST_STORAGE_SCOPE = 'guest' as const;

export const DB_KEYS = {
  ROUTINES: 'workout_planner_routines_v2',
  CATALOG: 'workout_planner_catalog_v2',
  ACTIVE_SESSIONS: 'workout_active_sessions_v1',
  RM_LOGS: 'workout_planner_rm_logs_v1',
  WORKOUT_HISTORY: 'workout_planner_history_v1',
  EXERCISE_DIARY: 'workout_planner_diary_v1',
  MIGRATION_FLAG: 'workout_migrated_from_localstorage_v1',
  STARTER_DATA_FLAG: 'workout_starter_data_initialized_v1',
} as const;

export type StorageScope = typeof GUEST_STORAGE_SCOPE | { ownerId: string };

interface RecordMetadata {
  key: string;
  scope: string;
  table: string;
  id: string;
  serverRevision: string;
  localRevision: number;
  deleted: boolean;
}

interface StoredSyncOperation {
  sequence?: number;
  operationId: string;
  scope: string;
  recordId: string;
  change: {
    table: SyncTable;
    operation: 'upsert' | 'delete';
    baseRevision: string;
    record: Record<string, unknown>;
  };
}

interface SyncCursor {
  scope: string;
  cursor: string;
}

export interface AppStorageData {
  routines: Routine[];
  catalog: ExerciseDefinition[];
  activeSessions: Record<string, ActiveWorkoutSession>;
  rmLogs: ExerciseRmLog[];
  workoutHistory: WorkoutHistoryLog[];
  exerciseDiary: ExerciseDiary[];
}

let dbInstancePromise: Promise<IDBDatabase> | null = null;
const writeQueues = new Map<string, Promise<void>>();

function scopeKey(scope: StorageScope): string {
  if (scope === GUEST_STORAGE_SCOPE) return GUEST_STORAGE_SCOPE;
  if (!scope.ownerId.trim()) throw new Error('Storage owner ID cannot be empty.');
  return `owner:${encodeURIComponent(scope.ownerId)}`;
}

function scopedItemKey(key: string, scope: StorageScope): string {
  const keyForScope = scopeKey(scope);
  return keyForScope === GUEST_STORAGE_SCOPE ? key : `${keyForScope}:${key}`;
}

function metadataKey(scope: string, table: string, id: string): string {
  return JSON.stringify([scope, table, id]);
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Transaction failed.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function createOperationId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

const legacyCollectionKeys = [
  DB_KEYS.ROUTINES,
  DB_KEYS.CATALOG,
  DB_KEYS.ACTIVE_SESSIONS,
  DB_KEYS.RM_LOGS,
  DB_KEYS.WORKOUT_HISTORY,
  DB_KEYS.EXERCISE_DIARY,
] as const;

function migrateLegacyOutbox(transaction: IDBTransaction): void {
  const stateStore = transaction.objectStore(STORE_NAME);
  const metadataStore = transaction.objectStore(RECORD_META_STORE);
  const outboxStore = transaction.objectStore(SYNC_OUTBOX_STORE);
  const owner = scopeKey(GUEST_STORAGE_SCOPE);

  for (const key of legacyCollectionKeys) {
    const collection = getSyncCollection(key);
    if (!collection) continue;

    const request = stateStore.get(key);
    request.onsuccess = () => {
      if (request.result === undefined || request.result === null) return;

      for (const change of diffSyncCollection(collection, undefined, request.result)) {
        const keyForRecord = metadataKey(owner, change.table, change.id);
        metadataStore.put({
          key: keyForRecord,
          scope: owner,
          table: change.table,
          id: change.id,
          serverRevision: '0',
          localRevision: 1,
          deleted: false,
        } satisfies RecordMetadata);
        outboxStore.add({
          operationId: createOperationId(),
          scope: owner,
          recordId: change.id,
          change: {
            table: change.table,
            operation: change.operation,
            baseRevision: '0',
            record: change.record,
          },
        } satisfies StoredSyncOperation);
      }
    };
  }
}

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

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }

      if (!db.objectStoreNames.contains(RECORD_META_STORE)) {
        db.createObjectStore(RECORD_META_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(SYNC_OUTBOX_STORE)) {
        const outbox = db.createObjectStore(SYNC_OUTBOX_STORE, {
          keyPath: 'sequence',
          autoIncrement: true,
        });
        outbox.createIndex('scope', 'scope');
        outbox.createIndex('operationId', 'operationId', { unique: true });
      }
      if (!db.objectStoreNames.contains(SYNC_CURSOR_STORE)) {
        db.createObjectStore(SYNC_CURSOR_STORE, { keyPath: 'scope' });
      }

      if (request.transaction) migrateLegacyOutbox(request.transaction);
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
 * Retrieves one owner-scoped value with an optional fallback.
 */
export async function getScopedStoredItem<T>(
  key: string,
  defaultValue: T,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<T> {
  try {
    const value = await readScopedStoredValue(key, scope);
    return value === undefined || value === null ? defaultValue : (value as T);
  } catch (error) {
    console.warn(`[WorkoutLogDB] Failed to get key "${key}":`, error);
    return defaultValue;
  }
}

async function readScopedStoredValue(key: string, scope: StorageScope): Promise<unknown> {
  const db = await getDatabase();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const completed = transactionComplete(transaction);
  const value = await requestResult(
    transaction.objectStore(STORE_NAME).get(scopedItemKey(key, scope)),
  );
  await completed;
  return value;
}

export function getStoredItem<T>(
  key: string,
  defaultValue: T,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<T> {
  return getScopedStoredItem(key, defaultValue, scope);
}

async function writeStoredItems<T>(
  entries: Array<{ key: string; value: T }>,
  scope: StorageScope,
): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction(
    [STORE_NAME, RECORD_META_STORE, SYNC_OUTBOX_STORE],
    'readwrite',
  );
  const completed = transactionComplete(transaction);
  const stateStore = transaction.objectStore(STORE_NAME);
  const metadataStore = transaction.objectStore(RECORD_META_STORE);
  const outboxStore = transaction.objectStore(SYNC_OUTBOX_STORE);
  const owner = scopeKey(scope);

  for (const { key, value } of entries) {
    const collection = getSyncCollection(key);
    const storageKey = scopedItemKey(key, scope);
    const previousRequest = stateStore.get(storageKey);
    previousRequest.onsuccess = () => {
      stateStore.put(value, storageKey);
      if (!collection) return;

      const changes = diffSyncCollection(collection, previousRequest.result, value);
      for (const change of changes) {
        const keyForRecord = metadataKey(owner, change.table, change.id);
        const metadataRequest = metadataStore.get(keyForRecord);
        metadataRequest.onsuccess = () => {
          const previousMetadata = metadataRequest.result as RecordMetadata | undefined;
          const metadata: RecordMetadata = {
            key: keyForRecord,
            scope: owner,
            table: change.table,
            id: change.id,
            serverRevision: previousMetadata?.serverRevision ?? '0',
            localRevision: (previousMetadata?.localRevision ?? 0) + 1,
            deleted: change.operation === 'delete',
          };
          const operation: StoredSyncOperation = {
            operationId: createOperationId(),
            scope: owner,
            recordId: change.id,
            change: {
              table: change.table,
              operation: change.operation,
              baseRevision: metadata.serverRevision,
              record: change.record,
            },
          };
          metadataStore.put(metadata);
          outboxStore.add(operation);
        };
      }
    };
  }

  await completed;
}

async function writeUntrackedItem<T>(
  key: string,
  value: T,
  scope: StorageScope,
): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const completed = transactionComplete(transaction);
  transaction.objectStore(STORE_NAME).put(value, scopedItemKey(key, scope));
  await completed;
}

/**
 * Stores a value and, for synchronized collections, writes matching revision
 * metadata and outbox changes in the same IndexedDB transaction.
 */
export function setScopedStoredItem<T>(
  key: string,
  value: T,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<void> {
  const queueKey = `${scopeKey(scope)}:${key}`;
  const currentQueue = writeQueues.get(queueKey) ?? Promise.resolve();
  const next = currentQueue
    .then(() =>
      getSyncCollection(key)
        ? writeStoredItems([{ key, value }], scope)
        : writeUntrackedItem(key, value, scope),
    )
    .catch((error) => {
      console.error(`[WorkoutLogDB] Error persisting "${key}":`, error);
    });
  writeQueues.set(queueKey, next);
  return next;
}

export function setStoredItem<T>(
  key: string,
  value: T,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<void> {
  return setScopedStoredItem(key, value, scope);
}

async function removeUntrackedItem(key: string, scope: StorageScope): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const completed = transactionComplete(transaction);
  transaction.objectStore(STORE_NAME).delete(scopedItemKey(key, scope));
  await completed;
}

export async function removeScopedStoredItem(
  key: string,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<void> {
  if (getSyncCollection(key)) {
    const emptyValue = key === DB_KEYS.ACTIVE_SESSIONS ? {} : [];
    await setScopedStoredItem(key, emptyValue, scope);
    return;
  }
  await removeUntrackedItem(key, scope);
}

export function removeStoredItem(
  key: string,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<void> {
  return removeScopedStoredItem(key, scope);
}

async function writeCollectionBatch(
  entries: Array<{ key: string; value: unknown }>,
  scope: StorageScope,
): Promise<void> {
  await writeStoredItems(entries, scope);
}

/**
 * Clears one scope's visible collections by recording ordinary tombstones.
 */
export async function clearAllStoredData(
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<void> {
  const emptyCollections = [
    { key: DB_KEYS.ROUTINES, value: [] },
    { key: DB_KEYS.CATALOG, value: [] },
    { key: DB_KEYS.ACTIVE_SESSIONS, value: {} },
    { key: DB_KEYS.RM_LOGS, value: [] },
    { key: DB_KEYS.WORKOUT_HISTORY, value: [] },
    { key: DB_KEYS.EXERCISE_DIARY, value: [] },
  ];
  await writeCollectionBatch(emptyCollections, scope);
}

export interface ServerRevisionUpdate {
  table: SyncTable;
  id: string;
  revision: string;
  deletedAt: string | null;
}

function assertServerRevision(revision: string): void {
  if (!/^(0|[1-9]\d{0,18})$/.test(revision) || BigInt(revision) > 9223372036854775807n) {
    throw new Error('Server revision must be a non-negative 64-bit decimal string.');
  }
}

export async function getPendingSyncOperations(
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<SyncQueueEntry[]> {
  const db = await getDatabase();
  const transaction = db.transaction(SYNC_OUTBOX_STORE, 'readonly');
  const completed = transactionComplete(transaction);
  const stored = await requestResult(
    transaction.objectStore(SYNC_OUTBOX_STORE).index('scope').getAll(scopeKey(scope)),
  );
  await completed;

  return (stored as StoredSyncOperation[])
    .filter((operation): operation is StoredSyncOperation & { sequence: number } =>
      Number.isInteger(operation.sequence),
    )
    .sort((left, right) => left.sequence - right.sequence)
    .map((operation) => ({
      sequence: operation.sequence,
      request: {
        operationId: operation.operationId,
        changes: [operation.change as SyncPushChange],
      },
    }));
}

export async function getServerCursor(
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<string> {
  const db = await getDatabase();
  const transaction = db.transaction(SYNC_CURSOR_STORE, 'readonly');
  const completed = transactionComplete(transaction);
  const cursor = await requestResult(
    transaction.objectStore(SYNC_CURSOR_STORE).get(scopeKey(scope)),
  );
  await completed;
  return (cursor as SyncCursor | undefined)?.cursor ?? '0';
}

export async function setServerCursor(
  cursor: string,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<void> {
  assertServerRevision(cursor);
  const db = await getDatabase();
  const transaction = db.transaction(SYNC_CURSOR_STORE, 'readwrite');
  const completed = transactionComplete(transaction);
  transaction.objectStore(SYNC_CURSOR_STORE).put({ scope: scopeKey(scope), cursor });
  await completed;
}

export async function getRecordMetadata(
  table: SyncTable,
  id: string,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<RecordMetadata | undefined> {
  const db = await getDatabase();
  const transaction = db.transaction(RECORD_META_STORE, 'readonly');
  const completed = transactionComplete(transaction);
  const metadata = await requestResult(
    transaction.objectStore(RECORD_META_STORE).get(metadataKey(scopeKey(scope), table, id)),
  );
  await completed;
  return metadata as RecordMetadata | undefined;
}

export async function saveServerRevision(
  table: SyncTable,
  id: string,
  serverRevision: string,
  deleted: boolean,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<void> {
  assertServerRevision(serverRevision);
  const db = await getDatabase();
  const transaction = db.transaction(RECORD_META_STORE, 'readwrite');
  const completed = transactionComplete(transaction);
  const store = transaction.objectStore(RECORD_META_STORE);
  const owner = scopeKey(scope);
  const key = metadataKey(owner, table, id);
  const request = store.get(key);
  request.onsuccess = () => {
    const previous = request.result as RecordMetadata | undefined;
    store.put({
      key,
      scope: owner,
      table,
      id,
      serverRevision,
      localRevision: previous?.localRevision ?? 0,
      deleted,
    } satisfies RecordMetadata);
  };
  await completed;
}

/**
 * Removes only a confirmed operation and advances metadata for its record.
 * An unacknowledged operation remains byte-for-byte replayable by its ID.
 */
export async function acknowledgeSyncOperation(
  operationId: string,
  result: ServerRevisionUpdate,
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<void> {
  assertServerRevision(result.revision);
  const db = await getDatabase();
  const transaction = db.transaction(
    [SYNC_OUTBOX_STORE, RECORD_META_STORE],
    'readwrite',
  );
  const completed = transactionComplete(transaction);
  const owner = scopeKey(scope);
  const outbox = transaction.objectStore(SYNC_OUTBOX_STORE);
  const metadataStore = transaction.objectStore(RECORD_META_STORE);
  const operationsRequest = outbox.index('scope').getAll(owner);

  operationsRequest.onsuccess = () => {
    const operations = (operationsRequest.result as StoredSyncOperation[]).sort(
      (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0),
    );
    const acknowledged = operations.find((item) => item.operationId === operationId);
    const acknowledgedSequence = acknowledged?.sequence;
    if (
      !acknowledged ||
      acknowledged.change.table !== result.table ||
      acknowledged.recordId !== result.id ||
      acknowledgedSequence === undefined
    ) {
      return;
    }

    const metadataId = metadataKey(owner, result.table, result.id);
    const metadataRequest = metadataStore.get(metadataId);
    metadataRequest.onsuccess = () => {
      const previous = metadataRequest.result as RecordMetadata | undefined;
      metadataStore.put({
        key: metadataId,
        scope: owner,
        table: result.table,
        id: result.id,
        serverRevision: result.revision,
        localRevision: previous?.localRevision ?? 0,
        deleted: result.deletedAt !== null,
      } satisfies RecordMetadata);

      for (const operation of operations) {
        if (
          operation.sequence !== undefined &&
          operation.sequence > acknowledgedSequence &&
          operation.recordId === result.id &&
          operation.change.table === result.table
        ) {
          operation.change.baseRevision = result.revision;
          outbox.put(operation);
        }
      }
      outbox.delete(acknowledgedSequence);
    };
  };

  await completed;
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
export async function initAndMigrateStorage(
  scope: StorageScope = GUEST_STORAGE_SCOPE,
): Promise<AppStorageData> {
  await getDatabase();
  let data = await readCollectionData(scope);

  const isMigrated = await getScopedStoredItem<boolean>(DB_KEYS.MIGRATION_FLAG, false, scope);
  if (!isMigrated) {
    const entries: Array<{ key: string; value: unknown }> = [];

    if (scope === GUEST_STORAGE_SCOPE) {
      if (data.routines.length === 0) {
        const routines =
          readLocalStorageJson<Routine[]>('workout_planner_routines_v2') ||
          readLocalStorageJson<Routine[]>('workout_planner_routines_v1');
        if (Array.isArray(routines) && routines.length > 0) {
          data.routines = routines;
          entries.push({ key: DB_KEYS.ROUTINES, value: routines });
        }
      }

      if (data.catalog.length === 0) {
        const catalog =
          readLocalStorageJson<ExerciseDefinition[]>('workout_planner_catalog_v2') ||
          readLocalStorageJson<ExerciseDefinition[]>('workout_planner_catalog_v1');
        if (Array.isArray(catalog) && catalog.length > 0) {
          data.catalog = catalog;
          entries.push({ key: DB_KEYS.CATALOG, value: catalog });
        }
      }

      if (Object.keys(data.activeSessions).length === 0) {
        const sessions = readLocalStorageJson<Record<string, ActiveWorkoutSession>>(
          'workout_active_sessions_v1',
        );
        if (sessions && typeof sessions === 'object' && !Array.isArray(sessions)) {
          data.activeSessions = sessions;
          entries.push({ key: DB_KEYS.ACTIVE_SESSIONS, value: sessions });
        }
      }

      if (data.rmLogs.length === 0) {
        const logs = readLocalStorageJson<ExerciseRmLog[]>('workout_planner_rm_logs_v1');
        if (Array.isArray(logs) && logs.length > 0) {
          data.rmLogs = logs;
          entries.push({ key: DB_KEYS.RM_LOGS, value: logs });
        }
      }

      if (data.workoutHistory.length === 0) {
        const history = readLocalStorageJson<WorkoutHistoryLog[]>(
          'workout_planner_history_v1',
        );
        if (Array.isArray(history) && history.length > 0) {
          data.workoutHistory = history;
          entries.push({ key: DB_KEYS.WORKOUT_HISTORY, value: history });
        }
      }

      if (data.exerciseDiary.length === 0) {
        const diary = readLocalStorageJson<ExerciseDiary[]>('workout_planner_diary_v1');
        if (Array.isArray(diary) && diary.length > 0) {
          data.exerciseDiary = diary;
          entries.push({ key: DB_KEYS.EXERCISE_DIARY, value: diary });
        }
      }
    }

    if (entries.length > 0) {
      await writeCollectionBatch(entries, scope);
      console.info('[WorkoutLogDB] Migrated legacy localStorage collections.');
    }
    await setScopedStoredItem(DB_KEYS.MIGRATION_FLAG, true, scope);
  }

  const seedInitialized = await getScopedStoredItem<boolean>(
    DB_KEYS.STARTER_DATA_FLAG,
    false,
    scope,
  );
  if (!seedInitialized) {
    const hasExistingData =
      data.routines.length > 0 ||
      data.catalog.length > 0 ||
      Object.keys(data.activeSessions).length > 0 ||
      data.rmLogs.length > 0 ||
      data.workoutHistory.length > 0 ||
      data.exerciseDiary.length > 0;

    if (!hasExistingData) {
      const starterData = getStarterData();
      await writeCollectionBatch(
        [
          { key: DB_KEYS.CATALOG, value: starterData.catalog },
          { key: DB_KEYS.ROUTINES, value: starterData.routines },
        ],
        scope,
      );
    }
    await setScopedStoredItem(DB_KEYS.STARTER_DATA_FLAG, true, scope);
  }

  return readCollectionData(scope);
}

async function readCollectionData(scope: StorageScope): Promise<AppStorageData> {
  const [
    routines,
    catalog,
    activeSessions,
    rmLogs,
    workoutHistory,
    exerciseDiary,
  ] = await Promise.all([
    readScopedStoredValue(DB_KEYS.ROUTINES, scope),
    readScopedStoredValue(DB_KEYS.CATALOG, scope),
    readScopedStoredValue(DB_KEYS.ACTIVE_SESSIONS, scope),
    readScopedStoredValue(DB_KEYS.RM_LOGS, scope),
    readScopedStoredValue(DB_KEYS.WORKOUT_HISTORY, scope),
    readScopedStoredValue(DB_KEYS.EXERCISE_DIARY, scope),
  ]);

  return {
    routines: Array.isArray(routines) ? routines : [],
    catalog: Array.isArray(catalog) ? catalog : [],
    activeSessions:
      activeSessions && typeof activeSessions === 'object' && !Array.isArray(activeSessions)
        ? (activeSessions as Record<string, ActiveWorkoutSession>)
        : {},
    rmLogs: Array.isArray(rmLogs) ? rmLogs : [],
    workoutHistory: Array.isArray(workoutHistory) ? workoutHistory : [],
    exerciseDiary: Array.isArray(exerciseDiary) ? exerciseDiary : [],
  };
}
