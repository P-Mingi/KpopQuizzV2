#!/bin/bash
# Owner test tool 1: the three sites on o1-dev, built from this worktree and served in the background.
#   scripts/o1-tools/dev-up.sh [--rebuild] [--stop] [--status] [--ports p1,p2,p3]
#
# Start (default): builds kpop, anime and hub from the code this worktree has checked out (o1/integration in the owner's
# worktree) against o1-dev, exactly as apps/quiz/e2e/o1/O1/run-dev.sh does (scripts/o1/env.sh dev, SITE_SCOPE=1 for build and
# server, NEXT_PUBLIC_UX_V1=1, NEXT_PUBLIC_UX_V12=1, NEXT_PUBLIC_NET_ORIGINS of these ports, PASSPORT_JUMP=1 with
# PASSPORT_TICKET_SECRET and NET_IP_HASH_SALT generated once per start and shared by the three servers, never written to disk).
# A build is reused when the app sources, the packages, the ports and the o1-dev settings are those of its last build
# (apps/quiz/.next-devup-<site>/.devup-stamp; uncommitted edits count, by content); --rebuild forces the three builds.
# The servers run in the background (new session), logs in ~/kpq-o1/logs/dev-up/. Start waits until each answers 200 on /.
# stdout is exactly three lines (progress and errors go to stderr):
#   kpopquiz  http://kpop.localhost:<p1>
#   otakuquiz http://anime.localhost:<p2>
#   fandomverse http://hub.localhost:<p3>
# --status prints the same three lines, or "stopped" (exit 1). --stop stops the servers and the sign-in helper of signin-link.sh.
# Ports: --ports, else $O1_DEVUP_PORTS, else 3190,3191,3192 (outside every lane triple of docs/o1/ports.tsv).
# Listening address: 127.0.0.1 as C3/run-dev.sh; with it, a path no route knows answers 500 (Next proxies the rewrite to /page-not-found
# to "localhost", which is ::1 first); O1_DEVUP_HOST=localhost listens on ::1 and answers the 404 page, but 127.0.0.1 then refuses.
# Refuses (exit 5) unless scripts/o1/env.sh dev gives o1-dev (O1_ENV=dev, O1_BRANCH=o1-dev, URL of the branch ref, no production ref).
# Exit: 0 ok, 1 --status and stopped, 2 usage, 3 build or server did not come up, 4 or 5 environment refused.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WT="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null)" || { echo "dev-up: not in a git worktree" >&2; exit 2; }
APP="$WT/apps/quiz"
ENVSH="$WT/scripts/o1/env.sh"; LOCK="$WT/scripts/o1/build-lock.sh"
KPQ="${O1_KPQ:-$HOME/kpq-o1}"; LOGS="$KPQ/logs/dev-up"; STATE="$LOGS/state.env"; SIGNIN_STATE="$LOGS/signin.state"
PROD_REF="rdkgouofytwfdpbxbzio"
die() { echo "dev-up: $1" >&2; exit "${2:-2}"; }
say() { echo "dev-up: $*" >&2; }

mode=start; rebuild=0; ports="${O1_DEVUP_PORTS:-3190,3191,3192}"
while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild) rebuild=1 ;;
    --stop) mode=stop ;;
    --status) mode=status ;;
    --ports) ports="${2:?--ports needs p1,p2,p3}"; shift ;;
    -h|--help) sed -n '2,/^set -/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown argument $1 (usage: dev-up.sh [--rebuild] [--stop] [--status] [--ports p1,p2,p3])" ;;
  esac
  shift
done
P1="$(echo "$ports" | cut -d, -f1)"; P2="$(echo "$ports" | cut -d, -f2)"; P3="$(echo "$ports" | cut -d, -f3)"
for p in "$P1" "$P2" "$P3"; do case "$p" in ''|*[!0-9]*) die "bad port '$p' (--ports p1,p2,p3)" ;; esac; done
SITES="kpop anime hub"
HOST="${O1_DEVUP_HOST:-127.0.0.1}" # what the servers listen on; "localhost" (::1) also gives a 404 page, not a 500, on a path no route knows
port_of() { case "$1" in kpop) echo "$P1" ;; anime) echo "$P2" ;; hub) echo "$P3" ;; esac; }
name_of() { case "$1" in kpop) echo kpopquiz ;; anime) echo otakuquiz ;; hub) echo fandomverse ;; esac; }
alive() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }
is_server() { alive "${1:-}" && ps -p "$1" -o command= 2>/dev/null | grep -q next; } # a recorded pid that is still one of our servers, not a reused number
answers() { [ "$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "http://localhost:$1/robots.txt" 2>/dev/null)" != 000 ]; }
print_lines() { local s; for s in $SITES; do printf '%-9s http://%s.localhost:%s\n' "$(name_of "$s")" "$s" "$(port_of "$s")"; done; }

kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill "$1" 2>/dev/null; }
kill_server() { # pid: the server was started as the leader of its own session, so its group is killed too
  local pid="$1" n=0
  is_server "$pid" || return 0
  kill -TERM -- "-$pid" 2>/dev/null; kill_tree "$pid"
  while alive "$pid" && [ "$n" -lt 20 ]; do sleep 0.5; n=$((n + 1)); done
  if alive "$pid"; then kill -KILL -- "-$pid" 2>/dev/null; kill -KILL "$pid" 2>/dev/null; fi
}
stop_signin_helper() {
  [ -f "$SIGNIN_STATE" ] || return 0
  local pid; pid="$(sed -n 's/^PID=//p' "$SIGNIN_STATE" | head -1)"
  if alive "$pid" && ps -p "$pid" -o command= 2>/dev/null | grep -q signin-helper; then kill "$pid" 2>/dev/null; fi
  rm -f "$SIGNIN_STATE"
}
read_state() { # sets S_PORTS, S_PID_<site>; returns 1 when there is no state
  [ -f "$STATE" ] || return 1
  S_PORTS="$(sed -n 's/^PORTS=//p' "$STATE" | head -1)"
  S_WT="$(sed -n 's/^WT=//p' "$STATE" | head -1)"; S_SHA="$(sed -n 's/^SHA=//p' "$STATE" | head -1)"
  S_PID_kpop="$(sed -n 's/^PID_kpop=//p' "$STATE" | head -1)"; S_PID_anime="$(sed -n 's/^PID_anime=//p' "$STATE" | head -1)"
  S_PID_hub="$(sed -n 's/^PID_hub=//p' "$STATE" | head -1)"
  [ -n "$S_PORTS" ]
}
running_count() { local n=0 s v; for s in $SITES; do eval "v=\${S_PID_$s:-}"; is_server "$v" && n=$((n + 1)); done; echo "$n"; }
use_state_ports() { P1="$(echo "$S_PORTS" | cut -d, -f1)"; P2="$(echo "$S_PORTS" | cut -d, -f2)"; P3="$(echo "$S_PORTS" | cut -d, -f3)"; }

do_stop() {
  local s v
  if read_state; then
    for s in $SITES; do eval "v=\${S_PID_$s:-}"; kill_server "$v"; done
    use_state_ports
  fi
  stop_signin_helper
  for s in $SITES; do rm -rf "$WT/.next/devup-serve-$s"; done
  rm -f "$STATE"
}

if [ "$mode" = status ]; then
  if read_state && [ "$(running_count)" -gt 0 ]; then
    use_state_ports
    n=0; for s in $SITES; do eval "v=\${S_PID_$s:-}"; is_server "$v" && answers "$(port_of "$s")" && n=$((n + 1)); done
    print_lines
    if [ "$n" -lt 3 ]; then say "only $n of 3 servers answer (logs $LOGS)"; exit 3; fi
    exit 0
  fi
  echo stopped; exit 1
fi
if [ "$mode" = stop ]; then
  mkdir -p "$LOGS"; do_stop
  echo stopped; exit 0
fi

# ---- start
[ -x "$ENVSH" ] && [ -x "$LOCK" ] || die "scripts/o1/env.sh or build-lock.sh not found in $WT"
[ -d "$APP/src" ] || die "no apps/quiz/src in $WT"
[ -x "$APP/node_modules/.bin/next" ] || die "no next in $APP/node_modules/.bin"
mkdir -p "$LOGS"

# The environment must be o1-dev: env.sh dev refuses the production project and a URL without the branch ref; checked again here.
guard='
  [ "${O1_ENV:-}" = dev ] && [ "${O1_BRANCH:-}" = o1-dev ] || { echo "dev-up: refused, the environment is not o1-dev" >&2; exit 5; }
  case "${NEXT_PUBLIC_SUPABASE_URL:-}" in "https://${O1_BRANCH_REF:-x}.supabase.co"|"https://${O1_BRANCH_REF:-x}.supabase.co/") ;; *) echo "dev-up: refused, the URL is not the o1-dev branch" >&2; exit 5 ;; esac
  case "${NEXT_PUBLIC_SUPABASE_URL}|${O1_BRANCH_REF}|${O1_DB_URL:-}" in *'"$PROD_REF"'*) echo "dev-up: refused, a production reference" >&2; exit 5 ;; esac
  printf "%s|%s" "$NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | shasum | cut -c1-16'
ENVHASH="$("$ENVSH" dev -- bash -c "$guard")"; rc=$?
[ "$rc" = 0 ] && [ -n "$ENVHASH" ] || die "the environment is not o1-dev (scripts/o1/env.sh dev exit $rc)" "$([ "$rc" = 0 ] && echo 5 || echo "$rc")"

if read_state && [ "$(running_count)" -gt 0 ]; then
  if [ "$rebuild" = 0 ]; then
    use_state_ports
    say "already running (started from ${S_WT:-?} at ${S_SHA:-?}); --rebuild restarts them, --stop stops them"
    print_lines; exit 0
  fi
  say "stopping the running servers for --rebuild"; do_stop
fi
rm -f "$STATE"
for p in "$P1" "$P2" "$P3"; do lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 && die "port $p is busy (not started by dev-up; use --ports p1,p2,p3)" 3; done
NET_ORIGINS="kpop=http://kpop.localhost:$P1,anime=http://anime.localhost:$P2,hub=http://hub.localhost:$P3"
HEAD_SHA="$(git -C "$WT" rev-parse --short=12 HEAD)"

# 1. Builds: reused when sources (by content, uncommitted edits included), ports and o1-dev settings are unchanged.
BPATHS="apps/quiz/src apps/quiz/public packages apps/quiz/next.config.ts apps/quiz/package.json apps/quiz/tsconfig.json apps/quiz/tailwind.config.ts apps/quiz/postcss.config.js"
tree_key() {
  git -C "$WT" ls-tree HEAD $BPATHS 2>/dev/null | awk '{print $3}' | tr '\n' ' '
  git -C "$WT" diff HEAD --binary --no-ext-diff -- $BPATHS 2>/dev/null | shasum
  ( cd "$WT" && git ls-files -o --exclude-standard -z -- $BPATHS 2>/dev/null | xargs -0 -r shasum 2>/dev/null | shasum )
}
STAMP="$(printf '%s|%s|%s|v1' "$(tree_key)" "$NET_ORIGINS" "$ENVHASH" | shasum | cut -c1-40)"
have_build() { [ -f "$APP/.next-devup-$1/BUILD_ID" ] && [ "$(cat "$APP/.next-devup-$1/.devup-stamp" 2>/dev/null)" = "$STAMP-$1" ]; }

PIDS=(); started_ok=0
cleanup() { local p; if [ "$started_ok" = 0 ]; then for p in ${PIDS[@]+"${PIDS[@]}"}; do kill_server "$p"; done; for s in $SITES; do rm -rf "$WT/.next/devup-serve-$s"; done; rm -f "$STATE"; fi; }
trap 'cleanup; exit 130' INT TERM
trap cleanup EXIT

say "building from $(git -C "$WT" rev-parse --abbrev-ref HEAD) at $HEAD_SHA against o1-dev"
for s in $SITES; do
  if [ "$rebuild" = 0 ] && have_build "$s"; then say "build $s reused (same sources, ports and settings)"; continue; fi
  say "building $s (log $LOGS/build-$s.log)"
  "$LOCK" run "devup-$s" -- "$ENVSH" dev -- bash -c '
    cd "$1" && rm -rf .next && SITE_SCOPE=1 NEXT_PUBLIC_SITE_ID="$2" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_NET_ORIGINS="$3" npm run build \
      && rm -rf ".next-devup-$2" && mv .next ".next-devup-$2"' _ "$APP" "$s" "$NET_ORIGINS" > "$LOGS/build-$s.log" 2>&1
  [ -f "$APP/.next-devup-$s/BUILD_ID" ] || { grep -i -m5 'error' "$LOGS/build-$s.log" | cut -c1-200 >&2; die "build of $s failed ($LOGS/build-$s.log)" 3; }
  printf '%s-%s' "$STAMP" "$s" > "$APP/.next-devup-$s/.devup-stamp"
done

# 2. Servers: run-only secrets in this process's environment (shared by the three servers), a mirror of apps/quiz per site
#    whose .next is that site's build, as C3/run-dev.sh does. ADMIN_USER_IDS = the admin_reviewer fixture (docs/o1/contracts/fixtures.md).
export PASSPORT_TICKET_SECRET; PASSPORT_TICKET_SECRET="$(openssl rand -hex 24)"
export NET_IP_HASH_SALT; NET_IP_HASH_SALT="$(openssl rand -hex 24)"
ADMIN_ID="$(node -e 'try{const u=require(process.argv[1]).users.find(x=>x.key==="admin_reviewer");if(u)process.stdout.write(u.id)}catch{}' "$WT/docs/o1/fixtures-dev.json")"
for s in $SITES; do
  p="$(port_of "$s")"; root="$WT/.next/devup-serve-$s"
  rm -rf "$root"; mkdir -p "$root"; [ -f "$LOGS/$s.log" ] && mv -f "$LOGS/$s.log" "$LOGS/$s.prev.log"
  for e in "$APP"/*; do case "$(basename "$e")" in .next|.next-*|test-results) continue ;; esac; ln -s "$e" "$root/$(basename "$e")"; done
  ln -s "$APP/.next-devup-$s" "$root/.next"
  ( cd "$root" && exec perl -MPOSIX -e 'POSIX::setsid(); exec @ARGV or die "exec: $!"' "$ENVSH" dev -- env NEXT_PUBLIC_SITE_ID="$s" SITE_ID="$s" \
      NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_NET_ORIGINS="$NET_ORIGINS" SITE_SCOPE=1 PASSPORT_JUMP=1 \
      ADMIN_USER_IDS="${ADMIN_ID}" NODE_OPTIONS="--max-http-header-size=32768" \
      ./node_modules/.bin/next start -p "$p" -H "$HOST" ) < /dev/null > "$LOGS/$s.log" 2>&1 &
  PIDS+=("$!")
  say "$s starting on port $p (log $LOGS/$s.log)"
done
i=0; for s in $SITES; do
  p="$(port_of "$s")"; pid="${PIDS[$i]}"; i=$((i + 1)); n=0
  until answers "$p"; do
    alive "$pid" || die "$s stopped ($LOGS/$s.log)" 3
    n=$((n + 1)); [ "$n" -lt 180 ] || die "$s did not answer in 3 minutes" 3
    sleep 1
  done
done
for s in $SITES; do # warm-up: the first request of each site, which must answer 200
  p="$(port_of "$s")"; code=000; n=0
  while [ "$code" != 200 ] && [ "$n" -lt 3 ]; do code="$(curl -s -o /dev/null --max-time 300 -w '%{http_code}' "http://localhost:$p/")"; n=$((n + 1)); [ "$code" = 200 ] || sleep 2; done
  [ "$code" = 200 ] || die "$s answered $code on / (log $LOGS/$s.log)" 3
done

{ echo "WT=$WT"; echo "SHA=$HEAD_SHA"; echo "PORTS=$P1,$P2,$P3"; echo "STARTED=$(date +%s)"
  echo "PID_kpop=${PIDS[0]}"; echo "PID_anime=${PIDS[1]}"; echo "PID_hub=${PIDS[2]}"; } > "$STATE"
chmod 600 "$STATE"
started_ok=1
print_lines
