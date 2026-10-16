#!/bin/bash
# Run O1, lane Q0a: the per-site checks of the gate (BACKLOG section 0 gate list and the Q0 card; RUN-O1-PROMPT
# section 2, Gate evidence).
#   scripts/o1/gate-checks.sh <lane> <worktree> <evidence dir> <sites>
# gate.sh calls it (step site-checks) when it exists, after the builds and parity, with the gate worktree that holds
# apps/quiz/.next-<site> for each site it built. It serves those builds (three `next start` at once, on 4021 4022 4023,
# each from a folder of links to the worktree whose .next is the site's build, Host <site>.localhost), runs every
# check below, writes one log per check in <evidence dir>/checks/ (plus checks.tsv, plan.json, the server logs and the
# Playwright JSON reports), stops the servers and exits 1 when a check failed, 0 otherwise (skipped and pending are
# not failures; each says why in its log). Builders never run it (rule: the gate step does).
#
# Which build makes each check meaningful (the decision table is apps/quiz/scripts/o1/q0a/gate-plan.mjs, unit tested):
#   kpop check:indexability, metadata-dupes, orphans, sitemap-hygiene: they grade production data (a floor of 600
#     sitemap URLs, the 15 priority hubs, the live catalogue, the article registry), so they run on the parity head
#     build kept by `parity.sh --keep` and served by `parity.sh --serve-kept`: the frozen production state of the
#     parity run, every write refused, and in strict mode any non-read to any other origin refused too. This reads
#     production and counts as a parity run (never 00:00 to 01:00 UTC). check:indexability reads the catalogue
#     itself, through `parity.sh --check-kept` (same frozen state and guard); the other three read only the server.
#     When the diff cannot reach kpop (gate.sh ran no parity) they are skipped: an offline or dev kpop build fails
#     them by construction, and kpop is then unchanged. When parity ran without --keep they are pending (request 2).
#   anime and hub: check:metadata-dupes keeps the path of any loc, so it runs on the gate build of a wired site with
#     a sitemap.xml route (offline today: the static pages; the dev branch after G1: the fixture rows too).
#     check:indexability, orphans and sitemap-hygiene hardcode kpopquiz.org and the kpop catalogue (toLocal rewrites
#     only that origin, so an otakuquiz.org loc would be fetched from the internet): skipped with that reason.
#     The scripts are run unchanged from the harness checkout through their *_BASE_URL overrides (RATCHET LAW).
#   check:site-scope: B2's static lint, on the head source, when apps/quiz/scripts/o1/check-site-scope.mts exists.
#   network-links: check-network-links.mts on every served site (an unwired anime or hub build is left out: it serves
#     kpop pages), the parity list plus 200 sitemap paths per site (every kpop server here is offline or guarded).
#   leak: the leak project of playwright.o1.config.ts (harness checkout) on the served sites, with the build folders
#     (wiring from the routes-manifest), O1_LEAK_REQUIRE for the sites the base or head next.config.ts wires, and the
#     lane's own leak-cases.json from the head. On the kept parity build the content leak is left out: production
#     holds no anime row (Verrou 0), so it would prove nothing. kpop-refused-writes: no write was refused while the
#     gate read the kept build (the guard held, and no crawled page tried one).
#   leak-content and lane-specs: on gate builds only, never on the kept parity build (a browser on it would reach the
#     production Supabase directly). With the kept build in phase A, phase B swaps the kpop server for the gate's
#     kpop build when there is one (gate.sh builds it on the dev branch: request 11), else they skip with the reason.
#     Lane specs: docs/o1/lanes.json "specs", files *.o1.ts, run from the head with its playwright.o1.config.ts
#     (project lanes); variables O1_KPOP_URL, O1_ANIME_URL, O1_HUB_URL (and O1_LEAK_<SITE>_URL), O1_ENV.
#   harness-unit: node --test of the harness unit tests in the head (scripts/o1/parity, apps/quiz/scripts/o1).
# Database: the gate's own (O1_GATE_DBENV, else dev when KPQ/secrets/dev.env exists, else offline), as gate.sh.
# Overrides for tests and people: O1_GATE_URL_<SITE> (a given server instead of a build; O1_GATE_KPOP_SOURCE=parity
# when a given kpop server holds production data), O1_GATE_PORTS ("4021 4022 4023"), O1_GATE_BASE (the base sha),
# O1_LANES_JSON, O1_GATE_KEPT_OFFLINE=1 (the kept build served with no production read: every read not in the frozen
# state answers 503; plumbing tests only, the gate never sets it).
set -uo pipefail
shopt -s nullglob dotglob
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
HERE="$(cd "$(dirname "$0")" && pwd)"          # scripts/o1 of the harness checkout
HARNESS="$(cd "$HERE/../.." && pwd)"
KPQ="${O1_KPQ:-$HOME/kpq-o1}"
G="$O1/scripts/o1/git.sh"
ENVSH="$O1/scripts/o1/env.sh"
TSX="$HARNESS/node_modules/.bin/tsx"          # the repo root's (apps/quiz/node_modules/.bin has next and playwright)
die() { echo "gate-checks: $1" >&2; exit "${2:-3}"; }
lane="${1:?usage: gate-checks.sh <lane> <worktree> <evidence dir> <sites>}"; wt="${2:?worktree}"; ev="${3:?evidence dir}"; sites="${4-}"
[ -d "$wt/apps/quiz" ] || die "no apps/quiz in $wt" 2
wt="$(cd "$wt" && pwd)"; mkdir -p "$ev"; ev="$(cd "$ev" && pwd)"
OUTD="$ev/checks"; rm -rf "$OUTD"; mkdir -p "$OUTD"
dbenv="${O1_GATE_DBENV:-}"; [ -n "$dbenv" ] || { dbenv=offline; [ -f "$KPQ/secrets/dev.env" ] && dbenv=dev; }
head="$(git -C "$wt" rev-parse HEAD)" || die "no git head in $wt" 2
base="${O1_GATE_BASE:-$("$G" -C "$O1" merge-base o1/integration "$head" 2>/dev/null || true)}"
LANES="${O1_LANES_JSON:-$O1/docs/o1/lanes.json}"
PORTS="${O1_GATE_PORTS:-4021 4022 4023}"
koff=""; [ "${O1_GATE_KEPT_OFFLINE:-}" = 1 ] && koff="--offline"
PLAN="$OUTD/plan.json"
node "$HARNESS/apps/quiz/scripts/o1/q0a/gate-plan.mjs" --lane "$lane" --wt "$wt" --ev "$ev" --sites "$sites" --dbenv "$dbenv" \
  --head "$head" --base "$base" --kept-file "$KPQ/cache/parity/kept.json" --lanes-json "$LANES" --ports "$PORTS" > "$PLAN" \
  || die "the plan failed (apps/quiz/scripts/o1/q0a/gate-plan.mjs)" 3
pj() { jq -r "$@" "$PLAN"; }
echo "gate-checks $lane: head ${head:0:12}, base ${base:0:12}, sites [$sites], db $dbenv, harness $HARNESS"

TSV="$OUTD/checks.tsv"; : > "$TSV"
record() { printf '%s\t%s\t%s\n' "$1" "$2" "$3" >> "$TSV"; }
say() { case "$2" in 0) echo "  ok       $1" ;; skipped|pending) echo "  $2  $1: $(head -c 160 "$OUTD/$1.log" | tr '\n' ' ')" ;; *) echo "  FAILED   $1 (rc $2, checks/$1.log)" ;; esac; }
run_check() { # name cmd...
  local name="$1"; shift; local t0; t0=$(date +%s)
  "$@" < /dev/null > "$OUTD/$name.log" 2>&1; local rc=$?
  record "$name" "$rc" $(( $(date +%s) - t0 )); say "$name" "$rc"
}
note() { # name action reason
  echo "$3" > "$OUTD/$1.log"
  local rc; case "$2" in skip) rc=skipped ;; pending) rc=pending ;; *) rc=1 ;; esac
  record "$1" "$rc" 0; say "$1" "$rc"
}

# --- servers ---
SPIDS=(); TMPROOT="$(mktemp -d "${TMPDIR:-/tmp}/o1-gate-checks.XXXXXX")"
kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill "$1" 2>/dev/null; }
stop_servers() { for p in ${SPIDS[@]+"${SPIDS[@]}"}; do kill_tree "$p"; done; SPIDS=(); }
cleanup() { stop_servers; rm -rf "$TMPROOT"; }
trap cleanup EXIT INT TERM
port_free() { local i; for i in $(seq 1 120); do lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1 || return 0; sleep 5; done; return 1; }
wait_up() { # port pid [seconds]
  local i code
  for i in $(seq 1 "${3:-120}"); do
    code="$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "http://127.0.0.1:$1/robots.txt" 2>/dev/null)"
    [ "$code" != "000" ] && [ -n "$code" ] && return 0
    kill -0 "$2" 2>/dev/null || return 1
    sleep 1
  done
  return 1
}
# Per-site state (bash 3.2: no associative arrays): URL_<site> for the suites, LOCAL_<site> for the SEO scripts
# (127.0.0.1), UP_<site> 1 when the server answers.
sv() { local n="$1_$2"; echo "${!n:-}"; }
setv() { printf -v "$1_$2" '%s' "$3"; }
upper() { echo "$1" | tr '[:lower:]' '[:upper:]'; }
start_server() { # phase site
  local ph="$1" s="$2" j src port given build scope log pid
  j="$(pj --arg p "$ph" --arg s "$s" '.servers[$p][$s] // empty | @json')"
  [ -n "$j" ] || return 0
  src="$(jq -r .source <<< "$j")"; port="$(jq -r .port <<< "$j")"; given="$(jq -r .given <<< "$j")"
  build="$(jq -r '.build // ""' <<< "$j")"; scope="$(jq -r .scope <<< "$j")"
  setv URL "$s" "$(jq -r .url <<< "$j")"; setv LOCAL "$s" "http://127.0.0.1:$port"
  if [ "$given" = true ]; then setv LOCAL "$s" "$(sv URL "$s")"; setv UP "$s" 1; echo "  server   $s: given $(sv URL "$s") ($src)"; return 0; fi
  log="$OUTD/serve-$s-$ph.log"
  port_free "$port" || { echo "port $port stayed busy for 10 minutes" > "$log"; setv UP "$s" 0; return 0; }
  if [ "$src" = parity ]; then
    "$HERE/parity.sh" --serve-kept "$head" "$port" $koff < /dev/null > "$log" 2>&1 &
  else
    local root="$TMPROOT/serve-$s-$ph" e
    mkdir -p "$root"
    for e in "$wt/apps/quiz"/*; do case "$(basename "$e")" in .next|.next-*) continue ;; esac; ln -s "$e" "$root/$(basename "$e")"; done
    ln -s "$wt/apps/quiz/$build" "$root/.next"
    local extra=(); [ "$scope" = true ] && extra=(SITE_SCOPE=1)
    ( cd "$root" && "$ENVSH" "$dbenv" -- env NEXT_PUBLIC_SITE_ID="$s" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 ${extra[@]+"${extra[@]}"} \
        ./node_modules/.bin/next start -p "$port" -H 127.0.0.1 ) < /dev/null > "$log" 2>&1 &
  fi
  pid=$!; SPIDS+=("$pid"); setv PID "$s" "$pid"
  # The kept build waits for the parity lock when another parity run holds it (one run is about ten minutes).
  if wait_up "$port" "$pid" "$([ "$src" = parity ] && echo 1800 || echo 120)"; then setv UP "$s" 1; echo "  server   $s: $(sv URL "$s") ($src, $([ "$src" = parity ] && echo "kept parity build${koff:+, offline replay}" || echo "$build, db $dbenv"))"
  else setv UP "$s" 0; echo "  server   $s: did not start (checks/serve-$s-$ph.log)"; fi
}
siteup() { [ -z "${1:-}" ] || [ "$(sv UP "$1")" = 1 ]; }

# --- the checks ---
pw_env() { # site list -> env assignments for the leak suite and lane specs
  local s S g; for s in kpop anime hub; do
    siteup "$s" && [ -n "$(sv URL "$s")" ] || continue
    S="$(upper "$s")"; g="O1_GATE_URL_$S"
    printf 'O1_LEAK_%s_URL=%s\n' "$S" "$(sv URL "$s")"
    printf 'O1_%s_URL=%s\n' "$S" "$(sv URL "$s")"
    if [ "$s" != kpop ] && [ -z "${!g:-}" ] && [ -d "$wt/apps/quiz/.next-$s" ]; then printf 'O1_LEAK_%s_NEXT=%s\n' "$S" "$wt/apps/quiz/.next-$s"; fi
  done
  return 0
}
do_seo() { # check envVar site env
  local c="$1" var="$2" s="$3" how="$4"
  cd "$HARNESS/apps/quiz" || return 2
  if [ "$how" = parity ]; then "$HERE/parity.sh" --check-kept "$head" $koff -- env "$var=$(sv LOCAL "$s")" "$TSX" "scripts/check-$c.mts"
  else "$ENVSH" offline -- env "$var=$(sv LOCAL "$s")" "$TSX" "scripts/check-$c.mts"; fi
}
do_links() { # sites...
  local args=() s; for s in "$@"; do siteup "$s" && args+=(--site "$s=$(sv URL "$s")"); done
  [ ${#args[@]} -gt 0 ] || { echo "no server up"; return 1; }
  cd "$HARNESS/apps/quiz" && "$ENVSH" offline -- "$TSX" scripts/o1/check-network-links.mts "${args[@]}" --sitemap 200 --out "$OUTD/network-links"
}
do_leak() { # name, then playwright filters
  local name="$1"; shift
  local cases=(); [ -f "$wt/apps/quiz/e2e/o1/$lane/leak-cases.json" ] && [ "$wt" != "$HARNESS" ] && cases=(O1_LEAK_CASES="$wt/apps/quiz/e2e/o1/$lane")
  local req; req="$(pj '[.checks[] | select(.name == "leak") | .require // []] | add // [] | join(",")')"
  local envs=(); while IFS= read -r l; do [ -n "$l" ] && envs+=("$l"); done < <(pw_env)
  cd "$HARNESS/apps/quiz" && "$ENVSH" offline -- env ${envs[@]+"${envs[@]}"} ${cases[@]+"${cases[@]}"} O1_LEAK_REQUIRE="$req" O1_LEAK_KPOP_SITEMAP_N=20 \
    O1_ENV="$dbenv" O1_SITE_SCOPE="$([ "$(pj .siteScope)" = true ] && echo 1 || echo 0)" O1_PW_OUT="$TMPROOT/pw-$name" O1_PW_REPORT="$OUTD/$name.json" \
    ./node_modules/.bin/playwright test -c playwright.o1.config.ts --project leak "$@"
}
do_refused() {
  local f; f="$(jq -r '.freeze // empty' "$KPQ/cache/parity/kept.json" 2>/dev/null)"
  [ -d "$f" ] || { echo "the kept frozen state is gone"; return 1; }
  local hits miss; hits="$(grep -c '^gate-' "$f/hits.log" 2>/dev/null)"; miss="$(grep -c '^gate-' "$f/misses.log" 2>/dev/null)"
  echo "reads while the gate read the kept build: ${hits:-0} answered from the frozen state, ${miss:-0} live"
  if grep -q '^gate-' "$f/refused.log" 2>/dev/null; then
    echo "writes refused (method and path, never a body):"; grep '^gate-' "$f/refused.log" | sort | uniq -c; return 1
  fi
  echo "no write refused"
}
do_specs() { # kpopUrl files...
  local kp="$1"; shift
  [ -f "$wt/apps/quiz/playwright.o1.config.ts" ] || { echo "no apps/quiz/playwright.o1.config.ts in the head: merge o1/integration first"; return 1; }
  local envs=() files=() f; while IFS= read -r l; do
    [ -n "$l" ] || continue
    case "$l" in O1_KPOP_URL=*|O1_LEAK_KPOP_URL=*) [ "$kp" = true ] || continue ;; esac
    envs+=("$l")
  done < <(pw_env)
  for f in "$@"; do files+=("${f#apps/quiz/}"); done
  cd "$wt/apps/quiz" && "$ENVSH" "$dbenv" -- env ${envs[@]+"${envs[@]}"} O1_SITE_SCOPE="$([ "$(pj .siteScope)" = true ] && echo 1 || echo 0)" \
    O1_PW_OUT="$TMPROOT/pw-lanes" O1_PW_REPORT="$OUTD/lane-specs.json" ./node_modules/.bin/playwright test -c playwright.o1.config.ts --project lanes ${files[@]+"${files[@]}"}
}
exec_check() { # check json
  local j="$1" name kind action reason site
  name="$(jq -r .name <<< "$j")"; kind="$(jq -r .kind <<< "$j")"; action="$(jq -r .action <<< "$j")"; reason="$(jq -r .reason <<< "$j")"
  site="$(jq -r '.site // ""' <<< "$j")"
  if [ "$action" != run ]; then note "$name" "$action" "$reason"; return; fi
  case "$kind" in seo|refused-writes) siteup "$site" || { note "$name" fail "the $site server did not start (checks/serve-$site-*.log)"; return; } ;; esac
  case "$kind" in
    harness-unit) local files=(); while IFS= read -r f; do files+=("$f"); done < <(jq -r '.files[]' <<< "$j")
                  run_check "$name" bash -c 'cd "$1" && shift && node --test --test-timeout=60000 "$@"' _ "$wt" ${files[@]+"${files[@]}"} ;;
    site-scope)   run_check "$name" bash -c 'cd "$1/apps/quiz" && "$2" offline -- "$3" scripts/o1/check-site-scope.mts' _ "$wt" "$ENVSH" "$TSX" ;;
    seo)          run_check "$name" do_seo "$(jq -r .check <<< "$j")" "$(jq -r .envVar <<< "$j")" "$site" "$(jq -r .env <<< "$j")" ;;
    network-links) local ls=(); while IFS= read -r s; do ls+=("$s"); done < <(jq -r '.sites[]' <<< "$j")
                  run_check "$name" do_links ${ls[@]+"${ls[@]}"} ;;
    leak)         if [ "$(jq -r .excludeContent <<< "$j")" = true ]; then run_check "$name" do_leak leak --grep-invert 'content-leak\.o1\.ts'
                  else run_check "$name" do_leak leak; fi ;;
    leak-content) run_check "$name" do_leak leak-content leak/content-leak.o1.ts ;;
    refused-writes) run_check "$name" do_refused ;;
    lane-specs)   local fs=(); while IFS= read -r f; do fs+=("$f"); done < <(jq -r '.files[]' <<< "$j")
                  [ -n "$reason" ] && echo "lane-specs: $reason"
                  run_check "$name" do_specs "$(jq -r .kpopUrl <<< "$j")" ${fs[@]+"${fs[@]}"} ;;
    *)            note "$name" fail "unknown check kind $kind" ;;
  esac
}
phase() { # phase
  local j; while IFS= read -r j; do exec_check "$j"; done < <(pj --arg p "$1" '.checks[] | select(.phase == $p) | @json')
}

phase pre
if [ "$(pj '[.servers.A[] | select(. != null)] | length')" -gt 0 ]; then
  for s in kpop anime hub; do start_server A "$s"; done
fi
phase A
if [ "$(pj '.servers.B != null and ([.checks[] | select(.phase == "B")] | length > 0)')" = true ]; then
  kp="$(sv PID kpop)"; [ -n "$kp" ] && kill_tree "$kp"   # the kept parity server leaves; the kpop gate build takes its port
  start_server B kpop
  phase B
fi
stop_servers

failed="$(awk -F'\t' '$2!="0" && $2!="skipped" && $2!="pending" {print $1}' "$TSV" | tr '\n' ' ')"
counts="$(awk -F'\t' '{ if ($2=="0") ok++; else if ($2=="skipped") sk++; else if ($2=="pending") pe++; else fa++ } END { printf "%d ok, %d skipped, %d pending, %d failed", ok, sk, pe, fa }' "$TSV")"
echo "gate-checks $lane: $counts${failed:+ (failed: $failed)}"
[ -z "$failed" ]
