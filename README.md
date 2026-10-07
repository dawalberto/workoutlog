# WorkoutLog

WorkoutLog keeps routines, exercises, sessions, records, history, and diary entries in browser IndexedDB so the app remains usable offline.

## Local development

Use Bun 1.4.2, matching the CI toolchain:

```sh
bun install --frozen-lockfile
bun run dev
bun run test -- --reporter=dot
bun run lint
bun run build
```

## Account configuration

Copy `.env.example` to `.env.local` and configure the public Vite values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_BACKEND_API_ORIGIN`

Premium cloud sync requires the configured Supabase public URL, publishable key, and backend API origin above. Free remains local-only and makes no cloud sync requests.

The Supabase project must enable Google OAuth and configure its redirect URLs. Missing Supabase values, a disabled provider, or an unavailable account API leave local workflows available and show an account error instead of interrupting the app.

Signed-in caches use separate IndexedDB scopes for each account. On the first confirmed active Premium entitlement, the app merges the existing guest collections into that account in one IndexedDB transaction, records the one-time migration marker, and clears the guest copy. Existing account records win ID collisions. Signing out returns to the guest scope; it does not copy account records back.

Free and expired accounts can create up to three routines. Premium expiry disables Premium eligibility while retaining that account's local cache.

## Premium cloud sync

Premium sync uses the authenticated user's bearer token with `GET /api/v1/sync/pull?cursor=<decimal revision>&limit=500` and `POST /api/v1/sync/push`. Pull pages apply owner-scoped rows and tombstones to IndexedDB with their decimal revision cursor in one transaction. The local routines, exercise catalog, active sessions, RM logs, workout history, and exercise diary remain usable when sync is offline or unavailable.

The outbox replays each queued operation with its stable operation ID and base revision; push requests stay within the API's 100-change limit and acknowledgements advance local record revisions. A stale-revision `409` triggers an authoritative pull, lets newer server-accepted rows win for the conflicting record, and keeps unrelated queued edits. Network and service retries are bounded, and failures do not clear local records or pending work. Signed-out, offline, Free, and expired-Premium states make no sync requests.

The app shows local-only, pending, syncing, synced, offline-safe, and recoverable error states. A retry is available after an online sync failure; local workout editing remains available in every state.

Workout history sync preserves nullable total-set and completion metrics. Legacy records whose values are unknown remain `NULL` rather than being presented as zero.
