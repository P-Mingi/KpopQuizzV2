-- 025-quiz-alerts-every-publish.rollback.sql (run O1, lot E1b): undo of 025-quiz-alerts-every-publish.sql.
--
-- What:   puts back the body of notify_group_quiz_alerts() that 008-write-locks.sql gives it, copied verbatim (CREATE OR REPLACE keeps the
--         ACL, SECURITY DEFINER and the search_path; the triggers are not touched), and drops the index group_quiz_alerts_group_idx.
--         The alert is one-shot again: a subscriber is notified by the first quiz published in the group after the subscription.
-- Why:    the rollback of 025. Rollbacks run in reverse order: this one before the rollback of 008, which puts back the body of before 008.
-- Rows:   no row is touched. 1 function replaced, 1 index dropped. The notified_at values written while 025 was in stay as they are (a
--         subscriber stamped by a later quiz is simply not notified again by the next one).
-- Verify: select prosrc like '%notified_at is null%' from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure;   expect t
--         select to_regclass('public.group_quiz_alerts_group_idx');   expect null
-- Undo:   run 025-quiz-alerts-every-publish.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

drop index if exists public.group_quiz_alerts_group_idx;

-- notify_group_quiz_alerts (008's definition)

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
  ELSE
  begin
    select name into v_group from public.groups where id = new.group_id;
    if v_group is null then
      return new;
    end if;

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
  END IF;
END;
$function$;
