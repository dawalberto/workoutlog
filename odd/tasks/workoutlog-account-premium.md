# WorkoutLog account-based Premium access

## Objective

Make signing in the current entitlement boundary: guests retain the Free/offline-only experience on their device; authenticated users automatically receive all current Premium capabilities, including unlimited routines and account-isolated cloud sync. Hide payment and plan UI without deleting its code so it can be re-enabled later.

## Problem and rationale

Premium currently depends on a payment entitlement in the frontend, backend sync guard, and `sync_push` database RPC. Removing only the UI cap would leave signed-in users blocked from sync, while creating fake Stripe entitlement records would corrupt payment provenance. Account access must be based on verified authentication and remain separate from real payment records.

## Scope and constraints

- Frontend branch: `feature/workoutlog-offline-sync`; backend branch: `feature/workoutlog-backend`.
- Authenticated identity grants the current Premium feature set. Guests remain capped at three routines and cannot sync; their offline local data remains available.
- Preserve per-user isolation: every backend request requires a valid authenticated user, SQL `auth.uid()` remains required, sync rows stay owner-scoped under existing RLS, and no service-role bypass is added.
- Keep all Stripe/payment code, billing components, payment entitlement rows, price IDs, and webhook behavior intact. Disable only normal visual entry points using a small reversible feature flag.
- Do not fabricate payment entitlements or change existing paid-source metadata.
- Preserve the existing unstaged user edit in `src/components/AppHeader.tsx` adding `items-center`; do not edit or stage it.
- Preserve pre-existing untracked files and CodeGraph artifacts in both repositories.
- No `main` changes, remote operations, push, PR, deployment, Stripe operations, or secret/`.env` reads.

## Delivery

- Route: delegated direct, one writer for the coordinated frontend/backend behavior and tests.
- Delivery strategy: `auto-chain`, previously selected `stacked-to-main`; no push or PR.
- Forecast: approximately 700 authored changed lines, including a forward migration replacing the substantial `sync_push` implementation while removing only its payment-entitlement gate.
- Frontend RDD is enabled by default; backend RDD is clone-local off. User previously deferred native review. Do not toggle/start review.

## Tasks

- [x] `authenticated-premium-access`: Derive frontend Premium capability from an authenticated session; report current account access from the authenticated account API; allow authenticated sync in Fastify and the `sync_push` RPC while retaining authentication and row ownership.
- [ ] `hide-payment-ui`: Hide/deactivate plan selection and payment portal entry points behind a reversible feature flag; preserve billing UI components, clients, backend endpoints, and payment data for later reactivation.
- [x] `access-regression-coverage`: Cover guest Free/offline behavior, authenticated users without payment rows getting Premium access, expired paid entitlements not blocking authenticated access, push/pull owner isolation, and retained billing data/code.

## Acceptance criteria and checks

- A signed-in user with no Stripe entitlement row is reported as Premium and can use all existing Premium-gated frontend features.
- A guest remains Free, local-only, and subject to the three-routine cap.
- Authenticated backend pull/push succeeds without a paid row; unauthenticated requests remain rejected; one user can never access another user's rows.
- SQL sync push retains idempotency, schema validation, revision checks, tombstones, and every existing ownership constraint.
- All visual plan/checkout/portal purchase entry points are hidden by a single false-by-default feature flag; billing source code and routes remain present and unchanged unless needed for account access.
- Existing paid payment records remain intact and distinguishable; no Stripe calls or fake Stripe sources are introduced.
- Frontend tests, lint, and build pass. Backend tests, lint, typecheck, build, and local pgTAP sync/billing suites pass.

## Progress and verification

- Frontend and backend branches remain `feature/workoutlog-offline-sync` and `feature/workoutlog-backend`; both `main` branches are untouched. The pre-existing `src/components/AppHeader.tsx` user edit and all other pre-existing untracked files remain unstaged and untouched.
- `authenticated-premium-access` is implemented. The frontend capability now derives only from a verified signed-in identity; the account API reports account-based Premium while retaining actual paid entitlement metadata; sync routes require authentication rather than a paid row.
- The forward migration replaces `sync_push` with the historical function body unchanged except for removal of its paid-entitlement lookup. A direct comparison against the historical definition confirmed the exact body difference. Authentication via `auth.uid()`, row ownership, RLS, idempotency, revisions, validation, tombstones, and function grants remain intact.
- Backend work-unit commit: `ab2704e` (`feat(account): enable authenticated Premium sync`), 532 authored changed lines (397-line migration plus route/test changes). This coherent migration and its regression coverage intentionally exceed the 400-line review budget; no code-golf or unrelated split was used. Rollback boundary: revert this commit to restore entitlement-gated account/sync access and the prior RPC definition.
- Frontend account capability and test changes pass, and are being recorded with this task document in the current frontend account work unit; its commit identity will be added in the next task-record update.
- Test-first RED: frontend tests initially failed because the account-access helper and billing flag had not yet been implemented. Backend Free-account push/pull assertions initially returned 403; account endpoint test requests initially returned 401 because their bearer fixture was malformed, then were corrected to use a test bearer token.
- Account/sync GREEN: frontend `pnpm test` passed (86 tests), `pnpm lint` passed, and `pnpm build` passed with the existing large-chunk warning. Backend `pnpm test` passed (101 tests), `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed; the commands emitted the known Node 22.13 versus required Node 24 engine warning.
- Local SQL: the first targeted test run against the pre-migration local database correctly failed on `sync_premium_required`. After applying only the pending migration with `supabase migration up --local` (no reset), `supabase test db --local supabase/tests/sync_push.test.sql` passed all 33 tests. `supabase test db --local supabase/tests/billing.test.sql` passed all 92 tests. No remote database or Stripe operation was used.
- `access-regression-coverage` is complete: tests cover guest Free limits, authenticated access with no or expired payment entitlement, missing/invalid auth rejection, authenticated Free-account sync, SQL owner scope, and preserved billing component behavior. `hide-payment-ui` remains in progress pending its separate frontend work-unit commit.
- Engram mirror remains pending; no memory provider is available in this runtime.
- Next step: finish and commit the false-by-default billing UI flag work, then record its commit identity, final checks, and task completion here.
- Engram mirror: pending; no memory provider is available in this runtime.
