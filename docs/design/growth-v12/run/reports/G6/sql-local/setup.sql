-- G6 local check: the shape of production before v12-g6-name-all.sql, on a throwaway
-- LOCAL Postgres (never production). Roles as on Supabase, groups reduced to an id,
-- name_all_member_results exactly as migration 126 creates it, with a few rows of
-- the older game (no order, no time).
create role anon;
create role authenticated;
create role service_role;

create table public.groups (id integer primary key, slug text not null);
insert into public.groups values (2, 'blackpink'), (3, 'stray-kids');

create table public.name_all_member_results (
  id           bigserial primary key,
  group_id     integer references public.groups(id) on delete cascade,
  member_name  text not null,
  found        boolean not null,
  round_id     uuid not null,
  created_at   timestamptz not null default now()
);
create index idx_namr_group on public.name_all_member_results(group_id);
create index idx_namr_group_member on public.name_all_member_results(group_id, member_name);
alter table public.name_all_member_results enable row level security;

-- two rounds of the older game for BLACKPINK: one perfect, one not
insert into public.name_all_member_results (group_id, member_name, found, round_id) values
  (2, 'Jisoo', true,  '00000000-0000-4000-8000-000000000001'),
  (2, 'Jennie', true, '00000000-0000-4000-8000-000000000001'),
  (2, 'Rose', true,   '00000000-0000-4000-8000-000000000001'),
  (2, 'Lisa', true,   '00000000-0000-4000-8000-000000000001'),
  (2, 'Jisoo', true,  '00000000-0000-4000-8000-000000000002'),
  (2, 'Jennie', false,'00000000-0000-4000-8000-000000000002'),
  (2, 'Rose', false,  '00000000-0000-4000-8000-000000000002'),
  (2, 'Lisa', true,   '00000000-0000-4000-8000-000000000002');
