-- 003-rls.rollback.sql (Bunnyverse Cards, lane CORE): undo of 003-rls.sql.
--
-- What:   turns row level security off on the 9 cards tables and removes the 'cards' bucket row. The table privileges are not restored.
-- Why:    leaves the schema as 001 made it. Refused, with nothing changed, while the bucket holds files (storage.objects): empty it in the
--         dashboard or with the Storage API first. The bucket row is deleted with storage.allow_delete_query set for this transaction only.
-- Rows:   1 bucket row deleted when empty.
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename like 'cards\_%' and rowsecurity;   expect 0
-- Verify: select count(*) from storage.buckets where id = 'cards';   expect 0
-- Undo:   run 003-rls.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c003r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

declare
  v_n bigint := 0;
begin
  if to_regclass('storage.objects') is not null then
    execute 'select count(*) from storage.objects where bucket_id = ''cards''' into v_n;
    if v_n > 0 then
      raise exception '003-rls.rollback: the cards bucket holds % files, refusing; empty it in the Supabase dashboard or with the Storage API first', v_n;
    end if;
  end if;
  -- Supabase refuses any SQL delete on storage tables (trigger storage.protect_delete) unless this setting is on; transaction-local.
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.buckets where id = 'cards';

  if to_regclass('public.cards_wallets') is not null then
    alter table public.cards_entities disable row level security;
    alter table public.cards_photos disable row level security;
    alter table public.cards_catalog disable row level security;
    alter table public.cards_wallets disable row level security;
    alter table public.cards_owned disable row level security;
    alter table public.cards_packs disable row level security;
    alter table public.cards_ad_tickets disable row level security;
    alter table public.cards_reports disable row level security;
    alter table public.cards_bonus_earned disable row level security;
  end if;
end;
end $c003r$;
