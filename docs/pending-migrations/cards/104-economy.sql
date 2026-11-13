-- 104-economy.sql (Bunnyverse Cards lot 3, lane ECON, 2026-11-13; the Ultra Rare guarantee, the timer cap, crafting, the wishlist, the focus pack)
--
-- What:   adds the database side of lot 3 points B10, B12, C1 and C4, in ONE DO block:
--           tables   cards_crafts      the ledger of crafts (who crafted which card, for how many shards, when)
--                    cards_wishlist    the cards a player wants (at most 50 each)
--           column   cards_packs.focus the group (cards_entities.id) a focus pack was opened for, null for every other pack
--           new functions
--                    cards_pity_count(user)          packs in a row, newest first, with no Ultra Rare and no Legendary (0 to 30)
--                    cards_pity_pool()               true while a card of the Ultra Rare rarity is in packs (the guarantee needs one)
--                    cards_timer_used(user, now)     packs from the timer (source 'stock') opened on the Paris day of now
--                    cards_focus_used(user, now)     true when a focus pack was opened on the Paris day of now
--                    cards_craft(user, card_no, now) spends the shards of the card's rarity and stores the card, one transaction
--                    cards_wish(user, card_no, on, now)   adds or removes a card of the wishlist
--           replaced functions (the old signature is dropped and the new one created in the same block, so exactly one of each name exists)
--                    cards_wallet(user, now, ads_limit, bonus_cap, timer_cap)    adds timer_used, timer_left, pity_left, focus_used
--                    cards_apply_pack(user, source, cards, ticket, now, ads_limit, bonus_cap, timer_cap, focus)   adds the timer cap
--                      (raise 'cards: timer_cap'), the Ultra Rare guarantee (raise 'cards: pity') and the focus pack (raise 'cards: focus',
--                      'cards: focus_used'), and removes the cards a pack gives from the wishlist
-- Why:    the owner's rules of lot 3: B10 "an Ultra Rare at the latest in the 30th pack without one"; B12 at most 40 packs a Paris day from
--         the timer (CARDS_TIMER_PER_DAY overrides it on the server); C1 a missing card can be crafted with shards; C4 a wishlist and, once a
--         Paris day, a focus pack whose cards 1 and 2 come from a group the player picks. The draw stays in TypeScript (lib/cards/rules.ts);
--         the database refuses a pack that breaks a promise, so no server bug can break it.
-- Rows:   0 rows. 2 tables, 1 column, 6 new functions, 2 functions replaced. Additive: no existing table is dropped, no row is changed.
--         No XP, level, streak or badge is read or written.
-- Needs:  001 and 002 (and 003 for the grants of the older tables). 102 is not needed (the halves are not read here).
-- Notes:  the Ultra Rare count looks at the last 30 packs of the player, any source, newest first: a pack that holds an Ultra Rare or a
--         Legendary card ends the count. From 29 packs without one, the next pack must hold one, only while the pool has an Ultra Rare
--         card (cards_pity_pool). The constants below are the SQL twins of lib/cards/rules.ts and are pinned by tests: PITY_UR 30,
--         CRAFT_COST (C 10, U 20, R 50, SR 120, UR 300, L 800), the wishlist limit 50. A craft needs a card in packs whose entity is active.
--         The timer count reads the packs of the Paris day, so a Paris midnight restarts it without a job. Ads, bonus and shard packs
--         are not counted. A focus pack is a pack of source 'stock' (it counts toward the timer cap) and happens once a Paris day.
-- Errors: a refusal is an exception whose message starts with 'cards: ' and one word. New words: timer_cap, pity, focus, focus_used,
--         owned, card, wish_limit (and the older shards, pack).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_pity_count', 'cards_pity_pool', 'cards_timer_used', 'cards_focus_used', 'cards_craft', 'cards_wish');   expect 6
-- Verify: select proname, count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_wallet', 'cards_apply_pack') group by proname order by proname;   expect cards_apply_pack 1, cards_wallet 1
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_%';   expect f
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_crafts', 'cards_wishlist') and rowsecurity;   expect 2
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_crafts', 'cards_wishlist') and grantee in ('anon', 'authenticated');   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_packs' and column_name = 'focus';   expect 1
-- Verify: select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'timer_left';   expect 40
-- Verify: select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'pity_left';   expect 30 once a Gold card is in packs (empty before)
-- Undo:   104-economy.rollback.sql (restores the functions of 002; refused while a craft is recorded)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c104$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_wallets') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_packs') is null
     or to_regclass('public.cards_owned') is null or to_regclass('public.cards_entities') is null then
    raise exception '104-economy: run 001-schema.sql first';
  end if;
  if to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz)') is null
     or to_regprocedure('public.cards_bonus_plays(uuid, date)') is null then
    raise exception '104-economy: run 002-functions.sql first';
  end if;

  -- The ledger of crafts. No foreign key on the card: a catalog rebuild must not erase what a player spent.
  create table if not exists public.cards_crafts (
    id bigint generated always as identity constraint cards_crafts_pkey primary key,
    user_id uuid not null constraint cards_crafts_user_id_fkey references auth.users(id) on delete cascade,
    card_no integer not null,
    rarity text not null constraint cards_crafts_rarity_check check (rarity in ('C', 'U', 'R', 'SR', 'UR', 'L')),
    cost integer not null constraint cards_crafts_cost_check check (cost > 0),
    crafted_at timestamptz not null default now()
  );
  alter table public.cards_crafts enable row level security;
  revoke all on table public.cards_crafts from public, anon, authenticated;
  grant all on table public.cards_crafts to service_role;
  create index if not exists cards_crafts_user_idx on public.cards_crafts (user_id, crafted_at desc);

  create table if not exists public.cards_wishlist (
    user_id uuid not null constraint cards_wishlist_user_id_fkey references auth.users(id) on delete cascade,
    card_no integer not null constraint cards_wishlist_card_no_fkey references public.cards_catalog(card_no) on delete cascade,
    added_at timestamptz not null default now(),
    constraint cards_wishlist_pkey primary key (user_id, card_no)
  );
  alter table public.cards_wishlist enable row level security;
  revoke all on table public.cards_wishlist from public, anon, authenticated;
  grant all on table public.cards_wishlist to service_role;

  alter table public.cards_packs add column if not exists focus text;
  if not exists (select 1 from pg_constraint where conname = 'cards_packs_focus_fkey' and conrelid = 'public.cards_packs'::regclass) then
    alter table public.cards_packs add constraint cards_packs_focus_fkey foreign key (focus) references public.cards_entities(id) on delete set null;
  end if;
  create index if not exists cards_packs_focus_idx on public.cards_packs (user_id, opened_at desc) where focus is not null;

  -- Packs in a row, newest first, that held no Ultra Rare and no Legendary card; at most 30 packs are read. Any source counts.
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

  -- The guarantee needs an Ultra Rare card to give: one in packs whose entity is active.
  create or replace function public.cards_pity_pool()
    returns boolean
    language sql stable security definer set search_path = public
    as $f$
      select exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id where c.rarity = 'UR' and c.in_packs and e.active)
    $f$;

  -- Packs from the timer opened on the Paris day of p_now.
  create or replace function public.cards_timer_used(p_user uuid, p_now timestamptz default now())
    returns integer
    language sql stable security definer set search_path = public
    as $f$
      select count(*)::integer from public.cards_packs p
       where p.user_id = p_user and p.source = 'stock'
         and p.opened_at >= ((p_now at time zone 'Europe/Paris')::date)::timestamp at time zone 'Europe/Paris'
         and p.opened_at < ((p_now at time zone 'Europe/Paris')::date + 1)::timestamp at time zone 'Europe/Paris'
    $f$;

  -- True when a focus pack was opened on the Paris day of p_now.
  create or replace function public.cards_focus_used(p_user uuid, p_now timestamptz default now())
    returns boolean
    language sql stable security definer set search_path = public
    as $f$
      select exists (select 1 from public.cards_packs p
       where p.user_id = p_user and p.focus is not null
         and p.opened_at >= ((p_now at time zone 'Europe/Paris')::date)::timestamp at time zone 'Europe/Paris'
         and p.opened_at < ((p_now at time zone 'Europe/Paris')::date + 1)::timestamp at time zone 'Europe/Paris')
    $f$;

  -- The wallet, read only. Same keys as 002, plus timer_used, timer_left, pity_left (packs left up to and including the guaranteed one,
  -- null while no Ultra Rare card is in packs) and focus_used.
  drop function if exists public.cards_wallet(uuid, timestamptz, integer, integer);
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
      w.stock := 5; w.anchor := p_now; w.paris_day := v_today; w.ads_today := 0; w.bonus_today := 0; w.shards := 0;
    end if;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now);
    v_stock := (r ->> 'stock')::integer;
    v_anchor := (r ->> 'anchor')::timestamptz;
    v_bonus_seen := case when p_bonus_cap <= 0 then 0 else public.cards_bonus_plays(p_user, v_today) end;
    v_timer := public.cards_timer_used(p_user, p_now);
    return jsonb_build_object(
      'stock', v_stock,
      'anchor', v_anchor,
      'paris_day', v_today,
      'ads_today', (r ->> 'ads_today')::integer,
      'bonus_today', (r ->> 'bonus_today')::integer,
      'shards', w.shards,
      'ads_left', greatest(0, p_ads_limit - (r ->> 'ads_today')::integer),
      'bonus_left', greatest(0, least(p_bonus_cap, v_bonus_seen) - (r ->> 'bonus_today')::integer),
      'next_at', case when v_stock >= 5 then null else v_anchor + interval '600 seconds' end,
      'midnight_at', ((v_today + 1)::timestamp at time zone 'Europe/Paris'),
      'timer_used', v_timer,
      'timer_left', greatest(0, p_timer_cap - v_timer),
      'pity_left', case when public.cards_pity_pool() then greatest(1, 30 - public.cards_pity_count(p_user)) else null end,
      'focus_used', public.cards_focus_used(p_user, p_now));
  end
  $f$;

  -- The pack. As 002, plus: the timer cap (stock source), the Ultra Rare guarantee (any source), the focus pack, the wishlist cleanup.
  drop function if exists public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer);
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
    v_shards integer;
    v_ok integer;
    v_want integer;
    v_fifth text;
    v_t uuid;
    v_card integer;
    v_new boolean;
    v_out jsonb := '[]'::jsonb;
    v_seen integer[] := '{}';
    v_pack uuid;
    v_i integer;
    v_rarity text;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_source is null or p_source not in ('stock', 'ad', 'shards', 'bonus') then raise exception 'cards: source'; end if;
    if p_cards is null or cardinality(p_cards) <> 5 or array_position(p_cards, null) is not null then raise exception 'cards: pack'; end if;

    select count(distinct c.card_no) into v_ok
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = any (p_cards) and c.in_packs and e.active;
    select count(distinct x) into v_want from unnest(p_cards) as x;
    if v_ok <> v_want then raise exception 'cards: pack'; end if;
    select rarity into v_fifth from public.cards_catalog where card_no = p_cards[5];
    if v_fifth = 'C' then raise exception 'cards: pack'; end if;

    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now);
    v_stock := (r ->> 'stock')::integer;
    v_anchor := (r ->> 'anchor')::timestamptz;
    v_ads := (r ->> 'ads_today')::integer;
    v_bonus := (r ->> 'bonus_today')::integer;
    v_shards := w.shards;

    if p_focus is not null and p_source <> 'stock' then raise exception 'cards: focus'; end if;

    if p_source = 'stock' then
      if v_stock < 1 then raise exception 'cards: empty'; end if;
      -- Lot 3 B12: at most p_timer_cap packs from the timer a Paris day (counted under the wallet lock, so two tabs cannot both pass).
      if public.cards_timer_used(p_user, p_now) >= p_timer_cap then raise exception 'cards: timer_cap'; end if;
      v_stock := v_stock - 1;
    elsif p_source = 'ad' then
      if v_ads >= p_ads_limit then raise exception 'cards: ad_limit'; end if;
      -- Review 1 finding 9: only a ticket issued at least 10 seconds and at most 1 hour before (no rewarded ad is shorter; an older ticket
      -- is dropped). A ticket refused for its age is not spent. Google's rewarded event itself cannot be checked on the server.
      update public.cards_ad_tickets set used_at = p_now
       where id = p_ticket and user_id = p_user and used_at is null
         and issued_at <= p_now - interval '10 seconds' and issued_at >= p_now - interval '1 hour'
      returning id into v_t;
      if v_t is null then raise exception 'cards: ticket'; end if;
      v_ads := v_ads + 1;
    elsif p_source = 'shards' then
      if v_shards < 50 then raise exception 'cards: shards'; end if;
      v_shards := v_shards - 50;
    else
      if p_bonus_cap <= 0 or v_bonus >= least(p_bonus_cap, public.cards_bonus_plays(p_user, v_today)) then raise exception 'cards: bonus'; end if;
      v_bonus := v_bonus + 1;
    end if;

    -- Lot 3 B10 (PITY_UR 30 in rules.ts): after 29 packs in a row with no Ultra Rare and no Legendary, the 30th must hold one, only while an
    -- Ultra Rare card is in packs. Any source counts. The refusal rolls the whole call back (a spent ticket stays unspent).
    if public.cards_pity_count(p_user) >= 29 and public.cards_pity_pool()
       and not exists (select 1 from public.cards_catalog c where c.card_no = any (p_cards) and c.rarity in ('UR', 'L')) then
      raise exception 'cards: pity';
    end if;

    -- Lot 3 C4: a focus pack is a pack from the timer, once a Paris day, for a group; cards 1 and 2 come from the group's cards (the group's
    -- own and those of its idols) unless the group has no card of their rarity.
    if p_focus is not null then
      if not exists (select 1 from public.cards_entities where id = p_focus and kind = 'group' and active) then raise exception 'cards: focus'; end if;
      if public.cards_focus_used(p_user, p_now) then raise exception 'cards: focus_used'; end if;
      for v_i in 1..2 loop
        select c.rarity into v_rarity from public.cards_catalog c where c.card_no = p_cards[v_i];
        if not exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                        where c.card_no = p_cards[v_i] and (c.entity_id = p_focus or e.group_id = p_focus))
           and exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                        where c.rarity = v_rarity and c.in_packs and e.active and (c.entity_id = p_focus or e.group_id = p_focus)) then
          raise exception 'cards: pack';
        end if;
      end loop;
    end if;

    foreach v_card in array p_cards loop
      v_new := not (v_card = any (v_seen)) and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
      v_seen := v_seen || v_card;
      insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at)
      values (p_user, v_card, 1, p_now, p_now)
      on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
      v_out := v_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new));
    end loop;
    delete from public.cards_wishlist where user_id = p_user and card_no = any (p_cards);

    insert into public.cards_packs (user_id, source, cards, opened_at, focus) values (p_user, p_source, p_cards, p_now, p_focus) returning id into v_pack;

    update public.cards_wallets
       set stock = v_stock, anchor = v_anchor, paris_day = v_today, ads_today = v_ads, bonus_today = v_bonus,
           shards = v_shards, version = version + 1, updated_at = p_now
     where user_id = p_user;

    return jsonb_build_object('id', v_pack, 'source', p_source, 'cards', v_out);
  end
  $f$;

  -- Lot 3 C1: craft a missing card with shards. The card must be in packs with an active entity and the player must not own it. The cost
  -- is the rarity's (CRAFT_COST in rules.ts: C 10, U 20, R 50, SR 120, UR 300, L 800). Wallet locked like cards_apply_pack.
  create or replace function public.cards_craft(p_user uuid, p_card_no integer, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_rarity text;
    v_cost integer;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    select c.rarity into v_rarity
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = p_card_no and c.in_packs and e.active;
    if v_rarity is null then raise exception 'cards: card'; end if;
    v_cost := case v_rarity when 'C' then 10 when 'U' then 20 when 'R' then 50 when 'SR' then 120 when 'UR' then 300 else 800 end;

    select * into w from public.cards_wallets where user_id = p_user for update;
    if not found then raise exception 'cards: shards'; end if;
    if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = p_card_no) then raise exception 'cards: owned'; end if;
    if w.shards < v_cost then raise exception 'cards: shards'; end if;

    update public.cards_wallets set shards = shards - v_cost, version = version + 1, updated_at = p_now where user_id = p_user;
    insert into public.cards_owned (user_id, card_no, copies, first_at, last_at) values (p_user, p_card_no, 1, p_now, p_now);
    insert into public.cards_crafts (user_id, card_no, rarity, cost, crafted_at) values (p_user, p_card_no, v_rarity, v_cost, p_now);
    delete from public.cards_wishlist where user_id = p_user and card_no = p_card_no;
    return jsonb_build_object('card_no', p_card_no, 'rarity', v_rarity, 'cost', v_cost, 'shards', w.shards - v_cost);
  end
  $f$;

  -- Lot 3 C4: add a missing card to the wishlist or remove one. At most 50 cards; an owned card cannot be added; removing is always allowed.
  create or replace function public.cards_wish(p_user uuid, p_card_no integer, p_on boolean, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_n integer;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    -- The wallet row is the lock that serialises a player's writes (the 50 limit cannot be passed by two requests at once).
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    if coalesce(p_on, false) then
      if not exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id where c.card_no = p_card_no and c.in_packs and e.active) then
        raise exception 'cards: card';
      end if;
      if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = p_card_no) then raise exception 'cards: owned'; end if;
      if not exists (select 1 from public.cards_wishlist x where x.user_id = p_user and x.card_no = p_card_no) then
        select count(*) into v_n from public.cards_wishlist x where x.user_id = p_user;
        if v_n >= 50 then raise exception 'cards: wish_limit'; end if;
        insert into public.cards_wishlist (user_id, card_no, added_at) values (p_user, p_card_no, p_now);
      end if;
    else
      delete from public.cards_wishlist where user_id = p_user and card_no = p_card_no;
    end if;
    select count(*) into v_n from public.cards_wishlist x where x.user_id = p_user;
    return jsonb_build_object('on', exists (select 1 from public.cards_wishlist x where x.user_id = p_user and x.card_no = p_card_no), 'count', v_n);
  end
  $f$;

  revoke all on function public.cards_pity_count(uuid) from public, anon, authenticated;
  revoke all on function public.cards_pity_pool() from public, anon, authenticated;
  revoke all on function public.cards_timer_used(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_focus_used(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_wallet(uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) from public, anon, authenticated;
  revoke all on function public.cards_craft(uuid, integer, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_wish(uuid, integer, boolean, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_pity_count(uuid) to service_role;
  grant execute on function public.cards_pity_pool() to service_role;
  grant execute on function public.cards_timer_used(uuid, timestamptz) to service_role;
  grant execute on function public.cards_focus_used(uuid, timestamptz) to service_role;
  grant execute on function public.cards_wallet(uuid, timestamptz, integer, integer, integer) to service_role;
  grant execute on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) to service_role;
  grant execute on function public.cards_craft(uuid, integer, timestamptz) to service_role;
  grant execute on function public.cards_wish(uuid, integer, boolean, timestamptz) to service_role;

  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_wallet') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_apply_pack') <> 1 then
    raise exception '104-economy: cards_wallet and cards_apply_pack must each exist once';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename in ('cards_crafts', 'cards_wishlist') and not rowsecurity) then
    raise exception '104-economy: a new table has row level security off';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_crafts', 'cards_wishlist')
             and grantee in ('anon', 'authenticated', 'PUBLIC')) then
    raise exception '104-economy: a new table is granted to a browser role';
  end if;

  notify pgrst, 'reload schema';
end $c104$;
