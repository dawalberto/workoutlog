---
name: workoutlog-sync-contract-change
description: "Trigger: new synced table, new synced column, sync_push change, sync contract, outbox shape. Change WorkoutLog's SQL and TypeScript sync contract together."
license: Apache-2.0
metadata:
  author: "dawalberto"
  version: "1.1"
---

Last verified: 2026-10-13

## Activation Contract

Load when adding, altering, or removing anything that travels through `sync_push` or the pull: a synced table, column, identity, FK relationship, or validation. Use the [frontend–backend strategy](../../../docs/architecture/frontend-backend-strategy.md#checklist-add-a-synced-field-or-table) for detail.

## Hard Rules

- Use `src/sync/contract.ts` as the client source of truth. Private SQL metadata drives the server whitelist; `pnpm sync:contract:check` verifies parity.
- Ask the maintainer first; contract changes are substantial — create `odd/tasks/<feature>.md`.
- Preserve compatibility for every accepted client version: prefer nullable/defaulted additions, and bump the contract version plus acceptance metadata for wire-shape changes. Rejected clients keep their outbox; backup import must accept old shapes.
- Keep backup format versioning independent from sync contract versioning; continue accepting existing backup shapes.
- Rollout order: production migration first, frontend deploy second. Service worker `autoUpdate` means old bundles keep pushing the old shape for a while.
- Keep invariants from `workoutlog-offline-sync`: outbox entry in the same transaction as the state write, server revision order, tombstones.

## Checklist

1. [ ] Edit `src/sync/contract.ts`; derive shared table and column lists from the manifest.
2. [ ] Add a forward migration that updates private contract metadata and schema as needed. Change `sync_push` only if its semantics must change.
3. [ ] Start local Supabase and run `pnpm db:reset && pnpm db:test && pnpm db:types && pnpm sync:contract:check`.
4. [ ] If the wire shape changes, bump `SYNC_CONTRACT_VERSION` and update accepted versions in the migration metadata; rerun parity checks.
5. [ ] Add/update pgTAP and Vitest coverage; run `pnpm test && pnpm lint && pnpm build`.
6. [ ] Deploy the database migration before the frontend. Preserve old clients' outboxes during the v1 grace window.

## Output Contract

Report the checklist with each item checked or explained, compatibility analysis (old client × new server, new client × old server), rollout order, commands with observed results, and `TODO(human)` items.

## References

- [Frontend–backend strategy](../../../docs/architecture/frontend-backend-strategy.md)
- [ADR 0008 – Sync contract source and version](../../../docs/decisions/0008-sync-contract-source-and-version.md)
- [ADR 0004 – Revision-based outbox sync](../../../docs/decisions/0004-revision-based-outbox-sync.md)
- [Offline sync skill](../workoutlog-offline-sync/SKILL.md)
- [Supabase migration skill](../workoutlog-supabase-migration/SKILL.md)
- [Testing skill](../workoutlog-testing/SKILL.md)
