# Search discoverability

Last verified: 2026-11-12

## Objective and problem
Improve RepNami's public search presence and ship the verified change to production. The document has metadata but an empty HTML body, duplicate manifest sources, and disables zoom.

## Scope and constraints
Keep the existing app URL, local data, authentication, translations, and service-worker policy. No dependencies, backend changes, fabricated reviews, or private-data indexing. Public explanatory content is Spanish and explicitly language-tagged. GitHub Pages project hosting cannot publish the origin-level robots.txt from this repository.

## Tasks and acceptance
- [x] SEO-1: Publish useful server-delivered content, consistent metadata/structured data, and a canonical sitemap; retain public content after React mounts.
- [x] SEO-2: Fix zoom and unnecessary font requests; consolidate manifest metadata without changing identity/scope.
- [x] SEO-3: Add regression coverage, run all frontend gates and Edge Function tests, inspect production output, document limitations.
- [ ] SEO-4: Push, integrate through develop/main, wait for CI and Pages, and verify live responses (authorized in the request).

## Verification evidence
363 tests across 54 files pass; pnpm lint and pnpm build pass (existing chunk warning). Built HTML has one manifest/canonical and valid JSON-LD. Social image is 1200×630. Chrome desktop and 390px mobile checks confirm persistent content, working disclosures, no horizontal overflow and 48–72px controls. Local pnpm fn:test cannot run: installed Deno reports Bad CPU type; CI will verify the Edge Function.

## Next step
Push the verified work, require CI success, integrate into develop/main and verify Pages.
