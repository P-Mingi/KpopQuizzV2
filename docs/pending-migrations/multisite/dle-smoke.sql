-- dle-smoke.sql (run O1, daily games step 1): the owner's check after 019-dle-core.sql and 020-dle-kpop-idol.sql.
-- Read only. It prints counts and ok / KO, never a name, an id or a target, so it spoils no answer.
-- Run: psql "$DB" -f docs/pending-migrations/multisite/dle-smoke.sql   (or paste it in the SQL editor). Every row must say ok.

with checks(n, what, expected, got) as (
  values
    (1, 'dle tables with RLS on', '9',
      (select count(*)::text from pg_tables where schemaname = 'public' and tablename like 'dle\_%' and rowsecurity)),
    (2, 'policies on dle tables', '0',
      (select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'dle\_%')),
    (3, 'dle tables or views readable by anon or authenticated', '0',
      (select count(*)::text from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname like 'dle\_%'
        and c.relkind in ('r', 'v') and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select')))),
    (4, 'dle functions open to the browser roles', 'dle_day,dle_give_up,dle_guess,dle_pool',
      (select string_agg(distinct p.proname, ',' order by p.proname) from pg_proc p where p.pronamespace = 'public'::regnamespace
        and p.proname like 'dle\_%' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')))),
    (5, 'kpopdle-idol present and switched off (active, epoch set)', 'false,false',
      (select active::text || ',' || (epoch is not null)::text from public.dle_games where id = 'kpopdle-idol')),
    (6, 'kpopdle-idol columns', '8',
      (select count(*)::text from public.dle_attributes where game_id = 'kpopdle-idol')),
    (7, 'days in the bank (none before step 4)', '0',
      (select count(*)::text from public.dle_schedule)),
    (8, 'plays (none before step 4)', '0',
      (select count(*)::text from public.dle_plays)),
    (9, 'entity_images columns license_verified and thumb_path', '2',
      (select count(*)::text from information_schema.columns where table_schema = 'public' and table_name = 'entity_images'
        and column_name in ('license_verified', 'thumb_path'))),
    (10, 'the source view names no private column', 'false',
      (select (pg_get_viewdef('public.dle_src_kpop_idol'::regclass) ~ '(height_cm|mbti|blood_type)')::text))
)
select n, what, expected, got, case when got = expected then 'ok' else 'KO' end as result from checks
union all
-- For information, no ok/KO: the idols the view keeps (adult, active, reviewed, attached), and how many have every column
-- (0 until lot K1 adds idols.gender and idols.debut_year), and how many have a verified 96 px picture.
select 11, 'idols in the pool (information)', '', (select count(*)::text from public.dle_src_kpop_idol), 'info'
union all
select 12, 'idols complete enough to be a target (information, 0 before K1)', '',
  (select count(*)::text from public.dle_src_kpop_idol s
    where not exists (select 1 from public.dle_attributes a where a.game_id = 'kpopdle-idol'
      and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0)), 'info'
union all
select 13, 'idols with a verified picture (information, 0 before step 2)', '',
  (select count(*)::text from public.dle_src_kpop_idol where thumb_path is not null), 'info'
order by 1;
