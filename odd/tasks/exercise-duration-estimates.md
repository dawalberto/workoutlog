# Exercise duration estimates

## Objective
Use measured exercise durations after three completed executions with matching sets, repetitions, and weights, retaining measurements for previously used configurations.

## Scope and constraints
Record timing from first completed set to final completed set plus its configured rest. Ignore incomplete exercises. Preserve original start when sets are unchecked. Support offline persistence, backup, and signed-in synchronization, including older clients.

## Tasks
- [x] T1: Define and test timing and configuration matching.
- [x] T2: Persist and synchronize session timing and completed measurements with an additive migration.
- [x] T3: Apply averages to exercise and routine estimates; update documentation.
- [x] T4: Verify frontend, database, contract parity, compatibility, and clean migration replay.

## Acceptance criteria
- Fewer than three matching complete measurements use the existing estimate.
- Three or more use the mean; changing configuration switches cohorts and restoring it recovers earlier measurements.
- Unfinished exercises do not contribute; timing survives offline reload and sync.

## Checks and progress
Implementation and compatibility checks complete locally: 351 Vitest tests, typecheck, build, 218 pgTAP assertions and sync contract parity pass. The additive migration was applied to the existing local database without resetting it, and local migration history was repaired. Database lint exited successfully but reported pgTAP extension diagnostics. A fresh isolated local stack replayed all migrations and seed successfully. Production migration must precede frontend deployment.

## Next step
Deploy the migration before the frontend.

## Follow-up: display whole seconds

- [x] T5: Round displayed duration estimates to whole seconds, including minute and hour boundaries; retain precise stored measurements. Verified 353 Vitest tests, typecheck, and build.
