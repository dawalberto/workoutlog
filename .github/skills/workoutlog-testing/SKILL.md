---
name: workoutlog-testing
description: "Trigger: tests, Vitest, pgTAP, fake-indexeddb, mocks, fixtures, test coverage. Write WorkoutLog tests with the repo's existing techniques."
license: Apache-2.0
metadata:
  author: "dawalberto"
  version: "1.0"
---

## Activation Contract

Load when adding or changing tests in `tests/` or `supabase/tests/`, or when deciding what a change must test.

## Hard Rules

- Vitest runs in `node` (`vitest.config.ts`); no jsdom or Testing Library. Ask before adding test dependencies.
- Synthetic fixtures only (`'Sentadilla'`, `set-1`, `@example.test`); never real user data or exports.
- Isolate state: fresh IndexedDB per test; no reliance on test order.
- pgTAP files always `BEGIN; … ROLLBACK;` with `plan(N)` equal to the assertion count.
- Prefer a RED test before implementation when a deterministic test is possible.

## Decision Gates

| Change | Test |
|---|---|
| Pure logic | Input/output test (`tests/services/sync-queue.test.ts`, `tests/utils/backup.test.ts`) |
| Component behavior | React harness test (`tests/exercise-card.test.tsx`) |
| Rendered status text | `renderToStaticMarkup` (`tests/sync-wiring.test.tsx`) |
| Persistence | Fake IndexedDB (`tests/services/db.test.ts`) |
| Push/pull/errors | Fake Supabase client (`tests/services/cloud-sync.test.ts`) |
| Migration/RLS/RPC | pgTAP (`supabase/tests/workout_rls.test.sql`) |
| UI-only styling | None mandatory; `pnpm lint` + `pnpm build` |

## Execution Steps

1. IndexedDB: `import { IDBFactory } from 'fake-indexeddb';` then `beforeEach`: `vi.resetModules()`, stub `globalThis.window`, assign `new IDBFactory()`, dynamically import the module under test.
2. Component harness: `vi.doMock('react', async (importOriginal) => ({ ...(await importOriginal()), useState: harness.useState }))`; call the component as a function; find elements with `isValidElement`; invoke handlers (`onBlur`) directly; re-render through the harness.
3. Supabase: build a fake client with `vi.fn()` for `rpc`, `auth.*`, and chained `from().select().gt().order().limit()`.
4. pgTAP: insert `auth.users` rows, `SET LOCAL ROLE authenticated`, `set_config('request.jwt.claim.sub', '<uuid>', true)`, assert allow and deny (`throws_ok` with `sync_*` messages).
5. Place files at `tests/<area>/<name>.test.ts(x)` or `supabase/tests/<name>.test.sql`.

## Verification

- `pnpm test` · `pnpm test tests/utils/backup.test.ts` · `pnpm test -t "<name>"`
- `pnpm lint`
- `supabase start`, then `pnpm db:test` (after `pnpm db:reset` when migrations changed)

## Output Contract

Report tests added per change type, technique used, commands with observed pass/fail counts, and remaining gaps.

## References

- [Testing strategy](../../../docs/standards/testing-strategy.md)
- [Harness example](../../../tests/exercise-card.test.tsx)
- [Fake IndexedDB example](../../../tests/services/db.test.ts)
- [Static markup example](../../../tests/sync-wiring.test.tsx)
- [pgTAP example](../../../supabase/tests/sync_push.test.sql)
