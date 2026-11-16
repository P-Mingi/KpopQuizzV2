// Bunnyverse Cards: the text of docs/pending-migrations/cards/117-catalog-safeupdate.sql and its rollback, built from 103's own text by
// scripts/cards/gen-safeupdate-sql.mts. Pure: no file, no network, no database. safeupdate-sql.test.ts runs both files on PGlite.
//
// Integrator, 2026-11-17: in production "Reconstruire le catalogue" answered 400. Supabase loads safeupdate for the API's sessions
// (PostgREST), which refuses a DELETE or an UPDATE without WHERE, inside a function too; cards_build_catalog() (file 103) runs
// "delete from public.cards_catalog;". 117 gives that DELETE a "where true" and changes nothing else: the new body is 103's with that
// one change, checked by md5 before and after.
import { createHash } from 'node:crypto';

/** The day of the file (the integrator's report of the 400 in production). */
export const SAFEUPDATE_DAY = '2026-11-17';
const START = '  create or replace function public.cards_build_catalog()';
const OLD = '    delete from public.cards_catalog;';
const NEW = '    delete from public.cards_catalog where true;';

const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');

/** cards_build_catalog() as 103 writes it: the whole statement, and its body as pg_proc.prosrc holds it (between the $f$ quotes). */
export function catalogFunctionOf103(text103: string): { statement: string; body: string } {
  const a = text103.indexOf(START);
  if (a < 0 || text103.indexOf(START, a + 1) >= 0) throw new Error('103: cards_build_catalog() must be defined exactly once');
  const open = text103.indexOf('as $f$', a);
  const close = text103.indexOf('$f$;', open + 6);
  if (open < 0 || close < 0) throw new Error('103: the body of cards_build_catalog() was not found');
  return { statement: text103.slice(a, close + 4), body: text103.slice(open + 6, close) };
}

export interface SafeupdateSql { sql: string; rollback: string; md5Old: string; md5New: string }

export function buildSafeupdate(text103: string, day: string): SafeupdateSql {
  const { statement, body } = catalogFunctionOf103(text103);
  if (body.split(OLD).length !== 2) throw new Error('103: cards_build_catalog() must hold exactly one "delete from public.cards_catalog;"');
  const fixed = statement.replace(OLD, NEW);
  const md5Old = md5(body);
  const md5New = md5(body.replace(OLD, NEW));
  const grants = `  revoke all on function public.cards_build_catalog() from public, anon, authenticated;
  grant execute on function public.cards_build_catalog() to service_role;`;

  const sql = `-- 117-catalog-safeupdate.sql (Bunnyverse Cards, ${day}; "Reconstruire le catalogue" answered 400 in production)
--
-- What:   gives the one DELETE of cards_build_catalog() (file 103) a WHERE: "delete from public.cards_catalog where true;". Nothing else
--         changes: the rest of the function is 103's, byte for byte (md5 of the body checked before and after), and its privileges
--         stay what 103 set (service_role only).
-- Why:    Supabase loads the extension safeupdate for the API's sessions (PostgREST): a DELETE or an UPDATE without WHERE is refused there,
--         inside a function too ("DELETE requires a WHERE clause"). The admin's button calls cards_build_catalog() through the API; the SQL
--         Editor has no such guard, so the function worked there only.
-- Scope:  every cards_* function the database holds after 099 to 116 was scanned (src/lib/cards/safeupdate-scan.ts, safeupdate.test.ts):
--         this DELETE is the only UPDATE or DELETE without a WHERE.
-- Rows:   no row; one function replaced. The notice says "117: ...".
-- Needs:  103 applied (in production since 2026-11-15). Apply after a backup, never between 23:50 and 00:30 UTC.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_build_catalog' and md5(prosrc) = '${md5New}';   expect 1
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_build_catalog' and prosrc like '%delete from public.cards_catalog;%';   expect 0
-- Verify: select has_function_privilege('anon', 'public.cards_build_catalog()', 'execute') or has_function_privilege('authenticated', 'public.cards_build_catalog()', 'execute');   expect f
-- Verify: select has_function_privilege('service_role', 'public.cards_build_catalog()', 'execute');   expect t
-- Refuses: between 23:50 and 00:30 UTC; when cards_build_catalog() is missing or is not 103's version (nor already this file's).
-- Undo:   117-catalog-safeupdate.rollback.sql (gives back 103's body).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c117$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  v_md5 text;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '117-catalog-safeupdate: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regprocedure('public.cards_build_catalog()') is null then
    raise exception '117-catalog-safeupdate: cards_build_catalog() is missing (apply 103 first), nothing changed';
  end if;
  select md5(prosrc) into v_md5 from pg_proc where oid = 'public.cards_build_catalog()'::regprocedure;
  if v_md5 = '${md5New}' then
    raise notice '117-catalog-safeupdate: already applied, nothing changed';
    return;
  end if;
  if v_md5 <> '${md5Old}' then
    raise exception '117-catalog-safeupdate: cards_build_catalog() is not the version of 103 (md5 %), nothing changed', v_md5;
  end if;

${fixed}
${grants}

  if (select md5(prosrc) from pg_proc where oid = 'public.cards_build_catalog()'::regprocedure) <> '${md5New}' then
    raise exception '117-catalog-safeupdate: the new body is not the expected one, nothing changed';
  end if;
  raise notice '117-catalog-safeupdate: cards_build_catalog() deletes with WHERE true; "Reconstruire le catalogue" works through the API';
end $c117$;
`;

  const rollback = `-- 117-catalog-safeupdate.rollback.sql (undo of 117-catalog-safeupdate.sql)
--
-- What:   gives back 103's body of cards_build_catalog() (its DELETE without WHERE: the admin's button answers 400 again in production).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_build_catalog' and md5(prosrc) = '${md5Old}';   expect 1
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c117r$
declare
  v_md5 text;
begin
  perform set_config('lock_timeout', '5s', true);
  if to_regprocedure('public.cards_build_catalog()') is null then
    raise notice '117-catalog-safeupdate.rollback: cards_build_catalog() is missing, nothing to do';
    return;
  end if;
  select md5(prosrc) into v_md5 from pg_proc where oid = 'public.cards_build_catalog()'::regprocedure;
  if v_md5 = '${md5Old}' then
    raise notice '117-catalog-safeupdate.rollback: already 103''s body, nothing changed';
    return;
  end if;
  if v_md5 <> '${md5New}' then
    raise exception '117-catalog-safeupdate.rollback: cards_build_catalog() is not the version of 117 (md5 %), nothing changed', v_md5;
  end if;

${statement}
${grants}
  raise notice '117-catalog-safeupdate.rollback: 103''s body is back';
end $c117r$;
`;
  return { sql, rollback, md5Old, md5New };
}
