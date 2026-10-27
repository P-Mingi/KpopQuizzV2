-- Rollback of seo-quiz-explanations.sql: drops the table and every explanation in it. Roll back
-- the explanation lots first if only they are to be removed (seo-explanations-e1-rollback.sql).

begin;

drop table if exists public.quiz_explanations;

commit;
