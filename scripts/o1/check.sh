#!/bin/bash
# Run O1: static checks of a lane tree, called by gate.sh on every gate (BACKLOG's check.sh).
#   scripts/o1/check.sh <worktree>
# 1. twins (rule 18): apps/quiz/scripts/o1/twins.mts of O1 (the merged copy, so a lane cannot weaken its judge) against
#    docs/o1/contracts/twins.json of O1 (the frozen contract; F0's own tree while F0 is not merged).
#    Fails when a page under app/sites/ has no twin row, misses a shared import of its row, or when a shared component
#    is copied elsewhere, even in part. Exit 0 with "pending" while twins.mts is not merged yet (Q0a).
set -uo pipefail
O1=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1
WT="${1:?usage: check.sh <worktree>}"
TSX="$O1/node_modules/.bin/tsx"
script="$O1/apps/quiz/scripts/o1/twins.mts"
twins="$O1/docs/o1/contracts/twins.json"
[ -f "$twins" ] || twins="$WT/docs/o1/contracts/twins.json"
if [ ! -f "$script" ]; then
  echo "twins: pending (apps/quiz/scripts/o1/twins.mts arrives with Q0a)"
  if [ -d "$WT/apps/quiz/src/app/sites" ]; then echo "note: $(find "$WT/apps/quiz/src/app/sites" -name 'page.tsx' | wc -l | tr -d ' ') page(s) under app/sites, not checked yet"; fi
  exit 0
fi
[ -f "$twins" ] || { echo "twins: no twins.json (F0's contract) in O1 or in the lane: cannot check"; exit 1; }
exec "$TSX" "$script" --root "$WT" --twins "$twins"
