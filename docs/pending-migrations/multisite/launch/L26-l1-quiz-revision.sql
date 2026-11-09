-- L26-l1-quiz-revision.sql (lane titles, run O1, owner 2026-11-09, audit 04 P2-1)
--
-- What:   revising a Team quiz. Adds public.quiz_revision (the history: the quiz as it was before each revision) and the function
--         public.revise_team_quiz(slug, title, questions, settings, revised_by, note), service role only. In ONE transaction it writes the
--         history row, replaces the title, questions and settings of the quiz, and resets the inputs of the average (total_score_sum and
--         total_completions go to 0, so the page shows no average until 30 new completed plays). play_count and the plays rows are KEPT.
--         It refuses a quiz that is not published or whose creator is not an ACTIVE editorial (Team) account: a fan quiz is never revised.
-- Needs:  001 (public.quizzes), v12-g9-editorial.sql (public.editorial_accounts).
-- WHEN:   BEFORE or after the code: the code works with or without this file (without it a revision answers revision_not_live and
--         changes nothing, fail closed). After a backup, never during a build, never between 23:50 and 00:30 UTC. New table and
--         function only: no existing row changes.
-- Undo:   L26-l1-quiz-revision.rollback.sql (drops the function and the table; the history is lost, take the backup first. A quiz that was
--         revised keeps its revised content: the rollback does not restore old questions; restore them from the history rows before dropping if needed).
-- Shape:  ONE do block, no temp table, safe to run twice (a second run changes nothing).
--
-- Verify (after the apply):
-- Verify: select to_regclass('public.quiz_revision') is not null;   expect true
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'quiz_revision';   expect 12
-- Verify: select count(*) from pg_proc where proname = 'revise_team_quiz' and pronamespace = 'public'::regnamespace;   expect 1
-- Verify: select count(*) from public.quiz_revision;   expect 0

do $l26$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.quizzes') is null then raise exception 'L26: public.quizzes does not exist'; end if;
  if to_regclass('public.editorial_accounts') is null then raise exception 'L26: public.editorial_accounts does not exist (apply v12-g9-editorial.sql first)'; end if;

  create table if not exists public.quiz_revision (
    id                    bigserial primary key,
    quiz_id               uuid not null references public.quizzes(id) on delete cascade,
    revision_no           integer not null check (revision_no >= 1),
    revised_at            timestamptz not null default now(),
    revised_by            uuid,
    note                  text check (note is null or char_length(note) <= 500),
    prev_title            text not null,
    prev_questions        jsonb not null,
    prev_settings         jsonb,
    prev_total_score_sum  integer not null,
    prev_total_completions integer not null,
    play_count_kept       integer not null,
    unique (quiz_id, revision_no)
  );
  create index if not exists idx_quiz_revision_quiz on public.quiz_revision (quiz_id, revision_no desc);
  alter table public.quiz_revision enable row level security;
  revoke all on public.quiz_revision from public, anon, authenticated;
  grant select, insert on public.quiz_revision to service_role;
  grant usage, select on sequence public.quiz_revision_id_seq to service_role;

  create or replace function public.revise_team_quiz(p_slug text, p_title text, p_questions jsonb, p_settings jsonb, p_revised_by uuid, p_note text default null)
  returns integer language plpgsql security definer set search_path = public as $f$
  declare
    q public.quizzes%rowtype;
    n integer;
  begin
    select * into q from public.quizzes where slug = p_slug for update;
    if not found then raise exception 'revise_team_quiz: no quiz with slug %', p_slug using errcode = 'P0002'; end if;
    if q.status <> 'published' then raise exception 'revise_team_quiz: quiz % is not published', p_slug using errcode = 'P0001'; end if;
    if not exists (select 1 from public.editorial_accounts a where a.user_id = q.creator_id and a.active) then
      raise exception 'revise_team_quiz: quiz % is not a Team quiz', p_slug using errcode = 'P0001';
    end if;
    if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) < 1 then
      raise exception 'revise_team_quiz: questions must be a non-empty array' using errcode = 'P0001';
    end if;
    if p_title is not null and (char_length(p_title) < 5 or char_length(p_title) > 100) then
      raise exception 'revise_team_quiz: bad title length' using errcode = 'P0001';
    end if;

    select coalesce(max(revision_no), 0) + 1 into n from public.quiz_revision where quiz_id = q.id;
    insert into public.quiz_revision (quiz_id, revision_no, revised_by, note, prev_title, prev_questions, prev_settings, prev_total_score_sum, prev_total_completions, play_count_kept)
    values (q.id, n, p_revised_by, p_note, q.title, q.questions, q.settings, q.total_score_sum, q.total_completions, q.play_count);

    update public.quizzes
       set title = coalesce(p_title, title), questions = p_questions, settings = coalesce(p_settings, settings),
           total_score_sum = 0, total_completions = 0, updated_at = now()
     where id = q.id;
    -- question_count exists on current schemas only.
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quizzes' and column_name = 'question_count') then
      execute 'update public.quizzes set question_count = $1 where id = $2' using jsonb_array_length(p_questions), q.id;
    end if;
    return n;
  end $f$;

  revoke all on function public.revise_team_quiz(text, text, jsonb, jsonb, uuid, text) from public, anon, authenticated;
  grant execute on function public.revise_team_quiz(text, text, jsonb, jsonb, uuid, text) to service_role;

  -- Self-check.
  if to_regclass('public.quiz_revision') is null then raise exception 'L26: quiz_revision was not created'; end if;
  if to_regprocedure('public.revise_team_quiz(text,text,jsonb,jsonb,uuid,text)') is null then raise exception 'L26: revise_team_quiz was not created'; end if;

  perform pg_notify('pgrst', 'reload schema');
end
$l26$;
