#!/bin/bash
# Owner test tool: copy the public K-pop catalog of production into o1-dev (Run O1, Q0b).
#   scripts/o1-tools/copy-kpop-catalog.sh [--dry-run] [--refresh]
# Starts the read-only production proxy as scripts/o1/parity-prod.sh does (the proxy reads the real env file itself; the script only
# knows http://127.0.0.1:<port> and the stand-in anon key), runs copy-kpop-catalog.mjs through scripts/o1/env.sh dev (which refuses any
# target but o1-dev), and stops the proxy at the end. Prints counts per table only. See copy-kpop-catalog.mjs for what is copied.
# Exit: the script's own (0 ok), 4 env file missing, 7 proxy did not start, 8 port busy.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WT="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null)" || { echo "copy-kpop-catalog: not in a git worktree" >&2; exit 2; }
O1="${O1_ROOT:-/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1}"
KPQ="${O1_KPQ_REAL:-$HOME/kpq-o1}"
REAL="$KPQ/secrets/kpop-parity.env"
WORK="$KPQ/copy-catalog"
PORT="${O1_CATALOG_PROXY_PORT:-4032}"
[ -f "$REAL" ] || { echo "copy-kpop-catalog: $REAL missing" >&2; exit 4; }
lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && { echo "copy-kpop-catalog: port $PORT busy" >&2; exit 8; }
mkdir -p "$WORK"; chmod 700 "$WORK"; umask 077
LOG="$WORK/blocked-$(date -u +%Y%m%dT%H%M%SZ).jsonl"; : > "$LOG"
node "$WT/scripts/o1/prod-proxy.mjs" --port "$PORT" --env "$REAL" --log "$LOG" > "$WORK/proxy.out" 2>&1 &
PROXY=$!
trap 'kill $PROXY 2>/dev/null' EXIT INT TERM
for i in $(seq 1 30); do grep -q listening "$WORK/proxy.out" 2>/dev/null && break; sleep 0.5; done
grep -q listening "$WORK/proxy.out" || { echo "copy-kpop-catalog: proxy did not start" >&2; exit 7; }
"$O1/scripts/o1/env.sh" dev -- node "$WT/scripts/o1-tools/copy-kpop-catalog.mjs" --proxy "http://127.0.0.1:$PORT" "$@"; rc=$?
kill $PROXY 2>/dev/null; wait $PROXY 2>/dev/null
echo "copy-kpop-catalog: proxy stopped, $(wc -l < "$LOG" | tr -d ' ') call(s) refused by it"
exit $rc
