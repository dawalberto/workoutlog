---
name: workoutlog-ui-style
description: "Trigger: visual, UI, styling, CSS, Tailwind, design, layout, Bento, neon, component. Build and modify UI features adhering to WorkoutLog's Neon Bento design system and gym UX laws."
license: Apache-2.0
metadata:
  author: "dawalberto"
  version: "1.0"
---

## Activation Contract

Load for any task modifying or adding UI components, pages, layouts, modals, forms, colors, or visual styling in WorkoutLog.

## Hard Rules

- Base background must be `#0D0D0D`, surfaces `#121214`/`#18181B`, cards `#1C1C1E`, and elevated surfaces `#242428`. Never use generic gray/white backgrounds.
- Reserve `#00FF87` (electric neon green) for primary CTAs, active routines, and completed sets; use `#00E5FF` (cyan) for secondary metrics, and amber (`#F59E0B`) for RMs/PRs.
- Hairline borders must use `border-white/[0.08]` or `border-white/10`. Reserve `border-[#00FF87]/40` for active/completed items.
- All primary interactive elements must meet Fitts' Law: minimum 48px touch target height (`min-h-[48px]`), full-width buttons on mobile, and tactile active press (`active:scale-[0.97]`).
- All text inputs, selects, and textareas must have at least 16px font size on mobile to prevent iOS auto-zoom.
- Respect progressive disclosure (Hick's Law): keep cards collapsible in workout mode with monospace summary badges (`font-mono text-xs`).
- Fixed bottom navigations, banners, and modals must account for safe area insets (`pb-[env(safe-area-inset-bottom,0px)]` and `pt-[env(safe-area-inset-top,0px)]`).

## Decision Gates

| Element / Scenario | Required Visual & UX Pattern |
|---|---|
| Primary action / CTA | `bg-[#00FF87] hover:bg-[#00e57a] text-black font-extrabold rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.35)] min-h-[48px]` |
| Bento metric card | `bg-[#1C1C1E] border border-white/[0.08] rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-colors shadow-lg` |
| Completed set / card | `bg-[#1C1C1E] border-[#00FF87]/40 shadow-[0_0_25px_rgba(0,255,135,0.08)]` with green index badge |
| RM / PR record badge | `bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]` |
| Glass header / bottom bar | `bg-[#121214]/90 backdrop-blur-xl border-white/[0.08]` |
| Active session indicator | Blinking radar dot `w-2.5 h-2.5 rounded-full bg-[#00FF87] animate-ping` + monospace timer badge |

## Execution Steps

1. Identify the visual tier: base page (`#0D0D0D`), navigation header/bar (`#121214` glass), or Bento card (`#1C1C1E`).
2. Apply typographic hierarchy: uppercase kicker (`text-[11px] font-extrabold tracking-widest text-[#00FF87]`), page heading (`text-2xl sm:text-3xl font-black text-white tracking-tight`), or card title (`text-base sm:text-lg font-black text-white`).
3. Wire micro-interactions: tactile active press (`active:scale-[0.97]`), 0.15s cubic-bezier transitions, and neon shadows on active controls.
4. Ensure gym UX ergonomics: minimum 48px hitboxes, safe-area padding, mobile input sizing (>=16px), and collapsible disclosure.
5. Verify visual contrast, dark theme consistency, and responsive layouts across mobile and desktop.

## Output Contract

Report components modified, styling tokens applied, UX laws honored (Fitts', Hick's, Doherty, etc.), and confirmation of mobile touch target / safe area compliance.

## References

- [Design tokens & UX laws guide](references/design-tokens-and-ux-laws.md)
- [Base stylesheet](../../../src/index.css)
- [Bento card implementation](../../../src/components/RoutineList.tsx)
- [Exercise card & progressive disclosure](../../../src/components/ExerciseCard.tsx)
