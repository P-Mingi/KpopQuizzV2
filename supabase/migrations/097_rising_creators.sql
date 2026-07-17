-- 097 - Rising creators aggregate (Workstream M, M1.21). The discovery signal for
-- the Community hub: who gained the most new followers recently. ONE set-based
-- aggregate over follows, index-backed by follows(followed_id, created_at) from
-- mig 093. NANO-cheap, no scan. The page then hydrates the top ids with a single
-- profiles IN (...) read. Public data only; a plain STABLE read, callable by the
-- anon role (createPublicReadClient) so /leaderboard stays static/ISR.
create or replace function public.get_rising_creators(p_days int default 7, p_limit int default 12)
returns table(followed_id uuid, new_followers bigint)
language sql
stable
as $$
  select f.followed_id, count(*) as new_followers
  from public.follows f
  where f.created_at > now() - (p_days || ' days')::interval
  group by f.followed_id
  order by new_followers desc
  limit p_limit;
$$;

grant execute on function public.get_rising_creators(int, int) to anon, authenticated;
