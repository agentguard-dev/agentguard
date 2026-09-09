# Break-Glass-Policy — Ausnahmen vom Gate

> **English** · [Deutsch](de/BREAK-GLASS.md)

AgentGuard blocks merges on findings. Sometimes a finding is a verified
false positive — then the team needs a way to keep working **without**
quietly turning the gate into fiction. This policy defines the one
supported exception path: **break-glass waivers**.

## Why this exists

> "The bypass path can quietly become the real policy surface."

A silent bypass (`exclude`, `exit-on: never`) is invisible, permanent and
undocumented. After an incident, nobody can reconstruct why the gate was
off — or even that it was. Break-glass makes every exception:

- **Reviewable** — a second person must sign off (mandatory reviewer field)
- **Time-bound** — maximum 30 days, enforced by the issue template and the
  Guardian workflow
- **Traceable** — the waiver issue *is* the immutable receipt: public,
  permanent, linked from every affected pipeline run

## When a waiver is legitimate

- A rule produces a **verified false positive** (reproduced, documented)
- A temporary, bounded exception during a migration or rollout

## When a waiver is never legitimate

- For a finding that is a **real attack** or a real committed secret —
  fix the content, don't waive the gate
- As a permanent workaround — repeated renewals are a policy violation

## The process

1. **Open a waiver issue** via the template
   „Break-Glass-Ausnahme (Gate-Waiver)" (label `break-glass`) with:
   finding (rule id + file), reason, expiry (YYYY-MM-DD, ≤ 30 days),
   reviewer, restoration step.
2. **Reference it in the workflow**:
   ```yaml
   - uses: agentguard-dev/agentguard@v0
     with:
       exit-on: never
       waiver-issue: "123"
   ```
   The pipeline run now links to the receipt in its step summary.
3. **Optional: fail-closed** — set `strict: true`: `exit-on: never`
   without a `waiver-issue` then fails the job.
4. **The Guardian enforces expiry**: copy
   `workflow-templates/break-glass-guard.yml` into your repo (weekly
   schedule). Expired waivers get commented and a warning issue is filed.
   Pro customers get automatic re-sharpening PRs instead.

## What is NOT enforced (be honest)

An admin who can edit workflow files can always remove the gate entirely —
no tool can prevent that. Break-glass converts *silent drift* into a
*conscious, reviewed, expiring decision*. That is the whole point:
the bypass stops being the quiet default and becomes a documented event
with a deadline and a receipt.
