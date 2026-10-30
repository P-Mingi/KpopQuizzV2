#!/usr/bin/env bash
# session-rehearsal.sh (run O1): plays every part of session.sh, twice each, on a throwaway local Postgres 18 cluster built from
# production's schema copy. It never connects to Supabase. For the integrator, not for the owner.
#
#     bash docs/launch/o1/session-rehearsal.sh --prod-copy <path to KPQ prod-public.sql>
#
# The base: the platform part of docs/o1/contracts/schema.base.sql (roles, auth, storage), the auth and storage columns Supabase
# has and the launch files write, production's schema copy (schema only, no data), the rows part of schema.base.sql, then what was
# applied in production since the copy: S4 (2026-10-23) and Mission U part D (2026-10-27).
# Then, in the order of OWNER-NOW.md: B1 B2 B3 D E1 E2 G J1 J2 J3 J4. Each part runs twice: the second run must change nothing and
# say OK. The owner's steps between parts are simulated where the database sees them (the 31 Team auth users of step 40); the
# others (a throwaway quiz, a deploy, a flag) do not touch the database.
# Stops that must happen are checked too: J2 before the Team users, G and J4 while the K1 and A1 files are not on main, and a
# check that finds a KO.
# The files of lots K1 and A1 are not on main yet: the rehearsal uses two stand-ins it writes in its work folder (K1: the two
# columns of the contract, empty; A1: no change), and says so. Everything else is the repository's files.
#
# Prints PASS or FAIL per step and the parts' own output in its work folder. Exit 0 when every step passed. The cluster is stopped
# and its folder removed at the end, pass or fail (nothing keeps running).

set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT" || exit 2
COPY=""
[ "${1:-}" = "--prod-copy" ] && COPY="${2:-}"
[ -f "$COPY" ] || { echo "usage: bash docs/launch/o1/session-rehearsal.sh --prod-copy <prod-public.sql>"; exit 2; }

PG_BIN="${O1_PG_BIN:-/opt/homebrew/opt/postgresql@18/bin}"
export PATH="$PG_BIN:$PATH" LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
WORK="$(mktemp -d "${TMPDIR:-/tmp}/kpq-session-rehearsal.XXXXXX")"
PORT="$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
fails=0
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*"; fails=$((fails + 1)); }
cleanup() { pg_ctl -D "$WORK/data" -m fast -w stop >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$WORK/data" -U postgres -A trust -E UTF8 >/dev/null 2>&1 || { echo "FAIL initdb"; exit 1; }
pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" -w start >/dev/null || { echo "FAIL cluster start"; exit 1; }
ADMIN="postgresql://postgres@127.0.0.1:$PORT/postgres"
BASE="postgresql://postgres@127.0.0.1:$PORT/base"
run() { psql "$1" -X -q -v ON_ERROR_STOP=1 "${@:2}" >>"$WORK/build.log" 2>&1; }

# ---- the base -----------------------------------------------------------------------------------------------------------
B=docs/o1/contracts/schema.base.sql
P=$(grep -n '^-- Public tables' "$B" | cut -d: -f1)
R=$(grep -n '^-- Rows' "$B" | cut -d: -f1)
head -n $((P - 1)) "$B" >"$WORK/10-platform.sql"
tail -n +"$R" "$B" >"$WORK/40-rows.sql"
cat >"$WORK/15-platform-extra.sql" <<'EOF'
alter table auth.users add column if not exists instance_id uuid, add column if not exists aud text, add column if not exists role text,
  add column if not exists encrypted_password text, add column if not exists confirmation_token text, add column if not exists recovery_token text,
  add column if not exists email_change_token_new text, add column if not exists email_change text, add column if not exists raw_app_meta_data jsonb,
  add column if not exists raw_user_meta_data jsonb, add column if not exists banned_until timestamptz, add column if not exists updated_at timestamptz;
alter table storage.buckets add column if not exists file_size_limit bigint, add column if not exists allowed_mime_types text[],
  add column if not exists created_at timestamptz default now(), add column if not exists updated_at timestamptz default now();
alter table storage.objects enable row level security;
create extension if not exists pgcrypto with schema extensions;
EOF
run "$ADMIN" -c "create database base" &&
  run "$BASE" -f "$WORK/10-platform.sql" && run "$BASE" -f "$WORK/15-platform-extra.sql" && run "$BASE" -f "$COPY" &&
  run "$BASE" -f "$WORK/40-rows.sql" &&
  run "$BASE" --single-transaction -f docs/pending-migrations/s4/S4-revoke-public-execute.sql &&
  run "$BASE" --single-transaction -f docs/pending-migrations/account-deletion.sql &&
  run "$BASE" -f docs/launch/o1/V-S4-closed.sql || { echo "FAIL base (see the last lines below)"; tail -5 "$WORK/build.log"; exit 1; }
pass "base: production's schema copy, S4 and Mission U part D, V-S4 ok"

# ---- the stand-ins of lots K1 and A1 --------------------------------------------------------------------------------------
cat >"$WORK/K1-stand-in.sql" <<'EOF'
-- Rehearsal stand-in for the SQL of lot K1 (not on main yet): the two columns of the contract, no value.
alter table public.idols add column if not exists gender text check (gender in ('female', 'male'));
alter table public.idols add column if not exists debut_year integer;
EOF
printf -- '-- Rehearsal stand-in for the SQL of lot A1 (not on main yet): no change.\nselect 1;\n' >"$WORK/A1-stand-in.sql"

# ---- the parts --------------------------------------------------------------------------------------------------------------
"$PG_BIN/psql" "$ADMIN" -X -q -c "create database prod template base" >/dev/null || { echo "FAIL copy of the base"; exit 1; }
export KPQ_REHEARSAL=1 KPQ_LOG_DIR="$WORK/logs" PROD_DB_URL="postgresql://postgres@127.0.0.1:$PORT/prod"
part() {   # part <name> <expected exit> <grep that the output must hold> [env assignments...]
  local name="$1" want="$2" must="$3"; shift 3
  local out="$WORK/out-$name-$((++n)).txt"
  env "$@" bash docs/launch/o1/session.sh "$name" >"$out" 2>&1
  local got=$?
  if [ "$got" = "$want" ] && grep -q "$must" "$out"; then pass "$name (run $n): exit $got, \"$must\""
  else fail "$name (run $n): exit $got, expected $want and \"$must\""; sed 's/^/    /' "$out" | tail -12; fi
}
n=0
STAND="KPQ_K1_SQL=$WORK/K1-stand-in.sql KPQ_A1_SQL=$WORK/A1-stand-in.sql"
for p in B1 B2 B3 D E1 E2; do part "$p" 0 "terminée : tout est OK"; part "$p" 0 "terminée : tout est OK"; done
part G 1 "021-k1-idol-gender-debut.sql : fichier absent de main"
part G 0 "terminée : tout est OK" $STAND; part G 0 "terminée : tout est OK" $STAND
part J1 0 "terminée : tout est OK"; part J1 0 "terminée : tout est OK"
part J2 1 "V-TEAM : une ligne KO"
# Step 40, as team-auth.mjs leaves it: the 31 Team auth users, confirmed, with the addresses L02 looks up.
grep -o "[a-z0-9_]*@team\.bunnyverse\.org" docs/pending-migrations/multisite/launch/L02-K2-team-accounts.sql | sort -u >"$WORK/team.txt"
python3 - "$WORK/team.txt" >"$WORK/team.sql" <<'PY'
import sys
emails = [l.strip() for l in open(sys.argv[1]) if l.strip()]
print("insert into auth.users (email, email_confirmed_at, aud, role) values " + ", ".join(f"('{e}', now(), 'authenticated', 'authenticated')" for e in emails) + ";")
PY
psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$WORK/team.sql" >>"$WORK/build.log" 2>&1 && pass "step 40 simulated: $(wc -l <"$WORK/team.txt" | tr -d ' ') Team auth users" || fail "step 40 simulated"
for p in J2 J3; do part "$p" 0 "terminée : tout est OK"; part "$p" 0 "terminée : tout est OK"; done
part J4 1 "L13-A1-character-facts.sql : fichier absent de main"
part J4 0 "terminée : tout est OK" $STAND; part J4 0 "terminée : tout est OK" $STAND
# A difference no file repairs stops the part: award_xp opened to anon again (an S4 function) makes V-S4 fail at the end of J4.
reopen() { psql "$PROD_DB_URL" -X -q -c "do \$\$ declare f regprocedure; begin for f in select oid::regprocedure from pg_proc where pronamespace = 'public'::regnamespace and proname = 'award_xp' loop execute format('$1 execute on function %s $2 anon', f); end loop; end \$\$;" >/dev/null 2>&1; }
reopen grant to
part J4 1 "V-S4 : une des 28 fonctions" $STAND
reopen revoke from
part J4 0 "terminée : tout est OK" $STAND
leaks="$(cat "$WORK"/out-*.txt | grep -v '^Journal complet' | grep -ciE '@|[0-9a-f]{8}-[0-9a-f]{4}-' || true)"
[ "$leaks" = 0 ] && pass "no e-mail or id printed by any part" || fail "$leaks printed line(s) hold an e-mail or an id"

echo ""
if [ "$fails" = 0 ]; then echo "rehearsal: every step passed"; exit 0; fi
echo "rehearsal: $fails step(s) failed"; exit 1
