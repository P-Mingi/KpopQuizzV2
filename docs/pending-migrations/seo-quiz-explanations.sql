-- SEO strategy of 2026-10-27, Phase 0 point 3: the table of verified explanations, one per quiz
-- question. OWNER-GATED: applied in production by Claude only on the owner's go, before the
-- first explanation lot (seo-explanations-e1.sql). Rollback: seo-quiz-explanations-rollback.sql.
--
-- Why a table and not the quiz itself: the questions of a player's quiz stay the creator's
-- content, untouched. Our explanations live beside them, each with its source and the lot that
-- checked it, and can be retired without touching the quiz.
-- Each row keeps the question text and the right answer text as they were when the explanation
-- was checked. The Phase 1 code shows an explanation only while the live question and answer
-- still match them exactly: if the creator edits the question, the explanation disappears on
-- its own instead of explaining a different question.
-- Kpop and anime: a row belongs to its quiz, and the quiz carries the site.
-- Access: public read of verified rows (the quiz page reads them with the public key, like the
-- quiz itself); writes only through SQL lots run with the service role.
-- Purely additive: it creates one table and changes nothing that exists.

begin;

create table if not exists public.quiz_explanations (
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  q_index smallint not null check (q_index >= 0),
  question text not null,
  answer text not null,
  explanation text not null check (char_length(explanation) between 40 and 300),
  source_url text not null check (source_url ~ '^https://'),
  status text not null default 'verified' check (status in ('verified', 'retired')),
  lot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (quiz_id, q_index)
);

comment on table public.quiz_explanations is
  'SEO 2026-10-27: verified explanation and source per quiz question. Shown only while question and answer still match the live quiz.';

alter table public.quiz_explanations enable row level security;
revoke all on public.quiz_explanations from anon, authenticated;
grant select on public.quiz_explanations to anon, authenticated;
drop policy if exists quiz_explanations_public_read on public.quiz_explanations;
create policy quiz_explanations_public_read on public.quiz_explanations
  for select to anon, authenticated using (status = 'verified');

commit;
