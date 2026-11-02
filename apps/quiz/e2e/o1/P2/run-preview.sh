#!/bin/bash
# Run O1, lot P2 (CR-024): the whole preview in one foreground command. It starts the stand-in database (serve-preview.run.ts) and the hub in development with dailyGuess on, plays the pages
# (capture.run.mjs) into docs/proofs/series-games-pages/, then stops the two servers it started (by their pids and by the port, never a machine-wide kill).
# dailyGuess is false in the registry until the launch: this script needs it on, so the owner's switch is turned on in the working tree for the run only (RESTORE=1 puts the line back).
#   apps/quiz/e2e/o1/P2/run-preview.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; Q="$(cd "$HERE/../../.." && pwd)"; cd "$Q"
API=54399; WEB=3040
LOG="${P2_LOG:-$Q/.next/p2-preview}"; mkdir -p "$LOG"
REG="$Q/src/lib/site/registry.ts"
ON="const HUB_FEATURES: SiteFeatures = { ...ALL_OFF, passportPages: true, directory: false, dailyGuess: true };"
OFF="const HUB_FEATURES: SiteFeatures = { ...ALL_OFF, passportPages: true, directory: false, dailyGuess: false };"
restore() { [ -n "${WEB_PID:-}" ] && kill "$WEB_PID" 2>/dev/null; [ -n "${API_PID:-}" ] && kill "$API_PID" 2>/dev/null
  for p in $WEB $API; do for pid in $(lsof -ti :$p 2>/dev/null); do kill "$pid" 2>/dev/null; done; done
  python3 - "$REG" "$ON" "$OFF" <<'PY'
import sys
p, on, off = sys.argv[1:4]
s = open(p).read()
open(p, 'w').write(s.replace(on, off))
PY
}
trap restore EXIT
python3 - "$REG" "$ON" "$OFF" <<'PY'
import sys
p, on, off = sys.argv[1:4]
s = open(p).read()
assert off in s, 'registry line not found'
open(p, 'w').write(s.replace(off, on))
PY
npx tsx e2e/o1/P2/serve-preview.run.ts $API > "$LOG/api.log" 2>&1 & API_PID=$!
for i in $(seq 1 120); do curl -s "localhost:$API/__target?game=otakudle" >/dev/null 2>&1 && break; sleep 2; done
echo "stand-in ready"
NEXT_PUBLIC_SITE_ID=hub SITE_ID=hub NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_TELEMETRY_DISABLED=1 \
  NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:$API" NEXT_PUBLIC_SUPABASE_ANON_KEY=p2-preview-anon SUPABASE_SERVICE_ROLE_KEY=p2-preview-service \
  ./node_modules/.bin/next dev -p $WEB > "$LOG/web.log" 2>&1 & WEB_PID=$!
for i in $(seq 1 150); do curl -s -o /dev/null "localhost:$WEB/" && break; sleep 2; done
for p in /otakudle /fr/otakudle /otakudle/one-piece /fr/otakudle/one-piece /otakudle/dragon-ball /fr/otakudle/dragon-ball; do
  echo "warm $p: $(curl -s -o /dev/null -w '%{http_code}' --max-time 240 "localhost:$WEB$p")"
done
BASE="http://localhost:$WEB" API="http://127.0.0.1:$API" OUT="$Q/../../docs/proofs/series-games-pages" node e2e/o1/P2/capture.run.mjs
echo "capture exit: $?"
