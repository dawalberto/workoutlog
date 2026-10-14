# Frontend architecture

Structure and conventions of the React PWA in `src/`, and where to extend it.

Last verified: 2026-10-14

## At a glance

- React 19 + Vite 8 + Tailwind CSS v4, TypeScript, PWA via `vite-plugin-pwa`.
- **No router.** State lives in the Zustand store ([`src/store/`](../../src/store/)); components read it through `useAppStore` selectors and per-component hooks. Persistence and sync are lifecycle adapters; do not add React context or another global state mechanism ([ADR 0009](../decisions/0009-zustand-app-store.md)).
- UI copy is hardcoded Spanish; code and comments are English. No i18n library.

## Folder structure

| Path | Contents |
|---|---|
| [`src/main.tsx`](../../src/main.tsx) | Entry: `registerSW({ immediate: true })`, renders `<App />` in `StrictMode`. |
| [`src/App.tsx`](../../src/App.tsx) | Thin composition root: bootstrap, readiness gates, shell, and global overlays. |
| [`src/types.ts`](../../src/types.ts) | Domain types (`Routine`, `Exercise`, `WorkoutSet`, `ExerciseDefinition`, `AppTab`, …). |
| [`src/types/database.types.ts`](../../src/types/database.types.ts) | Supabase-generated DB types (regenerated with `pnpm db:types`; see [backend](backend.md#type-generation)). |
| `src/components/` | Shell, tab, modal, and feature components; generic reusable leaves use focused props. |
| `src/hooks/` | Lifecycle adapters, feature hooks, and per-component hooks grouped by feature. |
| [`src/store/`](../../src/store/) | Zustand app store, domain slices, selectors, and persistence adapter. |
| `src/services/` | `db.ts` (IndexedDB), `sync-queue.ts`, `cloud-sync.ts`, `supabase.ts`, `auth.ts`. |
| `src/utils/` | Pure helpers including `exerciseCatalog.ts`, `rmLogs.ts`, `routineView.ts`, and `restTimer.ts`. |
| [`src/data/initialData.ts`](../../src/data/initialData.ts) | Starter routines/exercises created as private, editable user records. |
| [`src/index.css`](../../src/index.css) | Tailwind import, CSS variables, custom utility classes. |

`App.tsx` mounts the app bootstrap and composes the shell. Shared state and actions live in the store; component hooks select state and actions, while local form/view state remains in feature hooks. Persistence, auth, and sync are lifecycle adapters. Components and feature hooks do not import `src/services/*` directly; pure logic stays in `src/utils`.

## App composition and navigation

- Navigation is `activeTab` in the Zustand UI slice; the enum in [`src/types.ts`](../../src/types.ts) defines `ROUTINES`, `EXERCISES`, `RMS`, `HISTORY`, and `DIARY`.
- [`BottomTabBar`](../../src/components/BottomTabBar.tsx) renders the tabs ("Rutinas", "Ejercicios", "RMs", "Historial", "Diario").
- Selecting a routine replaces the tab content with [`RoutineView`](../../src/components/RoutineView.tsx), in edit ("Editar") or execute ("Entrenar") mode.
- [`TabContent`](../../src/components/TabContent.tsx) selects the active view; [`AppShell`](../../src/components/AppShell.tsx) composes navigation and shell UI, and [`GlobalOverlays`](../../src/components/GlobalOverlays.tsx) mounts app-wide overlays.
- `App.tsx` has readiness gates and no router. Auth and sign-out orchestration are published by lifecycle adapters and store actions.
- `GlobalOverlays` includes `SidebarMenu`, `RmRecordAlertModal`, `WorkoutSummaryModal`, `DataBackupModal`, `RestTimerBar`, `ToastNotification`, and `SignOutConfirmDialog`.
- There are no URLs per screen; browser back/forward does not navigate tabs.

## Hooks

The store owns shared state and actions. Components and per-component hooks use selectors; lifecycle adapters own persistence, auth, and sync service interactions.

| Hook | Responsibility |
|---|---|
| [`useAppBootstrap`](../../src/hooks/useAppBootstrap.ts) | Mounts `useAuth`, `useStorageLifecycle`, and `useSync` once; supplies persisted data to sync and refreshes the store after sync. |
| [`useStorageLifecycle`](../../src/hooks/useStorageLifecycle.ts) | Connects the persistence adapter to the app lifecycle: scope hydration, guest transfer, legacy `localStorage` migration, and reactive persistence. Writes wait for hydration. |
| [`useAuth`](../../src/hooks/useAuth.ts) | Supabase session and auth lifecycle; publishes account state and registers auth commands in the store. Sign-out coordinates final sync, pending-change confirmation, and local cleanup. |
| [`useSync`](../../src/hooks/useSync.ts) | Online status and push/pull lifecycle; publishes sync state and registers sync commands in the store. Polls every 30 seconds and suppresses retries for an unchanged failed queue until Retry or a queue change. |
| [`useExerciseCatalog`](../../src/hooks/useExerciseCatalog.ts), [`useExerciseDiary`](../../src/hooks/useExerciseDiary.ts), [`useRoutineViewState`](../../src/hooks/useRoutineViewState.ts), [`useRmLogActions`](../../src/hooks/useRmLogActions.ts) | Existing feature hooks select shared store state/actions and retain feature-local filters, forms, and view state where needed. |
| `src/hooks/shell/`, `routine/`, `exercise-catalog/`, `rm-logs/`, `workout-history/`, `data-backup/` | Hooks for individual container components; each selects its state and actions rather than receiving pass-through props from App. |
| [`useWorkoutTimer`](../../src/hooks/useWorkoutTimer.ts), [`usePWAInstall`](../../src/hooks/usePWAInstall.ts) | Elapsed workout time and PWA install prompt handling. |

## Component conventions

- `export const Name: React.FC<NameProps> = (...) => { ... }` with `interface NameProps` in the same file. Export the props interface only when another module imports it; otherwise keep it module-private.
- Field edits commit on **blur**, not per keystroke (e.g. [`ExerciseCard`](../../src/components/ExerciseCard.tsx); covered by [`tests/exercise-card.test.tsx`](../../tests/exercise-card.test.tsx)). This keeps the outbox from filling with intermediate values.
- Full rules and examples: [coding standards](../standards/coding-standards.md).

Signing out removes all local state for the signed-in owner, including queued changes and sync metadata. Guest data is transferred into the owner scope at sign-in, so sign-out also clears the guest scope and legacy collection keys; guest hydration then restores first-run starter data.

## Styling and design system

- Tailwind v4 via `@import "tailwindcss"` ([`src/index.css`](../../src/index.css) line 1); CSS variables (lines 4–20); custom classes `.neon-glow`, `.neon-glow-lg`, `.cyan-glow`, `.glass-panel`, `.glass-nav`, `.animate-slide-up`, `.scrollbar-none` (lines 49–112).
- Design system "Neon Bento" (dark surfaces, `#00FF87` primary, 48 px touch targets, ≥16 px inputs, safe-area insets). Tokens and rules live in the UI skill — do not duplicate them: [`.github/skills/workoutlog-ui-style/SKILL.md`](../../.github/skills/workoutlog-ui-style/SKILL.md) and its [design tokens reference](../../.github/skills/workoutlog-ui-style/references/design-tokens-and-ux-laws.md).

## PWA and service worker

- Configured in [`vite.config.ts`](../../vite.config.ts): `registerType: 'autoUpdate'`, Workbox `globPatterns` precache, manifest `lang: es`, `devOptions.enabled: true` (SW also runs in dev).
- `src/main.tsx` registers the SW immediately. `pnpm build` emits `dist/sw.js`.
- Icons/OG images are generated by `pnpm generate:assets` ([`scripts/generate-assets.js`](../../scripts/generate-assets.js), uses `sharp`).

## Timers and audio

- Rest-timer state and actions (`startRestTimer`, `pauseRestTimer`, `resumeRestTimer`, `extendRestTimer`, and `closeRestTimer`) live in the store. [`ActiveRestTimer`](../../src/types.ts) keeps `targetEndTime` for running timers and `pausedRemainingMs` for paused timers; [`src/utils/restTimer.ts`](../../src/utils/restTimer.ts) provides the pure timer calculations and hydrates, expires, saves, and clears the `sessionStorage` value. [`RestTimerBar`](../../src/components/RestTimerBar.tsx) derives pause and remaining-time state from the stored timer.
- On completion: `playTimerFinishBeep()` (Web Audio with HTML5 audio fallback) and `triggerTimerVibration()` (`navigator.vibrate`) in [`src/utils/audioBeep.ts`](../../src/utils/audioBeep.ts).
- **Limitation:** no Notification API, no push, no wake lock, no SW notification handling. When the phone is locked or the tab is backgrounded, the alert may not fire. Background notifications would need server-side push — see [backend: adding server-side logic](backend.md#adding-server-side-logic-edge-functions-scheduled-jobs-push).

## Extension points

### Adding a tab

1. Add a value to `AppTab` in [`src/types.ts`](../../src/types.ts).
2. Add the item (Spanish label, lucide icon) to [`BottomTabBar`](../../src/components/BottomTabBar.tsx).
3. Add the view to [`TabContent`](../../src/components/TabContent.tsx); give its container a per-component hook to select store state and actions.
4. Follow the [UI skill](../../.github/skills/workoutlog-ui-style/SKILL.md) for layout and safe areas.

### Adding a hook

1. For a container, add a focused hook under the matching `src/hooks/<feature>/` folder; keep feature-local form/view state there.
2. Select shared state and actions through `useAppStore`; use narrow selectors (and `useShallow` for shallow object selections). Keep persistence in the lifecycle adapter.
3. Call the hook from its component. Pass only presentation-specific values to generic reusable leaves.
4. Add Vitest tests for its logic where feasible ([testing strategy](../standards/testing-strategy.md)).

### Adding a persisted (and synced) collection

This touches IndexedDB, the outbox, Supabase, and backups. Follow the ordered checklist in the [frontend–backend strategy](frontend-backend-strategy.md#checklist-add-a-synced-field-or-table). Never add a collection that persists locally but is silently excluded from sync without documenting it.

## Known debt

| Item | Evidence |
|---|---|
| App remains the composition root for readiness gates and shell composition | [`src/App.tsx`](../../src/App.tsx) |
| No background timer notifications | see Timers above |

`metadata.json` and the `DISABLE_HMR` check in [`vite.config.ts`](../../vite.config.ts) are intentionally retained so the repository can be reopened in Google AI Studio; do not remove them.

## Related

- [Architecture overview](overview.md)
- [Frontend–backend strategy](frontend-backend-strategy.md)
- [Coding standards](../standards/coding-standards.md)
- [Testing strategy](../standards/testing-strategy.md)
- [ADR 0006 – App state in hooks, no router](../decisions/0006-app-state-in-hooks-no-router.md)
- [UI style skill](../../.github/skills/workoutlog-ui-style/SKILL.md)
