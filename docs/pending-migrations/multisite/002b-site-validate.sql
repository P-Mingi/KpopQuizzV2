-- 002b-site-validate.sql (run O1, lane B2; manifest.md row 4; BACKLOG 4.1 row 3; schema.sql "@file 002b-site-validate")
--
-- What:   validates the 24 <table>_site_id_fkey foreign keys that 002a added NOT VALID, one statement each.
-- Why:    a validated key proves every existing row's site_id is a sites row; VALIDATE CONSTRAINT takes only a
--         SHARE UPDATE EXCLUSIVE lock (reads and writes go on), so it runs off-peak outside one big transaction.
-- Rows:   reads each of the 24 tables once (a scan per key); no row is written. Every row reads 'kpop' (002a's
--         default), so no key can fail.
-- Verify: select count(*) from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass
--           and conname like '%\_site\_id\_fkey' and not convalidated;                            expect 0
-- Undo:   002b-site-validate.rollback.sql (puts the 24 keys back to NOT VALID, 002a's state).
-- Needs:  002a-site-columns.sql.
-- o1-transaction: none
-- Each statement commits alone (psql without --single-transaction). Idempotent: validating a valid key is a no-op.
-- A statement stopped by lock_timeout leaves its key NOT VALID and changes nothing else: run the file again.

set lock_timeout = '10s';
set client_min_messages = warning;

alter table public.quizzes               validate constraint quizzes_site_id_fkey;
alter table public.groups                validate constraint groups_site_id_fkey;
alter table public.games                 validate constraint games_site_id_fkey;
alter table public.trivia                validate constraint trivia_site_id_fkey;
alter table public.quiz_bank             validate constraint quiz_bank_site_id_fkey;
alter table public.qotd_log              validate constraint qotd_log_site_id_fkey;
alter table public.badge_definitions     validate constraint badge_definitions_site_id_fkey;
alter table public.creator_notifications validate constraint creator_notifications_site_id_fkey;
alter table public.activity_events       validate constraint activity_events_site_id_fkey;
alter table public.editorial_accounts    validate constraint editorial_accounts_site_id_fkey;
alter table public.editorial_drafts      validate constraint editorial_drafts_site_id_fkey;
alter table public.bt_runs               validate constraint bt_runs_site_id_fkey;
alter table public.personality_questions validate constraint personality_questions_site_id_fkey;
alter table public.songs                 validate constraint songs_site_id_fkey;
alter table public.verse_threads         validate constraint verse_threads_site_id_fkey;
alter table public.verse_essays          validate constraint verse_essays_site_id_fkey;
alter table public.editorial_posts       validate constraint editorial_posts_site_id_fkey;
alter table public.community_replies     validate constraint community_replies_site_id_fkey;
alter table public.community_debates     validate constraint community_debates_site_id_fkey;
alter table public.community_challenges  validate constraint community_challenges_site_id_fkey;
alter table public.reports               validate constraint reports_site_id_fkey;
alter table public.live_rooms            validate constraint live_rooms_site_id_fkey;
alter table public.challenges            validate constraint challenges_site_id_fkey;
alter table public.personality_profiles  validate constraint personality_profiles_site_id_fkey;

-- Self-check: the 24 keys exist and are validated.
do $$
declare
  n integer;
begin
  select count(*) into n
    from pg_constraint k
    join pg_class c on c.oid = k.conrelid and c.relnamespace = 'public'::regnamespace
   where k.contype = 'f' and k.confrelid = 'public.sites'::regclass and k.convalidated
     and k.conname = c.relname || '_site_id_fkey'
     and c.relname in (
       'quizzes', 'groups', 'games', 'trivia', 'quiz_bank', 'qotd_log', 'badge_definitions', 'creator_notifications',
       'activity_events', 'editorial_accounts', 'editorial_drafts', 'bt_runs', 'personality_questions', 'songs',
       'verse_threads', 'verse_essays', 'editorial_posts', 'community_replies', 'community_debates',
       'community_challenges', 'reports', 'live_rooms', 'challenges', 'personality_profiles');
  if n <> 24 then
    raise exception '002b-site-validate: expected 24 validated site_id foreign keys, found %', n;
  end if;
end $$;
