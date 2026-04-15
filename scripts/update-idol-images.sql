-- ============================================================
-- Update idol images across tot_items, intruder quizzes, and
-- image quizzes. Run against your Supabase database.
-- ============================================================

BEGIN;

-- ============================================================
-- PART 1: Update tot_items (This or That idol items)
-- ============================================================
-- Strategy: Use a VALUES join to set image_url for all idol items
-- in idol-type categories. Handle ambiguous names (Mark, Haechan,
-- Doyoung) by matching subtitle as well. All other names are
-- unique across idol categories, so name-only matching is safe.

-- 1a. Update all uniquely-named idols (no name collisions)
UPDATE public.tot_items AS t
SET image_url = v.img
FROM (VALUES
  -- BTS
  ('RM',           '/idols/RM BTS.jpg'),
  ('Jin',          '/idols/Jin BTS.jpg'),
  ('Suga',         '/idols/Suga BTS.jpg'),
  ('J-Hope',       '/idols/J-Hope BTS.jpg'),
  ('Jimin',        '/idols/Jimin BTS.jpg'),
  ('V',            '/idols/V BTS.jpg'),
  ('Jungkook',     '/idols/Jungkook BTS.jpg'),
  -- BLACKPINK
  ('Jisoo',        '/idols/Jisoo BLACKPINK.jpg'),
  ('Jennie',       '/idols/Jennie BLACKPINK.jpg'),
  ('Rose',         '/idols/Rose BLACKPINK.jpg'),
  ('Lisa',         '/idols/Lisa BLACKPINK.jpg'),
  -- Stray Kids
  ('Felix',        '/idols/Felix STRAYKIDS.jpg'),
  ('Hyunjin',      '/idols/Hyunjin STRAYKIDS.jpg'),
  ('Bang Chan',    '/idols/Bang Chan STRYKIDS.jpg'),
  ('Han',          '/idols/Han STRAYKIDS.jpg'),
  ('Lee Know',     '/idols/Lee Know STAYKIDS.jpg'),
  ('Changbin',     '/idols/Changbin STRAYKIDS.jpg'),
  ('Seungmin',     '/idols/Seungmin STRAYKIDS.jpg'),
  ('I.N',          '/idols/I.N stray kids.jpg'),
  -- SEVENTEEN
  ('Mingyu',       '/idols/Mingyu SEVENTEEN.jpg'),
  ('Hoshi',        '/idols/Hoshi SEVENTEEN.jpg'),
  ('Woozi',        '/idols/Woozi SEVENTEEN.jpg'),
  ('S.Coups',      '/idols/S.Coups SEVENTEEN.jpg'),
  ('Jeonghan',     '/idols/Jeonghan SEVENTEEN.jpg'),
  ('Joshua',       '/idols/Joshua SEVENTEEN.jpg'),
  ('Jun',          '/idols/Jun SEVENTEEN.jpg'),
  ('Wonwoo',       '/idols/Wonwoo SEVENTEEN.jpg'),
  ('DK',           '/idols/DK SEVENTEEN.jpg'),
  ('The8',         '/idols/The8 SEVENTEEN.jpg'),
  ('Seungkwan',    '/idols/Seungkwan SEVENTEEN.jpg'),
  ('Vernon',       '/idols/Vernon SEVENTEEN.jpg'),
  ('Dino',         '/idols/Dino SEVENTEEN.jpg'),
  -- aespa
  ('Karina',       '/idols/Karina AESPA.jpg'),
  ('Winter',       '/idols/Winter AESPA.jpg'),
  ('Ningning',     '/idols/Ningning AESPA.jpg'),
  ('Giselle',      '/idols/Giselle AESPA.jpg'),
  -- IVE
  ('Wonyoung',     '/idols/Wonyoung IVE.jpg'),
  ('Yujin',        '/idols/Yujin IVE.jpg'),
  ('Gaeul',        '/idols/Gaeul IVE.jpg'),
  ('Rei',          '/idols/Rei IVE.jpg'),
  ('Liz',          '/idols/Liz IVE.jpg'),
  ('Leeseo',       '/idols/Leeseo IVE.jpg'),
  -- NewJeans
  ('Minji',        '/idols/Minji NEWJEANS.jpg'),
  ('Hanni',        '/idols/Hanni NEWJEANS.jpg'),
  ('Danielle',     '/idols/Danielle NEWJEANS.jpg'),
  ('Haerin',       '/idols/Haerin NEWJEANS.jpg'),
  ('Hyein',        '/idols/Hyein NEWJEANS.jpg'),
  -- TWICE
  ('Nayeon',       '/idols/Nayeon Twice.jpg'),
  ('Sana',         '/idols/Sana Twice.jpg'),
  ('Momo',         '/idols/Momo Twice.jpg'),
  ('Tzuyu',        '/idols/Tzuyu Twice.jpg'),
  ('Jeongyeon',    '/idols/Jeongyeon Twice.jpg'),
  ('Jihyo',        '/idols/Jihyo Twice.jpg'),
  ('Mina',         '/idols/Mina Twice.jpg'),
  ('Dahyun',       '/idols/Dahyun TWICE.jpg'),
  ('Chaeyoung',    '/idols/Chaeyoung Twice.jpg'),
  -- ITZY
  ('Yeji',         '/idols/Yeji ITZY.jpg'),
  ('Ryujin',       '/idols/Ryujin ITZY.jpg'),
  ('Yuna',         '/idols/Yuna ITZY.jpg'),
  ('Lia',          '/idols/Lia ITZY.jpg'),
  ('Chaeryeong',   '/idols/Chaeryeong ITZY.jpg'),
  -- LE SSERAFIM
  ('Chaewon',      '/idols/Chaewon LESSERAFIM.jpg'),
  ('Sakura',       '/idols/Sakura LESSERAFIM.jpg'),
  ('Kazuha',       '/idols/Kazuha LESSERAFIM.jpg'),
  ('Yunjin',       '/idols/Yunjin LESSERAFIM.jpg'),
  ('Eunchae',      '/idols/Eunchae LESSERAFIM.jpg'),
  -- Red Velvet
  ('Irene',        '/idols/Irene REDVELVET.jpg'),
  ('Seulgi',       '/idols/Seulgi REDVELVET.jpg'),
  ('Joy',          '/idols/Joy REDVELVET.jpg'),
  ('Wendy',        '/idols/Wendy REDVELVET.jpg'),
  ('Yeri',         '/idols/Yeri REDVELVET.jpg'),
  -- MAMAMOO
  ('Hwasa',        '/idols/Hwasa MAMAMOO.jpg'),
  ('Solar',        '/idols/Solar MAMAMOO.jpg'),
  ('Moonbyul',     '/idols/Moonbyul MAMAMOO.jpg'),
  ('Wheein',       '/idols/Wheein MAMAMOO.jpg'),
  -- (G)I-DLE
  ('Soyeon',       '/idols/Soyeon G-IDLE.jpg'),
  ('Miyeon',       '/idols/Miyeon G-idle.jpg'),
  ('Minnie',       '/idols/Minnie G-IDLE.jpg'),
  ('Yuqi',         '/idols/Yuqi G-IDLE.jpg'),
  ('Shuhua',       '/idols/Shuhua G-IDLE.jpg'),
  -- ATEEZ
  ('San',          '/idols/San ATEEZ.jpg'),
  ('Hongjoong',    '/idols/Hongjoong ATEEZ.jpg'),
  ('Wooyoung',     '/idols/Wooyoung ATEEZ.jpg'),
  ('Yunho',        '/idols/Yunho ATEEZ.jpg'),
  ('Mingi',        '/idols/Mingi ATEEZ.jpg'),
  ('Seonghwa',     '/idols/Seonghwa ATEEZ.jpg'),
  ('Jongho',       '/idols/Jongho ATEEZ.jpg'),
  ('Yeosang',      '/idols/Yeosang ATEEZ.jpg'),
  -- NCT 127
  ('Taeyong',      '/idols/Taeyong NCT 127.jpg'),
  ('Jaehyun',      '/idols/Jaehyun NCT 127.jpg'),
  ('Johnny',       '/idols/Johnny NCT 127.jpg'),
  ('Yuta',         '/idols/Yuta NCT 127.jpg'),
  ('Taeil',        '/idols/Taeil NCT 127.jpg'),
  ('Jungwoo',      '/idols/Jungwoo NCT 127.jpg'),
  -- ENHYPEN
  ('Heeseung',     '/idols/Heeseung ENHYPEN.jpg'),
  ('Jay',          '/idols/Jay ENHYPEN.jpg'),
  ('Jake',         '/idols/Jake ENHYPEN.jpg'),
  ('Sunghoon',     '/idols/Sunghoon ENHYPEN.jpg'),
  ('Sunoo',        '/idols/Sunoo ENHYPEN.jpg'),
  ('Jungwon',      '/idols/Jungwon ENHYPEN.jpg'),
  ('Ni-ki',        '/idols/Ni-ki ENHYPEN.jpg'),
  -- TXT
  ('Yeonjun',      '/idols/Yeonjun TXT.jpg'),
  ('Soobin',       '/idols/Soobin TXT.jpg'),
  ('Beomgyu',      '/idols/Beomgyu TXT.jpg'),
  ('Taehyun',      '/idols/Taehyun TXT.jpg'),
  ('Huening Kai',  '/idols/Huening Kai TXT.jpg'),
  -- EXO
  ('Baekhyun',     '/idols/Baekhyun EXO.jpg'),
  ('Kai',          '/idols/Kai EXO.jpg'),
  ('D.O.',         '/idols/D.O. EXO.jpg'),
  ('Chanyeol',     '/idols/Chanyeol EXO.jpg'),
  ('Xiumin',       '/idols/Xiumin EXO.jpg'),
  ('Suho',         '/idols/Suho EXO.jpg'),
  ('Lay',          '/idols/Lay EXO.jpg'),
  ('Chen',         '/idols/Chen EXO.jpg'),
  ('Sehun',        '/idols/Sehun EXO.jpg'),
  -- SHINee
  ('Taemin',       '/idols/Taemin SHINee.jpg'),
  ('Onew',         '/idols/Onew SHINEE.jpg'),
  ('Key',          '/idols/Key SHINee.jpg'),
  ('Minho',        '/idols/Minho SHINee.jpg'),
  -- GOT7
  ('Jackson',      '/idols/Jackson GOT7.jpg'),
  ('BamBam',       '/idols/BamBam GOT7.jpg'),
  ('Youngjae',     '/idols/Youngjae GOT7.jpg'),
  ('JB',           '/idols/JB GOT7.jpg'),
  ('Jinyoung',     '/idols/Jinyoung GOT7.jpg'),
  ('Yugyeom',      '/idols/Yugyeom GOT7.jpg'),
  -- NMIXX
  ('Lily',         '/idols/Lily NMIXX.jpg'),
  ('Haewon',       '/idols/Haewon NMIXX.jpg'),
  ('Sullyoon',     '/idols/Sullyoon NMIXX.jpg'),
  ('Bae',          '/idols/Bae NMIXX.jpg'),
  ('Jiwoo',        '/idols/Jiwoo NMIXX.jpg'),
  ('Kyujin',       '/idols/Kyujin NMIXX.jpg')
) AS v(name, img)
WHERE t.name = v.name
  -- Exclude ambiguous names handled separately below
  AND t.name NOT IN ('Mark', 'Haechan', 'Doyoung')
  AND t.category_id IN (SELECT id FROM public.tot_categories WHERE type = 'idol');

-- 1b. Handle ambiguous names: Mark (NCT 127 vs GOT7)
UPDATE public.tot_items
SET image_url = '/idols/Mark NCT 127.jpg'
WHERE name = 'Mark'
  AND subtitle = 'NCT 127'
  AND category_id IN (SELECT id FROM public.tot_categories WHERE type = 'idol');

UPDATE public.tot_items
SET image_url = '/idols/Mark GOT7.jpg'
WHERE name = 'Mark'
  AND subtitle = 'GOT7'
  AND category_id IN (SELECT id FROM public.tot_categories WHERE type = 'idol');

-- 1c. Handle ambiguous names: Haechan (NCT 127 vs NCT Dream)
UPDATE public.tot_items
SET image_url = '/idols/Haechan NCT 127.jpg'
WHERE name = 'Haechan'
  AND subtitle = 'NCT 127'
  AND category_id IN (SELECT id FROM public.tot_categories WHERE type = 'idol');

UPDATE public.tot_items
SET image_url = '/idols/Haechan NCT DREAL.jpg'
WHERE name = 'Haechan'
  AND subtitle = 'NCT Dream'
  AND category_id IN (SELECT id FROM public.tot_categories WHERE type = 'idol');

-- 1d. Handle ambiguous names: Doyoung (NCT 127 vs TREASURE)
UPDATE public.tot_items
SET image_url = '/idols/Doyoung NCT 127.jpg'
WHERE name = 'Doyoung'
  AND subtitle = 'NCT 127'
  AND category_id IN (SELECT id FROM public.tot_categories WHERE type = 'idol');

UPDATE public.tot_items
SET image_url = '/idols/Doyoung Treasure.jpg'
WHERE name = 'Doyoung'
  AND subtitle = 'TREASURE'
  AND category_id IN (SELECT id FROM public.tot_categories WHERE type = 'idol');


-- ============================================================
-- PART 2: Update intruder quiz option images
-- ============================================================
-- For quizzes with quiz_type = 'intruder', update the JSONB
-- questions array. Each question has options with label and
-- image_url fields. We use a PL/pgSQL DO block to iterate
-- through questions and options, setting the correct image_url
-- based on the idol label.

DO $$
DECLARE
  q RECORD;
  updated_questions JSONB;
  i INT;
  j INT;
  label TEXT;
  idol_name TEXT;
  img TEXT;
BEGIN
  FOR q IN SELECT id, questions FROM public.quizzes WHERE quiz_type = 'intruder' LOOP
    updated_questions := q.questions;

    FOR i IN 0..jsonb_array_length(q.questions) - 1 LOOP
      FOR j IN 0..jsonb_array_length(q.questions->i->'options') - 1 LOOP
        label := q.questions->i->'options'->j->>'label';

        -- Strip group name in parens if present, e.g. "Karina (aespa)" -> "Karina"
        idol_name := regexp_replace(label, '\s*\(.*\)$', '');

        -- Map idol name to image path
        img := CASE idol_name
          -- BTS
          WHEN 'RM'         THEN '/idols/RM BTS.jpg'
          WHEN 'Jin'        THEN '/idols/Jin BTS.jpg'
          WHEN 'Suga'       THEN '/idols/Suga BTS.jpg'
          WHEN 'J-Hope'     THEN '/idols/J-Hope BTS.jpg'
          WHEN 'Jimin'      THEN '/idols/Jimin BTS.jpg'
          WHEN 'V'          THEN '/idols/V BTS.jpg'
          WHEN 'Jungkook'   THEN '/idols/Jungkook BTS.jpg'
          -- BLACKPINK
          WHEN 'Jisoo'      THEN '/idols/Jisoo BLACKPINK.jpg'
          WHEN 'Jennie'     THEN '/idols/Jennie BLACKPINK.jpg'
          WHEN 'Rose'       THEN '/idols/Rose BLACKPINK.jpg'
          WHEN 'Lisa'       THEN '/idols/Lisa BLACKPINK.jpg'
          -- SEVENTEEN
          WHEN 'Mingyu'     THEN '/idols/Mingyu SEVENTEEN.jpg'
          WHEN 'Hoshi'      THEN '/idols/Hoshi SEVENTEEN.jpg'
          WHEN 'Woozi'      THEN '/idols/Woozi SEVENTEEN.jpg'
          WHEN 'S.Coups'    THEN '/idols/S.Coups SEVENTEEN.jpg'
          WHEN 'Jeonghan'   THEN '/idols/Jeonghan SEVENTEEN.jpg'
          WHEN 'Joshua'     THEN '/idols/Joshua SEVENTEEN.jpg'
          WHEN 'Jun'        THEN '/idols/Jun SEVENTEEN.jpg'
          WHEN 'Wonwoo'     THEN '/idols/Wonwoo SEVENTEEN.jpg'
          WHEN 'DK'         THEN '/idols/DK SEVENTEEN.jpg'
          WHEN 'The8'       THEN '/idols/The8 SEVENTEEN.jpg'
          WHEN 'Seungkwan'  THEN '/idols/Seungkwan SEVENTEEN.jpg'
          WHEN 'Vernon'     THEN '/idols/Vernon SEVENTEEN.jpg'
          WHEN 'Dino'       THEN '/idols/Dino SEVENTEEN.jpg'
          -- Stray Kids
          WHEN 'Felix'      THEN '/idols/Felix STRAYKIDS.jpg'
          WHEN 'Hyunjin'    THEN '/idols/Hyunjin STRAYKIDS.jpg'
          WHEN 'Bang Chan'  THEN '/idols/Bang Chan STRYKIDS.jpg'
          WHEN 'Han'        THEN '/idols/Han STRAYKIDS.jpg'
          WHEN 'Lee Know'   THEN '/idols/Lee Know STAYKIDS.jpg'
          WHEN 'Changbin'   THEN '/idols/Changbin STRAYKIDS.jpg'
          WHEN 'Seungmin'   THEN '/idols/Seungmin STRAYKIDS.jpg'
          WHEN 'I.N'        THEN '/idols/I.N stray kids.jpg'
          -- aespa
          WHEN 'Karina'     THEN '/idols/Karina AESPA.jpg'
          WHEN 'Winter'     THEN '/idols/Winter AESPA.jpg'
          WHEN 'Ningning'   THEN '/idols/Ningning AESPA.jpg'
          WHEN 'Giselle'    THEN '/idols/Giselle AESPA.jpg'
          -- IVE
          WHEN 'Wonyoung'   THEN '/idols/Wonyoung IVE.jpg'
          WHEN 'Yujin'      THEN '/idols/Yujin IVE.jpg'
          WHEN 'Gaeul'      THEN '/idols/Gaeul IVE.jpg'
          WHEN 'Rei'        THEN '/idols/Rei IVE.jpg'
          WHEN 'Liz'        THEN '/idols/Liz IVE.jpg'
          WHEN 'Leeseo'     THEN '/idols/Leeseo IVE.jpg'
          -- NewJeans
          WHEN 'Minji'      THEN '/idols/Minji NEWJEANS.jpg'
          WHEN 'Hanni'      THEN '/idols/Hanni NEWJEANS.jpg'
          WHEN 'Danielle'   THEN '/idols/Danielle NEWJEANS.jpg'
          WHEN 'Haerin'     THEN '/idols/Haerin NEWJEANS.jpg'
          WHEN 'Hyein'      THEN '/idols/Hyein NEWJEANS.jpg'
          -- TWICE
          WHEN 'Nayeon'     THEN '/idols/Nayeon Twice.jpg'
          WHEN 'Sana'       THEN '/idols/Sana Twice.jpg'
          WHEN 'Momo'       THEN '/idols/Momo Twice.jpg'
          WHEN 'Tzuyu'      THEN '/idols/Tzuyu Twice.jpg'
          WHEN 'Jeongyeon'  THEN '/idols/Jeongyeon Twice.jpg'
          WHEN 'Jihyo'      THEN '/idols/Jihyo Twice.jpg'
          WHEN 'Mina'       THEN '/idols/Mina Twice.jpg'
          WHEN 'Dahyun'     THEN '/idols/Dahyun TWICE.jpg'
          WHEN 'Chaeyoung'  THEN '/idols/Chaeyoung Twice.jpg'
          -- ITZY
          WHEN 'Yeji'       THEN '/idols/Yeji ITZY.jpg'
          WHEN 'Ryujin'     THEN '/idols/Ryujin ITZY.jpg'
          WHEN 'Yuna'       THEN '/idols/Yuna ITZY.jpg'
          WHEN 'Lia'        THEN '/idols/Lia ITZY.jpg'
          WHEN 'Chaeryeong' THEN '/idols/Chaeryeong ITZY.jpg'
          -- LE SSERAFIM
          WHEN 'Chaewon'    THEN '/idols/Chaewon LESSERAFIM.jpg'
          WHEN 'Sakura'     THEN '/idols/Sakura LESSERAFIM.jpg'
          WHEN 'Kazuha'     THEN '/idols/Kazuha LESSERAFIM.jpg'
          WHEN 'Yunjin'     THEN '/idols/Yunjin LESSERAFIM.jpg'
          WHEN 'Eunchae'    THEN '/idols/Eunchae LESSERAFIM.jpg'
          -- Red Velvet
          WHEN 'Irene'      THEN '/idols/Irene REDVELVET.jpg'
          WHEN 'Seulgi'     THEN '/idols/Seulgi REDVELVET.jpg'
          WHEN 'Joy'        THEN '/idols/Joy REDVELVET.jpg'
          WHEN 'Wendy'      THEN '/idols/Wendy REDVELVET.jpg'
          WHEN 'Yeri'       THEN '/idols/Yeri REDVELVET.jpg'
          -- MAMAMOO
          WHEN 'Hwasa'      THEN '/idols/Hwasa MAMAMOO.jpg'
          WHEN 'Solar'      THEN '/idols/Solar MAMAMOO.jpg'
          WHEN 'Moonbyul'   THEN '/idols/Moonbyul MAMAMOO.jpg'
          WHEN 'Wheein'     THEN '/idols/Wheein MAMAMOO.jpg'
          -- (G)I-DLE
          WHEN 'Soyeon'     THEN '/idols/Soyeon G-IDLE.jpg'
          WHEN 'Miyeon'     THEN '/idols/Miyeon G-idle.jpg'
          WHEN 'Minnie'     THEN '/idols/Minnie G-IDLE.jpg'
          WHEN 'Yuqi'       THEN '/idols/Yuqi G-IDLE.jpg'
          WHEN 'Shuhua'     THEN '/idols/Shuhua G-IDLE.jpg'
          -- ATEEZ
          WHEN 'San'        THEN '/idols/San ATEEZ.jpg'
          WHEN 'Hongjoong'  THEN '/idols/Hongjoong ATEEZ.jpg'
          WHEN 'Wooyoung'   THEN '/idols/Wooyoung ATEEZ.jpg'
          WHEN 'Yunho'      THEN '/idols/Yunho ATEEZ.jpg'
          WHEN 'Mingi'      THEN '/idols/Mingi ATEEZ.jpg'
          WHEN 'Seonghwa'   THEN '/idols/Seonghwa ATEEZ.jpg'
          WHEN 'Jongho'     THEN '/idols/Jongho ATEEZ.jpg'
          WHEN 'Yeosang'    THEN '/idols/Yeosang ATEEZ.jpg'
          -- NCT 127
          WHEN 'Taeyong'    THEN '/idols/Taeyong NCT 127.jpg'
          WHEN 'Mark'       THEN '/idols/Mark NCT 127.jpg'
          WHEN 'Jaehyun'    THEN '/idols/Jaehyun NCT 127.jpg'
          WHEN 'Haechan'    THEN '/idols/Haechan NCT 127.jpg'
          WHEN 'Johnny'     THEN '/idols/Johnny NCT 127.jpg'
          WHEN 'Doyoung'    THEN '/idols/Doyoung NCT 127.jpg'
          WHEN 'Yuta'       THEN '/idols/Yuta NCT 127.jpg'
          WHEN 'Taeil'      THEN '/idols/Taeil NCT 127.jpg'
          WHEN 'Jungwoo'    THEN '/idols/Jungwoo NCT 127.jpg'
          -- NCT Dream
          WHEN 'Jaemin'     THEN '/idols/Jaemin NCT DREAM.jpg'
          WHEN 'Jeno'       THEN '/idols/Jeno NCT DREAM.jpg'
          WHEN 'Renjun'     THEN '/idols/Renjun NCT DREAM.jpg'
          WHEN 'Chenle'     THEN '/idols/Chenle NCT DREAM.jpg'
          WHEN 'Jisung'     THEN '/idols/Jisung NCT DREAM.jpg'
          -- ENHYPEN
          WHEN 'Heeseung'   THEN '/idols/Heeseung ENHYPEN.jpg'
          WHEN 'Jay'        THEN '/idols/Jay ENHYPEN.jpg'
          WHEN 'Jake'       THEN '/idols/Jake ENHYPEN.jpg'
          WHEN 'Sunghoon'   THEN '/idols/Sunghoon ENHYPEN.jpg'
          WHEN 'Sunoo'      THEN '/idols/Sunoo ENHYPEN.jpg'
          WHEN 'Jungwon'    THEN '/idols/Jungwon ENHYPEN.jpg'
          WHEN 'Ni-ki'      THEN '/idols/Ni-ki ENHYPEN.jpg'
          -- TXT
          WHEN 'Yeonjun'    THEN '/idols/Yeonjun TXT.jpg'
          WHEN 'Soobin'     THEN '/idols/Soobin TXT.jpg'
          WHEN 'Beomgyu'    THEN '/idols/Beomgyu TXT.jpg'
          WHEN 'Taehyun'    THEN '/idols/Taehyun TXT.jpg'
          WHEN 'Huening Kai' THEN '/idols/Huening Kai TXT.jpg'
          -- EXO
          WHEN 'Baekhyun'   THEN '/idols/Baekhyun EXO.jpg'
          WHEN 'Kai'        THEN '/idols/Kai EXO.jpg'
          WHEN 'D.O.'       THEN '/idols/D.O. EXO.jpg'
          WHEN 'Chanyeol'   THEN '/idols/Chanyeol EXO.jpg'
          WHEN 'Xiumin'     THEN '/idols/Xiumin EXO.jpg'
          WHEN 'Suho'       THEN '/idols/Suho EXO.jpg'
          WHEN 'Lay'        THEN '/idols/Lay EXO.jpg'
          WHEN 'Chen'       THEN '/idols/Chen EXO.jpg'
          WHEN 'Sehun'      THEN '/idols/Sehun EXO.jpg'
          -- SHINee
          WHEN 'Taemin'     THEN '/idols/Taemin SHINee.jpg'
          WHEN 'Onew'       THEN '/idols/Onew SHINEE.jpg'
          WHEN 'Key'        THEN '/idols/Key SHINee.jpg'
          WHEN 'Minho'      THEN '/idols/Minho SHINee.jpg'
          -- GOT7
          WHEN 'Jackson'    THEN '/idols/Jackson GOT7.jpg'
          WHEN 'BamBam'     THEN '/idols/BamBam GOT7.jpg'
          WHEN 'Youngjae'   THEN '/idols/Youngjae GOT7.jpg'
          WHEN 'JB'         THEN '/idols/JB GOT7.jpg'
          WHEN 'Jinyoung'   THEN '/idols/Jinyoung GOT7.jpg'
          WHEN 'Yugyeom'    THEN '/idols/Yugyeom GOT7.jpg'
          -- NMIXX
          WHEN 'Lily'       THEN '/idols/Lily NMIXX.jpg'
          WHEN 'Haewon'     THEN '/idols/Haewon NMIXX.jpg'
          WHEN 'Sullyoon'   THEN '/idols/Sullyoon NMIXX.jpg'
          WHEN 'Bae'        THEN '/idols/Bae NMIXX.jpg'
          WHEN 'Jiwoo'      THEN '/idols/Jiwoo NMIXX.jpg'
          WHEN 'Kyujin'     THEN '/idols/Kyujin NMIXX.jpg'
          ELSE NULL
        END;

        IF img IS NOT NULL THEN
          updated_questions := jsonb_set(
            updated_questions,
            ARRAY[i::text, 'options', j::text, 'image_url'],
            to_jsonb(img)
          );
        END IF;
      END LOOP;
    END LOOP;

    IF updated_questions IS DISTINCT FROM q.questions THEN
      UPDATE public.quizzes SET questions = updated_questions WHERE id = q.id;
    END IF;
  END LOOP;
END $$;


-- ============================================================
-- PART 3: Update image quiz questions (guess the male idol)
-- ============================================================
-- For the quiz 'can-you-name-these-male-kpop-idols', set the
-- question-level image_url to the correct answer's idol photo.
-- The correct answer is determined by options[correct].

DO $$
DECLARE
  quiz_row RECORD;
  updated_questions JSONB;
  i INT;
  correct_idx INT;
  correct_name TEXT;
  img TEXT;
BEGIN
  FOR quiz_row IN
    SELECT id, questions
    FROM public.quizzes
    WHERE quiz_type = 'image'
      AND slug = 'can-you-name-these-male-kpop-idols'
  LOOP
    updated_questions := quiz_row.questions;

    FOR i IN 0..jsonb_array_length(quiz_row.questions) - 1 LOOP
      correct_idx := (quiz_row.questions->i->>'correct')::int;
      correct_name := quiz_row.questions->i->'options'->>correct_idx;

      img := CASE correct_name
        WHEN 'Bang Chan'  THEN '/idols/Bang Chan STRYKIDS.jpg'
        WHEN 'Soobin'     THEN '/idols/Soobin TXT.jpg'
        WHEN 'Hoshi'      THEN '/idols/Hoshi SEVENTEEN.jpg'
        WHEN 'San'        THEN '/idols/San ATEEZ.jpg'
        WHEN 'Jaemin'     THEN '/idols/Jaemin NCT DREAM.jpg'
        WHEN 'Sunghoon'   THEN '/idols/Sunghoon ENHYPEN.jpg'
        WHEN 'Baekhyun'   THEN '/idols/Baekhyun EXO.jpg'
        WHEN 'Taemin'     THEN '/idols/Taemin SHINee.jpg'
        WHEN 'Jackson'    THEN '/idols/Jackson GOT7.jpg'
        WHEN 'Hongjoong'  THEN '/idols/Hongjoong ATEEZ.jpg'
        ELSE NULL
      END;

      IF img IS NOT NULL THEN
        updated_questions := jsonb_set(
          updated_questions,
          ARRAY[i::text, 'image_url'],
          to_jsonb(img)
        );
      END IF;
    END LOOP;

    IF updated_questions IS DISTINCT FROM quiz_row.questions THEN
      UPDATE public.quizzes SET questions = updated_questions WHERE id = quiz_row.id;
    END IF;
  END LOOP;
END $$;

COMMIT;
