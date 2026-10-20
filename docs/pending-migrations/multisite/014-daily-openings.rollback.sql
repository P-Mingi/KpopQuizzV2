-- 014-daily-openings.rollback.sql (run O1, lane K1): undo of 014-daily-openings.sql.
--
-- What:   drops ensure_daily_opening(date, text) and public.daily_openings (its policy and key go with it).
-- Why:    the rollback of manifest.md row 18 (reverse order: after 015's, before 013's and 011's: the foreign key points at
--         series_themes, so 011's rollback fails while this table exists).
-- Rows:   1 table and 1 function dropped. Refused, with nothing changed, while a daily opening exists (the history of the
--         openings shown would be lost).
-- Verify: select to_regclass('public.daily_openings'), to_regprocedure('public.ensure_daily_opening(date, text)');   expect both null
--         a catalog dump (pg_dump --schema-only) of public equals the one taken before 009
-- Undo:   run 014-daily-openings.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  if to_regclass('public.daily_openings') is not null then
    select count(*) into n from public.daily_openings;
    if n > 0 then
      raise exception '014-daily-openings rollback refused: % daily opening rows exist (the history would be lost); remove them deliberately first', n;
    end if;
  end if;
end $$;

drop function if exists public.ensure_daily_opening(date, text);
drop table if exists public.daily_openings;
