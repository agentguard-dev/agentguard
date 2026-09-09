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
- **Ignore-file is not trusted in CI:** a PR author could ship a
  `.agentguard-ignore` that suppresses findings on their own PR. Therefore the
  Action and the Pro server ignore `.agentguard-ignore` from PR content
  (`--no-ignore` / `honorIgnoreFile: false`). Sanctioned exceptions go through
  the Action's `exclude` input, which lives in the workflow file (base branch).

## Known limitations

Deterministic regex rules are a hygiene layer, not a security boundary —
obfuscated or novel attacks can pass. Known gaps:

- **Excluded directories are not scanned:** `node_modules/`, `.git/`, `dist/`,
  `build/`, `vendor/`, `.next/`, … — agent configs placed there are invisible
  to the scanner.
- **Secret detection is format-based:** only known token shapes (sk-, ghp_,
  GitHub PATs, npm, Stripe, Slack webhooks, AWS AKIA, Google AIza, Slack xox,
  private-key blocks) are matched. Use a dedicated secrets scanner (e.g.
  gitleaks) for high-entropy detection.
- **Docs exemption:** files under `docs/` or named like `SECURITY.md`,
  `REDTEAM.md`, `ATTACK.md` are exempt from the instruction-override rule so
  threat write-ups are not flagged for quoting the attacks they describe.
- **MCP allowlist:** unlisted-but-legitimate MCP hosts produce a medium finding;
  the squatted-host heuristic is prefix-based and needs the allowlist to
  disambiguate official brand hosts.
- **Webhook/Pro limits:** webhook bodies are capped at 1 MB, tarball downloads
  at 100 MB; tarballs containing symlinks, hardlinks, devices or FIFOs are
  rejected (repo symlinks in PR tarballs are not supported).

## Reporting

To report a security issue, use **GitHub's private vulnerability reporting**
(Security → Vulnerability reporting). It keeps the report private until the
issue is fixed. Alternatively, reach the maintainers via the repository.
Please describe the impact and how to reproduce; we respond within 7 days.
