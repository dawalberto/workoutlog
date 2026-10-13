# Repo follow-ups after the context-layer audit

## Objective

Act on the maintainer's answers to the context-layer Final Report: clean up leftovers, remove "Premium" naming, fix UI inconsistencies, add type generation checks, fix the DB seed, clean local data on sign-out, harden the write path, make the sync contract a single source of truth, and split oversized components.

## Constraints

- Branch: `develop` (merge into `main` later by the maintainer).
- Every subagent uses model `gpt-6-luna` (maintainer requirement).
- Single writer at a time; the orchestrator commits each task with a Conventional Commit, without AI attribution trailers.
- UI copy in Spanish; code, comments, docs and commits in English.
- Migrations are forward-only; never edit applied migrations.
- Local Supabase (Docker) is available: `pnpm db:reset`, `pnpm db:test`, `pnpm db:lint`.

## Delivery strategy

`ask-on-risk`. T8 and T9 are expected to exceed ~400 lines and will be sliced into several work-unit commits on `develop`.

## Tasks

| ID | Task | Route | Risk | Checks | Commit |
|----|------|-------|------|--------|--------|
| T1 | Docs: conventions and TODO(human) answers | delegated (gpt-6-luna) | passive | link/structure readback | done `3eb3284` |
| T2 | Repo cleanup: bun.lock, pnpm-workspace, motion, `@/` alias | delegated (gpt-6-luna) | medium | install --frozen-lockfile, test, lint, build | done `bc8b4bf` |
| T3 | Remove "Premium" naming; Spanish routine-limit copy; dark index.html | delegated (gpt-6-luna) | medium | test, lint, build | done `b6824af` |
| T4 | `db:types` script and CI freshness check | delegated (gpt-6-luna) | medium | db:types diff, CI YAML readback | done `54139e5` |
| T5 | Fix and re-enable the local DB seed | delegated (gpt-6-luna) | medium | db:reset with seed, db:test | done `4614ae6` |
| T6 | Sign-out leaves the app clean | delegated (gpt-6-luna) | high | test, lint, build, independent verifier | done `23171c9` |
| T7 | Revoke direct INSERT/UPDATE grants on synced tables | delegated (gpt-6-luna) | high | db:reset, db:test, db:lint, test, independent verifier | done `8a0b827` |
| T8 | Sync contract single source of truth + version | architect then writer (gpt-6-luna) | high | db + frontend checks, independent verifier | pending |
| T9 | Componentize large components and App.tsx | architect then writer slices (gpt-6-luna) | medium | test, lint, build per slice | pending |

## Deferred (not in scope)

- Zustand store refactor (documented as planned in T1).
- Push notifications for rest-timer alerts.

## Decisions

- AI Studio files (`metadata.json`, `DISABLE_HMR`) are kept because the maintainer may reuse AI Studio.
- The DB seed (`supabase/seed.sql`) is a local-dev fixture; first-run starter data stays in `src/data/initialData.ts` until the maintainer defines the real starter exercises and routines.
- `supabase gen types` output has trailing whitespace; `db:types` must normalize it so the CI diff is stable.

## Progress

- [x] T1 · [x] T2 · [x] T3 · [x] T4 · [x] T5 · [x] T6 · [x] T7 · [ ] T8 · [ ] T9

## Evidence

- T6: independent verifier FAIL (sync race, swallowed cleanup errors); one scoped correction applied; 80 Vitest tests pass.
- T7: independent verifier PASS; 95 pgTAP tests pass.
- T4: generated types already matched normalized CLI output.

## Next step

T8 sync contract single source of truth (architect plan first).
