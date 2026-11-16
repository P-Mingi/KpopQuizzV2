-- 099b-idols-returning.sql (Bunnyverse Cards lot 3, 2026-11-13; the members of the groups that come back with a newer photo)
--
-- What:   adds the current members of 3 groups to public.idols (21 people at most): fromis-9, kara, loona. Lot 2 left
--         these groups out only because someone was under 18 on their old photo's date; lot 3 found newer photos where everyone is an adult
--         (docs/design/cards/data/photos.json). 103-catalog-photos.sql checks every group's active members in public.idols at apply time
--         (decision 17): without rows it leaves the group out ("no_active_member").
--         The rows are active with needs_review TRUE and the reason "Kpopdle clues not filled yet (gender, nationality, debut year, leader or maknae)": the Kpopdle source view reads only rows without
--         needs_review, so none of them enters Kpopdle until the owner fills those columns (as 099).
-- How:    one jsonb literal below. For each group: the public.groups row by slug (none: a notice, skip); ONLY when that group has zero active
--         idols rows, its members are inserted with on conflict (group_id, name) do nothing. birth_date only when two permitted sources give
--         it to the day (lot 2's Wikidata and English Wikipedia, lot 3's Korean or English Wikipedia second sources); a member without it
--         makes 103 leave the group out ("unknown_birth_date"), never in. Every inserted row carries a review_reason starting with '099b-idols-returning'.
--         Existing rows are never updated or deleted. The Kpopdle source view is counted before and after: the file refuses if it moved.
-- Why:    integrator brief lot 3, part A: a newer photo can bring back the groups left out for the age on the photo.
-- Rows:   at most 21 rows in public.idols. The real count is the notice "099b-idols-returning: N rows added".
-- Needs:  public.groups and public.idols. Run it after 099 and before 103 (a companion of 099, numbered so: review 1 finding 15 keeps 100 unused).
-- Verify: select count(*) from public.idols where review_reason like '099b-idols-returning%';   expect the "N rows added" notice
-- Verify: select count(*) from public.idols where review_reason like '099b-idols-returning%' and active and not needs_review;   expect 0
-- Verify: select g.slug, count(*) from public.idols i join public.groups g on g.id = i.group_id where i.review_reason like '099b-idols-returning%' group by g.slug order by g.slug;   expect one line per group with an "added" notice
-- Refuses: when public.groups or public.idols is missing; when the Kpopdle source would change.
-- Undo:   099b-idols-returning.rollback.sql (refused while a player owns a card of one of these groups).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run adds nothing.

do $i099b$
declare
  v_data constant jsonb := $members$[
  {"slug":"fromis-9","members":[{"name":"Song Ha-young","qid":"Q58816368","ord":1,"birth_date":"1997-09-29"},{"name":"Park Ji-won","qid":"Q56695886","ord":2,"birth_date":"1998-03-20"},{"name":"Lee Chae-young","qid":"Q56660258","ord":3,"birth_date":"2000-05-14"},{"name":"Lee Na-gyung","qid":"Q56660245","ord":4,"birth_date":"2000-06-01"},{"name":"Baek Ji-heon","qid":"Q56660176","ord":5,"birth_date":"2003-04-17"}]},
  {"slug":"kara","members":[{"name":"Gyuri","qid":"Q495000","ord":1,"birth_date":"1988-05-21"},{"name":"Seungyeon","qid":"Q495020","ord":2,"birth_date":"1988-07-24"},{"name":"Nicole","qid":"Q494992","ord":3,"birth_date":"1991-10-07"},{"name":"Jiyoung","qid":"Q495009","ord":4,"birth_date":"1994-01-18"},{"name":"Youngji","qid":"Q17302045","ord":5,"birth_date":"1994-08-30"}]},
  {"slug":"loona","members":[{"name":"Heejin","qid":"Q56259179","ord":1,"birth_date":"2000-10-19"},{"name":"Hyunjin","qid":"Q48893612","ord":2,"birth_date":"2000-11-15"},{"name":"Haseul","qid":"Q57318729","ord":3,"birth_date":"1997-08-18"},{"name":"Yeojin","qid":"Q56824821","ord":4,"birth_date":"2002-11-11"},{"name":"Kim Lip","qid":"Q56816418","ord":5,"birth_date":"1999-02-10"},{"name":"Jinsoul","qid":"Q56825122","ord":6,"birth_date":"1997-06-13"},{"name":"Choerry","qid":"Q58224261","ord":7,"birth_date":"2001-06-04"},{"name":"Yves","qid":"Q58825704","ord":8,"birth_date":"1997-05-24"},{"name":"Olivia Hye","qid":"Q58825825","ord":9,"birth_date":"2001-11-13"},{"name":"Vivi","qid":"Q57317398","ord":10,"birth_date":"1996-12-09"},{"name":"Go Won","qid":"Q58825794","ord":11,"birth_date":"2000-11-19"}]}
]$members$;
  s jsonb;
  m jsonb;
  g record;
  v_slug text;
  v_added int;
  v_total int := 0;
  v_groups int := 0;
  v_dle_before bigint;
  v_dle_after bigint;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '099b-idols-returning: public.groups or public.idols is missing';
  end if;
  if to_regclass('public.dle_src_kpop_idol') is not null then
    execute 'select count(*) from public.dle_src_kpop_idol' into v_dle_before;
  end if;

  for s in select value from jsonb_array_elements(v_data) loop
    v_slug := s->>'slug';
    select gr.id, gr.name into g from public.groups gr where gr.slug = v_slug;
    if g.id is null then
      raise notice '099b-idols-returning: % skipped, no groups row', v_slug;
      continue;
    end if;
    if exists (select 1 from public.idols x where x.group_id = g.id and x.active) then
      raise notice '099b-idols-returning: % skipped, the group has active members already', v_slug;
      continue;
    end if;
    v_added := 0;
    for m in select value from jsonb_array_elements(s->'members') loop
      insert into public.idols (group_id, name, birth_date, wikidata_qid, active, ord, needs_review, review_reason)
      values (g.id, m->>'name', nullif(m->>'birth_date', '')::date, m->>'qid', true, (m->>'ord')::int, true, '099b-idols-returning: Kpopdle clues not filled yet (gender, nationality, debut year, leader or maknae)')
      on conflict (group_id, name) do nothing;
      if found then v_added := v_added + 1; end if;
    end loop;
    v_total := v_total + v_added;
    v_groups := v_groups + 1;
    raise notice '099b-idols-returning: % added % rows', v_slug, v_added;
  end loop;

  raise notice '099b-idols-returning: % rows added in % groups', v_total, v_groups;
  if v_dle_before is not null then
    execute 'select count(*) from public.dle_src_kpop_idol' into v_dle_after;
    if v_dle_after <> v_dle_before then
      raise exception '099b-idols-returning: the Kpopdle source would go from % to % entities, nothing written', v_dle_before, v_dle_after;
    end if;
    raise notice '099b-idols-returning: Kpopdle source % entities before and after (no row of this file enters Kpopdle)', v_dle_after;
  end if;
end $i099b$;
