// Baut die deterministischen Landingpage-Daten:
//   web/demo-findings.json          — Fixture-Beweis (12/12 + 0 FP)
//   web/real-world-findings.json    — anonymisierte Echtwelt-Kennzahlen
// Anonymisierung: keine Repo-Namen, keine Dateipfade — nur Muster.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepo } from "../src/scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// 1) Fixture-Demo
const vulnerable = scanRepo(path.join(root, "test/fixtures/vulnerable"), { useEngine: false });
const clean = scanRepo(path.join(root, "test/fixtures/clean"), { useEngine: false });
fs.writeFileSync(
  path.join(root, "web", "demo-findings.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      vulnerable: {
        grade: vulnerable.summary.grade,
        score: vulnerable.summary.score,
        count: vulnerable.summary.count,
        findings: vulnerable.findings.map((f) => ({
          id: f.id,
          severity: f.severity,
          file: f.file,
          description: f.description,
        })),
      },
      clean: { grade: clean.summary.grade, count: clean.summary.count },
    },
    null,
    2
  )
);

// 2) Echtwelt-Kennzahlen (anonymisiert)
const summaryPath = path.join(root, "outreach", "summary.json");
let realWorld = { scanned: 0, flagged: 0, grades: {}, sampleRules: [] };
if (fs.existsSync(summaryPath)) {
  const data = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const results = data.results ?? [];
  const flagged = results.filter((r) => r.grade !== "A");
  const sampleRules = [];
  for (const r of flagged) {
    const report = path.join(root, "outreach", r.repo.replace("/", "__"), "report.md");
    let rules = [];
    try {
      const text = fs.readFileSync(report, "utf8");
      rules = [...text.matchAll(/`([A-Z]+-001)`/g)].map((m) => m[1]);
    } catch {}
    for (const rule of rules) if (!sampleRules.includes(rule)) sampleRules.push(rule);
  }
  const grades = {};
  for (const r of results) grades[r.grade] = (grades[r.grade] ?? 0) + 1;
  realWorld = {
    scanned: results.length,
    flagged: flagged.length,
    grades,
    sampleRules: sampleRules.slice(0, 8),
  };
}
fs.writeFileSync(path.join(root, "web", "real-world-findings.json"), JSON.stringify(realWorld, null, 2));
console.log("Landingpage-Daten geschrieben:", JSON.stringify(realWorld));
