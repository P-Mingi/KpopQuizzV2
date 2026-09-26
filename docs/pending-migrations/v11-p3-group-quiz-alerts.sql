-- v11 P3 - group hub, empty state: "Notify me" (tell me when the first quiz of
-- this group is published). OWNER-RUN, not applied.
--
-- Note for the owner (one paragraph): a group with no published quiz (45 of the
-- 90 visible groups today) shows the v11 empty hub: "Make the first quiz" and
-- "Notify me" (DESIGN-SPEC 16.7, WIRING-MAP v10 table "Empty group (0 quizzes) |
-- NEW notify subscription (pending migration)"). Nothing stores such a wish
-- today, so this file adds ONE new table, group_quiz_alerts (one row per fan and
-- group, the fan's own rows only through RLS, nothing for anon), and ONE delivery
-- trigger on quizzes: when a quiz of that group is published, every fan waiting
-- on the group gets one in-app notification and the alert is marked sent (a
-- one-shot alert). The notification reuses the existing type 'followed_new_quiz'
-- (category "From creators you follow", link to the quiz) so the
-- creator_notifications CHECK constraint and gate_notification_prefs() stay
-- untouched (additive-only rule of the data-safety contract); a dedicated type
-- would need a CHECK swap like 154_battle_challenge_notification.sql. The trigger
-- can never block a publish: any error inside it is swallowed and the quiz row is
-- returned unchanged. Until this runs, GET/POST /api/ux-v1/p3/notify answer
-- "not live" (503 on POST) BEFORE any write, and the hub says "Group alerts are
-- not switched on yet". Owner choices: apply as is; or apply only part 1 (the
-- table, alerts are stored but not delivered yet); or drop the feature (the hub
-- keeps "Make the first quiz" only).

begin;

-- 1. The alerts: who waits for which group's first quiz.
create table if not exists public.group_quiz_alerts (
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id integer not null references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- set by the delivery trigger when the notification went out (one-shot)
  notified_at timestamptz null,
  primary key (user_id, group_id)
);

create index if not exists group_quiz_alerts_pending_idx
  on public.group_quiz_alerts (group_id)
  where notified_at is null;

alter table public.group_quiz_alerts enable row level security;

-- A fan reads, creates and removes only their own alerts. No anon policy: a
-- guest can neither read nor write (the hub asks guests to sign in first).
create policy "group_quiz_alerts_select_own" on public.group_quiz_alerts
  for select to authenticated using (auth.uid() = user_id);
create policy "group_quiz_alerts_insert_own" on public.group_quiz_alerts
  for insert to authenticated with check (auth.uid() = user_id and notified_at is null);
create policy "group_quiz_alerts_delete_own" on public.group_quiz_alerts
  for delete to authenticated using (auth.uid() = user_id);

comment on table public.group_quiz_alerts is
  'v11 group hub "Notify me": a fan waits for the next (first) published quiz of a group. One-shot: notified_at is set when the notification is sent.';

-- 2. Delivery: on publish, notify the waiting fans once. SECURITY DEFINER so it
--    can write the notifications of other users; search_path pinned.
create or replace function public.notify_group_quiz_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group text;
begin
  begin
    select name into v_group from public.groups where id = new.group_id;
    if v_group is null then
      return new;
    end if;

    insert into public.creator_notifications (user_id, type, title, body, quiz_id, link_url)
    select a.user_id,
           'followed_new_quiz',
           'A new ' || v_group || ' quiz is here',
           new.title,
           new.id,
           '/q/' || new.slug
    from public.group_quiz_alerts a
    where a.group_id = new.group_id
      and a.notified_at is null
      and a.user_id is distinct from new.creator_id;

    update public.group_quiz_alerts
       set notified_at = now()
     where group_id = new.group_id
       and notified_at is null;
  exception when others then
    -- never block a publish because of an alert
    return new;
  end;
  return new;
end;
$$;

revoke all on function public.notify_group_quiz_alerts() from public, anon, authenticated;

create trigger group_quiz_alerts_on_insert
  after insert on public.quizzes
  for each row
  when (new.status = 'published')
  execute function public.notify_group_quiz_alerts();

create trigger group_quiz_alerts_on_publish
  after update of status on public.quizzes
  for each row
  when (new.status = 'published' and old.status is distinct from 'published')
  execute function public.notify_group_quiz_alerts();

commit;

-- Check after running (read only):
--   select count(*) from public.group_quiz_alerts;
--   select tgname from pg_trigger where tgrelid = 'public.quizzes'::regclass and not tgisinternal;

-- Rollback (owner):
--   begin;
--   drop trigger if exists group_quiz_alerts_on_publish on public.quizzes;
--   drop trigger if exists group_quiz_alerts_on_insert on public.quizzes;
--   drop function if exists public.notify_group_quiz_alerts();
--   drop table if exists public.group_quiz_alerts;
--   commit;
