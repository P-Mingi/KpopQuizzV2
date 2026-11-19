-- 123-refill.rollback.sql (Bunnyverse Cards, lot LAUNCH-PREP lane REFILL, 2026-11-18; undoes 123-refill.sql)
--
-- What:   in ONE DO block, for every subject of cards_refill_log whose rows are still the ones 123 wrote: gives back its cards (photo_id,
--         in_packs, small_2x), its panoramas (photo_id), its approved pending photos (status pending, review_note, file columns) and its lock reasons, then
--         removes the photos 123 added (their files, if the workflow cut them, stay in the bucket until its cleanup) and deletes its log row.
--         A subject changed since 123 is left alone with a notice and keeps its log row. The table is dropped once it is empty.
-- Scope:  the cards move back first, then the photos (the triggers of 002 and 103 then agree with the cards). No XP, level, streak or badge.
-- Verify: select to_regclass('public.cards_refill_log') is null;   expect t (f when a notice says a subject was left alone)
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.status not in ('auto', 'approved');   expect 0
-- Refuses: between 23:50 and 00:30 UTC. A check after the writes that fails rolls the whole file back.
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c123r$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  l record;
  u jsonb;
  o jsonb;
  x jsonb;
  y jsonb;
  v_ids jsonb;
  v_why text;
  v_done text[] := '{}';
  v_back integer := 0;
  v_left integer := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '123-refill rollback: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_refill_log') is null then
    raise notice '123-refill rollback: nothing to undo (no cards_refill_log)';
    return;
  end if;
  lock table public.cards_photos, public.cards_catalog, public.cards_panoramas, public.cards_entities in share row exclusive mode;

  for l in select g.entity_id, g.old, g.new from public.cards_refill_log g order by g.entity_id loop
    u := l.new;
    o := l.old;
    v_ids := coalesce(u -> 'ids', '{}'::jsonb);
    v_why := null;
    -- every row must still be the one 123 wrote
    for x in select t.value from jsonb_array_elements(u -> 'cards') as t(value) loop
      if not exists (select 1 from public.cards_catalog k where k.card_no = (x ->> 'no')::integer
                       and k.photo_id is not distinct from (case when jsonb_typeof(x -> 'new') = 'string' then (v_ids ->> (x ->> 'new'))::bigint else (x ->> 'new')::bigint end)) then
        v_why := 'card BV1-' || lpad(x ->> 'no', 4, '0');
        exit;
      end if;
    end loop;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'panos') as t(value) loop
        if not exists (select 1 from public.cards_panoramas z where z.pano_no = (x ->> 'no')::integer
                         and z.photo_id is not distinct from (case when jsonb_typeof(x -> 'new') = 'string' then (v_ids ->> (x ->> 'new'))::bigint else (x ->> 'new')::bigint end)) then
          v_why := 'panorama P-' || lpad(x ->> 'no', 4, '0');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'approve') as t(value) loop
        if not exists (select 1 from public.cards_photos ph where ph.id = (x ->> 'id')::bigint and ph.status = 'approved') then
          v_why := 'photo ' || (x ->> 'id');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'add') as t(value) loop
        if not exists (select 1 from public.cards_photos ph where ph.id = (v_ids ->> (x ->> 'key'))::bigint and ph.status = 'approved'
                         and ph.focal_x = (x ->> 'fx')::integer and ph.focal_y = (x ->> 'fy')::integer) then
          v_why := 'the new photo ' || (x ->> 'page');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null and jsonb_typeof(u -> 'lock') = 'object'
       and not exists (select 1 from public.cards_entities e where e.id = l.entity_id and e.lock_reasons = u #> '{lock,new}') then
      v_why := 'the lock reasons';
    end if;
    if v_why is not null then
      v_left := v_left + 1;
      raise notice '123-refill rollback: % left alone: % changed since 123', l.entity_id, v_why;
      continue;
    end if;
    -- the cards and the panoramas first, then the photos, then the lock reasons
    for y in select t.value from jsonb_array_elements(o -> 'cards') as t(value) loop
      update public.cards_catalog set photo_id = (y ->> 'photo_id')::bigint, in_packs = (y ->> 'in_packs')::boolean, small_2x = (y ->> 'small_2x')::boolean
       where card_no = (y ->> 'no')::integer
         and (photo_id is distinct from (y ->> 'photo_id')::bigint or in_packs <> (y ->> 'in_packs')::boolean or small_2x <> (y ->> 'small_2x')::boolean);
    end loop;
    for y in select t.value from jsonb_array_elements(o -> 'panos') as t(value) loop
      update public.cards_panoramas set photo_id = (y ->> 'photo_id')::bigint where pano_no = (y ->> 'no')::integer and photo_id is distinct from (y ->> 'photo_id')::bigint;
    end loop;
    -- an approved pending photo goes back to pending with its rows as they were (files the workflow cut for it stay in the bucket until its cleanup)
    for y in select t.value from jsonb_array_elements(o -> 'photos') as t(value) loop
      update public.cards_photos set status = y ->> 'status', review_note = y ->> 'review_note', storage_path = y ->> 'storage_path',
             file_focal_x = (y ->> 'file_focal_x')::integer, file_focal_y = (y ->> 'file_focal_y')::integer, file_parts = (y ->> 'file_parts')::smallint,
             file_pano = (y ->> 'file_pano')::boolean
       where id = (y ->> 'id')::bigint;
    end loop;
    delete from public.cards_photos ph where ph.entity_id = l.entity_id
       and ph.id in (select (t.value)::text::bigint from jsonb_each(v_ids) as t(key, value));
    if jsonb_typeof(u -> 'lock') = 'object' then
      update public.cards_entities set lock_reasons = o -> 'lock_reasons' where id = l.entity_id;
    end if;
    delete from public.cards_refill_log where entity_id = l.entity_id;
    v_done := v_done || l.entity_id;
    v_back := v_back + 1;
  end loop;

  -- the checks of the subjects this run touched; a failure rolls the whole file back
  if exists (select 1 from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id
             where c.entity_id = any (v_done) and c.in_packs and (p.status not in ('auto', 'approved') or (p.storage_path is null and p.source_path is null))) then
    raise exception '123-refill rollback: a card would stay in the packs on a photo that is not live or has no file, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c where c.entity_id = any (v_done) and c.in_packs and c.photo_id is null) then
    raise exception '123-refill rollback: a card would be in the packs with no photo, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c where c.entity_id = any (v_done) and c.photo_id is not null
             group by c.entity_id, c.photo_id having count(distinct c.rarity) > 1) then
    raise exception '123-refill rollback: a photo would be on two editions, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id
             where c.entity_id = any (v_done) and p.entity_id <> c.entity_id) then
    raise exception '123-refill rollback: a card would show a photo of another subject, nothing changed';
  end if;
  if exists (select 1 from public.cards_panoramas z join public.cards_catalog c on c.card_no = z.first_card
             where z.entity_id = any (v_done) and z.photo_id is distinct from c.photo_id) then
    raise exception '123-refill rollback: a panorama would not follow its cards, nothing changed';
  end if;
  if exists (select 1 from public.cards_photos p where p.entity_id = any (v_done) and p.status in ('auto', 'approved')
             group by p.entity_id, p.slot having count(*) > 1) then
    raise exception '123-refill rollback: two live photos would hold one slot, nothing changed';
  end if;

  if not exists (select 1 from public.cards_refill_log) then
    drop table public.cards_refill_log;
  end if;
  raise notice '123-refill rollback: % subjects given back, % left alone', v_back, v_left;
end $c123r$;
