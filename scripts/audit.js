// scripts/audit.js — Schnellverkaufen-Flow: 1 Befehl → kundenfertiger Audit-Report.
//
//   node scripts/audit.js --repo owner/repo [--engine on] [--out audits]
//
// Lädt das Repo (GITHUB_TOKEN optional für private), scannt deterministisch,
// schreibt einen report + markdown-Report, den du als Anhang an Kunden schickst.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scanRepo } from "../src/scanner.js";
import { formatMarkdown } from "../src/findings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function argValue(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

async function downloadAndExtract(repo, dir) {
  const res = await fetch(`https://codeload.github.com/${repo}/tar.gz/main`);
  if (!res.ok) {
    const res2 = await fetch(`https://codeload.github.com/${repo}/tar.gz/master`);
    if (!res2.ok) throw new Error(`download failed (HTTP ${res.status}/${res2.status})`);
    execSync(`curl -sL -o repo.tar.gz https://codeload.github.com/${repo}/tar.gz/master`, { cwd: dir });
  } else {
    fs.writeFileSync(path.join(dir, "repo.tar.gz"), Buffer.from(await res.arrayBuffer()));
  }
  execSync("tar xzf repo.tar.gz --strip-components=1", { cwd: dir, stdio: "ignore" });
}

async function main() {
  const args = process.argv.slice(2);
  const repo = argValue(args, "--repo");
  const outRoot = path.resolve(argValue(args, "--out", path.join(ROOT, "audits")));
  if (!repo) {
    console.error("Nutzung: node scripts/audit.js --repo owner/repo [--out dir]");
    process.exit(1);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ag-audit-"));
  try {
    console.log(`Scanning ${repo}… (kann 1–3 Min dauern bei großen Repos)`);
    await downloadAndExtract(repo, dir);
    const report = scanRepo(dir, { useEngine: false });
    const outFile = path.join(outRoot, `audit-${repo.replace("/", "__")}.md`);
    fs.mkdirSync(outRoot, { recursive: true });

    const header = `# 🛡️ AgentGuard – Security-Audit: ${repo}

**Datum:** ${new Date().toISOString().slice(0, 10)} · **Note:** ${report.summary.grade} (Score ${report.summary.score}) · **Findings:** ${report.summary.count}

> Dieser Bericht wurde mit deterministischen Regeln (kein LLM-Orakel) erstellt.
> Kritische Findings sind Priorität 1. Für eine vollständige Red-Team-Analyse
> (3 Agenten: Angreifer → Verteidiger → Auditor) fragen Sie den **RedTeam-Report** an.

---

`;
    fs.writeFileSync(outFile, header + formatMarkdown(report).replaceAll(dir, repo));
    console.log(`✅ Report geschrieben: ${outFile}`);
    console.log(`   Note ${report.summary.grade}: ${report.summary.bySeverity.critical} critical, ${report.summary.bySeverity.high} high`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error("❌ " + e.message);
  process.exit(1);
});
