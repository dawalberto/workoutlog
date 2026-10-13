---
applyTo: "supabase/**"
description: "Migration, RLS, RPC, and pgTAP rules for the WorkoutLog Supabase project."
---

# Database instructions

Load the [Supabase migration skill](../skills/workoutlog-supabase-migration/SKILL.md). Depth: [backend](../../docs/architecture/backend.md), [security](../../docs/standards/security.md).

## Rules

- Migrations are forward-only. Add `supabase/migrations/YYYYMMDDHHMMSS_snake_description.sql` with a timestamp later than the newest file; never edit an applied migration (all files in the folder are applied).
- Synced tables follow `20261007135400_create_private_workout_data.sql`: `user_id uuid` FK to `auth.users ON DELETE CASCADE`, composite PK `(user_id, id)`, `server_revision`, `server_updated_at`, `deleted_at`, the `set_workout_sync_metadata` trigger, RLS enabled, owner `SELECT`/`INSERT`/`UPDATE` policies using `(select auth.uid())`, and no DELETE policy (tombstones).
- Functions: copy the pattern in `20261010111000_preserve_history_metrics_in_sync_push.sql` lines 1–5 and 415–416 — `SECURITY DEFINER`, `SET search_path = pg_catalog, private`, `REVOKE ALL … FROM PUBLIC, anon`, `GRANT EXECUTE … TO authenticated`. Prefer `SECURITY INVOKER` when RLS suffices (`get_sync_entitlement`).
- Identity comes from `auth.uid()` (raise `28000` when null); never accept a user ID parameter.
- Changing `sync_push` means `CREATE OR REPLACE` with the full latest definition copied and extended — and the TypeScript side changed in the same work unit ([sync contract skill](../skills/workoutlog-sync-contract-change/SKILL.md)).
- Make changes additive: nullable or defaulted columns; never drop/rename a column a deployed client sends.
- pgTAP tests in `supabase/tests/*.test.sql`: `BEGIN; … SELECT plan(N); … SELECT * FROM finish(); ROLLBACK;` with synthetic `@example.test` users and `SET LOCAL ROLE authenticated` + `request.jwt.claim.sub`.

## Anti-patterns

- Reintroducing billing objects or `user_entitlements` (dropped in `20261010110000_…`).
- Seeds that reference dropped tables or reintroduce billing; keep the local fixture aligned with the active schema ([seed guide](../../docs/architecture/backend.md#seed-and-first-run-starter-data)).
- Unqualified object names or string-concatenated dynamic SQL in definer functions; use `format('%I')` and `USING`.
- Secrets in `supabase/config.toml`; use `env(...)` references only.

## Verify

`supabase start` (Docker), then `pnpm db:reset && pnpm db:types && pnpm db:test && pnpm db:lint`. `db:reset` wipes the **local** DB only. Regenerate `src/types/database.types.ts` with `pnpm db:types` after schema changes; CI enforces that generated types are current.
