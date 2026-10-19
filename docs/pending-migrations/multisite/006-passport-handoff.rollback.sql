-- 006-passport-handoff.rollback.sql (run O1, lane B3): undo of 006-passport-handoff.sql.
--
-- What:   drops the four passport_* functions, passport.handoff_events, passport.handoff_codes and the schema passport.
-- Why:    the rollback of manifest.md row 10. Rollbacks run in reverse order: 016 first (its tables live in the same schema).
-- Rows:   2 tables and 1 schema dropped. Refused, with nothing changed, while a code or an event row exists (the
--         audit log would be lost) or while any other object, such as 016's tables, still lives in schema passport.
-- Verify: select nspname from pg_namespace where nspname = 'passport';                             expect 0 rows
--         select count(*) from pg_proc where proname like 'passport\_%' and pronamespace = 'public'::regnamespace;   expect 0
-- Undo:   run 006-passport-handoff.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
  other text;
begin
  if to_regclass('passport.handoff_codes') is not null then
    select count(*) into n from passport.handoff_codes;
    if n > 0 then
      raise exception '006-passport-handoff rollback refused: passport.handoff_codes holds % rows; remove them deliberately first', n;
    end if;
  end if;
  if to_regclass('passport.handoff_events') is not null then
    select count(*) into n from passport.handoff_events;
    if n > 0 then
      raise exception '006-passport-handoff rollback refused: passport.handoff_events holds % rows (the audit log would be lost); remove them deliberately first', n;
    end if;
  end if;
  select string_agg(c.relname, ', ' order by c.relname) into other
    from pg_class c
   where c.relnamespace = to_regnamespace('passport') and c.relkind in ('r', 'v', 'm', 'p', 'f')
     and c.relname not in ('handoff_codes', 'handoff_events');
  if other is not null then
    raise exception '006-passport-handoff rollback refused: schema passport also holds % (roll back 016 first)', other;
  end if;
end $$;

drop function if exists public.passport_cleanup();
drop function if exists public.passport_log_event(text, uuid, text, text, text, text, text);
drop function if exists public.passport_redeem_code(text, text, text, text, text, text);
drop function if exists public.passport_issue_code(uuid, text, text, text, text, text, text, text);
drop table if exists passport.handoff_events;
drop table if exists passport.handoff_codes;
drop schema if exists passport;
