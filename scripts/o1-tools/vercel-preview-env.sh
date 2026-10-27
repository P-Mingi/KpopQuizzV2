#!/bin/bash
# Run O1 (owner exception to rule 13, 2026-10-22): the test environment on the Vercel branch addresses of o1/integration, wired to o1-dev.
#   scripts/o1-tools/vercel-preview-env.sh            (run through scripts/o1/env.sh dev by itself)
# Sets Preview variables scoped to the git branch o1/integration on kpopquiz, otakuquiz and fanquiz, and the Ignored Build Step of
# otakuquiz and fanquiz (build o1/integration only; main stays paused until runbook K5b). Never a Production variable, never a domain,
# never main. Values are never printed: o1-dev keys come from scripts/o1/env.sh dev (which refuses anything but o1-dev); the test
# secrets are generated once into ~/kpq-o1/preview/test-secrets.env (mode 600) and reused, the same on the 3 projects.
set -euo pipefail
O1=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1
TEAM=team_ISdqRmv9ZAp0KGi60AyzNFSG
BRANCH=o1/integration
SLUG=p-mingis-projects
VC=(npx -y vercel@65.1.0)
if [ "${O1_ENV:-}" != dev ]; then exec "$O1/scripts/o1/env.sh" dev -- bash "$0" "$@"; fi
case "${NEXT_PUBLIC_SUPABASE_URL:-}" in *rdkgouofytwfdpbxbzio*) echo "refused: production URL" >&2; exit 5 ;; esac
[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] || { echo "o1-dev keys missing" >&2; exit 4; }
SEC="$HOME/kpq-o1/preview/test-secrets.env"
mkdir -p "$(dirname "$SEC")"; chmod 700 "$(dirname "$SEC")"
if [ ! -f "$SEC" ]; then
  umask 077
  { for k in PASSPORT_TICKET_SECRET PASSPORT_REVALIDATE_SECRET CRON_SECRET NET_IP_HASH_SALT; do printf '%s=%s\n' "$k" "o1test_$(openssl rand -hex 32)"; done; } > "$SEC"
fi
set -a; . "$SEC"; set +a
tmp="$(mktemp -d)"; chmod 700 "$tmp"; trap 'rm -rf "$tmp"' EXIT
ORIGINS="kpop=https://kpopquiz-git-o1-integration-$SLUG.vercel.app,anime=https://otakuquiz-git-o1-integration-$SLUG.vercel.app,hub=https://fanquiz-git-o1-integration-$SLUG.vercel.app"
put() { # project key value
  local f="$tmp/v.json"; umask 077
  KEY="$2" VAL="$3" BR="$BRANCH" node -e 'process.stdout.write(JSON.stringify({key:process.env.KEY,value:process.env.VAL,type:"encrypted",target:["preview"],gitBranch:process.env.BR}))' > "$f"
  if "${VC[@]}" api "/v10/projects/$1/env?teamId=$TEAM&upsert=true" --method POST --input "$f" --silent >/dev/null 2>&1; then echo "  $1 $2: ok"; else echo "  $1 $2: FAILED" >&2; return 1; fi
}
for p in kpopquiz otakuquiz fanquiz; do
  echo "== $p (Preview, branch $BRANCH)"
  put "$p" NEXT_PUBLIC_SUPABASE_URL "$NEXT_PUBLIC_SUPABASE_URL"
  put "$p" NEXT_PUBLIC_SUPABASE_ANON_KEY "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
  put "$p" SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
  case "$p" in otakuquiz) put "$p" NEXT_PUBLIC_SITE_ID anime ;; fanquiz) put "$p" NEXT_PUBLIC_SITE_ID hub ;; esac
  for k in NEXT_PUBLIC_UX_V1 NEXT_PUBLIC_UX_V12 SITE_SCOPE PASSPORT_JUMP NEXT_PUBLIC_NET_BEACON NEXT_PUBLIC_NET_FOOTER NEXT_PUBLIC_NET_MENU; do put "$p" "$k" 1; done
  for k in PASSPORT_TICKET_SECRET PASSPORT_REVALIDATE_SECRET CRON_SECRET NET_IP_HASH_SALT; do put "$p" "$k" "${!k}"; done
  put "$p" NEXT_PUBLIC_NET_ORIGINS "$ORIGINS"
done
for p in otakuquiz fanquiz; do
  printf '%s' '{"commandForIgnoringBuildStep":"if [ \"$VERCEL_GIT_COMMIT_REF\" = \"o1/integration\" ]; then exit 1; else exit 0; fi"}' > "$tmp/ib.json"
  "${VC[@]}" api "/v9/projects/$p?teamId=$TEAM" --method PATCH --input "$tmp/ib.json" --silent >/dev/null 2>&1 && echo "== $p Ignored Build Step: builds $BRANCH only" || { echo "$p Ignored Build Step: FAILED" >&2; exit 1; }
done
echo "Termine."
