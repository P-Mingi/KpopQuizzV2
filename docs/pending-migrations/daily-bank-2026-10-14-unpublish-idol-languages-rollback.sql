-- Rollback of daily-bank-2026-10-14-unpublish-idol-languages.sql: publishes the quiz again.
update public.quizzes set status = 'published'
where id = 'c77955af-e465-446f-91cb-292a0d13fa6d' and status = 'draft';
