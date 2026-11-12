-- 099-idols-members.rollback.sql (undo of 099-idols-members.sql)
--
-- What:   deletes the public.idols rows 099 can have inserted: same group slug, same name, same wikidata_qid, and a review_reason starting
--         with '099-idols-members' (all four must match, so a row that existed before 099 is never touched).
-- Refuses: while a player owns a card (cards_owned) of one of these subjects, or has opened a pack: that would destroy a collection.
--         Undo 102-catalog-rebuild.rollback.sql first when the catalog was built on these rows.
-- Verify: select count(*) from public.idols where review_reason like '099-idols-members%';   expect 0
-- o1-transaction: single, ONE DO block. Idempotent.

do $i099r$
declare
  v_data constant jsonb := $members$[
  {"slug":"bibi","kind":"idol","disbanded":null,"members":[{"name":"BIBI","qid":"Q65060693","birth_date":"1998-09-27","ord":1,"active":true}]},
  {"slug":"chungha","kind":"idol","disbanded":null,"members":[{"name":"Chungha","qid":"Q26214034","birth_date":"1996-02-09","ord":1,"active":true}]},
  {"slug":"heize","kind":"idol","disbanded":null,"members":[{"name":"Heize","qid":"Q24855768","birth_date":"1991-08-09","ord":1,"active":true}]},
  {"slug":"hyuna","kind":"idol","disbanded":null,"members":[{"name":"HyunA","qid":"Q234066","birth_date":"1992-06-06","ord":1,"active":true}]},
  {"slug":"iu","kind":"idol","disbanded":null,"members":[{"name":"IU","qid":"Q20145","birth_date":"1993-05-16","ord":1,"active":true}]},
  {"slug":"jay-park","kind":"idol","disbanded":null,"members":[{"name":"Jay Park","qid":"Q429046","birth_date":"1987-04-25","ord":1,"active":true}]},
  {"slug":"jeon-somi","kind":"idol","disbanded":null,"members":[{"name":"JEON SOMI","qid":"Q22910214","birth_date":"2001-03-09","ord":1,"active":true}]},
  {"slug":"psy","kind":"idol","disbanded":null,"members":[{"name":"PSY","qid":"Q20150","birth_date":"1977-12-31","ord":1,"active":true}]},
  {"slug":"sunmi","kind":"idol","disbanded":null,"members":[{"name":"Sunmi","qid":"Q624995","birth_date":"1992-05-02","ord":1,"active":true}]},
  {"slug":"zico","kind":"idol","disbanded":null,"members":[{"name":"Zico","qid":"Q7696122","birth_date":"1992-09-14","ord":1,"active":true}]},
  {"slug":"apink","kind":"group","disbanded":null,"members":[{"name":"Chorong","qid":"Q492738","birth_date":"1991-03-03","ord":1,"active":true},{"name":"Bomi","qid":"Q2495400","birth_date":"1993-08-13","ord":2,"active":true},{"name":"Eunji","qid":"Q487831","birth_date":"1993-08-18","ord":3,"active":true},{"name":"Namjoo","qid":"Q4460516","birth_date":"1995-04-15","ord":4,"active":true},{"name":"Hayoung","qid":"Q4798670","birth_date":"1996-07-19","ord":5,"active":true}]},
  {"slug":"artms","kind":"group","disbanded":null,"members":[{"name":"Heejin","qid":"Q56259179","birth_date":"2000-10-19","ord":1,"active":true},{"name":"Haseul","qid":"Q57318729","birth_date":"1997-08-18","ord":2,"active":true},{"name":"Kim Lip","qid":"Q56816418","birth_date":"1999-02-10","ord":3,"active":true},{"name":"Jinsoul","qid":"Q56825122","birth_date":"1997-06-13","ord":4,"active":true},{"name":"Choerry","qid":"Q58224261","birth_date":"2001-06-04","ord":5,"active":true}]},
  {"slug":"btob","kind":"group","disbanded":null,"members":[{"name":"Seo Eun-kwang","qid":"Q16233553","birth_date":"1990-11-22","ord":1,"active":true},{"name":"Lee Min-hyuk","qid":"Q11266766","birth_date":"1990-11-29","ord":2,"active":true},{"name":"Lee Chang-sub","qid":"Q16183546","birth_date":"1991-02-26","ord":3,"active":true},{"name":"Im Hyun-sik","qid":"Q10884727","birth_date":"1992-03-07","ord":4,"active":true},{"name":"Peniel","qid":"Q16235836","birth_date":"1993-03-10","ord":5,"active":true},{"name":"Yook Sung-jae","qid":"Q16171180","birth_date":"1995-05-02","ord":6,"active":true}]},
  {"slug":"miss-a","kind":"group","disbanded":2017,"members":[{"name":"Fei","qid":"Q3457830","birth_date":"1987-04-27","ord":1,"active":false},{"name":"Jia","qid":"Q495302","birth_date":"1989-02-03","ord":2,"active":false},{"name":"Min","qid":"Q495099","birth_date":"1991-06-21","ord":3,"active":false},{"name":"Suzy","qid":"Q464645","birth_date":"1994-10-10","ord":4,"active":false}]},
  {"slug":"sistar","kind":"group","disbanded":2017,"members":[{"name":"Bora","qid":"Q5363925","birth_date":"1989-12-30","ord":1,"active":false},{"name":"Hyolyn","qid":"Q496329","birth_date":"1990-12-11","ord":2,"active":false},{"name":"Soyou","qid":"Q5361514","birth_date":"1992-02-12","ord":3,"active":false},{"name":"Dasom","qid":"Q6408548","birth_date":"1993-05-06","ord":4,"active":false}]},
  {"slug":"viviz","kind":"group","disbanded":null,"members":[{"name":"Eunha","qid":"Q21710247","birth_date":"1997-05-30","ord":1,"active":true},{"name":"SinB","qid":"Q21709909","birth_date":"1998-06-03","ord":2,"active":true},{"name":"Umji","qid":"Q24572927","birth_date":"1998-08-19","ord":3,"active":true}]},
  {"slug":"winner","kind":"group","disbanded":null,"members":[{"name":"Kim Jin-woo","qid":"Q17708811","birth_date":"1991-09-26","ord":1,"active":true},{"name":"Lee Seung-hoon","qid":"Q15931598","birth_date":"1992-01-11","ord":2,"active":true},{"name":"Mino","qid":"Q17682967","birth_date":"1993-03-30","ord":3,"active":true},{"name":"Kang Seung-yoon","qid":"Q10729153","birth_date":"1994-01-21","ord":4,"active":true}]}
]$members$;
  v_slugs constant text[] := array['bibi', 'chungha', 'heize', 'hyuna', 'iu', 'jay-park', 'jeon-somi', 'psy', 'sunmi', 'zico', 'apink', 'artms', 'btob', 'miss-a', 'sistar', 'viviz', 'winner'];
  v_ents text[];
  v_deleted int;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.idols') is null or to_regclass('public.groups') is null then
    return;
  end if;
  if to_regclass('public.cards_catalog') is not null and to_regclass('public.cards_owned') is not null then
    select coalesce(array_agg(x), '{}') into v_ents from (
      select 'idol:' || s as x from unnest(v_slugs) s union all select 'group:' || s from unnest(v_slugs) s) u;
    if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where c.entity_id = any (v_ents)) then
      raise exception '099-idols-members rollback: a player owns a card of one of these subjects';
    end if;
  end if;
  if to_regclass('public.cards_packs') is not null and exists (select 1 from public.cards_packs) then
    raise exception '099-idols-members rollback: a pack was opened';
  end if;

  delete from public.idols i
   using public.groups g, jsonb_array_elements(v_data) s, jsonb_array_elements(s.value->'members') m
   where g.slug = s.value->>'slug'
     and i.group_id = g.id
     and i.name = m.value->>'name'
     and i.wikidata_qid = m.value->>'qid'
     and i.review_reason like '099-idols-members%';
  get diagnostics v_deleted = row_count;
  raise notice '099-idols-members rollback: % rows deleted', v_deleted;
end $i099r$;
