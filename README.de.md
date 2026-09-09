# AgentGuard 🛡️ — Das Multi-Harness-Gate für Agent-Konfigurationen

> [English](README.md) · **Deutsch**

<p align="center"><img src="logo/agentguard-logo.png" alt="AgentGuard Logo" width="200"></p>

Ein CI-Gate für **AGENTS.md, Skills, MCP-Server & Hooks** — in **Claude Code, Codex, Cursor und OpenCode** gleichermaßen. Deterministische Regeln (12 Klassen, 47 Tests), bewiesen im 30-Repo-Echtwelt-Scan. Kritische Findings blocken den Merge — oder als RedTeam-3-Agenten-Analyse.

[![AgentGuard](https://img.shields.io/badge/agentguard-passing-brightgreen)](https://github.com/agentguard-dev/agentguard)
[![Marketplace](https://img.shields.io/badge/marketplace-free-blue)](https://github.com/marketplace/actions/agentguard-security)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)


**Website:** index.html (= web/index.html, DE) · web/index-en.html (EN) · CHANGELOG · impressum.html/datenschutz.html (DE), legal.html/privacy.html (EN).
## Warum es das gibt

Coding-Agents lesen die Dateien in deinem Repo und **vertrauen ihnen**. Angreifer verstecken Anweisungen in:

- `AGENTS.md` — Instruction-Override-Phrasen, gefolgt von Netzwerk-Calls in die Shell
- Skill-/Tool-Dateien — unsichtbare Zero-Width-Zeichen als Instruction-Injection
- MCP-Konfigurationen — typ-squatted Hosts auf Basis offizieller Service-Namen
- Hooks — Remote-Inhalt, der direkt in eine Shell gepipt wird
- Committeten Secrets (`sk-…`-Keys, GitHub-Tokens, Google-API-Keys)

AgentGuard erkennt all das **deterministisch** — ohne LLM-Orakel — mit
12 Regelklassen, bewiesen an einem 12-Payload-Angriffs-Fixture
(12/12 erkannt, 0 False Positives im sauberen Kontroll-Repo).

## Beweis statt Behauptung

- **Echtwelt-Scan:** 30 öffentliche Repos (Google, Microsoft, Nextcloud & Co.) — 5 mit kritischen Befunden, jeder byte-genau verifiziert: [REAL-WORLD-FINDINGS.md](docs/REAL-WORLD-FINDINGS.md)
- **PR #1 (harmlos):** Kommentar `🛡️ AgentGuard — Note A` + grüner Check → Merge frei
- **PR #2 (gepflanzter Angriff):** Kommentar `Note E` + **roter Check → Merge blockiert**: [live ansehen](https://github.com/agentguard-dev/agentguard-demo/pull/2)
- **Dogfooding:** AgentGuard scannt sich bei jedem PR selbst — und wurde einmal selbst von GitHubs Secret-Scanning geblockt (Fake-Token in einem Test). Das Tool wurde gehärtet; dein Repo wird es auch.

## Quickstart

Lokal:

```bash
npm ci
npm test                              # 12/12 Fixtures + 47 Tests
node cli.js scan --path .             # dieses Repo scannen
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
      # Pflicht: checkt die PR-Dateien aus. Ohne diesen Schritt ist der
      # Workspace leer und das Gate bestünde, ohne irgendetwas zu scannen.
      - uses: actions/checkout@v4
      - uses: agentguard-dev/agentguard@v0
        with:
          exit-on: critical    # blockt den Merge bei kritischen Findings
```

> **Supply-Chain-Hinweise:** `@v0` ist ein bewegliches Tag-Ref — für maximale
> Sicherheit in kritischen Repos auf den vollen Commit-SHA pinnen
> (`agentguard-dev/agentguard@<vollständiger-sha>`). Da PR-Inhalte nicht
> vertrauenswürdig sind, ignoriert AgentGuard eine im PR mitgelieferte
> `.agentguard-ignore`; für sanktionierte Ausnahmen den `exclude`-Input
> der Action nutzen.

Oder direkt aus dem [GitHub Marketplace](https://github.com/marketplace/actions/agentguard-security) installieren.

## Pro — der PR-Bot & RedTeam

- **Pro ($19/Repo/Monat):** GitHub-App mit automatischen PR-Kommentaren + Check-Run-Gate
- **Audit ($499, einmalig):** priorisierter Befund + Fix-Liste innerhalb von 48 h
- **RedTeam ($499/Quartal):** 3-Agenten-Angriff (Angreifer → Verteidiger → Auditor) mit Risiko-Matrix

Live-Demo: [agentguard-demo](https://github.com/agentguard-dev/agentguard-demo) — der Bot kommentiert jeden PR und blockt kritische Findings.

## Architektur

```text
Repo → walkFiles (exclude node_modules/.git/…) → 12 deterministische Regeln
     → optionale ecc-agentshield-Engine (best-effort)
     → A–F-Grading (critical=100 … info=3)
     → text | json | markdown | GitHub-Summary · Exit 2 ab Schwelle
```

- `src/rules.js` — die 12 Regelklassen (pure Funktionen, keine Abhängigkeiten)
- `src/scanner.js` — Orchestrierung + `.agentguard-ignore`-Support
- `src/findings.js` — Grading + Formatierer
- `server/app.js` — Pro-Server (GitHub-App-Webhook → Scan → Kommentar → Check-Run)
- `scripts/redteam.js` — RedTeam-Pipeline (3 Agenten)
- `test/fixtures/vulnerable/` — 12 echte Angriffs-Payloads · `test/fixtures/clean/` — Kontroll-Repo

## Badge für dein Repo

```markdown
[![AgentGuard](https://img.shields.io/badge/agentguard-passing-brightgreen)](https://github.com/agentguard-dev/agentguard)
```

## Dokumentation

- [Architektur-ADR-001](docs/de/ADR-001-architecture.md) · [EN](docs/ADR-001-architecture.md)
- [Sicherheit & Bedrohungsmodell](docs/de/SECURITY.md) · [EN](docs/SECURITY.md)
- [Verifizierte Echtwelt-Befunde](docs/de/REAL-WORLD-FINDINGS.md) · [EN](docs/REAL-WORLD-FINDINGS.md)
- [Pro-Server (PR-Bot)](docs/de/PRO-LAUNCH.md) · [EN](docs/PRO-LAUNCH.md)
- [RedTeam-Pipeline](docs/de/REDTEAM.md) · [EN](docs/REDTEAM.md)

## Lizenz

MIT — die Engine und die freie Action bleiben für immer kostenlos. Pro-Features (PR-Kommentare, Regel-Editor, RedTeam-Report) werden als Service verkauft.
