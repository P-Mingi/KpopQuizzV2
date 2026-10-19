-- 002a-site-columns.rollback.sql (run O1, lane B2): undo of 002a-site-columns.sql.
--
-- What:   drops the 24 <table>_site_id_fkey foreign keys and the 24 site_id columns of 002a.
-- Why:    the rollback of manifest.md row 3. Rollbacks run in reverse order: 002d's, 002c's and 002b's first (and
--         every later file that reads site_id).
-- Rows:   24 tables altered, no row deleted. Refused, with nothing changed, while any row of the 24 tables has a
--         site other than kpop (dropping the column would merge that row into kpop) or while the 002d trigger
--         exists. A view or policy of a later file that names site_id also stops the drop (no CASCADE).
--         The refusal check reads each table once (site_id <> 'kpop').
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and column_name = 'site_id'
--           and table_name in (the 24 tables);                                                   expect 0
-- Undo:   run 002a-site-columns.sql again (then 002b, 002c, 002d).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '3s';
set client_min_messages = warning;

do $$
declare
  t text;
  tables text[] := array[
    'quizzes', 'groups', 'games', 'trivia', 'quiz_bank', 'qotd_log', 'badge_definitions', 'creator_notifications',
    'activity_events', 'editorial_accounts', 'editorial_drafts', 'bt_runs', 'personality_questions', 'songs',
    'verse_threads', 'verse_essays', 'editorial_posts', 'community_replies', 'community_debates',
    'community_challenges', 'reports', 'live_rooms', 'challenges', 'personality_profiles'];
  other boolean;
  found_in text := '';
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_quizzes_site_guard' and tgrelid = 'public.quizzes'::regclass) then
    raise exception '002a rollback refused: trg_quizzes_site_guard exists; run 002d-quiz-site-guard.rollback.sql first';
  end if;
  foreach t in array tables loop
    if exists (select 1 from pg_attribute
                where attrelid = format('public.%I', t)::regclass and attname = 'site_id' and not attisdropped) then
      execute format('select exists (select 1 from public.%I where site_id <> ''kpop'')', t) into other;
      if other then
        found_in := found_in || ' ' || t;
      end if;
    end if;
  end loop;
  if found_in <> '' then
    raise exception '002a rollback refused: rows of another site than kpop exist in%', found_in;
  end if;
  foreach t in array tables loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_site_id_fkey');
    execute format('alter table public.%I drop column if exists site_id', t);
  end loop;
end $$;
