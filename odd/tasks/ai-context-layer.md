# WorkoutLog AI context layer

## Objective

Make the repository understandable and safely contributable by new humans and AI coding agents: agent instructions, path-scoped instructions, skills, custom agents, prompts, and human docs in `docs/`, all grounded in the current code.

## Problem and rationale

`AGENTS.md` only lists two skills; `README.md` is the only human doc. Conventions (local-first IndexedDB outbox, revision-based Supabase sync, App-plus-hooks state, Spanish UI copy, pgTAP tests, Conventional Commits) live only in code and Engram memory, so every agent rediscovers them and can break the duplicated SQL/TypeScript sync contract.

## Scope and constraints

- Branch `docs/ai-context-layer`. Docs and agent configuration only; never modify application source, migrations, tests, or CI behavior.
- Ground every claim in repository evidence; unverifiable items become `TODO(human): ...`.
- Never read or print `.env*` values; reference variable names only.
- Merge existing `AGENTS.md`, `README.md`, and `.github/skills/*` content instead of overwriting.
- Artifacts in English.

## Tasks

- [x] `discovery`: Map frontend, Supabase, sync contract, CI, and git conventions; verify commands. Route: delegated (two read-only explorers; mapping trigger).
- [ ] `human-docs`: Write `docs/` (index, onboarding, architecture x4, standards, glossary, ADRs, troubleshooting, agents guide). Route: delegated writer (2+ non-trivial files).
- [ ] `agent-files`: Write `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, scoped instructions, skills, custom agents, prompts, PR template; update existing skills. Route: delegated writer (2+ non-trivial files).
- [ ] `verify`: Check every path, script, env var name, link, and `applyTo` glob; check for contradictions and secrets. Route: inline scripted checks.

## Acceptance criteria and checks

- Every referenced path, script, and relative link resolves (scripted link/path check).
- `applyTo` globs match real files.
- No secret values; only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and Supabase CLI `env(...)` names appear.
- `AGENTS.md` is 200 lines or fewer and links to `docs/` instead of duplicating it.
- `pnpm test`, `pnpm lint`, and `pnpm build` still pass (no source changes expected).
- Risk tier: passive (documentation and agent configuration only); structural readback plus scripted link checks.

## Progress and verification

- `discovery`: `pnpm test` 9 files / 71 tests passed; `pnpm lint` exit 0; `pnpm build` succeeded (chunk size warning only). DB commands not runnable locally (Docker unavailable); latest `main` CI database job is green.

## Next step

`human-docs`.
