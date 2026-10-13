# Glossary

Domain and sync terms with their code identifiers and Spanish UI labels.

Last verified: 2026-10-13

UI labels were checked in `src/components/` (file noted when not obvious). "—" means the term has no user-facing label.

## Training domain

| Term | Meaning | Code identifier | UI label (Spanish) |
|---|---|---|---|
| Routine | Named workout plan with ordered exercises | `Routine` ([`src/types.ts`](../../src/types.ts)), table `routines` | "Rutinas" (tab, [`BottomTabBar.tsx`](../../src/components/BottomTabBar.tsx)) |
| Routine exercise | Exercise inside a routine, with its sets; optional link to a catalog entry | `Exercise` (`definitionId?`), table `routine_exercises` | "Ejercicios" (in routine view) |
| Catalog exercise | Reusable exercise definition with defaults (technique, media) | `ExerciseDefinition`, table `exercise_definitions` | "Ejercicios" (tab); "Catálogo Maestro" ([`ExerciseCatalog.tsx`](../../src/components/ExerciseCatalog.tsx)); "Catálogo y técnica" (sidebar) |
| Set | One set: reps, weight (kg), rest (seconds) | `WorkoutSet`, table `workout_sets` | "Serie" ([`ExerciseCard.tsx`](../../src/components/ExerciseCard.tsx)) |
| Reps | Repetitions in a set | `WorkoutSet.reps` | "Reps" |
| Weight | Load in kg | `WorkoutSet.weight` | "Peso" |
| Rest | Rest time after a set | `WorkoutSet.restSeconds`, `ActiveRestTimer` | "Descanso" |
| Edit mode | Modify a routine's structure | `subMode === 'edit'` in `RoutineView`; `isExecutionMode={false}` on `ExerciseCard` | "Editar" ([`RoutineView.tsx`](../../src/components/RoutineView.tsx)) |
| Execute mode | Perform a routine, ticking sets | `subMode === 'execute'`; `isExecutionMode={true}` | "Entrenar" |
| Active session | Routine currently being performed | `ActiveWorkoutSession` (`routineId`, `startedAt`, `completedSetIds`), tables `active_workout_sessions`, `active_session_completed_sets` | "Entrenamiento en curso" ([`ActiveWorkoutTopBanner.tsx`](../../src/components/ActiveWorkoutTopBanner.tsx)) |
| Finish workout | End the session and save to history | `useWorkoutSession` | "Finalizar" |
| Workout history | Saved completed sessions with metrics | `WorkoutHistoryLog`, tables `workout_history`, `workout_history_exercises` | "Historial" (tab); "Historial de Entrenamientos" |
| Workout summary | Post-session summary | `WorkoutCompletionSummary`, `WorkoutSummaryModal` | "Resumen" |
| RM | Repetition maximum (e.g. 1RM) tracked per exercise | `ExerciseRmLog`, `RmRecord`, tables `rm_logs`, `rm_records` | "RMs" (tab); "1RM" |
| Personal record | New best RM | `RmRecordAlertModal`, `useRmTracker` | "Nuevo récord!", "Récord personal" |
| Diary | Dated notes per exercise | `ExerciseDiary`, `ExerciseDiaryEntry`, tables `exercise_diaries`, `exercise_diary_entries` | "Diario" (tab); "Diario de Ejercicios" |
| Feeling | Diary entry mood: `good` / `neutral` / `bad` | `DiaryFeeling` | "Sensación en la sesión" ([`ExerciseDiaryView.tsx`](../../src/components/ExerciseDiaryView.tsx)) |
| Starter data | Initial routines/exercises created as private user records | [`src/data/initialData.ts`](../../src/data/initialData.ts) | — |

## Accounts and data

| Term | Meaning | Code identifier | UI label (Spanish) |
|---|---|---|---|
| Guest | Not signed in; data only on this device | `GUEST_STORAGE_SCOPE = 'guest'` | "Solo en este dispositivo" ([`SyncStatus.tsx`](../../src/components/SyncStatus.tsx)) |
| Owner | Signed-in user; data synced | scope `owner:<userId>` | — |
| Sign in / out | Google OAuth via Supabase | `useAuth().signInWithGoogle` / `signOut` | "Continuar con Google" / "Cerrar sesión" ([`SidebarMenu.tsx`](../../src/components/SidebarMenu.tsx)) |
| Entitlement | Server answer on sync eligibility (always eligible when signed in) | `get_sync_entitlement()`, `account.isSyncEnabled` | — |
| Guest routine limit | Max routines for guests | `FREE_ROUTINE_LIMIT = 3` ([`src/utils/backup.ts`](../../src/utils/backup.ts)) | — |
| Premium / Free (legacy) | Former billing tiers; now means signed-in vs guest. T3 removes this naming in this branch. | `premiumActive`, `isPremiumActive` | "Plan Free", "Premium" (legacy copy) |
| Backup | JSON export/import of app data | `src/utils/backup.ts`, `DataBackupModal` | "Copia de seguridad (Importar / Exportar JSON)" |
| Merge import | Combine backup with current data | backup import mode | "Combinar con los datos actuales" ([`DataBackupModal.tsx`](../../src/components/DataBackupModal.tsx)) |
| Overwrite import | Replace current data with backup | backup import mode | "Sobrescribir toda la información actual de la app" |

## Sync

| Term | Meaning | Code identifier | UI label (Spanish) |
|---|---|---|---|
| Outbox | Local queue of unpushed changes | `sync_outbox` store, `SyncQueueEntry` | "Cambios pendientes" |
| Operation ID | UUID idempotency key per push | `operationId`, `p_operation_id` | — |
| Base revision | Server revision the client last saw for a record | `baseRevision` | — |
| Server revision | Global monotonic counter value assigned on every accepted write | `server_revision`, `private.next_sync_revision()` | — |
| Sync cursor | Highest pulled revision per table | `sync_cursors` store, `getServerCursor` | — |
| Tombstone | Soft-deleted row kept so deletions sync | `deleted_at` | — |
| Stale conflict | Push rejected because the server row moved on | `sync_stale_revision_conflict` | "Error de sincronización" |
| Drain round | One admitted snapshot of the outbox during a push pass | `MAX_PUSH_DRAIN_ROUNDS` | — |
| Sync status | Current sync state | `useSync` `idle \| syncing \| synced \| error` | "Sincronizando", "Sincronizado", "Error de sincronización", "Sin conexión", "Listo para sincronizar"; button "Reintentar" |

## Related

- [Frontend–backend strategy](../architecture/frontend-backend-strategy.md)
- [Backend architecture](../architecture/backend.md)
- [Frontend architecture](../architecture/frontend.md)
- [Docs index](../README.md)
