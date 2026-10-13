---
name: workoutlog-sync-contract-change
description: "Trigger: new synced table, new synced column, sync_push change, sync contract, outbox shape. Change WorkoutLog's SQL and TypeScript sync contract together."
license: Apache-2.0
metadata:
  author: "dawalberto"
  version: "1.0"
---

## Activation Contract

Load when adding, altering, or removing anything that travels through `sync_push` or the pull: a synced table, a column, identity keys, FK relationships, or validation. The full checklist lives in [frontend–backend strategy](../../../docs/architecture/frontend-backend-strategy.md#checklist-add-a-synced-field-or-table); follow it, this skill only orders it.

## Hard Rules

- The contract is not versioned and is duplicated across SQL and TypeScript. Change every [duplicated location](../../../docs/architecture/frontend-backend-strategy.md#where-the-contract-is-duplicated) in one work unit/PR.
- Ask the maintainer first; contract changes are substantial — create `odd/tasks/<feature>.md`.
- Backward compatible only: new columns nullable/defaulted; never remove or rename a field a deployed PWA sends; keep old `sync_push` behavior for existing fields; backup import accepts old shapes.
- Rollout order: production migration first, frontend deploy second. Service worker `autoUpdate` means old bundles keep pushing the old shape for a while.
- Keep invariants from `workoutlog-offline-sync`: outbox entry in the same transaction as the state write, server revision order, tombstones.

## Execution Steps

1. [ ] Migration: column/table with sync metadata, trigger, RLS, and least-privilege grants (`workoutlog-supabase-migration`); synced-table client writes remain exclusive to `sync_push`, with `SELECT` retained for pulls.
2. [ ] Migration: `CREATE OR REPLACE public.sync_push` copied from the latest definition, extending whitelist/columns/FK checks.
3. [ ] pgTAP for RLS and `sync_push` acceptance/rejection.
4. [ ] Regenerate `src/types/database.types.ts`.
5. [ ] `src/services/sync-queue.ts`: `SyncTable`, collection, diff, record id, FK order, optional references, `applyRemoteSyncChange`.
6. [ ] `src/services/cloud-sync.ts`: `SYNC_TABLES` (parent before child), remote validation.
7. [ ] `src/services/db.ts`: collection mapping, hydration, metadata.
8. [ ] `src/types.ts`, hooks, `App.tsx` state.
9. [ ] `src/utils/backup.ts`: export/import sanitization tolerant of old backups.
10. [ ] Vitest: `tests/services/{sync-queue,cloud-sync,db}.test.ts`, `tests/utils/backup.test.ts`.
11. [ ] Docs: strategy doc, [backend](../../../docs/architecture/backend.md), [glossary](../../../docs/domain/glossary.md), README if user-visible.

## Verification

- `pnpm test && pnpm lint && pnpm build`
- `supabase start`, then `pnpm db:reset && pnpm db:test && pnpm db:lint`

## Output Contract

Report the checklist with each item checked or explained, compatibility analysis (old client × new server, new client × old server), rollout order, commands with observed results, and `TODO(human)` items.

## References

- [Frontend–backend strategy](../../../docs/architecture/frontend-backend-strategy.md)
- [ADR 0004 – Revision-based outbox sync](../../../docs/decisions/0004-revision-based-outbox-sync.md)
- [Offline sync skill](../workoutlog-offline-sync/SKILL.md)
- [Supabase migration skill](../workoutlog-supabase-migration/SKILL.md)
- [Testing skill](../workoutlog-testing/SKILL.md)
