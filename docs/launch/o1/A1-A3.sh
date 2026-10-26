#!/usr/bin/env bash
# A1-A3.sh (run O1, owner decision D-124): RUNBOOK steps A1 (set up), A2 (backup) and A3 (baseline) in one command.
#
# Run it from the repository root, in your own terminal:
#     bash docs/launch/o1/A1-A3.sh --dry-run     # prints the steps, touches nothing, asks nothing
#     bash docs/launch/o1/A1-A3.sh               # the real run
#
# What it does, in order:
#   A1  makes ~/kpq-launch (mode 700), checks psql and pg_dump are 15 or later, asks the production database password
#       (read -rs: never echoed, never written to disk, never in a process argument: it goes through PGPASSWORD in the
#       environment of each psql or pg_dump call only), proves the connection (current_database() is postgres).
#   A2  pg_dump -Fc of the schemas public and auth into ~/kpq-launch/pre-o1-<UTC date>.dump (mode 600), checks it is
#       not empty and that pg_restore --list reads it.
#   A3  VERIFY V0: the baseline numbers into ~/kpq-launch/v0.txt and the 12 function signatures into
#       ~/kpq-launch/functions-before.txt; VERIFY V1: the first snapshot of the 60 parity URLs of kpopquiz.org into
#       ~/kpq-launch/before (anonymous GET, no cookie).
# It prints PASS and FAIL lines, the backup file name and size, and nothing else. Every query it runs is read-only.
#
# Target: it refuses to run unless the target is the production project of the repository (scripts/o1/env.sh, PROD_REF).
# Direct connection (default): host db.<ref>.supabase.co, user postgres. If your network has no IPv6, use the session pooler:
#     KPQ_DB_HOST=<your pooler host> KPQ_DB_USER=postgres.<ref> bash docs/launch/o1/A1-A3.sh
# (the pooler host must end in .pooler.supabase.com). Optional: KPQ_DB_PORT (default 5432).
#
# The A2 part 1 of the RUNBOOK (the Supabase dashboard backup of the last 24 hours) is a dashboard step: the script prints one
# TODO line to remind you.

set -euo pipefail

PROD_REF="rdkgouofytwfdpbxbzio"
DB_HOST="${KPQ_DB_HOST:-db.${PROD_REF}.supabase.co}"
DB_PORT="${KPQ_DB_PORT:-5432}"
DB_USER="${KPQ_DB_USER:-postgres}"
DB_NAME="postgres"
WORK_DIR="$HOME/kpq-launch"
DAY="$(date -u +%F)"
DUMP_FILE="$WORK_DIR/pre-o1-$DAY.dump"
URLS_FILE="apps/quiz/e2e/o1/parity/urls.txt"
SITE_ORIGIN="https://kpopquiz.org"

DRY=0
case "${1:-}" in
  "") ;;
  --dry-run) DRY=1 ;;
  -h|--help) sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "FAIL usage: A1-A3.sh [--dry-run]"; exit 2 ;;
esac

# The password lives in this shell variable only. It is not exported.
DBPW=""
trap 'DBPW=""; unset DBPW' EXIT
unset PGPASSWORD PGSERVICE PGDATABASE PGUSER PGHOST PGPORT PROD_DB_URL 2>/dev/null || true

fail() { echo "FAIL $*"; exit 1; }
pass() { echo "PASS $*"; }

# One psql call with the password in its environment only. Arguments: the SQL, or "-f" and a file.
psql_prod() {
  PGPASSWORD="$DBPW" PGSSLMODE=require PGCONNECT_TIMEOUT=15 \
    psql -X -At -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
}

# ---- the target must be the production project ------------------------------------------------------------------------------
target_ok=0
if [ "$DB_HOST" = "db.${PROD_REF}.supabase.co" ] && [ "$DB_USER" = "postgres" ]; then target_ok=1; fi
case "$DB_HOST" in
  *.pooler.supabase.com) if [ "$DB_USER" = "postgres.${PROD_REF}" ]; then target_ok=1; fi ;;
esac
[ "$target_ok" = 1 ] || fail "target: host and user do not name the production project (ref ${PROD_REF}); nothing was run"
case "$DB_PORT" in ''|*[!0-9]*) fail "target: KPQ_DB_PORT must be a number" ;; esac

# ---- the repository root -----------------------------------------------------------------------------------------------------
[ -f docs/launch/o1/A1-A3.sh ] || fail "location: run it from the repository root (docs/launch/o1/A1-A3.sh not found)"
[ -f "$URLS_FILE" ] || fail "location: $URLS_FILE not found"

# ---- the V0 queries (VERIFY.md section V0) -----------------------------------------------------------------------------------
V0_QUERIES=(
  "select count(*) from public.profiles"
  "select coalesce(sum(xp),0) from public.profiles"
  "select count(*), coalesce(sum(play_count),0) from public.quizzes"
  "select count(*) from public.plays"
  "select count(*) from public.groups"
  "select count(*) from public.quiz_bank"
  "select count(*) from public.qotd_log"
  "select count(*) from public.badge_definitions"
  "select count(*) from public.quizzes q where q.play_count <> (select count(*) from public.plays p where p.quiz_id = q.id)"
)
FUNCS_QUERY="select proname, pg_get_function_identity_arguments(oid), prosecdef, proconfig, proacl from pg_proc where pronamespace='public'::regnamespace and proname in ('award_xp','record_play','handle_new_quiz','increment_like_count','decrement_like_count','notify_badge_earned','notify_group_quiz_alerts','cast_duel_vote','passport_on_battle_result','record_bt_play','merge_anon_passport','ensure_daily_quiz') order by proname, oid"

if [ "$DRY" = 1 ]; then
  echo "DRY RUN: nothing is run, nothing is asked, nothing is written."
  echo "target: host $DB_HOST, port $DB_PORT, user $DB_USER, database $DB_NAME (production ref $PROD_REF): accepted"
  echo "A1  mkdir -p $WORK_DIR; chmod 700 $WORK_DIR"
  echo "A1  psql --version and pg_dump --version: both major 15 or later"
  echo "A1  read -rs the production database password into a shell variable (not exported, not written, not in any argument)"
  echo "A1  PGPASSWORD=<password> psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'select current_database()'   expect postgres"
  echo "A2  PGPASSWORD=<password> pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -Fc --no-owner --schema=public --schema=auth -f $DUMP_FILE"
  echo "A2  check the file is not empty; pg_restore --list reads it; chmod 600; print its name and size"
  echo "A3  V0: ${#V0_QUERIES[@]} read-only count queries into $WORK_DIR/v0.txt; the 12 function signatures into $WORK_DIR/functions-before.txt"
  echo "A3  V1: GET the $(grep -v '^#' "$URLS_FILE" | grep -c .) URLs of $URLS_FILE on $SITE_ORIGIN into $WORK_DIR/before"
  echo "TODO A2 part 1 (dashboard): Supabase, Database, Backups: a backup from the last 24 hours exists (note whether Point in Time Recovery is on)."
  exit 0
fi

# ---- A1 ----------------------------------------------------------------------------------------------------------------------
major_of() { sed -n 's/.* \([0-9][0-9]*\)\.[0-9].*/\1/p;s/.* \([0-9][0-9]*\) .*/\1/p' | head -n 1; }
command -v psql >/dev/null 2>&1 || fail "A1 tools: psql not found"
command -v pg_dump >/dev/null 2>&1 || fail "A1 tools: pg_dump not found"
command -v pg_restore >/dev/null 2>&1 || fail "A1 tools: pg_restore not found"
PSQL_MAJOR="$(psql --version | major_of)"
DUMP_MAJOR="$(pg_dump --version | major_of)"
case "$PSQL_MAJOR$DUMP_MAJOR" in ''|*[!0-9]*) fail "A1 tools: cannot read the psql or pg_dump version" ;; esac
if [ "$PSQL_MAJOR" -lt 15 ] || [ "$DUMP_MAJOR" -lt 15 ]; then
  fail "A1 tools: psql $PSQL_MAJOR and pg_dump $DUMP_MAJOR, the RUNBOOK needs 15 or later"
fi
pass "A1 tools: psql $PSQL_MAJOR, pg_dump $DUMP_MAJOR"

umask 077
mkdir -p "$WORK_DIR"
chmod 700 "$WORK_DIR"
pass "A1 work folder: $WORK_DIR"

printf 'Production database password (typed, not shown): ' >&2
IFS= read -rs DBPW
printf '\n' >&2
[ -n "$DBPW" ] || fail "A1 password: empty"

CURRENT_DB="$(psql_prod -c "select current_database()" 2>/dev/null)" || fail "A1 connection: could not connect to the target (host, user, password, or no IPv6: see the header for the pooler)"
[ "$CURRENT_DB" = "postgres" ] || fail "A1 connection: current_database() is not postgres"
pass "A1 connection: current_database() is postgres"

# ---- A2 ----------------------------------------------------------------------------------------------------------------------
if ! PGPASSWORD="$DBPW" PGSSLMODE=require PGCONNECT_TIMEOUT=15 \
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --schema=public --schema=auth -f "$DUMP_FILE" >/dev/null 2>&1; then
  rm -f "$DUMP_FILE"
  fail "A2 backup: pg_dump failed (a pg_dump older than the server also fails this way)"
fi
chmod 600 "$DUMP_FILE"
[ -s "$DUMP_FILE" ] || fail "A2 backup: the dump file is empty"
LIST_LINES="$(pg_restore --list "$DUMP_FILE" 2>/dev/null | wc -l | tr -d ' ')" || LIST_LINES=0
[ "${LIST_LINES:-0}" -ge 200 ] || fail "A2 backup: pg_restore --list reads fewer than 200 entries"
DUMP_SIZE="$(du -h "$DUMP_FILE" | awk '{print $1}')"
pass "A2 backup: $DUMP_FILE ($DUMP_SIZE)"

# ---- A3, V0 ------------------------------------------------------------------------------------------------------------------
V0_FILE="$WORK_DIR/v0.txt"
date -u > "$V0_FILE"
for s in "${V0_QUERIES[@]}"; do
  echo "$s" >> "$V0_FILE"
  psql_prod -c "$s" >> "$V0_FILE" 2>/dev/null || fail "A3 V0: a baseline query failed (see VERIFY.md V0); $V0_FILE is incomplete"
done
[ "$(wc -l < "$V0_FILE" | tr -d ' ')" -ge $(( ${#V0_QUERIES[@]} * 2 + 1 )) ] || fail "A3 V0: $V0_FILE has too few lines"
pass "A3 V0 baseline: $V0_FILE (${#V0_QUERIES[@]} queries)"

FUNCS_FILE="$WORK_DIR/functions-before.txt"
psql_prod -c "$FUNCS_QUERY" > "$FUNCS_FILE" 2>/dev/null || fail "A3 V0: the function list query failed"
FUNCS_ROWS="$(wc -l < "$FUNCS_FILE" | tr -d ' ')"
[ "$FUNCS_ROWS" = "12" ] || fail "A3 V0 functions: $FUNCS_FILE has $FUNCS_ROWS rows, expected 12"
pass "A3 V0 functions: $FUNCS_FILE (12 rows)"

# ---- A3, V1 ------------------------------------------------------------------------------------------------------------------
SNAP_DIR="$WORK_DIR/before"
mkdir -p "$SNAP_DIR"
N_OK=0
N_BAD=0
while IFS= read -r p; do
  [ -n "$p" ] || continue
  out="$SNAP_DIR/$(printf '%s' "$p" | tr '/?&=' '____').html"
  code="$(curl -sS -m 30 -o "$out" -w '%{http_code}' "$SITE_ORIGIN$p" 2>/dev/null)" || code="000"
  if [ "$code" = "200" ] && [ -s "$out" ]; then N_OK=$((N_OK + 1)); else N_BAD=$((N_BAD + 1)); fi
done < <(grep -v '^#' "$URLS_FILE" | grep .)
[ "$N_BAD" = 0 ] || fail "A3 V1 snapshot: $N_BAD of $((N_OK + N_BAD)) pages did not answer 200 (folder $SNAP_DIR)"
pass "A3 V1 snapshot: $N_OK pages in $SNAP_DIR"

echo "TODO A2 part 1 (dashboard): Supabase, Database, Backups: a backup from the last 24 hours exists (note whether Point in Time Recovery is on)."
echo "DONE A1 to A3. Backup: $DUMP_FILE ($DUMP_SIZE)"
