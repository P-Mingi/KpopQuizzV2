-- 105 - "You earned a badge" notification (M1.15 follow-up). Rides the ONE
-- existing notification system (creator_notifications, mig 047/083/095): same
-- table, same shape, same /api/notifications. No parallel system.
--
-- The grant paths from mig 104 are all SQL (triggers + grant_streak_badges +
-- backfills), so the notification is emitted by a trigger on user_badges rather
-- than from TS. That means every future grant notifies exactly once, no matter
-- which path awarded it, and the ON CONFLICT DO NOTHING inserts stay silent when
-- a badge is already owned.
--
-- NOTE: the 104 backfills already ran, so applying this does NOT retro-notify
-- anyone. Re-running 104 also stays silent (its inserts conflict and insert 0
-- rows, so this trigger never fires for them).

-- 1. Allow the new type (mirrors the 095 CHECK-swap pattern) ------------------
alter table public.creator_notifications
  drop constraint if exists creator_notifications_type_check;

alter table public.creator_notifications
  add constraint creator_notifications_type_check
  check (type in (
    'milestone', 'rating', 'comment', 'trending', 'admin_dm',
    'new_follower',
    'like',
    'achievement_unlocked',
    'streak_milestone',
    'group_mastered',
    'followed_new_quiz',
    'badge_earned'           -- 105: fires from the user_badges trigger below
  ));

-- 2. Notify on every new badge ----------------------------------------------
create or replace function public.notify_badge_earned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from public.badge_definitions where id = new.badge_id;

  insert into public.creator_notifications (user_id, type, title, body, link_url)
  values (
    new.user_id,
    'badge_earned',
    'Congrats, you earned a new badge!',
    coalesce(v_name, 'A new badge') || ' is now on your passport.',
    '/me'
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_badge_earned on public.user_badges;
create trigger trg_notify_badge_earned
  after insert on public.user_badges
  for each row
  execute function public.notify_badge_earned();
