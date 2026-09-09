# Landing-Metriken — Event-Liste & monatlicher Check

> **Deutsch** · [English](../LANDING-METRICS.md)

Jeder CTA auf der Landingpage feuert ein **GoatCounter-Event** (cookie-los,
DSGVO-freundlich). Events werden nur erfasst, wenn der Zähler geladen ist —
ein fehlender Zähler bricht die Seite nie.

## Event-Liste

| Event | Auslöser | Bedeutung |
|---|---|---|
| `hero_install` | Primärer Hero-CTA (kostenlos einrichten) | Top-of-Funnel-Absicht |
| `hero_demo` | Hero-CTA „Live-Demo" | Interesse am Beweis |
| `nav_install` | Nav-CTA | Schnelle/erneute Absicht |
| `setup_copy` | Workflow-Kopieren-Button | Aktiver Einrichtungsstart |
| `demo_tab_vuln` | Demo-Tab „Angriffs-Repo" | Bedrohungs-Neugier |
| `demo_tab_clean` | Demo-Tab „Sauberes Repo" | Kontroll-Neugier |
| `pricing_free` | Free-Karten-CTA | Installations-Absicht |
| `pricing_pro` | Pro-CTA + Upsell-Link in der Free-Karte | Pro-Interesse (Umsatzsignal) |
| `pricing_audit` | Audit-Karten-CTA | Audit-Interesse ($499-Signal) |
| `pricing_redteam` | RedTeam-Karten-CTA | RedTeam-Interesse ($499/Quartal) |
| `audit_request` | „Erster Scan kostenlos"-Zeile | Weiche Anfrage-Absicht |
| `faq_open` | Jede geöffnete FAQ | Einwand-Recherche |
| `footer_marketplace` | Footer-Marketplace-Link | Distributions-Check |
| `footer_github` | Footer-GitHub-Link | Vertrauens-/Recherche-Check |

## Monatlicher Check-Prozess (was mit den Zahlen tun)

1. **Install-CTR ≥ 3 %** der Pageviews: `(hero_install + nav_install + pricing_free + setup_copy) / Pageviews`.
   Unter 3 % → Hero-Copy oder CTA-Platzierung schwach; Headline-Varianten testen.
2. **Audit-Requests ≥ 1 %**: `(pricing_audit + pricing_redteam + pricing_pro + audit_request) / Pageviews`.
   Unter 1 % → Preissektion zu weit unten oder Einwand nicht adressiert;
   einen Geld-CTA in den Hero ziehen und FAQ-Öffnungsrate prüfen.
3. **Pro/RedTeam-Mix**: `pricing_pro / pricing_audit` zeigt, ob das
   wiederkehrende Produkt oder der Einmal-Audit zieht — Pitch danach ausrichten.
4. **Setup-Funnel**: `setup_copy / hero_install` unter 40 % → Setup-Block
   unklar; Snippet oder Schritte vereinfachen.

Check jeweils am Monatsersten gegen das GoatCounter-Dashboard; Zahlen
hier unter „## Historie" festhalten.

## Historie

_Noch keine Einträge._
