#!/bin/bash
# Run O1: the kpopquiz.org parity check (RUN-O1-PROMPT rule 5). The ONLY thing in the run that reads production.
#   scripts/o1/parity.sh <base-ref> <head-ref> [--evidence <dir>] [--urls <file>] [--keep]
# Builds base and head back to back, each in a clean detached worktree (node_modules linked from O1), under the
# build lock, with KPQ/secrets/kpop-parity.env (sourced, never printed) and the production flags; serves both with
# `next start`; compares the URL list with apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs (GET only, A and B fetched
# in the same second); stops the servers. One run at a time, never between 00:00 and 01:00 UTC (cron window),
# cached per (base, head) sha pair in KPQ/cache/parity/. Exit 0 = identical after the allowed normalisations.
# Version 1 by ORCH (Phase 0). Lane Q0a completes it (the 60 URLs, determinism, the two G0 normalisations).
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
KPQ="${O1_KPQ:-$HOME/kpq-o1}"
G="$O1/scripts/o1/git.sh"
ENVF="$KPQ/secrets/kpop-parity.env"
die() { echo "parity: $1" >&2; exit "${2:-3}"; }
base_ref="${1:?usage: parity.sh <base> <head> [--evidence dir] [--urls file] [--keep]}"; head_ref="${2:?head}"; shift 2
evidence=""; urls=""; keep=0
while [ $# -gt 0 ]; do case "$1" in
  --evidence) evidence="$2"; shift 2 ;; --urls) urls="$2"; shift 2 ;; --keep) keep=1; shift ;;
  *) die "unknown argument $1" 2 ;; esac; done
hour=$(date -u +%H)
[ "$hour" != "00" ] || die "refused: 00:00 to 01:00 UTC is the cron window" 6
[ -f "$ENVF" ] || die "$ENVF missing (setup-o1.sh step 5)" 4
base="$("$G" -C "$O1" rev-parse --verify "$base_ref^{commit}")" || die "unknown base $base_ref" 2
head="$("$G" -C "$O1" rev-parse --verify "$head_ref^{commit}")" || die "unknown head $head_ref" 2
# URL list: Q0a's 60 URLs once merged into O1, else the Phase 0 seed list.
if [ -z "$urls" ]; then
  urls="$O1/apps/quiz/e2e/o1/parity/urls.txt"; [ -f "$urls" ] || urls="$O1/scripts/o1/parity-urls.seed.txt"
fi
[ -f "$urls" ] || die "no URL list" 4
CACHE="$KPQ/cache/parity"; mkdir -p "$CACHE"
key="${base:0:12}-${head:0:12}-$(shasum -a 256 "$urls" | cut -c1-8)"
if [ -f "$CACHE/$key.json" ]; then
  echo "parity: cached result $CACHE/$key.json"
  [ -n "$evidence" ] && { mkdir -p "$evidence"; cp "$CACHE/$key.json" "$evidence/parity.json"; [ -d "$CACHE/$key" ] && cp -R "$CACHE/$key" "$evidence/parity-out"; }
  grep -q '"identical": true' "$CACHE/$key.json"; exit $?
fi
if [ "$base" = "$head" ]; then
  # Same commit on both sides: identical by definition, no build, no production read.
  printf '{ "base": "%s", "head": "%s", "identical": true, "note": "same commit", "when": "%s" }\n' "$base" "$head" "$(date -u +%FT%TZ)" > "$CACHE/$key.json"
  [ -n "$evidence" ] && { mkdir -p "$evidence"; cp "$CACHE/$key.json" "$evidence/parity.json"; }
  exit 0
fi
COMMON="$("$G" -C "$O1" rev-parse --git-common-dir)"
PLOCK="$COMMON/o1-parity.lock"
until mkdir "$PLOCK" 2>/dev/null; do
  pid="$(cat "$PLOCK/pid" 2>/dev/null || echo 0)"; kill -0 "$pid" 2>/dev/null || { rm -rf "$PLOCK"; continue; }
  sleep 15
done
echo $$ > "$PLOCK/pid"
pids=()
cleanup() {
  for p in ${pids[@]+"${pids[@]}"}; do kill "$p" 2>/dev/null; pkill -P "$p" 2>/dev/null; done
  if [ $keep = 0 ]; then
    for r in base head; do
      w="$ROOT/.claude/worktrees/o1-parity-$r"
      [ -d "$w" ] || continue
      rm -f "$w/node_modules" "$w/apps/quiz/node_modules" "$w/packages/shared/node_modules"
      rm -rf "$w/apps/quiz/.next"
      "$G" -C "$O1" worktree remove "$w" >/dev/null 2>&1 || echo "parity: could not remove $w" >&2
    done
  fi
  rm -rf "$PLOCK"
}
trap cleanup EXIT INT TERM
OUT="$CACHE/$key"; rm -rf "$OUT"; mkdir -p "$OUT"
prep() { # role sha
  local w="$ROOT/.claude/worktrees/o1-parity-$1"
  if [ -d "$w" ]; then
    rm -f "$w/node_modules" "$w/apps/quiz/node_modules" "$w/packages/shared/node_modules"; rm -rf "$w/apps/quiz/.next"
    "$G" -C "$O1" worktree remove "$w" >/dev/null 2>&1 || die "stale $w with changes: remove it by hand"
  fi
  "$G" -C "$O1" worktree add --detach "$w" "$2" >/dev/null 2>&1 || die "worktree add $w failed"
  ln -s "$O1/node_modules" "$w/node_modules"; ln -s "$O1/apps/quiz/node_modules" "$w/apps/quiz/node_modules"
  rm -rf "$w/packages/shared/node_modules"; ln -s "$O1/packages/shared/node_modules" "$w/packages/shared/node_modules"
  git -C "$w" config --worktree core.excludesFile "$O1/scripts/o1/lane.exclude" 2>/dev/null || true
  echo "$w"
}
# Production flags of kpopquiz.org (v12 launch report, docs PR #97): UX_V1 and UX_V12 on. Q0a confirms.
run_env() { ( set -a; . "$ENVF"; set +a; export NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_TELEMETRY_DISABLED=1; unset NEXT_PUBLIC_SITE_ID SITE_ID; "$@" ); }
build() { # role sha
  local w; w="$ROOT/.claude/worktrees/o1-parity-$1"
  "$O1/scripts/o1/build-lock.sh" run "parity-$1-${2:0:8}" -- bash -c \
    'set -a; . "$1"; set +a; export NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_TELEMETRY_DISABLED=1; unset NEXT_PUBLIC_SITE_ID SITE_ID; cd "$2" && npm run build' \
    _ "$ENVF" "$w/apps/quiz" > "$OUT/build-$1.log" 2>&1
}
wb="$(prep base "$base")" || exit 3
wh="$(prep head "$head")" || exit 3
t0=$(date +%s)
build base "$base" || { tail -20 "$OUT/build-base.log" >&2; die "base build failed (log $OUT/build-base.log)" 7; }
build head "$head" || { tail -20 "$OUT/build-head.log" >&2; die "head build failed (log $OUT/build-head.log)" 7; }
serve() { # role port
  ( cd "$ROOT/.claude/worktrees/o1-parity-$1/apps/quiz" && run_env ./node_modules/.bin/next start -p "$2" -H 127.0.0.1 ) > "$OUT/serve-$1.log" 2>&1 &
  pids+=($!)
}
PA=${O1_PARITY_PORT_A:-4011}; PB=${O1_PARITY_PORT_B:-4012}
for p in $PA $PB; do lsof -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1 && die "port $p busy" 8; done
serve base $PA; serve head $PB
for p in $PA $PB; do
  for i in $(seq 1 90); do curl -s -o /dev/null "http://127.0.0.1:$p/robots.txt" && break; sleep 1; done
done
mapfile_urls=()
while IFS= read -r u; do case "$u" in ''|'#'*) ;; *) mapfile_urls+=("$u") ;; esac; done < "$urls"
( cd "$O1/apps/quiz" && node e2e/ux-v1/helpers/flag-off-diff.mjs --a "http://127.0.0.1:$PA" --b "http://127.0.0.1:$PB" --out "$OUT/diff" "${mapfile_urls[@]}" ) > "$OUT/diff.log" 2>&1
rc=$?
t1=$(date +%s)
identical=false; [ $rc -eq 0 ] && identical=true
printf '{ "base": "%s", "head": "%s", "identical": %s, "urls": %s, "urlList": "%s", "seconds": %s, "when": "%s" }\n' \
  "$base" "$head" "$identical" "${#mapfile_urls[@]}" "${urls#$O1/}" $((t1 - t0)) "$(date -u +%FT%TZ)" > "$CACHE/$key.json"
tail -15 "$OUT/diff.log"
if [ -n "$evidence" ]; then mkdir -p "$evidence"; cp "$CACHE/$key.json" "$evidence/parity.json"; cp "$OUT/diff.log" "$evidence/parity-diff.log"; fi
exit $rc
