-- R1 F3: READ-ONLY inventory of everything that can write to the six tables whose
-- public write policies r1-rls-tighten.sql drops. Run it in the Supabase SQL editor
-- (project rdkgouofytwfdpbxbzio) BEFORE "go rls" and paste the result to R1: the
-- repository's migrations say what should be there, this says what is.
-- It changes nothing (SELECT on the catalogs only).

with t(name) as (values ('ranked_plays'), ('battles'), ('battle_results'), ('pending_questions'), ('quiz_bank'), ('quiz_time_stats'))
select 1 as ord, 'table' as kind, c.relname::text as object, ''::text as name,
       case when c.relrowsecurity then 'rls on' else 'RLS OFF' end as detail,
       case when c.relforcerowsecurity then 'forced' else 'not forced' end as extra,
       ('rows about ' || c.reltuples::bigint)::text as body
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in (select name from t)
union all
select 2, 'policy', p.tablename::text, p.policyname::text, p.cmd::text, p.roles::text,
       ('using: ' || coalesce(p.qual, '-') || ' | check: ' || coalesce(p.with_check, '-'))::text
from pg_policies p
where p.schemaname = 'public' and p.tablename in (select name from t)
union all
select 3, 'grant', g.table_name::text, g.grantee::text, g.privilege_type::text, ''::text, ''::text
from information_schema.role_table_grants g
where g.table_schema = 'public' and g.table_name in (select name from t)
  and g.grantee in ('anon', 'authenticated', 'PUBLIC')
  and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
union all
select 4, 'trigger', c.relname::text, tg.tgname::text, f.proname::text,
       case when f.prosecdef then 'definer' else 'INVOKER' end,
       pg_get_triggerdef(tg.oid)::text
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc f on f.oid = tg.tgfoid
where n.nspname = 'public' and not tg.tgisinternal and c.relname in (select name from t)
union all
select 5, 'function that writes', f.proname::text, pg_get_function_identity_arguments(f.oid)::text,
       case when f.prosecdef then 'definer' else 'INVOKER' end,
       coalesce(array_to_string(f.proconfig, ', '), 'no search_path set'),
       coalesce((select string_agg(distinct rp.grantee, ', ' order by rp.grantee)
                 from information_schema.routine_privileges rp
                 where rp.specific_schema = 'public' and rp.routine_name = f.proname
                   and rp.privilege_type = 'EXECUTE'), 'no grantee')::text
from pg_proc f join pg_namespace n on n.oid = f.pronamespace
where n.nspname = 'public'
  and f.prosrc ~* '(insert\s+into|update|delete\s+from)\s+(public\.)?(ranked_plays|battles|battle_results|pending_questions|quiz_bank|quiz_time_stats)\M'
order by 1, 3, 4;
