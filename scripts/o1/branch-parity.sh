#!/bin/bash
# Run O1: rebuild a dev branch's public schema from production's (RUN-O1-PROMPT section 2b, step 4).
#   scripts/o1/branch-parity.sh scratch|dev --yes      rebuild o1-scratch or o1-dev (destructive on that branch only)
#   scripts/o1/branch-parity.sh --local-test <url>     same steps on a local throwaway cluster (127.0.0.1 only)
#   scripts/o1/branch-parity.sh --fingerprint scratch|dev   only compare the branch against the production inventory
# Inputs (owner gate G3, 2026-10-17): KPQ/prod-public.sql and KPQ/prod-inventory.txt.
#   prod-public.sql is NOT a pg_dump: it is a schema-only copy of the production public schema generated read-only from
#   the production catalogs (no data, no owners, no CREATE SCHEMA public). Its tables and sequences start from REVOKE
#   ALL and explicit GRANTs; the functions it does not grant explicitly rely on Supabase's default privileges, which
#   therefore must be active while it is applied.
#   prod-inventory.txt is scripts/o1/prod-inventory.sql run read-only on production.
# Steps: refuse the production ref; save the branch's public schema; create missing extensions and schemas;
# in ONE transaction: DROP SCHEMA public CASCADE (it also drops the schema's default privileges), CREATE SCHEMA public
# with Supabase's grants and default privileges, apply prod-public.sql (ON_ERROR_STOP), then recreate only what the
# CASCADE removed outside public: the auth.* triggers whose function lives in public (today on_auth_user_created_blindtest),
# a storage policy only when it is missing (created in a DO block that turns a privilege refusal into a WARNING:
# postgres does not own storage.buckets or storage.objects, supabase_storage_admin does), and the publication
# membership of public tables. Storage triggers are never touched; no cron jobs. Then fingerprint the branch against
# the production inventory: zero difference, or each one listed for the LEDGER.
# If the copy file ever does carry CREATE SCHEMA public (a real pg_dump), the default privileges are set after it.
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
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
SQL
  {
    echo "SET search_path = pg_catalog;"
    # Triggers: only those whose function lives in public (DROP SCHEMA public CASCADE removed them). Never DROP:
    # create when missing. Storage triggers call storage.* functions: untouched.
    section "$INV" auth_storage_triggers_ddl | while IFS=$'\t' read -r tbl name ddl; do
      case "$ddl" in *"FUNCTION public."*) ;; *) continue ;; esac
      t_schema="${tbl%%.*}"; t_name="${tbl#*.}"
      printf 'DO $o1$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = %s AND c.relname = %s AND t.tgname = %s) THEN EXECUTE %s; END IF; END $o1$;\n' \
        "'$t_schema'" "'$t_name'" "'$name'" "\$ddl\$$ddl\$ddl\$"
    done
    # Storage policies: no DROP; create only when missing; a privilege refusal becomes a WARNING.
    section "$INV" storage_policies_ddl | while IFS=$'\t' read -r tbl name ddl; do
      p_schema="${tbl%%.*}"; p_table="${tbl#*.}"
      printf 'DO $o1$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = %s AND tablename = %s AND policyname = %s) THEN BEGIN EXECUTE %s; EXCEPTION WHEN OTHERS THEN RAISE WARNING %s, SQLERRM; END; END IF; END $o1$;\n' \
        "'$p_schema'" "'$p_table'" "'$name'" "\$ddl\$$ddl\$ddl\$" "'o1: storage policy $name not created: %'"
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
    if [ $dump_creates = 0 ]; then
      # The copy relies on the default privileges while it is applied: set them first.
      echo "\\i $WORK/21-grants.sql"
      echo "\\i $DUMP"
    else
      echo "\\i $DUMP"
      echo "\\i $WORK/21-grants.sql"
    fi
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
