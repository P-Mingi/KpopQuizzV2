#!/bin/bash
# Run O1, lane Q0a, deliverable 4: the three sites of one worktree in development, side by side.
#   kpop.localhost:<p1>  anime.localhost:<p2>  hub.localhost:<p3>   (one `next dev` each, NEXT_PUBLIC_SITE_ID per site)
#
#   scripts/o1/dev-multi.sh [offline|scratch|dev] [--worktree <wt>] [--sites kpop,anime,hub] [--ports p1,p2,p3]
#                           [--interval <s>] [--test] [--clean]
#
# offline (default) | scratch | dev: the database, through scripts/o1/env.sh (O1's copy). Ports: the lane's triple in
# O1's docs/o1/ports.tsv (the lane is the branch o1/<lane> of the worktree), or --ports. The worktree defaults to the
# git toplevel of the current folder. Flags of the gate builds are set (UX_V1, UX_V12); any NEXT_PUBLIC_* the caller
# exports is kept. Browsers resolve *.localhost to 127.0.0.1; the servers listen on 127.0.0.1.
# --test: when the three servers answer, runs the Playwright project dev-multi (apps/quiz/e2e/o1/dev-multi/) against
# them with O1_KPOP_URL, O1_ANIME_URL, O1_HUB_URL, stops everything and exits with the suite's status.
# --clean: removes the mirrors and exits.
#
# Why mirrors (report Q0a, D37 and D39): Next 16.2 takes a lock at <distDir>/dev/lock, so two `next dev` in one folder
# refuse each other, and distDir is set only in next.config.ts (HOT list; request 18 asks for an O1_NEXT_DIST_DIR
# variable). A folder of symlinks serves no route (Next resolves the linked src to its real path outside the project
# folder: 404 on every path). So each site runs from a mirror of apps/quiz: <wt>/.next/multi-<site>/ (ignored by git,
# the same depth as apps/quiz so tsconfig paths and process.cwd()/../.. resolve as in apps/quiz), made with APFS clones
# (cp -c, no extra disk for unchanged files) and node_modules linked to the worktree's. A sync loop copies every
# change of apps/quiz/src, public and the top-level config files into the mirrors: every --interval seconds (default
# 2) one find looks for anything newer than the last pass, and only then rsync copies (it writes a temporary file and
# renames it, so the dev watcher sees an ordinary save). Measured under a load average near 100: an added file
# reached the three mirrors in 11 s, a deletion in 6 s. Edit files in
# apps/quiz as usual, never in a mirror: the next sync overwrites the mirror.
# Once request 18 is in next.config.ts, the mirrors can give way to O1_NEXT_DIST_DIR=.next/multi-<site> in apps/quiz.
# Never a build, never production: env.sh refuses a production project.
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
HERE="$(cd "$(dirname "$0")" && pwd)"
ENVSH="$O1/scripts/o1/env.sh"; [ -x "$ENVSH" ] || ENVSH="$HERE/env.sh"
die() { echo "dev-multi: $1" >&2; exit "${2:-2}"; }

db=offline; wt=""; sites="kpop,anime,hub"; ports=""; interval=2; runtest=0; clean=0
while [ $# -gt 0 ]; do
  case "$1" in
    offline|scratch|dev) db="$1" ;;
    --worktree) wt="${2:?}"; shift ;;
    --sites) sites="${2:?}"; shift ;;
    --ports) ports="${2:?}"; shift ;;
    --interval) interval="${2:?}"; shift ;;
    --test) runtest=1 ;;
    --clean) clean=1 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) die "unknown argument $1" ;;
  esac
  shift
done
[ -n "$wt" ] || wt="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not in a git worktree (use --worktree)"
wt="$(cd "$wt" && pwd)"; APP="$wt/apps/quiz"
[ -d "$APP/src" ] || die "no apps/quiz/src in $wt"
[ "$wt" = "$ROOT" ] && die "refused: the main checkout (COMMON rule 12); run it from a lane worktree"
case "$interval" in ''|*[!0-9]*) die "--interval takes whole seconds" ;; esac
[ "$interval" -ge 1 ] || die "--interval takes at least 1 second"
MULTI="$wt/.next"

if [ "$clean" = 1 ]; then rm -rf "$MULTI"/multi-kpop "$MULTI"/multi-anime "$MULTI"/multi-hub "$MULTI"/multi-logs; echo "dev-multi: mirrors removed"; exit 0; fi

SITES=(); for s in $(echo "$sites" | tr ',' ' '); do
  case "$s" in kpop|anime|hub) SITES+=("$s") ;; *) die "unknown site $s (kpop, anime, hub)" ;; esac
done
[ ${#SITES[@]} -gt 0 ] || die "no site"

if [ -z "$ports" ]; then
  lane="$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null)"; lane="${lane#o1/}"
  row="$(awk -F'\t' -v l="$lane" '$1 == l { print $2 "," $3 "," $4 }' "$O1/docs/o1/ports.tsv" 2>/dev/null)"
  [ -n "$row" ] || die "no ports for lane '$lane' in $O1/docs/o1/ports.tsv (use --ports)"
  ports="$row"
fi
port_of() { # site -> port (kpop, anime, hub = the 1st, 2nd, 3rd of the triple)
  local i=1; case "$1" in anime) i=2 ;; hub) i=3 ;; esac
  echo "$ports" | cut -d, -f"$i"
}
for s in "${SITES[@]}"; do
  p="$(port_of "$s")"
  case "$p" in ''|*[!0-9]*) die "bad port '$p' for $s" ;; esac
  lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 && die "port $p ($s) is busy"
done

NM="$(readlink "$APP/node_modules" 2>/dev/null || true)"; [ -n "$NM" ] || NM="$APP/node_modules"
[ -x "$NM/.bin/next" ] || die "no next in $NM/.bin"
# What a mirror holds: src and public, and every top-level file of apps/quiz (configs). Nothing generated.
TOP_FILES() { local f; for f in "$APP"/* "$APP"/.[!.]*; do [ -f "$f" ] && basename "$f"; done; }
sync_one() { # site [clone]
  local m="$MULTI/multi-$1" f
  mkdir -p "$m"
  if [ "${2:-}" = clone ] && [ ! -d "$m/src" ]; then
    cp -c -R -p "$APP/src" "$m/src" && cp -c -R -p "$APP/public" "$m/public" || return 1
  fi
  rsync -a --delete "$APP/src/" "$m/src/" && rsync -a --delete "$APP/public/" "$m/public/" || return 1
  for f in $(TOP_FILES); do rsync -a "$APP/$f" "$m/$f" || return 1; done
  [ -L "$m/node_modules" ] || ln -s "$NM" "$m/node_modules"
}

mkdir -p "$MULTI/multi-logs"
PIDS=(); SYNC_PID=""
kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill "$1" 2>/dev/null; }
stop_all() {
  [ -n "$SYNC_PID" ] && kill_tree "$SYNC_PID"
  for p in ${PIDS[@]+"${PIDS[@]}"}; do kill_tree "$p"; done
  PIDS=(); SYNC_PID=""
}
trap 'stop_all; exit 130' INT TERM
trap stop_all EXIT

STAMP="$MULTI/multi-logs/.synced"; : > "$STAMP"
for s in "${SITES[@]}"; do sync_one "$s" clone || die "mirror of $s failed" 3; done
# One scan per tick (a directory's mtime moves when an entry is added or removed, so deletions show too); the
# mirrors are synced only when something changed since the last pass.
(
  watched=("$APP/src" "$APP/public"); for f in $(TOP_FILES); do watched+=("$APP/$f"); done
  while sleep "$interval"; do
    : > "$STAMP.next"
    if [ -n "$(find "${watched[@]}" -newer "$STAMP" -print -quit 2>/dev/null)" ]; then
      for s in "${SITES[@]}"; do sync_one "$s" >/dev/null 2>&1; done
    fi
    mv -f "$STAMP.next" "$STAMP"
  done
) &
SYNC_PID=$!

for s in "${SITES[@]}"; do
  p="$(port_of "$s")"; log="$MULTI/multi-logs/$s.log"
  ( cd "$MULTI/multi-$s" && exec "$ENVSH" "$db" -- env NEXT_PUBLIC_SITE_ID="$s" SITE_ID="$s" \
      NEXT_PUBLIC_UX_V1="${NEXT_PUBLIC_UX_V1:-1}" NEXT_PUBLIC_UX_V12="${NEXT_PUBLIC_UX_V12:-1}" \
      NODE_OPTIONS="--max-http-header-size=32768${NODE_OPTIONS:+ $NODE_OPTIONS}" \
      ./node_modules/.bin/next dev -p "$p" -H 127.0.0.1 ) < /dev/null > "$log" 2>&1 &
  PIDS+=("$!")
  echo "dev-multi: $s on http://$s.localhost:$p (db $db, mirror .next/multi-$s, log .next/multi-logs/$s.log)"
done

# Ready when each server answers (any HTTP status; the first page compile comes later, on the first request).
i=0; for s in "${SITES[@]}"; do
  p="$(port_of "$s")"; pid="${PIDS[$i]}"; i=$((i + 1)); n=0
  until [ "$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' -H "Host: $s.localhost:$p" "http://127.0.0.1:$p/_next/static/none" 2>/dev/null)" != 000 ]; do
    kill -0 "$pid" 2>/dev/null || die "$s stopped (.next/multi-logs/$s.log)" 3
    n=$((n + 1)); [ "$n" -lt 300 ] || die "$s did not answer in 5 minutes" 3
    sleep 1
  done
done
echo "dev-multi: ready (first page compiles take a minute or more; an edit in apps/quiz reaches the mirrors on the next pass, ${interval} s apart, plus the copy: 6 to 11 s measured under a load average near 100)"

if [ "$runtest" = 1 ]; then
  # Warm up: the first compile of the probe route, one site at a time (minutes under load), outside the test timeouts.
  for s in "${SITES[@]}"; do
    p="$(port_of "$s")"
    code="$(curl -s -o /dev/null --max-time 900 -w '%{http_code}' -H "Host: $s.localhost:$p" "http://127.0.0.1:$p/robots.txt")"
    echo "dev-multi: warm-up $s /robots.txt $code"
  done
  envs=(); for s in "${SITES[@]}"; do S="$(echo "$s" | tr '[:lower:]' '[:upper:]')"; envs+=("O1_${S}_URL=http://$s.localhost:$(port_of "$s")"); done
  ( cd "$APP" && env O1_ENV="$db" ${envs[@]+"${envs[@]}"} ./node_modules/.bin/playwright test -c playwright.o1.config.ts --project dev-multi )
  rc=$?
  stop_all
  exit "$rc"
fi
wait
