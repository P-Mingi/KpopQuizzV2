-- 118-group-parts.sql (Bunnyverse Cards lot 7, 2026-11-17; a group photo in 2 or 3 cards, and the panorama of every group edition)
--
-- What:   in ONE DO block, additive:
--           cards_photos      + parts (2 or 3, null reads as 2), file_parts (what the owner's files were cut for, null reads as 2), file_pano
--                             (the panorama file exists), heads_box (jsonb, the thumbnail verdict, geometry only), parts_note (the rule's line)
--           cards_catalog     part check widened to 0 to 3 (part 1 to 3 of a group photo, consecutive card numbers)
--           new tables        cards_panoramas (P-0001 and up, one per group edition), cards_panoramas_owned (who holds which, source pack or craft),
--                             cards_parts_log (what this file changed on a photo row, for the rollback); RLS on, service_role only
--           4 functions replaced (same signatures, same privileges): cards_build_catalog (117's: a group photo of 2 or 3 cards, ranked by the width
--                             of ONE card, Full Art needs every part at 640 px, small_2x per part, the panoramas rebuilt, refuses when a panorama is
--                             owned), cards_catalog_append (114's: the same parts, a panorama after the highest P number), cards_open (110's: the
--                             missing part rule for 2 and 3 parts, completesPair on the last part, the panorama given once, answer gains pano and
--                             panoramas), cards_craft (110's: the same grant, answer gains pano)
--           data              255 group photos from docs/design/cards/data/lot7/parts.json (checked on 2026-11-17), by source_page: parts, heads_box,
--                             parts_note and small_2x (the 2x flag of the new window); the focal point only when it is still the one the verdict was read at (else a notice per photo); a photo
--                             where someone would be cut even in 3 cards goes to pending ("To review: ..."); a photo that seems to show a person under
--                             18 is rejected. Old status, note and focal go to cards_parts_log first.
-- Why:    lot 7 (owner and integrator, 2026-11-17): a wide group photo cut in two loses people; the smallest window that keeps everyone gives 2 or 3
--         cards, and the player who holds every part gets the whole picture as a panorama (never in a pack, never crafted, never recycled).
-- Scope:  every UPDATE and DELETE of the four functions has a WHERE ("where true" for all rows): safeupdate.test.ts scans them.
-- Rows:   cards_photos rows changed: the ones of the data found by source_page (group photos only); none of the other tables gets a row here. The catalog
--         is NOT rebuilt by this file: run "Reconstruire le catalogue" (cards_build_catalog) afterwards, so the cards follow the parts and the
--         panoramas are written. The notice says "118-group-parts: photos set to 2 ..., to 3 ..., focal points moved ..., kept ..., to review ..., rejected ..., pages not found ...".
-- Needs:  103 and 117 (cards_build_catalog), 110 (cards_open, cards_craft), 114 (cards_catalog_append), 116 for the photos. Apply after a backup, never between
--         23:50 and 00:30 UTC.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_build_catalog', 'cards_catalog_append', 'cards_open', 'cards_craft') and md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) in ('00b63db362c757cb3c4138c98afba368', 'bf4e41c1827742d2463d8e4ef5a15144', '01ba80721797a59fa83b113e29971969', 'e81a6565c61b3a26dc138f8de8a2a484');   expect 4
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_build_catalog', 'cards_catalog_append', 'cards_open', 'cards_craft') and md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) in ('3267a298f23abdbdaf7d709885d45c79', 'd015068e7ae143bc9e24655e74fe2e5d', '3233e2628cae60bb7bf4f76149cf7952', '707bf7425f0b803fb4e9c8b1d34d7d4a');   expect 0
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_build_catalog', 'cards_catalog_append', 'cards_open', 'cards_craft') and prosecdef and proconfig = array['search_path=public'];   expect 4
-- Verify: select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_build_catalog', 'cards_catalog_append', 'cards_open', 'cards_craft') and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));   expect 0
-- Verify: select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_build_catalog', 'cards_catalog_append', 'cards_open', 'cards_craft') and has_function_privilege('service_role', p.oid, 'execute');   expect 4
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name in ('parts', 'file_parts', 'file_pano', 'heads_box', 'parts_note');   expect 5
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_panoramas', 'cards_panoramas_owned', 'cards_parts_log') and rowsecurity;   expect 3
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_panoramas', 'cards_panoramas_owned', 'cards_parts_log') and grantee in ('anon', 'authenticated', 'PUBLIC');   expect 0
-- Verify: select pg_get_constraintdef(oid) like '%part >= 0%' and pg_get_constraintdef(oid) like '%part <= 3%' from pg_constraint where conname = 'cards_catalog_part_check' and conrelid = 'public.cards_catalog'::regclass;   expect t
-- Verify: select count(*) from public.cards_photos p where p.parts is not null and not exists (select 1 from public.cards_entities e where e.id = p.entity_id and e.kind = 'group');   expect 0
-- Verify: select count(*) from public.cards_parts_log l where not exists (select 1 from public.cards_photos p where p.id = l.photo_id);   expect 0
-- Verify: select coalesce(max(pano_no), 0) - count(*) from public.cards_panoramas;   expect 0 (P numbers contiguous; the table is filled by the next rebuild)
-- Verify: select count(*) from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = a.part + 1 where a.part > 0 and b.card_no <> a.card_no + 1;   expect 0
-- Refuses: between 23:50 and 00:30 UTC; when a pack was opened (cards_packs), a card is owned (cards_owned) or a panorama is owned (cards_panoramas_owned);
--          when a function it replaces is not the expected version (cards_build_catalog 117's, cards_catalog_append 114's, cards_open and cards_craft
--          110's; md5 of the body); when 103, 110 or 114 is missing. Nothing changed in every case.
-- Undo:   118-group-parts.rollback.sql (gives back the four functions, the rows of cards_parts_log, drops what 118 added; refused once a pack was opened).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c118$
declare
  v_utc time := (now() at time zone 'UTC')::time;
  v_md5 text;
  v_ok integer := 0;
  v_has boolean;
  v_data jsonb := $parts${"checked_on":"2026-11-17","photos":[{"page":"https://commons.wikimedia.org/wiki/File:%D0%9A%D0%BE%D0%BD%D1%86%D0%B5%D1%80%D1%82_Monsta_X_%D0%B2_%D0%A7%D0%B8%D0%BA%D0%B0%D0%B3%D0%BE.png","parts":3,"heads_box":{"x0":10,"x1":79,"y0":30,"y1":57,"hw":5},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":45,"y":50},"focal":{"x":45,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:%EC%94%A8%EC%8A%A4%ED%83%80(SISTAR)_G%ED%8E%98%EC%8A%A4%ED%8B%B0%EB%B2%8C_%EC%95%84%EC%8B%9C%EC%95%84_%EB%93%9C%EB%A6%BC_%EC%BD%98%EC%84%9C%ED%8A%B8_(11).jpg","parts":2,"heads_box":{"x0":10,"x1":96,"y0":2,"y1":23,"hw":9},"note":"2 cards: the 11:8.5 window keeps all 4 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:%EC%9C%84%EB%84%88_%ED%99%98%ED%83%80%EB%AF%B9%EC%8A%A4_%EC%B4%AC%EC%98%81%EC%9E%A5_%EB%A9%94%EC%9D%B4%ED%82%B9_%ED%95%84%EB%A6%84.png","parts":2,"heads_box":{"x0":23,"x1":81,"y0":7,"y1":28,"hw":7},"note":"2 cards: the 11:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:&TEAM_ATA_promotion_02.jpg","parts":2,"heads_box":{"x0":21,"x1":74,"y0":15,"y1":72,"hw":9},"note":"2 cards: the 11:8.5 window keeps all 9 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:(Marie_Claire_Korea)_Here_Comes_Winner.jpg","parts":3,"heads_box":{"x0":8,"x1":90,"y0":3,"y1":56,"hw":12},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:0020Reinvent_Your_World_With_Globe-Blackpink_The_Show_24.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.33): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:0105_%EC%95%84%EC%9D%B4%EC%BD%98(iKON)_%EB%B0%94%EB%B9%84X%EC%A0%95%EC%B0%AC%EC%9A%B0_%ED%8F%AC%EC%BB%A4%EC%8A%A4_33%ED%9A%8C_%EA%B3%A8%EB%93%A0%EB%94%94%EC%8A%A4%ED%81%AC_%EC%8B%9C%EC%83%81%EC%8B%9D_%EB%A0%88%EB%93%9C%EC%B9%B4%ED%8E%AB_4K%EC%98%81%EC%83%81_2m_53s.jpg","parts":3,"heads_box":{"x0":9,"x1":92,"y0":1,"y1":28,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:01092026_Stray_Kids_CHANGBIN_X_AUTRY_PhotoCall_12.png","parts":2,"heads_box":{"x0":32,"x1":63,"y0":8,"y1":32,"hw":24},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/8","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":8},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:03032026_LESSERAFIM_EUNCHAE_Airport_Departure_3.jpg","parts":2,"heads_box":{"x0":27,"x1":66,"y0":14,"y1":42,"hw":26},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/20","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":20},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:03112026_Aespa_NingNing_Airport_Departure_10.png","parts":3,"heads_box":{"x0":28,"x1":73,"y0":5,"y1":56,"hw":34},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:05062026_KISS_OF_LIFE_Airport_Departure.png","parts":3,"heads_box":{"x0":10,"x1":85,"y0":11,"y1":37,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:10072026_YUNA_ITZY_AIRPORT_DEPARTURE_2.png","parts":2,"heads_box":{"x0":24,"x1":67,"y0":11,"y1":37,"hw":22},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/16","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":16},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:150621._%EC%B9%B4%EB%9D%BC_%ED%8C%AC%EB%AF%B8%ED%8C%85_&_%ED%87%B4%EA%B7%BC%EA%B8%B8.jpg","parts":2,"heads_box":{"x0":25,"x1":75,"y0":0,"y1":24,"hw":9},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:151219_비투비_두번째_단독콘서트_Born_To_Beat_Time.jpg","parts":3,"heads_box":{"x0":6,"x1":100,"y0":38,"y1":83,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 9 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:170311_DAY6_음악중심_미니팬미팅_by_SinC_(1).jpg","parts":3,"heads_box":{"x0":7,"x1":99,"y0":2,"y1":31,"hw":13},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 3 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:170822_%EC%83%81%EC%95%94_%EB%93%9C%EB%A6%BC%EC%BA%90%EC%B3%90_%EC%A7%81%EC%BA%A0_18_DREAMCATCHER_tbs_%ED%8C%A9%ED%8A%B8in%EC%8A%A4%ED%83%80_10s.jpg","parts":3,"heads_box":{"x0":3,"x1":96,"y0":7,"y1":31,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people once its focal point moves to 50/40","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":40},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:170831_Dreamcatcher_드림캐쳐_01.jpg","parts":2,"heads_box":{"x0":31,"x1":83,"y0":9,"y1":49,"hw":14},"note":"2 cards: the 11:8.5 window keeps all 2 people once its focal point moves to 55/50","focal_from":{"x":50,"y":50},"focal":{"x":55,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:171013_GOT7_KBS_뮤직뱅크_출근길.jpg","parts":3,"heads_box":{"x0":4,"x1":98,"y0":0,"y1":27,"hw":8},"note":"To review: someone would be cut even in 3 cards (7 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:171210_핑거밴드_페스티벌_마마무_솔라_미리보기_02.jpg","parts":2,"heads_box":{"x0":29,"x1":71,"y0":1,"y1":38,"hw":28},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:171215_Pentagon.png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:180110_%EC%9C%84%EB%84%88_32%ED%9A%8C_%EA%B3%A8%EB%93%A0%EB%94%94%EC%8A%A4%ED%81%AC.jpg","parts":3,"heads_box":{"x0":14,"x1":93,"y0":5,"y1":39,"hw":11},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people once its focal point moves to 50/3","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":3},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:180503_%ED%8E%9C%ED%83%80%EA%B3%A4_PENTAGON_01.png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:18052026_ITZY_LIA_2.png","parts":3,"heads_box":{"x0":23,"x1":80,"y0":11,"y1":58,"hw":40},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:180628_Day6.jpg","parts":3,"heads_box":{"x0":7,"x1":94,"y0":1,"y1":22,"hw":10},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people once its focal point moves to 50/0","focal_from":{"x":50,"y":40},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:180818_iKON_2018_Continue_Tour_in_Seoul_바비_송윤형.jpg","parts":2,"heads_box":{"x0":44,"x1":82,"y0":7,"y1":61,"hw":15},"note":"2 cards: the 11:8.5 window keeps all 2 people once its focal point moves to 60/50","focal_from":{"x":50,"y":50},"focal":{"x":60,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:181012_NCT127_KBS_'뮤직뱅크'_리허설_출근길_직캠_영상_02.png","parts":3,"heads_box":{"x0":6,"x1":98,"y0":11,"y1":37,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 10 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:181229_%EC%9C%84%EB%84%88_%EB%A1%AF%EB%8D%B0%EB%B0%B1%ED%99%94%EC%A0%90_%EC%9E%A0%EC%8B%A4_%ED%8C%AC%EC%8B%B8%EC%9D%B8%ED%9A%8C.jpg","parts":3,"heads_box":{"x0":1,"x1":94,"y0":1,"y1":35,"hw":11},"note":"To review: someone would be cut even in 3 cards (4 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:190202_Blackpink_Philippines_Concert_(9).jpg","parts":2,"heads_box":{"x0":26,"x1":65,"y0":26,"y1":52,"hw":7},"note":"2 cards: the 11:8.5 window keeps all 2 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:190419_%ED%8E%9C%ED%83%80%EA%B3%A4_(PENTAGON).png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:190426_%EB%93%9C%EB%A6%BC%EC%BA%90%EC%B3%90_%EC%86%A1%EB%8F%84_%EB%B6%88%EA%BD%83%EC%B6%95%EC%A0%9C.jpg","parts":3,"heads_box":{"x0":8,"x1":94,"y0":15,"y1":60,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:190524_NCT_127_'We_Are_Superhuman'_제작발표회_01.png","parts":3,"heads_box":{"x0":1,"x1":98,"y0":32,"y1":52,"hw":5},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 9 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:191005_Mamamoo_Wheein.png","parts":2,"heads_box":{"x0":32,"x1":73,"y0":6,"y1":41,"hw":26},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/3","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":3},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:191102_%EC%9C%84%EB%84%88_%EC%98%81%EB%93%B1%ED%8F%AC_%ED%8C%AC%EC%8B%B8%EC%9D%B8%ED%9A%8C.jpg","parts":3,"heads_box":{"x0":2,"x1":94,"y0":3,"y1":30,"hw":11},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people once its focal point moves to 50/0","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:1949_Events_Collage_V_2.0.jpg","parts":2,"heads_box":null,"note":"2 cards by the ratio (1.11): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:200901_Pentagon_Ten_Asia_(TTA).png","parts":3,"heads_box":{"x0":6,"x1":95,"y0":8,"y1":47,"hw":10},"note":"To review: someone would be cut even in 3 cards (7 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2017_DAY6_TAIPEI.JPG","parts":3,"heads_box":{"x0":10,"x1":95,"y0":3,"y1":41,"hw":10},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 100/40","focal_from":{"x":50,"y":40},"focal":{"x":100,"y":40},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2017_Dream_Concert_in_Pyeongchang.jpg","parts":3,"heads_box":{"x0":7,"x1":92,"y0":23,"y1":40,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20190518_Blackpink_Amsterdam_concert_09_Rosé_and_Lisa.jpg","parts":2,"heads_box":{"x0":26,"x1":73,"y0":51,"y1":59,"hw":3},"note":"2 cards: the 11:8.5 window keeps all 2 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2019_Macys_Thanksgiving_Day_Parade_(49142990873).jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.50): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:20220908_Loona_Amsterdam_concert_010.jpg","parts":2,"heads_box":{"x0":11,"x1":95,"y0":29,"y1":39,"hw":4},"note":"2 cards: the 11:8.5 window keeps all 8 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20221117_Dreamcatcher_Tilburg_concert_39.jpg","parts":3,"heads_box":{"x0":7,"x1":93,"y0":16,"y1":48,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":45},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20230530_Red_Velvet_Amsterdam_concert_013_Yeri_and_Irene.jpg","parts":2,"heads_box":{"x0":38,"x1":86,"y0":13,"y1":33,"hw":14},"note":"2 cards: the 11:8.5 window keeps all 2 people once its focal point moves to 50/25","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":25},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20230705_KISS_OF_LIFE_(%ED%82%A4%EC%8A%A4%EC%98%A4%EB%B8%8C%EB%9D%BC%EC%9D%B4%ED%94%84).jpg","parts":2,"heads_box":{"x0":14,"x1":80,"y0":3,"y1":26,"hw":11},"note":"2 cards: the 11:8.5 window keeps all 4 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20230712_ODD_EYE_CIRCLE_(오드아이써클).jpg","parts":3,"heads_box":{"x0":7,"x1":94,"y0":4,"y1":36,"hw":14},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 3 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20230815_Huang_Ren-jun.jpg","parts":2,"heads_box":{"x0":23,"x1":61,"y0":5,"y1":42,"hw":34},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2024-08-28_&TEAM_fan_event_in_Seoul_09.jpg","parts":2,"heads_box":{"x0":31,"x1":90,"y0":25,"y1":68,"hw":12},"note":"2 cards: the 11:8.5 window keeps all 2 people once its focal point moves to 86/50","focal_from":{"x":50,"y":50},"focal":{"x":86,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20240223_Dreamcatcher_Offenbach_concert_01.jpg","parts":3,"heads_box":null,"note":"To review: the photo is wider than 16.5:8.5 (1.99) and no thumbnail placed the heads; even 3 cards cut its sides","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:20240531_ARTMS_%40_Dall_Showcase.png","parts":3,"heads_box":{"x0":6,"x1":96,"y0":4,"y1":33,"hw":10},"note":"To review: someone would be cut even in 3 cards (5 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20240531_ARTMS_%40_MusicBank.png","parts":3,"heads_box":{"x0":9,"x1":90,"y0":3,"y1":32,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20241105_Suho_수호_04.jpg","parts":2,"heads_box":{"x0":30,"x1":72,"y0":2,"y1":42,"hw":36},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2025-11-18_&TEAM_performing_Mismatch_for_SBS_Radio_01.jpg","parts":3,"heads_box":{"x0":11,"x1":87,"y0":20,"y1":48,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2025-12-12_ATEEZ_at_Gimpo_International_Airport_01.jpg","parts":3,"heads_box":{"x0":14,"x1":96,"y0":0,"y1":39,"hw":13},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 3 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2025-12-12_ATEEZ_at_Gimpo_International_Airport_05.jpg","parts":3,"heads_box":{"x0":32,"x1":91,"y0":2,"y1":46,"hw":24},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 2 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2025-12-12_ATEEZ_at_Gimpo_International_Airport_07.jpg","parts":3,"heads_box":{"x0":7,"x1":89,"y0":9,"y1":52,"hw":14},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people once its focal point moves to 50/33","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":33},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2025-12-29_&Team_for_Marie_Claire_02.jpg","parts":3,"heads_box":{"x0":15,"x1":85,"y0":18,"y1":46,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20250306_Aespa_Amsterdam_concert_02.jpg","parts":2,"heads_box":{"x0":7,"x1":90,"y0":15,"y1":28,"hw":9},"note":"2 cards: the 11:8.5 window keeps all 4 people once its focal point moves to 50/24","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":24},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20250801_LOLLAPALOOZA_TWICE_0727_(cropped).jpg","parts":2,"heads_box":{"x0":33,"x1":66,"y0":5,"y1":38,"hw":22},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:20260320_NMIXX_Amsterdam_concert_01.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.33): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:2026_NCT_WISH_fansigning_09.jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":55},"focal":{"x":50,"y":55},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2026_NCT_WISH_promotion_03_(cropped).jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:220706_Summer_Vibe_쇼케이스_비비지.jpg","parts":2,"heads_box":{"x0":22,"x1":81,"y0":19,"y1":47,"hw":13},"note":"2 cards: the 11:8.5 window keeps all 3 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:220813_Vivid_Dayz_팬미팅_비비지.jpg","parts":2,"heads_box":{"x0":17,"x1":83,"y0":12,"y1":46,"hw":15},"note":"2 cards: the 11:8.5 window keeps all 3 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:220820_poleposition_235_(53595169299).jpg","parts":3,"heads_box":{"x0":8,"x1":83,"y0":2,"y1":53,"hw":18},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 3 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:220820_poleposition_265_(53594853161).jpg","parts":2,"heads_box":{"x0":43,"x1":67,"y0":3,"y1":31,"hw":18},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:220903_poleposition_069_(53595347273).jpg","parts":2,"heads_box":{"x0":38,"x1":65,"y0":4,"y1":27,"hw":20},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:230214_%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%94%A8_(StayC)_at_Teddy_Bear_Showcase.png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:230315_VIVIZ_Seoul_Fashion_Week.jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:230415_트레저_Hello_Tour_in_Manila.jpg","parts":2,"heads_box":{"x0":7,"x1":98,"y0":27,"y1":73,"hw":8},"note":"2 cards: the 11:8.5 window keeps all 10 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:230806_트레저_(TREASURE)_SBS_파워FM_두시탈출_컬투쇼.jpg","parts":3,"heads_box":{"x0":8,"x1":96,"y0":11,"y1":68,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 10 people once its focal point moves to 50/30","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":30},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:230816_STAYC_at_%22TEENFRESH%22_Showcase.jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":55},"focal":{"x":50,"y":55},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:240405_트레저_TTA_Malaysia_1st_Place.jpg","parts":3,"heads_box":{"x0":3,"x1":95,"y0":6,"y1":67,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 10 people once its focal point moves to 50/22","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":22},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:240511_Red_Velvet_Irene.jpg","parts":3,"heads_box":{"x0":27,"x1":75,"y0":3,"y1":50,"hw":38},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:240511_Red_Velvet_Yeri.jpg","parts":3,"heads_box":{"x0":26,"x1":73,"y0":2,"y1":53,"hw":40},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:240919_SHINEE_Taemin.jpg","parts":3,"heads_box":{"x0":18,"x1":78,"y0":2,"y1":54,"hw":50},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:241002_&Team_(3).jpg","parts":3,"heads_box":{"x0":6,"x1":97,"y0":38,"y1":62,"hw":5},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 9 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:241014_Enhypen.jpg","parts":3,"heads_box":{"x0":2,"x1":93,"y0":0,"y1":28,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:241018_Billlie.jpg","parts":3,"heads_box":{"x0":8,"x1":92,"y0":5,"y1":30,"hw":7},"note":"To review: someone would be cut even in 3 cards (7 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:260306_Twice_Hamilton_Jeongyeon_트와이스_정연_(5).jpg","parts":2,"heads_box":{"x0":41,"x1":61,"y0":19,"y1":49,"hw":15},"note":"2 cards: the 11:8.5 window keeps all 1 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:260306_Twice_Hamilton_Jeongyeon_트와이스_정연_(8).jpg","parts":2,"heads_box":{"x0":27,"x1":62,"y0":19,"y1":49,"hw":22},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/38","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":38},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:260507_Danielle_June_Marsh.png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:260507_Min_Heejin.png","parts":3,"heads_box":{"x0":17,"x1":73,"y0":4,"y1":59,"hw":50},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:261010_PENTAGON_10th_Anniversary_Tour_101010_in_Seoul.png","parts":3,"heads_box":{"x0":14,"x1":86,"y0":11,"y1":61,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:29102026_ILLIT_TOP_TEN_AWARDS.png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2NE1_2012.jpg","parts":3,"heads_box":{"x0":9,"x1":80,"y0":11,"y1":39,"hw":12},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 50/32","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":32},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:2NE1_AON_at_Shanghai_1.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.40): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:2NE1_Galaxy_Stage_in_Phu_Tho_Indoor_Stadium,_August_2013.jpg","parts":3,"heads_box":null,"note":"To review: the photo is wider than 16.5:8.5 (3.60) and no thumbnail placed the heads; even 3 cards cut its sides","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:2NE1_everland_3D_pavilion_2013.jpg","parts":2,"heads_box":{"x0":31,"x1":76,"y0":44,"y1":68,"hw":4},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:31072026_NINGNING_AESPA_AIRPORT_DEPARTURE_1.png","parts":2,"heads_box":{"x0":32,"x1":99,"y0":6,"y1":42,"hw":20},"note":"2 cards: the 11:8.5 window keeps all 2 people once its focal point moves to 50/5","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":5},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:5월_26일_우유의_날_&_치즈에_퐁당_페스티벌_(31).jpg","parts":2,"heads_box":{"x0":21,"x1":86,"y0":33,"y1":50,"hw":5},"note":"2 cards: the 11:8.5 window keeps all 6 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:AKMU_Marie_Claire_Korea_2021.jpg","parts":2,"heads_box":{"x0":20,"x1":84,"y0":4,"y1":41,"hw":20},"note":"2 cards: the 11:8.5 window keeps all 2 people once its focal point moves to 50/0","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:ARTMS_-_54462684746.jpg","parts":3,"heads_box":{"x0":14,"x1":93,"y0":4,"y1":45,"hw":10},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:ARTMS_Moonshot_World_Tour_in_Tacoma_2024_(53982885976).jpg","parts":3,"heads_box":{"x0":1,"x1":96,"y0":18,"y1":46,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:ARTMS_performing_in_Eindhoven,_May_2025.jpg","parts":3,"heads_box":{"x0":9,"x1":85,"y0":16,"y1":45,"hw":5},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:ATEEZ_in_August_2024.jpg","parts":2,"heads_box":{"x0":24,"x1":76,"y0":55,"y1":71,"hw":3},"note":"2 cards: the 11:8.5 window keeps all 8 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:A_Pink_at_Pepsi_Concert,_16_November_2014_12.jpg","parts":3,"heads_box":{"x0":7,"x1":95,"y0":8,"y1":38,"hw":9},"note":"To review: someone would be cut even in 3 cards (6 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:A_Pink_at_a_fansigning_in_Mokdong_on_7_December_2014_03.jpg","parts":3,"heads_box":{"x0":1,"x1":97,"y0":11,"y1":44,"hw":9},"note":"To review: someone would be cut even in 3 cards (6 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Aespa's_Ningning_&_Karina_2.png","parts":3,"heads_box":{"x0":20,"x1":91,"y0":1,"y1":57,"hw":22},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 2 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Aespa_at_Mise-en-Scene_event_on_19022026_(7).png","parts":3,"heads_box":{"x0":20,"x1":88,"y0":5,"y1":44,"hw":12},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Aniteez.jpg","parts":2,"heads_box":null,"note":"2 cards by the ratio (0.75): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Apink_at_Hanbitsa_Awards,_21_June_2015.jpg","parts":3,"heads_box":{"x0":4,"x1":97,"y0":10,"y1":56,"hw":12},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Apink_at_Korea_Sale_Festa_Opening_Ceremony,_30_September_2016.png","parts":3,"heads_box":{"x0":9,"x1":97,"y0":3,"y1":37,"hw":9},"note":"To review: someone would be cut even in 3 cards (6 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Apink_at_Namseoul_University_festival,_3_September_2014_01.jpg","parts":3,"heads_box":{"x0":8,"x1":86,"y0":11,"y1":61,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 45/42","focal_from":{"x":45,"y":50},"focal":{"x":45,"y":42},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Apink_at_Pink_Paradise_concert,_30_May_2015_03.jpg","parts":3,"heads_box":{"x0":8,"x1":96,"y0":5,"y1":31,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/33","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":33},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Artms_250613.jpg","parts":3,"heads_box":{"x0":11,"x1":91,"y0":6,"y1":29,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Astro_at_the_HallyuPopFest_London_2022_event.jpg","parts":2,"heads_box":{"x0":14,"x1":84,"y0":5,"y1":26,"hw":8},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Ateez_in_2026.png","parts":2,"heads_box":{"x0":9,"x1":91,"y0":2,"y1":55,"hw":9},"note":"2 cards: the 11:8.5 window keeps all 8 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:BOSS_RIIZE.png","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.35): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:BTOB_10%E9%80%B1%E5%B9%B4%E5%AE%8C%E6%95%B4%E9%AB%94%E5%9B%9E%E6%AD%B8_%E9%99%B8%E6%98%9F%E6%9D%90%E4%B8%80%E5%8F%A5%E8%A9%B1%E7%A0%B4%E5%A3%9E%E6%84%9F%E5%8B%95_01.png","parts":2,"heads_box":{"x0":12,"x1":87,"y0":9,"y1":42,"hw":8},"note":"2 cards: the 11:8.5 window keeps all 6 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:BTOB_2015.09.06_%E9%A6%99%E6%B8%AFAPM%E5%95%86%E5%A0%B4%E6%B4%BB%E5%8B%95.jpg","parts":3,"heads_box":{"x0":6,"x1":94,"y0":10,"y1":35,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:BTOB_in_Marie_Claire_Korea_2017.jpg","parts":3,"heads_box":{"x0":14,"x1":93,"y0":1,"y1":62,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:BTS_Arirang_World_Tour_in_Paris_(17_July_2026)_-_Swim.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.78): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:BTS_PTD_LAS_VEGAS_Allegiant_Stadium_interior.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.78): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:BTS_Permission_to_Dance_On_Stage_Dec_1,_2021.jpg","parts":2,"heads_box":{"x0":22,"x1":81,"y0":46,"y1":64,"hw":4},"note":"2 cards: the 11:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:BTS_performing_\"DNA\"_during_the_Love_Yourself_concert_in_Nagoya,_13_January_2019_02.jpg","parts":2,"heads_box":{"x0":19,"x1":93,"y0":0,"y1":64,"hw":9},"note":"2 cards: the 11:8.5 window keeps all 7 people once its focal point moves to 75/0","focal_from":{"x":50,"y":50},"focal":{"x":75,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:BTS_performing_\"Not_Today\"_during_Speak_Yourself_tour_at_MetLife_Stadium,_18_May_2019_01.jpg","parts":3,"heads_box":{"x0":2,"x1":96,"y0":8,"y1":57,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 13 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Bang_Chan_of_Stray_Kids,_October_15,_2025_(2).png","parts":3,"heads_box":{"x0":22,"x1":83,"y0":5,"y1":59,"hw":52},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Big_Bang_and_Steady-State_Theory_2.png","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.78): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Blackpink_Born_Pink_Tour_LA_01.jpg","parts":2,"heads_box":{"x0":19,"x1":84,"y0":18,"y1":42,"hw":9},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Blackpink_Rosé_Rimowa_2.jpg","parts":3,"heads_box":{"x0":15,"x1":73,"y0":2,"y1":62,"hw":45},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:CL_2NE1_3.jpg","parts":3,"heads_box":{"x0":20,"x1":88,"y0":7,"y1":52,"hw":40},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:CMB_Timeline_uk.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.53): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Cast_and_crew_members_of_\"Nine\"_look_over_a_special_collections_display_of_Music_Division_treasures_during_a_visit_to_the_Library,_August_7,_2024.jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Collection_of_Enhypen_Sin-Vanish_Photocard.jpg","parts":2,"heads_box":null,"note":"2 cards by the ratio (0.75): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Cronología_de_la_Naturaleza_Timespiral.png","parts":2,"heads_box":null,"note":"2 cards by the ratio (0.86): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:DAY6_in_taiwan.jpg","parts":3,"heads_box":{"x0":3,"x1":95,"y0":3,"y1":28,"hw":6},"note":"To review: someone would be cut even in 3 cards (6 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Dara_cropped.jpg","parts":2,"heads_box":{"x0":40,"x1":72,"y0":2,"y1":20,"hw":22},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Day6ninestars.png","parts":3,"heads_box":{"x0":5,"x1":95,"y0":10,"y1":34,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people","focal_from":{"x":45,"y":40},"focal":{"x":45,"y":40},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Dreamcatcher_2024_Brussels_1.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.33): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:EXO-M_at_KCON_2012.jpg","parts":2,"heads_box":{"x0":17,"x1":96,"y0":19,"y1":39,"hw":8},"note":"2 cards: the 11:8.5 window keeps all 6 people once its focal point moves to 100/50","focal_from":{"x":50,"y":50},"focal":{"x":100,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:EXO_at_KBS_Gayo_Daejun_on_December_28,_2018.png","parts":3,"heads_box":{"x0":14,"x1":90,"y0":4,"y1":31,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 8 people once its focal point moves to 50/16","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":16},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Easy_Crazy_Hot_Tour_in_Seattle_-_le_sserafim_(Sakura_crop).jpg","parts":2,"heads_box":{"x0":25,"x1":67,"y0":11,"y1":43,"hw":30},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/12","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":12},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Enhypen,_June_2026.jpg","parts":3,"heads_box":{"x0":9,"x1":96,"y0":5,"y1":24,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/28","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":28},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Enhypen_in_2026_at_GDA.png","parts":3,"heads_box":{"x0":42,"x1":92,"y0":0,"y1":20,"hw":8},"note":"3 cards: on the thumbnail the 11:8.5 window cuts someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 66/50","focal_from":{"x":50,"y":50},"focal":{"x":66,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Enhypen_members.jpg","parts":2,"heads_box":{"x0":11,"x1":92,"y0":17,"y1":33,"hw":6},"note":"2 cards: the 11:8.5 window keeps all 6 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Fifty_Fifty_in_2026.jpg","parts":2,"heads_box":{"x0":8,"x1":82,"y0":5,"y1":33,"hw":10},"note":"2 cards: the 11:8.5 window keeps all 4 people once its focal point moves to 22/50","focal_from":{"x":50,"y":50},"focal":{"x":22,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Fishmongers'_Pall_-_Treasures_of_Gold_and_Silver_Wire.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.33): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Freedom_Fest_250_(9800170).jpg","parts":2,"heads_box":{"x0":31,"x1":82,"y0":57,"y1":68,"hw":3},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:French-Français_Chronologie_de_la_Nature_fond_clair_01.png","parts":2,"heads_box":null,"note":"2 cards by the ratio (0.86): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Fromis_9_231223.png","parts":3,"heads_box":{"x0":7,"x1":92,"y0":13,"y1":34,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 8 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Fromis_9_240224.png","parts":3,"heads_box":{"x0":3,"x1":95,"y0":3,"y1":27,"hw":6},"note":"To review: someone would be cut even in 3 cards (8 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Fromis_9_250825.jpg","parts":3,"heads_box":{"x0":5,"x1":97,"y0":3,"y1":36,"hw":10},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 45/0","focal_from":{"x":45,"y":50},"focal":{"x":45,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Fromis_9_in_Seattle_-_54777058881.jpg","parts":3,"heads_box":{"x0":15,"x1":85,"y0":4,"y1":32,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 50/16","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":16},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:GASGAS_TXT_GP_250_-_EICMA_2024.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.33): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Got7_at_2018_KBS_Song_Festival,_28_December_2018.jpg","parts":3,"heads_box":{"x0":12,"x1":91,"y0":5,"y1":34,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/12","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":12},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Got7_cheering_video_for_JYPE_16th_audition_04.jpg","parts":3,"heads_box":{"x0":3,"x1":96,"y0":5,"y1":43,"hw":11},"note":"To review: someone would be cut even in 3 cards (7 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Got7_on_the_red_carpet_of_2018_Asia_Artist_Awards(AAA),_28_November_2018_02.jpg","parts":3,"heads_box":{"x0":7,"x1":94,"y0":3,"y1":29,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:HMV&BOOKS_SHIBUYA_2024年12月1日の渋谷_202412011631_IMG_2116.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.33): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:HS-TXT_(21_Oct_2024).jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.50): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:HS-TXT_at_phuket_airport.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.50): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Hong_Seung-han_at_Riize_signing_event_September_10_2023.png","parts":3,"heads_box":{"x0":29,"x1":80,"y0":2,"y1":53,"hw":46},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:IKON_at_Goan_Chart_Music_Awards_(2019).jpg","parts":3,"heads_box":{"x0":2,"x1":95,"y0":0,"y1":24,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:IKon_in_April_2023_(2).png","parts":3,"heads_box":{"x0":4,"x1":95,"y0":1,"y1":35,"hw":11},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:ITZY's_Lia_in_August_2023_02.jpg","parts":3,"heads_box":{"x0":19,"x1":81,"y0":3,"y1":43,"hw":36},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:ITZY_(있지)_2023_뮤직뱅크_페스티벌_출국_ITZY_Airport_Departure.jpg","parts":3,"heads_box":{"x0":7,"x1":93,"y0":4,"y1":48,"hw":11},"note":"To review: someone would be cut even in 3 cards (4 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:JAK_ROZWINELO_SIE_ZYCIE.jpg","parts":2,"heads_box":null,"note":"2 cards by the ratio (0.71): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Jeon_So-yeon_of_(G)I-DLE_in_2020_01.png","parts":2,"heads_box":null,"note":"2 cards by the ratio (1.08): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Jeongyeon_opening_remarks_at_the_Twice_This_Is_For_World_Tour_in_Vancouver,_January_9,_2026.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.30): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:KARA_MBC_Korean_Music_Wave.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.33): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":45},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:KARA_at_DSP_Festival.jpg","parts":3,"heads_box":{"x0":7,"x1":91,"y0":12,"y1":52,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:KCON_2015_Monsta_X.jpg","parts":3,"heads_box":{"x0":3,"x1":93,"y0":31,"y1":48,"hw":3},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:KCON_2015_Sistar_DSC02857_(20424155301).jpg","parts":3,"heads_box":{"x0":12,"x1":94,"y0":25,"y1":39,"hw":4},"note":"3 cards: on the thumbnail the 11:8.5 window cuts someone, the 16.5:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:KIOF_brandaward.jpg","parts":3,"heads_box":{"x0":7,"x1":95,"y0":9,"y1":36,"hw":12},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people once its focal point moves to 50/19","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":19},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:KISS_OF_LIFE_at_Music_Bank_(4K)_20240705_01.png","parts":3,"heads_box":{"x0":1,"x1":89,"y0":1,"y1":34,"hw":10},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:KOCIS_Korea_KPOP_World_Festival_08_(11040012933).jpg","parts":2,"heads_box":{"x0":12,"x1":86,"y0":22,"y1":45,"hw":9},"note":"2 cards: the 11:8.5 window keeps all 4 people once its focal point moves to 48/45","focal_from":{"x":50,"y":45},"focal":{"x":48,"y":45},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:KOCIS_Korea_Mnet_BTOB_01_(12986777595).jpg","parts":2,"heads_box":{"x0":23,"x1":73,"y0":30,"y1":67,"hw":5},"note":"2 cards: the 11:8.5 window keeps all 6 people","focal_from":{"x":45,"y":50},"focal":{"x":45,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:KOCIS_Korea_Mnet_Girls_Generation_11_(12986862615).jpg","parts":3,"heads_box":{"x0":5,"x1":92,"y0":32,"y1":84,"hw":5},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 10 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:K_(&TEAM)._April_6,_2026._\"The_Devil_Wears_Prada_2\"_event_in_Tokyo.jpg","parts":3,"heads_box":{"x0":25,"x1":79,"y0":0,"y1":51,"hw":44},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Kara_When_I_Move.jpg","parts":3,"heads_box":{"x0":7,"x1":93,"y0":26,"y1":46,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Kara_at_the_fansigning_for_their_mini_album_\"Day_&_Night\",_30_August_2014_01.jpg","parts":2,"heads_box":{"x0":11,"x1":94,"y0":4,"y1":33,"hw":12},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Kara_in_2012.jpg","parts":3,"heads_box":{"x0":2,"x1":94,"y0":1,"y1":29,"hw":10},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Katseye_in_Seattle.jpg","parts":3,"heads_box":{"x0":9,"x1":91,"y0":13,"y1":41,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Kep1er_Nov'24.png","parts":3,"heads_box":{"x0":5,"x1":95,"y0":17,"y1":47,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Kep1er_leaving_for_promotions_in_Japan_through_Gimpo_International_Airport_on_November_19,_2023.jpg","parts":3,"heads_box":{"x0":3,"x1":98,"y0":14,"y1":36,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 9 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Key_Onew_at_the_SHINee_World_Concert_II_in_Taiwan_09.jpg","parts":2,"heads_box":{"x0":32,"x1":57,"y0":1,"y1":46,"hw":22},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Key_for_Marie_Claire_Magazine_August_Issue_2021_03.jpg","parts":2,"heads_box":{"x0":34,"x1":56,"y0":6,"y1":40,"hw":18},"note":"2 cards: the 11:8.5 window keeps all 1 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Kim_Ji-soo_in_Sydney_on_June_15th,_2019_05.png","parts":2,"heads_box":{"x0":39,"x1":63,"y0":16,"y1":41,"hw":20},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/26","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":26},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Kiss_of_Life_at_showcase_for_promotions_of_Midas_Touch_on_April_3,_2024.jpg","parts":3,"heads_box":{"x0":8,"x1":89,"y0":2,"y1":41,"hw":12},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people once its focal point moves to 50/0","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Kiss_of_Life_at_the_Moore_Theatre_in_Seattle.jpg","parts":2,"heads_box":{"x0":16,"x1":76,"y0":3,"y1":53,"hw":10},"note":"2 cards: the 11:8.5 window keeps all 4 people once its focal point moves to 50/2","focal_from":{"x":50,"y":55},"focal":{"x":50,"y":2},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Korea_KPOP_World_Festival_13.jpg","parts":3,"heads_box":{"x0":5,"x1":98,"y0":17,"y1":45,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 12 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:LG_시네마_3D_TV_새_모델_‘소녀시대’_영입.jpg","parts":2,"heads_box":{"x0":8,"x1":95,"y0":26,"y1":45,"hw":7},"note":"2 cards: the 11:8.5 window keeps all 9 people once its focal point moves to 56/50","focal_from":{"x":50,"y":50},"focal":{"x":56,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:LOONA_(%EC%9D%B4%EB%8B%AC%EC%9D%98_%EC%86%8C%EB%85%80)_Flip_That_Media_Showcase.jpg","parts":3,"heads_box":{"x0":3,"x1":98,"y0":12,"y1":31,"hw":5},"note":"To review: someone would be cut even in 3 cards (12 people in the photo)","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":45},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Le_Sserafim_at_the_2026_Golden_Disc_Awards.png","parts":3,"heads_box":{"x0":9,"x1":100,"y0":0,"y1":31,"hw":12},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Le_Sserafim_in_Manila_(2025).jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Le_Sserafim_in_Tacoma.jpg","parts":2,"heads_box":{"x0":16,"x1":89,"y0":6,"y1":27,"hw":7},"note":"2 cards: the 11:8.5 window keeps all 5 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Le_Sserafim_in_Tacoma_-_Image_2.jpg","parts":3,"heads_box":{"x0":9,"x1":94,"y0":17,"y1":46,"hw":6},"note":"To review: someone would be cut even in 3 cards (5 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Lee_Felix_of_Stray_Kids_at_the_HERA_photocall,_17_April_2026_(1).png","parts":2,"heads_box":{"x0":39,"x1":66,"y0":5,"y1":56,"hw":24},"note":"2 cards: the 11:8.5 window keeps all 1 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Lee_Know_of_Stray_Kids,_September_2,_2025_(4).png","parts":2,"heads_box":{"x0":39,"x1":59,"y0":5,"y1":22,"hw":15},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/5","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":5},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Loosemble_(54145401082).jpg","parts":2,"heads_box":{"x0":37,"x1":72,"y0":0,"y1":38,"hw":12},"note":"2 cards: the 11:8.5 window keeps all 2 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Loosemble_(54145401722).jpg","parts":2,"heads_box":{"x0":16,"x1":85,"y0":10,"y1":30,"hw":5},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":55},"focal":{"x":50,"y":55},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Loosemble_(54146252066).jpg","parts":2,"heads_box":{"x0":28,"x1":82,"y0":5,"y1":43,"hw":8},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Loossemble_at_Incheon_Airport_on_140923_(1).png","parts":3,"heads_box":{"x0":3,"x1":95,"y0":4,"y1":31,"hw":9},"note":"To review: someone would be cut even in 3 cards (5 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:MMA_2023_NCT_Dream_1.jpg","parts":3,"heads_box":{"x0":8,"x1":95,"y0":4,"y1":30,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people once its focal point moves to 50/7","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":7},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:MMA_2023_NCT_Dream_2.jpg","parts":3,"heads_box":{"x0":10,"x1":93,"y0":10,"y1":34,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:MMA_2023_Riize_1.jpg","parts":3,"heads_box":{"x0":10,"x1":90,"y0":3,"y1":28,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/1","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":1},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:MMA_2023_Riize_2.jpg","parts":3,"heads_box":{"x0":10,"x1":90,"y0":9,"y1":31,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/38","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":38},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:MMA_2023_STAYC.jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Mamamoo_Moonbyul_in_2024_(1)_04.jpg","parts":2,"heads_box":{"x0":29,"x1":63,"y0":10,"y1":41,"hw":24},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/12","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":12},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Mamamoo_솔라(Solar)_240413.jpg","parts":2,"heads_box":{"x0":37,"x1":73,"y0":7,"y1":37,"hw":24},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/6","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":6},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Minnie_of_(G)I-dle_in_2020_04.png","parts":2,"heads_box":null,"note":"2 cards by the ratio (1.12): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Miss_A_2013.jpg","parts":3,"heads_box":{"x0":7,"x1":94,"y0":11,"y1":51,"hw":11},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people once its focal point moves to 50/34","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":34},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Miss_A_at_2014_K-Pop_Awards_red_carpet_01.jpg","parts":3,"heads_box":{"x0":11,"x1":97,"y0":4,"y1":34,"hw":14},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 3 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Miss_A_at_Severance_Hospital,_5_December_2013.jpg","parts":3,"heads_box":{"x0":8,"x1":85,"y0":17,"y1":38,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Miss_A_from_acrofan.jpg","parts":2,"heads_box":{"x0":7,"x1":91,"y0":3,"y1":24,"hw":10},"note":"2 cards: the 11:8.5 window keeps all 4 people once its focal point moves to 50/2","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":2},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:MonstaX_Live_at_KCON_2016_Los_Angeles_20160731-P1010499_(29203527652).jpg","parts":2,"heads_box":{"x0":29,"x1":73,"y0":41,"y1":52,"hw":3},"note":"2 cards: the 11:8.5 window keeps all 7 people","focal_from":{"x":47,"y":45},"focal":{"x":47,"y":45},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:MonstaX_in_Golden_Disc_Awards_2019.jpg","parts":3,"heads_box":{"x0":2,"x1":93,"y0":1,"y1":23,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Monsta_X_fanmeeting_in_Singapore.jpg","parts":3,"heads_box":{"x0":8,"x1":92,"y0":34,"y1":52,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":55},"focal":{"x":50,"y":55},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:NCT127_-_Fact_Check_press_conference_Oct_6_2023.jpg","parts":3,"heads_box":{"x0":4,"x1":98,"y0":1,"y1":25,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 8 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:NCT_Dream_Top_Ten_Awards,_2022_1.jpg","parts":3,"heads_box":{"x0":6,"x1":97,"y0":4,"y1":31,"hw":8},"note":"To review: someone would be cut even in 3 cards (7 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:NCT_Dream_at_DREAM()SCAPE_Press_Conference_3.png","parts":3,"heads_box":{"x0":3,"x1":96,"y0":4,"y1":29,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/6","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":6},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:NCT_Dream_at_SBS_Power_FM_'Cultwo_Show'_Radio.png","parts":3,"heads_box":{"x0":4,"x1":96,"y0":22,"y1":53,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 9 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:NCT_Dream_at_the_MMA_2023_Awards.jpg","parts":3,"heads_box":{"x0":13,"x1":89,"y0":1,"y1":21,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:NMIXX_(55196436600).jpg","parts":2,"heads_box":{"x0":34,"x1":93,"y0":2,"y1":37,"hw":22},"note":"2 cards: the 11:8.5 window keeps all 2 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:NMIXX_CHANGE_UP_MIXX_LAB_IN_TAIPEI_20250419_162436.jpg","parts":3,"heads_box":{"x0":7,"x1":91,"y0":29,"y1":47,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Nmixx_at_Incheon_International_Airport_on_20240718.png","parts":3,"heads_box":{"x0":4,"x1":97,"y0":6,"y1":31,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/16","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":16},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Nmixx_at_Music_Bank_on_20240830.png","parts":3,"heads_box":{"x0":1,"x1":97,"y0":1,"y1":31,"hw":8},"note":"To review: someone would be cut even in 3 cards (9 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Nmixx_in_Frankfurt_20260324_(2).jpg","parts":3,"heads_box":{"x0":5,"x1":92,"y0":22,"y1":45,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:P1Harmony_for_Marie_Claire_Korea_01_(cropped).jpg","parts":3,"heads_box":{"x0":10,"x1":91,"y0":17,"y1":53,"hw":11},"note":"To review: someone would be cut even in 3 cards (6 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:PN_Woodland.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.78): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:PURPLE_KISS_211001.jpg","parts":3,"heads_box":{"x0":5,"x1":97,"y0":26,"y1":51,"hw":6},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Park_Jin-young_and_Jackson_Wang_at_a_fansigning_event_in_Sinchon,_10_December_2017_02.jpg","parts":2,"heads_box":{"x0":9,"x1":90,"y0":4,"y1":47,"hw":30},"note":"2 cards: the 11:8.5 window keeps all 2 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Park_Jinyoung_and_JB_in_2015.jpg","parts":3,"heads_box":{"x0":9,"x1":91,"y0":0,"y1":58,"hw":25},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 2 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Pentagon_190327.png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Red_Velvet_at_Lotte_World_Happy_concert_01.jpg","parts":2,"heads_box":{"x0":25,"x1":66,"y0":4,"y1":46,"hw":17},"note":"2 cards: the 11:8.5 window keeps all 2 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Riize_-_2023_Love_Your_W_press_line.png","parts":3,"heads_box":{"x0":2,"x1":98,"y0":3,"y1":38,"hw":10},"note":"To review: someone would be cut even in 3 cards (6 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Riize_at_the_2024_Melon_Music_Awards.png","parts":3,"heads_box":{"x0":4,"x1":97,"y0":3,"y1":28,"hw":8},"note":"To review: someone would be cut even in 3 cards (6 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:SEVENTEEN(세븐틴)_-_'Ready_to_love'_응원법_3m_25s.jpg","parts":3,"heads_box":{"x0":3,"x1":96,"y0":2,"y1":45,"hw":7},"note":"To review: someone would be cut even in 3 cards (13 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:STAYC_Ending_Pose.jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:STAYC_in_Seattle.jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Sana,_Chaeyoung,_Jeongyeon_and_Nayeon_at_Gaon_Awards_on_January_23,_2019_(1).jpg","parts":3,"heads_box":{"x0":30,"x1":98,"y0":2,"y1":52,"hw":16},"note":"3 cards: on the thumbnail the 11:8.5 window cuts someone, the 16.5:8.5 window keeps all 3 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:SeventeenSeventyNov082024_06.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.50): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:SeventeenSeventyNov082024_07.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.50): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Sistar.jpg","parts":2,"heads_box":{"x0":31,"x1":71,"y0":18,"y1":34,"hw":5},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Sistar_at_The_70th_Independence_Day_of_Republic_of_Korea_02.jpg","parts":3,"heads_box":{"x0":11,"x1":89,"y0":26,"y1":45,"hw":7},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people","focal_from":{"x":55,"y":50},"focal":{"x":55,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Sistar_in_Insadong.JPG","parts":3,"heads_box":{"x0":6,"x1":71,"y0":14,"y1":56,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 4 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Sistar_performing_on_May_19,_2013_1.jpg","parts":2,"heads_box":{"x0":23,"x1":74,"y0":24,"y1":42,"hw":5},"note":"2 cards: the 11:8.5 window keeps all 4 people","focal_from":{"x":45,"y":50},"focal":{"x":45,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Solar_Mamamoo_2.jpg","parts":2,"heads_box":{"x0":28,"x1":72,"y0":1,"y1":43,"hw":34},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Sony_Ericsson_txt_pro_(Black)_-_Front_(Closed).jpg","parts":2,"heads_box":null,"note":"2 cards by the ratio (0.75): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Stay%D0%A1_in_Incheon_Airport,_July_24,_2024.png","parts":3,"heads_box":{"x0":6,"x1":94,"y0":3,"y1":30,"hw":8},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:T-ara_2026_Fan_Concert.png","parts":3,"heads_box":{"x0":6,"x1":97,"y0":8,"y1":41,"hw":10},"note":"To review: someone would be cut even in 3 cards (4 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Taemin_Lee_and_Jonghyun_Kim_at_the_SHINee_World_Concert_II_in_Taiwan_02.jpg","parts":3,"heads_box":{"x0":21,"x1":67,"y0":0,"y1":56,"hw":25},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 2 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Taemin_at_SHINee_World_V_in_Jakarta_02.jpg","parts":3,"heads_box":{"x0":11,"x1":67,"y0":2,"y1":54,"hw":48},"note":"To review: someone would be cut even in 3 cards (1 people in the photo)","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":true,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Threads_Communities_interface_screenshot.png","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.78): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Tomorrow_X_Together_at_a_Dior_event,_April_18,_2025.png","parts":3,"heads_box":{"x0":9,"x1":92,"y0":0,"y1":29,"hw":9},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 5 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Toshodaiji-GoldenHall(NT).jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.50): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:VIVIZ_(%EB%B9%84%EB%B9%84%EC%A7%80)_%EB%AE%A4%EC%A7%81%EB%B1%85%ED%81%AC_%EC%B6%9C%EA%B7%BC%EA%B8%B8_VIVIZ_Music_Bank_(4K)_0-48_screenshot.jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:VIVIZ_at_Billboard_K_POWER_100,_27_August_2024_04.png","parts":3,"heads_box":{"x0":12,"x1":88,"y0":3,"y1":42,"hw":15},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 3 people once its focal point moves to 50/0","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Vanity_license_plate_from_Virginia_\"DONT_TXT\"_01.jpg","parts":3,"heads_box":null,"note":"3 cards by the ratio (1.33): the 16.5:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Viviz_at_SBS_Radio_on_February_13,_2022.jpg","parts":3,"heads_box":{"x0":13,"x1":94,"y0":17,"y1":61,"hw":13},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 3 people once its focal point moves to 100/50","focal_from":{"x":50,"y":50},"focal":{"x":100,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Wine_and_cake_at_home_in_Tlokweng.jpg","parts":2,"heads_box":null,"note":"2 cards by the ratio (0.75): the 11:8.5 window keeps the whole width","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"ratio"},{"page":"https://commons.wikimedia.org/wiki/File:Winner_at_6th_Melon_Music_Awards_01.jpg","parts":3,"heads_box":{"x0":7,"x1":93,"y0":8,"y1":47,"hw":12},"note":"3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 6 people once its focal point moves to 50/21","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":21},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Yeji_of_Itzy_on_Incheon_Airport,_September_26,_2024.png","parts":2,"heads_box":{"x0":24,"x1":76,"y0":1,"y1":43,"hw":38},"note":"2 cards: the 11:8.5 window keeps all 1 people once its focal point moves to 50/0","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":0},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:ZEROBASEONE_@_40th_Golden_Disc_Awards_(20260110).jpg","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:Zerobaseone_at_public_event_in_South_Korea,_May_2026.png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":45},"focal":{"x":50,"y":45},"review":false,"rejected":true,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:김동한_@_KBS_MUSIC_BANK_26s.jpg","parts":2,"heads_box":{"x0":38,"x1":71,"y0":1,"y1":45,"hw":28},"note":"2 cards: the 11:8.5 window keeps all 1 people","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":false,"by":"thumbnail"},{"page":"https://commons.wikimedia.org/wiki/File:아래_빛나는_@LA_(NCT_127)_01.png","parts":2,"heads_box":null,"note":"Rejected by the lot 7 thumbnail check: a person seems under 18","focal_from":{"x":50,"y":50},"focal":{"x":50,"y":50},"review":false,"rejected":true,"by":"thumbnail"}]}$parts$::jsonb;
  d record;
  p record;
  v_found integer;
  v_two integer := 0;
  v_three integer := 0;
  v_moved integer := 0;
  v_kept integer := 0;
  v_review integer := 0;
  v_rejected integer := 0;
  v_missing integer := 0;
  v_status text;
  v_note text;
  v_reason text;
  v_fx integer;
  v_fy integer;
  v_nx integer;
  v_ny integer;
  v_small boolean;
begin
  perform set_config('lock_timeout', '5s', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '118-group-parts: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_photos') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_entities') is null
     or to_regclass('public.cards_packs') is null or to_regclass('public.cards_owned') is null then
    raise exception '118-group-parts: the cards tables are missing (run 001 to 003 first), nothing changed';
  end if;
  if to_regprocedure('public.cards_build_catalog()') is null
     or to_regprocedure('public.cards_catalog_append(boolean)') is null
     or to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)') is null
     or to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)') is null then
    raise exception '118-group-parts: cards_build_catalog (103, 117), cards_catalog_append (114), cards_open or cards_craft (110) is missing, nothing changed';
  end if;

  -- Already applied: the four functions are this file's. A second run changes nothing.
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_build_catalog()');
  if v_md5 = '00b63db362c757cb3c4138c98afba368' then v_ok := v_ok + 1; end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_catalog_append(boolean)');
  if v_md5 = 'bf4e41c1827742d2463d8e4ef5a15144' then v_ok := v_ok + 1; end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)');
  if v_md5 = '01ba80721797a59fa83b113e29971969' then v_ok := v_ok + 1; end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)');
  if v_md5 = 'e81a6565c61b3a26dc138f8de8a2a484' then v_ok := v_ok + 1; end if;
  if v_ok = 4 then
    raise notice '118-group-parts: already applied, nothing changed';
    return;
  end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_build_catalog()');
  if v_md5 <> '3267a298f23abdbdaf7d709885d45c79' then
    raise exception '118-group-parts: cards_build_catalog() is not the version of 117 (md5 %), nothing changed', v_md5;
  end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_catalog_append(boolean)');
  if v_md5 <> 'd015068e7ae143bc9e24655e74fe2e5d' then
    raise exception '118-group-parts: cards_catalog_append() is not the version of 114 (md5 %), nothing changed', v_md5;
  end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)');
  if v_md5 <> '3233e2628cae60bb7bf4f76149cf7952' then
    raise exception '118-group-parts: cards_open() is not the version of 110 (md5 %), nothing changed', v_md5;
  end if;
  select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) into v_md5 from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)');
  if v_md5 <> '707bf7425f0b803fb4e9c8b1d34d7d4a' then
    raise exception '118-group-parts: cards_craft() is not the version of 110 (md5 %), nothing changed', v_md5;
  end if;

  -- The guard: no pack opened, no card owned, no panorama owned.
  if exists (select 1 from public.cards_packs) then
    raise exception '118-group-parts: a pack was opened (cards_packs holds rows), the catalog numbers cannot change, nothing changed';
  end if;
  if exists (select 1 from public.cards_owned) then
    raise exception '118-group-parts: a player owns a card (cards_owned holds rows), the catalog numbers cannot change, nothing changed';
  end if;
  if to_regclass('public.cards_panoramas_owned') is not null then
    execute 'select exists (select 1 from public.cards_panoramas_owned)' into v_has;
    if v_has then
      raise exception '118-group-parts: a player owns a panorama (cards_panoramas_owned holds rows), nothing changed';
    end if;
  end if;

  -- ---------- the columns of cards_photos ----------
  alter table public.cards_photos add column if not exists parts smallint constraint cards_photos_parts_check check (parts is null or parts in (2, 3));
  alter table public.cards_photos add column if not exists file_parts smallint constraint cards_photos_file_parts_check check (file_parts is null or file_parts in (2, 3));
  alter table public.cards_photos add column if not exists file_pano boolean not null default false;
  alter table public.cards_photos add column if not exists heads_box jsonb
    constraint cards_photos_heads_box_check check (heads_box is null or (jsonb_typeof(heads_box) = 'object' and heads_box ?& array['x0', 'x1', 'y0', 'y1', 'hw']));
  alter table public.cards_photos add column if not exists parts_note text;

  -- the part of a card: 0 a whole card, 1 to 3 the parts of a group photo
  alter table public.cards_catalog drop constraint if exists cards_catalog_part_check;
  alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 3);

  -- ---------- the panoramas ----------
  create table if not exists public.cards_panoramas (
    pano_no integer constraint cards_panoramas_pkey primary key constraint cards_panoramas_pano_no_check check (pano_no > 0),
    num text not null constraint cards_panoramas_num_key unique constraint cards_panoramas_num_check check (num ~ '^P-[0-9]{4,}$'),
    entity_id text not null constraint cards_panoramas_entity_id_fkey references public.cards_entities(id) on delete cascade,
    rarity text not null,
    edition text not null,
    photo_id bigint constraint cards_panoramas_photo_id_fkey references public.cards_photos(id) on delete set null,
    parts smallint not null constraint cards_panoramas_parts_check check (parts in (2, 3)),
    first_card integer not null constraint cards_panoramas_first_card_fkey references public.cards_catalog(card_no) on delete cascade,
    constraint cards_panoramas_entity_rarity_key unique (entity_id, rarity)
  );
  create table if not exists public.cards_panoramas_owned (
    user_id uuid not null constraint cards_panoramas_owned_user_id_fkey references auth.users(id) on delete cascade,
    pano_no integer not null constraint cards_panoramas_owned_pano_no_fkey references public.cards_panoramas(pano_no) on delete cascade,
    granted_at timestamptz not null default now(),
    source text not null constraint cards_panoramas_owned_source_check check (source in ('pack', 'craft')),
    pack_id uuid constraint cards_panoramas_owned_pack_id_fkey references public.cards_packs(id) on delete set null,
    seen boolean not null default false,
    constraint cards_panoramas_owned_pkey primary key (user_id, pano_no)
  );
  create index if not exists cards_panoramas_owned_pano_idx on public.cards_panoramas_owned (pano_no);
  create table if not exists public.cards_parts_log (
    photo_id bigint constraint cards_parts_log_pkey primary key,
    status text,
    review_note text,
    focal_x integer,
    focal_y integer,
    small_2x boolean
  );
  alter table public.cards_panoramas enable row level security;
  alter table public.cards_panoramas_owned enable row level security;
  alter table public.cards_parts_log enable row level security;
  revoke all on table public.cards_panoramas, public.cards_panoramas_owned, public.cards_parts_log from public, anon, authenticated;
  grant all on table public.cards_panoramas, public.cards_panoramas_owned, public.cards_parts_log to service_role;

  -- ---------- the data: the parts of the group photos, by source_page ----------
  for d in select x.page, x.parts, nullif(x.heads_box, 'null'::jsonb) as heads_box, x.note, nullif(x.focal_from, 'null'::jsonb) as focal_from,
                  nullif(x.focal, 'null'::jsonb) as focal, coalesce(x.review, false) as review, coalesce(x.rejected, false) as rejected
             from jsonb_to_recordset(v_data -> 'photos') as x(page text, parts integer, heads_box jsonb, note text, focal_from jsonb, focal jsonb, review boolean, rejected boolean) loop
    v_found := 0;
    for p in select ph.id, ph.status, ph.review_note, ph.focal_x, ph.focal_y, ph.small_2x, ph.source_width, ph.source_height
               from public.cards_photos ph join public.cards_entities e on e.id = ph.entity_id
              where ph.source_page = d.page and e.kind = 'group' order by ph.id loop
      v_found := v_found + 1;
      v_status := p.status;
      v_note := p.review_note;
      v_fx := p.focal_x;
      v_fy := p.focal_y;
      if d.rejected then
        if p.status <> 'rejected' then
          v_status := 'rejected';
          v_note := 'Rejected by the lot 7 thumbnail check: a person seems under 18';
          v_rejected := v_rejected + 1;
        end if;
      elsif d.review then
        v_reason := case when d.note like 'To review: %' then d.note else 'To review: ' || d.note end;
        if p.status in ('auto', 'approved') then
          v_status := 'pending';
          v_note := v_reason;
          v_review := v_review + 1;
        elsif p.status = 'pending' and position(v_reason in coalesce(p.review_note, '')) = 0 then
          v_note := coalesce(nullif(p.review_note, '') || ' | ', '') || v_reason;
          v_review := v_review + 1;
        end if;
      end if;
      if d.focal is not null then
        v_nx := (d.focal ->> 'x')::integer;
        v_ny := (d.focal ->> 'y')::integer;
        if p.focal_x is distinct from v_nx or p.focal_y is distinct from v_ny then
          if d.focal_from is not null and p.focal_x is not distinct from (d.focal_from ->> 'x')::integer and p.focal_y is not distinct from (d.focal_from ->> 'y')::integer then
            v_fx := v_nx;
            v_fy := v_ny;
            v_moved := v_moved + 1;
          else
            v_kept := v_kept + 1;
            raise notice '118-group-parts: focal point kept for % (the owner''s %/%, the verdict was read at %/%)', d.page, p.focal_x, p.focal_y,
              coalesce(d.focal_from ->> 'x', '?'), coalesce(d.focal_from ->> 'y', '?');
          end if;
        end if;
      end if;
      -- the photo's own 2x flag follows its window: a part (the narrowest is floor(window / parts)) under 640 px; for 2 parts it is today's value
      v_small := p.small_2x;
      if p.source_width is not null and p.source_height is not null then
        v_small := floor(least(p.source_width::numeric, p.source_height::numeric * (d.parts * 5.5) / 8.5))::integer / d.parts < 640;
      end if;
      if v_status is distinct from p.status or v_note is distinct from p.review_note or v_fx is distinct from p.focal_x or v_fy is distinct from p.focal_y
         or v_small is distinct from p.small_2x then
        insert into public.cards_parts_log (photo_id, status, review_note, focal_x, focal_y, small_2x) values (p.id, p.status, p.review_note, p.focal_x, p.focal_y, p.small_2x)
        on conflict (photo_id) do nothing;
      end if;
      update public.cards_photos set parts = d.parts, heads_box = d.heads_box, parts_note = d.note, focal_x = v_fx, focal_y = v_fy, small_2x = v_small where id = p.id;
      if v_status is distinct from p.status or v_note is distinct from p.review_note then
        update public.cards_photos set status = v_status, review_note = v_note where id = p.id;
      end if;
      if d.parts = 3 then v_three := v_three + 1; else v_two := v_two + 1; end if;
    end loop;
    if v_found = 0 then v_missing := v_missing + 1; end if;
  end loop;

  -- ---------- the four functions ----------
  create or replace function public.cards_build_catalog()
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    c_ladder constant text[] := array['C', 'U', 'R', 'SR', 'UR', 'L'];
    c_edition constant jsonb := '{"C": "std", "U": "stage", "R": "holo", "SR": "era", "UR": "gold", "L": "full"}'::jsonb;
    e record;
    v_ids bigint[];
    v_full boolean[];
    v_stage boolean[];
    v_cw integer[];
    v_shown boolean[];
    v_open text[];
    v_pick jsonb;
    v_used bigint[];
    v_lock jsonb;
    v_old jsonb;
    v_n integer;
    v_i integer;
    v_j integer;
    v_r text;
    v_id bigint;
    v_cwi integer;
    v_np integer[];
    v_pn integer;
    v_k integer;
    v_panos integer := 0;
    v_no integer := 0;
    v_subjects integer := 0;
    v_waiting integer := 0;
  begin
    if exists (select 1 from public.cards_owned) then
      raise exception 'cards_build_catalog: a player owns a card, the catalog numbers cannot change';
    end if;
    if exists (select 1 from public.cards_packs) then
      raise exception 'cards_build_catalog: a pack was opened, the catalog numbers cannot change';
    end if;
    if exists (select 1 from public.cards_panoramas_owned) then
      raise exception 'cards_build_catalog: a player owns a panorama, the catalog numbers cannot change';
    end if;
    delete from public.cards_catalog where true;
    delete from public.cards_panoramas where true;
    for e in select en.id, en.kind, en.lock_reasons from public.cards_entities en
              where en.kind in ('idol', 'group') and exists (select 1 from public.cards_photos p where p.entity_id = en.id)
              order by en.sort_key, en.id loop
      -- The live photos, best first: the researcher's quality, then the pixels of the crop window, then the most recent, then the slot.
      select array_agg(x.id order by x.rk), array_agg(x.full_ok order by x.rk), array_agg(x.stage order by x.rk),
             array_agg(x.cw order by x.rk), array_agg(x.shown order by x.rk), array_agg(x.np order by x.rk)
        into v_ids, v_full, v_stage, v_cw, v_shown, v_np
        from (select p.id, p.stage, w.cw, n.np,
                     -- lot 7: Full Art needs every part (the narrowest is floor(window / parts)) to be at least 640 px wide
                     w.cw / n.np >= 640 as full_ok,
                     (p.storage_path is not null or p.source_path is not null) as shown,
                     row_number() over (order by coalesce(p.quality, 3) desc, w.cw / n.np desc, w.cw desc, p.event_date desc nulls last, p.slot) as rk
                from public.cards_photos p
                cross join lateral (select case when e.kind = 'group' then coalesce(p.parts, 2)::integer else 1 end as np) n
                cross join lateral (select floor(least(p.source_width::numeric,
                                      p.source_height::numeric * (case when e.kind = 'group' then n.np * 5.5 else 5.5 end) / 8.5))::integer as cw) w
               where p.entity_id = e.id and p.status in ('auto', 'approved')
                 and p.source_width is not null and p.source_height is not null) x;
      v_n := least(coalesce(cardinality(v_ids), 0), 6);
      if v_n < 2 then
        -- One approved photo (or none yet): no edition, the subject waits for a second photo (owner decision: packs from 2 photos).
        update public.cards_entities set active = false, lock_reasons = '{}'::jsonb where id = e.id;
        v_waiting := v_waiting + 1;
        continue;
      end if;
      v_open := c_ladder[1:v_n];
      v_pick := '{}'::jsonb;
      v_used := '{}';
      v_lock := '{}'::jsonb;
      -- Full Art: the best photo that gives an honest 2x of the whole card; none, and Full Art stays locked.
      if 'L' = any (v_open) then
        v_id := null;
        for v_i in 1 .. cardinality(v_ids) loop
          if v_full[v_i] then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is null then
          v_open := array_remove(v_open, 'L');
          v_lock := v_lock || '{"L": "size"}'::jsonb;
        else
          v_pick := v_pick || jsonb_build_object('L', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
      -- Stage: a stage photo when there is one, the lowest rated, so the best photos stay on the higher editions.
      if 'U' = any (v_open) then
        v_id := null;
        for v_i in reverse cardinality(v_ids) .. 1 loop
          if v_stage[v_i] and not (v_ids[v_i] = any (v_used)) then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is not null then
          v_pick := v_pick || jsonb_build_object('U', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
      -- The other editions, from the highest down, take the remaining photos best first.
      for v_i in reverse cardinality(v_open) .. 1 loop
        v_r := v_open[v_i];
        continue when v_pick ->> v_r is not null;
        v_id := null;
        for v_j in 1 .. cardinality(v_ids) loop
          if not (v_ids[v_j] = any (v_used)) then v_id := v_ids[v_j]; exit; end if;
        end loop;
        v_pick := v_pick || jsonb_build_object(v_r, v_id);
        v_used := v_used || v_id;
      end loop;
      -- Why an edition is missing: no photo for it yet, or (Full Art) no photo large enough; an owner's 'hiatus' stays.
      v_old := coalesce(e.lock_reasons, '{}'::jsonb);
      foreach v_r in array c_ladder loop
        if not (v_r = any (v_open)) then
          v_lock := v_lock || jsonb_build_object(v_r, case when v_old ->> v_r = 'hiatus' then 'hiatus' else coalesce(v_lock ->> v_r, 'photo') end);
        end if;
      end loop;
      -- The cards, in ladder order; a group gives a pair with consecutive numbers.
      foreach v_r in array v_open loop
        v_id := (v_pick ->> v_r)::bigint;
        v_i := array_position(v_ids, v_id);
        v_cwi := v_cw[v_i];
        if e.kind = 'group' then
          -- lot 7: the parts of the photo (2 or 3), consecutive numbers; part k spans [floor(W (k - 1) / n), floor(W k / n)) of the window W
          v_pn := v_np[v_i];
          for v_k in 1 .. v_pn loop
            insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
            values (v_no + v_k, 'BV1-' || lpad((v_no + v_k)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], v_k,
                    (v_cwi * v_k / v_pn - v_cwi * (v_k - 1) / v_pn) < 640);
          end loop;
          v_no := v_no + v_pn;
        else
          insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
          values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 0, v_cwi < 640);
          v_no := v_no + 1;
        end if;
      end loop;
      update public.cards_entities set active = true, lock_reasons = v_lock where id = e.id;
      v_subjects := v_subjects + 1;
    end loop;
    -- lot 7: one panorama per group edition, numbered P-0001 and up in the order of the catalog (its first part's number)
    insert into public.cards_panoramas (pano_no, num, entity_id, rarity, edition, photo_id, parts, first_card)
    select row_number() over (order by c.card_no), 'P-' || lpad((row_number() over (order by c.card_no))::text, 4, '0'), c.entity_id, c.rarity, c.edition, c.photo_id,
           (select max(h.part) from public.cards_catalog h where h.entity_id = c.entity_id and h.rarity = c.rarity), c.card_no
      from public.cards_catalog c where c.part = 1;
    get diagnostics v_panos = row_count;
    return jsonb_build_object('subjects', v_subjects, 'waiting', v_waiting, 'cards', v_no, 'panoramas', v_panos,
      'by_rarity', coalesce((select jsonb_object_agg(x.rarity, x.n) from (select rarity, count(*) as n from public.cards_catalog group by rarity) x), '{}'::jsonb),
      'not_shown', (select count(*) from public.cards_catalog where not in_packs));
  end
  $f$;
  revoke all on function public.cards_build_catalog() from public, anon, authenticated;
  grant execute on function public.cards_build_catalog() to service_role;

  create or replace function public.cards_catalog_append(p_dry_run boolean default true)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    c_ladder constant text[] := array['C', 'U', 'R', 'SR', 'UR', 'L'];
    c_edition constant jsonb := '{"C": "std", "U": "stage", "R": "holo", "SR": "era", "UR": "gold", "L": "full"}'::jsonb;
    e record;
    v_ids bigint[];
    v_full boolean[];
    v_stage boolean[];
    v_cw integer[];
    v_shown boolean[];
    v_have text[];
    v_missing text[];
    v_open text[];
    v_pick jsonb;
    v_used bigint[];
    v_lock jsonb;
    v_old jsonb;
    v_final text[];
    v_k integer;
    v_i integer;
    v_j integer;
    v_r text;
    v_id bigint;
    v_cwi integer;
    v_base integer;
    v_no integer;
    v_cards integer := 0;
    v_subjects integer := 0;
    v_new integer := 0;
    v_ext integer := 0;
    v_waiting integer := 0;
    v_not_shown integer := 0;
    v_by jsonb := '{}'::jsonb;
    v_in boolean;
    v_size boolean;
    v_np integer[];
    v_pn integer;
    v_m integer;
    v_pano integer;
    v_panos integer := 0;
  begin
    if p_dry_run is null then
      raise exception 'cards_catalog_append: null';
    end if;
    perform set_config('lock_timeout', '5s', true);
    if not p_dry_run then
      -- Two appends (or an append and a rebuild) never run together: the second waits here and then reads the first one's rows.
      lock table public.cards_catalog in share row exclusive mode;
    end if;
    select coalesce(max(card_no), 0) into v_base from public.cards_catalog;
    v_no := v_base;
    select coalesce(max(pano_no), 0) into v_pano from public.cards_panoramas;
    for e in select en.id, en.kind, en.lock_reasons from public.cards_entities en
              where en.kind in ('idol', 'group') and exists (select 1 from public.cards_photos p where p.entity_id = en.id)
              order by en.sort_key, en.id loop
      select coalesce(array_agg(distinct c.rarity), '{}'), coalesce(array_agg(c.photo_id) filter (where c.photo_id is not null), '{}')
        into v_have, v_used from public.cards_catalog c where c.entity_id = e.id;
      v_in := cardinality(v_have) > 0;
      -- The live photos no card uses yet, best first (the ranking of cards_build_catalog()).
      select array_agg(x.id order by x.rk), array_agg(x.full_ok order by x.rk), array_agg(x.stage order by x.rk),
             array_agg(x.cw order by x.rk), array_agg(x.shown order by x.rk), array_agg(x.np order by x.rk)
        into v_ids, v_full, v_stage, v_cw, v_shown, v_np
        from (select p.id, p.stage, w.cw, n.np,
                     -- lot 7: Full Art needs every part (the narrowest is floor(window / parts)) to be at least 640 px wide
                     w.cw / n.np >= 640 as full_ok,
                     (p.storage_path is not null or p.source_path is not null) as shown,
                     row_number() over (order by coalesce(p.quality, 3) desc, w.cw / n.np desc, w.cw desc, p.event_date desc nulls last, p.slot) as rk
                from public.cards_photos p
                cross join lateral (select case when e.kind = 'group' then coalesce(p.parts, 2)::integer else 1 end as np) n
                cross join lateral (select floor(least(p.source_width::numeric,
                                      p.source_height::numeric * (case when e.kind = 'group' then n.np * 5.5 else 5.5 end) / 8.5))::integer as cw) w
               where p.entity_id = e.id and p.status in ('auto', 'approved')
                 and p.source_width is not null and p.source_height is not null
                 and not (p.id = any (v_used))) x;
      -- The free editions, from the bottom: one per unused photo (a new subject: the whole ladder, and 2 photos at least).
      v_missing := array(select r from unnest(c_ladder) with ordinality as t(r, o) where not (r = any (v_have)) order by o);
      v_k := least(coalesce(cardinality(v_ids), 0), cardinality(v_missing));
      if v_k = 0 or (not v_in and v_k < 2) then
        if not v_in then v_waiting := v_waiting + 1; end if;
        continue;
      end if;
      v_open := v_missing[1:v_k];
      v_pick := '{}'::jsonb;
      v_used := '{}';
      v_size := false;
      if 'L' = any (v_open) then
        v_id := null;
        for v_i in 1 .. cardinality(v_ids) loop
          if v_full[v_i] then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is null then
          v_open := array_remove(v_open, 'L');
          v_size := true;
        else
          v_pick := v_pick || jsonb_build_object('L', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
      if 'U' = any (v_open) then
        v_id := null;
        for v_i in reverse cardinality(v_ids) .. 1 loop
          if v_stage[v_i] and not (v_ids[v_i] = any (v_used)) then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is not null then
          v_pick := v_pick || jsonb_build_object('U', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
      for v_i in reverse cardinality(v_open) .. 1 loop
        v_r := v_open[v_i];
        continue when v_pick ->> v_r is not null;
        v_id := null;
        for v_j in 1 .. cardinality(v_ids) loop
          if not (v_ids[v_j] = any (v_used)) then v_id := v_ids[v_j]; exit; end if;
        end loop;
        v_pick := v_pick || jsonb_build_object(v_r, v_id);
        v_used := v_used || v_id;
      end loop;
      v_final := v_have || v_open;
      v_old := coalesce(e.lock_reasons, '{}'::jsonb);
      v_lock := '{}'::jsonb;
      foreach v_r in array c_ladder loop
        if not (v_r = any (v_final)) then
          v_lock := v_lock || jsonb_build_object(v_r, case when v_old ->> v_r = 'hiatus' then 'hiatus' when v_r = 'L' and v_size then 'size' else 'photo' end);
        end if;
      end loop;
      if cardinality(v_open) = 0 then
        -- Only Full Art was free and no photo is large enough: no card to add, the reason is recorded on a write.
        if not p_dry_run and v_lock is distinct from v_old then
          update public.cards_entities set lock_reasons = v_lock where id = e.id;
        end if;
        continue;
      end if;
      foreach v_r in array v_open loop
        v_id := (v_pick ->> v_r)::bigint;
        v_i := array_position(v_ids, v_id);
        v_cwi := v_cw[v_i];
        v_pn := case when e.kind = 'group' then v_np[v_i] else 1 end;
        if not p_dry_run then
          if e.kind = 'group' then
            -- lot 7: the parts of the photo (2 or 3), then its panorama after the highest P number
            for v_m in 1 .. v_pn loop
              insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
              values (v_no + v_m, 'BV1-' || lpad((v_no + v_m)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], v_m,
                      (v_cwi * v_m / v_pn - v_cwi * (v_m - 1) / v_pn) < 640);
            end loop;
            v_pano := v_pano + 1;
            insert into public.cards_panoramas (pano_no, num, entity_id, rarity, edition, photo_id, parts, first_card)
            values (v_pano, 'P-' || lpad(v_pano::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_pn, v_no + 1);
          else
            insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
            values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 0, v_cwi < 640);
          end if;
        end if;
        v_j := v_pn;
        if e.kind = 'group' then v_panos := v_panos + 1; end if;
        v_no := v_no + v_j;
        v_cards := v_cards + v_j;
        if not v_shown[v_i] then v_not_shown := v_not_shown + v_j; end if;
        v_by := jsonb_set(v_by, array[v_r], to_jsonb(coalesce((v_by ->> v_r)::integer, 0) + v_j));
      end loop;
      if not p_dry_run then
        update public.cards_entities set active = true, lock_reasons = v_lock where id = e.id;
      end if;
      v_subjects := v_subjects + 1;
      if v_in then v_ext := v_ext + 1; else v_new := v_new + 1; end if;
    end loop;
    return jsonb_build_object('dry_run', p_dry_run, 'cards', v_cards, 'subjects', v_subjects, 'new_subjects', v_new, 'extended_subjects', v_ext,
      'waiting', v_waiting, 'from_no', case when v_cards > 0 then v_base + 1 end, 'to_no', case when v_cards > 0 then v_no end,
      'by_rarity', v_by, 'not_shown', v_not_shown, 'panoramas', v_panos);
  end
  $f$;
  revoke all on function public.cards_catalog_append(boolean) from public, anon, authenticated;
  grant execute on function public.cards_catalog_append(boolean) to service_role;

  create or replace function public.cards_open(
      p_user uuid, p_key text, p_source text, p_theme text, p_focus text, p_draws jsonb, p_now timestamptz default now(),
      p_ads_limit integer default 10, p_bonus_cap integer default 3, p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_n integer;
    v_op text;
    v_hit public.cards_idem%rowtype;
    v_kind text;
    v_theme text;
    v_group text;
    v_stock integer;
    v_anchor timestamptz;
    v_ads integer;
    v_bonus integer;
    v_timer integer;
    v_shards integer;
    v_packs_opened integer;
    v_batch uuid := gen_random_uuid();
    v_i integer;
    v_k integer;
    v_packno integer;
    v_golden boolean;
    v_pity boolean;
    v_cards integer[];
    v_card integer;
    v_pick integer;
    v_c record;
    v_p record;
    v_g integer;
    v_u integer;
    v_new boolean;
    v_pair boolean;
    v_newn integer;
    v_seen integer[];
    v_pack uuid;
    v_out jsonb := '[]'::jsonb;
    v_cards_out jsonb;
    v_pack_ids jsonb := '[]'::jsonb;
    v_before_ids text[];
    v_after_ids text[];
    v_fin jsonb;
    v_owned_before integer;
    v_owned_after integer;
    v_res jsonb;
    v_own_c boolean;
    v_own_p boolean;
    v_best text;
    v_have_hi boolean;
    v_panos integer[];
    v_pano integer;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    if p_source is null or p_source not in ('stock', 'daily', 'focus', 'shards', 'bonus') then raise exception 'cards: source'; end if;
    if p_draws is null or jsonb_typeof(p_draws) <> 'array' then raise exception 'cards: pack'; end if;
    v_n := jsonb_array_length(p_draws);
    if v_n not in (1, 5) or (v_n = 5 and p_source <> 'stock') then raise exception 'cards: pack'; end if;
    v_theme := case when p_source in ('stock', 'shards', 'bonus') then coalesce(p_theme, 'all') else null end;
    if v_theme is not null and v_theme not in ('all', 'girls', 'boys', 'solo') then raise exception 'cards: theme'; end if;
    v_op := 'open:' || p_source || ':' || v_n || ':' || coalesce(v_theme, '') || ':' || coalesce(p_focus, '');

    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;

    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 10, w.seen_at + interval '2 hours');
    v_stock := (r ->> 'stock')::integer;
    v_anchor := case when (r ->> 'paused')::boolean then p_now else (r ->> 'anchor')::timestamptz end;
    v_ads := (r ->> 'ads_today')::integer;
    v_bonus := (r ->> 'bonus_today')::integer;
    v_timer := (r ->> 'timer_today')::integer;
    v_shards := w.shards;

    if p_source = 'stock' then
      if v_stock < v_n then raise exception '%', case when v_n = 1 then 'cards: empty' else 'cards: stack_short' end; end if;
      v_stock := v_stock - v_n;
      v_kind := v_theme;
    elsif p_source = 'shards' then
      if v_shards < 50 then raise exception 'cards: shards'; end if;
      v_shards := v_shards - 50;
      v_kind := v_theme;
    elsif p_source = 'bonus' then
      -- The Kpopdle bonus pack (002's rule, unchanged): earned by a win decided in the database and recorded once per play in cards_bonus_earned,
      -- at most p_bonus_cap a Paris day (CARDS_BONUS_PER_DAY; 0 while the bridges are off). It does not touch the stack.
      if v_n <> 1 then raise exception 'cards: pack'; end if;
      if p_bonus_cap <= 0 or v_bonus >= least(p_bonus_cap, public.cards_bonus_plays(p_user, v_today)) then raise exception 'cards: bonus'; end if;
      v_bonus := v_bonus + 1;
      v_kind := v_theme;
    elsif p_source = 'daily' then
      if exists (select 1 from public.cards_packs p where p.user_id = p_user and p.source = 'daily'
                  and p.opened_at >= v_today::timestamp at time zone 'Europe/Paris' and p.opened_at < (v_today + 1)::timestamp at time zone 'Europe/Paris') then
        raise exception 'cards: daily_used';
      end if;
      v_group := public.cards_daily_group(v_today);
      if v_group is null then raise exception 'cards: pack'; end if;
      v_kind := 'daily';
    else
      if p_focus is null or not exists (select 1 from public.cards_entities where id = p_focus and kind = 'group' and active) then raise exception 'cards: focus'; end if;
      if v_stock < 1 then raise exception 'cards: empty'; end if;
      if public.cards_focus_used(p_user, p_now) then raise exception 'cards: focus_used'; end if;
      v_stock := v_stock - 1;
      v_kind := 'all';
      v_group := p_focus;
    end if;

    select count(*) into v_owned_before from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.in_packs;
    select coalesce(array_agg(x.set_id), '{}') into v_before_ids from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;

    v_packs_opened := w.packs_opened;
    for v_i in 1..v_n loop
      v_packno := v_packs_opened + v_i;
      v_golden := v_packno % 10 = 0;
      v_pity := public.cards_pity_count(p_user) >= 29 and public.cards_pity_pool();
      select array(select (e.value)::integer from jsonb_array_elements_text(p_draws -> (v_i - 1) -> 'c') e(value)) into v_cards;
      if cardinality(v_cards) <> 5 or array_position(v_cards, null) is not null then raise exception 'cards: pack'; end if;
      v_g := nullif(p_draws -> (v_i - 1) ->> 'g', '')::integer;
      v_u := nullif(p_draws -> (v_i - 1) ->> 'u', '')::integer;

      -- Card 5: the Gold card of the guarantee, else the golden pack's Holo-or-better card, else the plain fifth card (never Standard).
      if v_pity then
        if v_u is null then raise exception 'cards: pack'; end if;
        v_cards[5] := v_u;
      elsif v_golden then
        if v_g is null then raise exception 'cards: pack'; end if;
        v_cards[5] := v_g;
      end if;

      -- The checks: every card is in packs and in the pool of this pack kind (the guarantee and the golden rule may leave the pool only when the pool
      -- has no card to give), the fifth card is never Standard, a golden fifth card is Holo or better, a guaranteed one is Gold, a focus pack's
      -- cards 2 and 4 are the group's when the group has a card of their rarity.
      for v_k in 1..5 loop
        v_card := v_cards[v_k];
        select c.rarity, c.entity_id into v_c from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id where c.card_no = v_card and c.in_packs and e.active;
        if not found then raise exception 'cards: pack'; end if;
        if not public.cards_in_pool(v_card, v_kind, v_group) then
          if not (v_k = 5 and v_pity and v_c.rarity = 'UR' and not public.cards_pool_has(v_kind, v_group, array['UR']))
             and not (v_k = 5 and v_golden and not v_pity and v_c.rarity in ('R', 'SR', 'UR', 'L') and not public.cards_pool_has(v_kind, v_group, array['R', 'SR', 'UR', 'L'])) then
            raise exception 'cards: pack';
          end if;
        end if;
        if v_k = 5 then
          if v_c.rarity = 'C' then raise exception 'cards: pack'; end if;
          if v_pity and v_c.rarity <> 'UR' then raise exception 'cards: pack'; end if;
          if v_golden and not v_pity and v_c.rarity not in ('R', 'SR', 'UR', 'L') and public.cards_pool_has(v_kind, v_group, array['R', 'SR', 'UR', 'L']) then raise exception 'cards: pack'; end if;
        end if;
        if p_source = 'focus' and v_k in (2, 4) then
          if not exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id where c.card_no = v_card and (c.entity_id = p_focus or e.group_id = p_focus))
             and exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                          where c.rarity = v_c.rarity and c.in_packs and e.active and (c.entity_id = p_focus or e.group_id = p_focus)) then
            raise exception 'cards: pack';
          end if;
        end if;
      end loop;

      -- The pack: swap a group half for its other half when the player owns exactly one (cards of this pack stored before count), store, count.
      v_seen := '{}';
      v_panos := '{}';
      v_newn := 0;
      v_cards_out := '[]'::jsonb;
      for v_k in 1..5 loop
        v_card := v_cards[v_k];
        select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
        -- lot 7, the missing part rule: a part the player owns, while another part of the same photo (entity and rarity) in packs is missing, becomes
        -- the lowest-numbered missing part (cards of this pack stored before count as owned)
        if v_c.part > 0 then
          v_pick := null;
          if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card) then
            select h.card_no into v_pick from public.cards_catalog h
             where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.in_packs
               and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no)
             order by h.part limit 1;
            if v_pick is not null then
              v_card := v_pick;
              v_cards[v_k] := v_pick;
              select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
            end if;
          end if;
        end if;
        v_new := not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
        v_pair := false;
        if v_new and v_c.part > 0 then
          -- the last missing part: the photo has other parts and the player owns every one of them
          v_pair := exists (select 1 from public.cards_catalog h where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.card_no <> v_card)
                    and not exists (select 1 from public.cards_catalog h
                                     where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part > 0 and h.card_no <> v_card
                                       and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no));
        end if;
        if v_new then v_newn := v_newn + 1; end if;
        insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source, seen)
        values (p_user, v_card, 1, p_now, p_now, v_packno, 'pack', false)
        on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
        -- lot 7: the card that completes its set gives the panorama, once (its row is written with the pack, below)
        v_pano := null;
        if v_pair then
          select pa.pano_no into v_pano from public.cards_panoramas pa
           where pa.entity_id = v_c.entity_id and pa.rarity = v_c.rarity
             and not exists (select 1 from public.cards_panoramas_owned po where po.user_id = p_user and po.pano_no = pa.pano_no);
          if v_pano is not null then v_panos := v_panos || v_pano; end if;
        end if;
        v_cards_out := v_cards_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new, 'completesPair', v_pair,
                                                                           'golden', v_k = 5 and v_golden, 'guarantee', v_k = 5 and v_pity)
                                                         || case when v_pano is not null then jsonb_build_object('pano', v_pano) else '{}'::jsonb end);
      end loop;
      delete from public.cards_wishlist where user_id = p_user and card_no = any (v_cards);

      insert into public.cards_packs (user_id, source, cards, opened_at, focus, new_count, seq, theme, golden, guarantee, batch)
      values (p_user, case when p_source = 'focus' then 'stock' else p_source end, v_cards, p_now, case when p_source = 'focus' then p_focus else null end,
              v_newn, v_packno, case when p_source = 'daily' then 'daily' when p_source = 'focus' then 'focus' else v_theme end, v_golden, v_pity,
              case when v_n > 1 then v_batch else null end)
      returning id into v_pack;
      if cardinality(v_panos) > 0 then
        insert into public.cards_panoramas_owned (user_id, pano_no, source, pack_id)
        select p_user, x.p, 'pack', v_pack from unnest(v_panos) as x(p)
        on conflict (user_id, pano_no) do nothing;
      end if;
      v_pack_ids := v_pack_ids || to_jsonb(v_pack::text);
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'id', v_pack, 'pack_no', v_packno, 'source', p_source, 'theme', case when p_source = 'daily' then 'daily' when p_source = 'focus' then 'focus' else v_theme end,
        'group', v_group, 'golden', v_golden, 'guarantee', v_pity, 'cards', v_cards_out, 'new_count', v_newn, 'panoramas', to_jsonb(v_panos)));
    end loop;

    select count(*) into v_owned_after from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.in_packs;
    select coalesce(array_agg(x.set_id), '{}') into v_after_ids from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    select coalesce(jsonb_agg(jsonb_build_object('id', x.set_id, 'name', coalesce(x.name, case x.kind when 'solo' then 'Soloists' when 'holo' then 'Every Holo card' when 'gold' then 'Every Gold card' else 'Debut ' || x.name end), 'packs', x.packs)
                             order by x.set_id), '[]'::jsonb)
      into v_fin from public.cards_goals_progress(p_user, null) x
     where x.set_id = any (v_after_ids) and not (x.set_id = any (v_before_ids));

    update public.cards_wallets
       set stock = v_stock, anchor = v_anchor, paris_day = v_today, ads_today = v_ads, bonus_today = v_bonus, timer_today = v_timer, shards = v_shards,
           packs_opened = packs_opened + v_n, seen_at = p_now, version = version + 1, updated_at = p_now
     where user_id = p_user;

    v_res := jsonb_build_object('replayed', false, 'packs', v_out, 'finished', v_fin, 'owned_before', v_owned_before, 'owned_after', v_owned_after);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_res, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at)
    values (p_user, 'open', p_key, jsonb_build_object('source', p_source, 'theme', v_theme, 'focus', p_focus, 'packs', v_pack_ids, 'batch', case when v_n > 1 then v_batch else null end,
                                                       'stock_after', v_stock, 'shards_after', v_shards), p_now);
    return v_res;
  end
  $f$;
  revoke all on function public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer) from public, anon, authenticated;
  grant execute on function public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer) to service_role;

  create or replace function public.cards_craft(p_user uuid, p_key text, p_card_no integer, p_now timestamptz default now(), p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_rarity text;
    v_cost integer;
    v_packno integer;
    v_hit public.cards_idem%rowtype;
    v_op text := 'craft:' || coalesce(p_card_no::text, '');
    v_before text[];
    v_after text[];
    v_fin jsonb;
    v_out jsonb;
    v_ent text;
    v_part smallint;
    v_pano integer;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    select c.rarity, c.entity_id, c.part into v_rarity, v_ent, v_part
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = p_card_no and c.in_packs and e.active;
    if v_rarity is null then raise exception 'cards: card'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;
    if v_rarity = 'L' then raise exception 'cards: no_craft'; end if;
    v_cost := case v_rarity when 'C' then 10 when 'U' then 20 when 'R' then 50 when 'SR' then 120 else 300 end;
    if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = p_card_no) then raise exception 'cards: owned'; end if;
    if w.shards < v_cost then raise exception 'cards: shards'; end if;

    select coalesce(array_agg(x.set_id), '{}') into v_before from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap, 10, w.seen_at + interval '2 hours');
    v_packno := w.packs_opened;
    update public.cards_wallets
       set shards = shards - v_cost, stock = (r ->> 'stock')::integer, anchor = case when (r ->> 'paused')::boolean then p_now else (r ->> 'anchor')::timestamptz end,
           paris_day = v_today, ads_today = (r ->> 'ads_today')::integer, bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           seen_at = p_now, version = version + 1, updated_at = p_now
     where user_id = p_user;
    insert into public.cards_owned (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source, seen)
    values (p_user, p_card_no, 1, p_now, p_now, v_packno, 'craft', false);
    insert into public.cards_crafts (user_id, card_no, rarity, cost, crafted_at) values (p_user, p_card_no, v_rarity, v_cost, p_now);
    delete from public.cards_wishlist where user_id = p_user and card_no = p_card_no;
    -- lot 7: the crafted part was the last missing one of its photo: the panorama, once
    v_pano := null;
    if v_part > 0 and not exists (select 1 from public.cards_catalog h where h.entity_id = v_ent and h.rarity = v_rarity and h.part > 0
                                     and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = h.card_no)) then
      select pa.pano_no into v_pano from public.cards_panoramas pa
       where pa.entity_id = v_ent and pa.rarity = v_rarity
         and not exists (select 1 from public.cards_panoramas_owned po where po.user_id = p_user and po.pano_no = pa.pano_no);
      if v_pano is not null then
        insert into public.cards_panoramas_owned (user_id, pano_no, source, pack_id) values (p_user, v_pano, 'craft', null)
        on conflict (user_id, pano_no) do nothing;
      end if;
    end if;
    select coalesce(array_agg(x.set_id), '{}') into v_after from public.cards_goals_progress(p_user, null) x where x.total > 0 and x.owned >= x.total and not x.claimed;
    select coalesce(jsonb_agg(jsonb_build_object('id', x.set_id, 'name', coalesce(x.name, case x.kind when 'solo' then 'Soloists' when 'holo' then 'Every Holo card' when 'gold' then 'Every Gold card' else 'Debut ' || x.name end), 'packs', x.packs)
                             order by x.set_id), '[]'::jsonb)
      into v_fin from public.cards_goals_progress(p_user, null) x where x.set_id = any (v_after) and not (x.set_id = any (v_before));
    v_out := jsonb_build_object('replayed', false, 'card_no', p_card_no, 'rarity', v_rarity, 'cost', v_cost, 'shards', w.shards - v_cost, 'finished', v_fin, 'pano', v_pano);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_out, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'craft', p_key, jsonb_build_object('card_no', p_card_no, 'cost', v_cost), p_now);
    return v_out;
  end
  $f$;
  revoke all on function public.cards_craft(uuid, text, integer, timestamptz, integer) from public, anon, authenticated;
  grant execute on function public.cards_craft(uuid, text, integer, timestamptz, integer) to service_role;

  -- ---------- checks ----------
  v_ok := 0;
  if (select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) from pg_proc where oid = to_regprocedure('public.cards_build_catalog()')) = '00b63db362c757cb3c4138c98afba368' then v_ok := v_ok + 1; end if;
  if (select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) from pg_proc where oid = to_regprocedure('public.cards_catalog_append(boolean)')) = 'bf4e41c1827742d2463d8e4ef5a15144' then v_ok := v_ok + 1; end if;
  if (select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) from pg_proc where oid = to_regprocedure('public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)')) = '01ba80721797a59fa83b113e29971969' then v_ok := v_ok + 1; end if;
  if (select md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g')) from pg_proc where oid = to_regprocedure('public.cards_craft(uuid, text, integer, timestamptz, integer)')) = 'e81a6565c61b3a26dc138f8de8a2a484' then v_ok := v_ok + 1; end if;
  if v_ok <> 4 then
    raise exception '118-group-parts: a new body is not the expected one, nothing changed';
  end if;
  if exists (select 1 from pg_proc pr where pr.pronamespace = 'public'::regnamespace and pr.proname in ('cards_build_catalog', 'cards_catalog_append', 'cards_open', 'cards_craft')
              and (has_function_privilege('anon', pr.oid, 'execute') or has_function_privilege('authenticated', pr.oid, 'execute'))) then
    raise exception '118-group-parts: a browser role can execute a function of this file, nothing changed';
  end if;
  raise notice '118-group-parts: photos set to 2: %, to 3: %, focal points moved %, kept (owner''s) %, to review %, rejected %, pages not found %', v_two, v_three, v_moved, v_kept, v_review, v_rejected, v_missing;
  raise notice '118-group-parts: the catalog is not rebuilt by this file: run "Reconstruire le catalogue" so the cards follow the parts and the panoramas are written';
  notify pgrst, 'reload schema';
end $c118$;
