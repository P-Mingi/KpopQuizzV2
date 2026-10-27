-- SEO strategy of 2026-10-27, Phase 0 point 4: right or wrong per question, stored with each play.
-- OWNER-GATED: applied in production by Claude only on the owner's go. Rollback:
-- seo-plays-per-question-correct-rollback.sql.
--
-- What it adds: plays.per_question_correct, a jsonb array of booleans, one per question in the
-- order the questions were asked (true = answered right). It sits next to the existing
-- plays.per_question_times (same shape: a jsonb array, written after the play). It lets the
-- site show a real per-question success rate later ("68% over 412 answers"), never a typed one.
--
-- Safe on a live table: a nullable column with no default is a catalog change only (no table
-- rewrite, no long lock). Old plays keep null; nothing reads the column until the Phase 1 code
-- writes it. The check only accepts null or an array of booleans that is not longer than the
-- play's total_questions.
-- Kpop and anime: plays has no site column of its own; a play belongs to its quiz, and the quiz
-- carries the site. Nothing site-specific here.

begin;

alter table public.plays add column if not exists per_question_correct jsonb;

alter table public.plays drop constraint if exists plays_per_question_correct_shape;
alter table public.plays add constraint plays_per_question_correct_shape check (
  per_question_correct is null
  or (
    jsonb_typeof(per_question_correct) = 'array'
    and jsonb_array_length(per_question_correct) <= greatest(coalesce(total_questions, 0), 0)
    and not jsonb_path_exists(per_question_correct, '$[*] ? (@.type() != "boolean")')
  )
) not valid;
-- not valid: existing rows are all null, so there is nothing to scan; new rows are checked.

comment on column public.plays.per_question_correct is
  'SEO 2026-10-27: jsonb array of booleans, one per question in play order (true = right). Null for plays before Phase 1.';

commit;
