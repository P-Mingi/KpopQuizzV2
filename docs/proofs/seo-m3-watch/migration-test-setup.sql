-- Throwaway shapes of the production tables the migration touches (read 2026-10-15).
do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
create table public.groups (
  id serial primary key,
  name text unique not null,
  slug text unique not null constraint slug_format check (slug ~ '^[a-z0-9-]{1,60}$'),
  quiz_count integer default 0,
  total_plays integer default 0
);
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  group_id integer references public.groups(id),
  title text not null,
  slug text unique not null constraint slug_format check (slug ~ '^[a-z0-9-]{1,80}$'),
  status text not null default 'published',
  play_count integer default 0
);
grant select, insert, update, delete on public.groups, public.quizzes to service_role, authenticated;
grant usage on sequence public.groups_id_seq to service_role, authenticated;
insert into public.groups (name, slug) values ('BTS', 'bts'), ('ILLIT', 'illit'), ('Old Dup', 'old-dup');
insert into public.quizzes (group_id, title, slug) values (1, 'BTS hard quiz', 'bts-hard'), (2, 'ILLIT quiz one', 'illit-one');
