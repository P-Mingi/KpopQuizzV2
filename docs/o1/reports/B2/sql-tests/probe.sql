\pset format unaligned
\pset tuples_only on
select 'sites', to_regclass('public.sites') is not null;
select 'site_id cols', count(*) from information_schema.columns where table_schema='public' and column_name='site_id';
select 'quizzes rows', count(*) from public.quizzes;
select 'groups rows', count(*) from public.groups;
select 'version', current_setting('server_version');
