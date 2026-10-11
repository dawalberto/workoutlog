---
applyTo: "docs/**,README.md,AGENTS.md,CLAUDE.md,.github/**/*.md,odd/**"
description: "Conventions for WorkoutLog human docs, agent context files, and ODD task documents."
---

# Documentation instructions

Depth: [agents guide](../../docs/agents-guide.md), [docs index](../../docs/README.md).

## Rules

- `docs/` is the single source of truth. Agent files (`AGENTS.md`, instructions, skills, agents, prompts) stay short and link to `docs/` instead of copying it.
- Write in English, neutral and imperative. Lead with the answer; use tables and checklists.
- Every doc keeps a `Last verified: <date>` line; bump it when you re-check content against code.
- Reference only paths, scripts, and env var names that exist. Write `TODO(human): …` for anything you cannot verify.
- Use relative links and keep them resolving; after moving or renaming files, run a link check over `docs/**/*.md`, `AGENTS.md`, `.github/**/*.md`.
- Architecture decisions get a new ADR from `docs/decisions/0000-template.md`; never rewrite an accepted ADR's decision.
- Keep `AGENTS.md` at 200 lines or fewer and its "Project skills" list in sync with `.github/skills/`.
- Skills: frontmatter `name`, quoted one-line `description` starting `Trigger: …`, `license`, `metadata.author`, `metadata.version`; bump the version on change.
- Instructions: frontmatter `applyTo` globs must match real files.
- ODD task docs (`odd/tasks/<feature>.md`): objective, problem, scope, constraints, checklist with stable IDs, acceptance criteria, verification evidence, next step. Older billing/Fastify task docs are historical; do not update them to match current code.
- Apply the [maintenance triggers](../../docs/agents-guide.md#how-to-keep-this-up-to-date) in the same PR as the change.

## Anti-patterns

- Duplicating command tables or the sync checklist into new files.
- Secret values, real user data, or `.env` contents in examples.
- Marketing language; Spanish in docs (Spanish belongs in UI copy only).
