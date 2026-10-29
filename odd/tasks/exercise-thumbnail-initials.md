# Exercise thumbnail fallback with initials

## Objective

When an exercise has no image, or its image fails to load, show the same weight (dumbbell) placeholder, with the exercise initials overlaid on top in the app's neon green (`#00FF87`).

## Problem and rationale

Exercise thumbnails are rendered in many places (catalog, routine list, active workout card, RM list, reorder/add modals, preview and form modals). Each site handled the "no image" and "broken image" cases differently: some showed the `Dumbbell` icon, others hid the `<img>` on error and left an empty box, and the active workout card showed the exercise index instead. There was no shared representation, so the same exercise could look different depending on the screen.

## Scope and constraints

- Visual-only; no schema, sync contract, storage, or IndexedDB changes.
- One shared component so every thumbnail site behaves the same way.
- Fallback is rendered behind the image and the image hides itself on error (no component state), which keeps the characterization snapshots render-safe and avoids shifting the call order of mocked `react` hooks in tests.
- Spanish UI copy; English identifiers, comments, commits, and docs.

## Tasks

- [x] `util`: `getExerciseInitials` (two letters, ignores Spanish connectors and punctuation).
- [x] `ui`: shared `ExerciseThumbnail` (dumbbell + neon initials behind the image, `onError` aware).
- [x] `ui`: apply it in the catalog card, routine list, active workout card, RM list, reorder modal, add-exercise modal, add-to-RM modal, preview modal, and catalog form modal.
- [x] `tests`: Vitest for the initials helper and the thumbnail component; refresh characterization snapshots.

## Acceptance criteria and checks

- An exercise without an image shows the dumbbell icon with its initials overlaid in neon green.
- An exercise whose image fails to load shows the same placeholder instead of an empty box.
- An exercise with a working image keeps showing the image.
- `pnpm test`, `pnpm lint`, `pnpm build` pass.

## Progress and verification

- `src/utils/exerciseInitials.ts`, `src/components/ExerciseThumbnail.tsx`.
- Updated sites: `ExerciseCatalogCard`, `RoutineList`, `ExerciseCard`, `RmExerciseList`, `ReorderExercisesModal`, `AddExerciseModal`, `AddExerciseToRmModal`, `ExercisePreviewModal`, `ExerciseFormModal`.
- `tests/exercise-initials.test.ts`, `tests/exercise-thumbnail.test.tsx`, and refreshed `tests/__snapshots__/*` for the affected characterization tests.
- `pnpm lint` exit 0; `pnpm build` succeeded (chunk-size warning only); `pnpm test` 40 files / 279 tests passed.
- The exercise-diary snapshot was already stale on this branch before this task and was refreshed so the suite is green.

## Next step

- None; human decides whether to push, open a PR, and merge.
