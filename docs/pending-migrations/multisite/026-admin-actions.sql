-- 026-admin-actions.sql (run O1, ADMIN-2; docs/o1/admin/PLAN-ADMIN-2.md section 4): the journal of the one admin.
--
-- What:   the table public.admin_actions, one line per write the admin of bunnyverse.org makes, whichever site it acts on:
--         id (identity), at (default now()), admin_id (the verified admin's auth id, no foreign key: the journal outlives an account),
--         site_id (references public.sites), action (a short dotted code such as 'quiz.remove'), target_type, target_id (text, so a quiz
--         uuid, a group id or a song id all fit), detail (a small json object: ids, counts and short codes, never an e-mail, a name or a
--         free text typed by a user; the app drops such keys before the insert and a check caps its size), request_id (the platform's
--         request id). Two indexes (site then time, admin then time). RLS on, no policy, every privilege revoked from public, anon and
--         authenticated; the service role may select and insert, nothing else. A trigger refuses any update or delete of a line (even from
--         the service role): the journal is append only.
-- Why:    an audit trail of what the admin did, read on the Journal page of the admin (the last 200 lines, filtered by site). The app writes
--         it with the service-role client right after each successful write (apps/quiz/src/lib/admin/journal.ts, logAdminAction).
-- Rows:   1 table, 2 indexes, 1 trigger function, 1 trigger. No row is inserted.
-- Needs:  001-sites.sql (public.sites). Nothing else.
-- Verify: docs/launch/o1/checks/V-026.sql (read only).
--         select relrowsecurity from pg_class where oid = 'public.admin_actions'::regclass;   expect t
--         select count(*) from pg_policies where schemaname = 'public' and tablename = 'admin_actions';   expect 0
--         select has_table_privilege('anon', 'public.admin_actions', 'select'), has_table_privilege('authenticated', 'public.admin_actions', 'insert');   expect f, f
--         select has_table_privilege('service_role', 'public.admin_actions', 'select'), has_table_privilege('service_role', 'public.admin_actions', 'update');   expect t, f
-- Undo:   026-admin-actions.rollback.sql (refused while the table holds a line: export it, then truncate public.admin_actions as the owner).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.sites') is null then
    raise exception '026-admin-actions: public.sites is missing (apply 001-sites.sql first)';
  end if;
end $$;

create table if not exists public.admin_actions (
  id bigint generated always as identity constraint admin_actions_pkey primary key,
  at timestamptz not null default now(),
  admin_id uuid not null,
  site_id text not null constraint admin_actions_site_id_fkey references public.sites(id),
  action text not null constraint admin_actions_action_check check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){0,3}$' and char_length(action) <= 80),
  target_type text constraint admin_actions_target_type_check check (target_type is null or char_length(target_type) <= 40),
  target_id text constraint admin_actions_target_id_check check (target_id is null or char_length(target_id) <= 200),
  detail jsonb not null default '{}'::jsonb constraint admin_actions_detail_check check (jsonb_typeof(detail) = 'object' and octet_length(detail::text) <= 8192),
  request_id text constraint admin_actions_request_id_check check (request_id is null or char_length(request_id) <= 100)
);

create index if not exists admin_actions_site_at_idx on public.admin_actions (site_id, at desc);
create index if not exists admin_actions_admin_at_idx on public.admin_actions (admin_id, at desc);

-- Append only: no update and no delete of a line, from any role (the service role bypasses RLS, not a trigger).
create or replace function public.admin_actions_append_only() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'admin_actions is append only';
end $$;
revoke all on function public.admin_actions_append_only() from public, anon, authenticated;

drop trigger if exists trg_admin_actions_append_only on public.admin_actions;
create trigger trg_admin_actions_append_only before update or delete on public.admin_actions
  for each row execute function public.admin_actions_append_only();

alter table public.admin_actions enable row level security;
revoke all on table public.admin_actions from public, anon, authenticated;
revoke all on table public.admin_actions from service_role;
grant select, insert on table public.admin_actions to service_role;
-- Supabase's default privileges give the identity sequence to anon and authenticated too: closed like the table.
revoke all on sequence public.admin_actions_id_seq from public, anon, authenticated;
grant usage, select on sequence public.admin_actions_id_seq to service_role;
