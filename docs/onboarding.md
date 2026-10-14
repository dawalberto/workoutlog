# Onboarding

Get WorkoutLog running locally, verify it, and land your first change.

Last verified: 2026-10-14

## Quick path

```sh
pnpm install --frozen-lockfile
pnpm dev            # http://localhost:5173/workoutlog/ — local-only mode, no backend needed
pnpm test && pnpm lint && pnpm build
```

Without Supabase env vars the app runs fully offline ("local-only mode"). Add a local Supabase stack only when you work on auth or sync.

## Prerequisites

| Tool | Version | Why | Evidence |
|---|---|---|---|
| Node.js | 24 | Runtime used by CI and deploy | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) |
| pnpm | 10.25.0 | Canonical package manager (`packageManager` field) | [`package.json`](../package.json) |
| Supabase CLI | 2.120.0 | Local Supabase stack, migrations, pgTAP tests | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Deno | 2.x | Edge Function typecheck and tests | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Docker | any recent | Required by `supabase start` | [`supabase/config.toml`](../supabase/config.toml) |

There is no `.nvmrc` / `engines` field. Use pnpm only (see [ADR 0007](decisions/0007-pnpm-package-manager.md)).

## Setup

1. Install dependencies: `pnpm install --frozen-lockfile`.
2. Choose a run mode (below).
3. Run the verification commands.

## Run locally

### Mode A — local-only (no backend)

```sh
pnpm dev
```

- No `.env.local` needed. When `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are missing or invalid, `createSupabaseBrowserClient()` returns `null` and the app stores everything in IndexedDB only ([`src/services/supabase.ts`](../src/services/supabase.ts)).
- Sign-in and sync are unavailable; the sync status shows "Solo en este dispositivo".

### Mode B — with local Supabase (auth + sync)

Requires Docker running.

```sh
supabase start
supabase status          # prints the local API URL and publishable key
cp .env.example .env.local
# set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from `supabase status`
pnpm dev
```

| Local service | Port |
|---|---|
| Vite dev server (strict) | 5173 |
| Supabase API | 54321 |
| Postgres | 54322 |
| Studio | 54323 |
| Inbucket (email testing) | 54324 |

Google sign-in locally needs `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` exported in the shell that runs `supabase start` (read via `env()` in [`supabase/config.toml`](../supabase/config.toml)). Never put them in `.env.local` or commit them. See [security](standards/security.md).

## Verification commands

| Command | What it checks | Notes |
|---|---|---|
| `pnpm test` | All Vitest tests | See latest test run for current totals |
| `pnpm fn:test` | Deno Edge Function tests | Includes local Web Push encryption/decryption |
| `pnpm push:vapid` | Generate VAPID keys | Keep the private key in the server environment only |
| `pnpm test tests/utils/backup.test.ts` | One test file | |
| `pnpm test -t "<name>"` | Tests matching a name | Standard Vitest flag |
| `pnpm lint` | `tsc --noEmit` typecheck | No ESLint/Prettier exist |
| `pnpm build` | Production build + service worker | A >500 kB chunk warning is expected |
| `pnpm db:reset` | Replays all migrations on the **local** DB | Requires `supabase start` (Docker). **Destroys local data.** |
| `pnpm db:types` | Regenerates `src/types/database.types.ts` from the local schema | Requires `supabase start` (Docker); CI checks generated-type freshness. |
| `pnpm db:test` | pgTAP tests in `supabase/tests/` | Requires `supabase start` (Docker) |
| `pnpm db:lint` | `supabase db lint --local` | Requires `supabase start` (Docker) |
| `supabase stop --no-backup` | Stops the local stack | |

These match CI exactly; see [testing strategy](standards/testing-strategy.md).

## Local rest-timer push

The local push sender needs VAPID keys and the Supabase service-role key. The root `.gitignore` already ignores `supabase/functions/.env`; never commit that file.

1. Start the local stack and generate a P-256 key pair:

   ```sh
   supabase start
   pnpm push:vapid
   ```

   Use the generated public key for `VITE_VAPID_PUBLIC_KEY` and `VAPID_PUBLIC_KEY`; keep `VAPID_PRIVATE_KEY` server-side. Set `VAPID_SUBJECT` to a `mailto:` or `https:` contact URI.
2. Create `supabase/functions/.env` with `REST_PUSH_DISPATCH_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. Use a fresh random dispatch secret. The Supabase Edge Runtime supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; the CLI ignores user-defined `SUPABASE_*` entries.
3. Serve the function locally:

   ```sh
   supabase functions serve send-rest-push --env-file supabase/functions/.env
   ```

4. Add local Vault secrets `rest_push_function_url` and `rest_push_dispatch_secret` using the SQL in [backend architecture](architecture/backend.md#vault-setup). The URL must be reachable from the database container; `http://host.docker.internal:54321/functions/v1/send-rest-push` is the Docker Desktop default.
5. Run `pnpm fn:test` to verify the handler and Web Push encryption. Stop the local function server when finished and delete the ignored `.env` file.

## First PR walkthrough

1. Branch from `develop`: `feature/<name>`, `fix/<name>` or `docs/<name>` ([git workflow](standards/git-workflow.md)).
2. For substantial work, create an ODD task doc in `odd/tasks/<feature>.md` (see [agents guide](agents-guide.md#odd-workflow)).
3. Make the change with tests alongside it ([testing strategy](standards/testing-strategy.md)).
4. Commit with a Conventional Commit, e.g. `feat(sync): ...`, `fix(ui): ...`. No AI attribution trailers.
5. Run the same checks as CI: `pnpm test`, `pnpm lint`, `pnpm build`; plus `pnpm db:reset && pnpm db:test && pnpm db:lint` if you touched `supabase/`.
6. Open a PR back to `develop` and fill in [`.github/pull_request_template.md`](../.github/pull_request_template.md). CI runs on every PR; merge `develop` into `main` for a release and GitHub Pages deployment.

## Who to ask

WorkoutLog has a single maintainer (dawalberto).

`TODO(human): add the preferred contact channel for questions (GitHub issues, email, other).`

## Common setup errors

| Symptom | Cause | Fix |
|---|---|---|
| `Port 5173 is in use` and dev exits | `pnpm dev` uses `--strictPort` | Free port 5173. Do not change the port: Supabase Auth `site_url` and redirect URLs expect 5173. |
| App works but no sign-in / "Solo en este dispositivo" | Env vars missing or invalid → local-only mode | Create `.env.local` from `.env.example` with values from `supabase status`; restart `pnpm dev`. |
| `supabase start` fails | Docker not running | Start Docker, retry. |
| Google sign-in fails locally | OAuth env vars not exported for the CLI | Export `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, then `supabase stop && supabase start`. |
| Old UI after a code change | PWA service worker enabled in dev (`devOptions.enabled` in [`vite.config.ts`](../vite.config.ts)) caches assets | Hard-reload or unregister the service worker in DevTools → Application. |

More in [troubleshooting](troubleshooting.md).

## Related

- [Docs index](README.md)
- [Root README](../README.md)
- [Architecture overview](architecture/overview.md)
- [Troubleshooting](troubleshooting.md)
- [Git workflow](standards/git-workflow.md)
