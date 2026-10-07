# WorkoutLog

WorkoutLog keeps routines, exercises, sessions, records, history, and diary entries in browser IndexedDB so the app remains usable offline.

## Account configuration

Copy `.env.example` to `.env.local` and configure the public Vite values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_BACKEND_API_ORIGIN`

The Supabase project must enable Google OAuth and configure its redirect URLs. Missing Supabase values, a disabled provider, or an unavailable account API leave local workflows available and show an account error instead of interrupting the app.

Signed-in caches use separate IndexedDB scopes for each account. On the first confirmed active Premium entitlement, the app merges the existing guest collections into that account in one IndexedDB transaction, records the one-time migration marker, and clears the guest copy. Existing account records win ID collisions. Signing out returns to the guest scope; it does not copy account records back.

Free and expired accounts can create up to three routines. Premium expiry disables Premium eligibility while retaining that account's local cache. This work unit adds authentication and entitlement state only; it does not send workout data to a cloud sync endpoint.
