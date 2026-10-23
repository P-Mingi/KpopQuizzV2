-- OWNER-GATED. Creates public.get_rising_creators, which the site already calls but which was
-- never created in production (supabase/migrations/097_rising_creators.sql is in the repo, not
-- applied): every call answers 404 (PGRST202), several times an hour.
--
-- Who calls it: getRisingCreators() in apps/quiz/src/lib/db/queries/community.ts, used by
--   - /leaderboard (Community, flag on): the "Rising" view of the creator boards
--     (lib/ux-v1/p9/data.ts, readCreators), cached and regenerated through the day;
--   - /verse/community and /leaderboard with the flag off (CommunityContent, Hall of Fame
--     "Rising" tab), revalidated every 5 minutes.
-- On the 404 the code gets no rows and the "Rising" view or tab is hidden (boards show from
-- 4 rows); nothing breaks on screen, the calls just fail.
--
-- Same function as 097 (most new followers in the last p_days days), hardened:
--   - SECURITY INVOKER (default) and STABLE: it reads public.follows with the caller's rights;
--     follows is readable by everyone (policy follows_select_all), so anon gets the same rows;
--   - set search_path = public (no mutable search path);
--   - p_days clamped to 1..90 and p_limit to 1..50, so a caller cannot ask for huge results;
--   - index-backed by follows_followed_idx (followed_id, created_at desc), already in production.
-- Rollback: rising-creators-rollback.sql (drops the function; the site goes back to the 404).

create or replace function public.get_rising_creators(p_days int default 7, p_limit int default 12)
returns table(followed_id uuid, new_followers bigint)
language sql
stable
set search_path = public
as $$
  select f.followed_id, count(*) as new_followers
  from public.follows f
  where f.created_at > now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 90))
  group by f.followed_id
  order by new_followers desc, f.followed_id
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_rising_creators(int, int) from public;
grant execute on function public.get_rising_creators(int, int) to anon, authenticated, service_role;

-- Checks (read only): the function exists and answers.
select proname, pg_get_function_identity_arguments(oid) as args from pg_proc where proname = 'get_rising_creators';
select * from public.get_rising_creators(7, 8);
