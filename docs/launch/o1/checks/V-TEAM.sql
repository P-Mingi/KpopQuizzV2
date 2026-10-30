-- V-TEAM (run O1, session.sh): before launch/L02-K2-team-accounts.sql: the 31 Team auth users made by team-auth.mjs (step 40)
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From RUNBOOK K4.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'utilisateurs Team en team.bunnyverse.org, confirmés : 31', (select count(*) = 31 from auth.users where email like '%@team.bunnyverse.org' and email_confirmed_at is not null), (select count(*)::text from auth.users where email like '%@team.bunnyverse.org' and email_confirmed_at is not null)),
  (2, 'aucun ancien utilisateur team.otakuquiz.org', (select count(*) = 0 from auth.users where email like '%@team.otakuquiz.org'), (select count(*)::text from auth.users where email like '%@team.otakuquiz.org'))
) as c(n, what, ok, got) order by n;
rollback;
