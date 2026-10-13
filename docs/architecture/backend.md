# Backend architecture

What the Supabase backend contains — schema, RLS, RPCs, auth, migrations — and what it deliberately does not contain.

Last verified: 2026-10-13

## At a glance

- **Supabase only**: Auth + Postgres 17 + RLS + two RPCs. No custom server or Edge Functions today; no cron or Storage buckets are in use. Future server-side logic (for example, rest-timer push notifications) will use Supabase Edge Functions, its managed serverless runtime, so no custom server is needed. Push notifications are deferred.
- 12 owner-scoped tables in `public`, all with sync metadata maintained by a trigger.
- Clients write through `public.sync_push` and read with table selects. Contract details: [frontend–backend strategy](frontend-backend-strategy.md).
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

`private` is revoked from `PUBLIC, anon, authenticated`. It holds `sync_revision`, `sync_push_receipts` (idempotency receipts, from `20261007150000_add_sync_push.sql`), and the trigger functions.

## RLS

| Operation | Policy | Notes |
|---|---|---|
| SELECT | `<table>_owner_select`: `user_id = (select auth.uid())` | authenticated only |
| INSERT | `<table>_owner_insert`: `WITH CHECK user_id = auth.uid()` | authenticated only |
| UPDATE | `<table>_owner_update`: `USING` + `WITH CHECK` owner | authenticated only |
| DELETE | **none** | Deletion = setting `deleted_at` (tombstone) through `sync_push` |

Grants: `REVOKE ALL ... FROM PUBLIC, anon, authenticated`, then `GRANT SELECT, INSERT, UPDATE ... TO authenticated` (lines 352–386). See [security](../standards/security.md) for the implication that direct table writes bypass `sync_push` validation.

## RPCs

| Function | Security | Access | Purpose |
|---|---|---|---|
| `public.sync_push(p_operation_id uuid, p_changes jsonb) returns jsonb` | `SECURITY DEFINER`, `search_path = pg_catalog, private` | `authenticated` only | Validated, idempotent batch of 1–100 upserts/deletes; returns `{ operationId, changes[] }` with new revisions |
| `public.get_sync_entitlement() returns jsonb` | `SECURITY INVOKER`, `search_path = pg_catalog` | `authenticated` only | Returns `{ eligible: true }`; raises `28000` if unauthenticated |

- Latest `sync_push`: [`20261010111000_preserve_history_metrics_in_sync_push.sql`](../../supabase/migrations/20261010111000_preserve_history_metrics_in_sync_push.sql) (grant/revoke at lines 415–416). Prior: `20261010100000_allow_authenticated_account_sync.sql`, `20261007150000_add_sync_push.sql`.
- `get_sync_entitlement`: [`20261010110000_remove_stripe_billing_add_sync_entitlement.sql`](../../supabase/migrations/20261010110000_remove_stripe_billing_add_sync_entitlement.sql) lines 59–78.
- Idempotency: receipts keyed by `(user_id, operation_id)` with a SHA-256 payload hash (pgcrypto in `extensions`). Same ID + same payload → stored response; same ID + different payload → `sync_operation_conflict`.

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
| `20261010111000_preserve_history_metrics_in_sync_push` | Current `sync_push` definition | **Active (latest)** |

Billing context: [ADR 0005](../decisions/0005-remove-billing-signed-in-sync.md).

## Type generation

[`src/types/database.types.ts`](../../src/types/database.types.ts) mirrors the schema. Regenerate it from the local database with:

```sh
pnpm db:types
```

The command requires `supabase start` (Docker). CI regenerates the file after resetting the local database and fails if that produces a diff, enforcing generated-type freshness.

## Seed

[`supabase/seed.sql`](../../supabase/seed.sql) is **legacy – do not replicate**: it inserts into the dropped `public.user_entitlements` (line 24), so `[db.seed] enabled = false` in `config.toml` (~67–72).

## What does NOT exist

| Not present | Implication |
|---|---|
| Custom server (a former Fastify backend lived outside this repo; consolidated away in `b624129`) | All logic is SQL (RPCs, triggers, RLS) or client-side |
| Edge Functions (`supabase/functions/` absent today) | No server-side HTTP handlers or webhooks yet; future server-side logic will use Supabase Edge Functions |
| Scheduled jobs (pg_cron) | No background maintenance (e.g. tombstone cleanup) |
| Storage buckets | Media URLs are stored as strings only |
| Billing | Removed; see ADR 0005 |
| CI migration deployment | Migrations are applied manually with the Supabase CLI |

## Adding server-side logic (Edge Functions, scheduled jobs, push)

Future server-side logic (for example, rest-timer push notifications) will run as Supabase Edge Functions, Supabase's managed serverless runtime; no custom server is needed. Push notifications are deferred and not implemented, and no `supabase/functions/` directory exists today.

- Set secrets with `supabase secrets set` or in the Supabase dashboard, read them with `Deno.env.get`, and never commit them.
- Deploy functions with `supabase functions deploy`.

## Related

- [Frontend–backend strategy](frontend-backend-strategy.md)
- [Architecture overview](overview.md)
- [Security](../standards/security.md)
- [Testing strategy](../standards/testing-strategy.md)
- [ADR 0002 – Supabase-only backend](../decisions/0002-supabase-only-backend.md)
- [ADR 0005 – Remove billing](../decisions/0005-remove-billing-signed-in-sync.md)
