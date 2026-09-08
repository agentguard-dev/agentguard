// Tests für den Pro-Server: Signatur-Verifikation + Event-Parsing + Demo-Modus.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifySignature, parseWebhookEvent, runDemo } from "../server/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

test("webhook signature: valid HMAC accepted, tampered rejected", () => {
  const secret = "test-secret";
  const raw = Buffer.from(JSON.stringify({ foo: "bar" }));
  const signature = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(verifySignature(raw, signature, secret), true);
  assert.equal(verifySignature(raw, "sha256=" + "0".repeat(64), secret), false);
  assert.equal(verifySignature(raw, undefined, secret), false);
  assert.equal(verifySignature(raw, signature, undefined), false);
});

test("webhook event parsing: only pull_request opened/synchronize", () => {
  const base = {
    action: "opened",
    repository: { full_name: "acme/widgets" },
    pull_request: { number: 42, title: "Feat", head: { sha: "abc123" } },
  };
  const event = parseWebhookEvent(base);
  assert.equal(event.repo, "acme/widgets");
  assert.equal(event.sha, "abc123");
  assert.equal(event.number, 42);
  assert.equal(parseWebhookEvent({ action: "push" }), null);
  assert.equal(parseWebhookEvent({ action: "pull_request", pull_request: { head: {} } }), null);
});

test("demo mode produces report + comment + check-run without GitHub", () => {
  const out = execFileSync("node", [path.join(ROOT, "server", "app.js"), "--demo"], { encoding: "utf8" });
  assert.match(out, /Demo ohne GitHub/);
  for (const f of ["scan-report.md", "pr-comment.md", "check-run.json"]) {
    assert.ok(fs.existsSync(path.join(ROOT, "server", "demo-output", f)), `${f} should exist`);
  }
  const check = JSON.parse(fs.readFileSync(path.join(ROOT, "server", "demo-output", "check-run.json"), "utf8"));
  assert.equal(check.conclusion, "failure");
});
