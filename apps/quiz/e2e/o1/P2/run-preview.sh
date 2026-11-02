#!/bin/bash
# Run O1, lot P2 (CR-024) and lot P5 (CR-025): the whole preview in one foreground command. It starts the stand-in database (serve-preview.run.ts) and one site in development with dailyGuess on,
# plays the pages, then stops what it started (by pids and by the port, never a machine-wide kill).
#   apps/quiz/e2e/o1/P2/run-preview.sh              the hub: /otakudle and the two series games, into docs/proofs/series-games-pages/ (P2, as ever)
#   apps/quiz/e2e/o1/P2/run-preview.sh p5           P5: the result of Kpopdle on the hub, then kpopquiz.org, then OtakuQuiz, with every link flag on, into docs/proofs/passerelles/
#   apps/quiz/e2e/o1/P2/run-preview.sh probe SITE   the status of a few pages of SITE (hub, kpop or anime), for the work on the stand-in
# dailyGuess is false in the registry until the launch: this script needs it on, so the owner's switch is turned on in the working tree for the run only and the line is put back when the run ends
# (a trap, also on an error or an interrupt). The server flags of kpopquiz.org (NET_KPOPDLE_*) are environment of the dev server it starts: nothing is written for them.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; Q="$(cd "$HERE/../../.." && pwd)"; cd "$Q"
MODE="${1:-hub}"; PSITE="${2:-hub}"
API=54399
PORT_HUB=3040; PORT_KPOP=3041; PORT_ANIME=3042
LOG="${P2_LOG:-$Q/.next/p2-preview}"
[ "$MODE" = "hub" ] || LOG="${P5_LOG:-${TMPDIR:-/tmp}/p5-preview}"
mkdir -p "$LOG"
REG="$Q/src/lib/site/registry.ts"
ON="const HUB_FEATURES: SiteFeatures = { ...ALL_OFF, passportPages: true, directory: false, dailyGuess: true };"
OFF="const HUB_FEATURES: SiteFeatures = { ...ALL_OFF, passportPages: true, directory: false, dailyGuess: false };"
stop_web() { [ -n "${WEB_PID:-}" ] && kill "$WEB_PID" 2>/dev/null; for p in $PORT_HUB $PORT_KPOP $PORT_ANIME; do for pid in $(lsof -ti :$p 2>/dev/null); do kill "$pid" 2>/dev/null; done; done; WEB_PID=""; sleep 1; }
restore() { stop_web; [ -n "${API_PID:-}" ] && kill "$API_PID" 2>/dev/null
  for pid in $(lsof -ti :$API 2>/dev/null); do kill "$pid" 2>/dev/null; done
  python3 - "$REG" "$ON" "$OFF" <<'PY'
import sys
p, on, off = sys.argv[1:4]
s = open(p).read()
open(p, 'w').write(s.replace(on, off))
PY
}
trap restore EXIT
# P5_NOFLIP=1 leaves dailyGuess as committed (false): the proof that, with the switches off, the pages carry none of the links.
if [ -z "${P5_NOFLIP:-}" ]; then python3 - "$REG" "$ON" "$OFF" <<'PY'
import sys
p, on, off = sys.argv[1:4]
s = open(p).read()
assert off in s, 'registry line not found'
open(p, 'w').write(s.replace(off, on))
PY
fi
P5_LOG_REQUESTS=${P5_LOG_REQUESTS:-} npx tsx e2e/o1/P2/serve-preview.run.ts $API > "$LOG/api.log" 2>&1 & API_PID=$!
for i in $(seq 1 120); do curl -s "localhost:$API/__target?game=otakudle" >/dev/null 2>&1 && break; sleep 2; done
echo "stand-in ready"
# serve SITE PORT [ENV=VALUE ...]: a fresh dev server of one site on the stand-in (the dev cache is dropped when the site changes, its env is inlined at build).
serve() {
  local site="$1" port="$2"; shift 2
  stop_web; rm -rf "$Q/.next/cache" "$Q/.next/server" "$Q/.next/static" "$Q/.next/types" "$Q/.next/dev" 2>/dev/null
  env NEXT_PUBLIC_SITE_ID=$site SITE_ID=$site NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:$API" NEXT_PUBLIC_SUPABASE_ANON_KEY=p2-preview-anon SUPABASE_SERVICE_ROLE_KEY=p2-preview-service "$@" \
    ./node_modules/.bin/next dev -p $port > "$LOG/web-$site.log" 2>&1 & WEB_PID=$!
  for i in $(seq 1 150); do curl -s -o /dev/null "localhost:$port/" && break; sleep 2; done
}
case "$MODE" in
  hub)
    serve hub $PORT_HUB
    for p in /otakudle /fr/otakudle /otakudle/one-piece /fr/otakudle/one-piece /otakudle/dragon-ball /fr/otakudle/dragon-ball; do
      echo "warm $p: $(curl -s -o /dev/null -w '%{http_code}' --max-time 240 "localhost:$PORT_HUB$p")"
    done
    BASE="http://localhost:$PORT_HUB" API="http://127.0.0.1:$API" OUT="$Q/../../docs/proofs/series-games-pages" node e2e/o1/P2/capture.run.mjs
    echo "capture exit: $?" ;;
  probe)
    case "$PSITE" in
      hub) serve hub $PORT_HUB; PORT=$PORT_HUB; BP=""; PAGES="/ /daily /kpopdle /fr/kpopdle /otakudle" ;;
      kpop-off) serve kpop $PORT_KPOP; PORT=$PORT_KPOP; BP=""; PAGES="/ /twice-quiz /q/twice-quiz-1" ;;
      kpop) serve kpop $PORT_KPOP NET_KPOPDLE_HOME=1 NET_KPOPDLE_QUIZEND=1 NET_KPOPDLE_GROUP=1; PORT=$PORT_KPOP; BP=""; PAGES="/ /twice-quiz /q/twice-quiz-1" ;;
      anime) serve anime $PORT_ANIME; PORT=$PORT_ANIME; BP="/anime"; PAGES="${P5_PAGES:-/ /series /one-piece-quiz /one-piece-trivia /anime-mix-quiz /dragon-ball-quiz /q/one-piece-quiz-1}" ;;
    esac
    for p in $PAGES; do echo "probe $BP$p: link-markers=$(curl -s --max-time 300 "localhost:$PORT$BP$p" | grep -o 'p5-[a-z]*\|p1-kd-[a-z]*\|bunnyverse.org/\(kpopdle\|daily\|otakudle\)' | wc -l | tr -d ' ') $(curl -s -o "$LOG/probe.html" -w '%{http_code}' --max-time 300 "localhost:$PORT$BP$p")  bytes $(wc -c < "$LOG/probe.html")  bunnyverse links $(grep -o 'href="https://bunnyverse.org/[^"]*"' "$LOG/probe.html" | sort | uniq -c | tr '\n' ' ')"; done
    curl -s "localhost:$API/__seen"; echo ;;
  p5)
    # P5_SITES="hub kpop anime" (default): which of the three to play, for a rerun of one of them.
    for site in ${P5_SITES:-hub kpop anime}; do
      case "$site" in
        hub) serve hub $PORT_HUB
          for p in /kpopdle /fr/kpopdle; do echo "warm $p: $(curl -s -o /dev/null -w '%{http_code}' --max-time 240 "localhost:$PORT_HUB$p")"; done
          BASE_URL="http://localhost:$PORT_HUB" ;;
        kpop) serve kpop $PORT_KPOP NET_KPOPDLE_HOME=1 NET_KPOPDLE_QUIZEND=1 NET_KPOPDLE_GROUP=1; BASE_URL="http://localhost:$PORT_KPOP" ;;
        anime) serve anime $PORT_ANIME; BASE_URL="http://localhost:$PORT_ANIME/anime" ;;
      esac
      SITE=$site BASE="$BASE_URL" API="http://127.0.0.1:$API" OUT="$Q/../../docs/proofs/passerelles" node e2e/o1/P5/capture.run.mjs; echo "$site capture exit: $?"
    done ;;
esac
