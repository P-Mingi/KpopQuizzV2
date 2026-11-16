-- 116c-approve-personality-rights.sql (Bunnyverse Cards lot 6, 2026-11-16; OPTIONAL: the owner decides whether to apply it)
--
-- What:   approves, in ONE DO block, the 187 photos that 116-photos-harvest.sql added as pending for ONE reason only: Commons shows a
--         personality rights warning on the file (the person photographed has rights on their image, apart from the copyright; the
--         licence and the author were checked like every other photo). Their status goes from pending to approved and their note ends
--         with "(approved with 116c-approve-personality-rights.sql)". Nothing else changes: no other photo, no entity, no catalog row.
-- Guard:  refuses, with nothing changed, unless EXACTLY 187 photos qualify: one of the 187 pages below, status pending, added by 116 (its
--         log), and its note the personality rights reason alone, or that reason after 116's "no birth date yet" note once the person's
--         public.idols row has a birth date (apply 116b first). Refuses too when a pack was ever opened, when a live photo already holds
--         one of their slots, and between 23:50 and 00:30 UTC. A second run is refused (nothing qualifies any more).
-- Why:    integrator, lot 6: 187 photos wait for the owner only because of that warning; approved, they open the editions of the
--         subjects they bring to two live photos or more (docs/o1/reports/CARDS/LOT6-HARVEST.md gives the count).
-- Rows:   187 cards_photos rows (status and note). The real count is the notice "116c: N photos approved" (Messages tab).
-- Needs:  116-photos-harvest.sql, then 116b (the dates file, from the owner's private folder). Apply after a backup, then
--         "Reconstruire le catalogue" (the approved photos give cards only after the rebuild).
-- Verify: select count(*) from public.cards_photos where status = 'approved' and right(review_note, 52) = ' (approved with 116c-approve-personality-rights.sql)';   expect 187
-- Verify: select count(*) from public.cards_photos where status = 'pending' and review_note = 'To review: Commons shows a personality rights warning on the file';   expect 0
-- Verify: select count(*) from public.cards_packs;   expect 0
-- Refuses: between 23:50 and 00:30 UTC; before 116; when a pack was opened; unless exactly 187 photos qualify; when a live photo holds one of their slots.
-- Undo:   116c-approve-personality-rights.rollback.sql (puts them back to pending; refused once a pack was opened).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor).

do $c116c$
declare
  v_pages constant text[] := array[
    'https://commons.wikimedia.org/wiki/File:BamBam_for_Samsonite_15th_anniversary,_10_March_2025_08.png',
    'https://commons.wikimedia.org/wiki/File:뱀뱀(BamBam)_"Sour_&_Sweet"_Showcase_press_conference,_March_28,_2023_05.png',
    'https://commons.wikimedia.org/wiki/File:BamBam_for_5th_TTA_Awards,_February_2021_03.jpg',
    'https://commons.wikimedia.org/wiki/File:Stray_Kids''_Bang_Chan_at_ICN_Airport_in_July_2025_02.jpg',
    'https://commons.wikimedia.org/wiki/File:20240503_Bang_Chan_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:180515_TenAsia_Bang_Chan_photoshoot.png',
    'https://commons.wikimedia.org/wiki/File:Stray_Kids_Bang_Chan_W_Korea_October_2024.jpg',
    'https://commons.wikimedia.org/wiki/File:Choi_Beom-gyu_at_a_Dior_event_in_2025_01.jpg',
    'https://commons.wikimedia.org/wiki/File:BTS_performing_"DNA"_during_the_Love_Yourself_concert_in_Nagoya,_13_January_2019_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Carmen_di_Musinsa_Beauty_Festa_Pop-Up_Store_2025.jpg',
    'https://commons.wikimedia.org/wiki/File:김채현_2022.jpg',
    'https://commons.wikimedia.org/wiki/File:김채현_Kim_Chae_Hyun_Doublast_showcase.png',
    'https://commons.wikimedia.org/wiki/File:Lee_Chae-Ryeong_(이채령)_220729.jpg',
    'https://commons.wikimedia.org/wiki/File:221127_Kim_Chae-won_(LE_SSERAFIM).jpg',
    'https://commons.wikimedia.org/wiki/File:240329_Kim_Chae-won_(2).jpg',
    'https://commons.wikimedia.org/wiki/File:TWICE''s_Chayeong_손채영_2024_07.jpg',
    'https://commons.wikimedia.org/wiki/File:20240503_Changbin_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:Chen_at_Billboard_K_POWER_100_on_August_27,_2024.png',
    'https://commons.wikimedia.org/wiki/File:Daniela_(Katseye)_Music_Bank_2024_1.jpg',
    'https://commons.wikimedia.org/wiki/File:DK_for_10asia_Magazine_February_2016_06.png',
    'https://commons.wikimedia.org/wiki/File:230707_TREASURE(트레저)_Doyoung_in_Incheon_Airport.jpg',
    'https://commons.wikimedia.org/wiki/File:차은우_@_2019_SS_헤라_서울패션위크_''YCH(와이씨에이치)''_포토월_01.png',
    'https://commons.wikimedia.org/wiki/File:170924_푸드트럭이벤트.jpg',
    'https://commons.wikimedia.org/wiki/File:Cha_Eun-woo,_March_31,_2025.png',
    'https://commons.wikimedia.org/wiki/File:차은우_@_2019_SS_헤라_서울패션위크_''YCH(와이씨에이치)''_포토월_06.png',
    'https://commons.wikimedia.org/wiki/File:170602_Astro_02.jpg',
    'https://commons.wikimedia.org/wiki/File:20231207_Lee_Felix_of_Stray_Kids_on_GQ_Man_of_the_year.png',
    'https://commons.wikimedia.org/wiki/File:20230930_Felix.jpg',
    'https://commons.wikimedia.org/wiki/File:20230628_Lee_Felix_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:20240503_Lee_Felix_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:Gaeul_of_Ive_at_Senka_Pop-up_Event,_May_19,_2026_(2).png',
    'https://commons.wikimedia.org/wiki/File:Ive_Gaeul_at_Seoul_Fashion_Week,_1_September_2025_03.png',
    'https://commons.wikimedia.org/wiki/File:Ive''s_Gaul_In_January_2023.jpg',
    'https://commons.wikimedia.org/wiki/File:Got7_cheering_video_for_JYPE_16th_audition_04.jpg',
    'https://commons.wikimedia.org/wiki/File:Got7_on_the_red_carpet_of_2018_Asia_Artist_Awards(AAA),_28_November_2018_02.jpg',
    'https://commons.wikimedia.org/wiki/File:230513_Park_Gun-wook_(박건욱).jpg',
    'https://commons.wikimedia.org/wiki/File:20231006_Haechan_(NCT).jpg',
    'https://commons.wikimedia.org/wiki/File:20240503_Han_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:Sung_Hanbin_at_Gucci_event_on_March_5,_2024.png',
    'https://commons.wikimedia.org/wiki/File:230513_Sung_Han-bin_(성한빈).jpg',
    'https://commons.wikimedia.org/wiki/File:Sung_Hanbin_at_2024_KCON_Japan.png',
    'https://commons.wikimedia.org/wiki/File:230707_TREASURE(트레저)_Haruto_in_Incheon_Airport.jpg',
    'https://commons.wikimedia.org/wiki/File:20231109_HeeJin_@_MusicBank.png',
    'https://commons.wikimedia.org/wiki/File:Hongjoong_in_2024_(3)_03.jpg',
    'https://commons.wikimedia.org/wiki/File:HueningKai_at_a_Dior_event_in_2025_01.jpg',
    'https://commons.wikimedia.org/wiki/File:Huening_Kai_at_the_Seoul_Fashion_Week_2024_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Hyoyeon_in_October_2024.png',
    'https://commons.wikimedia.org/wiki/File:Hyungwon_-_HMBD_Campaign_by_Marie_Claire_Korea_in_February_2023.png',
    'https://commons.wikimedia.org/wiki/File:Hyunjin_of_Stray_Kids_on_November_24_2023.png',
    'https://commons.wikimedia.org/wiki/File:20240503_Hyunjin_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:22052023_Hyunjin_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:Monsta_X_I.M_Chanel_April_2024.jpg',
    'https://commons.wikimedia.org/wiki/File:20230929_I.N.jpg',
    'https://commons.wikimedia.org/wiki/File:23052024_I.N_DAMIANI_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:20240503_I.N_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:I.N_of_Stray_Kids_at_Incheon_Airport,_September_20,_2024.png',
    'https://commons.wikimedia.org/wiki/File:ITZY_(있지)_2023_뮤직뱅크_페스티벌_출국_ITZY_Airport_Departure.jpg',
    'https://commons.wikimedia.org/wiki/File:Jackson_Wang_performing_at_KBS_Music_Bank_Incheon_Airport_Sky_Festival,_16_October_2015_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Jackson_Wang_at_a_fansigning_event_in_Yeouido,_16_December_2018_01.jpg',
    'https://commons.wikimedia.org/wiki/File:Jackson_Wang_at_a_fansigning_event_in_Mokdong,_15_December_2018_02.jpg',
    'https://commons.wikimedia.org/wiki/File:230707_TREASURE(트레저)_Jaehyuk_in_Incheon_Airport.jpg',
    'https://commons.wikimedia.org/wiki/File:20231006_Jaehyun_(NCT).jpg',
    'https://commons.wikimedia.org/wiki/File:Siam_Center_x_JAY_B_The_2nd_Exhibition_in_Bangkok_press_conference,_13_January_2025_07.png',
    'https://commons.wikimedia.org/wiki/File:Yoon_Jeong-han_for_10asia_Magazine_February_2016_02.png',
    'https://commons.wikimedia.org/wiki/File:251127_Park_Jihyo.PNG',
    'https://commons.wikimedia.org/wiki/File:Jin_performing_at_The_Red_Bullet_tour_in_Taipei,_8_March_2015_03.jpg',
    'https://commons.wikimedia.org/wiki/File:Jin_performing_at_''Music_Bank''_in_Mexico,_30_October_2014_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Jin_performing_at_KCON_2014,_10_August_2014_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Jin_at_a_fansigning_in_Sinchon,_11_September_2014.jpg',
    'https://commons.wikimedia.org/wiki/File:Park_Jinyoung_for_W_Korea_February_2025_issue_01.png',
    'https://commons.wikimedia.org/wiki/File:Jiwoo_di_Musinsa_Beauty_Festa_Pop-Up_Store_2025.jpg',
    'https://commons.wikimedia.org/wiki/File:230513_Kim_Ji-woong_(김지웅).jpg',
    'https://commons.wikimedia.org/wiki/File:231124_Kim_Ji-woong_(1).jpg',
    'https://commons.wikimedia.org/wiki/File:Johnny_Suh_at_thombrowne20_231020.png',
    'https://commons.wikimedia.org/wiki/File:20231006_Johnny_(NCT).jpg',
    'https://commons.wikimedia.org/wiki/File:Joshua_Hong_for_10asia_Magazine_February_2016_03.png',
    'https://commons.wikimedia.org/wiki/File:240719_Red_Velvet_Joy.jpg',
    'https://commons.wikimedia.org/wiki/File:Jungwon_of_Enhypen,_October_7,_2024.png',
    'https://commons.wikimedia.org/wiki/File:20231006_Jungwoo_(NCT).jpg',
    'https://commons.wikimedia.org/wiki/File:20180922_UCI_Road_World_Championships_Innsbruck_Team_Sangemini_MG-K_VIS_Vega_850_6838.jpg',
    'https://commons.wikimedia.org/wiki/File:221127_Kazuha_(LE_SSERAFIM).jpg',
    'https://commons.wikimedia.org/wiki/File:Kazuha_(LE_SSERAFIM)_220507.png',
    'https://commons.wikimedia.org/wiki/File:260526_Nakamura_Kazuha.png',
    'https://commons.wikimedia.org/wiki/File:FIFTY_FIFTY_Keena_at_2024_Billboard_K_Power_100.png',
    'https://commons.wikimedia.org/wiki/File:Kep1er_leaving_for_promotions_in_Japan_through_Gimpo_International_Airport_on_November_19,_2023.jpg',
    'https://commons.wikimedia.org/wiki/File:Kep1er_Nov''24.png',
    'https://commons.wikimedia.org/wiki/File:190424_Kihyun_The_Fact_Music_Awards_(3).png',
    'https://commons.wikimedia.org/wiki/File:Lee_Know_at_the_Gucci_Edit_Room_event,_July_30,_2026_(1).png',
    'https://commons.wikimedia.org/wiki/File:Lee_Know_at_the_Incheon_Airport,_February_25,_2026_(6).png',
    'https://commons.wikimedia.org/wiki/File:Lee_Know_in_Incheon_Airport,_September_7,_2024_(upscaled).png',
    'https://commons.wikimedia.org/wiki/File:Lee_Know_at_the_40th_Golden_Disc_Awards,_January_10,_2026_(1).png',
    'https://commons.wikimedia.org/wiki/File:Leeseo_of_Ive_at_the_HAHS_Graduation_Ceremony,_January_8,_2026_(3).png',
    'https://commons.wikimedia.org/wiki/File:ITZY''s_Lia_in_August_2023_01.jpg',
    'https://commons.wikimedia.org/wiki/File:Lia_(리아)_220729.jpg',
    'https://commons.wikimedia.org/wiki/File:251110_Choi_Jisu_(Lia)_from_ITZY.png',
    'https://commons.wikimedia.org/wiki/File:Lia_(리아)_220921.jpg',
    'https://commons.wikimedia.org/wiki/File:Blackpink''s_Lisa_Manoban_05.jpg',
    'https://commons.wikimedia.org/wiki/File:BLACKPINK''s_Lisa_for_BULGARI_June_2023_01_(cropped).jpg',
    'https://commons.wikimedia.org/wiki/File:Blackpink_Lisa_GMP_240622.png',
    'https://commons.wikimedia.org/wiki/File:Liz_of_Ive_at_K-SWISS_Flagship_Store_Open_Event,_May_7,_2026_(1).png',
    'https://commons.wikimedia.org/wiki/File:171210_핑거밴드_페스티벌_마마무_솔라_미리보기_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Manon_2024.png',
    'https://commons.wikimedia.org/wiki/File:Mark_Tuan_at_ShuDaxia_event,_March_2,_2024_04.png',
    'https://commons.wikimedia.org/wiki/File:Mark_Tuan_at_Mnet_Asian_Music_Awards_(MAMA)_2015,_2_December_2015_02.png',
    'https://commons.wikimedia.org/wiki/File:Mark_Tuan_outside_"Music_Bank"_studios,_31_May_2019.jpg',
    'https://commons.wikimedia.org/wiki/File:Mark_Tuan_at_MBC_Gayo_Daejeon,_31_December_2015_03.png',
    'https://commons.wikimedia.org/wiki/File:20231006_Mark_(NCT).jpg',
    'https://commons.wikimedia.org/wiki/File:Megan_(Katseye)_Music_Bank_2024_1.jpg',
    'https://commons.wikimedia.org/wiki/File:220728_에이티즈_ATEEZ_Mingi.png',
    'https://commons.wikimedia.org/wiki/File:Miyeon_for_Marie_Claire_Korea_2024_in_white.png',
    'https://commons.wikimedia.org/wiki/File:Mamamoo_Moonbyul_in_2024_(1)_06.jpg',
    'https://commons.wikimedia.org/wiki/File:NCT127_-_Fact_Check_press_conference_Oct_6_2023.jpg',
    'https://commons.wikimedia.org/wiki/File:NCT_Dream_at_the_MMA_2023_Awards.jpg',
    'https://commons.wikimedia.org/wiki/File:NCT_Dream_Top_Ten_Awards,_2022_1.jpg',
    'https://commons.wikimedia.org/wiki/File:Ni-Ki_at_Love_Your_W_event_October_14_2024.png',
    'https://commons.wikimedia.org/wiki/File:Nmixx_at_Music_Bank_on_20240830.png',
    'https://commons.wikimedia.org/wiki/File:Olivia_Hye_210721.jpg',
    'https://commons.wikimedia.org/wiki/File:Ive''s_Rei_@_OPENING_PROJECTxSATUR_PhotoCall,_12_June_2025_03.png',
    'https://commons.wikimedia.org/wiki/File:Ive''s_Rei_at_Ralph_Lauren_Hannam_store_opening,_26_March_2025_02.png',
    'https://commons.wikimedia.org/wiki/File:20231202_IVE''s_Naoi_Rei_at_the_MAMA2023_07.jpg',
    'https://commons.wikimedia.org/wiki/File:Rei_for_Longines,_February_2025_03.png',
    'https://commons.wikimedia.org/wiki/File:Riize_-_2023_Love_Your_W_press_line.png',
    'https://commons.wikimedia.org/wiki/File:Hong_Seung-han_at_Riize_signing_event_September_10_2023.png',
    'https://commons.wikimedia.org/wiki/File:Shin_Ryu-jin_221209.jpg',
    'https://commons.wikimedia.org/wiki/File:251110_Shin_Ryujin_from_ITZY.png',
    'https://commons.wikimedia.org/wiki/File:Shin_Ryu-jin_(신류진)_230513.jpg',
    'https://commons.wikimedia.org/wiki/File:ITZY''s_Shin_Ryujin_in_August_2023_02.jpg',
    'https://commons.wikimedia.org/wiki/File:20230630_Sakura_(LE_SSERAFIM).jpg',
    'https://commons.wikimedia.org/wiki/File:221013_Sakura_(LE_SSERAFIM)_Airport_Departure.jpg',
    'https://commons.wikimedia.org/wiki/File:20241018_Le_Sserafim''s_Sakura_Miyawaki_06.jpg',
    'https://commons.wikimedia.org/wiki/File:20260713_ATEEZ_Choi_San_NARS_PhotoCall.jpg',
    'https://commons.wikimedia.org/wiki/File:2019_SS_서울패션위크_-_Sanha_04.png',
    'https://commons.wikimedia.org/wiki/File:Yoon_San-ha_during_the_''Incense_showcase''_photo_time_in_2023.png',
    'https://commons.wikimedia.org/wiki/File:Sanha-ASTRO12-1.png',
    'https://commons.wikimedia.org/wiki/File:240919_Stray_Kids_Seungmin.jpg',
    'https://commons.wikimedia.org/wiki/File:20240503_Kim_Seungmin_of_Stray_Kids.png',
    'https://commons.wikimedia.org/wiki/File:Shownu_at_Delvaux_in_May_2023.jpg',
    'https://commons.wikimedia.org/wiki/File:Shuhua_Yeh_portrait_at_TIFF_2026.jpg',
    'https://commons.wikimedia.org/wiki/File:20250921_아이들_슈화,_인천공항_출국_I-DLE_SHUHUA_Airport_Departure.png',
    'https://commons.wikimedia.org/wiki/File:(G)I-DLE''s_Shuhua_on_June_2023_01.jpg',
    'https://commons.wikimedia.org/wiki/File:171118_당진청년의날_토크&뮤직콘서트_마마무_솔라_01.jpg',
    'https://commons.wikimedia.org/wiki/File:Mamamoo_솔라(Solar)_in_May_2024.png',
    'https://commons.wikimedia.org/wiki/File:171028_무럭무럭_팬미팅_마마무_솔라_미리보기_04.jpg',
    'https://commons.wikimedia.org/wiki/File:171015_KB배구_홈개막전_축하공연_마마무_솔라_미리보기_02.jpg',
    'https://commons.wikimedia.org/wiki/File:171128_이투스콘서트_마마무_솔라_미리보기_04.jpg',
    'https://commons.wikimedia.org/wiki/File:Choi_Soo-bin_at_a_Dior_event_in_2025_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Katseye_Sophia.jpg',
    'https://commons.wikimedia.org/wiki/File:(G)I-DLE''s_Soyeon_on_June_2023.jpg',
    'https://commons.wikimedia.org/wiki/File:(G)I-DLE_Airport_Departure_2024_Soyeon_1.png',
    'https://commons.wikimedia.org/wiki/File:20230905_(G)i-dle''s_Soyeon_02.png',
    'https://commons.wikimedia.org/wiki/File:20230802_Jeon_Soyeon_07.png',
    'https://commons.wikimedia.org/wiki/File:Lee_Felix_of_Stray_Kids_at_the_HERA_photocall,_17_April_2026_(1).png',
    'https://commons.wikimedia.org/wiki/File:231026_Park_Sung-hoon_(박성훈).jpg',
    'https://commons.wikimedia.org/wiki/File:Sunghoon_at_Love_Your_W_event.jpg',
    'https://commons.wikimedia.org/wiki/File:240408_Park_Sung-hoon_(2).jpg',
    'https://commons.wikimedia.org/wiki/File:Kang_Tae-hyun_at_a_Dior_event_in_2025_02.jpg',
    'https://commons.wikimedia.org/wiki/File:TXT_Taehyun_at_a_Dior_Sauvage_Campaign.jpg',
    'https://commons.wikimedia.org/wiki/File:230513_Kim_Tae-rae_(김태래).jpg',
    'https://commons.wikimedia.org/wiki/File:Tomorrow_X_Together_at_a_Dior_event,_April_18,_2025.png',
    'https://commons.wikimedia.org/wiki/File:Tzuyu_at_Gucci_Ancora_on_05032024_(5).png',
    'https://commons.wikimedia.org/wiki/File:Jeon_Won-woo_for_10asia_Magazine_February_2016_02.png',
    'https://commons.wikimedia.org/wiki/File:Jang_Won-young_of_Ive_in_Incheon_Airport,_September_7,_2024.png',
    'https://commons.wikimedia.org/wiki/File:251204_Jang_Wonyoung.PNG',
    'https://commons.wikimedia.org/wiki/File:Jang_Won-young_of_Ive,_October_15,_2025_(4).png',
    'https://commons.wikimedia.org/wiki/File:20241010_Wonyoung_for_Tommy_Hilfiger_05.jpg',
    'https://commons.wikimedia.org/wiki/File:Jung_Woo_Young_at_Paris_Fashion_Week.jpg',
    'https://commons.wikimedia.org/wiki/File:Hwang_Ye-ji_(황예지)_220729.jpg',
    'https://commons.wikimedia.org/wiki/File:ITZY''s_Hwang_Yeji_in_August_2023_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Choi_Yeon-jun_at_a_Dior_event_in_2025_01.jpg',
    'https://commons.wikimedia.org/wiki/File:241014_Yeonjun.jpg',
    'https://commons.wikimedia.org/wiki/File:Choi_Youngjae_at_Incheon_airport,_16_June_2025_04.png',
    'https://commons.wikimedia.org/wiki/File:Choi_Youngjae_for_Dive_Studios''_"B-Side_Track"_03.png',
    'https://commons.wikimedia.org/wiki/File:Choi_Youngjae_for_Dive_Studios''_"B-Side_Track"_05.png',
    'https://commons.wikimedia.org/wiki/File:Youngjae_in_November_2021.jpg',
    'https://commons.wikimedia.org/wiki/File:Kim_Yugyeom_outside_Music_Bank_studios,_23_March_2018.jpg',
    'https://commons.wikimedia.org/wiki/File:Kim_Yugyeom_on_October_20,_2017.jpg',
    'https://commons.wikimedia.org/wiki/File:Yuha_di_Musinsa_Beauty_Festa_Pop-Up_Store_2025.jpg',
    'https://commons.wikimedia.org/wiki/File:Ahn_Yujin_for_FENDI.jpg',
    'https://commons.wikimedia.org/wiki/File:20230918_An_Yu-jin_(안유진).jpg',
    'https://commons.wikimedia.org/wiki/File:221128_An_Yu-jin_(IVE).jpg',
    'https://commons.wikimedia.org/wiki/File:Yuna_at_Incheon_airport_on_20250209_02.png',
    'https://commons.wikimedia.org/wiki/File:Shin_Yu-na_(신유나)_220722.jpg',
    'https://commons.wikimedia.org/wiki/File:ILLIT_Yunah_at_Canada_Goose_Photo_Call.png',
    'https://commons.wikimedia.org/wiki/File:260110_Le_Sserafim''s_Huh_Yunjin_at_GDA_2026_02.jpg',
    'https://commons.wikimedia.org/wiki/File:Huh_Yunjin_of_Le_Sserafim,_January_10,_2025.png',
    'https://commons.wikimedia.org/wiki/File:(G)I-DLE_YUQI_Airport_Departure_on_20250306_02.png',
    'https://commons.wikimedia.org/wiki/File:240531_이브_Yves_at_Music_Bank.png']::text[];
  v_utc time := (now() at time zone 'UTC')::time;
  v_ids bigint[];
  v_n integer;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '116c: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_harvest_log') is null then
    raise exception '116c: apply 116-photos-harvest.sql first, nothing changed';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '116c: a pack was opened, the catalog can only grow at its end now: nothing changed';
  end if;

  select coalesce(array_agg(p.id order by p.id), '{}'), count(distinct p.source_page) into v_ids, v_n
    from public.cards_photos p
    join public.cards_harvest_log l on l.kind = 'photo' and l.ref = p.id::text
    join public.cards_entities e on e.id = p.entity_id
   where p.source_page = any (v_pages) and p.status = 'pending'
     and (p.review_note = 'To review: Commons shows a personality rights warning on the file'
          or (p.review_note = 'To review: public.idols has no birth date for this person yet; approve once the owner has filled it (two agreeing sources); Commons shows a personality rights warning on the file'
              and exists (select 1 from public.idols i where e.qid is not null and i.wikidata_qid = e.qid and i.birth_date is not null)));
  if cardinality(v_ids) <> 187 or v_n <> 187 then
    raise exception '116c: % photos qualify (% pages), the file expects exactly 187: nothing changed', cardinality(v_ids), v_n;
  end if;
  if exists (select 1 from public.cards_photos p join public.cards_photos q on q.entity_id = p.entity_id and q.slot = p.slot and q.id <> p.id
              where p.id = any (v_ids) and q.status in ('auto', 'approved')) then
    raise exception '116c: a live photo already holds the slot of one of them: nothing changed';
  end if;

  update public.cards_photos set status = 'approved', review_note = review_note || ' (approved with 116c-approve-personality-rights.sql)' where id = any (v_ids);
  get diagnostics v_n = row_count;
  raise notice '116c: % photos approved (personality rights warning only); now press "Reconstruire le catalogue"', v_n;
end $c116c$;
