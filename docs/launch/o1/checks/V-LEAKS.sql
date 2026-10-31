-- V-LEAKS (run O1, session.sh): after the launch content files (L04 to L08)
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V8, leaks (SQL side).
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'quiz dont le groupe est d''un autre site : 0', (select count(*) = 0 from public.quizzes q join public.groups g on g.id = q.group_id where q.site_id <> g.site_id), (select count(*)::text from public.quizzes q join public.groups g on g.id = q.group_id where q.site_id <> g.site_id)),
  (2, 'groupe anime au même slug qu''un groupe kpop : 0', (select count(*) = 0 from public.groups g where g.site_id = 'anime' and g.slug in (select slug from public.groups where site_id = 'kpop')), null),
  (3, 'quiz anime déjà datés dans la banque : 0', (select count(*) = 0 from public.quiz_bank where site_id = 'anime' and scheduled_date is not null), (select count(*)::text from public.quiz_bank where site_id = 'anime' and scheduled_date is not null))
) as c(n, what, ok, got) order by n;
rollback;
