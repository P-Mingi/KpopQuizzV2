-- Rollback of seo-indexnow.sql (SEO Mission 3, part A). Removes the triggers first (so no write
-- can reach a dropped function), then the functions, then the three tables and their rows.
-- The app falls back to its pre-migration behaviour on its own: the fast path pings IndexNow
-- directly and /api/indexnow resubmits the sitemap after a deploy.
-- Nothing else in the database refers to these objects.

begin;

drop trigger if exists seo_indexnow_quiz_ins_del   on public.quizzes;
drop trigger if exists seo_indexnow_quiz           on public.quizzes;
drop trigger if exists seo_indexnow_group_del      on public.groups;
drop trigger if exists seo_indexnow_group          on public.groups;
drop trigger if exists seo_indexnow_song_ins_del   on public.songs;
drop trigger if exists seo_indexnow_song           on public.songs;
drop trigger if exists seo_indexnow_trivia_ins_del on public.trivia;
drop trigger if exists seo_indexnow_trivia         on public.trivia;
drop trigger if exists seo_indexnow_pulse_ins_del  on public.pulse_reports;
drop trigger if exists seo_indexnow_pulse          on public.pulse_reports;

drop function if exists public.seo_indexnow_on_quiz();
drop function if exists public.seo_indexnow_on_group();
drop function if exists public.seo_indexnow_on_song();
drop function if exists public.seo_indexnow_on_trivia();
drop function if exists public.seo_indexnow_on_pulse();
drop function if exists public.seo_indexnow_enqueue(text[], text, boolean);
drop function if exists public.seo_indexnow_group_paths(text, text[]);
drop function if exists public.seo_indexnow_record_attempt(bigint[], integer, boolean, timestamptz);
drop function if exists public.seo_indexnow_mark_submitted(text[], integer, timestamptz);

drop table if exists public.seo_indexnow_events;
drop table if exists public.seo_url_state;
drop table if exists public.seo_indexnow_outbox;

commit;
