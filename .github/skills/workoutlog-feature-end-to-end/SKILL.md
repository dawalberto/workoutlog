---
name: workoutlog-feature-end-to-end
description: "Trigger: new feature, user-facing change across UI, hooks, IndexedDB, sync, tests, docs. Deliver a WorkoutLog feature end to end with ODD."
license: Apache-2.0
metadata:
  author: "dawalberto"
  version: "1.1"
---

## Activation Contract

Load when a user-facing feature touches more than one layer: components, App state/hooks, IndexedDB persistence, and possibly sync or the database. For a pure visual tweak load only `workoutlog-ui-style`.

## Hard Rules

- Follow ODD: explore first; for substantial work (2+ meaningful steps) create `odd/tasks/<feature>.md` before the first source write; one Conventional Commit work unit per task with its tests and docs.
- Keep shared state in the Zustand store (`src/store/`); components read it through `useAppStore` selectors and per-component hooks. Persistence and sync are lifecycle adapters. No React context or other global state; there is no router. The migration is in progress; see [`odd/tasks/zustand-store-refactor.md`](../../../odd/tasks/zustand-store-refactor.md).
- UI copy in Spanish; identifiers, comments, commits, docs in English.
- Any new persisted field or collection that signed-in users must sync is a contract change: switch to `workoutlog-sync-contract-change` for that step.
- Ask before adding dependencies, schema/RPC changes, or bumping the IndexedDB version.

## Decision Gates

| Feature needs | Load / do |
|---|---|
| New or changed UI | `workoutlog-ui-style` (tokens, 48 px targets, safe areas) |
| New persisted data, local only | `workoutlog-offline-sync`; extend `db.ts` collections and backup |
| New synced field/table | `workoutlog-sync-contract-change` (includes migration) |
| Schema/RPC only | `workoutlog-supabase-migration` |
| Tests | `workoutlog-testing` |

## Execution Steps

1. Read the affected code and [frontend architecture](../../../docs/architecture/frontend.md); check the [glossary](../../../docs/domain/glossary.md) for domain names.
2. Classify; if substantial, write `odd/tasks/<feature>.md` (objective, scope, task IDs, acceptance criteria, checks).
3. Domain types in `src/types.ts`; pure logic in `src/utils/` with Vitest tests first.
4. Hook actions in `src/hooks/`, wired into `App.tsx`; inputs commit on blur.
5. Persistence and backup (`src/utils/backup.ts`) if data shape changes; sync per the contract skill.
6. Components with Spanish copy and Neon Bento tokens.
7. Update docs per the [maintenance table](../../../docs/agents-guide.md#how-to-keep-this-up-to-date); record evidence in the task doc; commit the work unit.

## Verification

- `pnpm test && pnpm lint && pnpm build`
- If `supabase/` changed: `supabase start`, then `pnpm db:reset && pnpm db:test && pnpm db:lint`.

## Output Contract

Report: task doc path, layers touched (UI / hooks / storage / sync / DB), tests added, commands run with observed results, docs updated, open `TODO(human)` items.

## References

- [AGENTS.md](../../../AGENTS.md)
- [Coding standards](../../../docs/standards/coding-standards.md)
- [Testing strategy](../../../docs/standards/testing-strategy.md)
- [Git workflow and Definition of Done](../../../docs/standards/git-workflow.md)
- [ODD workflow](../../../docs/agents-guide.md#odd-workflow)
