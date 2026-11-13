-- 110-core.rollback.sql (KpopCards lots 3 + 4 + 5): undo of 110-core.sql.
--
-- What:   puts the functions of 104 back (cards_roll with 8 arguments and the cap 5, cards_pity_count, cards_wallet, cards_apply_pack, cards_ad_grant,
--         cards_craft), drops the 10 functions 110 added and the table cards_group_types, drops the columns 110 added (packs_opened, seen_at, created_at
--         on cards_wallets; seq, theme, golden, guarantee, batch on cards_packs; locked, seen on cards_owned) and restores cards_packs_source_check.
-- Why:    without 110 the stack is back to 5 and there are no themes, no golden pack and no Open 5; the routes then fail, so switch NET_CARDS off
--         or deploy the code from before first.
-- Rows:   the columns hold derived data only (the pack count, the pack number, the flags), except locked: refused while a card is locked, while a
--         pack of source 'daily' or an Open 5 batch is recorded, while cards_group_types holds rows, or while a stack holds more than 5 packs.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_theme_of', 'cards_in_pool', 'cards_pool_has', 'cards_daily_group', 'cards_open', 'cards_recycle', 'cards_lock', 'cards_seen', 'cards_still_there', 'cards_player');   expect 0
-- Verify: select proname, count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_roll', 'cards_wallet', 'cards_apply_pack', 'cards_craft', 'cards_ad_grant') group by proname order by proname;   expect each 1
-- Undo:   run 110-core.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c110r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)') is null then
    return;
  end if;
  if exists (select 1 from public.cards_owned where locked) then
    raise exception '110-core rollback: refused, a card is locked';
  end if;
  if exists (select 1 from public.cards_packs where source = 'daily' or batch is not null) then
    raise exception '110-core rollback: refused, a daily pack or an Open 5 batch is recorded';
  end if;
  if exists (select 1 from public.cards_group_types) then
    raise exception '110-core rollback: refused, cards_group_types holds rows (undo 111 first)';
  end if;
  if exists (select 1 from public.cards_wallets where stock > 5) then
    raise exception '110-core rollback: refused, a stack holds more than 5 packs';
  end if;

  drop function if exists public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer);
  drop function if exists public.cards_recycle(uuid, text, integer, timestamptz, integer);
  drop function if exists public.cards_lock(uuid, integer, boolean, timestamptz);
  drop function if exists public.cards_seen(uuid, integer[]);
  drop function if exists public.cards_still_there(uuid, timestamptz, integer);
  drop function if exists public.cards_player(uuid, timestamptz, integer);
  drop function if exists public.cards_craft(uuid, text, integer, timestamptz, integer);
  drop function if exists public.cards_ad_grant(uuid, text, uuid, timestamptz, integer, integer, integer);
  drop function if exists public.cards_wallet(uuid, timestamptz, integer, integer, integer);
  drop function if exists public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz);
  drop function if exists public.cards_daily_group(date);
  drop function if exists public.cards_pool_has(text, text, text[]);
  drop function if exists public.cards_in_pool(integer, text, text);
  drop function if exists public.cards_theme_of(text);
  drop table if exists public.cards_group_types;

  -- 002's cards_recycle and 104's functions back, as they were.
  create or replace function public.cards_recycle(p_user uuid, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_n bigint;
    v_sh bigint;
  begin
    select * into w from public.cards_wallets where user_id = p_user for update;
    if not found then
      return jsonb_build_object('recycled', 0, 'shards_gained', 0, 'shards', 0);
    end if;
    -- Review 1 finding 16: only the cards of the catalog (in packs, entity active), the cards the binder shows and counts in its "Recycle N
    -- extras (+S shards)" button, so the estimate is exactly what is recycled. A card retired with its photo keeps its copies.
    select coalesce(sum(o.copies - 1), 0), coalesce(sum((o.copies - 1) * case c.rarity
             when 'C' then 1 when 'U' then 2 when 'R' then 5 when 'SR' then 12 when 'UR' then 30 else 80 end), 0)
      into v_n, v_sh
      from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no join public.cards_entities e on e.id = c.entity_id
     where o.user_id = p_user and o.copies > 1 and c.in_packs and e.active;
    if v_n > 0 then
      update public.cards_owned o set copies = 1
        from public.cards_catalog c, public.cards_entities e
       where o.user_id = p_user and o.copies > 1 and c.card_no = o.card_no and e.id = c.entity_id and c.in_packs and e.active;
      update public.cards_wallets set shards = shards + v_sh, version = version + 1, updated_at = p_now where user_id = p_user;
    end if;
    return jsonb_build_object('recycled', v_n, 'shards_gained', v_sh, 'shards', w.shards + v_sh);
  end
  $f$;

  create or replace function public.cards_roll(
      p_stock integer, p_anchor timestamptz, p_day date, p_ads integer, p_bonus integer, p_now timestamptz,
      p_timer integer default 0, p_timer_cap integer default 40)
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
    k bigint;
    g integer;
    v_room integer;
  begin
    if p_day is distinct from v_today then
      v_ads := 0;
      v_bonus := 0;
      v_timer := 0;
      if v_stock < 5 then
        v_stock := 5;
        v_anchor := p_now;
      end if;
    end if;
    if v_stock >= 5 then
      v_anchor := p_now;
    else
      k := floor(extract(epoch from (p_now - v_anchor)) / 600);
      v_room := greatest(0, p_timer_cap - v_timer);
      if k > 0 and v_room > 0 then
        g := least(k, 5 - v_stock, v_room);
        v_stock := v_stock + g;
        v_timer := v_timer + g;
        if v_stock >= 5 then
          v_anchor := p_now;
        elsif g = v_room then
          v_anchor := v_anchor + make_interval(secs => (g * 600)::double precision);
        else
          v_anchor := v_anchor + make_interval(secs => (k * 600)::double precision);
        end if;
      end if;
    end if;
    return jsonb_build_object('stock', v_stock, 'anchor', v_anchor, 'paris_day', v_today, 'ads_today', v_ads, 'bonus_today', v_bonus, 'timer_today', v_timer);
  end
  $f$;

  create or replace function public.cards_pity_count(p_user uuid)
    returns integer
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    r record;
    n integer := 0;
  begin
    for r in select p.cards from public.cards_packs p where p.user_id = p_user order by p.opened_at desc, p.id desc limit 30 loop
      exit when exists (select 1 from public.cards_catalog c where c.card_no = any (r.cards) and c.rarity in ('UR', 'L'));
      n := n + 1;
    end loop;
    return n;
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
  begin
    select * into w from public.cards_wallets where user_id = p_user;
    if not found then
      w.stock := 5; w.anchor := p_now; w.paris_day := v_today; w.ads_today := 0; w.bonus_today := 0; w.shards := 0; w.timer_today := 0;
    end if;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap);
    v_stock := (r ->> 'stock')::integer;
    v_anchor := (r ->> 'anchor')::timestamptz;
    v_timer := (r ->> 'timer_today')::integer;
    v_bonus_seen := case when p_bonus_cap <= 0 then 0 else public.cards_bonus_plays(p_user, v_today) end;
    return jsonb_build_object(
      'stock', v_stock,
      'anchor', v_anchor,
      'paris_day', v_today,
      'ads_today', (r ->> 'ads_today')::integer,
      'bonus_today', (r ->> 'bonus_today')::integer,
      'shards', w.shards,
      'ads_left', greatest(0, p_ads_limit - (r ->> 'ads_today')::integer),
      'bonus_left', greatest(0, least(p_bonus_cap, v_bonus_seen) - (r ->> 'bonus_today')::integer),
      'next_at', case when v_stock >= 5 or v_timer >= p_timer_cap then null else v_anchor + interval '600 seconds' end,
      'midnight_at', ((v_today + 1)::timestamp at time zone 'Europe/Paris'),
      'timer_used', v_timer,
      'timer_cap', p_timer_cap,
      'timer_left', greatest(0, p_timer_cap - v_timer),
      'pity_left', case when public.cards_pity_pool() then greatest(1, 30 - public.cards_pity_count(p_user)) else null end,
      'focus_used', public.cards_focus_used(p_user, p_now));
  end
  $f$;

  create or replace function public.cards_apply_pack(
      p_user uuid, p_source text, p_cards integer[], p_ticket uuid default null, p_now timestamptz default now(),
      p_ads_limit integer default 10, p_bonus_cap integer default 3, p_timer_cap integer default 40, p_focus text default null)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_stock integer;
    v_anchor timestamptz;
    v_ads integer;
    v_bonus integer;
    v_timer integer;
    v_shards integer;
    v_ok integer;
    v_want integer;
    v_fifth text;
    v_card integer;
    v_new boolean;
    v_pair boolean;
    v_part smallint;
    v_c record;
    v_out jsonb := '[]'::jsonb;
    v_seen integer[] := '{}';
    v_pack uuid;
    v_packno integer;
    v_newn integer := 0;
    v_i integer;
    v_rarity text;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_source is null or p_source not in ('stock', 'shards', 'bonus') then raise exception 'cards: source'; end if;
    if p_cards is null or cardinality(p_cards) <> 5 or array_position(p_cards, null) is not null then raise exception 'cards: pack'; end if;

    select count(distinct c.card_no) into v_ok
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = any (p_cards) and c.in_packs and e.active;
    select count(distinct x) into v_want from unnest(p_cards) as x;
    if v_ok <> v_want then raise exception 'cards: pack'; end if;
    select rarity into v_fifth from public.cards_catalog where card_no = p_cards[5];
    if v_fifth = 'C' then raise exception 'cards: pack'; end if;

    if p_focus is not null and p_source <> 'stock' then raise exception 'cards: focus'; end if;

    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap);
    v_stock := (r ->> 'stock')::integer;
    v_anchor := (r ->> 'anchor')::timestamptz;
    v_ads := (r ->> 'ads_today')::integer;
    v_bonus := (r ->> 'bonus_today')::integer;
    v_timer := (r ->> 'timer_today')::integer;
    v_shards := w.shards;

    if p_source = 'stock' then
      -- A pack in the stack always opens, whatever the day's timer count (A13: the cap only stops the stack from refilling).
      if v_stock < 1 then raise exception 'cards: empty'; end if;
      v_stock := v_stock - 1;
    elsif p_source = 'shards' then
      if v_shards < 50 then raise exception 'cards: shards'; end if;
      v_shards := v_shards - 50;
    else
      if p_bonus_cap <= 0 or v_bonus >= least(p_bonus_cap, public.cards_bonus_plays(p_user, v_today)) then raise exception 'cards: bonus'; end if;
      v_bonus := v_bonus + 1;
    end if;

    -- A11 (PITY_UR 30 in rules.ts): after 29 packs in a row with no Gold and no Full Art, the 5th card of the 30th pack must be Gold, only
    -- while a Gold card is in packs. Any source counts. The refusal rolls the whole call back.
    if public.cards_pity_count(p_user) >= 29 and public.cards_pity_pool() and v_fifth is distinct from 'UR' then
      raise exception 'cards: pity';
    end if;

    -- A17: a focus pack is a pack of the stack, once a Paris day, for a group; cards 2 and 4 come from the group's cards (its own and those
    -- of its idols) unless the group has no card of their rarity.
    if p_focus is not null then
      if not exists (select 1 from public.cards_entities where id = p_focus and kind = 'group' and active) then raise exception 'cards: focus'; end if;
      if public.cards_focus_used(p_user, p_now) then raise exception 'cards: focus_used'; end if;
      foreach v_i in array array[2, 4] loop
        select c.rarity into v_rarity from public.cards_catalog c where c.card_no = p_cards[v_i];
        if not exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                        where c.card_no = p_cards[v_i] and (c.entity_id = p_focus or e.group_id = p_focus))
           and exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                        where c.rarity = v_rarity and c.in_packs and e.active and (c.entity_id = p_focus or e.group_id = p_focus)) then
          raise exception 'cards: pack';
        end if;
      end loop;
    end if;

    select count(*) + 1 into v_packno from public.cards_packs where user_id = p_user;

    foreach v_card in array p_cards loop
      v_new := not (v_card = any (v_seen)) and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
      v_seen := v_seen || v_card;
      -- A12: a new card whose other half (same subject, same rarity, the other part) is already owned completes the pair. The cards of this
      -- pack stored before this one count, because they are in cards_owned by now.
      v_pair := false;
      if v_new then
        v_newn := v_newn + 1;
        select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
        v_part := v_c.part;
        if v_part in (1, 2) then
          v_pair := exists (select 1 from public.cards_catalog h join public.cards_owned o on o.card_no = h.card_no and o.user_id = p_user
                             where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part = 3 - v_part);
        end if;
      end if;
      insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source)
      values (p_user, v_card, 1, p_now, p_now, v_packno, 'pack')
      on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
      v_out := v_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new, 'completesPair', v_pair));
    end loop;
    delete from public.cards_wishlist where user_id = p_user and card_no = any (p_cards);

    insert into public.cards_packs (user_id, source, cards, opened_at, focus, new_count)
    values (p_user, p_source, p_cards, p_now, p_focus, v_newn) returning id into v_pack;

    update public.cards_wallets
       set stock = v_stock, anchor = v_anchor, paris_day = v_today, ads_today = v_ads, bonus_today = v_bonus, timer_today = v_timer,
           shards = v_shards, version = version + 1, updated_at = p_now
     where user_id = p_user;

    return jsonb_build_object('id', v_pack, 'source', p_source, 'cards', v_out, 'new_count', v_newn, 'pack_no', v_packno);
  end
  $f$;

  create or replace function public.cards_ad_grant(
      p_user uuid, p_ticket uuid, p_now timestamptz default now(), p_ads_limit integer default 10, p_shards integer default 25, p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_ads integer;
    v_t uuid;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_shards is null or p_shards < 1 or p_shards > 1000 then raise exception 'cards: source'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap);
    v_ads := (r ->> 'ads_today')::integer;
    if v_ads >= p_ads_limit then raise exception 'cards: ad_limit'; end if;
    update public.cards_ad_tickets set used_at = p_now
     where id = p_ticket and user_id = p_user and used_at is null
       and issued_at <= p_now - interval '10 seconds' and issued_at >= p_now - interval '1 hour'
    returning id into v_t;
    if v_t is null then raise exception 'cards: ticket'; end if;
    update public.cards_wallets
       set stock = (r ->> 'stock')::integer, anchor = (r ->> 'anchor')::timestamptz, paris_day = v_today, ads_today = v_ads + 1,
           bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           shards = shards + p_shards, version = version + 1, updated_at = p_now
     where user_id = p_user;
    return jsonb_build_object('gained', p_shards, 'shards', w.shards + p_shards, 'ads_today', v_ads + 1);
  end
  $f$;

  create or replace function public.cards_craft(p_user uuid, p_card_no integer, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_rarity text;
    v_cost integer;
    v_packno integer;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    select c.rarity into v_rarity
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = p_card_no and c.in_packs and e.active;
    if v_rarity is null then raise exception 'cards: card'; end if;
    if v_rarity = 'L' then raise exception 'cards: no_craft'; end if;
    v_cost := case v_rarity when 'C' then 10 when 'U' then 20 when 'R' then 50 when 'SR' then 120 else 300 end;

    select * into w from public.cards_wallets where user_id = p_user for update;
    if not found then raise exception 'cards: shards'; end if;
    if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = p_card_no) then raise exception 'cards: owned'; end if;
    if w.shards < v_cost then raise exception 'cards: shards'; end if;

    select count(*) into v_packno from public.cards_packs where user_id = p_user;
    update public.cards_wallets set shards = shards - v_cost, version = version + 1, updated_at = p_now where user_id = p_user;
    insert into public.cards_owned (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source)
    values (p_user, p_card_no, 1, p_now, p_now, v_packno, 'craft');
    insert into public.cards_crafts (user_id, card_no, rarity, cost, crafted_at) values (p_user, p_card_no, v_rarity, v_cost, p_now);
    delete from public.cards_wishlist where user_id = p_user and card_no = p_card_no;
    return jsonb_build_object('card_no', p_card_no, 'rarity', v_rarity, 'cost', v_cost, 'shards', w.shards - v_cost);
  end
  $f$;

  revoke all on function public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_pity_count(uuid) from public, anon, authenticated;
  revoke all on function public.cards_wallet(uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) from public, anon, authenticated;
  revoke all on function public.cards_ad_grant(uuid, uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_craft(uuid, integer, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer) to service_role;
  grant execute on function public.cards_pity_count(uuid) to service_role;
  grant execute on function public.cards_wallet(uuid, timestamptz, integer, integer, integer) to service_role;
  grant execute on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) to service_role;
  grant execute on function public.cards_ad_grant(uuid, uuid, timestamptz, integer, integer, integer) to service_role;
  grant execute on function public.cards_craft(uuid, integer, timestamptz) to service_role;

  alter table public.cards_packs drop constraint if exists cards_packs_theme_check;
  if exists (select 1 from pg_constraint where conname = 'cards_packs_source_check' and conrelid = 'public.cards_packs'::regclass and pg_get_constraintdef(oid) like '%daily%') then
    alter table public.cards_packs drop constraint cards_packs_source_check;
    alter table public.cards_packs add constraint cards_packs_source_check check (source in ('stock', 'ad', 'shards', 'bonus'));
  end if;
  drop index if exists public.cards_packs_seq_idx;
  alter table public.cards_packs drop column if exists seq;
  alter table public.cards_packs drop column if exists theme;
  alter table public.cards_packs drop column if exists golden;
  alter table public.cards_packs drop column if exists guarantee;
  alter table public.cards_packs drop column if exists batch;
  alter table public.cards_owned drop column if exists locked;
  alter table public.cards_owned drop column if exists seen;
  alter table public.cards_wallets drop constraint if exists cards_wallets_packs_opened_check;
  alter table public.cards_wallets drop column if exists packs_opened;
  alter table public.cards_wallets drop column if exists seen_at;
  alter table public.cards_wallets drop column if exists created_at;

  notify pgrst, 'reload schema';
end $c110r$;
