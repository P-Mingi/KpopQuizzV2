-- SEO Mission 3, part C (2026-10-15): weekly search data and the monthly Bing AI import.
-- NOT APPLIED. Apply only on the owner's go, as one run (the file is one transaction).
-- Rollback: seo-weekly-data-rollback.sql.
--
-- Until it is applied, everything that uses these tables fails soft: the Monday job pulls,
-- logs "table missing" and exits cleanly; the Monday e-mail says the data is not connected;
-- /admin/seo/import still computes the families of an uploaded CSV in the browser and says
-- that nothing was saved.
--
-- What it adds
--   seo_gsc_weekly        Search Console, one row per ISO week x query x page x country x
--                         device (Monday job, /api/cron/seo-weekly-data).
--   seo_bing_weekly       Bing Webmaster, one row per ISO week x kind x query x page. Bing's API
--                         has no country or device breakdown, so there is no such column.
--   seo_bing_links        inbound links Bing reports (GetLinkCounts + GetUrlLinks): our URL,
--                         the linking page, its domain, first and last week seen.
--   seo_weekly_runs       what each Monday pull did (source, status, row count, short detail),
--                         so the e-mail can say "Search Console: access refused" instead of
--                         staying silent.
--   seo_bing_ai_queries   the monthly Bing AI Performance export, queries tab (/admin/seo/import).
--   seo_bing_ai_pages     the same export, pages tab.
--   seo_weekly_pages, seo_weekly_queries, seo_weekly_query_pages
--                         read views that sum the weekly rows by page, by query, and by query
--                         x page for both engines (security_invoker: they see what the caller
--                         may see, which is nothing for anon and authenticated).
--
-- Who can read and write: the server only (service role). RLS is on with no policy and anon
-- and authenticated have no grant, so nothing here is readable from a browser. No personal data
-- of users is stored: search queries come aggregated and anonymised by Google and Bing, and the
-- link rows are public web pages.
--
-- Read in the catalogue on 2026-10-15 (SELECT only): no table named seo_* exists yet.

begin;

-- 1. Weekly traffic ---------------------------------------------------------------------

create table if not exists public.seo_gsc_weekly (
  id          bigint generated always as identity primary key,
  week_start  date        not null check (extract(isodow from week_start) = 1),
  row_key     text        not null check (row_key ~ '^[0-9a-f]{40}$'),
  query       text        not null default '',
  page        text        not null default '',
  country     text        not null default '',
  device      text        not null default '',
  clicks      integer     not null default 0 check (clicks >= 0),
  impressions integer     not null default 0 check (impressions >= 0),
  ctr         double precision,
  position    double precision,
  pulled_at   timestamptz not null default now(),
  constraint seo_gsc_weekly_unique unique (week_start, row_key)
);
comment on table public.seo_gsc_weekly is
  'Search Console Search Analytics by ISO week (week_start = Monday, Pacific dates) x query x page x country x device. row_key = sha1 of the four dimensions (lib/seo/weekly/store.ts). SEO Mission 3 part C.';
create index if not exists seo_gsc_weekly_week_page on public.seo_gsc_weekly (week_start, page);
create index if not exists seo_gsc_weekly_week_query on public.seo_gsc_weekly (week_start, query);

create table if not exists public.seo_bing_weekly (
  id                      bigint generated always as identity primary key,
  week_start              date        not null check (extract(isodow from week_start) = 1),
  kind                    text        not null check (kind in ('query', 'page', 'page_query')),
  row_key                 text        not null check (row_key ~ '^[0-9a-f]{40}$'),
  query                   text        not null default '',
  page                    text        not null default '',
  clicks                  integer     not null default 0 check (clicks >= 0),
  impressions             integer     not null default 0 check (impressions >= 0),
  avg_click_position      double precision,
  avg_impression_position double precision,
  pulled_at               timestamptz not null default now(),
  constraint seo_bing_weekly_unique unique (week_start, kind, row_key)
);
comment on table public.seo_bing_weekly is
  'Bing Webmaster traffic by ISO week. kind query: GetQueryStats (page empty); page: GetPageStats (query empty); page_query: GetPageQueryStats for the most seen pages. No country or device: the Bing API has none. SEO Mission 3 part C.';
create index if not exists seo_bing_weekly_week_kind on public.seo_bing_weekly (kind, week_start);

-- 2. Inbound links (Bing) ---------------------------------------------------------------

create table if not exists public.seo_bing_links (
  id            bigint generated always as identity primary key,
  row_key       text        not null unique check (row_key ~ '^[0-9a-f]{40}$'),
  target_url    text        not null,
  source_url    text        not null,
  source_domain text        not null,
  anchor_text   text        not null default '',
  first_seen    date        not null,
  last_seen     date        not null,
  check (last_seen >= first_seen)
);
comment on table public.seo_bing_links is
  'Inbound links reported by the Bing Webmaster API (GetLinkCounts then GetUrlLinks). row_key = sha1(target_url, source_url). first_seen and last_seen are the Mondays of the pulls that saw the link. SEO Mission 3 part C.';
create index if not exists seo_bing_links_domain on public.seo_bing_links (source_domain, first_seen);

-- 3. Pull log ---------------------------------------------------------------------------

create table if not exists public.seo_weekly_runs (
  id         bigint generated always as identity primary key,
  ran_at     timestamptz not null default now(),
  source     text        not null check (source in ('gsc', 'bing', 'report')),
  status     text        not null check (status in ('ok', 'skipped', 'error')),
  row_count  integer     not null default 0 check (row_count >= 0),
  detail     text        not null default '' check (length(detail) <= 300)
);
comment on table public.seo_weekly_runs is
  'One row per source per Monday run: ok, skipped (no key) or error, with a short detail that never holds a secret. SEO Mission 3 part C.';
create index if not exists seo_weekly_runs_source_time on public.seo_weekly_runs (source, ran_at desc);

-- 4. Monthly Bing AI Performance import (/admin/seo/import) -----------------------------

create table if not exists public.seo_bing_ai_queries (
  id             bigint generated always as identity primary key,
  month          date        not null check (extract(day from month) = 1),
  query          text        not null check (length(query) between 1 and 500),
  intent         text        not null default '',
  topic          text        not null default '',
  citations      integer     not null check (citations >= 0),
  citation_share double precision check (citation_share is null or (citation_share >= 0 and citation_share <= 1)),
  imported_at    timestamptz not null default now(),
  constraint seo_bing_ai_queries_unique unique (month, query)
);
comment on table public.seo_bing_ai_queries is
  'Bing AI Performance export, grounding queries, one upload per month (month = first day). citation_share is a fraction (0.2501 for 25.01%), null when the export had none. SEO Mission 3 part C.';

create table if not exists public.seo_bing_ai_pages (
  id             bigint generated always as identity primary key,
  month          date        not null check (extract(day from month) = 1),
  url            text        not null check (length(url) between 1 and 2000),
  citations      integer     not null check (citations >= 0),
  citation_share double precision check (citation_share is null or (citation_share >= 0 and citation_share <= 1)),
  imported_at    timestamptz not null default now(),
  constraint seo_bing_ai_pages_unique unique (month, url)
);
comment on table public.seo_bing_ai_pages is
  'Bing AI Performance export, cited pages, one upload per month (month = first day). SEO Mission 3 part C.';

-- 5. Read views -------------------------------------------------------------------------

create or replace view public.seo_weekly_pages with (security_invoker = true) as
  select 'google'::text as engine, week_start, page, sum(clicks)::bigint as clicks, sum(impressions)::bigint as impressions
    from public.seo_gsc_weekly
   group by week_start, page
  union all
  select 'bing'::text, week_start, page, sum(clicks)::bigint, sum(impressions)::bigint
    from public.seo_bing_weekly
   where kind = 'page'
   group by week_start, page;

create or replace view public.seo_weekly_queries with (security_invoker = true) as
  select 'google'::text as engine, week_start, query, sum(clicks)::bigint as clicks, sum(impressions)::bigint as impressions
    from public.seo_gsc_weekly
   group by week_start, query
  union all
  select 'bing'::text, week_start, query, sum(clicks)::bigint, sum(impressions)::bigint
    from public.seo_bing_weekly
   where kind = 'query'
   group by week_start, query;

create or replace view public.seo_weekly_query_pages with (security_invoker = true) as
  select 'google'::text as engine, week_start, query, page, sum(clicks)::bigint as clicks, sum(impressions)::bigint as impressions
    from public.seo_gsc_weekly
   group by week_start, query, page
  union all
  select 'bing'::text, week_start, query, page, sum(clicks)::bigint, sum(impressions)::bigint
    from public.seo_bing_weekly
   where kind = 'page_query'
   group by week_start, query, page;

-- 6. Access: server only -----------------------------------------------------------------

alter table public.seo_gsc_weekly      enable row level security;
alter table public.seo_bing_weekly     enable row level security;
alter table public.seo_bing_links      enable row level security;
alter table public.seo_weekly_runs     enable row level security;
alter table public.seo_bing_ai_queries enable row level security;
alter table public.seo_bing_ai_pages   enable row level security;

revoke all on public.seo_gsc_weekly, public.seo_bing_weekly, public.seo_bing_links, public.seo_weekly_runs,
              public.seo_bing_ai_queries, public.seo_bing_ai_pages,
              public.seo_weekly_pages, public.seo_weekly_queries, public.seo_weekly_query_pages
  from anon, authenticated;
grant select, insert, update, delete on public.seo_gsc_weekly, public.seo_bing_weekly, public.seo_bing_links,
              public.seo_weekly_runs, public.seo_bing_ai_queries, public.seo_bing_ai_pages
  to service_role;
grant select on public.seo_weekly_pages, public.seo_weekly_queries, public.seo_weekly_query_pages to service_role;

commit;

-- After applying (SELECT only, to check):
--   select count(*) from public.seo_gsc_weekly;                       -- 0 until the first Monday
--   select relname, relrowsecurity from pg_class
--    where relname like 'seo_%' and relkind = 'r';                     -- all true
--   select grantee, table_name, privilege_type from information_schema.role_table_grants
--    where table_name like 'seo_%' and grantee in ('anon', 'authenticated');  -- no rows
