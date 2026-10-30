-- V-002c (run O1, session.sh): after 002c-site-indexes.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V2 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'index site_id valides : 9', (select count(*) = 9 from pg_index i join pg_class c on c.oid = i.indexrelid where c.relnamespace = 'public'::regnamespace and i.indisvalid and c.relname in ('quizzes_site_status_created_idx', 'groups_site_slug_idx', 'games_site_status_idx', 'trivia_site_group_idx', 'activity_events_site_created_idx', 'creator_notifications_site_user_idx', 'editorial_drafts_site_status_idx', 'verse_threads_site_created_idx', 'community_debates_site_created_idx')), (select count(*)::text from pg_index i join pg_class c on c.oid = i.indexrelid where c.relnamespace = 'public'::regnamespace and i.indisvalid and c.relname in ('quizzes_site_status_created_idx', 'groups_site_slug_idx', 'games_site_status_idx', 'trivia_site_group_idx', 'activity_events_site_created_idx', 'creator_notifications_site_user_idx', 'editorial_drafts_site_status_idx', 'verse_threads_site_created_idx', 'community_debates_site_created_idx'))),
  (2, 'index invalides dans public : 0', (select count(*) = 0 from pg_index i join pg_class c on c.oid = i.indexrelid where c.relnamespace = 'public'::regnamespace and not i.indisvalid), (select count(*)::text from pg_index i join pg_class c on c.oid = i.indexrelid where c.relnamespace = 'public'::regnamespace and not i.indisvalid))
) as c(n, what, ok, got) order by n;
rollback;
