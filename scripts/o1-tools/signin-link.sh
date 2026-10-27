#!/bin/bash
# Owner test tool 2: a one-time sign-in link for a fixture account of o1-dev, opening one of the local sites signed in.
#   scripts/o1-tools/signin-link.sh <fixture key or email> [kpop|anime|hub]      (site defaults to kpop)
#   scripts/o1-tools/signin-link.sh --vercel <fixture key or email> [kpop|anime|hub]   (the Vercel test addresses of o1/integration)
#   scripts/o1-tools/signin-link.sh --stop                                       (stops the helper; it also stops itself)
# Example: scripts/o1-tools/signin-link.sh dual anime
# Needs the sites up (scripts/o1-tools/dev-up.sh). Prints one line on stdout, the link, and nothing else:
#   http://anime.localhost:3199/s/<random id>
# Open it in a browser (or curl -L -c jar): once, within 10 minutes, it signs the account in on that site and lands on its home.
# No password anywhere. How: Supabase's own magic link. The admin API (generateLink, type magiclink, no email) makes a one-time
# token for the fixture account; a tiny local server (signin-helper.mjs, 127.0.0.1:$O1_SIGNIN_PORT, default 3199) keeps the
# token in memory and, when the link is opened on <site>.localhost, verifies it with @supabase/ssr and sets the session cookies
# (cookies ignore ports, so the site on <site>.localhost:<port> gets them), then redirects to the site. No app code involved.
# Refuses (exit 5) unless scripts/o1/env.sh dev gives o1-dev; refuses (exit 4) an account that is not in docs/o1/fixtures-dev.json,
# is not on the database, or is the unconfirmed-email fixture (a link would confirm its email).
# --vercel: no local site and no helper needed. The admin API makes the one-time token on o1-dev and the line printed is
#   https://<site address>/auth/confirm?token_hash=<hashed token>&type=magiclink&next=%2F      (anime or hub; the link IS the secret)
# For kpop, which has no /auth/confirm, it is the anime link whose next is /auth/passport/out?to=kpop&next=/ (passport jump signs
# kpop in). Addresses: scripts/o1-tools/signin-urls.mjs. A Vercel Authentication wall (401) means: open it in the signed-in browser.
# Exit: 0 link printed, 2 usage, 3 sites or helper not available, 4 account refused, 5 environment refused.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WT="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null)" || { echo "signin-link: not in a git worktree" >&2; exit 2; }
ENVSH="$WT/scripts/o1/env.sh"
KPQ="${O1_KPQ:-$HOME/kpq-o1}"; DEVUP_STATE="$KPQ/logs/dev-up/state.env"
HPORT="${O1_SIGNIN_PORT:-3199}"
PROD_REF="rdkgouofytwfdpbxbzio"
die() { echo "signin-link: $1" >&2; exit "${2:-2}"; }
usage() { sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }

who=""; site=""; vercel=0
while [ $# -gt 0 ]; do
  case "$1" in
    --stop) exec node "$HERE/signin-helper.mjs" stop --state "$KPQ/logs/dev-up/signin.state" ;;
    --vercel) vercel=1 ;;
    -h|--help) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) usage ;;
    *) if [ -z "$who" ]; then who="$1"; elif [ -z "$site" ]; then site="$1"; else usage; fi ;;
  esac
  shift
done
[ -n "$who" ] || usage
site="${site:-kpop}"
case "$site" in kpopquiz) site=kpop ;; otakuquiz) site=anime ;; fanquiz) site=hub ;; esac
case "$site" in kpop|anime|hub) ;; *) die "the site must be kpop, anime or hub" ;; esac
case "$HPORT" in ''|*[!0-9]*) die "bad O1_SIGNIN_PORT" ;; esac

# 1. Only o1-dev (env.sh refuses the production project and a URL without the branch ref; checked again here and in the helper).
guard='
  [ "${O1_ENV:-}" = dev ] && [ "${O1_BRANCH:-}" = o1-dev ] || { echo "signin-link: refused, the environment is not o1-dev" >&2; exit 5; }
  case "${NEXT_PUBLIC_SUPABASE_URL:-}" in "https://${O1_BRANCH_REF:-x}.supabase.co"|"https://${O1_BRANCH_REF:-x}.supabase.co/") ;; *) echo "signin-link: refused, the URL is not the o1-dev branch" >&2; exit 5 ;; esac
  case "${NEXT_PUBLIC_SUPABASE_URL}|${O1_BRANCH_REF}|${O1_DB_URL:-}" in *'"$PROD_REF"'*) echo "signin-link: refused, a production reference" >&2; exit 5 ;; esac'
"$ENVSH" dev -- bash -c "$guard"; rc=$?
[ "$rc" = 0 ] || die "the environment is not o1-dev (scripts/o1/env.sh dev exit $rc)" "$([ "$rc" = 4 ] && echo 4 || echo 5)"

# 2'. --vercel: nothing local is involved; the helper asks the admin API for the token and prints the link of the Vercel address.
if [ "$vercel" = 1 ]; then
  exec "$ENVSH" dev -- node "$HERE/signin-helper.mjs" vercel --who "$who" --site "$site" --fixtures "$WT/docs/o1/fixtures-dev.json"
fi

# 2. The site must be up (dev-up.sh): its port is in the state file.
[ -f "$DEVUP_STATE" ] || die "the sites are not running: scripts/o1-tools/dev-up.sh" 3
ports="$(sed -n 's/^PORTS=//p' "$DEVUP_STATE" | head -1)"
case "$site" in kpop) n=1 ;; anime) n=2 ;; hub) n=3 ;; esac
sport="$(echo "$ports" | cut -d, -f"$n")"
case "$sport" in ''|*[!0-9]*) die "the sites are not running: scripts/o1-tools/dev-up.sh" 3 ;; esac
[ "$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "http://localhost:$sport/robots.txt" 2>/dev/null)" != 000 ] || die "$site is not answering on port $sport: scripts/o1-tools/dev-up.sh" 3

# 3. The link (the helper holds the service role only while this command runs).
exec "$ENVSH" dev -- node "$HERE/signin-helper.mjs" mint --who "$who" --site "$site" --origin "http://$site.localhost:$sport" \
  --port "$HPORT" --fixtures "$WT/docs/o1/fixtures-dev.json" --kpq "$KPQ"
