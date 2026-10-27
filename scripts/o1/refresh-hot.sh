#!/bin/bash
# Run O1: refresh docs/o1/HOT.txt (RUN-O1-PROMPT rule 12). ORCH runs it every tick, after the tick's single fetch.
# A file is HOT while an open (not merged into origin/main) seo/* or mission-u/* branch, local or remote, changes it.
# Squash-merged branches are listed in scripts/o1/hot-merged.txt, or detected when every file they change already
# equals origin/main.
# Output lines: <path><TAB><branches>. Lanes never edit a HOT file; gate.sh and merge-lane.sh refuse a diff touching one.
set -uo pipefail
O1=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1
cd "$O1" || exit 3
G=scripts/o1/git.sh
out=docs/o1/HOT.txt
tmp="$(mktemp)"
branches="$( { git for-each-ref --format='%(refname:short)' 'refs/heads/seo/*' 'refs/heads/mission-u/*'; \
               git for-each-ref --format='%(refname:short)' 'refs/remotes/origin/seo/*' 'refs/remotes/origin/mission-u/*'; } | sort -u)"
open_list=""
squashed="$(grep -vE '^(#|$)' scripts/o1/hot-merged.txt 2>/dev/null | cut -f1)"
for b in $branches; do
  git merge-base --is-ancestor "$b" origin/main 2>/dev/null && continue
  echo "$squashed" | grep -qxF "${b#origin/}" && continue
  # every file the branch changes already identical on origin/main: merged by squash
  files="$("$G" diff --name-only --no-renames "origin/main...$b" 2>/dev/null)"
  [ -n "$files" ] || continue
  echo "$files" | while IFS= read -r f; do git diff --quiet origin/main "$b" -- "$f" || { echo differs; break; }; done | grep -q differs || continue
  # a remote branch whose local twin exists is covered by the local one when the local one contains it
  case "$b" in origin/*) l="${b#origin/}"; git show-ref --verify --quiet "refs/heads/$l" && git merge-base --is-ancestor "$b" "$l" 2>/dev/null && continue ;; esac
  "$G" diff --name-only --no-renames "origin/main...$b" 2>/dev/null | sed "s#\$#\t$b#" >> "$tmp"
  open_list="$open_list $b"
done
{
  echo "# HOT list of run O1, refreshed $(date -u +%FT%TZ) from origin/main $(git rev-parse --short origin/main)."
  echo "# Open branches:$open_list"
  echo "# A lane never edits these files before their branch is merged into main (rule 12)."
  sort "$tmp" | awk -F'\t' '{ if ($1==p) { b=b","$2 } else { if (p!="") print p"\t"b; p=$1; b=$2 } } END { if (p!="") print p"\t"b }'
} > "$out"
rm -f "$tmp"
echo "HOT.txt: $(grep -cvE '^(#|$)' "$out") files from$(echo "$open_list" | wc -w | tr -d ' ') open branches"
