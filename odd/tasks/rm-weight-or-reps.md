# RM weight or reps metric

Status: implemented (pending review)
Owner: dawalberto
Last updated: 2026-10-31

## Objective

Let each RM (personal-record) entry record either a lifted **weight in kg** or a
**repetition count** (for example, jump-rope skips or pull-up reps). The metric is
chosen per record, the forms remember the last metric used for that exercise, and
the choice travels through sync so it survives across devices.

## Scope

In scope:

- Domain: `RmRecord.metric` (`'weight' | 'reps'`, `undefined` means `'weight'` for
  legacy data) with pure helpers in `src/utils/rmCalculations.ts` and
  `src/utils/rmLogs.ts`.
- UI: metric selector in the quick-record modal, the add-exercise modal, and the
  inline record editor; unit-aware badges, cards, and history rows.
- Storage: backup sanitizing/merging keeps the metric.
- Sync: new nullable `metric` column on `rm_records`, contract version `3`, and the
  shared client manifest in `src/sync/contract.ts`.
- Tests: Vitest + pgTAP coverage for weight and reps behavior and legacy
  compatibility.
- Docs: backend migration history and the sync contract checklist.

Out of scope:

- A configurable metric label/unit per exercise beyond `reps`.
- Converting existing weight records into reps records.
- Weight-based volume/RM math (1RM formulas) for reps records.

## Tasks

- [x] T1 Domain type + pure helpers (`getRmRecordMetric`, `getHighestRmRecord`
      grouped by the latest record's metric, `createRmRecord`/`editRmRecordInLogs`
      metric argument, merge signatures include the metric).
- [x] T2 Store slice: RM alerts skip reps logs and stamp `metric: 'weight'`.
- [x] T3 Backup: sanitize/merge the metric (legacy backups default to weight).
- [x] T4 Hooks: quick form, add-exercise form, edit form, record history.
- [x] T5 UI: metric selector + unit-aware list/history/badge/alert.
- [x] T6 Sync: forward migration (nullable `metric`, private metadata, contract
      version 3, `sync_push` preservation branch), `src/sync/contract.ts`,
      `sync-queue` mapping, regenerated types.
- [x] T7 Tests: Vitest + pgTAP.
- [x] T8 Docs.

## Evidence

- `pnpm test`: 42 files, 306 tests passed.
- `pnpm lint`: `tsc --noEmit` clean.
- `pnpm build`: built (expected >500 kB chunk warning).
- `pnpm db:reset && pnpm db:test && pnpm db:lint`: migrations applied, 208 pgTAP
  tests passed, no schema errors.
- `pnpm db:types`: regenerated `database.types.ts` (adds `metric` to `rm_records`).
- `pnpm sync:contract:check`: `Sync contract matches local database metadata
  (version 3, 12 tables)`. The check script was made tolerant of the newer
  Supabase CLI `db query` output shape (`{ boundary, rows }` vs a bare array).
- Production (project ref `vdlhylycnftkivkrkclu`): migration applied through the
  Supabase MCP and recorded as `20261101111539_add_rm_record_metric` (the MCP
  assigns its own version, so the local file was renamed to match). Verified with
  `execute_sql`: `rm_records.metric` exists (`text`), the check constraint is
  present, `acceptedVersions` is `[1, 2, 3]`, `rm_records.writableColumns`
  includes `metric`, and `sync_push` contains the metric preservation branch.
  Advisors report no new issues (only the pre-existing push-function and
  RLS/lint warnings).

## Acceptance criteria

- A user can log a reps RM for an exercise (for example `Comba` -> `120 reps`) and
  it renders as repetitions everywhere the value appears.
- Switching the metric while editing a record updates the stored metric.
- Legacy weight records (no `metric` field) keep rendering as `kg`.
- The metric round-trips through `sync_push`/pull and through backup export/import.
- `pnpm test`, `pnpm lint`, `pnpm build` pass; DB tests pass when Supabase is
  available.

## Checks

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm db:reset && pnpm db:test && pnpm db:lint` (local Supabase)
- `pnpm db:types` then `pnpm sync:contract:check`

## Notes

- Legacy compatibility: `rm_records.metric` is nullable and older accepted clients
  keep the stored value through a `COALESCE` branch in `sync_push` (same pattern as
  `categories`). The client treats `undefined`/`NULL` as `'weight'`.
- Rollout: the production migration is applied; deploy the frontend that sends
  `metric` afterwards (the Supabase MCP already applied it first).
