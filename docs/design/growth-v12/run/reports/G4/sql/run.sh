#!/bin/sh
# G4: check docs/pending-migrations/v12-g4-live.sql and v12-g4-party-rls.sql on a LOCAL
# scratch Postgres. It creates its own cluster in a temp folder, on its own port, and
# deletes it at the end. It never connects to anything else (no host, no URL, no env).
#
#   sh docs/design/growth-v12/run/reports/G4/sql/run.sh            (from the repo root)
#
# Needs the Postgres binaries (initdb, pg_ctl, psql, pgbench). PGBIN picks a version.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../../../../.." && pwd)
PGBIN=${PGBIN:-/opt/homebrew/opt/postgresql@18/bin}
PORT=${G4_PG_PORT:-54599}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/g4-pg.XXXXXX")
DATA="$WORK/data"
SOCK="$WORK"
PSQL="$PGBIN/psql -X -q -v ON_ERROR_STOP=1 -h $SOCK -p $PORT -U g4 -d g4"

cleanup() {
  "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"$PGBIN/initdb" -D "$DATA" -U g4 --auth=trust -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
"$PGBIN/createdb" -h "$SOCK" -p "$PORT" -U g4 g4

echo "== $("$PGBIN/postgres" --version), local scratch cluster, unix socket only"
echo "== bootstrap (roles and the realtime stub a Supabase project already has)"
$PSQL -f "$HERE/local-bootstrap.sql"

echo "== apply v12-g4-live.sql"
$PSQL -f "$ROOT/docs/pending-migrations/v12-g4-live.sql" >/dev/null
echo "== apply it a second time (idempotent)"
$PSQL -f "$ROOT/docs/pending-migrations/v12-g4-live.sql" >/dev/null

echo "== rules"
$PSQL -f "$HERE/local-check.sql"

echo "== 60 phones join one room at the same time (pgbench, 20 connections x 3): the cap holds"
ROOM=$($PSQL -At -c "SELECT public.live_create_room('PQRSTU', 'h', 'all', 'All K-pop', 5, 15, '[]'::jsonb, true, 'ipb')")
cat > "$WORK/join.sql" <<EOF
SELECT public.live_join('$ROOM'::uuid, md5(random()::text || clock_timestamp()::text), 'fan', 0, 50);
EOF
"$PGBIN/pgbench" -h "$SOCK" -p "$PORT" -U g4 -n -c 20 -j 4 -t 3 -f "$WORK/join.sql" g4 >/dev/null 2>&1
$PSQL -At -c "SELECT 'players in the room: ' || count(*) || ', distinct names: ' || count(DISTINCT lower(nickname)) FROM public.live_players WHERE room_id = '$ROOM'"
test "$($PSQL -At -c "SELECT count(*) FROM public.live_players WHERE room_id = '$ROOM'")" = "50"
test "$($PSQL -At -c "SELECT count(DISTINCT lower(nickname)) FROM public.live_players WHERE room_id = '$ROOM'")" = "50"

echo "== 50 phones answer 4 times each at the same time: one answer per player"
$PSQL -c "SELECT public.live_start_round('$ROOM'::uuid, 1, 1)" >/dev/null 2>&1 || true
$PSQL -c "UPDATE public.live_rooms SET questions = (SELECT jsonb_agg(jsonb_build_object('correct', 1)) FROM generate_series(1, 5)) WHERE id = '$ROOM'" >/dev/null
$PSQL -c "SELECT public.live_start_round('$ROOM'::uuid, 1, 1)" >/dev/null
cat > "$WORK/answer.sql" <<EOF
\set n random(1, 50)
SELECT public.live_submit_answer('PQRSTU', (SELECT token_hash FROM public.live_players WHERE room_id = '$ROOM' ORDER BY joined_at OFFSET :n - 1 LIMIT 1), (:n % 4)::integer);
EOF
"$PGBIN/pgbench" -h "$SOCK" -p "$PORT" -U g4 -n -c 20 -j 4 -t 40 -f "$WORK/answer.sql" g4 >/dev/null 2>&1
$PSQL -At -c "SELECT 'answers: ' || count(*) || ', players who answered: ' || count(DISTINCT player_id) FROM public.live_answers WHERE room_id = '$ROOM'"
test "$($PSQL -At -c "SELECT count(*) = count(DISTINCT player_id) FROM public.live_answers WHERE room_id = '$ROOM'")" = "t"

echo "== apply v12-g4-party-rls.sql with no party table (production today): nothing to do"
$PSQL -f "$ROOT/docs/pending-migrations/v12-g4-party-rls.sql"

echo "== the same file where the tables exist with the policies of migration 059"
$PSQL <<'EOF'
CREATE TABLE public.party_rooms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text);
CREATE TABLE public.party_players (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid);
ALTER TABLE public.party_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "party_rooms_select" ON public.party_rooms FOR SELECT USING (true);
CREATE POLICY "party_rooms_insert" ON public.party_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "party_rooms_update" ON public.party_rooms FOR UPDATE USING (true);
CREATE POLICY "party_players_select" ON public.party_players FOR SELECT USING (true);
CREATE POLICY "party_players_insert" ON public.party_players FOR INSERT WITH CHECK (true);
CREATE POLICY "party_players_update" ON public.party_players FOR UPDATE USING (true);
SET ROLE anon;
INSERT INTO public.party_rooms (code) VALUES ('before');
RESET ROLE;
EOF
echo "   (before: anon inserted a row)"
$PSQL -f "$ROOT/docs/pending-migrations/v12-g4-party-rls.sql"
$PSQL -f "$ROOT/docs/pending-migrations/v12-g4-party-rls.sql" >/dev/null
$PSQL <<'EOF'
DO $$
DECLARE n integer;
BEGIN
  SET ROLE anon;
  SELECT count(*) INTO n FROM public.party_rooms;
  ASSERT n = 1, 'anon still reads';
  BEGIN
    INSERT INTO public.party_rooms (code) VALUES ('after');
    RAISE EXCEPTION 'anon still inserts';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.party_rooms SET code = 'x';
    RAISE EXCEPTION 'anon still updates';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.party_players (room_id) VALUES (gen_random_uuid());
    RAISE EXCEPTION 'anon still inserts players';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  RAISE NOTICE 'party tables: read only for the public keys: OK';
END;
$$;
EOF

echo "== ALL LOCAL SQL CHECKS PASSED"
