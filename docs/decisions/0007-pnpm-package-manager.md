# ADR 0007: pnpm is the package manager

Records the canonical package manager and dependency install policy.

Last verified: 2026-10-13

## Status

Accepted.

## Context

- The project started with npm and briefly used a Bun-based CI workflow before switching to pnpm.
- The repository is a single-package app, not a pnpm workspace monorepo.

## Decision

- pnpm 10.25.0 (`"packageManager": "pnpm@10.25.0"`) is canonical. CI and deploy use `pnpm install --frozen-lockfile` on Node 24.
- Only `pnpm-lock.yaml` is maintained.
- `pnpm-workspace.yaml` allows the `esbuild` install script via pnpm 10's `onlyBuiltDependencies` setting; no other package build scripts are approved.

## Consequences

| Positive | Negative / cost |
|---|---|
| Reproducible installs matching CI | |

## Evidence

- [`package.json`](../../package.json) `packageManager`
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
- `601e3f9 chore(dev): add pnpm workspace metadata` (added `pnpm-lock.yaml` and `pnpm-workspace.yaml`); `b624129 refactor: consolidate Supabase-only application` (rewrote `ci.yml`, updated `pnpm-lock.yaml`)

## Related

- [Onboarding](../onboarding.md)
- [Coding standards](../standards/coding-standards.md)
- [Docs index](../README.md)
