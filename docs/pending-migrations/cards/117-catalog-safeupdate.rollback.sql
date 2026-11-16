-- 117-catalog-safeupdate.rollback.sql (undo of 117-catalog-safeupdate.sql)
--
-- What:   gives back 103's body of cards_build_catalog() (its DELETE without WHERE: the admin's button answers 400 again in production).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_build_catalog' and md5(prosrc) = '563246d17ba3275013beeb33efae9fd2';   expect 1
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c117r$
declare
  v_md5 text;
begin
  perform set_config('lock_timeout', '5s', true);
  if to_regprocedure('public.cards_build_catalog()') is null then
    raise notice '117-catalog-safeupdate.rollback: cards_build_catalog() is missing, nothing to do';
    return;
  end if;
  select md5(prosrc) into v_md5 from pg_proc where oid = 'public.cards_build_catalog()'::regprocedure;
  if v_md5 = '563246d17ba3275013beeb33efae9fd2' then
    raise notice '117-catalog-safeupdate.rollback: already 103''s body, nothing changed';
    return;
  end if;
  if v_md5 <> 'fec85968cf62eee611bf4f342d853090' then
    raise exception '117-catalog-safeupdate.rollback: cards_build_catalog() is not the version of 117 (md5 %), nothing changed', v_md5;
  end if;

  create or replace function public.cards_build_catalog()
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    c_ladder constant text[] := array['C', 'U', 'R', 'SR', 'UR', 'L'];
    c_edition constant jsonb := '{"C": "std", "U": "stage", "R": "holo", "SR": "era", "UR": "gold", "L": "full"}'::jsonb;
    e record;
    v_ids bigint[];
    v_full boolean[];
    v_stage boolean[];
    v_cw integer[];
    v_shown boolean[];
    v_open text[];
    v_pick jsonb;
    v_used bigint[];
    v_lock jsonb;
    v_old jsonb;
    v_n integer;
    v_i integer;
    v_j integer;
    v_r text;
    v_id bigint;
    v_cwi integer;
    v_no integer := 0;
    v_subjects integer := 0;
    v_waiting integer := 0;
  begin
    if exists (select 1 from public.cards_owned) then
      raise exception 'cards_build_catalog: a player owns a card, the catalog numbers cannot change';
    end if;
    if exists (select 1 from public.cards_packs) then
      raise exception 'cards_build_catalog: a pack was opened, the catalog numbers cannot change';
    end if;
    delete from public.cards_catalog;
    for e in select en.id, en.kind, en.lock_reasons from public.cards_entities en
              where en.kind in ('idol', 'group') and exists (select 1 from public.cards_photos p where p.entity_id = en.id)
              order by en.sort_key, en.id loop
      -- The live photos, best first: the researcher's quality, then the pixels of the crop window, then the most recent, then the slot.
      select array_agg(x.id order by x.rk), array_agg(x.full_ok order by x.rk), array_agg(x.stage order by x.rk),
             array_agg(x.cw order by x.rk), array_agg(x.shown order by x.rk)
        into v_ids, v_full, v_stage, v_cw, v_shown
        from (select p.id, p.stage, w.cw,
                     case when e.kind = 'group' then w.cw / 2 >= 640 else w.cw >= 640 end as full_ok,
                     (p.storage_path is not null or p.source_path is not null) as shown,
                     row_number() over (order by coalesce(p.quality, 3) desc, w.cw desc, p.event_date desc nulls last, p.slot) as rk
                from public.cards_photos p
                cross join lateral (select floor(least(p.source_width::numeric,
                                      p.source_height::numeric * (case when e.kind = 'group' then 11 else 5.5 end) / 8.5))::integer as cw) w
               where p.entity_id = e.id and p.status in ('auto', 'approved')
                 and p.source_width is not null and p.source_height is not null) x;
      v_n := least(coalesce(cardinality(v_ids), 0), 6);
      if v_n < 2 then
        -- One approved photo (or none yet): no edition, the subject waits for a second photo (owner decision: packs from 2 photos).
        update public.cards_entities set active = false, lock_reasons = '{}'::jsonb where id = e.id;
        v_waiting := v_waiting + 1;
        continue;
      end if;
      v_open := c_ladder[1:v_n];
      v_pick := '{}'::jsonb;
      v_used := '{}';
      v_lock := '{}'::jsonb;
      -- Full Art: the best photo that gives an honest 2x of the whole card; none, and Full Art stays locked.
      if 'L' = any (v_open) then
        v_id := null;
        for v_i in 1 .. cardinality(v_ids) loop
          if v_full[v_i] then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is null then
          v_open := array_remove(v_open, 'L');
          v_lock := v_lock || '{"L": "size"}'::jsonb;
        else
          v_pick := v_pick || jsonb_build_object('L', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
      -- Stage: a stage photo when there is one, the lowest rated, so the best photos stay on the higher editions.
      if 'U' = any (v_open) then
        v_id := null;
        for v_i in reverse cardinality(v_ids) .. 1 loop
          if v_stage[v_i] and not (v_ids[v_i] = any (v_used)) then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is not null then
          v_pick := v_pick || jsonb_build_object('U', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
      -- The other editions, from the highest down, take the remaining photos best first.
      for v_i in reverse cardinality(v_open) .. 1 loop
        v_r := v_open[v_i];
        continue when v_pick ->> v_r is not null;
        v_id := null;
        for v_j in 1 .. cardinality(v_ids) loop
          if not (v_ids[v_j] = any (v_used)) then v_id := v_ids[v_j]; exit; end if;
        end loop;
        v_pick := v_pick || jsonb_build_object(v_r, v_id);
        v_used := v_used || v_id;
      end loop;
      -- Why an edition is missing: no photo for it yet, or (Full Art) no photo large enough; an owner's 'hiatus' stays.
      v_old := coalesce(e.lock_reasons, '{}'::jsonb);
      foreach v_r in array c_ladder loop
        if not (v_r = any (v_open)) then
          v_lock := v_lock || jsonb_build_object(v_r, case when v_old ->> v_r = 'hiatus' then 'hiatus' else coalesce(v_lock ->> v_r, 'photo') end);
        end if;
      end loop;
      -- The cards, in ladder order; a group gives a pair with consecutive numbers.
      foreach v_r in array v_open loop
        v_id := (v_pick ->> v_r)::bigint;
        v_i := array_position(v_ids, v_id);
        v_cwi := v_cw[v_i];
        if e.kind = 'group' then
          insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
          values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 1, v_cwi / 2 < 640),
                 (v_no + 2, 'BV1-' || lpad((v_no + 2)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 2, (v_cwi - v_cwi / 2) < 640);
          v_no := v_no + 2;
        else
          insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
          values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 0, v_cwi < 640);
          v_no := v_no + 1;
        end if;
      end loop;
      update public.cards_entities set active = true, lock_reasons = v_lock where id = e.id;
      v_subjects := v_subjects + 1;
    end loop;
    return jsonb_build_object('subjects', v_subjects, 'waiting', v_waiting, 'cards', v_no,
      'by_rarity', coalesce((select jsonb_object_agg(x.rarity, x.n) from (select rarity, count(*) as n from public.cards_catalog group by rarity) x), '{}'::jsonb),
      'not_shown', (select count(*) from public.cards_catalog where not in_packs));
  end
  $f$;
  revoke all on function public.cards_build_catalog() from public, anon, authenticated;
  grant execute on function public.cards_build_catalog() to service_role;
  raise notice '117-catalog-safeupdate.rollback: 103''s body is back';
end $c117r$;
