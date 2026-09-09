// Tests für scripts/guardian.js — pure Funktionen der
// Break-Glass-Ablauf-Logik (deterministisch, ohne GitHub-API).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractExpiry,
  isExpired,
  findExpired,
  expiryComment,
  warningIssueBody,
} from "../scripts/guardian.js";

const NOW = new Date("2026-09-09T12:00:00Z");

const waiverBody = (date) => `### Betroffener Befund

EXFIL-001 in skills/export/SKILL.md

### Gültig bis (YYYY-MM-DD, max. 30 Tage)

${date}
`;

test("extractExpiry parses the template date", () => {
  const r = extractExpiry(waiverBody("2026-09-20"), NOW);
  assert.ok(r);
  assert.equal(r.date.toISOString().slice(0, 10), "2026-09-20");
  assert.equal(r.overLimit, false);
});

test("extractExpiry flags dates beyond 30 days", () => {
  const r = extractExpiry(waiverBody("2027-01-01"), NOW);
  assert.ok(r);
  assert.equal(r.overLimit, true);
});

test("extractExpiry returns null for missing or invalid dates", () => {
  assert.equal(extractExpiry("kein Datum hier", NOW), null);
  assert.equal(extractExpiry(waiverBody("31.02.2026"), NOW), null);
  assert.equal(extractExpiry(null, NOW), null);
});

test("extractExpiry understands the English label", () => {
  const en = "### Valid until (YYYY-MM-DD, max 30 days)\n\n2026-09-15\n";
  const r = extractExpiry(en, NOW);
  assert.ok(r);
  assert.equal(r.date.toISOString().slice(0, 10), "2026-09-15");
});

test("isExpired is true only after the expiry date", () => {
  const future = { number: 1, title: "x", body: waiverBody("2026-09-20") };
  const past = { number: 2, title: "x", body: waiverBody("2026-09-01") };
  const noDate = { number: 3, title: "x", body: "ohne Datum" };
  assert.equal(isExpired(future, NOW), false);
  assert.equal(isExpired(past, NOW), true);
  assert.equal(isExpired(noDate, NOW), false);
});

test("findExpired returns only expired issues", () => {
  const issues = [
    { number: 1, title: "x", body: waiverBody("2026-09-20") },
    { number: 2, title: "x", body: waiverBody("2026-09-01") },
    { number: 3, title: "x", body: waiverBody("2026-08-15") },
  ];
  const expired = findExpired(issues, NOW);
  assert.deepEqual(expired.map((i) => i.number), [2, 3]);
});

test("expiryComment names the deadline and the restoration steps", () => {
  const issue = { number: 7, title: "t", body: waiverBody("2026-09-01") };
  const c = expiryComment(issue, NOW);
  assert.match(c, /abgelaufen \(2026-09-01\)/);
  assert.match(c, /waiver-issue/);
  assert.match(c, /docs\/BREAK-GLASS\.md/);
});

test("warningIssueBody lists all expired issues", () => {
  const expired = [
    { number: 2, title: "[Break-Glass] FP in SKILL", body: "x" },
    { number: 5, title: "[Break-Glass] Migration", body: "x" },
  ];
  const b = warningIssueBody(expired, NOW);
  assert.match(b, /2 abgelaufene Break-Glass-Ausnahme/);
  assert.match(b, /#2 — FP in SKILL/);
  assert.match(b, /#5 — Migration/);
  assert.match(b, /2026-09-09/);
});
