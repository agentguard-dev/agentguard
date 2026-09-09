#!/usr/bin/env bash
# AgentGuard Action Gate — validiert Inputs (fail-closed), schreibt
# Step-Summary-Warnungen inkl. Break-Glass-Governance und führt den
# Scan aus. Bewusst ein eigenes Skript, damit die Logik lokal testbar
# ist (test/action-gate.test.js ruft dieses Skript als Prozess auf).
set -o pipefail

WORKSPACE="${GITHUB_WORKSPACE:?}"
ACTION_PATH="${GITHUB_ACTION_PATH:?}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/null}"
AG_PATH="${AG_PATH:-.}"
AG_EXIT_ON="${AG_EXIT_ON:-critical}"
AG_EXCLUDE="${AG_EXCLUDE:-}"
AG_WAIVER_ISSUE="${AG_WAIVER_ISSUE:-}"
AG_STRICT="${AG_STRICT:-}"

fail() {
  echo "❌ AgentGuard: $1" >&2
  exit 2
}

# --- Fail-closed: ungültige Eingaben dürfen das Gate nie still deaktivieren ---
case "${AG_EXIT_ON}" in
  critical|high|medium|low|info|never) ;;
  *) fail "Ungültiger Wert für 'exit-on': '${AG_EXIT_ON}' (erlaubt: critical|high|medium|low|info|never)" ;;
esac

if ! printf '%s' "${AG_PATH}" | grep -Eq '^[A-Za-z0-9._/ -]*$'; then
  fail "Ungültige Zeichen im 'path'-Input: '${AG_PATH}'"
fi
if [ -n "${AG_EXCLUDE}" ] && ! printf '%s' "${AG_EXCLUDE}" | grep -Eq '^[A-Za-z0-9._/* -]*$'; then
  fail "Ungültige Zeichen im 'exclude'-Input: '${AG_EXCLUDE}'"
fi
if [ -n "${AG_WAIVER_ISSUE}" ] && ! printf '%s' "${AG_WAIVER_ISSUE}" | grep -Eq '^[0-9]+$'; then
  fail "Ungültiger Wert für 'waiver-issue': '${AG_WAIVER_ISSUE}' (erwartet: Issue-Nummer)"
fi

# --- Fail-open-Warnungen: leere Workspaces und PR-eigene Ignore-Dateien melden ---
if [ ! -d "${WORKSPACE}/${AG_PATH}/.git" ]; then
  echo "⚠️  AgentGuard: Kein .git-Verzeichnis im Scan-Pfad gefunden — fehlt der actions/checkout-Schritt?" >> "$SUMMARY"
fi
if [ -f "${WORKSPACE}/${AG_PATH}/.agentguard-ignore" ]; then
  echo "⚠️  AgentGuard: .agentguard-ignore im PR wird ignoriert (Bypass-Schutz) — für Ausnahmen den 'exclude'-Input oder einen Break-Glass-Waiver nutzen (docs/BREAK-GLASS.md)." >> "$SUMMARY"
fi

# --- Break-Glass-Governance: Ausnahmen brauchen einen reviewbaren,
#     zeitlich begrenzten Beleg (immutable receipt = Issue im Repo). ---
if [ "${AG_EXIT_ON}" = "never" ]; then
  if [ -n "${AG_WAIVER_ISSUE}" ]; then
    echo "🟡 AgentGuard: Gate suspendiert (exit-on: never) — Beleg: Issue #${AG_WAIVER_ISSUE}. Ausnahmen laufen automatisch ab, siehe Break-Glass-Policy (docs/BREAK-GLASS.md)." >> "$SUMMARY"
  elif [ "${AG_STRICT}" = "true" ]; then
    fail "exit-on: never ohne 'waiver-issue' ist im Strict-Modus nicht erlaubt — Break-Glass-Issue anlegen und als waiver-issue referenzieren (docs/BREAK-GLASS.md)"
  else
    echo "⚠️  AgentGuard: exit-on: never OHNE waiver-issue — stille, permanente Bypässe sind die häufigste Policy-Drift. Künftige Versionen verlangen einen Beleg; jetzt schon möglich: 'strict: true' setzen (docs/BREAK-GLASS.md)." >> "$SUMMARY"
  fi
fi

# --- Scan ausführen (Exit-Code propagiert: 2 = Gate geblockt) ---
EXCL_ARGS=""
for p in ${AG_EXCLUDE}; do
  EXCL_ARGS="${EXCL_ARGS} --exclude ${p}"
done

node "${ACTION_PATH}/cli.js" scan \
  --path "${WORKSPACE}/${AG_PATH}" \
  --engine off \
  --format summary \
  --exit-on "${AG_EXIT_ON}" \
  --no-ignore \
  ${EXCL_ARGS} >> "$SUMMARY"
