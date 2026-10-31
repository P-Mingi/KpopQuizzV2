#!/usr/bin/env bash
# prove-local.sh (lot A1): replays L13 on a throwaway local Postgres 18 cluster and prints the transcript. Never connects to anything else.
#   bash scripts/anime/a1/prove-local.sh <scratch folder> > docs/proofs/a1/local-postgres.txt
# Order: base schema, 001, 002a, 011, L01, the DDL of the contract, L04, the entity_sources rows of L05 (so L13 is seen next to them;
# the trivia rows of L05 need production's table, not the stand-in of schema.base.sql), then L13 twice,
# checks 1 to 3 of V-L13 (4 and 5 need O1's 023), the refusal of the rollback, the rollback twice, L13 again.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WORK="${1:?scratch folder}/proof"
PORT=54519
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
M="$ROOT/docs/pending-migrations/multisite"; L="$M/launch"; C="$ROOT/docs/o1/contracts/dle-a1-characters.md"
pg_ctl -D "$WORK/data" -m fast stop >/dev/null 2>&1; rm -rf "$WORK"; mkdir -p "$WORK"
initdb -D "$WORK/data" -U postgres -A trust -E UTF8 >/dev/null || exit 1
pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" -w start >/dev/null || exit 1
trap 'pg_ctl -D "$WORK/data" -m fast stop >/dev/null 2>&1' EXIT
ADMIN="postgresql://postgres@127.0.0.1:$PORT/postgres"; DB="postgresql://postgres@127.0.0.1:$PORT/a1"
psql "$ADMIN" -X -q -c "create database a1" || exit 1
say() { printf '\n== %s\n' "$*"; }
apply() { local f="$1"; if psql "$DB" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$f" >"$WORK/last.log" 2>&1; then echo "applied $(basename "$f")"; else echo "FAILED $(basename "$f")"; tail -5 "$WORK/last.log"; exit 1; fi; }
fp() { psql "$DB" -X -At -F ' | ' -c "
  select 'character_facts', count(*), md5(coalesce(string_agg(t::text, '~' order by t.character_id), '')), coalesce(max(xmin::text::bigint), 0) from public.character_facts t
  union all select 'series_facts', count(*), md5(coalesce(string_agg(t::text, '~' order by t.group_id), '')), coalesce(max(xmin::text::bigint), 0) from public.series_facts t
  union all select 'entity_sources (L13 fields)', count(*), md5(coalesce(string_agg(t::text, '~' order by t.id), '')), coalesce(max(xmin::text::bigint), 0) from public.entity_sources t where field in ('gender','species','role_at_debut','first_appearance','voice_actor_ja','demographic')
  union all select 'entity_sources (other rows)', count(*), md5(coalesce(string_agg(t::text, '~' order by t.id), '')), coalesce(max(xmin::text::bigint), 0) from public.entity_sources t where field not in ('gender','species','role_at_debut','first_appearance','voice_actor_ja','demographic')
  union all select 'characters', count(*), md5(string_agg(t::text, '~' order by t.id)), 0 from public.characters t
  union all select 'series', count(*), md5(string_agg(t::text, '~' order by t.group_id)), 0 from public.series t
  order by 1"; }

echo "lot A1, local proof; $(psql --version)"
say "the base (schema.base.sql, 001, 002a, 011, L01), the DDL of the contract, L04, the entity_sources rows of L05"
apply "$ROOT/docs/o1/contracts/schema.base.sql"; apply "$M/001-sites.sql"; apply "$M/002a-site-columns.sql"; apply "$M/011-anime-series.sql"; apply "$L/L01-B2-sites.sql"
awk '/^```sql$/{n++; next} /^```$/{if(n==1) exit} n==1' "$C" >"$WORK/ddl.sql"; apply "$WORK/ddl.sql"
apply "$L/L04-K1-series.sql"
grep '^insert into public.entity_sources' "$L/L05-K1-facts.sql" >"$WORK/L05-entity-sources.sql"; apply "$WORK/L05-entity-sources.sql"
psql "$DB" -X -At -c "alter table public.character_facts enable row level security; alter table public.series_facts enable row level security" >/dev/null

say "before L13: row fingerprints (table | rows | md5 | newest xmin)"; fp | tee "$WORK/fp0.txt"
say "L13, first run"; apply "$L/L13-A1-character-facts.sql"; fp | tee "$WORK/fp1.txt"
say "L13, second run: nothing may change, not even a row version"; apply "$L/L13-A1-character-facts.sql"; fp | tee "$WORK/fp2.txt"
if diff -q "$WORK/fp1.txt" "$WORK/fp2.txt" >/dev/null; then echo "PASS second run identical (content and xmin)"; else echo "FAIL second run differs"; diff "$WORK/fp1.txt" "$WORK/fp2.txt"; fi
if [ "$(grep -E '^(characters|series|entity_sources \(other rows\)) \|' "$WORK/fp0.txt")" = "$(grep -E '^(characters|series|entity_sources \(other rows\)) \|' "$WORK/fp1.txt")" ]; then echo "PASS L13 touched no character, series or other source row"; else echo "FAIL L13 moved another table"; fi

say "V-L13, checks 1 to 3 of the contract (4 and 5 need O1's 023)"
psql "$DB" -X -At -F ' | ' <<'SQL'
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'démographie : les 50 séries de lancement', (select count(*) = 50 from public.series_facts f join public.groups g on g.id = f.group_id where g.site_id = 'anime'), (select count(*)::text from public.series_facts)),
  (2, 'faits de personnages hors du pool (brouillon, spoiler) : 0', (select count(*) = 0 from public.character_facts f join public.characters c on c.id = f.character_id where c.status <> 'published' or c.spoiler_level > 0 or c.identity_spoiler), null),
  (3, 'valeurs sans source : 0', (select count(*) = 0 from public.character_facts f join public.characters c on c.id = f.character_id, lateral (values ('gender', f.gender), ('species', f.species), ('role_at_debut', f.role_at_debut)) v(field, val) where v.val is not null and not exists (select 1 from public.entity_sources s where s.entity_type = 'character' and s.entity_id = c.slug and s.field = v.field)), null)
) as c(n, what, ok, got) order by n;
rollback;
SQL

say "extra checks: one source row per stored value, per series counts, species words"
psql "$DB" -X -At -F ' | ' <<'SQL'
select 'stored character values', sum((f.gender is not null)::int + (f.species is not null)::int + (f.role_at_debut is not null)::int + (f.first_appearance is not null)::int + (f.voice_actor_ja is not null)::int) from public.character_facts f;
select 'character source rows', count(*) from public.entity_sources where entity_type = 'character' and field in ('gender','species','role_at_debut','first_appearance','voice_actor_ja');
select 'values with no source row of its own field (all 5 fields)', count(*) from public.character_facts f join public.characters c on c.id = f.character_id, lateral (values ('gender', f.gender), ('species', f.species), ('role_at_debut', f.role_at_debut), ('first_appearance', f.first_appearance), ('voice_actor_ja', f.voice_actor_ja)) v(field, val) where v.val is not null and not exists (select 1 from public.entity_sources s where s.entity_type = 'character' and s.entity_id = c.slug and s.field = v.field);
select 'source rows with no url', count(*) from public.entity_sources where field in ('gender','species','role_at_debut','first_appearance','voice_actor_ja','demographic') and source_url is null;
select 'source hosts', string_agg(distinct split_part(source_url, '/', 3), ', ') from public.entity_sources where field in ('gender','species','role_at_debut','first_appearance','voice_actor_ja','demographic');
select g.slug, count(*) as facts_rows, count(*) filter (where f.gender is not null and f.species is not null and f.role_at_debut is not null) as with_the_3, string_agg(distinct f.species, ', ') as species from public.character_facts f join public.characters c on c.id = f.character_id join public.groups g on g.id = c.group_id group by 1 order by 1;
select demographic, count(*) from public.series_facts group by 1 order by 1;
SQL

say "the rollback refuses once otakudle has a play (stand-in dle_plays, in a transaction that is undone)"
{ echo "begin; create table public.dle_plays (game_id text); insert into public.dle_plays values ('otakudle');"; cat "$L/L13-A1-character-facts.rollback.sql"; echo "rollback;"; } >"$WORK/refuse.sql"
psql "$DB" -X -q -v ON_ERROR_STOP=1 -f "$WORK/refuse.sql" 2>&1 | grep -E 'refused|ERROR' | sed 's/.*ERROR/ERROR/'
fp >"$WORK/fp3.txt"; if diff -q "$WORK/fp2.txt" "$WORK/fp3.txt" >/dev/null; then echo "PASS nothing was deleted by the refused rollback"; else echo "FAIL the refused rollback changed rows"; fi

say "the rollback, twice"
apply "$L/L13-A1-character-facts.rollback.sql"; fp | tee "$WORK/fp4.txt"; apply "$L/L13-A1-character-facts.rollback.sql"
if [ "$(sed 's/ | [0-9]*$//' "$WORK/fp0.txt")" = "$(sed 's/ | [0-9]*$//' "$WORK/fp4.txt")" ]; then echo "PASS back to the fingerprints before L13"; else echo "FAIL rollback left a difference"; diff "$WORK/fp0.txt" "$WORK/fp4.txt"; fi

say "L13 again after the rollback: the same values and the same sources as the first run"
vals() { psql "$DB" -X -At -F ' | ' -c "select 'values', count(*), md5(string_agg(concat_ws('/', g.slug, c.slug, f.gender, f.species, f.role_at_debut, f.first_appearance, f.voice_actor_ja), '~' order by g.slug, c.slug)) from public.character_facts f join public.characters c on c.id = f.character_id join public.groups g on g.id = c.group_id union all select 'demographics', count(*), md5(string_agg(g.slug || '/' || f.demographic, '~' order by g.slug)) from public.series_facts f join public.groups g on g.id = f.group_id union all select 'sources', count(*), md5(string_agg(concat_ws('/', s.entity_type, s.entity_id, s.field, s.source, s.source_ref, s.source_url, s.fetched_at), '~' order by s.entity_type, s.entity_id, s.field)) from public.entity_sources s where s.field in ('gender','species','role_at_debut','first_appearance','voice_actor_ja','demographic')"; }
apply "$L/L13-A1-character-facts.rollback.sql"; apply "$L/L13-A1-character-facts.sql"; vals | tee "$WORK/v1.txt"
apply "$L/L13-A1-character-facts.rollback.sql"; apply "$L/L13-A1-character-facts.sql"; vals | tee "$WORK/v2.txt"
if diff -q "$WORK/v1.txt" "$WORK/v2.txt" >/dev/null; then echo "PASS rollback then re-apply gives the same rows"; else echo "FAIL re-apply differs"; fi
