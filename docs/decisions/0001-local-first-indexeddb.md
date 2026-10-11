# ADR 0001: Local-first storage in IndexedDB

Records why all app data is stored first in the browser's IndexedDB.

Last verified: 2026-10-11

## Status

Accepted.

## Context

- The app is used in gyms with unreliable connectivity and must work fully offline, for guests without any account.
- Data started in `localStorage` (single key-value blobs, size limits, no transactions).
- Sync later required per-record metadata and a durable outbox written atomically with state.

## Decision

- IndexedDB `WorkoutLogDB` (v2) is the primary store for all six collections, for guests and signed-in users alike.
- Stores: `app_state`, `record_metadata`, `sync_outbox`, `sync_cursors`; keys are prefixed by scope (`guest` / `owner:<userId>`).
- Legacy `localStorage` data is migrated on upgrade; state writes and outbox entries share one transaction.
- The network is optional: the server never blocks a local read or write.

## Consequences

| Positive | Negative / cost |
|---|---|
| Fully usable offline; instant UI | Data lives per browser profile; clearing site data loses unsynced guest data |
| Atomic state + outbox writes | `src/services/db.ts` is large (~1280 lines) and complex |
| Guests need no account | Tests need `fake-indexeddb` and module resets |

## Evidence

- `2d5045f refactor: migrate storage from localStorage to IndexedDB`
- `a4e29ea feat(storage): add scoped IndexedDB sync foundation`
- [`src/services/db.ts`](../../src/services/db.ts) lines 28–37, 197–220, ~281–350
- [`src/hooks/useAppStorage.ts`](../../src/hooks/useAppStorage.ts)
- Rationale beyond offline use: `TODO(human): confirm original motivation for leaving localStorage (size, structure, sync).`

## Related

- [Frontend–backend strategy](../architecture/frontend-backend-strategy.md)
- [ADR 0004 – Revision-based outbox sync](0004-revision-based-outbox-sync.md)
- [Offline sync skill](../../.github/skills/workoutlog-offline-sync/SKILL.md)
