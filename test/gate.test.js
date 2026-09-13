// CLI-Gate-Tests: Exit-Code-Verhalten als echte Prozess-Tests (kein Mock).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "..", "cli.js");
const VULN = path.join(__dirname, "fixtures", "vulnerable");
const CLEAN = path.join(__dirname, "fixtures", "clean");

test("CLI gate exits 2 on critical with a readable message", () => {
  let status = null;
  let stderr = "";
  try {
    execFileSync("node", [CLI, "scan", "--path", VULN, "--engine", "off", "--exit-on", "critical"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (e) {
    status = e.status;
    stderr = String(e.stderr ?? "");
  }
  assert.equal(status, 2, "gate must reject the vulnerable repo");
  assert.match(stderr, /GATE FAILED/);
  assert.match(stderr, /INSTR-OVR-001/);
});

test("CLI gate passes on a clean repo", () => {
  const out = execFileSync("node", [CLI, "scan", "--path", CLEAN, "--engine", "off", "--exit-on", "critical"], {
    encoding: "utf8",
  });
  assert.match(out, /grade A/);
});

test("CLI report mode never fails the job", () => {
  const out = execFileSync("node", [CLI, "scan", "--path", VULN, "--engine", "off", "--format", "summary"], {
    encoding: "utf8",
  });
  assert.match(out, /grade F/);
});

test("invalid --exit-on fails closed (exit 2, no silent pass)", () => {
  let status = null;
  let stderr = "";
  try {
    execFileSync("node", [CLI, "scan", "--path", VULN, "--engine", "off", "--exit-on", "banana"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (e) {
    status = e.status;
    stderr = String(e.stderr ?? "");
  }
  assert.equal(status, 2, "invalid config must fail the job instead of passing");
  assert.match(stderr, /Ungültiger Wert für --exit-on/);
});

// Regression: a typo'd flag name used to be dropped silently, leaving exitOn at
// its "never" default — the gate reported grade F on the vulnerable repo and
// still exited 0. Unknown options must fail the job, never disable the gate.
test("unknown option fails closed (no silent gate bypass)", () => {
  let status = null;
  let stderr = "";
  try {
    execFileSync("node", [CLI, "scan", "--path", VULN, "--engine", "off", "--exit-onn", "critical"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (e) {
    status = e.status;
    stderr = String(e.stderr ?? "");
  }
  assert.equal(status, 2, "unknown option must fail the job instead of silently disabling the gate");
  assert.match(stderr, /Unbekannte Option/);
});

test("option without a value fails closed instead of crashing", () => {
  let status = null;
  let stderr = "";
  try {
    execFileSync("node", [CLI, "scan", "--path", ".", "--engine", "off", "--exclude"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (e) {
    status = e.status;
    stderr = String(e.stderr ?? "");
  }
  assert.equal(status, 2, "a missing value must be a usage error (exit 2), not an uncaught crash");
  assert.match(stderr, /Fehlt ein Wert/);
  assert.doesNotMatch(stderr, /TypeError/, "must not leak an uncaught exception stack trace");
});
