-- 119-photocheck.rollback.sql (Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK, 2026-11-17; undoes 119-photocheck.sql)
--
-- What:   in ONE DO block, for every subject of cards_photocheck_log whose rows are still the ones 119 wrote: gives back its cards (photo_id,
--         in_packs, small_2x), its panoramas (photo_id), its photos (status, focal point, review_note; the file focal point only while the
--         files are not cut again) and its lock reasons, then deletes its log row. A subject changed since 119 is left alone with a notice and
--         keeps its log row. The table is dropped once it is empty.
-- Scope:  the cards move back first, then the photos (the triggers of 002 and 103 then agree with the cards). No XP, level, streak or badge.
-- Verify: select to_regclass('public.cards_photocheck_log') is null;   expect t (f when a notice says a subject was left alone)
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.status not in ('auto', 'approved');   expect 0
-- Refuses: between 23:50 and 00:30 UTC. A check after the writes that fails rolls the whole file back.
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c119r$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  l record;
  u jsonb;
  o jsonb;
  x jsonb;
  y jsonb;
  v_why text;
  v_done text[] := '{}';
  v_back integer := 0;
  v_left integer := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '119-photocheck rollback: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_photocheck_log') is null then
    raise notice '119-photocheck rollback: nothing to undo (no cards_photocheck_log)';
    return;
  end if;
  lock table public.cards_photos, public.cards_catalog, public.cards_panoramas, public.cards_entities in share row exclusive mode;

  for l in select g.entity_id, g.old, g.new from public.cards_photocheck_log g order by g.entity_id loop
    u := l.new;
    o := l.old;
    v_why := null;
    -- every row must still be the one 119 wrote
    for x in select t.value from jsonb_array_elements(u -> 'cards') as t(value) loop
      if not exists (select 1 from public.cards_catalog k where k.card_no = (x ->> 'no')::integer and k.photo_id is not distinct from (x #>> '{new,photo}')::bigint) then
        v_why := 'card BV1-' || lpad(x ->> 'no', 4, '0');
        exit;
      end if;
    end loop;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'panos') as t(value) loop
        if not exists (select 1 from public.cards_panoramas z where z.pano_no = (x ->> 'no')::integer and z.photo_id is not distinct from (x ->> 'new')::bigint) then
          v_why := 'panorama P-' || lpad(x ->> 'no', 4, '0');
          exit;
        end if;
      end loop;
    end if;
    if v_why is null then
      for x in select t.value from jsonb_array_elements(u -> 'photos') as t(value) loop
        if not exists (select 1 from public.cards_photos ph where ph.id = (x ->> 'id')::bigint
                         and ph.status = coalesce(x #>> '{new,status}', x #>> '{old,status}')
                         and ph.focal_x = coalesce((x #>> '{new,fx}')::integer, (x #>> '{old,fx}')::integer)
                         and ph.focal_y = coalesce((x #>> '{new,fy}')::integer, (x #>> '{old,fy}')::integer)) then
          v_why := 'photo ' || (x ->> 'id');
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
      raise notice '119-photocheck rollback: % left alone: % changed since 119', l.entity_id, v_why;
      continue;
    end if;
    -- the cards and the panoramas first, then the photos, then the lock reasons
    for y in select t.value from jsonb_array_elements(o -> 'cards') as t(value) loop
      update public.cards_catalog set photo_id = (y ->> 'photo_id')::bigint, in_packs = (y ->> 'in_packs')::boolean, small_2x = (y ->> 'small_2x')::boolean
       where card_no = (y ->> 'no')::integer;
    end loop;
    for y in select t.value from jsonb_array_elements(o -> 'panos') as t(value) loop
      update public.cards_panoramas set photo_id = (y ->> 'photo_id')::bigint where pano_no = (y ->> 'no')::integer;
    end loop;
    for y in select t.value from jsonb_array_elements(o -> 'photos') as t(value) loop
      update public.cards_photos set status = y ->> 'status' where id = (y ->> 'id')::bigint and status is distinct from y ->> 'status';
      update public.cards_photos set focal_x = (y ->> 'focal_x')::integer, focal_y = (y ->> 'focal_y')::integer, review_note = y ->> 'review_note',
             file_focal_x = case when file_focal_x is null and file_focal_y is null then (y ->> 'file_focal_x')::integer else file_focal_x end,
             file_focal_y = case when file_focal_x is null and file_focal_y is null then (y ->> 'file_focal_y')::integer else file_focal_y end
       where id = (y ->> 'id')::bigint;
    end loop;
    if jsonb_typeof(u -> 'lock') = 'object' then
      update public.cards_entities set lock_reasons = o -> 'lock_reasons' where id = l.entity_id;
    end if;
    delete from public.cards_photocheck_log where entity_id = l.entity_id;
    v_done := v_done || l.entity_id;
    v_back := v_back + 1;
  end loop;

  -- the checks of the subjects this run touched; a failure rolls the whole file back
  if exists (select 1 from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id
             where c.entity_id = any (v_done) and c.in_packs and p.status not in ('auto', 'approved')) then
    raise exception '119-photocheck rollback: a card would stay in the packs on a photo that is not live, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c where c.entity_id = any (v_done) and c.in_packs and c.photo_id is null) then
    raise exception '119-photocheck rollback: a card would be in the packs with no photo, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c where c.entity_id = any (v_done) and c.photo_id is not null
             group by c.entity_id, c.photo_id having count(distinct c.rarity) > 1) then
    raise exception '119-photocheck rollback: a photo would be on two editions, nothing changed';
  end if;
  if exists (select 1 from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id
             where c.entity_id = any (v_done) and p.entity_id <> c.entity_id) then
    raise exception '119-photocheck rollback: a card would show a photo of another subject, nothing changed';
  end if;
  if exists (select 1 from public.cards_panoramas z join public.cards_catalog c on c.card_no = z.first_card
             where z.entity_id = any (v_done) and z.photo_id is distinct from c.photo_id) then
    raise exception '119-photocheck rollback: a panorama would not follow its cards, nothing changed';
  end if;

  if not exists (select 1 from public.cards_photocheck_log) then
    drop table public.cards_photocheck_log;
  end if;
  raise notice '119-photocheck rollback: % subjects given back, % left alone', v_back, v_left;
end $c119r$;
