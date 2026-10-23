-- launch/L03-B7-sentinel.rollback.sql (run O1, lane L1 for B7): undo of L03-B7-sentinel.sql.
--
-- What:   deletes the two sentinel profiles and their auth users. Refused, with nothing changed, while any quiz was handed to a
--         sentinel (deleting the profile would delete those quizzes) or while a play points at one.
-- Verify: select count(*) from public.profiles where id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3');   expect 0
-- Undo:   run L03-B7-sentinel.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if exists (select 1 from public.quizzes where creator_id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3')) then
    raise exception 'L03 rollback refused: a quiz belongs to a sentinel (a member left a site and kept the quiz)';
  end if;
  if to_regclass('public.plays') is not null and exists (select 1 from public.plays where player_id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3')) then
    raise exception 'L03 rollback refused: a play points at a sentinel';
  end if;
end $$;

delete from public.world_memberships where user_id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3');
delete from public.profiles where id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3');
delete from auth.users where id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3');
