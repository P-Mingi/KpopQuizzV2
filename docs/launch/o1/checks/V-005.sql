-- V-005 (run O1, session.sh): after 005-net-counters.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V3 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'bridge_daily : RLS active, aucune policy', (select relrowsecurity from pg_class where oid = 'public.bridge_daily'::regclass) and (select count(*) = 0 from pg_policy where polrelid = 'public.bridge_daily'::regclass), null),
  (2, 'bridge_daily illisible par anon et authenticated', (select not has_table_privilege('anon', 'public.bridge_daily', 'select') and not has_table_privilege('authenticated', 'public.bridge_daily', 'select')), null)
) as c(n, what, ok, got) order by n;
rollback;
