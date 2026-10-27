# Fix Auth Double-Hydration Visual Flicker

Last verified: 2026-10-27

## Objective

Eliminate the visual flicker/loading glitch that occurs after sign-in or after session resumption (access token refresh), where the application briefly displays the routines view before momentarily flashing the loading screen ("Cargando datos...") and unmounting/remounting the view.

## Problem

1. In `useAppBootstrap.ts`, `useStorageLifecycle` was passed `account.isSyncEnabled` as `transferGuestData`. During initial authentication or token refresh, `account.isSyncEnabled` starts as `false` while the asynchronous Supabase RPC `get_sync_entitlement` is in-flight.
2. Because `account.isLoading` was already `false`, `useStorageLifecycle` immediately triggered `hydrateStorage(appStore, ownerId, false)`. Local IndexedDB reads completed in milliseconds, marking `isStorageLoaded = true` and causing `App.tsx` to render `AppShell`.
3. When `loadSyncEligibility` resolved 150–400ms later, `account.isSyncEnabled` flipped to `true`. This changed the dependencies of `useStorageLifecycle` (`[authResolved, ownerId, transferGuestData]`), triggering a second call to `hydrateStorage(appStore, ownerId, true)`.
4. `hydrateStorage` synchronously reset `isStorageLoaded = false` and cleared store collections, causing `App.tsx` to unmount `AppShell`, flash `AppLoadingScreen`, and remount `AppShell` once IndexedDB re-read the data.
5. In `useAuth.ts`, `sessionKey` was constructed as `${session.user.id}:${session.access_token}`. When Supabase auto-refreshed expired JWT tokens (e.g., after an hour), `session.access_token` changed, causing `handleSession` to treat it as a new session, resetting `isSyncEnabled = false` and triggering the entire double-hydration cycle again.

## Scope

In:
- Decouple `transferGuestData` in `useAppBootstrap.ts` and `useStorageLifecycle.ts` from `account.isSyncEnabled`, using `Boolean(account.user?.id)` / `Boolean(ownerId)` instead, as guest data transfer to owner scope is a one-time local IndexedDB operation that applies to all authenticated owners.
- Key `sessionKey` in `useAuth.ts` by user identity (`session.user.id`) rather than the ephemeral `access_token`, preventing background JWT refreshes from resetting sync state and re-triggering auth cascades.
- Add unit tests verifying:
  - Token refresh (`TOKEN_REFRESHED`) for the same user preserves sync eligibility and does not reset state.
  - Storage hydration for an authenticated owner is not re-triggered when `isSyncEnabled` resolves after initial load.
- Full verification: `pnpm test`, `pnpm lint`, `pnpm build`.

Out:
- Changes to Supabase RPCs, database schema, or migrations.
- Changes to sync wire contract (`src/sync/contract.ts`).
- Altering the one-time guest-to-owner transfer logic in `src/services/db.ts`.

## Tasks

- [x] `T1-odd`: Create task document and document root cause.
- [x] `T2-auth-session-key`: Update `sessionKey` in `useAuth.ts` to track user identity rather than access token, and add unit test for token refresh.
- [x] `T3-decouple-storage-lifecycle`: Update `useAppBootstrap.ts` and `useStorageLifecycle.ts` to decouple guest transfer from `isSyncEnabled`, avoiding secondary hydration triggers, and add test.
- [x] `T4-verify`: Run test suite, linter, and production build to confirm zero regressions.

## Acceptance Criteria

- Signing in or resuming an active session performs a single smooth hydration transition without an intermediate unmount or flicker.
- Supabase token refresh does not reset `isSyncEnabled` or cause state flapping.
- All unit, integration, and build checks pass (`pnpm test`, `pnpm lint`, `pnpm build`).
