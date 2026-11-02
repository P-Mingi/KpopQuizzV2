-- V-018 (run O1, session.sh): after 018-entity-images.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'entity_images avec RLS', (select relrowsecurity from pg_class where oid = 'public.entity_images'::regclass), null),
  (2, 'anon : ni insert ni created_by, seulement le chemin ; authenticated sans update', (select not has_table_privilege('anon', 'public.entity_images', 'insert') and not has_table_privilege('authenticated', 'public.entity_images', 'update') and not has_column_privilege('anon', 'public.entity_images', 'created_by', 'select') and has_column_privilege('anon', 'public.entity_images', 'path', 'select')), null),
  (3, 'bucket entity-images public, 4 Mo', (select count(*) = 1 and bool_and(public and file_size_limit = 4194304) from storage.buckets where id = 'entity-images'), null),
  (4, 'entity_images : license_url, commons_file et needs_credit illisibles par anon et authenticated (le crédit passe par entity_credits_public)', (select bool_and(not has_column_privilege(r.role, 'public.entity_images', c.col, 'select')) from (values ('anon'), ('authenticated')) as r(role) cross join (values ('license_url'), ('commons_file'), ('needs_credit')) as c(col)), null),
  (5, 'entity_images : license_url, commons_file et needs_credit (colonne calculée CC BY / CC BY-SA) présentes, auteur et source facultatifs', (select count(*) = 3 from information_schema.columns where table_schema = 'public' and table_name = 'entity_images' and column_name in ('license_url', 'commons_file', 'needs_credit')) and (select is_generated = 'ALWAYS' from information_schema.columns where table_schema = 'public' and table_name = 'entity_images' and column_name = 'needs_credit') and (select bool_and(is_nullable = 'YES') from information_schema.columns where table_schema = 'public' and table_name = 'entity_images' and column_name in ('author', 'source_url')), null)
) as c(n, what, ok, got) order by n;
rollback;
