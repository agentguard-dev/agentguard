# ADR-002 — Break-Glass-Governance für Gate-Ausnahmen

> [English](../ADR-002-break-glass-governance.md) · **Deutsch**

Status: angenommen (2026-09-09)

## Kontext

Ein dev.to-Leser schrieb nach dem v0.2.1-Launch-Post:

> "The self-blocked PR is a strong demonstration because it proves the gate
> has authority over its own maintenance path. One extra safeguard worth
> documenting is a separate, reviewable break-glass workflow with a
> time-bound exception and an immutable receipt. Otherwise the bypass path
> can quietly become the real policy surface."

AgentGuard bietet stille, permanente Bypässe (`exclude`, `exit-on: never`).
Stille Bypässe sind die häufigste Todesart von CI-Sicherheits-Gates: Eine
unter Zeitdruck gemachte Ausnahme wird zur Norm, und nach einem Vorfall
kann niemand rekonstruieren, warum das Gate aus war — oder dass es aus war.
Wir brauchten einen Ausnahmepfad, der reviewbar, zeitlich begrenzt und
belegt ist — ohne so viel Reibung, dass Teams das Gate gleich ganz entfernen.

## Entscheidung

**Break-Glass-Waiver** werden als einziger unterstützter Ausnahmepfad
eingeführt, in drei Schichten:

1. **Policy** — `docs/BREAK-GLASS.md` (DE/EN): wann Waiver legitim sind
   (nur verifizierte False Positives), wann nie (echte Angriffe/Secrets),
   max. 30 Tage, Pflicht-Reviewer.
2. **Beleg & Ablauf** — Issue-Template `break-glass.yml` (Label
   `break-glass`) als *immutable receipt*; Action-Inputs `waiver-issue`
   (verlinkt den Beleg in der Step-Summary) und `strict` (fail-closed:
   `exit-on: never` ohne Beleg schlägt fehl); `scripts/action-gate.sh`
   aus `action.yml` extrahiert, damit die Governance-Logik testbar ist;
   `scripts/guardian.js` + `workflow-templates/break-glass-guard.yml`:
   wöchentliche Ablauf-Prüfung, kommentiert abgelaufene Waiver und
   erstellt ein Warn-Issue.
3. **Pro** — der PR-Bot eskaliert Abläufe künftig mit automatischen
   Re-Sharpening-PRs (Roadmap; der Free-Guardian kommentiert + warnt).

## Erwogene Alternativen

- **Stille Bypässe sofort hart verbieten** (Breaking Change) — verworfen:
  Bestandsadopter hätten keinen Migrationspfad; `strict: true` ist der
  Opt-in-Weg, harter Default erst in einer späteren Major-Version.
- **Nichts tun / nur dokumentieren** — verworfen: Dokumentation allein
  erzeugt weder Belege noch Fristen; der vom Leser beschriebene Drift
  würde weitergehen.
- **Admin-seitige Erzwingung (z. B. Required Checks)** — komplementär,
  keine Alternative: Kein Tool kann einen Admin am Löschen des Workflows
  hindern; unser Ziel ist Sichtbarkeit + Ablauf, keine unmögliche
  Zwangsvollstreckung.

## Konsequenzen

- **Positiv:** Jede Ausnahme wird ein öffentliches, reviewbares,
  ablaufendes Ereignis; die Step-Summary eines suspendierten Gates trägt
  immer den Beleg-Link; Rekonstruktion nach Vorfällen wird möglich; die
  Enterprise-Compliance-Story verbessert sich.
- **Negativ:** Eine zusätzliche Eingabe-Fläche (`waiver-issue`, `strict`)
  zum Dokumentieren und Testen; das Guardian-Template braucht einen
  Scheduled-Workflow im Nutzer-Repo (Opt-in).
- **Ehrliche Grenze:** Break-Glass kann einen Admin nicht am kompletten
  Entfernen des Workflows hindern — es verwandelt stillen Drift in eine
  bewusste, geprüfte, ablaufende Entscheidung.
