-- Rollback of seo-watch.sql (SEO Mission 3, part D). Removes everything that file added and
-- nothing else. The app keeps working after it: every read and write is fail soft.
-- Warning: dropping seo_slug_redirects drops the recorded slug history, so renamed quiz and
-- group URLs answer 404 again. Export it first if it holds rows:
--   select * from public.seo_slug_redirects;

begin;

drop trigger if exists seo_slug_redirect_on_quiz  on public.quizzes;
drop trigger if exists seo_slug_redirect_on_group on public.groups;

drop function if exists public.seo_slug_on_quiz();
drop function if exists public.seo_slug_on_group();
drop function if exists public.seo_record_slug_redirect(text, text, text);
drop function if exists public.seo_slug_redirect_put(text, text, text);
drop function if exists public.seo_ai_visit_hit(text, text);

drop table if exists public.seo_watch_runs;
drop table if exists public.seo_linked_urls;
drop table if exists public.seo_ai_visits_daily;
drop table if exists public.seo_slug_redirects;

commit;
