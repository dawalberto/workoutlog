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
| Sender | Edge Function `send-rest-push` (Deno) verifies the secret, claims due rows (`FOR UPDATE SKIP LOCKED`), validates provider hosts and rechecks that each schedule remains `sending` before Web Push, marks sent/failed, and removes subscriptions for expired or rejected endpoints. |
| Storage | `public.push_subscriptions` and `public.rest_push_schedules`, RLS-owned, no direct client writes; RPC-only. Not synced data: no sync contract change. |
| Client SW | Keep `generateSW`; add `public/push-sw.js` through `workbox.importScripts` (no new npm dependency) handling `push` and `notificationclick`. |
| Client state | Pause/resume/extend move from `RestTimerBar` local state into `restTimerSlice` so a lifecycle adapter (`useRestPush`) derives the desired push from the store. Permission/subscribe happens in a user gesture. |
| Scope | Signed-in users only (guests are local-only); iOS requires the PWA installed to the home screen (16.4+). |
| Dedupe | Notification `tag: 'rest-timer'`; the SW reports the delivered schedule ID and the adapter records its receipt time/visibility; a hidden page falls back to local beep/vibration after about four seconds without matching delivery, or immediately when it becomes visible. |

## Constraints

- Forward-only migration; regenerate `src/types/database.types.ts`; pgTAP for RLS/RPCs.
- No new npm dependency; Edge Function imports are Deno specifiers.
- Spanish UI copy, 48 px targets, Neon Bento tokens.
- No production deploy, push, or PR (human decisions). Production setup steps documented.
- Subagents run on GPT-6 Luna (user instruction).

## Tasks

- [x] `T1-db`: Migration (tables, RLS, RPCs, service-role claim/complete functions, pg_cron + pg_net dispatch, Vault secret lookup, cleanup), `config.toml` function entry, pgTAP, regenerated types, backend docs + ADR 0010. Route: delegated writer (multi-file, high risk).
- [x] `T2-edge`: `supabase/functions/send-rest-push` with Deno tests, VAPID key script, CI Deno step, local end-to-end smoke (cron → function → delivery attempt), AGENTS/backend deploy docs. Route: delegated writer; risk tier: high.
- [x] `T3-store`: Move pause/resume/extend into `restTimerSlice` (+ sessionStorage), `RestTimerBar` consumes actions, tests. Route: delegated writer; risk tier: medium.
- [x] `T4-client`: SW push handler, `src/services/push.ts`, pure plan helper, `useRestPush` adapter, enable CTA, foreground/background dedupe, `.env.example`, frontend docs, tests. Route: delegated writer; risk tier: high.
- [x] `T5-review`: Independent review (reviewer agent) + full checks; review findings addressed in T6.
- [x] `T6-review-fixes`: Restrict Web Push endpoints in SQL and Edge Function, prevent silent local alert loss when delivery is unconfirmed, cancel claimed sends during reschedule/cancel, and raise rest timer control hitboxes to 48 px. Route: delegated writer; risk tier: high.

## Acceptance criteria

- With a valid subscription, a scheduled push reaches the endpoint within ~3 s of `fire_at`; cancel/reschedule prevents stale sends until provider handoff, which cannot be recalled.
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
- `T2-edge` complete; route: delegated writer; risk tier: high. Sender uses pinned `npm:web-push@3.6.7`, which ran under Deno 2 and passed a real RFC 8291 encrypt/decrypt test against a local TLS mock.
- Local smoke: `supabase functions serve send-rest-push --env-file supabase/functions/.env` served the handler; the database container reached it at `http://host.docker.internal:54321/functions/v1/send-rest-push`. `net._http_response` recorded HTTP 200 with `claimed=1`, `sent=0`, `failed=1`, `removed=0`, `rounds=1`; the synthetic schedule moved to `failed`, `attempts=1`, `last_error=delivery_failed` after the intentionally invalid `.invalid` push endpoint. The separate Deno TLS mock verified actual encryption and headers. Temporary Vault secrets, synthetic rows, and `.env` were removed.
- Verification:
  - `deno check --config supabase/functions/send-rest-push/deno.json supabase/functions/send-rest-push/index.ts` — passed.
  - `pnpm fn:test` — passed; 7 Deno tests, including RFC 8291 body decryption.
  - `pnpm push:vapid` — passed; generated values were redirected and not displayed.
  - `pnpm lint` — passed (`tsc --noEmit`).
  - `pnpm test` — passed; 25 files and 180 tests.
  - `pnpm build` — passed; only the existing >500 kB chunk warning.
  - `pnpm db:test` — passed; all 8 pgTAP files and 175 assertions.
  - `git diff --check` — passed; `AGENTS.md` remains within the 200-line limit.
  - `git check-ignore -v supabase/functions/.env` — confirmed the root `.gitignore` excludes the local function environment file.
  - Local smoke cleanup query — confirmed zero temporary Vault secrets, users, subscriptions, and schedules remain.
  - Documentation note: `docs/standards/testing-strategy.md` was not in the authorized edit surfaces; the new `pnpm fn:test` command is documented in onboarding, `AGENTS.md`, and CI/build instructions.
  - T2-edge initial work-unit commit before evidence amendment: `29a5fa4`.
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
- `T3-store` complete: `ActiveRestTimer` now persists paused time, pure timer helpers drive store actions, and `RestTimerBar` reads pause and remaining state from the store. Extension after finish starts a fresh countdown and resets `initialSeconds` and the progress denominator to the extension length; running and paused extensions preserve their prior `initialSeconds` behavior. Risk tier: medium.
- `T4-client` complete: the production Workbox worker imports the classic push handler; a browser-only API layer and serialized controller reconcile account subscriptions and timer schedules; an ephemeral store slice exposes support/permission/armed state; the timer prompt remains Spanish and local chime behavior stays on the existing `ambient` audio session. Risk tier: high.
- `T4-client` RED: `pnpm test tests/utils/restPush.test.ts tests/services/push.test.ts tests/services/rest-push-controller.test.ts` — failed as expected before implementation because the new utility and service modules did not yet exist.
- `T4-client` verification:
  - `pnpm test` — passed; 30 files and 202 tests.
  - `pnpm lint` — passed (`tsc --noEmit`).
  - `pnpm build` — passed; only the existing >500 kB chunk warning.
  - Build artifact check — passed; `dist/sw.js` imports `push-sw.js` and `dist/push-sw.js` exists.
  - `node --check public/push-sw.js` — passed.
  - `git diff --check` — passed.
  - `pnpm dev` — could not start because port 5173 was already in use. Static configuration check confirms `importScripts` is only in the build-time Workbox configuration; Vite's dev service worker remains a module worker.
  - Runtime boundary: real-device notification sound/vibration was not verified. `TODO(human): test an installed iOS PWA and Android browser using deployed push configuration.`
  - Initial work-unit commit before this evidence amendment: `fa10524`.
- `T3-store` verification:
  - RED: `pnpm test tests/utils/restTimer.test.ts tests/store/rest-timer-slice.test.ts` — failed as expected before implementation because timer helpers and store actions were missing.
  - Focused: `pnpm test tests/utils/restTimer.test.ts tests/store/rest-timer-slice.test.ts` — passed; 2 files and 10 tests.
  - `pnpm test` — passed; 26 files and 187 tests.
  - `pnpm lint` — passed (`tsc --noEmit`).
  - `pnpm build` — passed; only the existing >500 kB chunk warning.
  - `git diff --check` — passed.
  - Initial work-unit commit: `1bfeeb0` (this task evidence is included by amendment).
- `T5-review` complete: the independent review confirmed the endpoint SSRF, unconfirmed-delivery fallback, claimed-send cancellation race, and undersized timer controls. All findings were addressed in T6; an independent re-review returned no findings.
- `T6-review-fixes` complete; route: delegated writer; risk tier: high.
  - Database: new `20261014200000_harden_rest_push.sql` adds immutable provider-host validation, rejects unsafe endpoints at registration and table constraint, deletes invalid legacy subscriptions (cascading their schedules), cancels `pending` and `sending` rows on cancel/reschedule/transfer, and keeps completion conditional on `sending`.
  - Sender: the Edge Function mirrors the SQL host rules, rejects malformed URL backslashes/control characters, removes invalid endpoints, and rechecks `sending` immediately before delivery. The cached `web-push@3.6.7/src/web-push-lib.js` uses `https.request` and rejects non-2xx responses, so it does not follow redirects automatically.
  - Client: the serial controller exposes the returned schedule ID; the service-worker message adapter stores delivery ID, receive time, and visibility; hidden finish waits up to four seconds for matching delivery and falls back locally, including on earlier visibility resume or when an already-expired timer mounts. A matching notification already delivered while hidden suppresses duplicate local feedback; visible delivery remains paired with the local alert.
  - UI: +30 s, pause, skip, mini return/close, and full close timer controls have 48 px minimum hitboxes.
  - RED: focused client tests failed before implementation on the missing helper, schedule-ID callback, and transient delivery-state fields. Deno tests failed typechecking before implementation because the validator and test-only validator injection were missing.
  - Focused GREEN: `pnpm test tests/utils/restPush.test.ts tests/services/rest-push-controller.test.ts tests/store/rest-push-slice.test.ts` — passed; 3 files and 15 tests.
  - Database: `pnpm db:reset && pnpm db:test && pnpm db:lint` — passed locally; 8 pgTAP files and 190 assertions, including 66 rest-push assertions; no schema errors. An earlier pgTAP attempt exposed an owner mismatch in the new sending-cancel fixture; the fixture was corrected and the full command then passed.
  - `pnpm db:types` — passed after reset; no generated type diff because RPC signatures did not change.
  - `pnpm sync:contract:check` — passed; version 1 and 12 synced tables unchanged.
  - `pnpm fn:test` — passed; 10 Deno tests, including the cancellation preflight and RFC 8291 encryption/decryption.
  - `deno check supabase/functions/send-rest-push/index.ts` — failed because the project config was omitted (`ImportMeta.main` type unavailable); `deno check --config supabase/functions/send-rest-push/deno.json supabase/functions/send-rest-push/index.ts` — passed.
  - `pnpm test` — passed; 30 files and 205 tests.
  - `pnpm lint` — passed (`tsc --noEmit`).
  - `pnpm build` — passed; existing >500 kB chunk warning only.
  - Follow-up after mounting an already-expired timer into the fallback state: `pnpm test tests/utils/restPush.test.ts` — passed; 1 file and 9 tests; `pnpm lint` — passed; `pnpm build` — passed with the existing chunk warning.
  - `git diff --check && node --check public/push-sw.js` — passed.
  - Independent re-review — ready; no findings. Review agent could not run commands; all required commands were run by the writer.
  - Initial work-unit commit before evidence amendment: `7693f13`.

## Next step

Real-device notification sound, vibration, and delivery timing still need verification with deployed push configuration.
