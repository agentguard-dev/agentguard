// AgentGuard scanner: walks a repo, runs deterministic rules + engine layer,
// and produces a normalized report.
import fs from "node:fs";
import path from "node:path";
import { walkFiles, readText } from "./fsutil.js";
import { RULES } from "./rules.js";
import { scanWithEngine, isEngineAvailable } from "./engine.js";
import { summarize } from "./findings.js";

// Loads .agentguard-ignore from the repo root (gitignore-style patterns).
export function loadIgnoreFile(rootDir) {
  const ignorePath = path.join(rootDir, ".agentguard-ignore");
  let content;
  try {
    content = fs.readFileSync(ignorePath, "utf8");
  } catch {
    return [];
  }
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map(globToRegExp);
}

function globToRegExp(glob) {
  const base = glob.endsWith("/") ? glob.slice(0, -1) : glob;
  const escaped = base
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${escaped}$|^${escaped}/`);
}

export function scanRepo(rootDir, { useEngine = true, excludeDirs = [], customExcludes = [] } = {}) {
  rootDir = path.resolve(rootDir);
  const findings = [];
  const ignore = [...loadIgnoreFile(rootDir), ...customExcludes];

  for (const file of walkFiles(rootDir, { excludeDirs, customExcludes: ignore })) {
    const content = readText(file.abs);
    const ctx = { rel: file.rel, content };
    for (const rule of RULES) {
      const result = rule.scan(ctx);
      if (!result) continue;
      findings.push({
        id: result.id,
        severity: result.severity ?? rule.severity,
        description: result.description,
        evidence: result.evidence ?? "",
        file: file.rel,
        source: "agentguard",
      });
    }
  }

  if (useEngine && isEngineAvailable()) {
    findings.push(...scanWithEngine(rootDir));
  }

  findings.sort((a, b) => {
    const sa = ["critical", "high", "medium", "low", "info"].indexOf(a.severity);
    const sb = ["critical", "high", "medium", "low", "info"].indexOf(b.severity);
    return sa - sb || a.file.localeCompare(b.file);
  });

  return {
    repo: rootDir,
    timestamp: new Date().toISOString(),
    findings,
    summary: summarize(findings),
  };
}

export function hasSeverity(report, minSeverity) {
  const order = ["critical", "high", "medium", "low", "info"];
  const threshold = order.indexOf(minSeverity);
  return report.findings.some((f) => order.indexOf(f.severity) <= threshold);
}
