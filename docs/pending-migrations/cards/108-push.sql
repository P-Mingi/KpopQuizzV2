-- 108-push.sql (Bunnyverse Cards lot 4, lane PUSH, 2026-11-13; the "Notify me" of the packs page)
--
-- What:   creates public.cards_push_subs, the web push subscriptions of the players (one row a browser: user, endpoint, keys, created,
--         last_sent_day, failures), with row level security on and NO grant for the browser roles, and 5 security definer functions
--         for the server (the service role only):
--           cards_push_upsert(user, endpoint, p256dh, auth, now)   stores or refreshes one subscription (at most 5 a player, the oldest goes)
--           cards_push_delete(user, endpoint)                      the player turns it off
--           cards_push_drop(endpoint)                              the push service answered 404 or 410: the subscription is gone for good
--           cards_push_result(id, ok)                              the cron's verdict on one send (failures back to 0, or plus 1)
--           cards_push_pick(now, limit)                            the cron's pick-and-mark: the rows to notify, marked in the same statement
-- Why:    one push at most when the stack becomes full (5 packs), never between 22:00 and 08:00 Paris (the reminder waits for 08:00), at most
--         one a Paris day for a player. The pick holds the rule so two cron runs never send twice: it locks the rows it takes (for update
--         skip locked) and marks them (last_sent_day, notified_anchor) in that same statement.
-- Full:   "full" is the stack cap the wallet reports in its 'cap' key (10 from file 110, 5 before it; a wallet without the key reads 5).
--         "becomes full" reads the wallet of 002: the stored row (cards_wallets) is below 5 while cards_wallet, which applies the refill and the
--         Paris midnight, now says 5. notified_anchor keeps the stored anchor of the notified cycle, so a stack that stays full is told once;
--         the next pack the player opens moves the anchor and re-arms it. A player without a wallet row (no pack opened yet) is never told.
--         A subscription made while the stack is already full starts notified for that cycle (no push for a stack that was full before).
-- Rows:   0 rows. 1 table, 2 indexes besides the keys, 5 functions. Additive: no existing table or function is touched.
-- Needs:  001 (cards_wallets) and 002 (cards_wallet).
-- Verify: select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'cards_push_subs';   expect 1
-- Verify: select relrowsecurity from pg_class where oid = 'public.cards_push_subs'::regclass;   expect t
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_push_subs' and grantee in ('anon', 'authenticated');   expect 0
-- Verify: select count(*) from pg_policies where schemaname = 'public' and tablename = 'cards_push_subs';   expect 0
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\_push\_%';   expect 5
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_push\_%';   expect f
-- Verify: select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_push\_%';   expect t
-- Verify: select count(*) from public.cards_push_subs;   expect 0 (on the first run)
-- Undo:   108-push.rollback.sql (drops the 5 functions and the table, and with it every subscription).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c108$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_wallets') is null or to_regprocedure('public.cards_wallet(uuid, timestamptz, integer, integer)') is null then
    raise exception '108-push: run 001-schema.sql and 002-functions.sql first';
  end if;

  create table if not exists public.cards_push_subs (
    id uuid constraint cards_push_subs_pkey primary key default gen_random_uuid(),
    user_id uuid not null constraint cards_push_subs_user_id_fkey references auth.users(id) on delete cascade,
    endpoint text not null constraint cards_push_subs_endpoint_key unique
      constraint cards_push_subs_endpoint_check check (endpoint ~ '^https://' and length(endpoint) <= 2048),
    p256dh text constraint cards_push_subs_p256dh_check check (p256dh is null or length(p256dh) <= 256),
    auth text constraint cards_push_subs_auth_check check (auth is null or length(auth) <= 256),
    created_at timestamptz not null default now(),
    last_sent_day date,
    notified_anchor timestamptz,
    failures integer not null default 0 constraint cards_push_subs_failures_check check (failures >= 0)
  );
  alter table public.cards_push_subs enable row level security;
  revoke all on table public.cards_push_subs from public, anon, authenticated;
  grant all on table public.cards_push_subs to service_role;
  create index if not exists cards_push_subs_user_idx on public.cards_push_subs (user_id, created_at);
  create index if not exists cards_push_subs_day_idx on public.cards_push_subs (last_sent_day) where failures < 5;

  -- Stores or refreshes one subscription. The endpoint is the key: a browser that signs in as another account moves to that account. At most 5
  -- a player (the oldest go). Starts notified for the cycle when the stack is already full (see Full above).
  create or replace function public.cards_push_upsert(p_user uuid, p_endpoint text, p_p256dh text, p_auth text, p_now timestamptz default now())
    returns boolean
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_full boolean := false;
  begin
    if p_user is null or p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 2048 then
      raise exception 'cards: push_endpoint';
    end if;
    select * into w from public.cards_wallets where user_id = p_user;
    if found then
      v_full := coalesce((select (q.x ->> 'stock')::integer >= coalesce((q.x ->> 'cap')::integer, 5) from (select public.cards_wallet(p_user, p_now) as x) q), false);
    end if;
    insert into public.cards_push_subs (user_id, endpoint, p256dh, auth, created_at, notified_anchor)
      values (p_user, p_endpoint, p_p256dh, p_auth, p_now, case when v_full then w.anchor else null end)
      on conflict (endpoint) do update
        set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, failures = 0,
            notified_anchor = case when public.cards_push_subs.user_id = excluded.user_id then public.cards_push_subs.notified_anchor else excluded.notified_anchor end,
            last_sent_day = case when public.cards_push_subs.user_id = excluded.user_id then public.cards_push_subs.last_sent_day else null end;
    delete from public.cards_push_subs s
      where s.user_id = p_user
        and s.id in (select o.id from public.cards_push_subs o where o.user_id = p_user order by o.created_at desc, o.id offset 5);
    return true;
  end
  $f$;

  create or replace function public.cards_push_delete(p_user uuid, p_endpoint text)
    returns boolean
    language plpgsql security definer set search_path = public
    as $f$
  declare
    n integer;
  begin
    delete from public.cards_push_subs where user_id = p_user and endpoint = p_endpoint;
    get diagnostics n = row_count;
    return n > 0;
  end
  $f$;

  create or replace function public.cards_push_drop(p_endpoint text)
    returns boolean
    language plpgsql security definer set search_path = public
    as $f$
  declare
    n integer;
  begin
    delete from public.cards_push_subs where endpoint = p_endpoint;
    get diagnostics n = row_count;
    return n > 0;
  end
  $f$;

  create or replace function public.cards_push_result(p_id uuid, p_ok boolean)
    returns void
    language sql security definer set search_path = public
    as $f$
      update public.cards_push_subs set failures = case when p_ok then 0 else failures + 1 end where id = p_id
    $f$;

  -- The cron's pick-and-mark. Nothing between 22:00 and 08:00 Paris. A row is due when its player's stored stack is below 5 and cards_wallet (the
  -- refill and the Paris midnight applied) says 5, the cycle (the stored anchor) was not told yet, the player was told no push today, and the row
  -- failed fewer than 5 times in a row. The rows are locked and marked in the same statement: a second run skips them, or no longer sees them.
  create or replace function public.cards_push_pick(p_now timestamptz default now(), p_limit integer default 100)
    returns table (id uuid, user_id uuid, endpoint text)
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_local timestamp := p_now at time zone 'Europe/Paris';
    v_today date := (p_now at time zone 'Europe/Paris')::date;
  begin
    if extract(hour from v_local) >= 22 or extract(hour from v_local) < 8 then
      return;
    end if;
    return query
      with due as (
        select s.id as sid
        from public.cards_push_subs s
        join public.cards_wallets w on w.user_id = s.user_id
        where s.failures < 5
          and s.last_sent_day is distinct from v_today
          and s.notified_anchor is distinct from w.anchor
          and w.stock < coalesce((public.cards_wallet(s.user_id, p_now) ->> 'cap')::integer, 5)
          and not exists (select 1 from public.cards_push_subs o where o.user_id = s.user_id and o.last_sent_day = v_today)
          and (public.cards_wallet(s.user_id, p_now) ->> 'stock')::integer >= coalesce((public.cards_wallet(s.user_id, p_now) ->> 'cap')::integer, 5)
        order by s.created_at, s.id
        limit greatest(1, least(coalesce(p_limit, 100), 500))
        for update of s skip locked
      )
      update public.cards_push_subs u
        set last_sent_day = v_today, notified_anchor = (select w2.anchor from public.cards_wallets w2 where w2.user_id = u.user_id)
        from due
        where u.id = due.sid
        returning u.id, u.user_id, u.endpoint;
  end
  $f$;

  revoke all on function public.cards_push_upsert(uuid, text, text, text, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_push_delete(uuid, text) from public, anon, authenticated;
  revoke all on function public.cards_push_drop(text) from public, anon, authenticated;
  revoke all on function public.cards_push_result(uuid, boolean) from public, anon, authenticated;
  revoke all on function public.cards_push_pick(timestamptz, integer) from public, anon, authenticated;
  grant execute on function public.cards_push_upsert(uuid, text, text, text, timestamptz) to service_role;
  grant execute on function public.cards_push_delete(uuid, text) to service_role;
  grant execute on function public.cards_push_drop(text) to service_role;
  grant execute on function public.cards_push_result(uuid, boolean) to service_role;
  grant execute on function public.cards_push_pick(timestamptz, integer) to service_role;

  notify pgrst, 'reload schema';
end $c108$;
