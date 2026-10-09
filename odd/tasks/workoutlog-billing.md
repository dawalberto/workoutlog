# WorkoutLog billing task document

## Objective

Complete the local, test-mode billing experience for Free, Premium monthly, Premium annual, and Premium lifetime without enabling live payments or preparing PRE/PRO environments.

## Problem and rationale

The backend already supports test-mode Checkout and entitlement webhooks, but the frontend has no plan catalog, checkout entry point, return experience, or billing-management UI. Billing lifecycle handling and automated coverage are also incomplete. New billing surfaces must follow WorkoutLog's existing dark neon/bento design and preserve its offline-first and entitlement behavior.

## Scope and constraints

- Display Free and Premium plans with these user-confirmed prices: €5.99 monthly, €60 annual, and €210 lifetime.
- Reuse the app's `#0D0D0D` surfaces, `#00FF87` accent, rounded bento cards, subtle translucent borders, compact bold controls, and mobile-first layout. Review the existing Google sign-in control for visual consistency.
- Integrate frontend checkout with the existing authenticated backend route and refresh entitlement safely after returning from Checkout.
- Add customer self-service through Stripe Billing Portal.
- Keep Stripe in test mode. Do not use live credentials, change PRE/PRO or deployment infrastructure, perform Stripe dashboard/API operations, push, or open PRs.
- Preserve all existing untracked files and CodeGraph artifacts.
- Product behavior assumptions for this implementation: no grace period (retain immediate entitlement loss for `past_due`); cancellation/payment-method management is delegated to Stripe Billing Portal; a full refund or an open/lost dispute for a lifetime payment revokes that lifetime entitlement; partial refunds do not revoke it. No transfer policy is added.

## Delivery

- Route: delegated direct; the task requires coordinated frontend/backend changes, broad read-before-write, and multiple non-trivial files.
- Delivery strategy: `auto-chain`; previously selected chain strategy: `stacked-to-main`. This work is expected to exceed the ~400 authored-line PR budget. Do not create PRs or push without further authorization.
- Forecast: approximately 900 authored changed lines, excluding generated files.

## Tasks

- [x] `plan-catalog`: Add the plan catalog and account entry point, styled consistently with the existing app and Google sign-in control; include focused UI tests.
- [x] `checkout-return`: Connect authenticated plan selection to Checkout, provide success/cancel return feedback, and refresh entitlement without treating a redirect as proof of payment; include frontend/backend route tests.
- [x] `billing-portal`: Add an authenticated Billing Portal session route and matching account UI with focused tests.
- [ ] `payment-lifecycle`: Handle lifetime full refunds and disputes according to the assumptions above, retain idempotency and test-only safeguards, and cover relevant webhook/database behavior with focused tests.
- [ ] `local-billing-flow`: Add or extend local automated flow coverage for monthly, annual, and lifetime checkout, duplicate webhooks, cancellation/expiry, and lifetime refund/dispute outcomes without contacting Stripe.

## Acceptance criteria and checks

- The three confirmed prices and accurate existing Free/Premium benefits are visible in a responsive neon/bento plan view.
- Guest users are prompted to authenticate before checkout; authenticated users can launch the selected server-priced plan.
- Success/cancel returns are clear, and Premium state comes only from the backend entitlement after refresh.
- Customers can request a Stripe Billing Portal session for their own linked customer; missing linkage is surfaced explicitly.
- Webhook processing remains signature-verified, idempotent, ownership-checked, and test-mode-only.
- Relevant frontend/backend tests, type checks, lint, and production builds pass; record any unavailable checks honestly.
- No remote Stripe calls, live-mode changes, PRE/PRO work, deployment, push, or PR occur.

## Verification and progress

- Initial frontend and backend repository status was clean apart from the previously listed untracked local files.
- Frontend `main` was fetched and merged into `feature/workoutlog-offline-sync` in merge commit `8f9d18a`; `main` was not modified.
- CodeGraph was refreshed after the merge. The backend index contains no symbols, so its billing map used read-only source inspection.
- Design evidence: frontend `src/index.css:5-15,61-115`, `src/components/AppHeader.tsx:39-45`, and `src/components/SidebarMenu.tsx:335-377`.
- Current source-level billing behavior and test locations were mapped before implementation; see those source files for authoritative current line locations as they evolve.
- `plan-catalog` implementation: added a responsive Free/monthly/annual/lifetime catalog with the confirmed €5.99/€60/€210 prices and only established benefits; connected it to the account drawer and aligned the account/Google controls with the dark neon Spanish UI.
- `plan-catalog` RED: `pnpm test -- tests/billing.test.tsx` failed because `BillingPlansModal` did not yet exist.
- `plan-catalog` GREEN: `pnpm test -- tests/billing.test.tsx tests/sync-wiring.test.tsx` passed (7 files, 53 tests); `pnpm lint` passed.
- `plan-catalog` work-unit commit: `ca3d7ef` (`feat(billing): add Spanish plan catalog`).
- `checkout-return` implementation: added authenticated monthly/annual/lifetime Checkout requests, strict Stripe-host validation before redirect, success/cancel feedback, one entitlement refresh on return, and an explicit manual refresh instead of polling.
- `checkout-return` RED: service and return-state tests failed before the client and return UI were implemented (11 expected failures).
- `checkout-return` GREEN: `pnpm test -- tests/services/billing.test.ts tests/billing.test.tsx` passed (8 files, 68 tests); `pnpm lint` passed; backend `pnpm test tests/billing.test.ts --reporter=dot` passed (1 file, 10 tests).
- Environment note: backend commands report Node 22.13.0 although the package requires Node >=24; the selected route tests still passed.
- `checkout-return` work-unit commit: `b343998` (`feat(billing): connect authenticated Checkout returns`).
- `billing-portal` implementation: added authenticated Portal session creation for the user's mapped customer, a configured-frontend return URL, explicit 404 handling when no customer is linked, URL validation, and account UI for payment management.
- `billing-portal` RED: frontend Portal API/UI tests failed before implementation; backend Portal route tests observed 404/503 responses before the authenticated route existed.
- `billing-portal` GREEN: frontend `pnpm test tests/services/billing.test.ts tests/billing.test.tsx --reporter=dot` passed (2 files, 21 tests) and `pnpm lint` passed; backend `pnpm test tests/billing.test.ts --reporter=dot` passed (1 file, 14 tests) and `pnpm typecheck` passed.
- `billing-portal` backend work-unit commit: `35db78d` (`feat(billing): add authenticated portal sessions`).
- Next step: implement `payment-lifecycle` with lifetime refund/dispute handling and subscription expiry rules.
