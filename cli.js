#!/usr/bin/env node
// AgentGuard CLI — scanning + gating for agent configurations in repos.
//
// Usage:
//   agentguard scan --path <dir> [--format text|json|md|summary]
//                   [--exit-on critical|high|medium|low|info|never]
//                   [--exclude "<glob>"] [--no-ignore] [--engine on|off]
//
// Fehlerhafte Eingaben beenden das Programm mit Exit-Code 2 (fail-closed):
// ein Gate, das sich bei Tippfehlern still selbst abschaltet, schützt nicht.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepo, hasSeverity } from "./src/scanner.js";
import { formatByOption } from "./src/findings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VALID_EXIT_ON = ["critical", "high", "medium", "low", "info", "never"];
const VALID_FORMATS = ["text", "json", "md", "markdown", "summary"];
const VALID_ENGINES = ["on", "off"];

// Optionen mit Wert. Alles andere, was mit "-" beginnt, ist ein Fehler:
// ein vertippter Flag-Name darf das Gate niemals still abschalten.
const VALUE_FLAGS = new Set(["--path", "--format", "--exit-on", "--engine", "--exclude"]);

const USAGE = `Usage: agentguard scan --path <dir> [options]

Options:
  --path <dir>          Directory to scan (default: cwd)
  --format <f>          text | json | md | summary (default: text)
  --exit-on <sev>       Exit 2 when a finding >= severity is present
                        (critical|high|medium|low|info|never) (default: never)
  --exclude <glob>      Exclude matching paths (repeatable)
  --no-ignore           Ignore .agentguard-ignore (sichere CI-Einstellung)
  --engine <on|off>     Include ecc-agentshield engine layer (default: on)
`;

function fail(message) {
  console.error(`❌ ${message}`);
  console.error("   Nutzung: agentguard scan --path <dir> [Optionen] (--help für Details)");
  process.exit(2);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }
  const args = {
    path: process.cwd(),
    format: "text",
    exitOn: "never",
    engine: "on",
    excludes: [],
    honorIgnore: true,
  };
  const command = argv[0];
  if (command !== "scan") {
    fail(`Unbekanntes Kommando: '${command ?? ""}' (erwartet: scan)`);
  }
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-ignore") {
      args.honorIgnore = false;
      continue;
    }
    if (!VALUE_FLAGS.has(a)) {
      fail(`Unbekannte Option: '${a}'`);
    }
    const value = argv[++i];
    // Fehlender Wert war früher ein ungefangener TypeError (Exit 1, Stacktrace).
    if (value === undefined || value.startsWith("--")) {
      fail(`Fehlt ein Wert für ${a}`);
    }
    if (a === "--path") args.path = value;
    else if (a === "--format") args.format = value;
    else if (a === "--exit-on") args.exitOn = value;
    else if (a === "--engine") args.engine = value;
    else if (a === "--exclude") args.excludes.push(value);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

// Fail-closed: ungültige Konfiguration niemals still durchlassen.
if (!VALID_EXIT_ON.includes(args.exitOn)) {
  fail(`Ungültiger Wert für --exit-on: '${args.exitOn}' (erlaubt: ${VALID_EXIT_ON.join("|")})`);
}
if (!VALID_FORMATS.includes(args.format)) {
  fail(`Ungültiger Wert für --format: '${args.format}' (erlaubt: ${VALID_FORMATS.join("|")})`);
}
if (!VALID_ENGINES.includes(args.engine)) {
  fail(`Ungültiger Wert für --engine: '${args.engine}' (erlaubt: ${VALID_ENGINES.join("|")})`);
}
if (!fs.existsSync(args.path)) {
  fail(`Scan-Pfad existiert nicht: ${args.path}`);
}
if (args.exitOn === "never") args.exitOn = null;

const report = scanRepo(args.path, {
  useEngine: args.engine !== "off",
  customExcludes: args.excludes,
  honorIgnoreFile: args.honorIgnore,
});

const output = formatByOption(report, args.format);
process.stdout.write(output + "\n");

if (args.exitOn && hasSeverity(report, args.exitOn)) {
  const order = VALID_EXIT_ON.slice(0, -1); // ohne "never"
  const offenders = report.findings
    .filter((f) => order.indexOf(f.severity) <= order.indexOf(args.exitOn))
    .map((f) => `${f.id} (${f.severity}) ${f.file}`)
    .slice(0, 10);
  console.error(
    `❌ GATE FAILED: ${offenders.length} finding(s) at >= ${args.exitOn}. Grade ${report.summary.grade}. ` +
      `Korrektur: Dateien bereinigen oder Muster in .agentguard-ignore aufnehmen.\n   ${offenders.join("\n   ")}`
  );
  process.exit(2);
}
