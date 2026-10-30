-- 019-dle-core.rollback.sql (run O1, daily games step 1): undoes 019-dle-core.sql.
--
-- What:   drops the dle functions and tables, and the two columns 019 added to entity_images.
-- Refused while a dle game exists (roll 020 back first) or while an entity_images row has license_verified or a thumb_path
-- (that is the admin's work of step 2: it is never dropped by a rollback).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.dle_games') is not null and exists (select 1 from public.dle_games) then
    raise exception '019-dle-core.rollback: a dle game exists (roll 020 back first)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_images' and column_name = 'license_verified')
    and exists (select 1 from public.entity_images where license_verified or thumb_path is not null) then
    raise exception '019-dle-core.rollback: an entity_images row has a verified licence or a thumbnail';
  end if;
end $$;

drop function if exists public.dle_guess(text, date, text, text);
drop function if exists public.dle_give_up(text, date, text);
drop function if exists public.dle_day(text, text, date);
drop function if exists public.dle_pool(text);
drop function if exists public.dle_day_at(timestamptz, text, text, date);
drop function if exists public.dle_give_up_at(timestamptz, text, date, text);
drop function if exists public.dle_guess_at(timestamptz, text, date, text, text);
drop function if exists public.dle_find_play(text, date, text);
drop function if exists public.dle_check(text, timestamptz, date, text);
drop function if exists public.dle_play_state(public.dle_plays);
drop function if exists public.dle_public_stats(text, date);
drop function if exists public.dle_public_entity(text, text);
drop function if exists public.dle_rate_hit(timestamptz);
drop function if exists public.dle_daily_maintenance(timestamptz);
drop function if exists public.dle_target(text, date);
drop function if exists public.dle_activate(text, date, double precision);
drop function if exists public.dle_build_bank(text, date, double precision);
drop function if exists public.dle_pool_hash(text);
drop function if exists public.dle_window(text);
drop function if exists public.dle_refresh_entities(text);
drop function if exists public.dle_playable(date, timestamptz, date);
drop function if exists public.dle_bank_day(date, date);
drop function if exists public.dle_utc_date(timestamptz);
drop function if exists public.dle_compare_all(text, jsonb, jsonb);
drop function if exists public.dle_compare(text, numeric, jsonb, jsonb);
drop function if exists public.dle_values(jsonb);

drop table if exists public.dle_plays;
drop table if exists public.dle_daily_stats;
drop table if exists public.dle_schedule;
drop table if exists public.dle_curation;
drop table if exists public.dle_entities;
drop table if exists public.dle_attributes;
drop table if exists public.dle_games;
drop table if exists public.dle_rate;
drop table if exists public.dle_salt;

alter table public.entity_images drop constraint if exists entity_images_thumb_path_check;
alter table public.entity_images drop column if exists thumb_path;
alter table public.entity_images drop column if exists license_verified;

notify pgrst, 'reload schema';
