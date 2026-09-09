#!/usr/bin/env node
// Break-Glass-Guardian: prüft offene Waiver-Issues (Label "break-glass")
// auf Ablauf und eskaliert sichtbar — Kommentar am abgelaufenen Issue +
// ein Warn-Issue. Damit ist jede Ausnahme zeitlich begrenzt UND belegt
// (das Issue selbst ist der immutable receipt). Free-Version der
// Guardian-Logik; die Pro-Version stellt zusätzlich automatisch einen
// Re-Sharpening-PR.
//
// Umgebung:
//   AG_REPO   owner/repo
//   AG_TOKEN  GitHub-Token (issues: write, contents: read)
//   AG_DRY_RUN 1 = nur Anzeige, keine Schreibzugriffe
//
// Pure Funktionen (extractExpiry/isExpired/findExpired) sind für
// test/guardian.test.js exportiert.
import { pathToFileURL } from "node:url";

const API = "https://api.github.com";

// Extrahiert das Ablaufdatum aus dem gerenderten Issue-Body.
// Das Template erzeugt z. B.:
//   ### Gültig bis (YYYY-MM-DD, max. 30 Tage)
//
//   2026-10-05
export function extractExpiry(body, now = new Date()) {
  if (!body) return null;
  // Abschnitt nach "Gültig bis"/"Valid until" finden, dann das erste Datum.
  const section = /(?:gültig bis|valid until)[^\n]*\n+([^\n]*\d{4}-\d{2}-\d{2}[^\n]*)/i.exec(body);
  const candidate = section ? section[1] : null;
  if (!candidate) return null;
  const m = /(\d{4}-\d{2}-\d{2})/.exec(candidate);
  if (!m) return null;
  const date = new Date(m[1] + "T23:59:59Z");
  if (Number.isNaN(date.getTime())) return null;
  // Template-Vorgabe: max. 30 Tage — darüber hinaus als verdächtig markieren,
  // aber trotzdem ein gültiges Ablaufdatum liefern.
  const max = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  if (date > max) return { date, overLimit: true };
  return { date, overLimit: false };
}

export function isExpired(issue, now = new Date()) {
  const expiry = extractExpiry(issue.body, now);
  if (!expiry) return false; // ohne Datum: nicht automatisch eskalieren
  return expiry.date <= now;
}

export function findExpired(issues, now = new Date()) {
  return issues.filter((i) => isExpired(i, now));
}

export function expiryComment(issue, now = new Date()) {
  const expiry = extractExpiry(issue.body, now);
  const dateStr = expiry ? expiry.date.toISOString().slice(0, 10) : "unbekannt";
  return `## ⏰ Break-Glass-Ausnahme abgelaufen (${dateStr})

Diese Ausnahme ist zeitlich abgelaufen. Das Gate gilt wieder voll — bitte:

1. \`waiver-issue\` aus der Workflow-Datei entfernen (bzw. \`exit-on\` zurücksetzen)
2. Dieses Issue schließen

Wenn die Ausnahme weiter nötig ist: neues Break-Glass-Issue anlegen (max. 30 Tage)
und im PR begründen. Policy: [docs/BREAK-GLASS.md](docs/BREAK-GLASS.md).`;
}

export function warningIssueBody(expired, now = new Date()) {
  const lines = expired.map(
    (i) => `- #${i.number} — ${i.title.replace(/^\[Break-Glass\]\s*/i, "").slice(0, 100)}`
  );
  return `## ⏰ ${expired.length} abgelaufene Break-Glass-Ausnahme(n)

Diese Ausnahmen sind zeitlich abgelaufen, das Gate gilt wieder voll:

${lines.join("\n")}

Aktion: \`waiver-issue\` aus den Workflow-Dateien entfernen und die Issues
schließen. Details in den jeweiligen Issue-Kommentaren.

> Erstellt vom Break-Glass-Guardian am ${now.toISOString().slice(0, 10)}.
> Policy: docs/BREAK-GLASS.md`;
}

async function api(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    ...options,
  });
  if (!res.ok) throw new Error(`GitHub API ${options.method ?? "GET"} ${path} → HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const repo = process.env.AG_REPO;
  const token = process.env.AG_TOKEN;
  const dryRun = process.env.AG_DRY_RUN === "1";
  if (!repo || !token) throw new Error("AG_REPO und AG_TOKEN müssen gesetzt sein");

  const now = new Date();
  const issues = await api(
    `/repos/${repo}/issues?labels=break-glass&state=open&per_page=100`,
    token
  );
  const expired = findExpired(
    issues.map((i) => ({ number: i.number, title: i.title, body: i.body }))
  );
  console.log(`${issues.length} offene Break-Glass-Issues, ${expired.length} abgelaufen.`);

  if (expired.length === 0) return;

  for (const issue of expired) {
    const body = expiryComment(issue, now);
    if (dryRun) {
      console.log(`DRY-RUN: Kommentar an #${issue.number}:\n${body.slice(0, 200)}…`);
    } else {
      await api(`/repos/${repo}/issues/${issue.number}/comments`, token, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      console.log(`✔ Kommentar an #${issue.number}`);
    }
  }

  const warnBody = warningIssueBody(expired, now);
  if (dryRun) {
    console.log(`DRY-RUN: Warn-Issue:\n${warnBody.slice(0, 200)}…`);
  } else {
    await api(`/repos/${repo}/issues`, token, {
      method: "POST",
      body: JSON.stringify({ title: "⏰ Break-Glass-Ausnahmen abgelaufen", body: warnBody, labels: ["break-glass"] }),
    });
    console.log("✔ Warn-Issue erstellt");
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((e) => {
    console.error("❌ guardian failed:", e.message);
    process.exit(1);
  });
}
