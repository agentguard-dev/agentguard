// Regenerates web/demo-findings.json from the fixture scans.
// The demo data is deterministic (engine disabled) so the landing page can
// show reproducible evidence.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepo } from "../src/scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const vulnerable = scanRepo(path.join(root, "test/fixtures/vulnerable"), { useEngine: false });
const clean = scanRepo(path.join(root, "test/fixtures/clean"), { useEngine: false });

const demo = {
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
      evidence: f.evidence,
    })),
  },
  clean: {
    grade: clean.summary.grade,
    score: clean.summary.score,
    count: clean.summary.count,
  },
};

const out = path.join(root, "web", "demo-findings.json");
fs.writeFileSync(out, JSON.stringify(demo, null, 2));
console.log(`wrote ${out} (vulnerable: ${demo.vulnerable.count} findings, grade ${demo.vulnerable.grade}; clean: grade ${demo.clean.grade})`);
