-- 105-goals.rollback.sql (Bunnyverse Cards lots 3 and 4, lane GOALS): undo of 105-goals.sql.
--
-- What:   puts 104's cards_apply_pack and cards_craft back (same signatures, create or replace), drops the 5 functions 105 added, the 2 tables
--         cards_sets_claimed and cards_week_claims, the column cards_wallets.reward_packs and restores cards_packs_source_check to
--         ('stock', 'ad', 'shards', 'bonus').
-- Why:    without 105 there are no sets, no weekly list and no reward packs; the Goals routes then answer a server error, so switch NET_CARDS
--         off or deploy the code from before Goals first.
-- Rows:   2 tables dropped with their rows (the claims), 1 column dropped (the waiting reward packs). Refused while a set or a week is claimed,
--         while a player holds a reward pack or while a pack of source 'reward' is recorded: those rows are the only record of what was paid.
--         The shards the week gave stay in the wallets. No other data is changed.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_goals_progress', 'cards_goals_settle', 'cards_week_progress', 'cards_week_claim', 'cards_goals_sync');   expect 0
-- Verify: select proname, count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_apply_pack', 'cards_craft') group by proname order by proname;   expect cards_apply_pack 1, cards_craft 1
-- Verify: select pg_get_constraintdef(oid) like '%reward%' from pg_constraint where conname = 'cards_packs_source_check' and conrelid = 'public.cards_packs'::regclass;   expect f
-- Undo:   run 105-goals.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c105r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_sets_claimed') is not null then
    if exists (select 1 from public.cards_sets_claimed) then
      raise exception '105-goals rollback: refused, a set is claimed (cards_sets_claimed holds rows)';
    end if;
  end if;
  if to_regclass('public.cards_week_claims') is not null then
    if exists (select 1 from public.cards_week_claims) then
      raise exception '105-goals rollback: refused, a week is claimed (cards_week_claims holds rows)';
    end if;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_wallets' and column_name = 'reward_packs') then
    if exists (select 1 from public.cards_wallets where reward_packs > 0) then
      raise exception '105-goals rollback: refused, a player holds a reward pack';
    end if;
  end if;
  if exists (select 1 from public.cards_packs where source = 'reward') then
    raise exception '105-goals rollback: refused, a pack of source reward is recorded';
  end if;

  -- 104's two functions back.
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

  revoke all on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) from public, anon, authenticated;
  revoke all on function public.cards_craft(uuid, integer, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) to service_role;
  grant execute on function public.cards_craft(uuid, integer, timestamptz) to service_role;

  drop function if exists public.cards_goals_sync(uuid, timestamptz);
  drop function if exists public.cards_week_claim(uuid, timestamptz);
  drop function if exists public.cards_week_progress(uuid, timestamptz);
  drop function if exists public.cards_goals_settle(uuid, timestamptz, integer[]);
  drop function if exists public.cards_goals_progress(uuid, integer[]);

  drop table if exists public.cards_week_claims;
  drop table if exists public.cards_sets_claimed;
  alter table public.cards_wallets drop constraint if exists cards_wallets_reward_packs_check;
  alter table public.cards_wallets drop column if exists reward_packs;

  if exists (select 1 from pg_constraint where conname = 'cards_packs_source_check' and conrelid = 'public.cards_packs'::regclass
              and pg_get_constraintdef(oid) like '%reward%') then
    alter table public.cards_packs drop constraint cards_packs_source_check;
    alter table public.cards_packs add constraint cards_packs_source_check check (source in ('stock', 'ad', 'shards', 'bonus'));
  end if;

  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_apply_pack') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_craft') <> 1 then
    raise exception '105-goals rollback: cards_apply_pack and cards_craft must each exist once';
  end if;

  notify pgrst, 'reload schema';
end $c105r$;
