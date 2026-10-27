#!/bin/bash
# Run O1: every git call of the run goes through here (RUN-O1-PROMPT rule 12).
#   scripts/o1/git.sh [-C <path>] <git args...>
# Adds -c gc.auto=0 -c maintenance.auto=false, retries three times on a .lock error,
# and refuses what the run never does: push, gc, prune, repack, worktree prune,
# branch deletes, and resets, rebases or force operations on a branch that is not o1/*.
set -uo pipefail
args=("$@")
pre=()
if [ "${args[0]:-}" = "-C" ]; then pre=(-C "${args[1]}"); args=("${args[@]:2}"); fi
sub="${args[0]:-}"
die() { echo "o1 git.sh: refused: $*" >&2; exit 3; }
case "$sub" in
  push|gc|prune|repack|filter-branch|filter-repo) die "git $sub is never run in O1" ;;
  worktree)
    case "${args[1]:-}" in prune) die "git worktree prune is never run in O1" ;; esac
    # add/remove only O1's own worktrees: .claude/worktrees/o1 and .claude/worktrees/o1-*
    case "${args[1]:-}" in add|remove|move)
      for a in "${args[@]:2}"; do
        case "$a" in -*|o1/*|HEAD|origin/*) continue ;; esac
        case "$a" in */.claude/worktrees/o1|*/.claude/worktrees/o1-*) ;; *[/]*) die "worktree $a is not an O1 worktree" ;; esac
      done ;;
    esac ;;
  branch)
    for a in "${args[@]:1}"; do case "$a" in -d|-D|--delete|-m|-M|--move|-f|--force) die "branch deletes, moves and forces are never run in O1" ;; esac; done ;;
  reset|rebase)
    cur="$(git ${pre[@]+"${pre[@]}"} rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
    case "$cur" in o1/integration) [ "$sub" = reset ] && die "never reset o1/integration" ;; esac
    case "$cur" in o1/*|HEAD) ;; *) die "git $sub on $cur (not an o1/* branch)" ;; esac ;;
  update-ref|symbolic-ref)
    for a in "${args[@]:1}"; do case "$a" in refs/heads/o1/*|-*) ;; refs/*) die "$sub on $a (not an o1/* ref)" ;; esac; done ;;
esac
for a in "${args[@]}"; do case "$a" in --force|-f) [ "$sub" = checkout ] || [ "$sub" = worktree ] && die "force flag" ;; esac; done
n=0
while :; do
  err="$(mktemp "${TMPDIR:-/tmp}/o1git.XXXXXX")"
  git ${pre[@]+"${pre[@]}"} -c gc.auto=0 -c maintenance.auto=false "${args[@]}" 2> >(tee "$err" >&2)
  rc=$?
  wait 2>/dev/null
  if [ $rc -ne 0 ] && grep -q '\.lock' "$err" && [ $n -lt 3 ]; then
    n=$((n + 1)); rm -f "$err"; sleep $((n * 2)); continue
  fi
  rm -f "$err"; exit $rc
done
