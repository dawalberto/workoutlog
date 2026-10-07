import {
  acknowledgeSyncOperation,
  applyRemoteSyncChanges,
  flushScopedStorageWrites,
  getPendingSyncOperations,
  getServerCursor,
  type ServerRevisionUpdate,
  type StorageScope,
} from './db';
import {
  syncRecordId,
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
const backendApiOrigin = import.meta.env.VITE_BACKEND_API_ORIGIN ?? '';

export interface CloudSyncOptions {
  ownerId: string | null;
  accessToken: string | null;
  premiumActive: boolean;
  online: boolean;
  apiOrigin?: string;
  fetcher?: typeof fetch;
  maxRequestAttempts?: number;
  canSync?: () => boolean;
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

interface SyncPullResponse {
  changes: SyncRemoteChange[];
  nextCursor: string;
  hasMore: boolean;
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
    accessToken,
    premiumActive,
    online,
    fetcher = fetch,
    maxRequestAttempts = MAX_REQUEST_ATTEMPTS,
  } = options;
  if (
    !ownerId ||
    !accessToken ||
    !premiumActive ||
    !online ||
    options.canSync?.() === false
  ) {
    return { status: 'skipped', pulled: 0, pushed: 0 };
  }
  const authenticatedOwnerId = ownerId;
  const bearerToken = accessToken;
  const canSync = () => options.canSync?.() ?? true;

  const origin = (options.apiOrigin ?? backendApiOrigin).trim().replace(/\/+$/, '');
  if (!origin) throw new CloudSyncError('Backend API origin is not configured.');

  const scope: StorageScope = { ownerId: authenticatedOwnerId };
  await flushScopedStorageWrites(scope);
  let pulled = await pullChanges({
    origin,
    accessToken: bearerToken,
    scope,
    fetcher,
    maxRequestAttempts,
    canSync,
  });
  const initialPendingCount = (await getPendingSyncOperations(scope)).length;
  const maxPushRequests = initialPendingCount + MAX_STALE_CONFLICTS;
  let pushed = 0;
  let requests = 0;
  let staleConflicts = 0;
  const attemptedOperationIds = new Set<string>();

  while (requests < maxPushRequests) {
    await flushScopedStorageWrites(scope);
    const [operation] = await getPendingSyncOperations(scope);
    if (!operation) break;
    if (attemptedOperationIds.has(operation.request.operationId)) {
      throw new CloudSyncError('Sync stopped after an unresolved stale operation.');
    }
    attemptedOperationIds.add(operation.request.operationId);
    requests += 1;
    if (operation.request.changes.length > 100) {
      throw new CloudSyncError('Sync push exceeded the server batch limit.');
    }

    const response = await requestWithRetry(
      `${origin}/api/v1/sync/push`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation.request),
      },
      fetcher,
      maxRequestAttempts,
      canSync,
    );

    if (response.status === 409) {
      const conflict = await readJson(response);
      const code = objectValue(conflict)?.code;
      if (code === 'sync_operation_conflict') {
        throw new CloudSyncError(
          'Sync rejected a reused operation ID with a different payload.',
        );
      }
      if (code !== 'sync_stale_revision_conflict') {
        throw new CloudSyncError('Sync returned an unrecognized conflict response.');
      }
      staleConflicts += 1;
      if (staleConflicts > MAX_STALE_CONFLICTS) {
        throw new CloudSyncError('Sync stopped after repeated stale revisions.');
      }

      pulled += await pullChanges({
        origin,
        accessToken: bearerToken,
        scope,
        fetcher,
        maxRequestAttempts,
        canSync,
        fromBeginning: true,
      });
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

    if (!response.ok) throw await httpError(response, 'Sync push');
    const acknowledgement = parsePushAcknowledgement(await readJson(response));
    validateAcknowledgement(acknowledgement, operation);
    for (let index = 0; index < operation.request.changes.length; index += 1) {
      const requestedChange = operation.request.changes[index]!;
      const result = acknowledgement.changes[index]!;
      await acknowledgeSyncOperation(
        operation.request.operationId,
        result,
        scope,
      );
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
  origin: string;
  accessToken: string;
  scope: StorageScope;
  fetcher: typeof fetch;
  maxRequestAttempts: number;
  canSync: () => boolean;
  fromBeginning?: boolean;
}

async function pullChanges(options: PullOptions): Promise<number> {
  let cursor = options.fromBeginning ? '0' : await getServerCursor(options.scope);
  let pageCount = 0;
  let changeCount = 0;

  while (true) {
    pageCount += 1;
    if (pageCount > MAX_PULL_PAGES) {
      throw new CloudSyncError('Sync pull stopped after too many pages.');
    }
    const query = new URLSearchParams({ cursor, limit: String(PULL_LIMIT) });
    const response = await requestWithRetry(
      `${options.origin}/api/v1/sync/pull?${query.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${options.accessToken}`,
        },
      },
      options.fetcher,
      options.maxRequestAttempts,
      options.canSync,
    );
    if (!response.ok) throw await httpError(response, 'Sync pull');

    const page = parsePullResponse(await readJson(response));
    if (page.hasMore && compareRevisions(page.nextCursor, cursor) <= 0) {
      throw new CloudSyncError('Sync pull returned a non-advancing cursor.');
    }
    await applyRemoteSyncChanges(page.changes, page.nextCursor, options.scope);
    changeCount += page.changes.length;
    cursor = page.nextCursor;
    if (!page.hasMore) return changeCount;
  }
}

async function requestWithRetry(
  url: string,
  init: RequestInit,
  fetcher: typeof fetch,
  maxAttempts: number,
  canRequest: () => boolean,
): Promise<Response> {
  const attempts = Math.max(1, Math.floor(maxAttempts));
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (!canRequest()) {
      throw new CloudSyncError('Sync eligibility changed before the request.');
    }
    let response: Response;
    try {
      response = await fetcher(url, init);
    } catch {
      if (attempt === attempts) {
        throw new CloudSyncError(
          `Sync request failed after ${attempts} attempts.`,
        );
      }
      continue;
    }

    if (
      (response.status >= 500 || response.status === 429) &&
      attempt < attempts
    ) {
      lastStatus = response.status;
      continue;
    }
    if (response.status >= 500 || response.status === 429) {
      lastStatus = response.status;
      break;
    }
    return response;
  }

  throw new CloudSyncError(
    lastStatus === null
      ? `Sync request failed after ${attempts} attempts.`
      : `Sync request failed after ${attempts} attempts (${lastStatus}).`,
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new CloudSyncError('Sync service returned invalid JSON.');
  }
}

async function httpError(response: Response, operation: string): Promise<CloudSyncError> {
  const body = await readJson(response);
  const message = objectValue(body)?.message;
  const suffix = typeof message === 'string' ? `: ${message}` : '';
  return new CloudSyncError(`${operation} failed (${response.status})${suffix}`);
}

function parsePullResponse(value: unknown): SyncPullResponse {
  const response = objectValue(value);
  if (
    !response ||
    !Array.isArray(response.changes) ||
    typeof response.nextCursor !== 'string' ||
    !isDecimalRevision(response.nextCursor) ||
    typeof response.hasMore !== 'boolean'
  ) {
    throw new CloudSyncError('Sync pull returned an invalid response.');
  }
  return {
    changes: response.changes.map(parseRemoteChange),
    nextCursor: response.nextCursor,
    hasMore: response.hasMore,
  };
}

function parseRemoteChange(value: unknown): SyncRemoteChange {
  const change = objectValue(value);
  if (
    !change ||
    typeof change.table !== 'string' ||
    !SYNC_TABLES.includes(change.table as SyncTable) ||
    typeof change.id !== 'string' ||
    !change.id ||
    typeof change.revision !== 'string' ||
    !isDecimalRevision(change.revision) ||
    !(change.deletedAt === null || typeof change.deletedAt === 'string') ||
    !objectValue(change.record)
  ) {
    throw new CloudSyncError('Sync pull returned an invalid change.');
  }
  return {
    table: change.table as SyncTable,
    id: change.id,
    revision: change.revision,
    deletedAt: change.deletedAt as string | null,
    record: change.record as Record<string, unknown>,
  };
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
