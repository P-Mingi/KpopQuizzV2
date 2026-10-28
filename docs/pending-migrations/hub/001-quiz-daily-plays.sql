-- 001-quiz-daily-plays.sql (run O1, lot H2b; the daily plays table of the Hot right now block of fandomverse.org)
--
-- What:   creates public.quiz_daily_plays (one row per quiz and UTC day: plays, and started when something records it), its RLS (read
--         for everyone, no insert, update or delete policy), and public.hub_refresh_quiz_daily(p_days), the function that fills it from
--         public.plays and prunes rows older than 30 days (security definer, EXECUTE for service_role only).
-- Why:    Plan.dc.html section 3.A: the Hot score weighs the plays of each of the last 7 days by 0.85 to the power of its age, and the
--         plan asks for "a small daily table (quiz, day, plays) filled at night" when no per-day count exists. plays holds one row per
--         finished run, so a per-day count can be derived from it, but through PostgREST that means paging every row of the week
--         (1000 rows a page). The block works WITHOUT this table (it pages the plays rows of the 7 days, lib/site/hub/data/hot.ts) and
--         uses the table when it exists and reaches yesterday; today always comes from plays.
--         `started` is NULL everywhere today: no server record of a started run exists (the Continue state is localStorage, see
--         lib/ux-v1/p4/continue.ts). The column is here so the completion rate of the Plan (finished over started, exclusion under
--         40%) can be switched on the day something writes it; until then the block uses the neutral completion 1.
-- Rows:   1 table, 1 index, 1 function. The function writes at most (quizzes played in the window) rows per day of the window.
-- Needs:  public.plays, public.quizzes (always there). No site_id: the quiz carries the site.
-- Schedule: call `select public.hub_refresh_quiz_daily(8);` once a night after 00:30 UTC (a cron route or the owner's scheduler; not part of
--         this file). Re-running it any time is safe: it recomputes the last p_days days, today included, and keeps `started` untouched.
-- Verify: select to_regclass('public.quiz_daily_plays');   expect quiz_daily_plays
--         select relrowsecurity from pg_class where oid = 'public.quiz_daily_plays'::regclass;   expect t
--         select has_function_privilege('anon', 'public.hub_refresh_quiz_daily(integer)', 'execute'), has_function_privilege('service_role', 'public.hub_refresh_quiz_daily(integer)', 'execute');   expect f, t
--         select public.hub_refresh_quiz_daily(8);   expect the number of rows written
-- Undo:   001-quiz-daily-plays.rollback.sql
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $o1h$ begin
  if to_regclass('public.plays') is null or to_regclass('public.quizzes') is null then
    raise exception '001-quiz-daily-plays: public.plays or public.quizzes is missing';
  end if;
end $o1h$;

create table if not exists public.quiz_daily_plays (
  quiz_id uuid not null constraint quiz_daily_plays_quiz_id_fkey references public.quizzes(id) on delete cascade,
  day date not null,
  plays integer not null default 0 constraint quiz_daily_plays_plays_check check (plays >= 0),
  started integer constraint quiz_daily_plays_started_check check (started is null or started >= 0),
  constraint quiz_daily_plays_pkey primary key (quiz_id, day)
);
create index if not exists quiz_daily_plays_day_idx on public.quiz_daily_plays (day);

alter table public.quiz_daily_plays enable row level security;

-- Counts of finished runs only, as public as the plays rows they come from (plays_select_all).
do $o1h$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_daily_plays' and policyname = 'quiz_daily_plays_select_all') then
    create policy quiz_daily_plays_select_all on public.quiz_daily_plays for select to anon, authenticated using (true);
  end if;
end $o1h$;

revoke all on public.quiz_daily_plays from public, anon, authenticated;
grant select on public.quiz_daily_plays to anon, authenticated;
grant all on public.quiz_daily_plays to service_role;

-- Recomputes the last p_days UTC days (today included) from public.plays: upserts the counts, zeroes a day whose plays were all deleted,
-- never touches `started`, and prunes rows older than 30 days. Returns the number of rows upserted.
create or replace function public.hub_refresh_quiz_daily(p_days integer default 8)
  returns integer
  language plpgsql security definer set search_path = public
  as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_from  date;
  v_n     integer;
begin
  if p_days is null or p_days < 1 or p_days > 30 then
    raise exception 'hub_refresh_quiz_daily: p_days must be between 1 and 30';
  end if;
  v_from := v_today - (p_days - 1);

  with counted as (
    select p.quiz_id, (p.created_at at time zone 'utc')::date as day, count(*)::integer as n
      from public.plays p
     where p.created_at >= (v_from::timestamp at time zone 'utc')
       and p.quiz_id is not null
     group by 1, 2
  ), up as (
    insert into public.quiz_daily_plays as d (quiz_id, day, plays)
    select quiz_id, day, n from counted
    on conflict (quiz_id, day) do update set plays = excluded.plays
    returning 1
  )
  select count(*) into v_n from up;

  update public.quiz_daily_plays d
     set plays = 0
   where d.day >= v_from
     and d.plays <> 0
     and not exists (
       select 1 from public.plays p
        where p.quiz_id = d.quiz_id
          and (p.created_at at time zone 'utc')::date = d.day);

  delete from public.quiz_daily_plays where day < v_today - 30;
  return v_n;
end
$$;

revoke all on function public.hub_refresh_quiz_daily(integer) from public, anon, authenticated;
grant execute on function public.hub_refresh_quiz_daily(integer) to service_role;
