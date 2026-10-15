# Session UX improvements

Last verified: 2026-10-15

## Objective

Four workout-session UX fixes: prompt to finish when every set is complete, drag the rest banner out of the way, accept decimal kilogram values, and hide guest data behind a loading gate while signed-in data hydrates.

## Problem

- Finishing a routine requires remembering the header button after the last set is checked.
- The rest banner is fixed at the bottom and can cover the control the user needs.
- Kilogram fields do not reliably accept decimals such as 53.5 / 53,5.
- After sign-in, or when an existing session restores, guest or previous local data flashes before the account scope hydrates.

## Scope

In:

- Automatic finish prompt for an in-progress routine whose sets all become complete.
- Pointer drag for the normal and compact rest banners, session-only position.
- Decimal kilogram entry on existing weight inputs, including Spanish comma.
- Loading screen while a signed-in owner's storage scope is not yet hydrated.

Out:

- Schema, RLS, RPC, sync-contract, or IndexedDB version changes.
- New dependencies.
- Persisting drag position or the dismiss state of the finish prompt.
- Push, PR, or merge.

## Locked product decisions

| Topic | Decision |
|---|---|
| Finish prompt | New modal, not a reuse of the manual finish confirm. Show only on the transition to all sets complete, and only when `totalSets > 0` and an active session exists. Confirm calls the existing `finishSession`. Dismiss closes the modal and does not finish. Do not prompt again until some set is unchecked and the routine becomes fully complete again. Rest timer keeps running. Guest and signed-in behavior match. |
| Drag | No library. Pointer events with capture. The whole banner is the drag surface, with a dedicated 48 px grip as an affordance; timer controls remain clickable. Update the element directly with no position transition, then commit one session-only position shared by normal and compact modes on pointer release. Default stays at the current bottom placement until the first drag. Clamp inside the viewport, including safe areas. Do not write IndexedDB or the sync outbox. |
| Weights | Store a finite number. Accept `.` and `,` as the decimal separator. Commit on blur. Display with a comma in the text field. Keep at most two decimal places and strip trailing zeros. Do not round to an integer. Reps stay integers. `inputMode="decimal"`, text input at least 16 px, so a comma is typable. No backup-format version bump; existing numeric backup values already parse. |
| Hydration gate | Keep `AppLoadingScreen` visible until initial auth resolution finishes, and while signing in or a signed-in owner's scope is not hydrated (`hydratedScopeKey` not equal to the active owner scope, or storage not loaded). Defer guest hydration until auth has resolved; a resolved signed-out guest remains unblocked. Do not clear the outbox or write defaults before hydration. Cover both fresh sign-in and an already-signed-in reload. |

## Constraints

- Spanish UI copy and `aria-label`s. English identifiers, comments, and this document.
- Neon Bento tokens, 48 px targets, safe areas. Match existing modal register; do not invent voseo if current modals use another register.
- Zustand store stays the shared state. Prompt visibility and drag position are UI state, not persisted domain state.
- Vitest node harness. Synthetic fixtures only. RED before implementation when a deterministic test exists.
- Conventional Commits. No AI attribution and no `Co-authored-by` trailer.
- Subagents implement on `feat/session-ux-improvements` with model GPT-6 Luna.

## Tasks

- [x] `T1-finish-prompt`: Detect the all-sets-complete transition and show the new finish modal. Route: delegated writer. Risk: medium.
- [x] `T2-drag-banner`: Drag both rest-banner modes. Route: delegated writer. Risk: medium.
- [x] `T3-decimal-weight`: Shared weight parser and kilogram inputs. Route: delegated writer. Risk: medium; implementation, focused tests, and characterization snapshots are complete.
- [x] `T4-hydration-gate`: Account-data loading gate. Route: delegated writer. Risk: high.
- [x] `T5-catalog-weight-save`: Parse catalog default weights consistently on form submit, including Enter. Route: delegated writer. Risk: medium.
- [x] `T5-drag-tracking`: Track pointer and touch movement directly across the whole rest banner without easing. Route: delegated writer. Risk: medium.
- [x] `T6-hydration-flash`: Hold the loading gate until initial auth resolves and avoid guest hydration during that interval. Route: delegated writer. Risk: high.

## Acceptance criteria

- Checking the last remaining set opens a Spanish modal. Confirm finishes the routine through the existing action. Dismiss leaves the session active and does not immediately reappear.
- Empty routines and already-finished sessions do not prompt. Unchecking and recompleting prompts again.
- Normal and compact rest banners can be dragged from the whole banner with mouse and touch and stay inside the viewport without position easing. The grip remains a 48 px affordance; buttons on the banner still activate. Position is not persisted.
- `53,5` and `53.5` commit as `53.5` on set weight, catalog/default weight, and RM weight fields. Integer weights still work.
- A resolved signed-out guest sees guest content without the account loading message. Before auth resolution, during OAuth redirect, or while a signed-in owner scope hydrates, guest data remains hidden behind the loading screen.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass. No `supabase/` diff.

## Delivery

Forecast exceeds 400 authored lines. Strategy: `ask-on-risk`, resolved in autopilot as one feature branch `feat/session-ux-improvements`. Chain strategy assumption: `feature-branch-chain`, but no PR is opened (human decision). One work-unit commit per task.

## Progress and verification

- Exploration complete. Branch `feat/session-ux-improvements` created from `develop` at `9ea1923`.
- Weight columns are JSON numbers/strings, not integer SQL. No migration.
- T1 implementation: added a transition-only completion prompt beside the active workout controls. The existing `finishSession` action remains the sole finish path; dismissal is local UI state, and the rest timer is unchanged.
- T1 route: delegated writer. Risk tier: medium.
- T1 RED: `pnpm test tests/all-sets-complete-finish.test.tsx` — failed as expected before implementation (1 failed suite, 0 tests; the new modal module did not exist).
- T1 GREEN: `pnpm test tests/all-sets-complete-finish.test.tsx tests/routine-view.test.tsx` — passed (2 files, 7 tests).
- T1 commit: `7f1850a feat(workout): prompt to finish when every set is complete`.
- T2 implementation: added pointer-captured dragging with a dedicated Spanish-labelled handle, shared in-memory coordinates for both banner layouts, safe-area-aware clamping, and unchanged timer controls.
- T2 route: delegated writer. Risk tier: medium.
- T2 RED: `pnpm test tests/rest-timer-bar.test.tsx` — failed as expected before implementation (2 tests failed: the clamp helper was unavailable and the drag handle was absent).
- T2 GREEN: `pnpm test tests/rest-timer-bar.test.tsx tests/app-shell.test.tsx` — passed (2 files, 7 tests).
- T2 commit: `6b6b71f feat(rest-timer): drag the rest banner anywhere on screen`.
- T3 implementation: added a shared decimal parser and comma formatter, applied them to set, custom/default exercise, catalog-default, and RM weight fields, and retained blur-based commits with numeric persisted values.
- T3 route: delegated writer. Risk tier: medium.
- T3 RED: `pnpm test tests/utils/weightInput.test.ts tests/exercise-card.test.tsx tests/rm-logs-characterization.test.tsx` — failed as expected (1 missing utility module plus 4 failing behavior tests; comma weights were rejected or truncated).
- T3 GREEN: `pnpm test tests/utils/weightInput.test.ts tests/exercise-card.test.tsx tests/rm-logs-characterization.test.tsx` — passed (3 files, 19 tests).
- T3 typecheck: `pnpm lint` — passed (`tsc --noEmit`).
- T3 commit: `48ca033 feat(workout): accept decimal kilogram values`.
- T4 implementation: reused `selectIsStorageReady` to gate signed-in users until their owner scope is hydrated, with the `Cargando datos...` message. Guests no longer wait on an owner-scope gate; persistence and outbox semantics were not changed.
- T4 route: delegated writer. Risk tier: high.
- T4 RED: `pnpm test tests/app-shell.test.tsx tests/store/persistence.test.ts` — failed as expected before implementation (3 app-shell tests failed; existing persistence tests passed).
- T4 GREEN: `pnpm test tests/app-shell.test.tsx tests/store/persistence.test.ts` — passed (2 files, 19 tests).
- T4 typecheck: `pnpm lint` — passed (`tsc --noEmit`).
- T4 commit: `173896e fix(auth): show a loading gate while account data hydrates`.
- First post-T4 `pnpm test && pnpm lint && pnpm build`: stopped at `pnpm test` because two characterization snapshots still expected number-input markup.
- Updated only the three affected snapshot entries in `tests/__snapshots__/exercise-catalog.test.tsx.snap` and `tests/__snapshots__/routine-view-characterization.test.tsx.snap`; the inspected differences were confined to weight-input type, step, and input class markup.
- `pnpm test tests/exercise-catalog.test.tsx tests/routine-view-characterization.test.tsx -u`: passed (2 files, 7 tests; 3 snapshots updated after diff inspection).
- `pnpm test tests/exercise-catalog.test.tsx tests/routine-view-characterization.test.tsx`: passed (2 files, 7 tests).
- Final `pnpm test && pnpm lint && pnpm build`: passed (33 files, 218 tests; `tsc --noEmit` passed; production build passed with the expected >500 kB chunk-size warning).
- T3 closure work-unit commit: `test(workout): update weight input characterization snapshots` (this commit).
- T5 implementation: catalog default weight now uses the shared decimal parser, and the RM check uses the normalized weight from the saved exercise. Enter-submit no longer bypasses comma-decimal parsing.
- T5 route: delegated writer. Risk tier: medium.
- T5 RED: `pnpm test tests/utils/exerciseCatalog.test.ts` — failed as expected (1 failed, 4 passed; `53,5` produced `0` instead of `53.5`).
- T5 GREEN: `pnpm test tests/utils/exerciseCatalog.test.ts` — passed (1 file, 5 tests), covering `53,5`, `53.5`, and invalid weight fallback to `0`.
- T5 full verification: the first `pnpm test && pnpm lint && pnpm build` run passed all 221 tests but lint caught optional-weight narrowing errors; the guard was corrected.
- T5 final verification: `pnpm test && pnpm lint && pnpm build` — passed (33 files, 221 tests; `tsc --noEmit` passed; production build passed with the expected >500 kB chunk-size warning).
- T5 work-unit commit: `b4a1273 fix(catalog): parse comma decimals when saving exercise weight`.
- T5-drag-tracking implementation: pointer events now start from the whole banner except interactive controls, move the root element directly with `translate3d` and disabled transitions/animation, and commit the shared position only on pointer release. The session position is still clamped and is not persisted.
- T5-drag-tracking revised decisions: whole-banner drag, no position transition, and no per-move React state updates.
- T5-drag-tracking route: delegated writer. Risk tier: medium.
- T5-drag-tracking RED: `pnpm test tests/rest-timer-bar.test.tsx` — failed as expected (1 file, 4 failed and 1 passed; drag helper, root handlers, and non-animated banner behavior were missing).
- T5-drag-tracking GREEN: `pnpm test tests/rest-timer-bar.test.tsx tests/app-shell.test.tsx` — passed (2 files, 16 tests).
- T5-drag-tracking work-unit commit: `5d4075a fix(rest-timer): track the pointer while dragging the banner`.
- T6-hydration-flash revised decision: auth resolution must gate guest paint and guest hydration; a successful OAuth redirect keeps the signing-in gate active.
- T6-hydration-flash implementation: initial auth listener events are buffered until `getSession()` settles, with a listener user preferred over a null result; later sign-out events still clear the user. Storage hydration now waits for resolved auth, and OAuth redirect startup keeps the loading screen visible.
- T6-hydration-flash route: delegated writer. Risk tier: high.
- T6-hydration-flash RED: `pnpm test tests/app-shell.test.tsx tests/auth.test.ts tests/sync-wiring.test.tsx tests/store/persistence.test.ts` — failed as expected (3 files failed, 1 passed; 4 tests failed and 39 passed because OAuth loading, initial auth settlement, and deferred guest hydration were not implemented).
- T6-hydration-flash GREEN: `pnpm test tests/app-shell.test.tsx tests/auth.test.ts tests/sync-wiring.test.tsx tests/store/persistence.test.ts` — passed (4 files, 44 tests).
- T6-hydration-flash work-unit commit: pending.
- Final verification: `pnpm test && pnpm lint && pnpm build` — passed (33 files, 231 tests; TypeScript passed; production build passed with the expected >500 kB chunk-size warning).
- Next step: done, pending parent confirmation.

## Relevant files

- `src/store/slices/workoutSlice.ts` — `toggleSetComplete`, `finishSession`
- `src/hooks/routine/useRoutineExerciseList.ts` — set toggle and progress
- `src/components/routine/WorkoutProgressPanel.tsx` — mounts `WorkoutFinishConfirmModal`
- `src/components/RestTimerBar.tsx` — normal and compact banners
- `src/components/ExerciseCard.tsx` — set weight input
- `src/utils/exerciseCatalog.ts`, `src/hooks/useExerciseCatalog.ts` — catalog weight normalization and RM check on save
- `tests/utils/exerciseCatalog.test.ts` — catalog default-weight parsing coverage
- `src/App.tsx`, `src/components/AppLoadingScreen.tsx` — bootstrap loading gate
- `src/store/persistence.ts` — scope switch clears visible collections before owner hydration
