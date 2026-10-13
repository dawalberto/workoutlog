# WorkoutLog documentation

Index of the human-facing documentation for WorkoutLog, a local-first workout tracker (React PWA + Supabase).

Last verified: 2026-10-13

## Start here

| You are… | Read in this order |
|---|---|
| **A new human contributor** | [Onboarding](onboarding.md) → [Architecture overview](architecture/overview.md) → [Coding standards](standards/coding-standards.md) → [Git workflow](standards/git-workflow.md) |
| **An AI coding agent** | [`AGENTS.md`](../AGENTS.md) → [Agents guide](agents-guide.md) → the scoped instructions and skills it points to → the docs below for depth |
| **Changing the sync contract** (new synced field/table, RPC change) | [Frontend–backend strategy](architecture/frontend-backend-strategy.md) (contract + checklist) → [Backend](architecture/backend.md) → [Testing strategy](standards/testing-strategy.md) → [ADR 0008](decisions/0008-sync-contract-source-and-version.md) |

The root [`README.md`](../README.md) is the short project summary; this folder holds the deep content.

## Index

### Getting started

| Doc | Purpose |
|---|---|
| [onboarding.md](onboarding.md) | Prerequisites, local setup, verification commands, first PR walkthrough. |
| [troubleshooting.md](troubleshooting.md) | Symptom → cause → fix for common development and runtime problems. |
| [agents-guide.md](agents-guide.md) | How the AI context layer is organized and how to keep it up to date. |

### Architecture

| Doc | Purpose |
|---|---|
| [architecture/overview.md](architecture/overview.md) | System context, components, data flow, deployment (with diagrams). |
| [architecture/frontend.md](architecture/frontend.md) | React app structure, hooks, navigation, PWA, timers, extension points. |
| [architecture/backend.md](architecture/backend.md) | Supabase schema, RLS, RPCs, auth config, migration history. |
| [architecture/frontend-backend-strategy.md](architecture/frontend-backend-strategy.md) | **The sync contract**: auth, outbox, push/pull, conflicts, errors, evolution checklist. |

### Standards

| Doc | Purpose |
|---|---|
| [standards/coding-standards.md](standards/coding-standards.md) | Naming, component and hook patterns, language rules, legacy patterns. |
| [standards/testing-strategy.md](standards/testing-strategy.md) | Vitest and pgTAP conventions, what to test per change type, gaps. |
| [standards/git-workflow.md](standards/git-workflow.md) | Branches, Conventional Commits, PR flow, Definition of Done, release. |
| [standards/security.md](standards/security.md) | Secrets, RLS ownership, SECURITY DEFINER rules, local data privacy. |

### Domain

| Doc | Purpose |
|---|---|
| [domain/glossary.md](domain/glossary.md) | Domain terms with code identifiers and Spanish UI labels. |

### Decisions (ADRs)

| ADR | Decision |
|---|---|
| [0000](decisions/0000-template.md) | ADR template. |
| [0001](decisions/0001-local-first-indexeddb.md) | Local-first storage in IndexedDB. |
| [0002](decisions/0002-supabase-only-backend.md) | Supabase is the only backend. |
| [0003](decisions/0003-static-github-pages-pwa.md) | Static PWA hosted on GitHub Pages. |
| [0004](decisions/0004-revision-based-outbox-sync.md) | Revision-based outbox sync. |
| [0005](decisions/0005-remove-billing-signed-in-sync.md) | Billing removed; every signed-in user syncs. |
| [0006](decisions/0006-app-state-in-hooks-no-router.md) | App state in `App.tsx` + hooks, no router or global store. |
| [0007](decisions/0007-pnpm-package-manager.md) | pnpm is the package manager. |
| [0008](decisions/0008-sync-contract-source-and-version.md) | Typed sync contract manifest, private SQL metadata, parity check, and client version gate. |

### Work logs

Substantial work is tracked in ODD feature task documents under `odd/tasks/` (for example [`odd/tasks/ai-context-layer.md`](../odd/tasks/ai-context-layer.md)). Some older task docs describe a removed Fastify backend and Stripe billing; they are historical only.

## Related

- [Root README](../README.md)
- [Agents guide](agents-guide.md)
- [Onboarding](onboarding.md)
