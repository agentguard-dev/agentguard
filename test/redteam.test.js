// Tests für die RedTeam-Pipeline (deterministische Teile — keine LLM-Aufrufe).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildRedTeamPrompts } from "../src/redteam.js";
import { scanRepo } from "../src/scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FIXTURE = path.join(__dirname, "fixtures", "vulnerable");

test("prompts contain all three roles and the findings context", () => {
  const report = scanRepo(FIXTURE, { useEngine: false });
  const { attackerPrompt, defenderPrompt, auditorPrompt } = buildRedTeamPrompts({
    repo: "fixture",
    report,
  });
  for (const [name, p] of Object.entries({ attackerPrompt, defenderPrompt, auditorPrompt })) {
    assert.ok(p.length > 300, `${name} should be substantial`);
  }
  assert.match(attackerPrompt, /Red Team/);
  assert.match(attackerPrompt, /INSTR-OVR-001|UNICODE-001|MCP-001/);
  assert.match(defenderPrompt, /Blue Team/);
  assert.match(auditorPrompt, /Executive Summary/);
});

test("CLI dry-run writes prompts and scan report without LLM", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "ag-rt-"));
  execFileSync("node", [path.join(ROOT, "scripts", "redteam.js"), "--repo", FIXTURE, "--dry-run", "--out", out], {
    encoding: "utf8",
  });
  for (const f of ["scan-report.md", "prompts/1-attacker.md", "prompts/2-defender.md", "prompts/3-auditor.md"]) {
    assert.ok(fs.existsSync(path.join(out, f)), `${f} should exist`);
  }
  const report = fs.readFileSync(path.join(out, "scan-report.md"), "utf8");
  assert.match(report, /Grade: F/);
});

test("clean fixture yields grade A in the redteam input", () => {
  const report = scanRepo(path.join(__dirname, "fixtures", "clean"), { useEngine: false });
  assert.equal(report.summary.grade, "A");
});
