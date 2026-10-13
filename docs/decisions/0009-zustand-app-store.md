# ADR 0009: Zustand app store with lifecycle adapters

Records the shared state boundary for app data and UI.

Last verified: 2026-10-13

## Status

Accepted — 2026-10-13; supersedes [ADR 0006](0006-app-state-in-hooks-no-router.md).

## Context

- `App.tsx` owned persisted collections and passed them through domain hooks and components.
- The planned component and hook refactor needs one stable state boundary without moving IndexedDB or Supabase access into components.
- Persistence and sync must retain the existing local-first scope, migration, outbox, and refresh-merge behavior.

## Decision

- Use one Zustand store in `src/store/`, composed from domain slices with state and actions on the root.
- Components read state through narrow `useAppStore` selectors and per-component hooks. Do not add React context or another global state mechanism.
- Keep persistence, auth, and sync as lifecycle adapters mounted once; components and domain hooks do not access `src/services/*` directly.
- Keep IndexedDB as the source of persisted data. The persistence adapter owns scope hydration, guest transfer, reactive writes, sync refresh merges, and backup import application.
- Test domain logic with vanilla store instances. For server-rendered selector tests, update the singleton's `getInitialState()` snapshot to the seeded state because Zustand 5 uses it for `useStore` server snapshots.
- The store boundary is implemented. Keep the completed implementation record in [`odd/tasks/zustand-store-refactor.md`](../../odd/tasks/zustand-store-refactor.md); future state changes should follow this decision.

## Consequences

| Positive | Negative / cost |
|---|---|
| State ownership is independent from the component tree, reducing pass-through props and keeping selectors focused. | The store introduces a shared state API that requires deliberate slice boundaries and selector discipline. |
| Lifecycle adapters keep IndexedDB and Supabase boundaries outside components while preserving local-first behavior. | Lifecycle commands must be registered and mounted through the app bootstrap. |
| Vanilla stores make state logic testable without a browser or React harness. | Static server-render tests must account for Zustand 5's `getInitialState()` behavior. |

## Evidence

- Files: `src/store/appStore.ts`, `src/store/slices/`, `src/store/selectors.ts`, `src/store/persistence.ts`, `src/hooks/useAppBootstrap.ts`, `src/hooks/useStorageLifecycle.ts`, `src/hooks/useAuth.ts`, `src/hooks/useSync.ts`
- Migration plan: [`odd/tasks/zustand-store-refactor.md`](../../odd/tasks/zustand-store-refactor.md)

## Related

- [ADR 0006 – App state in hooks; no router](0006-app-state-in-hooks-no-router.md)
- [Frontend architecture](../architecture/frontend.md)
- [Coding standards](../standards/coding-standards.md)
- [Docs index](../README.md)
