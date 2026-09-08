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
| Webhook (später, GitHub-App) | 🔜 ausstehend | HMAC-Verifikation ist Pflicht vor Pro-Launch |

## Bedrohungsmodell (was der Scanner selbst NICHT tut)

- **Kein Code-Execution:** Der Scanner liest Dateien als Text; er führt nie
  Inhalte des Ziel-Repos aus (kein `npm install`, keine Hooks, keine Shell).
- **Kein Netzwerk im Scan:** Bildschirmtext; `execFileSync` ruft nur die
  lokale Engine-Binary mit festen Argumenten auf.
- **Regel-Tuning als Angriffsvektor:** Wer `.agentguard-ignore` schreiben kann,
  kann Findings unterdrücken — genau wie `.eslintignore`. Ist im Modell
  dokumentiert (Privileg = Repo-Write, nicht zu verhindern).

## Verantwortungsvolle Offenlegung

Findings an: `security@agentguard.example` (Platzhalter bis GitHub-Repo existiert).
