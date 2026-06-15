-- 079 - Trimmed share tracking (replaces retired 061).
-- Creates ONLY the two tables the live share routes use
-- (apps/quiz/src/app/api/share/{generate,click/[code]}/route.ts +
-- apps/quiz/src/app/s/[code]/route.ts). The original 061 also created
-- dev_creator_earnings + altered the dev_user_byeol table, but both are now
-- obsolete (Byeol removed), so they are intentionally NOT in this file.
--
-- House RLS style: enable RLS, no public SELECT/INSERT policies; every write
-- goes through createServiceRoleClient() which bypasses RLS. The /generate
-- route is authed via createServerClient() + auth.getUser() so it inherits
-- the row owner's session, but the share_links policy still rejects anon.

create table if not exists public.dev_share_links (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  quiz_id            uuid not null references public.quizzes(id) on delete cascade,
  share_code         text not null unique,
  platform           text not null,
  click_count        int  not null default 0,
  unique_click_count int  not null default 0,
  created_at         timestamptz not null default now()
);
create index if not exists dev_share_links_user_quiz_platform_idx
  on public.dev_share_links(user_id, quiz_id, platform, created_at desc);
create index if not exists dev_share_links_share_code_idx
  on public.dev_share_links(share_code);

create table if not exists public.dev_share_clicks (
  id                uuid primary key default gen_random_uuid(),
  share_link_id     uuid not null references public.dev_share_links(id) on delete cascade,
  referrer          text,
  ip_hash           text,
  user_agent_hash   text,
  created_at        timestamptz not null default now()
);
create index if not exists dev_share_clicks_link_idx
  on public.dev_share_clicks(share_link_id);
create index if not exists dev_share_clicks_ip_idx
  on public.dev_share_clicks(share_link_id, ip_hash);

alter table public.dev_share_links  enable row level security;
alter table public.dev_share_clicks enable row level security;
-- Service-role-only by default (no policies) - matches the rest of the
-- house style for write-only tables (e.g. reports.update, battles writes).
