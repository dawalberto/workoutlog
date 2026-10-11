---
applyTo: "tests/**,supabase/tests/**"
description: "Vitest and pgTAP conventions for WorkoutLog tests."
---

# Testing instructions

Load the [testing skill](../skills/workoutlog-testing/SKILL.md). Depth: [testing strategy](../../docs/standards/testing-strategy.md).

## Vitest (`tests/**`)

- Environment is `node` (`vitest.config.ts`); there is no jsdom or Testing Library. Do not add them without asking.
- IndexedDB: `import { IDBFactory } from 'fake-indexeddb';` and assign a fresh `new IDBFactory()` in `beforeEach`, with `vi.resetModules()` and a stubbed `globalThis.window` (see `tests/services/db.test.ts`).
- Component behavior: mock React's `useState`/`useRef` with a harness via `vi.doMock('react', …)`, call the component as a function, find elements with `isValidElement`, and invoke handlers such as `onBlur` (see `tests/exercise-card.test.tsx`, `tests/routine-view.test.tsx`).
- Static output: `renderToStaticMarkup` from `react-dom/server` (see `tests/sync-wiring.test.tsx`).
- Supabase: fake clients built from `vi.fn()` for `rpc`, `auth.*`, and chained `from().select().gt().order().limit()` (see `tests/services/cloud-sync.test.ts`, `tests/auth.test.ts`).
- Place files at `tests/<area>/<name>.test.ts(x)` mirroring `src/`.
- Fixtures are synthetic (`'Sentadilla'`, `set-1`); never real user data or exports.

## pgTAP (`supabase/tests/**`)

- Wrap every file in `BEGIN; … ROLLBACK;` and keep `SELECT plan(N)` equal to the assertion count.
- Create users in `auth.users` with `@example.test` emails; switch with `SET LOCAL ROLE authenticated` and `set_config('request.jwt.claim.sub', '<uuid>', true)`.
- Test both allowed and denied paths (`throws_ok` with the expected `sync_*` message or SQLSTATE).

## Anti-patterns

- Sharing IndexedDB state between tests; relying on test order.
- Snapshot tests of large markup; timing-based sleeps.
- Changing `plan(N)` without changing assertions, or committing a test that only passes against a non-local DB.

## Verify

`pnpm test` (or `pnpm test <file>` / `pnpm test -t "<name>"`). pgTAP: `pnpm db:test` after `supabase start`.
