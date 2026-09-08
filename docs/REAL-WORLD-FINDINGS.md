# Real-world findings (30-repo scan, v0.1.3+)

> **English** · [Deutsch](de/REAL-WORLD-FINDINGS.md)

> Verified findings from a scan run over GitHub code search
> ("AGENTS.md in:path", 30 public repos). Every finding was checked manually
> at byte level — that is the difference between alarmism and evidence-based
> scanning.

## Overview

| Repo | Grade | Finding | Assessment |
|---|---|---|---|
| [WecomTeam/wecom-cli](https://github.com/WecomTeam/wecom-cli) | E | ZWSP (U+200B) **directly before a bash code block** in `docs/e2e/DESC_SPEC.md` | ⚠️ **highly suspicious** — agent-facing spec: invisible char before executable block |
| [joske/yserver](https://github.com/joske/yserver) | E | ZWSP mid-sentence in an agent spec (`arm/␣spin`) in `docs/superpowers/specs/…md` | ⚠️ suspicious — exactly the injection pattern (or a copy/paste artifact) |
| [GoogleContainerTools/config-sync](https://github.com/GoogleContainerTools/config-sync) | E | ZWSP at line end in `examples/post-sync/README.md` | artifact-like; rule correct |
| [InvoiceShelf/InvoiceShelf](https://github.com/InvoiceShelf/InvoiceShelf) | E | ZWSP in `lang/ru.json` (translation file) | artifact-like; rule correct |
| [nextcloud/android](https://github.com/nextcloud/android) | E | Committed Google API key `AIzaSy…` in `values/setup.xml` | committed credential; common for Android client keys, risk is context-dependent |

## Methodology (why the material can be trusted)

1. Code search with a verified token → real repos that contain AGENTS.md
2. Tarball checkout → scan with deterministic rules
3. **Manual byte inspection of every critical finding** (Python output with
   hex codepoint + context)
4. False positives → rule refinement + regression test (v0.1.1 → v0.1.4)

## Usage

All findings were obtained read-only and without executing repo code.
A finding is a **pattern hint** (possibly artifact ≠ intention) — affected
maintainers get the byte-exact location as a diff. That is the difference
between alarmism and evidence-based scanning.
