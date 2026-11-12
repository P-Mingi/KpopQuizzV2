-- 101-catalog.rollback.sql (undo of 101-catalog.sql)
--
-- What:   removes what 101 wrote for the 59 subjects: their catalog rows, their photos (by source_path) and their entities, then the
--         group-line entities that are left without any card or any person pointing at them.
-- Refuses: while a player owns one of these cards (cards_owned) or has opened a pack (cards_packs): that would destroy a collection.
-- Verify: select count(*) from public.cards_catalog;   expect 0 (when only 101 filled it)
-- o1-transaction: single, ONE DO block. Idempotent.

do $c101r$
declare
  v_slugs constant text[] := array['bibi', 'chungha', 'heize', 'hwasa', 'hyuna', 'iu', 'jay-park', 'jennie', 'jeon-somi', 'jimin', 'jungkook', 'psy', 'rose', 'sunmi', 'taeyang', 'taeyeon', 'v-bts', 'zico', 'akmu', 'apink', 'artms', 'astro', 'billlie', 'btob', 'cortis', 'day6', 'dreamcatcher', 'fifty-fifty', 'fromis-9', 'hearts2hearts', 'ikon', 'illit', 'kara', 'katseye', 'kickflip', 'kiss-of-life', 'loona', 'loossemble', 'miss-a', 'monsta-x', 'nct', 'nct-wish', 'p1harmony', 'pentagon', 'purple-kiss', 'rescene', 'sistar', 'stayc', 't-ara', 'team', 'the-boyz', 'triples', 'tuide', 'tws', 'viviz', 'winner', 'xikers', 'young-posse', 'zerobaseone'];
  v_ents text[];
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_catalog') is null then
    return;
  end if;
  select coalesce(array_agg(x), '{}') into v_ents from (
    select 'idol:' || s as x from unnest(v_slugs) s union all select 'group:' || s from unnest(v_slugs) s) u;

  if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where c.entity_id = any (v_ents)) then
    raise exception '101-catalog rollback: a player owns one of these cards';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '101-catalog rollback: a pack was opened';
  end if;

  delete from public.cards_catalog where entity_id = any (v_ents);
  delete from public.cards_photos where entity_id = any (v_ents) and source_path = any (select 'images/group-photos/' || s || '.jpg' from unnest(v_slugs) s);
  delete from public.cards_entities where id = any (v_ents) and kind = 'idol';
  delete from public.cards_entities e where e.id = any (v_ents) and e.kind = 'group';
  -- The group lines made for the people: group entities without any card, photo or person left.
  delete from public.cards_entities e
   where e.kind = 'group' and e.lock_reasons = '{}'::jsonb
     and not exists (select 1 from public.cards_catalog c where c.entity_id = e.id)
     and not exists (select 1 from public.cards_photos p where p.entity_id = e.id)
     and not exists (select 1 from public.cards_entities x where x.group_id = e.id);
end $c101r$;
