> [English](../SECURITY.md) · **Deutsch**

# SECURITY.md — Selbst-Audit von AgentGuard

> AgentGuard ist selbst ein Sicherheits-Tool. Diese Datei dokumentiert den
> laufenden Selbst-Audit. Stand: Initial-Scan (Woche 1). Regenerierung:
> `npm run self-scan` (Engine off für Determinismus) — Befunde werden hier gepflegt.

## Audit-Ergebnis (Initial)

| Bereich | Status | Hinweis |
|---|---|---|
| Secrets in Git-History / Dateien | ✅ sauber | Keine Credentials in Fixtures: alle Keys sind Fake (Format-aber nicht Content-echt, z. B. `sk-7f3a…` nur im Fixture) |
| Regel-Datei selbst nicht injizierbar | ✅ | Regeln sind Code, keine Prompts; kein LLM im Pfad |
| Netzwerk | ✅ keins im Scan-Pfad | Engine-Adapter ruft nur das lokale `agentshield`-Binary |
| Sandbox | ⚠️ bekannt | Engine-`--sandbox`-Modus ist ein optionales Feature, nicht der Default; CLI führt keinerlei Repo-Code aus (nur Lesen) |
| Webhook (GitHub-App) | ✅ | HMAC-Verifikation, Body-Limit, Installation pro Repo — umgesetzt im privaten Pro-Repo (agentguard-pro) |

## Bedrohungsmodell (was der Scanner selbst NICHT tut)

- **Kein Code-Execution:** Der Scanner liest Dateien als Text; er führt nie
  Inhalte des Ziel-Repos aus (kein `npm install`, keine Hooks, keine Shell).
- **Kein Netzwerk im Scan:** Bildschirmtext; `execFileSync` ruft nur die
  lokale Engine-Binary mit festen Argumenten auf.
- **Ignore-Datei ist in CI nicht vertrauenswürdig:** Ein PR-Autor könnte eine
  `.agentguard-ignore` mitschicken, die die Findings am eigenen PR unterdrückt.
  Daher ignorieren die Action und der Pro-Server `.agentguard-ignore` aus
  PR-Inhalten (`--no-ignore` bzw. `honorIgnoreFile: false`). Sanktionierte
  Ausnahmen laufen über den `exclude`-Input der Action (liegt in der
  Workflow-Datei, also im Base-Branch).

## Bekannte Grenzen

Deterministische Regex-Regeln sind eine Hygiene-Schicht, keine
Sicherheitsgrenze — obfuskierte oder neuartige Angriffe können passieren.
Bekannte Lücken:

- **Ausgeschlossene Verzeichnisse werden nicht gescannt:** `node_modules/`,
  `.git/`, `dist/`, `build/`, `vendor/`, `.next/`, … — dort abgelegte
  Agent-Konfigurationen sind für den Scanner unsichtbar.
- **Secret-Erkennung ist formatbasiert:** Nur bekannte Token-Formen (sk-, ghp_,
  GitHub-PATs, npm, Stripe, Slack-Webhooks, AWS AKIA, Google AIza, Slack xox,
  Private-Key-Blöcke) werden erkannt. Für High-Entropy-Erkennung einen
  dedizierten Secret-Scanner (z. B. gitleaks) ergänzen.
- **Docs-Ausnahme:** Dateien unter `docs/` oder mit Namen wie `SECURITY.md`,
  `REDTEAM.md`, `ATTACK.md` sind von der Instruction-Override-Regel befreit,
  damit Bedrohungs-Dokumentationen nicht für das Zitieren der Angriffe
  geflaggt werden, vor denen sie warnen.
- **MCP-Allowlist:** Nicht gelistete, aber legitime MCP-Hosts ergeben ein
  Medium-Finding; die Squat-Heuristik ist präfixbasiert und braucht die
  Allowlist, um offizielle Brand-Hosts zu erkennen.
- **Webhook/Pro-Limits:** Webhook-Bodys sind auf 1 MB begrenzt, Tarball-
  Downloads auf 100 MB; Tarballs mit Symlinks, Hardlinks, Devices oder FIFOs
  werden abgelehnt (Repo-Symlinks in PR-Tarballs werden nicht unterstützt).

## Verantwortungsvolle Offenlegung

Melde ein Sicherheitsproblem über **GitHubs privates Vulnerability-Reporting**
(Security → Vulnerability reporting). So bleibt der Bericht privat, bis das
Problem behoben ist. Alternativ erreichst du die Betreiber über das Repository.
Bitte Wirkung und Reproduktionsschritte beschreiben; wir antworten innerhalb von 7 Tagen.
