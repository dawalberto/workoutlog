---
name: workoutlog-offline-sync
description: "Trigger: offline sync, IndexedDB, browser storage, cloud sync. Preserve WorkoutLog's local-first persisted data behavior while implementing sync."
license: Apache-2.0
metadata:
  author: "dawalberto"
  version: "1.0"
---

## Activation Contract

Load for WorkoutLog storage, offline, import/export, or cloud-sync changes.

## Hard Rules

- Keep IndexedDB as the offline store for both tiers; Free is browser-only and Premium syncs all persisted collections.
- Preserve string IDs, snapshots, and nested routine exercises and sets.
- Hydrate before reactive writes; preserve localStorage migration and never overwrite unloaded data with defaults.
- Keep first-use exercises and routines private, editable user records; never add a shared seed catalog.
- Resolve conflicts by server acceptance/revision order, not device clocks. Sync tombstones to prevent stale-device resurrection.
- Premium expiry stops sync but retains cloud data. Preserve import merge/overwrite behavior and media URLs.

## Decision Gates

| Situation | Required behavior |
| --- | --- |
| Free/offline | Read and write locally without network access |
| Premium | Sync every persisted collection; keep IndexedDB usable offline |
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

- [IndexedDB service](../../src/services/db.ts)
- [Storage hook](../../src/hooks/useAppStorage.ts)
- [Record types](../../src/types.ts)
- [Backup import and export](../../src/utils/backup.ts)
