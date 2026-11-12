# Modern Web Guidance

Last verified: 2026-11-12

## Objective

Make Google's modern web platform guidance available to project agents.

## Problem and scope

Agents need discoverable, current guidance for browser features and accessibility. Install the upstream skill locally and document when to use it without changing application dependencies or runtime behavior.

## Constraints

Preserve WorkoutLog's project instructions, offline-first behavior, browser compatibility, and pnpm conventions.

## Tasks

- [x] MWG-1: Review upstream installation and create a working branch.
- [x] MWG-2: Install the skill and document its scope and precedence.
- [x] MWG-3: Verify installation and record evidence.

## Acceptance criteria

The skill is discoverable from the repository, its CLI can search and retrieve guidance using pnpx, and project instructions remain authoritative.

## Verification and progress

Installed the upstream skill with the installer Git method. `pnpx modern-web-guidance@latest search 'accessible modal dialog' --skill-version 2026_11_09-5bcc021b` returned relevant results, and `pnpx modern-web-guidance@latest retrieve dialog` produced the guide. The initial installer download failed because the local Python certificate store could not verify GitHub; Git installation succeeded.

`pnpm test` passed (49 files, 342 tests), `pnpm lint` passed, and `pnpm build` passed with the expected chunk-size warning.

## Next step

Review the branch; no application runtime changes are included.
