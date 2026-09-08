// CLI: RedTeam-Pipeline ausführen.
//
//   node scripts/redteam.js --repo <pfad> [--dry-run] [--out <dir>]
//
// --dry-run  erzeugt nur die Prompts (deterministisch, keine LLM-Kosten)
// Standard  führt 3 Agenten über den LLM-Runner aus (Default: claude -p
//           auf PATH; überschreibbar via AGENTGUARD_REDTEAM_BIN)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scanRepo } from "../src/scanner.js";
import { buildRedTeamPrompts } from "../src/redteam.js";
import { formatMarkdown } from "../src/findings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function argValue(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

// Lädt die DeepSeek-Konfiguration aus ~/.zshrc, damit `claude` (mit
// ANTHROPIC_BASE_URL/anthropic-Endpoint) headless funktioniert.
function loadClaudeEnv() {
  const env = { ...process.env };
  try {
    const file = fs.readFileSync(path.join(process.env.HOME ?? "", ".zshrc"), "utf8");
    const vars = {};
    for (const line of file.split("\n")) {
      const m = /^export\s+([A-Z0-9_]+)=(?:"([^"]*)"|'([^']*)'|(\S*))/.exec(line.trim());
      if (m && /^(ANTHROPIC|DEEPSEEK|CLAUDE_CODE)_/.test(m[1])) vars[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
    }
    const V = (k) => {
      let v = vars[k] ?? "";
      if (v.startsWith("$")) v = vars[v.slice(1)] ?? v;
      return v;
    };
    for (const k of Object.keys(vars)) env[k] = V(k);
  } catch {
    // .zshrc nicht lesbar — Umgebung unverändert lassen
  }
  return env;
}

function runAgent(bin, prompt, label, outDir) {
  const outFile = path.join(outDir, `${label.toLowerCase()}.md`);
  if (fs.existsSync(outFile)) {
    console.log(`  ► ${label}: bereits vorhanden (resume) — überspringe`);
    return fs.readFileSync(outFile, "utf8").trim();
  }
  const args = ["-p", prompt];
  console.log(`  ► ${label} läuft (LLM)…`);
  const started = Date.now();
  const stdout = execFileSync(bin, args, {
    encoding: "utf8",
    timeout: 600_000,
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...loadClaudeEnv(), CLAUDE_CODE_EFFORT_LEVEL: process.env.CLAUDE_CODE_EFFORT_LEVEL || "medium" },
  });
  fs.writeFileSync(outFile, stdout.trim() + "\n");
  console.log(`  ✔ ${label} fertig in ${Math.round((Date.now() - started) / 1000)}s`);
  return stdout.trim();
}

async function main() {
  const args = process.argv.slice(2);
  const repo = argValue(args, "--repo", process.cwd());
  const outDir = path.resolve(argValue(args, "--out", "./redteam"));
  const dryRun = args.includes("--dry-run");

  console.log(`AgentGuard RedTeam-Pipeline`);
  console.log(`Repo: ${repo} · Output: ${outDir}${dryRun ? " · DRY-RUN (keine LLM-Kosten)" : ""}`);

  const report = scanRepo(repo, { useEngine: true });
  fs.mkdirSync(path.join(outDir, "prompts"), { recursive: true });
  fs.writeFileSync(path.join(outDir, "scan-report.md"), formatMarkdown(report));

  const { attackerPrompt, defenderPrompt, auditorPrompt } = buildRedTeamPrompts({ repo, report });
  fs.writeFileSync(path.join(outDir, "prompts", "1-attacker.md"), attackerPrompt);
  fs.writeFileSync(path.join(outDir, "prompts", "2-defender.md"), defenderPrompt);
  fs.writeFileSync(path.join(outDir, "prompts", "3-auditor.md"), auditorPrompt);

  if (dryRun) {
    console.log("✅ Prompts geschrieben (dry-run). Ausführen mit: node scripts/redteam.js --repo <pfad>");
    return;
  }

  const bin = process.env.AGENTGUARD_REDTEAM_BIN || "claude";
  const attack = runAgent(bin, attackerPrompt, "ANGREIFER (Red Team)", outDir);
  const defendText = defenderPrompt + "\n\n## RED-TEAM-BERICHT\n" + attack.slice(0, 12000);
  const defense = runAgent(bin, defendText, "VERTEIDIGER (Blue Team)", outDir);
  const auditText = auditorPrompt + "\n\n## RED-TEAM\n" + attack.slice(0, 8000) + "\n\n## BLUE-TEAM\n" + defense.slice(0, 8000);
  const audit = runAgent(bin, auditText, "AUDITOR", outDir);

  fs.writeFileSync(path.join(outDir, "REDTEAM-REPORT.md"), audit + "\n");
  console.log("✅ RedTeam-Report: " + path.join(outDir, "REDTEAM-REPORT.md"));
}

main().catch((e) => {
  console.error("❌ " + e.message);
  process.exit(1);
});
