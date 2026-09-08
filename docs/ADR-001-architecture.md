# ADR-001 — Architektur & Technologie-Entscheidungen

Status: angenommen (2026-09-07)

## Kontext

Ein einfach zu installierendes, solo betreibbares Sicherheits-Gate für
Agent-Konfigurationen in Repos. Kernanforderungen: deterministische Ergebnisse,
keine externen Infrastruktur-Abhängigkeiten im Pfad zur ersten Erkennung,
testbar gegen ein reproduzierbares Angriffs-Fixture, GitHub-Actions-kompatibel.

## Entscheidungen

### 1. Node.js ≥ 18, reine Standardbibliothek im Scan-Kern
Kein Build-Step, keine Transpiler. `node --test` als Testrunner. Begründung:
GitHub-Runner haben Node; Zero-Build = Zero-Install-Friction.

### 2. Eigene deterministische Regel-Engine als Primärschicht
`src/rules.js`: 12 Regelklassen als pure Funktionen über Dateiinhalt. Begründung:
- Reproduzierbar & testbar (12/12 Fixtures, 0 FP)
- Kein LLM im Pfad → kein „Tool selbst prompt-injectable"
- Funktioniert ohne node_modules (wichtig für die GitHub Action)

### 3. ecc-agentshield als sekundäre Best-Effort-Schicht
`src/engine.js`: CLI-Adapter, JSON-Ausgabe, Fehler-tolerant (nie fatal).
Begründung: 102 gepflegte Regeln als Bonus; Engine ist Claude-Home-orientiert,
deshalb niemals die Primärquelle. Abschaltbar via `AGENTGUARD_NO_ENGINE=1`
(und in Tests/Action deaktiviert für Determinismus).

### 4. Persistenz: keine in Woche 1
Konsistenz- und Settings-Persistenz erst mit der Web-App (Woche 5+). Die CLI
ist zustandslos; `.agentguard-ignore` ist die einzige Konfigurationsdatei
(Versionierung im Repo = einfachste Kollaboration).

### 5. GitHub Action als Composite-Step mit Summary-Ausgabe
Kein Container-Publish nötig: `action.yml` nutzt `$GITHUB_ACTION_PATH`,
schreibt Findings nach `$GITHUB_STEP_SUMMARY` und lässt den Exit-Code als Gate
wirken. PR-Kommentare (Pro-Feature) kommen später via GitHub-App.

### 6. A–F-Grading über gewichtete Scores
critical=100, high=60, medium=30, low=10, info=3. Schwellen: B ≥ 1, C ≥ 20,
D ≥ 60, E ≥ 100, F ≥ 250. Grade fließen in Summary und Landingpage-Demo.

## Verworfene Alternativen

| Alternative | Grund der Ablehnung |
|---|---|
| Alles in einer GitHub Action (kein CLI) | Nicht lokal testbar, kein Demo-Material, kein Dogfooding |
| LLM-Analyse im Scan-Pfad (Opus-Analyse) | Kosten, Nicht-Determinismus, eigener Angriffsvektor |
| Supabase/Datenbank ab Tag 1 | Persistenz wird erst mit Kunden nötig; SQLite genügt |
| Python/Go | Node-Ökosystem + bereits installierte Engine |

## Konsequenzen

- Scan-Kern ist dependency-frei: die Action braucht kein `npm ci`
- Tests laufen in < 100 ms → CI bleibt schnell
- Pro-Features (Kommentare, Regeln-UI, RedTeam) docken an die CLI an, ohne den Kern zu ändern
