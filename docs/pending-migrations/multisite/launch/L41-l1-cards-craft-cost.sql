-- L41-l1-cards-craft-cost.sql (KpopCards, owner request of 2026-11-25: "make the craft way more expensive: 200 minimum for a basic card, and x2 for each rarer one")
--
-- What:   in ONE DO block, public.cards_craft is replaced by the body of 125-cap-5.sql (the latest definition in the repo: 126, 127n, 128 and L37 to L40 do not
--         redefine it) with ONE line changed, the price a craft charges in shards:
--           Standard 10 -> 200, Stage 20 -> 400, Holo 50 -> 800, Era 120 -> 1600, Gold 300 -> 3200.   Full Art (L) still cannot be crafted (cards: no_craft).
--         The signature, the grants, the idempotency, the wallet lock, the goals, the panorama and every other line are 125's. No table, column or other function is touched.
-- Why:    the craft is a way to finish a collection, not a way around the packs: the owner wants it dear. The web code reads the same list from CRAFT_COST
--         (apps/quiz/src/lib/cards/rules.ts), changed in the same lot, so the "Craft N" buttons, "Almost there" and the help and odds copy say the new price.
-- Rows:   0 rows changed. Crafts already made keep the cost recorded in public.cards_crafts (no UPDATE, no DELETE here): only a craft made after this file pays the new price.
-- Needs:  120 and 125 applied (cards_craft at the cap of 5), 104 (cards_crafts).
-- WHEN:   apply right after the deploy of the web code that shows the new prices. Until this file is applied the pages show the new price while the database
--         still charges the old one (a player is charged less than the button says, never more); there is no other effect. No time of day to avoid.
-- Errors: the words of the notices: "already applied" (a second run), or an exception when cards_craft is not the 125 body at one of the two price lists.
-- Verify: select count(*) from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)') and prosrc like '%when ''C'' then 200 when ''U'' then 400 when ''R'' then 800 when ''SR'' then 1600 else 3200 end%';   expect 1
-- Verify: select count(*) from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)') and prosrc like '%then 120 else 300%';   expect 0
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_craft';   expect 1
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cards_craft';   expect false
-- Verify: select count(*) from public.cards_crafts where cost not in (10, 20, 50, 120, 300, 200, 400, 800, 1600, 3200);   expect 0
-- Undo:   L41-l1-cards-craft-cost.rollback.sql (puts the 125 body back at 10, 20, 50, 120, 300; crafts made at the new price keep the cost recorded)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $o1l41$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_src text;
    v_old boolean;
    v_new boolean;
  begin
  -- Prerequisites: cards_craft exists once, in the cap 5 form of 125, and the ledger of crafts is there.
  if to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)') is null then raise exception 'L41: run 120 and 125 first (cards_craft is missing)'; end if;
  if to_regclass('public.cards_crafts') is null then raise exception 'L41: public.cards_crafts is missing (104)'; end if;
  select prosrc into v_src from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)');
  if position('values (p_user, 5, p_now' in v_src) = 0 then raise exception 'L41: run 125 first (cards_craft is not at the cap of 5), nothing changed'; end if;

  -- Where the database stands: the price list of 10, 20, 50, 120 and 300 or the one of 200, 400, 800, 1600 and 3200.
  v_old := position('when ''C'' then 10 when ''U'' then 20 when ''R'' then 50 when ''SR'' then 120 else 300 end' in v_src) > 0;
  v_new := position('when ''C'' then 200 when ''U'' then 400 when ''R'' then 800 when ''SR'' then 1600 else 3200 end' in v_src) > 0;
  if v_old = v_new then raise exception 'L41: cards_craft holds neither price list, nothing changed'; end if;
  if v_new then
    raise notice 'L41: already applied, nothing changed';
    return;
  end if;

  execute $o1f1$
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
    v_ent text;
    v_part smallint;
    v_pano integer;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    select c.rarity, c.entity_id, c.part into v_rarity, v_ent, v_part
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = p_card_no and c.in_packs and e.active;
    if v_rarity is null then raise exception 'cards: card'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;
    if v_rarity = 'L' then raise exception 'cards: no_craft'; end if;
    v_cost := case v_rarity when 'C' then 200 when 'U' then 400 when 'R' then 800 when 'SR' then 1600 else 3200 end;
    if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = p_card_no) then raise exception 'cards: owned'; end if;
    if w.shards < v_cost then raise exception 'cards: shards'; end if;

    select coalesce(array_agg(x.set_id), '{}') into v_before from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 5, w.seen_at + interval '2 hours');
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
    -- lot 7: the crafted part was the last missing one of its photo: the panorama, once
    v_pano := null;
    if v_part > 0 and not exists (select 1 from public.cards_catalog h where h.entity_id = v_ent and h.rarity = v_rarity and h.part > 0
                                     and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no)) then
      select pa.pano_no into v_pano from public.cards_panoramas pa
       where pa.entity_id = v_ent and pa.rarity = v_rarity
         and not exists (select 1 from public.cards_panoramas_owned po where po.user_id = p_user and po.pano_no = pa.pano_no);
      if v_pano is not null then
        insert into public.cards_panoramas_owned (user_id, pano_no, source, pack_id) values (p_user, v_pano, 'craft', null)
        on conflict (user_id, pano_no) do nothing;
      end if;
    end if;
    select coalesce(array_agg(x.set_id), '{}') into v_after from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    select coalesce(jsonb_agg(jsonb_build_object('id', x.set_id, 'name', coalesce(x.name, case x.kind when 'solo' then 'Soloists' when 'holo' then 'Every Holo card' when 'gold' then 'Every Gold card' else 'Debut ' || x.name end), 'packs', x.packs)
                             order by x.set_id), '[]'::jsonb)
      into v_fin from public.cards_goals_progress(p_user, null) x where x.set_id = any (v_after) and not (x.set_id = any (v_before));
    v_out := jsonb_build_object('replayed', false, 'card_no', p_card_no, 'rarity', v_rarity, 'cost', v_cost, 'shards', w.shards - v_cost, 'finished', v_fin, 'pano', v_pano);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_out, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'craft', p_key, jsonb_build_object('card_no', p_card_no, 'cost', v_cost), p_now);
    return v_out;
  end
  $f$;
$o1f1$;

  -- Checks: the new price list is in, the old one is out, one function, and no browser role can execute it.
  select prosrc into v_src from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)');
  if position('when ''C'' then 200 when ''U'' then 400 when ''R'' then 800 when ''SR'' then 1600 else 3200 end' in v_src) = 0 or position('when ''C'' then 10 when ''U'' then 20 when ''R'' then 50 when ''SR'' then 120 else 300 end' in v_src) > 0 then raise exception 'L41: cards_craft was not replaced, nothing changed'; end if;
  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_craft') <> 1 then raise exception 'L41: cards_craft is not one function, nothing changed'; end if;
  if exists (select 1 from pg_proc pr where pr.oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)')
              and (has_function_privilege('anon', pr.oid, 'execute') or has_function_privilege('authenticated', pr.oid, 'execute'))) then
    raise exception 'L41: a browser role can execute cards_craft, nothing changed';
  end if;
  raise notice 'L41: cards_craft now charges 200, 400, 800, 1600 and 3200 shards; crafts already made keep their recorded cost';
  end;
  notify pgrst, 'reload schema';
end $o1l41$;
