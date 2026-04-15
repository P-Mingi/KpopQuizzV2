-- ============================================
-- SEED: 8 Image & Intruder quizzes
-- ============================================
-- Images are NULL - admin adds them manually later.
-- Uses the existing seed user + 2 new seed users.

-- Create 2 additional seed users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed2@kpopquizz.com', '', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed3@kpopquizz.com', '', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, display_name, avatar_bg, avatar_text, bio)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'kpopfan_official', 'K-pop Fan', '#FBEAF0', '#72243E', 'K-pop enthusiast and quiz maker'),
  ('00000000-0000-0000-0000-000000000003', 'idol_expert', 'Idol Expert', '#E6F1FB', '#0C447C', 'Testing your K-pop knowledge one quiz at a time')
ON CONFLICT (id) DO NOTHING;

-- User IDs:
-- User1 = 00000000-0000-0000-0000-000000000001 (kpopquizz)
-- User2 = 00000000-0000-0000-0000-000000000002 (kpopfan_official)
-- User3 = 00000000-0000-0000-0000-000000000003 (idol_expert)

-- ============================================
-- Quiz 2: Guess the Idol as a Child (image) - User1 - General K-pop
-- ============================================
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.groups WHERE slug = 'general-kpop'),
  'Can You Recognize These Idols as Kids?',
  'can-you-recognize-these-idols-as-kids',
  'image', 'hard', 10, 'published',
  '[
    {"question":"Who is this idol as a child?","image_url":null,"options":["Jungkook","Jimin","V","Jin"],"correct":0,"fun_fact":"Jungkook was scouted by 7 agencies after his Big Hit audition"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["IU","Taeyeon","Suzy","Yoona"],"correct":0,"fun_fact":"IU chose her stage name because I and You become one through music"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["Lisa","Jennie","Rose","Jisoo"],"correct":0,"fun_fact":"Lisa was the only person accepted into YG from her audition in Thailand"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["V","Jungkook","Jimin","RM"],"correct":0,"fun_fact":"V was a hidden trainee - even ARMYs did not know about him until debut day"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["Jennie","Lisa","Joy","Irene"],"correct":0,"fun_fact":"Jennie lived in New Zealand for 5 years as a child"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["Sana","Momo","Nayeon","Tzuyu"],"correct":0,"fun_fact":"Sana was scouted on the street while shopping in Japan"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["Hyunjin","Felix","Han","Lee Know"],"correct":0,"fun_fact":"Hyunjin was street casted by JYP Entertainment"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["Wonyoung","Yujin","Rei","Leeseo"],"correct":0,"fun_fact":"Wonyoung became the youngest member to win Produce 48 at age 14"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["Karina","Winter","Giselle","Ningning"],"correct":0,"fun_fact":"Karina trained at SM for 4 years before debuting with aespa"},
    {"question":"Who is this idol as a child?","image_url":null,"options":["G-Dragon","Taeyang","T.O.P","Daesung"],"correct":0,"fun_fact":"G-Dragon has been a trainee since age 8 and appeared in a music video at age 5"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":true,"show_answers":false}'::jsonb
);

-- ============================================
-- Quiz 3: Guess the Album Cover (image) - User2 - General K-pop
-- ============================================
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  (SELECT id FROM public.groups WHERE slug = 'general-kpop'),
  'Name That Album Cover',
  'name-that-album-cover',
  'image', 'hard', 10, 'published',
  '[
    {"question":"Which album is this?","image_url":null,"options":["Map of the Soul: 7","BE","Proof","Wings"],"correct":0,"fun_fact":"Map of the Soul: 7 sold over 4.4 million copies in its first month"},
    {"question":"Which album is this?","image_url":null,"options":["THE ALBUM","BORN PINK","Square Up","Kill This Love"],"correct":0,"fun_fact":"THE ALBUM was BLACKPINK first full studio album after 4 years of EPs"},
    {"question":"Which album is this?","image_url":null,"options":["Armageddon","MY WORLD","Drama","Savage"],"correct":0,"fun_fact":"Armageddon features the hit single Supernova which went viral on TikTok"},
    {"question":"Which album is this?","image_url":null,"options":["ROCK-STAR","5-STAR","MAXIDENT","ODDINARY"],"correct":0,"fun_fact":"ROCK-STAR debuted at number one on the Billboard 200"},
    {"question":"Which album is this?","image_url":null,"options":["Get Up","NewJeans 1st EP","How Sweet","Supernatural"],"correct":0,"fun_fact":"Get Up includes the viral hit Super Shy"},
    {"question":"Which album is this?","image_url":null,"options":["IVE SWITCH","I have IVE","WAVE","After LIKE"],"correct":0,"fun_fact":"IVE SWITCH marked IVE first full-length album"},
    {"question":"Which album is this?","image_url":null,"options":["XOXO","Exodus","The War","Don t Mess Up My Tempo"],"correct":0,"fun_fact":"XOXO was the first album to sell over 1 million copies in South Korea in 12 years"},
    {"question":"Which album is this?","image_url":null,"options":["Formula of Love","Taste of Love","Eyes Wide Open","Between 1&2"],"correct":0,"fun_fact":"Formula of Love sold over 700,000 copies on its first day"},
    {"question":"Which album is this?","image_url":null,"options":["The ReVe Festival Finale","Queendom","Chill Kill","The Velvet"],"correct":0,"fun_fact":"The ReVe Festival Finale includes the hit Psycho"},
    {"question":"Which album is this?","image_url":null,"options":["FML","SEVENTEENTH HEAVEN","Face the Sun","Attacca"],"correct":0,"fun_fact":"FML became the best-selling album in Hanteo history"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":true,"show_answers":false}'::jsonb
);

-- ============================================
-- Quiz 4: Guess the Company (image) - User3 - General K-pop
-- ============================================
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  (SELECT id FROM public.groups WHERE slug = 'general-kpop'),
  'Which Company Does This Idol Belong To?',
  'which-company-does-this-idol-belong-to',
  'image', 'medium', 10, 'published',
  '[
    {"question":"Which company is this idol from?","image_url":null,"options":["SM Entertainment","JYP Entertainment","YG Entertainment","HYBE"],"correct":0,"fun_fact":"SM Entertainment was founded by Lee Soo-man in 1995"},
    {"question":"Which company is this idol from?","image_url":null,"options":["YG Entertainment","SM Entertainment","JYP Entertainment","HYBE"],"correct":0,"fun_fact":"Jennie trained at YG for almost 6 years before debuting"},
    {"question":"Which company is this idol from?","image_url":null,"options":["JYP Entertainment","SM Entertainment","YG Entertainment","Starship"],"correct":0,"fun_fact":"JYP Entertainment is known for its strict trainee system"},
    {"question":"Which company is this idol from?","image_url":null,"options":["ADOR (HYBE)","SM Entertainment","JYP Entertainment","YG Entertainment"],"correct":0,"fun_fact":"ADOR is a sublabel of HYBE founded by Min Hee-jin"},
    {"question":"Which company is this idol from?","image_url":null,"options":["Starship Entertainment","HYBE","SM Entertainment","JYP Entertainment"],"correct":0,"fun_fact":"Starship Entertainment is a subsidiary of Kakao Entertainment"},
    {"question":"Which company is this idol from?","image_url":null,"options":["HYBE","SM Entertainment","YG Entertainment","JYP Entertainment"],"correct":0,"fun_fact":"HYBE was formerly known as Big Hit Entertainment"},
    {"question":"Which company is this idol from?","image_url":null,"options":["JYP Entertainment","HYBE","SM Entertainment","YG Entertainment"],"correct":0,"fun_fact":"Felix almost got eliminated during Stray Kids survival show"},
    {"question":"Which company is this idol from?","image_url":null,"options":["Cube Entertainment","SM Entertainment","JYP Entertainment","HYBE"],"correct":0,"fun_fact":"Miyeon was originally a YG trainee before moving to Cube"},
    {"question":"Which company is this idol from?","image_url":null,"options":["Cube Entertainment","YG Entertainment","SM Entertainment","Pledis"],"correct":0,"fun_fact":"Soyeon is the main producer and songwriter for (G)I-DLE"},
    {"question":"Which company is this idol from?","image_url":null,"options":["SM Entertainment","JYP Entertainment","YG Entertainment","HYBE"],"correct":0,"fun_fact":"Taeyeon has been with SM Entertainment since 2004"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":true,"show_answers":false}'::jsonb
);

-- ============================================
-- Quiz 5: BTS Intruder - User1 - BTS
-- ============================================
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.groups WHERE slug = 'bts'),
  'Find the Non-BTS Member',
  'find-the-non-bts-member',
  'intruder', 'easy', 10, 'published',
  '[
    {"question":"Find the intruder","options":[{"label":"Jungkook","image_url":"/idols/Jungkook BTS.jpg"},{"label":"V","image_url":"/idols/V BTS.jpg"},{"label":"Jimin","image_url":"/idols/Jimin BTS.jpg"},{"label":"Mingyu","image_url":"/idols/Mingyu SEVENTEEN.jpg"}],"correct":3,"fun_fact":"Mingyu is a member of SEVENTEEN"},
    {"question":"Find the intruder","options":[{"label":"RM","image_url":"/idols/RM BTS.jpg"},{"label":"Jin","image_url":"/idols/Jin BTS.jpg"},{"label":"Suga","image_url":"/idols/Suga BTS.jpg"},{"label":"Hoshi","image_url":"/idols/Hoshi SEVENTEEN.jpg"}],"correct":3,"fun_fact":"Hoshi is the performance leader of SEVENTEEN"},
    {"question":"Find the intruder","options":[{"label":"J-Hope","image_url":"/idols/J-Hope BTS.jpg"},{"label":"Jimin","image_url":"/idols/Jimin BTS.jpg"},{"label":"V","image_url":"/idols/V BTS.jpg"},{"label":"Changbin","image_url":"/idols/Changbin STRAYKIDS.jpg"}],"correct":3,"fun_fact":"Changbin is a rapper in Stray Kids"},
    {"question":"Find the intruder","options":[{"label":"Jin","image_url":"/idols/Jin BTS.jpg"},{"label":"Jungkook","image_url":"/idols/Jungkook BTS.jpg"},{"label":"RM","image_url":"/idols/RM BTS.jpg"},{"label":"Taeyong","image_url":"/idols/Taeyong NCT 127.jpg"}],"correct":3,"fun_fact":"Taeyong is the leader of NCT 127"},
    {"question":"Find the intruder","options":[{"label":"Suga","image_url":"/idols/Suga BTS.jpg"},{"label":"J-Hope","image_url":"/idols/J-Hope BTS.jpg"},{"label":"Jimin","image_url":"/idols/Jimin BTS.jpg"},{"label":"Beomgyu","image_url":"/idols/Beomgyu TXT.jpg"}],"correct":3,"fun_fact":"Beomgyu is a member of TXT, BTS labelmates at HYBE"},
    {"question":"Find the intruder","options":[{"label":"V","image_url":"/idols/V BTS.jpg"},{"label":"Jin","image_url":"/idols/Jin BTS.jpg"},{"label":"Jungkook","image_url":"/idols/Jungkook BTS.jpg"},{"label":"San","image_url":"/idols/San ATEEZ.jpg"}],"correct":3,"fun_fact":"San is a member of ATEEZ"},
    {"question":"Find the intruder","options":[{"label":"RM","image_url":"/idols/RM BTS.jpg"},{"label":"Suga","image_url":"/idols/Suga BTS.jpg"},{"label":"J-Hope","image_url":"/idols/J-Hope BTS.jpg"},{"label":"Woozi","image_url":"/idols/Woozi SEVENTEEN.jpg"}],"correct":3,"fun_fact":"Woozi is the main producer of SEVENTEEN"},
    {"question":"Find the intruder","options":[{"label":"Jimin","image_url":"/idols/Jimin BTS.jpg"},{"label":"V","image_url":"/idols/V BTS.jpg"},{"label":"Jungkook","image_url":"/idols/Jungkook BTS.jpg"},{"label":"Felix","image_url":"/idols/Felix STRAYKIDS.jpg"}],"correct":3,"fun_fact":"Felix is known for his deep voice and freckles"},
    {"question":"Find the intruder","options":[{"label":"Jin","image_url":"/idols/Jin BTS.jpg"},{"label":"RM","image_url":"/idols/RM BTS.jpg"},{"label":"Suga","image_url":"/idols/Suga BTS.jpg"},{"label":"Mark","image_url":"/idols/Mark NCT 127.jpg"}],"correct":3,"fun_fact":"Mark is a member of both NCT 127 and NCT Dream"},
    {"question":"Find the intruder","options":[{"label":"J-Hope","image_url":"/idols/J-Hope BTS.jpg"},{"label":"Jimin","image_url":"/idols/Jimin BTS.jpg"},{"label":"Jin","image_url":"/idols/Jin BTS.jpg"},{"label":"Jaemin","image_url":"/idols/Jaemin NCT DREAM.jpg"}],"correct":3,"fun_fact":"Jaemin is a member of NCT Dream"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":false,"show_answers":false}'::jsonb
);

-- ============================================
-- Quiz 6: BLACKPINK Intruder - User2 - BLACKPINK
-- ============================================
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  (SELECT id FROM public.groups WHERE slug = 'blackpink'),
  'Find the Non-BLACKPINK Member',
  'find-the-non-blackpink-member',
  'intruder', 'easy', 10, 'published',
  '[
    {"question":"Find the intruder","options":[{"label":"Jennie","image_url":"/idols/Jennie BLACKPINK.jpg"},{"label":"Lisa","image_url":"/idols/Lisa BLACKPINK.jpg"},{"label":"Jisoo","image_url":"/idols/Jisoo BLACKPINK.jpg"},{"label":"Irene","image_url":"/idols/Irene REDVELVET.jpg"}],"correct":3,"fun_fact":"Irene is the leader of Red Velvet"},
    {"question":"Find the intruder","options":[{"label":"Rose","image_url":"/idols/Rose BLACKPINK.jpg"},{"label":"Jennie","image_url":"/idols/Jennie BLACKPINK.jpg"},{"label":"Lisa","image_url":"/idols/Lisa BLACKPINK.jpg"},{"label":"Nayeon","image_url":"/idols/Nayeon Twice.jpg"}],"correct":3,"fun_fact":"Nayeon was the first TWICE member to debut solo"},
    {"question":"Find the intruder","options":[{"label":"Jisoo","image_url":"/idols/Jisoo BLACKPINK.jpg"},{"label":"Rose","image_url":"/idols/Rose BLACKPINK.jpg"},{"label":"Jennie","image_url":"/idols/Jennie BLACKPINK.jpg"},{"label":"Karina","image_url":"/idols/Karina AESPA.jpg"}],"correct":3,"fun_fact":"Karina is the leader of aespa"},
    {"question":"Find the intruder","options":[{"label":"Lisa","image_url":"/idols/Lisa BLACKPINK.jpg"},{"label":"Jisoo","image_url":"/idols/Jisoo BLACKPINK.jpg"},{"label":"Rose","image_url":"/idols/Rose BLACKPINK.jpg"},{"label":"Ryujin","image_url":"/idols/Ryujin ITZY.jpg"}],"correct":3,"fun_fact":"Ryujin was scouted at a GOT7 concert by JYP himself"},
    {"question":"Find the intruder","options":[{"label":"Jennie","image_url":"/idols/Jennie BLACKPINK.jpg"},{"label":"Rose","image_url":"/idols/Rose BLACKPINK.jpg"},{"label":"Jisoo","image_url":"/idols/Jisoo BLACKPINK.jpg"},{"label":"Miyeon","image_url":"/idols/Miyeon G-idle.jpg"}],"correct":3,"fun_fact":"Miyeon was actually a YG trainee alongside BLACKPINK before debuting with (G)I-DLE"},
    {"question":"Find the intruder","options":[{"label":"Lisa","image_url":"/idols/Lisa BLACKPINK.jpg"},{"label":"Jennie","image_url":"/idols/Jennie BLACKPINK.jpg"},{"label":"Rose","image_url":"/idols/Rose BLACKPINK.jpg"},{"label":"Winter","image_url":"/idols/Winter AESPA.jpg"}],"correct":3,"fun_fact":"Winter is the main vocalist of aespa"},
    {"question":"Find the intruder","options":[{"label":"Jisoo","image_url":"/idols/Jisoo BLACKPINK.jpg"},{"label":"Lisa","image_url":"/idols/Lisa BLACKPINK.jpg"},{"label":"Jennie","image_url":"/idols/Jennie BLACKPINK.jpg"},{"label":"Momo","image_url":"/idols/Momo Twice.jpg"}],"correct":3,"fun_fact":"Momo was eliminated and then brought back on the show Sixteen"},
    {"question":"Find the intruder","options":[{"label":"Rose","image_url":"/idols/Rose BLACKPINK.jpg"},{"label":"Jisoo","image_url":"/idols/Jisoo BLACKPINK.jpg"},{"label":"Lisa","image_url":"/idols/Lisa BLACKPINK.jpg"},{"label":"Yuna","image_url":"/idols/Yuna ITZY.jpg"}],"correct":3,"fun_fact":"Yuna is the youngest member of ITZY"},
    {"question":"Find the intruder","options":[{"label":"Jennie","image_url":"/idols/Jennie BLACKPINK.jpg"},{"label":"Jisoo","image_url":"/idols/Jisoo BLACKPINK.jpg"},{"label":"Rose","image_url":"/idols/Rose BLACKPINK.jpg"},{"label":"Wonyoung","image_url":"/idols/Wonyoung IVE.jpg"}],"correct":3,"fun_fact":"Wonyoung won first place on Produce 48"},
    {"question":"Find the intruder","options":[{"label":"Lisa","image_url":"/idols/Lisa BLACKPINK.jpg"},{"label":"Rose","image_url":"/idols/Rose BLACKPINK.jpg"},{"label":"Jennie","image_url":"/idols/Jennie BLACKPINK.jpg"},{"label":"Kazuha","image_url":"/idols/Kazuha LESSERAFIM.jpg"}],"correct":3,"fun_fact":"Kazuha was a professional ballet dancer before joining LE SSERAFIM"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":false,"show_answers":false}'::jsonb
);

-- ============================================
-- Quiz 7: MV Intruder Girl Groups - User3 - General K-pop
-- ============================================
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  (SELECT id FROM public.groups WHERE slug = 'general-kpop'),
  'Find the Music Video That Does Not Belong',
  'find-the-music-video-that-does-not-belong',
  'intruder', 'medium', 10, 'published',
  '[
    {"question":"Find the MV that is NOT from BLACKPINK","options":[{"label":"DDU-DU DDU-DU","image_url":null},{"label":"Kill This Love","image_url":null},{"label":"How You Like That","image_url":null},{"label":"TOMBOY","image_url":null}],"correct":3,"fun_fact":"TOMBOY is by (G)I-DLE, not BLACKPINK"},
    {"question":"Find the MV that is NOT from TWICE","options":[{"label":"What is Love?","image_url":null},{"label":"Fancy","image_url":null},{"label":"Feel Special","image_url":null},{"label":"Psycho","image_url":null}],"correct":3,"fun_fact":"Psycho is by Red Velvet"},
    {"question":"Find the MV that is NOT from aespa","options":[{"label":"Next Level","image_url":null},{"label":"Savage","image_url":null},{"label":"Supernova","image_url":null},{"label":"LOVE DIVE","image_url":null}],"correct":3,"fun_fact":"LOVE DIVE is by IVE"},
    {"question":"Find the MV that is NOT from IVE","options":[{"label":"Eleven","image_url":null},{"label":"LOVE DIVE","image_url":null},{"label":"After LIKE","image_url":null},{"label":"Hype Boy","image_url":null}],"correct":3,"fun_fact":"Hype Boy is by NewJeans"},
    {"question":"Find the MV that is NOT from Red Velvet","options":[{"label":"Bad Boy","image_url":null},{"label":"Peek-A-Boo","image_url":null},{"label":"Psycho","image_url":null},{"label":"4 Walls","image_url":null}],"correct":3,"fun_fact":"4 Walls is by f(x), Red Velvet SM labelmates"},
    {"question":"Find the MV that is NOT from ITZY","options":[{"label":"DALLA DALLA","image_url":null},{"label":"ICY","image_url":null},{"label":"WANNABE","image_url":null},{"label":"O.O","image_url":null}],"correct":3,"fun_fact":"O.O is by NMIXX, ITZY JYP labelmates"},
    {"question":"Find the MV that is NOT from NewJeans","options":[{"label":"Attention","image_url":null},{"label":"Hype Boy","image_url":null},{"label":"Ditto","image_url":null},{"label":"FEARLESS","image_url":null}],"correct":3,"fun_fact":"FEARLESS is by LE SSERAFIM"},
    {"question":"Find the MV that is NOT from LE SSERAFIM","options":[{"label":"ANTIFRAGILE","image_url":null},{"label":"UNFORGIVEN","image_url":null},{"label":"FEARLESS","image_url":null},{"label":"Eleven","image_url":null}],"correct":3,"fun_fact":"Eleven is IVE debut song"},
    {"question":"Find the MV that is NOT from (G)I-DLE","options":[{"label":"TOMBOY","image_url":null},{"label":"Queencard","image_url":null},{"label":"Super Lady","image_url":null},{"label":"DASH","image_url":null}],"correct":3,"fun_fact":"DASH is by NMIXX"},
    {"question":"Find the MV that is NOT from MAMAMOO","options":[{"label":"HIP","image_url":null},{"label":"gogobebe","image_url":null},{"label":"Dingga","image_url":null},{"label":"Dumhdurum","image_url":null}],"correct":3,"fun_fact":"Dumhdurum is by Apink"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":false,"show_answers":false}'::jsonb
);

-- ============================================
-- Quiz 8: Guess the Idol Boy Groups (image) - User1 - General K-pop
-- ============================================
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.groups WHERE slug = 'general-kpop'),
  'Can You Name These Male K-pop Idols?',
  'can-you-name-these-male-kpop-idols',
  'image', 'medium', 10, 'published',
  '[
    {"question":"Who is this idol?","image_url":"/idols/Bang Chan STRYKIDS.jpg","options":["Bang Chan","Changbin","Han","Felix"],"correct":0,"fun_fact":"Bang Chan was a JYP trainee for 7 years before debuting"},
    {"question":"Who is this idol?","image_url":"/idols/Soobin TXT.jpg","options":["Soobin","Yeonjun","Beomgyu","Taehyun"],"correct":0,"fun_fact":"Soobin is the leader and tallest member of TXT"},
    {"question":"Who is this idol?","image_url":"/idols/Hoshi SEVENTEEN.jpg","options":["Hoshi","Woozi","DK","Seungkwan"],"correct":0,"fun_fact":"Hoshi created SEVENTEEN famous synchronized choreographies"},
    {"question":"Who is this idol?","image_url":"/idols/San ATEEZ.jpg","options":["San","Wooyoung","Hongjoong","Seonghwa"],"correct":0,"fun_fact":"San is known for his intense stage presence and facial expressions"},
    {"question":"Who is this idol?","image_url":"/idols/Jaemin NCT DREAM.jpg","options":["Jaemin","Jeno","Haechan","Mark"],"correct":0,"fun_fact":"Jaemin took a hiatus due to a herniated disc but came back stronger"},
    {"question":"Who is this idol?","image_url":"/idols/Sunghoon ENHYPEN.jpg","options":["Sunghoon","Jay","Jake","Heeseung"],"correct":0,"fun_fact":"Sunghoon was a competitive figure skater before becoming an idol"},
    {"question":"Who is this idol?","image_url":"/idols/Baekhyun EXO.jpg","options":["Baekhyun","D.O.","Chen","Kai"],"correct":0,"fun_fact":"Baekhyun solo album Delight sold over 1 million copies"},
    {"question":"Who is this idol?","image_url":"/idols/Taemin SHINee.jpg","options":["Taemin","Key","Onew","Minho"],"correct":0,"fun_fact":"Taemin debuted at just 14 years old with SHINee"},
    {"question":"Who is this idol?","image_url":"/idols/Jackson GOT7.jpg","options":["Jackson","Mark","BamBam","Yugyeom"],"correct":0,"fun_fact":"Jackson is also a successful solo artist in China"},
    {"question":"Who is this idol?","image_url":"/idols/Hongjoong ATEEZ.jpg","options":["Hongjoong","San","Wooyoung","Yunho"],"correct":0,"fun_fact":"Hongjoong writes and produces most of ATEEZ music"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":true,"show_answers":false}'::jsonb
);

-- ============================================
-- Quiz 10: Guess the Album Boy Groups (image) - User2 - General K-pop
-- ============================================
INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, question_count, status, questions, settings)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  (SELECT id FROM public.groups WHERE slug = 'general-kpop'),
  'Name That Boy Group Album',
  'name-that-boy-group-album',
  'image', 'hard', 10, 'published',
  '[
    {"question":"Which album is this?","image_url":null,"options":["5-STAR","ROCK-STAR","MAXIDENT","ODDINARY"],"correct":0,"fun_fact":"5-STAR debuted at number one on the Billboard 200"},
    {"question":"Which album is this?","image_url":null,"options":["Wings","HYYH pt.2","Love Yourself: Tear","BE"],"correct":0,"fun_fact":"Wings was BTS first album to enter the Billboard 200"},
    {"question":"Which album is this?","image_url":null,"options":["SEVENTEENTH HEAVEN","FML","Face the Sun","Sector 17"],"correct":0,"fun_fact":"SEVENTEENTH HEAVEN sold over 5 million copies"},
    {"question":"Which album is this?","image_url":null,"options":["Obsession","Tempo","Exodus","XOXO"],"correct":0,"fun_fact":"Obsession featured an X-EXO concept with alter ego versions"},
    {"question":"Which album is this?","image_url":null,"options":["The Name Chapter: FREEFALL","Temptation","Dream Chapter: Star","minisode 2"],"correct":0,"fun_fact":"FREEFALL debuted at number one on the Billboard 200"},
    {"question":"Which album is this?","image_url":null,"options":["DARK BLOOD","DIMENSION: DILEMMA","MANIFESTO","BORDER: CARNIVAL"],"correct":0,"fun_fact":"DARK BLOOD is ENHYPEN darkest concept album"},
    {"question":"Which album is this?","image_url":null,"options":["2 Baddies","Sticker","Favorite","AY-YO"],"correct":0,"fun_fact":"Sticker was controversial for its experimental sound but became a massive hit"},
    {"question":"Which album is this?","image_url":null,"options":["THE WORLD EP.2: OUTLAW","TREASURE EP.FIN","THE WORLD EP.1","ZERO: FEVER"],"correct":0,"fun_fact":"THE WORLD EP.2 includes the hit single BOUNCY"},
    {"question":"Which album is this?","image_url":null,"options":["Breath of Love: Last Piece","Eyes On You","Present: YOU","Call My Name"],"correct":0,"fun_fact":"Breath of Love was GOT7 last album before leaving JYP"},
    {"question":"Which album is this?","image_url":null,"options":["MADE","ALIVE","STILL ALIVE","Remember"],"correct":0,"fun_fact":"MADE was released as individual singles over a year before the full album"}
  ]'::jsonb,
  '{"timer":true,"timer_seconds":15,"shuffle":true,"show_answers":false}'::jsonb
);
