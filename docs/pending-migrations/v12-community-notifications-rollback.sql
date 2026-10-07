-- Rollback of docs/pending-migrations/v12-community-notifications.sql.
-- Removes the community notifications (both types), the grouping columns and index, the
-- retract function, and puts back the gate function and the 3-report trigger function as
-- v12-community-comments.sql left them.

begin;

-- the 3-report trigger function as v12-community-comments.sql left it
create or replace function public.community_autohide_on_report() returns trigger
language plpgsql set search_path = public as $$
declare
  n integer;
  prev text;
begin
  if new.reporter is null or new.status <> 'open'
     or new.target_type not in ('comment', 'thread', 'essay', 'debate', 'challenge', 'reply', 'debate_vote') then
    return new;
  end if;
  if new.target_type = 'debate_vote' then
    if new.target_ref is null or new.target_ref !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return new;
    end if;
    select count(distinct reporter) into n from verse_flags
     where target_type = 'debate_vote' and target_ref = new.target_ref and status = 'open' and reporter is not null;
    if n < 3 then
      return new;
    end if;
    update debate_votes set comment_hidden_at = now()
     where id = new.target_ref::uuid and comment_hidden_at is null and comment is not null
     returning 'visible' into prev;
    if prev is not null then
      insert into community_autohidden (target_type, target_id, target_ref, prev_status, reports)
      values ('debate_vote', 0, new.target_ref, prev, n);
    end if;
    return new;
  end if;
  select count(distinct reporter) into n from verse_flags
   where target_type = new.target_type and target_id = new.target_id and status = 'open' and reporter is not null;
  if n < 3 then
    return new;
  end if;
  if new.target_type = 'thread' then
    update verse_threads set status = 'hidden', updated_at = now() where id = new.target_id and status = 'visible' returning 'visible' into prev;
  elsif new.target_type = 'essay' then
    update verse_essays set status = 'hidden', updated_at = now() where id = new.target_id and status = 'featured' returning 'featured' into prev;
  elsif new.target_type = 'comment' then
    update verse_discussions set status = 'hidden', updated_at = now() where id = new.target_id and status = 'visible' returning 'visible' into prev;
  elsif new.target_type = 'debate' then
    update community_debates set status = 'hidden' where id = new.target_id and status = 'visible' returning 'visible' into prev;
  elsif new.target_type = 'challenge' then
    update community_challenges set status = 'hidden' where id = new.target_id and status = 'visible' returning 'visible' into prev;
  elsif new.target_type = 'reply' then
    update community_replies set status = 'hidden' where id = new.target_id and status = 'visible' returning 'visible' into prev;
  end if;
  if prev is not null then
    insert into community_autohidden (target_type, target_id, prev_status, reports) values (new.target_type, new.target_id, prev, n);
  end if;
  return new;
end;
$$;

drop function if exists public.community_notifications_retract(text);

-- the gate function as mig-122 left it
create or replace function public.gate_notification_prefs() returns trigger
language plpgsql security definer set search_path = public as $$
DECLARE
  cat TEXT;
  prefs public.notification_prefs%ROWTYPE;
BEGIN
  cat := CASE NEW.type
    WHEN 'milestone' THEN 'your_quizzes'
    WHEN 'rating' THEN 'your_quizzes'
    WHEN 'comment' THEN 'your_quizzes'
    WHEN 'new_follower' THEN 'social'
    WHEN 'cheer' THEN 'social'
    WHEN 'battle_beaten' THEN 'social'
    WHEN 'verse_watch' THEN 'social'
    WHEN 'badge_earned' THEN 'achievements'
    WHEN 'group_mastered' THEN 'achievements'
    WHEN 'streak_milestone' THEN 'achievements'
    WHEN 'followed_new_quiz' THEN 'following'
    WHEN 'admin_dm' THEN 'announcements'
    ELSE NULL
  END;

  SELECT * INTO prefs FROM public.notification_prefs WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF cat IS NOT NULL AND (prefs.categories->>cat) = 'false' THEN
    RETURN NULL;
  END IF;
  IF NEW.quiz_id IS NOT NULL AND NEW.quiz_id = ANY(prefs.quiz_mutes) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END $$;

-- the community notifications themselves, then the columns, indexes and type check
delete from public.creator_notifications where type in ('community_reply', 'community_comment');
drop index if exists public.creator_notifications_sources_idx;
drop index if exists public.creator_notifications_one_unread_group;
alter table public.creator_notifications drop column if exists sources;
alter table public.creator_notifications drop column if exists group_key;
alter table public.creator_notifications drop constraint creator_notifications_type_check;
alter table public.creator_notifications add constraint creator_notifications_type_check
  check (type = any (array['milestone', 'rating', 'comment', 'admin_dm', 'new_follower', 'streak_milestone', 'group_mastered', 'followed_new_quiz', 'badge_earned', 'cheer', 'verse_watch', 'battle_beaten']));

commit;
