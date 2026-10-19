\pset format unaligned

\pset tuples_only on
\pset fieldsep ' | '
select 'sites', string_agg(format('%s/%s/%s/%s/%s/%s', id, domain, brand, kind, status, sort), ', ' order by sort) from public.sites;
select 'sites rls', relrowsecurity from pg_class where oid = 'public.sites'::regclass;
select 'sites policy', polname, polcmd, pg_get_expr(polqual, polrelid) from pg_policy where polrelid = 'public.sites'::regclass;
select 'site_id cols', count(*) from information_schema.columns where table_schema = 'public' and column_name = 'site_id' and column_default = '''kpop''::text' and is_nullable = 'NO';
select 'fks not valid', count(*) from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass and conname like '%\_site\_id\_fkey' and not convalidated;
select 'fks valid', count(*) from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass and conname like '%\_site\_id\_fkey' and convalidated;
select 'valid site idx', count(*) from pg_index i join pg_class c on c.oid = i.indexrelid where c.relnamespace = 'public'::regnamespace and i.indisvalid and c.relname in ('quizzes_site_status_created_idx','groups_site_slug_idx','games_site_status_idx','trivia_site_group_idx','activity_events_site_created_idx','creator_notifications_site_user_idx','editorial_drafts_site_status_idx','verse_threads_site_created_idx','community_debates_site_created_idx');
select 'guard trigger', count(*) from pg_trigger where tgname = 'trg_quizzes_site_guard';
select 'guard fn', prosecdef, proconfig from pg_proc where proname = 'quizzes_site_guard';
select 'guard exec anon/auth/service', has_function_privilege('anon', p.oid, 'execute'), has_function_privilege('authenticated', p.oid, 'execute'), has_function_privilege('service_role', p.oid, 'execute') from pg_proc p where proname = 'quizzes_site_guard';
select 'quizzes not kpop', count(*) from public.quizzes where site_id <> 'kpop';
select 'badge_definitions not kpop', count(*) from public.badge_definitions where site_id <> 'kpop';
