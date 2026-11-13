-- 105-goals.rollback.sql (KpopCards lots 3 + 4 + 5): undo of 105-goals.sql.
--
-- What:   drops the 5 functions of 105, the 4 tables cards_sets_claimed, cards_week_claims, cards_idem and cards_audit, and puts
--         cards_wallets_stock_check back to stock between 0 and 5.
-- Why:    without 105 there are no sets, no weekly list and no idempotency ledger; 110 and later files need them, so undo those first.
-- Rows:   4 tables dropped with their rows. Refused while a set or a week is claimed, while a ledger row or an audit row exists (they are the only
--         record of what was paid and spent), or while a stack holds more than 5 packs (the old check would refuse it).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_goals_progress', 'cards_week_progress', 'cards_missions', 'cards_claim', 'cards_idem_gc');   expect 0
-- Verify: select pg_get_constraintdef(oid) like '%500%' from pg_constraint where conname = 'cards_wallets_stock_check' and conrelid = 'public.cards_wallets'::regclass;   expect f
-- Undo:   run 105-goals.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c105r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_sets_claimed') is not null and exists (select 1 from public.cards_sets_claimed) then
    raise exception '105-goals rollback: refused, a set is claimed (cards_sets_claimed holds rows)';
  end if;
  if to_regclass('public.cards_week_claims') is not null and exists (select 1 from public.cards_week_claims) then
    raise exception '105-goals rollback: refused, a week is claimed (cards_week_claims holds rows)';
  end if;
  if to_regclass('public.cards_idem') is not null and exists (select 1 from public.cards_idem) then
    raise exception '105-goals rollback: refused, the idempotency ledger holds rows';
  end if;
  if to_regclass('public.cards_audit') is not null and exists (select 1 from public.cards_audit) then
    raise exception '105-goals rollback: refused, the audit trail holds rows';
  end if;
  if exists (select 1 from public.cards_wallets where stock > 5) then
    raise exception '105-goals rollback: refused, a stack holds more than 5 packs';
  end if;

  drop function if exists public.cards_claim(uuid, text, text, timestamptz, integer);
  drop function if exists public.cards_missions(uuid, timestamptz);
  drop function if exists public.cards_week_progress(uuid, timestamptz);
  drop function if exists public.cards_goals_progress(uuid, integer[]);
  drop function if exists public.cards_idem_gc(timestamptz);
  drop table if exists public.cards_sets_claimed;
  drop table if exists public.cards_week_claims;
  drop table if exists public.cards_idem;
  drop table if exists public.cards_audit;

  if exists (select 1 from pg_constraint where conname = 'cards_wallets_stock_check' and conrelid = 'public.cards_wallets'::regclass
              and pg_get_constraintdef(oid) like '%500%') then
    alter table public.cards_wallets drop constraint cards_wallets_stock_check;
    alter table public.cards_wallets add constraint cards_wallets_stock_check check (stock between 0 and 5);
  end if;

  notify pgrst, 'reload schema';
end $c105r$;
