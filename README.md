# WorkoutLog

WorkoutLog is a browser-first workout tracker. Routines, sessions, records, history, and diary entries remain available in IndexedDB offline. Signed-in users synchronize their private data directly with Supabase through row-level security and database RPCs.

## Architecture

- **Frontend:** Vite and React, deployed to GitHub Pages.
- **Data and authentication:** Supabase Auth, Postgres, RLS, migrations, and database tests in `supabase/`.
- **No dedicated backend:** there is no Fastify service, VPS runtime, Docker deployment, or server-side billing integration.
- **No billing:** WorkoutLog has no Stripe client, plan UI, payment configuration, or billing database surface.
- **No Edge Function today:** direct browser-to-Supabase synchronization covers the active feature set.

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
