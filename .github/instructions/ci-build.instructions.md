---
applyTo: ".github/workflows/**,vite.config.ts,vitest.config.ts,tsconfig.json,package.json,pnpm-workspace.yaml,index.html,scripts/**"
description: "Rules for CI workflows, build, PWA, and package configuration in WorkoutLog."
---

# CI and build instructions

Depth: [git workflow](../../docs/standards/git-workflow.md), [deployment topology](../../docs/architecture/overview.md#deployment-topology), [ADR 0003](../../docs/decisions/0003-static-github-pages-pwa.md), [ADR 0007](../../docs/decisions/0007-pnpm-package-manager.md).

## Rules

- pnpm is canonical (`packageManager: pnpm@10.25.0`). Use `pnpm add`/`pnpm install`; commit only `pnpm-lock.yaml`. CI installs with `pnpm install --frozen-lockfile`.
- `.github/workflows/ci.yml` must keep both jobs: `frontend` (`pnpm test`, `pnpm lint`, `pnpm build`) and `database` (`supabase start` → `supabase db reset` → generated-type freshness check → `supabase test db` → `supabase db lint` → stop).
- `.github/workflows/deploy.yml` builds on PRs to `main` but deploys only on push to `main` or manual dispatch. Frontend env comes from repo **variables** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (public values), never secrets in code.
- Keep `base: '/workoutlog/'` in `vite.config.ts`; OAuth redirects and the PWA scope depend on it.
- PWA: `registerType: 'autoUpdate'`, manifest `lang: 'es'`. Changing caching or scope affects every installed client — ask first.
- `vitest.config.ts`: keep `environment: 'node'` and `include: tests/**/*.test.{ts,tsx}` unless the maintainer approves a change.
- `index.html` copy and meta are Spanish.
- New or renamed `package.json` scripts must be reflected in `AGENTS.md`, `docs/onboarding.md`, `docs/standards/testing-strategy.md`, and this file.

## Anti-patterns

- Adding alternate package-manager lockfiles or commands.
- Adding dependencies without approval.
- Deploying migrations from CI or running `db:reset` against a remote project.
- Removing the strict port (`--strictPort` on 5173): Supabase Auth `site_url` expects it.
- Copying placeholder build-script approvals or AI Studio leftovers (`DISABLE_HMR`, `metadata.json`) into new config.

## Verify

`pnpm install --frozen-lockfile && pnpm test && pnpm lint && pnpm build`. Workflow edits are verified by the CI run on the PR.
