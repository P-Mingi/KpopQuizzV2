-- 002c-site-indexes.rollback.sql (run O1, lane B2): undo of 002c-site-indexes.sql.
--
-- What:   drops the 9 site_id indexes of 002c, CONCURRENTLY, one statement each.
-- Why:    the rollback of manifest.md row 5 (reverse order: after 002d's rollback, before 002b's).
-- Rows:   no row read or written; reads and writes go on during each drop.
-- Verify: select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname in (the 9 names
--           below);                                                                               expect 0
-- Undo:   run 002c-site-indexes.sql again.
-- o1-transaction: none
-- Each statement commits alone (psql without --single-transaction). Idempotent: IF EXISTS.

set lock_timeout = '30s';
set client_min_messages = warning;

drop index concurrently if exists public.quizzes_site_status_created_idx;
drop index concurrently if exists public.groups_site_slug_idx;
drop index concurrently if exists public.games_site_status_idx;
drop index concurrently if exists public.trivia_site_group_idx;
drop index concurrently if exists public.activity_events_site_created_idx;
drop index concurrently if exists public.creator_notifications_site_user_idx;
drop index concurrently if exists public.editorial_drafts_site_status_idx;
drop index concurrently if exists public.verse_threads_site_created_idx;
drop index concurrently if exists public.community_debates_site_created_idx;
