#!/bin/bash
# Run O1: rebuild a dev branch's public schema from production's (RUN-O1-PROMPT section 2b, step 4).
#   scripts/o1/branch-parity.sh scratch|dev --yes      rebuild o1-scratch or o1-dev (destructive on that branch only)
#   scripts/o1/branch-parity.sh --local-test <url>     same steps on a local throwaway cluster (127.0.0.1 only)
#   scripts/o1/branch-parity.sh --fingerprint scratch|dev   only compare the branch against the production inventory
# Inputs (owner gate G3): KPQ/prod-public.sql (pg_dump 18 --schema-only --schema=public --no-owner) and
# KPQ/prod-inventory.txt (scripts/o1/prod-inventory.sql run read-only on production).
# Steps: refuse the production ref; save the branch's public schema; create missing extensions and schemas;
# in ONE transaction: DROP SCHEMA public CASCADE, CREATE SCHEMA public with Supabase's default grants and default
# privileges (after the dump, whose own GRANTs carry production's ACLs), apply prod-public.sql (ON_ERROR_STOP), recreate the auth.* and storage.* triggers, the storage policies
# and the publication membership from the inventory (no cron jobs); then fingerprint the branch against the
# production inventory: zero difference, or each one listed for the LEDGER.
# Never "reset", "merge", "rebase" or "pull" a branch from the Supabase dashboard: rebuilding means this script.
set -uo pipefail
PROD_REF="rdkgouofytwfdpbxbzio"
O1=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1
KPQ="${O1_KPQ:-$HOME/kpq-o1}"
BIN="${O1_PG_BIN:-/opt/homebrew/opt/postgresql@18/bin}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
DUMP="$KPQ/prod-public.sql"
INV="$KPQ/prod-inventory.txt"
die() { echo "branch-parity: $1" >&2; exit "${2:-3}"; }
ts="$(date -u +%Y%m%dT%H%M%SZ)"

mode="${1:-}"; local_test=0; fp_only=0
case "$mode" in
  --local-test) url="${2:?url}"; label=local
    case "$url" in *@127.0.0.1:*|*@localhost:*) ;; *) die "--local-test accepts a 127.0.0.1 URL only" 2 ;; esac
    local_test=1 ;;
  --fingerprint) fp_only=1; label="${2:?scratch|dev}" ;;
  scratch|dev) label="$mode"; [ "${2:-}" = "--yes" ] || die "destructive on o1-$label: pass --yes" 2 ;;
  *) die "usage: branch-parity.sh scratch|dev --yes | --fingerprint scratch|dev | --local-test <url>" 2 ;;
esac
if [ $local_test = 0 ]; then
  f="$KPQ/secrets/$label.env"
  [ -f "$f" ] || die "$f missing (owner gate G1)" 4
  url="$(sh -c 'set -a; . "$1"; printf %s "${O1_DB_URL:-}"' _ "$f")"
  ref="$(sh -c 'set -a; . "$1"; printf %s "${O1_BRANCH_REF:-}"' _ "$f")"
  [ -n "$ref" ] || die "O1_BRANCH_REF missing" 5
  case "$url" in *"$PROD_REF"*) die "refused: the database URL names the production project" 5 ;; esac
  case "$url" in *"$ref"*) ;; *) die "refused: the database URL lacks the branch ref" 5 ;; esac
fi
[ -f "$INV" ] || die "$INV missing (owner gate G3)" 4
[ $fp_only = 1 ] || [ -f "$DUMP" ] || die "$DUMP missing (owner gate G3)" 4
psqlq() { "$BIN/psql" "$url" -X -q -v ON_ERROR_STOP=1 "$@"; }
section() { awk -v s="#### $2" '$0==s{on=1;next} /^#### /{on=0} on' "$1"; }
WORK="$KPQ/branch-parity/$label-$ts"; mkdir -p "$WORK"; chmod 700 "$KPQ/branch-parity"
EVD="$O1/docs/o1/evidence/branch-parity"; mkdir -p "$EVD"

if [ $fp_only = 0 ]; then
  echo "1. saving the branch's public schema to $WORK/before.sql"
  "$BIN/pg_dump" "$url" --schema-only --schema=public --no-owner --file "$WORK/before.sql" || die "pg_dump of the branch failed"

  echo "2. extensions and schemas"
  {
    section "$INV" schemas | while read -r s; do
      case "$s" in pg_*|information_schema|public) continue ;; esac
      printf 'CREATE SCHEMA IF NOT EXISTS %s;\n' "\"$s\""
    done
    section "$INV" extensions | while IFS=$'\t' read -r name ver schema; do
      [ "$schema" = public ] && continue   # extensions living in public come back with the dump
      [ "$name" = plpgsql ] && continue
      printf 'DO $o1$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = %s) THEN BEGIN CREATE EXTENSION %s WITH SCHEMA %s; EXCEPTION WHEN OTHERS THEN RAISE WARNING %s, SQLERRM; END; END IF; END $o1$;\n' \
        "'$name'" "\"$name\"" "\"$schema\"" "'o1: extension $name not created: %'"
    done
  } > "$WORK/10-extensions.sql"
  psqlq -f "$WORK/10-extensions.sql" || die "extensions step failed"

  echo "3. rebuild public in one transaction"
  grep -q '^CREATE SCHEMA public;' "$DUMP" && dump_creates=1 || dump_creates=0
  {
    echo "DROP SCHEMA IF EXISTS public CASCADE;"
    [ $dump_creates = 1 ] || echo "CREATE SCHEMA public;"
    if [ $local_test = 1 ]; then
      for r in anon authenticated service_role; do
        printf 'DO $o1$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = %s) THEN CREATE ROLE %s NOLOGIN; END IF; END $o1$;\n' "'$r'" "$r"
      done
    fi
  } > "$WORK/20-drop.sql"
  cat > "$WORK/21-grants.sql" <<'SQL'
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
SQL
  {
    echo "SET search_path = pg_catalog;"
    section "$INV" auth_storage_triggers_ddl | while IFS=$'\t' read -r tbl name ddl; do
      printf 'DROP TRIGGER IF EXISTS %s ON %s;\n%s\n' "\"$name\"" "$tbl" "$ddl"
    done
    section "$INV" storage_policies_ddl | while IFS=$'\t' read -r tbl name ddl; do
      printf 'DROP POLICY IF EXISTS %s ON %s;\n%s\n' "\"$name\"" "$tbl" "$ddl"
    done
    section "$INV" publication_tables | while IFS=$'\t' read -r pub schema tbl; do
      [ "$schema" = public ] || continue
      printf 'DO $o1$ BEGIN IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = %s) AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = %s AND schemaname = %s AND tablename = %s) THEN ALTER PUBLICATION %s ADD TABLE %s.%s; END IF; END $o1$;\n' \
        "'$pub'" "'$pub'" "'$schema'" "'$tbl'" "\"$pub\"" "\"$schema\"" "\"$tbl\""
    done
  } > "$WORK/30-auth-storage.sql"
  {
    echo '\set ON_ERROR_STOP on'
    echo "\\i $WORK/20-drop.sql"
    echo "\\i $DUMP"
    echo "\\i $WORK/21-grants.sql"
    echo "\\i $WORK/30-auth-storage.sql"
  } > "$WORK/run.sql"
  if ! psqlq --single-transaction -f "$WORK/run.sql" > "$WORK/apply.log" 2>&1; then
    tail -20 "$WORK/apply.log" | sed "s#$url#<db-url>#g" >&2
    die "the rebuild failed and was rolled back (one transaction); the branch is as before. Log: $WORK/apply.log"
  fi
fi

echo "4. fingerprint against production"
"$BIN/psql" "$url" -X -f "$O1/scripts/o1/prod-inventory.sql" > "$WORK/branch-inventory.txt" 2>"$WORK/inventory.err" || die "inventory on the branch failed: $(tail -3 "$WORK/inventory.err")"
report="$EVD/$label-$ts.md"
{
  echo "# Branch parity: o1-$label, $ts"
  echo
  echo "Production inventory: $(shasum -a 256 "$INV" | cut -c1-16); dump: $([ -f "$DUMP" ] && shasum -a 256 "$DUMP" | cut -c1-16)"
  echo
  total=0
  for s in extensions auth_storage_triggers_ddl storage_policies_ddl publication_tables fp_tables fp_functions fp_policies fp_triggers fp_views fp_grants fp_rls; do
    d="$(diff <(section "$INV" "$s" | sort) <(section "$WORK/branch-inventory.txt" "$s" | sort) | grep -E '^[<>]' | sed -e 's/^</prod only:/' -e 's/^>/branch only:/')"
    n=$(printf '%s' "$d" | grep -c . || true)
    total=$((total + n))
    echo "## $s: $n difference(s)"
    [ "$n" -gt 0 ] && { echo '```'; printf '%s\n' "$d" | cut -c1-300; echo '```'; }
  done
  echo
  echo "TOTAL: $total"
} > "$report"
grep -E '^## |^TOTAL' "$report"
echo "report: $report"
