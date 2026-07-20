-- 107 - Community page v2 (F2a) read paths.
--
-- Two indexes and two aggregate RPCs. The RPCs exist so the DB returns tens of
-- rows instead of shipping thousands of play rows to the app: the war map needs
-- 14 days of plays folded into 30 group totals, which is a fold that belongs in
-- Postgres, not in Node. Same shape as get_rising_creators (mig 097).
--
-- Everything here is read-only and STABLE. No new write path, no trigger.

-- 1. Indexes -----------------------------------------------------------------

-- plays had NO created_at index: the only one is (quiz_id, score, time) from mig
-- 098. Every time-windowed community read (today's plays, the 7d war map) would
-- have been a full scan, which is exactly what NANO cannot afford as plays grows.
create index if not exists plays_created_idx
  on public.plays (created_at desc);

-- The war map joins plays -> quizzes to reach group_id, so that lookup wants the
-- quizzes side indexed by group as well.
create index if not exists quizzes_group_idx
  on public.quizzes (group_id);

-- user_badges was indexed on user_id only (mig 009), so "the latest earns"
-- sorted the whole table. Badge watch reads it every revalidate.
create index if not exists user_badges_earned_idx
  on public.user_badges (earned_at desc);

-- 2. Fandom war map ----------------------------------------------------------
-- Top groups by plays in the last 7 days, with the previous 7 days alongside so
-- the UI can show a real up/down arrow. One pass over a 14 day window.
--
-- fans_week counts DISTINCT player_id, so anonymous plays (player_id null) do
-- not inflate it: count(distinct) ignores nulls, which is the honest reading of
-- "how many fans", not "how many plays".
create or replace function public.get_fandom_war_map(p_limit int default 30)
returns table (
  group_id      int,
  name          text,
  slug          text,
  logo_url      text,
  display_color text,
  plays_week    bigint,
  fans_week     bigint,
  plays_prev    bigint
)
language sql
stable
as $$
  with windowed as (
    select q.group_id as gid, p.player_id, p.created_at
    from public.plays p
    join public.quizzes q on q.id = p.quiz_id
    where p.created_at > now() - interval '14 days'
      and q.group_id is not null
  ),
  agg as (
    select
      w.gid,
      count(*) filter (where w.created_at > now() - interval '7 days')                as plays_week,
      count(distinct w.player_id) filter (where w.created_at > now() - interval '7 days') as fans_week,
      count(*) filter (where w.created_at <= now() - interval '7 days')               as plays_prev
    from windowed w
    group by w.gid
  )
  select g.id, g.name, g.slug, g.logo_url, g.display_color,
         a.plays_week, a.fans_week, a.plays_prev
  from agg a
  join public.groups g on g.id = a.gid
  where a.plays_week > 0
  order by a.plays_week desc, g.name asc
  limit p_limit;
$$;

grant execute on function public.get_fandom_war_map(int) to anon, authenticated;

-- 3. Today in numbers --------------------------------------------------------
-- Resets at UTC midnight, which is the same boundary the daily rotation and the
-- streak use, so "today" means the same thing everywhere on the site.
--
-- masters_today reads activity_events rather than player_group_mastery: the
-- event row is already written on the mastery crossing and the table is pruned,
-- so it is a far smaller scan than the mastery table.
create or replace function public.get_today_stats()
returns table (
  plays_today     bigint,
  quizzes_today   bigint,
  masters_today   bigint,
  hot_group_slug  text,
  hot_group_name  text,
  hot_group_logo  text
)
language sql
stable
as $$
  with day_start as (
    select date_trunc('day', now() at time zone 'utc') at time zone 'utc' as t
  ),
  hot as (
    select q.group_id as gid, count(*) as c
    from public.plays p
    join public.quizzes q on q.id = p.quiz_id
    where p.created_at >= (select t from day_start)
      and q.group_id is not null
    group by q.group_id
    order by c desc
    limit 1
  )
  select
    (select count(*) from public.plays where created_at >= (select t from day_start)),
    (select count(*) from public.quizzes where created_at >= (select t from day_start)),
    (select count(*) from public.activity_events
       where event_type = 'group_mastered' and created_at >= (select t from day_start)),
    g.slug, g.name, g.logo_url
  -- Anchored on a one-row source and LEFT joined outward: early in the UTC day
  -- nothing has been played yet, and `from hot` alone would return zero rows,
  -- silently dropping the three counts instead of reporting them as 0.
  from (select 1) anchor
  left join hot on true
  left join public.groups g on g.id = hot.gid;
$$;

grant execute on function public.get_today_stats() to anon, authenticated;
