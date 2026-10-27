-- Run O1, owner gate G3: read-only inventory of what a schema-only dump of public does not carry.
-- The owner runs it on production (psql 18, the production password typed by him), and
-- scripts/o1/branch-parity.sh runs it on a dev branch to compare the fingerprints.
--   /opt/homebrew/opt/postgresql@18/bin/psql "<session pooler string>" -X -f prod-inventory.sql > ~/kpq-o1/prod-inventory.txt
-- Read only: the session is set read-only before any query. No row of user data is read:
-- catalog rows only (extensions, schemas, triggers, policies, publications, cron job names and schedules,
-- storage bucket settings) and md5 fingerprints. Cron command text is never read.
-- Output: one section per "#### <name>" line, rows tab-separated.

\set QUIET on
SET default_transaction_read_only = on;
SET statement_timeout = '60s';
-- Every name printed schema-qualified, on production and on the branches alike.
SET search_path = pg_catalog;
\set ON_ERROR_STOP on
\pset format unaligned
\pset fieldsep '\t'
\pset tuples_only on
\pset pager off

\echo '#### meta'
SELECT 'server_version', current_setting('server_version');
SELECT 'read_only', current_setting('default_transaction_read_only');

\echo '#### extensions'
SELECT e.extname, e.extversion, n.nspname
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY 1;

\echo '#### schemas'
SELECT nspname FROM pg_namespace
WHERE nspname NOT LIKE 'pg_temp%' AND nspname NOT LIKE 'pg_toast%'
ORDER BY 1;

-- Triggers on auth.* and storage.* tables: ready-to-run DDL (dropped by DROP SCHEMA public CASCADE
-- when their function lives in public, so branch-parity.sh recreates them).
\echo '#### auth_storage_triggers_ddl'
SELECT n.nspname || '.' || c.relname, t.tgname, pg_get_triggerdef(t.oid) || ';'
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname IN ('auth', 'storage')
ORDER BY 1, 2;

-- Policies on storage.*: ready-to-run DDL.
\echo '#### storage_policies_ddl'
SELECT p.schemaname || '.' || p.tablename, p.policyname,
  format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
    p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd,
    array_to_string(ARRAY(SELECT quote_ident(r) FROM unnest(p.roles) r), ', '),
    CASE WHEN p.qual IS NOT NULL THEN ' USING (' || p.qual || ')' ELSE '' END,
    CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK (' || p.with_check || ')' ELSE '' END)
FROM pg_policies p
WHERE p.schemaname = 'storage'
ORDER BY 1, 2;

\echo '#### storage_buckets'
SELECT (to_regclass('storage.buckets') IS NOT NULL) AS has_storage \gset
\if :has_storage
SELECT id, public::text, coalesce(file_size_limit::text, ''), coalesce(array_to_string(allowed_mime_types, ','), '')
FROM storage.buckets ORDER BY 1;
\endif

\echo '#### publication_tables'
SELECT pubname, schemaname, tablename FROM pg_publication_tables ORDER BY 1, 2, 3;

-- Cron: names and schedules only (never the command text). Empty when pg_cron is absent.
\echo '#### cron_jobs'
SELECT (to_regclass('cron.job') IS NOT NULL) AS has_cron \gset
\if :has_cron
SELECT jobname, schedule, active::text FROM cron.job ORDER BY 1;
\else
SELECT 'no pg_cron';
\endif

-- Foreign keys that point at auth.users, with their delete rule (B7 deletion pipeline).
\echo '#### fk_to_auth_users'
SELECT conrelid::regclass::text, conname, confdeltype::text
FROM pg_constraint
WHERE contype = 'f' AND confrelid = to_regclass('auth.users')
ORDER BY 1, 2;

-- Fingerprints of the public schema: tables (columns), functions, policies, triggers, views, grants.
\echo '#### fp_tables'
SELECT c.table_name,
  md5(string_agg(c.column_name || ':' || c.data_type || ':' || coalesce(c.udt_name, '') || ':' || c.is_nullable || ':' || coalesce(c.column_default, ''), ',' ORDER BY c.ordinal_position))
FROM information_schema.columns c
WHERE c.table_schema = 'public'
GROUP BY c.table_name
ORDER BY 1;

\echo '#### fp_functions'
SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', md5(pg_get_functiondef(p.oid))
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
ORDER BY 1;

\echo '#### fp_policies'
SELECT tablename || '.' || policyname,
  md5(permissive || cmd || array_to_string(roles, ',') || coalesce(qual, '') || coalesce(with_check, ''))
FROM pg_policies WHERE schemaname = 'public'
ORDER BY 1;

\echo '#### fp_triggers'
SELECT c.relname || '.' || t.tgname, md5(pg_get_triggerdef(t.oid))
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname = 'public'
ORDER BY 1;

\echo '#### fp_views'
SELECT c.relname, md5(pg_get_viewdef(c.oid))
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
ORDER BY 1;

\echo '#### fp_grants'
SELECT c.relname, md5(coalesce(c.relacl::text, ''))
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'S', 'p')
ORDER BY 1;

\echo '#### fp_rls'
SELECT c.relname, c.relrowsecurity::text || ':' || c.relforcerowsecurity::text
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY 1;

\echo '#### end'
