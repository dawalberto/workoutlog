---
mode: agent
description: "Review a WorkoutLog branch or PR against the Definition of Done (read-only)."
---

Review ${input:target:Branch name, PR number, or "working tree"} for WorkoutLog.

- Act as the [reviewer agent](../agents/reviewer.agent.md): read-only, no edits, no pushes.
- Compare against `main` (`git diff main...HEAD` for a branch).
- Apply the reviewer checklist, the [Definition of Done](../../docs/standards/git-workflow.md#definition-of-done), and the [PR template](../pull_request_template.md).
- Return the findings table (severity, file, line, issue, fix) and a one-line verdict.
