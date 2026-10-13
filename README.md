# WorkoutLog

Last verified: 2026-10-13

WorkoutLog is a browser-first workout tracker. Routines, sessions, records, history, and diary entries remain available in IndexedDB offline. Signed-in users synchronize their private data directly with Supabase through row-level security and database RPCs.

## Architecture

- **Frontend:** Vite and React, deployed to GitHub Pages.
- **App state:** one Zustand store with domain slices; persistence, auth, and sync are lifecycle adapters. [Frontend architecture](docs/architecture/frontend.md) · [ADR 0009](docs/decisions/0009-zustand-app-store.md).
- **Data and authentication:** Supabase Auth, Postgres, RLS, migrations, and database tests in `supabase/`.
- **No dedicated backend:** there is no Fastify service, VPS runtime, Docker deployment, or server-side billing integration.
- **No billing:** WorkoutLog has no Stripe client, plan UI, payment configuration, or billing database surface.
- **No Edge Function today:** direct browser-to-Supabase synchronization covers the active feature set.

### Sync and editing

- Sync waits for owner-scoped IndexedDB hydration. Local queued edits trigger pushes; login, reconnect, Retry, and 30-second online polling also pull remote changes. Routine and exercise fields commit on blur rather than every keystroke.
- Refresh reconciles normalized record IDs, retaining local edits without overwriting unrelated remote sets or resurrecting remote deletions. Editing preserves scroll; completing an exercise advances to the next incomplete exercise.
- Storage, network, and rejected-operation failures show a sync error and retain unacknowledged changes locally. Retry after recovery. A push drains up to three queue snapshots per pass; continuously arriving edits beyond that limit remain pending and produce an explicit error, not a false “synced” status.
- Missing optional parent references are cleared only after a foreign-key rejection and a successful lookup confirms absence. The snapshot remains intact and the changed queue payload receives a fresh operation UUID; lookup errors and missing required parents retain the original operation.

## Local development

Requires Node.js 24, pnpm 10, the Supabase CLI, and Docker for the local Supabase stack.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Set only the public browser values in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

To develop authenticated synchronization, start the local Supabase project from this repository:

```sh
supabase start
supabase status
```

Use the URL and publishable key reported by `supabase status`. Configure Google OAuth credentials for local Supabase through your private environment when needed; do not place OAuth secrets in `.env.local` or commit them.

## Verification

Run frontend checks:

```sh
pnpm test
pnpm lint
pnpm build
```

Run the local database checks after `supabase start`:

```sh
pnpm db:reset
pnpm db:test
pnpm db:lint
supabase stop --no-backup
```

`pnpm db:reset` destroys **local** database contents before applying the complete forward-only migration history. The configured seed remains disabled because it is legacy fixture data.

## Supabase Cloud Free caveat

Supabase Cloud Free is suitable for this app's current direct-sync architecture, but free projects have platform quotas and can pause after inactivity. Keep local IndexedDB data and exports available for offline use, monitor the project in Supabase, and expect synchronization to be unavailable until a paused project is resumed. A resumed project may require users to sign in again. Production redirect URLs and Google OAuth settings must be configured in the Supabase dashboard.

## Deployment

GitHub Pages remains the frontend deployment target. The deploy workflow builds the static application; Supabase migrations are managed separately with the Supabase CLI. No VPS, Docker container, or Edge Function is deployed by this repository.

## Documentation

- [Documentation index](docs/README.md) — architecture, standards, ADRs, glossary.
- [Onboarding](docs/onboarding.md) — setup, verification, first PR.
- [AGENTS.md](AGENTS.md) — rules and commands for AI coding agents.
