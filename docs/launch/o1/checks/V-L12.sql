-- V-L12 (run O1, session.sh): after launch/L12-L1-sites-live.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V8.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'kpop, anime et hub en ligne', (select count(*) = 3 and bool_and(status = 'live') from public.sites where id in ('kpop', 'anime', 'hub')), (select count(*) filter (where status = 'live')::text from public.sites))
) as c(n, what, ok, got) order by n;
rollback;
