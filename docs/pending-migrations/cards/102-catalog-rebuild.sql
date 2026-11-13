-- 102-catalog-rebuild.sql (Bunnyverse Cards lot 2, 2026-11-12; integrator brief points 2 to 4)
--
-- What:   rebuilds cards_entities, cards_photos and cards_catalog from the 59 October photos, with two changes:
--         1. the age rule (priority): a subject is in only when every person in its photo is 18 or older today AND was on the photo date
--            (for a group, its lineup on that date), and every current member is an adult today. Checked on 2026-11-12 from Wikidata and
--            English Wikipedia (docs/design/cards/data/age-check.json, verdicts only): 39 subjects pass, 20 do not and get no card here.
--            At apply time the rule of decision 17 runs again on public.idols (every ACTIVE member with a known birth date 18 years back).
--         2. a group photo gives a PAIR of cards per edition: part 1 the left half and part 2 the right half of its 11:8.5 window, with
--            consecutive numbers (C 1/2, C 2/2, U 1/2, U 2/2, R 1/2, R 2/2, UR 1/2, UR 2/2). A person keeps one card per edition (part 0).
--         Adds to cards_catalog: part (0, 1, 2) and small_2x (per card: each half of a pair is checked for 2x on its own), and replaces the
--         unique key (entity_id, rarity) with (entity_id, rarity, part). Adds to cards_entities: end_year, the year a disbanded group
--         disbanded (owner decision 2026-11-12: loossemble 2024, miss-a 2017, purple-kiss 2025, sistar 2017), which the card prints; such a group needs no active member: its adult
--         check reads all its idols rows, former members included (099 writes them as active false).
-- How:    names, debut years, group lines and the adult check resolve AT APPLY TIME by slug from public.groups and public.idols, exactly as
--         101 did (decisions 2, 17, 18; review 1 finding 11). Numbers start again at BV1-0001: the subjects in, ordered by section name A to Z,
--         the people of a section before its group, 4 numbers a person (C, U, R, UR) and 8 a group (each edition 1/2 then 2/2).
--         The published files of a PERSON are kept (storage_path, file focal point, focal point): their card does not change. A group
--         keeps its focal point (the owner's choice now places the pair's window) and loses its files (they were whole cards): the site
--         shows the CSS crop of each half until the owner's script cuts the halves (publish-card-files.mjs --publish).
-- Why:    integrator brief 2026-11-12 (Cards, lot 2): no card of a person who is a minor today or was one on the photo date; the owner's idea
--         of the group photo in two cards.
-- Rows:   18 people x 4 + 21 groups x 8 = 240 cards at most (fewer when the apply-time check leaves a subject out),
--         the same subjects in cards_entities plus the group lines of the people, one photo a subject. The real counts are the notices.
-- Needs:  001 to 003, 101 applied before (this file replaces its rows); 099-idols-members.sql applied just before (the members of the
--         subjects that had none in public.idols).
-- Verify: select count(*) from public.cards_owned;   expect 0
-- Verify: select part, count(*) from public.cards_catalog group by part order by part;   expect part 0: 4 x the people in, parts 1 and 2: 4 x the groups in each (the notice "102-catalog-rebuild: N people and M groups in")
-- Verify: select min(card_no), max(card_no), count(*) from public.cards_catalog;   expect 1, N, N (contiguous)
-- Verify: select count(*) from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2 where a.part = 1 and b.card_no <> a.card_no + 1;   expect 0 (every pair has consecutive numbers)
-- Verify: select count(*) from public.cards_entities where id = any (array['group:akmu', 'group:billlie', 'group:cortis', 'group:fifty-fifty', 'group:fromis-9', 'group:hearts2hearts', 'group:illit', 'group:kara', 'group:kickflip', 'group:loona', 'group:nct', 'group:rescene', 'group:t-ara', 'group:team', 'group:the-boyz', 'group:triples', 'group:tuide', 'group:tws', 'group:xikers', 'group:young-posse']);   expect 0 (the subjects the age rule leaves out)
-- Verify: select s from unnest(array['bibi', 'chungha', 'heize', 'hwasa', 'hyuna', 'iu', 'jay-park', 'jennie', 'jeon-somi', 'jimin', 'jungkook', 'psy', 'rose', 'sunmi', 'taeyang', 'taeyeon', 'v-bts', 'zico', 'akmu', 'apink', 'artms', 'astro', 'billlie', 'btob', 'cortis', 'day6', 'dreamcatcher', 'fifty-fifty', 'fromis-9', 'hearts2hearts', 'ikon', 'illit', 'kara', 'katseye', 'kickflip', 'kiss-of-life', 'loona', 'loossemble', 'miss-a', 'monsta-x', 'nct', 'nct-wish', 'p1harmony', 'pentagon', 'purple-kiss', 'rescene', 'sistar', 'stayc', 't-ara', 'team', 'the-boyz', 'triples', 'tuide', 'tws', 'viviz', 'winner', 'xikers', 'young-posse', 'zerobaseone']) s where not exists (select 1 from public.cards_photos p where p.source_path = 'images/group-photos/' || s || '.jpg');   expect exactly the slugs of the "left out" notices
-- Refuses: while a player owns a card (cards_owned) or has opened a pack (cards_packs), or while a photo report is open (cards_reports):
--         the numbers change, so nothing is touched then. A photo the owner refused or removed stays out (reason photo_removed).
-- Undo:   102-catalog-rebuild.rollback.sql (empties the catalog and restores the columns and key of 001; refused while a player owns a card).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). A second run gives the same catalog.

do $c102$
declare
  v_subjects constant jsonb := $subjects$[
  {"slug":"bibi","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/BIBI_in_June_2025_(cropped).jpg","bucket":"images","path":"group-photos/bibi.jpg","width":853,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:BIBI_in_June_2025_(cropped).jpg","author":"David Lee","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"chungha","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Chungha_in_June_2025.png","bucket":"images","path":"group-photos/chungha.jpg","width":874,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Chungha_in_June_2025.png","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"heize","kind":"idol","small_2x":true,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Heize_2019_3.jpg","bucket":"images","path":"group-photos/heize.jpg","width":1200,"height":1009,"commons_page":"https://commons.wikimedia.org/wiki/File:Heize_2019_3.jpg","author":"NewsInstar","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"hwasa","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Hwasa_in_January_2026.png","bucket":"images","path":"group-photos/hwasa.jpg","width":846,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Hwasa_in_January_2026.png","author":"TV10","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"hyuna","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/20230720_Kim_HyunA_in_July_2023_07.jpg","bucket":"images","path":"group-photos/hyuna.jpg","width":865,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:20230720_Kim_HyunA_in_July_2023_07.jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"iu","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/250718_Lee_Ji-eun_(%EC%9D%B4%EC%A7%80%EC%9D%80).png","bucket":"images","path":"group-photos/iu.jpg","width":960,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:250718_Lee_Ji-eun_(%EC%9D%B4%EC%A7%80%EC%9D%80).png","author":"티비텐 TV10","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"jay-park","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Won_Spirits_CEO_Jay_Park_04.jpg","bucket":"images","path":"group-photos/jay-park.jpg","width":1200,"height":800,"commons_page":"https://commons.wikimedia.org/wiki/File:Won_Spirits_CEO_Jay_Park_04.jpg","author":"Republic of Korea","licence":"CC BY-SA 2.0","licence_url":"https://creativecommons.org/licenses/by-sa/2.0","share_alike":true},
  {"slug":"jennie","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Jennie_Kim_in_November_2023.jpg","bucket":"images","path":"group-photos/jennie.jpg","width":1063,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Jennie_Kim_in_November_2023.jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"jeon-somi","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/20230720_Jeon_Somi_(%EC%A0%84%EC%86%8C%EB%AF%B8).jpg","bucket":"images","path":"group-photos/jeon-somi.jpg","width":952,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:20230720_Jeon_Somi_(%EC%A0%84%EC%86%8C%EB%AF%B8).jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"jimin","kind":"idol","small_2x":true,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Jimin_x_Samsung_Galaxy_August_2021.png","bucket":"images","path":"group-photos/jimin.jpg","width":1126,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Jimin_x_Samsung_Galaxy_August_2021.png","author":"Samsung Saudi Arabia","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"jungkook","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Jung_Kook_of_BTS%2C_February_12%2C_2026_(1).png","bucket":"images","path":"group-photos/jungkook.jpg","width":834,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Jung_Kook_of_BTS,_February_12,_2026_(1).png","author":"K-POPIT 케이팝잇","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"psy","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/PSY(%EC%8B%B8%EC%9D%B4)_at_2015_Summer_K-POP_Festival.jpg","bucket":"images","path":"group-photos/psy.jpg","width":693,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:PSY(%EC%8B%B8%EC%9D%B4)_at_2015_Summer_K-POP_Festival.jpg","author":"Korea.net / Korean Culture and Information Service (Jeon Han)","licence":"CC BY-SA 2.0","licence_url":"https://creativecommons.org/licenses/by-sa/2.0","share_alike":true},
  {"slug":"rose","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Blackpink_Ros%C3%A9_Rimowa_1.jpg","bucket":"images","path":"group-photos/rose.jpg","width":858,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Blackpink_Ros%C3%A9_Rimowa_1.jpg","author":"TV10","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"sunmi","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Sunmi_2025_MISS_SIXTYxKNWLS_right.png","bucket":"images","path":"group-photos/sunmi.jpg","width":1200,"height":900,"commons_page":"https://commons.wikimedia.org/wiki/File:Sunmi_2025_MISS_SIXTYxKNWLS_right.png","author":"K-POPIT 케이팝잇","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"taeyang","kind":"idol","small_2x":true,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Taeyang_-_MADE_THE_MOVIE_Premiere_(cropped).jpg","bucket":"images","path":"group-photos/taeyang.jpg","width":857,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Taeyang_-_MADE_THE_MOVIE_Premiere_(cropped).jpg","author":"GOM, derivative work by Alexataylor07","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"taeyeon","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/250807_%ED%83%9C%EC%97%B0_'%EC%95%85%EB%A7%88%EA%B0%80_%EC%9D%B4%EC%82%AC%EC%99%94%EB%8B%A4'_VIP_Premiere_04_(cropped).jpg","bucket":"images","path":"group-photos/taeyeon.jpg","width":900,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:250807_%ED%83%9C%EC%97%B0_%27%EC%95%85%EB%A7%88%EA%B0%80_%EC%9D%B4%EC%82%AC%EC%99%94%EB%8B%A4%27_VIP_Premiere_04_(cropped).jpg","author":"sublimitas_spes","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"v-bts","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/V_at_W_Korea_Breast_Cancer_Campaign%2C_15_October_2025.png","bucket":"images","path":"group-photos/v-bts.jpg","width":923,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:V_at_W_Korea_Breast_Cancer_Campaign,_15_October_2025.png","author":"TV10","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"zico","kind":"idol","small_2x":false,"end_year":null,"small_2x_h1":null,"small_2x_h2":null,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Zico_2017_Monster_5_(cropped).jpg","bucket":"images","path":"group-photos/zico.jpg","width":748,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Zico_2017_Monster_5_(cropped).jpg","author":"Bonnielou2013","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"apink","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Apink_at_Korea_Sale_Festa_Opening_Ceremony%2C_30_September_2016.png","bucket":"images","path":"group-photos/apink.jpg","width":1200,"height":578,"commons_page":"https://commons.wikimedia.org/wiki/File:Apink_at_Korea_Sale_Festa_Opening_Ceremony,_30_September_2016.png","author":"Korea.net","licence":"CC BY-SA 2.0","licence_url":"https://creativecommons.org/licenses/by-sa/2.0","share_alike":true},
  {"slug":"artms","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/ARTMS_-_54462684746.jpg","bucket":"images","path":"group-photos/artms.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:ARTMS_-_54462684746.jpg","author":"David Lee","licence":"CC BY 2.0","licence_url":"https://creativecommons.org/licenses/by/2.0","share_alike":false},
  {"slug":"astro","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Astro_at_the_HallyuPopFest_London_2022_event.jpg","bucket":"images","path":"group-photos/astro.jpg","width":1200,"height":800,"commons_page":"https://commons.wikimedia.org/wiki/File:Astro_at_the_HallyuPopFest_London_2022_event.jpg","author":"Chanhyuk Lee","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"btob","kind":"group","small_2x":true,"end_year":null,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/BTOB_2015.09.06_%E9%A6%99%E6%B8%AFAPM%E5%95%86%E5%A0%B4%E6%B4%BB%E5%8B%95.jpg","bucket":"images","path":"group-photos/btob.jpg","width":1200,"height":659,"commons_page":"https://commons.wikimedia.org/wiki/File:BTOB_2015.09.06_%E9%A6%99%E6%B8%AFAPM%E5%95%86%E5%A0%B4%E6%B4%BB%E5%8B%95.jpg","author":"LucindaCSB","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"day6","kind":"group","small_2x":true,"end_year":null,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/DAY6_in_taiwan.jpg","bucket":"images","path":"group-photos/day6.jpg","width":1200,"height":462,"commons_page":"https://commons.wikimedia.org/wiki/File:DAY6_in_taiwan.jpg","author":"The original uploader was Shuohyun at Chinese Wikipedia.","licence":"CC BY-SA 3.0","licence_url":"https://creativecommons.org/licenses/by-sa/3.0","share_alike":true},
  {"slug":"dreamcatcher","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/190426_%EB%93%9C%EB%A6%BC%EC%BA%90%EC%B3%90_%EC%86%A1%EB%8F%84_%EB%B6%88%EA%BD%83%EC%B6%95%EC%A0%9C.jpg","bucket":"images","path":"group-photos/dreamcatcher.jpg","width":1200,"height":800,"commons_page":"https://commons.wikimedia.org/wiki/File:190426_%EB%93%9C%EB%A6%BC%EC%BA%90%EC%B3%90_%EC%86%A1%EB%8F%84_%EB%B6%88%EA%BD%83%EC%B6%95%EC%A0%9C.jpg","author":"Explicit","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"ikon","kind":"group","small_2x":true,"end_year":null,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/IKon_in_April_2023_(2).png","bucket":"images","path":"group-photos/ikon.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:IKon_in_April_2023_(2).png","author":"Doha News Official","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"katseye","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Katseye_in_Seattle.jpg","bucket":"images","path":"group-photos/katseye.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:Katseye_in_Seattle.jpg","author":"David Lee","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"kiss-of-life","kind":"group","small_2x":true,"end_year":null,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/KISS_OF_LIFE_at_Music_Bank_(4K)_20240705_01.png","bucket":"images","path":"group-photos/kiss-of-life.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:KISS_OF_LIFE_at_Music_Bank_(4K)_20240705_01.png","author":"TV10 (YouTube)","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"loossemble","kind":"group","small_2x":false,"end_year":2024,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Loossemble_at_Incheon_Airport_on_140923_(1).png","bucket":"images","path":"group-photos/loossemble.jpg","width":1200,"height":603,"commons_page":"https://commons.wikimedia.org/wiki/File:Loossemble_at_Incheon_Airport_on_140923_(1).png","author":"티비텐","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"miss-a","kind":"group","small_2x":false,"end_year":2017,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Miss_A_2013.jpg","bucket":"images","path":"group-photos/miss-a.jpg","width":1200,"height":765,"commons_page":"https://commons.wikimedia.org/wiki/File:Miss_A_2013.jpg","author":"the.angrycamel from Singapore, Singapore","licence":"CC BY 2.0","licence_url":"https://creativecommons.org/licenses/by/2.0","share_alike":false},
  {"slug":"monsta-x","kind":"group","small_2x":true,"end_year":null,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/MonstaX_in_Golden_Disc_Awards_2019.jpg","bucket":"images","path":"group-photos/monsta-x.jpg","width":1200,"height":866,"commons_page":"https://commons.wikimedia.org/wiki/File:MonstaX_in_Golden_Disc_Awards_2019.jpg","author":"Newsen [뉴스엔 김기태 기자]","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"nct-wish","kind":"group","small_2x":true,"end_year":null,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/2026_NCT_WISH_promotion_03_(cropped).jpg","bucket":"images","path":"group-photos/nct-wish.jpg","width":1200,"height":318,"commons_page":"https://commons.wikimedia.org/wiki/File:2026_NCT_WISH_promotion_03_(cropped).jpg","author":"numbuzin","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"p1harmony","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/P1Harmony_for_Marie_Claire_Korea_01_(cropped).jpg","bucket":"images","path":"group-photos/p1harmony.jpg","width":1200,"height":498,"commons_page":"https://commons.wikimedia.org/wiki/File:P1Harmony_for_Marie_Claire_Korea_01_(cropped).jpg","author":"Marie Claire Korea","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"pentagon","kind":"group","small_2x":true,"end_year":null,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Pentagon_190327.png","bucket":"images","path":"group-photos/pentagon.jpg","width":1200,"height":724,"commons_page":"https://commons.wikimedia.org/wiki/File:Pentagon_190327.png","author":"NewsInstar","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"purple-kiss","kind":"group","small_2x":false,"end_year":2025,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/PURPLE_KISS_211001.jpg","bucket":"images","path":"group-photos/purple-kiss.jpg","width":1200,"height":709,"commons_page":"https://commons.wikimedia.org/wiki/File:PURPLE_KISS_211001.jpg","author":"KNTV","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"sistar","kind":"group","small_2x":true,"end_year":2017,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/%EC%94%A8%EC%8A%A4%ED%83%80(SISTAR)_G%ED%8E%98%EC%8A%A4%ED%8B%B0%EB%B2%8C_%EC%95%84%EC%8B%9C%EC%95%84_%EB%93%9C%EB%A6%BC_%EC%BD%98%EC%84%9C%ED%8A%B8_(11).jpg","bucket":"images","path":"group-photos/sistar.jpg","width":1200,"height":1041,"commons_page":"https://commons.wikimedia.org/wiki/File:%EC%94%A8%EC%8A%A4%ED%83%80(SISTAR)_G%ED%8E%98%EC%8A%A4%ED%8B%B0%EB%B2%8C_%EC%95%84%EC%8B%9C%EC%95%84_%EB%93%9C%EB%A6%BC_%EC%BD%98%EC%84%9C%ED%8A%B8_(11).jpg","author":"SJ","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"stayc","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/STAYC_in_Seattle.jpg","bucket":"images","path":"group-photos/stayc.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:STAYC_in_Seattle.jpg","author":"David Lee","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"viviz","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/230315_VIVIZ_Seoul_Fashion_Week.jpg","bucket":"images","path":"group-photos/viviz.jpg","width":1200,"height":729,"commons_page":"https://commons.wikimedia.org/wiki/File:230315_VIVIZ_Seoul_Fashion_Week.jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"winner","kind":"group","small_2x":true,"end_year":null,"small_2x_h1":true,"small_2x_h2":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Winner_at_6th_Melon_Music_Awards_01.jpg","bucket":"images","path":"group-photos/winner.jpg","width":1200,"height":718,"commons_page":"https://commons.wikimedia.org/wiki/File:Winner_at_6th_Melon_Music_Awards_01.jpg","author":"Snowy Boy","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"zerobaseone","kind":"group","small_2x":false,"end_year":null,"small_2x_h1":false,"small_2x_h2":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/ZEROBASEONE_%40_40th_Golden_Disc_Awards_(20260110).jpg","bucket":"images","path":"group-photos/zerobaseone.jpg","width":1200,"height":663,"commons_page":"https://commons.wikimedia.org/wiki/File:ZEROBASEONE_@_40th_Golden_Disc_Awards_(20260110).jpg","author":"TV10","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false}
]$subjects$::jsonb;
  v_left_by_age constant jsonb := $left$[
  {"slug":"akmu","reason":"minor_at_photo"},
  {"slug":"billlie","reason":"minor_at_photo"},
  {"slug":"cortis","reason":"minor_today"},
  {"slug":"fifty-fifty","reason":"minor_at_photo"},
  {"slug":"fromis-9","reason":"minor_at_photo"},
  {"slug":"hearts2hearts","reason":"minor_today"},
  {"slug":"illit","reason":"minor_at_photo"},
  {"slug":"kara","reason":"minor_at_photo"},
  {"slug":"kickflip","reason":"unknown_lineup"},
  {"slug":"loona","reason":"minor_at_photo"},
  {"slug":"nct","reason":"minor_at_photo"},
  {"slug":"rescene","reason":"minor_today"},
  {"slug":"t-ara","reason":"minor_at_photo"},
  {"slug":"team","reason":"unknown_birth_date"},
  {"slug":"the-boyz","reason":"unknown_birth_date"},
  {"slug":"triples","reason":"minor_today"},
  {"slug":"tuide","reason":"minor_today"},
  {"slug":"tws","reason":"minor_at_photo"},
  {"slug":"xikers","reason":"unknown_lineup"},
  {"slug":"young-posse","reason":"minor_today"}
]$left$::jsonb;
  v_cutoff constant date := (current_date - interval '18 years')::date;
  v_debut_col text;
  v_debut_expr text;
  v_keep jsonb;
  v_gone text[];
  sj record;
  g record;
  i record;
  lg record;
  r record;
  e jsonb;
  v_slug text;
  v_kind text;
  v_ent text;
  v_reason text;
  v_n integer;
  v_known integer;
  v_adult integer;
  v_year integer;
  v_name text;
  v_section text;
  v_group_ent text;
  v_qid text;
  v_in jsonb := '[]'::jsonb;
  v_out jsonb := '[]'::jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_no integer := 0;
  v_photo bigint;
  v_kept_files integer := 0;
  v_closed integer;
  v_people integer;
  v_groups integer;
  v_max integer;
  v_count integer;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.cards_catalog') is null or to_regclass('public.cards_photos') is null or to_regclass('public.cards_entities') is null
     or to_regclass('public.cards_owned') is null or to_regclass('public.cards_packs') is null or to_regclass('public.cards_reports') is null then
    raise exception '102-catalog-rebuild: the cards tables are missing (run 001 to 003 first)';
  end if;
  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '102-catalog-rebuild: public.groups or public.idols is missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'source_path') then
    raise exception '102-catalog-rebuild: cards_photos has no source_path (001 without the photo columns of amendment 1)';
  end if;

  -- The guard (integrator brief point 4): the numbers change, so only while no player holds anything.
  if exists (select 1 from public.cards_owned) then
    raise exception '102-catalog-rebuild: a player owns a card (cards_owned is not empty), nothing changed';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '102-catalog-rebuild: a pack was opened (cards_packs is not empty), nothing changed';
  end if;
  if exists (select 1 from public.cards_reports where status = 'open') then
    raise exception '102-catalog-rebuild: a photo report is open (cards_reports), close it in the admin first, nothing changed';
  end if;
  select count(*) into v_closed from public.cards_reports where photo_id is not null;

  -- 1. The columns of the pairs (idempotent).
  alter table public.cards_catalog add column if not exists part smallint not null default 0;
  alter table public.cards_catalog add column if not exists small_2x boolean not null default false;
  alter table public.cards_entities add column if not exists end_year integer;
  if not exists (select 1 from pg_constraint where conname = 'cards_entities_end_year_check' and conrelid = 'public.cards_entities'::regclass) then
    alter table public.cards_entities add constraint cards_entities_end_year_check check (end_year is null or end_year between 1900 and 2100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cards_catalog_part_check' and conrelid = 'public.cards_catalog'::regclass) then
    alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);
  end if;
  alter table public.cards_catalog drop constraint if exists cards_catalog_entity_rarity_key;
  if not exists (select 1 from pg_constraint where conname = 'cards_catalog_entity_rarity_part_key' and conrelid = 'public.cards_catalog'::regclass) then
    alter table public.cards_catalog add constraint cards_catalog_entity_rarity_part_key unique (entity_id, rarity, part);
  end if;

  -- 2. What a person keeps (its card does not change) and every subject's focal point, by source photo.
  select coalesce(jsonb_object_agg(p.source_path, jsonb_build_object(
           'kind', en.kind, 'focal_x', p.focal_x, 'focal_y', p.focal_y,
           'storage_path', p.storage_path, 'file_focal_x', p.file_focal_x, 'file_focal_y', p.file_focal_y)), '{}'::jsonb)
    into v_keep
    from public.cards_photos p join public.cards_entities en on en.id = p.entity_id
   where p.status in ('auto', 'approved') and p.source_path like 'images/group-photos/%' and p.slot = 1;
  -- A photo the owner refused or removed (a report, the admin) stays out: the rebuild never brings it back.
  select coalesce(array_agg(distinct p.source_path), '{}') into v_gone
    from public.cards_photos p
   where p.status in ('rejected', 'removed') and p.source_path is not null
     and not exists (select 1 from public.cards_photos q where q.source_path = p.source_path and q.status in ('auto', 'approved'));

  -- 3. Empty the three tables (cards_owned and cards_packs are empty, checked above).
  delete from public.cards_catalog;
  delete from public.cards_photos;
  delete from public.cards_entities;

  -- The debut year of a group, from the database: a debut column when groups has one, else the year of inception_date (as 101).
  select column_name into v_debut_col from information_schema.columns
    where table_schema = 'public' and table_name = 'groups' and column_name in ('debut_year', 'debut_date')
    order by (column_name = 'debut_year') desc limit 1;
  v_debut_expr := case v_debut_col
    when 'debut_year' then 'debut_year::integer'
    when 'debut_date' then 'extract(year from debut_date)::integer'
    else 'extract(year from inception_date)::integer' end;

  -- 4. Resolve every subject that passed the age rule, exactly as 101: in (with its fields) or out (with the reason).
  for sj in select x.value as v from jsonb_array_elements(v_subjects) x loop
    v_slug := sj.v ->> 'slug';
    v_kind := sj.v ->> 'kind';
    v_ent := case when v_kind = 'group' then 'group:' else 'idol:' end || v_slug;
    v_reason := null;
    v_qid := null;
    g := null; i := null; lg := null;
    select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i from public.idols x where false;

    select gr.id, gr.name, gr.slug into g from public.groups gr where gr.slug = v_slug;
    if ((sj.v ->> 'bucket') || '/' || (sj.v ->> 'path')) = any (v_gone) then
      v_reason := 'photo_removed';
    elsif g.id is null then
      v_reason := 'no_groups_row';
    elsif v_kind = 'group' then
      -- A disbanded group has no active member: every row of the group is read (its former members); any other group, its active rows.
      select count(*), count(x.birth_date), count(*) filter (where x.birth_date <= v_cutoff)
        into v_n, v_known, v_adult from public.idols x
       where x.group_id = g.id and (x.active or (sj.v ->> 'end_year') is not null);
      if v_n = 0 then v_reason := case when (sj.v ->> 'end_year') is not null then 'no_member' else 'no_active_member' end;
      elsif v_known < v_n then v_reason := 'unknown_birth_date';
      elsif v_adult < v_n then v_reason := 'minor_member';
      end if;
    else
      select count(*) into v_n from public.idols x where x.group_id = g.id and x.active;
      if v_n = 0 then
        select count(*) into v_n from public.idols x where x.group_id <> g.id and x.active and lower(btrim(x.name)) = lower(btrim(g.name));
        if v_n = 1 then
          select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i
            from public.idols x where x.group_id <> g.id and x.active and lower(btrim(x.name)) = lower(btrim(g.name));
        end if;
      elsif v_n = 1 then
        select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i
          from public.idols x where x.group_id = g.id and x.active;
      end if;
      if v_n > 1 then v_reason := 'ambiguous';
      elsif i.id is null then v_reason := 'no_idol_row';
      elsif i.birth_date is null then v_reason := 'unknown_birth_date';
      elsif i.birth_date > v_cutoff then v_reason := 'minor';
      end if;
    end if;

    if v_reason is not null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('slug', v_slug, 'reason', v_reason));
      continue;
    end if;

    v_group_ent := null;
    if v_kind = 'group' then
      v_name := g.name;
      v_section := g.name;
      execute format('select %s from public.groups where id = $1', v_debut_expr) into v_year using g.id;
    else
      v_name := coalesce(nullif(btrim(i.name), ''), g.name);
      v_qid := nullif(btrim(i.wikidata_qid), '');
      if i.group_id <> g.id then
        select gr.id, gr.name, gr.slug into lg from public.groups gr where gr.id = i.group_id;
        v_section := lg.name;
        v_group_ent := 'group:' || lg.slug;
        execute format('select %s from public.groups where id = $1', v_debut_expr) into v_year using lg.id;
        v_lines := v_lines || jsonb_build_array(jsonb_build_object('id', v_group_ent, 'name', lg.name, 'debut_year', v_year));
      else
        v_section := v_name;
        execute format('select %s from public.groups where id = $1', v_debut_expr) into v_year using g.id;
      end if;
    end if;

    v_in := v_in || jsonb_build_array(sj.v || jsonb_build_object(
      'entity', v_ent, 'name', v_name, 'section', v_section, 'group_entity', v_group_ent, 'debut_year', v_year, 'qid', v_qid,
      'idol_id', case when v_kind = 'group' then null else i.id end));
  end loop;

  -- 5. Order (decision 2): section A to Z, the people of a section before its group, then the name and the slug.
  select coalesce(jsonb_agg(x.y order by x.pos), '[]'::jsonb) into v_in
    from (select y, row_number() over (
            order by lower(y ->> 'section') collate "C", (y ->> 'kind' = 'group'), lower(y ->> 'name') collate "C", y ->> 'slug') as pos
          from jsonb_array_elements(v_in) y) x;

  -- 6. Entities: the group cards, the group lines of the people (no cards of their own), then the people.
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active, end_year)
  select x ->> 'entity', 'group', x ->> 'name', null, nullif(x ->> 'debut_year', '')::integer, null,
         lower(x ->> 'section') || '|1|' || lower(x ->> 'name'), '{"SR":"one","L":"one"}'::jsonb, true, nullif(x ->> 'end_year', '')::integer
    from jsonb_array_elements(v_in) x where x ->> 'kind' = 'group';
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select distinct on (l ->> 'id') l ->> 'id', 'group', l ->> 'name', null, nullif(l ->> 'debut_year', '')::integer, null,
         lower(l ->> 'name') || '|1|' || lower(l ->> 'name'), '{}'::jsonb, true
    from jsonb_array_elements(v_lines) l
  on conflict (id) do nothing;
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select x ->> 'entity', 'idol', x ->> 'name', x ->> 'group_entity', nullif(x ->> 'debut_year', '')::integer, x ->> 'qid',
         lower(x ->> 'section') || '|0|' || lower(x ->> 'name'), '{"SR":"one","L":"one"}'::jsonb, true
    from jsonb_array_elements(v_in) x where x ->> 'kind' = 'idol';

  -- 7. One approved photo a subject, then its cards, numbered in order.
  for e in select x.value from jsonb_array_elements(v_in) x loop
    insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at,
                                     focal_x, focal_y, source_path, source_width, source_height, small_2x, storage_path, file_focal_x,
                                     file_focal_y, status, review_note)
    values (e ->> 'entity', 1, 'commons', e ->> 'commons_page', e ->> 'url', e ->> 'author', e ->> 'licence', e ->> 'licence_url',
            (e ->> 'share_alike')::boolean, date '2026-10-06',
            coalesce((v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'focal_x')::integer, 50),
            coalesce((v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'focal_y')::integer, case when e ->> 'kind' = 'group' then 50 else 30 end),
            (e ->> 'bucket') || '/' || (e ->> 'path'), (e ->> 'width')::integer, (e ->> 'height')::integer,
            case when e ->> 'kind' = 'group' then (e ->> 'small_2x_h1')::boolean or (e ->> 'small_2x_h2')::boolean else (e ->> 'small_2x')::boolean end,
            -- a person keeps its published files (same card); a group's files were whole cards, so it has none until the halves are cut
            case when e ->> 'kind' = 'idol' then v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'storage_path' end,
            case when e ->> 'kind' = 'idol' then (v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'file_focal_x')::integer end,
            case when e ->> 'kind' = 'idol' then (v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'file_focal_y')::integer end,
            'approved', 'Commons photo of the October 2026 run, checked by eye (amendment 1); age rule of lot 2 passed.')
    returning id into v_photo;
    if e ->> 'kind' = 'idol' and (v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'storage_path') is not null then
      v_kept_files := v_kept_files + 1;
    end if;

    if e ->> 'kind' = 'group' then
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
      select v_no + k.n, 'BV1-' || lpad((v_no + k.n)::text, 4, '0'), e ->> 'entity', k.rarity, k.edition, v_photo, true, k.part,
             case when k.part = 1 then (e ->> 'small_2x_h1')::boolean else (e ->> 'small_2x_h2')::boolean end
        from (values (1, 'C', 'std', 1), (2, 'C', 'std', 2), (3, 'U', 'stage', 1), (4, 'U', 'stage', 2),
                     (5, 'R', 'holo', 1), (6, 'R', 'holo', 2), (7, 'UR', 'gold', 1), (8, 'UR', 'gold', 2)) as k(n, rarity, edition, part);
      v_no := v_no + 8;
    else
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
      select v_no + k.n, 'BV1-' || lpad((v_no + k.n)::text, 4, '0'), e ->> 'entity', k.rarity, k.edition, v_photo, true, 0,
             (e ->> 'small_2x')::boolean
        from (values (1, 'C', 'std'), (2, 'U', 'stage'), (3, 'R', 'holo'), (4, 'UR', 'gold')) as k(n, rarity, edition);
      v_no := v_no + 4;
    end if;
  end loop;

  -- 8. Checks, then the Verify output.
  select count(*) filter (where x.value ->> 'kind' = 'idol'), count(*) filter (where x.value ->> 'kind' = 'group')
    into v_people, v_groups from jsonb_array_elements(v_in) x;
  select coalesce(max(card_no), 0), count(*) into v_max, v_count from public.cards_catalog;
  if v_max <> v_count or v_count <> 4 * v_people + 8 * v_groups then
    raise exception '102-catalog-rebuild: the numbers are not contiguous (highest %, % cards, expected %)', v_max, v_count, 4 * v_people + 8 * v_groups;
  end if;
  if exists (select 1 from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2
             where a.part = 1 and b.card_no <> a.card_no + 1) then
    raise exception '102-catalog-rebuild: a pair does not have consecutive numbers';
  end if;
  raise notice '102-catalog-rebuild: % people and % groups in, % cards, highest number BV1-%', v_people, v_groups, v_count, lpad(v_max::text, 4, '0');
  for r in select c.part, count(*) as n from public.cards_catalog c group by c.part order by c.part loop
    raise notice '102-catalog-rebuild: % cards of part % (0 a whole card, 1 a left half, 2 a right half)', r.n, r.part;
  end loop;
  raise notice '102-catalog-rebuild: % people kept their published files; the groups need their halves cut (publish-card-files.mjs)', v_kept_files;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'end_year' as y from jsonb_array_elements(v_in) x where x.value ->> 'end_year' is not null order by 1 loop
    raise notice '102-catalog-rebuild: % is in as a disbanded group (%)', r.slug, r.y;
  end loop;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'reason' as reason from jsonb_array_elements(v_left_by_age) x loop
    raise notice '102-catalog-rebuild: left out % (age rule: %)', r.slug, r.reason;
  end loop;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'reason' as reason from jsonb_array_elements(v_out) x loop
    raise notice '102-catalog-rebuild: left out % (%)', r.slug, r.reason;
  end loop;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'idol_id' as idol from jsonb_array_elements(v_in) x where x.value ->> 'kind' = 'idol' order by x.value ->> 'slug' loop
    raise notice '102-catalog-rebuild: person % is idols.id %', r.slug, r.idol;
  end loop;
  if v_closed > 0 then
    raise notice '102-catalog-rebuild: % closed photo reports lost their photo link (the photo rows were rebuilt)', v_closed;
  end if;
end $c102$;
