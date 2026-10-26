# Frontend–backend strategy (sync contract)

The authoritative description of how the WorkoutLog client and Supabase communicate, and the checklist for changing that contract safely.

Last verified: 2026-10-13

## Read this first

- The sync contract is versioned. Use the typed [`src/sync/contract.ts`](../../src/sync/contract.ts) manifest as the client source of truth; private SQL metadata drives the server whitelist, and CI checks parity.
- Deployed PWAs can run an old bundle. Migrate the database **before** deploying the frontend, and only make additive changes.
- Use the [checklist](#checklist-add-a-synced-field-or-table) for any new synced field or table. Ship the migration, client, tests, and docs together.

## Communication

| Channel | Used for | Code |
|---|---|---|
| `supabase-js` `client.rpc('sync_push', …)` | All writes | [`src/services/cloud-sync.ts`](../../src/services/cloud-sync.ts) ~285–312 |
| `client.from(table).select('*').gt('server_revision', cursor)` | Pull | cloud-sync.ts ~208–238 |
| `client.from(parentTable).select('id').eq('id', …)` | FK repair lookup | cloud-sync.ts ~137–138 |
| `client.rpc('get_sync_entitlement')` | Sync eligibility | [`src/services/auth.ts`](../../src/services/auth.ts) line 10 |
| `client.auth.*` | Google OAuth, session | [`src/services/auth.ts`](../../src/services/auth.ts), [`src/hooks/useAuth.ts`](../../src/hooks/useAuth.ts) |
There is no REST server, no GraphQL, no Realtime subscription. Event triggers (queued local changes, login, reconnect, retry) drive sync without periodic polling.
## Auth flow

1. Client is created only if `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are valid; otherwise `null` → local-only ([`src/services/supabase.ts`](../../src/services/supabase.ts) ~14–35).
2. Client options: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`.
3. Sign-in: `signInWithOAuth({ provider: 'google', options: { redirectTo } })` with `redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin)` — i.e. `/workoutlog/` in production ([`useAuth.ts`](../../src/hooks/useAuth.ts) 25–27). The redirect URL must be allow-listed in Supabase Auth.
4. After sign-in, `get_sync_entitlement()` returns `{ eligible: true }` for every authenticated user; `account.isSyncEnabled` gates sync ([ADR 0005](../decisions/0005-remove-billing-signed-in-sync.md)).

## Storage scopes and guest → owner transfer

| Scope | Key | Synced |
|---|---|---|
| Guest | `guest` | No (outbox is kept locally) |
| Owner | `owner:<encodeURIComponent(userId)>` | Yes |

- IndexedDB `WorkoutLogDB` v2: stores `app_state`, `record_metadata`, `sync_outbox` (autoincrement `sequence`; indexes `scope`, unique `operationId`), `sync_cursors` ([`src/services/db.ts`](../../src/services/db.ts) 28–37, 197–220).
- On first sign-in, `transferGuestDataToOwnerOnce` moves guest state, metadata, and outbox into the owner scope ([`db.ts`](../../src/services/db.ts) 479–~570).
- Sync waits for owner-scope hydration, which is coordinated by [`useStorageLifecycle`](../../src/hooks/useStorageLifecycle.ts) through the persistence adapter.

## Outbox entry

One outbox entry = one operation = **exactly one change** (`changes: [SyncPushChange]`, [`src/services/sync-queue.ts`](../../src/services/sync-queue.ts) 37–62).

```ts
{
  sequence: number,            // IndexedDB autoincrement, FIFO order
  operationId: string,         // UUID, idempotency key
  recordId: string,
  change: {
    table: SyncTable,          // one of the 12 tables
    operation: 'upsert' | 'delete',
    baseRevision: string,      // decimal string; '0' for new records
    record: Record<string, unknown>,
  },
}
```

- Entries are created by diffing previous vs next collection state (`diffSyncCollection`) inside the same transaction as the state write (`writeStoredItems`, db.ts ~281–350).
- Ordering (`orderSyncOperations`): parent upserts before children, child deletes before parents, per-record order preserved, otherwise stable FIFO ([`tests/services/sync-queue.test.ts`](../../tests/services/sync-queue.test.ts)).
- Revisions and cursors are **decimal strings** (bigint-safe), compared with `compareRevisions`.

## Push / pull algorithm

`syncCloudData` ([cloud-sync.ts](../../src/services/cloud-sync.ts) ~71–186):

1. Skip unless owner, sync enabled, online, client present, and `canSync()`.
2. Flush pending IndexedDB writes. **Pull first** (unless `pull: false`).
3. Loop over pending operations (dependency-ordered):
   - Admit the whole current queue snapshot as one "drain round". New edits arriving later need another round; after `MAX_PUSH_DRAIN_ROUNDS` the pass stops with an error and changes stay pending.
   - Push via `pushWithRetry` (up to `MAX_REQUEST_ATTEMPTS` for retryable errors).
   - On acknowledgement: validate, store per-change `server_revision`, remove from outbox.
   - On stale / FK: see [conflict model](#conflict-model).
4. If anything remains pending, throw ("Sync stopped before pending changes were drained").

Pull (`pullChanges`, ~197–242): for each of the 12 `SYNC_TABLES` in order, page `server_revision > tableCursor` ascending, `PULL_LIMIT` rows per page, up to `MAX_PULL_PAGES`; per-table cursors advance independently (the read is not atomic across tables). Changes are sorted by revision and applied with `applyRemoteSyncChanges`, which preserves operations that were pending when the pull started.

| Constant | Value | Where |
|---|---|---|
| Max changes per `sync_push` | 100 (server); client sends 1 | migration + cloud-sync.ts |
| `PULL_LIMIT` | 500 | cloud-sync.ts ~37 |
| `MAX_PULL_PAGES` | 100 | ~38 |
| `MAX_REQUEST_ATTEMPTS` | 3 | ~39 |
| `MAX_STALE_CONFLICTS` | 5 | ~40 |
| `MAX_PUSH_DRAIN_ROUNDS` | 3 | ~41 |
| Supabase API `max_rows` | 1000 | [`supabase/config.toml`](../../supabase/config.toml) ~18 |

Triggers ([`useSync`](../../src/hooks/useSync.ts)): local queued change (push), login, reconnect, Retry button. After a failure, automatic retries are suppressed for the same pending signature until the queue changes or the user presses Retry (useSync.ts 215–244).

## Conflict model

- **Server acceptance order wins**, never device clocks. Every accepted write gets the next global `server_revision`.
- `sync_push` rejects as stale when: the row is missing and `baseRevision` ≠ 0; `baseRevision` > server revision; or an upsert targets a tombstone with an older base (no resurrection). An older base on a live row is accepted.
- Client on stale: increment counter (max `MAX_STALE_CONFLICTS`), pull **from revision 0**, and require that the stale operation was reconciled by the pull; otherwise error.
- Deletes are tombstones (`deleted_at`); there is no DELETE policy. Tombstones are pulled like any row.

### FK `23503` repair

When a push fails with `23503`:

1. If the change has no optional parent reference (`optionalSyncReference`) → error, original op kept.
2. Look up the parent by ID. Lookup error → error, original op kept.
3. Parent exists → error ("unresolved foreign key violation").
4. Parent absent → clear the optional reference (`repairRejectedSyncReference`), re-queue with a **fresh operation UUID**, continue. The local snapshot remains intact.

## Error model

| Server result | Client behavior |
|---|---|
| Message contains `sync_stale_revision_conflict` | Stale handling (above) |
| Message contains `sync_operation_conflict` | Hard error: reused operation ID with different payload |
| SQLSTATE `23503` | FK repair (above) |
| SQLSTATE class `22`, `23`, `28`, `42`, or `P0001` | Hard rejection: "Sync push was rejected; pending changes are retained." |
| Anything else (network, 5xx, …) | Retry up to `MAX_REQUEST_ATTEMPTS`, then error |

All errors surface in `useSync` as `state: 'error'` with a message; the UI ([`SyncStatus`](../../src/components/SyncStatus.tsx)) shows "Error de sincronización" and a Retry ("Reintentar") button. Local data is never discarded. Full list of `sync_*` messages: [backend](backend.md#sync_push-errors).

## Pagination

Pull pages are 500 rows (below the 1000 `max_rows` cap). A page with fewer than 500 rows ends that table. A non-advancing cursor or more than 100 pages is an error.

## Versioning

The client declares `SYNC_CONTRACT_VERSION` in [`src/sync/contract.ts`](../../src/sync/contract.ts) and sends it as `p_contract_version` to `sync_push`. The server checks `private.sync_contract_versions`; `NULL` is temporarily treated as legacy version 1. An unsupported version raises `sync_contract_version_unsupported` (`P0001`) before an idempotency receipt is written, so rejected work remains in the local outbox. The client shows the Spanish notice “Actualiza la app para continuar sincronizando.” and keeps queued changes.

To retire the legacy window, use a forward migration to stop mapping `NULL` to version 1 and mark version 1 unaccepted. Bump the client version and update accepted-version metadata when the wire shape changes. Apply the database migration before deploying the frontend; stale bundles can remain open after deployment.

The backup format version in [`src/utils/backup.ts`](../../src/utils/backup.ts) is independent and remains `1`; do not bump it solely for a sync contract change. See [ADR 0008](../decisions/0008-sync-contract-source-and-version.md).

## Environments

| Environment | Supabase | Frontend vars |
|---|---|---|
| Local-only | none | unset |
| Local dev | `supabase start` (API `http://127.0.0.1:54321`) | `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| CI | `supabase start` inside the `database` job; frontend job builds without vars | — |
| Production | Supabase Cloud project (Free tier; may pause) | GitHub repo variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

## Contract sources

| Source | Responsibility |
|---|---|
| [`src/sync/contract.ts`](../../src/sync/contract.ts) | Client source of truth: version, tables, writable columns, identities, FK edges, and local-store mappings. |
| `private.sync_contract_tables` and `private.sync_contract_versions` | Server metadata for allowed tables/columns and accepted contract versions; inaccessible to client roles. |
| `pnpm sync:contract:check` | Compares the typed client snapshot with SQL metadata; runs in the CI database job. |
| `src/types/database.types.ts` | Generated database row types; regenerate from the local schema. |
| Sync services and tests | Implement table mapping, conversion, validation, and pull/push behavior; derive shared contract lists from the manifest. |

## Checklist: add a synced field or table

1. Edit `src/sync/contract.ts` for the client contract; keep table/column lists derived from the manifest rather than hard-coded elsewhere.
2. Add a forward migration for schema changes and update private contract metadata. Change `sync_push` only when its validation or behavior must change.
3. Start local Supabase, then run `pnpm db:reset && pnpm db:test && pnpm db:types && pnpm sync:contract:check`.
4. If the wire shape changes, bump `SYNC_CONTRACT_VERSION` and update the server's accepted versions in the migration metadata. Re-run the parity check.
5. Add or update pgTAP and Vitest coverage; run `pnpm test`, `pnpm lint`, and `pnpm build`.
6. Deploy the database migration before deploying the frontend. Keep old clients and their outboxes safe during the accepted-version grace window.

## Evolving without breaking clients

| Rule | Why |
|---|---|
| Add columns as nullable/defaulted first | Old clients do not send them |
| Keep fields and behavior compatible while a client version is accepted | An accepted old bundle must still be able to push its shape |
| Before an incompatible change, stop accepting the old version | Stale clients receive an update-required error and retain their outbox |
| Apply the migration to production **before** deploying the frontend | New clients must never push fields the server does not accept |
| Remember service worker `autoUpdate` | Users get the new bundle only after the SW updates; old tabs may run for a while |
| Keep backup import tolerant of older shapes | Users restore old exports |

## Collaboration workflow

- Single maintainer. One PR contains migration + regenerated types + client + tests on both sides + docs.
- Use an ODD task doc for contract changes (substantial by definition): see [agents guide](../agents-guide.md#odd-workflow).

## Related

- [Backend architecture](backend.md)
- [Frontend architecture](frontend.md)
- [Architecture overview](overview.md)
- [Testing strategy](../standards/testing-strategy.md)
- [ADR 0008 – Sync contract source and version](../decisions/0008-sync-contract-source-and-version.md)
- [ADR 0004 – Revision-based outbox sync](../decisions/0004-revision-based-outbox-sync.md)
- [Offline sync skill](../../.github/skills/workoutlog-offline-sync/SKILL.md)
- [Root README](../../README.md)
