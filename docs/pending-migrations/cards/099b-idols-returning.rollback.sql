-- 099b-idols-returning.rollback.sql (undo of 099b-idols-returning.sql)
--
-- What:   deletes the public.idols rows 099b can have inserted: same group slug, same name, same wikidata_qid, and a review_reason starting
--         with '099b-idols-returning' (all four must match, so a row that existed before 099b is never touched).
-- Refuses: while a player owns a card of one of these groups, or has opened a pack.
-- Verify: select count(*) from public.idols where review_reason like '099b-idols-returning%';   expect 0
-- o1-transaction: single, ONE DO block. Idempotent.

do $i099br$
declare
  v_data constant jsonb := $members$[
  {"slug":"fromis-9","members":[{"name":"Song Ha-young","qid":"Q58816368","ord":1,"birth_date":"1997-09-29"},{"name":"Park Ji-won","qid":"Q56695886","ord":2,"birth_date":"1998-03-20"},{"name":"Lee Chae-young","qid":"Q56660258","ord":3,"birth_date":"2000-05-14"},{"name":"Lee Na-gyung","qid":"Q56660245","ord":4,"birth_date":"2000-06-01"},{"name":"Baek Ji-heon","qid":"Q56660176","ord":5,"birth_date":"2003-04-17"}]},
  {"slug":"kara","members":[{"name":"Gyuri","qid":"Q495000","ord":1,"birth_date":"1988-05-21"},{"name":"Seungyeon","qid":"Q495020","ord":2,"birth_date":"1988-07-24"},{"name":"Nicole","qid":"Q494992","ord":3,"birth_date":"1991-10-07"},{"name":"Jiyoung","qid":"Q495009","ord":4,"birth_date":"1994-01-18"},{"name":"Youngji","qid":"Q17302045","ord":5,"birth_date":"1994-08-30"}]},
  {"slug":"loona","members":[{"name":"Heejin","qid":"Q56259179","ord":1,"birth_date":"2000-10-19"},{"name":"Hyunjin","qid":"Q48893612","ord":2,"birth_date":"2000-11-15"},{"name":"Haseul","qid":"Q57318729","ord":3,"birth_date":"1997-08-18"},{"name":"Yeojin","qid":"Q56824821","ord":4,"birth_date":"2002-11-11"},{"name":"Kim Lip","qid":"Q56816418","ord":5,"birth_date":"1999-02-10"},{"name":"Jinsoul","qid":"Q56825122","ord":6,"birth_date":"1997-06-13"},{"name":"Choerry","qid":"Q58224261","ord":7,"birth_date":"2001-06-04"},{"name":"Yves","qid":"Q58825704","ord":8,"birth_date":"1997-05-24"},{"name":"Olivia Hye","qid":"Q58825825","ord":9,"birth_date":"2001-11-13"},{"name":"Vivi","qid":"Q57317398","ord":10,"birth_date":"1996-12-09"},{"name":"Go Won","qid":"Q58825794","ord":11,"birth_date":"2000-11-19"}]}
]$members$;
  v_deleted int;
begin
  perform set_config('lock_timeout', '5s', true);
  if to_regclass('public.idols') is null then
    return;
  end if;
  -- nested: PL/pgSQL plans a condition whole, so a table is named only once it is known to exist
  if to_regclass('public.cards_owned') is not null and to_regclass('public.cards_catalog') is not null then
    if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no
                where c.entity_id in (select 'group:' || x from unnest(array['fromis-9', 'kara', 'loona']) x)) then
      raise exception '099b-idols-returning rollback: a player owns a card of one of these groups';
    end if;
  end if;
  if to_regclass('public.cards_packs') is not null then
    if exists (select 1 from public.cards_packs) then
      raise exception '099b-idols-returning rollback: a pack was opened';
    end if;
  end if;
  delete from public.idols i
   using public.groups g, jsonb_array_elements(v_data) s, jsonb_array_elements(s.value->'members') m
   where g.id = i.group_id and g.slug = s.value->>'slug' and i.name = m.value->>'name' and i.wikidata_qid = m.value->>'qid'
     and i.review_reason like '099b-idols-returning%';
  get diagnostics v_deleted = row_count;
  raise notice '099b-idols-returning rollback: % rows deleted', v_deleted;
end $i099br$;
