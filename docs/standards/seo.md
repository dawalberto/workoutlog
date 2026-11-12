# Public search presence

Last verified: 2026-11-12

RepNami has one indexable public URL: `https://dawalberto.github.io/workoutlog/`.
The private app tabs are state, not public routes. Never add workout records, user data,
OAuth callback parameters, or analytics virtual page paths to the sitemap.

## Ownership

- `index.html` owns Spanish search/social metadata, the canonical, WebApplication JSON-LD,
  a startup fallback, and the persistent public guide. The guide is outside the React root
  and explicitly uses `lang="es"` because the app may change the document language.
- `public/sitemap.xml` lists the canonical URL. Omit speculative `lastmod`, priority, and
  change frequency. Add only real public URLs if the architecture grows.
- `vite.config.ts` is the sole manifest source; the PWA plugin emits the manifest and its
  HTML link. Keep the existing identity, start URL and scope for installed clients.
- `public/og-image.png` is a promotional image, not an application screenshot. Do not
  invent reviews or ratings to qualify for rich results.
- The app uses system fonts. Do not restore unused render-blocking Google Fonts requests.

## Verification and operations

Run `pnpm test`, `pnpm lint`, and `pnpm build`. Inspect `dist/index.html` for exactly one
canonical and manifest, parse the JSON-LD, and check that the sitemap and social image
return HTTP 200 after deployment. `tests/seo.test.ts` covers the source contract.

GitHub Pages serves this repository under `/workoutlog/`. Crawlers consult
`https://dawalberto.github.io/robots.txt`, not `/workoutlog/robots.txt`. The origin-level
file returned 404 during verification; this does not prohibit crawling. Do not add a
project-level file and describe it as effective crawler configuration.

TODO(human): verify the URL-prefix property in Google Search Console and submit
`https://dawalberto.github.io/workoutlog/sitemap.xml`. Property verification requires
owner access or the exact supplied verification token. Inspect indexing and real-user
Core Web Vitals there after deployment; neither rankings nor field performance can be
inferred from a successful build. A single URL does not have independently indexable
language versions; do not invent hreflang destinations for app language preferences.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[robots.txt scope](https://developers.google.com/search/docs/crawling-indexing/robots/intro),
[frontend architecture](../architecture/frontend.md).
