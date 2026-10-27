-- Rollback of seo-explanations-e1.sql: removes the 233 explanations of lot E1. Quizzes are untouched.

begin;

delete from public.quiz_explanations where lot = 'E1';

commit;
