-- 002d-quiz-site-guard.rollback.sql (run O1, lane B2): undo of 002d-quiz-site-guard.sql.
--
-- What:   drops the trigger trg_quizzes_site_guard on public.quizzes, then the function public.quizzes_site_guard().
-- Why:    the rollback of manifest.md row 6, the first of the 002 rollbacks (reverse order). Quiz inserts and
--         updates then run exactly as before 002d.
-- Rows:   no row read or written. The DROP TRIGGER takes a short ACCESS EXCLUSIVE lock on quizzes (lock_timeout 3s:
--         the file fails whole rather than queue; rerun).
-- Verify: select count(*) from pg_trigger where tgname = 'trg_quizzes_site_guard';                 expect 0
--         select to_regprocedure('public.quizzes_site_guard()');                                   expect null
-- Undo:   run 002d-quiz-site-guard.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '3s';
set client_min_messages = warning;

drop trigger if exists trg_quizzes_site_guard on public.quizzes;
drop function if exists public.quizzes_site_guard();
