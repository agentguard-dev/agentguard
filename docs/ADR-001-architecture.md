# ADR-001 — Architecture & Technology Decisions

> **English** · [Deutsch](de/ADR-001-architecture.md)

Status: accepted (2026-09-07)

## Context

A security gate for agent configurations in repos that must be easy to install
and operable by a single maintainer. Core requirements: deterministic results,
no external infrastructure dependencies on the path to first detection,
testable against a reproducible attack fixture, GitHub Actions compatible.

## Decisions

### 1. Node.js ≥ 18, standard library only in the scan core
No build step, no transpilers. `node --test` as the test runner (currently
47 tests). Rationale: GitHub runners have Node; zero build = zero install
friction.

### 2. Own deterministic rule engine as the primary layer
`src/rules.js`: 12 rule classes as pure functions over file contents. Rationale:

- Reproducible & testable (12/12 fixtures, 0 false positives)
- No LLM in the path → the tool itself cannot be prompt-injected
- Works without node_modules (important for the GitHub Action)

### 3. ecc-agentshield as an optional best-effort layer
`src/engine.js`: CLI adapter, JSON output, fails open (never fatal).
Rationale: ~100 maintained rules as a bonus; the engine is Claude-home
oriented, therefore never the primary source. Disable via
`AGENTGUARD_NO_ENGINE=1` (used in tests/actions for determinism).

### 4. No persistence in week 1
State and settings persistence only with the web app (week 5+). The CLI is
stateless; `.agentguard-ignore` is the only config file (versioned in the repo
= simplest collaboration).

### 5. GitHub Action as composite step with summary output
No container publish needed: `action.yml` uses `$GITHUB_ACTION_PATH`, writes
findings to `$GITHUB_STEP_SUMMARY` and lets the exit code act as the gate.
PR comments (Pro feature) come later via the GitHub App.

### 6. A–F grading via weighted scores
critical=100, high=60, medium=30, low=10, info=3. Thresholds: B ≥ 1, C ≥ 20,
D ≥ 60, E ≥ 100, F ≥ 250. Grades feed summary, landing page and demo.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Everything in one GitHub Action (no CLI) | Not testable locally, no demo material, no dogfooding |
| LLM analysis in the scan path | Cost, non-determinism, own attack vector |
| Database from day 1 | Persistence only needed with customers; CLI suffices |
| Python/Go | Node ecosystem + engine already installed |

## Consequences

- Scan core is dependency-free: the Action needs no `npm ci`
- Tests run in < 100 ms → CI stays fast
- Pro features (comments, rules UI, RedTeam) attach to the CLI without changing the core
