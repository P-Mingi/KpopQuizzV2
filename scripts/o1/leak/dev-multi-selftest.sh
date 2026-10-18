#!/bin/bash
# Run O1, lane Q0a: proof that the dev-multi cookie test (apps/quiz/e2e/o1/dev-multi/cookies.o1.ts) passes on three
# separate hosts and fails on a planted shared cookie, against the stand-in servers of planted-server.mjs (no Next,
# no database). Scenarios: none (expect pass), cookie-domain (anime sets a session cookie with Domain=localhost:
# expect the session test to fail). Ports: the lane's triple (default 3106,3107,3108; nothing else may hold them).
#   bash scripts/o1/leak/dev-multi-selftest.sh [p1,p2,p3]
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
APP="$REPO/apps/quiz"
PORTS="${1:-3106,3107,3108}"
IFS=, read -r P1 P2 P3 <<< "$PORTS"
for p in "$P1" "$P2" "$P3"; do lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 && { echo "dev-multi-selftest: port $p is busy" >&2; exit 2; }; done
OUT="$(mktemp -d "${TMPDIR:-/tmp}/o1-dm-selftest.XXXXXX")"
SPID=""
stop() { [ -n "$SPID" ] && kill "$SPID" 2>/dev/null; wait "$SPID" 2>/dev/null; SPID=""; }
trap 'stop; rm -rf "$OUT"' EXIT
fails=0
row() { printf '%-15s %-8s %-8s %s\n' "$1" "$2" "$3" "$4"; }
row scenario expected got detail
for plant in none cookie-domain; do
  node "$HERE/planted-server.mjs" --ports "$PORTS" --plant "$plant" > "$OUT/server-$plant.log" 2>&1 &
  SPID=$!
  for i in $(seq 1 50); do grep -q 'planted-server:' "$OUT/server-$plant.log" && break; sleep 0.2; done
  ( cd "$APP" && O1_KPOP_URL="http://kpop.localhost:$P1" O1_ANIME_URL="http://anime.localhost:$P2" O1_HUB_URL="http://hub.localhost:$P3" \
      O1_PW_OUT="$OUT/pw-$plant" O1_PW_REPORT="$OUT/$plant.json" \
      ./node_modules/.bin/playwright test -c playwright.o1.config.ts --project dev-multi ) > "$OUT/pw-$plant.log" 2>&1
  stop
  failed="$(jq -r '[.. | objects | select(has("specs")) | .specs[] | select(.ok == false) | .title] | join("; ")' "$OUT/$plant.json" 2>/dev/null)"
  passed="$(jq -r '[.. | objects | select(has("specs")) | .specs[] | select(.ok == true) | .tests[] | select(.status == "expected") | .projectName] | length' "$OUT/$plant.json" 2>/dev/null)"
  case "$plant" in
    none) want=pass; [ -z "$failed" ] && [ "${passed:-0}" -ge 1 ] && got=pass || got=fail ;;
    *) want=fail; [ -n "$failed" ] && got=fail || got=pass ;;
  esac
  [ "$want" = "$got" ] || { fails=$((fails + 1)); tail -40 "$OUT/pw-$plant.log"; }
  row "$plant" "$want" "$got" "${failed:-no failing test}"
done
[ "$fails" = 0 ] && echo "dev-multi-selftest: ok" || { echo "dev-multi-selftest: $fails scenario(s) not as expected"; exit 1; }
