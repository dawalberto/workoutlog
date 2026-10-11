# Copilot instructions — WorkoutLog

Local-first React PWA (Spanish UI) with Supabase sync for signed-in users. No custom server, no billing.

## Read first

- [`AGENTS.md`](../AGENTS.md): stack, commands, conventions, boundaries, Definition of Done. It is authoritative; these instructions only point to it.
- Scoped rules in [`.github/instructions/`](instructions/) apply by `applyTo` glob.
- Skills in [`.github/skills/`](skills/): load the one whose trigger matches the task before writing.
- Depth in [`docs/`](../docs/README.md); do not restate it in code comments or new docs.

## Non-negotiables

- Use pnpm only. Verify with `pnpm test`, `pnpm lint`, `pnpm build`; add `pnpm db:reset && pnpm db:test && pnpm db:lint` (after `supabase start`) when `supabase/` changes.
- UI copy in Spanish; code, comments, commits, and docs in English.
- Never edit applied migrations, hand-edit `src/types/database.types.ts`, or commit `.env*` values.
- Sync contract changes touch SQL and TypeScript in the same work unit: follow [the checklist](../docs/architecture/frontend-backend-strategy.md#checklist-add-a-synced-field-or-table).
- Conventional Commits with scopes; no AI attribution trailers.
- Ask before adding dependencies, changing schema/RPCs, or bumping the IndexedDB version.
