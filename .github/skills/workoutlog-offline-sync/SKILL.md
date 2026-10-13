---
name: workoutlog-offline-sync
description: "Trigger: offline sync, IndexedDB, browser storage, cloud sync. Preserve WorkoutLog's local-first persisted data behavior while implementing sync."
license: Apache-2.0
metadata:
  author: "dawalberto"
  version: "1.1"
---

## Activation Contract

Load for WorkoutLog storage, offline, import/export, or cloud-sync changes.

## Hard Rules

- Keep IndexedDB as the offline store for everyone. Guests are local-only (scope `guest`, limited to `GUEST_ROUTINE_LIMIT` routines); signed-in users sync all persisted collections because `get_sync_entitlement` returns `{ eligible: true }`.
- Preserve string IDs, snapshots, and nested routine exercises and sets.
- Hydrate before reactive writes; preserve localStorage migration and never overwrite unloaded data with defaults.
- Keep first-use exercises and routines private, editable user records; never add a shared seed catalog.
- See the [backend seed guide](../../../docs/architecture/backend.md#seed-and-first-run-starter-data) for how first-run data differs from the local database fixture.
- Append outbox entries in the same IndexedDB transaction as the state write (`writeStoredItems` in `db.ts`); one entry holds exactly one change. Never drop unacknowledged entries.
- Resolve conflicts by server acceptance/revision order, not device clocks: `sync_push` rejects stale bases (missing row with base ≠ 0, base newer than server, upsert over a tombstone); the client pulls and retries. Sync tombstones to prevent stale-device resurrection.
- Losing sync (sign-out, offline, paused Supabase project) must never delete cloud or local data. Preserve import merge/overwrite behavior and media URLs.
- Any new synced field or table is a contract change: load `workoutlog-sync-contract-change`.

## Decision Gates

| Situation | Required behavior |
| --- | --- |
| Guest/offline | Read and write locally without network access |
| Signed in | Sync every persisted collection; keep IndexedDB usable offline |
| Conflict/deletion | Apply server revisions and retain tombstones |
| Storage change | Migrate without losing IDs or nested records |

## Execution Steps

1. Inspect local storage keys, hydration, record types, and backup behavior before persistence changes.
2. Include routines, catalog, active sessions, RM logs, workout history, and exercise diary in sync or migration.
3. Preserve offline edits; reconcile on reconnect with server revisions and tombstones.
4. Verify reload, migration, import, and relevant conflict/deletion behavior.

## Output Contract

Summarize affected collections, identity/offline behavior, migration, conflict handling, and verification. Name anything left unsynchronized.

## References

- [IndexedDB service](../../../src/services/db.ts)
- [Storage hook](../../../src/hooks/useAppStorage.ts)
- [Record types](../../../src/types.ts)
- [Backup import and export](../../../src/utils/backup.ts)
- [Frontend–backend strategy (sync contract)](../../../docs/architecture/frontend-backend-strategy.md)
- [Sync contract change skill](../workoutlog-sync-contract-change/SKILL.md)
