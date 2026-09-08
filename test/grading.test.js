// Unit tests for grade mapping and severity gating.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeOf, summarize } from "../src/findings.js";
import { hasSeverity } from "../src/scanner.js";

const f = (severity) => ({ id: "X", severity, file: "a", description: "d", evidence: "" });

test("grade mapping: clean → A, one medium → C, criticals → F", () => {
  assert.equal(gradeOf([]).grade, "A");
  assert.equal(gradeOf([f("medium")]).grade, "C");
  assert.equal(gradeOf([f("high")]).grade, "D");
  assert.equal(gradeOf([f("critical")]).grade, "E"); // 100 points → E
  assert.equal(gradeOf([f("critical"), f("high"), f("medium")]).grade, "E");
  assert.equal(gradeOf([f("critical"), f("critical"), f("critical")]).grade, "F");
});

test("summarize counts per severity", () => {
  const s = summarize([f("critical"), f("high"), f("low"), f("info")]);
  assert.equal(s.count, 4);
  assert.equal(s.bySeverity.critical, 1);
  assert.equal(s.bySeverity.low, 1);
});

test("hasSeverity gating thresholds", () => {
  const report = { findings: [f("critical"), f("medium")] };
  assert.equal(hasSeverity(report, "critical"), true);
  assert.equal(hasSeverity(report, "medium"), true);
  assert.equal(hasSeverity(report, "low"), true);
  const clean = { findings: [f("info")] };
  assert.equal(hasSeverity(clean, "critical"), false);
  assert.equal(hasSeverity(clean, "info"), true);
});
