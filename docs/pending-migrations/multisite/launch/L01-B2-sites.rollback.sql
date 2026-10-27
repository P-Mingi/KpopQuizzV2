-- launch/L01-B2-sites.rollback.sql (run O1, lane B2): undo of launch/L01-B2-sites.sql.
--
-- What:   deletes the anime and hub rows of public.sites.
-- Why:    the rollback of manifest.md row 2. Rollbacks run in reverse order: every later launch file first.
-- Rows:   at most 2 rows deleted from public.sites (anime, hub). Refused, with nothing changed, while any row of any
--         table references anime or hub through a foreign key (memberships, content, settings): this file never
--         deletes data of another table, even through a future ON DELETE CASCADE.
-- Verify: select count(*) from public.sites where id in ('anime', 'hub');                         expect 0
-- Undo:   run launch/L01-B2-sites.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  fk record;
  used boolean;
  found_in text := '';
begin
  if to_regclass('public.sites') is null then
    return;
  end if;
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = 'public.sites'::regclass and array_length(c.conkey, 1) = 1
     order by 1, 2
  loop
    execute format('select exists (select 1 from %s where %I in (''anime'', ''hub''))', fk.tbl, fk.col) into used;
    if used then
      found_in := found_in || ' ' || fk.tbl::text || '.' || fk.col;
    end if;
  end loop;
  if found_in <> '' then
    raise exception 'L01-B2-sites rollback refused: rows still reference anime or hub in%; roll back the later files first', found_in;
  end if;
  delete from public.sites where id in ('anime', 'hub');
end $$;
