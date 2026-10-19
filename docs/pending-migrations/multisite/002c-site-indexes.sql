-- 002c-site-indexes.sql (run O1, lane B2; manifest.md row 5; BACKLOG 4.1 row 4; schema.sql "@file 002c-site-indexes")
--
-- What:   creates the 9 read-path indexes of schema.sql that lead with site_id, CONCURRENTLY, one statement each.
-- Why:    once SITE_SCOPE is on, the hot reads (quiz lists, group pages, games, trivia, activity, notifications,
--         editorial drafts, threads, debates) filter by site_id first; CONCURRENTLY keeps reads and writes going.
-- Rows:   reads each of the 9 tables to build its index; no row is written.
-- Verify: select count(*) from pg_index i join pg_class c on c.oid = i.indexrelid
--           where c.relnamespace = 'public'::regnamespace and i.indisvalid and c.relname in (the 9 names below);
--           expect 9
-- Undo:   002c-site-indexes.rollback.sql (DROP INDEX CONCURRENTLY, one statement each).
-- Needs:  002b-site-validate.sql.
-- o1-transaction: none
-- Each statement commits alone (psql without --single-transaction; CONCURRENTLY refuses a transaction block).
-- Idempotent: IF NOT EXISTS. A build stopped half way leaves an INVALID index that IF NOT EXISTS would skip: the
-- check at the end refuses it by name; drop it with DROP INDEX CONCURRENTLY and run this file again.

set lock_timeout = '30s';
set client_min_messages = warning;

create index concurrently if not exists quizzes_site_status_created_idx     on public.quizzes (site_id, status, created_at desc);
create index concurrently if not exists groups_site_slug_idx                on public.groups (site_id, slug);
create index concurrently if not exists games_site_status_idx               on public.games (site_id, status);
create index concurrently if not exists trivia_site_group_idx               on public.trivia (site_id, group_id);
create index concurrently if not exists activity_events_site_created_idx    on public.activity_events (site_id, created_at desc);
create index concurrently if not exists creator_notifications_site_user_idx on public.creator_notifications (site_id, user_id);
create index concurrently if not exists editorial_drafts_site_status_idx    on public.editorial_drafts (site_id, status);
create index concurrently if not exists verse_threads_site_created_idx      on public.verse_threads (site_id, created_at desc);
create index concurrently if not exists community_debates_site_created_idx  on public.community_debates (site_id, created_at desc);

-- Check: the 9 indexes exist and none is left invalid.
do $$
declare
  names text[] := array[
    'quizzes_site_status_created_idx', 'groups_site_slug_idx', 'games_site_status_idx', 'trivia_site_group_idx',
    'activity_events_site_created_idx', 'creator_notifications_site_user_idx', 'editorial_drafts_site_status_idx',
    'verse_threads_site_created_idx', 'community_debates_site_created_idx'];
  bad text;
  n integer;
begin
  select string_agg(c.relname, ', ' order by c.relname) into bad
    from pg_index i join pg_class c on c.oid = i.indexrelid
   where c.relnamespace = 'public'::regnamespace and c.relname = any (names) and not (i.indisvalid and i.indisready);
  if bad is not null then
    raise exception '002c-site-indexes: invalid index left: %; drop it with DROP INDEX CONCURRENTLY and run this file again', bad;
  end if;
  select count(*) into n
    from pg_index i join pg_class c on c.oid = i.indexrelid
   where c.relnamespace = 'public'::regnamespace and c.relname = any (names);
  if n <> 9 then
    raise exception '002c-site-indexes: expected 9 site indexes, found %', n;
  end if;
end $$;
