-- 104 - Badge award wiring (M1.15 final). Grants for the badges whose art shipped
-- in 101/102, plus the two definitions that never had a row (group_master,
-- founding_fan).
--
-- Every grant rides a signal that ALREADY fires, so no new hot-path query:
--   group_master  -> the same player_group_mastery.mastered false->true edge that
--                    mig 096 already triggers a notification on
--   creator_*     -> profiles.total_plays_received, which record_play (mig 002)
--                    already increments on every play
--   streak_*      -> granted from the awardDailyStreak path (lib/daily-streak.ts)
--                    via grant_streak_badges, only on a milestone day
--   founding_fan  -> the one-off backfill at the bottom. There is deliberately NO
--                    grant path for it, so it can never be earned again.
--
-- Every insert is ON CONFLICT DO NOTHING against user_badges' UNIQUE(user_id,
-- badge_id) from mig 009, so all paths are idempotent: a badge is granted at most
-- once per user no matter how often the signal repeats.

-- 1. The two definitions that had art but no row ----------------------------
insert into public.badge_definitions
  (id, name, description, icon_type, color_bg, color_stroke, color_text, sort_order, icon) values
  ('group_master', 'Group master', 'Master a group: 80% accuracy over 30+ questions', 'crown', '#FAEEDA', '#EF9F27', '#633806', 12, '/badges/group_mastered.png'),
  ('founding_fan', 'Founding fan', 'Here before it was cool', 'gem', '#FBEAF0', '#ED93B1', '#72243E', 13, '/badges/founding_fan.png')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon_type = excluded.icon_type,
  color_bg = excluded.color_bg,
  color_stroke = excluded.color_stroke,
  color_text = excluded.color_text,
  sort_order = excluded.sort_order,
  icon = excluded.icon;

-- 2. group_master: fires on the first mastery crossing only ------------------
-- Same WHEN clause as mig 096's notification trigger, so it is once-per-group and
-- costs nothing on ordinary plays (the mastered flag is the marker).
create or replace function public.grant_group_master_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_badges (user_id, badge_id)
  values (new.player_id, 'group_master')
  on conflict do nothing;
  return null;
end;
$$;

drop trigger if exists trg_grant_group_master on public.player_group_mastery;
create trigger trg_grant_group_master
  after update of mastered on public.player_group_mastery
  for each row
  when (old.mastered is distinct from new.mastered and new.mastered = true)
  execute function public.grant_group_master_badge();

-- 3. creator tiers: HIGHEST TIER ONLY ---------------------------------------
-- The WHEN clause keeps the function from running at all until a creator is past
-- the first threshold, so the ~99% of plays belonging to smaller creators pay
-- literally nothing.
create or replace function public.grant_creator_tier_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge text;
begin
  v_badge := case
    when new.total_plays_received >= 10000 then 'creator_gold'
    when new.total_plays_received >= 1000  then 'creator_silver'
    when new.total_plays_received >= 100   then 'creator_bronze'
    else null
  end;
  if v_badge is null then
    return null;
  end if;
  insert into public.user_badges (user_id, badge_id)
  values (new.id, v_badge)
  on conflict do nothing;
  return null;
end;
$$;

drop trigger if exists trg_grant_creator_tier on public.profiles;
create trigger trg_grant_creator_tier
  after update of total_plays_received on public.profiles
  for each row
  when (
    new.total_plays_received is distinct from old.total_plays_received
    and new.total_plays_received >= 100
  )
  execute function public.grant_creator_tier_badge();

-- 4. streak badges: called from awardDailyStreak on a milestone day ----------
-- Cumulative: reaching 100 implies 7 and 30 were passed, and the unique
-- constraint makes re-granting a no-op, so this is safe to call repeatedly.
create or replace function public.grant_streak_badges(p_user_id uuid, p_streak int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_streak >= 7 then
    insert into public.user_badges (user_id, badge_id) values (p_user_id, 'streak_7')
    on conflict do nothing;
  end if;
  if p_streak >= 30 then
    insert into public.user_badges (user_id, badge_id) values (p_user_id, 'streak_30')
    on conflict do nothing;
  end if;
  if p_streak >= 100 then
    insert into public.user_badges (user_id, badge_id) values (p_user_id, 'streak_100')
    on conflict do nothing;
  end if;
end;
$$;

-- Server-only (called with the service-role client), matching the mig 081/082
-- lockdown posture.
revoke execute on function public.grant_streak_badges(uuid, int) from anon, authenticated;

-- 5. founding_fan: ONE-OFF backfill to every existing account ----------------
-- No trigger, no function, no grant path anywhere: after this statement the badge
-- is permanently un-earnable, which is the point.
insert into public.user_badges (user_id, badge_id)
select id, 'founding_fan' from public.profiles
on conflict do nothing;

-- 6. Retro-grant the tier badges to accounts that already qualify ------------
-- Without this, existing big creators would have to receive one more play before
-- the trigger ever fires. Highest tier only, same rule as the trigger.
insert into public.user_badges (user_id, badge_id)
select id,
  case
    when total_plays_received >= 10000 then 'creator_gold'
    when total_plays_received >= 1000  then 'creator_silver'
    else 'creator_bronze'
  end
from public.profiles
where total_plays_received >= 100
on conflict do nothing;

-- Same idea for anyone already sitting on a mastered group or a long streak.
insert into public.user_badges (user_id, badge_id)
select distinct player_id, 'group_master'
from public.player_group_mastery
where mastered = true
on conflict do nothing;

insert into public.user_badges (user_id, badge_id)
select id, 'streak_7' from public.profiles where coalesce(daily_streak_longest, daily_streak, 0) >= 7
on conflict do nothing;
insert into public.user_badges (user_id, badge_id)
select id, 'streak_30' from public.profiles where coalesce(daily_streak_longest, daily_streak, 0) >= 30
on conflict do nothing;
insert into public.user_badges (user_id, badge_id)
select id, 'streak_100' from public.profiles where coalesce(daily_streak_longest, daily_streak, 0) >= 100
on conflict do nothing;
