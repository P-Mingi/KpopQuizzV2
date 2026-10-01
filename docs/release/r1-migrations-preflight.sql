-- R1 section 4a: READ-ONLY look at production BEFORE "go migrations". Run it in the
-- Supabase SQL editor (project rdkgouofytwfdpbxbzio) and paste the result to R1.
-- It answers: does anything the eight v11 files create already exist (a file applied
-- by hand earlier, an object with the same name), and how many rows the touched
-- tables hold. It changes nothing (SELECT only).
--
-- Expected before the files are applied: only "rows" lines (kind 6). Any "exists" line
-- means part of a file is already there: R1 looks at it before anything is applied.

select 1 as ord, 'table exists' as kind, c.relname::text as object, ''::text as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relname in (
  'quiz_comment_replies', 'quiz_comment_likes', 'quiz_comment_reply_likes', 'group_quiz_alerts',
  'community_likes', 'community_debates', 'community_debate_votes', 'community_challenges', 'community_replies',
  'ranked_seasons', 'ranked_runs', 'ranked_song_stats', 'ranked_legends')
union all
select 2, 'column exists', (table_name || '.' || column_name)::text, data_type::text
from information_schema.columns
where table_schema = 'public' and (
  (table_name = 'plays' and column_name = 'relaxed')
  or (table_name = 'notification_prefs' and column_name in ('email_streak_reminder', 'email_weekly_recap'))
  or (table_name = 'ranked_plays' and column_name in ('season', 'run_token')))
union all
select 3, 'function exists', (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')::text,
       case when p.prosecdef then 'definer' else 'invoker' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'get_quiz_rank_for_score', 'quiz_comment_like_counts', 'notify_group_quiz_alerts',
  'ranked_issue_run', 'ranked_finalize_run', 'ranked_standings', 'ranked_player_standing', 'ranked_ladder',
  'ranked_recompute_legends', 'ranked_roll_season', 'ranked_nightly')
union all
select 4, 'trigger exists', (c.relname || ': ' || t.tgname)::text, ''::text
from pg_trigger t join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal and t.tgname in ('group_quiz_alerts_on_insert', 'group_quiz_alerts_on_publish')
union all
select 5, 'bucket exists', b.id::text, ('public=' || b.public)::text
from storage.buckets b where b.id = 'profile-headers'
union all
select 6, 'rows', 'plays', count(*)::text from public.plays
union all
select 6, 'rows', 'quizzes', count(*)::text from public.quizzes
union all
select 6, 'rows', 'notification_prefs', count(*)::text from public.notification_prefs
union all
select 6, 'rows', 'ranked_plays', count(*)::text from public.ranked_plays
union all
select 6, 'rows', 'bt_players', count(*)::text from public.bt_players
union all
select 6, 'rows', 'creator_notifications', count(*)::text from public.creator_notifications
order by 1, 3;
