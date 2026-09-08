# Echtwelt-Befunde (30-Repo-Scan, v0.1.3)

> Verifizierte Befunde aus dem Outreach-Lauf über GitHub-Code-Suche
> ("AGENTS.md in:path", 30 öffentliche Repos). Jeder Befund wurde manuell
> am Byte-Kontext geprüft — das ist der Unterschied zwischen Alarmismus
> und evidenzbasiertem Scanning.

## Ergebnis-Überblick

| Repo | Note | Befund | Einschätzung |
|---|---|---|---|
| [WecomTeam/wecom-cli](https://github.com/WecomTeam/wecom-cli) | E | ZWSP (U+200B) **direkt vor einer bash-Code-Block** in `docs/e2e/DESC_SPEC.md` | ⚠️ **Höchst verdächtig** — Agenten-Spec: unsichtbares Zeichen vor ausführbarem Block |
| [joske/yserver](https://github.com/joske/yserver) | E | ZWSP mitten im Satz einer Agenten-Spec (`arm/␣spin`) in `docs/superpowers/specs/…md` | ⚠️ verdächtig — exakt das Injection-Muster (oder Abschreib-Artefakt) |
| [GoogleContainerTools/config-sync](https://github.com/GoogleContainerTools/config-sync) | E | ZWSP am Zeilenende in `examples/post-sync/README.md` | Artefakt-artig, Regel korrekt |
| [InvoiceShelf/InvoiceShelf](https://github.com/InvoiceShelf/InvoiceShelf) | E | ZWSP in `lang/ru.json` (Übersetzungsdatei) | Artefakt-artig, Regel korrekt |
| [nextcloud/android](https://github.com/nextcloud/android) | E | Committeter Google-API-Key `AIzaSy…` in `values/setup.xml` | Committed credential; bei Android-Client-Keys branchenüblich, Risiko kontextabhängig |

## Methodik (warum man dem Material trauen kann)

1. Code-Suche mit verifiziertem Token → echte Repos, die AGENTS.md enthalten
2. Tarball-Checkout → Scan mit deterministischen Regeln
3. **Manuelle Byte-Inspektion jedes kritischen Fundes** (Python-Ausgabe mit
   Hex-Codepoint + Kontext)
4. Fehlalarme → Regel-Präzisierung + Regression-Test (v0.1.1 → v0.1.3)

## Nutzung

Alle Befunde wurden lesend und ohne Ausführung von Repo-Code gewonnen.
Ein Befund ist ein **Muster-Hinweis** (im Zweifel Artefakt ≠ Absicht) —
betroffene Maintainer erhalten die byte-genaue Stelle als Diff. Das ist
der Unterschied zwischen Alarmismus und evidenzbasiertem Scanning.
