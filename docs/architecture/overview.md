# Architecture overview

How WorkoutLog's parts fit together: a static React PWA that stores data locally in IndexedDB and, for signed-in users, syncs directly with Supabase.

Last verified: 2026-10-15

## In one paragraph

WorkoutLog is a single-page React 19 + Vite app served as static files from GitHub Pages. All user data (routines, exercise catalog, active sessions, RM logs, workout history, exercise diary) lives first in the browser's IndexedDB. Guests never touch the network. Signed-in users (Google OAuth via Supabase Auth) get every local change queued in an IndexedDB outbox and pushed to Postgres through one RPC (`sync_push`); remote changes are pulled per table by server revision. There is **no custom server**: Supabase (Auth, Postgres, RLS, RPCs) is the whole backend.

Server-side push dispatch uses the managed `send-rest-push` Supabase Edge Function; no custom server is needed. Signed-in clients register a browser subscription and schedule timer completion through authenticated RPCs, while guests continue to use local timer feedback.

## System context

```mermaid
flowchart LR
  user(["User (phone / desktop browser)"])
  subgraph browser["Browser"]
    pwa["WorkoutLog PWA<br/>React 19 + Vite"]
    sw["Service worker<br/>(vite-plugin-pwa)"]
    idb[("IndexedDB<br/>WorkoutLogDB v2")]
  end
  subgraph supabase["Supabase project"]
    auth["Supabase Auth"]
    pg[("Postgres 17<br/>RLS + RPCs")]
    fn["send-rest-push<br/>Edge Function"]
  end
  google["Google OAuth"]
  pages["GitHub Pages<br/>(static hosting)"]
  gha["GitHub Actions<br/>(CI + deploy)"]

  user --> pwa
  pwa <--> idb
  sw -- "caches app shell" --> pwa
  pages -- "serves /workoutlog/" --> sw
  pwa -- "signInWithOAuth" --> auth
  auth <--> google
  pwa -- "rpc('sync_push'), table selects" --> pg
  pwa -- "subscription + timer RPCs" --> pg
  pg -- "pg_cron / pg_net" --> fn
  fn -- "Web Push" --> sw
  gha -- "build + deploy dist/" --> pages
```

## Components

| Component | Responsibility | Code |
|---|---|---|
| Composition root and shell | Boots lifecycle adapters, applies readiness gates, composes tabs and overlays | [`src/App.tsx`](../../src/App.tsx), [`src/components/AppShell.tsx`](../../src/components/AppShell.tsx) |
| App state | Zustand store composed from domain slices; narrow selectors and component hooks | [`src/store/`](../../src/store/appStore.ts) |
| Lifecycle adapters | Hydration/persistence, auth, sync, and rest-push scheduling; mounted once by app bootstrap | [`src/hooks/useAppBootstrap.ts`](../../src/hooks/useAppBootstrap.ts), [`src/store/persistence.ts`](../../src/store/persistence.ts), [`src/hooks/useRestPush.ts`](../../src/hooks/useRestPush.ts) |
| UI components | Feature containers and reusable presentation components (Spanish copy) | [`src/components/`](../../src/components/RoutineView.tsx) |
| Local DB service | IndexedDB stores, scopes, outbox, cursors, metadata | [`src/services/db.ts`](../../src/services/db.ts) |
| Sync queue | Diff collections → outbox changes, ordering, apply remote | [`src/services/sync-queue.ts`](../../src/services/sync-queue.ts) |
| Cloud sync | Push/pull against Supabase, retries, conflict handling | [`src/services/cloud-sync.ts`](../../src/services/cloud-sync.ts) |
| Supabase client / auth | Client factory (nullable), Google OAuth helpers | [`src/services/supabase.ts`](../../src/services/supabase.ts), [`src/services/auth.ts`](../../src/services/auth.ts) |
| Database | 12 owner-scoped tables, sync metadata trigger, RPCs | [`supabase/migrations/`](../../supabase/migrations/20261007135400_create_private_workout_data.sql) |

Details: [frontend](frontend.md), [backend](backend.md), [contract](frontend-backend-strategy.md).

## Data flow: lifecycle of a local edit

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant C as Component (e.g. ExerciseCard)
  participant A as Zustand app store
  participant S as persistence adapter
  participant D as IndexedDB (db.ts)
  participant Q as Outbox (sync-queue.ts)
  participant Y as useSync / cloud-sync.ts
  participant P as Supabase Postgres

  U->>C: edits a field, then blurs
  C->>A: onUpdate... (commit on blur)
  A->>S: changed collection observed after scope hydration
  S->>D: setScopedStoredItem(collection, scope)
  D->>Q: diffSyncCollection(previous, next)
  Q-->>D: changes
  D->>D: same transaction: write app_state, record_metadata, sync_outbox
  D-->>Y: pending changes trigger push (if signed in + online)
  Y->>P: rpc("sync_push", operationId, changes up to 100)
  P-->>Y: acknowledgement with new server_revision per change
  Y->>D: acknowledge op, save server revisions
  Y->>P: select rows where server_revision > cursor (per table, 500 per page)
  P-->>Y: remote rows, including tombstones
  Y->>D: apply remote changes, advance cursors
  D-->>A: merged collections refresh store state
```

The state write, record metadata, and outbox entries are written in one IndexedDB transaction (`writeStoredItems`, [`src/services/db.ts`](../../src/services/db.ts) around lines 281–350). Guests stop there: the `guest` scope keeps its outbox but nothing is pushed; on first sign-in guest data and outbox move to the owner scope once (`transferGuestDataToOwnerOnce`). The exact algorithm, limits, and error handling are specified in the [frontend–backend strategy](frontend-backend-strategy.md).

Rest-timer Web Push is separate from workout-data sync: `useRestPush` observes the in-memory timer and signed-in identity, while a serial controller registers the subscription and reconciles one server schedule through dedicated RPCs. Timer state and push subscription details are not added to IndexedDB or the sync contract. The server sends the push through `send-rest-push`; the classic handler imported by the production service worker displays the system notification while the page can be suspended.

## Deployment topology

```mermaid
flowchart LR
  dev["Developer push / PR"] --> ci["ci.yml<br/>frontend: test, lint, build<br/>database: start, reset, test, lint"]
  dev --> dep["deploy.yml build<br/>(VITE_* from repo variables)"]
  dep -- "push to main / manual" --> pages["GitHub Pages<br/>https://dawalberto.github.io/workoutlog/"]
  dep -. "PR: build only" .-> stop(["no deploy"])
  mig["Supabase CLI (manual)"] --> cloud[("Supabase Cloud project")]
  pages -- "browser calls" --> cloud
```

| Concern | How |
|---|---|
| Frontend | [`deploy.yml`](../../.github/workflows/deploy.yml) builds on push to `main`, PRs to `main`, and manual dispatch; deploys only when the event is not a PR. |
| Base path | Vite `base: '/workoutlog/'` ([`vite.config.ts`](../../vite.config.ts)). |
| Build config | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_GA_MEASUREMENT_ID` from GitHub repository **variables** (public values). |
| Database | Migrations are **not** applied by CI; apply production migrations before deploying frontend changes that depend on them. |
| Client updates | Service worker `registerType: 'autoUpdate'`; deployed clients may run an older bundle until the SW updates — see [evolving the contract](frontend-backend-strategy.md#evolving-without-breaking-clients). |

## Related

- [Frontend architecture](frontend.md)
- [Backend architecture](backend.md)
- [Frontend–backend strategy](frontend-backend-strategy.md)
- [ADR 0001 – Local-first IndexedDB](../decisions/0001-local-first-indexeddb.md)
- [ADR 0002 – Supabase-only backend](../decisions/0002-supabase-only-backend.md)
- [ADR 0003 – Static GitHub Pages PWA](../decisions/0003-static-github-pages-pwa.md)
- [Root README](../../README.md)
