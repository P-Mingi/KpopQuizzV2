-- V12 community notifications (owner request 2026-10-07), in the existing system:
-- creator_notifications (the bell), notification_prefs (the Social category, enforced by
-- the mig-122 gate trigger), no new system.
--   community_reply    "X replied to your comment"  (a reply to your comment or reply, any level)
--   community_comment  "X commented on your post"   (a comment on your thread, blog, fan debate or challenge)
-- While one is unread, the next reply to the same comment (or comment on the same post)
-- updates it ("X and 2 others replied to your comment") instead of adding a row. A reply
-- hidden by 3 reports takes its part of the notification away (the row goes when nothing is left).
--
-- ADDITIVE ONLY: no existing row is changed or deleted. One CHECK widened (old values stay
-- valid), two nullable columns (existing rows stay NULL), one partial unique index that no
-- existing row enters (group_key is NULL on all of them), the gate function taught the two
-- new types (Social), one new function, and the 3-report trigger function calling it.
-- Rollback: docs/pending-migrations/v12-community-notifications-rollback.sql

begin;

-- 1. The two types.
alter table public.creator_notifications drop constraint creator_notifications_type_check;
alter table public.creator_notifications add constraint creator_notifications_type_check
  check (type = any (array['milestone', 'rating', 'comment', 'admin_dm', 'new_follower', 'streak_milestone', 'group_mastered', 'followed_new_quiz', 'badge_earned', 'cheer', 'verse_watch', 'battle_beaten', 'community_reply', 'community_comment']));

-- 2. Grouping: group_key names what is grouped ('reply:comment:123' = replies to that
--    comment; 'post:thread:45' = comments on that post); sources lists who and what, oldest
--    first: [{ref, sender, name, excerpt, link, at}] (ref = 'comment:<id>' or 'reply:<id>').
--    One unread row per recipient and key.
alter table public.creator_notifications add column if not exists group_key text;
alter table public.creator_notifications add column if not exists sources jsonb;
create unique index if not exists creator_notifications_one_unread_group
  on public.creator_notifications (user_id, group_key)
  where is_read = false and group_key is not null;
create index if not exists creator_notifications_sources_idx
  on public.creator_notifications using gin (sources jsonb_path_ops)
  where sources is not null;

-- 3. The preference gate: both types belong to Social (same function, two lines added).
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
    WHEN 'community_reply' THEN 'social'
    WHEN 'community_comment' THEN 'social'
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

-- 4. Take a hidden comment or reply out of the notifications it is part of. The title is
--    rebuilt from what is left, as lib/ux-v1/p8/notify.ts builds it: the latest name, then
--    " and 1 other" / " and N others" (distinct senders), then the action.
create or replace function public.community_notifications_retract(p_ref text) returns void
language plpgsql set search_path = public as $$
declare
  r record;
  left_src jsonb;
  latest jsonb;
  n integer;
begin
  for r in select id, type, sources from creator_notifications
            where sources is not null and sources @> jsonb_build_array(jsonb_build_object('ref', p_ref)) loop
    select coalesce(jsonb_agg(e order by o), '[]'::jsonb) into left_src
      from jsonb_array_elements(r.sources) with ordinality as t(e, o) where e->>'ref' <> p_ref;
    if jsonb_array_length(left_src) = 0 then
      delete from creator_notifications where id = r.id;
      continue;
    end if;
    latest := left_src -> (jsonb_array_length(left_src) - 1);
    select count(distinct e->>'sender') into n from jsonb_array_elements(left_src) as t(e);
    update creator_notifications set
      sources = left_src,
      title = (latest->>'name')
        || case when n = 2 then ' and 1 other' when n > 2 then ' and ' || (n - 1) || ' others' else '' end
        || case r.type when 'community_reply' then ' replied to your comment' else ' commented on your post' end,
      body = latest->>'excerpt',
      link_url = latest->>'link',
      sender_id = nullif(latest->>'sender', '')::uuid
    where id = r.id;
  end loop;
end;
$$;
revoke all on function public.community_notifications_retract(text) from public, anon, authenticated;

-- 5. The 3-report trigger (as v12-community-comments.sql) also takes a hidden comment or
--    reply out of the notifications.
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
    if new.target_type in ('comment', 'reply') then
      perform community_notifications_retract(new.target_type || ':' || new.target_id);
    end if;
  end if;
  return new;
end;
$$;

commit;
