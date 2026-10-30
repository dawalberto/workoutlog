# Unify page headers task document

## Objective

Make the top headers of the RMs, Historial (workout history), and Diario (exercise diary) views visually identical, in structure and style, to the existing Rutinas and Biblioteca de Ejercicios headers, keeping every behavior exactly as it is today.

## Problem and rationale

Rutinas and Ejercicios render a flat page header: an uppercase neon-green kicker with a small icon, a muted subtitle, and the primary action button on the right, separated from the content by a single hairline border. RMs, Historial, and Diario instead wrap the same information inside a raised Bento card (`bg-[#1C1C1E] rounded-2xl border shadow-xl`). The result is inconsistent: three of the five main views look like a card floating on the page while the other two look like a page header. Aligning them removes the visual drift without changing what any header does.

## Scope and constraints

- Frontend only: `src/components/rm-logs/RmExerciseList.tsx`, `src/components/WorkoutHistoryView.tsx`, `src/components/exercise-diary/DiaryFilters.tsx`.
- Visual only. No state, hooks, handlers, ids, `aria-label`s, copy, or navigation change. Search, filters, badges, counts, and buttons keep their exact behavior.
- Reuse the exact header shape from `src/components/RoutineList.tsx` and `src/components/ExerciseCatalog.tsx`: `flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]`, an `h1` with `text-[11px] font-extrabold uppercase tracking-widest text-[#00FF87]` and an inline `w-3.5 h-3.5` icon, a `text-xs sm:text-sm text-[#A1A1AA]` subtitle, and the CTA in the trailing `flex items-center gap-2` block.
- Content that lived inside the removed header card (summary metric cards, catalog-empty warning, search/filter bars) becomes standalone blocks below the header, matching how Rutinas and Ejercicios place their summary/search blocks.
- Follow the Neon Bento tokens from the UI skill: `#0D0D0D` base, `#1C1C1E` cards, `#00FF87` accent, `border-white/[0.08]` hairlines, 48px touch targets.
- Characterization snapshots for the diary and RM views are intentionally re-approved to reflect the new header markup.

## Tasks

- [x] `rm-header-flat`: Convert the RM list header to the flat kicker style and move its search bar into a standalone block.
- [x] `history-header-flat`: Convert the history header to the flat kicker style and lift the summary metrics out of the header card into standalone Bento cards.
- [x] `diary-header-flat`: Convert the diary header to the flat kicker style and lift the catalog warning and search/filter bar out of the header card.
- [x] Re-approve affected characterization snapshots and run `pnpm test`, `pnpm lint`, `pnpm build`.
- [x] `catalog-header-badge`: Move the exercise count from the standalone "N ejercicios registrados" line into the header badge, matching the RMs/Historial/Diario headers.

## Acceptance criteria and checks

- RMs, Historial, and Diario headers use the same container classes, kicker typography, subtitle style, and border separator as Rutinas and Ejercicios.
- No card wrapper (`bg-[#1C1C1E] rounded-2xl ... shadow-xl`) remains around those three headers.
- Every existing control still renders and behaves identically: search inputs, feeling/exercise filters, month navigation, "Volver a Hoy", "Añadir Ejercicio", "Nuevo Registro", counts and badges.
- Existing behavior/characterization tests pass after snapshot re-approval; `pnpm lint` and `pnpm build` pass.

## Progress and verification

- Branch: `refactor/unify-page-headers`, based on `develop`.
- `rm-header-flat`: `RmExerciseList` now starts with the flat header (Trophy kicker + count badge + subtitle + "Añadir Ejercicio"); the search field moved to a standalone `my-6` block, matching the catalog search placement.
- `history-header-flat`: `WorkoutHistoryView` now starts with the flat header (Calendar kicker + session count + subtitle + conditional "Volver a Hoy"); the week/month/total summary cards are now standalone Bento cards in a `my-6` grid instead of being nested in the removed header card. Month navigation and the calendar card are untouched.
- `diary-header-flat`: `DiaryFilters` now starts with the flat header (BookOpen kicker + entry count + subtitle + "Nuevo Registro"); the empty-catalog warning and the search/filter bar are now standalone `my-6` blocks. Filters, chips, and the disabled-CTA behavior are unchanged.
- Intentional snapshot re-approval: `tests/__snapshots__/rm-logs-characterization.test.tsx.snap` (5 snapshots) and `tests/__snapshots__/exercise-diary.test.tsx.snap` (3 snapshots) updated for the new header markup. No non-snapshot assertions changed; every id and `aria-label` used by the tests is preserved.
- Verification: `pnpm test` passed (40 files, 279 tests) after re-approval, `pnpm lint` passed, and `pnpm build` passed with the expected large-chunk warning.
- No test exists for `WorkoutHistoryView`; its header change is visual-only and covered by the shared header structure and by `pnpm lint`/`pnpm build`.
- `catalog-header-badge` (follow-up): `ExerciseCatalog` now renders `{filteredExercises.length} ejercicio(s)` as a header badge and the previous standalone "N ejercicios registrados" line under the search bar was removed. The count still reflects the active search/category filters. Benefit: all five main views now show their live count in the header badge. Snapshot `tests/__snapshots__/exercise-catalog.test.tsx.snap` re-approved (2 snapshots); `pnpm test` (40 files, 279 tests), `pnpm lint`, and `pnpm build` pass.
