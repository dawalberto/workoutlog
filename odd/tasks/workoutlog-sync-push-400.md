# WorkoutLog recurring sync push 400

## Objective

Prevent dependency-invalid sync outbox entries from blocking all later pushes after guest-to-account transfer, while retaining every local change and the server's existing ownership, validation, and idempotency guarantees.

## Verified failure path

- Guest transfer iterates `legacyCollectionKeys` with routines before catalog in `src/services/db.ts`.
- Flattened routine data queues `routine_exercises` referencing `definition_id` before the catalog's `exercise_definitions` can be pushed.
- The server has a FK from `routine_exercises.definition_id` to `exercise_definitions`; PostgreSQL can reject the child operation with SQLSTATE `23503`.
- The backend maps SQLSTATE classes 22/23 to `invalid`, and the route returns the observed generic 400.
- Cloud sync retries the oldest FIFO outbox item; a rejected item stays pending and repeats after later local edits.
- Do not read or alter actual local workout payloads; use synthetic fixtures only.

## Scope and constraints

- Frontend repo: `/Users/dawalberto/Code/workout/workoutlog`, branch `feature/workoutlog-offline-sync`.
- Backend repo was read-only for this diagnosis; no backend write is needed for dependency ordering.
- Preserve all local data and pending outbox operations. Do not delete or reset IndexedDB, clear users' changes, touch `.env`, query cloud logs, or access remote Supabase/Stripe.
- Preserve the pre-existing unstaged user edit in `src/components/AppHeader.tsx` and all untracked files.
- Ensure dependency-aware ordering also repairs already queued child-before-parent operations in memory on each pending-queue read, without mutating stored payloads/sequences or changing order for operations on the same record.

## Tasks

- [x] `dependency-safe-outbox`: Order pending sync operations so referenced pending parent upserts precede children and child deletes precede parent deletes; preserve per-record sequence and stable FIFO for unrelated operations.
- [x] `transfer-order`: Generate new migrated/transferred outbox entries in dependency-safe table order (catalog before routines) for consistency.
- [x] `sync-regression-tests`: Add synthetic queue/guest-transfer coverage and a backend-equivalent FK regression assertion without using actual user data.

## Acceptance criteria and checks

- A pending exercise definition is pushed before a routine exercise that references it, including when those entries were originally enqueued in reverse order.
- Upserts order parents before children for all existing sync foreign-key relationships, while deletes preserve their existing child-first behavior.
- Multiple operations for one record remain in original order, and unrelated operations stay stable.
- Existing FIFO poison entries are not discarded; they are sent in dependency-safe order and successful responses acknowledge only their original operation IDs.
- Authenticated account ownership, sync payload validation, RLS, and local-first persistence remain unchanged.
- Focused and full frontend tests, lint, and build pass. Existing backend pgTAP sync-push FK behavior remains a regression baseline.

## Progress and verification

- Read-only investigation confirmed the recurring 400 mapping: `src/plugins/supabase-client.ts` maps SQLSTATE `23503` to `invalid`, then `src/routes/sync.ts` responds with the generic message.
- Existing pending order is `routine_exercises` before catalog definitions during guest transfer; the database FK is in `back-workoutlog/supabase/migrations/20261007135400_create_private_workout_data.sql`.
- Do not access remote Supabase logs; the reproduction and tests must use synthetic local fixtures.
- The existing unstaged `src/components/AppHeader.tsx` user change must remain untouched.
- Implementation route: delegated direct, with this worker as the sole writer. The parent supplied bounded failure evidence and exact allowed edit surfaces; no nested writer was used.
- Added stable topological ordering at pending-queue read time. It retains operation identity, sequence metadata, payloads, revisions, and stored bytes; same-table/record operations remain sequenced. Upserts follow the existing FK graph; child deletes precede parent deletes only for restrictive relationships. The schema's `ON DELETE SET NULL` references do not introduce delete-order edges.
- Reordered legacy collection generation to catalog before routines; retained every legacy key and migration marker.
- Added synthetic tests for child-first guest transfer, already-persisted queue repair, all FK parent/child pairs, child-first deletion, `ON DELETE SET NULL`, same-record ordering, stable unrelated FIFO, successful original-ID acknowledgements, and synthetic FK-rejection transaction rollback.
- Test-first RED: `pnpm exec vitest run tests/services/db.test.ts tests/services/sync-queue.test.ts tests/services/cloud-sync.test.ts` — 3 files failed; 6 failed and 33 passed of 39 tests. Failures showed child-first transfer/pending ordering, missing dependency sorter, and synthetic backend FK rejection.
- Focused GREEN: `pnpm exec vitest run tests/services/db.test.ts tests/services/sync-queue.test.ts tests/services/cloud-sync.test.ts` — 3 files passed; 39 tests passed.
- Full tests: `pnpm test` — 10 files passed; 92 tests passed.
- Lint/typecheck: `pnpm lint` — passed (`tsc --noEmit`).
- Build: `pnpm build` — passed; Vite reported a >500 kB bundle-size advisory (776.79 kB JS chunk), then generated the PWA precache successfully.
- Runtime harness: N/A; this service-only change has no browser runtime boundary. Fake IndexedDB and a synthetic mocked backend exercised ordering, FK rejection, rollback, and acknowledgements without user data or remote services.
- Rollback boundary: revert the sync dependency ordering and legacy collection ordering in `src/services/db.ts` and `src/services/sync-queue.ts`, together with their synthetic tests in `tests/services/db.test.ts`, `tests/services/sync-queue.test.ts`, and `tests/services/cloud-sync.test.ts`. This does not include or alter the pre-existing `src/components/AppHeader.tsx` edit or unrelated untracked files.
- Work-unit commit identity: `fe26ee2` (`fix(sync): dependency-order pending outbox operations`).
- Native review/RDD, remote services, backend files, push, PR, and deployment were not accessed or changed, per instruction.
- Next step: none; the local work-unit is complete and delivery remains under ordinary repository policy.
- Engram mirror: unavailable in this runtime.
