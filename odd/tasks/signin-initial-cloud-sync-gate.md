# Sign-in initial cloud sync gate

Last verified: 2026-10-31

## Objective

Keep the `Cargando datos...` screen visible after sign-in until the first cloud sync pass for the signed-in owner settles, so the app stops unmounting the shell while network requests are still replacing the local (transferred guest) collections with the account's server data.

## Problem

1. `App.tsx` only waits for the owner scope to hydrate locally (`selectIsStorageReady`) and for `isSigningIn`. IndexedDB reads finish in milliseconds, so the shell mounts with the guest routines that `transferGuestDataToOwnerOnce` just copied into the owner scope.
2. `useSync` then starts the first pull/push cycle (`syncCloudData`), and `refreshFromStorage` replaces the visible collections when it finishes. The user watches the old routines until those requests complete.
3. There is no store signal that says "the first server pull for this owner has settled", so the readiness gate cannot or does not wait for it.

## Scope

In:
- Publish an owner-keyed "initial sync settled" marker from `useSync` through the sync slice.
- Extend the `App.tsx` readiness gate: while signed in and online, keep `Cargando datos...` until sync eligibility resolves and the first sync attempt for that owner settles.
- Reset the marker when the owner changes or becomes `null`, so a later sign-in with the same account waits again.
- Release the gate on offline, sync-disabled, or sync-error outcomes so local-first use is never blocked.
- Unit tests for the new gate and the marker lifecycle.

Out:
- Supabase schema, RLS, RPC, or sync-contract changes (`src/sync/contract.ts` is untouched).
- IndexedDB version bump or changes to the guest-to-owner transfer in `src/services/db.ts`.
- Changes to the cloud sync algorithm, conflict handling, or outbox semantics.
- A blocking error screen for failed sync; the existing store sync state remains the source of truth.

## Locked product decisions

| Topic | Decision |
|---|---|
| Gate condition | Signed in, online, storage hydrated, and (eligibility still loading or (sync enabled and the initial sync for this owner has not settled)). Guests and offline users never gate on cloud data. |
| Marker semantics | `initialSyncSettledOwnerId` is the owner whose first `useSync` pass has reached a terminal outcome: a successful sync, a sync error, an offline skip, or a skip because sync cannot run. It is not "data has arrived"; it is "the first attempt is over". |
| Failure/offline | Release the gate and show local data plus the existing sync feedback. Never hold an infinite loading screen when the server is unreachable. |
| Loading copy | Keep the existing `Cargando datos...` message; the loading screen is unchanged. |
| Migration | None. This is a client-only readiness change. |

## Constraints

- Zustand store stays the shared state; the marker is published by `useSync` with the rest of the sync snapshot.
- Spanish UI copy is unchanged; identifiers and comments stay English.
- Vitest node harness; synthetic fixtures only.

## Tasks

- [x] `T1-odd`: Create this task document and record the root cause.
- [x] `T2-sync-marker`: Add `initialSyncSettledOwnerId` to the sync slice and publish it from `useSync` on every terminal initial attempt, resetting on owner change.
- [x] `T3-app-gate`: Extend the `App.tsx` readiness gate with the signed-in/online/sync conditions.
- [x] `T4-tests`: Cover the gate and marker lifecycle with Vitest.
- [x] `T5-verify`: Run `pnpm test`, `pnpm lint`, and `pnpm build`.

## Acceptance criteria

- After sign-in, `Cargando datos...` stays visible until the first sync pass for the owner settles; the shell does not mount with the transferred guest routines.
- A successful sign-in shows the account's server routines directly, without an intermediate render of the pre-sign-in routines.
- Offline sign-in, sync-disabled accounts, and sync errors release the gate and keep local data usable.
- Signing out and back in with the same account gates again.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass; no `supabase/` diff.

## Progress and verification

- T1: Root cause recorded. Readiness only covered local owner-scope hydration and `isSigningIn`; nothing represented the first cloud pull per owner.
- T2 implementation: `useSync` now publishes `initialSyncSettledOwnerId`, settling on a successful pass (after `onSynced` refreshes the store), on a sync error, on `skipped`/no-client/no-session outcomes, and while offline; it resets to `null` when the owner becomes `null`.
- T2/T4 marker tests: `tests/sync-wiring.test.tsx` verifies the owner marker after a successful first pass and after a failed first pass, and that it clears to `null` when the owner is removed.
- T3 implementation: `App.tsx` keeps `Cargando datos...` while signed in and online until eligibility resolves and `selectIsInitialSyncSettled`; offline and sync-disabled states release the gate.
- T4 gate tests: `tests/app-shell.test.tsx` covers the pending marker, eligibility loading, offline/sync-disabled release, and the reset marker.
- Docs: updated [frontend architecture](../../docs/architecture/frontend.md) and [frontend–backend strategy](../../docs/architecture/frontend-backend-strategy.md).
- T5 verification: `pnpm test` passed (41 files, 291 tests); `pnpm lint` passed (`tsc --noEmit`); `pnpm build` passed with the expected >500 kB chunk-size warning. No `supabase/` diff.

## Relevant files

- `src/App.tsx` — readiness gate
- `src/hooks/useSync.ts` — sync lifecycle and snapshot publisher
- `src/store/slices/syncSlice.ts` — sync snapshot state
- `src/store/selectors.ts` — readiness selectors
- `tests/app-shell.test.tsx`, `tests/sync-wiring.test.tsx` — gate and sync-wiring coverage
