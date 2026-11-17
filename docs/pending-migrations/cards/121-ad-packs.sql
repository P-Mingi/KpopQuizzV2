-- 121-ad-packs.sql (KpopCards launch prep, 2026-11-17; a rewarded ad gives +1 pack, granted only on the ad network's verified completion signal)
--
-- What:   in ONE DO block:
--           table     cards_ad_events (transaction_id primary key, ticket_id, user_id, paris_day, granted, reason, ad_unit, created_at)
--                     one row per completed ad event the network reported; row level security on, no grant to a browser role
--           function  cards_ad_pack_grant(ticket, transaction_id, ad_unit, now, daily_cap, timer_cap)
--                     called by the server ONLY after it verified the signature of the network's callback (server side verification); it
--                       - answers a transaction id it has already seen with the stored answer (replayed true, nothing more is given)
--                       - finds the user from the ticket (cards_ad_tickets, issued by cards_issue_ticket before the ad), never from the caller
--                       - spends the ticket once (a second event on the same ticket gives nothing)
--                       - gives +1 pack to the stack while the user has fewer than daily_cap ad packs on that Paris day; past it the event is
--                         recorded with granted false (reason daily_cap) and gives nothing
--         The stack is not capped by this function (like a claimed set or a bonus pack): the cap 7 only stops the timer.
-- Why:    the owner's brief of 2026-11-17: packs for a rewarded ad, behind a flag that stays OFF (NET_CARDS_AD_PACKS in the web code), granted on
--         the server on the ad network's signed callback and never on the browser's word, with a daily cap per user and one grant per ad event.
--         The older shard ad (cards_ad_grant, client signal) is untouched.
-- Rows:   0 rows changed. 1 table, 1 function. No XP, level, streak or badge of kpopquiz.org is touched. Nothing calls the function until the
--         owner turns the flag on and the ad account exists (docs/o1/reports/CARDS/LAUNCH-PREP-ADS.md).
-- Needs:  001, 002 (cards_ad_tickets), 110 and 120 applied (cards_roll with the cap argument, the stack of 7).
-- Errors: words after "cards: ": user, ticket, key.
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename = 'cards_ad_events' and rowsecurity;   expect 1
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_ad_pack_grant';   expect 1
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cards_ad_pack_grant';   expect false
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_ad_events' and grantee in ('anon', 'authenticated', 'PUBLIC');   expect 0
-- Undo:   121-ad-packs.rollback.sql (refused while a row of cards_ad_events exists)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c121$
begin
  perform set_config('lock_timeout', '5s', true);

  if to_regclass('public.cards_wallets') is null or to_regclass('public.cards_ad_tickets') is null or to_regclass('public.cards_idem') is null then
    raise exception '121-ad-packs: run 001-schema.sql, 002-functions.sql and 105-goals.sql first';
  end if;
  if to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)') is null then
    raise exception '121-ad-packs: run 110-core.sql first (cards_roll with the cap argument)';
  end if;
  if position('p_cap integer DEFAULT 7' in pg_get_function_arguments(to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)'))) = 0 then
    raise exception '121-ad-packs: run 120-cap-7.sql first (the stack of 7)';
  end if;

  create table if not exists public.cards_ad_events (
    transaction_id text constraint cards_ad_events_pkey primary key constraint cards_ad_events_tx_check check (length(transaction_id) between 1 and 128),
    ticket_id uuid not null,
    user_id uuid not null constraint cards_ad_events_user_id_fkey references auth.users(id) on delete cascade,
    paris_day date not null,
    granted boolean not null,
    reason text,
    ad_unit text,
    created_at timestamptz not null default now()
  );
  create index if not exists cards_ad_events_user_day_idx on public.cards_ad_events (user_id, paris_day) where granted;
  alter table public.cards_ad_events enable row level security;
  revoke all on table public.cards_ad_events from public, anon, authenticated;
  grant all on table public.cards_ad_events to service_role;

  create or replace function public.cards_ad_pack_grant(
      p_ticket uuid, p_tx text, p_ad_unit text, p_now timestamptz default now(), p_daily_cap integer default 3, p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    t public.cards_ad_tickets%rowtype;
    ev public.cards_ad_events%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_n integer;
  begin
    if p_ticket is null then raise exception 'cards: ticket'; end if;
    if p_tx is null or length(p_tx) not between 1 and 128 then raise exception 'cards: key'; end if;
    -- One grant per ad event: the network's transaction id is the key. A repeat (the network retries a callback) gets the stored answer.
    select * into ev from public.cards_ad_events where transaction_id = p_tx;
    if found then
      return jsonb_build_object('granted', false, 'replayed', true, 'was_granted', ev.granted, 'reason', ev.reason);
    end if;
    -- The user is the owner of the ticket the server issued before the ad. The ticket row is locked, so two callbacks for one ticket cannot both pass.
    select * into t from public.cards_ad_tickets where id = p_ticket for update;
    if not found then raise exception 'cards: ticket'; end if;
    -- Another transaction id may have been recorded for this ticket while this call waited for the lock.
    select * into ev from public.cards_ad_events where transaction_id = p_tx;
    if found then
      return jsonb_build_object('granted', false, 'replayed', true, 'was_granted', ev.granted, 'reason', ev.reason);
    end if;
    if t.used_at is not null then raise exception 'cards: ticket'; end if;
    if t.issued_at < p_now - interval '2 hours' or t.issued_at > p_now + interval '5 minutes' then raise exception 'cards: ticket'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (t.user_id, 7, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = t.user_id for update;
    update public.cards_ad_tickets set used_at = p_now where id = p_ticket and used_at is null;
    select count(*) into v_n from public.cards_ad_events where user_id = t.user_id and paris_day = v_today and granted;
    if p_daily_cap is null or p_daily_cap < 1 or v_n >= p_daily_cap then
      insert into public.cards_ad_events (transaction_id, ticket_id, user_id, paris_day, granted, reason, ad_unit, created_at)
      values (p_tx, p_ticket, t.user_id, v_today, false, 'daily_cap', left(p_ad_unit, 64), p_now);
      return jsonb_build_object('granted', false, 'replayed', false, 'reason', 'daily_cap', 'ads_today', v_n);
    end if;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 7, w.seen_at + interval '2 hours');
    update public.cards_wallets
       set stock = (r ->> 'stock')::integer + 1, anchor = case when (r ->> 'paused')::boolean then p_now else (r ->> 'anchor')::timestamptz end,
           paris_day = v_today, ads_today = (r ->> 'ads_today')::integer, bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           seen_at = p_now, version = version + 1, updated_at = p_now
     where user_id = t.user_id;
    insert into public.cards_ad_events (transaction_id, ticket_id, user_id, paris_day, granted, reason, ad_unit, created_at)
    values (p_tx, p_ticket, t.user_id, v_today, true, null, left(p_ad_unit, 64), p_now);
    return jsonb_build_object('granted', true, 'replayed', false, 'user_id', t.user_id, 'stock', (r ->> 'stock')::integer + 1, 'ads_today', v_n + 1);
  end
  $f$;
  revoke all on function public.cards_ad_pack_grant(uuid, text, text, timestamptz, integer, integer) from public, anon, authenticated;
  grant execute on function public.cards_ad_pack_grant(uuid, text, text, timestamptz, integer, integer) to service_role;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'cards_ad_events' and not rowsecurity) then
    raise exception '121-ad-packs: cards_ad_events has row level security off';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_ad_events' and grantee in ('anon', 'authenticated', 'PUBLIC')) then
    raise exception '121-ad-packs: cards_ad_events is granted to a browser role';
  end if;
  notify pgrst, 'reload schema';
end $c121$;
