-- V-002b (run O1, session.sh): after 002b-site-validate.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V2 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'clés site_id pas encore validées : 0', (select count(*) = 0 from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass and conname like '%\_site\_id\_fkey' and not convalidated), (select count(*)::text from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass and conname like '%\_site\_id\_fkey' and not convalidated))
) as c(n, what, ok, got) order by n;
rollback;
