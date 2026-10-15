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
| Drag | No library. Pointer events with capture. One session-only position shared by normal and compact modes. Default stays the current bottom placement until the user drags. Dedicated 48 px handle so timer buttons still click. Clamp inside the viewport, including safe areas. Do not write IndexedDB or the sync outbox. |
| Weights | Store a finite number. Accept `.` and `,` as the decimal separator. Commit on blur. Display with a comma in the text field. Keep at most two decimal places and strip trailing zeros. Do not round to an integer. Reps stay integers. `inputMode="decimal"`, text input at least 16 px, so a comma is typable. No backup-format version bump; existing numeric backup values already parse. |
| Hydration gate | Reuse `AppLoadingScreen` with Spanish copy `Cargando datos...` while auth has a user and that owner's scope is not hydrated (`hydratedScopeKey` not equal to the active owner scope, or storage not loaded). Do not block guests. Do not clear the outbox or write defaults before hydration. Cover both fresh sign-in and an already-signed-in reload. |

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
- [ ] `T3-decimal-weight`: Shared weight parser and kilogram inputs. Route: delegated writer. Risk: medium; implementation and focused tests are complete, but full-suite snapshots remain blocked outside the authorized edit surface.
- [x] `T4-hydration-gate`: Account-data loading gate. Route: delegated writer. Risk: high.

## Acceptance criteria

- Checking the last remaining set opens a Spanish modal. Confirm finishes the routine through the existing action. Dismiss leaves the session active and does not immediately reappear.
- Empty routines and already-finished sessions do not prompt. Unchecking and recompleting prompts again.
- Normal and compact rest banners can be dragged with mouse and touch and stay inside the viewport. Buttons on the banner still activate. Position is not persisted.
- `53,5` and `53.5` commit as `53.5` on set weight, catalog/default weight, and RM weight fields. Integer weights still work.
- A guest who is not signing in never sees the account loading gate. A signed-in user does not see guest records while the owner scope is hydrating.
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
- Final `pnpm test && pnpm lint && pnpm build`: failed during `pnpm test` because two characterization snapshots include changed weight-input markup. The chained lint and build steps did not run in that command.
- Final `pnpm lint && pnpm build`: passed; the build emitted the existing expected chunk-size warning (>500 kB).
- T3 closure is reopened: the two failing snapshot files are outside the authorized edit surface — `tests/__snapshots__/exercise-catalog.test.tsx.snap` and `tests/__snapshots__/routine-view-characterization.test.tsx.snap`. They were not edited.
- Next step: obtain authorization for those snapshot paths, update the expected text-input markup, and rerun the full verification gate.

## Relevant files

- `src/store/slices/workoutSlice.ts` — `toggleSetComplete`, `finishSession`
- `src/hooks/routine/useRoutineExerciseList.ts` — set toggle and progress
- `src/components/routine/WorkoutProgressPanel.tsx` — mounts `WorkoutFinishConfirmModal`
- `src/components/RestTimerBar.tsx` — normal and compact banners
- `src/components/ExerciseCard.tsx` — set weight input
- `src/App.tsx`, `src/components/AppLoadingScreen.tsx` — bootstrap loading gate
- `src/store/persistence.ts` — scope switch clears visible collections before owner hydration
