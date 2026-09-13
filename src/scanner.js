// AgentGuard scanner: walks a repo, runs deterministic rules + engine layer,
// and produces a normalized report.
import fs from "node:fs";
import path from "node:path";
import { walkFiles, readText, globToRegExp } from "./fsutil.js";
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

// Normalisiert einen Fundort auf einen Pfad relativ zur Scan-Wurzel. Die
// Engine liefert je nach Aufruf relative oder absolute Pfade.
export function toRepoRelative(rootDir, file) {
  if (!file) return "";
  const abs = path.isAbsolute(file) ? file : path.resolve(rootDir, file);
  return path.relative(rootDir, abs);
}

// Baut Pfad-Matcher aus ignore/exclude-Mustern (RegExp bleibt unverändert).
export function buildExcludeMatchers(patterns) {
  return patterns.map((p) => (p instanceof RegExp ? p : globToRegExp(p)));
}

export function isExcluded(matchers, rel) {
  return matchers.some((re) => re.test(rel));
}

export function scanRepo(
  rootDir,
  { useEngine = true, excludeDirs = [], customExcludes = [], honorIgnoreFile = true } = {}
) {
  rootDir = path.resolve(rootDir);
  const findings = [];
  const ignore = [...(honorIgnoreFile ? loadIgnoreFile(rootDir) : []), ...customExcludes];
  const excludeMatchers = buildExcludeMatchers(ignore);

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
    // agentshield kennt kein --exclude/--ignore. Ohne diesen Filter umging die
    // Engine-Layer jeden Ausschluss — auch die offizielle Break-Glass-Ausnahme.
    findings.push(
      ...scanWithEngine(rootDir).filter(
        (f) => !isExcluded(excludeMatchers, toRepoRelative(rootDir, f.file))
      )
    );
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
