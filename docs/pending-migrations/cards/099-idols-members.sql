-- 099-idols-members.sql (Bunnyverse Cards lot 2, research lane, 2026-11-12; the members of the card subjects that have none)
--
-- What:   adds the current members of 15 card subjects to public.idols, for the subjects whose groups row has no active idols row yet.
--         33 people in all. Only subjects that passed the age rule are here: every person of the photo is 18 or older today and was
--         18 or older on the photo date, from Wikidata and English Wikipedia (docs/design/cards/data/age-check.json, checked on 2026-11-12; a
--         birth date held by one source only leaves a subject out, two agreeing sources are needed to keep it).
-- How:    one jsonb literal below (slug, kind, members). For each subject: the public.groups row by slug (none: a notice, skip);
--         ONLY when that group has zero active idols rows, its members are inserted (group_id, name, birth_date, wikidata_qid, active, ord)
--         with on conflict (group_id, name) do nothing. A soloist gets one row in its own groups row the same way, and nothing when an
--         active idols row of the same name already exists in another group (that row is the person). birth_date is only filled when both
--         sources agree on the full day, else it stays null. Inserted rows carry review_reason '099-idols-members' (needs_review stays false), so the
--         rollback removes only what this file wrote. Existing rows are never updated or deleted.
-- Why:    36 of the 59 card subjects had no active idols row, so 101-catalog.sql left them out (integrator brief 2026-11-12, point 1). The age
--         rule of point 2 applies to them too: only those that pass it are here.
-- Rows:   at most 33 rows in public.idols. The real count is the notice "099-idols-members: N rows added" (Messages tab).
-- Needs:  the tables public.groups and public.idols (supabase/migrations/124_verse_entity_foundation.sql). Run it just before 102-catalog-rebuild.sql.
-- Verify: select count(*) from public.idols where review_reason = '099-idols-members';   expect the "N rows added" notice
-- Verify: select g.slug, count(*) from public.idols i join public.groups g on g.id = i.group_id where i.review_reason = '099-idols-members' group by g.slug order by g.slug;   expect one line per subject with an "added" notice
-- Verify: select count(*) from public.idols where review_reason = '099-idols-members' and (not active or needs_review);   expect 0
-- Refuses: when public.groups or public.idols is missing.
-- Undo:   099-idols-members.rollback.sql (refused while a player owns a card of one of these subjects).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run adds nothing.

do $i099$
declare
  v_data constant jsonb := $members$[
  {"slug":"bibi","kind":"idol","members":[{"name":"BIBI","qid":"Q65060693","birth_date":"1998-09-27","ord":1}]},
  {"slug":"chungha","kind":"idol","members":[{"name":"Chungha","qid":"Q26214034","birth_date":"1996-02-09","ord":1}]},
  {"slug":"heize","kind":"idol","members":[{"name":"Heize","qid":"Q24855768","birth_date":"1991-08-09","ord":1}]},
  {"slug":"hyuna","kind":"idol","members":[{"name":"HyunA","qid":"Q234066","birth_date":"1992-06-06","ord":1}]},
  {"slug":"iu","kind":"idol","members":[{"name":"IU","qid":"Q20145","birth_date":"1993-05-16","ord":1}]},
  {"slug":"jay-park","kind":"idol","members":[{"name":"Jay Park","qid":"Q429046","birth_date":"1987-04-25","ord":1}]},
  {"slug":"jeon-somi","kind":"idol","members":[{"name":"JEON SOMI","qid":"Q22910214","birth_date":"2001-03-09","ord":1}]},
  {"slug":"psy","kind":"idol","members":[{"name":"PSY","qid":"Q20150","birth_date":"1977-12-31","ord":1}]},
  {"slug":"sunmi","kind":"idol","members":[{"name":"Sunmi","qid":"Q624995","birth_date":"1992-05-02","ord":1}]},
  {"slug":"zico","kind":"idol","members":[{"name":"Zico","qid":"Q7696122","birth_date":"1992-09-14","ord":1}]},
  {"slug":"apink","kind":"group","members":[{"name":"Chorong","qid":"Q492738","birth_date":"1991-03-03","ord":1},{"name":"Bomi","qid":"Q2495400","birth_date":"1993-08-13","ord":2},{"name":"Eunji","qid":"Q487831","birth_date":"1993-08-18","ord":3},{"name":"Namjoo","qid":"Q4460516","birth_date":"1995-04-15","ord":4},{"name":"Hayoung","qid":"Q4798670","birth_date":"1996-07-19","ord":5}]},
  {"slug":"artms","kind":"group","members":[{"name":"Heejin","qid":"Q56259179","birth_date":"2000-10-19","ord":1},{"name":"Haseul","qid":"Q57318729","birth_date":"1997-08-18","ord":2},{"name":"Kim Lip","qid":"Q56816418","birth_date":"1999-02-10","ord":3},{"name":"Jinsoul","qid":"Q56825122","birth_date":"1997-06-13","ord":4},{"name":"Choerry","qid":"Q58224261","birth_date":"2001-06-04","ord":5}]},
  {"slug":"btob","kind":"group","members":[{"name":"Seo Eun-kwang","qid":"Q16233553","birth_date":"1990-11-22","ord":1},{"name":"Lee Min-hyuk","qid":"Q11266766","birth_date":"1990-11-29","ord":2},{"name":"Lee Chang-sub","qid":"Q16183546","birth_date":"1991-02-26","ord":3},{"name":"Im Hyun-sik","qid":"Q10884727","birth_date":"1992-03-07","ord":4},{"name":"Peniel","qid":"Q16235836","birth_date":"1993-03-10","ord":5},{"name":"Yook Sung-jae","qid":"Q16171180","birth_date":"1995-05-02","ord":6}]},
  {"slug":"viviz","kind":"group","members":[{"name":"Eunha","qid":"Q21710247","birth_date":"1997-05-30","ord":1},{"name":"SinB","qid":"Q21709909","birth_date":"1998-06-03","ord":2},{"name":"Umji","qid":"Q24572927","birth_date":"1998-08-19","ord":3}]},
  {"slug":"winner","kind":"group","members":[{"name":"Kim Jin-woo","qid":"Q17708811","birth_date":"1991-09-26","ord":1},{"name":"Lee Seung-hoon","qid":"Q15931598","birth_date":"1992-01-11","ord":2},{"name":"Mino","qid":"Q17682967","birth_date":"1993-03-30","ord":3},{"name":"Kang Seung-yoon","qid":"Q10729153","birth_date":"1994-01-21","ord":4}]}
]$members$;
  s jsonb;
  m jsonb;
  g record;
  v_slug text;
  v_kind text;
  v_added int;
  v_total int := 0;
  v_subjects int := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '099-idols-members: public.groups or public.idols is missing';
  end if;

  for s in select value from jsonb_array_elements(v_data) loop
    v_slug := s->>'slug';
    v_kind := s->>'kind';
    select gr.id, gr.name into g from public.groups gr where gr.slug = v_slug;
    if g.id is null then
      raise notice '099-idols-members: % skipped, no groups row', v_slug;
      continue;
    end if;
    if exists (select 1 from public.idols x where x.group_id = g.id and x.active) then
      raise notice '099-idols-members: % skipped, the group has active members already', v_slug;
      continue;
    end if;
    if v_kind = 'idol' and exists (
      select 1 from public.idols x
       where x.active and x.group_id <> g.id
         and (lower(btrim(x.name)) = lower(btrim(s->'members'->0->>'name'))
              or x.wikidata_qid = s->'members'->0->>'qid')
    ) then
      raise notice '099-idols-members: % skipped, the person is an active member of another group already', v_slug;
      continue;
    end if;

    v_added := 0;
    for m in select value from jsonb_array_elements(s->'members') loop
      insert into public.idols (group_id, name, birth_date, wikidata_qid, active, ord, needs_review, review_reason)
      values (g.id, m->>'name', nullif(m->>'birth_date', '')::date, m->>'qid', true, (m->>'ord')::int, false, '099-idols-members')
      on conflict (group_id, name) do nothing;
      if found then
        v_added := v_added + 1;
      end if;
    end loop;
    v_total := v_total + v_added;
    v_subjects := v_subjects + 1;
    raise notice '099-idols-members: % added % rows', v_slug, v_added;
  end loop;

  raise notice '099-idols-members: % rows added in % subjects', v_total, v_subjects;
end $i099$;
