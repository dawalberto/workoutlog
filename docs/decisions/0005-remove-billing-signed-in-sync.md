# ADR 0005: Billing removed; every signed-in user syncs

Records the removal of Stripe billing and the rule that sign-in alone enables cloud sync.

Last verified: 2026-10-11

## Status

Accepted. Supersedes the earlier Premium/Stripe billing design (now historical).

## Context

- Billing previously existed: Stripe checkout, portal, webhooks, entitlement tables, and a Spanish plan catalog. Sync was a Premium feature.
- Billing objects lived in Supabase migrations from `20261007170000` to `20261009191000` and in a separate Fastify backend.

## Decision

- No billing: no Stripe client, plan UI, payment config, or billing DB surface.
- `20261010110000_remove_stripe_billing_add_sync_entitlement.sql` drops all billing objects and `public.user_entitlements`, and adds `public.get_sync_entitlement()` returning `{ eligible: true }` for any authenticated user.
- Signed in = sync enabled = unlimited routines. Guests keep a three-routine limit (`GUEST_ROUTINE_LIMIT`).

## Consequences

| Positive | Negative / cost |
|---|---|
| Much smaller surface (no webhooks, secrets, server) | — |
| Simpler onboarding: sign in to sync | `supabase/seed.sql` broke (references dropped table); seed disabled |
| | Old ODD docs (`odd/tasks/workoutlog-billing.md`, `workoutlog-account-premium.md`) describe removed behavior |

## Evidence

- Billing history: `ca3d7ef feat(billing): add Spanish plan catalog`, `b343998 feat(billing): connect authenticated Checkout returns`, `4831768 feat(billing): add self-service payment portal`
- `81ddbe0 feat(account): grant Premium access to signed-in users`
- `b624129 refactor: consolidate Supabase-only application`
- [`supabase/migrations/20261010110000_remove_stripe_billing_add_sync_entitlement.sql`](../../supabase/migrations/20261010110000_remove_stripe_billing_add_sync_entitlement.sql)
- Business reason for dropping billing: `TODO(human): confirm rationale.`

## Related

- [Backend – migration history](../architecture/backend.md#migration-history)
- [ADR 0002 – Supabase-only backend](0002-supabase-only-backend.md)
- [Glossary](../domain/glossary.md)
