-- L26-l1-quiz-revision.rollback.sql (lane titles, run O1; audit 04 P2-1)
--
-- What:   undoes L26: drops public.revise_team_quiz and public.quiz_revision. The previous shape is restored exactly (L26 changed no existing
--         row). The history rows are lost, and a quiz that was already revised keeps its revised content (to put the old content back, copy
--         prev_questions, prev_title and prev_settings from quiz_revision first).
-- WHEN:   as L26. Safe to run twice. ONE do block, no temp table.
--
-- Verify (after the rollback):
-- Verify: select to_regclass('public.quiz_revision') is null;   expect true
-- Verify: select count(*) from pg_proc where proname = 'revise_team_quiz' and pronamespace = 'public'::regnamespace;   expect 0
-- Verify: select to_regclass('public.quizzes') is not null;   expect true

do $l26r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  drop function if exists public.revise_team_quiz(text, text, jsonb, jsonb, uuid, text);
  drop table if exists public.quiz_revision;

  perform pg_notify('pgrst', 'reload schema');
end
$l26r$;
