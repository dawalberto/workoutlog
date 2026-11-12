# Optional routine exercises

## Objective

Allow an exercise in a routine to be marked optional, excluding its sets from routine completion while retaining the ability to perform and record them.

## Scope and constraints

- Add a per-routine-exercise optional flag, defaulting to false for existing data and old clients.
- Keep exercise sets and their completion records available for execution and history; calculate progress using required exercises only.
- Preserve offline persistence, existing backups, and synchronization across devices. Use a forward migration and maintain compatibility with older clients.
- Use Spanish UI copy and the existing design system. Do not add dependencies or change the IndexedDB version.
- Schema and sync-contract changes require maintainer approval before implementation.

## Tasks

- [x] `approval`: Obtain approval for a defaulted boolean column on `routine_exercises` and the corresponding sync-contract change.
- [x] `progress`: Define and test required-set completion, including routines with no required sets and completed optional sets.
- [x] `editing`: Add a per-exercise option to routine editing and preserve it through routine operations and backup.
- [x] `sync`: Add a forward migration, contract metadata, serialization, compatibility handling, and tests on both sides; regenerate database types.
- [x] `verify`: Update relevant documentation and run the frontend and local database checks.

## Acceptance criteria

- Completing every required set reports 100%, regardless of optional exercises.
- Completing optional sets does not inflate the required-set progress; optional work remains recorded.
- Existing routines treat exercises as required, and the setting survives reload, backup, and synchronization.
- Progress and finish confirmation agree, including when a routine has no required sets.
- Old clients remain compatible with the migrated server; deploy the migration before the frontend.

## Progress and next step

- Inspected `getRoutineViewProgress` and the `routine_exercises` sync manifest. The current percentage counts sets from every exercise; the persisted sync shape has no optional flag.
- Maintainer approved the schema and contract change. Existing NULL flags are treated as required; old clients preserve stored flags when updating an exercise. Version 4 clients require the migration to be deployed first.
- `pnpm test`: 48 files, 336 tests passed. `pnpm lint` and `pnpm build` passed (expected chunk-size warning).
- `pnpm db:reset`, `pnpm db:types`, `pnpm sync:contract:check`, `pnpm db:test` (212 assertions), and `pnpm db:lint` passed on the local stack.
- Routines with no required sets retain the existing 0% / not-complete behavior; optional completed sets remain in exercise summaries.
- Next: human review and production migration before frontend deployment.

## Follow-up: optional indicators in summaries

- [x] `ui-followup`: Match the existing switch style and show optional badges in both summaries.
- [x] `history-snapshot`: Preserve the optional flag in session history and backup.
- [x] `history-sync`: Add and verify a compatible history exercise sync field.
- [x] `followup-checks`: Run frontend and database checks after the history sync change.

- Follow-up verified: `pnpm test` (339 tests), `pnpm lint`, `pnpm build`, `pnpm db:reset`, `pnpm db:types`, `pnpm sync:contract:check`, `pnpm db:test` (214 assertions), and `pnpm db:lint` passed. Historical sessions created before this change do not contain an optional-status snapshot. Deploy both migrations before the frontend.
