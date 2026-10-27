-- 012-editorial-quiz.sql (run O1, lane K1 (the brief of lot (e) part 1 builds the SQL of E1b's row); manifest.md row 16; BACKLOG 4.1 row 26; schema.sql section "@file 012-editorial-quiz")
--
-- What:   creates public.review_batches (the human review batches of editorial quiz drafts: site, lane, label, size 1 to 50,
--         sample and error counts, status open/approved/rejected/partial, reviewer) with RLS and no policy; lets
--         editorial_drafts carry quizzes: editorial_drafts_kind_check also accepts 'quiz', new columns payload (jsonb) and
--         review_batch_id (FK review_batches, on delete set null), the check editorial_drafts_payload_check (a quiz draft needs
--         an object payload) and a partial index on review_batch_id.
-- Why:    the anime editorial desk writes quiz drafts that a human batch review approves before they publish (E1b, /admin/review).
-- Rows:   1 new table, 2 new columns; no row is inserted or changed (every existing draft has a kind that is not 'quiz', so
--         the new check passes on all of them).
-- Access: review_batches is service role only: RLS on, no policy, and anon and authenticated lose their table grants
--         (/admin/review reads it through the server).
-- Decisions where the contract is silent: the two checks are replaced with DROP CONSTRAINT IF EXISTS then ADD CONSTRAINT, so a
--         second run ends in the same state.
-- Verify: select relrowsecurity from pg_class where oid = 'public.review_batches'::regclass;                      expect t
--         select count(*) from pg_policy where polrelid = 'public.review_batches'::regclass;                      expect 0
--         select pg_get_constraintdef(oid) from pg_constraint where conname = 'editorial_drafts_kind_check';     expect the four kinds
--         select count(*) from public.editorial_drafts where kind = 'quiz';                                      expect 0
-- Undo:   012-editorial-quiz.rollback.sql (refused while a review batch, a quiz draft or a payload exists).
-- Needs:  002a (editorial_drafts.site_id), 001 (sites).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.editorial_drafts') is null or to_regclass('public.sites') is null then
    raise exception '012-editorial-quiz: public.editorial_drafts or public.sites is missing';
  end if;
end $$;

create table if not exists public.review_batches (
  id bigint generated always as identity constraint review_batches_pkey primary key,
  site_id text not null constraint review_batches_site_id_fkey references public.sites(id),
  lane text not null,
  label text not null,
  size smallint not null constraint review_batches_size_check check (size between 1 and 50),
  sample_size smallint not null default 0,
  errors smallint not null default 0,
  status text not null default 'open' constraint review_batches_status_check check (status in ('open', 'approved', 'rejected', 'partial')),
  reviewed_by uuid constraint review_batches_reviewed_by_fkey references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint review_batches_reviewed_check check (status = 'open' or (reviewed_by is not null and reviewed_at is not null))
);
create index if not exists review_batches_site_status_idx on public.review_batches (site_id, status);
alter table public.review_batches enable row level security;
-- (no policy: service role only; /admin/review reads through the server)
revoke all on public.review_batches from anon, authenticated;

alter table public.editorial_drafts drop constraint if exists editorial_drafts_kind_check;
alter table public.editorial_drafts add constraint editorial_drafts_kind_check check (kind in ('thread', 'debate', 'blog', 'quiz'));
alter table public.editorial_drafts add column if not exists payload jsonb;
alter table public.editorial_drafts add column if not exists review_batch_id bigint constraint editorial_drafts_review_batch_id_fkey references public.review_batches(id) on delete set null;
alter table public.editorial_drafts drop constraint if exists editorial_drafts_payload_check;
alter table public.editorial_drafts add constraint editorial_drafts_payload_check check (kind <> 'quiz' or (payload is not null and jsonb_typeof(payload) = 'object'));
create index if not exists editorial_drafts_review_batch_idx on public.editorial_drafts (review_batch_id) where review_batch_id is not null;
