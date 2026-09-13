# Changelog

## Unreleased

**Gate-Integrität — vier belegte Bypässe geschlossen**

- **CI-Selbst-Scan:** `--no-ignore` + Ausnahmen als `--exclude` im Workflow
  (Basis-Branch, review-pflichtig) statt in der PR-editierbaren
  `.agentguard-ignore`. Vorher meldete der eigene Dogfood-Scan **grade A /
  0 Findings**, während derselbe Befehl mit `--no-ignore` **grade F /
  14 kritische Findings** ergab — genau der Bypass, gegen den die Action ihre
  Kunden härtet.
- **HOOK-001** erkennt jetzt die echte Hook-Verdrahtung in
  `.claude/settings.json`, `.claude/settings.local.json`,
  `.cursor/settings.json` und `.codex/settings.json`. Vorher wurde nur ein
  `hooks/`-Verzeichnis geprüft: ein Repo, dessen einziger Angriff ein live
  `curl | bash`-Hook in der settings.json war, kam auf **grade A, Exit 0**.
- **CLI fail-closed:** unbekannte Optionen und fehlende Optionswerte brechen
  mit Exit 2 ab. Ein vertippter Flag-Name (`--exit-onn`) deaktivierte das Gate
  bisher still; `--exclude` ohne Wert endete in einem ungefangenen TypeError.
- **Engine-Layer respektiert Ausschlüsse:** `scanWithEngine` erhält keine
  Ausschlussmuster (agentshield kennt kein `--exclude`), die Funde werden
  daher mit denselben Matchern gefiltert. Vorher umging die Engine jeden
  Ausschluss — auch die offizielle Break-Glass-Ausnahme.
- **76 Tests** (vorher 63)

## v0.2.2 (heute)

**Break-Glass-Governance — Ausnahmen ohne Policy-Drift**

- Break-Glass-Waiver als einziger unterstützter Ausnahmepfad:
  Issue-Template (Label `break-glass`) = immutable receipt,
  max. 30 Tage, Pflicht-Reviewer (Policy: docs/BREAK-GLASS.md, ADR-002)
- Action: neue Inputs `waiver-issue` (Beleg-Link in der Step-Summary)
  und `strict` (fail-closed: `exit-on: never` ohne Beleg → Exit 2);
  Logik nach scripts/action-gate.sh extrahiert und prozess-testbar
- Guardian: scripts/guardian.js + workflow-templates/break-glass-guard.yml
  (wöchentliche Ablauf-Prüfung: Kommentar + Warn-Issue)
- Dogfooding: Guardian läuft im eigenen Repo (Schedule + workflow_dispatch),
  Test-Waiver #13 verifiziert den E2E-Fall
- **66 Tests** (vorher 47)


## v0.2.1 (heute)

**Security-Härtung + Marketing-Polish**

- Fail-closed Gates: `exit-on`-Validierung und Checkout-Warnung (Fehlkonfiguration
  deaktiviert das Gate nie still)
- PR-Bypass-Schutz: eine im PR mitgelieferte `.agentguard-ignore` wird im CI
  ignoriert; neuer `exclude`-Input der Action als saubere Ausnahme
- Pro-Server: HMAC-DoS-Fix, 1-MB-Body-Limit, Installation wird pro Repo aufgelöst,
  sicheres Tarball-Entpacken (Symlink-/Traversal-Schutz, 100-MB-Limit)
- Neue Secret-Muster: Private Keys, `github_pat_`-Tokens, npm, Stripe, Slack-Webhooks
- MCP-Squat-FP-Fix · Docs-Ausnahme für Bedrohungs-Dokumentation
- **47 Tests** (vorher 36)

## v0.2.0

**Erstes Marketplace-Release**

- Freie GitHub Action (`agentguard-security` auf dem GitHub Marketplace)
- 12 Regelklassen (AGENTS.md, Skills, MCP, Hooks, Secrets, Permission-Traps)
- A–F-Grading mit Exit-Code-Gate
- 30-Repo-Echtwelt-Scan als verifizierter Beweis (siehe `docs/REAL-WORLD-FINDINGS.md`)
