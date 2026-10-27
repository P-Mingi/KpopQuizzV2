-- Rollback of seo-explanations-e4.sql: removes the 188 explanations of lot E4. Quizzes are untouched.

begin;

delete from public.quiz_explanations where lot = 'E4';

commit;
