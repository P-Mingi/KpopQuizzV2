-- ============================================================
-- PINTEREST CARDS V2 - Schema
-- ============================================================

-- Add background image column to existing quizzes table
alter table public.quizzes
  add column if not exists pinterest_background_image_url text,
  add column if not exists pinterest_background_uploaded_at timestamptz;

-- Cards table: 3 rows per quiz (one per variant)
create table public.quiz_pinterest_cards (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  variant text not null check (variant in ('editorial', 'neon', 'y2k')),
  card_image_url text,
  generation_status text not null default 'pending' check (generation_status in ('pending', 'generating', 'ready', 'failed')),
  generation_error text,
  generated_at timestamptz,
  pinterest_status text not null default 'unposted' check (pinterest_status in ('unposted', 'queued', 'posted', 'failed')),
  pinterest_posted_at timestamptz,
  pinterest_pin_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(quiz_id, variant)
);

create index quiz_pinterest_cards_quiz_idx on public.quiz_pinterest_cards(quiz_id);
create index quiz_pinterest_cards_status_idx on public.quiz_pinterest_cards(generation_status);
create index quiz_pinterest_cards_posted_idx on public.quiz_pinterest_cards(pinterest_status);

-- RLS: service role handles all access (admin routes use createServiceRoleClient)
alter table public.quiz_pinterest_cards enable row level security;

-- Allow service role full access (bypasses RLS automatically)
-- Allow authenticated reads for admin panel (auth check happens in API routes)
create policy quiz_pinterest_cards_select
  on public.quiz_pinterest_cards
  for select
  using (true);

create policy quiz_pinterest_cards_insert
  on public.quiz_pinterest_cards
  for insert
  with check (true);

create policy quiz_pinterest_cards_update
  on public.quiz_pinterest_cards
  for update
  using (true);

create policy quiz_pinterest_cards_delete
  on public.quiz_pinterest_cards
  for delete
  using (true);

-- ============================================================
-- Storage bucket policies
-- ============================================================

-- Backgrounds: public reads (uploads handled via service role in API routes)
insert into storage.buckets (id, name, public) values ('quiz-backgrounds', 'quiz-backgrounds', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('quiz-pinterest-cards', 'quiz-pinterest-cards', true)
  on conflict (id) do nothing;

-- Public read for both buckets
create policy "quiz_bg_public_read"
  on storage.objects for select
  using (bucket_id = 'quiz-backgrounds');

create policy "quiz_cards_public_read"
  on storage.objects for select
  using (bucket_id = 'quiz-pinterest-cards');

-- Service role handles uploads (bypasses RLS automatically)
-- Allow authenticated uploads for admin routes that use anon key
create policy "quiz_bg_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'quiz-backgrounds' and auth.role() = 'authenticated');

create policy "quiz_bg_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'quiz-backgrounds' and auth.role() = 'authenticated');

create policy "quiz_cards_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'quiz-pinterest-cards' and auth.role() = 'authenticated');

create policy "quiz_cards_auth_update"
  on storage.objects for update
  using (bucket_id = 'quiz-pinterest-cards' and auth.role() = 'authenticated');
