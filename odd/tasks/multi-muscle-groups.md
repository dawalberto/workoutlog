# Multiple muscle groups per exercise

## Objective

Let an exercise belong to more than one muscle group (for example `Core` and `Piernas`) in the catalog, the routine exercise form, and the "create in the moment" form, without losing data or breaking existing signed-in users on older app bundles.

## Problem and rationale

`category` is a single optional string in `ExerciseDefinition`, `Exercise`, `ExerciseRmLog`, and `ExerciseDiary`. It is persisted in IndexedDB (schema-less JSON), synced as a `category text` column in four Supabase tables, and compared by equality in catalog filters. The product now needs a set of muscle groups per exercise.

## Scope and constraints

- Branch `feature/multi-muscle-groups`.
- Representation: add a new `categories?: string[]` field next to `category`. `category` stays as the primary (first) value so old bundles, old backups, and old sync clients keep working. `categories` is the source of truth when present; legacy records derive `[category]`.
- Forward-only, additive migration: `categories text[]` nullable in the four tables + private contract metadata + accepted contract version 2 (keep 1 accepted).
- Preserve multi-group data when an older client (which does not send `categories`) upserts a row: `sync_push` must use `COALESCE(EXCLUDED.categories, stored.categories)` for those four tables.
- Keep the IndexedDB version at 2; no destructive local migration.
- Keep the backup format version at 1 and tolerant of both shapes.
- Spanish UI copy; identifiers, comments, commits, docs in English.
- Local limitation (resolved): the global `supabase` CLI is an x86_64 binary on arm64. The DB commands ran with `pnpm dlx supabase@2.120.0` (arm64) against Docker, and the local checks passed.

## Tasks

- [x] `domain`: Add `categories?: string[]` to the four types and a shared `exerciseCategories` helper (get/format/compare).
- [x] `client-logic`: Update catalog build/filter, add-exercise hook, RM/diary metadata propagation, and searches.
- [x] `ui`: Multi-select in the catalog form and the create-in-the-moment form; display sites join the values.
- [x] `sync`: Add `categories` to the contract manifest and to sync-queue flatten/apply; bump `SYNC_CONTRACT_VERSION` to 2.
- [x] `db`: Forward migration (column + metadata + accepted version + `sync_push` COALESCE) and pgTAP updates.
- [x] `types`: `database.types.ts` updated in place (`TODO(human)`: confirm with `pnpm db:types`).
- [x] `backup`: Tolerant import that derives `categories` from `category`.
- [x] `tests`: Vitest for helper, filter, build, sync round-trip, and legacy backup import.
- [x] `docs`: Sync contract checklist, glossary, backend schema.

## Acceptance criteria and checks

- A user can select zero, one, or several groups; the catalog filter matches any selected group.
- Legacy records (only `category`) read as a one-element list and round-trip through sync and backup.
- Old bundles keep pushing `category` and cannot wipe `categories` on the server.
- `pnpm test`, `pnpm lint`, `pnpm build` pass; DB checks pass locally and the migration is applied in production.

## Progress and verification

- `domain` / `client-logic` / `ui`: `src/utils/exerciseCategories.ts`, `src/types.ts`, `src/utils/exerciseCatalog.ts`, `src/utils/rmLogs.ts`, `src/utils/diaryCalculations.ts`, `src/hooks/routine/useAddExerciseModal.ts`, `src/hooks/exercise-catalog/useExerciseForm.ts`, `src/components/exercise-catalog/ExerciseFormModal.tsx`, `src/components/AddExerciseModal.tsx`, and the display sites.
- `sync` / `db`: `src/sync/contract.ts` (version 2, `categories` in four tables), `src/services/sync-queue.ts` (flatten/apply + legacy fallback), `supabase/migrations/20261029170728_add_exercise_categories.sql`, `supabase/tests/sync_contract.test.sql`, `supabase/tests/sync_exercise_categories.test.sql`. The migration adds the column and contract metadata, accepts version 2, and extends the installed `sync_push` with the `COALESCE(EXCLUDED.categories, stored.categories)` branch using the same dynamic pattern as `20261014154300`.
- `types`: `src/types/database.types.ts` regenerated with `pnpm db:types` (the generated `categories` type is `(string)[] | null`).
- `backup`: `src/utils/backup.ts` and `src/hooks/data-backup/useDataBackup.ts` read/copy `categories` and stay tolerant of the legacy shape.
- `tests`: `pnpm test` 38 files / 272 tests passed; `pnpm lint` exit 0; `pnpm build` succeeded (chunk-size warning only).
- Local database (Docker + Supabase CLI 2.120.0 via `pnpm dlx` because the global binary is x86_64 on arm64): `pnpm db:reset` applied all migrations cleanly; `pnpm db:test` 9 files / 203 tests passed; `pnpm db:lint` no schema errors; `pnpm sync:contract:check` reported "version 2, 12 tables". Confirmed the installed `sync_push` keeps both the tombstone guard and the new `categories` branch.
- Production: applied the same migration through the Supabase MCP server (the CLI has no access token). The project recorded it as version `20261029170728`; the local migration file was renamed to that version to keep history parity. Verified afterwards: `categories` exists in the four tables, `private.sync_contract_versions` accepts 1 and 2, and `sync_push` has the categories branch and the tombstone guard. Security advisors show no new findings.

## Next step

- Deploy the frontend that sends `categories`. The database is already migrated, so old bundles keep working and new ones can push the new column.
