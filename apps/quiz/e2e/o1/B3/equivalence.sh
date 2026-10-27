#!/bin/bash
# Lot (c) part 1, lane B3, check 3: runs equivalence.sql on o1-scratch (BEGIN ... ROLLBACK, nothing persists) and prints
# the lines starting with "EQ " (calls per path, md5 per section, the final md5). The database URL comes from env.sh and
# is never printed. Usage: equivalence.sh [label]    (the label is only echoed, e.g. "before-008")
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
S=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1
label="${1:-run}"
out="$("$S/env.sh" scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$1" 2>&1' _ "$HERE/equivalence.sql")"
rc=$?
echo "$out" | grep '^EQ ' | sed "s/^EQ /EQ [$label] /"
if [ $rc -ne 0 ] || ! echo "$out" | grep -q '^EQ HASH '; then
  echo "equivalence: FAILED (rc=$rc)" >&2
  echo "$out" | grep -v '^EQ ' | tail -15 >&2
  exit 1
fi
