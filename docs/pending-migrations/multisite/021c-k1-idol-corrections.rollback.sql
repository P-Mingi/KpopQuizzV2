-- 021c-k1-idol-corrections.rollback.sql (lot K1): undo of 021c-k1-idol-corrections.sql.
--
-- What:   (a) empties the 27 debut years 021c stored and deletes their source rows; (b) empties wikidata_qid on 39, 46, 48, 175 and deletes their
--         source rows; (c) puts back 2021 or 2023 on the 18 corrected idols with the 26 entity_sources rows 021a wrote for them; (d) puts back the
--         QIDs and birth dates of 14 and 19 as production held them and the source references that named the other person, and deletes
--         the source rows 021c added for them. Same rows, same values, same dates; a row put back has a new serial id.
--         Only a value still equal to what 021c stored is touched. A value found different stays, and a notice names the id.
--         Never changes active or needs_review. With the columns of 021a already gone (its rollback ran first), the years are skipped.
-- Why:    the rollback of 021c. Run it before 021a's rollback. It also puts the two wrong birth dates back on kpopquiz.org.
-- Rows:   refused, with nothing changed, while the game kpopdle-idol is active.
-- Verify: select count(*) from public.entity_sources where entity_type = 'idol' and field = 'wikidata_qid' and entity_id in ('39', '46', '48', '175');   expect 0
--         select count(*) from public.idols where id in (39, 46, 48, 175) and wikidata_qid is not null;   expect 0
-- Undo:   run 021c-k1-idol-corrections.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  on_ boolean;
begin
  if to_regclass('public.dle_games') is not null then
    execute 'select active from public.dle_games where id = $1' into on_ using 'kpopdle-idol';
    if coalesce(on_, false) then
      raise exception '021c-k1-idol-corrections rollback refused: the game kpopdle-idol is active and reads idols.debut_year';
    end if;
  end if;
end $$;

drop table if exists pg_temp.k1c_before, pg_temp.k1c_values, pg_temp.k1c_qids, pg_temp.k1c_swaps, pg_temp.k1c_old;
create temp table k1c_before as select coalesce(md5(string_agg(id::text || ':' || active::text || ':' || needs_review::text, ',' order by id)), '') as sig from public.idols;

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

create temp table k1c_qids (id integer primary key, name text not null, qid text not null, duplicate_id integer not null);
insert into k1c_qids (id, name, qid, duplicate_id) values
  (39, 'S.Coups', 'Q21824968', 54),
  (46, 'DK', 'Q21824862', 52),
  (48, 'The8', 'Q21824868', 53),
  (175, 'Kai', 'Q10775090', 179);

create temp table k1c_swaps (id integer primary key, name text not null, old_qid text not null, new_qid text not null, old_mbid text not null, new_mbid text not null, wrong_birth date not null, true_birth date not null);
insert into k1c_swaps (id, name, old_qid, new_qid, old_mbid, new_mbid, wrong_birth, true_birth) values
  (14, 'Changbin', 'Q59831589', 'Q61100669', '2acf77db-be3f-431a-9f81-c35f7cd8c598', '391d07b5-43b2-4d57-9283-7b7fcf1a00eb', date '2001-02-08', date '1999-08-11'),
  (19, 'I.N', 'Q61100669', 'Q59831589', '391d07b5-43b2-4d57-9283-7b7fcf1a00eb', '2acf77db-be3f-431a-9f81-c35f7cd8c598', date '1999-08-11', date '2001-02-08');

-- The debut_year rows 021a wrote for the corrected idols (the year they stood for: old_year of k1c_values).
create temp table k1c_old (id integer, source text, source_ref text);
insert into k1c_old (id, source, source_ref) values
  (93, 'musicbrainz', 'f9d55895-00b0-4047-8f5a-f773f29079cd'),
  (94, 'musicbrainz', '04bcbc06-77eb-4800-b519-283232f86ce0'),
  (95, 'musicbrainz', '70843501-9d7d-4617-a2a0-35d4372ae9c6'),
  (96, 'musicbrainz', 'fe83c243-b602-45a1-b6d4-72506a2301c8'),
  (97, 'wikidata', 'Q122363261'),
  (98, 'musicbrainz', '40f98e12-1814-497f-8373-8c096aef35ae'),
  (133, 'wikidata', 'Q109108660'),
  (133, 'musicbrainz', '62057134-7eae-4995-bfe7-012b48615bc0'),
  (134, 'musicbrainz', '70756acf-1b7c-4bbd-acc9-25fa479254b1'),
  (136, 'musicbrainz', 'aed9ee90-1ae2-456e-b0a4-685b3713b2f1'),
  (137, 'wikidata', 'Q109141485'),
  (137, 'musicbrainz', '02b005ae-a407-4c9c-8987-ce527ebdba5d'),
  (142, 'musicbrainz', '900be07e-882b-40da-8c07-160856d54c4a'),
  (143, 'wikidata', 'Q123554436'),
  (143, 'musicbrainz', 'cde3f7f4-bc6f-460a-a645-e05147a858f9'),
  (144, 'wikidata', 'Q123554438'),
  (144, 'musicbrainz', 'd4b8007c-6220-4f2b-a291-7565f6714377'),
  (145, 'wikidata', 'Q123554439'),
  (145, 'musicbrainz', '8195bdc4-6b37-4d95-b60a-0a8c67ed5ef2'),
  (146, 'wikidata', 'Q123554440'),
  (146, 'musicbrainz', '23d6d5de-8ec4-4c9f-a405-8189594347cb'),
  (147, 'wikidata', 'Q123554441'),
  (147, 'musicbrainz', 'bbe81d6d-b63f-4c87-8625-739deb16da32'),
  (148, 'wikidata', 'Q123560890'),
  (148, 'musicbrainz', 'b375eeef-06e2-4617-aa38-fd39ab4bf56f'),
  (189, 'musicbrainz', '04617771-a7e2-4a8d-a873-72e8365a21c0');

set client_min_messages = notice;

do $$
declare
  who text;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name = 'debut_year') then
    -- (c) first the source rows, while the idol still holds the new year.
    delete from public.entity_sources e
    using k1c_values v, public.idols i
    where v.old_year is not null and i.id = v.id and i.debut_year = v.new_year
      and e.entity_type = 'idol' and e.entity_id = v.id::text and e.field = 'debut_year' and e.source = v.source and e.source_ref = v.source_ref;
    insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
    select 'idol', o.id::text, 'debut_year', o.source, o.source_ref, timestamptz '2026-10-30 12:00:00+00'
    from k1c_old o join k1c_values v on v.id = o.id join public.idols i on i.id = v.id
    where i.debut_year = v.new_year
    on conflict (entity_type, entity_id, field, source) do nothing;
    update public.idols i set debut_year = v.old_year
    from k1c_values v
    where i.id = v.id and v.old_year is not null and i.debut_year = v.new_year;
    -- (a)
    delete from public.entity_sources e
    using k1c_values v, public.idols i
    where v.old_year is null and i.id = v.id and i.debut_year = v.new_year
      and e.entity_type = 'idol' and e.entity_id = v.id::text and e.field = 'debut_year' and e.source = v.source and e.source_ref = v.source_ref;
    update public.idols i set debut_year = null
    from k1c_values v
    where i.id = v.id and v.old_year is null and i.debut_year = v.new_year;
    select string_agg(v.id::text, ', ' order by v.id) into who from k1c_values v join public.idols i on i.id = v.id where i.debut_year is distinct from v.old_year;
    if who is not null then
      raise notice '021c-k1-idol-corrections rollback: year left as found on id(s) % (another value than 021c stored)', who;
    end if;
  end if;
  -- (b)
  delete from public.entity_sources e
  using k1c_qids q
  where e.entity_type = 'idol' and e.entity_id = q.id::text and e.field = 'wikidata_qid' and e.source = 'wikidata' and e.source_ref = q.qid;
  update public.idols i set wikidata_qid = null
  from k1c_qids q
  where i.id = q.id and i.name = q.name and i.wikidata_qid = q.qid;
  select string_agg(q.id::text, ', ' order by q.id) into who from k1c_qids q join public.idols i on i.id = q.id where i.wikidata_qid is not null;
  if who is not null then
    raise notice '021c-k1-idol-corrections rollback: QID left as found on id(s) % (another QID than 021c stored, or the name changed)', who;
  end if;
  -- (d) What 021c added carries its stamp; the rows it only re-referenced get their old reference, with their own date.
  delete from public.entity_sources e
  using k1c_swaps s
  where e.entity_type = 'idol' and e.entity_id = s.id::text and e.field in ('wikidata_qid', 'birth_date') and e.source = 'wikidata'
    and e.source_ref = s.new_qid and e.fetched_at = timestamptz '2026-11-01 12:00:00+00';
  update public.entity_sources e
  set source_ref = case when e.source = 'wikidata' then s.old_qid else s.old_mbid end
  from k1c_swaps s join public.idols i on i.id = s.id and i.wikidata_qid = s.new_qid
  where e.entity_type = 'idol' and e.entity_id = s.id::text
    and ((e.source = 'wikidata' and e.source_ref = s.new_qid) or (e.source = 'musicbrainz' and e.source_ref = s.new_mbid));
  update public.idols i set birth_date = s.wrong_birth
  from k1c_swaps s
  where i.id = s.id and i.name = s.name and i.birth_date = s.true_birth;
  update public.idols i set wikidata_qid = s.old_qid
  from k1c_swaps s
  where i.id = s.id and i.name = s.name and i.wikidata_qid = s.new_qid;
  select string_agg(s.id::text, ', ' order by s.id) into who from k1c_swaps s join public.idols i on i.id = s.id where i.wikidata_qid is distinct from s.old_qid;
  if who is not null then
    raise notice '021c-k1-idol-corrections rollback: QID left as found on id(s) % (neither value of 021c, or the name changed)', who;
  end if;
  select string_agg(s.id::text, ', ' order by s.id) into who from k1c_swaps s join public.idols i on i.id = s.id where i.birth_date is distinct from s.wrong_birth;
  if who is not null then
    raise notice '021c-k1-idol-corrections rollback: birth date left as found on id(s) % (neither value of 021c, or the name changed)', who;
  end if;
  if (select coalesce(md5(string_agg(id::text || ':' || active::text || ':' || needs_review::text, ',' order by id)), '') from public.idols) <> (select sig from k1c_before) then
    raise exception '021c-k1-idol-corrections rollback: active or needs_review changed (this file never does that)';
  end if;
end $$;

drop table if exists pg_temp.k1c_before, pg_temp.k1c_values, pg_temp.k1c_qids, pg_temp.k1c_swaps, pg_temp.k1c_old;

notify pgrst, 'reload schema';
