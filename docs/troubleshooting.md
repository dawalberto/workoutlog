# Troubleshooting

Symptom → cause → fix for common WorkoutLog development and runtime problems.

Last verified: 2026-10-14

## Quick index

| Area | Jump to |
|---|---|
| Dev server, env, service worker | [Local development](#local-development) |
| Sign-in, redirects | [Auth](#auth) |
| Sync errors | [Sync](#sync) |
| Database, migrations, types | [Database](#database) |
| Build and CI | [Build and CI](#build-and-ci) |
| Phone behavior | [Runtime on devices](#runtime-on-devices) |

## Local development

| Symptom | Cause | Fix |
|---|---|---|
| `pnpm dev` exits: port 5173 in use | `--strictPort` in the `dev` script ([`package.json`](../package.json)) | Stop the other process on 5173. Keep 5173: Supabase Auth `site_url`/redirects expect it. |
| No sign-in option works; status "Solo en este dispositivo" | `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` missing or invalid → client is `null` → local-only mode ([`src/services/supabase.ts`](../src/services/supabase.ts)) | Fill `.env.local` from `supabase status`; restart `pnpm dev`. |
| UI does not reflect code changes / old assets | PWA service worker active in dev (`devOptions.enabled: true`, [`vite.config.ts`](../vite.config.ts)) | DevTools → Application → Service Workers → Unregister; hard reload. |
| `supabase start` fails | Docker not running | Start Docker and retry. |

## Auth

| Symptom | Cause | Fix |
|---|---|---|
| Google sign-in fails locally | `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` not exported when `supabase start` ran | Export both in the shell, `supabase stop`, `supabase start`. Never put them in `.env.local`. |
| Redirect lands on 404 or wrong path in production | Redirect URL not allow-listed, or base path `/workoutlog/` missing | `redirectTo` is `new URL(BASE_URL, origin)` ([`useAuth.ts`](../src/hooks/useAuth.ts) 25–27). Add the exact URL in the Supabase dashboard (Auth → URL configuration). |
| Redirect to `localhost` from `127.0.0.1` (or vice versa) | Only the listed URLs are allowed ([`supabase/config.toml`](../supabase/config.toml) ~164–167) | Use `http://localhost:5173` consistently. |
| Signed out unexpectedly after a while | Supabase Cloud Free project was paused and resumed | Sign in again. |

## Sync

States come from [`useSync`](../src/hooks/useSync.ts) and are shown by [`SyncStatus`](../src/components/SyncStatus.tsx). Local data is never discarded on error.

| Symptom (UI / message) | Cause | Fix |
|---|---|---|
| "Error de sincronización" + network message | Offline, Supabase down, or project paused | Check connectivity / Supabase dashboard; resume the project; press "Reintentar". |
| "…stopped after 3 queue drain rounds; pending changes are retained." | Edits kept arriving during a push pass (`MAX_PUSH_DRAIN_ROUNDS = 3`) | Expected under heavy editing; the next trigger or Retry continues. |
| "Sync stopped after repeated stale revisions." / "could not reconcile the server revision conflict" | Another device keeps changing the same records, or a local op cannot be reconciled after a full pull | Retry. If persistent, inspect `sync_outbox` in DevTools → IndexedDB → `WorkoutLogDB`, and the server row's `server_revision`/`deleted_at`. |
| `sync_stale_revision_conflict` with "has no matching history record" | A live history-exercise row can remain after its parent history is tombstoned or absent, aborting older clients' pull transaction | Update/reload the app. Updated clients apply parents before children, drop orphan summaries, advance the cursor, and retain pending outbox changes. |
| "Sync push was rejected; pending changes are retained." | Server rejected the payload (SQLSTATE `22`, `23`, `28`, `42`, `P0001`), e.g. `sync_change_field_not_allowed` after a contract mismatch | Check that the deployed migration matches the client (see [contract evolution](architecture/frontend-backend-strategy.md#evolving-without-breaking-clients)). |
| "…required parent is missing (foreign key violation)." | Child pushed without its required parent on the server | Check outbox order and that the parent exists locally; see [FK repair](architecture/frontend-backend-strategy.md#fk-23503-repair). |
| "Sync rejected a reused operation ID with a different payload." | Outbox entry mutated without a new operation ID | Bug: operation payload changes must get a fresh UUID. |
| Error stays after the cause is fixed | Automatic retries are suppressed for the same failed pending signature (useSync.ts 215–244) | Press "Reintentar" or make another edit. |
| "Sync pull stopped after too many pages." | >100 pages × 500 rows for one table since the cursor | `TODO(human): decide recovery procedure for very large pulls.` |

## Database

All commands require `supabase start` (Docker).

| Symptom | Cause | Fix |
|---|---|---|
| Local data gone after `pnpm db:reset` | Reset drops and replays all migrations | Expected. Export a backup from the app first if needed. |
| No sample data after reset | Local seed fixture or app first-run starter data is not present | Check the reset output and the [seed and first-run starter-data guide](architecture/backend.md#seed-and-first-run-starter-data). |
| TypeScript errors on Supabase calls after a migration / runtime shape mismatch | [`src/types/database.types.ts`](../src/types/database.types.ts) drifted | Run `pnpm db:types` with `supabase start` running. CI also checks generated-type freshness after resetting its local database. |
| `pnpm db:test` plan mismatch | `SELECT plan(N)` ≠ number of assertions | Update `N`. |
| Need to change an applied migration | Migrations are forward-only | Add a new migration; never edit applied ones. |

## Build and CI

| Symptom | Cause | Fix |
|---|---|---|
| Build warns "chunks larger than 500 kB" | Single large bundle | Expected; not a failure. |
| CI `frontend` job fails | `pnpm test`, `pnpm lint`, or `pnpm build` failure, or lockfile out of sync (`--frozen-lockfile`) | Reproduce locally with the same commands; run `pnpm install` and commit `pnpm-lock.yaml`. |
| CI `database` job fails | Migration error on replay, pgTAP failure, or `db lint` finding | Run `supabase start && pnpm db:reset && pnpm db:test && pnpm db:lint` locally. |
| Deployed site has no sync | GitHub repo variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` unset | Set them under repository Settings → Variables; rerun deploy. |

## Runtime on devices

| Symptom | Cause | Fix |
|---|---|---|
| Rest timer does not beep/vibrate when the phone is locked or the app is backgrounded | Alerts run in foreground JS only (Web Audio + `navigator.vibrate`, [`src/utils/audioBeep.ts`](../src/utils/audioBeep.ts)); no Notification API, push, or wake lock | Known limitation. Keep the app in the foreground. Planned fix needs server push — see [backend](architecture/backend.md#adding-server-side-logic-edge-functions-scheduled-jobs-push). |
| Users still see an old version after deploy | Service worker `autoUpdate` has not swapped yet | Close all tabs / reopen the app. |

## Related

- [Onboarding](onboarding.md)
- [Frontend–backend strategy](architecture/frontend-backend-strategy.md)
- [Backend architecture](architecture/backend.md)
- [Testing strategy](standards/testing-strategy.md)
- [Root README](../README.md)
