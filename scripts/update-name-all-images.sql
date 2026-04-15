-- Update name-all-members games with idol photo URLs
-- Runs directly against the DB, bypassing PostgREST

DO $$
DECLARE
  g RECORD;
  updated_content JSONB;
  members JSONB;
  member JSONB;
  i INT;
  mname TEXT;
  img TEXT;
  slug_ctx TEXT;
  changed BOOLEAN;
BEGIN
  FOR g IN SELECT id, slug, content FROM public.games WHERE game_type = 'name_all_members' LOOP
    updated_content := g.content;
    members := g.content->'members';
    changed := false;

    FOR i IN 0..jsonb_array_length(members) - 1 LOOP
      mname := members->i->>'name';
      slug_ctx := g.slug;

      -- Map member name + game context to image file
      img := CASE
        -- BTS
        WHEN slug_ctx = 'name-all-bts' AND mname = 'RM' THEN '/idols/RM BTS.jpg'
        WHEN slug_ctx = 'name-all-bts' AND mname = 'Jin' THEN '/idols/Jin BTS.jpg'
        WHEN slug_ctx = 'name-all-bts' AND mname = 'Suga' THEN '/idols/Suga BTS.jpg'
        WHEN slug_ctx = 'name-all-bts' AND mname = 'J-Hope' THEN '/idols/J-Hope BTS.jpg'
        WHEN slug_ctx = 'name-all-bts' AND mname = 'Jimin' THEN '/idols/Jimin BTS.jpg'
        WHEN slug_ctx = 'name-all-bts' AND mname = 'V' THEN '/idols/V BTS.jpg'
        WHEN slug_ctx = 'name-all-bts' AND mname = 'Jungkook' THEN '/idols/Jungkook BTS.jpg'
        -- BLACKPINK
        WHEN slug_ctx = 'name-all-blackpink' AND mname = 'Jisoo' THEN '/idols/Jisoo BLACKPINK.jpg'
        WHEN slug_ctx = 'name-all-blackpink' AND mname = 'Jennie' THEN '/idols/Jennie BLACKPINK.jpg'
        WHEN slug_ctx = 'name-all-blackpink' AND mname = 'Rose' THEN '/idols/Rose BLACKPINK.jpg'
        WHEN slug_ctx = 'name-all-blackpink' AND mname = 'Lisa' THEN '/idols/Lisa BLACKPINK.jpg'
        -- TWICE
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Nayeon' THEN '/idols/Nayeon Twice.jpg'
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Jeongyeon' THEN '/idols/Jeongyeon Twice.jpg'
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Momo' THEN '/idols/Momo Twice.jpg'
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Sana' THEN '/idols/Sana Twice.jpg'
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Jihyo' THEN '/idols/Jihyo Twice.jpg'
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Mina' THEN '/idols/Mina Twice.jpg'
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Dahyun' THEN '/idols/Dahyun TWICE.jpg'
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Chaeyoung' THEN '/idols/Chaeyoung Twice.jpg'
        WHEN slug_ctx = 'name-all-twice' AND mname = 'Tzuyu' THEN '/idols/Tzuyu Twice.jpg'
        -- Stray Kids
        WHEN slug_ctx = 'name-all-stray-kids' AND mname = 'Bang Chan' THEN '/idols/Bang Chan STRYKIDS.jpg'
        WHEN slug_ctx = 'name-all-stray-kids' AND mname = 'Lee Know' THEN '/idols/Lee Know STAYKIDS.jpg'
        WHEN slug_ctx = 'name-all-stray-kids' AND mname = 'Changbin' THEN '/idols/Changbin STRAYKIDS.jpg'
        WHEN slug_ctx = 'name-all-stray-kids' AND mname = 'Hyunjin' THEN '/idols/Hyunjin STRAYKIDS.jpg'
        WHEN slug_ctx = 'name-all-stray-kids' AND mname = 'Han' THEN '/idols/Han STRAYKIDS.jpg'
        WHEN slug_ctx = 'name-all-stray-kids' AND mname = 'Felix' THEN '/idols/Felix STRAYKIDS.jpg'
        WHEN slug_ctx = 'name-all-stray-kids' AND mname = 'Seungmin' THEN '/idols/Seungmin STRAYKIDS.jpg'
        WHEN slug_ctx = 'name-all-stray-kids' AND mname = 'I.N' THEN '/idols/I.N stray kids.jpg'
        -- SEVENTEEN
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'S.Coups' THEN '/idols/S.Coups SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Jeonghan' THEN '/idols/Jeonghan SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Joshua' THEN '/idols/Joshua SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Jun' THEN '/idols/Jun SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Hoshi' THEN '/idols/Hoshi SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Wonwoo' THEN '/idols/Wonwoo SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Woozi' THEN '/idols/Woozi SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'DK' THEN '/idols/DK SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Mingyu' THEN '/idols/Mingyu SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'The8' THEN '/idols/The8 SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Seungkwan' THEN '/idols/Seungkwan SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Vernon' THEN '/idols/Vernon SEVENTEEN.jpg'
        WHEN slug_ctx = 'name-all-seventeen' AND mname = 'Dino' THEN '/idols/Dino SEVENTEEN.jpg'
        -- aespa
        WHEN slug_ctx = 'name-all-aespa' AND mname = 'Karina' THEN '/idols/Karina AESPA.jpg'
        WHEN slug_ctx = 'name-all-aespa' AND mname = 'Giselle' THEN '/idols/Giselle AESPA.jpg'
        WHEN slug_ctx = 'name-all-aespa' AND mname = 'Winter' THEN '/idols/Winter AESPA.jpg'
        WHEN slug_ctx = 'name-all-aespa' AND mname = 'Ningning' THEN '/idols/Ningning AESPA.jpg'
        -- NewJeans
        WHEN slug_ctx = 'name-all-newjeans' AND mname = 'Minji' THEN '/idols/Minji NEWJEANS.jpg'
        WHEN slug_ctx = 'name-all-newjeans' AND mname = 'Hanni' THEN '/idols/Hanni NEWJEANS.jpg'
        WHEN slug_ctx = 'name-all-newjeans' AND mname = 'Danielle' THEN '/idols/Danielle NEWJEANS.jpg'
        WHEN slug_ctx = 'name-all-newjeans' AND mname = 'Haerin' THEN '/idols/Haerin NEWJEANS.jpg'
        WHEN slug_ctx = 'name-all-newjeans' AND mname = 'Hyein' THEN '/idols/Hyein NEWJEANS.jpg'
        -- IVE
        WHEN slug_ctx = 'name-all-ive' AND mname = 'Yujin' THEN '/idols/Yujin IVE.jpg'
        WHEN slug_ctx = 'name-all-ive' AND mname = 'Gaeul' THEN '/idols/Gaeul IVE.jpg'
        WHEN slug_ctx = 'name-all-ive' AND mname = 'Rei' THEN '/idols/Rei IVE.jpg'
        WHEN slug_ctx = 'name-all-ive' AND mname = 'Wonyoung' THEN '/idols/Wonyoung IVE.jpg'
        WHEN slug_ctx = 'name-all-ive' AND mname = 'Liz' THEN '/idols/Liz IVE.jpg'
        WHEN slug_ctx = 'name-all-ive' AND mname = 'Leeseo' THEN '/idols/Leeseo IVE.jpg'
        -- LE SSERAFIM
        WHEN slug_ctx = 'name-all-le-sserafim' AND mname = 'Sakura' THEN '/idols/Sakura LESSERAFIM.jpg'
        WHEN slug_ctx = 'name-all-le-sserafim' AND mname = 'Chaewon' THEN '/idols/Chaewon LESSERAFIM.jpg'
        WHEN slug_ctx = 'name-all-le-sserafim' AND mname = 'Yunjin' THEN '/idols/Yunjin LESSERAFIM.jpg'
        WHEN slug_ctx = 'name-all-le-sserafim' AND mname = 'Kazuha' THEN '/idols/Kazuha LESSERAFIM.jpg'
        WHEN slug_ctx = 'name-all-le-sserafim' AND mname = 'Eunchae' THEN '/idols/Eunchae LESSERAFIM.jpg'
        -- EXO
        WHEN slug_ctx = 'name-all-exo' AND mname = 'Xiumin' THEN '/idols/Xiumin EXO.jpg'
        WHEN slug_ctx = 'name-all-exo' AND mname = 'Suho' THEN '/idols/Suho EXO.jpg'
        WHEN slug_ctx = 'name-all-exo' AND mname = 'Lay' THEN '/idols/Lay EXO.jpg'
        WHEN slug_ctx = 'name-all-exo' AND mname = 'Baekhyun' THEN '/idols/Baekhyun EXO.jpg'
        WHEN slug_ctx = 'name-all-exo' AND mname = 'Chen' THEN '/idols/Chen EXO.jpg'
        WHEN slug_ctx = 'name-all-exo' AND mname = 'Chanyeol' THEN '/idols/Chanyeol EXO.jpg'
        WHEN slug_ctx = 'name-all-exo' AND mname = 'D.O.' THEN '/idols/D.O. EXO.jpg'
        WHEN slug_ctx = 'name-all-exo' AND mname = 'Kai' THEN '/idols/Kai EXO.jpg'
        WHEN slug_ctx = 'name-all-exo' AND mname = 'Sehun' THEN '/idols/Sehun EXO.jpg'
        -- ENHYPEN
        WHEN slug_ctx = 'name-all-enhypen' AND mname = 'Heeseung' THEN '/idols/Heeseung ENHYPEN.jpg'
        WHEN slug_ctx = 'name-all-enhypen' AND mname = 'Jay' THEN '/idols/Jay ENHYPEN.jpg'
        WHEN slug_ctx = 'name-all-enhypen' AND mname = 'Jake' THEN '/idols/Jake ENHYPEN.jpg'
        WHEN slug_ctx = 'name-all-enhypen' AND mname = 'Sunghoon' THEN '/idols/Sunghoon ENHYPEN.jpg'
        WHEN slug_ctx = 'name-all-enhypen' AND mname = 'Sunoo' THEN '/idols/Sunoo ENHYPEN.jpg'
        WHEN slug_ctx = 'name-all-enhypen' AND mname = 'Jungwon' THEN '/idols/Jungwon ENHYPEN.jpg'
        WHEN slug_ctx = 'name-all-enhypen' AND mname = 'Ni-ki' THEN '/idols/Ni-ki ENHYPEN.jpg'
        -- TXT
        WHEN slug_ctx = 'name-all-txt' AND mname = 'Soobin' THEN '/idols/Soobin TXT.jpg'
        WHEN slug_ctx = 'name-all-txt' AND mname = 'Yeonjun' THEN '/idols/Yeonjun TXT.jpg'
        WHEN slug_ctx = 'name-all-txt' AND mname = 'Beomgyu' THEN '/idols/Beomgyu TXT.jpg'
        WHEN slug_ctx = 'name-all-txt' AND mname = 'Taehyun' THEN '/idols/Taehyun TXT.jpg'
        WHEN slug_ctx = 'name-all-txt' AND mname = 'Huening Kai' THEN '/idols/Huening Kai TXT.jpg'
        -- ATEEZ
        WHEN slug_ctx = 'name-all-ateez' AND mname = 'Hongjoong' THEN '/idols/Hongjoong ATEEZ.jpg'
        WHEN slug_ctx = 'name-all-ateez' AND mname = 'Seonghwa' THEN '/idols/Seonghwa ATEEZ.jpg'
        WHEN slug_ctx = 'name-all-ateez' AND mname = 'Yunho' THEN '/idols/Yunho ATEEZ.jpg'
        WHEN slug_ctx = 'name-all-ateez' AND mname = 'Yeosang' THEN '/idols/Yeosang ATEEZ.jpg'
        WHEN slug_ctx = 'name-all-ateez' AND mname = 'San' THEN '/idols/San ATEEZ.jpg'
        WHEN slug_ctx = 'name-all-ateez' AND mname = 'Mingi' THEN '/idols/Mingi ATEEZ.jpg'
        WHEN slug_ctx = 'name-all-ateez' AND mname = 'Wooyoung' THEN '/idols/Wooyoung ATEEZ.jpg'
        WHEN slug_ctx = 'name-all-ateez' AND mname = 'Jongho' THEN '/idols/Jongho ATEEZ.jpg'
        -- Red Velvet
        WHEN slug_ctx = 'name-all-red-velvet' AND mname = 'Irene' THEN '/idols/Irene REDVELVET.jpg'
        WHEN slug_ctx = 'name-all-red-velvet' AND mname = 'Seulgi' THEN '/idols/Seulgi REDVELVET.jpg'
        WHEN slug_ctx = 'name-all-red-velvet' AND mname = 'Wendy' THEN '/idols/Wendy REDVELVET.jpg'
        WHEN slug_ctx = 'name-all-red-velvet' AND mname = 'Joy' THEN '/idols/Joy REDVELVET.jpg'
        WHEN slug_ctx = 'name-all-red-velvet' AND mname = 'Yeri' THEN '/idols/Yeri REDVELVET.jpg'
        -- ITZY
        WHEN slug_ctx = 'name-all-itzy' AND mname = 'Yeji' THEN '/idols/Yeji ITZY.jpg'
        WHEN slug_ctx = 'name-all-itzy' AND mname = 'Lia' THEN '/idols/Lia ITZY.jpg'
        WHEN slug_ctx = 'name-all-itzy' AND mname = 'Ryujin' THEN '/idols/Ryujin ITZY.jpg'
        WHEN slug_ctx = 'name-all-itzy' AND mname = 'Chaeryeong' THEN '/idols/Chaeryeong ITZY.jpg'
        WHEN slug_ctx = 'name-all-itzy' AND mname = 'Yuna' THEN '/idols/Yuna ITZY.jpg'
        -- (G)I-DLE
        WHEN slug_ctx = 'name-all-gidle' AND mname = 'Miyeon' THEN '/idols/Miyeon G-idle.jpg'
        WHEN slug_ctx = 'name-all-gidle' AND mname = 'Minnie' THEN '/idols/Minnie G-IDLE.jpg'
        WHEN slug_ctx = 'name-all-gidle' AND mname = 'Soyeon' THEN '/idols/Soyeon G-IDLE.jpg'
        WHEN slug_ctx = 'name-all-gidle' AND mname = 'Yuqi' THEN '/idols/Yuqi G-IDLE.jpg'
        WHEN slug_ctx = 'name-all-gidle' AND mname = 'Shuhua' THEN '/idols/Shuhua G-IDLE.jpg'
        -- NCT 127
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Taeyong' THEN '/idols/Taeyong NCT 127.jpg'
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Taeil' THEN '/idols/Taeil NCT 127.jpg'
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Johnny' THEN '/idols/Johnny NCT 127.jpg'
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Yuta' THEN '/idols/Yuta NCT 127.jpg'
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Doyoung' THEN '/idols/Doyoung NCT 127.jpg'
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Jaehyun' THEN '/idols/Jaehyun NCT 127.jpg'
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Jungwoo' THEN '/idols/Jungwoo NCT 127.jpg'
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Mark' THEN '/idols/Mark NCT 127.jpg'
        WHEN slug_ctx = 'name-all-nct-127' AND mname = 'Haechan' THEN '/idols/Haechan NCT 127.jpg'
        -- NCT Dream
        WHEN slug_ctx = 'name-all-nct-dream' AND mname = 'Mark' THEN '/idols/Mark NCT DREAM.jpg'
        WHEN slug_ctx = 'name-all-nct-dream' AND mname = 'Renjun' THEN '/idols/Renjun NCT DREAM.jpg'
        WHEN slug_ctx = 'name-all-nct-dream' AND mname = 'Jeno' THEN '/idols/Jeno NCT DREAM.jpg'
        WHEN slug_ctx = 'name-all-nct-dream' AND mname = 'Haechan' THEN '/idols/Haechan NCT DREAL.jpg'
        WHEN slug_ctx = 'name-all-nct-dream' AND mname = 'Jaemin' THEN '/idols/Jaemin NCT DREAM.jpg'
        WHEN slug_ctx = 'name-all-nct-dream' AND mname = 'Chenle' THEN '/idols/Chenle NCT DREAM.jpg'
        WHEN slug_ctx = 'name-all-nct-dream' AND mname = 'Jisung' THEN '/idols/Jisung NCT DREAM.jpg'
        -- SHINee
        WHEN slug_ctx = 'name-all-shinee' AND mname = 'Onew' THEN '/idols/Onew SHINEE.jpg'
        WHEN slug_ctx = 'name-all-shinee' AND mname = 'Key' THEN '/idols/Key SHINee.jpg'
        WHEN slug_ctx = 'name-all-shinee' AND mname = 'Minho' THEN '/idols/Minho SHINee.jpg'
        WHEN slug_ctx = 'name-all-shinee' AND mname = 'Taemin' THEN '/idols/Taemin SHINee.jpg'
        -- NMIXX
        WHEN slug_ctx = 'name-all-nmixx' AND mname = 'Lily' THEN '/idols/Lily NMIXX.jpg'
        WHEN slug_ctx = 'name-all-nmixx' AND mname = 'Haewon' THEN '/idols/Haewon NMIXX.jpg'
        WHEN slug_ctx = 'name-all-nmixx' AND mname = 'Sullyoon' THEN '/idols/Sullyoon NMIXX.jpg'
        WHEN slug_ctx = 'name-all-nmixx' AND mname = 'Bae' THEN '/idols/Bae NMIXX.jpg'
        WHEN slug_ctx = 'name-all-nmixx' AND mname = 'Jiwoo' THEN '/idols/Jiwoo NMIXX.jpg'
        WHEN slug_ctx = 'name-all-nmixx' AND mname = 'Kyujin' THEN '/idols/Kyujin NMIXX.jpg'
        -- GOT7
        WHEN slug_ctx = 'name-all-got7' AND mname = 'JB' THEN '/idols/JB GOT7.jpg'
        WHEN slug_ctx = 'name-all-got7' AND mname = 'Mark' THEN '/idols/Mark GOT7.jpg'
        WHEN slug_ctx = 'name-all-got7' AND mname = 'Jackson' THEN '/idols/Jackson GOT7.jpg'
        WHEN slug_ctx = 'name-all-got7' AND mname = 'Jinyoung' THEN '/idols/Jinyoung GOT7.jpg'
        WHEN slug_ctx = 'name-all-got7' AND mname = 'Youngjae' THEN '/idols/Youngjae GOT7.jpg'
        WHEN slug_ctx = 'name-all-got7' AND mname = 'BamBam' THEN '/idols/BamBam GOT7.jpg'
        WHEN slug_ctx = 'name-all-got7' AND mname = 'Yugyeom' THEN '/idols/Yugyeom GOT7.jpg'
        -- MAMAMOO
        WHEN slug_ctx = 'name-all-mamamoo' AND mname = 'Solar' THEN '/idols/Solar MAMAMOO.jpg'
        WHEN slug_ctx = 'name-all-mamamoo' AND mname = 'Moonbyul' THEN '/idols/Moonbyul MAMAMOO.jpg'
        WHEN slug_ctx = 'name-all-mamamoo' AND mname = 'Wheein' THEN '/idols/Wheein MAMAMOO.jpg'
        WHEN slug_ctx = 'name-all-mamamoo' AND mname = 'Hwasa' THEN '/idols/Hwasa MAMAMOO.jpg'
        -- TREASURE
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Hyunsuk' THEN '/idols/Hyunsuk Treasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Jihoon' THEN '/idols/Jihoon Treasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Yoshi' THEN '/idols/Yoshi Trasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Junkyu' THEN '/idols/Junkyu Treasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Mashiho' THEN '/idols/Mashiho Treasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Jaehyuk' THEN '/idols/Jaehyuk Treasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Asahi' THEN '/idols/Asahi Treasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Yedam' THEN '/idols/Yedam Treasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Doyoung' THEN '/idols/Doyoung Treasure.jpg'
        WHEN slug_ctx = 'name-all-treasure' AND mname = 'Haruto' THEN '/idols/Haruto Treasure.jpg'
        -- BABYMONSTER
        WHEN slug_ctx = 'name-all-babymonster' AND mname = 'Ruka' THEN '/idols/Ruka BABYMONSTER.jpg'
        WHEN slug_ctx = 'name-all-babymonster' AND mname = 'Pharita' THEN '/idols/Pharita BABYMONSTER.jpg'
        WHEN slug_ctx = 'name-all-babymonster' AND mname = 'Asa' THEN '/idols/Asa BABYMONSTER.jpg'
        WHEN slug_ctx = 'name-all-babymonster' AND mname = 'Ahyeon' THEN '/idols/Ahyeon BABYMONSTER.jpg'
        WHEN slug_ctx = 'name-all-babymonster' AND mname = 'Rami' THEN '/idols/Rami BABYMONSTER.jpg'
        WHEN slug_ctx = 'name-all-babymonster' AND mname = 'Chiquita' THEN '/idols/Chiquita BABYMONSTER.jpg'
        WHEN slug_ctx = 'name-all-babymonster' AND mname = 'Haram' THEN '/idols/Haram BABYMONSTER.jpg'
        ELSE NULL
      END;

      IF img IS NOT NULL THEN
        updated_content := jsonb_set(
          updated_content,
          ARRAY['members', i::text, 'photo_url'],
          to_jsonb(img)
        );
        changed := true;
      END IF;
    END LOOP;

    IF changed THEN
      UPDATE public.games SET content = updated_content WHERE id = g.id;
      RAISE NOTICE 'Updated %', g.slug;
    END IF;
  END LOOP;
END $$;
