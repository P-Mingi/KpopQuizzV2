#!/bin/bash
# Run O1, lane B7: the kpop deletion on o1-dev, in one command.
#   bash apps/quiz/e2e/o1/B7/run-dev.sh [--skip-build]
# Builds kpop (NEXT_PUBLIC_NET_DELETION=1) and the hub (it runs the cron route) from this worktree against o1-dev (scripts/o1/env.sh dev,
# origins of the lane's ports of docs/o1/ports.tsv), starts both with `next start`, a CRON_SECRET and a mail sink file made for the run
# (in memory and in the scratch folder only), runs e2e/o1/B7/kpop-deletion.o1.ts with playwright.o1.config.ts, and stops the servers.
# It writes docs/o1/reports/B7/kpop-deletion.md (numbers only). Exit: 0 all passed, 1 a test failed, 3 a build or a server did not come up.
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
HERE="$(cd "$(dirname "$0")" && pwd)"
WT="$(git -C "$HERE" rev-parse --show-toplevel)"
APP="$WT/apps/quiz"
ENVSH="$O1/scripts/o1/env.sh"; LOCK="$O1/scripts/o1/build-lock.sh"
skipbuild=0; [ "${1:-}" = "--skip-build" ] && skipbuild=1
lane="$(git -C "$WT" rev-parse --abbrev-ref HEAD)"; lane="${lane#o1/}"
ports="$(awk -F'\t' -v l="$lane" '$1 == l { print $2 "," $3 "," $4 }' "$O1/docs/o1/ports.tsv")"
[ -n "$ports" ] || { echo "run-dev: no ports for $lane" >&2; exit 2; }
PK="$(echo "$ports" | cut -d, -f1)"; PA="$(echo "$ports" | cut -d, -f2)"; PH="$(echo "$ports" | cut -d, -f3)"
for p in "$PK" "$PH"; do lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 && { echo "run-dev: port $p is busy" >&2; exit 3; }; done
ORIGINS="kpop=http://kpop.localhost:$PK,anime=http://anime.localhost:$PA,hub=http://hub.localhost:$PH"
LOGS="$WT/.next/b7-logs"; mkdir -p "$LOGS"
PIDS=()
kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill "$1" 2>/dev/null; }
stop_all() { local p; for p in ${PIDS[@]+"${PIDS[@]}"}; do kill_tree "$p"; done; PIDS=(); rm -rf "$WT/.next/b7-serve-kpop" "$WT/.next/b7-serve-hub"; }
trap 'stop_all; exit 130' INT TERM
trap stop_all EXIT

build() { # site, deletion flag
  local s="$1" del="$2"
  [ "$skipbuild" = 1 ] && [ -f "$APP/.next-b7-$s/BUILD_ID" ] && { echo "run-dev: build $s reused"; return 0; }
  echo "run-dev: building $s against o1-dev (log .next/b7-logs/build-$s.log)"
  "$LOCK" run "b7-$s" -- "$ENVSH" dev -- bash -c '
    cd "$1" && rm -rf .next && NEXT_PUBLIC_SITE_ID="$2" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_NET_DELETION="$4" NEXT_PUBLIC_NET_ORIGINS="$3" npm run build \
      && rm -rf ".next-b7-$2" && mv .next ".next-b7-$2"' _ "$APP" "$s" "$ORIGINS" "$del" > "$LOGS/build-$s.log" 2>&1
  [ -f "$APP/.next-b7-$s/BUILD_ID" ] || { grep -i -m5 'error' "$LOGS/build-$s.log" | cut -c1-200; echo "run-dev: build of $s failed" >&2; exit 3; }
}
build kpop 1
build hub 0

export O1_B7_CRON_SECRET; O1_B7_CRON_SECRET="$(openssl rand -hex 24)"
SCR="$(mktemp -d)"; export O1_B7_MAIL_SINK="$SCR/mail.jsonl"
serve() { # site port
  local s="$1" p="$2" root; root="$WT/.next/b7-serve-$1"
  rm -rf "$root"; mkdir -p "$root"
  for e in "$APP"/*; do case "$(basename "$e")" in .next|.next-*|test-results) continue ;; esac; ln -s "$e" "$root/$(basename "$e")"; done
  ln -s "$APP/.next-b7-$s" "$root/.next"
  ( cd "$root" && exec "$ENVSH" dev -- env NEXT_PUBLIC_SITE_ID="$s" SITE_ID="$s" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_NET_ORIGINS="$ORIGINS" \
      CRON_SECRET="$O1_B7_CRON_SECRET" O1_MAIL_SINK="$O1_B7_MAIL_SINK" NODE_OPTIONS="--max-http-header-size=32768" \
      ./node_modules/.bin/next start -p "$p" -H 127.0.0.1 ) < /dev/null > "$LOGS/$s.log" 2>&1 &
  PIDS+=("$!")
  local n=0; until [ "$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "http://127.0.0.1:$p/robots.txt" 2>/dev/null)" != 000 ]; do
    kill -0 "${PIDS[${#PIDS[@]}-1]}" 2>/dev/null || { echo "run-dev: $s stopped (.next/b7-logs/$s.log)" >&2; exit 3; }
    n=$((n + 1)); [ "$n" -lt 120 ] || { echo "run-dev: $s did not answer" >&2; exit 3; }
    sleep 1
  done
  echo "run-dev: $s up on port $p"
}
serve kpop "$PK"
serve hub "$PH"
curl -s -o /dev/null --max-time 120 "http://127.0.0.1:$PK/settings"; curl -s -o /dev/null --max-time 120 "http://127.0.0.1:$PH/"

mkdir -p "$WT/docs/o1/reports/B7"
( cd "$APP" && "$ENVSH" dev -- env O1_B7_KPOP_URL="http://kpop.localhost:$PK" O1_B7_HUB_URL="http://127.0.0.1:$PH" O1_B7_REPORT="$WT/docs/o1/reports/B7/kpop-deletion.md" \
    ./node_modules/.bin/playwright test -c playwright.o1.config.ts --project=lanes e2e/o1/B7 ) 2>&1 | grep -v '^$' | cut -c1-240
rc="${PIPESTATUS[0]}"
rm -rf "$SCR"
exit "$rc"
