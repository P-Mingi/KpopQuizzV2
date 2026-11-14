-- 115-quiz-of-day-bonus.sql (KpopCards, run O1 lane c4q, 2026-11-14; the quiz of the day gives one pack; integrator rule, overrides decision 28)
--
-- What:   in ONE DO block:
--           constraint cards_bonus_earned_source_check   widened from ('quiz', 'kpopdle') to ('quiz', 'kpopdle', 'quiz_of_day')
--           index      cards_bonus_earned_quiz_day_key    unique (user_id, paris_day) where source = 'quiz_of_day': never two a Paris day, even in parallel
--           function   cards_bonus_record(user, now)      002's recording of the Kpopdle wins (unchanged) PLUS the quiz of the day: one row 'quiz_of_day' per
--                                                         Paris day for a signed-in player who finished the quiz that was the quiz of the day
--           function   cards_bonus_sync(user, now)        calls cards_bonus_record, returns jsonb {earned, quiz}: the bonus packs earned that Paris day and
--                                                         whether one of them is the quiz of the day (the lobby box reads it)
-- Why:    the integrator decided that finishing the quiz of the day gives +1 pack, counted inside CARDS_BONUS_PER_DAY (the cap does not move: 3 Kpopdle
--         wins and the quiz still open 3 packs), once per Paris day. The cards live on bunnyverse.org and the quiz on kpopquiz.org, so a cross-site call
--         is refused (403); the hub's server therefore records it itself (the lobby state and the opening of a bonus pack call these functions) and
--         no browser report is needed.
-- Rule:   a row is written for the player when a public.plays row of the player exists with all of:
--           player_id = the player (a guest has none, a Team account is refused by the server before this is called), total_questions > 0,
--           created_at on the Paris day of p_now and not after p_now (the play is stamped when it is finished: record_play inserts it at the end),
--           the quiz is published, is_quiz_of_the_day, and its quiz_of_the_day_date is the UTC date of the play (the date the site showed it as the
--           quiz of the day: the daily quiz is keyed by UTC date, the allowance by Paris date), and kpop's when quizzes.site_id exists.
--         The first such play of the Paris day is the one recorded. The key (source, play_ref) is 'quiz_of_day', 'quiz_of_day:<quiz date>:<player>':
--         the same quiz of the day gives a pack once to a player, so a replay across Paris midnight (the UTC date lags by 1 or 2 hours) gives nothing more.
-- Risk:   ACCEPTED BY THE INTEGRATOR. The completion is a score the browser reports: POST /api/quiz/[id]/play checks only 0 <= score <= max and
--         inserts the plays row through record_play, so a modified browser can post a play of the quiz of the day without playing it (decision 28 refused
--         the quiz of the day for that reason). The damage is bounded: at most one pack a Paris day, inside the cap of 3, and only for the quiz that was
--         the quiz of the day. A play of any other quiz, an anonymous play and a play of another player never count. Kpopdle wins stay decided in the
--         database (dle_guess) and are unchanged.
-- Rows:   0 rows at apply time. 1 constraint, 1 index, 2 functions (cards_bonus_record replaced: same signature, same return, same ACL).
-- Needs:  001 and 002. public.plays and public.quizzes (is_quiz_of_the_day, quiz_of_the_day_date, status) are read inside cards_bonus_record only and only
--         when they exist; public.dle_plays and public.dle_games (019) likewise. 110 and 104 need no change: they count the rows of cards_bonus_earned
--         through cards_bonus_plays, so the quiz row shares the cap with the Kpopdle rows and opens as source 'bonus'.
-- Errors: "cards: user" (null player), as before.
-- Verify: select pg_get_constraintdef(oid) from pg_constraint where conname = 'cards_bonus_earned_source_check' and conrelid = 'public.cards_bonus_earned'::regclass;   expect a check listing 'quiz', 'kpopdle' and 'quiz_of_day'
-- Verify: select count(*) from pg_indexes where schemaname = 'public' and indexname = 'cards_bonus_earned_quiz_day_key';   expect 1
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_bonus_record', 'cards_bonus_sync');   expect 2
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_bonus_record', 'cards_bonus_sync');   expect f
-- Verify: select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_bonus_record', 'cards_bonus_sync');   expect t
-- Verify: select prosecdef and 'search_path=public' = any (proconfig) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_bonus_sync';   expect t
-- Verify: select (public.cards_bonus_sync(id, '2026-11-12 10:00+00')) ->> 'quiz' from auth.users limit 1;   expect false (a player with no play of the quiz of the day; no row means no output)
-- Undo:   115-quiz-of-day-bonus.rollback.sql (deletes the 'quiz_of_day' rows, narrows the check, restores 002's cards_bonus_record, drops the rest)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c115$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_bonus_earned') is null or to_regprocedure('public.cards_bonus_plays(uuid, date)') is null then
    raise exception '115-quiz-of-day-bonus: run 001-schema.sql and 002-functions.sql first';
  end if;

  -- The source check: replaced only when it does not list the new source yet.
  if not exists (select 1 from pg_constraint where conname = 'cards_bonus_earned_source_check' and conrelid = 'public.cards_bonus_earned'::regclass
                    and pg_get_constraintdef(oid) like '%quiz_of_day%') then
    alter table public.cards_bonus_earned drop constraint if exists cards_bonus_earned_source_check;
    alter table public.cards_bonus_earned add constraint cards_bonus_earned_source_check check (source in ('quiz', 'kpopdle', 'quiz_of_day'));
  end if;

  -- One quiz-of-the-day row a Paris day, whatever the quiz dates or the number of parallel calls.
  create unique index if not exists cards_bonus_earned_quiz_day_key on public.cards_bonus_earned (user_id, paris_day) where source = 'quiz_of_day';

  -- Records the bonus packs of the player's Paris day and returns how many were earned that day: the Kpopdle wins (one row per won play, decided in
  -- the database by dle_guess) and the quiz of the day (one row). Called by the hub's server (the lobby state, the opening of a bonus pack) and by
  -- POST /api/cards-bridge/bonus, after their own checks (session, Team account, flags).
  create or replace function public.cards_bonus_record(p_user uuid, p_now timestamptz default now())
    returns integer
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_from timestamptz := (v_today::timestamp at time zone 'Europe/Paris');
    v_to timestamptz := ((v_today + 1)::timestamp at time zone 'Europe/Paris');
    v_site boolean;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    -- A database without the daily games (019 not applied) records no Kpopdle win.
    if to_regclass('public.dle_plays') is not null and to_regclass('public.dle_games') is not null then
      insert into public.cards_bonus_earned (user_id, paris_day, source, play_ref, earned_at)
      select p_user, v_today, 'kpopdle', 'dle_plays:' || d.id::text, p_now
        from public.dle_plays d
       where d.game_id = any (array(select g.id from public.dle_games g where g.id like 'kpopdle%'))
         and d.play_date between v_today - 2 and v_today
         and d.user_id = p_user and d.status = 'won'
         and d.finished_at <= p_now and (d.finished_at at time zone 'Europe/Paris')::date = v_today
      on conflict on constraint cards_bonus_earned_play_key do nothing;
    end if;
    -- The quiz of the day: the first finished play of the Paris day on the quiz that was the quiz of the day (its UTC date is the play's UTC date).
    -- A database without the play tables records nothing. The partial unique index keeps one row a Paris day; the key one per quiz of the day (a quiz of
    -- the day that already gave its pack is skipped, so a replay of it never hides the play of the next one).
    if to_regclass('public.plays') is not null and to_regclass('public.quizzes') is not null then
      v_site := exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quizzes' and column_name = 'site_id');
      if v_site then
        insert into public.cards_bonus_earned (user_id, paris_day, source, play_ref, earned_at)
        select p_user, v_today, 'quiz_of_day', 'quiz_of_day:' || q.quiz_of_the_day_date::text || ':' || p_user::text, p_now
          from public.plays pl join public.quizzes q on q.id = pl.quiz_id
         where pl.player_id = p_user and pl.total_questions > 0
           and pl.created_at >= v_from and pl.created_at < v_to and pl.created_at <= p_now
           and q.is_quiz_of_the_day and q.status = 'published' and q.site_id = 'kpop'
           and q.quiz_of_the_day_date = (pl.created_at at time zone 'UTC')::date
           and not exists (select 1 from public.cards_bonus_earned e where e.source = 'quiz_of_day'
                            and e.play_ref = 'quiz_of_day:' || q.quiz_of_the_day_date::text || ':' || p_user::text)
         order by pl.created_at, pl.id
         limit 1
        on conflict do nothing;
      else
        insert into public.cards_bonus_earned (user_id, paris_day, source, play_ref, earned_at)
        select p_user, v_today, 'quiz_of_day', 'quiz_of_day:' || q.quiz_of_the_day_date::text || ':' || p_user::text, p_now
          from public.plays pl join public.quizzes q on q.id = pl.quiz_id
         where pl.player_id = p_user and pl.total_questions > 0
           and pl.created_at >= v_from and pl.created_at < v_to and pl.created_at <= p_now
           and q.is_quiz_of_the_day and q.status = 'published'
           and q.quiz_of_the_day_date = (pl.created_at at time zone 'UTC')::date
           and not exists (select 1 from public.cards_bonus_earned e where e.source = 'quiz_of_day'
                            and e.play_ref = 'quiz_of_day:' || q.quiz_of_the_day_date::text || ':' || p_user::text)
         order by pl.created_at, pl.id
         limit 1
        on conflict do nothing;
      end if;
    end if;
    return public.cards_bonus_plays(p_user, v_today);
  end
  $f$;

  -- The lobby read: records, then tells the bonus packs earned that Paris day and whether the quiz of the day is one of them.
  create or replace function public.cards_bonus_sync(p_user uuid, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_earned integer;
  begin
    v_earned := public.cards_bonus_record(p_user, p_now);
    return jsonb_build_object('earned', v_earned,
      'quiz', exists (select 1 from public.cards_bonus_earned where user_id = p_user and paris_day = v_today and source = 'quiz_of_day'));
  end
  $f$;

  revoke all on function public.cards_bonus_record(uuid, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_bonus_record(uuid, timestamptz) to service_role;
  revoke all on function public.cards_bonus_sync(uuid, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_bonus_sync(uuid, timestamptz) to service_role;

  notify pgrst, 'reload schema';
end $c115$;
