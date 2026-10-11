# Coding standards

Conventions observed in the codebase, with examples to copy and legacy patterns to avoid.

Last verified: 2026-10-11

## Rules in one screen

- TypeScript everywhere; `pnpm lint` (`tsc --noEmit`) is the only linter. No ESLint/Prettier — match the surrounding style.
- Single quotes, semicolons, 2-space indentation, **relative imports**.
- Components: `export const Name: React.FC<NameProps>` + `export interface NameProps`.
- State in `App.tsx`, logic in hooks, persistence in `useAppStorage` / `src/services/db.ts`. No context, no store.
- Code, identifiers, comments: **English**. UI copy: **Spanish**.
- Text inputs commit on **blur**.
- Style with Tailwind classes following the [UI skill](../../.github/skills/workoutlog-ui-style/SKILL.md).
- No new dependencies without asking the maintainer.

## Naming

| Kind | Convention | Example |
|---|---|---|
| Component file + export | PascalCase, one component per file | [`src/components/RoutineList.tsx`](../../src/components/RoutineList.tsx) → `RoutineList` |
| Props | `export interface <Component>Props` | `RmBadgeProps` in [`RmBadge.tsx`](../../src/components/RmBadge.tsx) |
| Hook | `useThing` in `src/hooks/useThing.ts`, with `UseThingProps` / `UseThingReturn` | [`useRmTracker.ts`](../../src/hooks/useRmTracker.ts) |
| Service | kebab-case or short lowercase file names | `sync-queue.ts`, `cloud-sync.ts`, `db.ts` |
| Utility | camelCase file, pure functions | [`rmCalculations.ts`](../../src/utils/rmCalculations.ts) |
| Constants | `UPPER_SNAKE_CASE` | `PULL_LIMIT`, `FREE_ROUTINE_LIMIT` |
| DB objects | `snake_case` tables/columns; migrations `YYYYMMDDHHMMSS_snake_description.sql` | `exercise_diary_entries` |
| Tests | `tests/<area>/<name>.test.ts(x)` | `tests/services/sync-queue.test.ts` |

## Components

| Do | Don't |
|---|---|
| `export const SyncStatus: React.FC<SyncStatusProps> = ({ … }) => { … }` (all 31 components) | Default exports for components (only `App.tsx` uses a default export – legacy) |
| Receive data and callbacks as props | Read IndexedDB or call Supabase from a component |
| Commit text/number fields on blur ([`ExerciseCard.tsx`](../../src/components/ExerciseCard.tsx) ~81, 522, 572) | Call `onUpdate…` on every keystroke (floods the outbox) |
| Use Tailwind utility classes and the custom classes in [`src/index.css`](../../src/index.css) | CSS modules, styled-components, new global CSS for one component |
| Inline `style` only for computed values (progress widths in `RestTimerBar`, `RoutineView`) | Inline `style` for static colors/spacing |
| Use `lucide-react` icons | Adding another icon library |

## Hooks and state

| Do | Don't |
|---|---|
| Keep persisted collections in App state; pass setters into hooks; return actions | Add React context, Redux/Zustand, or module-level mutable state |
| Persist through `useAppStorage` → `setScopedStoredItem` | Write `localStorage` directly (legacy; migrated away) |
| Wait for hydration before reactive writes | Overwrite unloaded data with defaults |
| Keep sync logic in `src/services/*` and `useSync` | Push to Supabase from feature hooks |

## Imports

| Do | Don't |
|---|---|
| `import { useSync } from '../hooks/useSync';` | `import … from '@/hooks/useSync'` (alias configured but unused – do not introduce) |
| `import type { Routine } from '../types';` for type-only imports | |

## Language

| Artifact | Language | Example |
|---|---|---|
| UI text, `aria-label`, toasts | Spanish | `aria-label="Navegación principal"` ([`BottomTabBar.tsx`](../../src/components/BottomTabBar.tsx) line 70) |
| Identifiers, comments, commit messages, docs | English | `// Admit an entire queue snapshot…` (cloud-sync.ts) |
| Errors thrown in services | English (internal); show Spanish text to users | `CloudSyncError` messages |

Known inconsistency: `ROUTINE_LIMIT_ERROR_MESSAGE` ([`src/utils/backup.ts`](../../src/utils/backup.ts) 3–18) is English and mentions Premium — legacy – do not replicate.

## Data and IDs

- String IDs; preserve nested routine → exercises → sets and snapshots.
- Starter data from [`src/data/initialData.ts`](../../src/data/initialData.ts) are private, editable user records, never a shared seed catalog.
- Any persisted shape change follows the [sync checklist](../architecture/frontend-backend-strategy.md#checklist-add-a-synced-field-or-table).

## Dependencies

- Add none without the maintainer's approval. Use `pnpm add`; commit `pnpm-lock.yaml` only (never `bun.lock` / `package-lock.json`).

## Legacy – do not replicate

| Pattern | Where |
|---|---|
| "Premium"/"Free plan" naming for sync (`premiumActive`, `isPremiumActive`, "Plan Free") | App.tsx, `SyncStatus.tsx`, `AppHeader.tsx`, `DataBackupModal.tsx`, `useRoutines.ts`, `useSync.ts`, `cloud-sync.ts`, `backup.ts` |
| Default export + Apache SPDX header from AI Studio scaffold | [`src/App.tsx`](../../src/App.tsx) |
| `DISABLE_HMR` env check | [`vite.config.ts`](../../vite.config.ts) |
| `{StrictMode}` import style without spaces and `.tsx` extension in import | [`src/main.tsx`](../../src/main.tsx) |
| Light `bg-zinc-50` body / `#FFE600` theme-color | [`index.html`](../../index.html) |
| Light zinc/emerald tones in `SyncStatus` | [`SyncStatus.tsx`](../../src/components/SyncStatus.tsx) |
| 700–1000-line components | `RmLogsView`, `DataBackupModal`, `ExerciseDiaryView`, `ExerciseCatalog`, `RoutineView` — split when touching heavily |
| `bun.lock`, `metadata.json`, `pnpm-workspace.yaml` placeholders | repo root |

## Related

- [Frontend architecture](../architecture/frontend.md)
- [Testing strategy](testing-strategy.md)
- [Git workflow](git-workflow.md)
- [UI style skill](../../.github/skills/workoutlog-ui-style/SKILL.md)
- [ADR 0006 – App state in hooks](../decisions/0006-app-state-in-hooks-no-router.md)
