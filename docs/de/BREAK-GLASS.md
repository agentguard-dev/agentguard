# Break-Glass-Policy — Ausnahmen vom Gate

> [English](../BREAK-GLASS.md) · **Deutsch**

AgentGuard blockt Merges bei Befunden. Manchmal ist ein Befund ein
verifizierter False Positive — dann braucht das Team einen Weg,
weiterzuarbeiten, **ohne** das Gate still zur Fiktion zu machen. Diese
Policy definiert den einzigen unterstützten Ausnahmepfad: **Break-Glass-Waiver**.

## Warum es das gibt

> „The bypass path can quietly become the real policy surface."

Ein stiller Bypass (`exclude`, `exit-on: never`) ist unsichtbar, permanent
und unbelegt. Nach einem Vorfall kann niemand rekonstruieren, warum das
Gate aus war — oder überhaupt, dass es aus war. Break-Glass macht jede
Ausnahme:

- **Reviewbar** — eine zweite Person muss gegenlesen (Pflichtfeld Reviewer)
- **Zeitlich begrenzt** — maximal 30 Tage, durchgesetzt vom Issue-Template
  und dem Guardian-Workflow
- **Belegt** — das Waiver-Issue *ist* der unveränderliche Beleg (immutable
  receipt): öffentlich, dauerhaft, von jedem betroffenen Pipeline-Run
  verlinkt

## Wann ein Waiver legitim ist

- Eine Regel erzeugt einen **verifizierten False Positive**
  (reproduziert und dokumentiert)
- Eine zeitlich begrenzte Ausnahme während einer Migration oder
  eines Rollouts

## Wann ein Waiver nie legitim ist

- Für einen Befund, der ein **echter Angriff** oder ein echtes committetes
  Secret ist — den Inhalt fixen, nicht das Gate ausschalten
- Als Dauerlösung — wiederholte Verlängerungen sind ein Policy-Verstoß

## Der Ablauf

1. **Waiver-Issue anlegen** über das Template
   „Break-Glass-Ausnahme (Gate-Waiver)" (Label `break-glass`) mit:
   Befund (Regel-ID + Datei), Begründung, Gültig bis (YYYY-MM-DD,
   max. 30 Tage), Reviewer, Wiederherstellung.
2. **Im Workflow referenzieren**:
   ```yaml
   - uses: agentguard-dev/agentguard@v0
     with:
       exit-on: never
       waiver-issue: "123"
   ```
   Der Pipeline-Run verlinkt den Beleg jetzt in seiner Step-Summary.
3. **Optional fail-closed**: mit `strict: true` schlägt
   `exit-on: never` ohne `waiver-issue` fehl.
4. **Der Guardian setzt den Ablauf durch**: `workflow-templates/
   break-glass-guard.yml` ins eigene Repo kopieren (wöchentlicher
   Schedule). Abgelaufene Waiver werden kommentiert, zusätzlich entsteht
   ein Warn-Issue. Pro-Kunden erhalten stattdessen automatische
   Re-Sharpening-PRs.

## Was NICHT durchgesetzt wird (ehrlich bleiben)

Wer Workflow-Dateien editieren darf, kann das Gate immer komplett
entfernen — kein Tool kann das verhindern. Break-Glass verwandelt den
*stillen Drift* in eine *bewusste, geprüfte, ablaufende Entscheidung*.
Genau darum geht es: Der Bypass hört auf, der stille Default zu sein,
und wird zu einem dokumentierten Ereignis mit Frist und Beleg.
