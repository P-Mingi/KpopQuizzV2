-- 114-catalog-append.sql (KpopCards, 2026-11-14; the catalog must not freeze after the first pack)
--
-- What:   in ONE DO block, creates public.cards_catalog_append(p_dry_run boolean default true), the way to ADD cards once players hold cards.
--         cards_build_catalog() (103) refuses as soon as a card is owned or a pack opened, because it deletes and renumbers; this function never does:
--         1. it adds the new editions of the subjects that already have cards (a new approved photo opens the next free edition up the ladder)
--            and the new subjects (2 approved photos or more), with the SAME rules as cards_build_catalog(): one edition = one photo (a photo
--            already on a card is never used again), editions open from the bottom (C, U, R, SR, UR, L), the best photo of a new subject
--            on its highest edition, Stage takes the lowest rated stage photo, Full Art needs an honest 2x of the whole card (else it stays
--            locked "size"), a group gets a pair per edition (part 1 then part 2, consecutive numbers), a subject enters packs only from 2 photos;
--         2. the new cards are numbered after max(card_no), subjects in the order of cards_build_catalog() (sort_key, id), each one's
--            editions in ladder order. No existing row is updated, renumbered or deleted; cards_owned, cards_packs, cards_wallets and every
--            audit table are never read for writing. A second call adds 0 cards;
--         3. p_dry_run true (the default) only COUNTS and writes nothing: {dry_run, cards, subjects, new_subjects, extended_subjects, waiting,
--            from_no, to_no, by_rarity, not_shown}. Writing needs the explicit p_dry_run => false. The write takes a SHARE ROW EXCLUSIVE lock on
--            cards_catalog (reads and openings go on; a second append, a rebuild or any other writer waits), so two appends never share a number.
--         Writes only cards_catalog (new rows) and, for the subjects that received cards, cards_entities.active and lock_reasons.
-- Why:    the 18 subjects that wait for a second photo, and every photo approved after the first pack, could never enter the game.
-- Rows:   0 rows. 1 function. RLS unchanged (no policy added); execute for service_role only (the admin's server).
-- Needs:  001 to 003, 102 and 103 applied before (cards_build_catalog, the part and small_2x columns, the photo columns of lot 3).
-- Errors: "114-catalog-append: ..." at apply time when a table or file 103 is missing; at call time "cards_catalog_append: null" for a null
--         p_dry_run and a lock timeout (55P03, 5 s) when another writer holds cards_catalog.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_catalog_append';   expect 1
-- Verify: select has_function_privilege('anon', 'public.cards_catalog_append(boolean)', 'execute') or has_function_privilege('authenticated', 'public.cards_catalog_append(boolean)', 'execute');   expect f
-- Verify: select has_function_privilege('service_role', 'public.cards_catalog_append(boolean)', 'execute');   expect t
-- Verify: select prosecdef and proconfig = array['search_path=public'] from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_catalog_append';   expect t
-- Verify: select public.cards_catalog_append(true) - 'by_rarity';   read-only preview (writes nothing); expect {"dry_run": true, "cards": N, "subjects": S, ...} with N = 0 while no photo is waiting
-- Verify: select min(card_no), max(card_no), count(*) from public.cards_catalog;   expect 1, N, N (contiguous; this file adds no card, only a call with false does)
-- Undo:   114-catalog-append.rollback.sql (drops the function; the cards it added stay, they are catalog rows like any other).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c114$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_catalog') is null or to_regclass('public.cards_photos') is null or to_regclass('public.cards_entities') is null then
    raise exception '114-catalog-append: the cards tables are missing (run 001 to 003 first)';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_catalog' and column_name = 'part')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_catalog' and column_name = 'small_2x') then
    raise exception '114-catalog-append: cards_catalog has no part or small_2x column (apply 102-catalog-rebuild.sql first)';
  end if;
  if to_regprocedure('public.cards_build_catalog()') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'quality') then
    raise exception '114-catalog-append: cards_build_catalog() is missing (apply 103-catalog-photos.sql first)';
  end if;

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

  if has_function_privilege('anon', 'public.cards_catalog_append(boolean)', 'execute')
     or has_function_privilege('authenticated', 'public.cards_catalog_append(boolean)', 'execute') then
    raise exception '114-catalog-append: a browser role can execute cards_catalog_append';
  end if;

  notify pgrst, 'reload schema';
end $c114$;
