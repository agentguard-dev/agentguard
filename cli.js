#!/usr/bin/env node
// AgentGuard CLI — scanning + gating for agent configurations in repos.
//
// Usage:
//   agentguard scan --path <dir> [--format text|json|md|summary]
//                   [--exit-on critical|high|medium|low|info|never]
//                   [--exclude "<glob>"] [--engine on|off]
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepo, hasSeverity } from "./src/scanner.js";
import { formatByOption } from "./src/findings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    path: process.cwd(),
    format: "text",
    exitOn: "never",
    engine: "on",
    excludes: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      console.log(`Usage: agentguard scan --path <dir> [options]

Options:
  --path <dir>          Directory to scan (default: cwd)
  --format <f>          text | json | md | summary (default: text)
  --exit-on <sev>       Exit 2 when a finding >= severity is present
                        (critical|high|medium|low|info|never) (default: never)
  --exclude <glob>      Exclude matching paths (repeatable)
  --engine <on|off>     Include ecc-agentshield engine layer (default: on)
`);
      process.exit(0);
    }
    if (a === "--path") args.path = argv[++i];
    else if (a === "--format") args.format = argv[++i];
    else if (a === "--exit-on") args.exitOn = argv[++i];
    else if (a === "--engine") args.engine = argv[++i];
    else if (a === "--exclude") args.excludes.push(argv[++i]);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.exitOn === "never") args.exitOn = null;

const report = scanRepo(args.path, {
  useEngine: args.engine !== "off",
  customExcludes: args.excludes,
});

const output = formatByOption(report, args.format);
if (args.format === "json" || (process.env.GITHUB_ACTIONS && args.format === "summary")) {
  process.stdout.write(output + "\n");
} else {
  process.stdout.write(output + "\n");
}

if (args.exitOn && hasSeverity(report, args.exitOn)) {
  const offenders = report.findings
    .filter((f) => ["critical", "high", "medium", "low", "info"].indexOf(f.severity) <= ["critical", "high", "medium", "low", "info"].indexOf(args.exitOn))
    .map((f) => `${f.id} (${f.severity}) ${f.file}`)
    .slice(0, 10);
  console.error(
    `❌ GATE FAILED: ${offenders.length} finding(s) at >= ${args.exitOn}. Grade ${report.summary.grade}. ` +
      `Korrektur: Dateien bereinigen oder Muster in .agentguard-ignore aufnehmen.\n   ${offenders.join("\n   ")}`
  );
  process.exit(2);
}
