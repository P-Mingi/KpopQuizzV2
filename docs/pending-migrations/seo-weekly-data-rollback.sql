-- Rollback of docs/pending-migrations/seo-weekly-data.sql (SEO Mission 3, part C).
-- Removes the three read views and the six tables, with the weekly Search Console and Bing
-- rows, the Bing links, the pull log and the monthly Bing AI imports they hold. Nothing else
-- reads them: after this the Monday job and e-mail go back to "table missing" (they fail
-- soft) and /admin/seo/import computes without saving.

begin;

drop view if exists public.seo_weekly_query_pages;
drop view if exists public.seo_weekly_queries;
drop view if exists public.seo_weekly_pages;

drop table if exists public.seo_bing_ai_pages;
drop table if exists public.seo_bing_ai_queries;
drop table if exists public.seo_weekly_runs;
drop table if exists public.seo_bing_links;
drop table if exists public.seo_bing_weekly;
drop table if exists public.seo_gsc_weekly;

commit;
