# Security

How WorkoutLog handles secrets, data ownership, privileged SQL, and personal data.

Last verified: 2026-10-15

## Rules in one screen

- The only frontend config values are **public**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_GA_MEASUREMENT_ID`.
- OAuth and other secrets are read by the Supabase CLI through `env()` only; never in `.env.local`, never committed.
- Every row is owned by `user_id = auth.uid()` (RLS). There is no DELETE policy; deletes are tombstones.
- `SECURITY DEFINER` functions pin `search_path`, revoke from `PUBLIC, anon`, grant to `authenticated`, and re-check `auth.uid()`.
- Treat backups, IndexedDB contents, and fixtures as personal data.

## Secrets and configuration

| Name | Kind | Where it lives | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Public | `.env.local` (local), GitHub repo **variable** (deploy) | Bundled into the client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | same | Publishable key; RLS is the protection, not key secrecy |
| `VITE_VAPID_PUBLIC_KEY` | Public | same | Browser Web Push application server key |
| `VITE_GA_MEASUREMENT_ID` | Public | same | Optional GA4 `G-` ID; empty disables analytics |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | CLI env | Shell env when running `supabase start` | Read via `env()` in [`supabase/config.toml`](../../supabase/config.toml) |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | **Secret** | Shell env / Supabase dashboard (prod) | Never in `.env.local` or git |
| `OPENAI_API_KEY` | Optional secret | Shell env | Supabase Studio AI only |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | Secret | Shell env | SMS auth is disabled |
| `DISABLE_HMR` | Dev flag | Shell env | Intentionally retained for reopening the repo in Google AI Studio |

- [`.env.example`](../../.env.example) documents the public browser names. `.env.local` is personal; do not commit or paste its contents.
- The deploy workflow uses `vars.*` (repository variables), not `secrets.*` — correct, because both values are public.
- Never use a Supabase service-role/secret key in the client or the repo.
- Future Edge Function secrets belong in Supabase secrets (CLI: `supabase secrets set`, or the dashboard), are read with `Deno.env.get`, and must never be committed. Deploy functions with `supabase functions deploy`; none exist yet.

## Ownership model (RLS)

- All 12 public tables: `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`; RLS enabled; policies `<table>_owner_select|insert|update` with `user_id = (select auth.uid())` ([`20261007135400_create_private_workout_data.sql`](../../supabase/migrations/20261007135400_create_private_workout_data.sql) 352–386).
- No DELETE policy and no DELETE grant: rows are never hard-deleted by clients.
- Composite FKs include `user_id`, so a child can only reference a parent of the same owner.
- Deleting an auth user cascades to all their rows.

### Synced table writes

Authenticated clients retain `SELECT` on the 12 synced tables for pull reads, but do not have direct `INSERT`, `UPDATE`, `DELETE`, or `TRUNCATE` privileges. All client writes go through `public.sync_push`, which enforces the column whitelist, base revisions, foreign keys, idempotency receipts, and server revision bumps. Owner `INSERT`/`UPDATE` RLS policies remain as defense in depth, but cannot be used without the corresponding table privileges. The private sync revision counter and push receipts remain inaccessible to client roles.

## SECURITY DEFINER guidelines

Pattern used by `public.sync_push` ([`20261013183000_…`](../../supabase/migrations/20261013183000_sync_contract_metadata_and_version.sql) lines 48–51, 416–417) and `private.*` helpers:

```sql
CREATE OR REPLACE FUNCTION public.sync_push(
  p_operation_id uuid,
  p_changes jsonb,
  p_contract_version integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$ ... $$;

REVOKE ALL ON FUNCTION public.sync_push(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_push(uuid, jsonb, integer) TO authenticated;
```

`sync_push`'s current three-argument signature has `EXECUTE` granted to `authenticated`; the migration revokes `PUBLIC` and `anon`. The default `service_role` grant remains. This is a known, accepted item: `service_role` is privileged and bypasses RLS by design.

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
- Contract version, table and column whitelist, and required identity fields. The server whitelist comes from private metadata and rejects unsupported versions before recording receipts.
- `user_id` is forced to `auth.uid()`; `server_revision`, `deleted_at` are server-controlled (line ~308–319).
- Base revision checks prevent stale overwrites and tombstone resurrection.
- FKs are enforced by Postgres; idempotency by `(user_id, operation_id)` + SHA-256 payload hash.

Client-side validation in [`src/services/cloud-sync.ts`](../../src/services/cloud-sync.ts) and [`src/utils/backup.ts`](../../src/utils/backup.ts) is defensive, not a security boundary.

## Analytics privacy

- GA4 loads when `VITE_GA_MEASUREMENT_ID` is set and valid.
- Consent Mode v2 runs in Advanced mode: defaults to denied for `analytics_storage` and all advertising storage. Events dispatched while unconsented or rejected travel as cookieless pings without client identifiers, enabling Google's aggregate traffic modeling. Full client-side storage is granted only after explicit user consent.
- Events never include `user_id`, email, routine names, exercise names, or diary text.
- The consent flag lives in a device IndexedDB key (`device:analytics_consent_v1`) outside guest/owner scopes and is not synced.

## Local data privacy

- IndexedDB `WorkoutLogDB` is per browser profile. Guest data lives under `guest`; signed-in data under `owner:<userId>` ([`src/services/db.ts`](../../src/services/db.ts) 48, 88–95).
- Guest data is transferred into the owner scope on first sign-in and removed from the guest scope. Signing out first attempts a final online sync; if owner-scoped outbox operations remain, the user must confirm their loss before proceeding.
- After Supabase sign-out succeeds, the app deletes that owner's IndexedDB state, outbox, metadata, cursors, and flags, then clears guest state and legacy collection keys. Clearing guest state is necessary because its original data was adopted into the account during sign-in; the next guest hydration seeds fresh starter data.
- The app also clears its rest timer and in-memory account data. Supabase's auth SDK owns its auth storage; the app does not manually edit Supabase auth keys.
- Rest-timer state is kept in `sessionStorage` and removed after successful sign-out.

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
