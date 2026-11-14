-- 115-quiz-of-day-bonus.rollback.sql (KpopCards): undo of 115-quiz-of-day-bonus.sql.
--
-- What:   deletes the 'quiz_of_day' rows of cards_bonus_earned, restores the check ('quiz', 'kpopdle'), drops the partial index and cards_bonus_sync, and
--         puts back 002's cards_bonus_record (the Kpopdle wins only; the quiz of the day earns nothing again).
-- Why:    without 115 the quiz of the day is no source of packs (decision 28); deploy the code from before, or switch NET_CARDS_BRIDGES off.
-- Rows:   the 'quiz_of_day' rows are derived (one per player and Paris day, rebuilt from public.plays by 115): deleting them lowers the bonus packs a
--         player may still open that Paris day (cards_wallet.bonus_left), never the packs already opened (cards_packs) or the cards owned.
-- Verify: select count(*) from public.cards_bonus_earned where source = 'quiz_of_day';   expect 0
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_bonus_sync';   expect 0
-- Undo:   run 115-quiz-of-day-bonus.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c115r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  drop function if exists public.cards_bonus_sync(uuid, timestamptz);
  drop index if exists public.cards_bonus_earned_quiz_day_key;
  delete from public.cards_bonus_earned where source = 'quiz_of_day';
  alter table public.cards_bonus_earned drop constraint if exists cards_bonus_earned_source_check;
  alter table public.cards_bonus_earned add constraint cards_bonus_earned_source_check check (source in ('quiz', 'kpopdle'));

  -- 002's cards_bonus_record, verbatim.
  create or replace function public.cards_bonus_record(p_user uuid, p_now timestamptz default now())
    returns integer
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_today date := (p_now at time zone 'Europe/Paris')::date;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    -- A database without the daily games (019 not applied) records nothing.
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
    return public.cards_bonus_plays(p_user, v_today);
  end
  $f$;

  revoke all on function public.cards_bonus_record(uuid, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_bonus_record(uuid, timestamptz) to service_role;

  notify pgrst, 'reload schema';
end $c115r$;
