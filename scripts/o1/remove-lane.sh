#!/bin/bash
# Run O1: remove a merged lane's worktree (RUN-O1-PROMPT section 2). Never --force: a worktree with changes stays.
#   scripts/o1/remove-lane.sh <lane>
# The branch o1/<lane> and its commits stay. The port triple is released in docs/o1/ports.tsv.
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
lane="${1:?usage: remove-lane.sh <lane>}"
WT="$ROOT/.claude/worktrees/o1-$lane"
[ -d "$WT" ] || { echo "remove-lane: $WT does not exist"; exit 0; }
dirty="$(git -C "$WT" status --porcelain --untracked-files=normal | grep -vE ' (node_modules|apps/quiz/node_modules|packages/shared/node_modules)$' || true)"
[ -z "$dirty" ] || { echo "remove-lane: $WT has changes, kept:"; echo "$dirty"; exit 1; }
rm -f "$WT/node_modules" "$WT/apps/quiz/node_modules" "$WT/packages/shared/node_modules"
rm -rf "$WT/apps/quiz/.next" "$WT"/apps/quiz/.next-*
"$O1/scripts/o1/git.sh" -C "$O1" worktree remove "$WT" && echo "removed $WT (branch o1/$lane kept)"
P="$O1/docs/o1/ports.tsv"; [ -f "$P" ] && awk -F'\t' -v l="$lane" '$1!=l' "$P" > "$P.tmp" && mv "$P.tmp" "$P"
