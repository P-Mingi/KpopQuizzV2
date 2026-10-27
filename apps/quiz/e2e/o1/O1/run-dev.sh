#!/bin/bash
# Run O1, lane O1: the whole network on o1-dev (C3's run-dev.sh), with SITE_SCOPE on for the builds as well as the servers.
#   bash apps/quiz/e2e/o1/O1/run-dev.sh [the arguments of C3/run-dev.sh, e.g. --with-jump]
# Why: C3's script starts the three servers with SITE_SCOPE=1 but builds them without it. The kpop pages that are prerendered
# at build (home, /new, /trending, /groups, /trivia, /leaderboard and the like) then read the shared tables unscoped and keep
# the anime fixtures in their HTML until they are regenerated, so the content-leak specs fail on a server that is right at run
# time. On a Vercel project the flag is set for the build too; this wrapper does the same. A build made without the flag is
# never reused (--rebuild), unless --skip-build is given. The report lands where C3's script writes it (docs/o1/reports/C3/e2e-dev.md).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export SITE_SCOPE=1
args=("$@")
case " ${args[*]:-} " in *" --skip-build "*|*" --rebuild "*) ;; *) args+=(--rebuild) ;; esac
exec bash "$HERE/../C3/run-dev.sh" "${args[@]}"
