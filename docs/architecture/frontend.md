# Frontend architecture

Structure and conventions of the React PWA in `src/`, and where to extend it.

Last verified: 2026-10-13

## At a glance

- React 19 + Vite 8 + Tailwind CSS v4, TypeScript, PWA via `vite-plugin-pwa`.
- **No router.** State lives in the Zustand store ([`src/store/`](../../src/store/)); components read it through `useAppStore` selectors and per-component hooks. Persistence and sync are lifecycle adapters; do not add React context or another global state mechanism ([ADR 0009](../decisions/0009-zustand-app-store.md)).
- The store migration is in progress; see [`odd/tasks/zustand-store-refactor.md`](../../odd/tasks/zustand-store-refactor.md).
- UI copy is hardcoded Spanish; code and comments are English. No i18n library.

## Folder structure

| Path | Contents |
|---|---|
| [`src/main.tsx`](../../src/main.tsx) | Entry: `registerSW({ immediate: true })`, renders `<App />` in `StrictMode`. |
| [`src/App.tsx`](../../src/App.tsx) | Composition root (538 lines): view selection, overlays, and auth/storage/sync wiring. |
| [`src/types.ts`](../../src/types.ts) | Domain types (`Routine`, `Exercise`, `WorkoutSet`, `ExerciseDefinition`, `AppTab`, …). |
| [`src/types/database.types.ts`](../../src/types/database.types.ts) | Supabase-generated DB types (regenerated with `pnpm db:types`; see [backend](backend.md#type-generation)). |
| `src/components/` | Entry components plus props-driven feature parts in `exercise-catalog/`, `exercise-diary/`, `routine/`, `rm-logs/`, and `data-backup/`. |
| `src/hooks/` | Domain and view-state hooks (table below). |
| [`src/store/`](../../src/store/) | Zustand app store, state slices, and persistence adapter. |
| `src/services/` | `db.ts` (IndexedDB), `sync-queue.ts`, `cloud-sync.ts`, `supabase.ts`, `auth.ts`. |
| `src/utils/` | Pure helpers including `exerciseCatalog.ts`, `rmLogs.ts`, `routineView.ts`, and `restTimer.ts`. |
| [`src/data/initialData.ts`](../../src/data/initialData.ts) | Starter routines/exercises created as private, editable user records. |
| [`src/index.css`](../../src/index.css) | Tailwind import, CSS variables, custom utility classes. |

Entry components compose; feature subfolders hold props-driven parts; shared state lives in the store, component interactions live in hooks, and pure logic stays in `src/utils`.

## App composition and navigation

- Navigation is `activeTab` state of type `AppTab` in [`useAppViewState`](../../src/hooks/useAppViewState.ts); the enum in [`src/types.ts`](../../src/types.ts) defines `ROUTINES`, `EXERCISES`, `RMS`, `HISTORY`, and `DIARY`.
- [`BottomTabBar`](../../src/components/BottomTabBar.tsx) renders the tabs ("Rutinas", "Ejercicios", "RMs", "Historial", "Diario").
- Selecting a routine replaces the tab content with [`RoutineView`](../../src/components/RoutineView.tsx), in edit ("Editar") or execute ("Entrenar") mode.
- App keeps the discriminated view selection and global overlay composition; it has no router. Sign-out sequencing stays explicit in App.
- Global overlays rendered by App include `SidebarMenu`, `RmRecordAlertModal`, `WorkoutSummaryModal`, `DataBackupModal`, `RestTimerBar`, and `ToastNotification`.
- There are no URLs per screen; browser back/forward does not navigate tabs.

## Hooks

The store owns shared state and actions. Components and per-component hooks use selectors; lifecycle adapters own persistence, auth, and sync service interactions.

| Hook | Responsibility |
|---|---|
| [`useStorageLifecycle`](../../src/hooks/useStorageLifecycle.ts) | Mounts the persistence adapter, which hydrates and persists the 6 collections per scope, migrates legacy `localStorage`, and transfers guest data on sign-in. Writes are blocked until hydration completes. |
| [`useAuth`](../../src/hooks/useAuth.ts) | Supabase session, Google sign-in/out, `{ id, email }`, sync eligibility via `get_sync_entitlement()`. Sign-out attempts a final online sync, confirms any remaining outbox changes, then clears account and guest local data after Supabase sign-out succeeds. OAuth redirect is `new URL(import.meta.env.BASE_URL, window.location.origin)` (lines 25–27). |
| [`useSync`](../../src/hooks/useSync.ts) | Online status; triggers push/pull on local change, login, reconnect, Retry, and 30 s polling; exposes `idle \| syncing \| synced \| error`, error, `lastSyncedAt` (lines 22–37, 279–290). Also exposes an awaited final sync entry point for sign-out. Suppresses automatic retries for the same failed pending signature until the queue changes or the user presses Retry (lines 215–244). |
| [`useRoutines`](../../src/hooks/useRoutines.ts) | Routine and catalog CRUD, edit/execute mode, guest routine limit. |
| [`useWorkoutSession`](../../src/hooks/useWorkoutSession.ts) | Active session start/finish, completed sets, history log creation. |
| [`useRmTracker`](../../src/hooks/useRmTracker.ts) | RM logs and new-record alerts. |
| [`useExerciseCatalog`](../../src/hooks/useExerciseCatalog.ts) | Exercise catalog filters, selection, form state, and actions. |
| [`useExerciseDiary`](../../src/hooks/useExerciseDiary.ts) | Diary navigation, filtering, entry editing, and actions. |
| [`useRoutineViewState`](../../src/hooks/useRoutineViewState.ts) | Routine view mode, draft, exercise selection, collapse, and scroll state. |
| [`useRmLogActions`](../../src/hooks/useRmLogActions.ts) | RM log selection, record actions, and related modal state. |
| [`useAppViewState`](../../src/hooks/useAppViewState.ts) | Active tab, sidebar visibility, backup-modal visibility, and simple navigation actions. |
| [`useActiveRestTimer`](../../src/hooks/useActiveRestTimer.ts) | Active rest-timer state and start/close actions; persistence helpers live in `src/utils/restTimer.ts`. |
| [`useExerciseDiaryNavigation`](../../src/hooks/useExerciseDiaryNavigation.ts) | Opening the diary for a given exercise. |
| [`useWorkoutTimer`](../../src/hooks/useWorkoutTimer.ts) | Elapsed time since a session start. |
| [`usePWAInstall`](../../src/hooks/usePWAInstall.ts) | Install prompt handling for the PWA banner/button. |

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

- Rest-timer state and lifecycle live in [`useActiveRestTimer`](../../src/hooks/useActiveRestTimer.ts); [`src/utils/restTimer.ts`](../../src/utils/restTimer.ts) hydrates, expires, saves, and clears its `sessionStorage` value. [`RestTimerBar`](../../src/components/RestTimerBar.tsx) shows the countdown.
- On completion: `playTimerFinishBeep()` (Web Audio with HTML5 audio fallback) and `triggerTimerVibration()` (`navigator.vibrate`) in [`src/utils/audioBeep.ts`](../../src/utils/audioBeep.ts).
- **Limitation:** no Notification API, no push, no wake lock, no SW notification handling. When the phone is locked or the tab is backgrounded, the alert may not fire. Background notifications would need server-side push — see [backend: adding server-side logic](backend.md#adding-server-side-logic-edge-functions-scheduled-jobs-push).

## Extension points

### Adding a tab

1. Add a value to `AppTab` in [`src/types.ts`](../../src/types.ts).
2. Add the item (Spanish label, lucide icon) to [`BottomTabBar`](../../src/components/BottomTabBar.tsx).
3. Render the view for the new tab in [`src/App.tsx`](../../src/App.tsx), passing state and actions as props.
4. Follow the [UI skill](../../.github/skills/workoutlog-ui-style/SKILL.md) for layout and safe areas.

### Adding a hook

1. Create `src/hooks/useThing.ts` exporting `useThing(props: UseThingProps): UseThingReturn` (pattern: [`useRmTracker`](../../src/hooks/useRmTracker.ts)).
2. Read shared state through `useAppStore` selectors and keep persistence in the store lifecycle adapter.
3. Call it from App and pass results down as props.
4. Add Vitest tests for its logic where feasible ([testing strategy](../standards/testing-strategy.md)).

### Adding a persisted (and synced) collection

This touches IndexedDB, the outbox, Supabase, and backups. Follow the ordered checklist in the [frontend–backend strategy](frontend-backend-strategy.md#checklist-add-a-synced-field-or-table). Never add a collection that persists locally but is silently excluded from sync without documenting it.

## Known debt

| Item | Evidence |
|---|---|
| App remains the composition root for conditional view selection and sign-out coordination | [`src/App.tsx`](../../src/App.tsx) |
| No background timer notifications | see Timers above |

`metadata.json` and the `DISABLE_HMR` check in [`vite.config.ts`](../../vite.config.ts) are intentionally retained so the repository can be reopened in Google AI Studio; do not remove them.

## Related

- [Architecture overview](overview.md)
- [Frontend–backend strategy](frontend-backend-strategy.md)
- [Coding standards](../standards/coding-standards.md)
- [Testing strategy](../standards/testing-strategy.md)
- [ADR 0006 – App state in hooks, no router](../decisions/0006-app-state-in-hooks-no-router.md)
- [UI style skill](../../.github/skills/workoutlog-ui-style/SKILL.md)
