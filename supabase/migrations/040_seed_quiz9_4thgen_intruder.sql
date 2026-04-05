-- Quiz 9: 4th Gen Intruder - User3
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  (SELECT id FROM public.groups WHERE slug = 'general-kpop'),
  'Find the 3rd Gen Intruder Among 4th Gen',
  'find-the-3rd-gen-intruder-among-4th-gen',
  'intruder', 'hard', 10, 'published',
  '[
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Karina (aespa)","image_url":null},{"label":"Wonyoung (IVE)","image_url":null},{"label":"Minji (NewJeans)","image_url":null},{"label":"Irene (Red Velvet)","image_url":null}],"correct":3,"fun_fact":"Irene debuted with Red Velvet in 2014, making her 3rd gen"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Yeonjun (TXT)","image_url":null},{"label":"Jake (ENHYPEN)","image_url":null},{"label":"Jongseob (P1Harmony)","image_url":null},{"label":"Jungkook (BTS)","image_url":null}],"correct":3,"fun_fact":"Jungkook debuted with BTS in 2013"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Kazuha (LE SSERAFIM)","image_url":null},{"label":"Sullyoon (NMIXX)","image_url":null},{"label":"Haerin (NewJeans)","image_url":null},{"label":"Momo (TWICE)","image_url":null}],"correct":3,"fun_fact":"Momo debuted with TWICE in 2015"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Felix (Stray Kids)","image_url":null},{"label":"Ni-ki (ENHYPEN)","image_url":null},{"label":"Hanbin (ZEROBASEONE)","image_url":null},{"label":"Mark (NCT)","image_url":null}],"correct":3,"fun_fact":"Mark debuted with NCT 127 in 2016"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Yeji (ITZY)","image_url":null},{"label":"Miyeon ((G)I-DLE)","image_url":null},{"label":"Chaewon (LE SSERAFIM)","image_url":null},{"label":"Joy (Red Velvet)","image_url":null}],"correct":3,"fun_fact":"Joy debuted with Red Velvet in 2014"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Soobin (TXT)","image_url":null},{"label":"Heeseung (ENHYPEN)","image_url":null},{"label":"Gunwook (ZEROBASEONE)","image_url":null},{"label":"Woozi (SEVENTEEN)","image_url":null}],"correct":3,"fun_fact":"Woozi debuted with SEVENTEEN in 2015"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Ryujin (ITZY)","image_url":null},{"label":"Winter (aespa)","image_url":null},{"label":"Jiwoo (NMIXX)","image_url":null},{"label":"Seulgi (Red Velvet)","image_url":null}],"correct":3,"fun_fact":"Seulgi trained at SM for 7 years before debuting"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Hyunjin (Stray Kids)","image_url":null},{"label":"San (ATEEZ)","image_url":null},{"label":"Wonbin (RIIZE)","image_url":null},{"label":"Mingyu (SEVENTEEN)","image_url":null}],"correct":3,"fun_fact":"Mingyu debuted with SEVENTEEN in 2015"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Lia (ITZY)","image_url":null},{"label":"Giselle (aespa)","image_url":null},{"label":"Danielle (NewJeans)","image_url":null},{"label":"Chaeyoung (TWICE)","image_url":null}],"correct":3,"fun_fact":"Chaeyoung debuted with TWICE in 2015"},
    {"question":"Find the idol who is NOT 4th gen","options":[{"label":"Sungchan (RIIZE)","image_url":null},{"label":"Anton (RIIZE)","image_url":null},{"label":"Ricky (ZEROBASEONE)","image_url":null},{"label":"Baekhyun (EXO)","image_url":null}],"correct":3,"fun_fact":"Baekhyun debuted with EXO in 2012, a 3rd gen group"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":false,"show_answers":false}'::jsonb
);
