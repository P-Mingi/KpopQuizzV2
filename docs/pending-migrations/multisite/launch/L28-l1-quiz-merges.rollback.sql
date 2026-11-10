-- L28-l1-quiz-merges.rollback.sql (lane indexing, run O1, owner 2026-11-09): the exact reverse of L28-l1-quiz-merges.sql.
--
-- What:   publishes /q/this-is-only-for-true-gllits again (status 'removed' back to 'published'). Nothing else changes for good.
--         The publish trigger (group_quiz_alerts_on_publish, notify_group_quiz_alerts) would tell the group's subscribers "A new ILLIT
--         quiz is here". It skips a subscriber notified in the last 20 hours, so for the length of this block every subscriber of the
--         group is stamped now, the quiz is published, then each subscriber gets back the exact notified_at it had. No notification is
--         written, and group_quiz_alerts ends as it began.
-- WHEN:   only to undo L28. The 301 of the code still sends the URL to -2: to serve this quiz again, also take its row out of QUIZ_MERGES.
--         After a backup, never during a build, never between 23:50 and 00:30 UTC. Safe to run twice (a quiz already published is left
--         alone).
-- o1-transaction: single, ONE DO block
--
-- Verify (after the rollback):
-- Verify: select status from public.quizzes where slug = 'this-is-only-for-true-gllits';   expect published
-- Verify: select status from public.quizzes where slug = 'this-is-only-for-true-gllits-2';   expect published
-- Verify: select count(*) from public.creator_notifications where type = 'followed_new_quiz' and created_at > now() - interval '10 minutes' and quiz_id = (select id from public.quizzes where slug = 'this-is-only-for-true-gllits');   expect 0

do $o1l28r$
begin
  perform set_config('lock_timeout', '5s', true);
  declare
    v_quiz   record;
    v_saved  jsonb := '[]'::jsonb;
    v_alerts boolean := to_regclass('public.group_quiz_alerts') is not null;
  begin
    select id, status, group_id into v_quiz from public.quizzes where slug = 'this-is-only-for-true-gllits';
    if not found then raise exception 'L28 rollback: no quiz this-is-only-for-true-gllits: nothing written'; end if;
    if v_quiz.status = 'published' then
      raise notice 'L28 rollback: this-is-only-for-true-gllits is already published, nothing to do';
      return;
    end if;
    if v_quiz.status <> 'removed' then
      raise exception 'L28 rollback: this-is-only-for-true-gllits is %, expected removed: nothing written', v_quiz.status;
    end if;

    if v_alerts then
      select coalesce(jsonb_agg(jsonb_build_object('u', user_id, 'n', notified_at)), '[]'::jsonb) into v_saved
        from public.group_quiz_alerts where group_id = v_quiz.group_id;
      update public.group_quiz_alerts set notified_at = now() where group_id = v_quiz.group_id;
    end if;

    update public.quizzes set status = 'published' where id = v_quiz.id and status = 'removed';
    if not found then raise exception 'L28 rollback: the status of this-is-only-for-true-gllits did not change'; end if;

    if v_alerts then
      update public.group_quiz_alerts a set notified_at = (x ->> 'n')::timestamptz
        from jsonb_array_elements(v_saved) x
       where a.group_id = v_quiz.group_id and a.user_id = (x ->> 'u')::uuid;
    end if;
  end;
end $o1l28r$;
