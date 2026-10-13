# Zustand store refactor

Last verified: 2026-10-13

## Objective

Replace App-owned state and prop drilling with one Zustand store that every component reads through narrow selectors, give each container component its own hook, and reduce `src/App.tsx` to a thin composition root, without changing user-visible behavior, persistence, or sync semantics.

## Problem

- `src/App.tsx` (538 lines) owns persisted collections, sign-out orchestration, import messaging, an inline cleanup screen, and wires 15+ hooks into components.
- Containers receive many pass-through props (`RoutineExerciseList` 28, `RmExerciseList` 24, `ExerciseFormModal` 24, `SidebarMenu` 20, `RoutineView` 18).
- Components know whether data comes from IndexedDB or Supabase only indirectly, but the wiring lives in App.

## Constraints

- Branch: `refactor/zustand-store` from `develop`. Push, PR and merge are human decisions.
- Every worker subagent uses model `gpt-6-luna` (maintainer requirement); the orchestrator only plans, reviews, and commits.
- Single writer at a time. Conventional Commits, no AI attribution trailers.
- No schema, RPC, sync-contract, or IndexedDB version change. `zustand` is the only new dependency (explicitly requested).
- UI markup, Tailwind classes, and Spanish copy stay identical: existing snapshots in `tests/__snapshots__/` must not change unless a harness change forces it and the rendered HTML is proven equal.
- Persistence semantics stay exact: no write before a scope hydrates, one `setScopedStoredItem` per changed collection, guest transfer on sign-in, sync refresh merges without losing concurrent edits.

## Design

### Store

- `src/store/appStore.ts`: `createAppStore()` (vanilla `createStore` from `zustand/vanilla`, composed from slices) and the app singleton `appStore`; `useAppStore(selector)` bound with `useStore` from `zustand`. Use `useShallow` when a selector returns an object or array built from several fields.
- `src/store/slices/*.ts`, one `StateCreator` per slice, state plus actions flat on the root (select actions individually):
  - `dataSlice`: the six persisted collections with React-style setters (value or updater) and storage status (`isStorageLoaded`, `isGuestTransferComplete`, `storageError`).
  - `uiSlice`: `activeTab`, sidebar, backup modal, toast `feedbackMessage` (`notify`, `clearFeedback`), sign-out confirmation dialog.
  - `restTimerSlice`, `diaryNavigationSlice`: from `useActiveRestTimer`, `useExerciseDiaryNavigation`.
  - `routineSlice`, `workoutSlice`, `rmSlice`: domain actions from `useRoutines`, `useWorkoutSession`, `useRmTracker`; cross-cutting effects (closing the rest timer on reset/finish, notifying) live inside actions.
  - `accountSlice`, `syncSlice`: public auth and sync state plus commands.
- Pure logic stays in `src/utils/` (for example a new `buildImportSummaryMessage`).

### Data-source boundary

- Components and component hooks only read and update the store. They never import `src/services/*`.
- Adapters mounted once by `useAppBootstrap()`:
  - `src/store/persistence.ts`: scope hydration, guest transfer, a store subscription that persists each changed collection after hydration, sync refresh merge (`mergeSyncRefresh`), and backup import apply.
  - `useAuth` and `useSync` remain lifecycle adapters (Supabase listeners, online events, polling). They publish public state into `accountSlice` / `syncSlice` and register their commands; store actions (`signOut`, `retryLocalCleanup`, `syncNow`, `retrySync`) orchestrate through the registered commands.

### Components and hooks

- Container components (feature entries and modals that need domain data) call one `use<Component>()` hook that selects state and actions. Hooks live in `src/hooks/` (feature subfolders mirror `src/components/` subfolders).
- Presentational leaves keep narrow props (target ≤ 7), no pass-through props, no store access when they are reused generically (`ConfirmDialog`, `RmBadge`, `TimePickerField`, `InfiniteWheelColumn`, `VideoPreview`).
- `App.tsx` keeps only bootstrap, gating screens, and layout composition (target < 80 lines). Inline UI moves to components (`LocalCleanupPendingScreen`, `AppShell`/`MainLayout`, `TabContent`, `GlobalOverlays`, `SignOutConfirmDialog`).

### Testing

- Store logic is tested on vanilla store instances (`createAppStore()`), no React harness.
- Persistence tests use `fake-indexeddb` with a fresh `IDBFactory`.
- Zustand 5 `useStore` uses `getInitialState()` as the server snapshot, so `renderToStaticMarkup` ignores `setState`. Tests use a shared helper (`tests/store-test-utils.ts`) that seeds the singleton and spies `getInitialState` to return the current state, and resets it after each test.

## Tasks

| ID | Task | Route | Risk | Checks | Commit |
|----|------|-------|------|--------|--------|
| T1 | ADR 0009 + rule flip; add `zustand`; store foundation; `dataSlice` + persistence adapter replacing `useAppStorage`; test helpers | delegated writer (gpt-6-luna) | high | test, lint, build, independent verifier | done `5ac01cb` |
| T2 | `uiSlice`, `restTimerSlice`, `diaryNavigationSlice`, `accountSlice`, `syncSlice`; `useAppBootstrap`; sign-out flow as store action | delegated writer (gpt-6-luna) | high | test, lint, build, independent verifier | done `b297edb` |
| T3 | `routineSlice`, `workoutSlice`, `rmSlice`; import action + `buildImportSummaryMessage`; delete replaced hooks | delegated writer (gpt-6-luna) | medium | test, lint, build | done `531380a` |
| T4 | Shell de-prop and thin `App.tsx`: header, tab bar, sidebar, banner, overlays, cleanup screen, tab content | delegated writer (gpt-6-luna) | medium | test, lint, build | done `1a8b9cc` |
| T5 | Routine feature de-prop: `RoutineView`, `routine/*`, `ExerciseCard`, `AddExerciseModal`, `ReorderExercisesModal`, `WorkoutFinishConfirmModal` | delegated writer (gpt-6-luna) | medium | test, lint, build, snapshots unchanged | |
| T6 | Catalog and RM logs de-prop: `ExerciseCatalog` + `exercise-catalog/*`, `RmLogsView` + `rm-logs/*` | delegated writer (gpt-6-luna) | medium | test, lint, build, snapshots unchanged | |
| T7 | History, diary, backup de-prop: `WorkoutHistoryView`, `WorkoutDetailModal`, `WorkoutSummaryModal`, `ExerciseDiaryView` + `exercise-diary/*`, `DataBackupModal` + `data-backup/*` | delegated writer (gpt-6-luna) | medium | test, lint, build, snapshots unchanged | |
| T8 | Docs and agent files sweep; final review | docs-keeper then reviewer (gpt-6-luna) | passive + review | readback, full checks | |

## Acceptance criteria

- One Zustand store is the only owner of app state; no component receives a prop only to forward it.
- No component imports `src/services/*`; persistence and sync run through adapters.
- `src/App.tsx` < 80 lines with no inline screens.
- `pnpm test`, `pnpm lint`, `pnpm build` pass after every task; snapshots unchanged.
- ADR 0009 accepted; ADR 0006 marked superseded; AGENTS.md, docs, instructions, and skills describe the store.

## Delivery strategy

`auto-chain` with `feature-branch-chain` (chosen autonomously in autopilot): forecast ~5,000 authored changed lines; one work-unit commit per task on `refactor/zustand-store`. Suggested PR slices: T1–T3 (store and adapters), T4–T5, T6–T7, T8. PR creation remains a human decision.

## Progress

- [x] T1 · [ ] T2 · [ ] T3 · [ ] T4 · [ ] T5 · [ ] T6 · [ ] T7 · [ ] T8

## Evidence

- T1 (high): writer `pnpm test` 137 pass, lint pass, build pass. Independent verifier FAIL: (a) hydration rejection leaves app loading — pre-existing behavior in original `useAppStorage`, out of scope; (b) missing lifecycle edge tests — one scoped correction added StrictMode double-hydration, competing-scope, and owner-change-during-refresh tests; parent spot check `pnpm test` 140 pass, `pnpm build` pass.
- Follow-up for T2: App duplicates the `owner:<id>` scope-key format to gate data; move gating into a store selector once account state lives in the store.
- T2 (high): writer `pnpm test` 149 pass, lint, build pass; `useAuth` publishes in a layout effect (scope gating before paint), App keeps `// T3:` bridges. Independent verifier FAIL: (1) sync `isOnline` mirrored in a passive effect could be stale for the sign-out gate — corrected by publishing sync state in a layout effect (harness mocks map `useLayoutEffect`); (2) App-level render/callback assertions from the deleted characterization test (tab content, sidebar/backup wiring, RestTimerBar render+close) are reassigned to T4, which recomposes App. Parent spot check: `pnpm test` 149 pass, `pnpm lint` pass, `pnpm build` pass.
- T3 (medium): writer `pnpm test` 164 pass, lint, build pass; `useRoutines`, `useWorkoutSession`, `useRmTracker` replaced by slices; `buildImportSummaryMessage` pure with tests. Parent spot check: `pnpm test` 164 pass, `pnpm lint` pass, no `// T3:` bridges left.
- T4 (medium): writer `pnpm test` 169 pass, lint, build pass; `App.tsx` 538 → 32 lines; shell props removed (SidebarMenu 20→0, RestTimerBar 7→0, BottomTabBar 7→0, AppHeader 5→0, RmRecordAlertModal 7→0); App-level assertions reassigned from T2 re-added as shell tests. Parent spot check: `pnpm test` 169 pass, `pnpm lint` pass, `pnpm build` pass, RestTimerBar remount `key` preserved.
- T5 (medium): writer `pnpm test` 169 pass, lint, build pass, snapshots unchanged; props RoutineView 18→0, RoutineExerciseList 28→1, ExerciseCard 15→4, RoutineList 6→0; eight hooks in `src/hooks/routine/`. Parent spot check: `pnpm test` 169 pass, lint, build pass; no unshallowed object selectors; no service imports in components.

## Next step

T6.
