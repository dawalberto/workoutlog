---
applyTo: "src/App.tsx,src/main.tsx,src/components/**,src/hooks/**,src/utils/**,src/data/**,src/index.css,src/types.ts"
description: "React, Tailwind, hooks, and UI copy rules for WorkoutLog frontend source."
---

# Frontend instructions

Load the [UI style skill](../skills/workoutlog-ui-style/SKILL.md) for any visual change. Depth: [frontend architecture](../../docs/architecture/frontend.md), [coding standards](../../docs/standards/coding-standards.md).

## Patterns

- Components: one per file, named export `export const RmBadge: React.FC<RmBadgeProps>` (see `src/components/RmBadge.tsx`). Export a component's props interface only when another module imports it; otherwise keep it module-private.
- State: shared state lives in the Zustand store (`src/store/`); components read it through `useAppStore` selectors and per-component hooks. Persistence and sync are lifecycle adapters. Do not add React context or another global state mechanism. The migration is in progress; see [`odd/tasks/zustand-store-refactor.md`](../../odd/tasks/zustand-store-refactor.md).
- Navigation: add tabs through the `AppTab` enum in `src/types.ts` and the `activeTab` switch in `App.tsx`; there is no router.
- Persistence: go through the store lifecycle adapter → `src/services/db.ts`. Wait for hydration before reactive writes.
- Inputs: commit text/number fields on blur, as `src/components/ExerciseCard.tsx` does; covered by `tests/exercise-card.test.tsx`.
- Styling: Tailwind utilities plus the custom classes in `src/index.css` (`.glass-panel`, `.neon-glow`, …); inline `style` only for computed values (progress widths).
- Icons: `lucide-react` only.
- Copy: Spanish for every visible string, toast, and `aria-label` (`aria-label="Navegación principal"` in `BottomTabBar.tsx`). Identifiers and comments in English.
- Pure logic (calculations, formatting) goes in `src/utils/` so it can be unit-tested.
- Starter data in `src/data/initialData.ts` are private, editable user records, never a shared catalog.

## Anti-patterns

- Default exports for components; React context or another global state mechanism.
- Calling Supabase, IndexedDB, or `localStorage` from a component.
- Firing update handlers on every keystroke (floods the sync outbox).
- Plan labels or billing-tier terminology; sync is enabled for signed-in users, and guests are limited by `GUEST_ROUTINE_LIMIT` in `src/utils/backup.ts`.
- Light zinc backgrounds or generic grays (legacy in `SyncStatus.tsx`, `index.html`); use the Neon Bento tokens.
- Growing the 700–1000-line components (`RmLogsView`, `DataBackupModal`, …); extract subcomponents when touching them heavily.

## Verify

`pnpm lint && pnpm test && pnpm build`. Add a harness test for behavior changes ([testing skill](../skills/workoutlog-testing/SKILL.md)).
