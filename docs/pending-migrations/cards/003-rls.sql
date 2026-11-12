-- 003-rls.sql (Bunnyverse Cards, lane CORE, 2026-11-12; RLS, grants and the public photo bucket)
--
-- What:   turns row level security on for the 9 cards tables and gives them NO policy for anon or authenticated: the browser roles read and
--         write nothing directly. Every read and write goes through the server (lib/cards, the service role) or the security definer
--         functions of 002. Revokes the default table privileges of anon and authenticated, grants all to service_role. Creates the public
--         storage bucket 'cards' (WebP, 1 MB a file) that the owner's upload script fills with the cropped card photos.
-- Why:    contract section 2: "RLS on, writes by the service role or by security definer functions only". The public catalog is served by
--         GET /api/cards/catalog (cached), the wallet and the binder by /api/cards/state; nothing needs a direct browser read.
-- Rows:   0 rows in the tables. 1 bucket row.
-- Needs:  001.
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename like 'cards\_%' and rowsecurity;   expect 9
-- Verify: select count(*) from pg_policies where schemaname = 'public' and tablename like 'cards\_%';   expect 0
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name like 'cards\_%' and grantee in ('anon', 'authenticated');   expect 0
-- Verify: select id, public, file_size_limit from storage.buckets where id = 'cards';   expect cards, t, 1048576
-- Undo:   003-rls.rollback.sql
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c003$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_wallets') is null then
    raise exception '003-rls: run 001-schema.sql first';
  end if;

  alter table public.cards_entities enable row level security;
  alter table public.cards_photos enable row level security;
  alter table public.cards_catalog enable row level security;
  alter table public.cards_wallets enable row level security;
  alter table public.cards_owned enable row level security;
  alter table public.cards_packs enable row level security;
  alter table public.cards_ad_tickets enable row level security;
  alter table public.cards_reports enable row level security;
  alter table public.cards_bonus_earned enable row level security;

  revoke all on public.cards_entities, public.cards_photos, public.cards_catalog, public.cards_wallets, public.cards_owned,
    public.cards_packs, public.cards_ad_tickets, public.cards_reports, public.cards_bonus_earned from public, anon, authenticated;
  grant all on public.cards_entities, public.cards_photos, public.cards_catalog, public.cards_wallets, public.cards_owned,
    public.cards_packs, public.cards_ad_tickets, public.cards_reports, public.cards_bonus_earned to service_role;

  -- A public bucket serves its files by URL without a policy; without an insert, update or delete policy only the service role writes.
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('cards', 'cards', true, 1048576, array['image/webp'])
  on conflict (id) do update
    set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp'];

  if exists (select 1 from pg_policies where schemaname = 'public' and tablename like 'cards\_%') then
    raise exception '003-rls: a cards table holds a policy (none is expected)';
  end if;
end $c003$;
