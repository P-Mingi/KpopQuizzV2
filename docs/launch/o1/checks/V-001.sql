-- V-001 (run O1, session.sh): after 001-sites.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V2 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'sites : une seule ligne, kpop, en ligne', (select count(*) = 1 and bool_and(id = 'kpop' and domain = 'kpopquiz.org' and status = 'live') from public.sites), (select count(*)::text from public.sites))
) as c(n, what, ok, got) order by n;
rollback;
