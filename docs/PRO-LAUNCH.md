# Pro launch: GitHub App + PR comments

> **English** · [Deutsch](de/PRO-LAUNCH.md)

> The Pro product: the app installs on customer repos and comments on **every
> PR automatically** with a grade + findings — and sets a check run as the
> merge gate. That is the machine behind $19/repo/mo.

## What is already built (v0.2)

- `server/app.js` — webhook server (no external dependencies):
  HMAC verification → tarball checkout → scan → check run → PR comment
- Idempotency: one AgentGuard comment per PR (marker-based)
- Demo mode without GitHub: `node server/app.js --demo` → `server/demo-output/`
- 4 unit tests, all green (36/36 total)

## Go live in 15 minutes (4 steps)

**Step 1 — Register the app:** Open `docs/de/install-app.html` in your browser
and click "Create GitHub App". GitHub then shows:

- **App ID** (e.g. `123456`)
- Private key ("Generate a private key" → download the PEM, e.g. to
  `~/.config/agentguard/agentguard-pro.pem`)

**Step 2 — Configuration** (`~/.config/agentguard/app-config.json`):

```json
{
  "appId": "123456",
  "privateKeyPath": "~/.config/agentguard/agentguard-pro.pem",
  "webhookSecret": "CHANGE_ME",
  "port": 4000
}
```

**Step 3 — Start the server + tunnel:**

```bash
node server/app.js
# second terminal (public webhook URL):
cloudflared tunnel --url http://localhost:4000
```

Update the app's webhook URL to `https://YOUR-URL/webhook` in the app
settings → install the app on a test repo → check "Ping" succeeds.

**Step 4 — Test:** open a PR in the test repo → within seconds:
PR comment with grade + findings, check run "AgentGuard" as the gate.

## Security model

| Measure | Details |
|---|---|
| Webhook authentication | HMAC-SHA256 (`X-Hub-Signature-256`, `timingSafeEqual`) |
| App token | RS256 JWT (app ID) → short-lived installation token |
| Customer code | checkout stays in temp dirs (tmp), removed after scan |
| Comment idempotency | prevents comment spam on repeated PR runs |

## Roadmap after v0.2

- [ ] Reusable check-run requirements + branch protection guide
- [ ] RedTeam report trigger via issue comment ("/redteam")
- [ ] Multi-tenant webhook endpoint
- [ ] Billing integration (Free → Pro subscription)
