# ADR 0008: Sync contract source and version

Record the client/server contract once, check its SQL mirror, and identify the wire shape sent by each client.

Last verified: 2026-10-13

## Status

Accepted — 2026-10-13

## Context

The sync contract used to be repeated across TypeScript and SQL: table names, writable columns, identities, ordering, and local-store mappings could drift. A deployed PWA can keep running an older bundle after a frontend release, so a breaking server change could reject or misinterpret its queued writes. The JSON backup format also has a `version` field, but that format evolves independently from sync.

## Decision

- Treat [`src/sync/contract.ts`](../../src/sync/contract.ts) as the client source of truth for the contract version, synced tables, writable columns, identities, foreign-key edges, and local-store mappings.
- Store the server's private allowlist and accepted client versions in `private.sync_contract_tables` and `private.sync_contract_versions`. `sync_push` reads the allowlist metadata.
- Compare the client manifest with SQL metadata using `pnpm sync:contract:check` in CI, and test that the metadata controls `sync_push`.
- Send `p_contract_version` on pushes. The server rejects unsupported versions with `sync_contract_version_unsupported` (`P0001`) before writing idempotency receipts. Until the legacy window is retired, a missing version (`NULL`) is accepted as version 1.
- Keep `src/utils/backup.ts`'s backup version independent; changing the sync contract does not by itself change the backup format.
- Apply database migrations before deploying the frontend. To retire legacy v1, add a forward migration that stops accepting NULL as v1 and marks version 1 unaccepted.

## Alternatives

| Alternative | Tradeoff |
|---|---|
| Read SQL metadata directly from the client | Avoids a TypeScript mirror but couples client behavior to database access and deployment details; it does not provide the typed client mappings needed by sync. |
| Generate the entire SQL function from TypeScript | Reduces hand-maintained overlap, but makes security-sensitive SQL generation harder to review and test. Keep SQL authored in migrations; parity-check the metadata instead. |

## Consequences

| Positive | Negative / cost |
|---|---|
| Typed client metadata and SQL metadata can be checked for drift in CI. | Contract changes touch a manifest and a forward migration, and require DB plus client tests. |
| A version gate gives stale PWAs a clear rejection path while preserving their outbox. | The legacy NULL-as-v1 grace period must eventually be retired deliberately. |
| Backup compatibility remains independent of sync rollout. | Deployments must apply the database migration before the frontend. |

## Evidence

- Commits: `41fb71d` client contract manifest; `55b1e35` SQL metadata, version gate, parity check, and client handling.
- Files: `src/sync/contract.ts`, `supabase/migrations/20261013183000_sync_contract_metadata_and_version.sql`, `supabase/tests/sync_contract.test.sql`, `scripts/check-sync-contract.mjs`, `.github/workflows/ci.yml`.

## Related

- [Frontend–backend sync strategy](../architecture/frontend-backend-strategy.md)
- [Backend architecture](../architecture/backend.md)
- [ADR 0004 – Revision-based outbox sync](0004-revision-based-outbox-sync.md)
- [Docs index](../README.md)
