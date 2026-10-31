-- 021a-k1-idol-gender-debut.rollback.sql (lot K1): undo of 021a-k1-idol-gender-debut.sql.
--
-- What:   deletes the entity_sources rows of lot K1 (entity_type 'idol', field 'gender' or 'debut_year') and drops the columns
--         public.idols.gender and public.idols.debut_year with their check constraints (no CASCADE: if anything else ever
--         names one of the columns, the drop fails and nothing is changed).
-- Why:    the rollback of the K1 columns. The view dle_src_kpop_idol (020) reads both through to_jsonb(row), so it keeps
--         working and simply reads null again.
-- Rows:   Refused, with nothing changed, while the game kpopdle-idol is active (its pool needs both columns: switch the game
--         off first). Does not touch active or needs_review: undo an activation with 021b-k1-idol-activate.rollback.sql.
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name in ('gender', 'debut_year');   expect 0
--         select count(*) from public.entity_sources where entity_type = 'idol' and field in ('gender', 'debut_year');   expect 0
-- Undo:   run 021a-k1-idol-gender-debut.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  on_ boolean;
begin
  if to_regclass('public.dle_games') is not null then
    execute 'select active from public.dle_games where id = $1' into on_ using 'kpopdle-idol';
    if coalesce(on_, false) then
      raise exception '021a-k1-idol-gender-debut rollback refused: the game kpopdle-idol is active and reads idols.gender and idols.debut_year';
    end if;
  end if;
end $$;

delete from public.entity_sources where entity_type = 'idol' and field in ('gender', 'debut_year');

alter table public.idols drop constraint if exists idols_gender_check;
alter table public.idols drop constraint if exists idols_debut_year_check;
alter table public.idols drop column if exists gender;
alter table public.idols drop column if exists debut_year;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name in ('gender', 'debut_year')) then
    raise exception '021a-k1-idol-gender-debut rollback: a K1 column is still there';
  end if;
  if exists (select 1 from public.entity_sources where entity_type = 'idol' and field in ('gender', 'debut_year')) then
    raise exception '021a-k1-idol-gender-debut rollback: K1 entity_sources rows are still there';
  end if;
end $$;

notify pgrst, 'reload schema';
