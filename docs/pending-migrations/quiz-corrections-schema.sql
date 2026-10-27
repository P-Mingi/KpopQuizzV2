-- Quiz corrections (owner, 2026-10-27): "Quiz de joueurs : ne touche pas à leurs questions. Envoie une
-- notification au créateur (creator_notifications) avec la question et la correction sourcée, délai de 14
-- jours, puis brouillon si rien n'a changé. Prépare le job et son SQL."
-- OWNER-GATED: applied in production by Claude only on the owner's go. Nothing here is applied yet.
-- Rollback: quiz-corrections-schema-rollback.sql. First lot of requests: quiz-corrections-e1.sql.
-- The job: apps/quiz/src/app/api/cron/quiz-corrections/route.ts (rules in apps/quiz/src/lib/quiz-corrections/).
--
-- Three changes, one transaction:
-- 1. creator_notifications_type_check: the 14 live types (unchanged) plus 'quiz_correction'.
-- 2. gate_notification_prefs(), the BEFORE INSERT preference gate: a 'quiz_correction' row passes before the
--    category toggles and the per-quiz mutes are read. Why: today an unmapped type already skips the category
--    check (cat is NULL), but the per-quiz mute would still drop it, and a creator who muted their own quiz
--    (the bell's "mute this quiz") would never learn that the quiz moves to draft in 14 days. A notice about
--    the creator's own content that ends in a moderation step is a service notice, like a transactional
--    email: it cannot be silenced. No settings toggle claims to control it (it is in no category of
--    lib/notification-types.ts). Every other type goes through the gate exactly as before.
-- 3. public.quiz_correction_requests: one row per wrong answer found by a fact-check, with the question and
--    the marked answer as they were when checked, the correction (1 or 2 sentences, at most 280 characters)
--    and its https source. Status: pending -> notified (notice sent, deadline = +14 days) -> resolved (the
--    question changed) or drafted (unchanged at the deadline: the quiz was moved to draft); cancelled when
--    the quiz was removed or flagged. One open (pending or notified) request per quiz and question. Service
--    role only: RLS on, no policy, nothing granted to anon or authenticated (the Supabase default
--    privileges grant them everything on a new table, so they are revoked explicitly).
--
-- Guards: the CHECK and the gate function must still be exactly the ones read in production on 2026-10-27
-- (a later migration that changed either would be undone by this file): otherwise nothing is applied.
-- Running it twice fails on the guard of the CHECK (it already lists quiz_correction) and changes nothing.

begin;

do $$
begin
  if (select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.creator_notifications'::regclass and conname = 'creator_notifications_type_check')
     is distinct from
     'CHECK ((type = ANY (ARRAY[''milestone''::text, ''rating''::text, ''comment''::text, ''admin_dm''::text, ''new_follower''::text, ''streak_milestone''::text, ''group_mastered''::text, ''followed_new_quiz''::text, ''badge_earned''::text, ''cheer''::text, ''verse_watch''::text, ''battle_beaten''::text, ''community_reply''::text, ''community_comment''::text])))'
  then
    raise exception 'quiz corrections schema: creator_notifications_type_check is not the one of 2026-10-27, nothing applied';
  end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.gate_notification_prefs()'::regprocedure)
     is distinct from 'ec61d1465cb4016fdb26765b5ab7c88c'
  then
    raise exception 'quiz corrections schema: gate_notification_prefs() is not the one of 2026-10-27, nothing applied';
  end if;
end $$;

-- 1. The type: every existing value, plus quiz_correction.
alter table public.creator_notifications drop constraint creator_notifications_type_check;
alter table public.creator_notifications add constraint creator_notifications_type_check
  check (type = any (array['milestone', 'rating', 'comment', 'admin_dm', 'new_follower', 'streak_milestone', 'group_mastered', 'followed_new_quiz', 'badge_earned', 'cheer', 'verse_watch', 'battle_beaten', 'community_reply', 'community_comment', 'quiz_correction']));

-- 2. The preference gate: the same function with one early return for quiz_correction.
create or replace function public.gate_notification_prefs() returns trigger
language plpgsql security definer set search_path = public as $$
DECLARE
  cat TEXT;
  prefs public.notification_prefs%ROWTYPE;
BEGIN
  -- Quiz corrections (2026-10-27): a sourced correction to the recipient's own quiz always gets
  -- through. No category toggle and no per-quiz mute drops it: ignored, it ends with the quiz in
  -- draft after 14 days, so the creator must always receive it.
  IF NEW.type = 'quiz_correction' THEN
    RETURN NEW;
  END IF;

  cat := CASE NEW.type
    WHEN 'milestone' THEN 'your_quizzes'
    WHEN 'rating' THEN 'your_quizzes'
    WHEN 'comment' THEN 'your_quizzes'
    WHEN 'new_follower' THEN 'social'
    WHEN 'cheer' THEN 'social'
    WHEN 'battle_beaten' THEN 'social'
    WHEN 'verse_watch' THEN 'social'
    WHEN 'community_reply' THEN 'social'
    WHEN 'community_comment' THEN 'social'
    WHEN 'badge_earned' THEN 'achievements'
    WHEN 'group_mastered' THEN 'achievements'
    WHEN 'streak_milestone' THEN 'achievements'
    WHEN 'followed_new_quiz' THEN 'following'
    WHEN 'admin_dm' THEN 'announcements'
    ELSE NULL
  END;

  SELECT * INTO prefs FROM public.notification_prefs WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF cat IS NOT NULL AND (prefs.categories->>cat) = 'false' THEN
    RETURN NULL;
  END IF;
  IF NEW.quiz_id IS NOT NULL AND NEW.quiz_id = ANY(prefs.quiz_mutes) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END $$;

-- 3. The requests.
create table public.quiz_correction_requests (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  -- 0-based index in quizzes.questions (a quiz has at most 20 questions: questions_max)
  q_index smallint not null check (q_index between 0 and 19),
  -- the question text and the marked answer text exactly as they were when the fact-check ran; the job
  -- compares them with the live quiz ("True"/"False" for a true or false question)
  question text not null check (char_length(question) > 0),
  marked_answer text not null check (char_length(marked_answer) > 0),
  correction text not null check (char_length(correction) between 20 and 280),
  source_url text not null check (source_url ~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/[^[:space:]]*)?$'),
  -- the fact-check lot that found it ('E1', ...)
  lot text not null check (char_length(lot) between 1 and 40),
  status text not null default 'pending'
    check (status in ('pending', 'notified', 'resolved', 'drafted', 'cancelled')),
  notified_at timestamptz,
  deadline_at timestamptz,
  drafted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint quiz_correction_requests_notified_dates
    check (status not in ('notified', 'drafted') or (notified_at is not null and deadline_at is not null)),
  constraint quiz_correction_requests_deadline_after
    check (deadline_at is null or notified_at is null or deadline_at > notified_at),
  constraint quiz_correction_requests_drafted_at
    check (status <> 'drafted' or drafted_at is not null)
);

comment on table public.quiz_correction_requests is
  'Quiz corrections 2026-10-27: a sourced correction to a player quiz question. The cron /api/cron/quiz-corrections notifies the creator, waits 14 days, then moves the quiz to draft if the question is unchanged. The quiz questions are never edited.';

-- one open request per quiz and question
create unique index quiz_correction_requests_one_open
  on public.quiz_correction_requests (quiz_id, q_index)
  where status in ('pending', 'notified');
-- the job reads pending ones by age, notified ones by deadline
create index quiz_correction_requests_open
  on public.quiz_correction_requests (status, deadline_at, created_at)
  where status in ('pending', 'notified');

alter table public.quiz_correction_requests enable row level security;
revoke all on table public.quiz_correction_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.quiz_correction_requests to service_role;

commit;
