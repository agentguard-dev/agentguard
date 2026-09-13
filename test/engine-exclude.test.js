// Regression: the engine layer was invoked without the ignore/exclude patterns,
// so `--exclude outreach` still reported engine findings from outreach/.
// Deterministic rule findings honoured the excludes; engine findings did not,
// which silently broke the only sanctioned exception path (docs/BREAK-GLASS.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExcludeMatchers, isExcluded, toRepoRelative, scanRepo } from "../src/scanner.js";
import { isEngineAvailable } from "../src/engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

test("exclude patterns match paths the way the file walker does", () => {
  const matchers = buildExcludeMatchers(["outreach", "docs/", "**/generated"]);

  assert.equal(isExcluded(matchers, "outreach/aptos/src/AGENTS.md"), true);
  assert.equal(isExcluded(matchers, "outreach"), true);
  assert.equal(isExcluded(matchers, "docs/SECURITY.md"), true);
  assert.equal(isExcluded(matchers, "src/generated/x.js"), true);
  assert.equal(isExcluded(matchers, "src/rules.js"), false);
  assert.equal(isExcluded(matchers, "docs-archive/README.md"), false, "must not prefix-match a sibling dir");
});

test("existing RegExp excludes pass through unchanged", () => {
  const matchers = buildExcludeMatchers([/^vendor\//]);
  assert.equal(isExcluded(matchers, "vendor/lib/a.js"), true);
  assert.equal(isExcluded(matchers, "src/a.js"), false);
});

test("absolute engine paths are normalised before matching", () => {
  assert.equal(toRepoRelative("/repo", "/repo/outreach/file.md"), "outreach/file.md");
  assert.equal(toRepoRelative("/repo", "outreach/file.md"), "outreach/file.md");
  assert.equal(toRepoRelative("/repo", ""), "");
  assert.equal(toRepoRelative("/repo", undefined), "");
});

// Invariant that must hold whenever the engine layer runs: no engine finding may
// come from an excluded path. Holds whether or not the engine reports anything.
test("engine findings never come from an excluded path", { skip: isEngineAvailable() ? false : "engine not installed" }, () => {
  const report = scanRepo(ROOT, { useEngine: true, customExcludes: ["outreach", "docs", "test"] });
  const leaked = report.findings.filter(
    (f) => f.source === "ecc-agentshield" && isExcluded(buildExcludeMatchers(["outreach", "docs", "test"]), toRepoRelative(ROOT, f.file))
  );
  assert.deepEqual(
    leaked.map((f) => f.file),
    [],
    "engine findings from excluded paths must be filtered out"
  );
});

test("engine findings from non-excluded paths are kept", { skip: isEngineAvailable() ? false : "engine not installed" }, () => {
  const report = scanRepo(ROOT, { useEngine: true, customExcludes: ["outreach"] });
  const engineFindings = report.findings.filter((f) => f.source === "ecc-agentshield");
  // Every surviving engine finding must be a real path outside the excluded tree.
  for (const f of engineFindings) {
    assert.ok(!String(f.file).includes("outreach"), `engine finding leaked from excluded path: ${f.file}`);
  }
});
