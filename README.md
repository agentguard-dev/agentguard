# AgentGuard 🛡️

> Der Türsteher für deine Coding-Agents. Prüft bei jedem PR die Agent-Konfiguration
> auf Prompt-Injection, Secrets und Permission-Traps — bevor sie gemergt werden.

[![AgentGuard status](https://img.shields.io/badge/agentguard-passing-brightgreen)](https://github.com/agentguard-dev/agentguard)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Was ist das?

Coding-Agents (Claude Code, Codex, Cursor, OpenCode) lesen die Dateien in einem
Repo und vertrauen ihnen. Angreifer verstecken Anweisungen in
`AGENTS.md` — Instruction-Override-Phrasen, gefolgt von einem Netzwerk-Call in die ShellSkill-/Tool-Dateien — unsichtbare Zero-Width-Zeichen als Instruction-InjectionMCP-Konfigurationen — typ-squatted Hosts auf Basis offizieller Service-NamenHooks — Remote-Inhalt, der direkt in eine Shell gepipt wirdCommitteten Secrets (z. B. Keys im `sk-…`-Format oder GitHub-Token)

AgentGuard scannt all das **deterministisch** — 12 Regelklassen, getestet gegen
ein 12-Payloads-Angriffs-Fixture (100 % Erkennung, 0 False Positives auf dem
Kontroll-Repo).

## Quickstart

Lokal:

```bash
npm ci
npm test                                # 12/12 Fixtures + Grading-Tests
node cli.js scan --path .               # dieses Repo scannen
node cli.js scan --path . --format json --exit-on critical
```

Als GitHub Action — `.github/workflows/agentguard.yml`:

```yaml
name: AgentGuard
on: pull_request
jobs:
  agentguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: agentguard-dev/agentguard@v0
        with:
          exit-on: critical    # blockt den Merge bei kritischen Findings
```

## Architektur

```text
Repo → walkFiles (exclude node_modules/.git/…) → 12 Rules (deterministisch)
     → [ecc-agentshield Engine] (optional, best-effort, second layer)
     → A–F Grading (Score: critical=100 … info=3)
     → Output: text | json | markdown | GitHub-Summary · Exit 2 bei Schwelle
```
`src/rules.js` — die 12 Regelklassen (pure Funktionen, 100 % testbar, keine Deps)`src/scanner.js` — Orchestrierung + Engine-Adapter`src/findings.js` — Grading + Formatter`test/fixtures/vulnerable/` — 12 echte Attack-Payloads`test/fixtures/clean/` — Kontroll-Repo (0 Findings)`web/` — Landingpage mit deterministischer Live-Demo (`npm run demo`)

## Dokumentation
[Architektur-ADR-001](docs/ADR-001-architecture.md) — Technologie-Entscheidungen[Selbst-Audit & Sicherheit](docs/SECURITY.md) — Bedrohungsmodell des Scanners[Echtwelt-Befunde](docs/REAL-WORLD-FINDINGS.md) — verifizierte Funde aus 30-Repo-Scan[Wie der Pro-Server funktioniert](docs/PRO-LAUNCH.md) — GitHub-App + PR-Kommentare[RedTeam-Pipeline](docs/REDTEAM.md) — das Pro-Feature

## Badge für dein Repo

Zeigt in jeder README, dass Agent-Konfigurationen geprüft werden (wie ein
„build passing"-Badge):

```markdown
[![AgentGuard](https://img.shields.io/badge/agentguard-passing-brightgreen)](https://github.com/agentguard-dev/agentguard)
```

## Lizenz

MIT — die freie Action bleibt für immer kostenlos. Pro-Features (PR-Kommentare,
Regel-Editor, RedTeam-Report) werden separat vermarktet.
