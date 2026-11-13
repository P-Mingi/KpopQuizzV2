-- 110-core.sql (KpopCards lots 3 + 4 + 5, 2026-11-13; the stack of 10, the themes, the golden pack, Open 5 in ONE transaction, locks, recycle, craft)
--
-- What:   in ONE DO block:
--           columns  cards_wallets.packs_opened, seen_at, created_at   the player's pack count, the last action (the "still there?" check), the start
--                    cards_packs.seq, theme, golden, guarantee, batch   the pack number, what it was opened as, the golden and guarantee flags, the Open 5 batch
--                    cards_owned.locked, seen                          a locked card is never recycled; seen=false is the "New" badge
--           constraint cards_packs_source_check   now also 'daily'
--           table    cards_group_types    the type of a group (girl, boy, mixed) with the two sources it was checked against (filled by 111)
--           new functions
--                    cards_theme_of(entity)             'girls', 'boys', 'solo' or null: the theme packs a subject belongs to
--                    cards_in_pool(card, kind, group)   true when a card is in packs, with an active entity, and in the pool of a pack kind
--                    cards_pool_has(kind, group, rarities)  true when that pool has a card of one of the rarities
--                    cards_daily_group(day)             the pack of the day: one group a day, by the Paris day number
--                    cards_open(...)                    ONE function, ONE transaction: 1 or 5 packs, wallet locked, idempotency key, audit
--                    cards_recycle(user, key, n, now, timer_cap)   bulk (locked cards and Gold and Full Art extras never) or one extra copy
--                    cards_lock(user, card, on, now)    lock or unlock an owned card
--                    cards_seen(user, cards)            clears the New badge
--                    cards_still_there(user, now, timer_cap)   the quiet check: restarts a paused timer, takes nothing
--                    cards_player(user, now)            everything the lobby needs about a player in one answer
--           replaced functions (old signature dropped, one of each name remains)
--                    cards_roll        stack cap 10 (parameter), the pause after 2 hours without an action
--                    cards_wallet      adds cap, paused, packs_opened, seen_at
--                    cards_pity_count  orders by the pack number, so the packs of one Open 5 are counted pack by pack
--                    cards_craft       takes an idempotency key, writes the audit, leaves the New badge on
--                    cards_ad_grant    takes an idempotency key, writes the audit
--           dropped  cards_apply_pack  (the old one-pack function; cards_open replaces it)
-- Why:    the owner's rules of the v6 prototype: a stack of 10, a pack every 10 minutes, at most 40 timer packs a Paris day (the midnight top-up is
--         not counted), a golden pack every 10th pack (card 5 Holo or better), the Gold guarantee by pack 30, the themes All idols, Girl groups,
--         Boy groups and Soloists, a pack of the day (one group a day, free once), the focus pack, Open 5 (five packs, 25 cards, one transaction),
--         locks, recycling with safeguards. The DRAW stays in TypeScript with crypto.randomInt (lib/kpopcards/draw.ts); the database only
--         CHOOSES between the candidates the server drew, by rules that depend on the player's state at the moment of the lock: for each pack the
--         server sends the five plain cards plus a golden fifth card and a Gold fifth card, and cards_open takes the plain one, the golden one or
--         the Gold one according to the pack number and the guarantee COUNTED INSIDE THE TRANSACTION, then swaps a group half for its other half
--         when the player owns exactly one. So ten openings in parallel on one account cannot break a promise, whatever order they land in.
-- Rows:   0 rows changed except 3 backfills of new columns (packs_opened and seq from the player's packs, created_at from the first card), all
--         idempotent. 1 table, 9 columns, 10 new functions, 5 replaced, 1 dropped. No XP, level, streak or badge of kpopquiz.org is touched.
-- Needs:  001, 002, 102 (cards_catalog.part), 104, 105 (ledgers) and 107 (preferences).
-- Errors: words after "cards: ": empty, stack_short, shards, daily_used, focus_used, focus, pack, source, theme, key, idem_conflict, locked,
--         lastcopy, nothing, notowned, owned, card, no_craft, ad_limit, ticket, user.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_theme_of', 'cards_in_pool', 'cards_pool_has', 'cards_daily_group', 'cards_open', 'cards_recycle', 'cards_lock', 'cards_seen', 'cards_still_there', 'cards_player');   expect 10
-- Verify: select proname, count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_roll', 'cards_wallet', 'cards_pity_count', 'cards_craft', 'cards_ad_grant', 'cards_open') group by proname order by proname;   expect each 1
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_apply_pack';   expect 0
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_%';   expect f
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename = 'cards_group_types' and rowsecurity;   expect 1
-- Verify: select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'cap';   expect 10
-- Verify: select count(*) from public.cards_wallets where packs_opened <> (select count(*) from public.cards_packs p where p.user_id = cards_wallets.user_id);   expect 0
-- Undo:   110-core.rollback.sql (refused while an Open 5 batch, a daily pack, a lock or a ledger row of 110 exists)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c110$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_wallets') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_packs') is null
     or to_regclass('public.cards_owned') is null or to_regclass('public.cards_entities') is null then
    raise exception '110-core: run 001-schema.sql first';
  end if;
  if to_regclass('public.cards_idem') is null or to_regclass('public.cards_audit') is null then
    raise exception '110-core: run 105-goals.sql first (the idempotency ledger)';
  end if;
  if to_regclass('public.cards_prefs') is null then
    raise exception '110-core: run 107-prefs.sql first';
  end if;
  if to_regprocedure('public.cards_craft(uuid, integer, timestamptz)') is null and to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)') is null then
    raise exception '110-core: run 104-economy.sql first';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_catalog' and column_name = 'part') then
    raise exception '110-core: run 102-catalog-rebuild.sql first (cards_catalog.part)';
  end if;

  -- ---------- columns ----------
  alter table public.cards_wallets add column if not exists packs_opened integer not null default 0;
  alter table public.cards_wallets add column if not exists seen_at timestamptz not null default now();
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_wallets' and column_name = 'created_at') then
    alter table public.cards_wallets add column created_at timestamptz not null default now();
    update public.cards_wallets w set created_at = least(w.updated_at, coalesce((select min(o.first_at) from public.cards_owned o where o.user_id = w.user_id), w.updated_at));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cards_wallets_packs_opened_check' and conrelid = 'public.cards_wallets'::regclass) then
    alter table public.cards_wallets add constraint cards_wallets_packs_opened_check check (packs_opened >= 0);
  end if;

  alter table public.cards_packs add column if not exists seq integer;
  alter table public.cards_packs add column if not exists theme text;
  alter table public.cards_packs add column if not exists golden boolean not null default false;
  alter table public.cards_packs add column if not exists guarantee boolean not null default false;
  alter table public.cards_packs add column if not exists batch uuid;
  if not exists (select 1 from pg_constraint where conname = 'cards_packs_theme_check' and conrelid = 'public.cards_packs'::regclass) then
    alter table public.cards_packs add constraint cards_packs_theme_check check (theme is null or theme in ('all', 'girls', 'boys', 'solo', 'daily', 'focus'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cards_packs_source_check' and conrelid = 'public.cards_packs'::regclass and pg_get_constraintdef(oid) like '%daily%') then
    alter table public.cards_packs drop constraint if exists cards_packs_source_check;
    alter table public.cards_packs add constraint cards_packs_source_check check (source in ('stock', 'ad', 'shards', 'bonus', 'daily'));
  end if;
  create index if not exists cards_packs_seq_idx on public.cards_packs (user_id, seq desc nulls last);

  -- The pack number of every older pack, oldest first, and each wallet's count. Only the rows that have none yet.
  update public.cards_packs p set seq = x.rn
    from (select id, row_number() over (partition by user_id order by opened_at, id) as rn from public.cards_packs) x
   where p.id = x.id and p.seq is null;
  update public.cards_wallets w set packs_opened = c.n
    from (select user_id, count(*)::integer as n from public.cards_packs group by user_id) c
   where c.user_id = w.user_id and w.packs_opened = 0 and c.n > 0;

  alter table public.cards_owned add column if not exists locked boolean not null default false;
  alter table public.cards_owned add column if not exists seen boolean not null default true;

  create table if not exists public.cards_group_types (
    entity_id text constraint cards_group_types_pkey primary key constraint cards_group_types_entity_id_fkey references public.cards_entities(id) on delete cascade,
    gender text not null constraint cards_group_types_gender_check check (gender in ('girl', 'boy', 'mixed')),
    source_a text not null,
    source_b text not null,
    checked_on date not null
  );
  alter table public.cards_group_types enable row level security;
  revoke all on table public.cards_group_types from public, anon, authenticated;
  grant all on table public.cards_group_types to service_role;

  -- ---------- the theme of a subject ----------
  -- A group is 'girls' or 'boys' by cards_group_types ('mixed' and unknown groups belong to no themed pack, only to All idols). An idol takes its
  -- group's theme; an idol with no group, or whose group has no card of its own in packs (as in the sets of 105), is a soloist.
  create or replace function public.cards_theme_of(p_entity text)
    returns text
    language sql stable security definer set search_path = public
    as $f$
      select case
        when e.kind = 'group' then (select case t.gender when 'girl' then 'girls' when 'boy' then 'boys' else null end from public.cards_group_types t where t.entity_id = e.id)
        when e.kind = 'idol' and (e.group_id is null or not exists (
               select 1 from public.cards_catalog c join public.cards_entities g on g.id = c.entity_id
                where c.in_packs and g.active and g.id = e.group_id and g.kind = 'group'))
          then 'solo'
        when e.kind = 'idol' then (select case t.gender when 'girl' then 'girls' when 'boy' then 'boys' else null end from public.cards_group_types t where t.entity_id = e.group_id)
        else null end
        from public.cards_entities e where e.id = p_entity
    $f$;

  -- A card is in the pool of a pack kind: 'all' (any card in packs), 'girls' | 'boys' | 'solo' (its subject's theme), 'daily' (the group p_group:
  -- its own cards and its idols').
  create or replace function public.cards_in_pool(p_card integer, p_kind text, p_group text default null)
    returns boolean
    language sql stable security definer set search_path = public
    as $f$
      select exists (
        select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
         where c.card_no = p_card and c.in_packs and e.active
           and case p_kind
                 when 'all' then true
                 when 'daily' then (c.entity_id = p_group or e.group_id = p_group)
                 when 'girls' then public.cards_theme_of(c.entity_id) = 'girls'
                 when 'boys' then public.cards_theme_of(c.entity_id) = 'boys'
                 when 'solo' then public.cards_theme_of(c.entity_id) = 'solo'
                 else false end)
    $f$;

  create or replace function public.cards_pool_has(p_kind text, p_group text, p_rarities text[])
    returns boolean
    language sql stable security definer set search_path = public
    as $f$
      select exists (
        select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
         where c.in_packs and e.active and c.rarity = any (p_rarities)
           and case p_kind
                 when 'all' then true
                 when 'daily' then (c.entity_id = p_group or e.group_id = p_group)
                 when 'girls' then public.cards_theme_of(c.entity_id) = 'girls'
                 when 'boys' then public.cards_theme_of(c.entity_id) = 'boys'
                 when 'solo' then public.cards_theme_of(c.entity_id) = 'solo'
                 else false end)
    $f$;

  -- The pack of the day: the groups with a card of their own in packs, ordered by id, indexed by the number of days since 1970-01-01 of the Paris day.
  create or replace function public.cards_daily_group(p_day date)
    returns text
    language sql stable security definer set search_path = public
    as $f$
      with g as (
        select e.id, row_number() over (order by e.id collate "C") - 1 as i, count(*) over () as n
          from public.cards_entities e
         where e.kind = 'group' and e.active
           and exists (select 1 from public.cards_catalog c where c.in_packs and c.entity_id = e.id))
      select g.id from g where g.i = (((p_day - date '1970-01-01') % g.n) + g.n) % g.n
    $f$;

  -- ---------- the refill: cap 10, pause after 2 hours without an action ----------
  drop function if exists public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer);
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

  -- Packs in a row, newest first, with no Gold and no Full Art card; at most 30 are read. Any source counts. Ordered by the pack number, so the
  -- packs of one Open 5 (same opened_at) count in the order they were opened.
  create or replace function public.cards_pity_count(p_user uuid)
    returns integer
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    r record;
    n integer := 0;
  begin
    for r in select p.cards from public.cards_packs p where p.user_id = p_user order by p.seq desc nulls last, p.opened_at desc, p.id desc limit 30 loop
      exit when exists (select 1 from public.cards_catalog c where c.card_no = any (r.cards) and c.rarity in ('UR', 'L'));
      n := n + 1;
    end loop;
    return n;
  end
  $f$;

  -- ---------- the wallet, read only ----------
  drop function if exists public.cards_wallet(uuid, timestamptz, integer, integer, integer);
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

  -- Everything the lobby needs about a player in one answer (read only). Lists are small: a binder is a few hundred cards.
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
      'daily_used', exists (select 1 from public.cards_packs p where p.user_id = p_user and p.source = 'daily'
                             and p.opened_at >= v_today::timestamp at time zone 'Europe/Paris' and p.opened_at < (v_today + 1)::timestamp at time zone 'Europe/Paris'),
      'focus_used', public.cards_focus_used(p_user, p_now),
      'last', (select jsonb_build_object('at', p.opened_at, 'pack_no', coalesce(p.seq, 0), 'cards', p.cards)
                 from public.cards_packs p where p.user_id = p_user order by p.seq desc nulls last, p.opened_at desc, p.id desc limit 1),
      'new_in_last', (select coalesce(p.new_count, 0) from public.cards_packs p where p.user_id = p_user order by p.seq desc nulls last, p.opened_at desc, p.id desc limit 1));
  end
  $f$;

  -- ---------- the openings ----------
  drop function if exists public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text);

  -- p_draws: a jsonb array of 1 or 5 objects {"c": [5 card numbers], "g": golden fifth card or null, "u": Gold fifth card or null}. All of it was
  -- drawn on the server with crypto.randomInt; this function only chooses among it, by the rules of the player's state under the lock.
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
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    if p_source is null or p_source not in ('stock', 'daily', 'focus', 'shards') then raise exception 'cards: source'; end if;
    if p_draws is null or jsonb_typeof(p_draws) <> 'array' then raise exception 'cards: pack'; end if;
    v_n := jsonb_array_length(p_draws);
    if v_n not in (1, 5) or (v_n = 5 and p_source <> 'stock') then raise exception 'cards: pack'; end if;
    v_theme := case when p_source in ('stock', 'shards') then coalesce(p_theme, 'all') else null end;
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
      v_newn := 0;
      v_cards_out := '[]'::jsonb;
      for v_k in 1..5 loop
        v_card := v_cards[v_k];
        select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
        if v_c.part in (1, 2) then
          select h.card_no into v_pick from public.cards_catalog h where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part = 3 - v_c.part and h.in_packs;
          if v_pick is not null then
            v_own_c := exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
            v_own_p := exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_pick);
            if v_own_c and not v_own_p then
              v_card := v_pick;
              v_cards[v_k] := v_pick;
              select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
            end if;
          end if;
        end if;
        v_new := not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
        v_pair := false;
        if v_new and v_c.part in (1, 2) then
          v_pair := exists (select 1 from public.cards_catalog h join public.cards_owned o on o.card_no = h.card_no and o.user_id = p_user
                             where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part = 3 - v_c.part);
        end if;
        if v_new then v_newn := v_newn + 1; end if;
        insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source, seen)
        values (p_user, v_card, 1, p_now, p_now, v_packno, 'pack', false)
        on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
        v_cards_out := v_cards_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new, 'completesPair', v_pair,
                                                                           'golden', v_k = 5 and v_golden, 'guarantee', v_k = 5 and v_pity));
      end loop;
      delete from public.cards_wishlist where user_id = p_user and card_no = any (v_cards);

      insert into public.cards_packs (user_id, source, cards, opened_at, focus, new_count, seq, theme, golden, guarantee, batch)
      values (p_user, case when p_source = 'focus' then 'stock' else p_source end, v_cards, p_now, case when p_source = 'focus' then p_focus else null end,
              v_newn, v_packno, case when p_source = 'daily' then 'daily' when p_source = 'focus' then 'focus' else v_theme end, v_golden, v_pity,
              case when v_n > 1 then v_batch else null end)
      returning id into v_pack;
      v_pack_ids := v_pack_ids || to_jsonb(v_pack::text);
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'id', v_pack, 'pack_no', v_packno, 'source', p_source, 'theme', case when p_source = 'daily' then 'daily' when p_source = 'focus' then 'focus' else v_theme end,
        'group', v_group, 'golden', v_golden, 'guarantee', v_pity, 'cards', v_cards_out, 'new_count', v_newn));
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

  -- ---------- craft ----------
  drop function if exists public.cards_craft(uuid, integer, timestamptz);
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
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    select c.rarity into v_rarity
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
    select coalesce(array_agg(x.set_id), '{}') into v_after from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    select coalesce(jsonb_agg(jsonb_build_object('id', x.set_id, 'name', coalesce(x.name, case x.kind when 'solo' then 'Soloists' when 'holo' then 'Every Holo card' when 'gold' then 'Every Gold card' else 'Debut ' || x.name end), 'packs', x.packs)
                             order by x.set_id), '[]'::jsonb)
      into v_fin from public.cards_goals_progress(p_user, null) x where x.set_id = any (v_after) and not (x.set_id = any (v_before));
    v_out := jsonb_build_object('replayed', false, 'card_no', p_card_no, 'rarity', v_rarity, 'cost', v_cost, 'shards', w.shards - v_cost, 'finished', v_fin);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_out, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'craft', p_key, jsonb_build_object('card_no', p_card_no, 'cost', v_cost), p_now);
    return v_out;
  end
  $f$;

  -- ---------- the rewarded ad ----------
  drop function if exists public.cards_ad_grant(uuid, uuid, timestamptz, integer, integer, integer);
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

  -- ---------- recycle ----------
  drop function if exists public.cards_recycle(uuid, timestamptz);
  -- p_n null: every extra copy (copies above 1) of the unlocked cards that are neither Gold nor Full Art; one copy of each card stays. p_n set: one
  -- extra copy of that card, any edition, never a locked card, never the last copy. Shards: Standard 1, Stage 2, Holo 5, Era 12, Gold 30, Full Art 80.
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

  create or replace function public.cards_lock(p_user uuid, p_card_no integer, p_on boolean, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_n integer;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    update public.cards_owned set locked = coalesce(p_on, false) where user_id = p_user and card_no = p_card_no;
    get diagnostics v_n = row_count;
    if v_n = 0 then raise exception 'cards: notowned'; end if;
    select count(*) into v_n from public.cards_owned where user_id = p_user and locked;
    return jsonb_build_object('n', p_card_no, 'locked', coalesce(p_on, false), 'locks', v_n);
  end
  $f$;

  create or replace function public.cards_seen(p_user uuid, p_cards integer[])
    returns integer
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_n integer;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_cards is not null and cardinality(p_cards) > 0 and cardinality(p_cards) <= 500 then
      update public.cards_owned set seen = true where user_id = p_user and card_no = any (p_cards) and not seen;
    end if;
    select count(*) into v_n from public.cards_owned where user_id = p_user and not seen;
    return v_n;
  end
  $f$;

  -- The quiet check. It accrues the packs the timer earned up to the pause, then restarts the timer from now. It takes nothing, whatever its state.
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

  -- ---------- grants ----------
  revoke all on function public.cards_theme_of(text) from public, anon, authenticated;
  revoke all on function public.cards_in_pool(integer, text, text) from public, anon, authenticated;
  revoke all on function public.cards_pool_has(text, text, text[]) from public, anon, authenticated;
  revoke all on function public.cards_daily_group(date) from public, anon, authenticated;
  revoke all on function public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_pity_count(uuid) from public, anon, authenticated;
  revoke all on function public.cards_wallet(uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_player(uuid, timestamptz, integer) from public, anon, authenticated;
  revoke all on function public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_craft(uuid, text, integer, timestamptz, integer) from public, anon, authenticated;
  revoke all on function public.cards_ad_grant(uuid, text, uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.cards_recycle(uuid, text, integer, timestamptz, integer) from public, anon, authenticated;
  revoke all on function public.cards_lock(uuid, integer, boolean, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_seen(uuid, integer[]) from public, anon, authenticated;
  revoke all on function public.cards_still_there(uuid, timestamptz, integer) from public, anon, authenticated;
  grant execute on function public.cards_theme_of(text) to service_role;
  grant execute on function public.cards_in_pool(integer, text, text) to service_role;
  grant execute on function public.cards_pool_has(text, text, text[]) to service_role;
  grant execute on function public.cards_daily_group(date) to service_role;
  grant execute on function public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz) to service_role;
  grant execute on function public.cards_pity_count(uuid) to service_role;
  grant execute on function public.cards_wallet(uuid, timestamptz, integer, integer, integer) to service_role;
  grant execute on function public.cards_player(uuid, timestamptz, integer) to service_role;
  grant execute on function public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer) to service_role;
  grant execute on function public.cards_craft(uuid, text, integer, timestamptz, integer) to service_role;
  grant execute on function public.cards_ad_grant(uuid, text, uuid, timestamptz, integer, integer, integer) to service_role;
  grant execute on function public.cards_recycle(uuid, text, integer, timestamptz, integer) to service_role;
  grant execute on function public.cards_lock(uuid, integer, boolean, timestamptz) to service_role;
  grant execute on function public.cards_seen(uuid, integer[]) to service_role;
  grant execute on function public.cards_still_there(uuid, timestamptz, integer) to service_role;

  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_wallet') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_roll') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_open') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_craft') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_ad_grant') <> 1 then
    raise exception '110-core: cards_roll, cards_wallet, cards_open, cards_craft and cards_ad_grant must each exist once';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'cards_group_types' and not rowsecurity) then
    raise exception '110-core: cards_group_types has row level security off';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_group_types' and grantee in ('anon', 'authenticated', 'PUBLIC')) then
    raise exception '110-core: cards_group_types is granted to a browser role';
  end if;

  notify pgrst, 'reload schema';
end $c110$;
