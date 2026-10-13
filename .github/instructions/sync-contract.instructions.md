---
applyTo: "src/services/**,src/types/database.types.ts,src/utils/backup.ts,src/hooks/useSync.ts,src/hooks/useAppStorage.ts,src/hooks/useAuth.ts"
description: "Invariants for local persistence, the sync outbox, push/pull, auth, and backup in WorkoutLog."
---

# Sync contract instructions

These files implement half of a non-versioned contract whose other half is SQL in `supabase/migrations/`. Read [frontend–backend strategy](../../docs/architecture/frontend-backend-strategy.md) before editing. Load the [offline sync skill](../skills/workoutlog-offline-sync/SKILL.md); for new synced fields/tables load the [sync contract change skill](../skills/workoutlog-sync-contract-change/SKILL.md).

## Invariants

- One outbox entry = one operation = exactly one change. Entries are appended by diffing in `writeStoredItems` (`src/services/db.ts`) inside the same IndexedDB transaction as the state write. Never write state without its outbox entry.
- Revisions and cursors are decimal strings; compare them bigint-safely like `compareRevisions` in `src/services/cloud-sync.ts`, never with `Number()`.
- Conflicts resolve by server revision order, never device clocks. Deletes are tombstones (`deleted_at`).
- `orderSyncOperations` (`src/services/sync-queue.ts`): parent upserts before children, child deletes before parents. A new table needs its FK order here and its position in `SYNC_TABLES` (`src/services/cloud-sync.ts`, parent before child).
- `syncCloudData` pulls before pushing; unacknowledged changes stay in the outbox on every error path.
- Scopes: `guest` and `owner:<encodeURIComponent(userId)>`; guest data transfers to the owner once on sign-in. Guests never sync.
- Sync eligibility comes from `get_sync_entitlement` (`src/services/auth.ts`); every signed-in user is eligible and can sync.
- Retry policy: hard rejection for SQLSTATE classes `22`, `23`, `28`, `42`, `P0001`; FK `23503` goes through optional-reference repair with a fresh operation UUID.
- Backup import (`src/utils/backup.ts`) must keep accepting older shapes; `version` stays `1`.

## Anti-patterns

- Changing a field name/shape here without a matching migration and `sync_push` whitelist change.
- Hand-editing `src/types/database.types.ts`; regenerate it ([backend: type generation](../../docs/architecture/backend.md#type-generation)).
- Bumping the `WorkoutLogDB` version, clearing stores, or dropping outbox entries without asking first.
- Calling `client.from(table).insert/update` for user data; all writes go through `sync_push`.
- Logging tokens, keys, or user records.

## Verify

`pnpm test tests/services/` plus `pnpm lint`. Contract changes also need pgTAP: `pnpm db:reset && pnpm db:test && pnpm db:lint` (requires `supabase start`).
