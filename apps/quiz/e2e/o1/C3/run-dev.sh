#!/bin/bash
# Run O1, lane C3: the whole network on o1-dev, in one command.
#   bash apps/quiz/e2e/o1/C3/run-dev.sh [--ports p1,p2,p3] [--rebuild | --skip-build] [--no-merge] [--with-jump] [--hold]
#
# 1. Builds kpop, anime and hub from this worktree (after a fast-forward to o1/integration) against o1-dev
#    (scripts/o1/env.sh dev), with the flags of the gate builds (NEXT_PUBLIC_UX_V1=1, NEXT_PUBLIC_UX_V12=1) and the
#    origins of this run (NEXT_PUBLIC_NET_ORIGINS, so the passport jump and the hub cards point at these servers).
#    A build is reused when the app sources, the packages and the ports are those of its last build (.next-<site>/.c3-stamp)
#    and the tree is clean there; --rebuild forces it, --skip-build fails when a build is missing.
# 2. Starts the three servers (`next start`, hosts kpop.localhost, anime.localhost, hub.localhost on the lane's ports of
#    docs/o1/ports.tsv, as scripts/o1/dev-multi.sh does) with PASSPORT_JUMP on and run-only secrets generated here
#    (PASSPORT_TICKET_SECRET, NET_IP_HASH_SALT: exported to the servers, never written to disk or git, never printed),
#    waits until they answer, then runs playwright.o1.config.ts for the leak suite, dev-multi/cookies and the C3 specs,
#    and B3/jump in a run of its own. Every server is stopped on exit, success or not.
#    B3/jump creates its own user and profile with the service role of o1-dev, which the lane rule forbids (dev is
#    written only through the app with the fixture accounts): it skips ("needs SUPABASE_SERVICE_ROLE_KEY") unless
#    --with-jump (or O1_C3_JUMP=1). The C3 passport spec covers the same jump with a fixture account.
#    --hold starts the servers and waits (Ctrl-C stops them) so a person can look at them; no suite runs.
# 3. Writes docs/o1/reports/C3/e2e-dev.md: date, commit, per spec pass, fail or skip with its reason. No secret.
# Exit: 0 no test failed (skips allowed), 1 a test failed, 2 usage, 3 a build or a server did not come up.
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
HERE="$(cd "$(dirname "$0")" && pwd)"
die() { echo "run-dev: $1" >&2; exit "${2:-2}"; }

ports=""; rebuild=0; skipbuild=0; nomerge=0; hold=0; withjump="${O1_C3_JUMP:-0}"
while [ $# -gt 0 ]; do
  case "$1" in
    --ports) ports="${2:?}"; shift ;;
    --rebuild) rebuild=1 ;;
    --skip-build) skipbuild=1 ;;
    --no-merge) nomerge=1 ;;
    --with-jump) withjump=1 ;;
    --hold) hold=1 ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) die "unknown argument $1" ;;
  esac
  shift
done

WT="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null)" || die "not in a git worktree"
APP="$WT/apps/quiz"
[ "$WT" = "$ROOT" ] && die "refused: the main checkout; run it from a lane worktree"
[ -d "$APP/src" ] || die "no apps/quiz/src in $WT"
ENVSH="$O1/scripts/o1/env.sh"; [ -x "$ENVSH" ] || ENVSH="$WT/scripts/o1/env.sh"
LOCK="$O1/scripts/o1/build-lock.sh"; [ -x "$LOCK" ] || LOCK="$WT/scripts/o1/build-lock.sh"
[ -x "$ENVSH" ] && [ -x "$LOCK" ] || die "scripts/o1/env.sh or build-lock.sh not found"
NM="$APP/node_modules"
[ -x "$NM/.bin/next" ] && [ -x "$NM/.bin/playwright" ] || die "no next or playwright in $NM/.bin"

# 0. Up to date with o1/integration (fast-forward only; a worktree that cannot is tested as it is).
cur="$(git -C "$WT" rev-parse --abbrev-ref HEAD)"
if [ "$nomerge" = 0 ] && [ "$cur" != "o1/integration" ] && git -C "$WT" rev-parse --verify -q o1/integration >/dev/null; then
  if git -C "$WT" merge --ff-only o1/integration >/dev/null 2>&1; then :; else echo "run-dev: no fast-forward to o1/integration, testing $cur as it is"; fi
fi
HEAD_SHA="$(git -C "$WT" rev-parse --short=12 HEAD)"
INT_SHA="$(git -C "$WT" rev-parse --short=12 o1/integration 2>/dev/null || echo none)"

if [ -z "$ports" ]; then
  lane="${cur#o1/}"
  ports="$(awk -F'\t' -v l="$lane" '$1 == l { print $2 "," $3 "," $4 }' "$O1/docs/o1/ports.tsv" 2>/dev/null)"
  [ -n "$ports" ] || die "no ports for lane '$lane' in docs/o1/ports.tsv (use --ports p1,p2,p3)"
fi
P1="$(echo "$ports" | cut -d, -f1)"; P2="$(echo "$ports" | cut -d, -f2)"; P3="$(echo "$ports" | cut -d, -f3)"
for p in "$P1" "$P2" "$P3"; do
  case "$p" in ''|*[!0-9]*) die "bad port '$p'" ;; esac
  lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 && die "port $p is busy"
done
port_of() { case "$1" in kpop) echo "$P1" ;; anime) echo "$P2" ;; hub) echo "$P3" ;; esac; }
NET_ORIGINS="kpop=http://kpop.localhost:$P1,anime=http://anime.localhost:$P2,hub=http://hub.localhost:$P3"

LOGS="$WT/.next/c3-logs"; OUT="$APP/test-results/o1-c3"
mkdir -p "$LOGS" "$OUT"; rm -f "$OUT"/*.json

PIDS=()
kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill "$1" 2>/dev/null; }
stop_all() {
  local p; for p in ${PIDS[@]+"${PIDS[@]}"}; do kill_tree "$p"; done
  PIDS=()
  rm -rf "$WT/.next/c3-serve-kpop" "$WT/.next/c3-serve-anime" "$WT/.next/c3-serve-hub"
}
trap 'stop_all; exit 130' INT TERM
trap stop_all EXIT

# 1. Builds.
BPATHS="apps/quiz/src apps/quiz/public packages apps/quiz/next.config.ts apps/quiz/package.json apps/quiz/tsconfig.json apps/quiz/tailwind.config.ts apps/quiz/postcss.config.js"
tree_key() { git -C "$WT" ls-tree HEAD $BPATHS 2>/dev/null | awk '{print $3}' | tr '\n' ' '; }
dirty() { [ -n "$(git -C "$WT" status --porcelain --untracked-files=no -- $BPATHS 2>/dev/null)" ]; }
STAMP="$(printf '%s|%s' "$(tree_key)" "$NET_ORIGINS" | shasum | cut -c1-40)"
have_build() { [ -f "$APP/.next-$1/BUILD_ID" ] && [ "$(cat "$APP/.next-$1/.c3-stamp" 2>/dev/null)" = "$STAMP-$1" ] && ! dirty; }
for s in kpop anime hub; do
  if [ "$rebuild" = 0 ] && have_build "$s"; then echo "run-dev: build $s reused (same sources and ports)"; continue; fi
  [ "$skipbuild" = 1 ] && die "--skip-build: no current build of $s" 3
  echo "run-dev: building $s against o1-dev (log .next/c3-logs/build-$s.log)"
  "$LOCK" run "c3-$s" -- "$ENVSH" dev -- bash -c '
    cd "$1" && rm -rf .next && NEXT_PUBLIC_SITE_ID="$2" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_NET_ORIGINS="$3" npm run build \
      && rm -rf ".next-$2" && mv .next ".next-$2"' _ "$APP" "$s" "$NET_ORIGINS" > "$LOGS/build-$s.log" 2>&1
  [ -f "$APP/.next-$s/BUILD_ID" ] || { grep -i -m5 'error' "$LOGS/build-$s.log" | cut -c1-200; die "build of $s failed (.next/c3-logs/build-$s.log)" 3; }
  printf '%s-%s' "$STAMP" "$s" > "$APP/.next-$s/.c3-stamp"
done

# 2. Servers. The secrets live in this process's environment only.
export PASSPORT_TICKET_SECRET; PASSPORT_TICKET_SECRET="$(openssl rand -hex 24)"
export NET_IP_HASH_SALT; NET_IP_HASH_SALT="$(openssl rand -hex 24)"
for s in kpop anime hub; do
  p="$(port_of "$s")"; root="$WT/.next/c3-serve-$s"
  rm -rf "$root"; mkdir -p "$root"; [ -f "$LOGS/$s.log" ] && mv -f "$LOGS/$s.log" "$LOGS/$s.prev.log"
  for e in "$APP"/*; do case "$(basename "$e")" in .next|.next-*|test-results) continue ;; esac; ln -s "$e" "$root/$(basename "$e")"; done
  ln -s "$APP/.next-$s" "$root/.next"
  ( cd "$root" && exec "$ENVSH" dev -- env NEXT_PUBLIC_SITE_ID="$s" SITE_ID="$s" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 \
      NEXT_PUBLIC_NET_ORIGINS="$NET_ORIGINS" SITE_SCOPE=1 PASSPORT_JUMP=1 NODE_OPTIONS="--max-http-header-size=32768" \
      ./node_modules/.bin/next start -p "$p" -H 127.0.0.1 ) < /dev/null > "$LOGS/$s.log" 2>&1 &
  PIDS+=("$!")
  echo "run-dev: $s on http://$s.localhost:$p (db dev, build .next-$s, log .next/c3-logs/$s.log)"
done
i=0; for s in kpop anime hub; do
  p="$(port_of "$s")"; pid="${PIDS[$i]}"; i=$((i + 1)); n=0
  until [ "$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "http://127.0.0.1:$p/robots.txt" 2>/dev/null)" != 000 ]; do
    kill -0 "$pid" 2>/dev/null || die "$s stopped (.next/c3-logs/$s.log)" 3
    n=$((n + 1)); [ "$n" -lt 180 ] || die "$s did not answer in 3 minutes" 3
    sleep 1
  done
done
for s in kpop anime hub; do
  p="$(port_of "$s")"
  echo "run-dev: warm-up $s / $(curl -s -o /dev/null --max-time 300 -w '%{http_code}' "http://127.0.0.1:$p/")"
done

if [ "$hold" = 1 ]; then echo "run-dev: holding; Ctrl-C stops the servers"; while true; do sleep 5 & wait $!; done; fi

# 3. The suites. Run through env.sh dev: the specs read the Supabase settings of o1-dev (anon key for the fixtures'
#    sessions, service role only to mint a one-time sign-in link for a fixture account, no email), never print them.
URLS=(O1_KPOP_URL="http://kpop.localhost:$P1" O1_ANIME_URL="http://anime.localhost:$P2" O1_HUB_URL="http://hub.localhost:$P3"
      O1_LEAK_KPOP_URL="http://kpop.localhost:$P1" O1_LEAK_ANIME_URL="http://anime.localhost:$P2" O1_LEAK_HUB_URL="http://hub.localhost:$P3"
      O1_LEAK_ANIME_NEXT="$APP/.next-anime" O1_LEAK_HUB_NEXT="$APP/.next-hub" O1_LEAK_REQUIRE="anime,hub"
      O1_NET_ORIGINS="$NET_ORIGINS" O1_ENV=dev O1_SITE_SCOPE=1)
pw() { # name, extra env assignment, then playwright arguments
  local name="$1" extra="$2"; shift 2
  ( cd "$APP" && "$ENVSH" dev -- env ${URLS[@]} ${extra:+"$extra"} O1_PW_OUT="$OUT/pw-$name" O1_PW_REPORT="$OUT/$name.json" \
      ./node_modules/.bin/playwright test -c playwright.o1.config.ts "$@" ) 2>&1 | grep -v '^$' | cut -c1-240
  return "${PIPESTATUS[0]}"
}
rc=0
echo "run-dev: playwright leak, dev-multi, C3"
pw main "" --project=leak --project=dev-multi --project=lanes e2e/o1/leak e2e/o1/dev-multi e2e/o1/C3 || rc=1
echo "run-dev: playwright B3/jump ($([ "$withjump" = 1 ] && echo 'with the service role: creates its own user on o1-dev' || echo 'skipped without the service role'))"
if [ "$withjump" = 1 ]; then pw jump "" --project=lanes e2e/o1/B3/jump || rc=1
else pw jump "SUPABASE_SERVICE_ROLE_KEY=" --project=lanes e2e/o1/B3/jump || rc=1; fi

# 4. The report and the end of the servers.
stop_all
node "$HERE/report.mjs" --out "$WT/docs/o1/reports/C3/e2e-dev.md" --head "$HEAD_SHA" --integration "$INT_SHA" \
  --dirty "$(dirty && echo 1 || echo 0)" --ports "$ports" --with-jump "$withjump" "$OUT/main.json" "$OUT/jump.json" || rc=1
echo "run-dev: report docs/o1/reports/C3/e2e-dev.md (exit $rc)"
exit "$rc"
