# Git workflow

Branching, commits, PRs, Definition of Done, and release for WorkoutLog.

Last verified: 2026-10-13

## Quick path

1. Start from `develop`; create feature, fix, or docs branches from it.
2. For substantial work, add `odd/tasks/<feature>.md`.
3. Commit in work units with Conventional Commits (tests and docs in the same commit as the behavior).
4. Run `pnpm test && pnpm lint && pnpm build` (+ DB checks if `supabase/` changed).
5. Open a PR back to `develop` using the PR template; merge after CI is green. Merge `develop` into `main` for releases; a push to `main` triggers GitHub Pages deployment.

## Branches

| Prefix | Use | Status |
|---|---|---|
| `develop` | Day-to-day development and target for feature/fix branches | Current workflow |
| `main` | Deployed branch | Observed |
| `feature/<name>` | Features branched from and merged back into `develop` | Current workflow |
| `docs/<name>` | Documentation (e.g. `docs/ai-context-layer`) | Observed |
| `fix/<name>` | Bug fixes branched from and merged back into `develop` | Current workflow |
| `client-only-app` | Existing local/remote branch | Observed; `TODO(human): confirm whether client-only-app is still needed` |

## Commits

Conventional Commits: `type(scope): summary` in English, imperative, lowercase.

| Types observed | `feat` (35), `fix` (14), `refactor` (10), `docs` (10), `chore` (3), `ci` (2), `style` (2) |
|---|---|
| **Scopes observed** | `sync`, `ui`, `auth`, `storage`, `data`, `backup`, `supabase`, `account`, `odd`, `dev`, `deploy`, `pages`; `billing` (historical) |

Examples from history: `feat(sync): wire status and backup outbox`, `fix(sync): dependency-order pending outbox operations`, `ci(pages): inject Supabase build variables`, `refactor: consolidate Supabase-only application`.

| Do | Don't |
|---|---|
| One reviewable work unit per commit, with its tests and docs | "regenerate package-lock" style messages (legacy – do not replicate) |
| Keep migrations in the same commit/PR as the client code that needs them | Mix unrelated refactors into a feature commit |
| Omit AI attribution / `Co-authored-by` trailers (maintainer preference) | Add tool or AI signatures to commit messages |

## ODD task documents

Substantial work (two or more meaningful steps, or progress worth recovering) gets a feature document in `odd/tasks/<feature-name>.md`: objective, problem, scope, constraints, task checklist with stable IDs, acceptance criteria, verification evidence, next step. Example: [`odd/tasks/ai-context-layer.md`](../../odd/tasks/ai-context-layer.md). Details: [agents guide](../agents-guide.md#odd-workflow).

## Pull requests

- Day-to-day changes use `develop`; branch feature/fix work from it and merge back into it. Use [`.github/pull_request_template.md`](../../.github/pull_request_template.md) for PRs.
- Merge `develop` into `main` for releases. A push to `main` triggers the GitHub Pages deployment; [`deploy.yml`](../../.github/workflows/deploy.yml) also builds PRs targeting `main` but does not deploy them.
- CI ([`ci.yml`](../../.github/workflows/ci.yml)) runs on every push and pull request, with no branch filters.
- Recommendation: require CI checks before merging changes to `main`.

## Definition of Done

- [ ] Behavior implemented with tests ([testing strategy](testing-strategy.md)).
- [ ] `pnpm test`, `pnpm lint`, `pnpm build` pass.
- [ ] If `supabase/` changed: new forward-only migration, `pnpm db:reset && pnpm db:test && pnpm db:lint` pass (requires `supabase start`, Docker), `database.types.ts` regenerated.
- [ ] If the sync contract changed: every row of the [duplication table](../architecture/frontend-backend-strategy.md#where-the-contract-is-duplicated) checked.
- [ ] UI follows the [UI skill](../../.github/skills/workoutlog-ui-style/SKILL.md); Spanish copy; 48 px targets.
- [ ] Docs updated (this folder, README if user-visible, agent files per [agents guide](../agents-guide.md#how-to-keep-this-up-to-date)).
- [ ] No secrets, no real user data in fixtures.
- [ ] Conventional Commit messages, no AI attribution.

## Release

| Part | How |
|---|---|
| Frontend | Merge `develop` into `main`; a push to `main` makes `deploy.yml` build and publish to GitHub Pages. No version tags (`package.json` version `0.0.0`). |
| Database | Apply migrations manually with the Supabase CLI, **before** the frontend deploy that depends on them. CI does not apply production migrations. |
| Clients | Service worker `autoUpdate` picks up the new bundle; old clients may run briefly. |

## Related

- [Coding standards](coding-standards.md)
- [Testing strategy](testing-strategy.md)
- [Security](security.md)
- [Onboarding](../onboarding.md)
- [Agents guide](../agents-guide.md)
