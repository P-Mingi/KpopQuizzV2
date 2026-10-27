#!/bin/bash
# Run O1 build lock (RUN-O1-PROMPT section 2, Builds). Only gate.sh and parity.sh run `next build`, and only
# inside this lock: a mkdir lock in the git common dir, with the holder's PID and a heartbeat file.
#   scripts/o1/build-lock.sh run <label> -- <command...>   take the lock, run, release (heartbeat every 30 s)
#   scripts/o1/build-lock.sh status
# Stale only when the holder PID is dead or the heartbeat is older than 5 minutes.
# The other session's builds ignore this lock: expect some slowness.
set -uo pipefail
COMMON="$(git -C "$(dirname "$0")" rev-parse --git-common-dir)"
case "$COMMON" in /*) ;; *) COMMON="$(cd "$(dirname "$0")" && cd "$COMMON" && pwd)" ;; esac
LOCK="$COMMON/o1-build.lock"
now() { date +%s; }
holder_alive() {
  [ -d "$LOCK" ] || return 1
  local pid hb
  pid="$(cat "$LOCK/pid" 2>/dev/null || echo 0)"
  hb="$(cat "$LOCK/heartbeat" 2>/dev/null || echo 0)"
  kill -0 "$pid" 2>/dev/null || return 1
  [ $(( $(now) - hb )) -le 300 ] || return 1
  return 0
}
acquire() {
  local label="$1" waited=0
  while ! mkdir "$LOCK" 2>/dev/null; do
    if ! holder_alive; then
      echo "build-lock: stale lock ($(cat "$LOCK/label" 2>/dev/null)), taking it over" >&2
      rm -rf "$LOCK"; continue
    fi
    [ $((waited % 60)) -eq 0 ] && echo "build-lock: waiting for $(cat "$LOCK/label" 2>/dev/null) (pid $(cat "$LOCK/pid" 2>/dev/null))" >&2
    sleep 10; waited=$((waited + 10))
  done
  echo "$$" > "$LOCK/pid"; echo "$label" > "$LOCK/label"; now > "$LOCK/heartbeat"; date -u +%FT%TZ > "$LOCK/since"
}
release() { [ "$(cat "$LOCK/pid" 2>/dev/null)" = "$$" ] && rm -rf "$LOCK"; }
case "${1:-}" in
  status)
    if [ -d "$LOCK" ]; then
      echo "held by $(cat "$LOCK/label" 2>/dev/null) pid $(cat "$LOCK/pid" 2>/dev/null) since $(cat "$LOCK/since" 2>/dev/null) alive=$(holder_alive && echo yes || echo no)"
    else echo "free"; fi ;;
  run)
    label="${2:?label}"; shift 2; [ "${1:-}" = "--" ] && shift
    acquire "$label"
    trap release EXIT INT TERM
    ( while kill -0 $$ 2>/dev/null; do now > "$LOCK/heartbeat" 2>/dev/null; sleep 30; done ) &
    hbpid=$!
    "$@"; rc=$?
    kill "$hbpid" 2>/dev/null
    exit $rc ;;
  *) echo "usage: build-lock.sh run <label> -- <cmd...> | status" >&2; exit 2 ;;
esac
