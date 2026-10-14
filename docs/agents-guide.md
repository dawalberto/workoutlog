# Agents guide

How the AI context layer is organized, how agents should use it, and how to keep it current.

Last verified: 2026-10-13

## How agents should load context

1. **[`AGENTS.md`](../AGENTS.md) first** — short rules, commands, and links. (`CLAUDE.md` and `.github/copilot-instructions.md` point to the same rules for their tools.)
2. **Scoped instructions** in `.github/instructions/*.instructions.md` apply automatically by their `applyTo` glob when you touch matching files.
3. **Skills** in `.github/skills/*/SKILL.md` — load the one whose trigger matches the task, before writing.
4. **Docs** in `docs/` for depth. Agent files summarize and link here; they do not duplicate it.

## Files in the context layer

| Path | Purpose | Read by | When loaded |
|---|---|---|---|
| [`AGENTS.md`](../AGENTS.md) | Entry point: project summary, commands, hard rules, links | All agents | Always, first |
| [`CLAUDE.md`](../CLAUDE.md) | Pointer to `AGENTS.md` for Claude-based tools | Claude Code | Always |
| [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) | Repo-wide Copilot instructions | GitHub Copilot | Always |
| [`.github/instructions/frontend.instructions.md`](../.github/instructions/frontend.instructions.md) | React/Tailwind/hooks rules | Copilot (and agents honoring `applyTo`) | Editing frontend source |
| [`.github/instructions/sync-contract.instructions.md`](../.github/instructions/sync-contract.instructions.md) | Sync contract invariants | same | Editing sync/storage files |
| [`.github/instructions/database.instructions.md`](../.github/instructions/database.instructions.md) | Migration, RLS, RPC rules | same | Editing `supabase/` |
| [`.github/instructions/testing.instructions.md`](../.github/instructions/testing.instructions.md) | Vitest/pgTAP conventions | same | Editing tests |
| [`.github/instructions/ci-build.instructions.md`](../.github/instructions/ci-build.instructions.md) | Workflow and build config rules | same | Editing CI/build config |
| [`.github/instructions/docs.instructions.md`](../.github/instructions/docs.instructions.md) | Documentation conventions | same | Editing docs |
| [`.github/skills/workoutlog-feature-end-to-end/SKILL.md`](../.github/skills/workoutlog-feature-end-to-end/SKILL.md) | End-to-end feature workflow | Agents | Building a feature |
| [`.github/skills/workoutlog-supabase-migration/SKILL.md`](../.github/skills/workoutlog-supabase-migration/SKILL.md) | Writing a migration safely | Agents | Schema/RPC change |
| [`.github/skills/workoutlog-sync-contract-change/SKILL.md`](../.github/skills/workoutlog-sync-contract-change/SKILL.md) | Changing synced fields/tables | Agents | Contract change |
| [`.github/skills/workoutlog-testing/SKILL.md`](../.github/skills/workoutlog-testing/SKILL.md) | Writing tests the repo's way | Agents | Adding tests |
| [`.github/skills/workoutlog-offline-sync/SKILL.md`](../.github/skills/workoutlog-offline-sync/SKILL.md) | Local-first storage and sync rules | Agents | Storage/offline/sync |
| [`.github/skills/workoutlog-ui-style/SKILL.md`](../.github/skills/workoutlog-ui-style/SKILL.md) | Neon Bento design system | Agents | Any UI change |
| [`.github/agents/reviewer.agent.md`](../.github/agents/reviewer.agent.md) | Review persona/checklist | Copilot custom agents | Reviewing changes |
| [`.github/agents/architect.agent.md`](../.github/agents/architect.agent.md) | Design/planning persona | same | Planning |
| [`.github/agents/docs-keeper.agent.md`](../.github/agents/docs-keeper.agent.md) | Keeps docs and agent files current | same | After changes |
| [`.github/prompts/new-feature.prompt.md`](../.github/prompts/new-feature.prompt.md) | Reusable prompt: new feature | Humans invoking Copilot | On demand |
| [`.github/prompts/review-pr.prompt.md`](../.github/prompts/review-pr.prompt.md) | Reusable prompt: PR review | same | On demand |
| [`.github/prompts/explain-module.prompt.md`](../.github/prompts/explain-module.prompt.md) | Reusable prompt: explain a module | same | On demand |
| [`.github/pull_request_template.md`](../.github/pull_request_template.md) | PR checklist | Humans and agents | Opening a PR |
| `odd/tasks/*.md` | ODD feature task documents | Agents and humans | Substantial work, resume |
| `docs/**` | Deep human documentation (this folder) | Everyone | For depth |

`TODO(human): confirm which tools honor applyTo outside GitHub Copilot in your setup.`

### Scoped instruction globs

| File | `applyTo` |
|---|---|
| `frontend.instructions.md` | `src/App.tsx,src/main.tsx,src/components/**,src/hooks/**,src/utils/**,src/data/**,src/index.css,src/types.ts` |
| `sync-contract.instructions.md` | `src/sync/**,src/services/**,src/store/**,src/types/database.types.ts,src/utils/backup.ts,src/hooks/useSync.ts,src/hooks/useStorageLifecycle.ts,src/hooks/useAuth.ts,supabase/migrations/**,supabase/tests/**,scripts/check-sync-contract.mjs` |
| `database.instructions.md` | `supabase/**` |
| `testing.instructions.md` | `tests/**,supabase/tests/**` |
| `ci-build.instructions.md` | `.github/workflows/**,vite.config.ts,vitest.config.ts,tsconfig.json,package.json,pnpm-workspace.yaml,index.html,scripts/**` |
| `docs.instructions.md` | `docs/**,README.md,AGENTS.md,CLAUDE.md,.github/**/*.md,odd/**` |

Globs overlap on purpose (for example `src/utils/backup.ts` gets both frontend and sync-contract rules).

### Skills by trigger

| Skill | Trigger |
|---|---|
| `workoutlog-feature-end-to-end` | New feature or user-facing change across UI, hooks, storage, sync |
| `workoutlog-supabase-migration` | Migration, schema, RLS, policy, grant, RPC, pgTAP |
| `workoutlog-sync-contract-change` | New synced table/column, `sync_push` change, outbox shape |
| `workoutlog-testing` | Tests, Vitest, pgTAP, fixtures, mocks |
| `workoutlog-offline-sync` | Offline sync, IndexedDB, browser storage, cloud sync |
| `workoutlog-ui-style` | UI, CSS, styling, component, layout, Neon Bento |

Custom agents (`.github/agents/*.agent.md`): `reviewer` and `architect` are read-only (`tools: ["read", "search"]`); `docs-keeper` may also edit docs and agent files. Prompts (`.github/prompts/*.prompt.md`) take `${input:…}` variables: `new-feature` (`feature`, `featureName`), `review-pr` (`target`), `explain-module` (`module`).

## ODD workflow

Organic Driven Development is the maintainer's workflow for agent-assisted work.

1. **Authorize** — confirm the request asks for a change (questions and reviews stay read-only).
2. **Explore** — read the relevant code and docs first.
3. **Resolve uncertainty** — ask one focused question only for a real product decision.
4. **Classify** — substantial = two or more meaningful steps or progress worth recovering.
5. **Track** — for substantial work, create `odd/tasks/<feature-name>.md` (objective, problem, scope, constraints, task checklist with stable IDs, acceptance criteria, checks, progress, next step) before the first source write. Example: [`odd/tasks/ai-context-layer.md`](../odd/tasks/ai-context-layer.md).
6. **Implement task by task** — tests first when a runnable test exists; one work-unit Conventional Commit per task; record evidence in the doc.
7. **Close** — report verified outcome, any failed/skipped checks, next step.

Older ODD docs (`workoutlog-billing.md`, `workoutlog-account-premium.md`, `workoutlog-sync-push-400.md`, parts of `workoutlog-ui-polish.md`) reference the removed separate backend (Fastify) and/or Stripe billing — historical only.

## Hard rules for agents (summary)

- Never read or print `.env*` values; reference variable names only.
- Never edit applied migrations; add new ones.
- Contract changes follow the [checklist](architecture/frontend-backend-strategy.md#checklist-add-a-synced-field-or-table) in one PR.
- UI copy in Spanish; code, comments, commits, docs in English.
- No new dependencies without asking. No AI attribution trailers in commits.
- Push, PR creation, and merge are human decisions.

## How to keep this up to date

When a trigger happens, update the listed files in the same PR.

| Trigger | Update |
|---|---|
| New dependency | `AGENTS.md` (stack), [frontend](architecture/frontend.md) or [backend](architecture/backend.md), [coding standards](standards/coding-standards.md) if it changes patterns |
| New pattern / convention | [coding standards](standards/coding-standards.md), relevant `.github/instructions/*`, relevant skill |
| Architecture change | [overview](architecture/overview.md) (diagrams), affected architecture doc, new ADR in `docs/decisions/` |
| New or renamed `package.json` script | `AGENTS.md`, [onboarding](onboarding.md), [testing strategy](standards/testing-strategy.md), `ci-build.instructions.md` |
| Changed CI/deploy workflow | [git workflow](standards/git-workflow.md), [overview](architecture/overview.md#deployment-topology), `ci-build.instructions.md`, PR template |
| New migration / RPC | [backend](architecture/backend.md) (schema, RPCs, migration history), `database.instructions.md`, `workoutlog-supabase-migration` skill if the procedure changed |
| New synced table or field | [frontend–backend strategy](architecture/frontend-backend-strategy.md) (contract sources, checklist), [glossary](domain/glossary.md), `sync-contract.instructions.md`, `workoutlog-sync-contract-change` and `workoutlog-offline-sync` skills |
| New skill / agent / prompt / workflow | The tables above (files, globs, skills), `AGENTS.md` skill list and pointers |
| Renamed or moved paths | Every link to them: run a link check over `docs/**/*.md`, `AGENTS.md`, `.github/**/*.md`; fix `applyTo` globs |
| New UI tokens or UX rule | `workoutlog-ui-style` skill (single source), not the docs |
| Resolved `TODO(human)` | Replace the marker with the confirmed fact and update `Last verified` |

Every doc carries `Last verified: <date>`; bump it when you re-check the content against code.

## Related

- [Docs index](README.md)
- [`AGENTS.md`](../AGENTS.md)
- [Git workflow](standards/git-workflow.md)
- [Coding standards](standards/coding-standards.md)
- [Frontend–backend strategy](architecture/frontend-backend-strategy.md)
