-- D01-dev-catchup.rollback.sql (run O1, lot DEV-PREVIEW). DEV ONLY. NEVER FOR PRODUCTION.
-- There is nothing to undo by file: D01 widened a check, dropped an empty table that 018 rebuilds and put two sites rows on the registry values.
-- Undoing the later files is their own rollbacks, in reverse order. This file refuses so that nobody runs it by mistake.
-- o1-transaction: single (psql --single-transaction).
do $$
begin
  raise exception 'D01-dev-catchup has no rollback: reset o1-dev from the dashboard if you need the earlier state';
end $$;
