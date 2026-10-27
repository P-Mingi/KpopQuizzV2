-- Rollback of seo-plays-per-question-correct.sql: removes the column and its check. The values it
-- held (right or wrong per question) are lost; the plays themselves are untouched.

begin;

alter table public.plays drop constraint if exists plays_per_question_correct_shape;
alter table public.plays drop column if exists per_question_correct;

commit;
