-- 122-pulls-feed.sql (Bunnyverse Cards, lot LAUNCH-PREP, 2026-11-17; the live feed of Holo and above pulls on the community page of kpopquiz.org)
--
-- What:   in ONE DO block:
--           index     cards_packs_opened_idx            cards_packs (opened_at desc), so the feed reads the newest packs without a scan
--           function  cards_pulls_recent(limit, since)  the newest cards of rarity Holo, Era, Gold or Full Art that players pulled from a pack,
--                                                       as a jsonb array, newest first: user_id (the server drops it before any page), handle, num,
--                                                       rarity, name (the idol or the group of the card), group (its group line, or null), at
-- Why:    the community page of kpopquiz.org shows what fans pull, like its "Happening now" feed. The page never shows a private fan.
-- Who may appear (the rule of "Top fans this week", lib/site/hub/data/top-fans.ts, fails closed): a player with a nickname (profiles.username),
--         not banned, who holds a PUBLIC STAMP: world_memberships.show_elsewhere true on an activated, not banned membership of kpop or anime
--         (default false, so a fan appears only after choosing it). A Team account (editorial_accounts, any row) never appears. The server filters
--         again with getTeamIds (lib/editorial/accounts.ts) and checks every row once more (lib/cards-bridge/pulls.ts).
-- Rows:   0 rows written. 1 index, 1 function. Additive. Reads cards_packs, cards_catalog, cards_entities, profiles, world_memberships and
--         editorial_accounts. Demo cards and panoramas are not packs and never appear. The function is read only (stable).
-- Needs:  001 (cards_packs, cards_catalog, cards_entities), the app's profiles table, 003 of multisite (world_memberships) and the table
--         editorial_accounts. Without one of them the file stops and nothing changes.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_pulls_recent';   expect 1
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cards_pulls_recent';   expect f
-- Verify: select has_function_privilege('service_role', 'public.cards_pulls_recent(integer, timestamptz)', 'execute');   expect t
-- Verify: select count(*) from pg_indexes where schemaname = 'public' and indexname = 'cards_packs_opened_idx';   expect 1
-- Verify: select count(*) from jsonb_array_elements(public.cards_pulls_recent(50, now() - interval '3650 days')) e where e->>'rarity' in ('C', 'U');   expect 0
-- Undo:   122-pulls-feed.rollback.sql (drops the function and the index; nothing else changes)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c122$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_packs') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_entities') is null then
    raise exception '122-pulls-feed: run 001-schema.sql first';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception '122-pulls-feed: the profiles table is missing';
  end if;
  if to_regclass('public.world_memberships') is null then
    raise exception '122-pulls-feed: the world_memberships table is missing (multisite 003)';
  end if;
  if to_regclass('public.editorial_accounts') is null then
    raise exception '122-pulls-feed: the editorial_accounts table is missing';
  end if;

  create index if not exists cards_packs_opened_idx on public.cards_packs (opened_at desc);

  create or replace function public.cards_pulls_recent(p_limit integer default 20, p_since timestamptz default null)
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    v_lim integer := greatest(1, least(coalesce(p_limit, 20), 100));
    v_since timestamptz := coalesce(p_since, now() - interval '72 hours');
    v_out jsonb;
  begin
    select coalesce(jsonb_agg(jsonb_build_object(
             'user_id', x.user_id, 'handle', x.handle, 'num', x.num, 'rarity', x.rarity, 'name', x.name, 'group', x.grp, 'at', x.at)
             order by x.at desc, x.num), '[]'::jsonb)
      into v_out
      from (
        select k.user_id, pr.username as handle, c.num, c.rarity, e.name, g.name as grp, k.opened_at as at
          from public.cards_packs k
          cross join lateral unnest(k.cards) as u(card_no)
          join public.cards_catalog c on c.card_no = u.card_no
          join public.cards_entities e on e.id = c.entity_id
          left join public.cards_entities g on g.id = e.group_id
          join public.profiles pr on pr.id = k.user_id
         where k.opened_at >= v_since
           and c.rarity in ('R', 'SR', 'UR', 'L')
           and pr.username is not null and btrim(pr.username) <> '' and pr.banned_at is null
           and exists (select 1 from public.world_memberships m
                        where m.user_id = k.user_id and m.site_id in ('kpop', 'anime')
                          and m.show_elsewhere and m.activated_at is not null and m.banned_at is null)
           and not exists (select 1 from public.editorial_accounts t where t.user_id = k.user_id)
         order by k.opened_at desc, c.num
         limit v_lim) x;
    return v_out;
  end
  $f$;

  revoke all on function public.cards_pulls_recent(integer, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_pulls_recent(integer, timestamptz) to service_role;

  notify pgrst, 'reload schema';
end $c122$;
