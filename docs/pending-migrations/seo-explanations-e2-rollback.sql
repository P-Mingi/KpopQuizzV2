-- Rollback of seo-explanations-e2.sql: removes the 197 explanations of lot E2. Quizzes are untouched.

begin;

delete from public.quiz_explanations where lot = 'E2';

commit;
