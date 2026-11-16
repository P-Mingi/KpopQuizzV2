-- 112-social.sql (KpopCards lots 3 + 4 + 5, 2026-11-13; friends by one-time code, the ranking by completion, player pages, showcase and badges)
--
-- What:   in ONE DO block:
--           tables   cards_friend_codes   a one-time code a player makes to add a friend (8 characters, valid 24 hours, works once)
--                    cards_friends        a friendship, stored in both directions (at most 100 per player)
--           functions
--                    cards_friend_code_new(user, code, now)       replaces the player's unused code with a new one
--                    cards_friend_redeem(user, key, code, now)    uses a code: both players become friends; a failure is an answer, not an error
--                    cards_friend_remove(user, nickname)          ends a friendship (both directions)
--                    cards_friends(user)                          the friends with their completion and their wishlist
--                    cards_profile_of(user, viewer)               a player page: nickname, cards, showcase of 3, badges, the wishlist for friends
--                    cards_profile(viewer, nickname)              the same, found by nickname
--                    cards_ranking(user, scope, limit)            the ranking by completion ONLY: 'friends' (friends and himself) or 'all'
-- Why:    the prototype v6: Ranking by completion %, friends first, with each player's showcase of three starred cards and earned badges; friends
--         by one-time code, wishlists visible to friends, no chat; nicknames only (profiles.username, never an e-mail or a name). The ranking never
--         uses the number of packs opened. Cards a player holds are public only as his completion, his showcase and his badges.
-- Rows:   0 rows. 2 tables, 7 functions. Additive. No XP, level, streak or badge of kpopquiz.org is read or written (the badges here are the
--         cards' own: Founder, a complete group, First Gold, First Full Art, 100 cards).
-- Needs:  001, 105 (ledgers), 110 (created_at, locked) and the app's profiles table (username).
-- Notes:  a code failure (unknown, expired, used, your own, a full friend list, too many tries) is returned as {ok: false, error: ...} and the try
--         is counted: more than 8 tries in 10 minutes answer "rate". A player needs a nickname (a profiles row) to make or use a code.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_friend_code_new', 'cards_friend_redeem', 'cards_friend_remove', 'cards_friends', 'cards_profile_of', 'cards_profile', 'cards_ranking');   expect 7
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_%';   expect f
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_friend_codes', 'cards_friends') and rowsecurity;   expect 2
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_friend_codes', 'cards_friends') and grantee in ('anon', 'authenticated');   expect 0
-- Undo:   112-social.rollback.sql (drops the 2 tables with their rows: friendships are not earned data)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c112$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.profiles') is null then
    raise exception '112-social: the profiles table is missing';
  end if;
  if to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)') is null then
    raise exception '112-social: run 110-core.sql first';
  end if;

  create table if not exists public.cards_friend_codes (
    code text constraint cards_friend_codes_pkey primary key constraint cards_friend_codes_code_check check (code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
    user_id uuid not null constraint cards_friend_codes_user_id_fkey references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    used_at timestamptz,
    used_by uuid
  );
  alter table public.cards_friend_codes enable row level security;
  revoke all on table public.cards_friend_codes from public, anon, authenticated;
  grant all on table public.cards_friend_codes to service_role;
  create index if not exists cards_friend_codes_user_idx on public.cards_friend_codes (user_id, created_at desc);

  create table if not exists public.cards_friends (
    user_id uuid not null constraint cards_friends_user_id_fkey references auth.users(id) on delete cascade,
    friend_id uuid not null constraint cards_friends_friend_id_fkey references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint cards_friends_pkey primary key (user_id, friend_id),
    constraint cards_friends_self_check check (user_id <> friend_id)
  );
  alter table public.cards_friends enable row level security;
  revoke all on table public.cards_friends from public, anon, authenticated;
  grant all on table public.cards_friends to service_role;

  -- A new code (made by the server with crypto.randomInt) replaces every unused code of the player.
  create or replace function public.cards_friend_code_new(p_user uuid, p_code text, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if not exists (select 1 from public.profiles where id = p_user) then raise exception 'cards: nickname'; end if;
    if p_code is null or p_code !~ '^[0-9A-HJKMNP-TV-Z]{8}$' then raise exception 'cards: code'; end if;
    delete from public.cards_friend_codes where user_id = p_user and used_at is null;
    insert into public.cards_friend_codes (code, user_id, created_at, expires_at) values (p_code, p_user, p_now, p_now + interval '24 hours');
    return jsonb_build_object('code', p_code, 'expires_at', p_now + interval '24 hours');
  end
  $f$;

  create or replace function public.cards_friend_redeem(p_user uuid, p_key text, p_code text, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_hit public.cards_idem%rowtype;
    v_code public.cards_friend_codes%rowtype;
    v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'));
    v_tries integer;
    v_out jsonb;
    v_nick text;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    if not exists (select 1 from public.profiles where id = p_user) then raise exception 'cards: nickname'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> 'friend' then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;

    select count(*) into v_tries from public.cards_audit where user_id = p_user and kind = 'friend' and created_at > p_now - interval '10 minutes';
    if v_tries >= 8 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'friend', p_key, jsonb_build_object('try', true), p_now);

    select * into v_code from public.cards_friend_codes where code = v_norm for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'code_invalid'); end if;
    if v_code.used_at is not null then return jsonb_build_object('ok', false, 'error', 'code_used'); end if;
    if v_code.expires_at <= p_now then return jsonb_build_object('ok', false, 'error', 'code_expired'); end if;
    if v_code.user_id = p_user then return jsonb_build_object('ok', false, 'error', 'self'); end if;
    if exists (select 1 from public.cards_friends where user_id = p_user and friend_id = v_code.user_id) then return jsonb_build_object('ok', false, 'error', 'already'); end if;
    if (select count(*) from public.cards_friends where user_id = p_user) >= 100 or (select count(*) from public.cards_friends where user_id = v_code.user_id) >= 100 then
      return jsonb_build_object('ok', false, 'error', 'friend_limit');
    end if;
    update public.cards_friend_codes set used_at = p_now, used_by = p_user where code = v_norm;
    insert into public.cards_friends (user_id, friend_id, created_at) values (p_user, v_code.user_id, p_now), (v_code.user_id, p_user, p_now) on conflict do nothing;
    select username into v_nick from public.profiles where id = v_code.user_id;
    v_out := jsonb_build_object('ok', true, 'replayed', false, 'nickname', v_nick);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, 'friend', v_out, p_now);
    return v_out;
  end
  $f$;

  create or replace function public.cards_friend_remove(p_user uuid, p_nickname text)
    returns boolean
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_other uuid;
    n integer;
  begin
    select id into v_other from public.profiles where username = lower(coalesce(p_nickname, ''));
    if v_other is null then return false; end if;
    delete from public.cards_friends where (user_id = p_user and friend_id = v_other) or (user_id = v_other and friend_id = p_user);
    get diagnostics n = row_count;
    return n > 0;
  end
  $f$;

  -- A player page. The wishlist is returned for the player himself and for his friends only.
  create or replace function public.cards_profile_of(p_user uuid, p_viewer uuid)
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    v_nick text;
    v_owned integer;
    v_created timestamptz;
    v_badges jsonb := '[]'::jsonb;
    v_show jsonb;
    v_friend boolean;
    v_me boolean := p_user = p_viewer;
    r record;
  begin
    select username into v_nick from public.profiles where id = p_user;
    if v_nick is null then return null; end if;
    select count(*) into v_owned from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.in_packs;
    select coalesce((select w.created_at from public.cards_wallets w where w.user_id = p_user), now()) into v_created;
    if v_created < timestamptz '2027-03-01 00:00+00' then v_badges := v_badges || to_jsonb('Founder'::text); end if;
    for r in select x.name from public.cards_goals_progress(p_user, null) x where x.kind = 'group' and x.total > 0 and x.owned >= x.total order by x.name loop
      v_badges := v_badges || to_jsonb(r.name || ' complete');
    end loop;
    if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.rarity = 'UR') then v_badges := v_badges || to_jsonb('First Gold'::text); end if;
    if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.rarity = 'L') then v_badges := v_badges || to_jsonb('First Full Art'::text); end if;
    if v_owned >= 100 then v_badges := v_badges || to_jsonb('100 cards'::text); end if;
    select coalesce(jsonb_agg(s.card_no), '[]'::jsonb) into v_show from (
      select o.card_no from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no
       where o.user_id = p_user and c.in_packs
       order by o.favorite desc, array_position(array['C', 'U', 'R', 'SR', 'UR', 'L'], c.rarity) desc, o.card_no limit 3) s;
    v_friend := exists (select 1 from public.cards_friends f where f.user_id = p_viewer and f.friend_id = p_user);
    return jsonb_build_object('nickname', v_nick, 'owned', v_owned, 'showcase', v_show, 'badges', v_badges, 'friend', v_friend, 'me', v_me,
      'wishlist', case when v_me or v_friend then coalesce((select jsonb_agg(x.card_no order by x.card_no) from public.cards_wishlist x where x.user_id = p_user), '[]'::jsonb) else null end);
  end
  $f$;

  create or replace function public.cards_profile(p_viewer uuid, p_nickname text)
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    v_id uuid;
  begin
    select id into v_id from public.profiles where username = lower(coalesce(p_nickname, ''));
    if v_id is null then return null; end if;
    return public.cards_profile_of(v_id, p_viewer);
  end
  $f$;

  create or replace function public.cards_friends(p_user uuid)
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    r record;
    v_out jsonb := '[]'::jsonb;
  begin
    for r in select f.friend_id from public.cards_friends f join public.profiles p on p.id = f.friend_id where f.user_id = p_user order by p.username loop
      v_out := v_out || jsonb_build_array(public.cards_profile_of(r.friend_id, p_user));
    end loop;
    return jsonb_build_object('friends', v_out,
      'code', (select jsonb_build_object('code', c.code, 'expires_at', c.expires_at) from public.cards_friend_codes c
                where c.user_id = p_user and c.used_at is null and c.expires_at > now() order by c.created_at desc limit 1));
  end
  $f$;

  -- The ranking, by the number of distinct cards owned (that is the completion) and then the nickname. Never by packs opened.
  create or replace function public.cards_ranking(p_user uuid, p_scope text, p_limit integer default 50)
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    r record;
    v_out jsonb := '[]'::jsonb;
    v_ids uuid[];
    v_me jsonb;
    v_lim integer := greatest(1, least(coalesce(p_limit, 50), 100));
  begin
    if p_scope not in ('friends', 'all') then raise exception 'cards: scope'; end if;
    with counts as (
      select o.user_id, count(*)::integer as n from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where c.in_packs group by o.user_id),
    pool as (
      select p.id, p.username, coalesce(c.n, 0) as n
        from public.profiles p left join counts c on c.user_id = p.id
       where (p_scope = 'all' and coalesce(c.n, 0) > 0)
          or (p_scope = 'friends' and (p.id = p_user or p.id in (select f.friend_id from public.cards_friends f where f.user_id = p_user)))),
    ranked as (select pool.*, row_number() over (order by pool.n desc, pool.username) as pos from pool)
    select array_agg(ranked.id order by ranked.pos) into v_ids from ranked where ranked.pos <= v_lim or ranked.id = p_user;
    for r in select x.id, row_number() over () as pos from unnest(coalesce(v_ids, '{}')) with ordinality as x(id, ord) order by x.ord loop
      v_me := public.cards_profile_of(r.id, p_user);
      if v_me is not null then v_out := v_out || jsonb_build_array(v_me); end if;
    end loop;
    return v_out;
  end
  $f$;

  revoke all on function public.cards_friend_code_new(uuid, text, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_friend_redeem(uuid, text, text, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_friend_remove(uuid, text) from public, anon, authenticated;
  revoke all on function public.cards_friends(uuid) from public, anon, authenticated;
  revoke all on function public.cards_profile_of(uuid, uuid) from public, anon, authenticated;
  revoke all on function public.cards_profile(uuid, text) from public, anon, authenticated;
  revoke all on function public.cards_ranking(uuid, text, integer) from public, anon, authenticated;
  grant execute on function public.cards_friend_code_new(uuid, text, timestamptz) to service_role;
  grant execute on function public.cards_friend_redeem(uuid, text, text, timestamptz) to service_role;
  grant execute on function public.cards_friend_remove(uuid, text) to service_role;
  grant execute on function public.cards_friends(uuid) to service_role;
  grant execute on function public.cards_profile_of(uuid, uuid) to service_role;
  grant execute on function public.cards_profile(uuid, text) to service_role;
  grant execute on function public.cards_ranking(uuid, text, integer) to service_role;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename in ('cards_friend_codes', 'cards_friends') and not rowsecurity) then
    raise exception '112-social: a new table has row level security off';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_friend_codes', 'cards_friends') and grantee in ('anon', 'authenticated', 'PUBLIC')) then
    raise exception '112-social: a new table is granted to a browser role';
  end if;

  notify pgrst, 'reload schema';
end $c112$;
