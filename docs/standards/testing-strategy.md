# Testing strategy

How WorkoutLog is tested (Vitest for TypeScript, pgTAP for Postgres) and what each kind of change must cover.

Last verified: 2026-10-11

## Commands

| Command | Scope | Notes |
|---|---|---|
| `pnpm test` | All Vitest tests | 9 files / 71 tests at last verification |
| `pnpm test tests/utils/backup.test.ts` | One file | Verified |
| `pnpm test -t "<test name>"` | Tests matching a name | Standard Vitest |
| `pnpm lint` | `tsc --noEmit` typecheck | Counts as the lint gate |
| `pnpm build` | Production build | Catches build-only failures |
| `pnpm db:reset` | Replay all migrations locally | Requires `supabase start` (Docker); **wipes local DB** |
| `pnpm db:types` | Regenerate `src/types/database.types.ts` from the local schema | CI checks generated-type freshness after reset |
| `pnpm db:test` | pgTAP (`supabase test db --local`) | Requires `supabase start` (Docker) |
| `pnpm db:lint` | `supabase db lint --local` | Requires `supabase start` (Docker) |

CI ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) runs `pnpm test`, `pnpm lint`, `pnpm build` (job `frontend`) and `supabase start` → `db reset` → generated-type freshness check → `test db` → `db lint` → `stop` (job `database`) on every push and PR.

## Vitest setup

- Config: [`vitest.config.ts`](../../vitest.config.ts) — `environment: 'node'`, `include: tests/**/*.test.{ts,tsx}`, `clearMocks: true`.
- No jsdom, no Testing Library, no coverage thresholds, no e2e tests.
- Location: `tests/` mirrors `src/` (`tests/services/`, `tests/utils/`); component tests at `tests/<component>.test.tsx`.

### Techniques in use

| Technique | Used in | How |
|---|---|---|
| Fresh fake IndexedDB per test | [`tests/services/db.test.ts`](../../tests/services/db.test.ts), [`cloud-sync.test.ts`](../../tests/services/cloud-sync.test.ts), [`sync-wiring.test.tsx`](../../tests/sync-wiring.test.tsx) | `import { IDBFactory } from 'fake-indexeddb'`; `indexedDB = new IDBFactory()` in `beforeEach`, with `vi.resetModules()` and a stubbed `globalThis.window` |
| Hook/state harness + element-tree walking | [`tests/exercise-card.test.tsx`](../../tests/exercise-card.test.tsx), [`tests/routine-view.test.tsx`](../../tests/routine-view.test.tsx) | `vi.doMock('react', …)` replaces `useState`/`useRef` with a manual harness; the component is called as a function; elements are found with `isValidElement` and their handlers (e.g. `onBlur`) invoked directly |
| Static markup rendering | [`tests/sync-wiring.test.tsx`](../../tests/sync-wiring.test.tsx) | `renderToStaticMarkup` from `react-dom/server` for `SyncStatus` output; `vi.doMock` for `db`/`cloud-sync` modules |
| Fake Supabase client | [`tests/auth.test.ts`](../../tests/auth.test.ts), [`cloud-sync.test.ts`](../../tests/services/cloud-sync.test.ts) | Objects with `vi.fn()` for `rpc`, `auth.signInWithOAuth`, and chained `from().select().gt().order().limit()` |
| Pure function tests | [`sync-queue.test.ts`](../../tests/services/sync-queue.test.ts), [`backup.test.ts`](../../tests/utils/backup.test.ts), [`routine-limit.test.ts`](../../tests/routine-limit.test.ts) | Direct input/output assertions |

Fixtures are synthetic (e.g. exercise `'Sentadilla'`, `set-1`). Never use real user data or exports.

## pgTAP conventions

Files in [`supabase/tests/`](../../supabase/tests/workout_rls.test.sql): `supabase_only.test.sql` (plan 17), `sync_push.test.sql` (32), `sync_history_metrics.test.sql` (12), `workout_rls.test.sql` (25).

```sql
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(N);
-- insert synthetic auth.users rows (…@example.test)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<user uuid>', true);
-- is(...), throws_ok(...), etc.
SELECT * FROM finish();
ROLLBACK;
```

- Always wrap in `BEGIN … ROLLBACK`; keep `plan(N)` equal to the assertion count.
- Test as `authenticated` with a JWT `sub` claim to exercise RLS. No current file switches to `anon`; add such a case when changing grants.

## What to test per change

| Change | Required tests |
|---|---|
| UI-only (layout, styling) | None mandatory; `pnpm lint` + `pnpm build`. Add a harness test if behavior (e.g. commit-on-blur) changes. |
| Component behavior | Harness test like `exercise-card.test.tsx` |
| Hook logic | Extract pure logic to `src/utils` and test it; or a harness test |
| Persistence (`db.ts`, `useAppStorage`) | `tests/services/db.test.ts` with fake IndexedDB: hydration, scopes, migration, reload |
| Outbox / diff / ordering | `tests/services/sync-queue.test.ts` |
| Push/pull, conflicts, errors | `tests/services/cloud-sync.test.ts` with fake client |
| Backup format | `tests/utils/backup.test.ts`, including legacy shapes |
| Migration / RLS / RPC | pgTAP in `supabase/tests/` + `pnpm db:reset && pnpm db:test && pnpm db:lint` |
| Sync contract (field/table) | Both sides — see the [checklist](../architecture/frontend-backend-strategy.md#checklist-add-a-synced-field-or-table) |

## Coverage gaps

Untested today: most components; `useRoutines`, `useWorkoutSession`, `useRmTracker` logic; `timeCalculations`, `rmCalculations`, `diaryCalculations`; audio/vibration; PWA install; end-to-end flows in a real browser. `TODO(human): decide whether to add jsdom/Testing Library or e2e tests; none exist today.`

## Related

- [Coding standards](coding-standards.md)
- [Git workflow](git-workflow.md)
- [Frontend–backend strategy](../architecture/frontend-backend-strategy.md)
- [Backend](../architecture/backend.md)
- [Onboarding](../onboarding.md)
