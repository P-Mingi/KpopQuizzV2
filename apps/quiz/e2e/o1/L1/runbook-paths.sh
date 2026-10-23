#!/bin/bash
# Run O1, lane L1: every repository path the launch kit names must exist.
#   apps/quiz/e2e/o1/L1/runbook-paths.sh        prints each missing path with its file and line, then "missing: N"; exit 1 when N > 0
# Reads docs/launch/o1/{RUNBOOK,SQL-ORDER,ENV,VERIFY,ROLLBACK}.md. A word counts as a path when it starts with docs/, apps/, scripts/,
# supabase/, packages/, $M/ or M/ (M = docs/pending-migrations/multisite) or LAUNCH/ (= M/launch). Words that stand for a family
# (<slug>, *, {a,b}, ...) are checked up to their last whole directory. URLs, home folders (~/...) and absolute paths are not repository paths.
# Reads files only: no database, no network.
set -u
ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
cd "$ROOT" || exit 2
M="docs/pending-migrations/multisite"
checked=0; missing=0
for f in docs/launch/o1/RUNBOOK.md docs/launch/o1/SQL-ORDER.md docs/launch/o1/ENV.md docs/launch/o1/VERIFY.md docs/launch/o1/ROLLBACK.md; do
  [ -f "$f" ] || { echo "MISSING FILE $f"; missing=$((missing + 1)); continue; }
  while IFS=$'\t' read -r line word; do
    p="$word"
    case "$p" in *://*|\~*|/*) continue ;; esac
    case "$p" in
      '$M/'*) p="$M/${p#\$M/}" ;;
      'M/'*) p="$M/${p#M/}" ;;
      'LAUNCH/'*) p="$M/launch/${p#LAUNCH/}" ;;
    esac
    case "$p" in
      docs/*|apps/*|scripts/*|supabase/*|packages/*) ;;
      *) continue ;;
    esac
    case "$p" in *'...'*) continue ;; esac
    # a family: cut at the first placeholder or wildcard, keep whole directories
    case "$p" in
      *'<'*|*'*'*|*'{'*|*'['*|*'$'*) p="${p%%[<*{[\$]*}"; p="${p%/*}" ;;
    esac
    [ -n "$p" ] || continue
    checked=$((checked + 1))
    if [ ! -e "$p" ]; then echo "missing: $p   ($f:$line)"; missing=$((missing + 1)); fi
  done < <(awk '{ n = split($0, w, /[ \t`(),;:"\x27|=]+/); for (i = 1; i <= n; i++) if (w[i] ~ /^(docs|apps|scripts|supabase|packages|\$M|M|LAUNCH)\//) { x = w[i]; sub(/[.]+$/, "", x); printf "%d\t%s\n", NR, x } }' "$f")
done
echo "checked: $checked paths in the launch kit, missing: $missing"
[ "$missing" -eq 0 ]
