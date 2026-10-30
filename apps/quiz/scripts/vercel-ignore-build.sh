#!/usr/bin/env bash
# Ignored Build Step of the three Vercel projects (kpopquiz, otakuquiz, fandomverse): the ignoreCommand of
# apps/quiz/vercel.json, run by Vercel in apps/quiz before each build. It overrides the Ignored Build Step of every
# project's dashboard. Exit 0 skips the build, exit 1 builds; any doubt builds.
#
# 1. Until launch (runbook K5b), otakuquiz and fandomverse never build production (D-091, D-092). This replaces their
#    dashboard rule, which vercel.json now overrides. K5b sets NET_PRODUCTION_HOLD=0. No variable tells a dashboard
#    Redeploy from a git push, so a Redeploy of these two projects unticks "Use project's Ignore Build Step" (OWNER-NOW 8).
# 2. A push whose changes since the branch's last deployment are all under docs/ or in .md or .sql files does not
#    build. docs/data/ is the exception: a route serves docs/data/w5-dataset.md at runtime.
set -u

NET_PRODUCTION_HOLD=1

say() { echo "ignore-build: $*"; }

if [ "$NET_PRODUCTION_HOLD" = 1 ] && [ "${VERCEL_ENV:-}" = production ]; then
  case "${VERCEL_PROJECT_NAME:-}" in
    otakuquiz | fandomverse) say "$VERCEL_PROJECT_NAME production is held until launch (K5b), skip"; exit 0 ;;
  esac
fi

prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
head="${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD)}"
if [ -z "$prev" ]; then say "first deployment of the branch, build"; exit 1; fi
if [ "$prev" = "$head" ]; then say "redeploy of the same commit, build"; exit 1; fi
# Vercel clones 10 commits deep: the last deployed commit may be older.
if ! git cat-file -e "$prev^{commit}" 2>/dev/null; then
  git fetch -q --depth=1 origin "$prev" 2>/dev/null || { say "$prev is not in the clone, build"; exit 1; }
fi
# --no-renames: a file moved from src/ into docs/ counts on both sides.
files=$(git diff --no-renames --name-only "$prev" "$head" 2>/dev/null) || { say "no diff from $prev, build"; exit 1; }
if [ -z "$files" ]; then say "no file changed since $prev, build"; exit 1; fi

while IFS= read -r f; do
  case "$f" in
    docs/data/*) say "$f is served at runtime, build"; exit 1 ;;
    docs/* | *.md | *.sql) ;;
    *) say "$f changed, build"; exit 1 ;;
  esac
done <<< "$files"
say "only docs/, .md and .sql changed since $prev, skip"
exit 0
