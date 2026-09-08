// RedTeam-Pipeline: 3-Agenten-Analyse (Angreifer → Verteidiger → Auditor).
// Prompt-Erzeugung ist deterministisch und testbar; die Ausführung läuft
// über den konfigurierbaren LLM-Runner (Default: claude -p, also der
// Claude-Code-Client mit DeepSeek-Backend).
//
// Auftrag für den Kunden-Report: welcher Angriff würde landen, wenn er
// diesen PR übersehen — und wie hoch ist der reale Nutzen? Das ist das
// $499/Quartal-Feature für AgentGuard Pro.

export function collectExcerpts(findings, maxPerFinding = 6) {
  // Kurze, kontextreiche Datei-Ausschnitte rund um die Befunde.
  return findings.slice(0, 40).map((f) => ({
    ...f,
    excerpt: f.evidence ? `${f.evidence}` : f.description,
  }));
}

export function buildRedTeamPrompts({ repo, report }) {
  const findings = report?.findings ?? [];
  const excerpts = collectExcerpts(findings);

  const findingLines = findings
    .map((f) => `- [${f.severity.toUpperCase()}] ${f.id} in ${f.file}: ${f.description}`)
    .join("\n") || "- keine Findings im Standard-Scan (RedTeam sucht trotzdem weiter)";

  const excerptLines = excerpts
    .slice(0, 20)
    .map((e) => `  · ${e.file}: ${e.excerpt.slice(0, 160)}`)
    .join("\n");

  const attackerPrompt = `Du bist ein professioneller Offensive-Security-Agent (Red Team).
Aufgabe: Finde Exploit-Ketten in einem Repo, das Coding-Agents liest.
Ziel: Zeige, wie eine Anweisung aus einer Repo-Datei den Agenten zu
Datenexfiltration oder Schadcode-Ausführung bringen könnte — über die
Standard-Findings hinaus (chained attacks, Kombinationen, Kontext).

Repo: ${repo}
Bekannte Findings (Status: ${
    report?.summary?.grade ?? "?"
  }, ${report?.summary?.count ?? 0} Findings):
${findingLines}

Kontext-Ausschnitte:
${excerptLines || "  · keine"}

Ausgabeformat (nur Markdown, keine Einleitung):
## Angriffsszenarien
1. **Titel** — Vektor, Schritte, Ziel. (Schweregrad, Erfolgswahrscheinlichkeit)
## Chains
- Findung A + B → Wirkung
## Was der Standard-Scan verpasst hat
- … (Begründung)`;

  const defenderPrompt = `Du bist der Defense-Operator (Blue Team) eines Repos mit Coding-Agents.
Der Red-Team-Bericht und die Scanner-Findings liegen vor.
Aufgabe: Prüfe jedes Szenario ehrlich: Realistisch oder Spekulation?
Gegenmaßnahme je Szenario (Policy, Hook, Ignore-Liste, Config-Änderung).

Repo: ${repo}
Scanner-Findings:
${findingLines}

## RED-TEAM-BERICHT (wird dir mitgegeben)
(Lies den eigentlichen Bericht aus dem Verzeichnis — wenn nicht verfügbar,
gehe ehrlich davon aus, dass alle Szenarien gleichwertig diskutiert werden.)

Ausgabeformat (nur Markdown):
## Verteidigungsanalyse
| Szenario | Realistisch? | Warum | Gegenmaßnahme |
|---|---|---|---|
## Verbleibendes Restrisiko
- …`;

  const auditorPrompt = `Du bist der leitende Audit-Auditor. Du synthesierst Red-Team- und
Blue-Team-Berichte zu einem entscheidungsreifen Report für einen
Tech-Lead: Prioritäten, Aufwand, Ampelfarben. Kein Fachjargon ohne Erklärung.

Repo: ${repo}

Ausgabeformat (nur Markdown):
# RedTeam-Report — ${repo}

## Executive Summary (3-5 Sätze)
## Risiko-Matrix (Priorität, Wahrscheinlichkeit, Impact, Empfehlung)
## Priorisierte Handlungsliste (Top 5, mit Aufwand-S)
## Offene Fragen / Begrenztheiten
## Appendix: Methodik (Deterministischer Scan + 3-Agenten-Pipeline)`;

  return { attackerPrompt, defenderPrompt, auditorPrompt };
}
