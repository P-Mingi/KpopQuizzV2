-- 128-admin-stats.sql (KpopCards launch, 2026-11-23; the KpopCards tab of the admin of bunnyverse.org/anime: one row per player, with filters)
--
-- What:   in ONE DO block, one function, read only:
--           cards_admin_stats(search, window, ads, min_packs, sort, dir, limit, offset)   NEW, one jsonb answer: "totals" (players, packs opened all time, today
--                              and in the last 7 days, ads watched all time and today, cards in the packs of the catalog, the average collection percent),
--                              "total" (how many players pass the filters, for the pagination) and "rows" (one page of players, ordered).
--         A row holds only a nickname and game figures: nickname (profiles.username, null when the account has none), first_seen (the wallet's
--         created_at), last_seen (the wallet's seen_at), last_pack (the newest pack), level (1 + distinct cards owned div 10, the rule of
--         KC.CARDS_PER_LEVEL), packs (rows of cards_packs), packs_7d, the packs by source (src_stock: the stack, fed by the timer, ads and missions, without a
--         focus; src_focus: the stack, opened on a group; src_daily; src_shards: opened with 50 shards; src_bonus: the quiz and Kpopdle bonus; src_ad: the old
--         ad pack), golden, guarantee, cards (distinct cards owned), cards_in_packs, pct (distinct owned cards that are in the packs, over the cards in the
--         packs, one decimal), copies (all copies), dupes (copies minus distinct cards), shards (the wallet), ads (ad packs granted: cards_ad_events
--         granted, plus shard ads: cards_audit kind ad), crafted (cards_crafts), recycled (copies recycled, summed from cards_audit kind recycle).
--         No e-mail, no birth date, no IP and no account id leaves the function.
--         Filters: search (a part of the nickname, any case), window (all, 24h, 7d, 30d: last_seen inside it), ads (any, yes, no), min_packs.
--         Sort: a whitelist (username, first_seen, last_seen, last_pack, level, packs, packs_7d, src_stock, src_focus, src_daily, src_shards, src_bonus,
--         src_ad, golden, guarantee, cards, pct, copies, dupes, shards, ads, crafted, recycled) and dir (asc, desc); anything else is an exception. The sort
--         is a CASE over the whitelist: no SQL is built from the input. limit is held between 1 and 200, offset at 0 or more.
-- Why:    the owner's request of 2026-11-23: an admin page of all the KpopCards figures, by account, with filters. Per-account totals over every
--         player cannot be read through PostgREST (the 1000-row cap), so the page calls this one function with the service role.
-- Rows:   0 rows written. No table, column, index or policy is touched. One function, read only (stable, no UPDATE, no DELETE).
-- Needs:  001 (cards_wallets, cards_owned, cards_packs, cards_catalog), 104 (cards_crafts, cards_wallets.created_at), 105 (cards_audit), 121 (cards_ad_events)
--         and the app's profiles table. Without one of them the file stops and nothing changes.
-- Errors: an exception for a window, ads, sort or dir outside the lists, naming the argument.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_admin_stats';   expect 1
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cards_admin_stats';   expect false
-- Verify: select has_function_privilege('service_role', 'public.cards_admin_stats(text, text, text, integer, text, text, integer, integer)', 'execute');   expect true
-- Verify: select (public.cards_admin_stats(null, 'all', 'any', 0, 'packs', 'desc', 1, 0) -> 'totals' ->> 'players')::int = (select count(*) from public.cards_wallets);   expect true
-- Undo:   128-admin-stats.rollback.sql (drops the function; no data to undo)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c128$
begin
  perform set_config('lock_timeout', '5s', true);

  if to_regclass('public.cards_wallets') is null or to_regclass('public.cards_owned') is null or to_regclass('public.cards_packs') is null or to_regclass('public.cards_catalog') is null then
    raise exception '128-admin-stats: run 001-schema.sql first';
  end if;
  if to_regclass('public.cards_crafts') is null or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_wallets' and column_name = 'created_at') then
    raise exception '128-admin-stats: run 104-economy.sql and 110-core.sql first';
  end if;
  if to_regclass('public.cards_audit') is null then
    raise exception '128-admin-stats: run 105-goals.sql first (cards_audit is missing)';
  end if;
  if to_regclass('public.cards_ad_events') is null then
    raise exception '128-admin-stats: run 121-ad-packs.sql first (cards_ad_events is missing)';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception '128-admin-stats: the profiles table is missing';
  end if;

  create or replace function public.cards_admin_stats(
      p_search text default null, p_window text default 'all', p_ads text default 'any', p_min_packs integer default 0,
      p_sort text default 'last_seen', p_dir text default 'desc', p_limit integer default 50, p_offset integer default 0)
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    v_now timestamptz := now();
    v_today timestamptz := ((now() at time zone 'Europe/Paris')::date)::timestamp at time zone 'Europe/Paris';
    v_window text := coalesce(p_window, 'all');
    v_ads text := coalesce(p_ads, 'any');
    v_sort text := coalesce(p_sort, 'last_seen');
    v_dir text := lower(coalesce(p_dir, 'desc'));
    v_min integer := greatest(coalesce(p_min_packs, 0), 0);
    v_lim integer := greatest(1, least(coalesce(p_limit, 50), 200));
    v_off integer := greatest(coalesce(p_offset, 0), 0);
    v_since timestamptz;
    v_like text;
    v_in_packs integer;
    v_out jsonb;
  begin
    if v_window not in ('all', '24h', '7d', '30d') then raise exception 'cards_admin_stats: window'; end if;
    if v_ads not in ('any', 'yes', 'no') then raise exception 'cards_admin_stats: ads'; end if;
    if v_dir not in ('asc', 'desc') then raise exception 'cards_admin_stats: dir'; end if;
    if v_sort not in ('username', 'first_seen', 'last_seen', 'last_pack', 'level', 'packs', 'packs_7d', 'src_stock', 'src_focus', 'src_daily', 'src_shards', 'src_bonus',
                      'src_ad', 'golden', 'guarantee', 'cards', 'pct', 'copies', 'dupes', 'shards', 'ads', 'crafted', 'recycled') then
      raise exception 'cards_admin_stats: sort';
    end if;
    v_since := case v_window when '24h' then v_now - interval '24 hours' when '7d' then v_now - interval '7 days' when '30d' then v_now - interval '30 days' else null end;
    v_like := case when p_search is null or btrim(p_search) = '' then null
                   else '%' || replace(replace(replace(lower(left(btrim(p_search), 64)), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
    select count(*) into v_in_packs from public.cards_catalog c where c.in_packs;

    with
    pk as (
      select k.user_id,
             count(*)::integer as packs,
             count(*) filter (where k.opened_at >= v_now - interval '7 days')::integer as packs_7d,
             count(*) filter (where k.source = 'stock' and k.focus is null)::integer as src_stock,
             count(*) filter (where k.source = 'stock' and k.focus is not null)::integer as src_focus,
             count(*) filter (where k.source = 'daily')::integer as src_daily,
             count(*) filter (where k.source = 'shards')::integer as src_shards,
             count(*) filter (where k.source = 'bonus')::integer as src_bonus,
             count(*) filter (where k.source = 'ad')::integer as src_ad,
             count(*) filter (where k.golden)::integer as golden,
             count(*) filter (where k.guarantee)::integer as guarantee,
             max(k.opened_at) as last_pack
        from public.cards_packs k group by k.user_id),
    ow as (
      select o.user_id,
             count(*)::integer as cards,
             (count(*) filter (where c.in_packs))::integer as cards_in_packs,
             sum(o.copies)::integer as copies
        from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no group by o.user_id),
    ae as (select e.user_id, count(*)::integer as n from public.cards_ad_events e where e.granted group by e.user_id),
    sa as (select a.user_id, count(*)::integer as n from public.cards_audit a where a.kind = 'ad' group by a.user_id),
    cr as (select x.user_id, count(*)::integer as n from public.cards_crafts x group by x.user_id),
    rc as (select a.user_id, coalesce(sum((a.detail ->> 'recycled')::integer), 0)::integer as n from public.cards_audit a where a.kind = 'recycle' group by a.user_id),
    base as (
      select nullif(btrim(pr.username), '') as username,
             w.created_at as first_seen, w.seen_at as last_seen, pk.last_pack,
             1 + coalesce(ow.cards, 0) / 10 as level,
             coalesce(pk.packs, 0) as packs, coalesce(pk.packs_7d, 0) as packs_7d,
             coalesce(pk.src_stock, 0) as src_stock, coalesce(pk.src_focus, 0) as src_focus, coalesce(pk.src_daily, 0) as src_daily,
             coalesce(pk.src_shards, 0) as src_shards, coalesce(pk.src_bonus, 0) as src_bonus, coalesce(pk.src_ad, 0) as src_ad,
             coalesce(pk.golden, 0) as golden, coalesce(pk.guarantee, 0) as guarantee,
             coalesce(ow.cards, 0) as cards, coalesce(ow.cards_in_packs, 0) as cards_in_packs,
             case when v_in_packs > 0 then round(100.0 * coalesce(ow.cards_in_packs, 0) / v_in_packs, 1) else 0 end as pct,
             coalesce(ow.copies, 0) as copies, coalesce(ow.copies, 0) - coalesce(ow.cards, 0) as dupes,
             w.shards as shards, coalesce(ae.n, 0) + coalesce(sa.n, 0) as ads,
             coalesce(cr.n, 0) as crafted, coalesce(rc.n, 0) as recycled
        from public.cards_wallets w
        left join public.profiles pr on pr.id = w.user_id
        left join pk on pk.user_id = w.user_id
        left join ow on ow.user_id = w.user_id
        left join ae on ae.user_id = w.user_id
        left join sa on sa.user_id = w.user_id
        left join cr on cr.user_id = w.user_id
        left join rc on rc.user_id = w.user_id),
    flt as (
      select b.*,
             case v_sort
               when 'first_seen' then extract(epoch from b.first_seen) when 'last_seen' then extract(epoch from b.last_seen) when 'last_pack' then extract(epoch from b.last_pack)
               when 'level' then b.level when 'packs' then b.packs when 'packs_7d' then b.packs_7d when 'src_stock' then b.src_stock when 'src_focus' then b.src_focus
               when 'src_daily' then b.src_daily when 'src_shards' then b.src_shards when 'src_bonus' then b.src_bonus when 'src_ad' then b.src_ad
               when 'golden' then b.golden when 'guarantee' then b.guarantee when 'cards' then b.cards when 'pct' then b.pct when 'copies' then b.copies
               when 'dupes' then b.dupes when 'shards' then b.shards when 'ads' then b.ads when 'crafted' then b.crafted when 'recycled' then b.recycled
               else null end::numeric as sk
        from base b
       where (v_like is null or lower(b.username) like v_like escape '\')
         and (v_since is null or b.last_seen >= v_since)
         and (v_ads = 'any' or (v_ads = 'yes' and b.ads > 0) or (v_ads = 'no' and b.ads = 0))
         and b.packs >= v_min),
    ranked as (
      select f.*, row_number() over (
               order by case when v_dir = 'asc' then f.sk end asc nulls last, case when v_dir = 'desc' then f.sk end desc nulls last,
                        case when v_sort = 'username' and v_dir = 'asc' then lower(f.username) end asc nulls last,
                        case when v_sort = 'username' and v_dir = 'desc' then lower(f.username) end desc nulls last,
                        lower(f.username) asc nulls last, f.first_seen asc, f.packs desc) as rn
        from flt f)
    select jsonb_build_object(
             'totals', jsonb_build_object(
               'players', (select count(*) from base),
               'packs_total', (select count(*) from public.cards_packs),
               'packs_today', (select count(*) from public.cards_packs k where k.opened_at >= v_today),
               'packs_7d', (select count(*) from public.cards_packs k where k.opened_at >= v_now - interval '7 days'),
               'ads_total', (select count(*) from public.cards_ad_events e where e.granted) + (select count(*) from public.cards_audit a where a.kind = 'ad'),
               'ads_today', (select count(*) from public.cards_ad_events e where e.granted and e.created_at >= v_today) + (select count(*) from public.cards_audit a where a.kind = 'ad' and a.created_at >= v_today),
               'cards_in_packs', v_in_packs,
               'avg_pct', (select coalesce(round(avg(b.pct), 1), 0) from base b)),
             'total', (select count(*) from flt),
             'rows', coalesce((select jsonb_agg(jsonb_build_object(
                 'username', r.username, 'first_seen', r.first_seen, 'last_seen', r.last_seen, 'last_pack', r.last_pack, 'level', r.level,
                 'packs', r.packs, 'packs_7d', r.packs_7d, 'src_stock', r.src_stock, 'src_focus', r.src_focus, 'src_daily', r.src_daily,
                 'src_shards', r.src_shards, 'src_bonus', r.src_bonus, 'src_ad', r.src_ad, 'golden', r.golden, 'guarantee', r.guarantee,
                 'cards', r.cards, 'cards_in_packs', r.cards_in_packs, 'pct', r.pct, 'copies', r.copies, 'dupes', r.dupes, 'shards', r.shards,
                 'ads', r.ads, 'crafted', r.crafted, 'recycled', r.recycled) order by r.rn)
                 from ranked r where r.rn > v_off and r.rn <= v_off + v_lim), '[]'::jsonb),
             'limit', v_lim, 'offset', v_off, 'at', v_now)
      into v_out;
    return v_out;
  end
  $f$;

  revoke all on function public.cards_admin_stats(text, text, text, integer, text, text, integer, integer) from public, anon, authenticated;
  grant execute on function public.cards_admin_stats(text, text, text, integer, text, text, integer, integer) to service_role;

  if has_function_privilege('anon', 'public.cards_admin_stats(text, text, text, integer, text, text, integer, integer)', 'execute')
     or has_function_privilege('authenticated', 'public.cards_admin_stats(text, text, text, integer, text, text, integer, integer)', 'execute') then
    raise exception '128-admin-stats: a browser role can execute cards_admin_stats, nothing changed';
  end if;
  raise notice '128-admin-stats: cards_admin_stats is ready';
  notify pgrst, 'reload schema';
end $c128$;
