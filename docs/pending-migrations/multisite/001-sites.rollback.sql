-- 001-sites.rollback.sql (run O1, lane B2): undo of 001-sites.sql.
--
-- What:   drops public.sites (its policy and its kpop row go with it).
-- Why:    the rollback of manifest.md row 1. Rollbacks run in reverse order: L01's and 002a's rollbacks first.
-- Rows:   1 table dropped (1 row: kpop). Refused, with nothing changed, while another site row exists (L01 still
--         applied) or while any constraint references sites (002a or a later file still applied).
-- Verify: select to_regclass('public.sites');                                                   expect null
-- Undo:   run 001-sites.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  refs text;
begin
  if to_regclass('public.sites') is null then
    return;
  end if;
  select string_agg(conrelid::regclass::text || '.' || conname, ', ' order by conrelid::regclass::text, conname)
    into refs
    from pg_constraint
   where contype = 'f' and confrelid = 'public.sites'::regclass;
  if refs is not null then
    raise exception '001-sites rollback refused: constraints still reference public.sites (%); roll back 002a and later files first', refs;
  end if;
  if exists (select 1 from public.sites where id <> 'kpop') then
    raise exception '001-sites rollback refused: public.sites holds rows other than kpop; run launch/L01-B2-sites.rollback.sql first';
  end if;
end $$;

drop table if exists public.sites;
