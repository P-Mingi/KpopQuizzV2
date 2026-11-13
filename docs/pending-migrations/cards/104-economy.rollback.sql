-- 104-economy.rollback.sql (Bunnyverse Cards lot 3, lane ECON): undo of 104-economy.sql.
--
-- What:   restores cards_wallet and cards_apply_pack exactly as 002-functions.sql defines them (the 5 and 9 argument versions are dropped
--         first, so exactly one of each name exists), drops the 6 functions 104 added, the 2 tables cards_crafts and cards_wishlist and the
--         column cards_packs.focus.
-- Why:    without 104 the timer cap, the Ultra Rare guarantee, crafting, the wishlist and the focus pack are gone; the routes of lot 3 then answer
--         a server error, so switch NET_CARDS off or deploy the code of lot 2 first.
-- Rows:   2 tables dropped (their rows with them: the wishlists), 1 column dropped. Refused while a craft is recorded (the ledger is the only
--         record of the shards spent; the crafted cards stay in the binders). No other data is changed.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_pity_count', 'cards_pity_pool', 'cards_timer_used', 'cards_focus_used', 'cards_craft', 'cards_wish');   expect 0
-- Verify: select proname, count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_wallet', 'cards_apply_pack') group by proname order by proname;   expect cards_apply_pack 1, cards_wallet 1
-- Verify: select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'timer_left';   expect empty (the key is gone)
-- Undo:   run 104-economy.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c104r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_crafts') is not null then
    if exists (select 1 from public.cards_crafts) then
      raise exception '104-economy rollback: refused, a craft is recorded (cards_crafts holds rows)';
    end if;
  end if;

  -- The 002 functions back, in place of the 104 ones.
  drop function if exists public.cards_wallet(uuid, timestamptz, integer, integer, integer);
  drop function if exists public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text);

  create or replace function public.cards_wallet(p_user uuid, p_now timestamptz default now(), p_ads_limit integer default 10, p_bonus_cap integer default 3)
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
  begin
    select * into w from public.cards_wallets where user_id = p_user;
    if not found then
      w.stock := 5; w.anchor := p_now; w.paris_day := v_today; w.ads_today := 0; w.bonus_today := 0; w.shards := 0;
    end if;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now);
    v_stock := (r ->> 'stock')::integer;
    v_anchor := (r ->> 'anchor')::timestamptz;
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
      'next_at', case when v_stock >= 5 then null else v_anchor + interval '600 seconds' end,
      'midnight_at', ((v_today + 1)::timestamp at time zone 'Europe/Paris'));
  end
  $f$;

  create or replace function public.cards_apply_pack(
      p_user uuid, p_source text, p_cards integer[], p_ticket uuid default null, p_now timestamptz default now(),
      p_ads_limit integer default 10, p_bonus_cap integer default 3)
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

    if p_source = 'stock' then
      if v_stock < 1 then raise exception 'cards: empty'; end if;
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

    foreach v_card in array p_cards loop
      v_new := not (v_card = any (v_seen)) and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
      v_seen := v_seen || v_card;
      insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at)
      values (p_user, v_card, 1, p_now, p_now)
      on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
      v_out := v_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new));
    end loop;

    insert into public.cards_packs (user_id, source, cards, opened_at) values (p_user, p_source, p_cards, p_now) returning id into v_pack;

    update public.cards_wallets
       set stock = v_stock, anchor = v_anchor, paris_day = v_today, ads_today = v_ads, bonus_today = v_bonus,
           shards = v_shards, version = version + 1, updated_at = p_now
     where user_id = p_user;

    return jsonb_build_object('id', v_pack, 'source', p_source, 'cards', v_out);
  end
  $f$;

  revoke all on function public.cards_wallet(uuid, timestamptz, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer) from public, anon, authenticated;
  grant execute on function public.cards_wallet(uuid, timestamptz, integer, integer) to service_role;
  grant execute on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer) to service_role;

  drop function if exists public.cards_wish(uuid, integer, boolean, timestamptz);
  drop function if exists public.cards_craft(uuid, integer, timestamptz);
  drop function if exists public.cards_focus_used(uuid, timestamptz);
  drop function if exists public.cards_timer_used(uuid, timestamptz);
  drop function if exists public.cards_pity_pool();
  drop function if exists public.cards_pity_count(uuid);

  drop table if exists public.cards_wishlist;
  drop table if exists public.cards_crafts;
  drop index if exists public.cards_packs_focus_idx;
  alter table public.cards_packs drop constraint if exists cards_packs_focus_fkey;
  alter table public.cards_packs drop column if exists focus;

  notify pgrst, 'reload schema';
end $c104r$;
