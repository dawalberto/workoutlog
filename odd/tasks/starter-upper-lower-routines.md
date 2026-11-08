# Starter upper/lower body routines

## Objective

Replace the placeholder first-run starter data in `src/data/initialData.ts` with two real routines — an upper-body and a lower-body session — covering 14 exercises with Spanish names, technique notes, default sets/reps/weight/rest, muscle-group categories, and the correct bundled exercise image. Resolve the open `TODO(human)` in `docs/architecture/backend.md`.

## Problem and rationale

The current starter data (`Starter Full Body A/B`, four English-named bodyweight/dumbbell exercises, no images or notes) is explicitly a placeholder ("the final catalogue awaits maintainer definition"). New users deserve a realistic, editable gym plan that teaches correct technique from the first session.

## Scope and constraints

- Branch `feature/starter-upper-lower-routines`.
- Client-only change: `src/data/initialData.ts` (first-run records seeded by `src/services/db.ts`). No schema, RLS, RPC, sync-contract, or IndexedDB version change.
- `supabase/seed.sql` is a separate local-development fixture and is intentionally not the first-run experience, so it stays as-is.
- UI copy in Spanish; identifiers, comments, commits, docs in English.
- The app stores a single numeric weight per set, so each exercise seeds the **midpoint** of its recommended range (decided with the maintainer). Calf raises default to bodyweight (`0`) since the exercise allows bodyweight or added load.
- Use only images already bundled in `src/assets/exercises/`, referenced as stable `library:<slug>` keys.
- Spanish muscle-group categories must match the app filter list (`Pecho`, `Espalda`, `Pierna`, `Hombro`, `Brazos`, `Core`).

## Tasks

- [x] `data`: Rewrite `INITIAL_EXERCISE_DEFINITIONS` and `INITIAL_ROUTINES` with the two routines.
- [x] `tests`: Add `tests/data/initialData.test.ts` (names, categories, notes, numeric weights, resolvable image keys, routine wiring).
- [x] `docs`: Update the backend seed guide to describe the shipped starter routines.

## Acceptance criteria and checks

- First-run seeds exactly two routines (`Tren superior`, `Tren inferior`) with 7 exercises each (14 definitions).
- Every exercise has a Spanish name, a short technique note, a numeric weight, and an `imageUrl` whose `library:` slug exists in the bundled library.
- Every routine exercise mirrors its catalog definition (name, category, image, notes) and has 3 sets with the specified reps/weight/rest.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.

## Progress and verification

- `data`: `src/data/initialData.ts` rewritten with 14 definitions and 2 routines.
- `tests`: new `tests/data/initialData.test.ts` (shape, categories, notes, numeric defaults, resolvable `library:` images, routine wiring, clone isolation) plus the existing `tests/services/db.test.ts` seeding test.
- `docs`: `docs/architecture/backend.md` seed section updated (open `TODO(human)` removed, shipped starter data described).
- Checks: `pnpm test` 46 files / 328 tests passed; `pnpm lint` (`tsc --noEmit`) exit 0; `pnpm build` succeeded (expected chunk-size warning only).
- Decision: weights seed the **midpoint** of each range (calf raises = bodyweight `0`), per the maintainer's answer. `supabase/seed.sql` intentionally unchanged.

## Next step

- Maintainer review; keep the local `supabase/seed.sql` fixture separate (it does not model the first-run experience).
