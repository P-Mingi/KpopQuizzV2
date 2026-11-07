-- 021e-k2-birth-dates.sql (lot K2 follow-up, owner order of 2026-11-07; V-K2 check 5)
--
-- What:   fills idols.birth_date on four idols that are active since July and had none: S.Coups (id 39), DK (46) and The8 (48) of
--         seventeen, Kai (175) of exo. Each date is Wikidata P569 (one value, day precision, referenced) and MusicBrainz agrees
--         (artist life-span begin), both read on 2026-11-07. One public.entity_sources row per source for the field birth_date, like 021d.
--             39  S.Coups  Q21824968  1995-08-08  MusicBrainz 285c41b3-6a5d-48c7-8cd5-a25427765747
--             46  DK       Q21824862  1997-02-18  MusicBrainz 81f70c77-2c06-486b-9fdd-eb74f5c94bfa
--             48  The8     Q21824868  1997-11-07  MusicBrainz 3b7782cd-3aa1-4c05-a2ba-5d22013a2c55
--             175 Kai      Q10775090  1994-01-14  MusicBrainz 6afff86d-fc4a-4446-a41e-f88e1322a5be
--         A row changes only while its birth_date is still empty and it carries the listed QID; the source rows go in only when the
--         stored date is the sourced one. Nothing else changes: gender and nationality stay empty, so none of the four enters the
--         view dle_src_kpop_idol (it needs them).
--         Guarded, the whole file refused with nothing changed, when an id is missing, carries another QID, or holds another birth date.
-- Why:    V-K2 check 5 counts active idols that are under 18 or have no birth date; these four were its 4 (all adults).
-- Rows:   4 idols (birth_date), 8 entity_sources.
-- Needs:  021d applied (session K2). Run alone: psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -At -F ' | ' -f docs/pending-migrations/multisite/021e-k2-birth-dates.sql
--         It prints 4 | 8 (idols with their date, source rows), then rerun bash docs/launch/o1/session.sh K2 for V-K2 10 of 10.
-- Undo:   021e-k2-birth-dates.rollback.sql.
-- o1-transaction: one transaction (begin and commit below). Idempotent: a second run changes nothing and prints 4 | 8 again.

begin;
set local lock_timeout = '5s';

create temp table k2e (id bigint primary key, qid text not null, birth_date date not null, mbid text not null) on commit drop;
insert into k2e (id, qid, birth_date, mbid) values
  (39,  'Q21824968', date '1995-08-08', '285c41b3-6a5d-48c7-8cd5-a25427765747'),
  (46,  'Q21824862', date '1997-02-18', '81f70c77-2c06-486b-9fdd-eb74f5c94bfa'),
  (48,  'Q21824868', date '1997-11-07', '3b7782cd-3aa1-4c05-a2ba-5d22013a2c55'),
  (175, 'Q10775090', date '1994-01-14', '6afff86d-fc4a-4446-a41e-f88e1322a5be');

do $$
declare bad text;
begin
  select string_agg(k.id::text, ', ') into bad
  from k2e k left join public.idols i on i.id = k.id
  where i.id is null or i.wikidata_qid is distinct from k.qid or (i.birth_date is not null and i.birth_date <> k.birth_date);
  if bad is not null then
    raise exception '021e-k2-birth-dates: refused, nothing changed: id(s) % missing, with another QID, or with another birth date', bad;
  end if;
  if exists (select 1 from k2e where birth_date > current_date - interval '18 years') then
    raise exception '021e-k2-birth-dates: refused, nothing changed: a listed birth date is under 18';
  end if;
end $$;

update public.idols i
set birth_date = k.birth_date
from k2e k
where i.id = k.id and i.wikidata_qid = k.qid and i.birth_date is null;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
select 'idol', i.id::text, 'birth_date', s.source, s.source_ref, timestamptz '2026-11-07 12:00:00+00'
from k2e k
join public.idols i on i.id = k.id and i.birth_date = k.birth_date
cross join lateral (values ('wikidata', k.qid), ('musicbrainz', k.mbid)) as s(source, source_ref)
on conflict (entity_type, entity_id, field, source) do nothing;

select
  (select count(*) from public.idols i join k2e k on k.id = i.id and i.birth_date = k.birth_date) as idols_dated,
  (select count(*) from public.entity_sources e join k2e k on e.entity_type = 'idol' and e.entity_id = k.id::text
     and e.field = 'birth_date' and e.source in ('wikidata', 'musicbrainz')) as source_rows;

commit;
