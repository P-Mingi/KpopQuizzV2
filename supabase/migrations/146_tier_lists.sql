-- 146 - Tier List Maker (TIERLIST mission). Two tables + one public storage bucket.
-- DDL is owner-gated: this file is WRITTEN by the worker and APPLIED by the owner
-- (same posture as every migration in this repo). Until it is applied, the DB-backed
-- tier-list paths do not run live and their tests are marked gated.
--
-- Schema verified against the real database in PART 0: groups.id is integer;
-- profiles.id is uuid (= auth.users.id); the bank tables are groups/idols/albums/songs
-- (placements reference bank items by string id in jsonb, so no FK to them is needed).
-- Moderation status mirrors migration 064 (draft/pending/approved/rejected); the public
-- storage bucket + service-role-write posture mirrors migration 103 (avatars).

-- ============================================================================
-- tier_lists: one saved/published board.
-- ============================================================================
create table if not exists public.tier_lists (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  -- Authorship: a signed-in creator OR a logged-out anon session (mirrors plays'
  -- anon authorship). Public publish requires creator_id to be non-null (enforced in
  -- the app + the visibility RLS below), so an anon board can only be private/unlisted.
  creator_id        uuid references public.profiles(id) on delete set null,
  anon_id           text,
  -- Subject: the official-bank subject this list ranks, or null for a blank list.
  subject_group_id  integer references public.groups(id) on delete set null,
  subject_kind      text not null default 'blank'
                      check (subject_kind in ('members', 'tracks', 'albums', 'all', 'blank')),
  title             text not null,
  -- tiers: ordered [{label,color,ord}]. placements: {tierLabel|unranked: itemId[]}.
  tiers             jsonb not null default '[]'::jsonb,
  placements        jsonb not null default '{}'::jsonb,
  visibility        text not null default 'private'
                      check (visibility in ('public', 'unlisted', 'private')),
  views             integer not null default 0,
  likes             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- A public list must have a real creator (no anonymous public authorship).
  constraint tier_lists_public_needs_creator
    check (visibility <> 'public' or creator_id is not null)
);

-- The fandom-agrees aggregate reads every public list for a (subject_group_id,
-- subject_kind); this index makes that read cheap. It is computed at read time under
-- unstable_cache over a cookie-free client (PERF doctrine), so no counter table.
create index if not exists tier_lists_subject_idx
  on public.tier_lists (subject_group_id, subject_kind)
  where visibility = 'public';
create index if not exists tier_lists_creator_idx on public.tier_lists (creator_id);
create index if not exists tier_lists_public_recent_idx
  on public.tier_lists (created_at desc) where visibility = 'public';

alter table public.tier_lists enable row level security;

-- Read: public + unlisted rows are world-readable (unlisted = reachable by link, not
-- listed in feeds by the app); a private row is readable only by its creator. Anon
-- private rows are served through the service role, which bypasses RLS.
do $$ begin
  create policy "tier_lists public read"
    on public.tier_lists for select
    using (visibility in ('public', 'unlisted') or creator_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Write: a signed-in creator manages only their own rows. Anon saves go through the
-- service role (like plays), so no anon insert policy is granted here.
do $$ begin
  create policy "tier_lists creator insert"
    on public.tier_lists for insert with check (creator_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tier_lists creator update"
    on public.tier_lists for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tier_lists creator delete"
    on public.tier_lists for delete using (creator_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ============================================================================
-- tier_list_assets: custom user uploads, moderated before a PUBLIC list may use them.
-- A private/unlisted list may use a pending asset immediately (checked in the app).
-- ============================================================================
create table if not exists public.tier_list_assets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles(id) on delete cascade,
  anon_id     text,
  name        text not null,
  image_url   text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);

create index if not exists tier_list_assets_owner_idx on public.tier_list_assets (owner_id);
create index if not exists tier_list_assets_pending_idx
  on public.tier_list_assets (created_at) where status = 'pending';

alter table public.tier_list_assets enable row level security;

-- Read: an approved asset is world-readable (a public list can render it); an owner
-- always reads their own (to render their private lists mid-review).
do $$ begin
  create policy "tier_list_assets read approved or own"
    on public.tier_list_assets for select
    using (status = 'approved' or owner_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tier_list_assets owner insert"
    on public.tier_list_assets for insert with check (owner_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Storage bucket for the custom uploads (public read; writes via service role only,
-- exactly like the avatars bucket in migration 103).
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('tier-list-assets', 'tier-list-assets', true)
on conflict (id) do update set public = true;

do $$ begin
  create policy "tier-list-assets public read"
    on storage.objects for select
    using (bucket_id = 'tier-list-assets');
exception when duplicate_object then null; end $$;
