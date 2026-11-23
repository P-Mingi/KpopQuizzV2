-- 126-dup-bias.rollback.sql (KpopCards launch polish 3, 2026-11-23; fewer new cards, undone)
--
-- What:   in ONE DO block, cards_open gets the body of 125 back (byte for byte) and cards_dup_pick and cards_dup_bias are dropped.
-- Why:    the undo of 126-dup-bias.sql. No data is touched: cards a player already got stay.
-- Rows:   0 rows changed.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_dup_bias', 'cards_dup_pick');   expect 0
-- Verify: select position('cards_dup_pick' in prosrc) > 0 from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)');   expect false
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c126r$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_bias boolean;
    v_pick boolean;
    v_open boolean;
  begin
  if to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)') is null then raise exception '126-dup-bias.rollback: run 125 and 126 first (cards_open is missing)'; end if;

  v_bias := to_regprocedure('public.cards_dup_bias()') is not null;
  v_pick := to_regprocedure('public.cards_dup_pick(uuid, integer, text, text, text, integer[], boolean)') is not null;
  v_open := position('cards_dup_pick' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)'))) > 0;
  if not v_bias and not v_pick and not v_open then
    raise notice '126-dup-bias.rollback: already rolled back, nothing changed';
    return;
  end if;
  if not (v_bias and v_pick and v_open) then
    raise exception '126-dup-bias.rollback: the state is mixed (constant %, helper %, cards_open %), nothing changed', v_bias, v_pick, v_open;
  end if;

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
    v_panos integer[];
    v_pano integer;
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
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;

    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 5, w.seen_at + interval '2 hours');
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
      v_panos := '{}';
      v_newn := 0;
      v_cards_out := '[]'::jsonb;
      for v_k in 1..5 loop
        v_card := v_cards[v_k];
        select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
        -- lot 7, the missing part rule: a part the player owns, while another part of the same photo (entity and rarity) in packs is missing, becomes
        -- the lowest-numbered missing part (cards of this pack stored before count as owned)
        if v_c.part > 0 then
          v_pick := null;
          if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card) then
            select h.card_no into v_pick from public.cards_catalog h
             where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.in_packs
               and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no)
             order by h.part limit 1;
            if v_pick is not null then
              v_card := v_pick;
              v_cards[v_k] := v_pick;
              select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
            end if;
          end if;
        end if;
        v_new := not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
        v_pair := false;
        if v_new and v_c.part > 0 then
          -- the last missing part: the photo has other parts and the player owns every one of them
          v_pair := exists (select 1 from public.cards_catalog h where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.card_no <> v_card)
                    and not exists (select 1 from public.cards_catalog h
                                     where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.card_no <> v_card
                                       and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no));
        end if;
        if v_new then v_newn := v_newn + 1; end if;
        insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source, seen)
        values (p_user, v_card, 1, p_now, p_now, v_packno, 'pack', false)
        on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
        -- lot 7: the card that completes its set gives the panorama, once (its row is written with the pack, below)
        v_pano := null;
        if v_pair then
          select pa.pano_no into v_pano from public.cards_panoramas pa
           where pa.entity_id = v_c.entity_id and pa.rarity = v_c.rarity
             and not exists (select 1 from public.cards_panoramas_owned po where po.user_id = p_user and po.pano_no = pa.pano_no);
          if v_pano is not null then v_panos := v_panos || v_pano; end if;
        end if;
        v_cards_out := v_cards_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new, 'completesPair', v_pair,
                                                                           'golden', v_k = 5 and v_golden, 'guarantee', v_k = 5 and v_pity)
                                                         || case when v_pano is not null then jsonb_build_object('pano', v_pano) else '{}'::jsonb end);
      end loop;
      delete from public.cards_wishlist where user_id = p_user and card_no = any (v_cards);

      insert into public.cards_packs (user_id, source, cards, opened_at, focus, new_count, seq, theme, golden, guarantee, batch)
      values (p_user, case when p_source = 'focus' then 'stock' else p_source end, v_cards, p_now, case when p_source = 'focus' then p_focus else null end,
              v_newn, v_packno, case when p_source = 'daily' then 'daily' when p_source = 'focus' then 'focus' else v_theme end, v_golden, v_pity,
              case when v_n > 1 then v_batch else null end)
      returning id into v_pack;
      if cardinality(v_panos) > 0 then
        insert into public.cards_panoramas_owned (user_id, pano_no, source, pack_id)
        select p_user, x.p, 'pack', v_pack from unnest(v_panos) as x(p)
        on conflict (user_id, pano_no) do nothing;
      end if;
      v_pack_ids := v_pack_ids || to_jsonb(v_pack::text);
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'id', v_pack, 'pack_no', v_packno, 'source', p_source, 'theme', case when p_source = 'daily' then 'daily' when p_source = 'focus' then 'focus' else v_theme end,
        'group', v_group, 'golden', v_golden, 'guarantee', v_pity, 'cards', v_cards_out, 'new_count', v_newn, 'panoramas', to_jsonb(v_panos)));
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

  drop function public.cards_dup_pick(uuid, integer, text, text, text, integer[], boolean);
  drop function public.cards_dup_bias();

  -- Checks: cards_open is the body of 125 again and the two functions are gone.
  if position('cards_dup_pick' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)'))) > 0 or position('values (p_user, 5, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)'))) = 0 then
    raise exception '126-dup-bias.rollback: cards_open was not restored, nothing changed';
  end if;
  if exists (select 1 from pg_proc pr where pr.pronamespace = 'public'::regnamespace and pr.proname in ('cards_dup_bias', 'cards_dup_pick')) then
    raise exception '126-dup-bias.rollback: a function is still there, nothing changed';
  end if;
  raise notice '126-dup-bias.rollback: cards_open is the body of 125 again';
  end;
  notify pgrst, 'reload schema';
end $c126r$;
