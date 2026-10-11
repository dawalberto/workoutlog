# Security

How WorkoutLog handles secrets, data ownership, privileged SQL, and personal data.

Last verified: 2026-10-11

## Rules in one screen

- The only frontend config values are **public**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- OAuth and other secrets are read by the Supabase CLI through `env()` only; never in `.env.local`, never committed.
- Every row is owned by `user_id = auth.uid()` (RLS). There is no DELETE policy; deletes are tombstones.
- `SECURITY DEFINER` functions pin `search_path`, revoke from `PUBLIC, anon`, grant to `authenticated`, and re-check `auth.uid()`.
- Treat backups, IndexedDB contents, and fixtures as personal data.

## Secrets and configuration

| Name | Kind | Where it lives | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Public | `.env.local` (local), GitHub repo **variable** (deploy) | Bundled into the client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | same | Publishable key; RLS is the protection, not key secrecy |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | CLI env | Shell env when running `supabase start` | Read via `env()` in [`supabase/config.toml`](../../supabase/config.toml) |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | **Secret** | Shell env / Supabase dashboard (prod) | Never in `.env.local` or git |
| `OPENAI_API_KEY` | Optional secret | Shell env | Supabase Studio AI only |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | Secret | Shell env | SMS auth is disabled |
| `DISABLE_HMR` | Dev flag | Shell env | AI Studio leftover |

- [`.env.example`](../../.env.example) documents the two public names. `.env.local` is personal; do not commit or paste its contents.
- The deploy workflow uses `vars.*` (repository variables), not `secrets.*` — correct, because both values are public.
- Never use a Supabase service-role/secret key in the client or the repo.

## Ownership model (RLS)

- All 12 public tables: `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`; RLS enabled; policies `<table>_owner_select|insert|update` with `user_id = (select auth.uid())` ([`20261007135400_create_private_workout_data.sql`](../../supabase/migrations/20261007135400_create_private_workout_data.sql) 352–386).
- No DELETE policy and no DELETE grant: rows are never hard-deleted by clients.
- Composite FKs include `user_id`, so a child can only reference a parent of the same owner.
- Deleting an auth user cascades to all their rows.

### Observation: direct table writes

`authenticated` is granted `SELECT, INSERT, UPDATE` on the tables (same migration, ~361). The client only writes through `sync_push`, but RLS would also allow an owner to `INSERT`/`UPDATE` their own rows directly via the REST API, bypassing `sync_push` validation (whitelist, base revision, idempotency). The trigger still assigns revisions. Impact is limited to the user's own data. `TODO(human): decide whether to revoke direct INSERT/UPDATE grants so sync_push is the only write path.`

## SECURITY DEFINER guidelines

Pattern used by `public.sync_push` ([`20261010111000_…`](../../supabase/migrations/20261010111000_preserve_history_metrics_in_sync_push.sql) lines 1–5, 415–416) and `private.*` helpers:

```sql
CREATE OR REPLACE FUNCTION public.sync_push(p_operation_id uuid, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$ ... $$;

REVOKE ALL ON FUNCTION public.sync_push(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_push(uuid, jsonb) TO authenticated;
```

| Do | Don't |
|---|---|
| Pin `search_path` (`pg_catalog, private` or narrower) | Leave `search_path` unset in a definer function |
| Schema-qualify every object (`public.%I`, `extensions.digest`) | Rely on unqualified names |
| Read identity from `auth.uid()` and raise `28000` when null | Accept a user ID parameter from the client |
| Build dynamic SQL with `format('%I')` and bind values with `USING` | Concatenate client strings into SQL |
| Revoke from `PUBLIC, anon`; grant only to `authenticated` | Rely on default `EXECUTE` to `PUBLIC` |
| Prefer `SECURITY INVOKER` when RLS suffices (`get_sync_entitlement`) | Use DEFINER by default |
| Keep privileged tables in `private` (revoked from all client roles) | Expose receipts/counters in `public` |

## Never trust the client

`sync_push` re-validates everything the client sends:

- Operation UUID present; 1–100 changes; operation is `upsert` or `delete`.
- Table and column whitelist; identity fields required.
- `user_id` is forced to `auth.uid()`; `server_revision`, `deleted_at` are server-controlled (line ~308–319).
- Base revision checks prevent stale overwrites and tombstone resurrection.
- FKs are enforced by Postgres; idempotency by `(user_id, operation_id)` + SHA-256 payload hash.

Client-side validation in [`src/services/cloud-sync.ts`](../../src/services/cloud-sync.ts) and [`src/utils/backup.ts`](../../src/utils/backup.ts) is defensive, not a security boundary.

## Local data privacy

- IndexedDB `WorkoutLogDB` is per browser profile. Guest data lives under `guest`; signed-in data under `owner:<userId>` ([`src/services/db.ts`](../../src/services/db.ts) 48, 88–95).
- Signing out does not delete local data. `TODO(human): confirm intended behavior for local owner-scoped data on sign-out on shared devices.`
- Rest-timer state is kept in `sessionStorage`.

## Backups and fixtures

- JSON exports ([`src/utils/backup.ts`](../../src/utils/backup.ts)) contain workout history, RMs, diary notes — personal data. Do not attach real exports to issues or commits.
- Tests and pgTAP use synthetic data only (`@example.test` emails, fixed UUIDs).

## Reporting

`TODO(human): add a security contact / disclosure process (no SECURITY.md exists).`

## Related

- [Backend architecture](../architecture/backend.md)
- [Frontend–backend strategy](../architecture/frontend-backend-strategy.md)
- [Coding standards](coding-standards.md)
- [Onboarding](../onboarding.md)
