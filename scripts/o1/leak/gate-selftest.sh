#!/bin/bash
# Run O1, lane Q0a: the self-test of scripts/o1/gate-checks.sh on the planted stand-ins (planted-server.mjs), given
# to it as servers (O1_GATE_URL_<SITE>), with this checkout as the worktree. For every scenario the set of failing
# checks in checks.tsv must equal the expected set exactly, and the exit code must say failure exactly when that set
# is not empty. No build, no database, no production read: the stand-ins are the only servers.
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
printf '{ "Q0a": { "sites": ["kpop", "anime", "hub"], "specs": ["Q0a/no-such-spec.o1.ts"] } }\n' > "$out/lanes-missing.json"
printf '{ "Q0a": { "sites": ["kpop", "anime", "hub"] } }\n' > "$out/lanes-none.json"
K="O1_GATE_URL_KPOP=http://127.0.0.1:$P_KPOP"; A="O1_GATE_URL_ANIME=http://127.0.0.1:$P_ANIME"; H="O1_GATE_URL_HUB=http://127.0.0.1:$P_HUB"
SEO="kpop-indexability kpop-metadata-dupes kpop-orphans kpop-sitemap-hygiene"

# name | plant | env for gate-checks.sh | expected failing checks (space separated)
scenarios=(
  "clean|none|$K $A $H|"
  "link-kpop|link-kpop|$K $A $H|network-links leak"
  "string-anime|string-anime|$K $A $H|leak"
  "netme-hub|netme|$K $A $H|leak"
  "kpop-production-source|none|$K $A $H O1_GATE_KPOP_SOURCE=parity|$SEO"
  "lane-spec-missing|none|$K $A $H O1_LANES_JSON=$out/lanes-missing.json|lane-specs"
  "no-hub-server|none|$K $A|hub-metadata-dupes"
)

SRV=""
stop_srv() { [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; SRV=""; }
trap stop_srv EXIT INT TERM
: > "$out/gate-selftest.txt"
bad=0
for sc in "${scenarios[@]}"; do
  name="${sc%%|*}"; rest="${sc#*|}"
  plant="${rest%%|*}"; rest="${rest#*|}"
  envs="${rest%%|*}"; want="${rest#*|}"
  node "$HERE/planted-server.mjs" --ports "$ports" --plant "$plant" > "$out/$name.server.log" 2>&1 &
  SRV=$!
  for i in $(seq 1 50); do curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$P_HUB/robots.txt" && break; sleep 0.1; done
  # shellcheck disable=SC2086
  env -u O1_GATE_URL_KPOP -u O1_GATE_URL_ANIME -u O1_GATE_URL_HUB -u O1_GATE_KPOP_SOURCE -u O1_GATE_KEPT_OFFLINE \
    O1_LANES_JSON="$out/lanes-none.json" O1_GATE_DBENV=offline $envs \
    bash "$REPO/scripts/o1/gate-checks.sh" Q0a "$REPO" "$out/$name" "kpop anime hub" > "$out/$name.log" 2>&1
  rc=$?
  stop_srv
  tsv="$out/$name/checks/checks.tsv"
  if [ ! -s "$tsv" ]; then echo "FAIL $name: no checks.tsv (see $out/$name.log)" >> "$out/gate-selftest.txt"; bad=1; continue; fi
  got="$(awk -F'\t' '$2!="0" && $2!="skipped" && $2!="pending" {print $1}' "$tsv" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"
  exp="$(printf '%s\n' $want | grep -v '^$' | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"
  wantrc=0; [ -n "$exp" ] && wantrc=1
  logs="$(awk -F'\t' '{print $1}' "$tsv" | while read -r n; do [ -s "$out/$name/checks/$n.log" ] || echo "$n"; done | tr '\n' ' ')"
  if [ "$got" = "$exp" ] && [ "$rc" = "$wantrc" ] && [ -z "$logs" ]; then
    echo "ok   $name (plant $plant): exit $rc, failing [${got}], $(wc -l < "$tsv" | tr -d ' ') checks, one log each" >> "$out/gate-selftest.txt"
  else
    bad=1; echo "FAIL $name (plant $plant): exit $rc want $wantrc, failing [${got}] want [${exp}]${logs:+, no log: $logs}" >> "$out/gate-selftest.txt"
  fi
done
if [ $bad = 0 ]; then echo "VERDICT: gate-checks.sh fails exactly on the planted failures and writes one log per check" >> "$out/gate-selftest.txt"
else echo "VERDICT: MISMATCH" >> "$out/gate-selftest.txt"; fi
cat "$out/gate-selftest.txt"
echo "gate-selftest output: $out"
exit $bad
