#!/bin/bash
# Run O1: create (or reopen) a lane worktree (RUN-O1-PROMPT section 2, Lane worktrees).
#   scripts/o1/new-lane.sh <lane> [--from <ref>]     default --from o1/integration
# ROOT/.claude/worktrees/o1-<lane> on branch o1/<lane>. Refuses under 15 GB free or above 6 lane worktrees.
# node_modules are symlinks to O1's (never ROOT's); no .env.local (use scripts/o1/env.sh); the guard is installed
# (core.hooksPath, o1.agent, gc.auto 0, pushurl NO_PUSH); a free port triple from 3100 is recorded in docs/o1/ports.tsv.
set -euo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
G="$O1/scripts/o1/git.sh"
lane="${1:?usage: new-lane.sh <lane> [--from <ref>]}"; shift
from=o1/integration
[ "${1:-}" = "--from" ] && from="${2:?ref}"
case "$lane" in *[!A-Za-z0-9]*) echo "new-lane: lane id must be letters and digits" >&2; exit 2 ;; esac
WT="$ROOT/.claude/worktrees/o1-$lane"
BR="o1/$lane"
free_gb=$(df -Pk "$ROOT" | awk 'NR==2 { printf "%d", $4 / 1048576 }')
if [ ! -d "$WT" ]; then
  [ "$free_gb" -ge 15 ] || { echo "new-lane: refused, only $free_gb GB free (15 needed)" >&2; exit 4; }
  n=$("$G" -C "$O1" worktree list --porcelain | grep '^worktree ' | grep -c "/.claude/worktrees/o1-[A-Za-z0-9]*$" || true)
  n_gate=$("$G" -C "$O1" worktree list --porcelain | grep '^worktree ' | grep -cE "/.claude/worktrees/o1-(gate|parity|merge)-" || true)
  [ $((n - n_gate)) -lt 6 ] || { echo "new-lane: refused, already 6 lane worktrees" >&2; exit 4; }
  if "$G" -C "$O1" show-ref --verify --quiet "refs/heads/$BR"; then
    "$G" -C "$O1" worktree add "$WT" "$BR"
  else
    "$G" -C "$O1" worktree add --no-track -b "$BR" "$WT" "$from"
  fi
fi
cd "$WT"
for d in node_modules apps/quiz/node_modules packages/shared/node_modules; do
  [ -L "$d" ] && continue
  [ -e "$d" ] && { echo "new-lane: $WT/$d exists and is not a symlink, left alone" >&2; continue; }
  ln -s "$O1/$d" "$d"
done
rm -f apps/quiz/.env.local apps/quiz/.env
git config extensions.worktreeConfig true
git config --worktree core.excludesFile "$O1/scripts/o1/lane.exclude"
sh scripts/o1-hooks/install.sh "$lane" >/dev/null 2>&1 || sh "$O1/scripts/o1-hooks/install.sh" "$lane" >/dev/null
# Port triple (kpop, anime, hub): reuse the lane's line, else the first free triple from 3100.
PORTS="$O1/docs/o1/ports.tsv"
[ -f "$PORTS" ] || printf 'lane\tkpop\tanime\thub\tsince\n' > "$PORTS"
line="$(awk -F'\t' -v l="$lane" '$1==l' "$PORTS")"
if [ -z "$line" ]; then
  p=3100
  while :; do
    taken=0
    for q in $p $((p+1)) $((p+2)); do
      lsof -iTCP:$q -sTCP:LISTEN >/dev/null 2>&1 && taken=1
      awk -F'\t' -v q=$q 'NR>1 && ($2==q||$3==q||$4==q){f=1} END{exit !f}' "$PORTS" && taken=1
    done
    [ $taken = 0 ] && break
    p=$((p+3))
  done
  printf '%s\t%s\t%s\t%s\t%s\n' "$lane" $p $((p+1)) $((p+2)) "$(date -u +%FT%TZ)" >> "$PORTS"
  line="$(awk -F'\t' -v l="$lane" '$1==l' "$PORTS")"
fi
echo "lane $lane: $WT on $(git rev-parse --abbrev-ref HEAD) at $(git rev-parse --short HEAD); ports $(echo "$line" | cut -f2-4 | tr '\t' ' '); agent $(git config --worktree --get o1.agent); free ${free_gb} GB"
