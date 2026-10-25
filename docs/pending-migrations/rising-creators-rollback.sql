-- Rollback of rising-creators.sql: removes the function (the site's call goes back to a 404,
-- and the "Rising" boards stay hidden, as before).
drop function if exists public.get_rising_creators(int, int);
