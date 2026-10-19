-- 001-sites.sql (run O1, lane B2; manifest.md row 1; BACKLOG 4.1 row 1; schema.sql section "@file 001-sites")
--
-- What:   creates public.sites, the database mirror of the site registry (lib/site/registry.ts), with RLS on, one
--         read policy (sites_read, everyone reads, nobody writes through the API) and the kpop row only.
-- Why:    every site_id column of 002a references sites(id). The anime and hub rows wait for launch day
--         (launch/L01-B2-sites.sql, Verrou 0): production holds no anime or hub row before launch.
-- Rows:   1 new table; 1 row inserted (kpop). No existing table or row is touched.
-- Verify: select id, domain, brand, kind, status, sort from public.sites order by sort;
--           expect 1 row: kpop | kpopquiz.org | KpopQuiz | world | live | 1
--         select relrowsecurity from pg_class where oid = 'public.sites'::regclass;                  expect t
--         select polname, polcmd from pg_policy where polrelid = 'public.sites'::regclass;           expect sites_read | r
-- Undo:   001-sites.rollback.sql (refused while a site_id column or another site row exists: roll back 002a and
--         L01 first, rollbacks run in reverse order).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

create table if not exists public.sites (
  id     text primary key constraint sites_id_check check (id ~ '^[a-z]{2,12}$'),
  domain text not null constraint sites_domain_key unique,
  brand  text not null,
  kind   text not null constraint sites_kind_check check (kind in ('world', 'hub')),
  status text not null default 'building' constraint sites_status_check check (status in ('building', 'live', 'frozen')),
  sort   smallint not null default 0
);

alter table public.sites enable row level security;

-- policy: everyone (anon included) reads the registry mirror; no write policy (rows come from SQL files only).
do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.sites'::regclass and polname = 'sites_read') then
    create policy sites_read on public.sites for select using (true);
  end if;
end $$;

insert into public.sites (id, domain, brand, kind, status, sort)
values ('kpop', 'kpopquiz.org', 'KpopQuiz', 'world', 'live', 1)
on conflict (id) do nothing;

-- Self-check: the kpop row reads as the registry says (a pre-existing different row fails the file).
do $$
begin
  if not exists (
    select 1 from public.sites
    where id = 'kpop' and domain = 'kpopquiz.org' and brand = 'KpopQuiz' and kind = 'world' and status = 'live' and sort = 1
  ) then
    raise exception '001-sites: the kpop row differs from the registry (kpop, kpopquiz.org, KpopQuiz, world, live, 1)';
  end if;
end $$;
