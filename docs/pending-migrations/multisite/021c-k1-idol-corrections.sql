-- 021c-k1-idol-corrections.sql (lot K1, corrections before session G, owner's decisions of 2026-11-01)
--
-- What:   corrections of public.idols, each value with one public.entity_sources row of the shape 021a uses (entity_type 'idol',
--         entity_id = the idol id as text, source 'wikidata' or 'musicbrainz'):
--         (a) debut_year for 27 active idols that have none. Single rule: the year of the first official release as a member of a
--             debuted group (no survival show, no teaser, no pre-debut single).
--         (b) wikidata_qid on the active rows 39 S.Coups, 46 DK, 48 The8, 175 Kai, from their inactive duplicates 54, 52, 53, 179, which
--             keep it. public.idols has no unique key on wikidata_qid (only group_id, name; 83 and 200 already share a QID).
--         (c) debut_year of 18 idols that are not active: Kep1er 133, 134, 136, 137 to 2022, NMIXX 189 to 2022, NCT Wish 93 to 98 to
--             2024, BABYMONSTER 142 to 148 to 2024. The rows 021a wrote for the old year are replaced by the one for the new year.
--         (d) 14 Changbin and 19 I.N hold each other's QID and each other's birth date in production: both are swapped back, and the
--             source rows of these two idols that name the other person (from 021a and earlier, any field) get the right reference.
--         Every update is keyed by the idol id and name (and the QID for the years) and only fills an empty column, or moves the exact
--         expected wrong value. A row that holds anything else is left as it is and named by a notice; V-K1c then says KO.
-- Why:    the sources of 021a disagree on these idols or give a date that is not the debut (MusicBrainz often starts at the reveal). The
--         owner chose one rule and each value.
-- Effect: THIS FILE CHANGES WHAT kpopquiz.org SHOWS, on purpose, for 14 and 19 only: their birth date, age and birthday on the Stray
--         Kids Verse pages and the Today in K-pop list (docs/proofs/k1-idols/021c-qid-readers.txt, CR-014). QIDs, debut years and source
--         references are read by no public page.
-- Rows:   45 debut years, 4 QIDs added, 2 QIDs and 2 birth dates swapped; at least 53 entity_sources rows written or corrected.
-- Needs:  021a-k1-idol-gender-debut.sql. Runs before 021b.
-- Verify: docs/launch/o1/checks/V-K1c.sql
-- Undo:   021c-k1-idol-corrections.rollback.sql (refused while the game kpopdle-idol is active).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing. Never changes active or needs_review.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.idols') is null or to_regclass('public.entity_sources') is null then
    raise exception '021c-k1-idol-corrections: public.idols or public.entity_sources is missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name = 'debut_year') then
    raise exception '021c-k1-idol-corrections: idols.debut_year is missing, apply 021a first';
  end if;
end $$;

drop table if exists pg_temp.k1c_before, pg_temp.k1c_values, pg_temp.k1c_qids, pg_temp.k1c_swaps;
-- Kept for the self-check: nobody's status moves, and no birth date but those of 14 and 19.
create temp table k1c_before as select coalesce(md5(string_agg(id::text || ':' || active::text || ':' || needs_review::text, ',' order by id)), '') as sig, coalesce(md5(string_agg(id::text || ':' || coalesce(birth_date::text, ''), ',' order by id) filter (where id not in (14, 19))), '') as sig_birth from public.idols;

-- id, name, QID on the row once (b) and (d) are done, the year, the year it replaces, the source of the year.
-- 108, 113, 67, (c): no source dates the person, the source is the MusicBrainz release group of the first official release.
create temp table k1c_values (id integer primary key, name text not null, qid text not null, new_year integer not null, old_year integer, source text not null, source_ref text not null);
insert into k1c_values (id, name, qid, new_year, old_year, source, source_ref) values
  (12, 'Bang Chan', 'Q59670293', 2018, null, 'musicbrainz', '89d4a76a-d8d4-4600-ac9e-19415320b7f4'),
  (13, 'Lee Know', 'Q59260597', 2018, null, 'musicbrainz', '612b949b-2df4-46c5-a6d8-93a8f01c66b8'),
  (14, 'Changbin', 'Q61100669', 2018, null, 'musicbrainz', '391d07b5-43b2-4d57-9283-7b7fcf1a00eb'),
  (15, 'Hyunjin', 'Q57601775', 2018, null, 'musicbrainz', '459b84e0-2636-45e3-96c8-af114dfbd9be'),
  (16, 'Han', 'Q60994278', 2018, null, 'musicbrainz', '5b3334c9-c065-420c-82dd-df1d3c46ef86'),
  (18, 'Seungmin', 'Q60467634', 2018, null, 'musicbrainz', '0c720022-fdd2-4b9f-a73a-245c1362fb5f'),
  (19, 'I.N', 'Q59831589', 2018, null, 'musicbrainz', '2acf77db-be3f-431a-9f81-c35f7cd8c598'),
  (39, 'S.Coups', 'Q21824968', 2015, null, 'wikidata', 'Q21824968'),
  (46, 'DK', 'Q21824862', 2015, null, 'wikidata', 'Q21824862'),
  (48, 'The8', 'Q21824868', 2015, null, 'wikidata', 'Q21824868'),
  (57, 'Soyeon', 'Q26707915', 2018, null, 'musicbrainz', 'c62e0aeb-d7e2-406a-9036-d14881661e0e'),
  (61, 'Yujin', 'Q55694622', 2018, null, 'wikidata', 'Q55694622'),
  (64, 'Wonyoung', 'Q56476186', 2018, null, 'wikidata', 'Q56476186'),
  (67, 'Sakura', 'Q869966', 2012, null, 'musicbrainz', 'a9cb9478-2cfd-4a51-9fea-0477f07b97ec'),
  (68, 'Chaewon', 'Q56660174', 2018, null, 'wikidata', 'Q56660174'),
  (75, 'Johnny', 'Q47690025', 2017, null, 'wikidata', 'Q47690025'),
  (108, 'Seonghwa', 'Q85880867', 2018, null, 'musicbrainz', '8d7cb745-644c-409b-bdef-d93cc18ac1e4'),
  (113, 'Wooyoung', 'Q65054015', 2018, null, 'musicbrainz', '8d7cb745-644c-409b-bdef-d93cc18ac1e4'),
  (168, 'Xiumin', 'Q10834841', 2012, null, 'wikidata', 'Q10834841'),
  (169, 'Suho', 'Q10822003', 2012, null, 'wikidata', 'Q10822003'),
  (170, 'Lay', 'Q12494180', 2012, null, 'wikidata', 'Q12494180'),
  (171, 'Baekhyun', 'Q4688701', 2012, null, 'wikidata', 'Q4688701'),
  (172, 'Chen', 'Q16098027', 2012, null, 'wikidata', 'Q16098027'),
  (173, 'Chanyeol', 'Q7137681', 2012, null, 'wikidata', 'Q7137681'),
  (174, 'D.O.', 'Q15111667', 2012, null, 'wikidata', 'Q15111667'),
  (175, 'Kai', 'Q10775090', 2012, null, 'wikidata', 'Q10775090'),
  (176, 'Sehun', 'Q10802388', 2012, null, 'wikidata', 'Q10802388'),
  (93, 'Oh Sion', 'Q122272723', 2024, 2023, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
  (94, 'Tokuno Yushi', 'Q122293880', 2024, 2023, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
  (95, 'Maeda Riku', 'Q122309465', 2024, 2023, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
  (96, 'Kim Daeyoung', 'Q122349180', 2024, 2023, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
  (97, 'Sakuya Fujinaga', 'Q122363261', 2024, 2023, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
  (98, 'Hirose Ryo', 'Q123153864', 2024, 2023, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
  (133, 'Kim Chae-hyun', 'Q109108660', 2022, 2021, 'musicbrainz', '2844f93d-11b2-4f5c-8296-59119d87a714'),
  (134, 'Hikaru Ezaki', 'Q109108909', 2022, 2021, 'musicbrainz', '2844f93d-11b2-4f5c-8296-59119d87a714'),
  (136, 'Kim Dayeon', 'Q109120276', 2022, 2021, 'musicbrainz', '2844f93d-11b2-4f5c-8296-59119d87a714'),
  (137, 'Seo Young-eun', 'Q109141485', 2022, 2021, 'musicbrainz', '2844f93d-11b2-4f5c-8296-59119d87a714'),
  (142, 'Ruka', 'Q123554435', 2024, 2023, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
  (143, 'Pharita', 'Q123554436', 2024, 2023, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
  (144, 'Asa', 'Q123554438', 2024, 2023, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
  (145, 'Rami', 'Q123554439', 2024, 2023, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
  (146, 'Rora', 'Q123554440', 2024, 2023, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
  (147, 'Chiquita', 'Q123554441', 2024, 2023, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
  (148, 'Ahyeon', 'Q123560890', 2024, 2023, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
  (189, 'Bae', 'Q109308055', 2022, 2021, 'musicbrainz', '74203cbd-b07b-4c3c-bb40-df8ea03bec40');

-- id, name, the QID, the inactive duplicate that holds it.
create temp table k1c_qids (id integer primary key, name text not null, qid text not null, duplicate_id integer not null);
insert into k1c_qids (id, name, qid, duplicate_id) values
  (39, 'S.Coups', 'Q21824968', 54),
  (46, 'DK', 'Q21824862', 52),
  (48, 'The8', 'Q21824868', 53),
  (175, 'Kai', 'Q10775090', 179);

-- (d) Checked on Wikidata (P569, P434, labels) and MusicBrainz, 2026-11-01. Birth dates read in production by the integrator.
create temp table k1c_swaps (id integer primary key, name text not null, old_qid text not null, new_qid text not null, old_mbid text not null, new_mbid text not null, wrong_birth date not null, true_birth date not null);
insert into k1c_swaps (id, name, old_qid, new_qid, old_mbid, new_mbid, wrong_birth, true_birth) values
  (14, 'Changbin', 'Q59831589', 'Q61100669', '2acf77db-be3f-431a-9f81-c35f7cd8c598', '391d07b5-43b2-4d57-9283-7b7fcf1a00eb', date '2001-02-08', date '1999-08-11'),
  (19, 'I.N', 'Q61100669', 'Q59831589', '391d07b5-43b2-4d57-9283-7b7fcf1a00eb', '2acf77db-be3f-431a-9f81-c35f7cd8c598', date '1999-08-11', date '2001-02-08');

set client_min_messages = notice;

do $$
declare
  n_q integer;
  n_s integer;
  n_b integer;
  n_y integer;
  n_c integer;
  n_r integer;
begin
  update public.idols i set wikidata_qid = q.qid
  from k1c_qids q join public.idols d on d.id = q.duplicate_id and d.wikidata_qid = q.qid and not d.active
  where i.id = q.id and i.name = q.name and i.wikidata_qid is null;
  get diagnostics n_q = row_count;
  update public.idols i set wikidata_qid = s.new_qid
  from k1c_swaps s
  where i.id = s.id and i.name = s.name and i.wikidata_qid = s.old_qid;
  get diagnostics n_s = row_count;
  update public.idols i set birth_date = s.true_birth
  from k1c_swaps s
  where i.id = s.id and i.name = s.name and i.birth_date = s.wrong_birth;
  get diagnostics n_b = row_count;
  update public.idols i set debut_year = v.new_year
  from k1c_values v
  where i.id = v.id and i.name = v.name and i.wikidata_qid = v.qid and v.old_year is null and i.debut_year is null;
  get diagnostics n_y = row_count;
  update public.idols i set debut_year = v.new_year
  from k1c_values v
  where i.id = v.id and i.name = v.name and i.wikidata_qid = v.qid and v.old_year is not null and i.debut_year = v.old_year;
  get diagnostics n_c = row_count;
  -- (d) Rows of 14 and 19 that name the other person keep their date, only the reference moves.
  update public.entity_sources e
  set source_ref = case when e.source = 'wikidata' then s.new_qid else s.new_mbid end
  from k1c_swaps s join public.idols i on i.id = s.id and i.wikidata_qid = s.new_qid
  where e.entity_type = 'idol' and e.entity_id = s.id::text
    and ((e.source = 'wikidata' and e.source_ref = s.old_qid) or (e.source = 'musicbrainz' and e.source_ref = s.old_mbid));
  get diagnostics n_r = row_count;
  raise notice '021c-k1-idol-corrections: added % QID(s), swapped % QID(s) and % birth date(s), filled % debut year(s), corrected % debut year(s), moved % source reference(s)', n_q, n_s, n_b, n_y, n_c, n_r;
end $$;

-- One source row per stored year: for an idol that holds this file's year, any other source row of debut_year goes.
delete from public.entity_sources e
using k1c_values v, public.idols i
where i.id = v.id and i.debut_year = v.new_year
  and e.entity_type = 'idol' and e.entity_id = v.id::text and e.field = 'debut_year' and e.source <> v.source;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
select 'idol', v.id::text, 'debut_year', v.source, v.source_ref, timestamptz '2026-11-01 12:00:00+00'
from k1c_values v join public.idols i on i.id = v.id
where i.debut_year = v.new_year
on conflict (entity_type, entity_id, field, source) do update
  set source_ref = excluded.source_ref, fetched_at = excluded.fetched_at
  where public.entity_sources.source_ref is distinct from excluded.source_ref;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
select 'idol', q.id::text, 'wikidata_qid', 'wikidata', q.qid, timestamptz '2026-11-01 12:00:00+00'
from k1c_qids q join public.idols i on i.id = q.id and i.wikidata_qid = q.qid
on conflict (entity_type, entity_id, field, source) do nothing;

-- (d) A row already there went through the reference move above; on conflict it stays. The stamp tells the rollback what this file added.
insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
select 'idol', s.id::text, f.field, 'wikidata', s.new_qid, timestamptz '2026-11-01 12:00:00+00'
from k1c_swaps s join public.idols i on i.id = s.id and i.wikidata_qid = s.new_qid
cross join (values ('wikidata_qid'), ('birth_date')) as f(field)
where f.field = 'wikidata_qid' or i.birth_date = s.true_birth
on conflict (entity_type, entity_id, field, source) do nothing;

-- Self-check: nobody activated or sent to review, no other birth date moved, one matching source row per year; what was skipped is said.
do $$
declare
  n bigint;
  who text;
begin
  if (select coalesce(md5(string_agg(id::text || ':' || active::text || ':' || needs_review::text, ',' order by id)), '') from public.idols) <> (select sig from k1c_before) then
    raise exception '021c-k1-idol-corrections: active or needs_review changed (this file never does that)';
  end if;
  if (select coalesce(md5(string_agg(id::text || ':' || coalesce(birth_date::text, ''), ',' order by id) filter (where id not in (14, 19))), '') from public.idols) <> (select sig_birth from k1c_before) then
    raise exception '021c-k1-idol-corrections: a birth date other than those of 14 and 19 changed';
  end if;
  select count(*) into n from k1c_values v join public.idols i on i.id = v.id
  where i.debut_year = v.new_year
    and (select count(*) from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = v.id::text and e.field = 'debut_year' and e.source = v.source and e.source_ref = v.source_ref) <> 1;
  if n > 0 then
    raise exception '021c-k1-idol-corrections: % stored year(s) have no matching entity_sources row', n;
  end if;
  select count(*) into n from k1c_values v join public.idols i on i.id = v.id
  where i.debut_year = v.new_year
    and (select count(*) from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = v.id::text and e.field = 'debut_year') <> 1;
  if n > 0 then
    raise exception '021c-k1-idol-corrections: % stored year(s) keep more than one entity_sources row', n;
  end if;
  select string_agg(v.id::text, ', ' order by v.id) into who from k1c_values v left join public.idols i on i.id = v.id where i.debut_year is distinct from v.new_year;
  if who is not null then
    raise notice '021c-k1-idol-corrections: year not stored for id(s) % (row gone, name or QID changed, or another value kept)', who;
  end if;
  select string_agg(q.id::text, ', ' order by q.id) into who from k1c_qids q left join public.idols i on i.id = q.id where i.wikidata_qid is distinct from q.qid;
  if who is not null then
    raise notice '021c-k1-idol-corrections: QID not stored for id(s) % (row gone, name changed, another QID kept, or duplicate changed)', who;
  end if;
  select string_agg(s.id::text, ', ' order by s.id) into who from k1c_swaps s left join public.idols i on i.id = s.id where i.wikidata_qid is distinct from s.new_qid;
  if who is not null then
    raise notice '021c-k1-idol-corrections: QID not swapped for id(s) % (row gone, name changed, or another QID found)', who;
  end if;
  select string_agg(s.id::text, ', ' order by s.id) into who from k1c_swaps s left join public.idols i on i.id = s.id where i.birth_date is distinct from s.true_birth;
  if who is not null then
    raise notice '021c-k1-idol-corrections: birth date not corrected for id(s) % (row gone, name changed, or another date found)', who;
  end if;
end $$;

drop table if exists pg_temp.k1c_before, pg_temp.k1c_values, pg_temp.k1c_qids, pg_temp.k1c_swaps;

notify pgrst, 'reload schema';
