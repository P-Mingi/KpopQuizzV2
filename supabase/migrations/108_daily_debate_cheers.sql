-- 108 - Daily Debate + cheers (Workstream F2b, the conversation layer).
--
-- Adds the debate question bank, one-debate-per-day, one-vote-per-user-per-day
-- with an optional comment, and cheers on the activity feed. Two RPCs:
-- ensure_daily_debate (service-role, idempotent, same pattern as the daily
-- quiz) and cast_debate_vote (authenticated, one shot, returns the live split).
--
-- Read paths stay cheap and indexed. The only new writes are a single debate
-- vote row and a single cheer row, both indexed and one-per-user-per-target.
--
-- NOTE: this also extends the core public.reports table so a debate comment can
-- be reported through the SAME reports infra rather than a parallel table (spec
-- B3). reports is already a loose multi-target table (mig 078 made quiz_id
-- nullable for question reports), so we only add an optional debate_vote_id
-- column and add NO cross-target check.

-- 1. Question bank (owner-seeded in 109) ------------------------------------
create table if not exists public.debate_questions (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  side_a     text not null,
  side_b     text not null,
  used_on    date,                  -- null = unused; set when picked for a day
  created_at timestamptz not null default now()
);

-- 2. One debate per day -----------------------------------------------------
create table if not exists public.daily_debates (
  date        date primary key default current_date,
  question_id uuid not null references public.debate_questions(id),
  created_at  timestamptz not null default now()
);

-- 3. Votes: one per user per day, optional comment attached to the side ------
create table if not exists public.debate_votes (
  id         uuid primary key default gen_random_uuid(),
  date       date not null references public.daily_debates(date),
  user_id    uuid not null references auth.users(id),
  side       char(1) not null check (side in ('a','b')),
  comment    text check (char_length(comment) <= 280),
  created_at timestamptz not null default now(),
  unique (date, user_id)
);
create index if not exists idx_debate_votes_date on public.debate_votes (date, side);

-- 4. Cheers on activity events: one tap, one per user per event -------------
create table if not exists public.activity_cheers (
  event_id   bigint not null references public.activity_events(id) on delete cascade,
  user_id    uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
-- No separate event_id index: the (event_id, user_id) PK already leads with
-- event_id, so the per-event cheer-count read rides it.

-- RLS -----------------------------------------------------------------------
alter table public.debate_questions enable row level security;
alter table public.daily_debates    enable row level security;
alter table public.debate_votes     enable row level security;
alter table public.activity_cheers  enable row level security;

-- Unused questions stay secret so tomorrow's pick cannot be read early. The
-- SECURITY DEFINER picker below bypasses this to choose.
drop policy if exists dq_read on public.debate_questions;
create policy dq_read on public.debate_questions for select using (used_on is not null);

drop policy if exists dd_read on public.daily_debates;
create policy dd_read on public.daily_debates for select using (true);

drop policy if exists dv_read on public.debate_votes;
create policy dv_read on public.debate_votes for select using (true);
drop policy if exists dv_ins on public.debate_votes;
create policy dv_ins on public.debate_votes for insert with check (auth.uid() = user_id);

drop policy if exists ac_read on public.activity_cheers;
create policy ac_read on public.activity_cheers for select using (true);
drop policy if exists ac_ins on public.activity_cheers;
create policy ac_ins on public.activity_cheers for insert with check (auth.uid() = user_id);

-- ensure_daily_debate: idempotent, picks a random unused question, marks it ---
create or replace function public.ensure_daily_debate(p_date date default current_date)
returns date language plpgsql security definer set search_path = public as $$
declare v_qid uuid;
begin
  if exists (select 1 from public.daily_debates where date = p_date) then return p_date; end if;
  select id into v_qid from public.debate_questions where used_on is null order by random() limit 1;
  if v_qid is null then return null; end if;  -- bank empty: no debate today (UI hides)
  update public.debate_questions set used_on = p_date where id = v_qid;
  insert into public.daily_debates (date, question_id) values (p_date, v_qid)
    on conflict (date) do nothing;
  return p_date;
end $$;
revoke execute on function public.ensure_daily_debate(date) from anon, authenticated;

-- cast_debate_vote: vote + optional comment, one shot, returns the live split -
create or replace function public.cast_debate_vote(p_side char, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_a int; v_b int;
begin
  if v_uid is null then return jsonb_build_object('error','not_authenticated'); end if;
  if p_side not in ('a','b') then return jsonb_build_object('error','bad_side'); end if;
  -- No debate today (bank empty) means no daily_debates row to satisfy the FK.
  if not exists (select 1 from public.daily_debates where date = current_date) then
    return jsonb_build_object('error','no_debate');
  end if;
  insert into public.debate_votes (date, user_id, side, comment)
  values (current_date, v_uid, p_side, nullif(trim(p_comment), ''))
  on conflict (date, user_id) do nothing;
  select count(*) filter (where side='a'), count(*) filter (where side='b')
    into v_a, v_b from public.debate_votes where date = current_date;
  perform public.emit_activity('debate_voted', v_uid, null, jsonb_build_object('side', p_side));
  return jsonb_build_object('a', v_a, 'b', v_b);
end $$;
grant execute on function public.cast_debate_vote(char, text) to authenticated;

-- Reuse the reports table for debate-comment reports (spec B3, no new table) --
-- The table is ALREADY a loose multi-target table: mig 078 made quiz_id
-- nullable and added question-level reports (quiz_id null, question_text set).
-- So we only add another optional target column. We deliberately do NOT add a
-- cross-target check: existing question reports legitimately have quiz_id null,
-- and such a check rejects them (that is exactly what failed on the first run).
alter table public.reports add column if not exists debate_vote_id uuid
  references public.debate_votes(id) on delete cascade;
