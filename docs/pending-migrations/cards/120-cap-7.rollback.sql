-- 120-cap-7.rollback.sql (KpopCards launch prep, 2026-11-17; the stack cap goes back from 7 packs to 10)
--
-- What:   in ONE DO block, the nine functions of 120-cap-7.sql get their bodies of 105, 110 and 118 back (the stack cap 10).
-- Why:    the undo of 120-cap-7.sql. No data is touched: a stack of 8 to 10 that 120 left alone is still what it was.
-- Rows:   0 rows changed.
-- Verify: select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'cap';   expect 10
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c120r$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_from integer := 0;
    v_to integer := 0;
  begin
  -- Prerequisites: the nine functions exist once each, with the bodies of 105, 110 and 118 (cards_open and cards_craft: the group parts of 118).
  if to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_roll is missing)'; end if;
  if to_regprocedure('public.cards_wallet(uuid, timestamptz, integer, integer, integer)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_wallet is missing)'; end if;
  if to_regprocedure('public.cards_player(uuid, timestamptz, integer)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_player is missing)'; end if;
  if to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_open is missing)'; end if;
  if to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_craft is missing)'; end if;
  if to_regprocedure('public.cards_ad_grant(uuid, text, uuid, timestamptz, integer, integer, integer)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_ad_grant is missing)'; end if;
  if to_regprocedure('public.cards_recycle(uuid, text, integer, timestamptz, integer)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_recycle is missing)'; end if;
  if to_regprocedure('public.cards_still_there(uuid, timestamptz, integer)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_still_there is missing)'; end if;
  if to_regprocedure('public.cards_claim(uuid, text, text, timestamptz, integer)') is null then raise exception '120-cap-7.rollback: run the cards files up to 118 first (cards_claim is missing)'; end if;

  -- Where the database stands: how many of the nine functions hold the cap of 7, how many already hold 10.
  if position('p_cap integer DEFAULT 7' in pg_get_function_arguments(to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)'))) > 0 then v_from := v_from + 1; end if;
  if position('''cap'', 7,' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_wallet(uuid, timestamptz, integer, integer, integer)'))) > 0 then v_from := v_from + 1; end if;
  if position('w.stock := 7;' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_player(uuid, timestamptz, integer)'))) > 0 then v_from := v_from + 1; end if;
  if position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)'))) > 0 then v_from := v_from + 1; end if;
  if position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)'))) > 0 then v_from := v_from + 1; end if;
  if position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_ad_grant(uuid, text, uuid, timestamptz, integer, integer, integer)'))) > 0 then v_from := v_from + 1; end if;
  if position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_recycle(uuid, text, integer, timestamptz, integer)'))) > 0 then v_from := v_from + 1; end if;
  if position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_still_there(uuid, timestamptz, integer)'))) > 0 then v_from := v_from + 1; end if;
  if position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_claim(uuid, text, text, timestamptz, integer)'))) > 0 then v_from := v_from + 1; end if;
  if position('p_cap integer DEFAULT 10' in pg_get_function_arguments(to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)'))) > 0 then v_to := v_to + 1; end if;
  if position('''cap'', 10,' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_wallet(uuid, timestamptz, integer, integer, integer)'))) > 0 then v_to := v_to + 1; end if;
  if position('w.stock := 10;' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_player(uuid, timestamptz, integer)'))) > 0 then v_to := v_to + 1; end if;
  if position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)'))) > 0 then v_to := v_to + 1; end if;
  if position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)'))) > 0 then v_to := v_to + 1; end if;
  if position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_ad_grant(uuid, text, uuid, timestamptz, integer, integer, integer)'))) > 0 then v_to := v_to + 1; end if;
  if position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_recycle(uuid, text, integer, timestamptz, integer)'))) > 0 then v_to := v_to + 1; end if;
  if position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_still_there(uuid, timestamptz, integer)'))) > 0 then v_to := v_to + 1; end if;
  if position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_claim(uuid, text, text, timestamptz, integer)'))) > 0 then v_to := v_to + 1; end if;
  if v_to = 9 and v_from = 0 then
    raise notice '120-cap-7.rollback: already applied, nothing changed';
    return;
  end if;
  if v_from <> 9 or v_to <> 0 then
    raise exception '120-cap-7.rollback: the functions are not all at the cap of 7 (found % at 7, % at 10), nothing changed', v_from, v_to;
  end if;

  create or replace function public.cards_roll(
      p_stock integer, p_anchor timestamptz, p_day date, p_ads integer, p_bonus integer, p_now timestamptz,
      p_timer integer default 0, p_timer_cap integer default 40, p_cap integer default 10, p_pause_at timestamptz default null)
    returns jsonb
    language plpgsql stable set search_path = public
    as $f$
  declare
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_stock integer := p_stock;
    v_anchor timestamptz := p_anchor;
    v_ads integer := p_ads;
    v_bonus integer := p_bonus;
    v_timer integer := coalesce(p_timer, 0);
    v_clock timestamptz := case when p_pause_at is null then p_now else least(p_now, p_pause_at) end;
    v_paused boolean := false;
    k bigint;
    g integer;
    v_room integer;
  begin
    if p_day is distinct from v_today then
      v_ads := 0;
      v_bonus := 0;
      v_timer := 0;
      if v_stock < p_cap then
        v_stock := p_cap;
        v_anchor := p_now;
      end if;
    end if;
    if v_stock >= p_cap then
      v_anchor := p_now;
    else
      k := floor(extract(epoch from (v_clock - v_anchor)) / 600);
      v_room := greatest(0, p_timer_cap - v_timer);
      if k > 0 and v_room > 0 then
        g := least(k, p_cap - v_stock, v_room);
        v_stock := v_stock + g;
        v_timer := v_timer + g;
        if v_stock >= p_cap then
          v_anchor := p_now;
        elsif g = v_room then
          v_anchor := v_anchor + make_interval(secs => (g * 600)::double precision);
        else
          v_anchor := v_anchor + make_interval(secs => (k * 600)::double precision);
        end if;
      end if;
      -- Paused: the player did nothing for 2 hours, so the timer stopped at p_pause_at and waits for him (nothing is taken).
      v_paused := p_pause_at is not null and p_now > p_pause_at and v_stock < p_cap and v_timer < p_timer_cap;
    end if;
    return jsonb_build_object('stock', v_stock, 'anchor', v_anchor, 'paris_day', v_today, 'ads_today', v_ads, 'bonus_today', v_bonus, 'timer_today', v_timer, 'paused', v_paused);
  end
  $f$;

  create or replace function public.cards_wallet(
      p_user uuid, p_now timestamptz default now(), p_ads_limit integer default 10, p_bonus_cap integer default 3, p_timer_cap integer default 40)
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_stock integer;
    v_anchor timestamptz;
    v_bonus_seen integer;
    v_timer integer;
    v_paused boolean;
  begin
    select * into w from public.cards_wallets where user_id = p_user;
    if not found then
      w.stock := 10; w.anchor := p_now; w.paris_day := v_today; w.ads_today := 0; w.bonus_today := 0; w.shards := 0; w.timer_today := 0;
      w.packs_opened := 0; w.seen_at := p_now;
    end if;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 10, w.seen_at + interval '2 hours');
    v_stock := (r ->> 'stock')::integer;
    v_anchor := (r ->> 'anchor')::timestamptz;
    v_timer := (r ->> 'timer_today')::integer;
    v_paused := (r ->> 'paused')::boolean;
    v_bonus_seen := case when p_bonus_cap <= 0 then 0 else public.cards_bonus_plays(p_user, v_today) end;
    return jsonb_build_object(
      'stock', v_stock,
      'cap', 10,
      'anchor', v_anchor,
      'paris_day', v_today,
      'ads_today', (r ->> 'ads_today')::integer,
      'bonus_today', (r ->> 'bonus_today')::integer,
      'shards', w.shards,
      'ads_left', greatest(0, p_ads_limit - (r ->> 'ads_today')::integer),
      'bonus_left', greatest(0, least(p_bonus_cap, v_bonus_seen) - (r ->> 'bonus_today')::integer),
      'next_at', case when v_stock >= 10 or v_timer >= p_timer_cap or v_paused then null else v_anchor + interval '600 seconds' end,
      'midnight_at', ((v_today + 1)::timestamp at time zone 'Europe/Paris'),
      'timer_used', v_timer,
      'timer_cap', p_timer_cap,
      'timer_left', greatest(0, p_timer_cap - v_timer),
      'paused', v_paused,
      'seen_at', w.seen_at,
      'packs_opened', w.packs_opened,
      'pity_left', case when public.cards_pity_pool() then greatest(1, 30 - public.cards_pity_count(p_user)) else null end,
      'focus_used', public.cards_focus_used(p_user, p_now));
  end
  $f$;

  create or replace function public.cards_player(p_user uuid, p_now timestamptz default now(), p_timer_cap integer default 40)
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
  begin
    select * into w from public.cards_wallets where user_id = p_user;
    if not found then
      w.stock := 10; w.anchor := p_now; w.paris_day := v_today; w.ads_today := 0; w.bonus_today := 0; w.shards := 0; w.timer_today := 0;
      w.packs_opened := 0; w.seen_at := p_now; w.created_at := p_now;
    end if;
    return jsonb_build_object(
      'wallet', jsonb_build_object('stock', w.stock, 'anchor', w.anchor, 'paris_day', w.paris_day, 'ads_today', w.ads_today, 'timer_today', w.timer_today,
                                   'shards', w.shards, 'packs_opened', w.packs_opened, 'seen_at', w.seen_at, 'created_at', w.created_at),
      'owned', coalesce((select jsonb_agg(jsonb_build_object('n', o.card_no, 'copies', o.copies, 'fav', o.favorite, 'locked', o.locked, 'seen', o.seen,
                                                              'first', o.first_at, 'last', o.last_at, 'fpn', o.first_pack_no) order by o.card_no)
                           from public.cards_owned o where o.user_id = p_user), '[]'::jsonb),
      'wishlist', coalesce((select jsonb_agg(x.card_no order by x.card_no) from public.cards_wishlist x where x.user_id = p_user), '[]'::jsonb),
      'gold_count', public.cards_pity_count(p_user),
      'claimed', coalesce((select jsonb_agg(c.set_id order by c.set_id) from public.cards_sets_claimed c where c.user_id = p_user), '[]'::jsonb),
      'week', public.cards_week_progress(p_user, p_now),
      'prefs', public.cards_prefs_get(p_user),
      'recent', public.cards_recent_packs(p_user, 10),
      'bonus_earned', public.cards_bonus_plays(p_user, v_today),
      'bonus_today', case when w.paris_day = v_today then w.bonus_today else 0 end,
      'daily_used', exists (select 1 from public.cards_packs p where p.user_id = p_user and p.source = 'daily'
                             and p.opened_at >= v_today::timestamp at time zone 'Europe/Paris' and p.opened_at < (v_today + 1)::timestamp at time zone 'Europe/Paris'),
      'focus_used', public.cards_focus_used(p_user, p_now),
      'last', (select jsonb_build_object('at', p.opened_at, 'pack_no', coalesce(p.seq, 0), 'cards', p.cards)
                 from public.cards_packs p where p.user_id = p_user order by p.seq desc nulls last, p.opened_at desc, p.id desc limit 1),
      'new_in_last', (select coalesce(p.new_count, 0) from public.cards_packs p where p.user_id = p_user order by p.seq desc nulls last, p.opened_at desc, p.id desc limit 1));
  end
  $f$;

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

  create or replace function public.cards_ad_grant(
      p_user uuid, p_key text, p_ticket uuid, p_now timestamptz default now(), p_ads_limit integer default 10, p_shards integer default 25, p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_ads integer;
    v_t uuid;
    v_hit public.cards_idem%rowtype;
    v_out jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    if p_shards is null or p_shards < 1 or p_shards > 1000 then raise exception 'cards: source'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> 'ad' then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 10, w.seen_at + interval '2 hours');
    v_ads := (r ->> 'ads_today')::integer;
    if v_ads >= p_ads_limit then raise exception 'cards: ad_limit'; end if;
    update public.cards_ad_tickets set used_at = p_now
     where id = p_ticket and user_id = p_user and used_at is null
       and issued_at <= p_now - interval '10 seconds' and issued_at >= p_now - interval '1 hour'
    returning id into v_t;
    if v_t is null then raise exception 'cards: ticket'; end if;
    update public.cards_wallets
       set stock = (r ->> 'stock')::integer, anchor = case when (r ->> 'paused')::boolean then p_now else (r ->> 'anchor')::timestamptz end,
           paris_day = v_today, ads_today = v_ads + 1, bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           shards = shards + p_shards, seen_at = p_now, version = version + 1, updated_at = p_now
     where user_id = p_user;
    v_out := jsonb_build_object('replayed', false, 'gained', p_shards, 'shards', w.shards + p_shards, 'ads_today', v_ads + 1);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, 'ad', v_out, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'ad', p_key, jsonb_build_object('shards', p_shards), p_now);
    return v_out;
  end
  $f$;

  create or replace function public.cards_recycle(p_user uuid, p_key text, p_n integer default null, p_now timestamptz default now(), p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_op text := 'recycle:' || coalesce(p_n::text, 'bulk');
    v_hit public.cards_idem%rowtype;
    v_recycled integer := 0;
    v_shards integer := 0;
    v_locked integer := 0;
    v_gold integer := 0;
    v_row record;
    v_out jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;

    if p_n is not null then
      select o.copies, o.locked, c.rarity into v_row from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and o.card_no = p_n;
      if not found then raise exception 'cards: notowned'; end if;
      if v_row.locked then raise exception 'cards: locked'; end if;
      if v_row.copies < 2 then raise exception 'cards: lastcopy'; end if;
      update public.cards_owned set copies = copies - 1 where user_id = p_user and card_no = p_n;
      v_recycled := 1;
      v_shards := case v_row.rarity when 'C' then 1 when 'U' then 2 when 'R' then 5 when 'SR' then 12 when 'UR' then 30 else 80 end;
    else
      select coalesce(sum(case when c.rarity in ('UR', 'L') then o.copies - 1 else 0 end), 0)::integer,
             coalesce(sum(case when c.rarity not in ('UR', 'L') and o.locked then o.copies - 1 else 0 end), 0)::integer
        into v_gold, v_locked
        from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and o.copies > 1;
      select coalesce(sum(o.copies - 1), 0)::integer,
             coalesce(sum((o.copies - 1) * case c.rarity when 'C' then 1 when 'U' then 2 when 'R' then 5 else 12 end), 0)::integer
        into v_recycled, v_shards
        from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no
       where o.user_id = p_user and o.copies > 1 and not o.locked and c.rarity not in ('UR', 'L');
      if v_recycled < 1 then raise exception 'cards: nothing'; end if;
      update public.cards_owned o set copies = 1
        from public.cards_catalog c
       where c.card_no = o.card_no and o.user_id = p_user and o.copies > 1 and not o.locked and c.rarity not in ('UR', 'L');
    end if;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 10, w.seen_at + interval '2 hours');
    update public.cards_wallets
       set shards = shards + v_shards, stock = (r ->> 'stock')::integer, anchor = case when (r ->> 'paused')::boolean then p_now else (r ->> 'anchor')::timestamptz end,
           paris_day = v_today, ads_today = (r ->> 'ads_today')::integer, bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           seen_at = p_now, version = version + 1, updated_at = p_now
     where user_id = p_user;
    v_out := jsonb_build_object('replayed', false, 'recycled', v_recycled, 'shards', v_shards, 'shards_total', w.shards + v_shards,
                                'skipped', jsonb_build_object('locked', v_locked, 'goldAndFullArt', v_gold));
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_out, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'recycle', p_key, v_out, p_now);
    return v_out;
  end
  $f$;

  create or replace function public.cards_still_there(p_user uuid, p_now timestamptz default now(), p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 10, w.seen_at + interval '2 hours');
    update public.cards_wallets
       set stock = (r ->> 'stock')::integer, anchor = case when (r ->> 'paused')::boolean then p_now else (r ->> 'anchor')::timestamptz end,
           paris_day = v_today, ads_today = (r ->> 'ads_today')::integer, bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           seen_at = p_now, version = version + 1, updated_at = p_now
     where user_id = p_user;
    return jsonb_build_object('ok', true, 'was_paused', (r ->> 'paused')::boolean);
  end
  $f$;

  create or replace function public.cards_claim(
      p_user uuid, p_key text, p_target text, p_now timestamptz default now(), p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_op text := 'claim:' || coalesce(p_target, '');
    v_hit public.cards_idem%rowtype;
    v_wk jsonb;
    v_set record;
    v_packs integer := 0;
    v_shards integer := 0;
    v_out jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    if p_target is null or length(p_target) > 80 then raise exception 'cards: set'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;

    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;

    if p_target = 'week' then
      v_wk := public.cards_week_progress(p_user, p_now);
      if (v_wk ->> 'claimed')::boolean then raise exception 'cards: claimed'; end if;
      if not (v_wk ->> 'done')::boolean then raise exception 'cards: goal'; end if;
      insert into public.cards_week_claims (user_id, week_start, packs, shards, claimed_at)
      values (p_user, (v_wk ->> 'week_start')::date, (v_wk ->> 'reward_packs')::integer, (v_wk ->> 'reward_shards')::integer, p_now);
      v_packs := (v_wk ->> 'reward_packs')::integer;
      v_shards := (v_wk ->> 'reward_shards')::integer;
    else
      select x.* into v_set from public.cards_goals_progress(p_user, null) x where x.set_id = p_target;
      if not found then raise exception 'cards: set'; end if;
      if v_set.claimed then raise exception 'cards: claimed'; end if;
      if v_set.total < 1 or v_set.owned < v_set.total then raise exception 'cards: goal'; end if;
      insert into public.cards_sets_claimed (user_id, set_id, kind, packs, claimed_at) values (p_user, v_set.set_id, v_set.kind, v_set.packs, p_now);
      v_packs := v_set.packs;
    end if;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap);
    update public.cards_wallets
       set stock = (r ->> 'stock')::integer + v_packs, anchor = (r ->> 'anchor')::timestamptz, paris_day = v_today,
           ads_today = (r ->> 'ads_today')::integer, bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           shards = shards + v_shards, version = version + 1, updated_at = p_now
     where user_id = p_user;
    v_out := jsonb_build_object('replayed', false, 'target', p_target, 'packs', v_packs, 'shards', v_shards);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_out, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'claim', p_key, v_out, p_now);
    return v_out;
  end
  $f$;

  -- Checks: all nine now hold the new cap and none the old one; no browser role can execute any of them.
  if not (position('p_cap integer DEFAULT 10' in pg_get_function_arguments(to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)'))) > 0) or (position('p_cap integer DEFAULT 7' in pg_get_function_arguments(to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)'))) > 0) then raise exception '120-cap-7.rollback: cards_roll was not replaced, nothing changed'; end if;
  if not (position('''cap'', 10,' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_wallet(uuid, timestamptz, integer, integer, integer)'))) > 0) or (position('''cap'', 7,' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_wallet(uuid, timestamptz, integer, integer, integer)'))) > 0) then raise exception '120-cap-7.rollback: cards_wallet was not replaced, nothing changed'; end if;
  if not (position('w.stock := 10;' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_player(uuid, timestamptz, integer)'))) > 0) or (position('w.stock := 7;' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_player(uuid, timestamptz, integer)'))) > 0) then raise exception '120-cap-7.rollback: cards_player was not replaced, nothing changed'; end if;
  if not (position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)'))) > 0) or (position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)'))) > 0) then raise exception '120-cap-7.rollback: cards_open was not replaced, nothing changed'; end if;
  if not (position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)'))) > 0) or (position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)'))) > 0) then raise exception '120-cap-7.rollback: cards_craft was not replaced, nothing changed'; end if;
  if not (position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_ad_grant(uuid, text, uuid, timestamptz, integer, integer, integer)'))) > 0) or (position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_ad_grant(uuid, text, uuid, timestamptz, integer, integer, integer)'))) > 0) then raise exception '120-cap-7.rollback: cards_ad_grant was not replaced, nothing changed'; end if;
  if not (position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_recycle(uuid, text, integer, timestamptz, integer)'))) > 0) or (position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_recycle(uuid, text, integer, timestamptz, integer)'))) > 0) then raise exception '120-cap-7.rollback: cards_recycle was not replaced, nothing changed'; end if;
  if not (position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_still_there(uuid, timestamptz, integer)'))) > 0) or (position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_still_there(uuid, timestamptz, integer)'))) > 0) then raise exception '120-cap-7.rollback: cards_still_there was not replaced, nothing changed'; end if;
  if not (position('values (p_user, 10, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_claim(uuid, text, text, timestamptz, integer)'))) > 0) or (position('values (p_user, 7, p_now' in (select prosrc from pg_proc where oid = to_regprocedure('public.cards_claim(uuid, text, text, timestamptz, integer)'))) > 0) then raise exception '120-cap-7.rollback: cards_claim was not replaced, nothing changed'; end if;
  if exists (select 1 from pg_proc pr where pr.pronamespace = 'public'::regnamespace and pr.proname in ('cards_roll', 'cards_wallet', 'cards_player', 'cards_open', 'cards_craft', 'cards_ad_grant', 'cards_recycle', 'cards_still_there', 'cards_claim')
              and (has_function_privilege('anon', pr.oid, 'execute') or has_function_privilege('authenticated', pr.oid, 'execute'))) then
    raise exception '120-cap-7.rollback: a browser role can execute one of the nine functions, nothing changed';
  end if;
  raise notice '120-cap-7.rollback: the stack cap is now 10; players who hold more keep their packs';
  end;
  notify pgrst, 'reload schema';
end $c120r$;
