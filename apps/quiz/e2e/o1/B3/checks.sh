#!/bin/bash
# Lot (c) part 1, lane B3, checks 1 and 2 and the behaviour of the 003 to 008 functions: runs checks.sql on o1-scratch
# (everything inside BEGIN ... ROLLBACK except the at-rest reads of check 1). Prints the "CHK" lines; exit 1 when one fails.
# Usage: checks.sh [xp_before]    (sum of profiles.xp measured before 003, for the "unchanged" check)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
S=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1
out="$("$S/env.sh" scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -X -q -v ON_ERROR_STOP=1 -v xp_before="$2" -f "$1" 2>&1' _ "$HERE/checks.sql" "${1:-}")"
rc=$?
echo "$out" | grep '^CHK' 
if [ $rc -ne 0 ]; then echo "checks: psql failed (rc=$rc)" >&2; echo "$out" | grep -v '^CHK' | tail -12 >&2; exit 1; fi
echo "$out" | grep -q '^CHK .* FAIL' && exit 1
exit 0
