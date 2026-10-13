# ADR 0006: App state in App.tsx and hooks; no router or global store

Records the frontend state and navigation model.

Last verified: 2026-10-13

## Status

Superseded by ADR 0009.

## Context

- Single-screen mobile app with five tabs and a routine detail view.
- Persistence and sync need one owner of the collections to diff and write atomically.

## Decision

- `src/App.tsx` owns persisted collections and UI state with `useState`; navigation is `activeTab: AppTab` plus a selected routine.
- Domain hooks (`useAppStorage`, `useAuth`, `useSync`, `useRoutines`, …) receive state/setters and return actions.
- No router, no React context, no Redux/Zustand.

## Consequences

| Positive | Negative / cost |
|---|---|
| Single source of truth for storage diffing | `App.tsx` orchestration is heavy; deep prop drilling |
| No extra dependencies | No deep links; browser back does not change tabs |
| Easy to trace data flow | Large components (700–1000 lines) |

## Evidence

- [`src/App.tsx`](../../src/App.tsx) lines 48–50 (tab state), ~288–369 (routine view), ~380–463 (overlays)
- [`src/types.ts`](../../src/types.ts) lines 44–50 (`AppTab`)
- No `react-router`, context provider, or store library in [`package.json`](../../package.json)
- Whether this is a deliberate long-term choice: `TODO(human): confirm; consider revisiting if deep links are needed.`

## Related

- [Frontend architecture](../architecture/frontend.md)
- [Coding standards](../standards/coding-standards.md)
- [Docs index](../README.md)
