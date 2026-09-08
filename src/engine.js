// Adapter for the ecc-agentshield engine (best-effort second layer).
// The engine is Claude-Home-oriented; AgentGuard's own rules are the primary
// layer. Engine findings are normalized and marked with source.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function engineBin() {
  return path.join(
    __dirname,
    "..",
    "node_modules",
    ".bin",
    process.platform === "win32" ? "agentshield.cmd" : "agentshield"
  );
}

export function isEngineAvailable() {
  if (process.env.AGENTGUARD_NO_ENGINE === "1") return false;
  try {
    fs.statSync(engineBin());
    return true;
  } catch {
    return false;
  }
}

export function scanWithEngine(targetPath, { minSeverity = "medium", timeoutMs = 120000 } = {}) {
  if (process.env.AGENTGUARD_NO_ENGINE === "1") return [];
  try {
    const stdout = execFileSync(
      engineBin(),
      ["scan", "--path", targetPath, "--format", "json", "--min-severity", minSeverity],
      { encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "ignore"] }
    );
    const parsed = JSON.parse(stdout);
    const findings = Array.isArray(parsed) ? parsed : (parsed?.findings ?? []);
    return findings.map((f) => ({
      id: `ENG-${f.id}`,
      severity: f.severity,
      description: f.title ?? f.description ?? "Engine finding",
      file: f.file ?? "",
      evidence: f.description ?? "",
      source: "ecc-agentshield",
    }));
  } catch {
    // Engine is optional: never fail the scan because of the adapter.
    return [];
  }
}
