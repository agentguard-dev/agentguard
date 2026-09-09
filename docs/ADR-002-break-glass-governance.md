# ADR-002 — Break-Glass Governance for Gate Exceptions

> **English** · [Deutsch](de/ADR-002-break-glass-governance.md)

Status: accepted (2026-09-09)

## Context

A dev.to reader pointed out after the v0.2.1 launch post:

> "The self-blocked PR is a strong demonstration because it proves the gate
> has authority over its own maintenance path. One extra safeguard worth
> documenting is a separate, reviewable break-glass workflow with a
> time-bound exception and an immutable receipt. Otherwise the bypass path
> can quietly become the real policy surface."

AgentGuard offers silent, permanent bypasses (`exclude`, `exit-on: never`).
Silent bypasses are the most common way CI security gates die: an exception
made under time pressure becomes the norm, and after an incident nobody can
reconstruct why the gate was off — or that it was. We needed an exception
path that is reviewable, time-bound and traceable, without adding friction
that drives teams to remove the gate entirely.

## Decision

Implement **break-glass waivers** as the single supported exception path,
in three layers:

1. **Policy** — `docs/BREAK-GLASS.md` (DE/EN): when waivers are legitimate
   (verified false positives only), never (real attacks/secrets), max. 30
   days, mandatory reviewer.
2. **Receipt & expiry** — issue template `break-glass.yml` (label
   `break-glass`) as the *immutable receipt*; action inputs `waiver-issue`
   (links the receipt into the step summary) and `strict` (fail-closed:
   `exit-on: never` without receipt); `scripts/action-gate.sh` extracted
   from `action.yml` so the governance logic is testable;
   `scripts/guardian.js` + `workflow-templates/break-glass-guard.yml`:
   weekly expiry check that comments expired waivers and files a warning
   issue.
3. **Pro** — the PR bot will escalate expiries with automatic
   re-sharpening PRs (roadmap item; the free guardian comments + warns).

## Alternatives considered

- **Hard-ban silent bypasses now** (breaking change) — rejected: existing
  adopters would break without a migration path; `strict: true` is the
  opt-in path, hard default in a later major version.
- **Do nothing / document only** — rejected: documentation alone does not
  produce receipts or deadlines; the drift the reader describes would
  continue.
- **Admin-level enforcement (e.g. required checks)** — complementary, not
  an alternative: no tool can stop an admin from removing the workflow;
  our goal is visibility + expiry, not impossible coercion.

## Consequences

- **Positive:** every exception becomes a public, reviewable, expiring
  event; the step summary of a suspended gate always carries the receipt
  link; post-incident reconstruction becomes possible; enterprise-facing
  compliance story improves.
- **Negative:** one more input surface (`waiver-issue`, `strict`) to
  document and test; the Guardian template requires a scheduled workflow in
  user repos (opt-in).
- **Honest limitation:** break-glass cannot prevent an admin from deleting
  the workflow entirely — it converts silent drift into a conscious,
  reviewed, expiring decision.
