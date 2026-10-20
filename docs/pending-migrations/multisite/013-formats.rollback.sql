-- 013-formats.rollback.sql (run O1, lane K1): undo of 013-formats.sql.
--
-- What:   drops games_game_type_check (production has no check on games.game_type) and personality_profiles.character_id (its
--         foreign key goes with it).
-- Why:    the rollback of manifest.md row 17 (reverse order: after 014's and 015's, before 012's and 011's: the foreign key
--         points at characters, so 011's rollback fails while this column exists).
-- Rows:   1 column dropped. Refused, with nothing changed, while a personality profile points at a character (the link would
--         be lost); dropping the check loses no row.
-- Verify: select count(*) from pg_constraint where conname = 'games_game_type_check';                  expect 0
--         select count(*) from pg_attribute where attrelid = 'public.personality_profiles'::regclass and attname = 'character_id' and not attisdropped;   expect 0
--         a catalog dump (pg_dump --schema-only) of public equals the one taken before 009
-- Undo:   run 013-formats.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
begin
  if exists (select 1 from pg_attribute where attrelid = 'public.personality_profiles'::regclass and attname = 'character_id' and not attisdropped) then
    select count(*) into n from public.personality_profiles where character_id is not null;
    if n > 0 then
      raise exception '013-formats rollback refused: % personality_profiles rows point at a character (the link would be lost); clear them deliberately first', n;
    end if;
  end if;
end $$;

alter table public.games drop constraint if exists games_game_type_check;
alter table public.personality_profiles drop column if exists character_id;
