#!/bin/bash
# Run O1, lane Q0a: the leak suite's self-test. Proves that each leak test fails on its planted leak and passes on
# clean pages: for every scenario below, scripts/o1/leak/planted-server.mjs serves the three sites with one planted
# leak (or none), the leak project of apps/quiz/playwright.o1.config.ts runs against it, and the set of failing tests
# must equal the scenario's expected set exactly (nothing more fails, nothing expected passes). The content leak
# scenarios set O1_ENV=dev and O1_SITE_SCOPE=1 in the test process only: the servers are the stand-ins, no database
# is involved anywhere in this script.
#   scripts/o1/leak/selftest.sh [--ports 3106,3107,3108] [--out <dir>]
# Output: <out>/selftest.txt (one line per scenario, then the verdict; deterministic: no time, no count of seconds),
# <out>/<scenario>.json (Playwright JSON report). Exit 0 = every scenario as expected, 1 = a mismatch, 2 = bad setup.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
APP="$REPO/apps/quiz"
ports="3106,3107,3108"; out=""
while [ $# -gt 0 ]; do
  case "$1" in
    --ports) ports="$2"; shift 2 ;;
    --out) out="$2"; shift 2 ;;
    *) echo "selftest: unknown option $1" >&2; exit 2 ;;
  esac
done
[ -n "$out" ] || out="$(mktemp -d "${TMPDIR:-/tmp}/o1-leak-selftest.XXXXXX")"
mkdir -p "$out/cases"
IFS=, read -r P_KPOP P_ANIME P_HUB <<< "$ports"
for p in "$P_KPOP" "$P_ANIME" "$P_HUB"; do
  if curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$p/"; then echo "selftest: port $p is busy" >&2; exit 2; fi
done
cat > "$out/cases/leak-cases.selftest.json" <<'JSON'
{ "spoilerJsonLd": [ { "site": "anime", "path": "/q/death-note-quiz-o1-fixture", "forbidden": ["L dies"], "note": "self-test case" } ] }
JSON

route() { echo "route leak: every kpop route answers 404 on $1"; }
ident() { echo "site identity: the $1 server serves $1"; }
link() { echo "link leak: cross-site links on $1 are on the allowlist (server HTML)"; }
linkh() { echo "link leak: cross-site links on $1 are on the allowlist (hydrated DOM)"; }
canon() { echo "canonical and OG: every $1 page names $1 only"; }
netme() { echo "no /api/n/me in the server HTML of 20 $1 pages"; }
S_ANIME="string leak: no K-pop string on anime pages (P2)"
S_KPOP="string leak: no anime string on kpop pages (P2 mirror)"
SPOIL="spoiler JSON-LD: anime /q/death-note-quiz-o1-fixture (cases)"
CONTENT="content leak: no anime fixture row on kpop lists, sitemap, search and llms.txt"
MIRROR="content leak mirror: no kpop row on anime lists, sitemap, search and llms.txt"
DEVENV="O1_ENV=dev O1_SITE_SCOPE=1"

# name | plant | extra env | expected failing titles (one per line)
scenarios=(
  "clean|none||"
  "clean-content|none|$DEVENV|"
  "unwired|unwired||"
  "unwired-required|unwired|O1_LEAK_REQUIRE=anime|$(route anime)
$(ident anime)
$S_ANIME
$(link anime)
$(linkh anime)
$(canon anime)
$(netme anime)
$SPOIL"
  "route-anime|route-anime||$(route anime)"
  "route-hub|route-hub||$(route hub)"
  "string-anime|string-anime||$S_ANIME"
  "string-anime-data|string-anime-data||$S_ANIME"
  "string-kpop|string-kpop||$S_KPOP"
  "link-kpop|link-kpop||$(link kpop)
$(linkh kpop)"
  "link-via|link-via||$(link anime)
$(linkh anime)"
  "link-nofollow|link-nofollow||$(link hub)
$(linkh hub)"
  "link-hydrated|link-hydrated||$(linkh kpop)"
  "canonical|canonical||$(canon anime)
$(link anime)
$(linkh anime)"
  "og-site-name|og-site-name||$(canon hub)"
  "sitemap|sitemap||$(canon anime)"
  "netme|netme||$(netme hub)"
  "spoiler|spoiler||$SPOIL"
  "content|content|$DEVENV|$CONTENT"
  "content-mirror|content-mirror|$DEVENV|$MIRROR"
)

SRV=""
stop_srv() { [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; SRV=""; }
trap stop_srv EXIT INT TERM

: > "$out/selftest.txt"
bad=0
for sc in "${scenarios[@]}"; do
  name="${sc%%|*}"; rest="${sc#*|}"
  plant="${rest%%|*}"; rest="${rest#*|}"
  extra="${rest%%|*}"; want="${rest#*|}"
  node "$HERE/planted-server.mjs" --ports "$ports" --plant "$plant" > "$out/$name.server.log" 2>&1 &
  SRV=$!
  for i in $(seq 1 50); do curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$P_HUB/robots.txt" && break; sleep 0.1; done
  (
    cd "$APP" || exit 2
    # shellcheck disable=SC2086
    env -u O1_ENV -u O1_SITE_SCOPE -u O1_LEAK_REQUIRE -u O1_LEAK_ANIME_NEXT -u O1_LEAK_HUB_NEXT \
      O1_LEAK_KPOP_URL="http://127.0.0.1:$P_KPOP" O1_LEAK_ANIME_URL="http://127.0.0.1:$P_ANIME" \
      O1_LEAK_HUB_URL="http://127.0.0.1:$P_HUB" O1_LEAK_CASES="$out/cases" O1_PW_REPORT="$out/$name.json" \
      O1_PW_OUT="$out/pw-$name" $extra ./node_modules/.bin/playwright test -c playwright.o1.config.ts --project leak
  ) > "$out/$name.log" 2>&1
  stop_srv
  if [ ! -s "$out/$name.json" ]; then
    echo "FAIL $name: no report (see $out/$name.log)" >> "$out/selftest.txt"; bad=1; continue
  fi
  got="$(jq -r '[.. | objects | select(has("specs")) | .specs[] | select(.tests[0].status == "unexpected") | .title] | sort | .[]' "$out/$name.json")"
  exp="$(printf '%s\n' "$want" | grep -v '^$' | LC_ALL=C sort)"
  got="$(printf '%s\n' "$got" | grep -v '^$' | LC_ALL=C sort)"
  passed="$(jq '[.. | objects | select(has("specs")) | .specs[] | select(.tests[0].status == "expected")] | length' "$out/$name.json")"
  skipped="$(jq '[.. | objects | select(has("specs")) | .specs[] | select(.tests[0].status == "skipped")] | length' "$out/$name.json")"
  nfail="$(printf '%s' "$got" | grep -c . || true)"
  if [ "$got" = "$exp" ]; then
    echo "ok   $name (plant $plant): $nfail failed as planted, $passed passed, $skipped skipped" >> "$out/selftest.txt"
  else
    bad=1
    {
      echo "FAIL $name (plant $plant)"
      diff <(printf '%s\n' "$exp") <(printf '%s\n' "$got") | sed 's/^</  expected to fail, did not:/; s/^>/  failed, not expected:/' | grep -E '^  '
    } >> "$out/selftest.txt"
  fi
done
# The command-line gate (check-network-links.mts) on the same stand-ins: clean exits 0, each link plant exits 1.
for sc in "none|0" "link-kpop|1" "link-via|1" "link-nofollow|1" "canonical|1"; do
  plant="${sc%%|*}"; want="${sc#*|}"
  node "$HERE/planted-server.mjs" --ports "$ports" --plant "$plant" > "$out/cli-$plant.server.log" 2>&1 &
  SRV=$!
  for i in $(seq 1 50); do curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$P_HUB/robots.txt" && break; sleep 0.1; done
  "$REPO/node_modules/.bin/tsx" "$APP/scripts/o1/check-network-links.mts" --site "kpop=http://127.0.0.1:$P_KPOP" \
    --site "anime=http://127.0.0.1:$P_ANIME" --site "hub=http://127.0.0.1:$P_HUB" --sitemap kpop=0 > "$out/cli-$plant.txt" 2>&1
  rc=$?
  stop_srv
  if [ "$rc" = "$want" ]; then echo "ok   cli check-network-links (plant $plant): exit $rc, $(tail -1 "$out/cli-$plant.txt")" >> "$out/selftest.txt"
  else bad=1; echo "FAIL cli check-network-links (plant $plant): exit $rc, want $want" >> "$out/selftest.txt"; fi
done
if [ $bad = 0 ]; then echo "VERDICT: every leak test fails on its planted leak and passes on the clean pages" >> "$out/selftest.txt"
else echo "VERDICT: MISMATCH" >> "$out/selftest.txt"; fi
cat "$out/selftest.txt"
echo "selftest output: $out"
exit $bad
