-- 026-admin-actions.rollback.sql (run O1, ADMIN-2): undo of 026-admin-actions.sql.
--
-- What:   drops the trigger, its function and the table public.admin_actions (its indexes, checks and identity sequence go with it).
-- Why:    the rollback of the admin journal.
-- Rows:   Refused, with nothing changed, while the table holds a line: the journal is the record of what the admin did. Export it first, then
--         empty it as the owner (truncate is not blocked by the append-only trigger):
--           truncate public.admin_actions;
--         and run this file again.
-- Verify: select to_regclass('public.admin_actions'), to_regprocedure('public.admin_actions_append_only()');   expect null, null
-- Undo:   run 026-admin-actions.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  if to_regclass('public.admin_actions') is not null then
    execute 'select count(*) from public.admin_actions' into n;
    if n > 0 then
      raise exception '026-admin-actions rollback refused: % line(s) in the journal (export them, then truncate public.admin_actions)', n;
    end if;
  end if;
end $$;

drop table if exists public.admin_actions;
drop function if exists public.admin_actions_append_only();
