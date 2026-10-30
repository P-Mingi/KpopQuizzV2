-- V-013 (run O1, session.sh): after 013-formats.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'games_game_type_check validée', (select convalidated from pg_constraint where conname = 'games_game_type_check'), null),
  (2, 'colonne personality_profiles.character_id', (select count(*) = 1 from pg_attribute where attrelid = 'public.personality_profiles'::regclass and attname = 'character_id' and not attisdropped), null)
) as c(n, what, ok, got) order by n;
rollback;
