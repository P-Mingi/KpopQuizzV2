#!/bin/bash
# Run O1: parity.sh in production mode through the read-only proxy (owner 2026-10-18, D-028, D-037, D-043).
#   scripts/o1/parity-prod.sh <base> <head> [--evidence <dir>] [other parity.sh arguments]
# Builds and servers get a stand-in env: the proxy URL and the stand-in keys, never the production URL or a real key
# (checked before the run). The proxy reads the real env file itself, passes reads and the 22 read-only RPCs, refuses
# every write with 403 and logs it; the count and the list go to the evidence folder.
set -uo pipefail
O1=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1
KPQ="${O1_KPQ_REAL:-$HOME/kpq-o1}"
REAL="$KPQ/secrets/kpop-parity.env"
STAND="$KPQ/parity-proxy"
PORT="${O1_PROXY_PORT:-4031}"
[ -f "$REAL" ] || { echo "parity-prod: $REAL missing" >&2; exit 4; }
lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && { echo "parity-prod: port $PORT busy" >&2; exit 8; }
mkdir -p "$STAND/secrets"; chmod 700 "$STAND" "$STAND/secrets"
umask 077
{
  echo "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:$PORT"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=o1-proxy-anon"
  echo "SUPABASE_SERVICE_ROLE_KEY=o1-proxy-service"
  grep -vE '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' "$REAL" | grep -E '^[A-Z0-9_]+='
} > "$STAND/secrets/kpop-parity.env"
# The production ref, and any JWT, must not reach a build or a server.
if grep -q 'rdkgouofytwfdpbxbzio' "$STAND/secrets/kpop-parity.env" || grep -qE 'eyJ[A-Za-z0-9_-]{10,}\.' "$STAND/secrets/kpop-parity.env"; then
  echo "parity-prod: refused, the stand-in env names production or holds a key" >&2; exit 5
fi
LOG="$STAND/blocked-$(date -u +%Y%m%dT%H%M%SZ).jsonl"; : > "$LOG"
node "$O1/scripts/o1/prod-proxy.mjs" --port "$PORT" --env "$REAL" --log "$LOG" > "$STAND/proxy.out" 2>&1 &
PROXY=$!
trap 'kill $PROXY 2>/dev/null' EXIT INT TERM
for i in $(seq 1 30); do grep -q listening "$STAND/proxy.out" 2>/dev/null && break; sleep 0.5; done
grep -q listening "$STAND/proxy.out" || { echo "parity-prod: proxy did not start" >&2; exit 7; }
O1_KPQ="$STAND" "$O1/scripts/o1/parity.sh" "$@"; rc=$?
blocked=$(wc -l < "$LOG" | tr -d ' ')
echo "parity-prod: $blocked call(s) refused by the proxy (log $LOG)"
ev=""; prev=""; for a in "$@"; do [ "$prev" = "--evidence" ] && ev="$a"; prev="$a"; done
if [ -n "$ev" ]; then mkdir -p "$ev"; cp "$LOG" "$ev/proxy-blocked.jsonl"; echo "production through the read-only proxy, $blocked refused" > "$ev/parity-mode.txt"; fi
exit $rc
