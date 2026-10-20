#!/bin/bash
# Lot (e) part 1, lane K1, check 2: runs daily.sql on o1-scratch (BEGIN ... ROLLBACK, nothing persists) and prints the lines
# starting with "DQ " and "DQ2 " (calls, counts, md5 per section, the final md5, the same-date checks). The database URL comes
# from env.sh and is never printed. Usage: daily.sh [label]    (the label is only echoed, e.g. "before-010")
# Exit 1 when psql fails, when no "DQ HASH" line comes out or when a "DQ2" check fails.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
S=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1
label="${1:-run}"
out="$("$S/env.sh" scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$1" 2>&1' _ "$HERE/daily.sql")"
rc=$?
echo "$out" | grep -E '^DQ2? ' | sed -E "s/^(DQ2?) /\1 [$label] /"
if [ $rc -ne 0 ] || ! echo "$out" | grep -q '^DQ HASH '; then
  echo "daily: FAILED (rc=$rc)" >&2
  echo "$out" | grep -vE '^DQ2? ' | tail -15 >&2
  exit 1
fi
echo "$out" | grep -q '^DQ2 .* FAIL$' && exit 1
exit 0
