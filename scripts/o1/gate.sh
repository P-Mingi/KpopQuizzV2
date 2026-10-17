#!/bin/bash
# Run O1: the gate (RUN-O1-PROMPT sections 2 and 5). Produces the evidence a reviewer judges a lane by.
#   scripts/o1/gate.sh <lane> <sha>
# Builds <sha> in a clean detached worktree for every site the lane touches (docs/o1/lanes.json), runs the gates, calls
# parity.sh when the diff touches a path outside the anime, hub and run-only folders, and writes
# docs/o1/evidence/<lane>/<sha>/ (steps.tsv, one log per step, parity result, tree hash, summary.json).
# Builders never run it: it refuses to run inside a lane worktree. Cached per sha: a second call reprints the summary.
# Version 1 by ORCH (Phase 0). Lane Q0a completes it (per-site check:* gates, the leak suite, lane e2e specs).
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
RUN="$O1/docs/o1"
KPQ="${O1_KPQ:-$HOME/kpq-o1}"
G="$O1/scripts/o1/git.sh"
die() { echo "gate: $1" >&2; exit "${2:-3}"; }
lane="${1:?usage: gate.sh <lane> <sha>}"; ref="${2:?sha}"
[ -z "$(git -C "$PWD" config --get o1.agent 2>/dev/null)" ] || die "refused: builders never produce evidence (run from $O1)" 9
sha="$("$G" -C "$O1" rev-parse --verify "$ref^{commit}")" || die "unknown sha $ref" 2
CFG="$RUN/lanes.json"
jqc() { jq -r --arg l "$lane" "$1" "$CFG"; }
[ "$(jqc '.[$l] | type')" = object ] || die "lane $lane not in docs/o1/lanes.json" 2
sites="$(jqc '.[$l].sites // ["kpop"] | join(" ")')"
spike="$(jqc '.[$l].spike // ""')"
hot_exempt="$(jqc '.[$l].hotExempt // false')"
EV="$RUN/evidence/$lane/$sha"
if [ -f "$EV/summary.json" ]; then cat "$EV/summary.json"; exit 0; fi
mkdir -p "$EV"; : > "$EV/steps.tsv"
base="$("$G" -C "$O1" merge-base o1/integration "$sha")"
tree="$("$G" -C "$O1" rev-parse "$sha^{tree}")"
"$G" -C "$O1" diff --name-only --no-renames "$base...$sha" > "$EV/changed.txt"
started="$(date -u +%FT%TZ)"

# --- which kpop surfaces could change: anything outside these folders reaches the kpop build ---
neutral='^(docs/|design/|scripts/o1/|scripts/o1-hooks/|scripts/o1-owner-guard\.mjs$|scripts/anime/|apps/quiz/e2e/|apps/quiz/scripts/o1/|apps/quiz/playwright\.o1\.config\.ts$|apps/quiz/src/app/sites/|apps/quiz/src/lib/site/anime/|apps/quiz/src/lib/site/hub/|apps/quiz/src/styles/sites/anime/|apps/quiz/src/styles/sites/hub/)|\.test\.(ts|tsx|mts)$'
touches_kpop=false
grep -vE "$neutral" "$EV/changed.txt" | grep -q . && touches_kpop=true

# D-025: while docs/o1/PARITY-OFFLINE exists, parity builds both sides against the offline Supabase (no production
# read): KPQ for parity.sh points at a stand-in whose kpop-parity.env holds only offline values.
parity_kpq() {
  if [ -f "$RUN/PARITY-OFFLINE" ]; then
    local d="$KPQ/parity-offline"; mkdir -p "$d/secrets"; chmod 700 "$d" "$d/secrets"
    printf 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9\nNEXT_PUBLIC_SUPABASE_ANON_KEY=o1-offline-anon\nSUPABASE_SERVICE_ROLE_KEY=o1-offline-service\nNEXT_PUBLIC_SITE_URL=https://kpopquiz.org\nNEXT_PUBLIC_SITE_NAME=KpopQuiz\n' > "$d/secrets/kpop-parity.env"
    chmod 600 "$d/secrets/kpop-parity.env"; echo "$d"
  else echo "$KPQ"; fi
}
WTS=()
prep() { # name sha -> worktree path
  local w="$ROOT/.claude/worktrees/o1-gate-$1"
  if [ -d "$w" ]; then
    rm -f "$w/node_modules" "$w/apps/quiz/node_modules" "$w/packages/shared/node_modules"; rm -rf "$w/apps/quiz/.next" "$w"/apps/quiz/.next-*
    "$G" -C "$O1" worktree remove "$w" >/dev/null 2>&1 || die "stale $w has changes: inspect it"
  fi
  "$G" -C "$O1" worktree add --detach "$w" "$2" >/dev/null 2>&1 || die "worktree add $w failed"
  ln -s "$O1/node_modules" "$w/node_modules"; ln -s "$O1/apps/quiz/node_modules" "$w/apps/quiz/node_modules"
  rm -rf "$w/packages/shared/node_modules"; ln -s "$O1/packages/shared/node_modules" "$w/packages/shared/node_modules"
  git -C "$w" config --worktree core.excludesFile "$O1/scripts/o1/lane.exclude" 2>/dev/null || true
  echo "$w"
}
SERVERS=()
cleanup() {
  for p in ${SERVERS[@]+"${SERVERS[@]}"}; do pkill -P "$p" 2>/dev/null; kill "$p" 2>/dev/null; done
  for w in ${WTS[@]+"${WTS[@]}"}; do
    rm -f "$w/node_modules" "$w/apps/quiz/node_modules" "$w/packages/shared/node_modules"; rm -rf "$w/apps/quiz/.next" "$w"/apps/quiz/.next-*
    "$G" -C "$O1" worktree remove "$w" >/dev/null 2>&1 || echo "gate: could not remove $w" >&2
  done
}
trap cleanup EXIT INT TERM
step() { # name cmd... ; records rc and seconds
  local name="$1"; shift; local t0; t0=$(date +%s)
  "$@" > "$EV/$name.log" 2>&1; local rc=$?
  printf '%s\t%s\t%s\n' "$name" "$rc" $(( $(date +%s) - t0 )) >> "$EV/steps.tsv"
  [ $rc -eq 0 ] && echo "gate $lane: $name ok" || echo "gate $lane: $name FAILED (rc $rc, $EV/$name.log)"
  return 0
}
pending() { printf '%s\t%s\t0\n' "$1" "${3:-pending}" >> "$EV/steps.tsv"; echo "$2" > "$EV/$1.log"; } # rc: skipped (not needed) or pending (not built yet)

WT="$(prep "$lane" "$sha")" || exit 3; WTS+=("$WT")
dbenv=offline; [ -f "$KPQ/secrets/dev.env" ] && dbenv=dev

# 1. Scope: guard on every commit of the range, against the ownership of O1 (the run's truth).
step guard bash -c 'cd "$1" && node "$2/scripts/o1-owner-guard.mjs" --agent "$3" --range "$4..$5" --ownership "$2/docs/o1/OWNERSHIP.json"' _ "$WT" "$O1" "$lane" "$base" "$sha"
# 2. HOT list: no lane diff touches a file another session is changing.
hot_check() {
  [ "$hot_exempt" = true ] && { echo "hot list: exempt for $lane (lanes.json)"; return 0; }
  local hits; hits="$(grep -vE '^(#|$)' "$RUN/HOT.txt" | cut -f1 | grep -Fxf - "$EV/changed.txt" || true)"
  [ -z "$hits" ] && { echo "hot list: clean ($(grep -cvE '^(#|$)' "$RUN/HOT.txt") hot files)"; return 0; }
  echo "hot files touched:"; echo "$hits"; return 1
}
step hot hot_check
# 3. Copy rules on added lines: no em dash, no en dash, no emoji.
copy_check() {
  "$G" -C "$O1" diff -U0 --no-renames "$base...$sha" -- . ':(exclude)*.png' ':(exclude)*.jpg' ':(exclude)*.webp' ':(exclude)*.woff2' ':(exclude)pnpm-lock.yaml' |
  perl -CSD -ne 'if (/^\+\+\+ b\/(.*)/) { $f = $1; next } next unless /^\+/; next if /^\+\+\+/; if (/[\x{2013}\x{2014}]|\p{Extended_Pictographic}/) { $n++; print "$f: $_" } END { exit($n ? 1 : 0) }'
}
step copy copy_check
# 4. Secrets: no value of KPQ/secrets/*.env and no credential-shaped string in the added lines (names only printed).
secrets_check() {
  local diff; diff="$(mktemp)"; "$G" -C "$O1" diff -U0 --no-renames "$base...$sha" | grep '^+' | grep -v '^+++' > "$diff"
  local bad=0
  for f in "$KPQ"/secrets/*.env; do
    [ -f "$f" ] || continue
    while IFS= read -r line; do
      v="${line#*=}"; [ ${#v} -ge 20 ] || continue
      grep -qF -- "$v" "$diff" && { echo "a value of $(basename "$f") (${line%%=*}) appears in the diff"; bad=1; }
    done < "$f"
  done
  if grep -nE 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.|sb_secret_[A-Za-z0-9]{10,}|sk_(live|test)_[A-Za-z0-9]{10,}|re_[A-Za-z0-9]{20,}|postgres(ql)?://[^:@/ ]+:[^@ ]{6,}@' "$diff" | cut -c1-12 | sed 's/^/credential-shaped string near: /'; then bad=1; fi
  rm -f "$diff"; [ $bad = 0 ] && echo "secrets: clean"; return $bad
}
step secrets secrets_check
# 4b. Static checks of the tree (scripts/o1/check.sh): rule 18 twins, then what Q0a adds there.
step twins "$O1/scripts/o1/check.sh" "$WT" "$EV"
# 5. Types and unit tests (RATCHET LAW: the existing tests run untouched).
step tsc bash -c 'cd "$1/apps/quiz" && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --incremental false' _ "$WT"
step unit bash -c 'cd "$1/apps/quiz" && ./node_modules/.bin/vitest run' _ "$WT"
# 6. Builds of every site the lane touches. kpop goes through parity.sh when the diff can reach it.
build_site() { # worktree site label
  "$O1/scripts/o1/build-lock.sh" run "gate-$3-$2" -- "$O1/scripts/o1/env.sh" "$dbenv" -- bash -c \
    'cd "$1/apps/quiz" && rm -rf .next && NEXT_PUBLIC_SITE_ID="$2" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 npm run build && rm -rf ".next-$2" && mv .next ".next-$2"' _ "$1" "$2"
}
for s in $sites; do
  if [ "$s" = kpop ] && [ "$touches_kpop" = true ]; then continue; fi
  step "build-$s" build_site "$WT" "$s" "$lane"
done
# 7. kpopquiz.org parity (production read, the only one): base = where the lane forked from o1/integration.
if [ "$touches_kpop" = true ]; then
  step parity env O1_KPQ="$(parity_kpq)" "$O1/scripts/o1/parity.sh" "$base" "$sha" --evidence "$EV"
  [ -f "$RUN/PARITY-OFFLINE" ] && echo "offline (D-025): no production read" > "$EV/parity-mode.txt"
else
  pending parity "no path outside the anime, hub and run-only folders: parity not needed" skipped
fi
# 8. Spike (F0): the spike branch tip, built for the three sites, served, and checked route by route.
serve_site() { # worktree site port
  ( cd "$1/apps/quiz" && rm -rf .next && cp -R ".next-$2" .next && "$O1/scripts/o1/env.sh" "$dbenv" -- env NEXT_PUBLIC_SITE_ID="$2" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 ./node_modules/.bin/next start -p "$3" -H 127.0.0.1 ) > "$EV/serve-$2.log" 2>&1 &
  SERVERS+=($!)
  for i in $(seq 1 90); do curl -s -o /dev/null "http://127.0.0.1:$3/robots.txt" && return 0; sleep 1; done
  return 1
}
spike_checks() { # spike worktree, checks file
  local w="$1" checks="$2" fails=0 port=4021
  for s in kpop anime hub; do
    [ -d "$w/apps/quiz/.next-$s" ] || { echo "no build for $s"; fails=1; continue; }
    serve_site "$w" "$s" $port || { echo "$s server did not start"; fails=1; }
    while IFS=$'\t' read -r site path want; do
      [ "$site" = "$s" ] || continue
      got="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $s.localhost" "http://127.0.0.1:$port$path")"
      if [ "$got" = "$want" ]; then echo "ok   $s $path $got"; else echo "FAIL $s $path got $got want $want"; fails=1; fi
    done < <(grep -vE '^(#|$)' "$checks")
    for p in ${SERVERS[@]+"${SERVERS[@]}"}; do pkill -P "$p" 2>/dev/null; kill "$p" 2>/dev/null; done; SERVERS=()
    sleep 2; port=$((port + 1))
  done
  return $fails
}
if [ -n "$spike" ]; then
  if spike_sha="$("$G" -C "$O1" rev-parse --verify --quiet "$spike^{commit}")"; then
    echo "$spike $spike_sha" > "$EV/spike.txt"
    SW="$(prep "$lane-spike" "$spike_sha")" || exit 3; WTS+=("$SW")
    for s in kpop anime hub; do step "spike-build-$s" build_site "$SW" "$s" "$lane-spike"; done
    if git -C "$SW" cat-file -e "HEAD:docs/o1/contracts/spike-checks.tsv" 2>/dev/null; then
      step spike-routes spike_checks "$SW" "$SW/docs/o1/contracts/spike-checks.tsv"
    else
      step spike-routes bash -c 'echo "spike branch has no docs/o1/contracts/spike-checks.tsv"; exit 1'
    fi
    spike_base="$("$G" -C "$O1" merge-base o1/integration "$spike_sha")"
    step spike-parity env O1_KPQ="$(parity_kpq)" "$O1/scripts/o1/parity.sh" "$spike_base" "$spike_sha" --evidence "$EV/spike-parity"
  else
    step spike-routes bash -c 'echo "spike branch '"$spike"' does not exist"; exit 1'
  fi
fi
# 9. Per-site check:* gates, leak suite, lane e2e specs: Q0a adds them (recorded as pending until then).
[ -x "$O1/scripts/o1/gate-checks.sh" ] && step site-checks "$O1/scripts/o1/gate-checks.sh" "$lane" "$WT" "$EV" "$sites" \
  || pending site-checks "check:routes runs inside every build; check:indexability, metadata-dupes, orphans, sitemap-hygiene, site-scope, the leak suite and the lane specs arrive with Q0a (scripts/o1/gate-checks.sh)"

failed="$(awk -F'\t' '$2!="0" && $2!="pending" && $2!="skipped" {print $1}' "$EV/steps.tsv" | tr '\n' ' ')"
green=true; [ -n "$failed" ] && green=false
failures=""
for n in $failed; do failures="$failures$n: $(grep -vE '^\s*$' "$EV/$n.log" | tail -3 | tr '\n' ' ' | cut -c1-300); "; done
jq -n --arg lane "$lane" --arg sha "$sha" --arg tree "$tree" --arg base "$base" --arg ev "$EV" --arg started "$started" \
  --arg ended "$(date -u +%FT%TZ)" --arg failures "$failures" --arg sites "$sites" --arg dbenv "$dbenv" \
  --argjson green $green --argjson touchesKpop $touches_kpop --rawfile steps "$EV/steps.tsv" \
  '{lane:$lane, sha:$sha, tree:$tree, base:$base, green:$green, touchesKpop:$touchesKpop, evidenceDir:$ev, failures:$failures,
    sites:($sites|split(" ")), dbEnv:$dbenv, started:$started, ended:$ended, madeBy:"scripts/o1/gate.sh",
    steps:($steps|split("\n")|map(select(length>0)|split("\t")|{name:.[0], rc:.[1], seconds:(.[2]|tonumber)})),
    notes:"rc skipped = not needed for this diff (reason in <step>.log); rc pending = the check does not exist yet (Q0a)"}' > "$EV/summary.json"
cat "$EV/summary.json"
