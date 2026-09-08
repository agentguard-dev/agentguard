# AgentGuard Pro-Server — Deployment (Produktion)

> Wichtig: Diese Infrastruktur wird genutzt, **bevor der erste zahlende
> Pro-Kunde** kommt. Für den aktuellen Demo-/Outreach-Betrieb reicht der
> lokale Tunnel. Kein Release-Blocker.

## Die 2 Optionen

### Option A — Render (Free, 15 Min, $0)

1. Repo auf GitHub verknüpfen: https://render.com → New → **Web Service**
2. Repo `agentguard-dev/agentguard` wählen → Docker (Dockerfile liegt bei)
3. Environment-Variablen setzen:
   - `AGENTGUARD_APP_ID` = 4859039
   - `AGENTGUARD_PRIVATE_KEY_PATH` = siehe unten (Key als Secret montieren)
   - `AGENTGUARD_WEBHOOK_SECRET` = DEIN_GEHEIMES_SECRET
4. Webhook-URL der GitHub-App auf `https://DEIN-RENDER-URL/webhook` ändern

Hinweis Free-Tier: Schlafstart (≤ 30 s) beim ersten Request — für Webhooks
(+ Pings) akzeptabel im MVP; für echte Kunden dann **Starter-Instance** ($7).

### Option B — VPS (Hetzner CX22 ~ €4/Monat, 20 Min)

```bash
# auf dem VPS:
git clone https://github.com/agentguard-dev/agentguard.git /opt/agentguard
cd /opt/agentguard && npm ci --omit=dev
sudo cp deploy/agentguard.service /etc/systemd/system/
# Konfiguration: /etc/agentguard/app-config.json anlegen (Vorlage unten)
sudo systemctl daemon-reload && sudo systemctl enable --now agentguard
# Caddy/Nginx als Reverse-Proxy auf https (z. B. Caddy: 1 Zeile)
```

`/etc/agentguard/app-config.json`:

```json
{
  "appId": "4859039",
  "privateKeyPath": "/etc/agentguard/agentguard-pro.pem",
  "webhookSecret": "DEIN_GEHEIMES_SECRET",
  "port": 4000
}
```

## Checkliste Umzug (Tag X, ~30 Min)

- [ ] Private Key auf den Server übertragen (`scp ~/.config/agentguard/agentguard-pro.pem USER@vps:/etc/agentguard/`)
- [ ] Server starten + `curl https://DOMAIN/ping` → `{"status":"ok"}`
- [ ] GitHub-App → Webhook-URL → `https://DOMAIN/webhook` + Ping-Test
- [ ] Test-PR öffnen → Kommentar + Check-Run erscheinen (wie PR #1/#2)
- [ ] Alte Tunnel-URL aus den App-Settings entfernen
