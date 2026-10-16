#!/bin/bash
# Run O1: the kpopquiz.org parity check (RUN-O1-PROMPT rule 5). The ONLY thing in the run that reads production.
#   scripts/o1/parity.sh <base-ref> <head-ref> [--evidence <dir>] [--urls <file>] [--keep] [--recheck]
# Builds base and head back to back, each in a clean detached worktree (node_modules linked from O1), under the
# build lock, with KPQ/secrets/kpop-parity.env (sourced, never printed) and the production flags; serves both with
# `next start`; compares the URL list with apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs (GET only, A and B fetched
# in the same second), then judges its result with scripts/o1/parity/compare.mjs (the two G0 normalisations, nothing
# else); stops the servers. One run at a time, never between 00:00 and 01:00 UTC (cron window), cached per
# (base, head, URL list) in KPQ/cache/parity/. Exit 0 = identical after the allowed normalisations, 1 = a difference.
#
# Version 1 by ORCH (Phase 0); completed by lane Q0a:
# - URL list: apps/quiz/e2e/o1/parity/urls.txt (60 URLs; the GET write proof is
#   apps/quiz/scripts/o1/q0a/get-write-audit.mjs). The harness files (this script, scripts/o1/parity/, the list)
#   are read from the checkout this script lives in (O1 for the gate and the merge step), never from the head.
# - Production flags of kpopquiz.org, confirmed from the repo: NEXT_PUBLIC_UX_V1=1, NEXT_PUBLIC_UX_V12=1 and
#   NEXT_PUBLIC_BT_TRACKING=1, set for Production only at the V12 switch-on of 2026-10-11
#   (docs/design/growth-v12/run/LAUNCH-REPORT.md, step 2, merged as PR #97 e308455); NEXT_PUBLIC_SITE_URL untouched
#   there. NEXT_PUBLIC_SITE_ID and SITE_ID are unset (kpop); every O1 flag (NEXT_PUBLIC_NET_*, SITE_SCOPE,
#   PASSPORT_*) is unset, so the check is "every new flag off". Server values the repo cannot show (VERSE_PUBLIC,
#   COMMUNITY_FEATURES_ENABLED, SONGS_IS_CURATED) come from kpop-parity.env as the owner wrote it.
# - Frozen data source and write guard: scripts/o1/parity/freeze-hook.mjs is preloaded (NODE_OPTIONS --import) into
#   both builds and both servers. The base build records every database read, the head build and the servers replay
#   them, so base and head render one database state; every request that could write is refused before it leaves
#   the machine and listed in freeze/refused.log (a refused write fails the run). --recheck replays the stored state.
# - Determinism: result.txt holds no time, no byte count and no live number outside a diff. --recheck runs the pair
#   again (the cache is ignored, the stored data state replayed) and fails unless result.txt is byte-identical.
# - --keep keeps both worktrees, their builds and the frozen state (KPQ/cache/parity/<key>/freeze) for the gate's
#   per-site checks; the next parity run removes them.
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
HERE="$(cd "$(dirname "$0")" && pwd)"          # scripts/o1 of the harness checkout
HARNESS="$(cd "$HERE/../.." && pwd)"
KPQ="${O1_KPQ:-$HOME/kpq-o1}"
G="$O1/scripts/o1/git.sh"
ENVF="$KPQ/secrets/kpop-parity.env"
FOD="$HARNESS/apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs"
COMPARE="$HERE/parity/compare.mjs"
HOOK="$HERE/parity/freeze-hook.mjs"
die() { echo "parity: $1" >&2; exit "${2:-3}"; }
# Production flags (header). The env file is sourced in a subshell, never printed; the hook targets its Supabase.
PROD_FLAGS='NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_BT_TRACKING=1'
run_env() { # cmd... ; the parity environment with the frozen data source
  ( set -a; . "$ENVF"; set +a
    export $PROD_FLAGS NEXT_TELEMETRY_DISABLED=1
    unset NEXT_PUBLIC_SITE_ID SITE_ID SITE_SCOPE PASSPORT_JUMP PASSPORT_CONTINUE PASSPORT_SEED
    for v in $(env | sed -n 's/^\(NEXT_PUBLIC_NET_[A-Z_]*\)=.*/\1/p'); do unset "$v"; done
    export O1_FREEZE_DIR="$FREEZE" O1_FREEZE_TARGET="${NEXT_PUBLIC_SUPABASE_URL:-}" O1_FREEZE_PHASE="${O1_FREEZE_PHASE:-run}"
    export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--import $HOOK"
    [ -n "$O1_FREEZE_TARGET" ] || { echo "parity: NEXT_PUBLIC_SUPABASE_URL missing in the env file" >&2; exit 4; }
    "$@" )
}
# Internal entry: build-lock.sh runs `parity.sh --run-env-internal <cmd...>` so a build gets the same environment.
if [ "${1:-}" = "--run-env-internal" ]; then shift; FREEZE="${O1_PARITY_FREEZE:?}"; run_env "$@"; exit $?; fi
base_ref="${1:?usage: parity.sh <base> <head> [--evidence dir] [--urls file] [--keep] [--recheck]}"; head_ref="${2:?head}"; shift 2
evidence=""; urls=""; keep=0; recheck=0
while [ $# -gt 0 ]; do case "$1" in
  --evidence) evidence="$2"; shift 2 ;; --urls) urls="$2"; shift 2 ;; --keep) keep=1; shift ;; --recheck) recheck=1; shift ;;
  *) die "unknown argument $1" 2 ;; esac; done
hour=$(date -u +%H)
[ "$hour" != "00" ] || die "refused: 00:00 to 01:00 UTC is the cron window" 6
[ -f "$ENVF" ] || die "$ENVF missing (setup-o1.sh step 5)" 4
for f in "$FOD" "$COMPARE" "$HOOK"; do [ -f "$f" ] || die "harness file missing: $f" 4; done
base="$("$G" -C "$O1" rev-parse --verify "$base_ref^{commit}")" || die "unknown base $base_ref" 2
head="$("$G" -C "$O1" rev-parse --verify "$head_ref^{commit}")" || die "unknown head $head_ref" 2
# URL list: the harness's 60 URLs, else the Phase 0 seed list.
if [ -z "$urls" ]; then
  urls="$HARNESS/apps/quiz/e2e/o1/parity/urls.txt"; [ -f "$urls" ] || urls="$HERE/parity-urls.seed.txt"
fi
[ -f "$urls" ] || die "no URL list" 4
CACHE="$KPQ/cache/parity"; mkdir -p "$CACHE"
key="${base:0:12}-${head:0:12}-$(shasum -a 256 "$urls" | cut -c1-8)"
OUT="$CACHE/$key"
publish() { # copy the verdict into the evidence folder
  [ -n "$evidence" ] || return 0
  mkdir -p "$evidence"; cp "$CACHE/$key.json" "$evidence/parity.json"
  for f in result.txt result.json diff.log refused.txt determinism.txt; do [ -f "$OUT/$f" ] && cp "$OUT/$f" "$evidence/parity-$f"; done
  return 0
}
if [ $recheck = 0 ] && [ -f "$CACHE/$key.json" ]; then
  echo "parity: cached result $CACHE/$key.json"
  publish; grep -q '"identical": true' "$CACHE/$key.json"; exit $?
fi
if [ "$base" = "$head" ]; then
  # Same commit on both sides: identical by definition, no build, no production read.
  printf '{ "base": "%s", "head": "%s", "identical": true, "note": "same commit", "when": "%s" }\n' "$base" "$head" "$(date -u +%FT%TZ)" > "$CACHE/$key.json"
  publish; exit 0
fi
if [ $recheck = 1 ]; then
  [ -f "$OUT/result.txt" ] && [ -d "$OUT/freeze" ] || die "--recheck needs a previous run of this pair kept with its data state ($OUT)" 4
  rm -rf "$OUT.prev"; mkdir -p "$OUT.prev"; cp "$OUT/result.txt" "$OUT.prev/result.txt"; cp -R "$OUT/freeze" "$OUT.prev/freeze"
fi
COMMON="$("$G" -C "$O1" rev-parse --git-common-dir)"
PLOCK="$COMMON/o1-parity.lock"
until mkdir "$PLOCK" 2>/dev/null; do
  pid="$(cat "$PLOCK/pid" 2>/dev/null || echo 0)"; kill -0 "$pid" 2>/dev/null || { rm -rf "$PLOCK"; continue; }
  sleep 15
done
echo $$ > "$PLOCK/pid"
pids=()
drop_wt() { # role
  local w="$ROOT/.claude/worktrees/o1-parity-$1"
  [ -d "$w" ] || return 0
  rm -f "$w/node_modules" "$w/apps/quiz/node_modules" "$w/packages/shared/node_modules"
  rm -rf "$w/apps/quiz/.next"
  "$G" -C "$O1" worktree remove "$w" >/dev/null 2>&1 || { echo "parity: could not remove $w" >&2; return 1; }
}
cleanup() {
  for p in ${pids[@]+"${pids[@]}"}; do pkill -P "$p" 2>/dev/null; kill "$p" 2>/dev/null; done
  if [ $keep = 0 ]; then drop_wt base; drop_wt head; fi
  rm -rf "$PLOCK"
}
trap cleanup EXIT INT TERM
# The previous run's results stay readable until this one ends; the frozen state is kept only for a recheck.
rm -rf "$OUT.tmp"; mkdir -p "$OUT.tmp"
if [ $recheck = 1 ]; then cp -R "$OUT.prev/freeze" "$OUT.tmp/freeze"; else mkdir -p "$OUT.tmp/freeze"; fi
FREEZE="$OUT.tmp/freeze"
prep() { # role sha
  local w="$ROOT/.claude/worktrees/o1-parity-$1"
  drop_wt "$1" || die "stale $w with changes: remove it by hand"
  "$G" -C "$O1" worktree add --detach "$w" "$2" >/dev/null 2>&1 || die "worktree add $w failed"
  ln -s "$O1/node_modules" "$w/node_modules"; ln -s "$O1/apps/quiz/node_modules" "$w/apps/quiz/node_modules"
  rm -rf "$w/packages/shared/node_modules"; ln -s "$O1/packages/shared/node_modules" "$w/packages/shared/node_modules"
  git -C "$w" config --worktree core.excludesFile "$O1/scripts/o1/lane.exclude" 2>/dev/null || true
  echo "$w"
}
build() { # role sha
  local w; w="$ROOT/.claude/worktrees/o1-parity-$1"
  O1_PARITY_FREEZE="$FREEZE" O1_FREEZE_PHASE="build-$1" "$HERE/build-lock.sh" run "parity-$1-${2:0:8}" -- \
    bash -c 'cd "$1" && shift && exec "$@"' _ "$w/apps/quiz" "$HERE/parity.sh" --run-env-internal npm run build \
    > "$OUT.tmp/build-$1.log" 2>&1
}
wb="$(prep base "$base")" || exit 3
wh="$(prep head "$head")" || exit 3
t0=$(date +%s)
build base "$base" || { tail -20 "$OUT.tmp/build-base.log" >&2; die "base build failed (log $OUT.tmp/build-base.log)" 7; }
build head "$head" || { tail -20 "$OUT.tmp/build-head.log" >&2; die "head build failed (log $OUT.tmp/build-head.log)" 7; }
serve() { # role port
  ( cd "$ROOT/.claude/worktrees/o1-parity-$1/apps/quiz" && O1_FREEZE_PHASE="serve-$1" run_env ./node_modules/.bin/next start -p "$2" -H 127.0.0.1 ) > "$OUT.tmp/serve-$1.log" 2>&1 &
  pids+=($!)
}
PA=${O1_PARITY_PORT_A:-4011}; PB=${O1_PARITY_PORT_B:-4012}
for p in $PA $PB; do lsof -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1 && die "port $p busy" 8; done
serve base $PA; serve head $PB
for p in $PA $PB; do
  for i in $(seq 1 90); do curl -s -o /dev/null "http://127.0.0.1:$p/robots.txt" && break; sleep 1; done
done
list=()
while IFS= read -r u; do u="${u#"${u%%[![:space:]]*}"}"; case "$u" in ''|'#'*) ;; *) list+=("$u") ;; esac; done < "$urls"
( cd "$HARNESS/apps/quiz" && node "$FOD" --a "http://127.0.0.1:$PA" --b "http://127.0.0.1:$PB" --out "$OUT.tmp/diff" "${list[@]}" ) > "$OUT.tmp/diff.log" 2>&1
fod_rc=$?
node "$COMPARE" --a "http://127.0.0.1:$PA" --b "http://127.0.0.1:$PB" --fod-out "$OUT.tmp/diff" --fod-log "$OUT.tmp/diff.log" \
  --urls "$urls" --out "$OUT.tmp" > "$OUT.tmp/compare.log" 2>&1
rc=$?
[ $rc -le 1 ] || { tail -5 "$OUT.tmp/compare.log" >&2; [ $fod_rc -le 1 ] || tail -5 "$OUT.tmp/diff.log" >&2; die "compare failed (rc $rc, flag-off-diff rc $fod_rc)" 7; }
# A refused write is a failure of the run, whatever the HTML says.
if [ -s "$FREEZE/refused.log" ]; then sort "$FREEZE/refused.log" | uniq -c > "$OUT.tmp/refused.txt"; rc=1; echo "parity: writes were refused, see refused.txt" >&2; fi
t1=$(date +%s)
det=""
if [ $recheck = 1 ]; then
  if cmp -s "$OUT.prev/result.txt" "$OUT.tmp/result.txt"; then det=true; echo "deterministic: result.txt identical to the previous run" > "$OUT.tmp/determinism.txt"
  else det=false; rc=1; { echo "NOT deterministic: result.txt differs from the previous run"; diff "$OUT.prev/result.txt" "$OUT.tmp/result.txt" | head -40; } > "$OUT.tmp/determinism.txt"; fi
fi
misses=$(cat "$FREEZE/misses.log" 2>/dev/null | wc -l | tr -d ' '); hits=$(cat "$FREEZE/hits.log" 2>/dev/null | wc -l | tr -d ' ')
refused=$(cat "$FREEZE/refused.log" 2>/dev/null | wc -l | tr -d ' ')
identical=false; [ $rc -eq 0 ] && identical=true
rsha="$(shasum -a 256 "$OUT.tmp/result.txt" | cut -c1-64)"
rm -rf "$OUT"; mv "$OUT.tmp" "$OUT"; FREEZE="$OUT/freeze"; rm -rf "$OUT.prev"
[ $keep = 1 ] || rm -rf "$OUT/freeze"
printf '{ "base": "%s", "head": "%s", "identical": %s, "urls": %s, "urlList": "%s", "resultSha256": "%s", "recheck": %s, "deterministic": %s, "liveReads": %s, "frozenReads": %s, "refusedWrites": %s, "seconds": %s, "when": "%s" }\n' \
  "$base" "$head" "$identical" "${#list[@]}" "${urls#$HARNESS/}" "$rsha" "$([ $recheck = 1 ] && echo true || echo false)" "${det:-null}" \
  "${misses:-0}" "${hits:-0}" "${refused:-0}" $((t1 - t0)) "$(date -u +%FT%TZ)" > "$CACHE/$key.json"
tail -3 "$OUT/result.txt"
publish
exit $rc
