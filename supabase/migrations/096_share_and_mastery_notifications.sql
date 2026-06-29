-- 096 - Share-to-followers + self-milestone notifications (Workstream M, M1.11).
-- Extends the ONE notification system (creator_notifications). No parallel pipeline.

-- ============================================================================
-- PART 1: fan out followed_new_quiz to a creator's followers on publish.
-- SET-BASED (one INSERT ... SELECT), capped, de-duped, anti mass-publish guarded.
-- Called from the publish path via service role (which also gates on
-- COMMUNITY_FEATURES_ENABLED). NANO-safe: no per-follower round trips.
-- ============================================================================
create or replace function public.fanout_followed_new_quiz(
  p_creator_id uuid,
  p_quiz_id    uuid,
  p_quiz_title text,
  p_quiz_slug  text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent   int;
  v_name     text;
  v_inserted int;
begin
  -- Anti mass-publish: if the creator flooded recently, skip the fan-out.
  select count(*) into v_recent from public.quizzes
    where creator_id = p_creator_id and status = 'published' and created_at > now() - interval '24 hours';
  if v_recent > 10 then
    return 0;
  end if;

  select username into v_name from public.profiles where id = p_creator_id;

  -- One set-based statement: cap the follower fan-out, de-dupe per (follower, quiz).
  insert into public.creator_notifications (user_id, type, title, body, quiz_id, link_url)
  select f.follower_id,
         'followed_new_quiz',
         coalesce(v_name, 'A creator') || ' posted a new quiz',
         left(coalesce(p_quiz_title, ''), 120),
         p_quiz_id,
         '/q/' || p_quiz_slug
  from public.follows f
  where f.followed_id = p_creator_id
    and not exists (
      select 1 from public.creator_notifications n
      where n.user_id = f.follower_id and n.type = 'followed_new_quiz' and n.quiz_id = p_quiz_id
    )
  limit 10000;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke execute on function public.fanout_followed_new_quiz(uuid, uuid, text, text) from anon, authenticated;

-- ============================================================================
-- PART 2: group_mastered self-notification on the CROSSING. record_play /
-- record_bt_play (mig 092) already flip player_group_mastery.mastered false ->
-- true exactly once per group when MASTERY (30 plays / 80%) is first reached. This
-- trigger fires on that transition only, so it is once-per-group-ever (the flag is
-- the marker) and costs nothing on ordinary plays. SQL-level, so it is independent
-- of the COMMUNITY_FEATURES_ENABLED env flag (a personal milestone, not community
-- chatter).
-- ============================================================================
create or replace function public.notify_group_mastered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_slug text;
begin
  select name, slug into v_name, v_slug from public.groups where id = new.group_id;
  insert into public.creator_notifications (user_id, type, title, body, link_url)
  values (
    new.player_id,
    'group_mastered',
    'You mastered ' || coalesce(v_name, 'a group') || '!',
    'Reached 80% accuracy over 30+ questions.',
    case when v_slug is not null then '/' || v_slug || '-quiz' else null end
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_group_mastered on public.player_group_mastery;
create trigger trg_notify_group_mastered
  after update of mastered on public.player_group_mastery
  for each row
  when (old.mastered is distinct from new.mastered and new.mastered = true)
  execute function public.notify_group_mastered();

revoke execute on function public.notify_group_mastered() from anon, authenticated;
