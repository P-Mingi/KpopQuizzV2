-- 102-catalog-rebuild.rollback.sql (undo of 102-catalog-rebuild.sql)
--
-- What:   empties cards_catalog, cards_photos and cards_entities, then gives them back the shape of 001: drops part, small_2x and end_year,
--         and the unique key (entity_id, rarity, part) returns to (entity_id, rarity). The catalog stays EMPTY: 101 is not re-run here,
--         because 101 predates the age rule of lot 2 (it would bring back the subjects that rule leaves out). Apply 102 again to refill it.
-- Refuses: while a player owns a card (cards_owned) or has opened a pack (cards_packs).
-- Verify: select count(*) from public.cards_catalog;   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('cards_catalog', 'cards_entities') and column_name in ('part', 'small_2x', 'end_year');   expect 0
-- o1-transaction: single, ONE DO block. Idempotent.

do $c102r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_catalog') is null then
    return;
  end if;
  if exists (select 1 from public.cards_owned) then
    raise exception '102-catalog-rebuild rollback: a player owns a card';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '102-catalog-rebuild rollback: a pack was opened';
  end if;

  delete from public.cards_catalog;
  delete from public.cards_photos;
  delete from public.cards_entities;

  alter table public.cards_catalog drop constraint if exists cards_catalog_entity_rarity_part_key;
  alter table public.cards_catalog drop constraint if exists cards_catalog_part_check;
  alter table public.cards_catalog drop column if exists part;
  alter table public.cards_catalog drop column if exists small_2x;
  alter table public.cards_entities drop constraint if exists cards_entities_end_year_check;
  alter table public.cards_entities drop column if exists end_year;
  if not exists (select 1 from pg_constraint where conname = 'cards_catalog_entity_rarity_key' and conrelid = 'public.cards_catalog'::regclass) then
    alter table public.cards_catalog add constraint cards_catalog_entity_rarity_key unique (entity_id, rarity);
  end if;
end $c102r$;
