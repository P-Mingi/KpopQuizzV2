-- 101-catalog.sql (Bunnyverse Cards, lane DATA, 2026-11-12; the catalog of the 59 October photos)
--
-- What:   fills the card catalog from the 59 free Wikimedia Commons photos of docs/design/growth-v12/run/group-photos.json (41 groups,
--         18 soloists or members; owner decision CARDS-AMEND-1, 2026-11-12). One photo per subject, so 4 cards per subject: Standard (C),
--         Stage (U), Holo (R), Gold (UR). Era (SR) and Full Art (L) are locked pockets, lock reason "one" ("Only one free photo of this idol
--         exists so far."). Writes cards_entities, cards_photos (status approved: checked by eye in October), cards_catalog (in_packs true).
-- How:    names, debut years and ages are resolved AT APPLY TIME, by slug, from public.groups and public.idols:
--         - a group: its groups row (official name); the debut year from the database (a debut_year or debut_date column of groups if
--           it has one, else the year of inception_date). IN only when ALL its active idols rows have a known birth date at least 18 years
--           before today (current_date - interval '18 years'); no active member, an unknown date or a minor means OUT (decision 17).
--         - a soloist or member: the idols row = the one active row of the person's own group, else the one active idol of another group
--           whose name equals the group's name; two or more candidates on that path leave it OUT as ambiguous (review 1 finding 11). IN
--           only when its birth_date is known and at least 18 years back.
--           Its group line is that other group when it is one (its entity is created without cards when it is not a subject), else none
--           ("Soloist", decision 18); the debut year is the group line's.
--         - numbering (decision 2): the included subjects are ordered by section name A to Z (a person's section is its group line, a
--           soloist's its own name); inside a section the people, then the group card; each subject takes 4 consecutive numbers in the
--           order C, U, R, UR, BV1-0001 onward (after the highest number already there, so a second run adds nothing).
--         - focal point: 50/30 for a person, 50/50 for a group; small_2x true when the widest 5.5:8.5 crop of the Commons original is under
--           640 px (24 of 59).
--         Entity ids are 'idol:<slug>' and 'group:<slug>' (the Wikidata id, when the idols row has one, goes to qid).
-- Why:    amendment 1: the photos of the October run are the only photos of the game. docs/design/cards/CARDS-PLAN-v3.md for the rest.
-- Rows:   at most 236 cards (59 subjects x 4), the same number of entities and 59 photos at most, plus the group-line entities of
--         the soloists. The real counts are the Verify output below (Messages tab): subjects in, cards per edition, the highest number, and
--         every left-out slug with its reason (no_groups_row, no_active_member, no_idol_row, ambiguous, unknown_birth_date, minor_member,
--         minor), and for every person of the run the idols row it is bound to ("person <slug> is idols.id <id>").
-- Needs:  001 to 003 (with the photo columns of amendment 1) and the tables public.groups and public.idols.
-- Verify: select count(*) from public.cards_catalog;   expect 4 x the subjects in (the notice "101-catalog: N subjects in")
-- Verify: select rarity, count(*) from public.cards_catalog group by rarity order by rarity;   expect C, R, U, UR with the same count each
-- Verify: select min(card_no), max(card_no), count(*) from public.cards_catalog;   expect 1, 4N, 4N (contiguous)
-- Verify: select s from unnest(array['bibi', 'chungha', 'heize', 'hwasa', 'hyuna', 'iu', 'jay-park', 'jennie', 'jeon-somi', 'jimin', 'jungkook', 'psy', 'rose', 'sunmi', 'taeyang', 'taeyeon', 'v-bts', 'zico', 'akmu', 'apink', 'artms', 'astro', 'billlie', 'btob', 'cortis', 'day6', 'dreamcatcher', 'fifty-fifty', 'fromis-9', 'hearts2hearts', 'ikon', 'illit', 'kara', 'katseye', 'kickflip', 'kiss-of-life', 'loona', 'loossemble', 'miss-a', 'monsta-x', 'nct', 'nct-wish', 'p1harmony', 'pentagon', 'purple-kiss', 'rescene', 'sistar', 'stayc', 't-ara', 'team', 'the-boyz', 'triples', 'tuide', 'tws', 'viviz', 'winner', 'xikers', 'young-posse', 'zerobaseone']) s where not exists (select 1 from public.cards_photos p where p.source_path = 'images/group-photos/' || s || '.jpg');   expect exactly the slugs of the "left out" notices
-- Refuses: while cards_entities, cards_catalog or cards_photos holds a row that is not one of these subjects (review 1 finding 2).
-- Undo:   101-catalog.rollback.sql (refused while a player owns a card or opened a pack).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c101$
declare
  v_subjects constant jsonb := $subjects$[
  {"slug":"bibi","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/BIBI_in_June_2025_(cropped).jpg","bucket":"images","path":"group-photos/bibi.jpg","width":853,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:BIBI_in_June_2025_(cropped).jpg","author":"David Lee","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"chungha","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Chungha_in_June_2025.png","bucket":"images","path":"group-photos/chungha.jpg","width":874,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Chungha_in_June_2025.png","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"heize","kind":"idol","focal_x":50,"focal_y":30,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Heize_2019_3.jpg","bucket":"images","path":"group-photos/heize.jpg","width":1200,"height":1009,"commons_page":"https://commons.wikimedia.org/wiki/File:Heize_2019_3.jpg","author":"NewsInstar","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"hwasa","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Hwasa_in_January_2026.png","bucket":"images","path":"group-photos/hwasa.jpg","width":846,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Hwasa_in_January_2026.png","author":"TV10","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"hyuna","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/20230720_Kim_HyunA_in_July_2023_07.jpg","bucket":"images","path":"group-photos/hyuna.jpg","width":865,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:20230720_Kim_HyunA_in_July_2023_07.jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"iu","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/250718_Lee_Ji-eun_(%EC%9D%B4%EC%A7%80%EC%9D%80).png","bucket":"images","path":"group-photos/iu.jpg","width":960,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:250718_Lee_Ji-eun_(%EC%9D%B4%EC%A7%80%EC%9D%80).png","author":"티비텐 TV10","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"jay-park","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Won_Spirits_CEO_Jay_Park_04.jpg","bucket":"images","path":"group-photos/jay-park.jpg","width":1200,"height":800,"commons_page":"https://commons.wikimedia.org/wiki/File:Won_Spirits_CEO_Jay_Park_04.jpg","author":"Republic of Korea","licence":"CC BY-SA 2.0","licence_url":"https://creativecommons.org/licenses/by-sa/2.0","share_alike":true},
  {"slug":"jennie","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Jennie_Kim_in_November_2023.jpg","bucket":"images","path":"group-photos/jennie.jpg","width":1063,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Jennie_Kim_in_November_2023.jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"jeon-somi","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/20230720_Jeon_Somi_(%EC%A0%84%EC%86%8C%EB%AF%B8).jpg","bucket":"images","path":"group-photos/jeon-somi.jpg","width":952,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:20230720_Jeon_Somi_(%EC%A0%84%EC%86%8C%EB%AF%B8).jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"jimin","kind":"idol","focal_x":50,"focal_y":30,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Jimin_x_Samsung_Galaxy_August_2021.png","bucket":"images","path":"group-photos/jimin.jpg","width":1126,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Jimin_x_Samsung_Galaxy_August_2021.png","author":"Samsung Saudi Arabia","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"jungkook","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Jung_Kook_of_BTS%2C_February_12%2C_2026_(1).png","bucket":"images","path":"group-photos/jungkook.jpg","width":834,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Jung_Kook_of_BTS,_February_12,_2026_(1).png","author":"K-POPIT 케이팝잇","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"psy","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/PSY(%EC%8B%B8%EC%9D%B4)_at_2015_Summer_K-POP_Festival.jpg","bucket":"images","path":"group-photos/psy.jpg","width":693,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:PSY(%EC%8B%B8%EC%9D%B4)_at_2015_Summer_K-POP_Festival.jpg","author":"Korea.net / Korean Culture and Information Service (Jeon Han)","licence":"CC BY-SA 2.0","licence_url":"https://creativecommons.org/licenses/by-sa/2.0","share_alike":true},
  {"slug":"rose","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Blackpink_Ros%C3%A9_Rimowa_1.jpg","bucket":"images","path":"group-photos/rose.jpg","width":858,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Blackpink_Ros%C3%A9_Rimowa_1.jpg","author":"TV10","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"sunmi","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Sunmi_2025_MISS_SIXTYxKNWLS_right.png","bucket":"images","path":"group-photos/sunmi.jpg","width":1200,"height":900,"commons_page":"https://commons.wikimedia.org/wiki/File:Sunmi_2025_MISS_SIXTYxKNWLS_right.png","author":"K-POPIT 케이팝잇","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"taeyang","kind":"idol","focal_x":50,"focal_y":30,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Taeyang_-_MADE_THE_MOVIE_Premiere_(cropped).jpg","bucket":"images","path":"group-photos/taeyang.jpg","width":857,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Taeyang_-_MADE_THE_MOVIE_Premiere_(cropped).jpg","author":"GOM, derivative work by Alexataylor07","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"taeyeon","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/250807_%ED%83%9C%EC%97%B0_'%EC%95%85%EB%A7%88%EA%B0%80_%EC%9D%B4%EC%82%AC%EC%99%94%EB%8B%A4'_VIP_Premiere_04_(cropped).jpg","bucket":"images","path":"group-photos/taeyeon.jpg","width":900,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:250807_%ED%83%9C%EC%97%B0_%27%EC%95%85%EB%A7%88%EA%B0%80_%EC%9D%B4%EC%82%AC%EC%99%94%EB%8B%A4%27_VIP_Premiere_04_(cropped).jpg","author":"sublimitas_spes","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"v-bts","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/V_at_W_Korea_Breast_Cancer_Campaign%2C_15_October_2025.png","bucket":"images","path":"group-photos/v-bts.jpg","width":923,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:V_at_W_Korea_Breast_Cancer_Campaign,_15_October_2025.png","author":"TV10","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"zico","kind":"idol","focal_x":50,"focal_y":30,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Zico_2017_Monster_5_(cropped).jpg","bucket":"images","path":"group-photos/zico.jpg","width":748,"height":1200,"commons_page":"https://commons.wikimedia.org/wiki/File:Zico_2017_Monster_5_(cropped).jpg","author":"Bonnielou2013","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"akmu","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/KOCIS_Korea_President_Park_Culture_Day_Movie_03(1).jpg","bucket":"images","path":"group-photos/akmu.jpg","width":1200,"height":1007,"commons_page":"https://commons.wikimedia.org/wiki/File:KOCIS_Korea_President_Park_Culture_Day_Movie_03(1).jpg","author":"Korea.net / Korean Culture and Information Service (Jeon Han)","licence":"CC BY-SA 2.0","licence_url":"https://creativecommons.org/licenses/by-sa/2.0","share_alike":true},
  {"slug":"apink","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Apink_at_Korea_Sale_Festa_Opening_Ceremony%2C_30_September_2016.png","bucket":"images","path":"group-photos/apink.jpg","width":1200,"height":578,"commons_page":"https://commons.wikimedia.org/wiki/File:Apink_at_Korea_Sale_Festa_Opening_Ceremony,_30_September_2016.png","author":"Korea.net","licence":"CC BY-SA 2.0","licence_url":"https://creativecommons.org/licenses/by-sa/2.0","share_alike":true},
  {"slug":"artms","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/ARTMS_-_54462684746.jpg","bucket":"images","path":"group-photos/artms.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:ARTMS_-_54462684746.jpg","author":"David Lee","licence":"CC BY 2.0","licence_url":"https://creativecommons.org/licenses/by/2.0","share_alike":false},
  {"slug":"astro","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Astro_at_the_HallyuPopFest_London_2022_event.jpg","bucket":"images","path":"group-photos/astro.jpg","width":1200,"height":800,"commons_page":"https://commons.wikimedia.org/wiki/File:Astro_at_the_HallyuPopFest_London_2022_event.jpg","author":"Chanhyuk Lee","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"billlie","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Billlie_on_March_8%2C_2022.jpg","bucket":"images","path":"group-photos/billlie.jpg","width":1200,"height":471,"commons_page":"https://commons.wikimedia.org/wiki/File:Billlie_on_March_8,_2022.jpg","author":"Studio FLO 스튜디오 플로","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"btob","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/BTOB_2015.09.06_%E9%A6%99%E6%B8%AFAPM%E5%95%86%E5%A0%B4%E6%B4%BB%E5%8B%95.jpg","bucket":"images","path":"group-photos/btob.jpg","width":1200,"height":659,"commons_page":"https://commons.wikimedia.org/wiki/File:BTOB_2015.09.06_%E9%A6%99%E6%B8%AFAPM%E5%95%86%E5%A0%B4%E6%B4%BB%E5%8B%95.jpg","author":"LucindaCSB","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"cortis","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/CORTIS_Dior_PhotoCall_1.jpg","bucket":"images","path":"group-photos/cortis.jpg","width":1200,"height":683,"commons_page":"https://commons.wikimedia.org/wiki/File:CORTIS_Dior_PhotoCall_1.jpg","author":"TV10","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"day6","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/DAY6_in_taiwan.jpg","bucket":"images","path":"group-photos/day6.jpg","width":1200,"height":462,"commons_page":"https://commons.wikimedia.org/wiki/File:DAY6_in_taiwan.jpg","author":"The original uploader was Shuohyun at Chinese Wikipedia.","licence":"CC BY-SA 3.0","licence_url":"https://creativecommons.org/licenses/by-sa/3.0","share_alike":true},
  {"slug":"dreamcatcher","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/190426_%EB%93%9C%EB%A6%BC%EC%BA%90%EC%B3%90_%EC%86%A1%EB%8F%84_%EB%B6%88%EA%BD%83%EC%B6%95%EC%A0%9C.jpg","bucket":"images","path":"group-photos/dreamcatcher.jpg","width":1200,"height":800,"commons_page":"https://commons.wikimedia.org/wiki/File:190426_%EB%93%9C%EB%A6%BC%EC%BA%90%EC%B3%90_%EC%86%A1%EB%8F%84_%EB%B6%88%EA%BD%83%EC%B6%95%EC%A0%9C.jpg","author":"Explicit","licence":"CC BY-SA 4.0","licence_url":"https://creativecommons.org/licenses/by-sa/4.0","share_alike":true},
  {"slug":"fifty-fifty","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Fifty_Fifty_2024_Billboard_K_Power_100.png","bucket":"images","path":"group-photos/fifty-fifty.jpg","width":1200,"height":714,"commons_page":"https://commons.wikimedia.org/wiki/File:Fifty_Fifty_2024_Billboard_K_Power_100.png","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"fromis-9","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/181120_fromis_9_02.jpg","bucket":"images","path":"group-photos/fromis-9.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:181120_fromis_9_02.jpg","author":"dispatchsns","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"hearts2hearts","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/H2H_HMA26.jpg","bucket":"images","path":"group-photos/hearts2hearts.jpg","width":1200,"height":689,"commons_page":"https://commons.wikimedia.org/wiki/File:H2H_HMA26.jpg","author":"티비텐 TV10","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"ikon","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/IKon_in_April_2023_(2).png","bucket":"images","path":"group-photos/ikon.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:IKon_in_April_2023_(2).png","author":"Doha News Official","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"illit","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/250221_ILLIT.png","bucket":"images","path":"group-photos/illit.jpg","width":1200,"height":607,"commons_page":"https://commons.wikimedia.org/wiki/File:250221_ILLIT.png","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"kara","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Kara_Asia_Song_Festival_(2).jpg","bucket":"images","path":"group-photos/kara.jpg","width":1200,"height":798,"commons_page":"https://commons.wikimedia.org/wiki/File:Kara_Asia_Song_Festival_(2).jpg","author":"KIYOUNG KIM","licence":"CC BY 2.0","licence_url":"https://creativecommons.org/licenses/by/2.0","share_alike":false},
  {"slug":"katseye","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Katseye_in_Seattle.jpg","bucket":"images","path":"group-photos/katseye.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:Katseye_in_Seattle.jpg","author":"David Lee","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"kickflip","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/KickFlip_at_SBS_Radio.jpg","bucket":"images","path":"group-photos/kickflip.jpg","width":1200,"height":598,"commons_page":"https://commons.wikimedia.org/wiki/File:KickFlip_at_SBS_Radio.jpg","author":"SBS Radio (YouTube)","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"kiss-of-life","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/KISS_OF_LIFE_at_Music_Bank_(4K)_20240705_01.png","bucket":"images","path":"group-photos/kiss-of-life.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:KISS_OF_LIFE_at_Music_Bank_(4K)_20240705_01.png","author":"TV10 (YouTube)","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"loona","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/200217_%EC%9D%B4%EB%8B%AC%EC%9D%98_%EC%86%8C%EB%85%80_01.png","bucket":"images","path":"group-photos/loona.jpg","width":1200,"height":800,"commons_page":"https://commons.wikimedia.org/wiki/File:200217_%EC%9D%B4%EB%8B%AC%EC%9D%98_%EC%86%8C%EB%85%80_01.png","author":"韓國娛樂新聞網站NewsInstar","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"loossemble","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Loossemble_at_Incheon_Airport_on_140923_(1).png","bucket":"images","path":"group-photos/loossemble.jpg","width":1200,"height":603,"commons_page":"https://commons.wikimedia.org/wiki/File:Loossemble_at_Incheon_Airport_on_140923_(1).png","author":"티비텐","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"miss-a","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Miss_A_2013.jpg","bucket":"images","path":"group-photos/miss-a.jpg","width":1200,"height":765,"commons_page":"https://commons.wikimedia.org/wiki/File:Miss_A_2013.jpg","author":"the.angrycamel from Singapore, Singapore","licence":"CC BY 2.0","licence_url":"https://creativecommons.org/licenses/by/2.0","share_alike":false},
  {"slug":"monsta-x","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/MonstaX_in_Golden_Disc_Awards_2019.jpg","bucket":"images","path":"group-photos/monsta-x.jpg","width":1200,"height":866,"commons_page":"https://commons.wikimedia.org/wiki/File:MonstaX_in_Golden_Disc_Awards_2019.jpg","author":"Newsen [뉴스엔 김기태 기자]","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"nct","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/NCT_going_to_a_Music_Bank_recording_in_April_2018_01.png","bucket":"images","path":"group-photos/nct.jpg","width":1200,"height":577,"commons_page":"https://commons.wikimedia.org/wiki/File:NCT_going_to_a_Music_Bank_recording_in_April_2018_01.png","author":"뉴스인스타 (News In Star)","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"nct-wish","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/2026_NCT_WISH_promotion_03_(cropped).jpg","bucket":"images","path":"group-photos/nct-wish.jpg","width":1200,"height":318,"commons_page":"https://commons.wikimedia.org/wiki/File:2026_NCT_WISH_promotion_03_(cropped).jpg","author":"numbuzin","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"p1harmony","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/P1Harmony_for_Marie_Claire_Korea_01_(cropped).jpg","bucket":"images","path":"group-photos/p1harmony.jpg","width":1200,"height":498,"commons_page":"https://commons.wikimedia.org/wiki/File:P1Harmony_for_Marie_Claire_Korea_01_(cropped).jpg","author":"Marie Claire Korea","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"pentagon","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Pentagon_190327.png","bucket":"images","path":"group-photos/pentagon.jpg","width":1200,"height":724,"commons_page":"https://commons.wikimedia.org/wiki/File:Pentagon_190327.png","author":"NewsInstar","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"purple-kiss","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/PURPLE_KISS_211001.jpg","bucket":"images","path":"group-photos/purple-kiss.jpg","width":1200,"height":709,"commons_page":"https://commons.wikimedia.org/wiki/File:PURPLE_KISS_211001.jpg","author":"KNTV","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"rescene","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/RESCENE_at_Incheon_Airport%2C_12_August_2026.png","bucket":"images","path":"group-photos/rescene.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:RESCENE_at_Incheon_Airport,_12_August_2026.png","author":"K-POPIT 케이팝잇","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"sistar","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/%EC%94%A8%EC%8A%A4%ED%83%80(SISTAR)_G%ED%8E%98%EC%8A%A4%ED%8B%B0%EB%B2%8C_%EC%95%84%EC%8B%9C%EC%95%84_%EB%93%9C%EB%A6%BC_%EC%BD%98%EC%84%9C%ED%8A%B8_(11).jpg","bucket":"images","path":"group-photos/sistar.jpg","width":1200,"height":1041,"commons_page":"https://commons.wikimedia.org/wiki/File:%EC%94%A8%EC%8A%A4%ED%83%80(SISTAR)_G%ED%8E%98%EC%8A%A4%ED%8B%B0%EB%B2%8C_%EC%95%84%EC%8B%9C%EC%95%84_%EB%93%9C%EB%A6%BC_%EC%BD%98%EC%84%9C%ED%8A%B8_(11).jpg","author":"SJ","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"stayc","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/STAYC_in_Seattle.jpg","bucket":"images","path":"group-photos/stayc.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:STAYC_in_Seattle.jpg","author":"David Lee","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"t-ara","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/170614_T-ARA_02.jpg","bucket":"images","path":"group-photos/t-ara.jpg","width":1200,"height":616,"commons_page":"https://commons.wikimedia.org/wiki/File:170614_T-ARA_02.jpg","author":"photomami","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"team","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/2025-10-28_%26TEAM_at_Back_to_Life_media_showcase_02_(cropped_and_straightened).jpg","bucket":"images","path":"group-photos/team.jpg","width":1200,"height":366,"commons_page":"https://commons.wikimedia.org/wiki/File:2025-10-28_%26TEAM_at_Back_to_Life_media_showcase_02_(cropped_and_straightened).jpg","author":"SBS Star Daily","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"the-boyz","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/The_Boyz_at_the_Dream_Concert_event_on_May_18%2C_2019.jpg","bucket":"images","path":"group-photos/the-boyz.jpg","width":1200,"height":647,"commons_page":"https://commons.wikimedia.org/wiki/File:The_Boyz_at_the_Dream_Concert_event_on_May_18,_2019.jpg","author":"THE BOYZ","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"triples","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/TripleS_250512.jpg","bucket":"images","path":"group-photos/triples.jpg","width":1200,"height":492,"commons_page":"https://commons.wikimedia.org/wiki/File:TripleS_250512.jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"tuide","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Tuide%2C_August_2026.jpg","bucket":"images","path":"group-photos/tuide.jpg","width":1200,"height":599,"commons_page":"https://commons.wikimedia.org/wiki/File:Tuide,_August_2026.jpg","author":"SBS Radio 에라오","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"tws","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/TWS_at_Music_Bank_20240202.jpg","bucket":"images","path":"group-photos/tws.jpg","width":1200,"height":599,"commons_page":"https://commons.wikimedia.org/wiki/File:TWS_at_Music_Bank_20240202.jpg","author":"tenasia (티비텐)","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"viviz","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/230315_VIVIZ_Seoul_Fashion_Week.jpg","bucket":"images","path":"group-photos/viviz.jpg","width":1200,"height":729,"commons_page":"https://commons.wikimedia.org/wiki/File:230315_VIVIZ_Seoul_Fashion_Week.jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"winner","kind":"group","focal_x":50,"focal_y":50,"small_2x":true,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/Winner_at_6th_Melon_Music_Awards_01.jpg","bucket":"images","path":"group-photos/winner.jpg","width":1200,"height":718,"commons_page":"https://commons.wikimedia.org/wiki/File:Winner_at_6th_Melon_Music_Awards_01.jpg","author":"Snowy Boy","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false},
  {"slug":"xikers","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/230317_xikers_(%EC%8B%B8%EC%9D%B4%EC%BB%A4%EC%8A%A4).jpg","bucket":"images","path":"group-photos/xikers.jpg","width":1200,"height":503,"commons_page":"https://commons.wikimedia.org/wiki/File:230317_xikers_(%EC%8B%B8%EC%9D%B4%EC%BB%A4%EC%8A%A4).jpg","author":"K-POPIT 케이팝잇","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"young-posse","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/YOUNG_POSSE_Seoul_Fashion_Week_September_2024.jpg","bucket":"images","path":"group-photos/young-posse.jpg","width":1200,"height":675,"commons_page":"https://commons.wikimedia.org/wiki/File:YOUNG_POSSE_Seoul_Fashion_Week_September_2024.jpg","author":"티비텐","licence":"CC BY 3.0","licence_url":"https://creativecommons.org/licenses/by/3.0","share_alike":false},
  {"slug":"zerobaseone","kind":"group","focal_x":50,"focal_y":50,"small_2x":false,"url":"https://commons.wikimedia.org/wiki/Special:FilePath/ZEROBASEONE_%40_40th_Golden_Disc_Awards_(20260110).jpg","bucket":"images","path":"group-photos/zerobaseone.jpg","width":1200,"height":663,"commons_page":"https://commons.wikimedia.org/wiki/File:ZEROBASEONE_@_40th_Golden_Disc_Awards_(20260110).jpg","author":"TV10","licence":"CC BY 4.0","licence_url":"https://creativecommons.org/licenses/by/4.0","share_alike":false}
]$subjects$::jsonb;
  v_cutoff constant date := (current_date - interval '18 years')::date;
  v_debut_col text;
  v_debut_expr text;
  sj record;
  g record;
  i record;
  lg record;
  r record;
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
  v_already integer := 0;
  v_base integer;
  v_total integer;
  v_max integer;
  v_ids text[];
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.cards_catalog') is null or to_regclass('public.cards_photos') is null or to_regclass('public.cards_entities') is null then
    raise exception '101-catalog: the cards tables are missing (run 001 to 003 first)';
  end if;
  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '101-catalog: public.groups or public.idols is missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'source_path') then
    raise exception '101-catalog: cards_photos has no source_path (001 without the photo columns of amendment 1)';
  end if;

  -- Review 1 finding 2: this file fills a catalog that holds its own subjects only. Refused, with nothing changed, while cards_entities,
  -- cards_catalog or cards_photos holds a row of anything else: an id outside its slug list (a group line it made for one of its people
  -- excepted) or a photo outside images/group-photos/.
  select array_agg(case when e.value ->> 'kind' = 'group' then 'group:' else 'idol:' end || (e.value ->> 'slug')) into v_ids
    from jsonb_array_elements(v_subjects) e;
  select count(*) into v_n from public.cards_entities e
   where e.id <> all (v_ids)
     and not (e.kind = 'group' and not exists (select 1 from public.cards_catalog c where c.entity_id = e.id)
              and exists (select 1 from public.cards_entities x where x.group_id = e.id and x.id = any (v_ids)));
  if v_n > 0 then
    raise exception '101-catalog: cards_entities holds % rows that are not subjects of this file, refusing', v_n;
  end if;
  select count(*) into v_n from public.cards_catalog c
   where c.entity_id <> all (v_ids)
      or (c.photo_id is not null and not exists (
            select 1 from public.cards_photos p where p.id = c.photo_id and p.source_path like 'images/group-photos/%'));
  if v_n > 0 then
    raise exception '101-catalog: cards_catalog holds % cards that are not subjects of this file, refusing', v_n;
  end if;
  select count(*) into v_n from public.cards_photos p
   where p.entity_id <> all (v_ids) or p.source_path is null or p.source_path not like 'images/group-photos/%';
  if v_n > 0 then
    raise exception '101-catalog: cards_photos holds % photos of another subject or outside images/group-photos/, refusing', v_n;
  end if;

  -- The debut year of a group, from the database: a debut column when groups has one, else the year of inception_date.
  select column_name into v_debut_col from information_schema.columns
    where table_schema = 'public' and table_name = 'groups' and column_name in ('debut_year', 'debut_date')
    order by (column_name = 'debut_year') desc limit 1;
  v_debut_expr := case v_debut_col
    when 'debut_year' then 'debut_year::integer'
    when 'debut_date' then 'extract(year from debut_date)::integer'
    else 'extract(year from inception_date)::integer' end;

  -- 1. Resolve every subject: in (with its resolved fields) or out (with the reason).
  for sj in select e.value as v from jsonb_array_elements(v_subjects) e loop
    v_slug := sj.v ->> 'slug';
    v_kind := sj.v ->> 'kind';
    v_ent := case when v_kind = 'group' then 'group:' else 'idol:' end || v_slug;
    v_reason := null;
    v_qid := null;
    g := null; i := null; lg := null;
    -- i starts as an all-null row of the idols columns (a record a select has not filled cannot be read)
    select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i from public.idols x where false;

    select gr.id, gr.name, gr.slug into g from public.groups gr where gr.slug = v_slug;
    if g.id is null then
      v_reason := 'no_groups_row';
    elsif v_kind = 'group' then
      select count(*), count(x.birth_date), count(*) filter (where x.birth_date <= v_cutoff)
        into v_n, v_known, v_adult from public.idols x where x.group_id = g.id and x.active;
      if v_n = 0 then v_reason := 'no_active_member';
      elsif v_known < v_n then v_reason := 'unknown_birth_date';
      elsif v_adult < v_n then v_reason := 'minor_member';
      end if;
    else
      -- Review 1 finding 11: the person must be ONE active idols row: of the person's own group, else of another group under the same
      -- name. Two or more candidates on the path taken leave the subject out as ambiguous (never a guess between two people).
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

    if v_reason is null and exists (select 1 from public.cards_catalog c where c.entity_id = v_ent) then
      v_already := v_already + 1;
      continue;
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

  -- 2. Order and number (decision 2): section A to Z, the people of a section before its group card, then the slug.
  select coalesce(jsonb_agg(x.e || jsonb_build_object('pos', x.pos) order by x.pos), '[]'::jsonb) into v_in
    from (select e, row_number() over (
            order by lower(e ->> 'section') collate "C", (e ->> 'kind' = 'group'), lower(e ->> 'name') collate "C", e ->> 'slug') as pos
          from jsonb_array_elements(v_in) e) x;
  v_total := jsonb_array_length(v_in);
  select coalesce(max(card_no), 0) into v_base from public.cards_catalog;

  -- 3. Entities: the group cards, the group lines of the people (no cards of their own), then the people.
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select e ->> 'entity', 'group', e ->> 'name', null, nullif(e ->> 'debut_year', '')::integer, null,
         lower(e ->> 'section') || '|1|' || lower(e ->> 'name'), '{"SR":"one","L":"one"}'::jsonb, true
    from jsonb_array_elements(v_in) e where e ->> 'kind' = 'group'
  on conflict (id) do update set name = excluded.name, debut_year = excluded.debut_year, sort_key = excluded.sort_key,
    lock_reasons = excluded.lock_reasons, active = true;

  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select distinct on (l ->> 'id') l ->> 'id', 'group', l ->> 'name', null, nullif(l ->> 'debut_year', '')::integer, null,
         lower(l ->> 'name') || '|1|' || lower(l ->> 'name'), '{}'::jsonb, true
    from jsonb_array_elements(v_lines) l
  on conflict (id) do nothing;

  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select e ->> 'entity', 'idol', e ->> 'name', e ->> 'group_entity', nullif(e ->> 'debut_year', '')::integer, e ->> 'qid',
         lower(e ->> 'section') || '|0|' || lower(e ->> 'name'), '{"SR":"one","L":"one"}'::jsonb, true
    from jsonb_array_elements(v_in) e where e ->> 'kind' = 'idol'
  on conflict (id) do update set name = excluded.name, group_id = excluded.group_id, debut_year = excluded.debut_year, qid = excluded.qid,
    sort_key = excluded.sort_key, lock_reasons = excluded.lock_reasons, active = true;

  -- 4. One approved photo per subject (slot 1).
  insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at,
                                   focal_x, focal_y, source_path, source_width, source_height, small_2x, status, review_note)
  select e ->> 'entity', 1, 'commons', e ->> 'commons_page', e ->> 'url', e ->> 'author', e ->> 'licence', e ->> 'licence_url',
         (e ->> 'share_alike')::boolean, date '2026-10-06', (e ->> 'focal_x')::integer, (e ->> 'focal_y')::integer,
         (e ->> 'bucket') || '/' || (e ->> 'path'), (e ->> 'width')::integer, (e ->> 'height')::integer, (e ->> 'small_2x')::boolean,
         'approved', 'Commons photo of the October 2026 run, checked by eye (amendment 1).'
    from jsonb_array_elements(v_in) e
   where not exists (select 1 from public.cards_photos p where p.entity_id = e ->> 'entity' and p.slot = 1 and p.status in ('auto', 'approved'));

  -- 5. Four cards per subject, four consecutive numbers, in the order C, U, R, UR.
  insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs)
  select v_base + ((e ->> 'pos')::integer - 1) * 4 + k.n, 'BV1-' || lpad((v_base + ((e ->> 'pos')::integer - 1) * 4 + k.n)::text, 4, '0'),
         e ->> 'entity', k.rarity, k.edition,
         (select p.id from public.cards_photos p where p.entity_id = e ->> 'entity' and p.slot = 1 and p.status in ('auto', 'approved') limit 1),
         true
    from jsonb_array_elements(v_in) e
   cross join (values (1, 'C', 'std'), (2, 'U', 'stage'), (3, 'R', 'holo'), (4, 'UR', 'gold')) as k(n, rarity, edition)
  on conflict do nothing;

  -- 6. Checks and the Verify output.
  select coalesce(max(card_no), 0) into v_max from public.cards_catalog;
  if v_max <> v_base + 4 * v_total then
    raise exception '101-catalog: the numbers are not contiguous (highest %, expected %)', v_max, v_base + 4 * v_total;
  end if;
  raise notice '101-catalog: % subjects in, % left out, % already there', v_total, jsonb_array_length(v_out), v_already;
  for r in select c.rarity, count(*) as n from public.cards_catalog c group by c.rarity order by array_position(array['C','U','R','SR','UR','L'], c.rarity) loop
    raise notice '101-catalog: % cards % in the catalog', r.n, r.rarity;
  end loop;
  raise notice '101-catalog: highest number BV1-%', lpad(v_max::text, 4, '0');
  for r in select o.value ->> 'slug' as slug, o.value ->> 'reason' as reason from jsonb_array_elements(v_out) o loop
    raise notice '101-catalog: left out % (%)', r.slug, r.reason;
  end loop;
  -- Review 1 finding 11: which idols row each person of this run is (for the owner to check against the subject).
  for r in select e.value ->> 'slug' as slug, e.value ->> 'idol_id' as idol from jsonb_array_elements(v_in) e where e.value ->> 'kind' = 'idol' order by e.value ->> 'slug' loop
    raise notice '101-catalog: person % is idols.id %', r.slug, r.idol;
  end loop;
end $c101$;
