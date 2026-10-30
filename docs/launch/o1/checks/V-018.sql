-- V-018 (run O1, session.sh): after 018-entity-images.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'entity_images avec RLS', (select relrowsecurity from pg_class where oid = 'public.entity_images'::regclass), null),
  (2, 'anon : ni insert ni created_by, seulement le chemin ; authenticated sans update', (select not has_table_privilege('anon', 'public.entity_images', 'insert') and not has_table_privilege('authenticated', 'public.entity_images', 'update') and not has_column_privilege('anon', 'public.entity_images', 'created_by', 'select') and has_column_privilege('anon', 'public.entity_images', 'path', 'select')), null),
  (3, 'bucket entity-images public, 4 Mo', (select count(*) = 1 and bool_and(public and file_size_limit = 4194304) from storage.buckets where id = 'entity-images'), null)
) as c(n, what, ok, got) order by n;
rollback;
