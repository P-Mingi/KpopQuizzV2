-- 112-social.rollback.sql (KpopCards lots 3 + 4 + 5): undo of 112-social.sql.
--
-- What:   drops the 7 functions and the 2 tables cards_friend_codes and cards_friends.
-- Why:    without 112 there are no friends and no ranking; the routes then fail, so switch NET_CARDS off or deploy the code from before first.
-- Rows:   the two tables are dropped with their rows (friendships and codes: nothing a player earned).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_friend_code_new', 'cards_friend_redeem', 'cards_friend_remove', 'cards_friends', 'cards_profile_of', 'cards_profile', 'cards_ranking');   expect 0
-- Undo:   run 112-social.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c112r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  drop function if exists public.cards_ranking(uuid, text, integer);
  drop function if exists public.cards_profile(uuid, text);
  drop function if exists public.cards_profile_of(uuid, uuid);
  drop function if exists public.cards_friends(uuid);
  drop function if exists public.cards_friend_remove(uuid, text);
  drop function if exists public.cards_friend_redeem(uuid, text, text, timestamptz);
  drop function if exists public.cards_friend_code_new(uuid, text, timestamptz);
  drop table if exists public.cards_friends;
  drop table if exists public.cards_friend_codes;

  notify pgrst, 'reload schema';
end $c112r$;
