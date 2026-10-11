# Frontend–backend strategy (sync contract)

The authoritative description of how the WorkoutLog client and Supabase communicate, and the checklist for changing that contract safely.

Last verified: 2026-10-11

## Read this first

- The contract is **not versioned** and is **duplicated** between SQL and TypeScript. Changing one side without the other breaks sync for every device.
- Deployed PWAs can run an old bundle. Migrate the database **before** deploying the frontend, and only make additive changes.
- Use the [checklist](#checklist-add-a-synced-field-or-table) for any new synced field or table. Ship migration, types, client, and tests in **one PR**.

## Communication

| Channel | Used for | Code |
|---|---|---|
| `supabase-js` `client.rpc('sync_push', …)` | All writes | [`src/services/cloud-sync.ts`](../../src/services/cloud-sync.ts) ~285–312 |
| `client.from(table).select('*').gt('server_revision', cursor)` | Pull | cloud-sync.ts ~208–238 |
| `client.from(parentTable).select('id').eq('id', …)` | FK repair lookup | cloud-sync.ts ~137–138 |
| `client.rpc('get_sync_entitlement')` | Sync eligibility | [`src/services/auth.ts`](../../src/services/auth.ts) line 10 |
| `client.auth.*` | Google OAuth, session | [`src/services/auth.ts`](../../src/services/auth.ts), [`src/hooks/useAuth.ts`](../../src/hooks/useAuth.ts) |

There is no REST server, no GraphQL, no Realtime subscription. Polling (30 s) plus event triggers replace push from the server.

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
- Sync waits for owner-scope hydration ([`useAppStorage`](../../src/hooks/useAppStorage.ts)).

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
| Polling interval | 30 s | [`useSync.ts`](../../src/hooks/useSync.ts) ~354–358 |
| Supabase API `max_rows` | 1000 | [`supabase/config.toml`](../../supabase/config.toml) ~18 |

Triggers ([`useSync`](../../src/hooks/useSync.ts)): local queued change (push), login, reconnect, Retry button, 30 s online polling (pull + push). After a failure, automatic retries are suppressed for the same pending signature until the queue changes or the user presses Retry (useSync.ts 215–244).

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

None. There is no contract version field, no RPC versioning (`sync_push` is replaced with `CREATE OR REPLACE`), and the backup format `version` is always `1` ([`src/utils/backup.ts`](../../src/utils/backup.ts) 21–30). Implications:

- Old clients and new servers must interoperate during rollout.
- Breaking changes require a new RPC name or a coordinated, documented migration. `TODO(human): decide a versioning strategy if a breaking contract change becomes necessary.`

## Environments

| Environment | Supabase | Frontend vars |
|---|---|---|
| Local-only | none | unset |
| Local dev | `supabase start` (API `http://127.0.0.1:54321`) | `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| CI | `supabase start` inside the `database` job; frontend job builds without vars | — |
| Production | Supabase Cloud project (Free tier; may pause) | GitHub repo variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

## Where the contract is duplicated

| File | What to keep in sync |
|---|---|
| Latest `sync_push` migration ([`20261010111000_…`](../../supabase/migrations/20261010111000_preserve_history_metrics_in_sync_push.sql)) | Table/column whitelist, identity keys, FK checks |
| Table migrations | Columns, PK, FKs, sync metadata trigger, RLS, grants |
| [`src/types/database.types.ts`](../../src/types/database.types.ts) | Generated row types |
| [`src/services/sync-queue.ts`](../../src/services/sync-queue.ts) | `SyncTable`, collections, diff, record identity, FK order, optional references, `applyRemoteSyncChange` |
| [`src/services/cloud-sync.ts`](../../src/services/cloud-sync.ts) | `SYNC_TABLES` order, remote row validation |
| [`src/services/db.ts`](../../src/services/db.ts) | Collection keys, hydration, metadata, remote apply/merge |
| [`src/types.ts`](../../src/types.ts) | Domain types |
| [`src/utils/backup.ts`](../../src/utils/backup.ts) | Export/import sanitization |
| `supabase/tests/*.test.sql`, `tests/services/*.test.ts` | Both sides' tests |

## Checklist: add a synced field or table

1. **Migration** (new file `YYYYMMDDHHMMSS_snake_description.sql`): add the column (nullable or defaulted) or the table with `user_id` FK `ON DELETE CASCADE`, composite PK, `server_revision`, `server_updated_at`, `deleted_at`, `created_at`, the `set_workout_sync_metadata` trigger, RLS owner select/insert/update policies, grants.
2. **Migration**: `CREATE OR REPLACE FUNCTION public.sync_push` copied from the latest definition (`20261010111000`), extending whitelist/columns/FK checks. Keep `SECURITY DEFINER`, `search_path`, revoke/grant.
3. **pgTAP** in `supabase/tests/` (`BEGIN; SELECT plan(N); … ROLLBACK;`) for RLS and `sync_push` behavior.
4. **Types**: regenerate `src/types/database.types.ts` (see [backend](backend.md#type-generation)).
5. **sync-queue.ts**: `SyncTable`/collection, diff, record id, FK dependency order, `applyRemoteSyncChange`.
6. **cloud-sync.ts**: `SYNC_TABLES` (parent before child) and remote validation.
7. **db.ts**: collection mapping, hydration, metadata.
8. **Domain**: `src/types.ts`, hooks, App state.
9. **Backup**: `src/utils/backup.ts` import/export sanitization (accept old backups without the field).
10. **Vitest**: `tests/services/*` (sync-queue, cloud-sync, db) and `tests/utils/backup.test.ts`.
11. **Docs**: this file, [backend](backend.md), [glossary](../domain/glossary.md), README if user-visible.
12. Run `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:reset`, `pnpm db:test`, `pnpm db:lint` (DB commands require `supabase start`, Docker).

## Evolving without breaking clients

| Rule | Why |
|---|---|
| Add columns as nullable/defaulted first | Old clients do not send them |
| Never remove or rename a column a deployed client sends | `sync_push` would reject unknown fields (`sync_change_field_not_allowed`) or lose data |
| Keep old `sync_push` behavior for existing fields | Old bundles keep pushing the old shape |
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
- [ADR 0004 – Revision-based outbox sync](../decisions/0004-revision-based-outbox-sync.md)
- [Offline sync skill](../../.github/skills/workoutlog-offline-sync/SKILL.md)
- [Root README](../../README.md)
