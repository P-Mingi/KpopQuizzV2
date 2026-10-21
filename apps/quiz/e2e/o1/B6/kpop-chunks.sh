#!/bin/bash
# Run O1, lane B6: the kpop route set must reach exactly the same client modules at the head as at the base.
#   apps/quiz/e2e/o1/B6/kpop-chunks.sh collect <outdir>   build kpop offline from this worktree (NEXT_PUBLIC_UX_V1=1,
#                                                         NEXT_PUBLIC_UX_V12=1, no NET flag; extra flags from the environment),
#                                                         then write <outdir>/modules.txt: one line per route and client module of its
#                                                         client reference manifest, plus <outdir>/chunks.txt (chunk count per route).
#                                                         Deletes apps/quiz/.next afterwards.
#   apps/quiz/e2e/o1/B6/kpop-chunks.sh compare <outdirA> <outdirB>   diff of the two modules.txt (exit 0 identical, 1 different)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WT="$(git -C "$HERE" rev-parse --show-toplevel)"; APP="$WT/apps/quiz"
die() { echo "kpop-chunks: $1" >&2; exit "${2:-2}"; }
case "${1:-}" in
  collect)
    out="${2:?outdir}"; mkdir -p "$out"
    "$WT/scripts/o1/build-lock.sh" run "b6-kpop-chunks" -- "$WT/scripts/o1/env.sh" offline -- \
      bash -c 'cd "$1" && rm -rf .next && NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 npm run build' _ "$APP" > "$out/build.log" 2>&1
    [ -f "$APP/.next/BUILD_ID" ] || { tail -20 "$out/build.log" >&2; die "build failed ($out/build.log)" 3; }
    node "$HERE/extract-manifests.mjs" "$APP/.next/server/app" "$WT" "$out"
    rc=$?
    rm -rf "$APP/.next"
    exit $rc ;;
  compare)
    a="${2:?dirA}"; b="${3:?dirB}"
    if diff "$a/modules.txt" "$b/modules.txt" > /dev/null; then echo "kpop-chunks: identical ($(wc -l < "$a/modules.txt") route-module lines)"; exit 0; fi
    echo "kpop-chunks: DIFFERENT" >&2; diff "$a/modules.txt" "$b/modules.txt" | head -40 >&2; exit 1 ;;
  *) die "usage: collect <outdir> | compare <outdirA> <outdirB>" ;;
esac
