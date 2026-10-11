# ADR 0002: Supabase is the only backend

Records why WorkoutLog has no custom server and relies solely on Supabase.

Last verified: 2026-10-11

## Status

Accepted.

## Context

- A separate Fastify backend with billing integration existed during development, outside this repository (described in historical ODD docs such as [`odd/tasks/workoutlog-billing.md`](../../odd/tasks/workoutlog-billing.md)).
- The active feature set (auth + private data sync) can be expressed with Supabase Auth, Postgres RLS, and RPCs.
- A server adds hosting, deployment, and secret-management cost for a single maintainer.

## Decision

- No dedicated backend, VPS, Docker deployment, or Edge Function. The browser talks to Supabase directly with `supabase-js`.
- Server-side rules live in SQL: RLS policies, the `set_workout_sync_metadata` trigger, `sync_push` (SECURITY DEFINER), `get_sync_entitlement` (SECURITY INVOKER).
- Schema changes ship as forward-only migrations in `supabase/migrations/`.

## Consequences

| Positive | Negative / cost |
|---|---|
| Nothing to host besides static files | Business logic in PL/pgSQL is harder to test and review |
| RLS gives per-user isolation by default | Contract is duplicated between SQL and TypeScript |
| Free tier is sufficient today | Free projects can pause; no background jobs or push notifications without adding Edge Functions |

## Evidence

- `b624129 refactor: consolidate Supabase-only application` (removed `src/services/billing.ts`, `src/config/features.ts`, `src/components/BillingPlansModal.tsx`, `tests/billing.test.tsx`; added the billing-removal migration)
- [`README.md`](../../README.md) "No dedicated backend", "No Edge Function today"
- [`supabase/tests/supabase_only.test.sql`](../../supabase/tests/supabase_only.test.sql)
- Decision driver (cost vs. simplicity): `TODO(human): confirm rationale for removing the Fastify backend.`

## Related

- [Backend architecture](../architecture/backend.md)
- [ADR 0005 – Remove billing](0005-remove-billing-signed-in-sync.md)
- [Docs index](../README.md)
