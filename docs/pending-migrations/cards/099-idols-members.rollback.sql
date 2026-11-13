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
  {"slug":"astro","kind":"group","disbanded":null,"members":[{"name":"MJ","qid":"Q47673408","birth_date":"1994-03-05","ord":1,"active":true},{"name":"Jinjin","qid":"Q60991892","birth_date":"1996-03-15","ord":2,"active":true},{"name":"Eunwoo","qid":"Q21060390","birth_date":"1997-03-30","ord":3,"active":true},{"name":"Sanha","qid":"Q56278318","birth_date":"2000-03-21","ord":4,"active":true}]},
  {"slug":"btob","kind":"group","disbanded":null,"members":[{"name":"Seo Eun-kwang","qid":"Q16233553","birth_date":"1990-11-22","ord":1,"active":true},{"name":"Lee Min-hyuk","qid":"Q11266766","birth_date":"1990-11-29","ord":2,"active":true},{"name":"Lee Chang-sub","qid":"Q16183546","birth_date":"1991-02-26","ord":3,"active":true},{"name":"Im Hyun-sik","qid":"Q10884727","birth_date":"1992-03-07","ord":4,"active":true},{"name":"Peniel","qid":"Q16235836","birth_date":"1993-03-10","ord":5,"active":true},{"name":"Yook Sung-jae","qid":"Q16171180","birth_date":"1995-05-02","ord":6,"active":true}]},
  {"slug":"day6","kind":"group","disbanded":null,"members":[{"name":"Sungjin","qid":"Q65762547","birth_date":"1993-01-16","ord":1,"active":true},{"name":"Young K","qid":"Q22101239","birth_date":"1993-12-19","ord":2,"active":true},{"name":"Wonpil","qid":"Q67674869","birth_date":"1994-04-28","ord":3,"active":true},{"name":"Dowoon","qid":"Q67674200","birth_date":"1995-08-25","ord":4,"active":true}]},
  {"slug":"dreamcatcher","kind":"group","disbanded":null,"members":[{"name":"JiU","qid":"Q59313184","birth_date":"1994-05-17","ord":1,"active":true},{"name":"SuA","qid":"Q59313270","birth_date":"1994-08-10","ord":2,"active":true},{"name":"Siyeon","qid":"Q59313326","birth_date":"1995-10-01","ord":3,"active":true},{"name":"Handong","qid":"Q59313384","birth_date":"1996-03-26","ord":4,"active":true},{"name":"Yoohyeon","qid":"Q59313479","birth_date":"1997-01-07","ord":5,"active":true},{"name":"Dami","qid":"Q59313527","birth_date":"1997-03-07","ord":6,"active":true},{"name":"Gahyun","qid":"Q59313606","birth_date":"1999-02-03","ord":7,"active":true}]},
  {"slug":"ikon","kind":"group","disbanded":null,"members":[{"name":"Bobby","qid":"Q18015644","birth_date":"1995-12-21","ord":1,"active":true},{"name":"Ju-ne","qid":"Q21057648","birth_date":"1997-03-31","ord":2,"active":true},{"name":"Chan","qid":"Q18567344","birth_date":"1998-01-26","ord":3,"active":true},{"name":"Song","qid":"Q21058800","birth_date":"1995-02-08","ord":4,"active":true},{"name":"Jay","qid":"Q18550351","birth_date":"1994-02-07","ord":5,"active":true},{"name":"DK","qid":"Q21057681","birth_date":"1997-01-03","ord":6,"active":true}]},
  {"slug":"katseye","kind":"group","disbanded":null,"members":[{"name":"Daniela Avanzini","qid":"Q124692767","birth_date":"2004-07-01","ord":1,"active":true},{"name":"Lara Raj","qid":"Q124692773","birth_date":"2005-11-03","ord":2,"active":true},{"name":"Manon Bannerman","qid":"Q124692741","birth_date":"2002-06-26","ord":3,"active":true},{"name":"Megan Skiendiel","qid":"Q124692787","birth_date":"2006-02-10","ord":4,"active":true},{"name":"Sophia Laforteza","qid":"Q124692753","birth_date":"2002-12-31","ord":5,"active":true},{"name":"Yoonchae Jeung","qid":"Q124692801","birth_date":"2007-12-06","ord":6,"active":true}]},
  {"slug":"kiss-of-life","kind":"group","disbanded":null,"members":[{"name":"Natty","qid":"Q93481484","birth_date":"2002-05-30","ord":1,"active":true},{"name":"Belle","qid":"Q120960067","birth_date":"2004-03-20","ord":2,"active":true},{"name":"Julie","qid":"Q120960066","birth_date":"2000-03-29","ord":3,"active":true},{"name":"Haneul","qid":"Q120960068","birth_date":"2005-05-25","ord":4,"active":true}]},
  {"slug":"loossemble","kind":"group","disbanded":2024,"members":[{"name":"Hyunjin","qid":"Q48893612","birth_date":"2000-11-15","ord":1,"active":false},{"name":"Yeojin","qid":"Q56824821","birth_date":"2002-11-11","ord":2,"active":false},{"name":"Hyeju","qid":"Q58825825","birth_date":"2001-11-13","ord":3,"active":false},{"name":"Vivi","qid":"Q57317398","birth_date":"1996-12-09","ord":4,"active":false},{"name":"Go Won","qid":"Q58825794","birth_date":"2000-11-19","ord":5,"active":false}]},
  {"slug":"miss-a","kind":"group","disbanded":2017,"members":[{"name":"Fei","qid":"Q3457830","birth_date":"1987-04-27","ord":1,"active":false},{"name":"Jia","qid":"Q495302","birth_date":"1989-02-03","ord":2,"active":false},{"name":"Min","qid":"Q495099","birth_date":"1991-06-21","ord":3,"active":false},{"name":"Suzy","qid":"Q464645","birth_date":"1994-10-10","ord":4,"active":false}]},
  {"slug":"monsta-x","kind":"group","disbanded":null,"members":[{"name":"Shownu","qid":"Q24834621","birth_date":"1992-06-18","ord":1,"active":true},{"name":"Minhyuk","qid":"Q28746303","birth_date":"1993-11-03","ord":2,"active":true},{"name":"Kihyun","qid":"Q27951584","birth_date":"1993-11-22","ord":3,"active":true},{"name":"Hyungwon","qid":"Q28549791","birth_date":"1994-01-15","ord":4,"active":true},{"name":"Joohoney","qid":"Q23008017","birth_date":"1994-10-06","ord":5,"active":true},{"name":"I.M","qid":"Q28549782","birth_date":"1996-01-26","ord":6,"active":true}]},
  {"slug":"nct-wish","kind":"group","disbanded":null,"members":[{"name":"Sion","qid":"Q122272723","birth_date":"2002-05-11","ord":1,"active":true},{"name":"Riku","qid":"Q122309465","birth_date":"2003-06-28","ord":2,"active":true},{"name":"Yushi","qid":"Q122293880","birth_date":"2004-04-05","ord":3,"active":true},{"name":"Sakuya","qid":"Q122363261","birth_date":"2007-11-18","ord":4,"active":true},{"name":"Ryo","qid":"Q123153864","birth_date":"2007-08-04","ord":5,"active":true},{"name":"Jaehee","qid":"Q122349180","birth_date":"2005-06-21","ord":6,"active":true}]},
  {"slug":"p1harmony","kind":"group","disbanded":null,"members":[{"name":"Jongseob","qid":"Q30006465","birth_date":"2005-11-19","ord":1,"active":true},{"name":"Keeho","qid":"Q114690500","birth_date":"2001-09-27","ord":2,"active":true},{"name":"Theo","qid":"Q121579075","birth_date":"2001-07-01","ord":3,"active":true},{"name":"Jiung","qid":"Q121579089","birth_date":"2001-10-07","ord":4,"active":true},{"name":"Intak","qid":"Q121579095","birth_date":"2003-08-31","ord":5,"active":true},{"name":"Soul","qid":"Q121579375","birth_date":"2005-02-01","ord":6,"active":true}]},
  {"slug":"pentagon","kind":"group","disbanded":null,"members":[{"name":"Jinho","qid":"Q41967606","birth_date":"1992-04-17","ord":1,"active":true},{"name":"Hui","qid":"Q43089418","birth_date":"1993-08-28","ord":2,"active":true},{"name":"Hongseok","qid":"Q41201062","birth_date":"1994-04-17","ord":3,"active":true},{"name":"Yeo One","qid":"Q67987298","birth_date":"1996-03-27","ord":4,"active":true},{"name":"Kino","qid":"Q61863841","birth_date":"1998-01-27","ord":5,"active":true},{"name":"Wooseok","qid":"Q61863582","birth_date":"1998-01-31","ord":6,"active":true},{"name":"Shinwon","qid":"Q67987045","birth_date":"1995-12-11","ord":7,"active":true}]},
  {"slug":"purple-kiss","kind":"group","disbanded":2025,"members":[{"name":"Swan","qid":"Q107559922","birth_date":"2003-07-11","ord":1,"active":false},{"name":"Na Go-eun","qid":"Q107253228","birth_date":"1999-09-03","ord":2,"active":false},{"name":"Dosie","qid":"Q107559919","birth_date":"2000-02-11","ord":3,"active":false},{"name":"Ireh","qid":"Q107559920","birth_date":"2002-04-30","ord":4,"active":false},{"name":"Yuki","qid":"Q107559923","birth_date":"2002-11-06","ord":5,"active":false},{"name":"Chaein","qid":"Q107559921","birth_date":"2002-12-05","ord":6,"active":false},{"name":"Park Ji-eun","qid":"Q107559918","birth_date":"1997-09-04","ord":7,"active":false}]},
  {"slug":"sistar","kind":"group","disbanded":2017,"members":[{"name":"Bora","qid":"Q5363925","birth_date":"1989-12-30","ord":1,"active":false},{"name":"Hyolyn","qid":"Q496329","birth_date":"1990-12-11","ord":2,"active":false},{"name":"Soyou","qid":"Q5361514","birth_date":"1992-02-12","ord":3,"active":false},{"name":"Dasom","qid":"Q6408548","birth_date":"1993-05-06","ord":4,"active":false}]},
  {"slug":"stayc","kind":"group","disbanded":null,"members":[{"name":"Sieun","qid":"Q16180796","birth_date":"2001-08-01","ord":1,"active":true},{"name":"Sumin","qid":"Q106518333","birth_date":"2001-03-13","ord":2,"active":true},{"name":"Isa","qid":"Q106518536","birth_date":"2002-01-23","ord":3,"active":true},{"name":"Seeun","qid":"Q106518627","birth_date":"2003-06-14","ord":4,"active":true},{"name":"Yoon","qid":"Q106518626","birth_date":"2004-04-14","ord":5,"active":true},{"name":"J","qid":"Q106518625","birth_date":"2004-12-09","ord":6,"active":true}]},
  {"slug":"viviz","kind":"group","disbanded":null,"members":[{"name":"Eunha","qid":"Q21710247","birth_date":"1997-05-30","ord":1,"active":true},{"name":"SinB","qid":"Q21709909","birth_date":"1998-06-03","ord":2,"active":true},{"name":"Umji","qid":"Q24572927","birth_date":"1998-08-19","ord":3,"active":true}]},
  {"slug":"winner","kind":"group","disbanded":null,"members":[{"name":"Kim Jin-woo","qid":"Q17708811","birth_date":"1991-09-26","ord":1,"active":true},{"name":"Lee Seung-hoon","qid":"Q15931598","birth_date":"1992-01-11","ord":2,"active":true},{"name":"Mino","qid":"Q17682967","birth_date":"1993-03-30","ord":3,"active":true},{"name":"Kang Seung-yoon","qid":"Q10729153","birth_date":"1994-01-21","ord":4,"active":true}]},
  {"slug":"zerobaseone","kind":"group","disbanded":null,"members":[{"name":"Kim Ji-woong","qid":"Q115933814","birth_date":"1998-12-14","ord":1,"active":true},{"name":"Sung Han-bin","qid":"Q117746200","birth_date":"2001-06-13","ord":2,"active":true},{"name":"Seok Matthew","qid":"Q117818045","birth_date":"2002-05-28","ord":3,"active":true},{"name":"Kim Tae-rae","qid":"Q117817675","birth_date":"2002-07-14","ord":4,"active":true},{"name":"Park Gun-wook","qid":"Q117818064","birth_date":"2005-01-10","ord":5,"active":true}]}
]$members$;
  v_slugs constant text[] := array['bibi', 'chungha', 'heize', 'hyuna', 'iu', 'jay-park', 'jeon-somi', 'psy', 'sunmi', 'zico', 'apink', 'artms', 'astro', 'btob', 'day6', 'dreamcatcher', 'ikon', 'katseye', 'kiss-of-life', 'loossemble', 'miss-a', 'monsta-x', 'nct-wish', 'p1harmony', 'pentagon', 'purple-kiss', 'sistar', 'stayc', 'viviz', 'winner', 'zerobaseone'];
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
