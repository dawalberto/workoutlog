## Summary

<!-- What changes and why, in 1–3 sentences. -->

## Type

- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] docs
- [ ] ci / chore
- [ ] style

## ODD task doc

<!-- Link to odd/tasks/<feature>.md for substantial work, or "n/a (small change)". -->

## Checklist

- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] If `supabase/` changed: new forward-only migration; `pnpm db:reset`, `pnpm db:test`, `pnpm db:lint` pass locally (after `supabase start`)
- [ ] If the schema changed: `src/types/database.types.ts` regenerated (not hand-edited)
- [ ] If the sync contract changed: SQL and TypeScript sides updated together per the [checklist](../docs/architecture/frontend-backend-strategy.md#checklist-add-a-synced-field-or-table); changes are backward compatible; production migration runs before the frontend deploy
- [ ] UI copy is in Spanish and follows the UI style skill
- [ ] No secrets, `.env*` values, or real user data
- [ ] Conventional Commit messages, no AI attribution
- [ ] Updated docs/agent instructions if conventions or architecture changed

## Verification notes

<!-- Commands run and observed results; anything not run and why. -->
