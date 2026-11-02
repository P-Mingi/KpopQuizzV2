#!/usr/bin/env bash
# session-rehearsal.sh (run O1): plays every part of session.sh, twice each, on a throwaway local Postgres 18 cluster built from
# production's schema copy. It never connects to Supabase. For the integrator, not for the owner.
#
#     bash docs/launch/o1/session-rehearsal.sh --prod-copy <path to KPQ prod-public.sql>
#
# The base: the platform part of docs/o1/contracts/schema.base.sql (roles, auth, storage), the auth and storage columns Supabase
# has and the launch files write, production's schema copy (schema only, no data), the rows part of schema.base.sql, then what was
# applied in production since the copy: S4 (2026-10-23) and Mission U part D (2026-10-27).
# Then, in the order of OWNER-NOW.md: B1 B2 B3 D E1 E2 G J1 J2 J3 J4 J5. Each part runs twice: the second run must change nothing and
# say OK. "Nothing" is read, not assumed: the schema (pg_dump --schema-only, grants included) and every table's rows (count and md5
# of the sorted rows; sequences are left out, an insert that meets a conflict still takes a number) before and after the second run.
# The owner's steps between parts are simulated where the database sees them (the 31 Team auth users of step 40); the others (a
# throwaway quiz, a deploy, a flag) do not touch the database.
# Stops that must happen are checked too: J2 before the Team users, G and J4 on a missing K1 or A1 file (pointed at a path that does
# not exist, so the stop stays checked once the files are on main), and a check that finds a KO.
# Lot K2 (021d) is its own small session after G: the rehearsal runs it last, on a fixture of the rows production holds and this base does not
# (docs/launch/o1/K2-rehearsal-fixture.sql: the target groups, the 021b rows), checks two refusals (a stray idol in a target group, a minor in
# the list), runs it twice and reads the size of the Kpopdle pool from V-K2.
# A file of lots K1 (021a, 021c, 021b) or A1 runs for real as soon as it is on the branch. While it is not, the rehearsal uses a stand-in it
# writes in its work folder (021a: the two columns of the contract, empty; 021c, 021b and A1: no change; 023 for a real L13: the contract's DDL).
# Everything else is the repository's files.
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
cat >"$WORK/K1a-stand-in.sql" <<'EOF'
-- Rehearsal stand-in for 021a of lot K1 (not on main yet): the two columns of the contract, no value.
alter table public.idols add column if not exists gender text check (gender in ('female', 'male'));
alter table public.idols add column if not exists debut_year integer;
EOF
printf -- '-- Rehearsal stand-in for 021c of lot K1 (not on the branch): no change.\nselect 1;\n' >"$WORK/K1c-stand-in.sql"
printf -- '-- Rehearsal stand-in for 021b of lot K1 (not on main yet): activates nobody.\nselect 1;\n' >"$WORK/K1b-stand-in.sql"
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
# again <part arguments>: the second run of a part; it must say OK and leave the schema and every row as the first run left them.
fingerprint() {
  pg_dump "$PROD_DB_URL" --schema-only --no-owner 2>>"$WORK/build.log" | grep -vE '^\\(un)?restrict ' >"$1.schema"
  psql "$PROD_DB_URL" -X -q -At -F ' ' -v ON_ERROR_STOP=1 >"$1.rows" 2>>"$WORK/build.log" <<'SQL'
select format('select %L, count(*), md5(coalesce(string_agg(t::text, %L order by t::text), %L)) from %I.%I t', n.nspname || '.' || c.relname, chr(10), '', n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p') and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
order by n.nspname, c.relname
\gexec
SQL
}
again() {
  fingerprint "$WORK/fp-before"
  part "$@"
  fingerprint "$WORK/fp-after"
  if cmp -s "$WORK/fp-before.schema" "$WORK/fp-after.schema" && cmp -s "$WORK/fp-before.rows" "$WORK/fp-after.rows" && [ -s "$WORK/fp-after.rows" ]; then
    pass "$1 (run $n): the second run changed nothing ($(wc -l <"$WORK/fp-after.rows" | tr -d ' ') tables, same rows; same schema and grants)"
  else
    fail "$1 (run $n): the second run changed the database"
    diff "$WORK/fp-before.schema" "$WORK/fp-after.schema" | head -20 | sed 's/^/    schema /'
    diff "$WORK/fp-before.rows" "$WORK/fp-after.rows" | grep '^[<>]' | cut -d' ' -f1-3 | head -20 | sed 's/^/    rows /'
  fi
}
n=0
# A stand-in only for a lot file that is not on the branch; the stops below point at a file that does not exist.
STAND=""
[ -f docs/pending-migrations/multisite/021a-k1-idol-gender-debut.sql ] || STAND="$STAND KPQ_K1A_SQL=$WORK/K1a-stand-in.sql"
[ -f docs/pending-migrations/multisite/021c-k1-idol-corrections.sql ] || STAND="$STAND KPQ_K1C_SQL=$WORK/K1c-stand-in.sql"
[ -f docs/pending-migrations/multisite/021b-k1-idol-activate.sql ] || STAND="$STAND KPQ_K1B_SQL=$WORK/K1b-stand-in.sql"
[ -f docs/pending-migrations/multisite/launch/L13-A1-character-facts.sql ] || STAND="$STAND KPQ_A1_SQL=$WORK/A1-stand-in.sql"
for p in B1 B2 B3 D E1 E2; do part "$p" 0 "terminée : tout est OK"; again "$p" 0 "terminée : tout est OK"; done
part G 1 "021a-k1-idol-gender-debut.sql : fichier absent de main" "KPQ_K1A_SQL=$WORK/absent/021a-k1-idol-gender-debut.sql"
part G 1 "021c-k1-idol-corrections.sql : fichier absent de main" $STAND "KPQ_K1C_SQL=$WORK/absent/021c-k1-idol-corrections.sql"
part G 1 "021b-k1-idol-activate.sql : fichier absent de main" $STAND "KPQ_K1B_SQL=$WORK/absent/021b-k1-idol-activate.sql"
part G 0 "terminée : tout est OK" $STAND; again G 0 "terminée : tout est OK" $STAND
part J1 0 "terminée : tout est OK"; again J1 0 "terminée : tout est OK"
part J2 1 "V-TEAM : une ligne KO"
# Step 40, as team-auth.mjs leaves it: the 31 Team auth users, confirmed, with the addresses L02 looks up.
grep -o "[a-z0-9_]*@team\.bunnyverse\.org" docs/pending-migrations/multisite/launch/L02-K2-team-accounts.sql | sort -u >"$WORK/team.txt"
python3 - "$WORK/team.txt" >"$WORK/team.sql" <<'PY'
import sys
emails = [l.strip() for l in open(sys.argv[1]) if l.strip()]
print("insert into auth.users (email, email_confirmed_at, aud, role) values " + ", ".join(f"('{e}', now(), 'authenticated', 'authenticated')" for e in emails) + ";")
PY
psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$WORK/team.sql" >>"$WORK/build.log" 2>&1 && pass "step 40 simulated: $(wc -l <"$WORK/team.txt" | tr -d ' ') Team auth users" || fail "step 40 simulated"
for p in J2 J3; do part "$p" 0 "terminée : tout est OK"; again "$p" 0 "terminée : tout est OK"; done
part J4 1 "L13-A1-character-facts.sql : fichier absent de main" "KPQ_A1_SQL=$WORK/absent/L13-A1-character-facts.sql"
# L13 needs the two tables of O1's 023. While 023 is not on the branch, the DDL of the contract (dle-a1-characters.md, part 2) stands in for it.
if [ -f docs/pending-migrations/multisite/launch/L13-A1-character-facts.sql ] && [ ! -f docs/pending-migrations/multisite/023-dle-otakudle.sql ]; then
  awk '/^```sql$/{n++; next} /^```$/{if(n==1) exit} n==1' docs/o1/contracts/dle-a1-characters.md >"$WORK/023-stand-in.sql"
  psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$WORK/023-stand-in.sql" >>"$WORK/build.log" 2>&1 && pass "stand-in for 023: the two tables of the contract" || fail "stand-in for 023"
fi
part J4 0 "terminée : tout est OK" $STAND; again J4 0 "terminée : tout est OK" $STAND
# A difference no file repairs stops the part: award_xp opened to anon again (an S4 function) makes V-S4 fail at the end of J4.
reopen() { psql "$PROD_DB_URL" -X -q -c "do \$\$ declare f regprocedure; begin for f in select oid::regprocedure from pg_proc where pronamespace = 'public'::regnamespace and proname = 'award_xp' loop execute format('$1 execute on function %s $2 anon', f); end loop; end \$\$;" >/dev/null 2>&1; }
reopen grant to
part J4 1 "V-S4 : une des 28 fonctions" $STAND
reopen revoke from
part J4 0 "terminée : tout est OK" $STAND
# Otakudle on the real L04 and L13 (the 750 characters of the 50 series, CR-023): 584 with the 7 columns, 113 targets (the TOP200 with a voice actor, seen by every answer).
part J4 0 "ok | personnages avec les 7 colonnes (information) | 584" $STAND
# The launch-day activation, twice: the second run must leave the epoch and the bank alone. Then J4 once more: running a part again after it stays a no-op.
# Production's schema copy has no idol row, so the real 021a stores nothing here and the real idol pool cannot be proven in this rehearsal (87 and 108 come from the production snapshot of the lots).
# What can be proven: with no idol L14 stops and names the game, and neither game changes; then, on stand-in idols written here, the step, its check and a second run.
part J5 1 "L14 kpopdle-idol: dle_pool_too_small: 0 targets, 40 needed"
[ "$(psql "$PROD_DB_URL" -X -q -At -c "select count(*) from public.dle_games where active or epoch is not null")" = 0 ] && [ "$(psql "$PROD_DB_URL" -X -q -At -c "select count(*) from public.dle_schedule")" = 0 ] && pass "J5 stopped: neither game on, no epoch, no bank" || fail "J5 stopped but a game changed"
psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 >>"$WORK/build.log" 2>&1 <<'SQL' && pass "stand-in: 60 made-up adult idols, the real pool is not proven here" || fail "stand-in idols"
insert into public.groups (name, slug, fandom_name, display_color, text_color, record_label, generation, site_id)
select 'Stand-in ' || i, 'stand-in-' || i, 'fans ' || i, '#000000', '#FFFFFF', 'Label ' || i, '4th', 'kpop' from generate_series(1, 6) as i;
insert into public.idols (group_id, name, name_romanized, birth_date, nationality, positions, gender, debut_year, active, needs_review, ord, origin, created_at, updated_at)
select (select id from public.groups where slug = 'stand-in-' || (1 + i % 6)), 'Stand-in idol ' || i, 'Stand-in idol ' || i, make_date(1995 + i % 8, 3, 1), 'South Korea', '{}'::text[], case when i % 2 = 0 then 'female' else 'male' end, 2015 + i % 8, true, false, i, 'wikidata', now(), now()
from generate_series(1, 60) as i;
SQL
part J5 0 "ok | otakudle : la banque tient 365 jours | 365"
part J5 0 "ok | kpopdle-idol : la banque tient 365 jours | 365"; again J5 0 "ok | otakudle : cibles possibles, au moins le minimum du jeu | 113"
part J5 0 "ok | dle_day kpopdle-idol répond"
part J4 0 "terminée : tout est OK" $STAND
# ---- Lot K2 (owner order 2026-11-02): 021d, its own small session after G -------------------------------------------------------------
K2F=docs/pending-migrations/multisite/021d-k2-idols.sql
printf -- '-- Rehearsal stand-in for 021d of lot K2 (not on the branch): no change.\nselect 1;\n' >"$WORK/K2-stand-in.sql"
K2STAND=""
[ -f "$K2F" ] || K2STAND="KPQ_K2_SQL=$WORK/K2-stand-in.sql"
part K2 1 "021d-k2-idols.sql : fichier absent de main" "KPQ_K2_SQL=$WORK/absent/021d-k2-idols.sql"
psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 -f docs/launch/o1/K2-rehearsal-fixture.sql >>"$WORK/build.log" 2>&1 && pass "K2 fixture: the target groups and the 021b rows" || fail "K2 fixture"
if [ -f "$K2F" ]; then
  K2G="$(grep -m1 -A1 'insert into k2_groups' "$K2F" | tail -1 | sed -E "s/^ *\('([^']*)'.*/\1/")"
  psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 -c "insert into public.idols (group_id, name, positions, birth_date, origin) select id, 'Stray', '{}', date '1990-01-01', 'curator' from public.groups where slug = '$K2G'" >>"$WORK/build.log" 2>&1
  part K2 1 "refused: target group(s) already hold idol rows" ; : # a stray idol in a target group stops the file
  psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 -c "delete from public.idols where name = 'Stray'" >>"$WORK/build.log" 2>&1
  python3 - "$K2F" "$WORK/K2-minor.sql" <<'PY'
import re, sys
t = open(sys.argv[1], encoding='utf8').read()
i = t.index('insert into k2_idols')
j = t.index("date '", i)
open(sys.argv[2], 'w', encoding='utf8').write(t[:j] + "date '2015-06-01'" + t[t.index("'", j + 6) + 1:])
PY
  part K2 1 "under 18 on the day of the run" "KPQ_K2_SQL=$WORK/K2-minor.sql"   # a minor in the list stops the file, nothing written
fi
part K2 0 "terminée : tout est OK" $K2STAND; again K2 0 "terminée : tout est OK" $K2STAND
K2POOL="$(grep -h 'au total' "$WORK/out-K2-$n.txt" | sed -E 's/^ *//')"
echo "INFO K2 pool on this base: $K2POOL"
echo "INFO K2 rows present: $(psql "$PROD_DB_URL" -X -q -At -c "select count(*) filter (where origin = 'wikidata' and active) from public.idols") active wikidata idols, $(psql "$PROD_DB_URL" -X -q -At -c "select count(*) from public.dle_src_kpop_idol") rows in dle_src_kpop_idol"
leaks="$(cat "$WORK"/out-*.txt | grep -v '^Journal complet' | grep -ciE '@|[0-9a-f]{8}-[0-9a-f]{4}-' || true)"
[ "$leaks" = 0 ] && pass "no e-mail or id printed by any part" || fail "$leaks printed line(s) hold an e-mail or an id"

echo ""
if [ "$fails" = 0 ]; then echo "rehearsal: every step passed"; exit 0; fi
echo "rehearsal: $fails step(s) failed"; exit 1
