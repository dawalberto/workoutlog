# Internationalization and settings

## Objective

Offer English, Spanish, Simplified Chinese, Hindi, and French throughout the application, and a device preference for the displayed weight label. Preserve all user-entered data and numerical values.

## Scope and constraints

- Detect a supported browser language on first use, falling back to Spanish. Persist an explicit choice across reloads.
- Add a settings view accessible from the sidebar. Default the weight label to kg; lb changes labels only, without conversion.
- Translate application-owned copy, accessible names, feedback, formatting, and loading states; do not translate exercise names, notes, or other user-authored values.
- Keep preferences available offline. Use the existing device-scoped IndexedDB storage and lifecycle pattern; do not change the database version or sync contract.
- Keep the user interface accessible and follow the existing Neon Bento styling.

## Tasks

- [ ] Add device-scoped preferences, browser language matching, hydration, and persistence tests.
- [ ] Add settings navigation and accessible controls.
- [ ] Introduce translation resources and replace application-owned copy across screens, dialogs, notifications, and accessibility attributes.
- [ ] Apply the selected weight label consistently across inputs, history, summaries, RM displays, and messages without changing numerical values.
- [ ] Verify offline reload, all language choices, fallback behavior, preservation of user content, and both units; update documentation.
- [ ] Run `pnpm test`, `pnpm lint`, and `pnpm build`.

## Initial findings

The frontend currently hardcodes Spanish text. Weight labels occur in components, helper functions, and feedback messages, including RM formatting and workout summaries. Device-scoped storage already exists for analytics consent and can inform the preference lifecycle.

## Progress

- Added device-scoped preference hydration and persistence, settings navigation, browser language matching, and label-only unit selection.
- Moved backup import/export from the sidebar into Settings.
- Added bundled translations for application text and locale-aware dates. Some dynamic messages and translation quality still need a complete audit in all five languages before the internationalization can be considered complete.
- Verified the French and lb selections survive reload in a browser; starter and other user-owned records retain their original text.
- Added preference and IndexedDB cleanup coverage. Full Vitest suite, typecheck, and build have been run; rerun after any further changes.
