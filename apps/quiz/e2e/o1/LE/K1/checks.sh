#!/bin/bash
# Lot (e) part 1, lane K1: runs checks.sql on o1-scratch (everything inside BEGIN ... ROLLBACK) and prints the "CHK" lines;
# exit 1 when one fails or psql fails. The database URL comes from env.sh and is never printed.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
S=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1
out="$("$S/env.sh" scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$1" 2>&1' _ "$HERE/checks.sql")"
rc=$?
echo "$out" | grep '^CHK'
if [ $rc -ne 0 ]; then echo "checks: psql failed (rc=$rc)" >&2; echo "$out" | grep -v '^CHK' | tail -12 >&2; exit 1; fi
echo "$out" | grep -q '^CHK .* FAIL' && exit 1
exit 0
