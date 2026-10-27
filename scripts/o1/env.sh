#!/bin/bash
# Run O1 environments (RUN-O1-PROMPT section 2). No lane worktree has an .env.local: dev servers, scripts and e2e
# get their Supabase settings from here, and the values are never printed.
#   scripts/o1/env.sh scratch|dev|offline [--] <command...>
#   scratch, dev  = the Supabase branches o1-scratch and o1-dev (KPQ/secrets/<target>.env, written by the owner's
#                   KPQ/fill-dev-env.sh); refused if the file names the production project or lacks its branch ref.
#   offline       = an unreachable Supabase (127.0.0.1:9) for builds and tests that must not touch any database.
# Production is never a target here: only scripts/o1/parity.sh reads it, with its own file.
set -uo pipefail
PROD_REF="rdkgouofytwfdpbxbzio"
KPQ="${O1_KPQ:-$HOME/kpq-o1}"
target="${1:-}"; shift || true
[ "${1:-}" = "--" ] && shift
[ $# -gt 0 ] || { echo "usage: env.sh scratch|dev|offline [--] <command...>" >&2; exit 2; }
case "$target" in
  offline)
    export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:9"
    export NEXT_PUBLIC_SUPABASE_ANON_KEY="o1-offline-anon"
    export SUPABASE_SERVICE_ROLE_KEY="o1-offline-service"
    unset O1_DB_URL ;;
  scratch|dev)
    f="$KPQ/secrets/$target.env"
    [ -f "$f" ] || { echo "env.sh: $f is missing (owner gate G1: run sh $KPQ/fill-dev-env.sh)" >&2; exit 4; }
    perm="$(stat -f '%Lp' "$f" 2>/dev/null || stat -c '%a' "$f")"
    [ "$perm" = "600" ] || { echo "env.sh: $f must be mode 600 (is $perm)" >&2; exit 4; }
    if grep -q "$PROD_REF" "$f"; then echo "env.sh: refused, $f names the production project" >&2; exit 5; fi
    set -a; . "$f"; set +a
    [ -n "${O1_BRANCH_REF:-}" ] || { echo "env.sh: O1_BRANCH_REF missing in $f" >&2; exit 4; }
    case "${NEXT_PUBLIC_SUPABASE_URL:-}" in *"$O1_BRANCH_REF"*) ;; *) echo "env.sh: refused, the URL lacks the branch ref" >&2; exit 5 ;; esac
    case "${O1_DB_URL:-}" in ""|*"$O1_BRANCH_REF"*) ;; *) echo "env.sh: refused, the database URL lacks the branch ref" >&2; exit 5 ;; esac ;;
  *) echo "env.sh: unknown target '$target' (scratch, dev or offline)" >&2; exit 2 ;;
esac
export O1_ENV="$target"
export NEXT_TELEMETRY_DISABLED=1
# D-113 (owner, 2026-10-25): no secret is ever shown, in a log, a report or an agent's transcript. Everything the command prints
# goes through o1_mask: any postgres URL, the database password and the values of the key and secret variables become [masked].
# The command keeps its stdin and its exit code.
o1_mask() {
  perl -pe 'BEGIN { $| = 1; my @n = grep { /(KEY|SECRET|TOKEN|PASSWORD|DB_URL|SALT)/ } keys %ENV;
    @s = sort { length($b) <=> length($a) } grep { length($_) >= 8 } map { $ENV{$_} } @n;
    for (@n) { push @s, $1 if $_ =~ /DB_URL/ && $ENV{$_} =~ m{://[^:/\s]+:([^@\s]+)@} && length($1) >= 6 } }
    for my $v (@s) { s/\Q$v\E/[masked]/g } s{postgres(?:ql)?://\S+}{postgresql://[masked]}g;'
}
"$@" 2> >(o1_mask >&2) | o1_mask
rc=${PIPESTATUS[0]}
wait
exit "$rc"
