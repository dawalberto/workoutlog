# Google Analytics 4

Last verified: 2026-10-15

## Objective

Add a complete Google Analytics 4 integration: Consent Mode v2, SPA screen views, selected product events, a Spanish consent banner and a later preference change, without a new npm dependency and without syncing analytics data.

## Problem

The production PWA has no measurement. There is no way to see which screens and workout actions people use.

## Scope

In:

- Optional public `VITE_GA_MEASUREMENT_ID` (`G-…`). Missing or invalid ID → analytics is a no-op.
- Official `gtag.js` loaded at runtime (no analytics npm package).
- Google Consent Mode v2 in Advanced mode with denied defaults; events travel as cookieless pings when unconsented or rejected; full analytics storage granted only after user acceptance.
- Device-scoped IndexedDB consent that survives guest/owner cleanup (no IDB version bump, not in the sync contract).
- Consent banner plus a sidebar control to change the choice later.
- Virtual page views for `AppTab` changes; custom events for login, workout start/complete, PWA install, and backup export/import. No names, emails, user IDs, or workout text.
- Workbox `NetworkOnly` for Google tag endpoints.

Out:

- New npm dependencies.
- IndexedDB version bump, schema/RLS/RPC, or sync-contract changes.
- Advertising tags, user_id, or Google Signals.
- Push, PR, or merge.

## Locked product decisions

| Topic | Decision |
|---|---|
| Loader | Official gtag.js from googletagmanager.com. No `react-ga4` or similar. |
| Consent | Consent Mode v2 in Advanced mode. Required before `analytics_storage` is granted. Banner does not block using the app. Choice is persisted on-device. |
| Default | `analytics_storage` and all ad consents denied. Cookieless events sent for aggregate traffic modeling; ads consents stay denied even after accept. |
| Identity | Never send `user_id`, email, routine/exercise names, or diary text. Counts and durations only. |
| Config | Measurement ID is public (it ships in the bundle). Empty in local/CI unless set. |
| Storage | `device:` IndexedDB keys in the existing `app_state` store. Not scoped to guest/owner. |

## Constraints

- Spanish UI copy. English identifiers, comments, and this document.
- Components and feature hooks do not import `src/services/*`; analytics is a lifecycle adapter.
- Vitest node harness. Synthetic fixtures only.
- Conventional Commits. No AI attribution.

## Tasks

- [x] `T1-odd`: This task document.
- [x] `T2-core`: Measurement ID parsing, consent helpers, gtag adapter, device storage, store slice, lifecycle hook.
- [x] `T3-ui`: Consent banner and sidebar preference, Spanish copy, 48 px targets, safe area.
- [x] `T4-events`: SPA page views and product events, Workbox + env + deploy wiring, docs.

## Acceptance criteria

- Without a valid measurement ID the app never injects gtag and never shows the banner.
- With a valid ID, gtag loads with denied consent; unconsented and rejected events are sent as cookieless pings for Google modeling; accepting grants full analytics storage.
- Changing the sidebar preference updates Consent Mode and IndexedDB.
- Sign-out and guest cleanup do not reset the analytics choice.
- Tab changes send `page_view` with `/workoutlog/<tab>` paths.
- Workout complete events include duration and set counts, not names.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.

## Delivery

One feature branch `feature/analytics`. Commits are a human decision.

## Progress and verification

- Core adapter, Consent Mode v2 (Advanced mode), and device-scoped storage implemented with tests in `tests/services/analytics.test.ts`, `tests/utils/analytics.test.ts`, `tests/store/analytics-slice.test.ts`, and `tests/services/db.test.ts`.
- Spanish consent banner and sidebar preference control verified in `tests/analytics-consent-banner.test.tsx`.
- Workbox NetworkOnly runtime caching configured in `vite.config.ts`.
- `pnpm test`, `pnpm lint`, and `pnpm build` passing with zero errors.

## Next step

Ready for review and commit on `feature/analytics`.
