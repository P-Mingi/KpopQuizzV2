-- R1 section 4: ONE read-only query that checks every object the eight v11 files create
-- (tables with RLS, policies, columns, functions and their grants, triggers, the storage
-- bucket) and that the existing tables kept their rows. Run it in the Supabase SQL editor
-- (project rdkgouofytwfdpbxbzio) and paste the result to R1. It changes nothing.
-- Columns: file / n / check / value / expected. A value that differs from an exact
-- expected text is what R1 looks at; row counts are approximate by nature.

select '01 v11-p4-relaxed-runs' as file, v.* from (
select 1 as n, 'plays.relaxed' as "check", ((select coalesce(string_agg(column_name || ' ' || data_type || ' default ' || coalesce(column_default, 'none') || ' nullable ' || is_nullable, '; ' order by column_name), 'MISSING') from information_schema.columns where table_schema = 'public' and table_name = 'plays' and column_name in ('relaxed')))::text as value, 'relaxed boolean default false nullable NO' as expected
union all
select 2, 'plays rows (unchanged)', (select count(*) from public.plays)::text, 'about 69,350'
union all
select 3, 'plays rows with relaxed = true', (select count(*) from public.plays where relaxed)::text, '0'
) v
union all
select '02 v11-p4-rank-for-score' as file, v.* from (
select 1 as n, 'function' as "check", ((select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') ' || case when p.prosecdef then 'definer' else 'invoker' end, '; ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('get_quiz_rank_for_score')))::text as value, 'get_quiz_rank_for_score(p_quiz_id uuid, p_score integer) invoker' as expected
union all
select 2, 'execute granted to', ((select coalesce(string_agg(distinct rp.grantee, ', ' order by rp.grantee), 'none') from information_schema.routine_privileges rp where rp.specific_schema = 'public' and rp.routine_name in ('get_quiz_rank_for_score')))::text, 'a list that includes anon and authenticated'
union all
select 3, 'sample call: most played quiz, score 0', (select 'rank ' || r.rank || ' of ' || r.total_players from public.get_quiz_rank_for_score((select id from public.quizzes where status = 'published' order by play_count desc limit 1), 0) r)::text, 'rank N of M, two numbers above 0'
) v
union all
select '03 v11-p4-comment-likes' as file, v.* from (
select 1 as n, 'tables, RLS on' as "check", ((select string_agg(c.relname || case when c.relrowsecurity then '' else ' (RLS OFF)' end, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('quiz_comment_replies', 'quiz_comment_likes', 'quiz_comment_reply_likes')))::text as value, 'quiz_comment_likes, quiz_comment_replies, quiz_comment_reply_likes' as expected
union all
select 2, 'policies', ((select coalesce(string_agg(tablename || '.' || policyname || ' ' || cmd, '; ' order by tablename, policyname), 'none') from pg_policies where schemaname = 'public' and tablename in ('quiz_comment_replies', 'quiz_comment_likes', 'quiz_comment_reply_likes')))::text, '8 policies: likes delete_own, insert_own, read_own; replies delete_own, read; reply_likes delete_own, insert_own, read_own'
union all
select 3, 'count function', ((select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') ' || case when p.prosecdef then 'definer' else 'invoker' end, '; ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('quiz_comment_like_counts')))::text, 'quiz_comment_like_counts(p_comment_ids uuid[], p_reply_ids uuid[]) definer'
union all
select 4, 'rows in the three tables', (select (select count(*) from public.quiz_comment_replies) || ' / ' || (select count(*) from public.quiz_comment_likes) || ' / ' || (select count(*) from public.quiz_comment_reply_likes))::text, '0 / 0 / 0'
union all
select 5, 'quiz_comments rows (unchanged table)', (select count(*) from public.quiz_comments)::text, 'any number, the table is not touched'
) v
union all
select '04 v11-p3-group-quiz-alerts' as file, v.* from (
select 1 as n, 'table, RLS on' as "check", ((select string_agg(c.relname || case when c.relrowsecurity then '' else ' (RLS OFF)' end, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('group_quiz_alerts')))::text as value, 'group_quiz_alerts' as expected
union all
select 2, 'policies', ((select coalesce(string_agg(tablename || '.' || policyname || ' ' || cmd, '; ' order by tablename, policyname), 'none') from pg_policies where schemaname = 'public' and tablename in ('group_quiz_alerts')))::text, '3 policies: delete_own, insert_own, select_own'
union all
select 3, 'trigger function', ((select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') ' || case when p.prosecdef then 'definer' else 'invoker' end, '; ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('notify_group_quiz_alerts')))::text, 'notify_group_quiz_alerts() definer'
union all
select 4, 'triggers on quizzes', (select coalesce(string_agg(t.tgname, ', ' order by t.tgname), 'none') from pg_trigger t where t.tgrelid = 'public.quizzes'::regclass and not t.tgisinternal and t.tgname like 'group_quiz_alerts%')::text, 'group_quiz_alerts_on_insert, group_quiz_alerts_on_publish'
union all
select 5, 'alerts stored', (select count(*) from public.group_quiz_alerts)::text, '0'
union all
select 6, 'quizzes rows (unchanged)', (select count(*) from public.quizzes)::text, '441 or a few more'
) v
union all
select '05 v11-p8-community' as file, v.* from (
select 1 as n, 'tables, RLS on' as "check", ((select string_agg(c.relname || case when c.relrowsecurity then '' else ' (RLS OFF)' end, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('community_likes', 'community_debates', 'community_debate_votes', 'community_challenges', 'community_replies')))::text as value, 'community_challenges, community_debate_votes, community_debates, community_likes, community_replies' as expected
union all
select 2, 'policies', ((select coalesce(string_agg(tablename || '.' || policyname || ' ' || cmd, '; ' order by tablename, policyname), 'none') from pg_policies where schemaname = 'public' and tablename in ('community_likes', 'community_debates', 'community_debate_votes', 'community_challenges', 'community_replies')))::text, '3 policies, SELECT only: community_challenges_public_read, community_debates_public_read, community_replies_public_read'
union all
select 3, 'rows in the five tables', (select (select count(*) from public.community_likes) + (select count(*) from public.community_debates) + (select count(*) from public.community_debate_votes) + (select count(*) from public.community_challenges) + (select count(*) from public.community_replies))::text, '0'
) v
union all
select '06 v11-p10-email-prefs' as file, v.* from (
select 1 as n, 'notification_prefs columns' as "check", ((select coalesce(string_agg(column_name || ' ' || data_type || ' default ' || coalesce(column_default, 'none') || ' nullable ' || is_nullable, '; ' order by column_name), 'MISSING') from information_schema.columns where table_schema = 'public' and table_name = 'notification_prefs' and column_name in ('email_streak_reminder', 'email_weekly_recap')))::text as value, 'email_streak_reminder boolean default false nullable NO; email_weekly_recap boolean default false nullable NO' as expected
union all
select 2, 'rows (unchanged)', (select count(*) from public.notification_prefs)::text, '3'
union all
select 3, 'rows with an email switch on', (select count(*) from public.notification_prefs where email_streak_reminder or email_weekly_recap)::text, '0'
) v
union all
select '07 v11-p10-header-storage' as file, v.* from (
select 1 as n, 'bucket' as "check", (select coalesce((select 'public=' || b.public || ', limit=' || b.file_size_limit || ', types=' || array_to_string(b.allowed_mime_types, ',') from storage.buckets b where b.id = 'profile-headers'), 'MISSING'))::text as value, 'public=true, limit=1048576, types=image/webp' as expected
union all
select 2, 'storage policies naming the bucket', (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and (qual like '%profile-headers%' or with_check like '%profile-headers%'))::text, '0'
union all
select 3, 'files in the bucket', (select count(*) from storage.objects where bucket_id = 'profile-headers')::text, '0'
) v
union all
select '08 v11-p7-ranked' as file, v.* from (
select 1 as n, 'tables, RLS on' as "check", ((select string_agg(c.relname || case when c.relrowsecurity then '' else ' (RLS OFF)' end, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('ranked_seasons', 'ranked_runs', 'ranked_song_stats', 'ranked_legends')))::text as value, 'ranked_legends, ranked_runs, ranked_seasons, ranked_song_stats' as expected
union all
select 2, 'policies on the four new tables', ((select coalesce(string_agg(tablename || '.' || policyname || ' ' || cmd, '; ' order by tablename, policyname), 'none') from pg_policies where schemaname = 'public' and tablename in ('ranked_seasons', 'ranked_runs', 'ranked_song_stats', 'ranked_legends')))::text, 'none'
union all
select 3, 'ranked_plays new columns', ((select coalesce(string_agg(column_name || ' ' || data_type || ' default ' || coalesce(column_default, 'none') || ' nullable ' || is_nullable, '; ' order by column_name), 'MISSING') from information_schema.columns where table_schema = 'public' and table_name = 'ranked_plays' and column_name in ('season', 'run_token')))::text, 'run_token uuid default none nullable YES; season smallint default none nullable YES'
union all
select 4, 'ranked_plays indexes', (select coalesce(string_agg(indexname, ', ' order by indexname), 'none') from pg_indexes where schemaname = 'public' and tablename = 'ranked_plays' and indexname in ('ranked_plays_run_token_key', 'ranked_plays_player_season_score_idx'))::text, 'ranked_plays_player_season_score_idx, ranked_plays_run_token_key'
union all
select 5, 'functions', (select count(*) || ' functions: ' || string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('ranked_issue_run', 'ranked_finalize_run', 'ranked_standings', 'ranked_player_standing', 'ranked_ladder', 'ranked_recompute_legends', 'ranked_roll_season', 'ranked_nightly'))::text, '8 functions: ranked_finalize_run, ranked_issue_run, ranked_ladder, ranked_nightly, ranked_player_standing, ranked_recompute_legends, ranked_roll_season, ranked_standings'
union all
select 6, 'execute granted to', ((select coalesce(string_agg(distinct rp.grantee, ', ' order by rp.grantee), 'none') from information_schema.routine_privileges rp where rp.specific_schema = 'public' and rp.routine_name in ('ranked_issue_run', 'ranked_finalize_run', 'ranked_standings', 'ranked_player_standing', 'ranked_ladder', 'ranked_recompute_legends', 'ranked_roll_season', 'ranked_nightly')))::text, 'service_role and the owner role only: no anon, no authenticated, no PUBLIC'
union all
select 7, 'seasons (ranked stays not live)', (select count(*) from public.ranked_seasons)::text, '0'
union all
select 8, 'ranked_plays rows (unchanged)', (select count(*) from public.ranked_plays)::text, '0'
) v
order by 1, 2;
