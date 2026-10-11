# WorkoutLog Design Tokens & UX Laws Reference

This document provides the authoritative visual tokens, component anatomy, and applied UX laws for WorkoutLog's Neon Bento design system.

---

## 1. Color Palette & Surface Tokens

| Token | CSS / Hex | Tailwind Equivalent | Purpose / Usage |
|---|---|---|---|
| `--bg-base` | `#0D0D0D` | `bg-[#0D0D0D]` | True OLED pitch black base background. |
| `--bg-surface` | `#121214` / `#18181B` | `bg-[#121214]` / `bg-[#18181B]` | Navigation bar, headers, and sheet backgrounds (often with `/90` and `backdrop-blur-xl`). |
| `--bg-card` | `#1C1C1E` | `bg-[#1C1C1E]` | Standard Bento card background. |
| `--bg-card-elevated`| `#242428` | `bg-[#242428]` | Hovered, elevated, or modal card surfaces. |
| `--accent-neon` | `#00FF87` | `text-[#00FF87]`, `bg-[#00FF87]` | Athletic electric neon green: primary actions, completed sets, active workout indicator. |
| `--accent-cyan` | `#00E5FF` | `text-[#00E5FF]`, `bg-[#00E5FF]` | Electric cyan: volume, secondary stats, tech contrast. |
| `--accent-gold` | `#F59E0B` | `text-amber-400`, `bg-amber-500/15` | Amber/Gold: Personal Records (PR), 1RM badges, trophies. |
| `--text-primary` | `#FFFFFF` | `text-white` | Headings, primary metrics, active tab labels (`font-black` or `font-extrabold`). |
| `--text-secondary` | `#A1A1AA` | `text-[#A1A1AA]` or `text-zinc-400` | Subtitles, descriptions, secondary values. |
| `--text-muted` | `#71717A` | `text-[#71717A]` or `text-zinc-500` | Placeholder text, units (kg, reps, s), inactive icons. |
| `--border-subtle` | `rgba(255,255,255,0.08)` | `border-white/[0.08]` | Default hairline border for dark mode surface separation. |
| `--border-glow` | `rgba(0,255,135,0.35)` | `border-[#00FF87]/40` | Active, focused, or completed item border. |

### Glow & Shadow Utilities
- **Primary Neon Glow**: `shadow-[0_0_20px_rgba(0,255,135,0.35)]` or `.neon-glow`
- **Intense Glow (FAB/Primary CTA)**: `shadow-[0_0_35px_rgba(0,255,135,0.35)]` or `.neon-glow-lg`
- **Cyan Stat Glow**: `shadow-[0_0_20px_rgba(0,229,255,0.25)]` or `.cyan-glow`
- **Amber PR Glow**: `shadow-[0_0_8px_rgba(245,158,11,0.2)]`
- **Subtle Card Lift**: `shadow-lg`, `shadow-xl`

---

## 2. Bento Grid System & Card Anatomy

### Grid Conventions
- **Standard Dashboard**: `grid grid-cols-2 gap-3 sm:gap-4 my-6`
- **Asymmetric Highlights**: Span 2 columns (`col-span-2`) for primary active cards or charts, single columns for quick aggregate metrics.
- **Card Radius**: `rounded-2xl` for cards, `rounded-3xl` for modals and elevated dialogs.

### Anatomy of a Bento Card
```tsx
<div className="bg-[#1C1C1E] border border-white/[0.08] hover:border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-colors shadow-lg">
  {/* Header: Label + Category Icon */}
  <div className="flex items-center justify-between text-zinc-400 mb-2">
    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
      Rutinas Activas
    </span>
    <Flame className="w-4 h-4 text-[#00FF87]" />
  </div>

  {/* Value + Unit */}
  <div className="flex items-baseline gap-2">
    <span className="text-2xl sm:text-3xl font-black text-white">
      {count}
    </span>
    <span className="text-xs text-[#A1A1AA]">creadas</span>
  </div>
</div>
```

---

## 3. Typography & Hierarchy

1. **Category Kicker (Pre-header)**:
   `text-[11px] font-extrabold uppercase tracking-widest text-[#00FF87] flex items-center gap-1.5`
2. **Page Titles**:
   `text-2xl sm:text-3xl font-black text-white tracking-tight`
3. **Card Headings**:
   `text-base sm:text-lg font-black text-white tracking-tight truncate`
4. **Numerics & Timers**:
   `font-mono font-bold text-white` (or `text-[#00FF87]` for active timers)
5. **Condensed Summary Badges**:
   `font-mono text-[10px] sm:text-[11px] font-semibold bg-zinc-900 text-zinc-300 border border-white/10 px-2.5 py-1 rounded-xl`

---

## 4. Micro-Interactions & Gym Tactility

- **Tactile Tap Scaling**: Every interactive button uses `active:scale-[0.97]` or `active:scale-95` with `transition-all duration-150 cubic-bezier(0.4, 0, 0.2, 1)`.
- **Glassmorphism Panels**: `bg-[#121214]/90 backdrop-blur-xl border-t border-white/[0.08]` (BottomTabBar, AppHeader, Modals).
- **Active State Highlights**: Completed sets transition to `bg-[#00FF87]/20 border-[#00FF87]/40 text-[#00FF87]`.
- **Live Pulse**: Active workouts display a blinking radar dot (`w-2.5 h-2.5 rounded-full bg-[#00FF87] animate-ping`).

---

## 5. Applied UX Laws in WorkoutLog

### 1. Fitts' Law (Touch Targets for Sweaty Hands)
- All primary interactive elements have a minimum height of **48px** (`min-h-[48px]`).
- Critical gym actions (check set, start workout, next exercise, rest timer controls) have prominent widths and high contrast.
- Bottom tab bar and sticky controls sit comfortably in the natural thumb zone (`fixed bottom-0`).
- Always support safe-area insets (`pb-[env(safe-area-inset-bottom,0px)]`).

### 2. Hick's Law (Reduce Cognitive Load During Heavy Lifts)
- **Collapsible Exercise Cards**: Users focus on the current active set; completed or pending exercises collapse into a compact summary pill (`summaryText`).
- Secondary controls (reordering, catalog definition, backup) are isolated in dedicated modal sheets.

### 3. Jakob's Law (Gym Tracking Mental Models)
- Standard format: `Sets x Reps · Weight kg - Rest ⏱️`.
- Standard icons: Flame for routines/intensity, Dumbbell for exercises, Trophy for PRs/RMs, Calendar for history, Clock for rest timer.

### 4. Miller's Law (Chunking Information)
- Statistics and workout breakdowns are organized into digestible 2x2 Bento grids.
- Set rows present simple columns: SET #, PREVIOUS, KG, REPS, CHECK.

### 5. Doherty Threshold (Instant Feedback < 400ms)
- Tapping a set completion instantly updates the UI (optimistic state), starts the rest timer countdown, triggers haptic vibration (`triggerTimerVibration()`), and plays an audio cue (`playTimerFinishBeep()`).

### 6. Von Restorff Effect (Isolation Effect)
- In a sea of dark graphite cards (`#1C1C1E`), the eye immediately spots:
  - **Electric Neon Green (`#00FF87`)** for completed sets or active routines.
  - **Amber Gold (`#F59E0B`)** for personal record breakthroughs.

### 7. Mobile Ergonomics & iOS Safeguards
- Prevent auto-zoom on mobile inputs: font size must never fall below 16px on mobile viewports (`@media screen and (max-width: 768px) { input { font-size: 16px !important; } }`).
- Disable double-tap zoom delay: `touch-action: manipulation`.
- Suppress mobile tap blue box: `-webkit-tap-highlight-color: transparent`.
