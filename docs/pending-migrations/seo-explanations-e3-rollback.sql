-- Rollback of seo-explanations-e3.sql: removes the 239 explanations of lot E3. Quizzes are untouched.

begin;

delete from public.quiz_explanations where lot = 'E3';

commit;
