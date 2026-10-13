import type { Json } from '../types/database.types';
import type { SupabaseBrowserClient } from './supabase';
import {
  acknowledgeSyncOperation,
  applyRemoteSyncChanges,
  flushScopedStorageWrites,
  getPendingSyncOperations,
  getServerCursor,
  repairRejectedSyncReference,
  type ServerRevisionUpdate,
  type StorageScope,
} from './db';
import {
  syncRecordId,
  optionalSyncReference,
  validateWorkoutHistoryRecord,
  type SyncQueueEntry,
  type SyncRemoteChange,
  type SyncTable,
} from './sync-queue';

const SYNC_TABLES: readonly SyncTable[] = [
  'exercise_definitions',
  'routines',
  'routine_exercises',
  'workout_sets',
  'active_workout_sessions',
  'active_session_completed_sets',
  'rm_logs',
  'rm_records',
  'workout_history',
  'workout_history_exercises',
  'exercise_diaries',
  'exercise_diary_entries',
];

const PULL_LIMIT = 500;
const MAX_PULL_PAGES = 100;
const MAX_REQUEST_ATTEMPTS = 3;
const MAX_STALE_CONFLICTS = 5;
const MAX_PUSH_DRAIN_ROUNDS = 3;

export interface CloudSyncOptions {
  ownerId: string | null;
  syncEnabled: boolean;
  online: boolean;
  client: SupabaseBrowserClient | null;
  maxRequestAttempts?: number;
  canSync?: () => boolean;
  pull?: boolean;
}

export interface CloudSyncResult {
  status: 'skipped' | 'synced';
  pulled: number;
  pushed: number;
}

export class CloudSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudSyncError';
  }
}

interface SyncPushAcknowledgement {
  operationId: string;
  changes: ServerRevisionUpdate[];
}

export async function syncCloudData(
  options: CloudSyncOptions,
): Promise<CloudSyncResult> {
  const {
    ownerId,
    syncEnabled,
    online,
    client,
    maxRequestAttempts = MAX_REQUEST_ATTEMPTS,
  } = options;
  if (
    !ownerId ||
    !syncEnabled ||
    !online ||
    !client ||
    options.canSync?.() === false
  ) {
    return { status: 'skipped', pulled: 0, pushed: 0 };
  }

  const scope: StorageScope = { ownerId };
  const canSync = () => options.canSync?.() ?? true;
  await flushScopedStorageWrites(scope);
  let pulled = options.pull === false ? 0 : await pullChanges({ client, scope, canSync });
  let pushed = 0;
  let drainRounds = 0;
  let staleConflicts = 0;
  const admittedSequences = new Set<number>();
  const attemptedOperationIds = new Set<string>();

  while (true) {
    await flushScopedStorageWrites(scope);
    const pending = await getPendingSyncOperations(scope);
    const [operation] = pending;
    if (!operation) break;
    if (!admittedSequences.has(operation.sequence)) {
      if (drainRounds === MAX_PUSH_DRAIN_ROUNDS) {
        throw new CloudSyncError(
          `Sync stopped after ${MAX_PUSH_DRAIN_ROUNDS} queue drain rounds; pending changes are retained.`,
        );
      }
      // Admit an entire queue snapshot, including dependency-ordered parents.
      // Repairs keep their sequence; newly queued edits consume another round.
      for (const entry of pending) admittedSequences.add(entry.sequence);
      drainRounds += 1;
    }
    if (attemptedOperationIds.has(operation.request.operationId)) {
      throw new CloudSyncError('Sync stopped after an unresolved stale operation.');
    }
    attemptedOperationIds.add(operation.request.operationId);
    if (operation.request.changes.length > 100) {
      throw new CloudSyncError('Sync push exceeded the server batch limit.');
    }

    const push = await pushWithRetry(
      client,
      operation,
      maxRequestAttempts,
      canSync,
    );
    if (push.kind === 'foreign-key') {
      const reference = optionalSyncReference(operation.request.changes[0]);
      if (!reference) {
        throw new CloudSyncError('Sync push failed: required parent is missing (foreign key violation).');
      }
      if (!canSync()) throw new CloudSyncError('Sync eligibility changed before the request.');
      const { data, error } = await client.from(reference.parentTable)
        .select('id').eq('id', reference.parentId).limit(1);
      if (error) {
        throw new CloudSyncError(`Sync parent lookup failed: ${error.message}`);
      }
      if ((data ?? []).length > 0) {
        throw new CloudSyncError('Sync push failed: unresolved foreign key violation.');
      }
      if (!canSync()) throw new CloudSyncError('Sync eligibility changed before repair.');
      if (!await repairRejectedSyncReference(
        operation.request.operationId, reference.column, reference.parentId, scope,
      )) {
        throw new CloudSyncError('Sync could not repair the rejected optional reference.');
      }
      continue;
    }
    if (push.kind === 'stale') {
      staleConflicts += 1;
      if (staleConflicts > MAX_STALE_CONFLICTS) {
        throw new CloudSyncError('Sync stopped after repeated stale revisions.');
      }
      pulled += await pullChanges({ client, scope, canSync, fromBeginning: true });
      const pendingAfterPull = await getPendingSyncOperations(scope);
      if (
        pendingAfterPull.some(
          (pending) =>
            pending.request.operationId === operation.request.operationId,
        )
      ) {
        throw new CloudSyncError(
          'Sync could not reconcile the server revision conflict.',
        );
      }
      continue;
    }

    validateAcknowledgement(push.acknowledgement, operation);
    for (let index = 0; index < operation.request.changes.length; index += 1) {
      const requestedChange = operation.request.changes[index]!;
      const result = push.acknowledgement.changes[index]!;
      await acknowledgeSyncOperation(operation.request.operationId, result, scope);
      if (result.table !== requestedChange.table) {
        throw new CloudSyncError('Sync acknowledgement changed the record table.');
      }
    }
    pushed += operation.request.changes.length;
  }

  if ((await getPendingSyncOperations(scope)).length > 0) {
    throw new CloudSyncError('Sync stopped before pending changes were drained.');
  }
  return { status: 'synced', pulled, pushed };
}

interface PullOptions {
  client: SupabaseBrowserClient;
  scope: StorageScope;
  canSync: () => boolean;
  fromBeginning?: boolean;
}

async function pullChanges(options: PullOptions): Promise<number> {
  const cursor = options.fromBeginning ? '0' : await getServerCursor(options.scope);
  const pendingAtPullStart = new Set(
    (await getPendingSyncOperations(options.scope)).map((operation) => operation.request.operationId),
  );
  const changes: SyncRemoteChange[] = [];
  const tableCursors: Partial<Record<SyncTable, string>> = {};

  // Each table advances independently; a later table cannot skip unseen revisions
  // committed to an earlier table while this non-atomic read is in progress.
  for (const table of SYNC_TABLES) {
    let tableCursor = options.fromBeginning ? '0' : await getServerCursor(options.scope, table);
    for (let page = 1; page <= MAX_PULL_PAGES; page += 1) {
      if (!options.canSync()) {
        throw new CloudSyncError('Sync eligibility changed before the request.');
      }
      const { data, error } = await options.client
        .from(table)
        .select('*')
        .gt('server_revision', tableCursor as never)
        .order('server_revision', { ascending: true })
        .limit(PULL_LIMIT);
      if (error) throw new CloudSyncError(`Sync pull failed: ${error.message}`);

      const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
      for (const row of rows) {
        changes.push(parseTableRow(table, row));
      }
      const lastRevision = changes.at(-1)?.revision;
      if (rows.length < PULL_LIMIT) {
        tableCursors[table] = rows.length > 0 ? lastRevision! : tableCursor;
        break;
      }
      if (!lastRevision || compareRevisions(lastRevision, tableCursor) <= 0) {
        throw new CloudSyncError('Sync pull returned a non-advancing cursor.');
      }
      tableCursor = lastRevision;
      if (page === MAX_PULL_PAGES) {
        throw new CloudSyncError('Sync pull stopped after too many pages.');
      }
    }
  }

  changes.sort((left, right) => compareRevisions(left.revision, right.revision));
  const nextCursor = changes.at(-1)?.revision ?? cursor;
  await applyRemoteSyncChanges(changes, nextCursor, options.scope, tableCursors, pendingAtPullStart);
  return changes.length;
}

function parseTableRow(
  table: SyncTable,
  row: Record<string, unknown>,
): SyncRemoteChange {
  const revision = row.server_revision;
  if (
    !(typeof revision === 'number' || typeof revision === 'string') ||
    !isDecimalRevision(String(revision))
  ) {
    throw new CloudSyncError('Sync pull returned an invalid server revision.');
  }
  const record = { ...row };
  const id = syncRecordId(table, record);
  const change: SyncRemoteChange = {
    table,
    id,
    revision: String(revision),
    deletedAt: typeof row.deleted_at === 'string' ? row.deleted_at : null,
    record,
  };
  validateRemoteChange(change);
  return change;
}

async function pushWithRetry(
  client: SupabaseBrowserClient,
  operation: SyncQueueEntry,
  maxAttempts: number,
  canRequest: () => boolean,
): Promise<
  | { kind: 'acknowledgement'; acknowledgement: SyncPushAcknowledgement }
  | { kind: 'stale' }
  | { kind: 'foreign-key' }
> {
  const attempts = Math.max(1, Math.floor(maxAttempts));
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (!canRequest()) {
      throw new CloudSyncError('Sync eligibility changed before the request.');
    }
    const { data, error } = await client.rpc('sync_push', {
      p_operation_id: operation.request.operationId,
      p_changes: operation.request.changes as unknown as Json,
    });
    if (!error) {
      return {
        kind: 'acknowledgement',
        acknowledgement: parsePushAcknowledgement(data),
      };
    }

    const message = error.message || 'unknown RPC error';
    if (message.includes('sync_stale_revision_conflict')) return { kind: 'stale' };
    if (message.includes('sync_operation_conflict')) {
      throw new CloudSyncError(
        'Sync rejected a reused operation ID with a different payload.',
      );
    }
    if (error.code === '23503') return { kind: 'foreign-key' };
    if (/^(22|23|28|42)/.test(error.code ?? '') || error.code === 'P0001') {
      throw new CloudSyncError('Sync push was rejected; pending changes are retained.');
    }
    lastError = message;
    if (attempt === attempts) break;
  }

  throw new CloudSyncError(
    `Sync push failed after ${attempts} attempts${lastError ? `: ${lastError}` : '.'}`,
  );
}

function parsePushAcknowledgement(value: unknown): SyncPushAcknowledgement {
  const response = objectValue(value);
  if (
    !response ||
    typeof response.operationId !== 'string' ||
    !Array.isArray(response.changes)
  ) {
    throw new CloudSyncError('Sync push returned an invalid acknowledgement.');
  }
  return {
    operationId: response.operationId,
    changes: response.changes.map((change) => {
      const result = objectValue(change);
      if (
        !result ||
        typeof result.table !== 'string' ||
        !SYNC_TABLES.includes(result.table as SyncTable) ||
        typeof result.id !== 'string' ||
        !result.id ||
        typeof result.revision !== 'string' ||
        !isDecimalRevision(result.revision) ||
        !(result.deletedAt === null || typeof result.deletedAt === 'string')
      ) {
        throw new CloudSyncError('Sync push returned an invalid record acknowledgement.');
      }
      return {
        table: result.table as SyncTable,
        id: result.id,
        revision: result.revision,
        deletedAt: result.deletedAt as string | null,
      };
    }),
  };
}

function validateRemoteChange(change: SyncRemoteChange): void {
  if (
    change.table === 'workout_history' ||
    change.table === 'workout_history_exercises'
  ) {
    try {
      validateWorkoutHistoryRecord(
        change.table,
        change.id,
        change.record,
        change.deletedAt === null,
      );
    } catch {
      throw new CloudSyncError(
        'Sync pull returned an invalid workout history record.',
      );
    }
  }
}

function validateAcknowledgement(
  acknowledgement: SyncPushAcknowledgement,
  operation: SyncQueueEntry,
): void {
  const requested = operation.request.changes;
  if (
    acknowledgement.operationId !== operation.request.operationId ||
    acknowledgement.changes.length !== requested.length
  ) {
    throw new CloudSyncError('Sync acknowledgement does not match the request.');
  }
  for (let index = 0; index < requested.length; index += 1) {
    const request = requested[index]!;
    const result = acknowledgement.changes[index]!;
    if (
      request.table !== result.table ||
      syncRecordId(request.table, request.record) !== result.id
    ) {
      throw new CloudSyncError('Sync acknowledgement does not match the record.');
    }
  }
}

function isDecimalRevision(value: string): boolean {
  if (!/^(0|[1-9]\d{0,18})$/.test(value)) return false;
  try {
    return BigInt(value) <= 9223372036854775807n;
  } catch {
    return false;
  }
}

function compareRevisions(left: string, right: string): number {
  const leftRevision = BigInt(left);
  const rightRevision = BigInt(right);
  return leftRevision === rightRevision ? 0 : leftRevision < rightRevision ? -1 : 1;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export interface SyncCoordinator {
  run(): Promise<void>;
  dispose(): void;
}

export function createSyncCoordinator(
  sync: () => Promise<void>,
  isOnline: () => boolean,
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
): SyncCoordinator {
  let active: Promise<void> | null = null;
  let disposed = false;
  let rerunRequested = false;
  const run = (): Promise<void> => {
    if (disposed || !isOnline()) return Promise.resolve();
    if (active) {
      rerunRequested = true;
      return active;
    }

    let wrapped: Promise<void>;
    const pending = Promise.resolve().then(async () => {
      for (let pass = 0; pass < 2; pass += 1) {
        rerunRequested = false;
        await sync();
        if (!rerunRequested || disposed || !isOnline()) return;
      }
    });
    wrapped = pending.finally(() => {
      if (active === wrapped) active = null;
    });
    active = wrapped;
    return wrapped;
  };
  const handleOnline: EventListener = () => {
    void run().catch(() => undefined);
  };

  target.addEventListener('online', handleOnline);
  return {
    run,
    dispose: () => {
      disposed = true;
      target.removeEventListener('online', handleOnline);
    },
  };
}
