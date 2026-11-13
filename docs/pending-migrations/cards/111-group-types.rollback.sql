-- 111-group-types.rollback.sql (KpopCards lots 3 + 4 + 5): undo of 111-group-types.sql.
--
-- What:   deletes the 41 rows 111 wrote from cards_group_types (by their entity ids). Rows added by hand since are kept.
-- Why:    without them the packs Girl groups and Boy groups are empty and refused; switch the themes off or restore the file.
-- Rows:   up to 41 rows deleted.
-- Verify: select count(*) from public.cards_group_types;   expect 0 (or the rows added by hand)
-- Undo:   run 111-group-types.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c111r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_group_types') is not null then
    delete from public.cards_group_types where entity_id in (
      'group:akmu',
      'group:apink',
      'group:artms',
      'group:astro',
      'group:billlie',
      'group:btob',
      'group:cortis',
      'group:dreamcatcher',
      'group:fifty-fifty',
      'group:fromis-9',
      'group:hearts2hearts',
      'group:ikon',
      'group:illit',
      'group:kara',
      'group:katseye',
      'group:kickflip',
      'group:kiss-of-life',
      'group:loona',
      'group:loossemble',
      'group:miss-a',
      'group:monsta-x',
      'group:nct',
      'group:nct-wish',
      'group:p1harmony',
      'group:pentagon',
      'group:purple-kiss',
      'group:rescene',
      'group:sistar',
      'group:stayc',
      'group:t-ara',
      'group:the-boyz',
      'group:triples',
      'group:tuide',
      'group:tws',
      'group:viviz',
      'group:winner',
      'group:xikers',
      'group:young-posse',
      'group:zerobaseone',
      'group:blackpink',
      'group:bts');
  end if;
end $c111r$;
