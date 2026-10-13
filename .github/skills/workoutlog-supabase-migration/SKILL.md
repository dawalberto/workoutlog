---
name: workoutlog-supabase-migration
description: "Trigger: migration, schema, table, column, RLS, policy, grant, RPC, SQL function, pgTAP. Write a forward-only WorkoutLog Supabase migration safely."
license: Apache-2.0
metadata:
  author: "dawalberto"
  version: "1.0"
---

## Activation Contract

Load for any change under `supabase/migrations/` or `supabase/tests/`. If the change affects a synced table or `sync_push`, also load `workoutlog-sync-contract-change`.

## Hard Rules

- Ask the maintainer before any schema, RLS, or RPC change.
- Forward-only: create `supabase/migrations/YYYYMMDDHHMMSS_snake_description.sql` newer than the latest file. Never edit an existing migration.
- Additive only: new columns nullable or defaulted; never drop/rename columns deployed clients send.
- Synced tables copy `20261007135400_create_private_workout_data.sql`: `user_id` FK `ON DELETE CASCADE`, PK `(user_id, id)`, `server_revision`, `server_updated_at`, `deleted_at`, `set_workout_sync_metadata` trigger, RLS enabled, owner select/insert/update policies with `(select auth.uid())`, no DELETE policy.
- Client roles keep `SELECT` for pull reads but do not get direct `INSERT`, `UPDATE`, `DELETE`, or `TRUNCATE` on synced tables; route client writes through `sync_push`. Keep owner insert/update policies as defense in depth.
- Functions: `SECURITY DEFINER` only when needed, with `SET search_path = pg_catalog, private`, schema-qualified names, `auth.uid()` identity, `format('%I')` + `USING`; then `REVOKE ALL … FROM PUBLIC, anon` and `GRANT EXECUTE … TO authenticated` (pattern: `20261010111000_…` lines 1–5, 415–416). Prefer `SECURITY INVOKER` when RLS suffices.
- Keep `seed.sql` aligned with the active schema as a local-development fixture; never reintroduce billing objects or put secrets in `config.toml`. See the [seed guide](../../../docs/architecture/backend.md#seed-and-first-run-starter-data).

## Execution Steps

1. Read the latest related migration and [backend](../../../docs/architecture/backend.md) / [security](../../../docs/standards/security.md).
2. Write the migration (one concern per file).
3. Add or extend a pgTAP file in `supabase/tests/`: `BEGIN;` → `SELECT plan(N);` → synthetic `@example.test` users → `SET LOCAL ROLE authenticated` + `request.jwt.claim.sub` → allow and deny assertions → `SELECT * FROM finish();` → `ROLLBACK;`.
4. Run verification locally.
5. Regenerate `src/types/database.types.ts` (never hand-edit).
6. Update [backend](../../../docs/architecture/backend.md) migration history/schema and, if the procedure changed, this skill.
7. Production: apply the migration **before** deploying the frontend.

## Verification

- `supabase start` (Docker)
- `pnpm db:reset && pnpm db:test && pnpm db:lint` (`db:reset` wipes the local DB only)
- `pnpm db:types` (requires `supabase start`; CI enforces generated-type freshness)
- `pnpm lint && pnpm test` after regenerating types

## Output Contract

Report: migration filename, objects created/altered, RLS/grant summary, pgTAP plan count and result, types regenerated (yes/no), rollout order, remaining follow-up items.

## References

- [Backend architecture](../../../docs/architecture/backend.md)
- [Security: SECURITY DEFINER guidelines](../../../docs/standards/security.md#security-definer-guidelines)
- [Testing strategy: pgTAP](../../../docs/standards/testing-strategy.md#pgtap-conventions)
- [Example pgTAP test](../../../supabase/tests/workout_rls.test.sql)
- [Latest sync_push](../../../supabase/migrations/20261010111000_preserve_history_metrics_in_sync_push.sql)
