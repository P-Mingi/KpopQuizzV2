-- 002b-site-validate.rollback.sql (run O1, lane B2): undo of 002b-site-validate.sql.
--
-- What:   puts each validated <table>_site_id_fkey of 002a back to NOT VALID (002a's state): one ALTER per table
--         drops the key and adds it again NOT VALID, so the table is never without its key.
-- Why:    the rollback of manifest.md row 4, so that 002a's rollback, or 002b again, starts from 002a's state.
--         Nothing depends on validation: the key checks new rows the same way either way.
-- Rows:   up to 24 tables altered, no row read or written (NOT VALID skips the scan). Each ALTER takes a short
--         ACCESS EXCLUSIVE lock; lock_timeout 3s makes the file fail whole rather than queue: rerun.
-- Verify: select count(*) from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass
--           and conname like '%\_site\_id\_fkey' and convalidated;                                expect 0
-- Undo:   run 002b-site-validate.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '3s';
set client_min_messages = warning;

do $$
declare
  t text;
begin
  foreach t in array array[
    'quizzes', 'groups', 'games', 'trivia', 'quiz_bank', 'qotd_log', 'badge_definitions', 'creator_notifications',
    'activity_events', 'editorial_accounts', 'editorial_drafts', 'bt_runs', 'personality_questions', 'songs',
    'verse_threads', 'verse_essays', 'editorial_posts', 'community_replies', 'community_debates',
    'community_challenges', 'reports', 'live_rooms', 'challenges', 'personality_profiles'
  ] loop
    if exists (
      select 1 from pg_constraint
       where conrelid = format('public.%I', t)::regclass and conname = t || '_site_id_fkey' and convalidated
    ) then
      execute format(
        'alter table public.%I drop constraint %I, add constraint %I foreign key (site_id) references public.sites(id) not valid',
        t, t || '_site_id_fkey', t || '_site_id_fkey');
    end if;
  end loop;
end $$;
