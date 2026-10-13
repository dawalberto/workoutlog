---
applyTo: "src/sync/**,src/services/**,src/types/database.types.ts,src/utils/backup.ts,src/hooks/useSync.ts,src/hooks/useAppStorage.ts,src/hooks/useAuth.ts,supabase/migrations/**,supabase/tests/**,scripts/check-sync-contract.mjs"
description: "Invariants for local persistence, the sync outbox, push/pull, auth, and backup in WorkoutLog."
---

# Sync contract instructions

Last verified: 2026-10-13

Use [`src/sync/contract.ts`](../../src/sync/contract.ts) as the client source of truth. Private SQL metadata drives the server whitelist; `pnpm sync:contract:check` verifies parity. Read [frontend–backend strategy](../../docs/architecture/frontend-backend-strategy.md) before editing. Load the [offline sync skill](../skills/workoutlog-offline-sync/SKILL.md); for contract changes load the [sync contract change skill](../skills/workoutlog-sync-contract-change/SKILL.md).

## Invariants

- One outbox entry = one operation = exactly one change. Entries are appended by diffing in `writeStoredItems` (`src/services/db.ts`) inside the same IndexedDB transaction as the state write. Never write state without its outbox entry.
- Revisions and cursors are decimal strings; compare them bigint-safely like `compareRevisions` in `src/services/cloud-sync.ts`, never with `Number()`.
- Conflicts resolve by server revision order, never device clocks. Deletes are tombstones (`deleted_at`).
- Derive shared synced table and column lists from `src/sync/contract.ts`; do not hard-code duplicate lists. A new table needs its FK edge and order in the manifest.
- `syncCloudData` pulls before pushing; unacknowledged changes stay in the outbox on every error path.
- Scopes: `guest` and `owner:<encodeURIComponent(userId)>`; guest data transfers to the owner once on sign-in. Guests never sync.
- Sync eligibility comes from `get_sync_entitlement` (`src/services/auth.ts`); every signed-in user is eligible and can sync.
- Retry policy: hard rejection for SQLSTATE classes `22`, `23`, `28`, `42`, `P0001`; FK `23503` goes through optional-reference repair with a fresh operation UUID.
- Backup import (`src/utils/backup.ts`) must keep accepting older shapes; `version` stays `1`.
- `SYNC_CONTRACT_VERSION` identifies the sync wire shape; it is independent of the backup version. A missing RPC version is accepted as legacy v1 for now.
- Keep the outbox intact on an unsupported-version error. Deploy the database migration before the frontend.

## Anti-patterns

- Changing a field name/shape here without a matching migration and `sync_push` whitelist change.
- Hand-editing `src/types/database.types.ts`; regenerate it ([backend: type generation](../../docs/architecture/backend.md#type-generation)).
- Bumping the `WorkoutLogDB` version, clearing stores, or dropping outbox entries without asking first.
- Calling `client.from(table).insert/update` for user data; all writes go through `sync_push`.
- Logging tokens, keys, or user records.

## Verify

`pnpm test tests/services/` plus `pnpm lint`. Contract changes also need `pnpm db:reset && pnpm db:test && pnpm db:types && pnpm sync:contract:check` (requires `supabase start`), plus `pnpm test` and `pnpm build`.

See [ADR 0008](../../docs/decisions/0008-sync-contract-source-and-version.md).
