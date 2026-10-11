# ADR 0004: Revision-based outbox sync

Records how local changes reach Supabase and how conflicts are resolved.

Last verified: 2026-10-11

## Status

Accepted.

## Context

- Users edit offline on multiple devices; device clocks are unreliable.
- Deletions must propagate without stale devices resurrecting records.
- Retries over flaky networks must not duplicate writes.

## Decision

- Every local write diffs collections and appends single-change operations to an IndexedDB outbox, in the same transaction as the state write.
- Writes go through one RPC, `public.sync_push(p_operation_id, p_changes)`, idempotent by `(user_id, operation_id)` + payload hash.
- A global server revision (`private.next_sync_revision()`) orders all accepted writes; **server acceptance order wins**, not timestamps.
- Deletes are tombstones (`deleted_at`); no DELETE policy.
- Pull per table by `server_revision > cursor`, 500 rows per page.
- Stale → full pull and retry; optional FK violations repaired with a fresh operation ID.

## Consequences

| Positive | Negative / cost |
|---|---|
| Deterministic conflict resolution; no clock skew issues | Contract duplicated across SQL and several TS files, unversioned |
| Safe retries (idempotency) | Tombstones grow forever (no cleanup job) |
| Offline edits never lost; errors keep the queue | Concurrent edits to the same record: last accepted write wins silently |

## Evidence

- Migrations `20261007135400_create_private_workout_data.sql`, `20261007150000_add_sync_push.sql`, latest `20261010111000_preserve_history_metrics_in_sync_push.sql`
- `a4e29ea feat(storage): add scoped IndexedDB sync foundation`, `5a0850c feat(sync): wire status and backup outbox`, `fe26ee2 fix(sync): dependency-order pending outbox operations`
- [`src/services/sync-queue.ts`](../../src/services/sync-queue.ts), [`src/services/cloud-sync.ts`](../../src/services/cloud-sync.ts)
- Alternatives considered (e.g. Realtime, CRDTs): `TODO(human): record alternatives evaluated, if any.`

## Related

- [Frontend–backend strategy](../architecture/frontend-backend-strategy.md)
- [Backend architecture](../architecture/backend.md)
- [ADR 0001 – Local-first IndexedDB](0001-local-first-indexeddb.md)
