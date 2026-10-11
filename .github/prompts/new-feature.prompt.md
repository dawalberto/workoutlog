---
mode: agent
description: "Plan and implement a WorkoutLog feature end to end with ODD."
---

Implement this feature in WorkoutLog: ${input:feature:Describe the user-facing feature}

1. Read [AGENTS.md](../../AGENTS.md) and load the [feature end-to-end skill](../skills/workoutlog-feature-end-to-end/SKILL.md); load the other skills it routes to.
2. Explore the affected code first. If the work is substantial, create `odd/tasks/${input:featureName:kebab-case-feature-name}.md` before writing source.
3. Ask before adding dependencies, changing schema/RPCs, or bumping the IndexedDB version.
4. Implement task by task with tests first where possible; Spanish UI copy; Conventional Commits without AI attribution.
5. Verify with `pnpm test`, `pnpm lint`, `pnpm build` (plus `pnpm db:reset && pnpm db:test && pnpm db:lint` after `supabase start` if `supabase/` changed) and report observed results.
