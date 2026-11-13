-- 104-economy.sql (Bunnyverse Cards lots 3 and 4, lane ECON, 2026-11-13; the Gold guarantee, the timer cap, crafting, the wishlist, the focus pack, the ad shards, the moment)
--
-- What:   adds the database side of the economy rules, in ONE DO block:
--           tables   cards_crafts      the ledger of crafts (who crafted which card, for how many shards, when)
--                    cards_wishlist    the cards a player wants (at most 50 each)
--           columns  cards_wallets.timer_today   refills the timer added since Paris midnight (the midnight top-up is not counted)
--                    cards_packs.focus           the group (cards_entities.id) a focus pack was opened for, null for every other pack
--                    cards_packs.new_count       the cards new to the player in that pack (filled for new packs only, never backfilled)
--                    cards_owned.first_pack_no   the player's pack count when the card first came, that pack included (new pulls and crafts only)
--                    cards_owned.first_source    'pack', 'craft' or 'demo' (new pulls, crafts and demo claims only, never backfilled)
--           new functions
--                    cards_pity_count(user)               packs in a row, newest first, with no Gold and no Full Art card (0 to 30)
--                    cards_pity_pool()                    true while a Gold card is in packs (the guarantee needs one)
--                    cards_focus_used(user, now)          true when a focus pack was opened on the Paris day of now
--                    cards_craft(user, card_no, now)      spends the shards of the card's rarity and stores the card, one transaction
--                    cards_wish(user, card_no, on, now)   adds or removes a card of the wishlist
--                    cards_ad_grant(user, ticket, now, ads_limit, shards, timer_cap)   spends a ticket, counts the ad, gives shards
--                    cards_recent_packs(user, limit)      the last packs: opened_at, best rarity, source, new_count
--           replaced functions (the old signature is dropped and the new one created in the same block: exactly one of each name exists)
--                    cards_roll(..., timer, timer_cap)    the refill, now with the day's timer count and its cap (returns timer_today)
--                    cards_wallet(user, now, ads_limit, bonus_cap, timer_cap)   adds timer_used, timer_cap, timer_left, pity_left, focus_used
--                    cards_apply_pack(user, source, cards, ticket, now, ads_limit, bonus_cap, timer_cap, focus)   adds the Gold guarantee
--                      (raise 'cards: pity'), the focus pack (raise 'cards: focus', 'cards: focus_used'), the pair mark (completesPair), the
--                      moment columns, the wishlist cleanup; refuses a new 'ad' pack (raise 'cards: source')
-- Why:    the owner's rules of lots 3 and 4: a Gold card at the latest in the 30th pack without a Gold or a Full Art; at most 40 packs a Paris
--         day from the timer (CARDS_TIMER_PER_DAY overrides it on the server); a missing card can be crafted with shards (never a Full Art); a
--         wishlist and, once a Paris day, a focus pack whose cards 2 and 4 come from a group the player picks; a rewarded ad gives 25 shards
--         (CARDS_AD_SHARDS) and not a pack; the moment screen needs the pack number of a card and the new cards of a pack. The draw stays in
--         TypeScript (lib/cards/rules.ts); the database refuses a pack that breaks a promise, so no server bug can break it.
-- Rows:   0 rows. 2 tables, 5 columns, 7 new functions, 3 functions replaced (cards_issue_ticket is untouched). Additive: no existing table is
--         dropped, no row is changed. No XP, level, streak or badge is read or written.
-- Needs:  001 and 002 (and 003 for the grants of the older tables), and 102 for cards_catalog.part (the pair mark). Not 103.
-- Notes:  the Gold count looks at the last 30 packs of the player, any source, newest first: a pack that holds a Gold or a Full Art card ends
--         the count. From 29 packs without one, the next pack must have a Gold card as its 5th card, only while the pool has a Gold card
--         (cards_pity_pool). The timer cap counts the refills of the Paris day in the wallet row (timer_today), computed by cards_roll: a
--         refill adds a pack only while fewer than the cap were added since Paris midnight; at the cap the stack adds nothing until
--         midnight, and a pack already in the stack always opens (no refusal at opening). The midnight top-up does not count. A craft costs
--         Standard 10, Stage 20, Holo 50, Era 120, Gold 300 (CRAFT_COST in rules.ts) and a Full Art cannot be crafted. A focus pack is a pack
--         of source 'stock' (a pack of the stack), once a Paris day, and card 2 and card 4 come from the group (its own cards and those of its
--         idols) unless the group has no card of their rarity. The pair mark: a new card whose other half (same subject, same rarity, the other
--         part) the player already owns, in an earlier pack or earlier in this pack. An ad pack can no longer be opened: cards_ad_grant gives
--         shards (the value 'ad' stays allowed in cards_packs.source for the history).
-- Errors: a refusal is an exception whose message starts with 'cards: ' and one word. New words: pity, focus, focus_used, owned, card,
--         no_craft, wish_limit (and the older shards, pack, source, ticket, ad_limit, empty, bonus).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_pity_count', 'cards_pity_pool', 'cards_focus_used', 'cards_craft', 'cards_wish', 'cards_ad_grant', 'cards_recent_packs');   expect 7
-- Verify: select proname, count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_roll', 'cards_wallet', 'cards_apply_pack') group by proname order by proname;   expect cards_apply_pack 1, cards_roll 1, cards_wallet 1
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_%';   expect f
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_crafts', 'cards_wishlist') and rowsecurity;   expect 2
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_crafts', 'cards_wishlist') and grantee in ('anon', 'authenticated');   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and ((table_name = 'cards_wallets' and column_name = 'timer_today') or (table_name = 'cards_packs' and column_name in ('focus', 'new_count')) or (table_name = 'cards_owned' and column_name in ('first_pack_no', 'first_source')));   expect 5
-- Verify: select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'timer_left';   expect 40
-- Verify: select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'pity_left';   expect 30 once a Gold card is in packs (empty before)
-- Verify: select count(*) from public.cards_owned where first_pack_no is not null or first_source is not null;   expect 0 right after the first run (nothing is backfilled)
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
  if to_regprocedure('public.cards_bonus_plays(uuid, date)') is null
     or (to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz)') is null
         and to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer)') is null) then
    raise exception '104-economy: run 002-functions.sql first';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_catalog' and column_name = 'part') then
    raise exception '104-economy: run 102-catalog-rebuild.sql first (cards_catalog.part)';
  end if;

  -- The ledger of crafts. No foreign key on the card: a catalog rebuild must not erase what a player spent.
  create table if not exists public.cards_crafts (
    id bigint generated always as identity constraint cards_crafts_pkey primary key,
    user_id uuid not null constraint cards_crafts_user_id_fkey references auth.users(id) on delete cascade,
    card_no integer not null,
    rarity text not null constraint cards_crafts_rarity_check check (rarity in ('C', 'U', 'R', 'SR', 'UR')),
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

  -- The day's timer refills, on the wallet row (reset by cards_roll at Paris midnight).
  alter table public.cards_wallets add column if not exists timer_today integer not null default 0;
  if not exists (select 1 from pg_constraint where conname = 'cards_wallets_timer_today_check' and conrelid = 'public.cards_wallets'::regclass) then
    alter table public.cards_wallets add constraint cards_wallets_timer_today_check check (timer_today >= 0);
  end if;

  alter table public.cards_packs add column if not exists focus text;
  if not exists (select 1 from pg_constraint where conname = 'cards_packs_focus_fkey' and conrelid = 'public.cards_packs'::regclass) then
    alter table public.cards_packs add constraint cards_packs_focus_fkey foreign key (focus) references public.cards_entities(id) on delete set null;
  end if;
  create index if not exists cards_packs_focus_idx on public.cards_packs (user_id, opened_at desc) where focus is not null;

  -- The moment: the cards new to the player in a pack, and the pack number / source of the first copy of a card. Null on every older row.
  alter table public.cards_packs add column if not exists new_count integer;
  if not exists (select 1 from pg_constraint where conname = 'cards_packs_new_count_check' and conrelid = 'public.cards_packs'::regclass) then
    alter table public.cards_packs add constraint cards_packs_new_count_check check (new_count is null or new_count between 0 and 5);
  end if;
  alter table public.cards_owned add column if not exists first_pack_no integer;
  alter table public.cards_owned add column if not exists first_source text;
  if not exists (select 1 from pg_constraint where conname = 'cards_owned_first_pack_no_check' and conrelid = 'public.cards_owned'::regclass) then
    alter table public.cards_owned add constraint cards_owned_first_pack_no_check check (first_pack_no is null or first_pack_no >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cards_owned_first_source_check' and conrelid = 'public.cards_owned'::regclass) then
    alter table public.cards_owned add constraint cards_owned_first_source_check check (first_source is null or first_source in ('pack', 'craft', 'demo'));
  end if;

  -- The refill and the Paris midnight on a row, as jsonb {stock, anchor, paris_day, ads_today, bonus_today, timer_today}. Not exposed.
  -- Lot 3 A13: a refill adds a pack only while fewer than p_timer_cap were added since Paris midnight; at the cap the stack adds nothing (its
  -- anchor stays where it is) until midnight. The midnight top-up to 5 is not a refill and is not counted.
  drop function if exists public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz);
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

  -- Packs in a row, newest first, that held no Gold and no Full Art card; at most 30 packs are read. Any source counts.
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

  -- The guarantee needs a Gold card to give: one in packs whose entity is active.
  create or replace function public.cards_pity_pool()
    returns boolean
    language sql stable security definer set search_path = public
    as $f$
      select exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id where c.rarity = 'UR' and c.in_packs and e.active)
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

  -- The wallet, read only. Same keys as 002, plus timer_used (refills since Paris midnight), timer_cap, timer_left, pity_left (packs left up
  -- to and including the one with the guaranteed Gold card, null while no Gold card is in packs) and focus_used. next_at is null once the
  -- day's timer refills are all used (the stack adds nothing until midnight).
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

  -- The pack. As 002, plus: the timer fields of the wallet, the Gold guarantee (any source), the focus pack, the pair mark, the moment
  -- columns and the wishlist cleanup. An 'ad' pack is refused (the rewarded ad gives shards, cards_ad_grant). p_ticket is kept in the
  -- signature for the callers of 002 and ignored.
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

  -- Lot 4 B4: the rewarded ad. A ticket issued before the ad (cards_issue_ticket) is spent once, between 10 seconds and 1 hour after it was
  -- issued (a ticket refused for its age is not spent, the call rolls back), the day's ads are counted (p_ads_limit, default 10) and
  -- p_shards shards are added. Google's rewarded event itself cannot be checked on the server: the route calls this only after it.
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

  -- Lot 3 A14: craft a missing card with shards. The card must be in packs with an active entity, the player must not own it, and a Full Art
  -- cannot be crafted. The cost is the rarity's (CRAFT_COST in rules.ts: C 10, U 20, R 50, SR 120, UR 300). Wallet locked like cards_apply_pack.
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

  -- Lot 3 A17: add a missing card to the wishlist or remove one. At most 50 cards; an owned card cannot be added; removing is always allowed.
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

  -- Lot 4 B3: the last packs of a player, newest first: when, the best rarity of the five cards, the source and the new cards. The rows that
  -- came before 104 have no new_count (null).
  create or replace function public.cards_recent_packs(p_user uuid, p_limit integer default 10)
    returns jsonb
    language sql stable security definer set search_path = public
    as $f$
      select coalesce(jsonb_agg(jsonb_build_object('opened_at', x.opened_at, 'best', x.best, 'source', x.source, 'new_count', x.new_count)
                                order by x.opened_at desc, x.id desc), '[]'::jsonb)
        from (
          select p.id, p.opened_at, p.source, p.new_count,
                 (select c.rarity from public.cards_catalog c where c.card_no = any (p.cards)
                   order by array_position(array['C', 'U', 'R', 'SR', 'UR', 'L'], c.rarity) desc limit 1) as best
            from public.cards_packs p where p.user_id = p_user order by p.opened_at desc, p.id desc limit greatest(1, least(coalesce(p_limit, 10), 50))
        ) x
    $f$;

  revoke all on function public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_pity_count(uuid) from public, anon, authenticated;
  revoke all on function public.cards_pity_pool() from public, anon, authenticated;
  revoke all on function public.cards_focus_used(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_wallet(uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) from public, anon, authenticated;
  revoke all on function public.cards_ad_grant(uuid, uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_craft(uuid, integer, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_wish(uuid, integer, boolean, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_recent_packs(uuid, integer) from public, anon, authenticated;
  grant execute on function public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer) to service_role;
  grant execute on function public.cards_pity_count(uuid) to service_role;
  grant execute on function public.cards_pity_pool() to service_role;
  grant execute on function public.cards_focus_used(uuid, timestamptz) to service_role;
  grant execute on function public.cards_wallet(uuid, timestamptz, integer, integer, integer) to service_role;
  grant execute on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) to service_role;
  grant execute on function public.cards_ad_grant(uuid, uuid, timestamptz, integer, integer, integer) to service_role;
  grant execute on function public.cards_craft(uuid, integer, timestamptz) to service_role;
  grant execute on function public.cards_wish(uuid, integer, boolean, timestamptz) to service_role;
  grant execute on function public.cards_recent_packs(uuid, integer) to service_role;

  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_wallet') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_apply_pack') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_roll') <> 1 then
    raise exception '104-economy: cards_roll, cards_wallet and cards_apply_pack must each exist once';
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
