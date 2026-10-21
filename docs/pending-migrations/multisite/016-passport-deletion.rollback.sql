-- 016-passport-deletion.rollback.sql (run O1, lane B7): undo of 016-passport-deletion.sql.
--
-- What:   drops the eight functions of 016 (passport_request_deletion, passport_cancel_deletion, passport_due_deletions,
--         passport_run_deletion, passport_leave_world, passport_world_purge, passport_reassign_quizzes,
--         passport_site_sentinel) and the tables passport.deletion_requests and passport.deletion_log (their index and
--         constraints go with them).
-- Why:    the rollback of manifest.md row 20. 006's rollback is refused while these tables exist, so this one runs first.
-- Rows:   2 tables dropped. Refused, with nothing changed, while a request is pending (it would cancel a member's
--         deletion silently) or while a real run or a real leave of a world is logged (the audit of a real deletion must be kept deliberately).
--         Dry-run log rows and cancelled or completed requests are dropped.
-- Verify: select to_regclass('passport.deletion_requests'), to_regclass('passport.deletion_log');   expect null, null
--         select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('passport_request_deletion','passport_cancel_deletion','passport_due_deletions','passport_run_deletion','passport_leave_world','passport_world_purge','passport_reassign_quizzes','passport_site_sentinel');   expect 0
-- Undo:   run 016-passport-deletion.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  if to_regclass('passport.deletion_requests') is not null then
    select count(*) into n from passport.deletion_requests where cancelled_at is null and completed_at is null;
    if n > 0 then
      raise exception '016-passport-deletion rollback refused: % deletion requests are pending', n;
    end if;
  end if;
  if to_regclass('passport.deletion_log') is not null then
    select count(*) into n from passport.deletion_log where dry_run = false and outcome = 'ok' and (kind = 'leave_world' or counts ? 'mission_u_d_installed');
    if n > 0 then
      raise exception '016-passport-deletion rollback refused: % real deletion runs or leaves are logged', n;
    end if;
  end if;
end $$;

drop function if exists public.passport_request_deletion(uuid, text, boolean);
drop function if exists public.passport_cancel_deletion(uuid);
drop function if exists public.passport_due_deletions(integer);
drop function if exists public.passport_run_deletion(uuid, boolean);
drop function if exists public.passport_leave_world(uuid, text, boolean, boolean);
drop function if exists public.passport_world_purge(uuid, text, boolean, boolean);
drop function if exists public.passport_reassign_quizzes(uuid, text, boolean, boolean);
drop function if exists public.passport_site_sentinel(text);
drop table if exists passport.deletion_log;
drop table if exists passport.deletion_requests;
