-- 025-quiz-alerts-every-publish.sql (run O1, lot E1b; owner decisions of 2026-11-03 and 2026-11-05, editorial quizzes)
--
-- What:   redefines notify_group_quiz_alerts() with CREATE OR REPLACE, starting from the body 008-write-locks.sql gives it (both
--         branches: kpop, and the world branch that sets site_id) and changing ONLY the notification rule. Signature, return type,
--         SECURITY DEFINER, the search_path setting and the ACL are 008's (CREATE OR REPLACE keeps the ACL). The two triggers
--         group_quiz_alerts_on_insert and group_quiz_alerts_on_publish are not touched.
--         Before (008): a subscriber of a group (public.group_quiz_alerts) is notified ONCE, by the first quiz published in the group
--         after the subscription: the insert selects only rows with notified_at null, and the update then stamps them.
--         After: every subscriber of the group is notified on EVERY publication of a quiz of that group (an insert with status
--         published, or a status change to published), whoever wrote the quiz (editorial or fan), with two limits: the creator of the
--         quiz is never notified, and a subscriber is notified at most ONCE EVERY 20 HOURS PER GROUP: no row is inserted for a
--         subscriber whose notified_at is less than 20 hours old. notified_at is kept, with the meaning "last notified": it is
--         stamped with now() only for the subscribers who actually received a notification row, in the same statement as the
--         insert (a data-modifying CTE: the update reads the user_id values that the insert RETURNs). A row that the BEFORE INSERT
--         trigger gate_notification_prefs drops ("following" off, quiz muted) and a row skipped by ON CONFLICT are not returned, so
--         that subscriber is not stamped and the next quiz still reaches them. The function still never blocks a publish: any error
--         inside it is swallowed (with the insert and the update, which are one statement) and the quiz row is returned unchanged.
--         Two additions that belong to the new rule: (1) the insert ends with ON CONFLICT DO NOTHING. A quiz that is published
--         twice (flagged, then published again) more than 20 hours after its first publication would insert the same (user, quiz,
--         type, title) rows twice and creator_notifications_dedup_idx would abort the whole statement, so the subscribers that joined
--         in between would miss it; with it, a subscriber who already has the notification keeps it (and is not stamped again) and the
--         others get theirs. (2) the plain index group_quiz_alerts_group_idx on (group_id): the old partial index
--         group_quiz_alerts_pending_idx covers only the rows with notified_at null, which is no longer the set the function reads
--         (it reads the rows of the group that are null or at least 20 hours old), and the function runs on every quiz insert.
--         The partial index stays (unused, harmless).
-- Why:    owner decision of 2026-11-03: the editorial quizzes (the cron editorial-publish under a Team account, at most 10 a day, 1 per
--         group a day) must reach the group's subscribers on each publication, not only the first. Owner decision of 2026-11-05: the
--         same for the quizzes of the fans, with at most one alert per subscriber and per group every 20 hours, against spam.
-- Rows:   no row is touched. 1 function replaced, 1 index added. (After it, the next quiz published in a group notifies the
--         subscribers whose notified_at is null or at least 20 hours old.)
-- Access: unchanged (the function stays SECURITY DEFINER with search_path public; EXECUTE stays closed to anon and authenticated).
-- Decisions where the contract is silent:
--   - the creator is excluded as before (a Team account that subscribed to its own group is not told about its own quiz) and is
--     therefore not stamped either: notified_at is "last notified", and the creator was not notified;
--   - the 20 hours are counted per (subscriber, group), on group_quiz_alerts.notified_at, a row that is already per group: a
--     subscriber of two groups gets one alert per group, an alert in one group does not hold back the other;
--   - the edge is on the old side: a notified_at exactly 20 hours before now() is old enough (the test is <=, now() being the start
--     of the transaction of the publish); one microsecond less is not. A never notified subscriber (null) is always old enough;
--   - the rule does not look at who wrote the quiz: a quiz of a fan published less than 20 hours after another quiz of the group (a
--     fan's or an editorial one) does not notify the subscribers that the first one notified, and the same holds the other way
--     round (an editorial quiz can be silenced for them by a fan's quiz of the previous hours);
--   - notification preferences are not read here: gate_notification_prefs (BEFORE INSERT on creator_notifications) still drops the row
--     of a subscriber who turned "following" off or muted the quiz, and that subscriber is NOT stamped (no row, no stamp), so when
--     they turn "following" back on, the next quiz reaches them even less than 20 hours after;
--   - a subscriber who already has the notification of that very quiz (published again after a flag) is neither given a second row
--     nor stamped again: notified_at does not move, and the next quiz of the group still reaches them;
--   - a quiz of a group nobody subscribed to inserts nothing and updates nothing, as before.
-- Needs:  008-write-locks.sql (the world branch and site_id of creator_notifications, 002a), v11 P3 group_quiz_alerts. Runs after 008.
-- Verify: select prosrc !~ 'notified_at is null' from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure;   expect t
--         select prosrc ~ '20 hours' and prosrc ~* 'returning user_id' from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure;   expect t
--         select prosecdef, proconfig from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure;   expect t, {search_path=public}
--         select proacl from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure;   expect no anon and no authenticated entry
--         select count(*) from pg_trigger where not tgisinternal and tgname in ('group_quiz_alerts_on_insert', 'group_quiz_alerts_on_publish');   expect 2
--         select indexdef from pg_indexes where schemaname = 'public' and indexname = 'group_quiz_alerts_group_idx';   expect one row, on (group_id)
--         the behaviour is rehearsed on a local Postgres by apps/quiz/e2e/o1/E1b/alerts-rehearsal.sh (001 to 008, this file, then quizzes of one group, inside and outside the 20 hours)
-- Undo:   025-quiz-alerts-every-publish.rollback.sql (008's body verbatim; it must run before the rollback of 008).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

-- Preconditions: 008 is in (its function holds the world branch), the alert table and the site column of the notifications exist.
do $$
begin
  if to_regprocedure('public.notify_group_quiz_alerts()') is null then
    raise exception '025-quiz-alerts-every-publish: public.notify_group_quiz_alerts() is missing (apply v11-p3-group-quiz-alerts.sql and 008 first)';
  end if;
  if (select p.prosrc from pg_proc p where p.oid = 'public.notify_group_quiz_alerts()'::regprocedure) not like '%v_site%' then
    raise exception '025-quiz-alerts-every-publish: notify_group_quiz_alerts() is not the 008 form (apply 008-write-locks.sql first)';
  end if;
  if to_regclass('public.group_quiz_alerts') is null or to_regclass('public.creator_notifications') is null then
    raise exception '025-quiz-alerts-every-publish: public.group_quiz_alerts or public.creator_notifications is missing';
  end if;
  if not exists (select 1 from pg_attribute a where a.attrelid = 'public.creator_notifications'::regclass and a.attname = 'site_id' and not a.attisdropped) then
    raise exception '025-quiz-alerts-every-publish: public.creator_notifications.site_id is missing (apply 002a first)';
  end if;
end $$;

create index if not exists group_quiz_alerts_group_idx on public.group_quiz_alerts (group_id);

-- notify_group_quiz_alerts (008's body; only the notification rule changes: no one-shot guard, at most one alert per subscriber and group every 20 hours,
-- notified_at = last notified, stamped only for the subscribers who received a row)

CREATE OR REPLACE FUNCTION public.notify_group_quiz_alerts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_site text;
  v_group text;
BEGIN
  v_site := coalesce(new.site_id, 'kpop');
  IF v_site = 'kpop' THEN
  begin
    select name into v_group from public.groups where id = new.group_id;
    if v_group is null then
      return new;
    end if;

    -- one statement: the insert, then the stamp of the subscribers whose row was really written (RETURNING skips the rows dropped by
    -- gate_notification_prefs and by ON CONFLICT)
    with sent as (
      insert into public.creator_notifications (user_id, type, title, body, quiz_id, link_url)
      select a.user_id,
             'followed_new_quiz',
             'A new ' || v_group || ' quiz is here',
             new.title,
             new.id,
             '/q/' || new.slug
      from public.group_quiz_alerts a
      where a.group_id = new.group_id
        and a.user_id is distinct from new.creator_id
        and coalesce(a.notified_at, '-infinity'::timestamptz) <= now() - interval '20 hours'
      on conflict do nothing
      returning user_id
    )
    update public.group_quiz_alerts g
       set notified_at = now()
      from sent s
     where g.group_id = new.group_id
       and g.user_id = s.user_id;
  exception when others then
    -- never block a publish because of an alert
    return new;
  end;
  return new;
  ELSE
  begin
    select name into v_group from public.groups where id = new.group_id;
    if v_group is null then
      return new;
    end if;

    -- one statement: the insert, then the stamp of the subscribers whose row was really written (RETURNING skips the rows dropped by
    -- gate_notification_prefs and by ON CONFLICT)
    with sent as (
      insert into public.creator_notifications (user_id, type, title, body, quiz_id, link_url, site_id)
      select a.user_id,
             'followed_new_quiz',
             'A new ' || v_group || ' quiz is here',
             new.title,
             new.id,
             '/q/' || new.slug,
             new.site_id
      from public.group_quiz_alerts a
      where a.group_id = new.group_id
        and a.user_id is distinct from new.creator_id
        and coalesce(a.notified_at, '-infinity'::timestamptz) <= now() - interval '20 hours'
      on conflict do nothing
      returning user_id
    )
    update public.group_quiz_alerts g
       set notified_at = now()
      from sent s
     where g.group_id = new.group_id
       and g.user_id = s.user_id;
  exception when others then
    -- never block a publish because of an alert
    return new;
  end;
  return new;
  END IF;
END;
$function$;

-- Self-check: the rule changed, the function is still SECURITY DEFINER with its search_path, closed to the browser roles, both triggers still there.
do $$
declare
  n integer;
begin
  if (select p.prosrc from pg_proc p where p.oid = 'public.notify_group_quiz_alerts()'::regprocedure) like '%notified_at is null%' then
    raise exception '025-quiz-alerts-every-publish: the function still holds the notified_at guard';
  end if;
  if not exists (select 1 from pg_proc p where p.oid = 'public.notify_group_quiz_alerts()'::regprocedure and p.prosecdef and p.proconfig @> array['search_path=public']) then
    raise exception '025-quiz-alerts-every-publish: notify_group_quiz_alerts() lost SECURITY DEFINER or its search_path';
  end if;
  if exists (select 1 from pg_proc p, aclexplode(p.proacl) a
              where p.oid = 'public.notify_group_quiz_alerts()'::regprocedure
                and a.privilege_type = 'EXECUTE' and a.grantee in (select r.oid from pg_roles r where r.rolname in ('anon', 'authenticated'))) then
    raise exception '025-quiz-alerts-every-publish: anon or authenticated holds an explicit EXECUTE on notify_group_quiz_alerts()';
  end if;
  select count(*) into n from pg_trigger
   where not tgisinternal and tgname in ('group_quiz_alerts_on_insert', 'group_quiz_alerts_on_publish');
  if n <> 2 then
    raise exception '025-quiz-alerts-every-publish: expected the 2 alert triggers, found %', n;
  end if;
end $$;
