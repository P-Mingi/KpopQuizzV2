-- 021d-k2-idols.rollback.sql (lot K2): undo of 021d-k2-idols.sql.
--
-- What:   deletes the 91 idol rows 021d inserted (matched by group slug, name AND QID, so a row someone changed is never touched) and
--         every entity_sources row of those idols (their idol_other_groups rows go with them, on delete cascade); puts the 11 idols 021d activated back in the review queue (active false, needs_review
--         true, review_reason = the text they had before K1: "Wikidata lists this member but not in our name-all roster; confirm before
--         activating."). The group rows 021d filled (record_label, generation, inception_date, empty columns only) are left as they are:
--         the values are correct facts of the group and nothing can tell afterwards which of them were empty before.
--         Refused, with nothing changed, while the game kpopdle-idol is active (taking idols out of a live pool is a decision for the owner)
--         and when a listed id carries another QID.
-- Why:    the rollback of the K2 session.
-- Rows:   up to 91 idols, their entity_sources, 11 activations undone.
-- Verify: select count(*) from public.idols where wikidata_qid in (<the K2 QIDs>);   expect 0
-- Undo:   021d-k2-idols.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

drop table if exists pg_temp.k2_idols, pg_temp.k2_activate;
create temp table k2_idols (group_slug text not null, name text not null, qid text primary key);
insert into k2_idols (group_slug, name, qid) values
  ('loona', 'Heejin', 'Q56259179'),
  ('loona', 'Hyunjin', 'Q48893612'),
  ('loona', 'Haseul', 'Q57318729'),
  ('loona', 'Yeojin', 'Q56824821'),
  ('loona', 'Kim Lip', 'Q56816418'),
  ('loona', 'Jinsoul', 'Q56825122'),
  ('loona', 'Choerry', 'Q58224261'),
  ('loona', 'Yves', 'Q58825704'),
  ('loona', 'Go Won', 'Q58825794'),
  ('loona', 'Olivia Hye', 'Q58825825'),
  ('got7', 'Mark', 'Q16075083'),
  ('got7', 'Jay B', 'Q491048'),
  ('got7', 'Jackson', 'Q16905948'),
  ('got7', 'Jinyoung', 'Q492313'),
  ('got7', 'Youngjae', 'Q17500581'),
  ('got7', 'BamBam', 'Q16688282'),
  ('got7', 'Yugyeom', 'Q17500887'),
  ('monsta-x', 'Shownu', 'Q24834621'),
  ('monsta-x', 'Minhyuk', 'Q28746303'),
  ('monsta-x', 'Kihyun', 'Q27951584'),
  ('monsta-x', 'Hyungwon', 'Q28549791'),
  ('monsta-x', 'Joohoney', 'Q23008017'),
  ('monsta-x', 'I.M', 'Q28549782'),
  ('girls-generation', 'Taeyeon', 'Q233371'),
  ('girls-generation', 'Sunny', 'Q233894'),
  ('girls-generation', 'Tiffany', 'Q236355'),
  ('girls-generation', 'Hyoyeon', 'Q253619'),
  ('girls-generation', 'Yuri', 'Q276158'),
  ('girls-generation', 'Sooyoung', 'Q233385'),
  ('girls-generation', 'Yoona', 'Q466975'),
  ('girls-generation', 'Seohyun', 'Q240082'),
  ('zerobaseone', 'Kim Ji-woong', 'Q115933814'),
  ('zerobaseone', 'Sung Han-bin', 'Q117746200'),
  ('zerobaseone', 'Kim Tae-rae', 'Q117817675'),
  ('zerobaseone', 'Park Gun-wook', 'Q117818064'),
  ('mamamoo', 'Solar', 'Q19483969'),
  ('mamamoo', 'Moonbyul', 'Q19483782'),
  ('mamamoo', 'Wheein', 'Q19603930'),
  ('mamamoo', 'Hwasa', 'Q19603912'),
  ('bigbang', 'Taeyang', 'Q482991'),
  ('bigbang', 'G-Dragon', 'Q495577'),
  ('bigbang', 'Daesung', 'Q194798'),
  ('katseye', 'Daniela Avanzini', 'Q124692767'),
  ('katseye', 'Lara Raj', 'Q124692773'),
  ('katseye', 'Manon Bannerman', 'Q124692741'),
  ('katseye', 'Megan Skiendiel', 'Q124692787'),
  ('katseye', 'Sophia Laforteza', 'Q124692753'),
  ('illit', 'Yunah', 'Q126923756'),
  ('illit', 'Minju', 'Q126923757'),
  ('illit', 'Wonhee', 'Q126923760'),
  ('illit', 'Iroha', 'Q126923761'),
  ('treasure', 'Choi Hyun-suk', 'Q63850969'),
  ('treasure', 'Junkyu', 'Q97319986'),
  ('treasure', 'Yoon Jae-hyuk', 'Q98136886'),
  ('treasure', 'Doyoung', 'Q97320177'),
  ('treasure', 'Haruto', 'Q97352003'),
  ('treasure', 'Park Jeong-woo', 'Q97326265'),
  ('treasure', 'So Jung-hwan', 'Q97352009'),
  ('dreamcatcher', 'JiU', 'Q59313184'),
  ('dreamcatcher', 'SuA', 'Q59313270'),
  ('dreamcatcher', 'Siyeon', 'Q59313326'),
  ('dreamcatcher', 'Handong', 'Q59313384'),
  ('dreamcatcher', 'Yoohyeon', 'Q59313479'),
  ('dreamcatcher', 'Dami', 'Q59313527'),
  ('dreamcatcher', 'Gahyun', 'Q59313606'),
  ('tws', 'Shinyu', 'Q132041926'),
  ('tws', 'Dohoon', 'Q125865775'),
  ('tws', 'Youngjae', 'Q132041928'),
  ('tws', 'Hanjin', 'Q132041929'),
  ('tws', 'Jihoon', 'Q124091988'),
  ('tws', 'Kyungmin', 'Q132041931'),
  ('p1harmony', 'Keeho', 'Q114690500'),
  ('p1harmony', 'Theo', 'Q121579075'),
  ('p1harmony', 'Jiung', 'Q121579089'),
  ('p1harmony', 'Soul', 'Q121579375'),
  ('p1harmony', 'Jongseob', 'Q30006465'),
  ('cortis', 'James', 'Q135963716'),
  ('cortis', 'Juhoon', 'Q135963733'),
  ('cortis', 'Martin', 'Q135963739'),
  ('hearts2hearts', 'Jiwoo', 'Q131932320'),
  ('hearts2hearts', 'Yuha', 'Q131932322'),
  ('hearts2hearts', 'Stella', 'Q131932323'),
  ('team', 'K', 'Q116226143'),
  ('team', 'Nicholas', 'Q104723121'),
  ('team', 'EJ', 'Q127427815'),
  ('akmu', 'Lee Chan-hyuk', 'Q16071030'),
  ('akmu', 'Lee Su-hyun', 'Q18697707'),
  ('astro', 'MJ', 'Q47673408'),
  ('astro', 'Jinjin', 'Q60991892'),
  ('astro', 'Eunwoo', 'Q21060390'),
  ('astro', 'Sanha', 'Q56278318');
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

set client_min_messages = notice;

do $$
declare
  bad text;
  live boolean := false;
begin
  if to_regclass('public.dle_games') is not null then
    execute 'select exists (select 1 from public.dle_games where id = ''kpopdle-idol'' and active)' into live;
  end if;
  if live then
    raise exception '021d-k2-idols rollback refused: the game kpopdle-idol is active (switch it off first)';
  end if;
  select string_agg(format('%s (list %s, row %s)', a.id, a.qid, coalesce(i.wikidata_qid, 'none')), ', ' order by a.id) into bad
  from k2_activate a left join public.idols i on i.id = a.id where i.id is null or i.wikidata_qid is distinct from a.qid;
  if bad is not null then
    raise exception '021d-k2-idols rollback refused: unknown id or other QID for %', bad;
  end if;
end $$;

delete from public.entity_sources e
using public.idols i, k2_idols k, public.groups g
where e.entity_type = 'idol' and e.entity_id = i.id::text
  and g.slug = k.group_slug and i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid;

delete from public.idols i
using k2_idols k, public.groups g
where g.slug = k.group_slug and i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid;

update public.idols i
set active = false, needs_review = true,
  review_reason = 'Wikidata lists this member but not in our name-all roster; confirm before activating.', updated_at = now()
from k2_activate a
where i.id = a.id and i.wikidata_qid = a.qid and (i.active or not i.needs_review);

do $$
declare
  n bigint;
begin
  select count(*) into n from public.idols i join k2_idols k on k.qid = i.wikidata_qid;
  if n > 0 then
    raise exception '021d-k2-idols rollback: % K2 idol row(s) are still there', n;
  end if;
  select count(*) into n from k2_activate a join public.idols i on i.id = a.id where i.active;
  if n > 0 then
    raise exception '021d-k2-idols rollback: % listed idol(s) are still active', n;
  end if;
end $$;

drop table if exists pg_temp.k2_idols, pg_temp.k2_activate;

notify pgrst, 'reload schema';
