# Estimated RM badges

## Objective and problem
Show a clearly distinguished estimated 1RM when an exercise has no recorded RM and has a usable configured load and repetitions.

## Scope and constraints
- Estimate using Epley from catalog defaults or the strongest configured routine set; do not persist estimates.
- Prefer recorded records, including repetition-based records. Omit estimates without a positive load or valid repetitions.
- Use Spanish copy and the existing badge design with a dashed, distinct border.
- Estimates assume a near-failure set; configured sets may not meet that assumption. Set count alone cannot determine 1RM.

## Tasks
- [x] T1: Implement and test estimate calculation and badge in both views.
- [x] T2: Run checks and record results.

## Acceptance criteria
Recorded RM takes precedence; valid configurations display an identified estimate; invalid or missing loads do not produce a misleading value.

## Checks and progress
Vitest: 47 files, 331 tests passed. Typecheck and production build passed. Updated affected characterization snapshots.

## Next step
Ready for review.
