#!/bin/sh
# Replay the pending v12-g2 SQL files on a LOCAL scratch Postgres, twice (idempotency), and print
# the counts. The project database is only READ (anon key) to copy the current rows into the
# scratch database. Nothing is applied to the project.
#   sh scripts/v12/catalogue/local-replay.sh <scratch dir>      (from apps/quiz)
# Needs a local Postgres (initdb, pg_ctl, psql). The scratch cluster listens on 127.0.0.1 only and
# is stopped and deleted at the end.
set -e
D="$1"; PORT=54329
[ -n "$D" ] || { echo "usage: local-replay.sh <scratch dir>" >&2; exit 2; }
PGBIN="$(dirname "$(command -v pg_ctl)")"
mkdir -p "$D"; rm -rf "$D/g2-pg"
"$PGBIN/initdb" -D "$D/g2-pg" -U g2 --auth=trust > /dev/null
"$PGBIN/pg_ctl" -D "$D/g2-pg" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$D/g2-pg.log" -w start > /dev/null
trap '"$PGBIN/pg_ctl" -D "$D/g2-pg" -m fast stop > /dev/null; rm -rf "$D/g2-pg" "$D/g2-pg.log" "$D/g2-seed.sql"' EXIT
run() { "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U g2 -d postgres -v ON_ERROR_STOP=1 -q -At "$@"; }

run -f scripts/v12/catalogue/local-schema.sql
npx tsx scripts/v12/catalogue/export-seed.mts "$D/g2-seed.sql"
run -f "$D/g2-seed.sql"

counts() {
  run -F ' | ' <<'SQL'
select 'songs', count(*), 'active', count(*) filter (where status = 'active'), 'soundtrack', count(*) filter (where status = 'soundtrack') from songs;
select 'groups', count(*) from groups;
select 'year null', count(*) filter (where year is null), 'year 2026', count(*) filter (where year = 2026), 'year 2025', count(*) filter (where year = 2025), 'year <= 2017', count(*) filter (where year <= 2017) from songs where status = 'active';
select 'is_title_track true', count(*) filter (where is_title_track), 'true and curated', count(*) filter (where is_title_track and is_curated) from songs where status = 'active';
select 'language', coalesce(language, 'NULL'), count(*) from songs group by 2 order by 2;
select 'group playlists (10+ clean active songs)', count(*) from (select group_id from songs where status = 'active' and group_id is not null and title not ilike '%remix%' and title not ilike '%instrumental%' and title not ilike '%inst.%' and title not ilike '%karaoke%' group by 1 having count(*) >= 10) t;
select 'clean songs', g.slug, count(*) from songs s join groups g on g.id = s.group_id where g.slug in ('hearts2hearts', 'kickflip', 'rescene', 'nct-wish') and s.status = 'active' group by 2 order by 2;
select 'soundtrack rows with a group, curated or a tier', count(*) from songs where status = 'soundtrack' and (group_id is not null or is_curated or tier is not null);
select 'status check', pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.songs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~* '\mstatus\M';
SQL
}

echo "== before"; counts
for round in 1 2; do
  for f in ../../docs/pending-migrations/v12-g2-0*.sql; do run -f "$f"; done
  echo "== after round $round (files: $(ls ../../docs/pending-migrations/v12-g2-0*.sql | wc -l | tr -d ' '))"; counts
done
echo "== done: every file ran twice without an error"
