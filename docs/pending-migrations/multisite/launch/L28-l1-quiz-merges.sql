-- L28-l1-quiz-merges.sql (lane indexing, run O1, owner 2026-11-09, audit 03 P1-9)
--
-- What:   the K01 ILLIT pair. /q/this-is-only-for-true-gllits is the same quiz as /q/this-is-only-for-true-gllits-2 (the same 10 questions,
--         uploaded twice). The code of #221 answers the first URL with a 301 to the second (apps/quiz/src/lib/seo/quiz-redirects.ts,
--         QUIZ_MERGES) and keeps it out of the sitemap. This file takes the first quiz out of publication (status 'removed'), so the
--         lists, the group hub, search and the sitemap show the kept quiz only.
--         Additive: one column of one row changes (quizzes.status). No row is deleted: the quiz, its questions, plays, attempts, scores,
--         likes, comments and notifications stay. No XP, level, streak or badge is recomputed. The only trigger on a status change
--         (group_quiz_alerts_on_publish) fires on a publish, never on this: nothing is sent.
--         /q/only-real-monstiez (the other approved merge) needs no data change: that quiz is already 'flagged'.
-- Needs:  public.quizzes with the status_valid check (draft, published, flagged, removed). Both quizzes are checked first (kpop, the same
--         group, the same number of questions, the kept one published); in any other state the file raises and writes nothing.
-- WHEN:   AFTER the merge of #221 (the 301 is in that code: applied before, the URL would answer a 404 until the merge). After a backup,
--         never during a build, never between 23:50 and 00:30 UTC. Safe to run twice (a quiz already 'removed' is left alone).
-- Undo:   L28-l1-quiz-merges.rollback.sql (publishes it again without sending the group alerts).
-- o1-transaction: single, ONE DO block
--
-- Verify (after the apply):
-- Verify: select status from public.quizzes where slug = 'this-is-only-for-true-gllits';   expect removed
-- Verify: select status from public.quizzes where slug = 'this-is-only-for-true-gllits-2';   expect published
-- Verify: select count(*) from public.quizzes where slug in ('this-is-only-for-true-gllits', 'this-is-only-for-true-gllits-2');   expect 2
-- Verify: select status from public.quizzes where slug = 'only-real-monstiez';   expect flagged

do $o1l28$
begin
  perform set_config('lock_timeout', '5s', true);
  declare
    v_loser  record;
    v_kept   record;
  begin
    if to_regclass('public.quizzes') is null then raise exception 'L28: public.quizzes does not exist'; end if;

    select id, status, site_id, group_id, question_count into v_loser from public.quizzes where slug = 'this-is-only-for-true-gllits';
    if not found then raise exception 'L28: no quiz this-is-only-for-true-gllits: nothing written'; end if;
    select id, status, site_id, group_id, question_count into v_kept from public.quizzes where slug = 'this-is-only-for-true-gllits-2';
    if not found then raise exception 'L28: no quiz this-is-only-for-true-gllits-2: nothing written'; end if;

    if v_kept.status <> 'published' then
      raise exception 'L28: the quiz kept (this-is-only-for-true-gllits-2) is %, not published: nothing written', v_kept.status;
    end if;
    if v_loser.site_id is distinct from 'kpop' or v_kept.site_id is distinct from 'kpop'
       or v_loser.group_id is distinct from v_kept.group_id or v_loser.question_count is distinct from v_kept.question_count then
      raise exception 'L28: the pair is not the K01 pair (site, group or question count differ): nothing written';
    end if;

    if v_loser.status = 'removed' then
      raise notice 'L28: this-is-only-for-true-gllits is already removed, nothing to do';
      return;
    end if;
    if v_loser.status <> 'published' then
      raise exception 'L28: this-is-only-for-true-gllits is %, expected published: nothing written', v_loser.status;
    end if;

    update public.quizzes set status = 'removed' where id = v_loser.id and status = 'published';
    if not found then raise exception 'L28: the status of this-is-only-for-true-gllits did not change'; end if;
  end;
end $o1l28$;
