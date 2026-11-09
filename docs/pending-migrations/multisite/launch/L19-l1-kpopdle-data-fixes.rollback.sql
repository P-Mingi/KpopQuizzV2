-- L19-l1-kpopdle-data-fixes.rollback.sql (lane kpopdle, run O1): undoes L19-l1-kpopdle-data-fixes.sql.
--
-- What:   puts back the exact previous values of the audit, each only where the row still holds the value L19 wrote (a row changed since is left alone):
--         the curation of Taeil (74) and Mark (80), the seven groups.record_label, the position tags, Minji's roster positions, the Go Won link to Loossemble, the seven
--         debut years and their wikidata / musicbrainz source rows (fetched_at 2026-11-02 12:00 UTC like 021d), the five nationality labels, the ASTRO inception_date;
--         deletes the entity_sources rows of source wikipedia stamped 2026-11-09 00:00 UTC for those values; refreshes the snapshot of kpopdle-idol.
--         Deletes the public.agencies rows L19 created (stamped created_at 2026-11-09 00:00 UTC: BigHit Music, Starship Entertainment, KQ Entertainment, ADOR,
--         SM Entertainment, whichever were missing); a row that existed before L19 stays. Removes the Go Won link only when L19 added it.
-- WHEN:   like L19 (after 00:30 UTC, after a backup). A day that was kept for Taeil or Mark is served again with them as possible answers.
-- o1-transaction: single (psql --single-transaction). Idempotent.

set lock_timeout = '5s';
set client_min_messages = warning;

-- 1. Curation: our own row (marker note, default weight) goes; a row that was there before keeps its weight and gets its flag back.
delete from public.dle_curation
where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and excluded and weight = 1 and note like 'L19: left NCT%';
update public.dle_curation set excluded = false, note = null, updated_at = now()
where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and excluded and note like 'L19: left NCT%';

-- 2. Agency.
update public.groups g set record_label = v.wrong
from (values
  ('BTS', 'Columbia Records', 'BigHit Music'), ('TXT', 'Republic Records', 'BigHit Music'), ('IVE', 'Columbia Records', 'Starship Entertainment'),
  ('ATEEZ', 'RCA Records', 'KQ Entertainment'), ('RIIZE', 'RCA Records', 'SM Entertainment'), ('NewJeans', 'Geffen Records', 'ADOR'),
  ('aespa', 'Capitol Records', 'SM Entertainment')
) as v(name, wrong, fixed)
where g.name = v.name and g.site_id = 'kpop' and g.record_label = v.fixed;

-- 3. Positions.
update public.idols i set positions = array_remove(i.positions, p.tag)
from (values
  (7, null, 'Jungkook', 'Maknae'), (11, null, 'Lisa', 'Maknae'), (29, null, 'Tzuyu', 'Maknae'), (33, null, 'Ningning', 'Maknae'),
  (151, null, 'Anton Lee', 'Maknae'), (176, null, 'Sehun', 'Maknae'), (196, null, 'Taemin', 'Maknae'),
  (null, 'Q97352009', 'So Jung-hwan', 'Maknae'), (null, 'Q30006465', 'Jongseob', 'Maknae'), (null, 'Q117818064', 'Park Gun-wook', 'Maknae'),
  (null, 'Q233371', 'Taeyeon', 'Leader'), (null, 'Q97319986', 'Junkyu', 'Leader')
) as p(idol_id, qid, name, tag)
where i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid)) and p.tag = any(i.positions);
update public.idols set positions = array['Leader', 'Vocalist']::text[]
where id = 34 and name = 'Minji' and positions = array['Vocalist']::text[];

-- 4. Go Won leaves Loossemble again, only when L19 added that link (its wikipedia source row exists; a link that was there before has none).
delete from public.idol_other_groups og
using public.idols i, public.groups g2
where i.wikidata_qid = 'Q58825794' and i.name = 'Go Won' and g2.slug = 'loossemble' and og.idol_id = i.id and og.group_id = g2.id
  and exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'group' and e.source = 'wikipedia'
    and e.fetched_at = timestamptz '2026-11-09 00:00:00+00');

-- 5. Debut years, then the source rows of the old years (the refs 021d wrote).
update public.idols i set debut_year = y.old_year
from (values
  ('Q491048', 'Jay B', 2014, 2012), ('Q492313', 'Jinyoung', 2014, 2012), ('Q59313184', 'JiU', 2017, 2014), ('Q59313270', 'SuA', 2017, 2014),
  ('Q59313326', 'Siyeon', 2017, 2014), ('Q59313479', 'Yoohyeon', 2017, 2014), ('Q59313527', 'Dami', 2017, 2014)
) as y(qid, name, old_year, new_year)
where i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
select 'idol', i.id::text, 'debut_year', s.source, s.source_ref, timestamptz '2026-11-02 12:00:00+00'
from (values
  ('Q491048', 'wikidata', 'Q23772001'), ('Q491048', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q492313', 'wikidata', 'Q23772001'), ('Q492313', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q59313184', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'), ('Q59313270', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q59313326', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'), ('Q59313479', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q59313527', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de')
) as s(qid, source, source_ref)
join public.idols i on i.wikidata_qid = s.qid
where i.debut_year in (2014, 2017) and exists (
    select 1 from public.entity_sources w where w.entity_type = 'idol' and w.entity_id = i.id::text and w.field = 'debut_year' and w.source = 'wikipedia'
      and w.fetched_at = timestamptz '2026-11-09 00:00:00+00')
on conflict (entity_type, entity_id, field, source) do nothing;

-- 6. Nationality labels.
update public.idols i set nationality = w.wrong
from (values
  (33, 'Ningning'), (42, 'Jun'), (58, 'Yuqi'), (89, 'Qian Kun'), (170, 'Lay')
) as x(id, name)
cross join (select 'People''s Republic of China'::text as wrong) w
where i.id = x.id and i.name = x.name and i.nationality = 'China';

-- 7. ASTRO.
update public.groups set inception_date = date '2016-01-01'
where name = 'ASTRO' and site_id = 'kpop' and inception_date = date '2016-02-23';

-- 8. The wikipedia source rows of L19 (the stamp tells which are ours).
delete from public.entity_sources e
where e.source = 'wikipedia' and e.fetched_at = timestamptz '2026-11-09 00:00:00+00' and (
     (e.entity_type = 'group' and e.field in ('record_label', 'inception_date'))
  or (e.entity_type = 'idol' and e.field in ('positions', 'group', 'debut_year')));

-- 9. The agency rows L19 created (stamped), unless one has a child. A row that existed before has another created_at and stays.
delete from public.agencies a
where a.created_at = timestamptz '2026-11-09 00:00:00+00' and a.name in ('BigHit Music', 'Starship Entertainment', 'KQ Entertainment', 'ADOR', 'SM Entertainment')
  and not exists (select 1 from public.agencies c where c.parent_id = a.id);

-- 10. The snapshot.
do $l19$ begin
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then
    perform public.dle_refresh_entities('kpopdle-idol');
  end if;
end $l19$;

notify pgrst, 'reload schema';
