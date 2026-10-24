-- launch/L06-B3-badges.rollback.sql (run O1, lane L1 for B3): undo of L06-B3-badges.sql.
--
-- What:   deletes the six anime badge definitions. Refused, with nothing changed, once a member holds one of them (that would
--         take a badge away from a reader); a pinned badge on a membership would be cleared by its foreign key (on delete set null).
-- Verify: select count(*) from public.badge_definitions where site_id <> 'kpop';   expect 0
-- Undo:   run L06-B3-badges.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if exists (select 1 from public.user_badges where badge_id in
        ('anime_first_steps', 'anime_quiz_maker', 'anime_prolific_creator', 'anime_multi_stan', 'anime_dedicated_fan', 'anime_community_star')) then
    raise exception 'L06 rollback refused: a member holds an anime badge';
  end if;
end $$;

delete from public.badge_definitions where site_id = 'anime' and id in
  ('anime_first_steps', 'anime_quiz_maker', 'anime_prolific_creator', 'anime_multi_stan', 'anime_dedicated_fan', 'anime_community_star');
