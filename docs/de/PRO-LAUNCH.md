> [English](../PRO-LAUNCH.md) · **Deutsch**

# Pro-Launch: GitHub App + PR-Kommentare

> Das Pro-Produkt: Die App installiert sich auf den Repos deiner Kunden und
> kommentiert **jeden PR automatisch** mit Note + Findings — und setzt einen
> Check-Run als Merge-Gate. Das ist die Maschine hinter $19/Repo/Monat.

## Was bereits gebaut ist (v0.2)

- `server/app.js` — Webhook-Server (keine externen Deps):
  HMAC-Verifikation → Tarball-Checkout → Scan → Check-Run → PR-Kommentar
- Idempotenz: Ein AgentGuard-Kommentar pro PR (Marker-basiert)
- Demo-Modus ohne GitHub: `node server/app.js --demo` → `server/demo-output/`
- 4 Unit-Tests, alle grün (47/47 gesamt)

## In 15 Minuten live (deine 4 Schritte)

**Schritt 1 — App registrieren:** Öffne `docs/de/install-app.html` in deinem Browser
und klicke „GitHub App erstellen". GitHub zeigt dir danach:

- **App-ID** (z. B. `123456`)
- Privaten Schlüssel („Generate a private key" → `agentguard-pro.pem` herunterladen,
  z. B. nach `~/.config/agentguard/agentguard-pro.pem` verschieben)

**Schritt 2 — Konfiguration** (`~/.config/agentguard/app-config.json`):

```json
{
  "appId": "123456",
  "privateKeyPath": "~/.config/agentguard/agentguard-pro.pem",
  "webhookSecret": "DEIN_GEHEIMES_SECRET",
  "port": 4000
}
```

**Schritt 3 — Server starten + Tunnel:**

```bash
node ~/projects/agentguard/server/app.js
# in zweitem Terminal (öffentliche Webhook-URL):
brew install cloudflared   # oder: npx localtunnel --port 4000
cloudflared tunnel --url http://localhost:4000
```

In den App-Settings die Webhook-URL auf `https://DEINE-URL/webhook` ändern →
App auf Test-Repo installieren (Settings → Install App) → Webhook-Test „Ping" prüfen.

**Schritt 4 — Test:** PR im Test-Repo öffnen → innerhalb von Sekunden:
PR-Kommentar mit Note + Findings, Check-Run „AgentGuard" als Gate.

## Sicherheitsmodell

| Maßnahme | Details |
|---|---|
| Webhook-Authentifizierung | HMAC-SHA256 (`X-Hub-Signature-256`, `timingSafeEqual`) |
| App-Token | RS256-JWT (App-ID) → Installationstoken (kurzlebig) |
| Kein Kunden-Code auf dein System? | Nein — der Server läuft beim Kunden bzw. auf deinem Host; Downloads bleiben in tmp (Temp) |
| Kommentar-Idempotenz | verhindert Kommentar-Spam bei PR-Neu-Runs |

## Roadmap nach v0.2

- [ ] Check-Run mit `require_status_checks` + Branch-Protection-Anleitung
- [ ] RedTeam-Report-Auslöser per Issue-Kommentar („/redteam") — $499-Flow
- [ ] Multi-Tenant: ein Webhook endpoin, N Kunden-Repos
- [ ] Billing-Integration (Free → Pro-Abo)
