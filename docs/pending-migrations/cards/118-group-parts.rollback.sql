-- 118-group-parts.rollback.sql (undo of 118-group-parts.sql)
--
-- What:   refused once a pack was opened, a card or a panorama is owned. Gives back the four functions (the text of 117's cards_build_catalog, 114's
--         cards_catalog_append, 110's cards_open and cards_craft, md5 checked), puts the photo rows of cards_parts_log back (status, note, focal point, small_2x:
--         what the owner changed on those rows since is replaced by the logged values), rebuilds the catalog with the old function when a card of a
--         3 part photo exists (nothing is owned, so numbers may change), drops cards_panoramas_owned, cards_panoramas, cards_parts_log, the five columns of
--         cards_photos, and puts the part check back to 0 to 2.
-- Why:    without 118 a group photo is a pair again and no panorama exists; deploy the code from before first (or switch the panorama display off).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_build_catalog', 'cards_catalog_append', 'cards_open', 'cards_craft') and md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) in ('3267a298f23abdbdaf7d709885d45c79', 'd015068e7ae143bc9e24655e74fe2e5d', '3233e2628cae60bb7bf4f76149cf7952', '707bf7425f0b803fb4e9c8b1d34d7d4a');   expect 4
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_panoramas', 'cards_panoramas_owned', 'cards_parts_log');   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name in ('parts', 'file_parts', 'file_pano', 'heads_box', 'parts_note');   expect 0
-- Undo:   run 118-group-parts.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c118r$
declare
  v_md5 text;
  v_old integer := 0;
  v_new integer := 0;
  v_has boolean;
begin
  perform set_config('lock_timeout', '5s', true);
  if to_regprocedure('public.cards_build_catalog()') is null
     or to_regprocedure('public.cards_catalog_append(boolean)') is null
     or to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)') is null
     or to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)') is null then
    raise exception '118-group-parts.rollback: cards_build_catalog, cards_catalog_append, cards_open or cards_craft is missing, nothing changed';
  end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_build_catalog()');
  if v_md5 = '3267a298f23abdbdaf7d709885d45c79' then v_old := v_old + 1;
  elsif v_md5 = '00b63db362c757cb3c4138c98afba368' then v_new := v_new + 1;
  else raise exception '118-group-parts.rollback: cards_build_catalog() is not the version of 118 (md5 %), nothing changed', v_md5;
  end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_catalog_append(boolean)');
  if v_md5 = 'd015068e7ae143bc9e24655e74fe2e5d' then v_old := v_old + 1;
  elsif v_md5 = 'bf4e41c1827742d2463d8e4ef5a15144' then v_new := v_new + 1;
  else raise exception '118-group-parts.rollback: cards_catalog_append() is not the version of 118 (md5 %), nothing changed', v_md5;
  end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)');
  if v_md5 = '3233e2628cae60bb7bf4f76149cf7952' then v_old := v_old + 1;
  elsif v_md5 = '01ba80721797a59fa83b113e29971969' then v_new := v_new + 1;
  else raise exception '118-group-parts.rollback: cards_open() is not the version of 118 (md5 %), nothing changed', v_md5;
  end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)');
  if v_md5 = '707bf7425f0b803fb4e9c8b1d34d7d4a' then v_old := v_old + 1;
  elsif v_md5 = 'e81a6565c61b3a26dc138f8de8a2a484' then v_new := v_new + 1;
  else raise exception '118-group-parts.rollback: cards_craft() is not the version of 118 (md5 %), nothing changed', v_md5;
  end if;
  if v_new = 0 and to_regclass('public.cards_parts_log') is null and to_regclass('public.cards_panoramas') is null
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'parts') then
    raise notice '118-group-parts.rollback: already rolled back, nothing changed';
    return;
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '118-group-parts.rollback: refused, a pack was opened (cards_packs holds rows), nothing changed';
  end if;
  if exists (select 1 from public.cards_owned) then
    raise exception '118-group-parts.rollback: refused, a player owns a card (cards_owned holds rows), nothing changed';
  end if;
  if to_regclass('public.cards_panoramas_owned') is not null then
    execute 'select exists (select 1 from public.cards_panoramas_owned)' into v_has;
    if v_has then
      raise exception '118-group-parts.rollback: refused, a player owns a panorama, nothing changed';
    end if;
  end if;

  -- the photo rows 118 changed, as they were
  if to_regclass('public.cards_parts_log') is not null then
    execute 'update public.cards_photos p set status = l.status, review_note = l.review_note, focal_x = l.focal_x, focal_y = l.focal_y, small_2x = l.small_2x
      from public.cards_parts_log l where l.photo_id = p.id';
  end if;

  -- the four functions as they were
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
    delete from public.cards_catalog where true;
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

  create or replace function public.cards_catalog_append(p_dry_run boolean default true)
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
    v_have text[];
    v_missing text[];
    v_open text[];
    v_pick jsonb;
    v_used bigint[];
    v_lock jsonb;
    v_old jsonb;
    v_final text[];
    v_k integer;
    v_i integer;
    v_j integer;
    v_r text;
    v_id bigint;
    v_cwi integer;
    v_base integer;
    v_no integer;
    v_cards integer := 0;
    v_subjects integer := 0;
    v_new integer := 0;
    v_ext integer := 0;
    v_waiting integer := 0;
    v_not_shown integer := 0;
    v_by jsonb := '{}'::jsonb;
    v_in boolean;
    v_size boolean;
  begin
    if p_dry_run is null then
      raise exception 'cards_catalog_append: null';
    end if;
    perform set_config('lock_timeout', '5s', true);
    if not p_dry_run then
      -- Two appends (or an append and a rebuild) never run together: the second waits here and then reads the first one's rows.
      lock table public.cards_catalog in share row exclusive mode;
    end if;
    select coalesce(max(card_no), 0) into v_base from public.cards_catalog;
    v_no := v_base;
    for e in select en.id, en.kind, en.lock_reasons from public.cards_entities en
              where en.kind in ('idol', 'group') and exists (select 1 from public.cards_photos p where p.entity_id = en.id)
              order by en.sort_key, en.id loop
      select coalesce(array_agg(distinct c.rarity), '{}'), coalesce(array_agg(c.photo_id) filter (where c.photo_id is not null), '{}')
        into v_have, v_used from public.cards_catalog c where c.entity_id = e.id;
      v_in := cardinality(v_have) > 0;
      -- The live photos no card uses yet, best first (the ranking of cards_build_catalog()).
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
                 and p.source_width is not null and p.source_height is not null
                 and not (p.id = any (v_used))) x;
      -- The free editions, from the bottom: one per unused photo (a new subject: the whole ladder, and 2 photos at least).
      v_missing := array(select r from unnest(c_ladder) with ordinality as t(r, o) where not (r = any (v_have)) order by o);
      v_k := least(coalesce(cardinality(v_ids), 0), cardinality(v_missing));
      if v_k = 0 or (not v_in and v_k < 2) then
        if not v_in then v_waiting := v_waiting + 1; end if;
        continue;
      end if;
      v_open := v_missing[1:v_k];
      v_pick := '{}'::jsonb;
      v_used := '{}';
      v_size := false;
      if 'L' = any (v_open) then
        v_id := null;
        for v_i in 1 .. cardinality(v_ids) loop
          if v_full[v_i] then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is null then
          v_open := array_remove(v_open, 'L');
          v_size := true;
        else
          v_pick := v_pick || jsonb_build_object('L', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
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
      v_final := v_have || v_open;
      v_old := coalesce(e.lock_reasons, '{}'::jsonb);
      v_lock := '{}'::jsonb;
      foreach v_r in array c_ladder loop
        if not (v_r = any (v_final)) then
          v_lock := v_lock || jsonb_build_object(v_r, case when v_old ->> v_r = 'hiatus' then 'hiatus' when v_r = 'L' and v_size then 'size' else 'photo' end);
        end if;
      end loop;
      if cardinality(v_open) = 0 then
        -- Only Full Art was free and no photo is large enough: no card to add, the reason is recorded on a write.
        if not p_dry_run and v_lock is distinct from v_old then
          update public.cards_entities set lock_reasons = v_lock where id = e.id;
        end if;
        continue;
      end if;
      foreach v_r in array v_open loop
        v_id := (v_pick ->> v_r)::bigint;
        v_i := array_position(v_ids, v_id);
        v_cwi := v_cw[v_i];
        if not p_dry_run then
          if e.kind = 'group' then
            insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
            values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 1, v_cwi / 2 < 640),
                   (v_no + 2, 'BV1-' || lpad((v_no + 2)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 2, (v_cwi - v_cwi / 2) < 640);
          else
            insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
            values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 0, v_cwi < 640);
          end if;
        end if;
        v_j := case when e.kind = 'group' then 2 else 1 end;
        v_no := v_no + v_j;
        v_cards := v_cards + v_j;
        if not v_shown[v_i] then v_not_shown := v_not_shown + v_j; end if;
        v_by := jsonb_set(v_by, array[v_r], to_jsonb(coalesce((v_by ->> v_r)::integer, 0) + v_j));
      end loop;
      if not p_dry_run then
        update public.cards_entities set active = true, lock_reasons = v_lock where id = e.id;
      end if;
      v_subjects := v_subjects + 1;
      if v_in then v_ext := v_ext + 1; else v_new := v_new + 1; end if;
    end loop;
    return jsonb_build_object('dry_run', p_dry_run, 'cards', v_cards, 'subjects', v_subjects, 'new_subjects', v_new, 'extended_subjects', v_ext,
      'waiting', v_waiting, 'from_no', case when v_cards > 0 then v_base + 1 end, 'to_no', case when v_cards > 0 then v_no end,
      'by_rarity', v_by, 'not_shown', v_not_shown);
  end
  $f$;
  revoke all on function public.cards_catalog_append(boolean) from public, anon, authenticated;
  grant execute on function public.cards_catalog_append(boolean) to service_role;

  create or replace function public.cards_open(
      p_user uuid, p_key text, p_source text, p_theme text, p_focus text, p_draws jsonb, p_now timestamptz default now(),
      p_ads_limit integer default 10, p_bonus_cap integer default 3, p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_n integer;
    v_op text;
    v_hit public.cards_idem%rowtype;
    v_kind text;
    v_theme text;
    v_group text;
    v_stock integer;
    v_anchor timestamptz;
    v_ads integer;
    v_bonus integer;
    v_timer integer;
    v_shards integer;
    v_packs_opened integer;
    v_batch uuid := gen_random_uuid();
    v_i integer;
    v_k integer;
    v_packno integer;
    v_golden boolean;
    v_pity boolean;
    v_cards integer[];
    v_card integer;
    v_pick integer;
    v_c record;
    v_p record;
    v_g integer;
    v_u integer;
    v_new boolean;
    v_pair boolean;
    v_newn integer;
    v_seen integer[];
    v_pack uuid;
    v_out jsonb := '[]'::jsonb;
    v_cards_out jsonb;
    v_pack_ids jsonb := '[]'::jsonb;
    v_before_ids text[];
    v_after_ids text[];
    v_fin jsonb;
    v_owned_before integer;
    v_owned_after integer;
    v_res jsonb;
    v_own_c boolean;
    v_own_p boolean;
    v_best text;
    v_have_hi boolean;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    if p_source is null or p_source not in ('stock', 'daily', 'focus', 'shards', 'bonus') then raise exception 'cards: source'; end if;
    if p_draws is null or jsonb_typeof(p_draws) <> 'array' then raise exception 'cards: pack'; end if;
    v_n := jsonb_array_length(p_draws);
    if v_n not in (1, 5) or (v_n = 5 and p_source <> 'stock') then raise exception 'cards: pack'; end if;
    v_theme := case when p_source in ('stock', 'shards', 'bonus') then coalesce(p_theme, 'all') else null end;
    if v_theme is not null and v_theme not in ('all', 'girls', 'boys', 'solo') then raise exception 'cards: theme'; end if;
    v_op := 'open:' || p_source || ':' || v_n || ':' || coalesce(v_theme, '') || ':' || coalesce(p_focus, '');

    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;

    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 10, w.seen_at + interval '2 hours');
    v_stock := (r ->> 'stock')::integer;
    v_anchor := case when (r ->> 'paused')::boolean then p_now else (r ->> 'anchor')::timestamptz end;
    v_ads := (r ->> 'ads_today')::integer;
    v_bonus := (r ->> 'bonus_today')::integer;
    v_timer := (r ->> 'timer_today')::integer;
    v_shards := w.shards;

    if p_source = 'stock' then
      if v_stock < v_n then raise exception '%', case when v_n = 1 then 'cards: empty' else 'cards: stack_short' end; end if;
      v_stock := v_stock - v_n;
      v_kind := v_theme;
    elsif p_source = 'shards' then
      if v_shards < 50 then raise exception 'cards: shards'; end if;
      v_shards := v_shards - 50;
      v_kind := v_theme;
    elsif p_source = 'bonus' then
      -- The Kpopdle bonus pack (002's rule, unchanged): earned by a win decided in the database and recorded once per play in cards_bonus_earned,
      -- at most p_bonus_cap a Paris day (CARDS_BONUS_PER_DAY; 0 while the bridges are off). It does not touch the stack.
      if v_n <> 1 then raise exception 'cards: pack'; end if;
      if p_bonus_cap <= 0 or v_bonus >= least(p_bonus_cap, public.cards_bonus_plays(p_user, v_today)) then raise exception 'cards: bonus'; end if;
      v_bonus := v_bonus + 1;
      v_kind := v_theme;
    elsif p_source = 'daily' then
      if exists (select 1 from public.cards_packs p where p.user_id = p_user and p.source = 'daily'
                  and p.opened_at >= v_today::timestamp at time zone 'Europe/Paris' and p.opened_at < (v_today + 1)::timestamp at time zone 'Europe/Paris') then
        raise exception 'cards: daily_used';
      end if;
      v_group := public.cards_daily_group(v_today);
      if v_group is null then raise exception 'cards: pack'; end if;
      v_kind := 'daily';
    else
      if p_focus is null or not exists (select 1 from public.cards_entities where id = p_focus and kind = 'group' and active) then raise exception 'cards: focus'; end if;
      if v_stock < 1 then raise exception 'cards: empty'; end if;
      if public.cards_focus_used(p_user, p_now) then raise exception 'cards: focus_used'; end if;
      v_stock := v_stock - 1;
      v_kind := 'all';
      v_group := p_focus;
    end if;

    select count(*) into v_owned_before from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.in_packs;
    select coalesce(array_agg(x.set_id), '{}') into v_before_ids from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;

    v_packs_opened := w.packs_opened;
    for v_i in 1..v_n loop
      v_packno := v_packs_opened + v_i;
      v_golden := v_packno % 10 = 0;
      v_pity := public.cards_pity_count(p_user) >= 29 and public.cards_pity_pool();
      select array(select (e.value)::integer from jsonb_array_elements_text(p_draws -> (v_i - 1) -> 'c') e(value)) into v_cards;
      if cardinality(v_cards) <> 5 or array_position(v_cards, null) is not null then raise exception 'cards: pack'; end if;
      v_g := nullif(p_draws -> (v_i - 1) ->> 'g', '')::integer;
      v_u := nullif(p_draws -> (v_i - 1) ->> 'u', '')::integer;

      -- Card 5: the Gold card of the guarantee, else the golden pack's Holo-or-better card, else the plain fifth card (never Standard).
      if v_pity then
        if v_u is null then raise exception 'cards: pack'; end if;
        v_cards[5] := v_u;
      elsif v_golden then
        if v_g is null then raise exception 'cards: pack'; end if;
        v_cards[5] := v_g;
      end if;

      -- The checks: every card is in packs and in the pool of this pack kind (the guarantee and the golden rule may leave the pool only when the pool
      -- has no card to give), the fifth card is never Standard, a golden fifth card is Holo or better, a guaranteed one is Gold, a focus pack's
      -- cards 2 and 4 are the group's when the group has a card of their rarity.
      for v_k in 1..5 loop
        v_card := v_cards[v_k];
        select c.rarity, c.entity_id into v_c from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id where c.card_no = v_card and c.in_packs and e.active;
        if not found then raise exception 'cards: pack'; end if;
        if not public.cards_in_pool(v_card, v_kind, v_group) then
          if not (v_k = 5 and v_pity and v_c.rarity = 'UR' and not public.cards_pool_has(v_kind, v_group, array['UR']))
             and not (v_k = 5 and v_golden and not v_pity and v_c.rarity in ('R', 'SR', 'UR', 'L') and not public.cards_pool_has(v_kind, v_group, array['R', 'SR', 'UR', 'L'])) then
            raise exception 'cards: pack';
          end if;
        end if;
        if v_k = 5 then
          if v_c.rarity = 'C' then raise exception 'cards: pack'; end if;
          if v_pity and v_c.rarity <> 'UR' then raise exception 'cards: pack'; end if;
          if v_golden and not v_pity and v_c.rarity not in ('R', 'SR', 'UR', 'L') and public.cards_pool_has(v_kind, v_group, array['R', 'SR', 'UR', 'L']) then raise exception 'cards: pack'; end if;
        end if;
        if p_source = 'focus' and v_k in (2, 4) then
          if not exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id where c.card_no = v_card and (c.entity_id = p_focus or e.group_id = p_focus))
             and exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                          where c.rarity = v_c.rarity and c.in_packs and e.active and (c.entity_id = p_focus or e.group_id = p_focus)) then
            raise exception 'cards: pack';
          end if;
        end if;
      end loop;

      -- The pack: swap a group half for its other half when the player owns exactly one (cards of this pack stored before count), store, count.
      v_seen := '{}';
      v_newn := 0;
      v_cards_out := '[]'::jsonb;
      for v_k in 1..5 loop
        v_card := v_cards[v_k];
        select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
        if v_c.part in (1, 2) then
          select h.card_no into v_pick from public.cards_catalog h where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part = 3 - v_c.part and h.in_packs;
          if v_pick is not null then
            v_own_c := exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
            v_own_p := exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_pick);
            if v_own_c and not v_own_p then
              v_card := v_pick;
              v_cards[v_k] := v_pick;
              select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
            end if;
          end if;
        end if;
        v_new := not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
        v_pair := false;
        if v_new and v_c.part in (1, 2) then
          v_pair := exists (select 1 from public.cards_catalog h join public.cards_owned o on o.card_no = h.card_no and o.user_id = p_user
                             where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part = 3 - v_c.part);
        end if;
        if v_new then v_newn := v_newn + 1; end if;
        insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source, seen)
        values (p_user, v_card, 1, p_now, p_now, v_packno, 'pack', false)
        on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
        v_cards_out := v_cards_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new, 'completesPair', v_pair,
                                                                           'golden', v_k = 5 and v_golden, 'guarantee', v_k = 5 and v_pity));
      end loop;
      delete from public.cards_wishlist where user_id = p_user and card_no = any (v_cards);

      insert into public.cards_packs (user_id, source, cards, opened_at, focus, new_count, seq, theme, golden, guarantee, batch)
      values (p_user, case when p_source = 'focus' then 'stock' else p_source end, v_cards, p_now, case when p_source = 'focus' then p_focus else null end,
              v_newn, v_packno, case when p_source = 'daily' then 'daily' when p_source = 'focus' then 'focus' else v_theme end, v_golden, v_pity,
              case when v_n > 1 then v_batch else null end)
      returning id into v_pack;
      v_pack_ids := v_pack_ids || to_jsonb(v_pack::text);
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'id', v_pack, 'pack_no', v_packno, 'source', p_source, 'theme', case when p_source = 'daily' then 'daily' when p_source = 'focus' then 'focus' else v_theme end,
        'group', v_group, 'golden', v_golden, 'guarantee', v_pity, 'cards', v_cards_out, 'new_count', v_newn));
    end loop;

    select count(*) into v_owned_after from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.in_packs;
    select coalesce(array_agg(x.set_id), '{}') into v_after_ids from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    select coalesce(jsonb_agg(jsonb_build_object('id', x.set_id, 'name', coalesce(x.name, case x.kind when 'solo' then 'Soloists' when 'holo' then 'Every Holo card' when 'gold' then 'Every Gold card' else 'Debut ' || x.name end), 'packs', x.packs)
                             order by x.set_id), '[]'::jsonb)
      into v_fin from public.cards_goals_progress(p_user, null) x
     where x.set_id = any (v_after_ids) and not (x.set_id = any (v_before_ids));

    update public.cards_wallets
       set stock = v_stock, anchor = v_anchor, paris_day = v_today, ads_today = v_ads, bonus_today = v_bonus, timer_today = v_timer, shards = v_shards,
           packs_opened = packs_opened + v_n, seen_at = p_now, version = version + 1, updated_at = p_now
     where user_id = p_user;

    v_res := jsonb_build_object('replayed', false, 'packs', v_out, 'finished', v_fin, 'owned_before', v_owned_before, 'owned_after', v_owned_after);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_res, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at)
    values (p_user, 'open', p_key, jsonb_build_object('source', p_source, 'theme', v_theme, 'focus', p_focus, 'packs', v_pack_ids, 'batch', case when v_n > 1 then v_batch else null end,
                                                       'stock_after', v_stock, 'shards_after', v_shards), p_now);
    return v_res;
  end
  $f$;
  revoke all on function public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer) from public, anon, authenticated;
  grant execute on function public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer) to service_role;

  create or replace function public.cards_craft(p_user uuid, p_key text, p_card_no integer, p_now timestamptz default now(), p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_rarity text;
    v_cost integer;
    v_packno integer;
    v_hit public.cards_idem%rowtype;
    v_op text := 'craft:' || coalesce(p_card_no::text, '');
    v_before text[];
    v_after text[];
    v_fin jsonb;
    v_out jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    select c.rarity into v_rarity
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = p_card_no and c.in_packs and e.active;
    if v_rarity is null then raise exception 'cards: card'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;
    if v_rarity = 'L' then raise exception 'cards: no_craft'; end if;
    v_cost := case v_rarity when 'C' then 10 when 'U' then 20 when 'R' then 50 when 'SR' then 120 else 300 end;
    if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = p_card_no) then raise exception 'cards: owned'; end if;
    if w.shards < v_cost then raise exception 'cards: shards'; end if;

    select coalesce(array_agg(x.set_id), '{}') into v_before from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 10, w.seen_at + interval '2 hours');
    v_packno := w.packs_opened;
    update public.cards_wallets
       set shards = shards - v_cost, stock = (r ->> 'stock')::integer, anchor = case when (r ->> 'paused')::boolean then p_now else (r ->> 'anchor')::timestamptz end,
           paris_day = v_today, ads_today = (r ->> 'ads_today')::integer, bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           seen_at = p_now, version = version + 1, updated_at = p_now
     where user_id = p_user;
    insert into public.cards_owned (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source, seen)
    values (p_user, p_card_no, 1, p_now, p_now, v_packno, 'craft', false);
    insert into public.cards_crafts (user_id, card_no, rarity, cost, crafted_at) values (p_user, p_card_no, v_rarity, v_cost, p_now);
    delete from public.cards_wishlist where user_id = p_user and card_no = p_card_no;
    select coalesce(array_agg(x.set_id), '{}') into v_after from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    select coalesce(jsonb_agg(jsonb_build_object('id', x.set_id, 'name', coalesce(x.name, case x.kind when 'solo' then 'Soloists' when 'holo' then 'Every Holo card' when 'gold' then 'Every Gold card' else 'Debut ' || x.name end), 'packs', x.packs)
                             order by x.set_id), '[]'::jsonb)
      into v_fin from public.cards_goals_progress(p_user, null) x where x.set_id = any (v_after) and not (x.set_id = any (v_before));
    v_out := jsonb_build_object('replayed', false, 'card_no', p_card_no, 'rarity', v_rarity, 'cost', v_cost, 'shards', w.shards - v_cost, 'finished', v_fin);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_out, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'craft', p_key, jsonb_build_object('card_no', p_card_no, 'cost', v_cost), p_now);
    return v_out;
  end
  $f$;
  revoke all on function public.cards_craft(uuid, text, integer, timestamptz, integer) from public, anon, authenticated;
  grant execute on function public.cards_craft(uuid, text, integer, timestamptz, integer) to service_role;

  if (select max(part) from public.cards_catalog) = 3 then
    -- a card of a 3 part photo: the old function rebuilds the catalog (nothing is owned, no pack was opened), every photo a pair again
    perform public.cards_build_catalog();
  end if;

  drop table if exists public.cards_panoramas_owned;
  drop table if exists public.cards_panoramas;
  drop table if exists public.cards_parts_log;
  alter table public.cards_photos drop column if exists parts, drop column if exists file_parts, drop column if exists file_pano,
    drop column if exists heads_box, drop column if exists parts_note;
  alter table public.cards_catalog drop constraint if exists cards_catalog_part_check;
  alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);

  if (select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) from pg_proc where oid = to_regprocedure('public.cards_build_catalog()')) <> '3267a298f23abdbdaf7d709885d45c79' then
    raise exception '118-group-parts.rollback: cards_build_catalog() is not the old body, nothing changed';
  end if;
  if (select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) from pg_proc where oid = to_regprocedure('public.cards_catalog_append(boolean)')) <> 'd015068e7ae143bc9e24655e74fe2e5d' then
    raise exception '118-group-parts.rollback: cards_catalog_append() is not the old body, nothing changed';
  end if;
  if (select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)')) <> '3233e2628cae60bb7bf4f76149cf7952' then
    raise exception '118-group-parts.rollback: cards_open() is not the old body, nothing changed';
  end if;
  if (select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)')) <> '707bf7425f0b803fb4e9c8b1d34d7d4a' then
    raise exception '118-group-parts.rollback: cards_craft() is not the old body, nothing changed';
  end if;
  notify pgrst, 'reload schema';
  raise notice '118-group-parts.rollback: the four functions are back (117, 114, 110), the panorama tables and the five columns are dropped';
end $c118r$;
