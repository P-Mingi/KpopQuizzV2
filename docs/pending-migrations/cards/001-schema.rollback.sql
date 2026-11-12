-- 001-schema.rollback.sql (Bunnyverse Cards, lane CORE): undo of 001-schema.sql.
--
-- What:   drops the 9 cards tables (their indexes and constraints go with them). Run 003 and 002 rollbacks first (they hold the policies, the trigger
--         functions and the bucket that depend on these tables).
-- Why:    the feature is off by default (NET_CARDS), so a rollback leaves the site as it was.
-- Rows:   9 tables dropped. Refused, with nothing changed, while a player owns a card or opened a pack (that is his data, not a build artefact),
--         or while a report is open (someone waits for an answer).
-- Verify: select count(*) from information_schema.tables where table_schema = 'public' and table_name like 'cards\_%';   expect 0
-- Undo:   run 001-schema.sql again (the player data is not restored; a backup is the way back).
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c001r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

declare
  v_n bigint := 0;
begin
  if to_regclass('public.cards_owned') is not null then
    execute 'select count(*) from public.cards_owned' into v_n;
    if v_n > 0 then
      raise exception '001-schema.rollback: % owned card rows exist, refusing', v_n;
    end if;
  end if;
  if to_regclass('public.cards_packs') is not null then
    execute 'select count(*) from public.cards_packs' into v_n;
    if v_n > 0 then
      raise exception '001-schema.rollback: % opened packs exist, refusing', v_n;
    end if;
  end if;
  -- Review 1 finding 15: an open report is a request someone is waiting on (a photo to remove within 48 hours).
  if to_regclass('public.cards_reports') is not null then
    execute 'select count(*) from public.cards_reports where status = ''open''' into v_n;
    if v_n > 0 then
      raise exception '001-schema.rollback: % open reports exist, refusing; close them first', v_n;
    end if;
  end if;

  drop table if exists public.cards_bonus_earned;
  drop table if exists public.cards_reports;
  drop table if exists public.cards_ad_tickets;
  drop table if exists public.cards_packs;
  drop table if exists public.cards_owned;
  drop table if exists public.cards_wallets;
  drop table if exists public.cards_catalog;
  drop table if exists public.cards_photos;
  drop table if exists public.cards_entities;
end;
end $c001r$;
