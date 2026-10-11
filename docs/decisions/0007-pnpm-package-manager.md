# ADR 0007: pnpm is the package manager

Records which package manager is canonical and what the other lockfiles mean.

Last verified: 2026-10-11

## Status

Accepted.

## Context

- The project started with npm (`package-lock.json` commits). `bun.lock` was added in `bbf87d1 feat: transform app into a PWA`, and CI was first created as a Bun workflow (`52082bd ci(frontend): add Bun validation workflow`).
- `bun.lock` and `pnpm-lock.yaml` are both committed today.

## Decision

- pnpm 10.25.0 (`"packageManager": "pnpm@10.25.0"`) is canonical. CI and deploy use `pnpm install --frozen-lockfile` on Node 24.
- Only `pnpm-lock.yaml` is maintained. `bun.lock` is legacy – do not update or replicate.

## Consequences

| Positive | Negative / cost |
|---|---|
| Reproducible installs matching CI | Stale `bun.lock` can confuse tools/contributors |
| | `pnpm-workspace.yaml` contains `allowBuilds` placeholders ("set this to true or false") for packages not in dependencies |

## Evidence

- [`package.json`](../../package.json) `packageManager`
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
- `601e3f9 chore(dev): add pnpm workspace metadata` (added `pnpm-lock.yaml` and `pnpm-workspace.yaml`); `b624129 refactor: consolidate Supabase-only application` (rewrote `ci.yml`, updated `pnpm-lock.yaml`)
- `TODO(human): decide whether to delete bun.lock and clean pnpm-workspace.yaml placeholders.`

## Related

- [Onboarding](../onboarding.md)
- [Coding standards](../standards/coding-standards.md)
- [Docs index](../README.md)
