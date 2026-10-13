# WorkoutLog — agent instructions

WorkoutLog is a local-first gym workout tracker shipped as a React PWA with a Spanish UI. All data (routines, catalog, active sessions, RM logs, history, diary) lives in IndexedDB and works offline. Signed-in users (Google OAuth) sync their private data directly with Supabase through RLS and the `sync_push` RPC. There is no custom server or Edge Function today; future server-side logic will use Supabase Edge Functions.

Read this file first, then load the matching skill and scoped instructions. Deep content lives in [`docs/`](docs/README.md); this file links instead of repeating it.

## Stack

| Area | Version / tool |
|---|---|
| UI | React ^19.0.1, Tailwind CSS ^4.3.3 (`@tailwindcss/vite`), lucide-react |
| Build | Vite ^8.3.0, vite-plugin-pwa ^1.3.0 (`autoUpdate`), base `/workoutlog/` |
| Language | TypeScript ^7.0.2 (`tsc --noEmit` is the lint gate) |
| Tests | Vitest ^5.0.3 (node env), fake-indexeddb ^6.2.5, pgTAP |
| Backend | Supabase (Postgres 17, Auth, RLS, RPCs), @supabase/supabase-js ^2.57.0, Supabase CLI 2.120.0 (CI) |
| Tooling | Node 24, pnpm 10.25.0, Docker (local Supabase) |
| Hosting | GitHub Pages via `.github/workflows/deploy.yml` |

## Repo map

| Path | Contents |
|---|---|
| `src/App.tsx` | Composition root: tab state, overlays, all persisted state |
| `src/components/` | 31 presentational components (named exports) |
| `src/hooks/` | Domain hooks: `useAppStorage`, `useAuth`, `useSync`, `useRoutines`, … |
| `src/services/` | `db.ts` (IndexedDB + outbox), `sync-queue.ts`, `cloud-sync.ts`, `auth.ts`, `supabase.ts` |
| `src/utils/`, `src/data/` | Pure helpers, backup format, starter data |
| `src/types.ts`, `src/types/database.types.ts` | Domain types; generated Supabase types |
| `tests/` | Vitest tests (mirrors `src/`) |
| `supabase/` | `config.toml`, forward-only `migrations/`, pgTAP `tests/`, legacy disabled `seed.sql` |
| `docs/` | Human docs (single source of truth) |
| `odd/tasks/` | ODD feature task documents |
| `.github/` | CI workflows, skills, instructions, agents, prompts |

## Commands

| Task | Command | Notes |
|---|---|---|
| Setup | `pnpm install --frozen-lockfile` then `cp .env.example .env.local` | pnpm only |
| Dev server | `pnpm dev` | Port 5173, `--strictPort` |
| Build | `pnpm build` | Chunk-size warning (>500 kB) is expected |
| Typecheck / lint | `pnpm lint` | `tsc --noEmit`; no ESLint/Prettier |
| All tests | `pnpm test` | `vitest run` |
| One file | `pnpm test tests/utils/backup.test.ts` | |
| By name | `pnpm test -t "<test name>"` | |
| Local Supabase | `supabase start` / `supabase status` / `supabase stop --no-backup` | Docker |
| DB reset | `pnpm db:reset` | Requires `supabase start`; **wipes the local DB** |
| DB tests | `pnpm db:test` | Requires `supabase start`; pgTAP |
| DB lint | `pnpm db:lint` | Requires `supabase start` |
| PWA assets | `pnpm generate:assets` | `scripts/generate-assets.js` (sharp) |
| DB types | `supabase gen types typescript --local > src/types/database.types.ts` | `TODO(human): confirm; no script exists` |

CI (`.github/workflows/ci.yml`) runs `pnpm test`, `pnpm lint`, `pnpm build` and the three DB commands on every push and pull request; it has no branch filters.

## Architecture

- State lives in `App.tsx` and hooks; there is no router or global store. A future refactor to one Zustand store is planned; do not add Zustand patterns or ad-hoc global state now ([ADR 0006](docs/decisions/0006-app-state-in-hooks-no-router.md)).
- Persistence: `useAppStorage` → `src/services/db.ts` (IndexedDB `WorkoutLogDB` v2, scopes `guest` / `owner:<id>`). Each write diffs state and appends outbox entries in the same transaction.
- Sync: `useSync` → `cloud-sync.ts` pulls by `server_revision`, then pushes one queued outbox operation per `sync_push` call. Server revision order wins over device clocks.
- Guests are local-only and limited to 3 routines; every signed-in user syncs (`get_sync_entitlement` returns `{ eligible: true }`). T3 removes the legacy "Premium" naming in this branch.

Depth: [overview](docs/architecture/overview.md) · [frontend](docs/architecture/frontend.md) · [backend](docs/architecture/backend.md) · [sync contract](docs/architecture/frontend-backend-strategy.md) · [glossary](docs/domain/glossary.md) · [ADRs](docs/README.md#decisions-adrs).

## Coding conventions

Full rules: [coding standards](docs/standards/coding-standards.md).

| Do | Don't |
|---|---|
| `export const SyncStatus: React.FC<SyncStatusProps> = …`; export its props interface only when another module imports it, otherwise keep it module-private | Default-export components (only legacy `App.tsx` does) |
| Relative imports: `import { useSync } from '../hooks/useSync';` | Add path aliases |
| Single quotes, semicolons, 2-space indent | Reformat untouched code |
| Commit text inputs on blur (`ExerciseCard.tsx`) | Call update handlers per keystroke (floods the outbox) |
| Persist via `useAppStorage` / `db.ts` | Read IndexedDB or call Supabase from components; write `localStorage` |
| Spanish UI copy and `aria-label`s (`"Navegación principal"`) | English user-facing text |
| English identifiers, comments, commits, docs | "Premium"/"Free plan" naming in new code |
| Tailwind + Neon Bento tokens from the UI skill | New CSS frameworks, icon libraries, or one-off global CSS |

## Frontend ↔ backend collaboration

The sync contract is **not versioned** and is duplicated across SQL and TypeScript ([duplication table](docs/architecture/frontend-backend-strategy.md#where-the-contract-is-duplicated)).

- Change both sides in the same work unit: migration + regenerated types + `sync-queue.ts` / `cloud-sync.ts` / `db.ts` + `backup.ts` + tests on both sides + docs.
- Make additive changes only (nullable/defaulted columns); never remove or rename a field a deployed client sends.
- Apply the migration to production **before** deploying the frontend that uses it; old PWA bundles keep running after deploys.
- Follow the [checklist](docs/architecture/frontend-backend-strategy.md#checklist-add-a-synced-field-or-table) and the `workoutlog-sync-contract-change` skill.

## Testing expectations

Details: [testing strategy](docs/standards/testing-strategy.md).

- Behavior change → Vitest test under `tests/` (node env; fresh `new IDBFactory()` from `fake-indexeddb`; `vi.mock`/`vi.doMock`; synthetic fixtures only).
- Migration / RLS / RPC change → pgTAP file in `supabase/tests/` (`BEGIN; SELECT plan(N); … ROLLBACK;`).
- Sync contract change → tests on both sides.
- UI-only change → `pnpm lint` + `pnpm build` at minimum.

## Git and commits

Details: [git workflow](docs/standards/git-workflow.md).

- Day-to-day development happens on `develop`; branch feature and fix work from `develop` and merge it back there. Merge `develop` into `main` for releases; a push to `main` triggers GitHub Pages deployment.
- Conventional Commits with scopes, English, imperative: `feat(sync): …`, `fix(ui): …`, `docs(odd): …`, `ci(pages): …`.
- No AI attribution and no `Co-authored-by` trailers (maintainer preference).
- Substantial work (2+ meaningful steps) gets an ODD task doc in `odd/tasks/<feature>.md` before the first source write; one work-unit commit per task with its tests and docs ([ODD workflow](docs/agents-guide.md#odd-workflow)).
- Push, PR creation, and merge are human decisions.

### Definition of Done

- [ ] Tests added/updated; `pnpm test`, `pnpm lint`, `pnpm build` pass.
- [ ] If `supabase/` changed: new migration; `pnpm db:reset && pnpm db:test && pnpm db:lint` pass; types regenerated.
- [ ] If the sync contract changed: both sides updated per the checklist.
- [ ] UI follows the UI skill; Spanish copy; 48 px touch targets.
- [ ] Docs and agent files updated per the [maintenance table](docs/agents-guide.md#how-to-keep-this-up-to-date).
- [ ] No secrets, no real user data; Conventional Commit messages.

## Boundaries

**Always**
- Read the relevant code and docs before writing; load the matching skill.
- Keep local data usable offline; hydrate before reactive writes.
- Run the commands for the area you touched and report the observed result.

**Ask first**
- Adding a dependency.
- Any schema, RLS, or RPC change.
- Bumping the IndexedDB version in `db.ts`.
- Adding a top-level folder.
- Adding Edge Functions or other server-side logic.

**Never**
- Edit an applied migration in `supabase/migrations/` — add a new one.
- Commit secrets or `.env*` files (other than `.env.example`), or print their values.
- Hand-edit `src/types/database.types.ts`; only regenerate it.
- Reintroduce billing/Stripe or a custom server.
- Use bun (or npm/yarn); pnpm is canonical ([ADR 0007](docs/decisions/0007-pnpm-package-manager.md)).
- Run `pnpm db:reset` against anything but the local stack.
- Delete or clear users' local data or the sync outbox.

## Project skills

Load the matching `SKILL.md` before writing.

- **Feature end to end**: Trigger: new feature, user-facing change across UI, hooks, storage, sync. Load `.github/skills/workoutlog-feature-end-to-end/SKILL.md`.
- **Supabase migration**: Trigger: migration, schema, RLS, RPC, SQL, pgTAP. Load `.github/skills/workoutlog-supabase-migration/SKILL.md`.
- **Sync contract change**: Trigger: new synced table or column, sync_push change, contract. Load `.github/skills/workoutlog-sync-contract-change/SKILL.md`.
- **Testing**: Trigger: tests, Vitest, pgTAP, fixtures, mocks. Load `.github/skills/workoutlog-testing/SKILL.md`.
- **Offline Sync**: Trigger: offline sync, IndexedDB, browser storage, cloud sync. Load `.github/skills/workoutlog-offline-sync/SKILL.md` for these tasks.
- **UI & Bento Neon Style**: Trigger: UI, CSS, styling, visual, component, design, bento, neon, layout. Load `.github/skills/workoutlog-ui-style/SKILL.md` for visual tasks.

## Where to look next

- Scoped instructions: `.github/instructions/*.instructions.md` (applied by `applyTo` glob).
- Custom agents: [reviewer](.github/agents/reviewer.agent.md), [architect](.github/agents/architect.agent.md), [docs-keeper](.github/agents/docs-keeper.agent.md).
- Prompts: [new feature](.github/prompts/new-feature.prompt.md), [review PR](.github/prompts/review-pr.prompt.md), [explain module](.github/prompts/explain-module.prompt.md).
- [Agents guide](docs/agents-guide.md) · [Onboarding](docs/onboarding.md) · [Troubleshooting](docs/troubleshooting.md) · [Security](docs/standards/security.md).
