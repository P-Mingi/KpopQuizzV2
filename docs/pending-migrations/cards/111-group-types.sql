-- 111-group-types.sql (KpopCards lots 3 + 4 + 5, 2026-11-13; the type of each group, for the packs Girl groups and Boy groups)
--
-- What:   fills cards_group_types (created by 110) with the type of 41 groups: 24 girl groups, 16 boy groups, 1 mixed (a brother-sister duo), in ONE
--         DO block. A row is written only for a group that exists in cards_entities; the others are skipped silently.
-- Why:    the themed packs need to know whether a group is a girl group or a boy group, and no table of the cards or of the quiz site holds it
--         (groups has no gender; songs.gender is per song, not per group). Rather than invent it, each type below is a value that TWO
--         independent public sources gave, fetched on 2026-11-13: source_a is the English Wikipedia short description of the group's article, source_b is
--         either the Wikidata item's "instance of" (Q641066 girl group, Q216337 boy band) or the short description of the group's article in another
--         language Wikipedia (Korean, mostly). A group whose two sources do not both name a type is NOT in the file, so it belongs only to
--         "All idols", the pack of the day and the focus pack: day6 (English description: "rock band", no type) and team (the English article found
--         was another group; no type). They can be added when two sources agree.
-- Rows:   41 rows inserted or refreshed (checked_on 2026-11-13). Idempotent: a second run changes nothing.
-- Needs:  110 (cards_group_types) and the group entities of 101/103.
-- Verify: select gender, count(*) from public.cards_group_types group by gender order by gender;   expect boy 16, girl 24, mixed 1 (fewer when a group is not in the catalog yet)
-- Verify: select count(*) from public.cards_group_types t where not exists (select 1 from public.cards_entities e where e.id = t.entity_id and e.kind = 'group');   expect 0
-- Verify: select count(*) from public.cards_group_types where length(source_a) = 0 or length(source_b) = 0 or source_a = source_b;   expect 0
-- Undo:   111-group-types.rollback.sql (deletes these rows)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor).

do $c111$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_group_types') is null then
    raise exception '111-group-types: run 110-core.sql first';
  end if;

  insert into public.cards_group_types (entity_id, gender, source_a, source_b, checked_on)
  select e.id, v.gender, v.source_a, v.source_b, date '2026-11-13'
    from (values
      ('group:akmu', 'mixed', 'en.wikipedia.org short description "South Korean sibling duo" (AKMU)', 'ko.wikipedia.org short description "대한민국의 남매 음악 듀오"'),
      ('group:apink', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Apink)', 'Wikidata item Q483286, instance of Q641066 (girl group)'),
      ('group:artms', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Artms)', 'Wikidata item Q119692734, instance of Q641066 (girl group)'),
      ('group:astro', 'boy', 'en.wikipedia.org short description "South Korean boy band" (Astro (South Korean band))', 'Wikidata item Q23004252, instance of Q216337 (boy band)'),
      ('group:billlie', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Billlie)', 'Wikidata item Q108888399, instance of Q641066 (girl group)'),
      ('group:btob', 'boy', 'en.wikipedia.org short description "South Korean boy band" (BtoB (band))', 'ko.wikipedia.org short description "대한민국의 6인조 보이 그룹"'),
      ('group:cortis', 'boy', 'en.wikipedia.org short description "South Korean boy band" (Cortis)', 'Wikidata item Q135668928, instance of Q216337 (boy band)'),
      ('group:dreamcatcher', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Dreamcatcher (group))', 'ko.wikipedia.org short description "대한민국의 7인조 걸 그룹"'),
      ('group:fifty-fifty', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Fifty Fifty (group))', 'Wikidata item Q116731010, instance of Q641066 (girl group)'),
      ('group:fromis-9', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Fromis 9)', 'Wikidata item Q41398331, instance of Q641066 (girl group)'),
      ('group:hearts2hearts', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Hearts2Hearts)', 'Wikidata item Q131746784, instance of Q641066 (girl group)'),
      ('group:ikon', 'boy', 'en.wikipedia.org short description "South Korean boy band" (IKon)', 'ko.wikipedia.org short description "대한민국의 6인조 보이 그룹"'),
      ('group:illit', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Illit)', 'Wikidata item Q122179261, instance of Q641066 (girl group)'),
      ('group:kara', 'girl', 'en.wikipedia.org short description "South Korean K-pop girl group" (Kara (South Korean group))', 'ko.wikipedia.org short description "대한민국의 5인조 걸 그룹"'),
      ('group:katseye', 'girl', 'en.wikipedia.org short description "Los Angeles-based girl group" (Katseye)', 'Wikidata item Q123480242, instance of Q641066 (girl group)'),
      ('group:kickflip', 'boy', 'en.wikipedia.org short description "South Korean boy band" (KickFlip)', 'Wikidata item Q131722593, instance of Q216337 (boy band)'),
      ('group:kiss-of-life', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Kiss of Life (group))', 'Wikidata item Q118314702, instance of Q641066 (girl group)'),
      ('group:loona', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Loona)', 'Wikidata item Q28025953, instance of Q641066 (girl group)'),
      ('group:loossemble', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Loossemble)', 'Wikidata item Q121975741, instance of Q641066 (girl group)'),
      ('group:miss-a', 'girl', 'en.wikipedia.org short description "Chinese-Korean girl group" (Miss A)', 'Wikidata item Q284740, instance of Q641066 (girl group)'),
      ('group:monsta-x', 'boy', 'en.wikipedia.org short description "South Korean boy group" (Monsta X)', 'ko.wikipedia.org short description "대한민국의 6인조 보이 그룹"'),
      ('group:nct', 'boy', 'en.wikipedia.org short description "South Korean boy band" (NCT (group))', 'Wikidata item Q23725822, instance of Q216337 (boy band)'),
      ('group:nct-wish', 'boy', 'en.wikipedia.org short description "Japanese-Korean boy band" (NCT Wish)', 'ko.wikipedia.org short description "일본과 대한민국의 6인조 보이 그룹"'),
      ('group:p1harmony', 'boy', 'en.wikipedia.org short description "South Korean boy band" (P1Harmony)', 'ko.wikipedia.org short description "대한민국의 6인조 보이 그룹"'),
      ('group:pentagon', 'boy', 'en.wikipedia.org short description "South Korean boy group" (Pentagon (South Korean band))', 'Wikidata item Q23936742, instance of Q216337 (boy band)'),
      ('group:purple-kiss', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Purple Kiss)', 'Wikidata item Q97780109, instance of Q641066 (girl group)'),
      ('group:rescene', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Rescene)', 'Wikidata item Q124856415, instance of Q641066 (girl group)'),
      ('group:sistar', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Sistar)', 'Wikidata item Q223048, instance of Q641066 (girl group)'),
      ('group:stayc', 'girl', 'en.wikipedia.org short description "South Korean girl group" (STAYC)', 'Wikidata item Q101541493, instance of Q641066 (girl group)'),
      ('group:t-ara', 'girl', 'en.wikipedia.org short description "South Korean girl group" (T-ara)', 'Wikidata item Q495383, instance of Q641066 (girl group)'),
      ('group:the-boyz', 'boy', 'en.wikipedia.org short description "South Korean boy group" (The Boyz (South Korean band))', 'Wikidata item Q41949104, instance of Q216337 (boy band)'),
      ('group:triples', 'girl', 'en.wikipedia.org short description "South Korean girl group" (TripleS)', 'Wikidata item Q115099831, instance of Q641066 (girl group)'),
      ('group:tuide', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Tuide)', 'ko.wikipedia.org short description "대한민국의 7인조 걸 그룹"'),
      ('group:tws', 'boy', 'en.wikipedia.org short description "South Korean boy band" (TWS (group))', 'Wikidata item Q124091148, instance of Q216337 (boy band)'),
      ('group:viviz', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Viviz)', 'Wikidata item Q108853211, instance of Q641066 (girl group)'),
      ('group:winner', 'boy', 'en.wikipedia.org short description "South Korean boy band" (Winner (band))', 'Wikidata item Q15116397, instance of Q216337 (boy band)'),
      ('group:xikers', 'boy', 'en.wikipedia.org short description "South Korean boy band" (Xikers)', 'ko.wikipedia.org short description "대한민국의 10인조 보이 그룹"'),
      ('group:young-posse', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Young Posse)', 'ko.wikipedia.org short description "대한민국의 5인조 걸 그룹"'),
      ('group:zerobaseone', 'boy', 'en.wikipedia.org short description "South Korean boy band" (Zerobaseone)', 'Wikidata item Q117808633, instance of Q216337 (boy band)'),
      ('group:blackpink', 'girl', 'en.wikipedia.org short description "South Korean girl group" (Blackpink)', 'Wikidata item Q25056945, instance of Q641066 (girl group)'),
      ('group:bts', 'boy', 'en.wikipedia.org short description "South Korean boy band" (BTS)', 'Wikidata item Q13580495, instance of Q216337 (boy band)')
    ) as v(id, gender, source_a, source_b)
    join public.cards_entities e on e.id = v.id and e.kind = 'group'
  on conflict (entity_id) do update set gender = excluded.gender, source_a = excluded.source_a, source_b = excluded.source_b, checked_on = excluded.checked_on;
end $c111$;
