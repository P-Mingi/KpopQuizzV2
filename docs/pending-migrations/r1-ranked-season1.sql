-- R1 F10 (2026-10): ranked season 1.
--
-- NOT APPLIED in the R1 release. Apply it the day NEXT_PUBLIC_UX_V1 goes on in
-- production, AFTER docs/pending-migrations/v11-p7-ranked.sql: /blindtest/ranked only
-- exists with the flag, so a season started earlier would run with nobody able to play.
--
-- What it does: inserts ONE row, season 1, starting at 00:00 UTC of the day it is applied
-- and lasting 8 weeks (56 x 24 h, DESIGN-SPEC 17.6), only when the table has no season yet.
-- Ranked answers "not live" (the page says "The first season has not started") until a
-- season covers now(); from this insert on, runs can be played. The nightly cron
-- (/api/ranked/cron/nightly, 00:20 UTC) then rolls the seasons back to back by itself.
-- Ranked runs award no XP (the engine never calls award_xp); season rewards are not built
-- (SEASON_REWARDS_LIVE = false hides that section).
--
-- Rows touched: one inserted in public.ranked_seasons, nothing else.

BEGIN;

INSERT INTO public.ranked_seasons (id, starts_at, ends_at)
SELECT 1, s.day, s.day + make_interval(hours => 56 * 24)
FROM (SELECT date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS day) s
WHERE NOT EXISTS (SELECT 1 FROM public.ranked_seasons);

COMMIT;

-- Verification: exactly one row, id 1, starting today 00:00 UTC, length 56 days.
SELECT id, starts_at, ends_at, ends_at - starts_at AS length, now() BETWEEN starts_at AND ends_at AS covers_now
FROM public.ranked_seasons
ORDER BY id;

-- Rollback (only while no run was played in season 1):
-- DELETE FROM public.ranked_seasons s
--  WHERE s.id = 1 AND NOT EXISTS (SELECT 1 FROM public.ranked_runs r WHERE r.season = 1);
