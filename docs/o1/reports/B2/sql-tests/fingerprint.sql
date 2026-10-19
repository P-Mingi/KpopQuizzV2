\pset format unaligned
\pset tuples_only on
select 'public catalog md5', md5(string_agg(x, E'\n' order by x)) from (
  select format('col %s.%s %s %s %s', c.relname, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, pg_get_expr(d.adbin, d.adrelid))
    from pg_attribute a join pg_class c on c.oid = a.attrelid left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where c.relnamespace = 'public'::regnamespace and a.attnum > 0 and not a.attisdropped
  union all select format('con %s.%s %s %s', conrelid::regclass, conname, pg_get_constraintdef(oid), convalidated) from pg_constraint where connamespace = 'public'::regnamespace
  union all select format('idx %s', pg_get_indexdef(indexrelid)) from pg_index i join pg_class c on c.oid = i.indexrelid where c.relnamespace = 'public'::regnamespace
  union all select format('trg %s', pg_get_triggerdef(oid)) from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)
  union all select format('fn %s %s', p.oid::regprocedure, md5(prosrc)) from pg_proc p where pronamespace = 'public'::regnamespace
  union all select format('pol %s.%s', polrelid::regclass, polname) from pg_policy
  union all select format('rel %s %s %s', relname, relkind, relrowsecurity) from pg_class where relnamespace = 'public'::regnamespace
) s(x);
