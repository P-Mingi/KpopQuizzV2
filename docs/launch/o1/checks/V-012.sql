-- V-012 (run O1, session.sh): after 012-editorial-quiz.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'review_batches : RLS active, aucune policy', (select relrowsecurity from pg_class where oid = 'public.review_batches'::regclass) and (select count(*) = 0 from pg_policy where polrelid = 'public.review_batches'::regclass), null),
  (2, 'editorial_drafts_kind_check validée', (select convalidated from pg_constraint where conname = 'editorial_drafts_kind_check'), null),
  (3, 'brouillons de quiz : 0', (select count(*) = 0 from public.editorial_drafts where kind = 'quiz'), (select count(*)::text from public.editorial_drafts where kind = 'quiz'))
) as c(n, what, ok, got) order by n;
rollback;
