-- V-K1c (run O1, session.sh): after 021c-k1-idol-corrections.sql, the corrections of lot K1 (debut years, QIDs, two birth dates).
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- A row of the list whose name or QID changed since the snapshot is not judged for its year: 021c skips it and says so, and the information lines count less.
-- A value someone else stored on a listed row is a KO: 021c kept it, the owner decides.
begin transaction read only;
with v(id, name, qid, new_year, source, source_ref) as (values
    (12, 'Bang Chan', 'Q59670293'::text, 2018, 'musicbrainz', '89d4a76a-d8d4-4600-ac9e-19415320b7f4'),
    (13, 'Lee Know', 'Q59260597'::text, 2018, 'musicbrainz', '612b949b-2df4-46c5-a6d8-93a8f01c66b8'),
    (14, 'Changbin', 'Q61100669'::text, 2018, 'musicbrainz', '391d07b5-43b2-4d57-9283-7b7fcf1a00eb'),
    (15, 'Hyunjin', 'Q57601775'::text, 2018, 'musicbrainz', '459b84e0-2636-45e3-96c8-af114dfbd9be'),
    (16, 'Han', 'Q60994278'::text, 2018, 'musicbrainz', '5b3334c9-c065-420c-82dd-df1d3c46ef86'),
    (18, 'Seungmin', 'Q60467634'::text, 2018, 'musicbrainz', '0c720022-fdd2-4b9f-a73a-245c1362fb5f'),
    (19, 'I.N', 'Q59831589'::text, 2018, 'musicbrainz', '2acf77db-be3f-431a-9f81-c35f7cd8c598'),
    (39, 'S.Coups', 'Q21824968'::text, 2015, 'wikidata', 'Q21824968'),
    (46, 'DK', 'Q21824862'::text, 2015, 'wikidata', 'Q21824862'),
    (48, 'The8', 'Q21824868'::text, 2015, 'wikidata', 'Q21824868'),
    (57, 'Soyeon', 'Q26707915'::text, 2018, 'musicbrainz', 'c62e0aeb-d7e2-406a-9036-d14881661e0e'),
    (61, 'Yujin', 'Q55694622'::text, 2018, 'wikidata', 'Q55694622'),
    (64, 'Wonyoung', 'Q56476186'::text, 2018, 'wikidata', 'Q56476186'),
    (67, 'Sakura', 'Q869966'::text, 2012, 'musicbrainz', 'a9cb9478-2cfd-4a51-9fea-0477f07b97ec'),
    (68, 'Chaewon', 'Q56660174'::text, 2018, 'wikidata', 'Q56660174'),
    (75, 'Johnny', 'Q47690025'::text, 2017, 'wikidata', 'Q47690025'),
    (108, 'Seonghwa', 'Q85880867'::text, 2018, 'musicbrainz', '8d7cb745-644c-409b-bdef-d93cc18ac1e4'),
    (113, 'Wooyoung', 'Q65054015'::text, 2018, 'musicbrainz', '8d7cb745-644c-409b-bdef-d93cc18ac1e4'),
    (168, 'Xiumin', 'Q10834841'::text, 2012, 'wikidata', 'Q10834841'),
    (169, 'Suho', 'Q10822003'::text, 2012, 'wikidata', 'Q10822003'),
    (170, 'Lay', 'Q12494180'::text, 2012, 'wikidata', 'Q12494180'),
    (171, 'Baekhyun', 'Q4688701'::text, 2012, 'wikidata', 'Q4688701'),
    (172, 'Chen', 'Q16098027'::text, 2012, 'wikidata', 'Q16098027'),
    (173, 'Chanyeol', 'Q7137681'::text, 2012, 'wikidata', 'Q7137681'),
    (174, 'D.O.', 'Q15111667'::text, 2012, 'wikidata', 'Q15111667'),
    (175, 'Kai', 'Q10775090'::text, 2012, 'wikidata', 'Q10775090'),
    (176, 'Sehun', 'Q10802388'::text, 2012, 'wikidata', 'Q10802388'),
    (93, 'Oh Sion', 'Q122272723'::text, 2024, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
    (94, 'Tokuno Yushi', 'Q122293880'::text, 2024, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
    (95, 'Maeda Riku', 'Q122309465'::text, 2024, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
    (96, 'Kim Daeyoung', 'Q122349180'::text, 2024, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
    (97, 'Sakuya Fujinaga', 'Q122363261'::text, 2024, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
    (98, 'Hirose Ryo', 'Q123153864'::text, 2024, 'musicbrainz', '739261bd-9334-4940-a03a-b6b0a9e5223e'),
    (133, 'Kim Chae-hyun', 'Q109108660'::text, 2022, 'musicbrainz', '2844f93d-11b2-4f5c-8296-59119d87a714'),
    (134, 'Hikaru Ezaki', 'Q109108909'::text, 2022, 'musicbrainz', '2844f93d-11b2-4f5c-8296-59119d87a714'),
    (136, 'Kim Dayeon', 'Q109120276'::text, 2022, 'musicbrainz', '2844f93d-11b2-4f5c-8296-59119d87a714'),
    (137, 'Seo Young-eun', 'Q109141485'::text, 2022, 'musicbrainz', '2844f93d-11b2-4f5c-8296-59119d87a714'),
    (142, 'Ruka', 'Q123554435'::text, 2024, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
    (143, 'Pharita', 'Q123554436'::text, 2024, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
    (144, 'Asa', 'Q123554438'::text, 2024, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
    (145, 'Rami', 'Q123554439'::text, 2024, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
    (146, 'Rora', 'Q123554440'::text, 2024, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
    (147, 'Chiquita', 'Q123554441'::text, 2024, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
    (148, 'Ahyeon', 'Q123560890'::text, 2024, 'musicbrainz', 'f7fccca7-508f-4a0b-97b5-78fba2d0c508'),
    (189, 'Bae', 'Q109308055'::text, 2022, 'musicbrainz', '74203cbd-b07b-4c3c-bb40-df8ea03bec40')
), old(id, old_year) as (values (93, 2023), (94, 2023), (95, 2023), (96, 2023), (97, 2023), (98, 2023), (133, 2021), (134, 2021), (136, 2021), (137, 2021), (142, 2023), (143, 2023), (144, 2023), (145, 2023), (146, 2023), (147, 2023), (148, 2023), (189, 2021)
), q(id, name, qid, duplicate_id) as (values (39, 'S.Coups', 'Q21824968', 54), (46, 'DK', 'Q21824862', 52), (48, 'The8', 'Q21824868', 53), (175, 'Kai', 'Q10775090', 179)
), s(id, name, old_qid, new_qid, old_mbid, new_mbid, true_birth) as (values (14, 'Changbin', 'Q59831589', 'Q61100669', '2acf77db-be3f-431a-9f81-c35f7cd8c598', '391d07b5-43b2-4d57-9283-7b7fcf1a00eb', date '1999-08-11'), (19, 'I.N', 'Q61100669', 'Q59831589', '391d07b5-43b2-4d57-9283-7b7fcf1a00eb', '2acf77db-be3f-431a-9f81-c35f7cd8c598', date '2001-02-08')
), mine as (
  select v.*, i.debut_year from v join public.idols i on i.id = v.id and i.name = v.name and i.wikidata_qid = v.qid
), held as (
  select * from mine where debut_year = new_year
)
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'QID sur les fiches actives 39, 46, 48, 175 : fiches sans le QID du doublon', (select count(*) = 0 from q join public.idols i on i.id = q.id and i.name = q.name join public.idols d on d.id = q.duplicate_id and d.wikidata_qid = q.qid where i.wikidata_qid is distinct from q.qid), (select count(*)::text from q join public.idols i on i.id = q.id and i.name = q.name join public.idols d on d.id = q.duplicate_id and d.wikidata_qid = q.qid where i.wikidata_qid is distinct from q.qid)),
  (2, 'doublons 52, 53, 54, 179 actifs : 0', (select count(*) = 0 from public.idols where id in (52, 53, 54, 179) and active), (select count(*)::text from public.idols where id in (52, 53, 54, 179) and active)),
  (3, 'QID de 14 et 19 encore inversés ou autres : 0', (select count(*) = 0 from s join public.idols i on i.id = s.id and i.name = s.name where i.wikidata_qid is distinct from s.new_qid), (select count(*)::text from s join public.idols i on i.id = s.id and i.name = s.name where i.wikidata_qid is distinct from s.new_qid)),
  (4, 'dates de naissance de 14 et 19 différentes de la vraie : 0', (select count(*) = 0 from s join public.idols i on i.id = s.id and i.name = s.name where i.birth_date is distinct from s.true_birth), (select count(*)::text from s join public.idols i on i.id = s.id and i.name = s.name where i.birth_date is distinct from s.true_birth)),
  (5, 'dates de naissance de 14 et 19 sans leur source exacte : 0', (select count(*) = 0 from s join public.idols i on i.id = s.id and i.name = s.name and i.birth_date = s.true_birth where not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = s.id::text and e.field = 'birth_date' and e.source = 'wikidata' and e.source_ref = s.new_qid)), (select count(*)::text from s join public.idols i on i.id = s.id and i.name = s.name and i.birth_date = s.true_birth where not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = s.id::text and e.field = 'birth_date' and e.source = 'wikidata' and e.source_ref = s.new_qid))),
  (6, 'sources de 14 et 19 qui nomment l''autre personne : 0', (select count(*) = 0 from s join public.entity_sources e on e.entity_type = 'idol' and e.entity_id = s.id::text and ((e.source = 'wikidata' and e.source_ref = s.old_qid) or (e.source = 'musicbrainz' and e.source_ref = s.old_mbid))), (select count(*)::text from s join public.entity_sources e on e.entity_type = 'idol' and e.entity_id = s.id::text and ((e.source = 'wikidata' and e.source_ref = s.old_qid) or (e.source = 'musicbrainz' and e.source_ref = s.old_mbid)))),
  (7, 'ancienne année encore là sur les fiches corrigées : 0', (select count(*) = 0 from old join public.idols i on i.id = old.id and i.debut_year = old.old_year), (select count(*)::text from old join public.idols i on i.id = old.id and i.debut_year = old.old_year)),
  (8, 'années de la liste vides ou différentes : 0', (select count(*) = 0 from mine where debut_year is distinct from new_year), (select count(*)::text from mine where debut_year is distinct from new_year)),
  (9, 'années stockées sans leur source exacte : 0', (select count(*) = 0 from held where not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = held.id::text and e.field = 'debut_year' and e.source = held.source and e.source_ref = held.source_ref)), (select count(*)::text from held where not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = held.id::text and e.field = 'debut_year' and e.source = held.source and e.source_ref = held.source_ref))),
  (10, 'années stockées avec plus d''une source : 0', (select count(*) = 0 from held where (select count(*) from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = held.id::text and e.field = 'debut_year') <> 1), (select count(*)::text from held where (select count(*) from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = held.id::text and e.field = 'debut_year') <> 1)),
  (11, 'années de 021c en place (information, liste de 45)', true, (select count(*)::text from held)),
  (12, 'QID ajoutés par 021c en place (information, liste de 4)', true, (select count(*)::text from q join public.idols i on i.id = q.id and i.wikidata_qid = q.qid)),
  (13, 'idols assez complètes pour être cible (information)', true, (select count(*)::text from public.dle_src_kpop_idol s where not exists (select 1 from public.dle_attributes a where a.game_id = 'kpopdle-idol' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0)))
) as c(n, what, ok, got) order by n;
rollback;
