# RedTeam pipeline — AgentGuard Pro Feature

> **English** · [Deutsch](de/REDTEAM.md)

> Three agents actively attack your repo: **attacker (red team)** searches
> exploit chains, **defender (blue team)** honestly checks every claim,
> **auditor** synthesizes the prioritized report.

## Usage

```bash
# 1) Generate prompts only (free, deterministic):
node scripts/redteam.js --repo <path> --dry-run

# 2) Full run (3 agents via claude -p / DeepSeek):
node scripts/redteam.js --repo <path>            # output: ./redteam/REDTEAM-REPORT.md
```

Resume logic: finished agent outputs (`attacker.md` / `defender.md`) are
skipped on the next run — an interrupted run is never lost.

## Configuration

| Variable | Default | Effect |
|---|---|---|
| `AGENTGUARD_REDTEAM_BIN` | `claude` | LLM runner (e.g. custom gateway wrapper) |
| `CLAUDE_CODE_EFFORT_LEVEL` | `medium` | Agent reasoning depth (pipeline practice: medium = fast & cheap) |

## What the client receives (report)

- Executive summary (3–5 sentences, no jargon)
- Risk matrix (priority, probability, impact, recommendation)
- Top-5 action list with effort estimates
- Limitations & open questions (honest self-limitation)

## Price & delivery

| What you get | Details |
|---|---|
| Monthly 3-agent attack | attacker → defender → auditor |
| Report | executive summary, risk matrix, top-5 action list |
| Price | $499/quarter (team bundles on request) |

## Demo report

The verified demo run against our 12-payload fixture repo is available as
[REDTEAM-DEMO-EXAMPLE.md](de/REDTEAM-DEMO-EXAMPLE.md) (German, with the
example payloads documented — run locally with `node scripts/redteam.js
--repo test/fixtures/vulnerable`).
