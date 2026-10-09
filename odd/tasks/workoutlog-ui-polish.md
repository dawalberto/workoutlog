# WorkoutLog UI polish task document

## Objective

Polish the existing neon/bento frontend UX: remove the unwanted sync banner, show truthful connectivity state, clarify the active Premium plan and verified benefits, add a Premium diamond badge, and avoid persisting set edits for every typed character.

## Problem and rationale

The app currently spends header space on sync status that the user does not want, displays a static offline footer while online, does not identify the active paid plan, undersells verified Premium capabilities, and persists weight/repetition drafts while the user is still typing. These changes must retain authentication, offline-first local storage, sync correctness, and the existing visual language.

## Scope and constraints

- Frontend: `feature/workoutlog-offline-sync`.
- Backend changes are in scope only if needed to expose an exact active-plan identifier; do not infer monthly versus annual from entitlement expiry.
- Preserve the dark neon/bento styling (`#0D0D0D`, `#00FF87`, rounded cards, restrained glow, translucent borders) and mobile behavior.
- Market only verified benefits: Free is limited to three routines; Premium bypasses that cap and enables cloud sync. Offline local storage and backup behavior are not Premium-exclusive and must not be advertised as such.
- Remove only the redundant header banner; preserve authentication, entitlement state, sync scheduling, retry, and local-first behavior.
- Save directly edited routine set fields on blur, keeping an internal draft while typing. Do not change forms that already use an explicit Save action or picker-confirm flow.
- Preserve all pre-existing untracked files and CodeGraph artifacts. No Stripe, other remote operations, push, PR, deployment, or `main` changes.

## Delivery

- Route: delegated direct; multiple non-trivial frontend/backend files and tests require one bounded writer.
- Delivery strategy: `auto-chain` with the previously selected `stacked-to-main` PR strategy. No PR or push will be created.
- Forecast: approximately 500 authored changed lines across the three behavior units; split by behavior and report actual sizes.
- Frontend RDD is enabled by default; backend RDD is clone-local off. Do not start or toggle native review; the user previously chose to leave frontend candidates unreviewed.

## Tasks

- [x] `header-connectivity-polish`: Remove the prominent header sync banner, make the sidebar footer connectivity label reflect the actual online state, and add a Premium-only diamond icon to the header badge.
- [ ] `premium-plan-clarity`: Show an active badge only for plan(s) identified by trustworthy entitlement metadata; add compelling but verified plan benefits. Extend the backend entitlement response/storage only as needed to expose plan IDs accurately.
- [ ] `blur-save-set-fields`: Keep reps/weight drafts local while editing and persist the normalized value on blur, avoiding per-keystroke backend sync; retain existing explicit-save and picker behavior.

## Acceptance criteria and checks

- The header no longer renders the large sync status row; removing it does not disable sync or account actions.
- The sidebar footer does not claim the app is offline while online; state is derived from the existing connectivity source.
- Active Premium plans are marked accurately; no plan is inferred from `validUntil` or tier alone.
- Paid-plan copy advertises only verified features and does not imply Premium-exclusive offline access or backup.
- The Premium header badge shows a diamond before its label only when active; Free presentation is unchanged.
- Reps/weight typing updates only local draft state; blur commits the normalized value once. Existing save-button forms and picker confirmation remain unchanged.
- Focused frontend/backend tests, full tests, lint, typecheck, and builds pass; SQL/pgtap runs if backend schema changes.

## Progress and verification

- Initial worktree checks showed only the known untracked local files; they must remain untouched.
- Frontend CodeGraph is up to date (753 nodes); frontend RDD status is `on`. Backend RDD status remains clone-local `off`.
- Read-only mapping located the banner in `src/components/AppHeader.tsx`, static footer in `src/components/SidebarMenu.tsx`, plan cards in `src/components/BillingPlansModal.tsx`, and per-keystroke set updates in `src/components/ExerciseCard.tsx`.
- Current entitlement API exposes only tier/expiry, so exact monthly/annual identification needs trustworthy plan metadata; do not infer it.
- `header-connectivity-polish` completed: AppHeader no longer renders SyncStatus, while App keeps `useSync` active and passes its existing `isOnline` state to the sidebar footer. The footer now distinguishes “En línea” from “Sin conexión”; the Premium badge renders a diamond only while active. `tests/billing.test.tsx` verifies banner removal, sidebar online/offline labels, and the Premium-only icon.
- Header task test-first evidence: before implementation, `pnpm test -- tests/billing.test.tsx` failed 4 tests for the absent header/footer behavior. After implementation, `pnpm test -- tests/billing.test.tsx tests/sync-wiring.test.tsx` passed 75 tests across 8 files; `pnpm lint` passed.
- Header task rollback boundary: revert only the header/sidebar prop and rendering changes in `src/App.tsx`, `src/components/AppHeader.tsx`, `src/components/SidebarMenu.tsx`, and the matching assertions in `tests/billing.test.tsx`; this does not alter sync scheduling or the `SyncStatus` component.
- Header task work-unit commit identity: `e9433a1`.
- `premium-plan-clarity` is blocked before implementation: `src/plugins/supabase-client.ts` is outside the allowed backend edit surfaces, but its `getEntitlement` query currently selects only `tier,valid_until` and its validator/type cannot carry trusted plan metadata. Without extending that source, the API cannot truthfully expose a persisted plan.
- Next step: obtain authorization to add `src/plugins/supabase-client.ts` to the backend edit surfaces before continuing the entitlement metadata task. The remaining task is still pending.
- Engram mirror: pending; the memory provider is unavailable in this runtime.
