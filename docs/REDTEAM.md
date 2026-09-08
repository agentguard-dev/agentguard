# RedTeam-Pipeline — AgentGuard Pro Feature ($499/Quartal)

> Drei Agenten greifen dein Repo aktiv an: **Angreifer (Red Team)** sucht
> Exploit-Ketten, **Verteidiger (Blue Team)** prüft jede Behauptung ehrlich,
> **Auditor** synthetisiert den priorisierten Report.

## Nutzung

```bash
# 1) Nur Prompts erzeugen (kostenlos, deterministisch):
node scripts/redteam.js --repo <pfad> --dry-run

# 2) Vollständigen Lauf (3 Agenten via claude -p / DeepSeek):
node scripts/redteam.js --repo <pfad>            # Ausgabe: ./redteam/REDTEAM-REPORT.md
```

Resume-Logik: Bereits fertige Agenten-Ausgaben (`attacker.md` / `defender.md`)
werden beim nächsten Lauf übersprungen — ein Abbruch ist also nie verloren.

## Konfiguration

| Variable | Default | Wirkung |
|---|---|---|
| `AGENTGUARD_REDTEAM_BIN` | `claude` | LLM-Runner (z. B. eigener Gateway-Wrapper) |
| `CLAUDE_CODE_EFFORT_LEVEL` | `medium` | Denk-Tiefe der Agenten (Pipeline-Praxis: medium = schneller & günstiger) |

## Was der Kunde bekommt (Report)

- Executive Summary (3–5 Sätze, ohne Fachjargon)
- Risiko-Matrix (Priorität, Wahrscheinlichkeit, Impact, Empfehlung)
- Top-5-Handlungsliste mit Aufwand-Schätzungen
- Grenzen & offene Fragen (ehrliche Selbstbegrenzung)

## Preis & Lieferumfang

| Was du bekommst | Details |
|---|---|
| Monatlicher 3-Agenten-Angriff | Angreifer → Verteidiger → Auditor |
| Report | Executive Summary, Risiko-Matrix, Top-5-Handlungsliste |
| Preis | $499/Quartal (Team-Pakete auf Anfrage) |

## Demo-Report

Der verifizierte Demo-Lauf gegen unser 12-Payloads-Fixture-Repo
(alle 3 Agenten-Ausgaben + finaler Report) liegt nach dem ersten
vollständigen Lauf in `docs/REDTEAM-DEMO.md` (falls vorhanden) bzw.
in `redteam/` (lokal, nicht im Repo, weil er Angriffs-Payloads dokumentiert).
