-- Quiz 9: 4th Gen Intruder - User3
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  (SELECT id FROM public.groups WHERE slug = 'general-kpop'),
  'Find the 3rd Gen Intruder Among 4th Gen',
  'find-the-3rd-gen-intruder-among-4th-gen',
  'intruder', 'hard', 10, 'published',
  '[
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Karina (aespa)","image_url":"/idols/Karina AESPA.jpg"},{"label":"Wonyoung (IVE)","image_url":"/idols/Wonyoung IVE.jpg"},{"label":"Minji (NewJeans)","image_url":"/idols/Minji NEWJEANS.jpg"},{"label":"Irene (Red Velvet)","image_url":"/idols/Irene REDVELVET.jpg"}],"correct":3,"fun_fact":"Irene debuted with Red Velvet in 2014, making her 3rd gen"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Yeonjun (TXT)","image_url":"/idols/Yeonjun TXT.jpg"},{"label":"Jake (ENHYPEN)","image_url":"/idols/Jake ENHYPEN.jpg"},{"label":"Jongseob (P1Harmony)","image_url":null},{"label":"Jungkook (BTS)","image_url":"/idols/Jungkook BTS.jpg"}],"correct":3,"fun_fact":"Jungkook debuted with BTS in 2013"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Kazuha (LE SSERAFIM)","image_url":"/idols/Kazuha LESSERAFIM.jpg"},{"label":"Sullyoon (NMIXX)","image_url":"/idols/Sullyoon NMIXX.jpg"},{"label":"Haerin (NewJeans)","image_url":"/idols/Haerin NEWJEANS.jpg"},{"label":"Momo (TWICE)","image_url":"/idols/Momo Twice.jpg"}],"correct":3,"fun_fact":"Momo debuted with TWICE in 2015"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Felix (Stray Kids)","image_url":"/idols/Felix STRAYKIDS.jpg"},{"label":"Ni-ki (ENHYPEN)","image_url":"/idols/Ni-ki ENHYPEN.jpg"},{"label":"Hanbin (ZEROBASEONE)","image_url":null},{"label":"Mark (NCT)","image_url":"/idols/Mark NCT 127.jpg"}],"correct":3,"fun_fact":"Mark debuted with NCT 127 in 2016"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Yeji (ITZY)","image_url":"/idols/Yeji ITZY.jpg"},{"label":"Miyeon ((G)I-DLE)","image_url":"/idols/Miyeon G-idle.jpg"},{"label":"Chaewon (LE SSERAFIM)","image_url":"/idols/Chaewon LESSERAFIM.jpg"},{"label":"Joy (Red Velvet)","image_url":"/idols/Joy REDVELVET.jpg"}],"correct":3,"fun_fact":"Joy debuted with Red Velvet in 2014"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Soobin (TXT)","image_url":"/idols/Soobin TXT.jpg"},{"label":"Heeseung (ENHYPEN)","image_url":"/idols/Heeseung ENHYPEN.jpg"},{"label":"Gunwook (ZEROBASEONE)","image_url":null},{"label":"Woozi (SEVENTEEN)","image_url":"/idols/Woozi SEVENTEEN.jpg"}],"correct":3,"fun_fact":"Woozi debuted with SEVENTEEN in 2015"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Ryujin (ITZY)","image_url":"/idols/Ryujin ITZY.jpg"},{"label":"Winter (aespa)","image_url":"/idols/Winter AESPA.jpg"},{"label":"Jiwoo (NMIXX)","image_url":"/idols/Jiwoo NMIXX.jpg"},{"label":"Seulgi (Red Velvet)","image_url":"/idols/Seulgi REDVELVET.jpg"}],"correct":3,"fun_fact":"Seulgi trained at SM for 7 years before debuting"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Hyunjin (Stray Kids)","image_url":"/idols/Hyunjin STRAYKIDS.jpg"},{"label":"San (ATEEZ)","image_url":"/idols/San ATEEZ.jpg"},{"label":"Wonbin (RIIZE)","image_url":null},{"label":"Mingyu (SEVENTEEN)","image_url":"/idols/Mingyu SEVENTEEN.jpg"}],"correct":3,"fun_fact":"Mingyu debuted with SEVENTEEN in 2015"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Lia (ITZY)","image_url":"/idols/Lia ITZY.jpg"},{"label":"Giselle (aespa)","image_url":"/idols/Giselle AESPA.jpg"},{"label":"Danielle (NewJeans)","image_url":"/idols/Danielle NEWJEANS.jpg"},{"label":"Chaeyoung (TWICE)","image_url":"/idols/Chaeyoung Twice.jpg"}],"correct":3,"fun_fact":"Chaeyoung debuted with TWICE in 2015"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Sungchan (RIIZE)","image_url":null},{"label":"Anton (RIIZE)","image_url":null},{"label":"Ricky (ZEROBASEONE)","image_url":null},{"label":"Baekhyun (EXO)","image_url":"/idols/Baekhyun EXO.jpg"}],"correct":3,"fun_fact":"Baekhyun debuted with EXO in 2012, a 3rd gen group"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":false,"show_answers":false}'::jsonb
);
