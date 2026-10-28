-- SEO strategy of 2026-10-27, Phase 0 point 4: indexing status of every page we track, per site.
-- OWNER-GATED: applied in production by Claude only on the owner's go. Rollback:
-- seo-index-status-rollback.sql.
--
-- Two new tables, written only by the daily URL Inspection job of Phase 2 (service role). Nothing
-- reads or writes them before that job exists.
--   seo_index_status  one row per (site, URL): the last answer of Google's URL Inspection API,
--                     our reason when the page is not indexed, and the next action of the loop
--                     (enrich, relink, resubmit) with its date. A /q/ page keeps its quiz_id.
--   seo_index_checks  one row per inspection (append only), for the weekly table and trends.
-- Kpop and anime: site_id is 'kpop' (kpopquiz.org) or 'anime' (fandomverse.org/anime), the same values
-- as the site_id of Run O1. Quota: 2,000 inspections a day per property, so the job reads the
-- rows never inspected first, then the oldest.
-- Access: RLS on with no policy, and no grant to anon or authenticated: service role only. These
-- rows are internal (not shown on any public page).
-- Purely additive: it creates two tables and changes nothing that exists.

begin;

create table if not exists public.seo_index_status (
  site_id text not null default 'kpop' check (site_id in ('kpop', 'anime')),
  url text not null check (url ~ '^https://'),
  page_kind text not null default 'quiz' check (page_kind in ('quiz', 'hub', 'theme', 'other')),
  quiz_id uuid references public.quizzes (id) on delete set null,
  first_seen_at timestamptz not null default now(),
  inspected_at timestamptz,
  indexed boolean,
  verdict text,
  coverage_state text,
  indexing_state text,
  robots_txt_state text,
  page_fetch_state text,
  google_canonical text,
  user_canonical text,
  last_crawl_at timestamptz,
  first_indexed_at timestamptz,
  not_indexed_since timestamptz,
  reason text,
  next_action text check (next_action in ('enrich', 'relink', 'resubmit', 'none')),
  next_action_at timestamptz,
  actions jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array'),
  raw jsonb,
  updated_at timestamptz not null default now(),
  primary key (site_id, url)
);

comment on table public.seo_index_status is
  'SEO 2026-10-27: last URL Inspection result per (site, URL), reason when not indexed, next action of the loop. Service role only.';
comment on column public.seo_index_status.not_indexed_since is
  'Start of the current not-indexed streak; after 21 days the page enters the enrichment queue.';
comment on column public.seo_index_status.actions is
  'Log of the loop actions taken, oldest first: [{"at": timestamptz, "action": "enrich|relink|resubmit", "note": text}].';

create index if not exists seo_index_status_due on public.seo_index_status (site_id, inspected_at nulls first);
create index if not exists seo_index_status_not_indexed on public.seo_index_status (site_id, not_indexed_since) where indexed is false;
create index if not exists seo_index_status_quiz on public.seo_index_status (quiz_id) where quiz_id is not null;

create table if not exists public.seo_index_checks (
  id bigint generated always as identity primary key,
  site_id text not null check (site_id in ('kpop', 'anime')),
  url text not null,
  inspected_at timestamptz not null default now(),
  indexed boolean,
  verdict text,
  coverage_state text,
  last_crawl_at timestamptz
);

comment on table public.seo_index_checks is
  'SEO 2026-10-27: one row per URL Inspection call (append only), for the weekly table. Service role only.';

create index if not exists seo_index_checks_site_time on public.seo_index_checks (site_id, inspected_at);
create index if not exists seo_index_checks_url on public.seo_index_checks (site_id, url, inspected_at desc);

alter table public.seo_index_status enable row level security;
alter table public.seo_index_checks enable row level security;
revoke all on public.seo_index_status from anon, authenticated;
revoke all on public.seo_index_checks from anon, authenticated;

commit;
