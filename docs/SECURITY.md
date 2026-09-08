# SECURITY.md — AgentGuard Self-Audit

> **English** · [Deutsch](de/SECURITY.md)

> AgentGuard is itself a security tool. This document describes the ongoing
> self-audit. Regenerate with `npm run self-scan` (engine off for
> determinism) — findings are maintained here.

## Audit status (initial)

| Area | Status | Note |
|---|---|---|
| Secrets in git history / files | ✅ clean | No credentials: all fixture keys are fake (format-valid but not real content) |
| Rule file itself cannot be injected | ✅ | Rules are code, not prompts; no LLM in the path |
| Network | ✅ none in the scan path | Engine adapter only calls the local `agentshield` binary |
| Sandbox | ⚠️ known | Engine `--sandbox` mode is optional, not the default; the CLI never executes repo code (read-only) |
| Webhook (later, GitHub App) | 🔜 pending | HMAC verification required before any Pro launch (implemented in server/app.js) |

## Threat model (what the scanner does NOT do)

- **No code execution:** reads files as text; never executes target repo content
  (no `npm install`, no hooks, no shell).
- **No network during scan:** `execFileSync` only calls the local engine binary
  with fixed arguments.
- **Rule tuning as attack vector:** anyone who can write `.agentguard-ignore`
  can suppress findings — same as `.eslintignore`. Documented as an accepted
  privilege (repo write access cannot be prevented).

## Reporting

To report a security issue, open a private ticket on this repository's issues
or contact the maintainer via the repo. Please describe the impact and how to
reproduce; we respond within 7 days.
