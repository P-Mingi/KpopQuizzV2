-- 021d-k2-idols.sql (lot K2, idols for Kpopdle Idol, owner brief of 2026-11-02; change request CR-022)
--
-- What:   (a) inserts 91 new idol rows in 18 groups that have no idol row today (loona 10, got7 7, monsta-x 6, girls-generation 8, zerobaseone 4, mamamoo 4, bigbang 3, katseye 5, illit 4, treasure 7, dreamcatcher 7, tws 6, p1harmony 5, cortis 3, hearts2hearts 3, team 3, akmu 2, astro 4), active and reviewed
--             (active true, needs_review false), each with name, romanized and Hangul names, birth date, nationality, gender, debut year,
--             positions (Leader, Maknae), its Wikidata QID and origin 'wikidata'; one public.entity_sources row per stored fact and source
--             (fields wikidata_qid, birth_date, gender, nationality, debut_year; sources wikidata with the QID, musicbrainz with the artist
--             MBID or, for a group's first release, the release group MBID), like 021a and 021c. Only members the English Wikipedia lists as
--             current, whom Wikidata and MusicBrainz do not contradict, and whose birth date, gender and debut year two sources agree on.
--             Members of more than one group (8 people: LOONA members who are now in ARTMS or Loossemble, as English Wikipedia lists them)
--             keep one row, in their first group; 8 rows of public.idol_other_groups (created in 020) give the game's group cell their other
--             group (artms, loossemble), so a guess of one of them is right or near by the engine's set rules, never a second idol.
--         (b) fills, on these 18 groups only and only where the column is empty, groups.record_label (the main agency; an existing spelling
--             of the same label in another group is reused), groups.generation (the published rule on the debut year) and groups.inception_date
--             (a full date only when its year is the agreed debut year): the view dle_src_kpop_idol needs an agency and a generation.
--         (c) activates the 11 idols of the 021b list that the owner marked "yes without reservation" and that today's sources still back
--             (K1 table, POUR-LE-PROPRIETAIRE.md section 2, empty "Douteux" column): ids 82, 89, 133, 143, 144, 145, 148, 151, 152, 153, 163; same update as 021b.
--
--         Held back, not in this file (a source disagrees today): 146 Rora.
--
--         Adults only, three times: the precheck refuses the whole file when a listed birth date is under 18 on the day it runs, the insert
--         and the activation filter on the cutoff, and the self-check fails when any active idol is under 18 or has no birth date.
--         Guarded, the whole file refused with nothing changed, when: a target group is missing or is not listed once; a target group already
--         holds an idol row this file does not know (it must be empty or hold only these rows); a listed QID sits on a row of another group;
--         a listed 021b id is unknown, carries another QID, is detached, is switched off on purpose (inactive and not waiting for review) or
--         is under 18; columns idols.gender and idols.debut_year are missing (021a not applied).
--         Idempotent: a second run inserts and updates nothing.
-- Why:    the owner wants 200 active, adult, complete, double-checked idols in Kpopdle Idol on launch day (150 at the very least); 112 were
--         in the pool. These idols also appear on the kpopquiz.org group pages and the member counts: that is wanted (owner, 2026-11-02).
-- Rows:   up to 91 idols, 783 entity_sources, 8 idol_other_groups, 18 group rows (empty columns only), 11 activations.
-- Needs:  020 (view and table idol_other_groups), 021a (columns), 021c, 021b, and session G done. Run in its own small session: bash docs/launch/o1/session.sh K2,
--         after the backup line of the session (OWNER-NOW.md).
-- Verify: docs/launch/o1/checks/V-K2.sql (session.sh K2 runs it); the pool: select count(*) from public.dle_src_kpop_idol;
-- Undo:   021d-k2-idols.rollback.sql (refused while the game kpopdle-idol is active).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.idols') is null or to_regclass('public.groups') is null or to_regclass('public.entity_sources') is null then
    raise exception '021d-k2-idols: public.idols, public.groups or public.entity_sources is missing';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name in ('gender', 'debut_year')) <> 2 then
    raise exception '021d-k2-idols: idols.gender or idols.debut_year is missing (apply 021a first)';
  end if;
  if to_regclass('public.idol_other_groups') is null then
    raise exception '021d-k2-idols: public.idol_other_groups is missing (020-dle-kpop-idol.sql creates it: apply 020 first)';
  end if;
end $$;

drop table if exists pg_temp.k2_before, pg_temp.k2_groups, pg_temp.k2_idols, pg_temp.k2_sources, pg_temp.k2_activate;
create temp table k2_before as select count(*) filter (where active) as active_n, count(*) as idol_n from public.idols;

create temp table k2_groups (slug text primary key, record_label text, generation text, inception_date date);
insert into k2_groups (slug, record_label, generation, inception_date) values
  ('loona', 'Blockberry Creative', '4th generation', null::date),
  ('got7', 'JYP Entertainment', '3rd generation', null::date),
  ('monsta-x', 'Starship Entertainment', '3rd generation', null::date),
  ('girls-generation', 'SM Entertainment', '2nd generation', null::date),
  ('zerobaseone', 'WakeOne', '5th generation', null::date),
  ('mamamoo', 'Rainbow Bridge World', '3rd generation', date '2014-06-18'),
  ('bigbang', 'YG Entertainment', '2nd generation', null::date),
  ('katseye', 'Hybe UMG', '5th generation', null::date),
  ('illit', 'Belift Lab', '5th generation', date '2024-03-25'),
  ('treasure', 'YG Entertainment', '4th generation', null::date),
  ('dreamcatcher', 'Dreamcatcher Company', '3rd generation', null::date),
  ('tws', 'Pledis Entertainment', '5th generation', date '2024-01-22'),
  ('p1harmony', 'FNC Entertainment', '4th generation', null::date),
  ('cortis', 'BigHit Music', '5th generation', date '2025-08-18'),
  ('hearts2hearts', 'SM Entertainment', '5th generation', date '2025-02-24'),
  ('team', 'YX LABELS', '4th generation', date '2022-09-03'),
  ('akmu', 'YG Entertainment', '3rd generation', null::date),
  ('astro', 'Fantagio', '3rd generation', date '2016-01-01');

create temp table k2_idols (group_slug text not null, name text not null, name_romanized text, name_hangul text, birth_date date not null, nationality text not null,
  gender text not null, debut_year integer not null, positions text[] not null, qid text primary key, ord integer not null, unique (group_slug, name));
insert into k2_idols (group_slug, name, name_romanized, name_hangul, birth_date, nationality, gender, debut_year, positions, qid, ord) values
  ('loona', 'Heejin', null, '전희진', date '2000-10-19', 'South Korea', 'female', 2018, array[]::text[], 'Q56259179', 1),
  ('loona', 'Hyunjin', 'Kim Hyunjin', '김현진', date '2000-11-15', 'South Korea', 'female', 2018, array[]::text[], 'Q48893612', 2),
  ('loona', 'Haseul', null, '조하슬', date '1997-08-18', 'South Korea', 'female', 2018, array['Leader']::text[], 'Q57318729', 3),
  ('loona', 'Yeojin', null, '임여진', date '2002-11-11', 'South Korea', 'female', 2018, array['Maknae']::text[], 'Q56824821', 4),
  ('loona', 'Kim Lip', null, '김정은', date '1999-02-10', 'South Korea', 'female', 2018, array[]::text[], 'Q56816418', 6),
  ('loona', 'Jinsoul', null, '정진솔', date '1997-06-13', 'South Korea', 'female', 2018, array[]::text[], 'Q56825122', 7),
  ('loona', 'Choerry', null, '최예림', date '2001-06-04', 'South Korea', 'female', 2018, array[]::text[], 'Q58224261', 8),
  ('loona', 'Yves', null, '하수영', date '1997-05-24', 'South Korea', 'female', 2018, array[]::text[], 'Q58825704', 9),
  ('loona', 'Go Won', null, '고원', date '2000-11-19', 'South Korea', 'female', 2018, array[]::text[], 'Q58825794', 10),
  ('loona', 'Olivia Hye', 'Hyeju', '손혜주', date '2001-11-13', 'South Korea', 'female', 2018, array[]::text[], 'Q58825825', 11),
  ('got7', 'Mark', 'Mark Tuan', '마크', date '1993-09-04', 'United States', 'male', 2014, array[]::text[], 'Q16075083', 1),
  ('got7', 'Jay B', null, '제이비', date '1994-01-06', 'South Korea', 'male', 2014, array['Leader']::text[], 'Q491048', 2),
  ('got7', 'Jackson', 'Jackson Wang', '잭슨', date '1994-03-28', 'China', 'male', 2014, array[]::text[], 'Q16905948', 3),
  ('got7', 'Jinyoung', 'Park Jin-young', '박진영', date '1994-09-22', 'South Korea', 'male', 2014, array[]::text[], 'Q492313', 4),
  ('got7', 'Youngjae', 'Choi Young-jae', '영재', date '1996-09-17', 'South Korea', 'male', 2014, array[]::text[], 'Q17500581', 5),
  ('got7', 'BamBam', null, '뱀뱀', date '1997-05-02', 'Thailand', 'male', 2014, array[]::text[], 'Q16688282', 6),
  ('got7', 'Yugyeom', 'Kim Yu-gyeom', '유겸', date '1997-11-17', 'South Korea', 'male', 2014, array['Maknae']::text[], 'Q17500887', 7),
  ('monsta-x', 'Shownu', null, '셔누', date '1992-06-18', 'South Korea', 'male', 2015, array['Leader']::text[], 'Q24834621', 1),
  ('monsta-x', 'Minhyuk', null, '민혁', date '1993-11-03', 'South Korea', 'male', 2015, array[]::text[], 'Q28746303', 2),
  ('monsta-x', 'Kihyun', null, '기현', date '1993-11-22', 'South Korea', 'male', 2015, array[]::text[], 'Q27951584', 3),
  ('monsta-x', 'Hyungwon', null, '형원', date '1994-01-15', 'South Korea', 'male', 2015, array[]::text[], 'Q28549791', 4),
  ('monsta-x', 'Joohoney', 'Lee Jooheon', '이주헌', date '1994-10-06', 'South Korea', 'male', 2015, array[]::text[], 'Q23008017', 5),
  ('monsta-x', 'I.M', null, '아이엠', date '1996-01-26', 'South Korea', 'male', 2015, array['Maknae']::text[], 'Q28549782', 6),
  ('girls-generation', 'Taeyeon', null, '태연', date '1989-03-09', 'South Korea', 'female', 2007, array[]::text[], 'Q233371', 1),
  ('girls-generation', 'Sunny', null, '써니', date '1989-05-15', 'South Korea, United States', 'female', 2007, array[]::text[], 'Q233894', 2),
  ('girls-generation', 'Tiffany', 'Tiffany Young', '황미영', date '1989-08-01', 'South Korea, United States', 'female', 2007, array[]::text[], 'Q236355', 3),
  ('girls-generation', 'Hyoyeon', 'Kim Hyo-yeon', '김효연', date '1989-09-22', 'South Korea', 'female', 2007, array[]::text[], 'Q253619', 4),
  ('girls-generation', 'Yuri', 'Kwon Yu-ri', '유리', date '1989-12-05', 'South Korea', 'female', 2007, array[]::text[], 'Q276158', 5),
  ('girls-generation', 'Sooyoung', null, '수영', date '1990-02-10', 'South Korea', 'female', 2007, array[]::text[], 'Q233385', 6),
  ('girls-generation', 'Yoona', 'Lim Yoona', '임윤아', date '1990-05-30', 'South Korea', 'female', 2007, array[]::text[], 'Q466975', 7),
  ('girls-generation', 'Seohyun', 'Seo Joo-hyun', '서현', date '1991-06-28', 'South Korea', 'female', 2007, array['Maknae']::text[], 'Q240082', 8),
  ('zerobaseone', 'Kim Ji-woong', null, '김지웅', date '1998-12-14', 'South Korea', 'male', 2023, array[]::text[], 'Q115933814', 1),
  ('zerobaseone', 'Sung Han-bin', null, '성한빈', date '2001-06-13', 'South Korea', 'male', 2023, array['Leader']::text[], 'Q117746200', 2),
  ('zerobaseone', 'Kim Tae-rae', null, '김태래', date '2002-07-14', 'South Korea', 'male', 2023, array[]::text[], 'Q117817675', 4),
  ('zerobaseone', 'Park Gun-wook', null, '박건욱', date '2005-01-10', 'South Korea', 'male', 2023, array[]::text[], 'Q117818064', 5),
  ('mamamoo', 'Solar', null, '김용선', date '1991-02-21', 'South Korea', 'female', 2014, array['Leader']::text[], 'Q19483969', 1),
  ('mamamoo', 'Moonbyul', null, '문별이', date '1992-12-22', 'South Korea', 'female', 2014, array[]::text[], 'Q19483782', 2),
  ('mamamoo', 'Wheein', null, '휘인', date '1995-04-17', 'South Korea', 'female', 2014, array[]::text[], 'Q19603930', 3),
  ('mamamoo', 'Hwasa', null, '화사', date '1995-07-23', 'South Korea', 'female', 2014, array['Maknae']::text[], 'Q19603912', 4),
  ('bigbang', 'Taeyang', null, '동영배', date '1988-05-18', 'South Korea', 'male', 2006, array[]::text[], 'Q482991', 1),
  ('bigbang', 'G-Dragon', null, '지드래곤', date '1988-08-18', 'South Korea', 'male', 2006, array['Leader']::text[], 'Q495577', 2),
  ('bigbang', 'Daesung', null, '대성', date '1989-04-26', 'South Korea', 'male', 2006, array[]::text[], 'Q194798', 3),
  ('katseye', 'Daniela Avanzini', null, '다니엘라', date '2004-07-01', 'United States', 'female', 2024, array[]::text[], 'Q124692767', 1),
  ('katseye', 'Lara Raj', null, '라라', date '2005-11-03', 'United States', 'female', 2024, array[]::text[], 'Q124692773', 2),
  ('katseye', 'Manon Bannerman', null, '마농 배너맨', date '2002-06-26', 'Switzerland', 'female', 2024, array[]::text[], 'Q124692741', 3),
  ('katseye', 'Megan Skiendiel', null, '메간', date '2006-02-10', 'United States', 'female', 2024, array[]::text[], 'Q124692787', 4),
  ('katseye', 'Sophia Laforteza', null, '소피아', date '2002-12-31', 'Philippines, United States', 'female', 2024, array['Leader']::text[], 'Q124692753', 5),
  ('illit', 'Yunah', null, '노윤아', date '2004-01-15', 'South Korea', 'female', 2024, array[]::text[], 'Q126923756', 1),
  ('illit', 'Minju', null, '박민주', date '2004-05-11', 'South Korea', 'female', 2024, array[]::text[], 'Q126923757', 2),
  ('illit', 'Wonhee', null, '이원희', date '2007-06-26', 'South Korea', 'female', 2024, array[]::text[], 'Q126923760', 4),
  ('illit', 'Iroha', null, '이로하', date '2008-02-04', 'Japan', 'female', 2024, array['Maknae']::text[], 'Q126923761', 5),
  ('treasure', 'Choi Hyun-suk', null, '최현석', date '1999-04-21', 'South Korea', 'male', 2020, array[]::text[], 'Q63850969', 1),
  ('treasure', 'Junkyu', 'Kim Jun-kyu', '김준규', date '2000-09-09', 'South Korea', 'male', 2020, array[]::text[], 'Q97319986', 4),
  ('treasure', 'Yoon Jae-hyuk', null, '윤재혁', date '2001-07-23', 'South Korea', 'male', 2020, array['Leader']::text[], 'Q98136886', 5),
  ('treasure', 'Doyoung', 'Kim Do-young', '김도영', date '2003-12-04', 'South Korea', 'male', 2020, array[]::text[], 'Q97320177', 7),
  ('treasure', 'Haruto', 'Watanabe Haruto', '하루토', date '2004-04-05', 'Japan', 'male', 2020, array['Leader']::text[], 'Q97352003', 8),
  ('treasure', 'Park Jeong-woo', null, '박정우', date '2004-09-28', 'South Korea', 'male', 2020, array[]::text[], 'Q97326265', 9),
  ('treasure', 'So Jung-hwan', null, '소정환', date '2005-02-18', 'South Korea', 'male', 2020, array[]::text[], 'Q97352009', 10),
  ('dreamcatcher', 'JiU', null, '김민지', date '1994-05-17', 'South Korea', 'female', 2017, array['Leader']::text[], 'Q59313184', 1),
  ('dreamcatcher', 'SuA', null, '수아', date '1994-08-10', 'South Korea', 'female', 2017, array[]::text[], 'Q59313270', 2),
  ('dreamcatcher', 'Siyeon', null, '시연', date '1995-10-01', 'South Korea', 'female', 2017, array[]::text[], 'Q59313326', 3),
  ('dreamcatcher', 'Handong', null, '한동', date '1996-03-26', 'China', 'female', 2017, array[]::text[], 'Q59313384', 4),
  ('dreamcatcher', 'Yoohyeon', null, '유현', date '1997-01-07', 'South Korea', 'female', 2017, array[]::text[], 'Q59313479', 5),
  ('dreamcatcher', 'Dami', null, '이유빈', date '1997-03-07', 'South Korea', 'female', 2017, array[]::text[], 'Q59313527', 6),
  ('dreamcatcher', 'Gahyun', null, '가현', date '1999-02-03', 'South Korea', 'female', 2017, array['Maknae']::text[], 'Q59313606', 7),
  ('tws', 'Shinyu', null, '신정환', date '2003-11-07', 'South Korea', 'male', 2024, array['Leader']::text[], 'Q132041926', 1),
  ('tws', 'Dohoon', null, '김도훈', date '2005-01-30', 'South Korea', 'male', 2024, array[]::text[], 'Q125865775', 2),
  ('tws', 'Youngjae', null, '최영재', date '2005-05-31', 'South Korea', 'male', 2024, array[]::text[], 'Q132041928', 3),
  ('tws', 'Hanjin', null, '한진', date '2006-01-05', 'China', 'male', 2024, array[]::text[], 'Q132041929', 4),
  ('tws', 'Jihoon', 'Han Jihoon', '한지훈', date '2006-03-28', 'South Korea', 'male', 2024, array[]::text[], 'Q124091988', 5),
  ('tws', 'Kyungmin', null, '이경민', date '2007-10-02', 'South Korea', 'male', 2024, array['Maknae']::text[], 'Q132041931', 6),
  ('p1harmony', 'Keeho', 'Yoon Kee-ho', '기호', date '2001-09-27', 'Canada', 'male', 2020, array['Leader']::text[], 'Q114690500', 1),
  ('p1harmony', 'Theo', null, '최태양', date '2001-07-01', 'South Korea', 'male', 2020, array[]::text[], 'Q121579075', 2),
  ('p1harmony', 'Jiung', 'Choi Ji-ung', '최지웅', date '2001-10-07', 'South Korea', 'male', 2020, array[]::text[], 'Q121579089', 3),
  ('p1harmony', 'Soul', 'Haku Shota', '하쿠 쇼타', date '2005-02-01', 'Japan, South Korea', 'male', 2020, array[]::text[], 'Q121579375', 5),
  ('p1harmony', 'Jongseob', null, '김종섭', date '2005-11-19', 'South Korea', 'male', 2020, array[]::text[], 'Q30006465', 6),
  ('cortis', 'James', 'Chao James', '제임스', date '2005-10-14', 'China, Thailand', 'male', 2025, array[]::text[], 'Q135963716', 1),
  ('cortis', 'Juhoon', null, '김주훈', date '2008-01-03', 'South Korea', 'male', 2025, array[]::text[], 'Q135963733', 2),
  ('cortis', 'Martin', null, '마틴', date '2008-03-20', 'Canada, South Korea', 'male', 2025, array['Leader']::text[], 'Q135963739', 3),
  ('hearts2hearts', 'Jiwoo', null, '최지우', date '2006-09-07', 'South Korea', 'female', 2025, array['Leader']::text[], 'Q131932320', 2),
  ('hearts2hearts', 'Yuha', null, '유하람', date '2007-04-12', 'South Korea', 'female', 2025, array[]::text[], 'Q131932322', 3),
  ('hearts2hearts', 'Stella', null, '김다현', date '2007-06-18', 'Canada, South Korea', 'female', 2025, array[]::text[], 'Q131932323', 4),
  ('team', 'K', null, '케이', date '1997-10-21', 'Japan', 'male', 2022, array[]::text[], 'Q116226143', 1),
  ('team', 'Nicholas', null, '왕이샹', date '2002-07-09', 'Taiwan', 'male', 2022, array[]::text[], 'Q104723121', 3),
  ('team', 'EJ', null, '의주', date '2002-09-07', 'South Korea', 'male', 2022, array['Leader']::text[], 'Q127427815', 4),
  ('akmu', 'Lee Chan-hyuk', null, '이찬혁', date '1996-09-12', 'South Korea', 'male', 2014, array[]::text[], 'Q16071030', 1),
  ('akmu', 'Lee Su-hyun', null, '이수현', date '1999-05-04', 'South Korea', 'female', 2014, array['Maknae']::text[], 'Q18697707', 2),
  ('astro', 'MJ', null, '엠제이', date '1994-03-05', 'South Korea', 'male', 2016, array[]::text[], 'Q47673408', 1),
  ('astro', 'Jinjin', null, '박진우', date '1996-03-15', 'South Korea', 'male', 2016, array['Leader']::text[], 'Q60991892', 2),
  ('astro', 'Eunwoo', 'Cha Eun-woo', '이동민', date '1997-03-30', 'South Korea', 'male', 2016, array[]::text[], 'Q21060390', 3),
  ('astro', 'Sanha', 'Yoon San-ha', '윤산하', date '2000-03-21', 'South Korea', 'male', 2016, array['Maknae']::text[], 'Q56278318', 4);

create temp table k2_sources (qid text not null, field text not null, source text not null, source_ref text not null);
insert into k2_sources (qid, field, source, source_ref) values
  ('Q56259179', 'wikidata_qid', 'wikidata', 'Q56259179'),
  ('Q56259179', 'birth_date', 'wikidata', 'Q56259179'),
  ('Q56259179', 'birth_date', 'musicbrainz', '9fbbbcc3-f2af-4f03-a0b1-844ee5aec94f'),
  ('Q56259179', 'gender', 'wikidata', 'Q56259179'),
  ('Q56259179', 'gender', 'musicbrainz', '9fbbbcc3-f2af-4f03-a0b1-844ee5aec94f'),
  ('Q56259179', 'nationality', 'wikidata', 'Q56259179'),
  ('Q56259179', 'nationality', 'musicbrainz', '9fbbbcc3-f2af-4f03-a0b1-844ee5aec94f'),
  ('Q56259179', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q48893612', 'wikidata_qid', 'wikidata', 'Q48893612'),
  ('Q48893612', 'birth_date', 'wikidata', 'Q48893612'),
  ('Q48893612', 'birth_date', 'musicbrainz', 'be5226fb-2cd4-459d-9dea-2821fa93841c'),
  ('Q48893612', 'gender', 'wikidata', 'Q48893612'),
  ('Q48893612', 'gender', 'musicbrainz', 'be5226fb-2cd4-459d-9dea-2821fa93841c'),
  ('Q48893612', 'nationality', 'wikidata', 'Q48893612'),
  ('Q48893612', 'nationality', 'musicbrainz', 'be5226fb-2cd4-459d-9dea-2821fa93841c'),
  ('Q48893612', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q57318729', 'wikidata_qid', 'wikidata', 'Q57318729'),
  ('Q57318729', 'birth_date', 'wikidata', 'Q57318729'),
  ('Q57318729', 'birth_date', 'musicbrainz', '16e12893-150a-41d7-aaf3-5ad23fc76b39'),
  ('Q57318729', 'gender', 'wikidata', 'Q57318729'),
  ('Q57318729', 'gender', 'musicbrainz', '16e12893-150a-41d7-aaf3-5ad23fc76b39'),
  ('Q57318729', 'nationality', 'wikidata', 'Q57318729'),
  ('Q57318729', 'nationality', 'musicbrainz', '16e12893-150a-41d7-aaf3-5ad23fc76b39'),
  ('Q57318729', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q56824821', 'wikidata_qid', 'wikidata', 'Q56824821'),
  ('Q56824821', 'birth_date', 'wikidata', 'Q56824821'),
  ('Q56824821', 'birth_date', 'musicbrainz', 'f92fe7a1-3429-4d6c-8dd3-4e8b6d8c11be'),
  ('Q56824821', 'gender', 'wikidata', 'Q56824821'),
  ('Q56824821', 'gender', 'musicbrainz', 'f92fe7a1-3429-4d6c-8dd3-4e8b6d8c11be'),
  ('Q56824821', 'nationality', 'wikidata', 'Q56824821'),
  ('Q56824821', 'nationality', 'musicbrainz', 'f92fe7a1-3429-4d6c-8dd3-4e8b6d8c11be'),
  ('Q56824821', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q56816418', 'wikidata_qid', 'wikidata', 'Q56816418'),
  ('Q56816418', 'birth_date', 'wikidata', 'Q56816418'),
  ('Q56816418', 'birth_date', 'musicbrainz', 'e52cff7d-d20e-4d1c-ba2c-4b3ec15726cd'),
  ('Q56816418', 'gender', 'wikidata', 'Q56816418'),
  ('Q56816418', 'gender', 'musicbrainz', 'e52cff7d-d20e-4d1c-ba2c-4b3ec15726cd'),
  ('Q56816418', 'nationality', 'wikidata', 'Q56816418'),
  ('Q56816418', 'nationality', 'musicbrainz', 'e52cff7d-d20e-4d1c-ba2c-4b3ec15726cd'),
  ('Q56816418', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q56825122', 'wikidata_qid', 'wikidata', 'Q56825122'),
  ('Q56825122', 'birth_date', 'wikidata', 'Q56825122'),
  ('Q56825122', 'birth_date', 'musicbrainz', 'dd776077-27c3-4f12-a838-456815ec8066'),
  ('Q56825122', 'gender', 'wikidata', 'Q56825122'),
  ('Q56825122', 'gender', 'musicbrainz', 'dd776077-27c3-4f12-a838-456815ec8066'),
  ('Q56825122', 'nationality', 'wikidata', 'Q56825122'),
  ('Q56825122', 'nationality', 'musicbrainz', 'dd776077-27c3-4f12-a838-456815ec8066'),
  ('Q56825122', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q58224261', 'wikidata_qid', 'wikidata', 'Q58224261'),
  ('Q58224261', 'birth_date', 'wikidata', 'Q58224261'),
  ('Q58224261', 'birth_date', 'musicbrainz', 'da37f5a2-3436-4825-b7dd-1a6e9a82ee33'),
  ('Q58224261', 'gender', 'wikidata', 'Q58224261'),
  ('Q58224261', 'gender', 'musicbrainz', 'da37f5a2-3436-4825-b7dd-1a6e9a82ee33'),
  ('Q58224261', 'nationality', 'wikidata', 'Q58224261'),
  ('Q58224261', 'nationality', 'musicbrainz', 'da37f5a2-3436-4825-b7dd-1a6e9a82ee33'),
  ('Q58224261', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q58825704', 'wikidata_qid', 'wikidata', 'Q58825704'),
  ('Q58825704', 'birth_date', 'wikidata', 'Q58825704'),
  ('Q58825704', 'birth_date', 'musicbrainz', '8339c0c3-7a04-4b19-8ca3-b149e0d09222'),
  ('Q58825704', 'gender', 'wikidata', 'Q58825704'),
  ('Q58825704', 'gender', 'musicbrainz', '8339c0c3-7a04-4b19-8ca3-b149e0d09222'),
  ('Q58825704', 'nationality', 'wikidata', 'Q58825704'),
  ('Q58825704', 'nationality', 'musicbrainz', '8339c0c3-7a04-4b19-8ca3-b149e0d09222'),
  ('Q58825704', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q58825794', 'wikidata_qid', 'wikidata', 'Q58825794'),
  ('Q58825794', 'birth_date', 'wikidata', 'Q58825794'),
  ('Q58825794', 'birth_date', 'musicbrainz', '55783d92-0646-4204-a638-a740e5f6d4dd'),
  ('Q58825794', 'gender', 'wikidata', 'Q58825794'),
  ('Q58825794', 'gender', 'musicbrainz', '55783d92-0646-4204-a638-a740e5f6d4dd'),
  ('Q58825794', 'nationality', 'wikidata', 'Q58825794'),
  ('Q58825794', 'nationality', 'musicbrainz', '55783d92-0646-4204-a638-a740e5f6d4dd'),
  ('Q58825794', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q58825794', 'debut_year', 'musicbrainz', '55783d92-0646-4204-a638-a740e5f6d4dd'),
  ('Q58825825', 'wikidata_qid', 'wikidata', 'Q58825825'),
  ('Q58825825', 'birth_date', 'wikidata', 'Q58825825'),
  ('Q58825825', 'birth_date', 'musicbrainz', '68c9cff6-f48a-4248-9691-6784983d791d'),
  ('Q58825825', 'gender', 'wikidata', 'Q58825825'),
  ('Q58825825', 'gender', 'musicbrainz', '68c9cff6-f48a-4248-9691-6784983d791d'),
  ('Q58825825', 'nationality', 'wikidata', 'Q58825825'),
  ('Q58825825', 'nationality', 'musicbrainz', '68c9cff6-f48a-4248-9691-6784983d791d'),
  ('Q58825825', 'debut_year', 'wikidata', 'Q28025953'),
  ('Q58825825', 'debut_year', 'musicbrainz', '68c9cff6-f48a-4248-9691-6784983d791d'),
  ('Q16075083', 'wikidata_qid', 'wikidata', 'Q16075083'),
  ('Q16075083', 'birth_date', 'wikidata', 'Q16075083'),
  ('Q16075083', 'birth_date', 'musicbrainz', 'bdd935a3-9f19-4b3d-ab39-0953ea3e37b2'),
  ('Q16075083', 'gender', 'wikidata', 'Q16075083'),
  ('Q16075083', 'gender', 'musicbrainz', 'bdd935a3-9f19-4b3d-ab39-0953ea3e37b2'),
  ('Q16075083', 'nationality', 'wikidata', 'Q16075083'),
  ('Q16075083', 'debut_year', 'wikidata', 'Q23772001'),
  ('Q16075083', 'debut_year', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q491048', 'wikidata_qid', 'wikidata', 'Q491048'),
  ('Q491048', 'birth_date', 'wikidata', 'Q491048'),
  ('Q491048', 'birth_date', 'musicbrainz', '5946df9e-3008-4e50-8fe5-11b2db1a789d'),
  ('Q491048', 'gender', 'wikidata', 'Q491048'),
  ('Q491048', 'gender', 'musicbrainz', '5946df9e-3008-4e50-8fe5-11b2db1a789d'),
  ('Q491048', 'nationality', 'wikidata', 'Q491048'),
  ('Q491048', 'nationality', 'musicbrainz', '5946df9e-3008-4e50-8fe5-11b2db1a789d'),
  ('Q491048', 'debut_year', 'wikidata', 'Q23772001'),
  ('Q491048', 'debut_year', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q16905948', 'wikidata_qid', 'wikidata', 'Q16905948'),
  ('Q16905948', 'birth_date', 'wikidata', 'Q16905948'),
  ('Q16905948', 'birth_date', 'musicbrainz', '993b5a29-a8f1-49d7-9ef3-e05233041454'),
  ('Q16905948', 'gender', 'wikidata', 'Q16905948'),
  ('Q16905948', 'gender', 'musicbrainz', '993b5a29-a8f1-49d7-9ef3-e05233041454'),
  ('Q16905948', 'nationality', 'wikidata', 'Q16905948'),
  ('Q16905948', 'debut_year', 'wikidata', 'Q23772001'),
  ('Q16905948', 'debut_year', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q492313', 'wikidata_qid', 'wikidata', 'Q492313'),
  ('Q492313', 'birth_date', 'wikidata', 'Q492313'),
  ('Q492313', 'birth_date', 'musicbrainz', '77cb0d7a-c6b9-4cf2-a36c-34b1246b9ea3'),
  ('Q492313', 'gender', 'wikidata', 'Q492313'),
  ('Q492313', 'gender', 'musicbrainz', '77cb0d7a-c6b9-4cf2-a36c-34b1246b9ea3'),
  ('Q492313', 'nationality', 'wikidata', 'Q492313'),
  ('Q492313', 'nationality', 'musicbrainz', '77cb0d7a-c6b9-4cf2-a36c-34b1246b9ea3'),
  ('Q492313', 'debut_year', 'wikidata', 'Q23772001'),
  ('Q492313', 'debut_year', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q17500581', 'wikidata_qid', 'wikidata', 'Q17500581'),
  ('Q17500581', 'birth_date', 'wikidata', 'Q17500581'),
  ('Q17500581', 'birth_date', 'musicbrainz', '91dfde5c-1d9a-4ab0-a345-02af722ba0f8'),
  ('Q17500581', 'gender', 'wikidata', 'Q17500581'),
  ('Q17500581', 'gender', 'musicbrainz', '91dfde5c-1d9a-4ab0-a345-02af722ba0f8'),
  ('Q17500581', 'nationality', 'wikidata', 'Q17500581'),
  ('Q17500581', 'nationality', 'musicbrainz', '91dfde5c-1d9a-4ab0-a345-02af722ba0f8'),
  ('Q17500581', 'debut_year', 'wikidata', 'Q23772001'),
  ('Q17500581', 'debut_year', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q16688282', 'wikidata_qid', 'wikidata', 'Q16688282'),
  ('Q16688282', 'birth_date', 'wikidata', 'Q16688282'),
  ('Q16688282', 'birth_date', 'musicbrainz', '69d7da17-96ab-403c-a0a0-be872220aa51'),
  ('Q16688282', 'gender', 'wikidata', 'Q16688282'),
  ('Q16688282', 'gender', 'musicbrainz', '69d7da17-96ab-403c-a0a0-be872220aa51'),
  ('Q16688282', 'nationality', 'wikidata', 'Q16688282'),
  ('Q16688282', 'debut_year', 'wikidata', 'Q23772001'),
  ('Q16688282', 'debut_year', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q17500887', 'wikidata_qid', 'wikidata', 'Q17500887'),
  ('Q17500887', 'birth_date', 'wikidata', 'Q17500887'),
  ('Q17500887', 'birth_date', 'musicbrainz', 'b53ca3f2-33f9-4565-bfc3-7323063ae0da'),
  ('Q17500887', 'gender', 'wikidata', 'Q17500887'),
  ('Q17500887', 'gender', 'musicbrainz', 'b53ca3f2-33f9-4565-bfc3-7323063ae0da'),
  ('Q17500887', 'nationality', 'wikidata', 'Q17500887'),
  ('Q17500887', 'nationality', 'musicbrainz', 'b53ca3f2-33f9-4565-bfc3-7323063ae0da'),
  ('Q17500887', 'debut_year', 'wikidata', 'Q23772001'),
  ('Q17500887', 'debut_year', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
  ('Q24834621', 'wikidata_qid', 'wikidata', 'Q24834621'),
  ('Q24834621', 'birth_date', 'wikidata', 'Q24834621'),
  ('Q24834621', 'birth_date', 'musicbrainz', 'e8cbcb43-6fef-4789-86c1-1aafb7c27ed6'),
  ('Q24834621', 'gender', 'wikidata', 'Q24834621'),
  ('Q24834621', 'gender', 'musicbrainz', 'e8cbcb43-6fef-4789-86c1-1aafb7c27ed6'),
  ('Q24834621', 'nationality', 'wikidata', 'Q24834621'),
  ('Q24834621', 'nationality', 'musicbrainz', 'e8cbcb43-6fef-4789-86c1-1aafb7c27ed6'),
  ('Q24834621', 'debut_year', 'wikidata', 'Q19855151'),
  ('Q24834621', 'debut_year', 'musicbrainz', '766951af-4c35-4ecf-a6ee-6001e9a263e6'),
  ('Q28746303', 'wikidata_qid', 'wikidata', 'Q28746303'),
  ('Q28746303', 'birth_date', 'wikidata', 'Q28746303'),
  ('Q28746303', 'birth_date', 'musicbrainz', '46584aa3-de4f-4f43-b630-3129868c14ea'),
  ('Q28746303', 'gender', 'wikidata', 'Q28746303'),
  ('Q28746303', 'gender', 'musicbrainz', '46584aa3-de4f-4f43-b630-3129868c14ea'),
  ('Q28746303', 'nationality', 'wikidata', 'Q28746303'),
  ('Q28746303', 'nationality', 'musicbrainz', '46584aa3-de4f-4f43-b630-3129868c14ea'),
  ('Q28746303', 'debut_year', 'wikidata', 'Q19855151'),
  ('Q28746303', 'debut_year', 'musicbrainz', '766951af-4c35-4ecf-a6ee-6001e9a263e6'),
  ('Q27951584', 'wikidata_qid', 'wikidata', 'Q27951584'),
  ('Q27951584', 'birth_date', 'wikidata', 'Q27951584'),
  ('Q27951584', 'birth_date', 'musicbrainz', '4cbe196f-025f-4b7e-9cb2-eaac0b6ec01b'),
  ('Q27951584', 'gender', 'wikidata', 'Q27951584'),
  ('Q27951584', 'gender', 'musicbrainz', '4cbe196f-025f-4b7e-9cb2-eaac0b6ec01b'),
  ('Q27951584', 'nationality', 'wikidata', 'Q27951584'),
  ('Q27951584', 'nationality', 'musicbrainz', '4cbe196f-025f-4b7e-9cb2-eaac0b6ec01b'),
  ('Q27951584', 'debut_year', 'wikidata', 'Q19855151'),
  ('Q27951584', 'debut_year', 'musicbrainz', '766951af-4c35-4ecf-a6ee-6001e9a263e6'),
  ('Q28549791', 'wikidata_qid', 'wikidata', 'Q28549791'),
  ('Q28549791', 'birth_date', 'wikidata', 'Q28549791'),
  ('Q28549791', 'birth_date', 'musicbrainz', '5eb88fce-7fc1-4a5b-bd5b-8619c8c91a6b'),
  ('Q28549791', 'gender', 'wikidata', 'Q28549791'),
  ('Q28549791', 'gender', 'musicbrainz', '5eb88fce-7fc1-4a5b-bd5b-8619c8c91a6b'),
  ('Q28549791', 'nationality', 'wikidata', 'Q28549791'),
  ('Q28549791', 'nationality', 'musicbrainz', '5eb88fce-7fc1-4a5b-bd5b-8619c8c91a6b'),
  ('Q28549791', 'debut_year', 'wikidata', 'Q19855151'),
  ('Q28549791', 'debut_year', 'musicbrainz', '766951af-4c35-4ecf-a6ee-6001e9a263e6'),
  ('Q23008017', 'wikidata_qid', 'wikidata', 'Q23008017'),
  ('Q23008017', 'birth_date', 'wikidata', 'Q23008017'),
  ('Q23008017', 'birth_date', 'musicbrainz', '0931b6d2-c469-4203-ab70-00d8222e6bdd'),
  ('Q23008017', 'gender', 'wikidata', 'Q23008017'),
  ('Q23008017', 'gender', 'musicbrainz', '0931b6d2-c469-4203-ab70-00d8222e6bdd'),
  ('Q23008017', 'nationality', 'wikidata', 'Q23008017'),
  ('Q23008017', 'nationality', 'musicbrainz', '0931b6d2-c469-4203-ab70-00d8222e6bdd'),
  ('Q23008017', 'debut_year', 'wikidata', 'Q19855151'),
  ('Q23008017', 'debut_year', 'musicbrainz', '766951af-4c35-4ecf-a6ee-6001e9a263e6'),
  ('Q28549782', 'wikidata_qid', 'wikidata', 'Q28549782'),
  ('Q28549782', 'birth_date', 'wikidata', 'Q28549782'),
  ('Q28549782', 'birth_date', 'musicbrainz', 'e32e7d66-3d1f-4f8a-b339-90c02ebfe465'),
  ('Q28549782', 'gender', 'wikidata', 'Q28549782'),
  ('Q28549782', 'gender', 'musicbrainz', 'e32e7d66-3d1f-4f8a-b339-90c02ebfe465'),
  ('Q28549782', 'nationality', 'wikidata', 'Q28549782'),
  ('Q28549782', 'nationality', 'musicbrainz', 'e32e7d66-3d1f-4f8a-b339-90c02ebfe465'),
  ('Q28549782', 'debut_year', 'wikidata', 'Q19855151'),
  ('Q28549782', 'debut_year', 'musicbrainz', '766951af-4c35-4ecf-a6ee-6001e9a263e6'),
  ('Q233371', 'wikidata_qid', 'wikidata', 'Q233371'),
  ('Q233371', 'birth_date', 'wikidata', 'Q233371'),
  ('Q233371', 'birth_date', 'musicbrainz', '2b786fb3-a116-4163-9b65-cf56f03c8a7f'),
  ('Q233371', 'gender', 'wikidata', 'Q233371'),
  ('Q233371', 'gender', 'musicbrainz', '2b786fb3-a116-4163-9b65-cf56f03c8a7f'),
  ('Q233371', 'nationality', 'wikidata', 'Q233371'),
  ('Q233371', 'nationality', 'musicbrainz', '2b786fb3-a116-4163-9b65-cf56f03c8a7f'),
  ('Q233371', 'debut_year', 'wikidata', 'Q20153'),
  ('Q233371', 'debut_year', 'musicbrainz', '385e406a-4f46-4836-b8d0-776c63ace34f'),
  ('Q233894', 'wikidata_qid', 'wikidata', 'Q233894'),
  ('Q233894', 'birth_date', 'wikidata', 'Q233894'),
  ('Q233894', 'birth_date', 'musicbrainz', '3c59eca2-15d4-425f-8b5d-043470c83635'),
  ('Q233894', 'gender', 'wikidata', 'Q233894'),
  ('Q233894', 'gender', 'musicbrainz', '3c59eca2-15d4-425f-8b5d-043470c83635'),
  ('Q233894', 'nationality', 'wikidata', 'Q233894'),
  ('Q233894', 'nationality', 'musicbrainz', '3c59eca2-15d4-425f-8b5d-043470c83635'),
  ('Q233894', 'debut_year', 'wikidata', 'Q20153'),
  ('Q233894', 'debut_year', 'musicbrainz', '385e406a-4f46-4836-b8d0-776c63ace34f'),
  ('Q236355', 'wikidata_qid', 'wikidata', 'Q236355'),
  ('Q236355', 'birth_date', 'wikidata', 'Q236355'),
  ('Q236355', 'birth_date', 'musicbrainz', '908fa819-3af6-4373-a051-75e4827605cf'),
  ('Q236355', 'gender', 'wikidata', 'Q236355'),
  ('Q236355', 'gender', 'musicbrainz', '908fa819-3af6-4373-a051-75e4827605cf'),
  ('Q236355', 'nationality', 'wikidata', 'Q236355'),
  ('Q236355', 'nationality', 'musicbrainz', '908fa819-3af6-4373-a051-75e4827605cf'),
  ('Q236355', 'debut_year', 'wikidata', 'Q20153'),
  ('Q236355', 'debut_year', 'musicbrainz', '385e406a-4f46-4836-b8d0-776c63ace34f'),
  ('Q253619', 'wikidata_qid', 'wikidata', 'Q253619'),
  ('Q253619', 'birth_date', 'wikidata', 'Q253619'),
  ('Q253619', 'birth_date', 'musicbrainz', 'f2911ba4-9eaf-4ae2-b7a2-0f27b7a955be'),
  ('Q253619', 'gender', 'wikidata', 'Q253619'),
  ('Q253619', 'gender', 'musicbrainz', 'f2911ba4-9eaf-4ae2-b7a2-0f27b7a955be'),
  ('Q253619', 'nationality', 'wikidata', 'Q253619'),
  ('Q253619', 'nationality', 'musicbrainz', 'f2911ba4-9eaf-4ae2-b7a2-0f27b7a955be'),
  ('Q253619', 'debut_year', 'wikidata', 'Q20153'),
  ('Q253619', 'debut_year', 'musicbrainz', '385e406a-4f46-4836-b8d0-776c63ace34f'),
  ('Q276158', 'wikidata_qid', 'wikidata', 'Q276158'),
  ('Q276158', 'birth_date', 'wikidata', 'Q276158'),
  ('Q276158', 'birth_date', 'musicbrainz', '2dbc4ab5-45b5-450c-a85f-4e3a83204b1c'),
  ('Q276158', 'gender', 'wikidata', 'Q276158'),
  ('Q276158', 'gender', 'musicbrainz', '2dbc4ab5-45b5-450c-a85f-4e3a83204b1c'),
  ('Q276158', 'nationality', 'wikidata', 'Q276158'),
  ('Q276158', 'nationality', 'musicbrainz', '2dbc4ab5-45b5-450c-a85f-4e3a83204b1c'),
  ('Q276158', 'debut_year', 'wikidata', 'Q20153'),
  ('Q276158', 'debut_year', 'musicbrainz', '385e406a-4f46-4836-b8d0-776c63ace34f'),
  ('Q233385', 'wikidata_qid', 'wikidata', 'Q233385'),
  ('Q233385', 'birth_date', 'wikidata', 'Q233385'),
  ('Q233385', 'birth_date', 'musicbrainz', '0341e982-8db8-4daa-a974-c7b6f27b2e66'),
  ('Q233385', 'gender', 'wikidata', 'Q233385'),
  ('Q233385', 'gender', 'musicbrainz', '0341e982-8db8-4daa-a974-c7b6f27b2e66'),
  ('Q233385', 'nationality', 'wikidata', 'Q233385'),
  ('Q233385', 'nationality', 'musicbrainz', '0341e982-8db8-4daa-a974-c7b6f27b2e66'),
  ('Q233385', 'debut_year', 'wikidata', 'Q20153'),
  ('Q233385', 'debut_year', 'musicbrainz', '385e406a-4f46-4836-b8d0-776c63ace34f'),
  ('Q466975', 'wikidata_qid', 'wikidata', 'Q466975'),
  ('Q466975', 'birth_date', 'wikidata', 'Q466975'),
  ('Q466975', 'gender', 'wikidata', 'Q466975'),
  ('Q466975', 'gender', 'musicbrainz', '13b8076d-532c-4692-b896-6ecac9d9d8f4'),
  ('Q466975', 'nationality', 'wikidata', 'Q466975'),
  ('Q466975', 'nationality', 'musicbrainz', '13b8076d-532c-4692-b896-6ecac9d9d8f4'),
  ('Q466975', 'debut_year', 'wikidata', 'Q20153'),
  ('Q466975', 'debut_year', 'musicbrainz', '385e406a-4f46-4836-b8d0-776c63ace34f'),
  ('Q240082', 'wikidata_qid', 'wikidata', 'Q240082'),
  ('Q240082', 'birth_date', 'wikidata', 'Q240082'),
  ('Q240082', 'birth_date', 'musicbrainz', '4c76ba5a-281b-4785-b99f-0c0146f1bac3'),
  ('Q240082', 'gender', 'wikidata', 'Q240082'),
  ('Q240082', 'gender', 'musicbrainz', '4c76ba5a-281b-4785-b99f-0c0146f1bac3'),
  ('Q240082', 'nationality', 'wikidata', 'Q240082'),
  ('Q240082', 'nationality', 'musicbrainz', '4c76ba5a-281b-4785-b99f-0c0146f1bac3'),
  ('Q240082', 'debut_year', 'wikidata', 'Q20153'),
  ('Q240082', 'debut_year', 'musicbrainz', '385e406a-4f46-4836-b8d0-776c63ace34f'),
  ('Q115933814', 'wikidata_qid', 'wikidata', 'Q115933814'),
  ('Q115933814', 'birth_date', 'wikidata', 'Q115933814'),
  ('Q115933814', 'birth_date', 'musicbrainz', 'f7b7dbbb-56e2-4da7-91c1-b1b26c11c399'),
  ('Q115933814', 'gender', 'wikidata', 'Q115933814'),
  ('Q115933814', 'gender', 'musicbrainz', 'f7b7dbbb-56e2-4da7-91c1-b1b26c11c399'),
  ('Q115933814', 'nationality', 'wikidata', 'Q115933814'),
  ('Q115933814', 'nationality', 'musicbrainz', 'f7b7dbbb-56e2-4da7-91c1-b1b26c11c399'),
  ('Q115933814', 'debut_year', 'musicbrainz', '011bd598-d711-42d1-9f23-0ca2ec5ea59a'),
  ('Q117746200', 'wikidata_qid', 'wikidata', 'Q117746200'),
  ('Q117746200', 'birth_date', 'wikidata', 'Q117746200'),
  ('Q117746200', 'birth_date', 'musicbrainz', '106573ab-00df-48fe-a022-7cced047923e'),
  ('Q117746200', 'gender', 'wikidata', 'Q117746200'),
  ('Q117746200', 'gender', 'musicbrainz', '106573ab-00df-48fe-a022-7cced047923e'),
  ('Q117746200', 'nationality', 'wikidata', 'Q117746200'),
  ('Q117746200', 'nationality', 'musicbrainz', '106573ab-00df-48fe-a022-7cced047923e'),
  ('Q117746200', 'debut_year', 'wikidata', 'Q117746200'),
  ('Q117746200', 'debut_year', 'musicbrainz', '011bd598-d711-42d1-9f23-0ca2ec5ea59a'),
  ('Q117817675', 'wikidata_qid', 'wikidata', 'Q117817675'),
  ('Q117817675', 'birth_date', 'wikidata', 'Q117817675'),
  ('Q117817675', 'birth_date', 'musicbrainz', '3ee96b6f-e2fe-461f-a035-8db7a224e74d'),
  ('Q117817675', 'gender', 'wikidata', 'Q117817675'),
  ('Q117817675', 'gender', 'musicbrainz', '3ee96b6f-e2fe-461f-a035-8db7a224e74d'),
  ('Q117817675', 'nationality', 'wikidata', 'Q117817675'),
  ('Q117817675', 'nationality', 'musicbrainz', '3ee96b6f-e2fe-461f-a035-8db7a224e74d'),
  ('Q117817675', 'debut_year', 'musicbrainz', '011bd598-d711-42d1-9f23-0ca2ec5ea59a'),
  ('Q117818064', 'wikidata_qid', 'wikidata', 'Q117818064'),
  ('Q117818064', 'birth_date', 'wikidata', 'Q117818064'),
  ('Q117818064', 'birth_date', 'musicbrainz', '00d00be3-34eb-4e44-89ca-e13ed23b51b5'),
  ('Q117818064', 'gender', 'wikidata', 'Q117818064'),
  ('Q117818064', 'gender', 'musicbrainz', '00d00be3-34eb-4e44-89ca-e13ed23b51b5'),
  ('Q117818064', 'nationality', 'wikidata', 'Q117818064'),
  ('Q117818064', 'nationality', 'musicbrainz', '00d00be3-34eb-4e44-89ca-e13ed23b51b5'),
  ('Q117818064', 'debut_year', 'musicbrainz', '011bd598-d711-42d1-9f23-0ca2ec5ea59a'),
  ('Q19483969', 'wikidata_qid', 'wikidata', 'Q19483969'),
  ('Q19483969', 'birth_date', 'wikidata', 'Q19483969'),
  ('Q19483969', 'birth_date', 'musicbrainz', '8377538d-c3c9-4588-a9e5-29a7de6d9cd1'),
  ('Q19483969', 'gender', 'wikidata', 'Q19483969'),
  ('Q19483969', 'gender', 'musicbrainz', '8377538d-c3c9-4588-a9e5-29a7de6d9cd1'),
  ('Q19483969', 'nationality', 'wikidata', 'Q19483969'),
  ('Q19483969', 'nationality', 'musicbrainz', '8377538d-c3c9-4588-a9e5-29a7de6d9cd1'),
  ('Q19483969', 'debut_year', 'wikidata', 'Q17278068'),
  ('Q19483969', 'debut_year', 'musicbrainz', 'fd474ee0-1b3b-49f2-a8d6-0d840c54074e'),
  ('Q19483782', 'wikidata_qid', 'wikidata', 'Q19483782'),
  ('Q19483782', 'birth_date', 'wikidata', 'Q19483782'),
  ('Q19483782', 'birth_date', 'musicbrainz', '1478adcd-e96c-441b-b5db-89d66ff456f7'),
  ('Q19483782', 'gender', 'wikidata', 'Q19483782'),
  ('Q19483782', 'gender', 'musicbrainz', '1478adcd-e96c-441b-b5db-89d66ff456f7'),
  ('Q19483782', 'nationality', 'wikidata', 'Q19483782'),
  ('Q19483782', 'nationality', 'musicbrainz', '1478adcd-e96c-441b-b5db-89d66ff456f7'),
  ('Q19483782', 'debut_year', 'wikidata', 'Q17278068'),
  ('Q19483782', 'debut_year', 'musicbrainz', 'fd474ee0-1b3b-49f2-a8d6-0d840c54074e'),
  ('Q19603930', 'wikidata_qid', 'wikidata', 'Q19603930'),
  ('Q19603930', 'birth_date', 'wikidata', 'Q19603930'),
  ('Q19603930', 'birth_date', 'musicbrainz', '3651544b-372b-436e-99a0-ffc43f477a1c'),
  ('Q19603930', 'gender', 'wikidata', 'Q19603930'),
  ('Q19603930', 'gender', 'musicbrainz', '3651544b-372b-436e-99a0-ffc43f477a1c'),
  ('Q19603930', 'nationality', 'wikidata', 'Q19603930'),
  ('Q19603930', 'nationality', 'musicbrainz', '3651544b-372b-436e-99a0-ffc43f477a1c'),
  ('Q19603930', 'debut_year', 'wikidata', 'Q17278068'),
  ('Q19603930', 'debut_year', 'musicbrainz', 'fd474ee0-1b3b-49f2-a8d6-0d840c54074e'),
  ('Q19603912', 'wikidata_qid', 'wikidata', 'Q19603912'),
  ('Q19603912', 'birth_date', 'wikidata', 'Q19603912'),
  ('Q19603912', 'birth_date', 'musicbrainz', '9c750319-8267-493a-aaaf-305e1c6bcc21'),
  ('Q19603912', 'gender', 'wikidata', 'Q19603912'),
  ('Q19603912', 'gender', 'musicbrainz', '9c750319-8267-493a-aaaf-305e1c6bcc21'),
  ('Q19603912', 'nationality', 'wikidata', 'Q19603912'),
  ('Q19603912', 'nationality', 'musicbrainz', '9c750319-8267-493a-aaaf-305e1c6bcc21'),
  ('Q19603912', 'debut_year', 'wikidata', 'Q17278068'),
  ('Q19603912', 'debut_year', 'musicbrainz', 'fd474ee0-1b3b-49f2-a8d6-0d840c54074e'),
  ('Q482991', 'wikidata_qid', 'wikidata', 'Q482991'),
  ('Q482991', 'birth_date', 'wikidata', 'Q482991'),
  ('Q482991', 'birth_date', 'musicbrainz', 'd84e5667-3cbe-4556-b551-9d7e4be95d71'),
  ('Q482991', 'gender', 'wikidata', 'Q482991'),
  ('Q482991', 'gender', 'musicbrainz', 'd84e5667-3cbe-4556-b551-9d7e4be95d71'),
  ('Q482991', 'nationality', 'wikidata', 'Q482991'),
  ('Q482991', 'nationality', 'musicbrainz', 'd84e5667-3cbe-4556-b551-9d7e4be95d71'),
  ('Q482991', 'debut_year', 'wikidata', 'Q282104'),
  ('Q482991', 'debut_year', 'musicbrainz', '97d1c5b1-0be8-4ec7-b99d-68be81c0315f'),
  ('Q495577', 'wikidata_qid', 'wikidata', 'Q495577'),
  ('Q495577', 'birth_date', 'wikidata', 'Q495577'),
  ('Q495577', 'birth_date', 'musicbrainz', 'b4f66d7f-3282-404e-a682-97374d63b5ab'),
  ('Q495577', 'gender', 'wikidata', 'Q495577'),
  ('Q495577', 'gender', 'musicbrainz', 'b4f66d7f-3282-404e-a682-97374d63b5ab'),
  ('Q495577', 'nationality', 'wikidata', 'Q495577'),
  ('Q495577', 'nationality', 'musicbrainz', 'b4f66d7f-3282-404e-a682-97374d63b5ab'),
  ('Q495577', 'debut_year', 'wikidata', 'Q282104'),
  ('Q495577', 'debut_year', 'musicbrainz', '97d1c5b1-0be8-4ec7-b99d-68be81c0315f'),
  ('Q194798', 'wikidata_qid', 'wikidata', 'Q194798'),
  ('Q194798', 'birth_date', 'wikidata', 'Q194798'),
  ('Q194798', 'birth_date', 'musicbrainz', '268b782c-b6c7-41a4-b2ef-36cddd76b6ad'),
  ('Q194798', 'gender', 'wikidata', 'Q194798'),
  ('Q194798', 'gender', 'musicbrainz', '268b782c-b6c7-41a4-b2ef-36cddd76b6ad'),
  ('Q194798', 'nationality', 'wikidata', 'Q194798'),
  ('Q194798', 'nationality', 'musicbrainz', '268b782c-b6c7-41a4-b2ef-36cddd76b6ad'),
  ('Q194798', 'debut_year', 'wikidata', 'Q282104'),
  ('Q194798', 'debut_year', 'musicbrainz', '97d1c5b1-0be8-4ec7-b99d-68be81c0315f'),
  ('Q124692767', 'wikidata_qid', 'wikidata', 'Q124692767'),
  ('Q124692767', 'birth_date', 'wikidata', 'Q124692767'),
  ('Q124692767', 'birth_date', 'musicbrainz', '136f98b4-9730-409c-a361-374e72b3830c'),
  ('Q124692767', 'gender', 'wikidata', 'Q124692767'),
  ('Q124692767', 'gender', 'musicbrainz', '136f98b4-9730-409c-a361-374e72b3830c'),
  ('Q124692767', 'nationality', 'wikidata', 'Q124692767'),
  ('Q124692767', 'nationality', 'musicbrainz', '136f98b4-9730-409c-a361-374e72b3830c'),
  ('Q124692767', 'debut_year', 'wikidata', 'Q124692767'),
  ('Q124692767', 'debut_year', 'musicbrainz', 'b8b3e910-6c1a-4fd4-a4e6-d2d13d2836c9'),
  ('Q124692773', 'wikidata_qid', 'wikidata', 'Q124692773'),
  ('Q124692773', 'birth_date', 'wikidata', 'Q124692773'),
  ('Q124692773', 'birth_date', 'musicbrainz', '97760d94-e84e-4daa-90c8-5ccf80f3fb86'),
  ('Q124692773', 'gender', 'wikidata', 'Q124692773'),
  ('Q124692773', 'gender', 'musicbrainz', '97760d94-e84e-4daa-90c8-5ccf80f3fb86'),
  ('Q124692773', 'nationality', 'wikidata', 'Q124692773'),
  ('Q124692773', 'nationality', 'musicbrainz', '97760d94-e84e-4daa-90c8-5ccf80f3fb86'),
  ('Q124692773', 'debut_year', 'wikidata', 'Q124692773'),
  ('Q124692773', 'debut_year', 'musicbrainz', 'b8b3e910-6c1a-4fd4-a4e6-d2d13d2836c9'),
  ('Q124692741', 'wikidata_qid', 'wikidata', 'Q124692741'),
  ('Q124692741', 'birth_date', 'wikidata', 'Q124692741'),
  ('Q124692741', 'birth_date', 'musicbrainz', '22ff5fa0-eab6-4782-9989-a96b9a938786'),
  ('Q124692741', 'gender', 'wikidata', 'Q124692741'),
  ('Q124692741', 'gender', 'musicbrainz', '22ff5fa0-eab6-4782-9989-a96b9a938786'),
  ('Q124692741', 'nationality', 'wikidata', 'Q124692741'),
  ('Q124692741', 'nationality', 'musicbrainz', '22ff5fa0-eab6-4782-9989-a96b9a938786'),
  ('Q124692741', 'debut_year', 'musicbrainz', 'b8b3e910-6c1a-4fd4-a4e6-d2d13d2836c9'),
  ('Q124692787', 'wikidata_qid', 'wikidata', 'Q124692787'),
  ('Q124692787', 'birth_date', 'wikidata', 'Q124692787'),
  ('Q124692787', 'birth_date', 'musicbrainz', '884d5bf2-8af4-47d1-b43c-5bf4dbd490f5'),
  ('Q124692787', 'gender', 'wikidata', 'Q124692787'),
  ('Q124692787', 'gender', 'musicbrainz', '884d5bf2-8af4-47d1-b43c-5bf4dbd490f5'),
  ('Q124692787', 'nationality', 'wikidata', 'Q124692787'),
  ('Q124692787', 'nationality', 'musicbrainz', '884d5bf2-8af4-47d1-b43c-5bf4dbd490f5'),
  ('Q124692787', 'debut_year', 'wikidata', 'Q124692787'),
  ('Q124692787', 'debut_year', 'musicbrainz', 'b8b3e910-6c1a-4fd4-a4e6-d2d13d2836c9'),
  ('Q124692753', 'wikidata_qid', 'wikidata', 'Q124692753'),
  ('Q124692753', 'birth_date', 'wikidata', 'Q124692753'),
  ('Q124692753', 'birth_date', 'musicbrainz', '557e2afa-96c5-4830-aed7-bab18faf4cb1'),
  ('Q124692753', 'gender', 'wikidata', 'Q124692753'),
  ('Q124692753', 'gender', 'musicbrainz', '557e2afa-96c5-4830-aed7-bab18faf4cb1'),
  ('Q124692753', 'nationality', 'wikidata', 'Q124692753'),
  ('Q124692753', 'nationality', 'musicbrainz', '557e2afa-96c5-4830-aed7-bab18faf4cb1'),
  ('Q124692753', 'debut_year', 'wikidata', 'Q124692753'),
  ('Q124692753', 'debut_year', 'musicbrainz', 'b8b3e910-6c1a-4fd4-a4e6-d2d13d2836c9'),
  ('Q126923756', 'wikidata_qid', 'wikidata', 'Q126923756'),
  ('Q126923756', 'birth_date', 'wikidata', 'Q126923756'),
  ('Q126923756', 'birth_date', 'musicbrainz', '148210fe-0112-4e69-baf7-796b4c7a3988'),
  ('Q126923756', 'gender', 'wikidata', 'Q126923756'),
  ('Q126923756', 'gender', 'musicbrainz', '148210fe-0112-4e69-baf7-796b4c7a3988'),
  ('Q126923756', 'nationality', 'wikidata', 'Q126923756'),
  ('Q126923756', 'nationality', 'musicbrainz', '148210fe-0112-4e69-baf7-796b4c7a3988'),
  ('Q126923756', 'debut_year', 'wikidata', 'Q122179261'),
  ('Q126923756', 'debut_year', 'musicbrainz', '529f87a1-1081-48a4-8ee1-3c08de229858'),
  ('Q126923757', 'wikidata_qid', 'wikidata', 'Q126923757'),
  ('Q126923757', 'birth_date', 'wikidata', 'Q126923757'),
  ('Q126923757', 'birth_date', 'musicbrainz', '19687944-a17a-480b-b8e6-721b475ca283'),
  ('Q126923757', 'gender', 'wikidata', 'Q126923757'),
  ('Q126923757', 'gender', 'musicbrainz', '19687944-a17a-480b-b8e6-721b475ca283'),
  ('Q126923757', 'nationality', 'wikidata', 'Q126923757'),
  ('Q126923757', 'nationality', 'musicbrainz', '19687944-a17a-480b-b8e6-721b475ca283'),
  ('Q126923757', 'debut_year', 'wikidata', 'Q122179261'),
  ('Q126923757', 'debut_year', 'musicbrainz', '529f87a1-1081-48a4-8ee1-3c08de229858'),
  ('Q126923760', 'wikidata_qid', 'wikidata', 'Q126923760'),
  ('Q126923760', 'birth_date', 'wikidata', 'Q126923760'),
  ('Q126923760', 'birth_date', 'musicbrainz', 'bb1944bb-4be6-44b4-b330-cd0c66a7e10f'),
  ('Q126923760', 'gender', 'wikidata', 'Q126923760'),
  ('Q126923760', 'gender', 'musicbrainz', 'bb1944bb-4be6-44b4-b330-cd0c66a7e10f'),
  ('Q126923760', 'nationality', 'wikidata', 'Q126923760'),
  ('Q126923760', 'nationality', 'musicbrainz', 'bb1944bb-4be6-44b4-b330-cd0c66a7e10f'),
  ('Q126923760', 'debut_year', 'wikidata', 'Q122179261'),
  ('Q126923760', 'debut_year', 'musicbrainz', '529f87a1-1081-48a4-8ee1-3c08de229858'),
  ('Q126923761', 'wikidata_qid', 'wikidata', 'Q126923761'),
  ('Q126923761', 'birth_date', 'wikidata', 'Q126923761'),
  ('Q126923761', 'birth_date', 'musicbrainz', 'f3079b7a-333e-4369-b7f7-5319003d720c'),
  ('Q126923761', 'gender', 'wikidata', 'Q126923761'),
  ('Q126923761', 'gender', 'musicbrainz', 'f3079b7a-333e-4369-b7f7-5319003d720c'),
  ('Q126923761', 'nationality', 'wikidata', 'Q126923761'),
  ('Q126923761', 'debut_year', 'wikidata', 'Q122179261'),
  ('Q126923761', 'debut_year', 'musicbrainz', '529f87a1-1081-48a4-8ee1-3c08de229858'),
  ('Q63850969', 'wikidata_qid', 'wikidata', 'Q63850969'),
  ('Q63850969', 'birth_date', 'wikidata', 'Q63850969'),
  ('Q63850969', 'birth_date', 'musicbrainz', '2e0fdf9f-9ac1-4230-a795-90ad0df3ef52'),
  ('Q63850969', 'gender', 'wikidata', 'Q63850969'),
  ('Q63850969', 'gender', 'musicbrainz', '2e0fdf9f-9ac1-4230-a795-90ad0df3ef52'),
  ('Q63850969', 'nationality', 'wikidata', 'Q63850969'),
  ('Q63850969', 'nationality', 'musicbrainz', '2e0fdf9f-9ac1-4230-a795-90ad0df3ef52'),
  ('Q63850969', 'debut_year', 'wikidata', 'Q63850969'),
  ('Q63850969', 'debut_year', 'musicbrainz', 'e9ad3659-1efa-48d1-9510-2743663cfea2'),
  ('Q97319986', 'wikidata_qid', 'wikidata', 'Q97319986'),
  ('Q97319986', 'birth_date', 'wikidata', 'Q97319986'),
  ('Q97319986', 'birth_date', 'musicbrainz', 'e3b47c66-097b-4676-b12e-e047d81ca3b1'),
  ('Q97319986', 'gender', 'wikidata', 'Q97319986'),
  ('Q97319986', 'gender', 'musicbrainz', 'e3b47c66-097b-4676-b12e-e047d81ca3b1'),
  ('Q97319986', 'nationality', 'wikidata', 'Q97319986'),
  ('Q97319986', 'nationality', 'musicbrainz', 'e3b47c66-097b-4676-b12e-e047d81ca3b1'),
  ('Q97319986', 'debut_year', 'wikidata', 'Q97319986'),
  ('Q97319986', 'debut_year', 'musicbrainz', 'e9ad3659-1efa-48d1-9510-2743663cfea2'),
  ('Q98136886', 'wikidata_qid', 'wikidata', 'Q98136886'),
  ('Q98136886', 'birth_date', 'wikidata', 'Q98136886'),
  ('Q98136886', 'birth_date', 'musicbrainz', '8a248619-1a0c-42a4-beb5-8455d51a5341'),
  ('Q98136886', 'gender', 'wikidata', 'Q98136886'),
  ('Q98136886', 'gender', 'musicbrainz', '8a248619-1a0c-42a4-beb5-8455d51a5341'),
  ('Q98136886', 'nationality', 'wikidata', 'Q98136886'),
  ('Q98136886', 'nationality', 'musicbrainz', '8a248619-1a0c-42a4-beb5-8455d51a5341'),
  ('Q98136886', 'debut_year', 'wikidata', 'Q98136886'),
  ('Q98136886', 'debut_year', 'musicbrainz', 'e9ad3659-1efa-48d1-9510-2743663cfea2'),
  ('Q97320177', 'wikidata_qid', 'wikidata', 'Q97320177'),
  ('Q97320177', 'birth_date', 'wikidata', 'Q97320177'),
  ('Q97320177', 'birth_date', 'musicbrainz', '64f7928f-2a27-40ff-901d-3ddb1f54edaa'),
  ('Q97320177', 'gender', 'wikidata', 'Q97320177'),
  ('Q97320177', 'gender', 'musicbrainz', '64f7928f-2a27-40ff-901d-3ddb1f54edaa'),
  ('Q97320177', 'nationality', 'wikidata', 'Q97320177'),
  ('Q97320177', 'nationality', 'musicbrainz', '64f7928f-2a27-40ff-901d-3ddb1f54edaa'),
  ('Q97320177', 'debut_year', 'wikidata', 'Q97320177'),
  ('Q97320177', 'debut_year', 'musicbrainz', 'e9ad3659-1efa-48d1-9510-2743663cfea2'),
  ('Q97352003', 'wikidata_qid', 'wikidata', 'Q97352003'),
  ('Q97352003', 'birth_date', 'wikidata', 'Q97352003'),
  ('Q97352003', 'birth_date', 'musicbrainz', '1c9e545f-6316-4910-9589-dab038c36906'),
  ('Q97352003', 'gender', 'wikidata', 'Q97352003'),
  ('Q97352003', 'gender', 'musicbrainz', '1c9e545f-6316-4910-9589-dab038c36906'),
  ('Q97352003', 'nationality', 'wikidata', 'Q97352003'),
  ('Q97352003', 'debut_year', 'wikidata', 'Q97352003'),
  ('Q97352003', 'debut_year', 'musicbrainz', 'e9ad3659-1efa-48d1-9510-2743663cfea2'),
  ('Q97326265', 'wikidata_qid', 'wikidata', 'Q97326265'),
  ('Q97326265', 'birth_date', 'wikidata', 'Q97326265'),
  ('Q97326265', 'birth_date', 'musicbrainz', 'c858acb1-6147-4b6f-9751-677eabbc95fa'),
  ('Q97326265', 'gender', 'wikidata', 'Q97326265'),
  ('Q97326265', 'gender', 'musicbrainz', 'c858acb1-6147-4b6f-9751-677eabbc95fa'),
  ('Q97326265', 'nationality', 'wikidata', 'Q97326265'),
  ('Q97326265', 'nationality', 'musicbrainz', 'c858acb1-6147-4b6f-9751-677eabbc95fa'),
  ('Q97326265', 'debut_year', 'musicbrainz', 'e9ad3659-1efa-48d1-9510-2743663cfea2'),
  ('Q97352009', 'wikidata_qid', 'wikidata', 'Q97352009'),
  ('Q97352009', 'birth_date', 'wikidata', 'Q97352009'),
  ('Q97352009', 'birth_date', 'musicbrainz', 'fec07f01-e5f0-4f95-88a2-97b81f9990ca'),
  ('Q97352009', 'gender', 'wikidata', 'Q97352009'),
  ('Q97352009', 'gender', 'musicbrainz', 'fec07f01-e5f0-4f95-88a2-97b81f9990ca'),
  ('Q97352009', 'nationality', 'wikidata', 'Q97352009'),
  ('Q97352009', 'nationality', 'musicbrainz', 'fec07f01-e5f0-4f95-88a2-97b81f9990ca'),
  ('Q97352009', 'debut_year', 'wikidata', 'Q97352009'),
  ('Q97352009', 'debut_year', 'musicbrainz', 'e9ad3659-1efa-48d1-9510-2743663cfea2'),
  ('Q59313184', 'wikidata_qid', 'wikidata', 'Q59313184'),
  ('Q59313184', 'birth_date', 'wikidata', 'Q59313184'),
  ('Q59313184', 'birth_date', 'musicbrainz', 'd5163b9c-500b-4f82-b828-580908b785a9'),
  ('Q59313184', 'gender', 'wikidata', 'Q59313184'),
  ('Q59313184', 'gender', 'musicbrainz', 'd5163b9c-500b-4f82-b828-580908b785a9'),
  ('Q59313184', 'nationality', 'wikidata', 'Q59313184'),
  ('Q59313184', 'nationality', 'musicbrainz', 'd5163b9c-500b-4f82-b828-580908b785a9'),
  ('Q59313184', 'debut_year', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q59313270', 'wikidata_qid', 'wikidata', 'Q59313270'),
  ('Q59313270', 'birth_date', 'wikidata', 'Q59313270'),
  ('Q59313270', 'birth_date', 'musicbrainz', '6d556ee8-8493-4c9d-931d-6ff3bd0018cc'),
  ('Q59313270', 'gender', 'wikidata', 'Q59313270'),
  ('Q59313270', 'gender', 'musicbrainz', '6d556ee8-8493-4c9d-931d-6ff3bd0018cc'),
  ('Q59313270', 'nationality', 'wikidata', 'Q59313270'),
  ('Q59313270', 'nationality', 'musicbrainz', '6d556ee8-8493-4c9d-931d-6ff3bd0018cc'),
  ('Q59313270', 'debut_year', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q59313326', 'wikidata_qid', 'wikidata', 'Q59313326'),
  ('Q59313326', 'birth_date', 'wikidata', 'Q59313326'),
  ('Q59313326', 'birth_date', 'musicbrainz', 'c7ef5451-e0f3-4b6f-b4e0-cd54ed7ac924'),
  ('Q59313326', 'gender', 'wikidata', 'Q59313326'),
  ('Q59313326', 'gender', 'musicbrainz', 'c7ef5451-e0f3-4b6f-b4e0-cd54ed7ac924'),
  ('Q59313326', 'nationality', 'wikidata', 'Q59313326'),
  ('Q59313326', 'nationality', 'musicbrainz', 'c7ef5451-e0f3-4b6f-b4e0-cd54ed7ac924'),
  ('Q59313326', 'debut_year', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q59313384', 'wikidata_qid', 'wikidata', 'Q59313384'),
  ('Q59313384', 'birth_date', 'wikidata', 'Q59313384'),
  ('Q59313384', 'birth_date', 'musicbrainz', '299e74fa-cf2f-432c-a4bb-8e0db57c2698'),
  ('Q59313384', 'gender', 'wikidata', 'Q59313384'),
  ('Q59313384', 'gender', 'musicbrainz', '299e74fa-cf2f-432c-a4bb-8e0db57c2698'),
  ('Q59313384', 'nationality', 'wikidata', 'Q59313384'),
  ('Q59313384', 'nationality', 'musicbrainz', '299e74fa-cf2f-432c-a4bb-8e0db57c2698'),
  ('Q59313384', 'debut_year', 'wikidata', 'Q59313384'),
  ('Q59313384', 'debut_year', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q59313479', 'wikidata_qid', 'wikidata', 'Q59313479'),
  ('Q59313479', 'birth_date', 'wikidata', 'Q59313479'),
  ('Q59313479', 'birth_date', 'musicbrainz', 'c5b133c1-259e-47cd-922d-3e73c17ac5fa'),
  ('Q59313479', 'gender', 'wikidata', 'Q59313479'),
  ('Q59313479', 'gender', 'musicbrainz', 'c5b133c1-259e-47cd-922d-3e73c17ac5fa'),
  ('Q59313479', 'nationality', 'wikidata', 'Q59313479'),
  ('Q59313479', 'nationality', 'musicbrainz', 'c5b133c1-259e-47cd-922d-3e73c17ac5fa'),
  ('Q59313479', 'debut_year', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q59313527', 'wikidata_qid', 'wikidata', 'Q59313527'),
  ('Q59313527', 'birth_date', 'wikidata', 'Q59313527'),
  ('Q59313527', 'birth_date', 'musicbrainz', 'f8061b6b-6863-4aa1-8163-8e5ce9b408be'),
  ('Q59313527', 'gender', 'wikidata', 'Q59313527'),
  ('Q59313527', 'gender', 'musicbrainz', 'f8061b6b-6863-4aa1-8163-8e5ce9b408be'),
  ('Q59313527', 'nationality', 'wikidata', 'Q59313527'),
  ('Q59313527', 'nationality', 'musicbrainz', 'f8061b6b-6863-4aa1-8163-8e5ce9b408be'),
  ('Q59313527', 'debut_year', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q59313606', 'wikidata_qid', 'wikidata', 'Q59313606'),
  ('Q59313606', 'birth_date', 'wikidata', 'Q59313606'),
  ('Q59313606', 'birth_date', 'musicbrainz', '3b0b4634-2450-41e7-8ba2-24f4af3f0dd2'),
  ('Q59313606', 'gender', 'wikidata', 'Q59313606'),
  ('Q59313606', 'gender', 'musicbrainz', '3b0b4634-2450-41e7-8ba2-24f4af3f0dd2'),
  ('Q59313606', 'nationality', 'wikidata', 'Q59313606'),
  ('Q59313606', 'nationality', 'musicbrainz', '3b0b4634-2450-41e7-8ba2-24f4af3f0dd2'),
  ('Q59313606', 'debut_year', 'wikidata', 'Q59313606'),
  ('Q59313606', 'debut_year', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
  ('Q132041926', 'wikidata_qid', 'wikidata', 'Q132041926'),
  ('Q132041926', 'birth_date', 'wikidata', 'Q132041926'),
  ('Q132041926', 'birth_date', 'musicbrainz', 'a7125425-668e-48ae-ba39-b88786bea147'),
  ('Q132041926', 'gender', 'wikidata', 'Q132041926'),
  ('Q132041926', 'gender', 'musicbrainz', 'a7125425-668e-48ae-ba39-b88786bea147'),
  ('Q132041926', 'nationality', 'wikidata', 'Q132041926'),
  ('Q132041926', 'nationality', 'musicbrainz', 'a7125425-668e-48ae-ba39-b88786bea147'),
  ('Q132041926', 'debut_year', 'wikidata', 'Q124091148'),
  ('Q132041926', 'debut_year', 'musicbrainz', 'fe4df9dd-09ab-407d-9d50-3656a9441294'),
  ('Q125865775', 'wikidata_qid', 'wikidata', 'Q125865775'),
  ('Q125865775', 'birth_date', 'wikidata', 'Q125865775'),
  ('Q125865775', 'birth_date', 'musicbrainz', '34efa47c-a48a-4ec7-aa34-dc06a20eeaef'),
  ('Q125865775', 'gender', 'wikidata', 'Q125865775'),
  ('Q125865775', 'gender', 'musicbrainz', '34efa47c-a48a-4ec7-aa34-dc06a20eeaef'),
  ('Q125865775', 'nationality', 'wikidata', 'Q125865775'),
  ('Q125865775', 'nationality', 'musicbrainz', '34efa47c-a48a-4ec7-aa34-dc06a20eeaef'),
  ('Q125865775', 'debut_year', 'wikidata', 'Q124091148'),
  ('Q125865775', 'debut_year', 'musicbrainz', 'fe4df9dd-09ab-407d-9d50-3656a9441294'),
  ('Q132041928', 'wikidata_qid', 'wikidata', 'Q132041928'),
  ('Q132041928', 'birth_date', 'wikidata', 'Q132041928'),
  ('Q132041928', 'birth_date', 'musicbrainz', '8b0aada1-a470-411b-9ac3-a335d1691746'),
  ('Q132041928', 'gender', 'wikidata', 'Q132041928'),
  ('Q132041928', 'gender', 'musicbrainz', '8b0aada1-a470-411b-9ac3-a335d1691746'),
  ('Q132041928', 'nationality', 'wikidata', 'Q132041928'),
  ('Q132041928', 'nationality', 'musicbrainz', '8b0aada1-a470-411b-9ac3-a335d1691746'),
  ('Q132041928', 'debut_year', 'wikidata', 'Q124091148'),
  ('Q132041928', 'debut_year', 'musicbrainz', 'fe4df9dd-09ab-407d-9d50-3656a9441294'),
  ('Q132041929', 'wikidata_qid', 'wikidata', 'Q132041929'),
  ('Q132041929', 'birth_date', 'wikidata', 'Q132041929'),
  ('Q132041929', 'birth_date', 'musicbrainz', '36d924e8-0bc5-4e80-871b-3f014487705f'),
  ('Q132041929', 'gender', 'wikidata', 'Q132041929'),
  ('Q132041929', 'gender', 'musicbrainz', '36d924e8-0bc5-4e80-871b-3f014487705f'),
  ('Q132041929', 'nationality', 'wikidata', 'Q132041929'),
  ('Q132041929', 'debut_year', 'wikidata', 'Q124091148'),
  ('Q132041929', 'debut_year', 'musicbrainz', 'fe4df9dd-09ab-407d-9d50-3656a9441294'),
  ('Q124091988', 'wikidata_qid', 'wikidata', 'Q124091988'),
  ('Q124091988', 'birth_date', 'wikidata', 'Q124091988'),
  ('Q124091988', 'birth_date', 'musicbrainz', 'd9a8a6e2-5436-4863-aea8-f617d3d6579a'),
  ('Q124091988', 'gender', 'wikidata', 'Q124091988'),
  ('Q124091988', 'gender', 'musicbrainz', 'd9a8a6e2-5436-4863-aea8-f617d3d6579a'),
  ('Q124091988', 'nationality', 'wikidata', 'Q124091988'),
  ('Q124091988', 'nationality', 'musicbrainz', 'd9a8a6e2-5436-4863-aea8-f617d3d6579a'),
  ('Q124091988', 'debut_year', 'wikidata', 'Q124091148'),
  ('Q124091988', 'debut_year', 'musicbrainz', 'fe4df9dd-09ab-407d-9d50-3656a9441294'),
  ('Q132041931', 'wikidata_qid', 'wikidata', 'Q132041931'),
  ('Q132041931', 'birth_date', 'wikidata', 'Q132041931'),
  ('Q132041931', 'birth_date', 'musicbrainz', '8d125e54-f478-4d5c-ab54-287dfdca1db3'),
  ('Q132041931', 'gender', 'wikidata', 'Q132041931'),
  ('Q132041931', 'gender', 'musicbrainz', '8d125e54-f478-4d5c-ab54-287dfdca1db3'),
  ('Q132041931', 'nationality', 'wikidata', 'Q132041931'),
  ('Q132041931', 'nationality', 'musicbrainz', '8d125e54-f478-4d5c-ab54-287dfdca1db3'),
  ('Q132041931', 'debut_year', 'wikidata', 'Q124091148'),
  ('Q132041931', 'debut_year', 'musicbrainz', 'fe4df9dd-09ab-407d-9d50-3656a9441294'),
  ('Q114690500', 'wikidata_qid', 'wikidata', 'Q114690500'),
  ('Q114690500', 'birth_date', 'wikidata', 'Q114690500'),
  ('Q114690500', 'birth_date', 'musicbrainz', 'e77c277f-6c29-4bcd-b541-4dcf47ac775a'),
  ('Q114690500', 'gender', 'wikidata', 'Q114690500'),
  ('Q114690500', 'gender', 'musicbrainz', 'e77c277f-6c29-4bcd-b541-4dcf47ac775a'),
  ('Q114690500', 'nationality', 'wikidata', 'Q114690500'),
  ('Q114690500', 'debut_year', 'musicbrainz', '3cb93ab1-3bb7-46df-ad1b-a84000dae0f2'),
  ('Q121579075', 'wikidata_qid', 'wikidata', 'Q121579075'),
  ('Q121579075', 'birth_date', 'wikidata', 'Q121579075'),
  ('Q121579075', 'birth_date', 'musicbrainz', '461a77a1-8797-4367-88be-55c3a85a62be'),
  ('Q121579075', 'gender', 'wikidata', 'Q121579075'),
  ('Q121579075', 'gender', 'musicbrainz', '461a77a1-8797-4367-88be-55c3a85a62be'),
  ('Q121579075', 'nationality', 'wikidata', 'Q121579075'),
  ('Q121579075', 'nationality', 'musicbrainz', '461a77a1-8797-4367-88be-55c3a85a62be'),
  ('Q121579075', 'debut_year', 'musicbrainz', '3cb93ab1-3bb7-46df-ad1b-a84000dae0f2'),
  ('Q121579089', 'wikidata_qid', 'wikidata', 'Q121579089'),
  ('Q121579089', 'birth_date', 'wikidata', 'Q121579089'),
  ('Q121579089', 'birth_date', 'musicbrainz', 'cafe729b-f9b1-4e57-a7ff-2e79ad3d9868'),
  ('Q121579089', 'gender', 'wikidata', 'Q121579089'),
  ('Q121579089', 'gender', 'musicbrainz', 'cafe729b-f9b1-4e57-a7ff-2e79ad3d9868'),
  ('Q121579089', 'nationality', 'wikidata', 'Q121579089'),
  ('Q121579089', 'nationality', 'musicbrainz', 'cafe729b-f9b1-4e57-a7ff-2e79ad3d9868'),
  ('Q121579089', 'debut_year', 'musicbrainz', '3cb93ab1-3bb7-46df-ad1b-a84000dae0f2'),
  ('Q121579375', 'wikidata_qid', 'wikidata', 'Q121579375'),
  ('Q121579375', 'birth_date', 'wikidata', 'Q121579375'),
  ('Q121579375', 'birth_date', 'musicbrainz', '928053e8-3dac-4557-ae8c-8cee9862d72f'),
  ('Q121579375', 'gender', 'wikidata', 'Q121579375'),
  ('Q121579375', 'gender', 'musicbrainz', '928053e8-3dac-4557-ae8c-8cee9862d72f'),
  ('Q121579375', 'nationality', 'wikidata', 'Q121579375'),
  ('Q121579375', 'nationality', 'musicbrainz', '928053e8-3dac-4557-ae8c-8cee9862d72f'),
  ('Q121579375', 'debut_year', 'musicbrainz', '3cb93ab1-3bb7-46df-ad1b-a84000dae0f2'),
  ('Q30006465', 'wikidata_qid', 'wikidata', 'Q30006465'),
  ('Q30006465', 'birth_date', 'wikidata', 'Q30006465'),
  ('Q30006465', 'birth_date', 'musicbrainz', '5139d541-5d2c-4e4a-804d-b4437d985be0'),
  ('Q30006465', 'gender', 'wikidata', 'Q30006465'),
  ('Q30006465', 'gender', 'musicbrainz', '5139d541-5d2c-4e4a-804d-b4437d985be0'),
  ('Q30006465', 'nationality', 'wikidata', 'Q30006465'),
  ('Q30006465', 'nationality', 'musicbrainz', '5139d541-5d2c-4e4a-804d-b4437d985be0'),
  ('Q30006465', 'debut_year', 'musicbrainz', '3cb93ab1-3bb7-46df-ad1b-a84000dae0f2'),
  ('Q135963716', 'wikidata_qid', 'wikidata', 'Q135963716'),
  ('Q135963716', 'birth_date', 'wikidata', 'Q135963716'),
  ('Q135963716', 'birth_date', 'musicbrainz', '40e38901-911c-4b01-a83e-da5409c3a57c'),
  ('Q135963716', 'gender', 'wikidata', 'Q135963716'),
  ('Q135963716', 'gender', 'musicbrainz', '40e38901-911c-4b01-a83e-da5409c3a57c'),
  ('Q135963716', 'nationality', 'wikidata', 'Q135963716'),
  ('Q135963716', 'debut_year', 'wikidata', 'Q135668928'),
  ('Q135963716', 'debut_year', 'musicbrainz', '4a297ef7-7782-4c18-8d48-dcf58fc5e953'),
  ('Q135963733', 'wikidata_qid', 'wikidata', 'Q135963733'),
  ('Q135963733', 'birth_date', 'wikidata', 'Q135963733'),
  ('Q135963733', 'birth_date', 'musicbrainz', '8585a06a-ac50-4bb9-9fe4-a1f769612709'),
  ('Q135963733', 'gender', 'wikidata', 'Q135963733'),
  ('Q135963733', 'gender', 'musicbrainz', '8585a06a-ac50-4bb9-9fe4-a1f769612709'),
  ('Q135963733', 'nationality', 'wikidata', 'Q135963733'),
  ('Q135963733', 'nationality', 'musicbrainz', '8585a06a-ac50-4bb9-9fe4-a1f769612709'),
  ('Q135963733', 'debut_year', 'wikidata', 'Q135668928'),
  ('Q135963733', 'debut_year', 'musicbrainz', '4a297ef7-7782-4c18-8d48-dcf58fc5e953'),
  ('Q135963739', 'wikidata_qid', 'wikidata', 'Q135963739'),
  ('Q135963739', 'birth_date', 'wikidata', 'Q135963739'),
  ('Q135963739', 'birth_date', 'musicbrainz', 'fa243a39-c196-416f-b48f-8a97958380f1'),
  ('Q135963739', 'gender', 'wikidata', 'Q135963739'),
  ('Q135963739', 'gender', 'musicbrainz', 'fa243a39-c196-416f-b48f-8a97958380f1'),
  ('Q135963739', 'nationality', 'wikidata', 'Q135963739'),
  ('Q135963739', 'nationality', 'musicbrainz', 'fa243a39-c196-416f-b48f-8a97958380f1'),
  ('Q135963739', 'debut_year', 'wikidata', 'Q135668928'),
  ('Q135963739', 'debut_year', 'musicbrainz', '4a297ef7-7782-4c18-8d48-dcf58fc5e953'),
  ('Q131932320', 'wikidata_qid', 'wikidata', 'Q131932320'),
  ('Q131932320', 'birth_date', 'wikidata', 'Q131932320'),
  ('Q131932320', 'birth_date', 'musicbrainz', 'f7ed13b1-5da7-4a11-91ff-ed0696d51929'),
  ('Q131932320', 'gender', 'wikidata', 'Q131932320'),
  ('Q131932320', 'gender', 'musicbrainz', 'f7ed13b1-5da7-4a11-91ff-ed0696d51929'),
  ('Q131932320', 'nationality', 'wikidata', 'Q131932320'),
  ('Q131932320', 'nationality', 'musicbrainz', 'f7ed13b1-5da7-4a11-91ff-ed0696d51929'),
  ('Q131932320', 'debut_year', 'wikidata', 'Q131746784'),
  ('Q131932320', 'debut_year', 'musicbrainz', '4447961b-bea2-441b-b52a-c2fdc9460a36'),
  ('Q131932322', 'wikidata_qid', 'wikidata', 'Q131932322'),
  ('Q131932322', 'birth_date', 'wikidata', 'Q131932322'),
  ('Q131932322', 'birth_date', 'musicbrainz', '789ae3a1-8ab5-4f83-9637-ceb950b9f75d'),
  ('Q131932322', 'gender', 'wikidata', 'Q131932322'),
  ('Q131932322', 'gender', 'musicbrainz', '789ae3a1-8ab5-4f83-9637-ceb950b9f75d'),
  ('Q131932322', 'nationality', 'wikidata', 'Q131932322'),
  ('Q131932322', 'nationality', 'musicbrainz', '789ae3a1-8ab5-4f83-9637-ceb950b9f75d'),
  ('Q131932322', 'debut_year', 'wikidata', 'Q131746784'),
  ('Q131932322', 'debut_year', 'musicbrainz', '4447961b-bea2-441b-b52a-c2fdc9460a36'),
  ('Q131932323', 'wikidata_qid', 'wikidata', 'Q131932323'),
  ('Q131932323', 'birth_date', 'wikidata', 'Q131932323'),
  ('Q131932323', 'birth_date', 'musicbrainz', 'e58250a3-bb1b-4c06-8e65-0cdf9433f262'),
  ('Q131932323', 'gender', 'wikidata', 'Q131932323'),
  ('Q131932323', 'gender', 'musicbrainz', 'e58250a3-bb1b-4c06-8e65-0cdf9433f262'),
  ('Q131932323', 'nationality', 'wikidata', 'Q131932323'),
  ('Q131932323', 'nationality', 'musicbrainz', 'e58250a3-bb1b-4c06-8e65-0cdf9433f262'),
  ('Q131932323', 'debut_year', 'wikidata', 'Q131746784'),
  ('Q131932323', 'debut_year', 'musicbrainz', '4447961b-bea2-441b-b52a-c2fdc9460a36'),
  ('Q116226143', 'wikidata_qid', 'wikidata', 'Q116226143'),
  ('Q116226143', 'birth_date', 'wikidata', 'Q116226143'),
  ('Q116226143', 'birth_date', 'musicbrainz', 'd1c2c72f-c7b9-4852-9cb1-276bf64197af'),
  ('Q116226143', 'gender', 'wikidata', 'Q116226143'),
  ('Q116226143', 'gender', 'musicbrainz', 'd1c2c72f-c7b9-4852-9cb1-276bf64197af'),
  ('Q116226143', 'nationality', 'wikidata', 'Q116226143'),
  ('Q116226143', 'nationality', 'musicbrainz', 'd1c2c72f-c7b9-4852-9cb1-276bf64197af'),
  ('Q116226143', 'debut_year', 'wikidata', 'Q112834233'),
  ('Q116226143', 'debut_year', 'musicbrainz', '92ea703e-4f6b-425f-8111-a77834220820'),
  ('Q104723121', 'wikidata_qid', 'wikidata', 'Q104723121'),
  ('Q104723121', 'birth_date', 'wikidata', 'Q104723121'),
  ('Q104723121', 'birth_date', 'musicbrainz', '5a0daa26-c68d-40cd-b7e5-3b59f710aa1d'),
  ('Q104723121', 'gender', 'wikidata', 'Q104723121'),
  ('Q104723121', 'gender', 'musicbrainz', '5a0daa26-c68d-40cd-b7e5-3b59f710aa1d'),
  ('Q104723121', 'nationality', 'wikidata', 'Q104723121'),
  ('Q104723121', 'debut_year', 'wikidata', 'Q112834233'),
  ('Q104723121', 'debut_year', 'musicbrainz', '92ea703e-4f6b-425f-8111-a77834220820'),
  ('Q127427815', 'wikidata_qid', 'wikidata', 'Q127427815'),
  ('Q127427815', 'birth_date', 'wikidata', 'Q127427815'),
  ('Q127427815', 'birth_date', 'musicbrainz', '05a02a13-4999-41a0-a329-d0e837a52bfa'),
  ('Q127427815', 'gender', 'wikidata', 'Q127427815'),
  ('Q127427815', 'gender', 'musicbrainz', '05a02a13-4999-41a0-a329-d0e837a52bfa'),
  ('Q127427815', 'nationality', 'wikidata', 'Q127427815'),
  ('Q127427815', 'debut_year', 'wikidata', 'Q112834233'),
  ('Q127427815', 'debut_year', 'musicbrainz', '92ea703e-4f6b-425f-8111-a77834220820'),
  ('Q16071030', 'wikidata_qid', 'wikidata', 'Q16071030'),
  ('Q16071030', 'birth_date', 'wikidata', 'Q16071030'),
  ('Q16071030', 'birth_date', 'musicbrainz', '810a4fc2-e368-4212-8494-a3934be6973d'),
  ('Q16071030', 'gender', 'wikidata', 'Q16071030'),
  ('Q16071030', 'gender', 'musicbrainz', '810a4fc2-e368-4212-8494-a3934be6973d'),
  ('Q16071030', 'nationality', 'wikidata', 'Q16071030'),
  ('Q16071030', 'nationality', 'musicbrainz', '810a4fc2-e368-4212-8494-a3934be6973d'),
  ('Q16071030', 'debut_year', 'wikidata', 'Q10728972'),
  ('Q18697707', 'wikidata_qid', 'wikidata', 'Q18697707'),
  ('Q18697707', 'birth_date', 'wikidata', 'Q18697707'),
  ('Q18697707', 'birth_date', 'musicbrainz', 'f9462118-b634-4deb-b331-57f15178978c'),
  ('Q18697707', 'gender', 'wikidata', 'Q18697707'),
  ('Q18697707', 'gender', 'musicbrainz', 'f9462118-b634-4deb-b331-57f15178978c'),
  ('Q18697707', 'nationality', 'wikidata', 'Q18697707'),
  ('Q18697707', 'nationality', 'musicbrainz', 'f9462118-b634-4deb-b331-57f15178978c'),
  ('Q18697707', 'debut_year', 'wikidata', 'Q10728972'),
  ('Q47673408', 'wikidata_qid', 'wikidata', 'Q47673408'),
  ('Q47673408', 'birth_date', 'wikidata', 'Q47673408'),
  ('Q47673408', 'birth_date', 'musicbrainz', 'b63d85be-ad3c-43a6-84fd-146929c57a5c'),
  ('Q47673408', 'gender', 'wikidata', 'Q47673408'),
  ('Q47673408', 'gender', 'musicbrainz', 'b63d85be-ad3c-43a6-84fd-146929c57a5c'),
  ('Q47673408', 'nationality', 'wikidata', 'Q47673408'),
  ('Q47673408', 'nationality', 'musicbrainz', 'b63d85be-ad3c-43a6-84fd-146929c57a5c'),
  ('Q47673408', 'debut_year', 'wikidata', 'Q23004252'),
  ('Q47673408', 'debut_year', 'musicbrainz', '9cd615ad-5540-40e5-819c-cbfc79216377'),
  ('Q60991892', 'wikidata_qid', 'wikidata', 'Q60991892'),
  ('Q60991892', 'birth_date', 'wikidata', 'Q60991892'),
  ('Q60991892', 'birth_date', 'musicbrainz', '6b3ff422-1786-409a-ade5-d3e7b131f717'),
  ('Q60991892', 'gender', 'wikidata', 'Q60991892'),
  ('Q60991892', 'gender', 'musicbrainz', '6b3ff422-1786-409a-ade5-d3e7b131f717'),
  ('Q60991892', 'nationality', 'wikidata', 'Q60991892'),
  ('Q60991892', 'nationality', 'musicbrainz', '6b3ff422-1786-409a-ade5-d3e7b131f717'),
  ('Q60991892', 'debut_year', 'wikidata', 'Q23004252'),
  ('Q60991892', 'debut_year', 'musicbrainz', '9cd615ad-5540-40e5-819c-cbfc79216377'),
  ('Q21060390', 'wikidata_qid', 'wikidata', 'Q21060390'),
  ('Q21060390', 'birth_date', 'wikidata', 'Q21060390'),
  ('Q21060390', 'birth_date', 'musicbrainz', '7052bd1f-539d-4f61-80eb-c77a2b7cb38d'),
  ('Q21060390', 'gender', 'wikidata', 'Q21060390'),
  ('Q21060390', 'gender', 'musicbrainz', '7052bd1f-539d-4f61-80eb-c77a2b7cb38d'),
  ('Q21060390', 'nationality', 'wikidata', 'Q21060390'),
  ('Q21060390', 'nationality', 'musicbrainz', '7052bd1f-539d-4f61-80eb-c77a2b7cb38d'),
  ('Q21060390', 'debut_year', 'wikidata', 'Q23004252'),
  ('Q21060390', 'debut_year', 'musicbrainz', '9cd615ad-5540-40e5-819c-cbfc79216377'),
  ('Q56278318', 'wikidata_qid', 'wikidata', 'Q56278318'),
  ('Q56278318', 'birth_date', 'wikidata', 'Q56278318'),
  ('Q56278318', 'birth_date', 'musicbrainz', '6d9f8681-f2c2-4451-b512-78d48f2ab092'),
  ('Q56278318', 'gender', 'wikidata', 'Q56278318'),
  ('Q56278318', 'gender', 'musicbrainz', '6d9f8681-f2c2-4451-b512-78d48f2ab092'),
  ('Q56278318', 'nationality', 'wikidata', 'Q56278318'),
  ('Q56278318', 'nationality', 'musicbrainz', '6d9f8681-f2c2-4451-b512-78d48f2ab092'),
  ('Q56278318', 'debut_year', 'wikidata', 'Q23004252'),
  ('Q56278318', 'debut_year', 'musicbrainz', '9cd615ad-5540-40e5-819c-cbfc79216377');

create temp table k2_activate (id integer primary key, qid text not null);
insert into k2_activate (id, qid) values
  (82, 'Q26451151'),
  (89, 'Q60644128'),
  (133, 'Q109108660'),
  (143, 'Q123554436'),
  (144, 'Q123554438'),
  (145, 'Q123554439'),
  (148, 'Q123560890'),
  (151, 'Q123310101'),
  (152, 'Q123528880'),
  (153, 'Q123528897'),
  (163, 'Q117178583');

create temp table k2_other (qid text not null, group_slug text not null, primary key (qid, group_slug));
insert into k2_other (qid, group_slug) values
  ('Q56259179', 'artms'),
  ('Q48893612', 'loossemble'),
  ('Q57318729', 'artms'),
  ('Q56824821', 'loossemble'),
  ('Q56816418', 'artms'),
  ('Q56825122', 'artms'),
  ('Q58224261', 'artms'),
  ('Q58825825', 'loossemble');

-- From here the file reports what it refuses or does.
set client_min_messages = notice;

-- 1. Precheck: nothing is written until every line below passes.
do $$
declare
  bad text;
begin
  select string_agg(k.name || ' (' || k.group_slug || ')', ', ' order by k.group_slug, k.name) into bad from k2_idols k where k.birth_date > (current_date - interval '18 years')::date;
  if bad is not null then
    raise exception '021d-k2-idols refused: under 18 on the day of the run: % (a minor is never inserted)', bad;
  end if;
  select string_agg(k.slug, ', ' order by k.slug) into bad from k2_groups k where (select count(*) from public.groups g where g.slug = k.slug) <> 1;
  if bad is not null then
    raise exception '021d-k2-idols refused: target group(s) missing or not unique: %', bad;
  end if;
  select string_agg(g.slug || ' (' || x.n || ' row(s))', ', ' order by g.slug) into bad
  from k2_groups k join public.groups g on g.slug = k.slug
  join lateral (select count(*) as n from public.idols i where i.group_id = g.id
    and not exists (select 1 from k2_idols z where z.group_slug = k.slug and z.name = i.name and z.qid = i.wikidata_qid)) x on x.n > 0;
  if bad is not null then
    raise exception '021d-k2-idols refused: target group(s) already hold idol rows this file does not know: % (the groups must have no idol row, or only these rows)', bad;
  end if;
  select string_agg(k.name || ' ' || k.qid, ', ' order by k.qid) into bad
  from k2_idols k join public.idols i on i.wikidata_qid = k.qid
  join public.groups g on g.id = i.group_id and g.slug <> k.group_slug;
  if bad is not null then
    raise exception '021d-k2-idols refused: QID already on a row of another group: %', bad;
  end if;
  select string_agg(distinct o.group_slug, ', ') into bad from k2_other o where (select count(*) from public.groups g where g.slug = o.group_slug) <> 1;
  if bad is not null then
    raise exception '021d-k2-idols refused: other group(s) of a member missing or not unique: %', bad;
  end if;
  select string_agg(o.qid, ', ') into bad from k2_other o join k2_idols k on k.qid = o.qid where k.group_slug = o.group_slug;
  if bad is not null then
    raise exception '021d-k2-idols refused: an idol lists its own group as an other group: %', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k2_activate a where not exists (select 1 from public.idols i where i.id = a.id);
  if bad is not null then
    raise exception '021d-k2-idols refused: unknown idol id(s) to activate: %', bad;
  end if;
  select string_agg(format('%s (list %s, row %s)', a.id, a.qid, coalesce(i.wikidata_qid, 'none')), ', ' order by a.id) into bad
  from k2_activate a join public.idols i on i.id = a.id where i.wikidata_qid is distinct from a.qid;
  if bad is not null then
    raise exception '021d-k2-idols refused: the QID differs for %', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k2_activate a join public.idols i on i.id = a.id where i.detached_at is not null;
  if bad is not null then
    raise exception '021d-k2-idols refused: detached idol(s) %', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k2_activate a join public.idols i on i.id = a.id where not i.active and not i.needs_review;
  if bad is not null then
    raise exception '021d-k2-idols refused: idol(s) % are inactive and not waiting for review (switched off on purpose)', bad;
  end if;
  select string_agg(format('%s %s', a.id, i.name), ', ' order by a.id) into bad
  from k2_activate a join public.idols i on i.id = a.id where i.birth_date is null or i.birth_date > (current_date - interval '18 years')::date;
  if bad is not null then
    raise exception '021d-k2-idols refused: to activate but under 18 or without a birth date: % (a minor is never active)', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k2_activate a join k2_idols k on k.qid = a.qid;
  if bad is not null then
    raise exception '021d-k2-idols refused: the same person is in the new rows and in the activation list: %', bad;
  end if;
  select string_agg(format('%s (same QID as active row %s)', a.id, o.id), ', ' order by a.id) into bad
  from k2_activate a join public.idols i on i.id = a.id join public.idols o on o.wikidata_qid = i.wikidata_qid and o.id <> i.id and o.active;
  if bad is not null then
    raise notice '021d-k2-idols: idol(s) to activate already active on another row: %', bad;
  end if;
end $$;

-- 2. The group rows: only empty columns (an existing value is never overwritten).
do $$
declare
  n_label integer;
  n_gen integer;
  n_inc integer;
begin
  update public.groups g
  set record_label = coalesce((select x.record_label from public.groups x where x.id <> g.id and lower(btrim(x.record_label)) = lower(k.record_label) limit 1), k.record_label)
  from k2_groups k
  where g.slug = k.slug and nullif(btrim(g.record_label), '') is null and k.record_label is not null;
  get diagnostics n_label = row_count;
  update public.groups g set generation = k.generation
  from k2_groups k
  where g.slug = k.slug and nullif(btrim(g.generation), '') is null and k.generation is not null;
  get diagnostics n_gen = row_count;
  update public.groups g set inception_date = k.inception_date
  from k2_groups k
  where g.slug = k.slug and g.inception_date is null and k.inception_date is not null;
  get diagnostics n_inc = row_count;
  raise notice '021d-k2-idols: group rows filled where empty: % record_label, % generation, % inception_date', n_label, n_gen, n_inc;
end $$;

-- 3. The new idols (adults only).
do $$
declare
  n integer;
begin
  insert into public.idols (group_id, name, name_romanized, name_hangul, birth_date, nationality, positions, wikidata_qid, active, ord, needs_review, review_reason, origin, gender, debut_year)
  select g.id, k.name, k.name_romanized, k.name_hangul, k.birth_date, k.nationality, k.positions, k.qid, true, k.ord, false, null, 'wikidata', k.gender, k.debut_year
  from k2_idols k join public.groups g on g.slug = k.group_slug
  where k.birth_date <= (current_date - interval '18 years')::date
  on conflict (group_id, name) do nothing;
  get diagnostics n = row_count;
  raise notice '021d-k2-idols: % new idol row(s) inserted', n;
end $$;

-- 4. One source row per stored fact and source; only when the row holds exactly the sourced value.
insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
select 'idol', i.id::text, s.field, s.source, s.source_ref, timestamptz '2026-11-02 12:00:00+00'
from k2_sources s
join k2_idols k on k.qid = s.qid
join public.groups g on g.slug = k.group_slug
join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
where s.field = 'wikidata_qid'
  or (s.field = 'birth_date' and i.birth_date = k.birth_date)
  or (s.field = 'gender' and i.gender = k.gender)
  or (s.field = 'nationality' and i.nationality = k.nationality)
  or (s.field = 'debut_year' and i.debut_year = k.debut_year)
on conflict (entity_type, entity_id, field, source) do nothing;

-- 4b. The other groups of the members who are in more than one (game only; the idol row stays in its first group).
insert into public.idol_other_groups (idol_id, group_id)
select i.id, g2.id
from k2_other o
join k2_idols k on k.qid = o.qid
join public.groups g on g.slug = k.group_slug
join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
join public.groups g2 on g2.slug = o.group_slug
on conflict (idol_id, group_id) do nothing;

-- 5. The unreserved yes of 021b: same update as 021b (what the admin "confirm" action does).
do $$
declare
  n integer;
begin
  update public.idols i
  set active = true, needs_review = false, review_reason = null, updated_at = now()
  from k2_activate a
  where i.id = a.id and i.wikidata_qid = a.qid and (not i.active or i.needs_review)
    and i.birth_date <= (current_date - interval '18 years')::date;
  get diagnostics n = row_count;
  raise notice '021d-k2-idols: % idol(s) activated from the 021b list', n;
end $$;

-- 6. Self-check.
do $$
declare
  n bigint;
begin
  select count(*) into n from k2_idols k join public.groups g on g.slug = k.group_slug
    join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
    where i.active and not i.needs_review and i.detached_at is null and i.gender = k.gender and i.debut_year = k.debut_year
      and i.birth_date = k.birth_date and i.nationality = k.nationality;
  if n <> (select count(*) from k2_idols) then
    raise exception '021d-k2-idols: % of % new idols are in place, active and reviewed', n, (select count(*) from k2_idols);
  end if;
  select count(*) into n from k2_activate a join public.idols i on i.id = a.id where not (i.active and not i.needs_review);
  if n > 0 then
    raise exception '021d-k2-idols: % listed idol(s) are not active after the update', n;
  end if;
  select count(*) into n from k2_other o
    join k2_idols k on k.qid = o.qid join public.groups g on g.slug = k.group_slug
    join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
    join public.groups g2 on g2.slug = o.group_slug
    where not exists (select 1 from public.idol_other_groups x where x.idol_id = i.id and x.group_id = g2.id);
  if n > 0 then
    raise exception '021d-k2-idols: % other-group link(s) are missing', n;
  end if;
  select count(*) into n from k2_idols k join public.groups g on g.slug = k.group_slug
    join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
    where not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'birth_date')
       or not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'gender')
       or not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'debut_year')
       or not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'nationality');
  if n > 0 then
    raise exception '021d-k2-idols: % new idol(s) lack a source row for a stored fact', n;
  end if;
  select count(*) into n from public.idols where active and (birth_date is null or birth_date > (current_date - interval '18 years')::date)
    and wikidata_qid in (select qid from k2_idols union select qid from k2_activate);
  if n > 0 then
    raise exception '021d-k2-idols: % active idol(s) of this file are under 18 or without a birth date', n;
  end if;
  select count(*) into n from public.idols where active and birth_date > (current_date - interval '18 years')::date;
  if n > 0 then
    raise exception '021d-k2-idols: % active idol(s) are under 18', n;
  end if;
  raise notice '021d-k2-idols: % active idol(s) before, % now', (select active_n from k2_before), (select count(*) filter (where active) from public.idols);
end $$;

drop table if exists pg_temp.k2_before, pg_temp.k2_groups, pg_temp.k2_idols, pg_temp.k2_sources, pg_temp.k2_activate;

notify pgrst, 'reload schema';
