# Backend architecture

What the Supabase backend contains — schema, RLS, RPCs, auth, migrations — and what it deliberately does not contain.

Last verified: 2026-10-14

## At a glance

- **Supabase only**: Auth + Postgres 17 + RLS + RPCs. There is no custom server. Rest-timer push storage and dispatch are installed with `pg_cron` and `pg_net`; the `send-rest-push` Edge Function source is added in the next work unit.
- 12 owner-scoped tables in `public`, all with sync metadata maintained by a trigger.
- Clients write through versioned `public.sync_push` and read with table selects. Private contract metadata drives its whitelist. Contract details: [frontend–backend strategy](frontend-backend-strategy.md).
- Migrations in [`supabase/migrations/`](../../supabase/migrations/20261007135400_create_private_workout_data.sql) are forward-only; never edit an applied one.

## Schema

All tables: `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, composite keys scoped by `user_id`, plus `server_revision bigint`, `server_updated_at`, `deleted_at` (tombstone), `created_at`. Source: [`20261007135400_create_private_workout_data.sql`](../../supabase/migrations/20261007135400_create_private_workout_data.sql) lines 56–278 (history columns extended in `20261007180000_preserve_workout_history_metrics.sql`).

| Table | Primary key | Parent FKs (all include `user_id`) |
|---|---|---|
| `exercise_definitions` | `(user_id, id)` | — |
| `routines` | `(user_id, id)` | — |
| `routine_exercises` | `(user_id, id)` | `routines`, `exercise_definitions` (via `definition_id`) |
| `workout_sets` | `(user_id, id)` | `routine_exercises` (`routine_id`, `routine_exercise_id`) |
| `active_workout_sessions` | `(user_id, routine_id)` | `routines` |
| `active_session_completed_sets` | `(user_id, routine_id, set_id)` | `active_workout_sessions`, `workout_sets` |
| `rm_logs` | `(user_id, id)` | `exercise_definitions` |
| `rm_records` | `(user_id, id)` | `rm_logs` |
| `workout_history` | `(user_id, id)` | `routines` |
| `workout_history_exercises` | `(user_id, history_id, position)` | `workout_history` |
| `exercise_diaries` | `(user_id, id)` | `exercise_definitions` |
| `exercise_diary_entries` | `(user_id, id)` | `exercise_diaries` |

`public.user_entitlements` was created in the same migration and dropped in `20261010110000` (legacy).

### Sync metadata trigger

- `private.next_sync_revision()` increments a **single global counter** (`private.sync_revision`, one row) — revisions are monotonic across all tables and users.
- `private.set_workout_sync_metadata()` (BEFORE INSERT/UPDATE trigger on every table) sets `server_revision`, `server_updated_at = clock_timestamp()`, and preserves `created_at` on update.
- Both are `SECURITY DEFINER`, `SET search_path = pg_catalog, private`, execute revoked from `PUBLIC, anon, authenticated` (lines 14–54).

### Private schema

`private` is revoked from `PUBLIC, anon, authenticated`. It holds `sync_revision`, `sync_push_receipts` (idempotency receipts, from `20261007150000_add_sync_push.sql`), the trigger functions, and sync contract metadata:

- `private.sync_contract_tables` stores the ordered table names and writable columns used by `sync_push`.
- `private.sync_contract_versions` stores client contract versions and whether each is accepted. Version 1 is accepted; a missing RPC version is currently treated as legacy version 1.

The TypeScript manifest at [`src/sync/contract.ts`](../../src/sync/contract.ts) is the client source of truth. `pnpm sync:contract:check` compares its snapshot with the private SQL metadata and runs in the CI database job.

## RLS

| Operation | Policy | Notes |
|---|---|---|
| SELECT | `<table>_owner_select`: `user_id = (select auth.uid())` | authenticated only |
| INSERT | `<table>_owner_insert`: `WITH CHECK user_id = auth.uid()` | policy retained as defense in depth; direct client INSERT privilege is revoked |
| UPDATE | `<table>_owner_update`: `USING` + `WITH CHECK` owner | policy retained as defense in depth; direct client UPDATE privilege is revoked |
| DELETE | **none** | Deletion = setting `deleted_at` (tombstone) through `sync_push` |

Grants: the initial migration grants `SELECT, INSERT, UPDATE` to `authenticated`; the forward migration [`20261013155500_revoke_direct_sync_table_writes.sql`](../../supabase/migrations/20261013155500_revoke_direct_sync_table_writes.sql) revokes direct `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` from `PUBLIC`, `anon`, and `authenticated` on all synced tables. Authenticated `SELECT` remains available for pull reads. `sync_push` is the only client write path; its `SECURITY DEFINER` owner retains the table privileges required to apply validated changes. The RLS insert/update policies remain in place as defense in depth. See [security](../standards/security.md#synced-table-writes).

## RPCs

| Function | Security | Access | Purpose |
|---|---|---|---|
| `public.sync_push(p_operation_id uuid, p_changes jsonb, p_contract_version integer DEFAULT NULL) returns jsonb` | `SECURITY DEFINER`, `search_path = pg_catalog, private` | `authenticated` | Validated, idempotent batch of 1–100 upserts/deletes; child upserts under tombstoned parents and live descendants of newly tombstoned parents receive tombstones with new revisions |
| `public.get_sync_entitlement() returns jsonb` | `SECURITY INVOKER`, `search_path = pg_catalog` | `authenticated` only | Returns `{ eligible: true }`; raises `28000` if unauthenticated |
| `public.upsert_push_subscription(text, text, text, text) returns uuid` | `SECURITY DEFINER`, empty search path | `authenticated` only | Registers or transfers a subscription endpoint; removes the oldest subscriptions beyond ten per user |
| `public.delete_push_subscription(text) returns void` | `SECURITY DEFINER`, empty search path | `authenticated` only | Deletes the caller's endpoint |
| `public.schedule_rest_push(text, integer, text, text) returns uuid` | `SECURITY DEFINER`, empty search path | `authenticated` only | Replaces the endpoint's pending schedule with a server-calculated deadline |
| `public.cancel_rest_push(text) returns void` | `SECURITY DEFINER`, empty search path | `authenticated` only | Cancels the caller's pending schedule |
| `public.claim_due_rest_pushes(integer) returns table` | `SECURITY DEFINER`, empty search path | `service_role` only | Atomically claims due schedules; fails sending rows stale for more than 60 seconds |
| `public.complete_rest_push(uuid, text, text) returns void` | `SECURITY DEFINER`, empty search path | `service_role` only | Marks a claimed schedule sent or failed |
| `public.remove_push_subscription_by_endpoint(text) returns void` | `SECURITY DEFINER`, empty search path | `service_role` only | Deletes a subscription whose push endpoint is gone |
| `private.dispatch_due_rest_pushes() returns bigint` | `SECURITY DEFINER`, empty search path | Cron / database owner only | Calls `send-rest-push` through `pg_net` when a schedule is due and both Vault secrets exist |
| `private.cleanup_rest_push() returns void` | `SECURITY DEFINER`, empty search path | Cron / database owner only | Removes final schedules and old cron run details |

### Rest timer push data and dispatch

The push tables are independent from the 12 synced workout tables and are not listed in `src/sync/contract.ts` or the private sync metadata.

| Table | Purpose | Client access |
|---|---|---|
| `public.push_subscriptions` | One Web Push endpoint and its encryption keys per registered device; an endpoint can be transferred to the currently signed-in account | Authenticated `SELECT` of own rows only; all writes go through RPCs |
| `public.rest_push_schedules` | Notification title/body, server `fire_at`, delivery status, attempts, and last error | Authenticated `SELECT` of own rows only; all writes go through RPCs |

The client can keep at most ten subscriptions per account. Registering another endpoint deletes the least recently refreshed rows first (`updated_at`, then `created_at`). There can be at most one `pending` schedule per subscription; rescheduling cancels the previous pending row. Schedule delays are limited to 1 second through 2 hours.

`pg_cron` runs `private.dispatch_due_rest_pushes()` every two seconds. It returns without an HTTP request when no rows are due, or when either Vault secret is absent. With both secrets present, it enqueues a `net.http_post` request to the Edge Function. `public.claim_due_rest_pushes` uses `FOR UPDATE SKIP LOCKED`, so concurrent function invocations claim disjoint rows. The Edge Function reports each result with `complete_rest_push`; for expired endpoints it calls `remove_push_subscription_by_endpoint`.

The daily `cleanup-rest-pushes` job removes `sent`, `failed`, and `cancelled` schedules older than a day and attempts to remove cron run details older than a day. Run-detail cleanup is skipped if the database role lacks permission.

#### Vault setup

Store the full function URL and a high-entropy shared dispatch secret in Vault. Do not place their values in `supabase/config.toml`, migrations, or source control.

Locally, after the `send-rest-push` function is available, create the secrets in the local database:

```sql
select vault.create_secret(
  '<full local function URL>',
  'rest_push_function_url'
);
select vault.create_secret(
  '<high-entropy shared secret>',
  'rest_push_dispatch_secret'
);
```

Use a local URL reachable from the database container, such as `http://host.docker.internal:54321/functions/v1/send-rest-push`. In production, run the same `vault.create_secret` calls against the production database with the deployed function URL, for example `https://<project-ref>.supabase.co/functions/v1/send-rest-push`, and the production-only secret. Never include real values in docs or logs.

- Latest `sync_push`: [`20261013183000_sync_contract_metadata_and_version.sql`](../../supabase/migrations/20261013183000_sync_contract_metadata_and_version.sql) (metadata, version gate, grant/revoke). Prior: `20261010111000_preserve_history_metrics_in_sync_push.sql`, `20261010100000_allow_authenticated_account_sync.sql`, `20261007150000_add_sync_push.sql`.
- `get_sync_entitlement`: [`20261010110000_remove_stripe_billing_add_sync_entitlement.sql`](../../supabase/migrations/20261010110000_remove_stripe_billing_add_sync_entitlement.sql) lines 59–78.
- Idempotency: receipts keyed by `(user_id, operation_id)` with a SHA-256 payload hash (pgcrypto in `extensions`). Same ID + same payload → stored response; same ID + different payload → `sync_operation_conflict`.
- Child upserts whose referenced parent is tombstoned ignore their base revision, remain tombstoned, and are acknowledged normally; stale child edits cannot resurrect them or wedge the outbox. Parent tombstones also cascade atomically through owner-scoped live descendants; each update advances `server_revision` through the sync metadata trigger. The migration's repair applies this cascade to existing data. A completely missing parent still follows the foreign-key error path.

### `sync_push` errors

All raised with `ERRCODE = 'P0001'` except authentication (`28000`). Constraint violations surface as normal SQLSTATEs (e.g. `23503` FK).

| Message | Meaning |
|---|---|
| `sync_authentication_required` (28000) | No `auth.uid()` |
| `sync_operation_id_required` | Missing operation UUID |
| `sync_batch_size_invalid` | Not 1–100 changes |
| `sync_operation_conflict` | Operation ID reused with a different payload |
| `sync_operation_response_unavailable` | Receipt exists but response cannot be returned |
| `sync_change_shape_invalid` | Change object malformed |
| `sync_operation_not_allowed` | Operation not `upsert`/`delete` |
| `sync_base_revision_invalid` | `baseRevision` not a valid revision string |
| `sync_table_not_allowed` | Table not in whitelist |
| `sync_change_field_not_allowed` | Column not in whitelist |
| `sync_change_identity_required` | Record identity fields missing |
| `sync_stale_revision_conflict` | Row missing and `baseRevision` ≠ 0; or `baseRevision` > server `server_revision`; or an `upsert` targets a tombstoned row with an older `baseRevision` (prevents resurrection). An older base on a live row is **accepted** (server acceptance order wins). Lines ~250–268. |
| `sync_record_not_found` | Delete/update target missing |
| `sync_contract_version_unsupported` | The client version is not accepted; raised before an idempotency receipt is written. |

Client handling of each class: [error model](frontend-backend-strategy.md#error-model).

## Auth configuration

| Setting | Local value | Source |
|---|---|---|
| Provider | Google OAuth only (`[auth.external.google] enabled = true`) | [`supabase/config.toml`](../../supabase/config.toml) ~261–265 |
| Credentials | `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)`, `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)` | same |
| Callback | `http://127.0.0.1:54321/auth/v1/callback` | same |
| `site_url` | `http://localhost:5173` | ~160 |
| `additional_redirect_urls` | `http://localhost:5173`, `http://127.0.0.1:5173` | ~164–167 |
| API `max_rows` | 1000 | ~18 |
| Ports | API 54321, DB 54322, Studio 54323, Inbucket 54324 | — |

Production redirect URLs are configured in the Supabase dashboard (Auth > URL configuration); local redirect URLs are in [`supabase/config.toml`](../../supabase/config.toml) under `[auth].additional_redirect_urls`.

## Migration history

| Migration | Summary | Status |
|---|---|---|
| `20261007135400_create_private_workout_data` | `private` schema, revision counter, trigger, 12 tables, RLS, `user_entitlements` | Active (except `user_entitlements`) |
| `20261007150000_add_sync_push` | pgcrypto, `sync_push_receipts`, first `sync_push` | Superseded function |
| `20261007170000_add_provider_billing` | Billing customers, entitlement sources, Stripe webhook events | Historical – dropped |
| `20261007180000_preserve_workout_history_metrics` | Extra metric columns on history tables | Active |
| `20261007180100_support_optional_billing_expiry` | Billing entitlement events | Historical – dropped |
| `20261009090000_lifetime_payment_lifecycle` | Stripe lifetime payments/disputes | Historical – dropped |
| `20261009122000_webhook_payment_classification` | Stripe subscription payments | Historical – dropped |
| `20261009191000_add_billing_plan_metadata_and_frontend_base` | Plan metadata, `get_account_entitlement` | Historical – dropped |
| `20261010100000_allow_authenticated_account_sync` | `sync_push` for all authenticated users | Superseded function |
| `20261010110000_remove_stripe_billing_add_sync_entitlement` | Drops all billing objects; adds `get_sync_entitlement` | Active |
| `20261010111000_preserve_history_metrics_in_sync_push` | Previous `sync_push` definition | Superseded |
| `20261013155500_revoke_direct_sync_table_writes` | Restricts synced-table client writes to `sync_push`; keeps pull reads | Active |
| `20261013183000_sync_contract_metadata_and_version` | Private contract metadata, version gate, and `sync_push` whitelist driven by metadata | Active |
| `20261014154300_tombstone_children_of_deleted_parents` | Guards child upserts, cascades parent tombstones, and repairs existing live descendants | Active |
| `20261014171406_rest_timer_push` | Web Push subscriptions/schedules, RPC access, `pg_cron` dispatch and cleanup | **Active (latest)** |

Billing context: [ADR 0005](../decisions/0005-remove-billing-signed-in-sync.md).

## Type generation

[`src/types/database.types.ts`](../../src/types/database.types.ts) mirrors the schema. Regenerate it from the local database with:

```sh
pnpm db:types
```

The command requires `supabase start` (Docker). CI regenerates the file after resetting the local database and fails if that produces a diff, enforcing generated-type freshness.

## Seed and first-run starter data

These are separate datasets with different purposes. [`supabase/seed.sql`](../../supabase/seed.sql) is a small local-development database fixture for a private test account; Supabase loads it during local database resets and it is never run in production. It does not define the app's first-run experience.

First-run starter exercises and routines are client-side in [`src/data/initialData.ts`](../../src/data/initialData.ts), which `src/services/db.ts` uses when a user first opens the app. They become private, editable user records; do not move them into a shared/global seed catalog table.

TODO(human): define the final starter exercises and routines in `src/data/initialData.ts`

## What does NOT exist

| Not present | Implication |
|---|---|
| Custom server (a former Fastify backend lived outside this repo; consolidated away in `b624129`) | All logic is SQL (RPCs, triggers, RLS) or client-side |
| `send-rest-push` Edge Function source (`supabase/functions/send-rest-push/`) | Its configuration is registered, and the database dispatcher is installed; the source and sender implementation arrive in the next work unit |
| Production Vault secrets | `rest_push_function_url` and `rest_push_dispatch_secret` must be created in the target database before push dispatch can send HTTP requests |
| Storage buckets | Media URLs are stored as strings only |
| Billing | Removed; see ADR 0005 |
| CI migration deployment | Migrations are applied manually with the Supabase CLI |

## Adding server-side logic (Edge Functions, scheduled jobs, push)

Rest-timer push delivery uses the Supabase-managed `send-rest-push` Edge Function; no custom server is needed. The database migration and function configuration are in place, while the function source and VAPID sender are implemented in the next work unit.

- Create `rest_push_function_url` and `rest_push_dispatch_secret` in Vault using `vault.create_secret` as described above; no secret values belong in `config.toml`.
- The Edge Function uses `verify_jwt = false` because the database dispatcher authenticates with the shared `x-dispatch-secret` header.
- Deployment order: apply the database migration first, deploy `send-rest-push`, create the two Vault secrets, then deploy the client that registers subscriptions and schedules notifications. The database dispatcher is a no-op until both secrets exist.
- Deploy functions with `supabase functions deploy send-rest-push`.

## Related

- [Frontend–backend strategy](frontend-backend-strategy.md)
- [Architecture overview](overview.md)
- [Security](../standards/security.md)
- [Testing strategy](../standards/testing-strategy.md)
- [ADR 0008 – Sync contract source and version](../decisions/0008-sync-contract-source-and-version.md)
- [ADR 0010 – Server-scheduled rest timer push notifications](../decisions/0010-server-scheduled-rest-push.md)
- [ADR 0002 – Supabase-only backend](../decisions/0002-supabase-only-backend.md)
- [ADR 0005 – Remove billing](../decisions/0005-remove-billing-signed-in-sync.md)
