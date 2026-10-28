#!/bin/bash
# FandomVerse (lane 1, docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md "Local development"): the hub and OtakuQuiz on ONE origin in
# development, as Vercel Microfrontends serves them on fandomverse.org: http://localhost:<proxy>/ is the hub, /anime/... is the
# anime build (its basePath). The two dev servers are the ones of scripts/o1/dev-multi.sh (a mirror of apps/quiz each, the
# database through scripts/o1/env.sh); in front of them runs the local proxy of @vercel/microfrontends with the group of
# apps/quiz/microfrontends.json, whose two applications are pointed at the two dev servers.
#
#   scripts/o1/fandomverse-dev.sh [offline|scratch|dev] --ports <hub>,<anime> --proxy <port> [--print-config]
#
# NEXT_PUBLIC_NET_ORIGINS is set to hub=http://localhost:<proxy>,anime=http://localhost:<proxy> for both builds (a bare origin per
# site; the /anime sub-folder comes from the registry, lib/site/registry.ts netBase), unless the caller exports one.
# Both sites share one host, so they share the Supabase session cookies: as on fandomverse.org.
# --print-config prints the generated proxy config and exits (nothing is started). Never a build, never production.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
die() { echo "fandomverse-dev: $1" >&2; exit "${2:-2}"; }

db=offline; ports=""; proxy=""; print=0
while [ $# -gt 0 ]; do
  case "$1" in
    offline|scratch|dev) db="$1" ;;
    --ports) ports="${2:?}"; shift ;;
    --proxy) proxy="${2:?}"; shift ;;
    --print-config) print=1 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) die "unknown argument $1" ;;
  esac
  shift
done
hub="${ports%%,*}"; anime="${ports#*,}"
for p in "$hub" "$anime" "$proxy"; do case "$p" in ''|*[!0-9]*) die "--ports <hub>,<anime> and --proxy <port> take port numbers" ;; esac; done
[ "$hub" != "$anime" ] && [ "$proxy" != "$hub" ] && [ "$proxy" != "$anime" ] || die "three different ports"

WT="$(git -C "$HERE" rev-parse --show-toplevel)" || die "not in a git worktree"
APP="$WT/apps/quiz"
[ -f "$APP/microfrontends.json" ] || die "no apps/quiz/microfrontends.json in $WT"
CFG_DIR="$WT/.next/fandomverse-dev"; mkdir -p "$CFG_DIR"
CFG="$CFG_DIR/microfrontends.json"
# The committed group, with each application's development.local set to its dev server (127.0.0.1: the dev servers listen there,
# and Node may resolve localhost to ::1 first).
HUB_PORT="$hub" ANIME_PORT="$anime" PROXY_PORT="$proxy" node -e '
  const fs = require("fs");
  const c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const local = { fandomverse: process.env.HUB_PORT, otakuquiz: process.env.ANIME_PORT };
  for (const [name, port] of Object.entries(local)) {
    if (!c.applications[name]) throw new Error(`microfrontends.json has no application ${name}`);
    c.applications[name].development = { ...(c.applications[name].development || {}), local: `http://127.0.0.1:${port}` };
  }
  c.options = { ...(c.options || {}), localProxyPort: Number(process.env.PROXY_PORT) };
  fs.writeFileSync(process.argv[2], JSON.stringify(c, null, 2) + "\n");
' "$APP/microfrontends.json" "$CFG" || die "could not write $CFG" 3
if [ "$print" = 1 ]; then cat "$CFG"; exit 0; fi

export NEXT_PUBLIC_NET_ORIGINS="${NEXT_PUBLIC_NET_ORIGINS:-hub=http://localhost:$proxy,anime=http://localhost:$proxy}"
"$HERE/dev-multi.sh" "$db" --worktree "$WT" --sites anime,hub --ports "0,$anime,$hub" &
MULTI_PID=$!
trap 'kill "$MULTI_PID" 2>/dev/null; wait "$MULTI_PID" 2>/dev/null' EXIT INT TERM
echo "fandomverse-dev: proxy on http://localhost:$proxy (hub: /, OtakuQuiz: /anime) once the two dev servers answer"
( cd "$APP" && exec ./node_modules/.bin/microfrontends proxy "$CFG" --local-apps fandomverse otakuquiz --port "$proxy" )
