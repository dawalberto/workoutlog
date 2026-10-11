# ADR 0003: Static PWA hosted on GitHub Pages

Records why the frontend is a static, installable PWA served from GitHub Pages.

Last verified: 2026-10-11

## Status

Accepted.

## Context

- The app needs no server rendering; all data is local or in Supabase.
- Users want it installable on phones and usable offline.

## Decision

- Build with Vite to static files and deploy `dist/` to GitHub Pages via [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) on push to `main` (PRs build only).
- Vite `base: '/workoutlog/'`; OAuth redirects use `import.meta.env.BASE_URL`.
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`, Workbox precache, Spanish manifest.
- Build-time config from GitHub repository variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Consequences

| Positive | Negative / cost |
|---|---|
| Free hosting, no runtime to operate | Sub-path base (`/workoutlog/`) must be respected in URLs and redirects |
| Offline app shell, installable | Old bundles can keep running until the service worker updates; contract changes must be backward compatible |
| Simple deploy = merge to `main` | No server-side routes, headers, or push endpoint |

## Evidence

- `9517191 Add GitHub Pages deployment`, `92503c2 fix: format import statement and add base path configuration`
- `bbf87d1 feat: transform app into a PWA`, `5c2dbbb feat: add PWA installation banner for mobile`
- `90d9bcb ci(pages): inject Supabase build variables`
- [`vite.config.ts`](../../vite.config.ts), [`src/main.tsx`](../../src/main.tsx)

## Related

- [Architecture overview](../architecture/overview.md#deployment-topology)
- [Frontend architecture](../architecture/frontend.md#pwa-and-service-worker)
- [Docs index](../README.md)
