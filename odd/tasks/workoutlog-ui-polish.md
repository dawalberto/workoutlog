# WorkoutLog UI polish task document

## Objective

Polish the existing neon/bento frontend UX: remove the unwanted sync banner, show truthful connectivity state, clarify the active Premium plan and verified benefits, add a Premium diamond badge, and avoid persisting set edits for every typed character.

## Problem and rationale

The app currently spends header space on sync status that the user does not want, displays a static offline footer while online, does not identify the active paid plan, undersells verified Premium capabilities, and persists weight/repetition drafts while the user is still typing. These changes must retain authentication, offline-first local storage, sync correctness, and the existing visual language.

## Scope and constraints

- Frontend: `feature/workoutlog-offline-sync`.
- Backend changes are in scope as needed to expose exact active-plan metadata and construct Checkout return URLs that honor the frontend deployment base path; do not infer monthly versus annual from entitlement expiry.
- User authorization: “haz todo lo que necesites” explicitly covers the backend changes required for these UI tasks, including `back-workoutlog/src/plugins/supabase-client.ts`.
- Preserve the dark neon/bento styling (`#0D0D0D`, `#00FF87`, rounded cards, restrained glow, translucent borders) and mobile behavior.
- Market only verified benefits: Free is limited to three routines; Premium bypasses that cap and enables cloud sync. Offline local storage and backup behavior are not Premium-exclusive and must not be advertised as such.
- Remove only the redundant header banner; preserve authentication, entitlement state, sync scheduling, retry, and local-first behavior.
- Save directly edited routine set fields on blur, keeping an internal draft while typing. Do not change forms that already use an explicit Save action or picker-confirm flow.
- Preserve all pre-existing untracked files and CodeGraph artifacts. No Stripe, other remote operations, push, PR, deployment, or `main` changes.

## Delivery

- Route: delegated direct; one bounded writer owns the multi-file frontend/backend changes and their tests.
- Delivery strategy: `auto-chain` with the previously selected `stacked-to-main` PR strategy. No PR or push will be created.
- Forecast: approximately 650 authored changed lines across the four behavior units; split by behavior and report actual sizes.
- Frontend RDD is enabled by default; backend RDD is clone-local off. Do not start or toggle native review; the user previously chose to leave frontend candidates unreviewed.

## Tasks

- [x] `header-connectivity-polish`: Remove the prominent header sync banner, make the sidebar footer connectivity label reflect the actual online state, and add a Premium-only diamond icon to the header badge.
- [x] `premium-plan-clarity`: Show an active badge only for plan(s) identified by trustworthy entitlement metadata; add compelling but verified plan benefits. Extend the backend entitlement response/storage only as needed to expose plan IDs accurately.
- [x] `blur-save-set-fields`: Keep reps/weight drafts local while editing and persist the normalized value on blur, avoiding per-keystroke backend sync; retain existing explicit-save and picker behavior.
- [x] `checkout-return-base-path`: Generate and recognize Stripe success/cancel routes with the configured Vite base path so GitHub Pages returns do not land on a blank page.

## Acceptance criteria and checks

- The header no longer renders the large sync status row; removing it does not disable sync or account actions.
- The sidebar footer does not claim the app is offline while online; state is derived from the existing connectivity source.
- Active Premium plans are marked accurately; no plan is inferred from `validUntil` or tier alone.
- Paid-plan copy advertises only verified features and does not imply Premium-exclusive offline access or backup.
- The Premium header badge shows a diamond before its label only when active; Free presentation is unchanged.
- Reps/weight typing updates only local draft state; blur commits the normalized value once. Existing save-button forms and picker confirmation remain unchanged.
- Stripe return URLs and frontend return-state parsing include `/workoutlog/` when Vite is built with that base, while local root deployments remain valid.
- Focused frontend/backend tests, full tests, lint, typecheck, and builds pass; SQL/pgtap runs if backend schema changes.

## Progress and verification

- Initial worktree checks showed only the known untracked local files; they must remain untouched.
- Frontend CodeGraph is up to date (753 nodes); frontend RDD status is `on`. Backend RDD status remains clone-local `off`.
- Read-only mapping located the banner in `src/components/AppHeader.tsx`, static footer in `src/components/SidebarMenu.tsx`, plan cards in `src/components/BillingPlansModal.tsx`, and per-keystroke set updates in `src/components/ExerciseCard.tsx`.
- `header-connectivity-polish` completed: AppHeader no longer renders SyncStatus, while App keeps `useSync` active and passes its existing `isOnline` state to the sidebar footer. The footer now distinguishes “En línea” from “Sin conexión”; the Premium badge renders a diamond only while active. `tests/billing.test.tsx` verifies banner removal, sidebar online/offline labels, and the Premium-only icon.
- Header task test-first evidence: before implementation, `pnpm test -- tests/billing.test.tsx` failed 4 tests for the absent header/footer behavior. After implementation, `pnpm test -- tests/billing.test.tsx tests/sync-wiring.test.tsx` passed 75 tests across 8 files; `pnpm lint` passed.
- Header task rollback boundary: revert only the header/sidebar prop and rendering changes in `src/App.tsx`, `src/components/AppHeader.tsx`, `src/components/SidebarMenu.tsx`, and the matching assertions in `tests/billing.test.tsx`; this does not alter sync scheduling or the `SyncStatus` component.
- Header task work-unit commit identity: `e9433a1`.
- `premium-plan-clarity` complete: Stripe subscription metadata and lifetime sources persist validated `monthly`, `annual`, or `lifetime` plan IDs in private entitlement sources. The owner-scoped entitlement RPC returns only currently active IDs, dynamically excluding expired or inactive sources; legacy/manual Premium without provider metadata returns an empty list. The UI marks only returned plans and shows generic feedback when no plan is known.
- Premium task verification: frontend `pnpm test -- tests/auth.test.ts tests/billing.test.tsx` passed (8 files, 78 tests) and `pnpm lint` passed. Backend `pnpm test -- tests/auth.test.ts tests/billing.test.ts tests/stripe-webhook.test.ts` passed (12 files, 86 tests), `pnpm typecheck` passed, and `supabase test db --local supabase/tests/billing.test.sql` passed (92 pgTAP tests). Backend Node 22 emitted the existing Node >=24 engine warning.
- Premium task rollback boundary: backend plan metadata migration, its pgTAP assertions, and the account/webhook/billing persistence changes in `back-workoutlog`; frontend plan metadata parsing, modal badges/benefits, and their tests in `workoutlog`. The existing header work and unrelated local files are outside this boundary.
- Premium backend work-unit commit: `8d24c54` (`feat(billing): persist trusted active plan metadata`).
- Premium frontend work-unit commit: `be4eec8` (`feat(ui): clarify active Premium plans and benefits`).
- Premium runtime boundary: local pgTAP exercised the database/RPC contract; Stripe calls remained mocked, with no remote Stripe runtime used.
- User authorization covers `back-workoutlog/src/plugins/supabase-client.ts` and other necessary backend changes, as recorded above.
- `blur-save-set-fields` complete: reps and weight use component-local drafts; validation and normalized values commit on blur only when the value changes, and positive changed weights retain their RM check. The picker and explicit-save forms were not modified.
- Blur-save test-first evidence: `pnpm exec vitest run tests/exercise-card.test.tsx` initially failed all 4 regressions because typing called the parent updater; after implementation it passed (1 file, 4 tests). `pnpm lint` passed.
- Blur-save rollback boundary: revert only `src/components/ExerciseCard.tsx` draft/blur handling and `tests/exercise-card.test.tsx`; time-picker behavior and parent storage wiring remain untouched.
- Blur-save runtime boundary: N/A; this is an input-component interaction exercised through focused Vitest callbacks, with persistence remaining behind the existing parent updater.
- Blur-save work-unit commit: `d835127` (`fix(ui): persist set edits on blur`).
- The user reported Checkout success returned to `/billing/success` without the GitHub Pages `/workoutlog/` base, producing a blank page. Added regression coverage for both the configured deployment base and local root mode.
- Frontend CodeGraph exact-symbol queries mapped the edit targets; the backend index had zero nodes, so the billing/account flow was mapped through narrow local source reads.
- `checkout-return-base-path` complete: backend Checkout success/cancel and Billing Portal URLs use a securely validated `BILLING_FRONTEND_BASE_PATH` (default `/`); frontend return detection and cleanup use Vite's `import.meta.env.BASE_URL`. `/workoutlog/` builds and root/local paths are both covered. Configure `BILLING_FRONTEND_BASE_PATH=/workoutlog/` for GitHub Pages; leave it unset or `/` for root hosting, and set it to `/workoutlog/` for subpath local development.
- Checkout test-first evidence: frontend `pnpm exec vitest run tests/services/billing.test.ts` first failed 3 base-path cases, then passed (1 file, 17 tests). Backend `pnpm exec vitest run tests/billing.test.ts` first failed 13 cases; after implementation `pnpm exec vitest run tests/billing.test.ts tests/config/env.test.ts` passed (2 files, 32 tests).
- Checkout rollback boundary: backend `src/config/env.ts`, `src/plugins/stripe.ts`, `src/routes/billing.ts`, and billing/config tests; frontend `src/services/billing.ts` and `tests/services/billing.test.ts`. The existing entitlement refresh, session ID cleanup, and no-payment-proof return message remain unchanged.
- Checkout runtime boundary: local Fastify injection tests used mocked Stripe clients; no external Stripe operation or deployment was performed.
- Checkout backend and frontend work-unit commit identities will be recorded after their commits.
- Full verification: frontend `pnpm test` passed (9 files, 85 tests), `pnpm lint` passed, and `pnpm build` passed with the existing large-chunk warning (782.51 kB minified JS). Backend `pnpm test` passed (12 files, 99 tests), `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed; Node v22.13.0 emitted the existing package requirement warning for Node >=24. `supabase test db --local supabase/tests/billing.test.sql` passed (92 pgTAP tests).
- Delivery remains local-only: no PRs or pushes were created. Planned future slices follow the existing `stacked-to-main` strategy; actual per-commit counts and boundaries will be recorded after the checkout commits.
- Engram mirror: pending; the memory provider is unavailable in this runtime.
