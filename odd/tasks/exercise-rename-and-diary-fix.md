# Exercise Rename Propagation & Diary Modal Fix

Last verified: 2026-10-22

## Objective

Fix two runtime and data-consistency bugs:
1. Prevent `TypeError: (title || "").trim is not a function` when clicking "Añadir primer registro" / "Nuevo registro" in Exercise Diary by guarding `normalizeExerciseTitle` against non-string arguments, sanitizing `openCreateModal` parameters, and avoiding event leakage from click handlers.
2. Synchronize exercise name and category changes across `rmLogs` and `exerciseDiary` when an exercise is updated in the catalog, preventing ghost/duplicate RM and Diary records and ensuring exercise catalog selection in RMs respects both ID and normalized names.

## Problem

1. When clicking the create button in Exercise Diary, the React `MouseEvent` is passed as the first parameter to `openCreateModal(targetExerciseName?: string)`. `normalizeExerciseTitle` expects a string but received the SyntheticEvent object; calling `(title || "").trim()` crashed the app.
2. Renaming an exercise in the catalog only updated `catalog` and `routines`. `rmLogs` and `exerciseDiary` were never updated. Consequently, RMs still listed the old exercise name, `getAvailableRmCatalog` offered the renamed exercise as a new trackable exercise, and Diary entries could not be filtered by the new exercise name.

## Scope

In:
- Make `normalizeExerciseTitle` tolerant to non-string inputs (returns empty string).
- Sanitize `openCreateModal` in `useExerciseDiary` and prevent `MouseEvent` forwarding in `DiaryFilters`, `DiaryEntryList`, and `ExerciseDiaryView`.
- Implement `updateRmLogsForCatalogExercise` and `updateDiariesForCatalogExercise` to keep `rmLogs` and `exerciseDiary` in sync with catalog changes, merging duplicate entries if both names previously existed.
- Update `getAvailableRmCatalog` to check both tracked exercise IDs and normalized exercise names.
- Ensure `useAddExerciseToRmModal` merges into an existing log if already present.
- Unit and integration tests covering both bug scenarios.

Out:
- Schema, RLS, RPC or IndexedDB version changes (wire contract remains unchanged).
- Deleting RM or diary logs when an exercise is deleted from catalog (preserves user data).

## Tasks

- [x] `T1-odd`: Task document and reproduction investigation.
- [x] `T2-diary-fix`: Guard `normalizeExerciseTitle`, sanitize `openCreateModal`, fix button click handlers, add tests.
- [x] `T3-rename-sync`: Propagate catalog updates to `rmLogs` and `exerciseDiary`, deduplicate records, update available catalog filter, add tests.
- [x] `T4-verify`: Run full test suite, lint, and build.

## Acceptance Criteria

- Clicking "Nuevo registro" or "Añadir primer registro" in Exercise Diary opens the modal without console errors.
- Renaming an exercise in catalog immediately updates its name and category in `rmLogs` and `exerciseDiary`.
- An exercise already tracked in `rmLogs` cannot be added again from the "Añadir ejercicio a RMs" modal, even if renamed.
- Filtering in Exercise Diary by a renamed exercise shows all its previous notes.
- All existing and new tests pass (`pnpm test`, `pnpm lint`, `pnpm build`).
