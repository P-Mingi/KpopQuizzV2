-- D03-dev-reapply-019-023.rollback.sql (run O1, lot DEV-PREVIEW). DEV ONLY. NEVER FOR PRODUCTION.
-- There is nothing to undo by file: D03 put the functions of 019 and the view of 023 on their current files and drew the four banks again, and the banks of
-- before are not kept. Going back to the files of 2026-11-03 is the old 019 and 023 (git, f967743) run by hand and a bank drawn by the old engine, which is
-- not wanted. This file refuses so that nobody runs it by mistake.
-- o1-transaction: single (psql --single-transaction).
do $$
begin
  raise exception 'D03-dev-reapply-019-023 has no rollback: reset o1-dev from the dashboard if you need the earlier state';
end $$;
