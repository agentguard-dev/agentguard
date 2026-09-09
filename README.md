# AgentGuard 🛡️ — The Multi-Harness Gate for Agent Configurations

> **English** · [Deutsch](README.de.md)

<p align="center"><img src="logo/agentguard-logo.png" alt="AgentGuard Logo" width="200"></p>

A CI gate for **AGENTS.md, skills, MCP servers & hooks** — across **Claude Code, Codex, Cursor and OpenCode equally**. Deterministic rules (12 classes, 47 tests), proven on a 30-repo real-world scan. Critical findings block the merge — or get the 3-agent RedTeam report.

[![AgentGuard](https://img.shields.io/badge/agentguard-passing-brightgreen)](https://github.com/agentguard-dev/agentguard)
[![Marketplace](https://img.shields.io/badge/marketplace-free-blue)](https://github.com/marketplace/actions/agentguard-security)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)


**Website:** index.html (= web/index.html, DE) · web/index-en.html (EN) · CHANGELOG · impressum.html/datenschutz.html (DE), legal.html/privacy.html (EN).
## Why this exists

Coding agents read your repo files and **trust them**. Attackers hide instructions in:

- `AGENTS.md` — instruction-override phrases followed by network calls into the shell
- Skill/tool files — invisible zero-width characters as instruction injection
- MCP configurations — typo-squatted hosts built on official service names
- Hooks — remote content piped straight into a shell
- Committed secrets (`sk-…` keys, GitHub tokens, Google API keys)

AgentGuard catches all of this **deterministically** — no LLM oracle — with
12 rule classes proven against a 12-payload attack fixture
(12/12 detected, 0 false positives on the clean control repo).

## Proof over claims

- **Real-world scan:** 30 public repos (Google, Microsoft, Nextcloud & co.) — 5 with critical findings, every one byte-verified: [REAL-WORLD-FINDINGS.md](docs/REAL-WORLD-FINDINGS.md)
- **PR #1 (benign):** comment `🛡️ AgentGuard — Note A` + green check → merge free
- **PR #2 (planted attack):** comment `Note E` + **red check → merge blocked**: [see it live](https://github.com/agentguard-dev/agentguard-demo/pull/2)
- **Dogfooding:** AgentGuard scans itself on every PR — it even got blocked by GitHub's own secret-scanning once (a fake token in a test file). The tool got hardened; so does yours.

## Quickstart

Locally:

```bash
npm ci
npm test                              # 12/12 fixtures + 47 tests
node cli.js scan --path .             # scan this repo
node cli.js scan --path . --format json --exit-on critical
```

As a GitHub Action — `.github/workflows/agentguard.yml`:

```yaml
name: AgentGuard
on: pull_request
jobs:
  agentguard:
    runs-on: ubuntu-latest
    steps:
      # Required: checks out the PR files. Without this step the workspace
      # is empty and the gate would pass without scanning anything.
      - uses: actions/checkout@v4
      - uses: agentguard-dev/agentguard@v0
        with:
          exit-on: critical    # blocks the merge on critical findings
```

> **Supply-chain notes:** `@v0` is a moving tag — for maximum safety, pin the
> full commit SHA (`agentguard-dev/agentguard@<full-sha>`) in critical repos.
> Because PR content is untrusted, AgentGuard ignores a `.agentguard-ignore`
> shipped inside the PR; use the Action's `exclude` input for sanctioned
> exceptions instead.

## Exceptions (Break-Glass)

Silent bypasses (`exclude`, `exit-on: never`) are the most common way CI
gates quietly die. Use a **break-glass waiver** instead: open a waiver
issue (template "Break-Glass-Ausnahme", label `break-glass`), reference it
as `waiver-issue`, and let it expire automatically (max. 30 days). With
`strict: true`, a suspension without a receipt fails the job.

- Policy: [docs/BREAK-GLASS.md](docs/BREAK-GLASS.md)
- Guardian workflow (weekly expiry check): [workflow-templates/break-glass-guard.yml](workflow-templates/break-glass-guard.yml)

Or install it from the [GitHub Marketplace](https://github.com/marketplace/actions/agentguard-security).

## Pro — the PR bot & RedTeam

- **Pro ($19/repo/mo):** GitHub App with automatic PR comments + check-run gates
- **Audit ($499 one-time):** prioritized report + fix list within 48 h
- **RedTeam ($499/quarter):** 3-agent attack (attacker → defender → auditor) with risk matrix

Live demo: [agentguard-demo](https://github.com/agentguard-dev/agentguard-demo) — the bot comments on every PR and blocks critical findings.

## Architecture

```text
Repo → walkFiles (exclude node_modules/.git/…) → 12 deterministic rules
     → optional ecc-agentshield engine layer (best-effort)
     → A–F grading (critical=100 … info=3)
     → text | json | markdown | GitHub summary · exit 2 above threshold
```

- `src/rules.js` — the 12 rule classes (pure functions, no dependencies)
- `src/scanner.js` — orchestration + `.agentguard-ignore` support
- `src/findings.js` — grading + formatters
- `server/app.js` — Pro server (GitHub App webhook → scan → comment → check-run)
- `scripts/redteam.js` — 3-agent RedTeam pipeline
- `test/fixtures/vulnerable/` — 12 real attack payloads · `test/fixtures/clean/` — control repo

## Badge for your repo

```markdown
[![AgentGuard](https://img.shields.io/badge/agentguard-passing-brightgreen)](https://github.com/agentguard-dev/agentguard)
```

## Docs

- [Architecture ADR-001](docs/ADR-001-architecture.md) · [DE](docs/de/ADR-001-architecture.md)
- [Break-Glass governance ADR-002](docs/ADR-002-break-glass-governance.md) · [DE](docs/de/ADR-002-break-glass-governance.md)
- [Break-Glass policy](docs/BREAK-GLASS.md) · [DE](docs/de/BREAK-GLASS.md)
- [Security & threat model](docs/SECURITY.md) · [DE](docs/de/SECURITY.md)
- [Verified real-world findings](docs/REAL-WORLD-FINDINGS.md) · [DE](docs/de/REAL-WORLD-FINDINGS.md)
- [Pro server (PR bot)](docs/PRO-LAUNCH.md) · [DE](docs/de/PRO-LAUNCH.md)
- [RedTeam pipeline](docs/REDTEAM.md) · [DE](docs/de/REDTEAM.md)

## License

MIT — the engine and the free Action stay free forever. Pro features (PR comments, rule editor, RedTeam reports) are sold as a service.
