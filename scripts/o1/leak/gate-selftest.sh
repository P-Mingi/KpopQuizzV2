#!/bin/bash
# Run O1, lane Q0a: the self-test of scripts/o1/gate-checks.sh on the planted stand-ins (planted-server.mjs), given
# to it as servers (O1_GATE_URL_<SITE>), with this checkout as the worktree. For every scenario the set of failing
# checks and the set of pending checks in checks.tsv must each equal the expected set exactly, and the exit code must
# say failure exactly when the failing set is not empty; a scenario may also name lines its check logs must hold. No
# build, no database, no production read: the stand-ins are the only servers, KPQ is an empty folder of the output (no
# kept build, no env file), the ports are the lane's.
# Setups (space separated, applied in order): parity-ran (a parity.json in the evidence folder, no kept build: today's
# gate on a diff that reaches kpop); hub-down (a stand-in worktree whose only build, .next-hub, cannot start: a planned
# server that never answers); spec (a stand-in worktree holding the head's playwright.o1.config.ts, the installed
# node_modules and one lane spec, e2e/o1/Q0a/home.o1.ts, listed in lanes.json: each site given answers its home page,
# a site with no URL skips); hub-build (after spec: adds a .next-hub that cannot start).
#   scripts/o1/leak/gate-selftest.sh [--ports 3106,3107,3108] [--out <dir>]
# Output: <out>/gate-selftest.txt (one line per scenario, then the verdict; deterministic), <out>/<scenario>/ (the
# evidence folder gate-checks.sh wrote). Exit 0 = every scenario as expected, 1 = a mismatch, 2 = bad setup.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
ports="3106,3107,3108"; out=""
while [ $# -gt 0 ]; do
  case "$1" in
    --ports) ports="$2"; shift 2 ;;
    --out) out="$2"; shift 2 ;;
    *) echo "gate-selftest: unknown option $1" >&2; exit 2 ;;
  esac
done
[ -n "$out" ] || out="$(mktemp -d "${TMPDIR:-/tmp}/o1-gate-selftest.XXXXXX")"
mkdir -p "$out"
IFS=, read -r P_KPOP P_ANIME P_HUB <<< "$ports"
for p in "$P_KPOP" "$P_ANIME" "$P_HUB"; do
  if curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$p/"; then echo "gate-selftest: port $p is busy" >&2; exit 2; fi
done
for s in kpop anime hub; do
  [ -e "$REPO/apps/quiz/.next-$s" ] && { echo "gate-selftest: $REPO/apps/quiz/.next-$s exists: run it on a checkout with no site build" >&2; exit 2; }
done
mkdir -p "$out/kpq"
printf '{ "Q0a": { "sites": ["kpop", "anime", "hub"], "specs": ["Q0a/no-such-spec.o1.ts"] } }\n' > "$out/lanes-missing.json"
printf '{ "Q0a": { "sites": ["kpop", "anime", "hub"] } }\n' > "$out/lanes-none.json"
printf '{ "Q0a": { "sites": ["kpop", "anime", "hub"], "specs": ["Q0a/home.o1.ts"] } }\n' > "$out/lanes-spec.json"
K="O1_GATE_URL_KPOP=http://127.0.0.1:$P_KPOP"; A="O1_GATE_URL_ANIME=http://127.0.0.1:$P_ANIME"; H="O1_GATE_URL_HUB=http://127.0.0.1:$P_HUB"
SEO="kpop-indexability kpop-metadata-dupes kpop-orphans kpop-sitemap-hygiene"


# name | plant | env for gate-checks.sh | expected failing checks | expected pending checks | setup (space separated) |
# log lines (check~extended regex, '@@' separated: checks/<check>.log must match each)
scenarios=(
  "clean|none|$K $A $H|||"
  "link-kpop|link-kpop|$K $A $H|network-links leak||"
  "string-anime|string-anime|$K $A $H|leak||"
  "netme-hub|netme|$K $A $H|leak||"
  "kpop-production-source|none|$K $A $H O1_GATE_KPOP_SOURCE=parity|$SEO||"
  "lane-spec-missing|none|$K $A $H O1_LANES_JSON=$out/lanes-missing.json|lane-specs||"
  "no-hub-server|none|$K $A|hub-metadata-dupes hub-leak hub-network-links||"
  "no-kpop-server-parity-ran|none|$A $H||$SEO kpop-leak kpop-network-links|parity-ran"
  "hub-server-down|none|$K $A|network-links leak||hub-down"
  "lane-spec-present|none|$K $A $H O1_LANES_JSON=$out/lanes-spec.json|||spec|lane-specs~^sites read: kpop anime hub\$@@lane-specs~ 3 passed"
  "lane-spec-server-down|none|$K $A O1_LANES_JSON=$out/lanes-spec.json|network-links leak lane-specs||spec hub-build|lane-specs~^sites read: kpop anime; planned but not started: hub\$@@lane-specs~ 2 passed@@lane-specs~^FAILED: not read, the server did not start: hub"
  "lane-spec-no-kpop-parity-ran|none|$A $H O1_LANES_JSON=$out/lanes-spec.json||$SEO kpop-leak kpop-network-links kpop-lane-specs|spec parity-ran|lane-specs~^sites read: anime hub\$@@lane-specs~ 2 passed@@kpop-lane-specs~^the kpop half of the lane specs did not run: .*request Q0a 2"
)

# A stand-in worktree: a git commit and apps/quiz/.next-hub/BUILD_ID, nothing else (no node_modules), so gate-checks.sh
# plans a hub server from that build and its `next start` exits at once.
fake_wt() {
  local d="$out/fakewt"; rm -rf "$d"; mkdir -p "$d/apps/quiz/.next-hub" || return 1
  echo gate-selftest > "$d/apps/quiz/.next-hub/BUILD_ID"
  git -C "$d" init -q && git -C "$d" -c user.name=gate-selftest -c user.email=gate-selftest@localhost -c core.hooksPath=/dev/null \
    -c commit.gpgsign=false commit -q --allow-empty -m "gate-selftest stand-in worktree" || return 1
}
# The lane spec stand-in: a git commit, the head's Playwright config, the installed node_modules, one spec (no build).
spec_wt() {
  local d="$out/specwt"; rm -rf "$d"; mkdir -p "$d/apps/quiz/e2e/o1/Q0a" || return 1
  cp "$REPO/apps/quiz/playwright.o1.config.ts" "$d/apps/quiz/" || return 1
  ln -s "$(cd "$REPO/apps/quiz/node_modules" && pwd -P)" "$d/apps/quiz/node_modules" || return 1
  cat > "$d/apps/quiz/e2e/o1/Q0a/home.o1.ts" <<'SPEC'
// gate-selftest stand-in lane spec: each site given to the lane specs answers its home page; a site with no URL skips.
import { expect, test } from '@playwright/test';

for (const site of ['kpop', 'anime', 'hub']) {
  test(`gate-selftest lane spec: the ${site} home answers`, async ({ request }) => {
    const url = process.env[`O1_${site.toUpperCase()}_URL`];
    test.skip(!url, `no ${site} URL given`);
    expect((await request.get(`${url}/`)).status()).toBe(200);
  });
}
SPEC
  git -C "$d" init -q && git -C "$d" -c user.name=gate-selftest -c user.email=gate-selftest@localhost -c core.hooksPath=/dev/null \
    -c commit.gpgsign=false commit -q --allow-empty -m "gate-selftest lane spec stand-in worktree" || return 1
}
setup_one() { # word; sets wt, sports, extra of the scenario
  case "$1" in
    parity-ran) echo '{ "stand-in": "gate-selftest: parity ran without --keep" }' > "$out/$name/parity.json" ;;
    hub-down) fake_wt || return 1; wt="$out/fakewt"; sports="$P_KPOP,$P_ANIME,0"; extra="O1_GATE_BASE=$(git -C "$wt" rev-parse HEAD)" ;;
    spec) spec_wt || return 1; wt="$out/specwt"; extra="O1_GATE_BASE=$(git -C "$wt" rev-parse HEAD)" ;;
    hub-build) [ "$wt" = "$out/specwt" ] || return 1
               mkdir -p "$wt/apps/quiz/.next-hub" && echo gate-selftest > "$wt/apps/quiz/.next-hub/BUILD_ID" || return 1
               sports="$P_KPOP,$P_ANIME,0" ;;
    *) return 1 ;;
  esac
}
sorted() { printf '%s\n' "$@" | grep -v '^$' | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//'; }

SRV=""
stop_srv() { [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; SRV=""; }
trap stop_srv EXIT INT TERM
: > "$out/gate-selftest.txt"
bad=0
for sc in "${scenarios[@]}"; do
  IFS='|' read -r name plant envs want wantp setup lines <<< "$sc"
  wt="$REPO"; sports="$ports"; extra=""; setok=1
  rm -rf "${out:?}/$name"; mkdir -p "$out/$name"
  for w in $setup; do setup_one "$w" || { setok=0; break; }; done
  if [ $setok = 0 ]; then echo "FAIL $name: setup $setup could not be made" >> "$out/gate-selftest.txt"; bad=1; continue; fi
  node "$HERE/planted-server.mjs" --ports "$sports" --plant "$plant" > "$out/$name.server.log" 2>&1 &
  SRV=$!
  for i in $(seq 1 50); do grep -q '^planted-server:' "$out/$name.server.log" 2>/dev/null && break; sleep 0.1; done
  # shellcheck disable=SC2086
  env -u O1_GATE_URL_KPOP -u O1_GATE_URL_ANIME -u O1_GATE_URL_HUB -u O1_GATE_KPOP_SOURCE -u O1_GATE_KEPT_OFFLINE -u O1_GATE_BASE \
    O1_LANES_JSON="$out/lanes-none.json" O1_GATE_DBENV=offline O1_KPQ="$out/kpq" O1_GATE_PORTS="$P_KPOP $P_ANIME $P_HUB" $envs $extra \
    bash "$REPO/scripts/o1/gate-checks.sh" Q0a "$wt" "$out/$name" "kpop anime hub" > "$out/$name.log" 2>&1
  rc=$?
  stop_srv
  tsv="$out/$name/checks/checks.tsv"
  if [ ! -s "$tsv" ]; then echo "FAIL $name: no checks.tsv (see $out/$name.log)" >> "$out/gate-selftest.txt"; bad=1; continue; fi
  got="$(sorted $(awk -F'\t' '$2!="0" && $2!="skipped" && $2!="pending" {print $1}' "$tsv"))"
  gotp="$(sorted $(awk -F'\t' '$2=="pending" {print $1}' "$tsv"))"
  exp="$(sorted $want)"; expp="$(sorted $wantp)"
  wantrc=0; [ -n "$exp" ] && wantrc=1
  logs="$(awk -F'\t' '{print $1}' "$tsv" | while read -r n; do [ -s "$out/$name/checks/$n.log" ] || echo "$n"; done | tr '\n' ' ')"
  miss=""
  rest="$lines"
  while [ -n "$rest" ]; do
    lc="${rest%%@@*}"; if [ "$lc" = "$rest" ]; then rest=""; else rest="${rest#*@@}"; fi
    grep -Eq -- "${lc#*~}" "$out/$name/checks/${lc%%~*}.log" 2>/dev/null || miss="$miss [${lc%%~*}: ${lc#*~}]"
  done
  if [ "$got" = "$exp" ] && [ "$gotp" = "$expp" ] && [ "$rc" = "$wantrc" ] && [ -z "$logs" ] && [ -z "$miss" ]; then
    echo "ok   $name (plant $plant${setup:+, $setup}): exit $rc, failing [${got}], pending [${gotp}], $(wc -l < "$tsv" | tr -d ' ') checks, one log each" >> "$out/gate-selftest.txt"
  else
    bad=1; echo "FAIL $name (plant $plant${setup:+, $setup}): exit $rc want $wantrc, failing [${got}] want [${exp}], pending [${gotp}] want [${expp}]${logs:+, no log: $logs}${miss:+, log lines missing:$miss}" >> "$out/gate-selftest.txt"
  fi
done
if [ $bad = 0 ]; then echo "VERDICT: gate-checks.sh fails exactly on the planted failures and writes one log per check" >> "$out/gate-selftest.txt"
else echo "VERDICT: MISMATCH" >> "$out/gate-selftest.txt"; fi
cat "$out/gate-selftest.txt"
echo "gate-selftest output: $out"
exit $bad
