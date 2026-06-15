-- 078 - E8: report-question affordance on battles (and reusable for quizzes).
-- Reuses the existing `reports` table + admin queue. Two small extensions:
--   1. quiz_id becomes nullable so a group-level battle question can be reported
--      even when there is no parent quiz (a row is still tied to the question).
--   2. question_text + reporter_hash track WHICH question was reported and
--      who reported it (for the 3-strike pull-to-review rule + anon dedup).

alter table public.reports alter column quiz_id drop not null;

alter table public.reports
  add column if not exists question_text  text,
  add column if not exists reporter_hash  text;

-- Per-question dedup: a given reporter (signed-in id OR anon ip+day hash) can
-- report the SAME question at most once. The pair (question_text, who) is what
-- needs to be unique; we accept either reporter_id or reporter_hash being set.
create unique index if not exists reports_question_reporter_user_idx
  on public.reports (quiz_id, question_text, reporter_id)
  where question_text is not null and reporter_id is not null;
create unique index if not exists reports_question_reporter_anon_idx
  on public.reports (coalesce(quiz_id, '00000000-0000-0000-0000-000000000000'::uuid), question_text, reporter_hash)
  where question_text is not null and reporter_hash is not null and reporter_id is null;
