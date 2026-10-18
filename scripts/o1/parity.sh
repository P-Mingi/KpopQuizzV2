#!/bin/bash
# Run O1: the kpopquiz.org parity check (RUN-O1-PROMPT rule 5). The ONLY thing in the run that reads production.
#   scripts/o1/parity.sh <base-ref> <head-ref> [--evidence <dir>] [--urls <file>] [--keep] [--recheck]
#   scripts/o1/parity.sh --serve-kept <head-sha> <port> [--offline]      (gate-checks.sh: serve the kept head build)
#   scripts/o1/parity.sh --check-kept <head-sha> [--offline] -- <cmd...> (gate-checks.sh: a check in the parity env)
# Builds base and head back to back, each in a clean detached worktree (node_modules linked from O1), under the
# build lock, with KPQ/secrets/kpop-parity.env (sourced, never printed) and the production flags; serves both with
# `next start` at one path, the base and then the head, each recorded (D50, D52 below); compares the URL list with
# apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs (GET only), then judges its result with scripts/o1/parity/compare.mjs (the two G0 normalisations and the
# two of CR-008, nothing else, then the stylesheet contents of CR-009); stops the servers. One run at a time, never between 00:00 and 01:00 UTC (cron window), cached per
# (base, head, URL list, harness version) in KPQ/cache/parity/. Exit 0 = identical after the allowed normalisations,
# 1 = a difference.
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
#   the machine and listed in freeze/refused.log. scripts/o1/parity/refusals.mjs judges them: a write refused while
#   the URL list is fetched, or one the head build adds, fails the run; a build-time write the base build makes too
#   (today: rpc ensure_daily_debate from a prerendered page outside the list) is listed in refused.txt only.
#   --recheck replays the stored state.
# - Determinism: result.txt holds no time, no byte count and no live number outside a diff. --recheck runs the pair
#   again (the cache is ignored, the stored data state replayed) and fails unless result.txt is byte-identical.
# - Stylesheets (CR-009, 2026-10-17): flag-off-diff replaces hashed asset names, so compare.mjs reads every page it
#   judges identical once more from A and B and compares the content of every stylesheet the page links (local
#   servers only): a change that lives only in CSS (globals.css, a CSS module, a class that exists only in CSS) is
#   DIFFERENT as css-content. JS chunks stay out (behaviour is the lanes' e2e and R's UX runs, not parity).
# - One build path (Q0a D46): the parity worktrees live under ROOT, so Next takes ROOT's pnpm-workspace.yaml as the
#   workspace root and every module path, server chunk name and client module id carries the worktree's folder name.
#   Built in two folders, base and head then differ on every page (client module ids in the page data, and error
#   digests, which hash a stack of chunk names), with no source change. Both sides are therefore built at one path,
#   o1-parity-build, one after the other, and each build is moved (git worktree move) to o1-parity-base or
#   o1-parity-head. N3 and N4 stay for what one path does not fix (a module whose id moves with the module graph;
#   rows streamed in another order).
# - One serving path (Q0a D50): an error digest hashes the message and the stack, whose frames are the absolute paths
#   of the served chunks, so two servers in two folders still give one error two digests (offline, every page that
#   fails with a stack). Production builds and serves every deploy at one path; so does parity now: the base build
#   takes o1-parity-build again, is served on port A and recorded by scripts/o1/parity/replay.mjs (every URL of the
#   list and every stylesheet those pages link: status, Location, Content-Type, body), stops and leaves; the head
#   takes the path, is served on port B and recorded the same way (D52), and the two records answer as side A and
#   side B. Both servers read the same frozen data state (the base server's own reads are recorded into it and
#   replayed by the head), so recording one after the other lets no data drift in; a server clock moves by the minute
#   or so the swap takes (it moved by the head build's minutes for every prerendered page already). A request a
#   record does not hold answers 404 (DIFFERENT, never hidden).
# - Read as an HTML-limited crawler (Q0a D52, request 23): both sides are recorded with one header, replay.mjs's
#   RECORD_UA, which Next 16 matches as an HTML-limited bot (Slurp, Bingbot, Applebot, link previews). A page rendered
#   at request time then gets its metadata blocking in the head; with any other header Next streams it in a Suspense
#   boundary that resolves before or after the shell flush by timing alone, so one page read twice could differ
#   (seen offline on the 500 pages). Prerendered pages come from the build's cache whatever the header, so their
#   bytes do not change. Nothing is rewritten: the head, every metadata tag, every node and every Flight row stay
#   compared; what is no longer compared is where Next puts the metadata of a request-time page for a browser.
#   __dirname and import.meta.url, which would point at the build path, appear nowhere in apps/quiz/src or
#   packages/*/src (checked 2026-10-18); every server reads files from its own cwd.
# - --keep keeps both worktrees (the head at o1-parity-build, the base at o1-parity-base), their builds and the frozen
#   state (KPQ/cache/parity/<key>/freeze) for the gate's per-site checks, and names them in KPQ/cache/parity/kept.json; the next parity run removes all three. A cached
#   result is used with --keep only while the kept build is the one of that pair (else the pair is run again).
# - --serve-kept serves the kept head build (production flags, frozen state, writes refused, and in strict mode any
#   non-read to any other origin refused too) for gate-checks.sh, holding the parity lock so no run removes it
#   meanwhile; --check-kept runs one command (check:indexability, which reads the catalogue itself) in the same
#   environment. Both refuse the cron window and a head that is not the kept one. --offline answers every read that
#   is not in the frozen state with a local 503: no production read at all (tests of the gate plumbing).
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
REFUSALS="$HERE/parity/refusals.mjs"
REPLAY="$HERE/parity/replay.mjs"
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
CACHE="$KPQ/cache/parity"
KEPT="$CACHE/kept.json"
kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill "$1" 2>/dev/null; }
kept_get() { jq -r ".$1 // empty" "$KEPT" 2>/dev/null; }
kept_check() { # head-sha offline -> FREEZE and KWT set, or exit
  [ "$2" = 1 ] || [ "$(date -u +%H)" != "00" ] || die "refused: 00:00 to 01:00 UTC is the cron window" 6
  [ -f "$ENVF" ] || die "$ENVF missing (setup-o1.sh step 5)" 4
  [ -f "$KEPT" ] || die "no kept parity build (run parity.sh --keep first)" 4
  [ "$(kept_get head)" = "$1" ] || die "the kept parity build is of $(kept_get head | cut -c1-12), not of $(echo "$1" | cut -c1-12)" 4
  KWT="$(kept_get worktree)"; FREEZE="$(kept_get freeze)"
  [ -f "$KWT/apps/quiz/.next/BUILD_ID" ] || die "the kept head worktree has no build ($KWT)" 4
  [ -d "$FREEZE" ] || die "the kept frozen state is gone ($FREEZE)" 4
}
if [ "${1:-}" = "--serve-kept" ] || [ "${1:-}" = "--check-kept" ]; then
  mode="$1"; khead="${2:?head sha}"; shift 2
  kport=""; [ "$mode" = "--serve-kept" ] && { kport="${1:?port}"; shift; }
  koff=0; [ "${1:-}" = "--offline" ] && { koff=1; shift; }
  [ "${1:-}" = "--" ] && shift
  kept_check "$khead" "$koff"
  export O1_FREEZE_STRICT=1
  [ $koff = 1 ] && export O1_FREEZE_OFFLINE=1
  if [ "$mode" = "--check-kept" ]; then
    [ $# -gt 0 ] || die "--check-kept needs a command" 2
    O1_FREEZE_PHASE=gate-check run_env "$@"; exit $?
  fi
  COMMON="$("$G" -C "$O1" rev-parse --git-common-dir)"; PLOCK="$COMMON/o1-parity.lock"
  until mkdir "$PLOCK" 2>/dev/null; do
    pid="$(cat "$PLOCK/pid" 2>/dev/null || echo 0)"; kill -0 "$pid" 2>/dev/null || { rm -rf "$PLOCK"; continue; }
    echo "parity: --serve-kept waits for the parity lock (pid $pid)"; sleep 15
  done
  echo $$ > "$PLOCK/pid"
  kept_check "$khead" "$koff" # a run may have replaced it while this one waited
  spid=""
  trap '[ -n "$spid" ] && kill_tree "$spid"; rm -rf "$PLOCK"' EXIT INT TERM
  ( cd "$KWT/apps/quiz" && O1_FREEZE_PHASE=gate-serve run_env ./node_modules/.bin/next start -p "$kport" -H 127.0.0.1 ) &
  spid=$!
  wait "$spid"; exit $?
fi
base_ref="${1:?usage: parity.sh <base> <head> [--evidence dir] [--urls file] [--keep] [--recheck]}"; head_ref="${2:?head}"; shift 2
evidence=""; urls=""; keep=0; recheck=0
while [ $# -gt 0 ]; do case "$1" in
  --evidence) evidence="$2"; shift 2 ;; --urls) urls="$2"; shift 2 ;; --keep) keep=1; shift ;; --recheck) recheck=1; shift ;;
  *) die "unknown argument $1" 2 ;; esac; done
hour=$(date -u +%H)
[ "$hour" != "00" ] || die "refused: 00:00 to 01:00 UTC is the cron window" 6
[ -f "$ENVF" ] || die "$ENVF missing (setup-o1.sh step 5)" 4
for f in "$FOD" "$COMPARE" "$HOOK" "$REFUSALS" "$REPLAY"; do [ -f "$f" ] || die "harness file missing: $f" 4; done
base="$("$G" -C "$O1" rev-parse --verify "$base_ref^{commit}")" || die "unknown base $base_ref" 2
head="$("$G" -C "$O1" rev-parse --verify "$head_ref^{commit}")" || die "unknown head $head_ref" 2
# URL list: the harness's 60 URLs, else the Phase 0 seed list.
if [ -z "$urls" ]; then
  urls="$HARNESS/apps/quiz/e2e/o1/parity/urls.txt"; [ -f "$urls" ] || urls="$HERE/parity-urls.seed.txt"
fi
[ -f "$urls" ] || die "no URL list" 4
mkdir -p "$CACHE"
# The harness version is part of the key: a result of an older harness is never reused, and --recheck needs a run of
# the same harness.
hfiles=("$HERE/parity.sh" "$FOD"); for f in "$HERE"/parity/*.mjs; do case "$f" in *.test.mjs) ;; *) hfiles+=("$f") ;; esac; done
hv="$(cat "${hfiles[@]}" | shasum -a 256 | cut -c1-8)"
key="${base:0:12}-${head:0:12}-$(shasum -a 256 "$urls" | cut -c1-8)-$hv"
OUT="$CACHE/$key"
publish() { # copy the verdict into the evidence folder
  [ -n "$evidence" ] || return 0
  mkdir -p "$evidence"; cp "$CACHE/$key.json" "$evidence/parity.json"
  for f in result.txt result.json diff.log refused.txt determinism.txt; do [ -f "$OUT/$f" ] && cp "$OUT/$f" "$evidence/parity-$f"; done
  return 0
}
kept_ok() { [ "$(kept_get head)" = "$head" ] && [ "$(kept_get base)" = "$base" ] && [ -f "$(kept_get worktree)/apps/quiz/.next/BUILD_ID" ] && [ -d "$(kept_get freeze)" ]; }
if [ $recheck = 0 ] && [ -f "$CACHE/$key.json" ] && { [ $keep = 0 ] || kept_ok; }; then
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
# The kept build of an earlier run goes now: its worktrees (below, before the builds) and its frozen state (never
# this run's own, which a recheck has copied aside).
if [ -f "$KEPT" ]; then
  kf="$(kept_get freeze)"; case "$kf" in "$CACHE"/*/freeze) rm -rf "$kf" ;; esac; rm -f "$KEPT"
fi
pids=()
drop_wt() { # role: base, head or build
  local w="$ROOT/.claude/worktrees/o1-parity-$1"
  [ -d "$w" ] || return 0
  rm -f "$w/node_modules" "$w/apps/quiz/node_modules" "$w/packages/shared/node_modules"
  rm -rf "$w/apps/quiz/.next"
  "$G" -C "$O1" worktree remove "$w" >/dev/null 2>&1 || { echo "parity: could not remove $w" >&2; return 1; }
}
cleanup() {
  # The whole tree: `next start` forks a next-server process, which a kill of the subshell alone leaves running on
  # the parity port (found after the slice 6 rehearsal: two servers kept 4011 and 4012 for 80 minutes).
  for p in ${pids[@]+"${pids[@]}"}; do kill_tree "$p"; done
  # with --keep the head stays at the build path and the base in o1-parity-base (kept.json names both)
  if [ $keep = 0 ]; then drop_wt build; drop_wt base; drop_wt head; fi
  rm -rf "$PLOCK"
}
trap cleanup EXIT INT TERM
# The previous run's results stay readable until this one ends; the frozen state is kept only for a recheck.
rm -rf "$OUT.tmp"; mkdir -p "$OUT.tmp"
if [ $recheck = 1 ]; then
  # The stored reads are replayed; the logs start empty so this run's counts and refusals are its own.
  cp -R "$OUT.prev/freeze" "$OUT.tmp/freeze"; rm -f "$OUT.tmp/freeze"/*.log
else mkdir -p "$OUT.tmp/freeze"; fi
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
# One build path for both sides (header): <sha> is checked out and built at o1-parity-build, then that worktree is
# moved to o1-parity-<role>, where it is served.
BUILDW="$ROOT/.claude/worktrees/o1-parity-build"
build() { # role sha
  local w="$ROOT/.claude/worktrees/o1-parity-$1"
  prep build "$2" >/dev/null
  O1_PARITY_FREEZE="$FREEZE" O1_FREEZE_PHASE="build-$1" "$HERE/build-lock.sh" run "parity-$1-${2:0:8}" -- \
    bash -c 'cd "$1" && shift && exec "$@"' _ "$BUILDW/apps/quiz" "$HERE/parity.sh" --run-env-internal npm run build \
    > "$OUT.tmp/build-$1.log" 2>&1 || return 1
  "$G" -C "$O1" worktree move "$BUILDW" "$w" >> "$OUT.tmp/build-$1.log" 2>&1 || { echo "parity: could not move $BUILDW to $w" >> "$OUT.tmp/build-$1.log"; return 1; }
}
# The worktrees of an earlier run (a kept build, or one a crash left) go before this run builds.
for r in build base head; do drop_wt "$r" || die "stale $ROOT/.claude/worktrees/o1-parity-$r with changes: remove it by hand"; done
wb="$ROOT/.claude/worktrees/o1-parity-base"; wh="$ROOT/.claude/worktrees/o1-parity-head"
t0=$(date +%s)
build base "$base" || { tail -20 "$OUT.tmp/build-base.log" >&2; die "base build failed (log $OUT.tmp/build-base.log)" 7; }
build head "$head" || { tail -20 "$OUT.tmp/build-head.log" >&2; die "head build failed (log $OUT.tmp/build-head.log)" 7; }
# Served at the build path too (D50), one side after the other: the base takes the path, is served on PA and recorded
# (scripts/o1/parity/replay.mjs: the URL list and every stylesheet it links, read as an HTML-limited crawler, D52),
# stops and leaves; then the head takes the path, is served on PB and recorded the same way, and stops; the two
# records answer as side A on PA and side B on PB.
at_path() { # role: o1-parity-<role> takes the build path
  "$G" -C "$O1" worktree move "$ROOT/.claude/worktrees/o1-parity-$1" "$BUILDW" >/dev/null 2>&1 || die "could not move o1-parity-$1 to $BUILDW" 8
}
leave_path() { # role
  "$G" -C "$O1" worktree move "$BUILDW" "$ROOT/.claude/worktrees/o1-parity-$1" >/dev/null 2>&1 || die "could not move $BUILDW to o1-parity-$1" 8
}
serve() { # role port
  ( cd "$BUILDW/apps/quiz" && O1_FREEZE_PHASE="serve-$1" run_env ./node_modules/.bin/next start -p "$2" -H 127.0.0.1 ) > "$OUT.tmp/serve-$1.log" 2>&1 &
  pids+=($!)
}
up() { # port: wait for an answer on /robots.txt (in the list, so recorded too)
  local i; for i in $(seq 1 90); do curl -s -o /dev/null "http://127.0.0.1:$1/robots.txt" && return 0; sleep 1; done; return 1
}
PA=${O1_PARITY_PORT_A:-4011}; PB=${O1_PARITY_PORT_B:-4012}
for p in $PA $PB; do lsof -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1 && die "port $p busy" 8; done
at_path base
serve base $PA; up $PA || die "the base server did not answer (log $OUT.tmp/serve-base.log)" 8
record_side() { # role port: record the server on <port>, then stop it and wait until the port is free
  node "$REPLAY" record --from "http://127.0.0.1:$2" --urls "$urls" --out "$OUT.tmp/$1-record.json" > "$OUT.tmp/record-$1.log" 2>&1 \
    || { tail -5 "$OUT.tmp/record-$1.log" >&2; die "recording the $1 side failed" 7; }
  kill_tree "${pids[0]}"; pids=()
  for i in $(seq 1 30); do lsof -iTCP:$2 -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 1; done
  lsof -iTCP:$2 -sTCP:LISTEN >/dev/null 2>&1 && die "the $1 server still holds port $2" 8
  return 0
}
record_side base $PA
leave_path base; at_path head
serve head $PB; up $PB || die "the head server did not answer (log $OUT.tmp/serve-head.log)" 8
record_side head $PB
for s in base:$PA head:$PB; do
  node "$REPLAY" serve --record "$OUT.tmp/${s%%:*}-record.json" --port "${s##*:}" > "$OUT.tmp/replay-${s%%:*}.log" 2>&1 &
  pids+=($!)
  up "${s##*:}" || die "the recorded ${s%%:*} side did not answer" 8
done
wh="$BUILDW"
list=()
while IFS= read -r u; do u="${u#"${u%%[![:space:]]*}"}"; case "$u" in ''|'#'*) ;; *) list+=("$u") ;; esac; done < "$urls"
( cd "$HARNESS/apps/quiz" && node "$FOD" --a "http://127.0.0.1:$PA" --b "http://127.0.0.1:$PB" --out "$OUT.tmp/diff" "${list[@]}" ) > "$OUT.tmp/diff.log" 2>&1
fod_rc=$?
node "$COMPARE" --a "http://127.0.0.1:$PA" --b "http://127.0.0.1:$PB" --fod-out "$OUT.tmp/diff" --fod-log "$OUT.tmp/diff.log" \
  --urls "$urls" --out "$OUT.tmp" > "$OUT.tmp/compare.log" 2>&1
rc=$?
[ $rc -le 1 ] || { tail -5 "$OUT.tmp/compare.log" >&2; [ $fod_rc -le 1 ] || tail -5 "$OUT.tmp/diff.log" >&2; die "compare failed (rc $rc, flag-off-diff rc $fod_rc)" 7; }
# A refused write is a failure of the run, whatever the HTML says.
if [ -s "$FREEZE/refused.log" ]; then
  # Judged by refusals.mjs: a write refused outside the builds, or one the head build adds, fails the run; a build
  # write the base build makes too is listed only.
  node "$REFUSALS" "$FREEZE/refused.log" "$OUT.tmp/refused.txt" || { rc=1; echo "parity: a refused write fails the run, see refused.txt" >&2; }
fi
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
if [ $keep = 1 ]; then
  printf '{ "base": "%s", "head": "%s", "key": "%s", "worktree": "%s", "baseWorktree": "%s", "freeze": "%s", "when": "%s" }\n' \
    "$base" "$head" "$key" "$wh" "$wb" "$OUT/freeze" "$(date -u +%FT%TZ)" > "$KEPT"
fi
printf '{ "base": "%s", "head": "%s", "identical": %s, "urls": %s, "urlList": "%s", "harness": "%s", "resultSha256": "%s", "recheck": %s, "deterministic": %s, "liveReads": %s, "frozenReads": %s, "refusedWrites": %s, "seconds": %s, "when": "%s" }\n' \
  "$base" "$head" "$identical" "${#list[@]}" "${urls#$HARNESS/}" "$hv" "$rsha" "$([ $recheck = 1 ] && echo true || echo false)" "${det:-null}" \
  "${misses:-0}" "${hits:-0}" "${refused:-0}" $((t1 - t0)) "$(date -u +%FT%TZ)" > "$CACHE/$key.json"
tail -3 "$OUT/result.txt"
publish
exit $rc
