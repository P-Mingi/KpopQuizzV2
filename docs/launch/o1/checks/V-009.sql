-- V-009 (run O1, session.sh): after 009-daily-prep.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V5 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'kpop : auteur du quiz du jour et groupe general-kpop', (select system_user_id is not null and fallback_group_slug = 'general-kpop' from public.sites where id = 'kpop'), null),
  (2, 'index quiz_bank_site_date et qotd_log_site_date valides : 2', (select count(*) = 2 from pg_index i join pg_class c on c.oid = i.indexrelid where c.relname in ('quiz_bank_site_date', 'qotd_log_site_date') and i.indisvalid and i.indisready), (select count(*)::text from pg_index i join pg_class c on c.oid = i.indexrelid where c.relname in ('quiz_bank_site_date', 'qotd_log_site_date') and i.indisvalid and i.indisready)),
  (3, 'quiz_bank_category_check validée (seules les douze catégories)', (select convalidated from pg_constraint where conname = 'quiz_bank_category_check'), null)
) as c(n, what, ok, got) order by n;
rollback;
