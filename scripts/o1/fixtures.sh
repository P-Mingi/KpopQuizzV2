#!/bin/sh
# Run O1, owner gate G2: the owner's one command for the fixture users and the 31 editorial accounts, on o1-scratch
# then o1-dev, and nowhere else (env.sh and the script refuse the production project). No email is sent.
#   sh /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/fixtures.sh [--dry-run]
set -e
O1=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1
cd "$O1"
for b in scratch dev; do
  "$O1/scripts/o1/env.sh" "$b" -- "$O1/node_modules/.bin/tsx" "$O1/apps/quiz/scripts/o1/fixtures/run.mts" "$@"
done
case " $* " in *" --dry-run "*) echo "Dry run only: nothing was written." ;; *) echo "G2 done. Tell ORCH: G2 fait." ;; esac
