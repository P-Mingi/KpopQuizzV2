-- 002-functions.sql (Bunnyverse Cards, lane CORE, 2026-11-12; the wallet, the pack, the recycle, the favorite and the ad ticket)
--
-- What:   creates the functions of the contract section 2, all security definer, search_path public, EXECUTE for service_role only:
--           cards_roll(...)                the refill and the Paris midnight on a row (the SQL twin of lib/cards/rules.ts walletAt)
--           cards_bonus_plays(user, day)   the bonus packs earned on a Paris day (the rows of cards_bonus_earned)
--           cards_bonus_record(user, now)  records the Kpopdle wins of the Paris day in cards_bonus_earned, once per play
--           cards_wallet(user, now, ...)   STABLE, read only: the wallet after the refill, nothing written (the home block of kpopquiz.org reads it)
--           cards_apply_pack(user, source, cards, ticket, now, ...)   spends the source, checks the 5 cards, stores them, in one transaction
--           cards_recycle(user, now)       every copy above one becomes shards, all at once
--           cards_favorite(user, card_no, on)
--           cards_issue_ticket(user, now, ...)   the single-use ticket handed out before a rewarded ad
--         and two triggers: a refused or removed photo retires its cards from the packs; closing a report erases its contact.
-- Why:    the draw itself stays in TypeScript (crypto.randomInt, lib/cards/draw.ts); the database only checks and stores. The rules are the
--         prototype's sync(): 5 packs at most, 1 pack per 10 minutes, a Paris midnight tops the stack up to 5 and restarts the day counters.
-- Rows:   0 rows. 10 functions, 2 triggers.
-- Needs:  001. For the bonus pack: public.dle_plays and public.dle_games (019), read inside cards_bonus_record only and only when they exist
--         (to_regclass). public.plays is never read: a browser can write it (review 1 finding 1).
-- Bonus:  the allowance of a Paris day = min(p_bonus_cap, bonus packs earned that day) minus the bonus packs already opened that day. A bonus
--         pack is earned by a Kpopdle win only (owner decision), recorded by cards_bonus_record from the server route after its checks; a
--         quiz completion of kpopquiz.org earns nothing (its score is reported by the browser). With p_bonus_cap <= 0 nothing is read.
-- Errors: a refusal is an exception whose message starts with 'cards: ' and one word: empty, shards, bonus, ad_limit, ticket, source, pack.
-- Every p_now defaults to now(); the proofs inject it. A new wallet starts with a full stack (decision 16 of CARDS-DECISIONS.md).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\_%';   expect 10
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_%';   expect f
-- Verify: select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_%';   expect t
-- Verify: select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'stock';   expect 5
-- Undo:   002-functions.rollback.sql
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c002$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_wallets') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_bonus_earned') is null then
    raise exception '002-functions: run 001-schema.sql first';
  end if;

  -- The refill and the Paris midnight on a row, as jsonb {stock, anchor, paris_day, ads_today, bonus_today}. Not exposed.
  create or replace function public.cards_roll(p_stock integer, p_anchor timestamptz, p_day date, p_ads integer, p_bonus integer, p_now timestamptz)
    returns jsonb
    language plpgsql stable set search_path = public
    as $f$
  declare
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_stock integer := p_stock;
    v_anchor timestamptz := p_anchor;
    v_ads integer := p_ads;
    v_bonus integer := p_bonus;
    k bigint;
  begin
    if p_day is distinct from v_today then
      v_ads := 0;
      v_bonus := 0;
      if v_stock < 5 then
        v_stock := 5;
        v_anchor := p_now;
      end if;
    end if;
    if v_stock >= 5 then
      v_anchor := p_now;
    else
      k := floor(extract(epoch from (p_now - v_anchor)) / 600);
      if k > 0 then
        v_stock := least(5, v_stock + k);
        v_anchor := v_anchor + make_interval(secs => (k * 600)::double precision);
        if v_stock >= 5 then
          v_anchor := p_now;
        end if;
      end if;
    end if;
    return jsonb_build_object('stock', v_stock, 'anchor', v_anchor, 'paris_day', v_today, 'ads_today', v_ads, 'bonus_today', v_bonus);
  end
  $f$;

  -- The bonus packs earned on a Paris day: the rows of cards_bonus_earned, which only cards_bonus_record writes (review 1 finding 1). A row
  -- a browser can write (public.plays accepts an anonymous insert, record_play takes any player id) never counts.
  create or replace function public.cards_bonus_plays(p_user uuid, p_day date)
    returns integer
    language sql stable security definer set search_path = public
    as $f$
      select count(*)::integer from public.cards_bonus_earned where user_id = p_user and paris_day = p_day
    $f$;

  -- Records the Kpopdle wins of the player's Paris day as earned bonus packs, one row per won play (dle_plays.id), never twice, and returns
  -- the bonus packs earned that day. The win is decided in the database by dle_guess (019-dle-core.sql: dle_plays holds no browser grant
  -- and no policy, the answer never reaches the browser). Called by the server route POST /api/cards-bridge/bonus after its own checks
  -- (session, Team account, flags). A quiz of kpopquiz.org earns nothing: its completion is a client-reported score (owner decision).
  -- A play's date is its UTC day or the day before (dle_playable), so a Paris day reads at most the three play dates up to it.
  create or replace function public.cards_bonus_record(p_user uuid, p_now timestamptz default now())
    returns integer
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_today date := (p_now at time zone 'Europe/Paris')::date;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    -- A database without the daily games (019 not applied) records nothing.
    if to_regclass('public.dle_plays') is not null and to_regclass('public.dle_games') is not null then
      insert into public.cards_bonus_earned (user_id, paris_day, source, play_ref, earned_at)
      select p_user, v_today, 'kpopdle', 'dle_plays:' || d.id::text, p_now
        from public.dle_plays d
       where d.game_id = any (array(select g.id from public.dle_games g where g.id like 'kpopdle%'))
         and d.play_date between v_today - 2 and v_today
         and d.user_id = p_user and d.status = 'won'
         and d.finished_at <= p_now and (d.finished_at at time zone 'Europe/Paris')::date = v_today
      on conflict on constraint cards_bonus_earned_play_key do nothing;
    end if;
    return public.cards_bonus_plays(p_user, v_today);
  end
  $f$;

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
      update public.cards_ad_tickets set used_at = p_now
       where id = p_ticket and user_id = p_user and used_at is null
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
    select coalesce(sum(o.copies - 1), 0), coalesce(sum((o.copies - 1) * case c.rarity
             when 'C' then 1 when 'U' then 2 when 'R' then 5 when 'SR' then 12 when 'UR' then 30 else 80 end), 0)
      into v_n, v_sh
      from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no
     where o.user_id = p_user and o.copies > 1;
    if v_n > 0 then
      update public.cards_owned set copies = 1 where user_id = p_user and copies > 1;
      update public.cards_wallets set shards = shards + v_sh, version = version + 1, updated_at = p_now where user_id = p_user;
    end if;
    return jsonb_build_object('recycled', v_n, 'shards_gained', v_sh, 'shards', w.shards + v_sh);
  end
  $f$;

  create or replace function public.cards_favorite(p_user uuid, p_card_no integer, p_on boolean)
    returns boolean
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_n integer;
  begin
    update public.cards_owned set favorite = coalesce(p_on, false) where user_id = p_user and card_no = p_card_no;
    get diagnostics v_n = row_count;
    return v_n = 1;
  end
  $f$;

  -- A ticket is handed out before a rewarded ad and spent once by cards_apply_pack('ad'). Null when the day's limit is reached, counting the
  -- tickets still unused (a player cannot hold more tickets than ads he has left). Unused tickets older than 1 hour are dropped first.
  create or replace function public.cards_issue_ticket(p_user uuid, p_now timestamptz default now(), p_ads_limit integer default 10)
    returns uuid
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_ads integer;
    v_open integer;
    v_id uuid;
  begin
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    v_ads := (public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now) ->> 'ads_today')::integer;
    delete from public.cards_ad_tickets where user_id = p_user and used_at is null and issued_at < p_now - interval '1 hour';
    select count(*) into v_open from public.cards_ad_tickets where user_id = p_user and used_at is null;
    if v_ads + v_open >= p_ads_limit then
      return null;
    end if;
    insert into public.cards_ad_tickets (user_id, issued_at) values (p_user, p_now) returning id into v_id;
    return v_id;
  end
  $f$;

  -- A photo that is refused or removed (48 hours after a report) retires its cards from the packs. Owned copies stay in the binders.
  create or replace function public.cards_photo_retire()
    returns trigger
    language plpgsql security definer set search_path = public
    as $f$
  begin
    if new.status in ('rejected', 'removed') and old.status is distinct from new.status then
      update public.cards_catalog set in_packs = false where photo_id = new.id and in_packs;
    end if;
    return new;
  end
  $f$;
  drop trigger if exists cards_photos_retire on public.cards_photos;
  create trigger cards_photos_retire after update of status on public.cards_photos
    for each row execute function public.cards_photo_retire();

  -- Decision 6: the contact of a report is kept until the report is closed, then erased.
  create or replace function public.cards_report_close()
    returns trigger
    language plpgsql set search_path = public
    as $f$
  begin
    if new.status = 'closed' then
      new.contact := null;
      new.closed_at := coalesce(new.closed_at, now());
    end if;
    return new;
  end
  $f$;
  drop trigger if exists cards_reports_close on public.cards_reports;
  create trigger cards_reports_close before update of status on public.cards_reports
    for each row execute function public.cards_report_close();

  revoke all on function public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_bonus_plays(uuid, date) from public, anon, authenticated;
  revoke all on function public.cards_bonus_record(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_wallet(uuid, timestamptz, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_recycle(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_favorite(uuid, integer, boolean) from public, anon, authenticated;
  revoke all on function public.cards_issue_ticket(uuid, timestamptz, integer) from public, anon, authenticated;
  revoke all on function public.cards_photo_retire() from public, anon, authenticated;
  revoke all on function public.cards_report_close() from public, anon, authenticated;
  grant execute on function public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz) to service_role;
  grant execute on function public.cards_bonus_plays(uuid, date) to service_role;
  grant execute on function public.cards_bonus_record(uuid, timestamptz) to service_role;
  grant execute on function public.cards_wallet(uuid, timestamptz, integer, integer) to service_role;
  grant execute on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer) to service_role;
  grant execute on function public.cards_recycle(uuid, timestamptz) to service_role;
  grant execute on function public.cards_favorite(uuid, integer, boolean) to service_role;
  grant execute on function public.cards_issue_ticket(uuid, timestamptz, integer) to service_role;
  grant execute on function public.cards_photo_retire() to service_role;
  grant execute on function public.cards_report_close() to service_role;

  notify pgrst, 'reload schema';
end $c002$;
