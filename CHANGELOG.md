# Changelog

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
