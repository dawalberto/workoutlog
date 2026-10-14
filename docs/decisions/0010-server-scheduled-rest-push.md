# ADR 0010: Server-Scheduled Rest Timer Push Notifications

Decision record for notifying signed-in users when a rest timer expires while the PWA is suspended.

Last verified: 2026-10-14

## Status

Accepted

## Context

The rest timer's beep and vibration run in page JavaScript. Mobile browsers may suspend that code when the PWA is backgrounded or the device is locked, so client-only feedback cannot reliably fire at the timer deadline. The Notification Triggers API is not a viable scheduling platform, and a service worker cannot be relied on to run a timer while suspended.

## Decision

Use standard Web Push for rest timer completion. Signed-in clients register subscriptions through authenticated RPCs and schedule a server-side `fire_at` timestamp. `pg_cron` polls every two seconds and invokes the `send-rest-push` Edge Function through `pg_net` only when a schedule is due. The function claims work with `FOR UPDATE SKIP LOCKED`, sends VAPID Web Push, and records the result through service-role-only RPCs.

The database stores subscriptions and schedules in owner-scoped public tables protected by RLS. Client writes go through `SECURITY DEFINER` RPCs; these tables are not part of the synced-data contract. The dispatcher URL and shared request secret are stored in Vault as `rest_push_function_url` and `rest_push_dispatch_secret`.

## Consequences

| Positive | Negative / cost |
|---|---|
| Server scheduling can deliver a system notification while page JavaScript is suspended. | Push is available only to signed-in users with an active subscription. |
| The server calculates the deadline, avoiding device clock skew. | The two-second polling cadence adds up to about two seconds of dispatch latency. |
| The OS notification can make sound and vibrate without pausing other media. | On iOS, users must install the PWA to the Home Screen and use a supported OS version. |
| Supabase Postgres and an Edge Function avoid a custom server or external scheduler. | `pg_cron`, `pg_net`, the Edge Function, and both Vault secrets must be configured; VAPID keys and endpoint failures need operational handling. |

## Alternatives

- **Notification Triggers API**: not viable; the API is no longer a dependable browser feature.
- **Client or service-worker timers**: background pages and workers can be suspended, so timers are not reliable for locked-device delivery.
- **External cron service**: adds an external scheduler and credentials when Supabase already provides `pg_cron` and `pg_net`.

## Evidence

- Files: `supabase/migrations/20261014171406_rest_timer_push.sql`, `supabase/tests/rest_push.test.sql`, `supabase/config.toml`
- Follow-up: the `send-rest-push` Edge Function implementation is delivered in the next work unit.

## Related

- [Backend architecture](../architecture/backend.md)
- [ADR 0002 – Supabase-only backend](0002-supabase-only-backend.md)
- [Docs index](../README.md)
