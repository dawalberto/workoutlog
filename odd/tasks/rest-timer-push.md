# Rest timer server push notifications

## Objective

Notify signed-in users when a rest timer ends even if the phone is locked or the PWA is in the background: a system notification that sounds and vibrates without pausing other audio (Spotify, podcasts).

## Problem

The rest timer finish feedback (`playTimerFinishBeep`, `triggerTimerVibration`) runs only inside the mounted `RestTimerBar` (Web Worker tick + interval). Mobile browsers suspend page JS when locked/backgrounded, so the beep, vibration, and any client notification never fire. The Notification Triggers API is dead, so only a server-sent Web Push can wake the device on time.

## Design

| Layer | Decision |
|---|---|
| Delivery | Standard Web Push (VAPID, `aes128gcm`) to the PWA service worker; system notification uses the OS notification sound + `vibrate` pattern. System notification sounds do not pause other media; the in-app chime keeps the existing `ambient` audio session. |
| Scheduling | Client calls RPC `schedule_rest_push(endpoint, delay_ms, title, body)`; server computes `fire_at = now() + delay` (immune to device clock skew). One pending push per subscription; rescheduling replaces it. `cancel_rest_push(endpoint)` on skip/close/pause. |
| Dispatch | `pg_cron` job every 2 seconds runs `private.dispatch_due_rest_pushes()`, which only when due rows exist calls the `send-rest-push` Edge Function via `pg_net` with a shared secret read from Vault. |
| Sender | Edge Function `send-rest-push` (Deno) verifies the secret, claims due rows (`FOR UPDATE SKIP LOCKED`), sends Web Push, marks sent/failed, deletes subscriptions on 404/410. |
| Storage | `public.push_subscriptions` and `public.rest_push_schedules`, RLS-owned, no direct client writes; RPC-only. Not synced data: no sync contract change. |
| Client SW | Keep `generateSW`; add `public/push-sw.js` through `workbox.importScripts` (no new npm dependency) handling `push` and `notificationclick`. |
| Client state | Pause/resume/extend move from `RestTimerBar` local state into `restTimerSlice` so a lifecycle adapter (`useRestPush`) derives the desired push from the store. Permission/subscribe happens in a user gesture. |
| Scope | Signed-in users only (guests are local-only); iOS requires the PWA installed to the home screen (16.4+). |
| Dedupe | Notification `tag: 'rest-timer'`; when a window client is visible the SW shows a silent notification; when the page is hidden and a server push is armed the client skips the local beep. |

## Constraints

- Forward-only migration; regenerate `src/types/database.types.ts`; pgTAP for RLS/RPCs.
- No new npm dependency; Edge Function imports are Deno specifiers.
- Spanish UI copy, 48 px targets, Neon Bento tokens.
- No production deploy, push, or PR (human decisions). Production setup steps documented.
- Subagents run on GPT-6 Luna (user instruction).

## Tasks

- [x] `T1-db`: Migration (tables, RLS, RPCs, service-role claim/complete functions, pg_cron + pg_net dispatch, Vault secret lookup, cleanup), `config.toml` function entry, pgTAP, regenerated types, backend docs + ADR 0010. Route: delegated writer (multi-file, high risk).
- [ ] `T2-edge`: `supabase/functions/send-rest-push` with Deno tests, VAPID key script, CI Deno step, local end-to-end smoke (cron → function → mock endpoint), AGENTS/backend deploy docs. Route: delegated writer.
- [ ] `T3-store`: Move pause/resume/extend into `restTimerSlice` (+ sessionStorage), `RestTimerBar` consumes actions, tests. Route: delegated writer.
- [ ] `T4-client`: SW push handler, `src/services/push.ts`, pure plan helper, `useRestPush` adapter, enable CTA, foreground/background dedupe, `.env.example`, frontend docs, tests. Route: delegated writer.
- [ ] `T5-review`: Independent review (reviewer agent) + full checks.

## Acceptance criteria

- With a valid subscription, a scheduled push reaches the endpoint within ~3 s of `fire_at`; cancel/reschedule prevents stale pushes.
- Users cannot read/write other users' subscriptions or schedules; anon has no access; claim/complete are service-role only.
- Dispatch is a no-op (no HTTP call) without due rows or without Vault secrets.
- The notification shows with sound and `vibrate` pattern; the in-app chime stays `ambient`.
- Pause, resume, +30 s, skip, and close keep the server schedule consistent.
- `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:reset`, `pnpm db:test`, `pnpm db:lint`, `pnpm sync:contract:check`, Deno tests pass; types fresh.

## Delivery

Forecast exceeds 400 authored lines. Strategy: `ask-on-risk` resolved in autopilot as one feature branch `feat/rest-timer-push` with one work-unit commit per task, ready to split as a `feature-branch-chain` by commit if the human prefers.

## Progress and verification

- Exploration done (rest timer is timestamp-based; pause/extend component-local; `generateSW`; no pg_cron/pg_net/functions; audio already `ambient`).
- `T1-db` complete; route: delegated writer; risk tier: high.
- Verification:
  - `pnpm db:reset` — passed on the local Supabase stack; migration applied and config parsed without the not-yet-created function directory.
  - `pnpm db:test` — passed; all 8 pgTAP files and 175 assertions, including 51 rest-push assertions.
  - `pnpm db:lint` — passed; no schema errors.
  - `pnpm db:types` — passed; generated 58 additions and one deletion in `src/types/database.types.ts`.
  - `git diff --stat -- src/types/database.types.ts` — 59 changed lines.
  - `pnpm sync:contract:check` — passed; version 1, 12 synced tables unchanged.
  - `pnpm lint` — passed (`tsc --noEmit`).
  - `pnpm test` — passed; 25 files and 180 tests.
  - `pnpm build` — passed; only the existing >500 kB chunk warning.
  - `supabase db query --local "select private.dispatch_due_rest_pushes() is null as dispatch_is_noop"` — returned `true`.
  - Local cron query — found `dispatch-rest-pushes` (`2 seconds`) and `cleanup-rest-pushes` (`17 3 * * *`).
  - Local cleanup invocation — passed; PostgreSQL reports permission to delete old `cron.job_run_details`.
  - Initial work-unit commit: `896baf8` (this task evidence is included by amendment).

## Next step

`T2-edge`.
