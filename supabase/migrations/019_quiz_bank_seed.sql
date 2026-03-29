-- ============================================
-- QUIZ BANK SEED: Batch 1 (10 quizzes)
-- TRUE/FALSE (5) + FUN multiple choice (5)
-- ============================================

-- 1. BTS True or False (easy, true_false)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'BTS True or False',
  'Think you know BTS? Test yourself with these true or false statements about the iconic group.',
  NULL,
  'true_false',
  'easy',
  'true_false',
  '[
    {"question": "BTS debuted in 2013.", "correct": true, "fun_fact": "BTS officially debuted on June 13, 2013 under Big Hit Entertainment with the single No More Dream.", "source": "https://en.wikipedia.org/wiki/BTS_discography"},
    {"question": "Jungkook is the leader of BTS.", "correct": false, "fun_fact": "RM (Kim Namjoon) is the leader of BTS. Jungkook is actually the youngest member, known as the maknae.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "BTS has 7 members.", "correct": true, "fun_fact": "BTS consists of RM, Jin, Suga, J-Hope, Jimin, V, and Jungkook.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "Dynamite was BTS''s first fully English-language song.", "correct": true, "fun_fact": "Released on August 21, 2020, Dynamite was BTS''s first song recorded entirely in English and debuted at #1 on the Billboard Hot 100.", "source": "https://en.wikipedia.org/wiki/Dynamite_(BTS_song)"},
    {"question": "BTS''s fandom is called BLINK.", "correct": false, "fun_fact": "BTS''s fandom is called ARMY, which stands for Adorable Representative M.C. for Youth. BLINK is BLACKPINK''s fandom name.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "BTS was the first K-pop act to top the Billboard Hot 100.", "correct": true, "fun_fact": "BTS topped the Billboard Hot 100 with Dynamite in August 2020, making history as the first all-South Korean act to achieve this.", "source": "https://en.wikipedia.org/wiki/Dynamite_(BTS_song)"},
    {"question": "V is the oldest member of BTS.", "correct": false, "fun_fact": "Jin (Kim Seokjin) is the oldest member of BTS, born on December 4, 1992. V was born on December 30, 1995.", "source": "https://en.wikipedia.org/wiki/Jin_(singer)"},
    {"question": "BTS performed at the UN General Assembly.", "correct": true, "fun_fact": "BTS addressed the 76th UN General Assembly in September 2021, speaking on behalf of young people and delivering a speech about resilience.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "BTS''s studio album Map of the Soul: 7 was released in 2019.", "correct": false, "fun_fact": "Map of the Soul: 7 was released on February 21, 2020, not 2019. It became one of the best-selling albums of 2020.", "source": "https://en.wikipedia.org/wiki/Map_of_the_Soul:_7"},
    {"question": "Suga''s solo stage name is Agust D.", "correct": true, "fun_fact": "Suga released his first solo mixtape under the stage name Agust D in 2016. The name is DT Suga reversed, referencing his hometown Daegu.", "source": "https://en.wikipedia.org/wiki/Agust_D"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia BTS, Wikipedia Dynamite, Wikipedia Jin, Wikipedia Map of the Soul: 7, Wikipedia Agust D'
);

-- 2. BLACKPINK True or False (easy, true_false)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'BLACKPINK True or False',
  'How well do you know BLACKPINK? Swipe through these true or false statements and find out!',
  NULL,
  'true_false',
  'easy',
  'true_false',
  '[
    {"question": "BLACKPINK debuted in 2016.", "correct": true, "fun_fact": "BLACKPINK officially debuted on August 8, 2016 under YG Entertainment with the single album Square One.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "BLACKPINK has 5 members.", "correct": false, "fun_fact": "BLACKPINK has 4 members: Jisoo, Jennie, Rose, and Lisa.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "Jennie was the first BLACKPINK member to have a solo debut.", "correct": true, "fun_fact": "Jennie released her solo single SOLO on November 12, 2018, becoming the first BLACKPINK member to go solo.", "source": "https://en.wikipedia.org/wiki/Solo_(Jennie_song)"},
    {"question": "BLACKPINK''s fandom is called ONCE.", "correct": false, "fun_fact": "BLACKPINK''s fandom is called BLINK. ONCE is TWICE''s fandom name.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "BLACKPINK became the first female K-pop group to perform at Coachella.", "correct": true, "fun_fact": "BLACKPINK performed at the Coachella Valley Music and Arts Festival in April 2019, making history as the first K-pop group to perform there.", "source": "https://en.wikipedia.org/wiki/Blackpink_at_Coachella"},
    {"question": "Lisa is from South Korea.", "correct": false, "fun_fact": "Lisa (Lalisa Manoban) is from Thailand. She was born in Buriram, Thailand on March 27, 1997.", "source": "https://en.wikipedia.org/wiki/Lisa_(rapper)"},
    {"question": "BLACKPINK is under YG Entertainment.", "correct": true, "fun_fact": "BLACKPINK debuted and has been managed under YG Entertainment since 2016.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "BLACKPINK''s How You Like That set a record for the most-viewed YouTube video in 24 hours upon its release in 2020.", "correct": true, "fun_fact": "How You Like That broke the record for the most-viewed YouTube video within 24 hours of release when it dropped on June 26, 2020, accumulating over 86 million views.", "source": "https://en.wikipedia.org/wiki/How_You_Like_That"},
    {"question": "Rose is the main rapper of BLACKPINK.", "correct": false, "fun_fact": "Jennie and Lisa are BLACKPINK''s main rappers. Rose is the main vocalist along with Jisoo.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "BLACKPINK released the album BORN PINK in 2022.", "correct": true, "fun_fact": "BORN PINK was released on September 16, 2022 and became BLACKPINK''s first full-length studio album to top the Billboard 200.", "source": "https://en.wikipedia.org/wiki/Born_Pink"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia Blackpink, Wikipedia Solo (Jennie song), Wikipedia Lisa (rapper), Wikipedia How You Like That, Wikipedia Born Pink'
);

-- 3. 4th Gen Groups True or False (medium, true_false)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  '4th Gen Groups True or False',
  'Test your knowledge of 4th generation K-pop groups including aespa, IVE, ENHYPEN, NewJeans, and more!',
  NULL,
  'true_false',
  'medium',
  'true_false',
  '[
    {"question": "NewJeans debuted in 2022.", "correct": true, "fun_fact": "NewJeans debuted on July 22, 2022 under ADOR (a subsidiary of HYBE) with the EP New Jeans.", "source": "https://en.wikipedia.org/wiki/NewJeans"},
    {"question": "ENHYPEN was formed through the survival show I-LAND.", "correct": true, "fun_fact": "ENHYPEN was formed through I-LAND, a joint project between HYBE and CJ ENM that aired in 2020. The seven members were selected from the show.", "source": "https://en.wikipedia.org/wiki/Enhypen"},
    {"question": "TXT stands for Together X Tomorrow.", "correct": true, "fun_fact": "TXT (Tomorrow X Together) debuted in March 2019 under Big Hit Music (HYBE). The name symbolizes different individuals coming together to create a new tomorrow.", "source": "https://en.wikipedia.org/wiki/Tomorrow_X_Together"},
    {"question": "aespa has 6 members.", "correct": false, "fun_fact": "aespa has 4 members: Karina, Giselle, Winter, and Ningning. They debuted under SM Entertainment in November 2020.", "source": "https://en.wikipedia.org/wiki/Aespa"},
    {"question": "LE SSERAFIM is under HYBE Labels.", "correct": true, "fun_fact": "LE SSERAFIM is under SOURCE MUSIC, a subsidiary of HYBE. They debuted in May 2022.", "source": "https://en.wikipedia.org/wiki/Le_Sserafim"},
    {"question": "IVE is under SM Entertainment.", "correct": false, "fun_fact": "IVE is under Starship Entertainment, not SM Entertainment. They debuted in December 2021 with ELEVEN.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "ATEEZ debuted in 2018.", "correct": true, "fun_fact": "ATEEZ debuted on October 24, 2018 under KQ Entertainment with their first EP TREASURE EP.1: All to Zero.", "source": "https://en.wikipedia.org/wiki/Ateez"},
    {"question": "Stray Kids was formed through a JYP Entertainment reality show.", "correct": true, "fun_fact": "Stray Kids was formed through a 2017 JYP Entertainment reality survival show also called Stray Kids. The group officially debuted in March 2018.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "NMIXX is a 5-member group.", "correct": false, "fun_fact": "NMIXX currently has 6 members: Lily, Haewon, Sullyoon, Bae, Jiwoo, and Kyujin. They are under JYP Entertainment and debuted in February 2022.", "source": "https://en.wikipedia.org/wiki/Nmixx"},
    {"question": "(G)I-DLE is a self-producing girl group.", "correct": true, "fun_fact": "Several (G)I-DLE members, particularly Soyeon, are heavily involved in writing and producing their own music. Soyeon has writing credits on nearly all of their songs.", "source": "https://en.wikipedia.org/wiki/(G)I-dle"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia NewJeans, Wikipedia Enhypen, Wikipedia Tomorrow X Together, Wikipedia Aespa, Wikipedia Le Sserafim, Wikipedia Ive (group), Wikipedia Ateez, Wikipedia Stray Kids, Wikipedia Nmixx, Wikipedia (G)I-dle'
);

-- 4. K-pop Records True or False (hard, true_false)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Records True or False',
  'Do you know your K-pop history-making moments? Test your knowledge of record-breaking achievements!',
  NULL,
  'true_false',
  'hard',
  'true_false',
  '[
    {"question": "PSY''s Gangnam Style was the first YouTube video to reach 1 billion views.", "correct": true, "fun_fact": "Gangnam Style reached 1 billion views on YouTube on December 21, 2012, becoming the first video ever to do so. It also briefly broke the view counter.", "source": "https://en.wikipedia.org/wiki/Gangnam_Style"},
    {"question": "BTS performed at the Grammy Awards in 2021.", "correct": true, "fun_fact": "BTS performed Dynamite at the 63rd Grammy Awards on March 14, 2021. It was their first Grammy performance.", "source": "https://en.wikipedia.org/wiki/63rd_Grammy_Awards"},
    {"question": "BLACKPINK''s How You Like That broke the YouTube record for most-viewed video in 24 hours upon release.", "correct": true, "fun_fact": "How You Like That accumulated over 86 million views within 24 hours of its release on June 26, 2020, setting a new YouTube record at the time.", "source": "https://en.wikipedia.org/wiki/How_You_Like_That"},
    {"question": "BTS is the first K-pop act to top the Billboard Hot 100.", "correct": true, "fun_fact": "BTS made history when Dynamite debuted at #1 on the Billboard Hot 100 in August 2020, becoming the first all-South Korean act to achieve this.", "source": "https://en.wikipedia.org/wiki/Dynamite_(BTS_song)"},
    {"question": "TWICE was the first K-pop girl group to hold a sold-out dome tour in Japan.", "correct": true, "fun_fact": "TWICE became the first K-pop girl group to hold a sold-out dome tour in Japan in 2018, performing at four major domes.", "source": "https://en.wikipedia.org/wiki/Twice_(group)"},
    {"question": "EXO''s XOXO was the first K-pop album to sell 1 million copies in the Hanteo chart era.", "correct": true, "fun_fact": "EXO''s XOXO (2013) was the first album in the Hanteo chart era to surpass 1 million sales, reviving the concept of million-seller albums in K-pop.", "source": "https://en.wikipedia.org/wiki/Xoxo_(EXO_album)"},
    {"question": "BLACKPINK was the first K-pop group to reach 50 million YouTube subscribers.", "correct": true, "fun_fact": "BLACKPINK became the first K-pop act and first music group to reach 50 million YouTube subscribers, achieving this milestone in 2019.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "BTS won a Grammy Award for Best Pop Duo/Group Performance in 2022.", "correct": false, "fun_fact": "BTS was nominated for Best Pop Duo/Group Performance at the 64th Grammy Awards (2022) for Butter but did not win. The category was won by Doja Cat and SZA.", "source": "https://en.wikipedia.org/wiki/64th_Grammy_Awards"},
    {"question": "Psy held a free concert in Seoul in 2012 that drew over 80,000 people.", "correct": true, "fun_fact": "PSY held a free outdoor concert in Seoul''s Yeouido district in October 2012 that drew an estimated 80,000 to 100,000 attendees.", "source": "https://en.wikipedia.org/wiki/Psy"},
    {"question": "NewJeans was the fastest K-pop act to reach 10 million Spotify monthly listeners.", "correct": true, "fun_fact": "NewJeans broke the record for reaching 10 million Spotify monthly listeners the fastest among K-pop acts, driven by their viral hit OMG and Ditto.", "source": "https://en.wikipedia.org/wiki/NewJeans"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia Gangnam Style, Wikipedia 63rd Grammy Awards, Wikipedia How You Like That, Wikipedia Dynamite (BTS song), Wikipedia Twice (group), Wikipedia Xoxo (EXO album), Wikipedia Blackpink, Wikipedia 64th Grammy Awards, Wikipedia Psy, Wikipedia NewJeans'
);

-- 5. K-pop Company Facts True or False (medium, true_false)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Company Facts True or False',
  'How much do you know about the entertainment companies behind your favorite K-pop groups?',
  NULL,
  'true_false',
  'medium',
  'true_false',
  '[
    {"question": "SM Entertainment was founded before YG Entertainment.", "correct": true, "fun_fact": "SM Entertainment was founded by Lee Soo-man in 1995, while YG Entertainment was founded by Yang Hyun-suk in 1996.", "source": "https://en.wikipedia.org/wiki/SM_Entertainment"},
    {"question": "JYP Entertainment was founded by Park Jin-young.", "correct": true, "fun_fact": "JYP Entertainment was founded in 1997 by Park Jin-young (also known as J.Y. Park), who remains an active artist and key figure at the company.", "source": "https://en.wikipedia.org/wiki/JYP_Entertainment"},
    {"question": "HYBE was formerly known as Big Hit Entertainment.", "correct": true, "fun_fact": "Big Hit Entertainment, founded in 2005 by Bang Si-hyuk, was rebranded to HYBE Corporation in March 2021 after going public on the Korean Stock Exchange.", "source": "https://en.wikipedia.org/wiki/Hybe_Corporation"},
    {"question": "Stray Kids is under SM Entertainment.", "correct": false, "fun_fact": "Stray Kids is under JYP Entertainment, not SM Entertainment. SM Entertainment is home to groups like EXO, NCT, aespa, and SHINee.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "TWICE and 2PM are both under JYP Entertainment.", "correct": true, "fun_fact": "Both TWICE and 2PM are managed by JYP Entertainment. Other JYP groups include GOT7, Stray Kids, ITZY, and NMIXX.", "source": "https://en.wikipedia.org/wiki/JYP_Entertainment"},
    {"question": "Cube Entertainment is the company behind (G)I-DLE.", "correct": true, "fun_fact": "(G)I-DLE debuted under Cube Entertainment in May 2018. Cube is also home to groups like BTOB, PENTAGON, and (G)I-DLE.", "source": "https://en.wikipedia.org/wiki/(G)I-dle"},
    {"question": "STARSHIP Entertainment manages both MONSTA X and Kep1er.", "correct": false, "fun_fact": "STARSHIP Entertainment manages MONSTA X and IVE, not Kep1er. Kep1er is under WAKEONE Entertainment and Swing Entertainment.", "source": "https://en.wikipedia.org/wiki/Starship_Entertainment"},
    {"question": "Source Music is a subsidiary of HYBE.", "correct": true, "fun_fact": "Source Music, home to LE SSERAFIM, is a HYBE subsidiary. HYBE acquired Source Music in 2019, along with Pledis (home to SEVENTEEN) and other labels.", "source": "https://en.wikipedia.org/wiki/Source_Music"},
    {"question": "EXO and Girls'' Generation are both under SM Entertainment.", "correct": true, "fun_fact": "Both EXO and Girls'' Generation (SNSD) are managed by SM Entertainment, one of the so-called Big Four K-pop companies.", "source": "https://en.wikipedia.org/wiki/SM_Entertainment"},
    {"question": "FNC Entertainment is the company behind AOA and FTISLAND.", "correct": true, "fun_fact": "FNC Entertainment manages both AOA (girl group) and FTISLAND (boy band), as well as CNBLUE, N.Flying, and SF9.", "source": "https://en.wikipedia.org/wiki/FNC_Entertainment"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia SM Entertainment, Wikipedia JYP Entertainment, Wikipedia Hybe Corporation, Wikipedia Stray Kids, Wikipedia (G)I-dle, Wikipedia Starship Entertainment, Wikipedia Source Music, Wikipedia FNC Entertainment'
);

-- 6. K-pop Idol Nationalities (easy, fun)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Idol Nationalities',
  'K-pop is truly international! Can you match these idols to their home country?',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "Jackson Wang of GOT7 is originally from which city/region?", "options": ["Beijing, China", "Hong Kong", "Shanghai, China", "Guangzhou, China"], "correct": 1, "fun_fact": "Jackson Wang (Wang Ka-yee) was born and raised in Hong Kong. He was a fencer on the Hong Kong national team before joining SM Entertainment through an audition.", "source": "https://en.wikipedia.org/wiki/Jackson_Wang"},
    {"question": "Tzuyu of TWICE is from which country?", "options": ["Japan", "Thailand", "Taiwan", "Hong Kong"], "correct": 2, "fun_fact": "Chou Tzuyu was born on June 14, 1999, in Tainan, Taiwan. She is one of the most popular Taiwanese idols in K-pop.", "source": "https://en.wikipedia.org/wiki/Tzuyu"},
    {"question": "Minnie of (G)I-DLE is from which country?", "options": ["South Korea", "Japan", "Thailand", "China"], "correct": 2, "fun_fact": "Minnie (Nicha Yontararak) is from Thailand. She is one of two Thai members in (G)I-DLE alongside former member Soojin.", "source": "https://en.wikipedia.org/wiki/Minnie_(singer)"},
    {"question": "Sana of TWICE is from which country?", "options": ["China", "Taiwan", "Thailand", "Japan"], "correct": 3, "fun_fact": "Sana (Minatozaki Sana) was born in Osaka, Japan. TWICE has three Japanese members: Sana, Momo, and Mina.", "source": "https://en.wikipedia.org/wiki/Sana_(singer)"},
    {"question": "BamBam of GOT7 is from which country?", "options": ["Vietnam", "Thailand", "Indonesia", "Philippines"], "correct": 1, "fun_fact": "BamBam (Kunpimook Bhuwakul) is from Bangkok, Thailand. He was a close childhood friend of Lisa from BLACKPINK before they both joined K-pop companies.", "source": "https://en.wikipedia.org/wiki/BamBam_(rapper)"},
    {"question": "Ningning of aespa is from which country?", "options": ["Japan", "Hong Kong", "China", "Taiwan"], "correct": 2, "fun_fact": "Ningning (Ning Yizhuo) is from Harbin, China. She is the Chinese member of aespa, which debuted under SM Entertainment in 2020.", "source": "https://en.wikipedia.org/wiki/Ningning"},
    {"question": "Hendery of WayV/NCT is from which region?", "options": ["Macau", "Hong Kong", "Beijing, China", "Taiwan"], "correct": 0, "fun_fact": "Hendery (Wong Kunhang) is from Macau, making him one of the few K-pop idols from that region. He is a member of both WayV and NCT.", "source": "https://en.wikipedia.org/wiki/Hendery"},
    {"question": "Nayeon of TWICE is from which country?", "options": ["Japan", "Taiwan", "South Korea", "China"], "correct": 2, "fun_fact": "Nayeon (Im Na-yeon) was born in Seoul, South Korea. She is the oldest member and first to debut with a solo album among TWICE members.", "source": "https://en.wikipedia.org/wiki/Nayeon"},
    {"question": "Miyeon of (G)I-DLE is from which country?", "options": ["Japan", "Thailand", "China", "South Korea"], "correct": 3, "fun_fact": "Miyeon (Cho Mi-yeon) is from South Korea. Before joining (G)I-DLE, she was a trainee at YG Entertainment.", "source": "https://en.wikipedia.org/wiki/(G)I-dle"},
    {"question": "Cha Eun-woo of ASTRO is from which country?", "options": ["China", "Japan", "South Korea", "Thailand"], "correct": 2, "fun_fact": "Cha Eun-woo (Lee Dong-min) was born in Gunpo, South Korea. Besides being a K-pop idol, he is also a popular Korean drama actor.", "source": "https://en.wikipedia.org/wiki/Cha_Eun-woo"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia Jackson Wang, Wikipedia Tzuyu, Wikipedia Minnie (singer), Wikipedia Sana (singer), Wikipedia BamBam (rapper), Wikipedia Ningning, Wikipedia Hendery, Wikipedia Nayeon, Wikipedia (G)I-dle, Wikipedia Cha Eun-woo'
);

-- 7. K-pop Group Colors and Lightsticks (medium, fun)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Group Colors and Lightsticks',
  'From the iconic purple ARMY Bomb to the sparkling Carat Bong, can you match K-pop groups to their official colors and lightsticks?',
  NULL,
  'multiple_choice',
  'medium',
  'fun',
  '[
    {"question": "What is the official color associated with BTS?", "options": ["Gold", "Purple", "Blue", "Red"], "correct": 1, "fun_fact": "BTS''s official color is purple (specifically a shade called BTS Purple). V famously said ''I purple you'' to fans in 2016, making the phrase a symbol of love between BTS and ARMYs.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "What is BTS fans'' lightstick called?", "options": ["BLINK Bong", "Pearl Sapphire Bong", "ARMY Bomb", "Carat Bong"], "correct": 2, "fun_fact": "The BTS lightstick is called the ARMY Bomb. It connects via Bluetooth to sync with lights at concerts and was first released in 2015.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "What colors are associated with BLACKPINK?", "options": ["Purple and White", "Red and Black", "Pink and Black", "Yellow and Black"], "correct": 2, "fun_fact": "BLACKPINK''s official colors are pink and black, which reflect the group''s name itself. Their lightstick, the BLINK Bong, also glows in these colors.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "What is SEVENTEEN''s lightstick called?", "options": ["Carat Bong", "Star Bong", "Caratbong", "SVT Bong"], "correct": 0, "fun_fact": "SEVENTEEN''s lightstick is called the Carat Bong. It emits a golden yellow glow and is named after SEVENTEEN''s fandom, CARATs.", "source": "https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)"},
    {"question": "What is TWICE''s lightstick called?", "options": ["Candy Bong", "ONCE Bong", "Twin Bong", "Twice Lamp"], "correct": 0, "fun_fact": "TWICE''s lightstick is called the Candy Bong (Candybong). It is shaped like a lollipop and glows in pink, reflecting TWICE''s bright and energetic image.", "source": "https://en.wikipedia.org/wiki/Twice_(group)"},
    {"question": "What is the official lightstick color of EXO?", "options": ["Silver", "Red", "Gold and Transparent", "Blue"], "correct": 2, "fun_fact": "EXO''s lightstick (EXO Lightstick Ver. 3) is called the EXO Lightstick and features a transparent/crystal globe that glows in golden hues, reflecting their ''light'' concept.", "source": "https://en.wikipedia.org/wiki/Exo_(group)"},
    {"question": "What is SHINee''s official fandom color?", "options": ["Pearl Aqua", "Shining Gold", "Pearl Sapphire Blue", "Pearl Pastel Green"], "correct": 0, "fun_fact": "SHINee''s official fandom color is Pearl Aqua (also described as Pearl Aqua Blue). Their fandom name is Shawol, which combines SHINee and World.", "source": "https://en.wikipedia.org/wiki/Shinee"},
    {"question": "What color is associated with MONSTA X''s fandom Monbebe?", "options": ["Starlight Blue", "Venetian Red", "Rose Quartz", "Chili Pepper Red"], "correct": 1, "fun_fact": "MONSTA X''s official fandom color is Venetian Red. Their fandom name Monbebe means ''my baby'' in a mix of French and informal language.", "source": "https://en.wikipedia.org/wiki/Monsta_X"},
    {"question": "What is the name of BIGBANG''s lightstick?", "options": ["Crown Stick", "Bang Bong", "Krunk Bong", "Big Bomb"], "correct": 1, "fun_fact": "BIGBANG''s lightstick is called the Bang Bong. Their official fandom color is yellow, and their fandom is called VIP.", "source": "https://en.wikipedia.org/wiki/Bigbang_(South_Korean_band)"},
    {"question": "What are NCT''s official fandom colors?", "options": ["Neon Green and White", "Red and White", "Neon Green and Black", "Yellow and Green"], "correct": 0, "fun_fact": "NCT''s official colors are Neon Green and White. Their fandom is called NCTzen, and their lightstick is known as the Lightstick Ver. 2 (or Candy Bong Z for NCT 127 fans).", "source": "https://en.wikipedia.org/wiki/NCT_(group)"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia BTS, Wikipedia Blackpink, Wikipedia Seventeen (South Korean band), Wikipedia Twice (group), Wikipedia Exo (group), Wikipedia Shinee, Wikipedia Monsta X, Wikipedia Bigbang (South Korean band), Wikipedia NCT (group)'
);

-- 8. K-pop Idol Languages (medium, fun)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Idol Languages',
  'K-pop idols are multilingual talents! Test your knowledge of which idols speak which languages.',
  NULL,
  'multiple_choice',
  'medium',
  'fun',
  '[
    {"question": "Which TWICE member speaks Chinese as their native language?", "options": ["Sana", "Momo", "Tzuyu", "Mina"], "correct": 2, "fun_fact": "Tzuyu is from Taiwan and speaks Mandarin Chinese as her native language. TWICE also has three Japanese members (Sana, Momo, Mina) and six Korean members.", "source": "https://en.wikipedia.org/wiki/Tzuyu"},
    {"question": "RM of BTS is known for his fluency in which language besides Korean?", "options": ["Japanese", "English", "Chinese", "Spanish"], "correct": 1, "fun_fact": "RM taught himself English largely by watching the TV series Friends. He regularly conducts English-language interviews without a translator, which is rare for K-pop idols.", "source": "https://en.wikipedia.org/wiki/RM_(rapper)"},
    {"question": "Which EXO member is known for speaking Korean, Chinese, and English fluently?", "options": ["Baekhyun", "Chanyeol", "Chen", "Lay"], "correct": 3, "fun_fact": "Lay (Zhang Yixing) speaks Mandarin Chinese as his native language, is fluent in Korean after years in Korea, and also communicates in English. He is also an accomplished solo artist in China.", "source": "https://en.wikipedia.org/wiki/Lay_Zhang"},
    {"question": "Sana of TWICE is fluent in which languages besides her native Japanese?", "options": ["Korean and English", "Korean and Chinese", "Korean and Thai", "Korean and French"], "correct": 0, "fun_fact": "Sana is a native Japanese speaker who became fluent in Korean after training at JYP. She is also conversational in English, often interacting with international fans.", "source": "https://en.wikipedia.org/wiki/Sana_(singer)"},
    {"question": "Which GOT7 member is known for being able to speak Korean, Chinese, English, and Thai?", "options": ["Mark", "Jackson", "Youngjae", "BamBam"], "correct": 1, "fun_fact": "Jackson Wang speaks Cantonese (his native Hong Kong language), Mandarin, Korean, and English. He built a massive music career in China alongside his K-pop activities.", "source": "https://en.wikipedia.org/wiki/Jackson_Wang"},
    {"question": "Which language does Minnie of (G)I-DLE speak as her native tongue?", "options": ["Mandarin Chinese", "Japanese", "Thai", "Vietnamese"], "correct": 2, "fun_fact": "Minnie (Nicha Yontararak) is Thai and speaks Thai as her mother tongue. She is one of the most prominent Thai idols in K-pop and has a strong solo following in Thailand.", "source": "https://en.wikipedia.org/wiki/Minnie_(singer)"},
    {"question": "Jisoo of BLACKPINK primarily communicates with international fans in which language?", "options": ["English", "Japanese", "Mandarin", "French"], "correct": 1, "fun_fact": "Jisoo is the only Korean-born member of BLACKPINK and communicates internationally mainly in Japanese (learned through training), while her groupmates Rose, Lisa, and Jennie are more fluent in English.", "source": "https://en.wikipedia.org/wiki/Jisoo"},
    {"question": "Nichkhun of 2PM is from Thailand, but which other language is he notably fluent in besides Korean and Thai?", "options": ["Japanese", "English", "Mandarin", "Vietnamese"], "correct": 1, "fun_fact": "Nichkhun (Nichkhun Buck Horvejkul) is Thai-American and grew up partly in the USA, making him fluent in English. He also speaks Korean and some Japanese.", "source": "https://en.wikipedia.org/wiki/Nichkhun"},
    {"question": "Which language did KEY of SHINee learn and use extensively for his solo activities?", "options": ["Chinese", "English", "Japanese", "Spanish"], "correct": 2, "fun_fact": "KEY (Kim Kibum) is notably fluent in Japanese and has released numerous Japanese solo albums and singles. He is one of the most active K-pop idols in the Japanese music market.", "source": "https://en.wikipedia.org/wiki/Key_(singer)"},
    {"question": "Kris Wu, a former EXO member, is fluent in which languages?", "options": ["Cantonese, Mandarin, and English", "Korean, Mandarin, and Japanese", "Cantonese, English, and French", "Mandarin, English, and Spanish"], "correct": 0, "fun_fact": "Kris Wu (Wu Yifan) was born in Guangzhou, China, emigrated to Canada as a child, and grew up bilingual in Cantonese and English before learning Mandarin and later Korean as a trainee.", "source": "https://en.wikipedia.org/wiki/Kris_Wu"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia Tzuyu, Wikipedia RM (rapper), Wikipedia Lay Zhang, Wikipedia Sana (singer), Wikipedia Jackson Wang, Wikipedia Minnie (singer), Wikipedia Jisoo, Wikipedia Nichkhun, Wikipedia Key (singer), Wikipedia Kris Wu'
);

-- 9. Which Group Has More Members? (easy, fun)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'Which K-pop Group Has More Members?',
  'K-pop groups range from duos to massive ensembles! Can you tell which group is bigger?',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "Which group has more members: BTS or BLACKPINK?", "options": ["BTS (7 members)", "BLACKPINK (4 members)", "They have the same number", "Neither has been confirmed"], "correct": 0, "fun_fact": "BTS has 7 members (RM, Jin, Suga, J-Hope, Jimin, V, Jungkook) while BLACKPINK has 4 members (Jisoo, Jennie, Rose, Lisa).", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "Which group has more members: SEVENTEEN or BTS?", "options": ["SEVENTEEN (13 members)", "BTS (7 members)", "They have the same number", "SEVENTEEN (15 members)"], "correct": 0, "fun_fact": "SEVENTEEN has 13 members split into three units: Hip-Hop Unit, Vocal Unit, and Performance Unit. BTS has 7 members.", "source": "https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)"},
    {"question": "Which group has more members: TWICE or aespa?", "options": ["aespa (4 members)", "TWICE (9 members)", "They have the same number", "aespa (6 members)"], "correct": 1, "fun_fact": "TWICE has 9 members while aespa has 4. TWICE''s 9 members are Nayeon, Jeongyeon, Momo, Sana, Jihyo, Mina, Dahyun, Chaeyoung, and Tzuyu.", "source": "https://en.wikipedia.org/wiki/Twice_(group)"},
    {"question": "Which group has more members: EXO (current active lineup) or SHINee?", "options": ["SHINee (4 active members)", "EXO (current active lineup, fewer than SHINee)", "EXO (current lineup of 6 active Korean members)", "They currently have the same number"], "correct": 2, "fun_fact": "EXO debuted with 12 members but several have since left. The Korean sub-unit EXO-K has 6 members, while SHINee has had 5 members (now 4 active following Jonghyun''s passing in 2017).", "source": "https://en.wikipedia.org/wiki/Exo_(group)"},
    {"question": "Which group has more members: NCT 127 or NCT Dream?", "options": ["NCT 127 (9 members)", "NCT Dream (7 members)", "NCT Dream (9 members)", "They currently have the same number"], "correct": 0, "fun_fact": "NCT 127 has 9 members while NCT Dream has 7 members. Both are sub-units of NCT, which as an entire group has over 20 members.", "source": "https://en.wikipedia.org/wiki/NCT_(group)"},
    {"question": "Which group has more members: MONSTA X or ASTRO?", "options": ["MONSTA X (6 members)", "ASTRO (6 members)", "MONSTA X (7 members)", "They currently have the same number (6)"], "correct": 3, "fun_fact": "Both MONSTA X and ASTRO have 6 active members each. MONSTA X lost Wonho in 2019 and Shownu enlisted for mandatory service, leaving 6 members.", "source": "https://en.wikipedia.org/wiki/Monsta_X"},
    {"question": "Which group has more members: STRAY KIDS or ATEEZ?", "options": ["STRAY KIDS (8 members)", "ATEEZ (8 members)", "STRAY KIDS (9 members)", "They currently have the same number (8)"], "correct": 3, "fun_fact": "Both Stray Kids and ATEEZ have 8 members. Stray Kids had 9 members originally but Woojin departed in 2019, leaving 8.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "Which group has more members: (G)I-DLE or IVE?", "options": ["(G)I-DLE (5 members)", "IVE (6 members)", "(G)I-DLE (6 members)", "They currently have the same number"], "correct": 1, "fun_fact": "(G)I-DLE currently has 5 members (after Soojin''s departure in 2021 and Shuhua remaining), while IVE debuted with 6 members: Yujin, Gaeul, Rei, Wonyoung, Liz, and Leeseo.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "Which group has more members: SUPER JUNIOR or BIGBANG?", "options": ["BIGBANG (5 members)", "SUPER JUNIOR (originally 13 members)", "They had the same number at debut", "SUPER JUNIOR (originally 10 members)"], "correct": 1, "fun_fact": "Super Junior originally debuted with 12 members and later grew to 13 with the addition of Kyuhyun. BIGBANG has 5 members: G-Dragon, T.O.P, Taeyang, Daesung, and Seungri.", "source": "https://en.wikipedia.org/wiki/Super_Junior"},
    {"question": "Which group has more members: ENHYPEN or TXT?", "options": ["ENHYPEN (7 members)", "TXT (5 members)", "They have the same number", "ENHYPEN (5 members)"], "correct": 0, "fun_fact": "ENHYPEN has 7 members (Jungwon, Heeseung, Jay, Jake, Sunghoon, Sunoo, Ni-ki) while TXT (Tomorrow X Together) has 5 members (Yeonjun, Soobin, Beomgyu, Taehyun, Huening Kai).", "source": "https://en.wikipedia.org/wiki/Enhypen"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia BTS, Wikipedia Seventeen (South Korean band), Wikipedia Twice (group), Wikipedia Exo (group), Wikipedia NCT (group), Wikipedia Monsta X, Wikipedia Stray Kids, Wikipedia Ive (group), Wikipedia Super Junior, Wikipedia Enhypen'
);

-- 10. K-pop Idol Nicknames (medium, fun)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Idol Nicknames',
  'Every K-pop idol has a nickname! Do you know who''s known as the Golden Maknae, the God of Destruction, and more?',
  NULL,
  'multiple_choice',
  'medium',
  'fun',
  '[
    {"question": "Which BTS member is known as the ''Golden Maknae''?", "options": ["V", "Jimin", "Jungkook", "J-Hope"], "correct": 2, "fun_fact": "Jungkook is called the Golden Maknae because he is the youngest (maknae) member of BTS and is exceptionally talented across singing, dancing, and sports.", "source": "https://en.wikipedia.org/wiki/Jungkook"},
    {"question": "Which BTS member is nicknamed ''God of Destruction'' due to his clumsiness?", "options": ["Suga", "J-Hope", "Jin", "RM"], "correct": 3, "fun_fact": "RM is called the God of Destruction because he is famously clumsy and has repeatedly accidentally broken things, even during TV appearances. He has embraced the nickname with humor.", "source": "https://en.wikipedia.org/wiki/RM_(rapper)"},
    {"question": "Hwasa of MAMAMOO is known by which nickname?", "options": ["Solar", "Lena", "Maria", "Queendom"], "correct": 2, "fun_fact": "Hwasa is nicknamed ''Maria'' by fans, inspired by her confident and bold stage presence. She even released a solo song titled Maria in 2020.", "source": "https://en.wikipedia.org/wiki/Hwasa"},
    {"question": "What is Suga of BTS''s solo stage name when releasing mixtapes?", "options": ["Min Yoongi", "Agust D", "D-Boy", "Shadow"], "correct": 1, "fun_fact": "Suga releases solo music under the name Agust D. The name is a reversal of DT Suga, where DT refers to Daegu Town, his hometown.", "source": "https://en.wikipedia.org/wiki/Agust_D"},
    {"question": "KEY of SHINee is often called by which nickname?", "options": ["Almighty Key", "Key Master", "Diva Key", "Fabulous Key"], "correct": 0, "fun_fact": "KEY is often nicknamed ''Almighty Key'' because of his versatile talents in singing, dancing, acting, and fashion. He is known as one of the most multi-talented idols in K-pop.", "source": "https://en.wikipedia.org/wiki/Key_(singer)"},
    {"question": "Which BLACKPINK member is nicknamed ''Human Gucci'' for her fashion sense?", "options": ["Jisoo", "Rose", "Lisa", "Jennie"], "correct": 3, "fun_fact": "Jennie is nicknamed ''Human Gucci'' and ''Human Chanel'' because of her impeccable fashion sense and her status as a Chanel global brand ambassador.", "source": "https://en.wikipedia.org/wiki/Jennie_(singer)"},
    {"question": "Who is known as ''Noisy Boy'' or the mood-maker of BTS?", "options": ["Jin", "RM", "J-Hope", "Jimin"], "correct": 2, "fun_fact": "J-Hope is known as the mood-maker of BTS due to his cheerful energy. Jin is also known as the ''Windshield Wiper'' for his habit of making fans'' hearts flutter, and has the nickname ''Worldwide Handsome.''", "source": "https://en.wikipedia.org/wiki/J-Hope"},
    {"question": "G-Dragon of BIGBANG is also known by which title in the K-pop industry?", "options": ["King of K-pop", "Prince of Pop", "The King of K-hip-hop", "Minister of Fashion"], "correct": 0, "fun_fact": "G-Dragon is widely referred to as the ''King of K-pop'' for his enormous influence on the genre, fashion, and music. He is one of the most iconic and influential figures in K-pop history.", "source": "https://en.wikipedia.org/wiki/G-Dragon"},
    {"question": "IU (Lee Ji-eun) is commonly called which nickname by the Korean public?", "options": ["Nation''s Fairy", "Little Sister", "Korea''s Sweetheart", "Nation''s Younger Sister"], "correct": 3, "fun_fact": "IU is nicknamed ''Nation''s Younger Sister'' (gukmin dongsaeng) due to her youthful, bright image and the way Korean audiences have embraced her since her teenage debut.", "source": "https://en.wikipedia.org/wiki/IU_(singer)"},
    {"question": "CL of 2NE1 was known by which nickname reflecting her leadership role?", "options": ["The Baddest Female", "Queen of K-pop", "Alpha Wolf", "Ice Queen"], "correct": 0, "fun_fact": "CL is known as ''The Baddest Female,'' which was also the title of her 2013 solo debut single. She was considered one of the most powerful female rappers in K-pop.", "source": "https://en.wikipedia.org/wiki/CL_(singer)"}
  ]'::jsonb,
  'verified',
  'Sources: Wikipedia Jungkook, Wikipedia RM (rapper), Wikipedia Hwasa, Wikipedia Agust D, Wikipedia Key (singer), Wikipedia Jennie (singer), Wikipedia J-Hope, Wikipedia G-Dragon, Wikipedia IU (singer), Wikipedia CL (singer)'
);

-- ============================================
-- GROUP SPECIFIC QUIZZES (25 total)
-- ============================================

-- 11. BTS Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'BTS: The Ultimate Quiz',
  'From their 2013 debut to global domination -- test your knowledge on Bangtan Sonyeondan!',
  1,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "BTS debuted under which company in 2013?", "options": ["SM Entertainment", "Big Hit Entertainment", "YG Entertainment", "JYP Entertainment"], "correct": 1, "fun_fact": "BTS debuted under Big Hit Entertainment on June 13, 2013. The company rebranded to HYBE Corporation in 2021.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "What was BTS''s debut single?", "options": ["Boy In Luv", "N.O", "No More Dream", "War of Hormone"], "correct": 2, "fun_fact": "BTS debuted with the single No More Dream, from their first EP 2 Cool 4 Skool released on June 12, 2013.", "source": "https://en.wikipedia.org/wiki/2_Cool_4_Skool"},
    {"question": "Which BTS album contains the hit single ''DNA''?", "options": ["Wings", "Love Yourself: Her", "Map of the Soul: 7", "You Never Walk Alone"], "correct": 1, "fun_fact": "DNA was released as the lead single of Love Yourself: Her on September 18, 2017. It was BTS''s first song to chart on the Billboard Hot 100.", "source": "https://en.wikipedia.org/wiki/Love_Yourself:_Her"},
    {"question": "In which year did BTS''s ''Dynamite'' debut at #1 on the Billboard Hot 100?", "options": ["2019", "2020", "2021", "2018"], "correct": 1, "fun_fact": "Dynamite debuted at #1 on the Billboard Hot 100 on August 22, 2020, making BTS the first all-South Korean act to top the chart.", "source": "https://en.wikipedia.org/wiki/Dynamite_(BTS_song)"},
    {"question": "J-Hope was born and raised in which South Korean city?", "options": ["Seoul", "Busan", "Gwangju", "Daegu"], "correct": 2, "fun_fact": "J-Hope (Jung Ho-seok) was born on February 18, 1994, in Gwangju. He trained in street dance before joining Big Hit Entertainment.", "source": "https://en.wikipedia.org/wiki/J-Hope"},
    {"question": "BTS collaborated with which artist on the 2019 hit ''Boy With Luv''?", "options": ["Dua Lipa", "Halsey", "Ariana Grande", "Cardi B"], "correct": 1, "fun_fact": "Boy With Luv featuring Halsey was released on April 12, 2019. The music video broke the record for the most-viewed YouTube video in 24 hours at the time.", "source": "https://en.wikipedia.org/wiki/Boy_with_Luv"},
    {"question": "RM''s stage name was originally ''Rap Monster'' before being shortened. When did he officially change it to RM?", "options": ["2015", "2016", "2017", "2018"], "correct": 2, "fun_fact": "RM announced the change from Rap Monster to RM in 2017, stating the new name can stand for many things and reflects his growth as an artist.", "source": "https://en.wikipedia.org/wiki/RM_(rapper)"},
    {"question": "Which BTS member is from Busan and is the youngest in the group?", "options": ["Jimin", "V", "Jungkook", "Jin"], "correct": 2, "fun_fact": "Jungkook (Jeon Jeong-guk) was born on September 1, 1997, in Busan. As the youngest (maknae), he is nicknamed the Golden Maknae for his exceptional talents.", "source": "https://en.wikipedia.org/wiki/Jungkook"},
    {"question": "BTS addressed the United Nations General Assembly for the first time in which year?", "options": ["2018", "2019", "2020", "2021"], "correct": 0, "fun_fact": "BTS addressed the 73rd UN General Assembly on September 24, 2018, as part of the UNICEF Generation Unlimited initiative. RM delivered the speech in Korean.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "Which BTS member released the solo mixtape ''Hope World'' in 2018?", "options": ["Suga", "RM", "J-Hope", "V"], "correct": 2, "fun_fact": "J-Hope released Hope World on March 2, 2018, as a free mixtape. It debuted at #38 on the Billboard 200, the highest ever for a Korean solo artist at the time.", "source": "https://en.wikipedia.org/wiki/Hope_World"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia BTS, Wikipedia 2 Cool 4 Skool, Wikipedia Love Yourself: Her, Wikipedia Dynamite (BTS song), Wikipedia J-Hope, Wikipedia Boy with Luv, Wikipedia RM (rapper), Wikipedia Jungkook, Wikipedia Hope World'
);

-- 12. BLACKPINK Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'BLACKPINK: How You Like That Quiz',
  'Are you a true BLINK? Put your BLACKPINK knowledge to the test!',
  2,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did BLACKPINK debut?", "options": ["2015", "2016", "2017", "2018"], "correct": 1, "fun_fact": "BLACKPINK officially debuted on August 8, 2016 under YG Entertainment with the single album Square One, featuring Whistle and Boombayah.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "Which was BLACKPINK''s first full-length studio album?", "options": ["Kill This Love", "Square Up", "The Album", "Born Pink"], "correct": 2, "fun_fact": "The Album, released on October 2, 2020, was BLACKPINK''s first full-length Korean studio album, featuring the lead single Lovesick Girls.", "source": "https://en.wikipedia.org/wiki/The_Album_(Blackpink_album)"},
    {"question": "BLACKPINK became the first female K-pop group to perform at which major US festival in 2019?", "options": ["Lollapalooza", "Coachella", "Glastonbury", "Ultra Music Festival"], "correct": 1, "fun_fact": "BLACKPINK performed at the Coachella Valley Music and Arts Festival in April 2019, becoming the first K-pop group ever to perform there.", "source": "https://en.wikipedia.org/wiki/Blackpink_at_Coachella"},
    {"question": "Which BLACKPINK member is from Thailand?", "options": ["Jisoo", "Jennie", "Rose", "Lisa"], "correct": 3, "fun_fact": "Lisa (Lalisa Manoban) is from Buriram, Thailand. Before joining YG Entertainment, she won a nationwide dancing competition in Thailand.", "source": "https://en.wikipedia.org/wiki/Lisa_(rapper)"},
    {"question": "Jennie''s debut solo single released in 2018 was titled what?", "options": ["Gone", "SOLO", "You & Me", "Snowdrop"], "correct": 1, "fun_fact": "SOLO was released on November 12, 2018, making Jennie the first BLACKPINK member to debut as a solo artist. It topped the Gaon Digital Chart.", "source": "https://en.wikipedia.org/wiki/Solo_(Jennie_song)"},
    {"question": "BLACKPINK''s ''How You Like That'' broke the YouTube record for most views in 24 hours in 2020. How many views did it get?", "options": ["Over 56 million", "Over 86 million", "Over 72 million", "Over 100 million"], "correct": 1, "fun_fact": "How You Like That accumulated over 86.3 million views within 24 hours of release on June 26, 2020, breaking the previous YouTube record.", "source": "https://en.wikipedia.org/wiki/How_You_Like_That"},
    {"question": "Rose of BLACKPINK grew up in which country?", "options": ["New Zealand", "United States", "Australia", "Canada"], "correct": 2, "fun_fact": "Rose (Park Chae-young) was born in New Zealand but grew up primarily in Melbourne, Australia. She is a fluent English speaker.", "source": "https://en.wikipedia.org/wiki/Rose_(singer)"},
    {"question": "BLACKPINK''s album Born Pink reached #1 on which major US chart in 2022?", "options": ["Billboard Hot 100", "Billboard 200", "Billboard Artist 100", "Billboard Global 200"], "correct": 1, "fun_fact": "Born Pink, released September 16, 2022, debuted at #1 on the Billboard 200, making BLACKPINK the first K-pop girl group to top the chart.", "source": "https://en.wikipedia.org/wiki/Born_Pink"},
    {"question": "Jisoo starred in which Korean drama that aired on Disney+ in 2021?", "options": ["Crash Landing on You", "Vincenzo", "Snowdrop", "Twenty-Five Twenty-One"], "correct": 2, "fun_fact": "Jisoo starred in Snowdrop (2021-2022) alongside Jung Hae-in. The drama aired on JTBC and Disney+ and was set in 1987 South Korea.", "source": "https://en.wikipedia.org/wiki/Snowdrop_(TV_series)"},
    {"question": "BLACKPINK''s 2022 world tour was titled what?", "options": ["In Your Area", "The Album Tour", "Born Pink", "Re: BLACKPINK"], "correct": 2, "fun_fact": "The Born Pink World Tour ran from October 2022 to September 2023, making it one of the highest-grossing concert tours by a K-pop act.", "source": "https://en.wikipedia.org/wiki/Born_Pink_World_Tour"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Blackpink, Wikipedia The Album (Blackpink album), Wikipedia Blackpink at Coachella, Wikipedia Lisa (rapper), Wikipedia Solo (Jennie song), Wikipedia How You Like That, Wikipedia Rose (singer), Wikipedia Born Pink, Wikipedia Snowdrop (TV series)'
);

-- 13. Stray Kids Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'Stray Kids: District 9 Quiz',
  'Stay strong, STAY! Test your knowledge of Stray Kids from their JYP origins to self-producing legends.',
  3,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "How was Stray Kids formed?", "options": ["Through a JYPE survival show", "By SM Entertainment casting", "Through a Big Hit audition", "They were pre-formed by management"], "correct": 0, "fun_fact": "Stray Kids was formed through a 2017 JYP Entertainment reality survival show also named Stray Kids. The final 9 members were selected from the show.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "In what year did Stray Kids officially debut?", "options": ["2017", "2018", "2019", "2016"], "correct": 1, "fun_fact": "Stray Kids officially debuted on March 25, 2018 under JYP Entertainment with the EP Mixtape.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "Stray Kids'' sub-unit ''3RACHA'' consists of which three members?", "options": ["Hyunjin, Felix, Seungmin", "Bang Chan, Changbin, Han", "Lee Know, Woojin, I.N", "Woojin, Bang Chan, Felix"], "correct": 1, "fun_fact": "3RACHA is a hip-hop sub-unit formed in 2017 before the group''s debut, consisting of Bang Chan, Changbin (Spearb), and Han (J.One). They have released numerous self-produced tracks.", "source": "https://en.wikipedia.org/wiki/3racha"},
    {"question": "Which member left Stray Kids in October 2019?", "options": ["Jeongin (I.N)", "Woojin", "Minho (Lee Know)", "Felix"], "correct": 1, "fun_fact": "Woojin (Kim Woo-jin) left Stray Kids in October 2019 due to personal reasons. The group continued activities with the remaining 8 members.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "Stray Kids'' self-produced unit responsible for most of their music production is called what?", "options": ["3RACHA", "SKZ-RECORD", "MIROH Productions", "stays"], "correct": 0, "fun_fact": "3RACHA (Bang Chan, Changbin, Han) produces and writes the vast majority of Stray Kids'' music, which is why the group is known as a self-producing idol group.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "Felix is originally from which country?", "options": ["South Korea", "Australia", "New Zealand", "United States"], "correct": 1, "fun_fact": "Felix (Lee Yong-bok) was born in Sydney, Australia. He is of Korean descent and is known for his distinctive deep voice despite his upbeat personality.", "source": "https://en.wikipedia.org/wiki/Felix_(singer)"},
    {"question": "Which Stray Kids album debuted at #1 on the Billboard 200 in 2022?", "options": ["NOEASY", "Oddinary", "MAXIDENT", "5-STAR"], "correct": 2, "fun_fact": "MAXIDENT debuted at #1 on the Billboard 200 in October 2022, making Stray Kids the fourth K-pop act (after BTS, BLACKPINK, and TWICE) to top the chart.", "source": "https://en.wikipedia.org/wiki/Maxident"},
    {"question": "Stray Kids'' fan club name is what?", "options": ["STAY", "SKZ-land", "DISTRICT9", "MIROH"], "correct": 0, "fun_fact": "Stray Kids'' fandom name is STAY, chosen because the boys (Stray Kids) and their fans (STAY) complete each other. The name was selected through a fan vote.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "Bang Chan, the leader of Stray Kids, grew up in which city outside of Korea?", "options": ["Sydney, Australia", "Toronto, Canada", "Auckland, New Zealand", "Los Angeles, USA"], "correct": 0, "fun_fact": "Bang Chan (Christopher Bang) was born in Seoul but grew up in Sydney, Australia, where he trained in music. He speaks fluent English and has hosted the online show Chan''s Room.", "source": "https://en.wikipedia.org/wiki/Bang_Chan"},
    {"question": "Stray Kids released which viral hit featuring a unique hook in 2022?", "options": ["God''s Menu", "Miroh", "MANIAC", "CASE 143"], "correct": 2, "fun_fact": "MANIAC was released in March 2022 as the title track of Oddinary. Its catchy hook and choreography went viral, significantly boosting Stray Kids'' global fanbase.", "source": "https://en.wikipedia.org/wiki/Oddinary"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Stray Kids, Wikipedia 3racha, Wikipedia Felix (singer), Wikipedia Maxident, Wikipedia Bang Chan'
);

-- 14. TWICE Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'TWICE: Feel Special Quiz',
  'ONCEs, show what you know! Test your TWICE knowledge from debut to world tour legends.',
  4,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "Through which survival show was TWICE formed?", "options": ["Sixteen", "Produce 101", "I-LAND", "The Unit"], "correct": 0, "fun_fact": "TWICE was formed through JYP Entertainment''s reality show Sixteen (2015), which aired on Mnet. Out of 16 trainees, 9 were chosen to form the group.", "source": "https://en.wikipedia.org/wiki/Sixteen_(TV_series)"},
    {"question": "In what year did TWICE officially debut?", "options": ["2014", "2015", "2016", "2017"], "correct": 1, "fun_fact": "TWICE debuted on October 20, 2015 under JYP Entertainment with the single Like OOH-AHH, from the EP The Story Begins.", "source": "https://en.wikipedia.org/wiki/Twice_(group)"},
    {"question": "How many members does TWICE have?", "options": ["7", "8", "9", "10"], "correct": 2, "fun_fact": "TWICE has 9 members: Nayeon, Jeongyeon, Momo, Sana, Jihyo, Mina, Dahyun, Chaeyoung, and Tzuyu. Three members are Japanese (Momo, Sana, Mina) and one is Taiwanese (Tzuyu).", "source": "https://en.wikipedia.org/wiki/Twice_(group)"},
    {"question": "Which TWICE song became their first mega-hit in 2016?", "options": ["TT", "Cheer Up", "Signal", "Heart Shaker"], "correct": 1, "fun_fact": "Cheer Up (2016) won Song of the Year at multiple Korean music award shows, including Melon Music Awards and Mnet Asian Music Awards. It was one of the best-selling digital singles of 2016.", "source": "https://en.wikipedia.org/wiki/Cheer_Up_(Twice_song)"},
    {"question": "Tzuyu of TWICE is from which country?", "options": ["Japan", "China", "Taiwan", "Thailand"], "correct": 2, "fun_fact": "Tzuyu (Chou Tzuyu) was born on June 14, 1999, in Tainan, Taiwan. She joined JYP after being scouted at a talent show in Taiwan.", "source": "https://en.wikipedia.org/wiki/Tzuyu"},
    {"question": "TWICE became the first K-pop girl group to achieve what Japanese concert milestone?", "options": ["First to perform at Tokyo Dome", "First to complete a sold-out dome tour in Japan", "First to release a Japanese studio album", "First to appear on NHK Kohaku Uta Gassen"], "correct": 1, "fun_fact": "TWICE completed the first sold-out dome tour in Japan by a K-pop girl group in 2018, performing at four major Japanese domes.", "source": "https://en.wikipedia.org/wiki/Twice_(group)"},
    {"question": "Which of these TWICE songs has a signature ''T-T'' hand gesture in its choreography?", "options": ["Signal", "What is Love?", "TT", "Fancy"], "correct": 2, "fun_fact": "TT, released in October 2016, features the signature T-T hand gesture (fingers forming a T shape under the eyes to mimic a crying face). The song was an immediate hit.", "source": "https://en.wikipedia.org/wiki/TT_(song)"},
    {"question": "Nayeon was the first TWICE member to release a solo debut. What was her debut EP called?", "options": ["IM NAYEON", "Nayeon''s Pop", "Pop!", "Solo Trip"], "correct": 0, "fun_fact": "Nayeon released her first solo EP IM NAYEON in June 2022, with the lead single Pop!. It debuted at #7 on the Billboard 200.", "source": "https://en.wikipedia.org/wiki/Im_Nayeon_(EP)"},
    {"question": "TWICE''s long-running concert series, featuring solo stages and dance breaks, is called what?", "options": ["TWICE WORLD TOUR ''III''", "TWICE DOME TOUR", "TWICELIGHTS", "TWICE LAND"], "correct": 2, "fun_fact": "TWICELIGHTS was TWICE''s 2019 world tour, their second world tour. TWICE has since become known for extravagant world tours including ''III'' and ''Ready To Be.''", "source": "https://en.wikipedia.org/wiki/Twicelights_World_Tour"},
    {"question": "Which member is TWICE''s leader?", "options": ["Nayeon", "Jihyo", "Jeongyeon", "Momo"], "correct": 1, "fun_fact": "Jihyo (Park Ji-hyo) is the leader of TWICE. She was one of JYP''s longest-serving trainees before TWICE debuted, having trained for about 10 years.", "source": "https://en.wikipedia.org/wiki/Jihyo"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Twice (group), Wikipedia Sixteen (TV series), Wikipedia Cheer Up (Twice song), Wikipedia Tzuyu, Wikipedia TT (song), Wikipedia Im Nayeon (EP), Wikipedia Twicelights World Tour, Wikipedia Jihyo'
);

-- 15. aespa Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'aespa: Black Mamba Quiz',
  'Step into the æ-world! How well do you know SM Entertainment''s metaverse girl group?',
  5,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "When did aespa officially debut?", "options": ["October 2019", "November 2020", "January 2021", "May 2020"], "correct": 1, "fun_fact": "aespa debuted on November 17, 2020 under SM Entertainment with the single Black Mamba. The debut MV reached 100 million YouTube views faster than any SM debut.", "source": "https://en.wikipedia.org/wiki/Aespa"},
    {"question": "What is the unique concept that sets aespa apart from other K-pop groups?", "options": ["They are a mixed-gender group", "Each member has an AI avatar version of themselves in a virtual world", "They only perform in augmented reality concerts", "Their music is composed entirely by AI"], "correct": 1, "fun_fact": "aespa''s concept revolves around each member having an AI avatar called their ae (ae-Karina, ae-Giselle, ae-Winter, ae-Ningning) that exists in the virtual world called the æ-universe (KWANGYA).", "source": "https://en.wikipedia.org/wiki/Aespa"},
    {"question": "How many members does aespa have?", "options": ["3", "4", "5", "6"], "correct": 1, "fun_fact": "aespa has 4 members: Karina, Giselle, Winter, and Ningning. The group name comes from combining ae (avatar experience) with the English word aspect.", "source": "https://en.wikipedia.org/wiki/Aespa"},
    {"question": "Ningning is from which country?", "options": ["Japan", "South Korea", "China", "Taiwan"], "correct": 2, "fun_fact": "Ningning (Ning Yizhuo) is from Harbin, Heilongjiang province in China. She is the main vocalist of aespa.", "source": "https://en.wikipedia.org/wiki/Ningning"},
    {"question": "What was aespa''s first mini-album called?", "options": ["Savage", "Black Mamba", "My World", "Synk: Parallel Line"], "correct": 0, "fun_fact": "Savage, released on October 5, 2021, was aespa''s first mini-album. The title track Savage debuted at #20 on the US iTunes chart.", "source": "https://en.wikipedia.org/wiki/Savage_(aespa_EP)"},
    {"question": "Karina is aespa''s leader. What is her real name?", "options": ["Yu Ji-min", "Cho Joo-yeon", "Kim Yoon-ji", "Lee Ji-min"], "correct": 0, "fun_fact": "Karina''s real name is Yu Ji-min. She was born in Seongnam, South Korea, and was a trainee at SM Entertainment before aespa''s debut.", "source": "https://en.wikipedia.org/wiki/Karina_(singer)"},
    {"question": "aespa performed at which major US music festival in 2022, becoming the first 4th gen K-pop group to do so?", "options": ["Coachella", "Lollapalooza", "SXSW", "Governor''s Ball"], "correct": 1, "fun_fact": "aespa performed at Lollapalooza in Chicago on July 31, 2022, becoming the first 4th generation K-pop act to perform at the festival.", "source": "https://en.wikipedia.org/wiki/Aespa"},
    {"question": "Giselle is from which country?", "options": ["China", "South Korea", "Japan", "Thailand"], "correct": 2, "fun_fact": "Giselle (Uchinaga Aeri) was born in Tokyo, Japan. Despite her Japanese background, she raps primarily in Korean and English as part of aespa.", "source": "https://en.wikipedia.org/wiki/Giselle_(singer)"},
    {"question": "Which aespa song was described as their ''second debut'' and featured a dramatic concept shift?", "options": ["Next Level", "Dreams Come True", "Spicy", "Better Things"], "correct": 0, "fun_fact": "Next Level (2021) was considered aespa''s second debut due to its massive impact. It sampled the song Next Level from the Fast and Furious soundtrack and topped Korean charts for weeks.", "source": "https://en.wikipedia.org/wiki/Next_Level_(aespa_song)"},
    {"question": "aespa''s fandom is called what?", "options": ["MYSTERY", "MY", "AERI", "KWANGYA"], "correct": 1, "fun_fact": "aespa''s official fandom name is MY (pronounced ''my''). The name connects to the group''s concept: each member''s ae (avatar) calls them ''MY,'' symbolizing the bond between aespa and their fans.", "source": "https://en.wikipedia.org/wiki/Aespa"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Aespa, Wikipedia Ningning, Wikipedia Savage (aespa EP), Wikipedia Karina (singer), Wikipedia Giselle (singer), Wikipedia Next Level (aespa song)'
);

-- 16. NewJeans Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'NewJeans: OMG Quiz',
  'Do you know everything about the Bunnies? Test your NewJeans knowledge!',
  6,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "When did NewJeans debut?", "options": ["January 2022", "July 2022", "November 2022", "March 2023"], "correct": 1, "fun_fact": "NewJeans debuted on July 22, 2022 under ADOR (a subsidiary of HYBE) with the EP New Jeans. Their debut was considered a massive success.", "source": "https://en.wikipedia.org/wiki/NewJeans"},
    {"question": "NewJeans is under which label, a subsidiary of HYBE?", "options": ["BELIFT LAB", "ADOR", "Source Music", "Pledis Entertainment"], "correct": 1, "fun_fact": "NewJeans is under ADOR (A Dreamer''s Only Real Label), a HYBE subsidiary. ADOR''s CEO Min Hee-jin was the creative director who conceptualized NewJeans.", "source": "https://en.wikipedia.org/wiki/NewJeans"},
    {"question": "Which NewJeans song went viral for its Y2K-inspired retro concept and featured a dual music video?", "options": ["Attention", "Ditto", "Hype Boy", "OMG"], "correct": 1, "fun_fact": "Ditto was released in December 2022 and became a massive hit for its nostalgic Y2K aesthetic and unique dual MV (Side A and Side B). It topped Korean charts for weeks.", "source": "https://en.wikipedia.org/wiki/Ditto_(NewJeans_song)"},
    {"question": "How many members are in NewJeans?", "options": ["4", "5", "6", "7"], "correct": 1, "fun_fact": "NewJeans has 5 members: Minji, Hanni, Danielle, Haerin, and Hyein. They are known for a refreshing, casual concept that broke from traditional K-pop girl group aesthetics.", "source": "https://en.wikipedia.org/wiki/NewJeans"},
    {"question": "Hanni is from which country?", "options": ["South Korea", "Japan", "Vietnam", "Australia"], "correct": 3, "fun_fact": "Hanni (Pham Ngoc Han) was born in Vietnam but grew up in Melbourne, Australia. She is one of the most internationally recognized members of NewJeans.", "source": "https://en.wikipedia.org/wiki/Hanni_(singer)"},
    {"question": "NewJeans collaborated with which global brand for a special content project in 2023?", "options": ["Nike", "McDonald''s", "Coca-Cola", "Apple"], "correct": 1, "fun_fact": "NewJeans became brand ambassadors and collaborated with McDonald''s Korea in 2023, releasing the NewJeans Burger Set which became wildly popular.", "source": "https://en.wikipedia.org/wiki/NewJeans"},
    {"question": "Which NewJeans song was their debut track and immediately charted high upon release?", "options": ["Ditto", "Hype Boy", "Attention", "Cookie"], "correct": 2, "fun_fact": "Attention was NewJeans'' debut single released on July 22, 2022. It was praised for its unique retro-pop sound and cinematographic music video style.", "source": "https://en.wikipedia.org/wiki/Attention_(NewJeans_song)"},
    {"question": "Which NewJeans member is the youngest and debuted at just 14 years old?", "options": ["Haerin", "Danielle", "Hyein", "Minji"], "correct": 2, "fun_fact": "Hyein (Lee Hye-in) was born on April 21, 2008, and debuted at age 14 when NewJeans released their EP New Jeans in July 2022.", "source": "https://en.wikipedia.org/wiki/Hyein"},
    {"question": "NewJeans performed at which global sporting event opening ceremony in 2024?", "options": ["FIFA World Cup", "Super Bowl", "NBA All-Star Game", "Paris Olympics"], "correct": 3, "fun_fact": "NewJeans performed at the Paris 2024 Olympic Games opening ceremony in July 2024, showcasing K-pop''s global reach on the world''s biggest sporting stage.", "source": "https://en.wikipedia.org/wiki/NewJeans"},
    {"question": "Danielle is of mixed Korean and which other heritage?", "options": ["Irish", "French", "Australian", "American"], "correct": 0, "fun_fact": "Danielle (Danielle Marsh) is of Korean and Irish descent. She was born in South Korea but has an Australian/Irish father, making her one of the most multicultural members in K-pop.", "source": "https://en.wikipedia.org/wiki/Danielle_(singer)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia NewJeans, Wikipedia Ditto (NewJeans song), Wikipedia Hanni (singer), Wikipedia Attention (NewJeans song), Wikipedia Hyein, Wikipedia Danielle (singer)'
);

-- 17. SEVENTEEN Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'SEVENTEEN: Caratland Quiz',
  'CARATs, how well do you know the Performance Team, Vocal Team, and Hip-Hop Unit?',
  7,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "How many members does SEVENTEEN have?", "options": ["11", "12", "13", "14"], "correct": 2, "fun_fact": "SEVENTEEN has 13 members split into three units: Hip-Hop Unit (S.Coups, Wonwoo, Mingyu, Vernon), Vocal Unit (Woozi, Jeonghan, Joshua, DK, Seungkwan), and Performance Unit (Hoshi, Jun, The8, Dino).", "source": "https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)"},
    {"question": "In what year did SEVENTEEN debut?", "options": ["2013", "2014", "2015", "2016"], "correct": 2, "fun_fact": "SEVENTEEN debuted on May 26, 2015 under Pledis Entertainment (now under HYBE) with the EP 17 Carat.", "source": "https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)"},
    {"question": "SEVENTEEN''s self-production team BUMZU is led by which member?", "options": ["S.Coups", "Woozi", "Hoshi", "Vernon"], "correct": 1, "fun_fact": "Woozi (Lee Ji-hoon) is the main songwriter and producer for SEVENTEEN, heading the group''s in-house production team. He writes and produces the majority of their music.", "source": "https://en.wikipedia.org/wiki/Woozi"},
    {"question": "Vernon of SEVENTEEN is of mixed Korean and which other descent?", "options": ["Japanese", "Chinese", "American (Korean-American)", "French"], "correct": 2, "fun_fact": "Vernon (Chwe Hansol) was born in New York City to a Korean father and American mother. He grew up partly in the US and is fluent in English.", "source": "https://en.wikipedia.org/wiki/Vernon_(rapper)"},
    {"question": "Which SEVENTEEN song became a viral success in 2022 and introduced many new international fans to the group?", "options": ["Don''t Wanna Cry", "Clap", "Rock with You", "MAESTRO"], "correct": 2, "fun_fact": "Rock with You, from the 2022 mini-album Face the Sun, went viral on TikTok and social media, significantly expanding SEVENTEEN''s international fanbase.", "source": "https://en.wikipedia.org/wiki/Face_the_Sun"},
    {"question": "Joshua is from which US city?", "options": ["New York", "Los Angeles", "Seattle", "Chicago"], "correct": 1, "fun_fact": "Joshua (Joshua Hong) was born and raised in Los Angeles, California. He auditioned for Pledis Entertainment after being scouted at a K-pop concert in the US.", "source": "https://en.wikipedia.org/wiki/Joshua_(singer)"},
    {"question": "SEVENTEEN''s Caratland is the name of their what?", "options": ["Official fan club gathering space", "Annual fan concert series", "Online fan community platform", "Their debut studio album"], "correct": 1, "fun_fact": "Caratland is SEVENTEEN''s annual fan concert (a special show dedicated to their fans, CARATs). It is one of the most anticipated fan events in K-pop.", "source": "https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)"},
    {"question": "SEVENTEEN''s lightstick is called the Carat Bong. What color does it glow?", "options": ["Blue", "Pink", "Golden Yellow", "Green"], "correct": 2, "fun_fact": "The Carat Bong emits a golden yellow glow, representing the ''shining'' quality of CARATs (diamonds). The fandom name CARAT refers to the unit used to measure diamonds.", "source": "https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)"},
    {"question": "Which SEVENTEEN album contains the hit song ''Left & Right''?", "options": ["You Make My Day", "Semicolon", "Heng:garae", "Director''s Cut"], "correct": 2, "fun_fact": "Left & Right was the title track of SEVENTEEN''s seventh mini-album Heng:garae, released in June 2020. It became one of their most internationally recognized songs.", "source": "https://en.wikipedia.org/wiki/Heng:garae"},
    {"question": "What does the name SEVENTEEN refer to, given there are 13 members?", "options": ["Their training years combined", "13 members + 3 units + 1 team = 17", "Their debut date (May 17)", "There were 17 trainees initially"], "correct": 1, "fun_fact": "The name SEVENTEEN represents 13 members + 3 units (Hip-Hop, Vocal, Performance) + 1 unified team, symbolizing how they all come together as one.", "source": "https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Seventeen (South Korean band), Wikipedia Woozi, Wikipedia Vernon (rapper), Wikipedia Face the Sun, Wikipedia Joshua (singer), Wikipedia Heng:garae'
);

-- 18. EXO Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'EXO: Power Quiz',
  'EXO-L, it''s time to show what you know! Test your knowledge of the legendary EXO!',
  8,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "EXO debuted in 2012. What was their debut concept based on?", "options": ["Mythology and superpowers", "Time travel and space", "Virtual reality and AI", "Ancient Korean kingdoms"], "correct": 0, "fun_fact": "EXO debuted with a concept centered on 12 members split into EXO-K and EXO-M, each member possessing a unique superpower (telekinesis, teleportation, etc.) linked to a fictional exoplanet.", "source": "https://en.wikipedia.org/wiki/Exo_(group)"},
    {"question": "EXO''s debut mini-album in 2012 was titled what?", "options": ["XOXO", "Mama", "Wolf", "History"], "correct": 1, "fun_fact": "EXO released the mini-album MAMA on April 9, 2012, featuring the title track MAMA. The album was simultaneously released in Korean (EXO-K) and Mandarin (EXO-M) versions.", "source": "https://en.wikipedia.org/wiki/Mama_(EXO_EP)"},
    {"question": "EXO''s first studio album XOXO was significant because it was the first K-pop album in the modern era to do what?", "options": ["Sell over 500,000 copies in the US", "Sell over 1 million copies in Korea (million-seller)", "Top the Billboard 200", "Win a Grammy nomination"], "correct": 1, "fun_fact": "XOXO (2013) was the first album to sell over 1 million copies on the Hanteo Chart in the modern era, single-handedly reviving the concept of million-seller albums in K-pop.", "source": "https://en.wikipedia.org/wiki/Xoxo_(EXO_album)"},
    {"question": "Which EXO member is from China and departed in 2014 citing contract issues?", "options": ["Lay", "Kris", "Chen", "Baekhyun"], "correct": 1, "fun_fact": "Kris Wu (Wu Yifan) filed to terminate his exclusive contract with SM Entertainment in May 2014 citing health issues and mistreatment. He later pursued a solo career.", "source": "https://en.wikipedia.org/wiki/Kris_Wu"},
    {"question": "Which EXO sub-unit consists only of the original Korean members?", "options": ["EXO-CBX", "EXO-K", "EXO-SC", "EXO-M"], "correct": 1, "fun_fact": "EXO-K featured the Korean members (Suho, Baekhyun, Chanyeol, D.O., Kai, Sehun) while EXO-M featured the Mandarin-language members. Both debuted simultaneously.", "source": "https://en.wikipedia.org/wiki/Exo_(group)"},
    {"question": "D.O. of EXO is also known as a successful actor. In which 2020 film did he star that received critical acclaim?", "options": ["Along with the Gods", "Room No. 7", "100 Days My Prince", "My Annoying Brother"], "correct": 1, "fun_fact": "D.O. (Do Kyung-soo) starred in Room No. 7 (2017) and multiple other films. He is considered one of the most talented actor-idols in K-pop and has received multiple acting awards.", "source": "https://en.wikipedia.org/wiki/D.O._(singer)"},
    {"question": "Lay is the only remaining Chinese member of EXO. He is originally from which city?", "options": ["Beijing", "Shanghai", "Changsha", "Chengdu"], "correct": 2, "fun_fact": "Lay (Zhang Yixing) is from Changsha, Hunan Province. He continues as an EXO member while simultaneously pursuing a massive solo career in China.", "source": "https://en.wikipedia.org/wiki/Lay_Zhang"},
    {"question": "Which popular 2016 EXO song features a monster concept and became one of their biggest hits?", "options": ["Growl", "Call Me Baby", "Monster", "Ko Ko Bop"], "correct": 2, "fun_fact": "Monster was released in June 2016 as a double title track alongside Lucky One. The dark, intense music video and choreography made it one of EXO''s most iconic releases.", "source": "https://en.wikipedia.org/wiki/Monster_(EXO_song)"},
    {"question": "EXO''s fan club name is what?", "options": ["EXO-Star", "EXO Planet", "EXO-L", "EXOVERSE"], "correct": 2, "fun_fact": "EXO''s fandom is called EXO-L, where L represents the letter between K and M in the alphabet, symbolizing that EXO-L is between EXO-K and EXO-M -- the fans connecting the two sub-units.", "source": "https://en.wikipedia.org/wiki/Exo_(group)"},
    {"question": "Which member of EXO was the first to release a Korean solo studio album?", "options": ["Baekhyun", "Chen", "Sehun", "Xiumin"], "correct": 1, "fun_fact": "Chen (Kim Jong-dae) released his first solo EP April, and a Flower in April 2019, becoming the first EXO member to release a Korean solo mini-album.", "source": "https://en.wikipedia.org/wiki/Chen_(singer)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Exo (group), Wikipedia Mama (EXO EP), Wikipedia Xoxo (EXO album), Wikipedia Kris Wu, Wikipedia D.O. (singer), Wikipedia Lay Zhang, Wikipedia Monster (EXO song), Wikipedia Chen (singer)'
);

-- 19. (G)I-DLE Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  '(G)I-DLE: TOMBOY Quiz',
  'Neverland, show what you know about the self-producing queens of K-pop!',
  9,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did (G)I-DLE debut?", "options": ["2017", "2018", "2019", "2020"], "correct": 1, "fun_fact": "(G)I-DLE debuted on May 2, 2018 under Cube Entertainment with the mini-album I Am, featuring the title track LATATA.", "source": "https://en.wikipedia.org/wiki/(G)I-dle"},
    {"question": "Which (G)I-DLE member is the main producer and songwriter responsible for most of the group''s music?", "options": ["Miyeon", "Minnie", "Soyeon", "Yuqi"], "correct": 2, "fun_fact": "Soyeon (Jeon So-yeon) is the main producer, rapper, and songwriter of (G)I-DLE. She writes and produces almost all of their songs, making the group one of K-pop''s most self-producing acts.", "source": "https://en.wikipedia.org/wiki/Soyeon"},
    {"question": "Yuqi is from which country?", "options": ["Japan", "Thailand", "China", "South Korea"], "correct": 2, "fun_fact": "Yuqi (Song Yuqi) is from Beijing, China. She is known for her cheerful personality and also has a solo career in China.", "source": "https://en.wikipedia.org/wiki/Yuqi"},
    {"question": "Which former (G)I-DLE member departed in August 2021?", "options": ["Minnie", "Shuhua", "Soojin", "Miyeon"], "correct": 2, "fun_fact": "Soojin (Seo Soo-jin) departed from (G)I-DLE in August 2021 following controversy. The group continued with 5 remaining members.", "source": "https://en.wikipedia.org/wiki/(G)I-dle"},
    {"question": "Which (G)I-DLE song about female empowerment became a massive viral hit in 2022?", "options": ["Latata", "Uh-Oh", "TOMBOY", "Nxde"], "correct": 2, "fun_fact": "TOMBOY was released in March 2022 as the lead single of the album I NEVER DIE. It topped charts across Korea and broke multiple streaming records.", "source": "https://en.wikipedia.org/wiki/I_Never_Die"},
    {"question": "Shuhua is from which country?", "options": ["Japan", "Taiwan", "China", "Vietnam"], "correct": 1, "fun_fact": "Shuhua (Yeh Shu-hua) is from Changhua, Taiwan. She joined Cube Entertainment after being scouted through a talent show, despite having no prior singing or dancing training.", "source": "https://en.wikipedia.org/wiki/Shuhua"},
    {"question": "Which (G)I-DLE song was created for the 2020 League of Legends World Championship?", "options": ["Dumdi Dumdi", "Lion", "THE BADDEST", "HWAA"], "correct": 2, "fun_fact": "THE BADDEST was composed by (G)I-DLE''s Soyeon for the 2020 LoL World Championship. It was part of the K/DA project, featuring virtual K-pop group K/DA.", "source": "https://en.wikipedia.org/wiki/The_Baddest_(K/DA_song)"},
    {"question": "What does the group name (G)I-DLE mean?", "options": ["Girls I Do Love Everyone", "I am a girl, I am free (from Korean ''I-DLE'')", "Global Idols Dancing and Living Energetically", "Girls Inspiring Daily Life Everywhere"], "correct": 1, "fun_fact": "The name (G)I-DLE comes from the Korean word ''I-DLE'' (아이들) meaning ''children'' or ''girls,'' combined with the English letter G for ''girl.'' Soyeon has also said the name can mean ''I am a girl who is free.''", "source": "https://en.wikipedia.org/wiki/(G)I-dle"},
    {"question": "Minnie is from which country?", "options": ["South Korea", "China", "Japan", "Thailand"], "correct": 3, "fun_fact": "Minnie (Nicha Yontararak) is from Thailand. She moved to South Korea to pursue her K-pop career and has also released Thai-language solo music.", "source": "https://en.wikipedia.org/wiki/Minnie_(singer)"},
    {"question": "Which (G)I-DLE mini-album features the tracks HWAA and Dumdi Dumdi?", "options": ["I Burn", "I Trust", "I Never Die", "I Feel"], "correct": 0, "fun_fact": "I Burn was released in January 2021 and features HWAA as the title track. Dumdi Dumdi was from their 2020 EP I Depend On You. The album I Burn became (G)I-DLE''s best-selling release at the time.", "source": "https://en.wikipedia.org/wiki/I_Burn_(EP)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia (G)I-dle, Wikipedia Soyeon, Wikipedia Yuqi, Wikipedia I Never Die, Wikipedia Shuhua, Wikipedia The Baddest (K/DA song), Wikipedia Minnie (singer), Wikipedia I Burn (EP)'
);

-- 20. IVE Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'IVE: I AM Quiz',
  'DIVE into your IVE knowledge! How much do you know about Starship''s global girl group?',
  10,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did IVE debut?", "options": ["2020", "2021", "2022", "2023"], "correct": 1, "fun_fact": "IVE debuted on December 1, 2021 under Starship Entertainment with the single ELEVEN. The group quickly became one of the most successful 4th gen girl groups.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "How many members does IVE have?", "options": ["5", "6", "7", "8"], "correct": 1, "fun_fact": "IVE has 6 members: Yujin, Gaeul, Rei, Wonyoung, Liz, and Leeseo. Wonyoung and Yujin are former members of Iz*One.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "Wonyoung and Yujin both previously appeared on which competition show?", "options": ["Produce X 101", "Sixteen", "Produce 48", "I-LAND"], "correct": 2, "fun_fact": "Both Wonyoung and Yujin were members of Iz*One, a group formed through Produce 48 (a Korean-Japanese crossover survival show) in 2018.", "source": "https://en.wikipedia.org/wiki/Iz*One"},
    {"question": "IVE''s debut song ELEVEN achieved what notable feat?", "options": ["Topped the US Billboard Hot 100", "Won all major K-pop end-of-year awards (triple crown)", "First girl group debut to sell 1 million copies", "Debuted at number 1 on the Melon chart immediately"], "correct": 3, "fun_fact": "ELEVEN debuted at #1 on the Melon real-time chart, an extremely rare achievement for a rookie group. It became one of the best-selling debut singles in K-pop history.", "source": "https://en.wikipedia.org/wiki/Eleven_(IVE_song)"},
    {"question": "Rei is from which country?", "options": ["South Korea", "China", "Japan", "Thailand"], "correct": 2, "fun_fact": "Rei (Naoi Rei) is from Shizuoka, Japan. She is one of IVE''s main vocalists and is known for her elegant stage presence.", "source": "https://en.wikipedia.org/wiki/Rei_(singer)"},
    {"question": "IVE''s ''LOVE DIVE'' was the first song to do what on the Circle Digital Chart (Gaon)?", "options": ["Reach 100 million streams in one week", "Have its album and digital single chart #1 simultaneously", "Stay at #1 for 20 consecutive weeks", "Achieve a perfect all-kill across all Korean charts"], "correct": 3, "fun_fact": "LOVE DIVE achieved a Perfect All-Kill on Korean music charts, meaning it simultaneously topped all major Korean streaming and digital charts. It was a massive hit in Spring 2022.", "source": "https://en.wikipedia.org/wiki/Love_Dive"},
    {"question": "What is IVE''s fandom name?", "options": ["DIVE", "WAVE", "ELEVEN", "IVE-R"], "correct": 0, "fun_fact": "IVE''s official fandom name is DIVE. The name represents fans who dive into IVE''s world together with the group.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "IVE was named Artist of the Year at the 2022 Melon Music Awards. How long had they been active at that point?", "options": ["Less than 6 months", "About 1 year", "About 1.5 years", "About 2 years"], "correct": 1, "fun_fact": "IVE won Artist of the Year (Daesang) at the 2022 Melon Music Awards, just about 1 year after their debut. This made them one of the fastest groups to win a Daesang.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "Which IVE member is the youngest?", "options": ["Gaeul", "Rei", "Liz", "Leeseo"], "correct": 3, "fun_fact": "Leeseo (Lee Seo) was born on February 21, 2007, making her the youngest member of IVE. She debuted at just 14 years old.", "source": "https://en.wikipedia.org/wiki/Leeseo"},
    {"question": "Which IVE song had a music video inspired by Audrey Hepburn and classic Hollywood?", "options": ["ELEVEN", "LOVE DIVE", "After LIKE", "I AM"], "correct": 2, "fun_fact": "After LIKE (2022) features a music video with Audrey Hepburn-inspired styling and samples the melody from Gloria Gaynor''s I Will Survive. It became a huge summer hit.", "source": "https://en.wikipedia.org/wiki/After_Like"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Ive (group), Wikipedia Iz*One, Wikipedia Eleven (IVE song), Wikipedia Rei (singer), Wikipedia Love Dive, Wikipedia Leeseo, Wikipedia After Like'
);

-- 21. LE SSERAFIM Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'LE SSERAFIM: FEARLESS Quiz',
  'FEARNOT, put your LE SSERAFIM knowledge to the test!',
  11,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did LE SSERAFIM debut?", "options": ["2021", "2022", "2023", "2020"], "correct": 1, "fun_fact": "LE SSERAFIM debuted on May 2, 2022 under Source Music (a HYBE subsidiary) with the mini-album FEARLESS.", "source": "https://en.wikipedia.org/wiki/Le_Sserafim"},
    {"question": "What does the name LE SSERAFIM stand for?", "options": ["Light Energy Source Embracing Radiance And Fantasy In Music", "I AM FEARLESS (anagram)", "Leading Every Soul Seeking Real Adventure Forging Incredible Moments", "Nothing -- it is purely a coined name"], "correct": 1, "fun_fact": "LE SSERAFIM is an anagram of ''I AM FEARLESS,'' reflecting the group''s bold and confident concept. The name was revealed shortly before their debut.", "source": "https://en.wikipedia.org/wiki/Le_Sserafim"},
    {"question": "Which member departed from LE SSERAFIM shortly after the group''s debut in 2022?", "options": ["Yunjin", "Eunchae", "Chaewon", "Kim Garam"], "correct": 3, "fun_fact": "Kim Garam left LE SSERAFIM in July 2022, about 2 months after their debut, due to ongoing controversy. The group continued with 5 remaining members.", "source": "https://en.wikipedia.org/wiki/Le_Sserafim"},
    {"question": "Sakura and Chaewon were both previously in which K-pop project group?", "options": ["TWICE", "WJSN", "IZ*ONE", "fromis_9"], "correct": 2, "fun_fact": "Both Sakura (Miyawaki Sakura) and Chaewon (Kim Chae-won) were members of IZ*ONE, the Korean-Japanese group formed through Produce 48 that was active from 2018 to 2021.", "source": "https://en.wikipedia.org/wiki/Iz*One"},
    {"question": "Sakura is from which country?", "options": ["South Korea", "Japan", "China", "Taiwan"], "correct": 1, "fun_fact": "Sakura (Miyawaki Sakura) is from Kagoshima, Japan. She was previously a member of the Japanese idol group HKT48/AKB48 before joining IZ*ONE and then LE SSERAFIM.", "source": "https://en.wikipedia.org/wiki/Sakura_Miyawaki"},
    {"question": "Yunjin is from which country, making her a rare Korean-American idol?", "options": ["South Korea (born)", "United States", "Canada", "United Kingdom"], "correct": 1, "fun_fact": "Yunjin (Huh Yun-jin) is a Korean-American from New York City. She auditioned for Source Music in the US and is known for her powerful vocals and English-language songwriting.", "source": "https://en.wikipedia.org/wiki/Yunjin"},
    {"question": "LE SSERAFIM performed at which major festival in 2023, building on a K-pop festival presence?", "options": ["Glastonbury", "Coachella", "Lollapalooza", "Rolling Loud"], "correct": 1, "fun_fact": "LE SSERAFIM performed at Coachella 2023 as part of the festival''s first Coachella Korea stage, further cementing their global profile.", "source": "https://en.wikipedia.org/wiki/Le_Sserafim"},
    {"question": "Which LE SSERAFIM song became their breakout international hit in 2023?", "options": ["FEARLESS", "ANTIFRAGILE", "UNFORGIVEN", "Easy"], "correct": 3, "fun_fact": "Easy, released in February 2024, became LE SSERAFIM''s most internationally successful song to date, gaining massive traction on streaming platforms globally.", "source": "https://en.wikipedia.org/wiki/Easy_(Le_Sserafim_song)"},
    {"question": "Eunchae is the youngest member of LE SSERAFIM. She was born in which year?", "options": ["2004", "2005", "2006", "2007"], "correct": 2, "fun_fact": "Eunchae (Hong Eun-chae) was born on November 10, 2006, making her the youngest member of LE SSERAFIM. She joined after the initial lineup was reduced to 5.", "source": "https://en.wikipedia.org/wiki/Eunchae"},
    {"question": "LE SSERAFIM''s ANTIFRAGILE (2022) peaked at what position on the Billboard Hot 100?", "options": ["#7", "#22", "#57", "#100"], "correct": 2, "fun_fact": "ANTIFRAGILE peaked at #57 on the Billboard Hot 100, making it one of the highest-charting K-pop girl group songs on the chart at the time of release.", "source": "https://en.wikipedia.org/wiki/Antifragile_(Le_Sserafim_song)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Le Sserafim, Wikipedia Iz*One, Wikipedia Sakura Miyawaki, Wikipedia Yunjin, Wikipedia Easy (Le Sserafim song), Wikipedia Eunchae, Wikipedia Antifragile (Le Sserafim song)'
);

-- 22. NCT 127 Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'NCT 127: Limitless Quiz',
  'NCTzen, test your knowledge of the Neo Culture Technology unit based in Seoul!',
  12,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "NCT 127 is one unit of the larger group NCT. What does ''127'' refer to?", "options": ["The number of members auditioned", "The longitude of Seoul (127 degrees East)", "The year SM Entertainment was founded (1991+27+9)", "The street address of their debut venue"], "correct": 1, "fun_fact": "127 refers to the longitude of Seoul (127 degrees East), as NCT 127 is the Seoul-based sub-unit of NCT. It reflects the group''s connection to Seoul as their home base.", "source": "https://en.wikipedia.org/wiki/NCT_127"},
    {"question": "In what year did NCT 127 debut?", "options": ["2015", "2016", "2017", "2018"], "correct": 1, "fun_fact": "NCT 127 debuted on July 7, 2016 under SM Entertainment, with the EP NCT #127. They are the second sub-unit of NCT to debut.", "source": "https://en.wikipedia.org/wiki/NCT_127"},
    {"question": "Which NCT 127 member became a fashion icon known for his striking visuals and modeling career?", "options": ["Taeyong", "Jaehyun", "Johnny", "Doyoung"], "correct": 1, "fun_fact": "Jaehyun (Jung Jae-hyun) is a brand ambassador for Calvin Klein and other luxury fashion brands, known for his classic Hollywood looks and modeling career alongside his music career.", "source": "https://en.wikipedia.org/wiki/Jaehyun"},
    {"question": "Which NCT 127 song features a ''superhuman'' concept with powerful choreography?", "options": ["Cherry Bomb", "Regular", "Superhuman", "Kick It"], "correct": 2, "fun_fact": "Superhuman was released in 2019 and was NCT 127''s US debut single, supported by a North American tour. The song showcases their powerful performance style.", "source": "https://en.wikipedia.org/wiki/Superhuman_(NCT_127_song)"},
    {"question": "Johnny is from which US city?", "options": ["New York", "Chicago", "Los Angeles", "Houston"], "correct": 1, "fun_fact": "Johnny (John Suh) was born in Chicago, Illinois. He is Korean-American and became one of NCT 127''s main English-speaking members for international promotions.", "source": "https://en.wikipedia.org/wiki/Johnny_(singer)"},
    {"question": "NCT 127''s album Sticker (2021) debuted at what position on the Billboard 200?", "options": ["#3", "#5", "#7", "#10"], "correct": 0, "fun_fact": "Sticker debuted at #3 on the Billboard 200 in September 2021, making it NCT 127''s highest-charting album on the chart at the time.", "source": "https://en.wikipedia.org/wiki/Sticker_(album)"},
    {"question": "Which NCT 127 member is the leader and main rapper known for intense stage presence?", "options": ["Taeil", "Doyoung", "Taeyong", "Yuta"], "correct": 2, "fun_fact": "Taeyong (Lee Tae-yong) is the leader of NCT 127 and known as one of K-pop''s most dynamic performers. He is also involved in producing and writing some of NCT''s music.", "source": "https://en.wikipedia.org/wiki/Taeyong"},
    {"question": "Yuta is from which country?", "options": ["China", "Japan", "Thailand", "Vietnam"], "correct": 1, "fun_fact": "Yuta (Nakamoto Yuta) is from Osaka, Japan. He is NCT 127''s Japanese member and has a significant fanbase in Japan.", "source": "https://en.wikipedia.org/wiki/Yuta_(singer)"},
    {"question": "Which NCT 127 song from 2020 features a Bruce Lee-inspired concept and martial arts references?", "options": ["Regular", "Punch", "Kick It", "Highway to Heaven"], "correct": 2, "fun_fact": "Kick It (2020) was explicitly inspired by Bruce Lee, with the MV featuring numerous martial arts references. The song''s hook references the iconic film Enter the Dragon.", "source": "https://en.wikipedia.org/wiki/Kick_It_(NCT_127_song)"},
    {"question": "Winwin departed from NCT 127 to focus on which other NCT unit?", "options": ["NCT Dream", "NCT U", "WayV", "SuperM"], "correct": 2, "fun_fact": "Winwin (Dong Sicheng) transitioned to focus on WayV, the Chinese-language unit of NCT based in China. He remains an NCT member overall but stopped participating in NCT 127 activities.", "source": "https://en.wikipedia.org/wiki/WayV"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia NCT 127, Wikipedia Jaehyun, Wikipedia Superhuman (NCT 127 song), Wikipedia Johnny (singer), Wikipedia Sticker (album), Wikipedia Taeyong, Wikipedia Yuta (singer), Wikipedia Kick It (NCT 127 song), Wikipedia WayV'
);

-- 23. Red Velvet Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'Red Velvet: Psycho Quiz',
  'ReVeluv, it''s time to prove your dedication! Test your Red Velvet knowledge.',
  13,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did Red Velvet debut?", "options": ["2012", "2013", "2014", "2015"], "correct": 2, "fun_fact": "Red Velvet debuted on August 1, 2014 under SM Entertainment with the single Happiness. They were initially a 4-member group before Yeri joined in 2015.", "source": "https://en.wikipedia.org/wiki/Red_Velvet"},
    {"question": "Red Velvet''s concept is defined by two sides: the ''Red'' side and the ''Velvet'' side. What do these represent?", "options": ["Their two debut generations", "Bright/energetic pop (Red) vs. dark/sensual R&B (Velvet)", "Hot concepts vs. cool concepts", "Korean songs (Red) vs. English songs (Velvet)"], "correct": 1, "fun_fact": "Red represents a bright, bold, and energetic pop style while Velvet represents a sophisticated, sensual, and R&B-influenced sound. This duality makes them unique in K-pop.", "source": "https://en.wikipedia.org/wiki/Red_Velvet"},
    {"question": "Which member joined Red Velvet as a 5th member in 2015?", "options": ["Irene", "Joy", "Wendy", "Yeri"], "correct": 3, "fun_fact": "Yeri (Kim Ye-rim) joined Red Velvet on March 17, 2015, expanding the group from 4 to 5 members. She joined during the group''s promotions for Ice Cream Cake.", "source": "https://en.wikipedia.org/wiki/Yeri"},
    {"question": "Wendy suffered a serious accident in 2019 at a music show rehearsal. Which show was it?", "options": ["Inkigayo", "Music Bank", "SBS Gayo Daejeon", "MAMA"], "correct": 2, "fun_fact": "Wendy fell from a stage during the SBS Gayo Daejeon rehearsal on December 25, 2019, suffering fractures and injuries. She was on hiatus for over a year during her recovery.", "source": "https://en.wikipedia.org/wiki/Wendy_(singer)"},
    {"question": "Which Red Velvet song became one of their biggest hits and features an intense, addictive melody about a complex relationship?", "options": ["Bad Boy", "Red Flavor", "Psycho", "Power Up"], "correct": 2, "fun_fact": "Psycho (2019) is often considered Red Velvet''s greatest hit, praised for its sophisticated production and perfectly capturing the Velvet side of their concept. It won Song of the Year at multiple awards.", "source": "https://en.wikipedia.org/wiki/Psycho_(Red_Velvet_song)"},
    {"question": "Irene is the leader and oldest member of Red Velvet. What is her real name?", "options": ["Bae Joo-hyun", "Park Soo-young", "Son Seung-wan", "Kim Yerim"], "correct": 0, "fun_fact": "Irene''s real name is Bae Joo-hyun. She was born on March 29, 1991, making her the oldest member of Red Velvet.", "source": "https://en.wikipedia.org/wiki/Irene_(singer)"},
    {"question": "Red Velvet performed in North Korea in 2018 as part of which cultural exchange event?", "options": ["Korean Cultural Festival", "Spring is Coming concert", "Joint Olympic Cultural Program", "Korea-North Korea Summit Concert"], "correct": 1, "fun_fact": "Red Velvet performed at the Spring is Coming concert in Pyongyang, North Korea, in April 2018. It was one of the most historic K-pop performances ever, and Kim Jong-un reportedly attended.", "source": "https://en.wikipedia.org/wiki/Red_Velvet"},
    {"question": "Joy starred in which popular Korean drama in 2021?", "options": ["Nevertheless", "My Roommate Is a Gumiho", "Hometown Cha-Cha-Cha", "Doom at Your Service"], "correct": 1, "fun_fact": "Joy starred in the drama My Roommate Is a Gumiho (2021) alongside Lee Hyun-woo on tvN. She received positive reviews for her acting in the role.", "source": "https://en.wikipedia.org/wiki/Joy_(singer)"},
    {"question": "Red Velvet''s group name reflects their two-sided concept. What does each part refer to?", "options": ["Two eras of their music", "Two genres: pop and R&B", "Two different fan bases", "Day and night concepts"], "correct": 1, "fun_fact": "Red symbolizes pop: bright, colorful, and bold. Velvet symbolizes R&B: smooth, elegant, and sophisticated. This dual identity is the foundation of their entire artistic concept.", "source": "https://en.wikipedia.org/wiki/Red_Velvet"},
    {"question": "Which Red Velvet member is known as the main vocalist with one of the most powerful voices in K-pop?", "options": ["Irene", "Seulgi", "Wendy", "Joy"], "correct": 2, "fun_fact": "Wendy (Son Seung-wan) is widely considered one of the strongest vocalists in K-pop, known for her powerful belt and R&B-influenced delivery. She has released multiple successful solo projects.", "source": "https://en.wikipedia.org/wiki/Wendy_(singer)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Red Velvet, Wikipedia Yeri, Wikipedia Wendy (singer), Wikipedia Psycho (Red Velvet song), Wikipedia Irene (singer), Wikipedia Joy (singer)'
);

-- 24. ATEEZ Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'ATEEZ: Fireworks Quiz',
  'ATINY, how well do you know the eight pirates of ATEEZ? Set sail on this quiz!',
  14,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did ATEEZ debut?", "options": ["2017", "2018", "2019", "2020"], "correct": 1, "fun_fact": "ATEEZ debuted on October 24, 2018 under KQ Entertainment with the EP TREASURE EP.1: All to Zero.", "source": "https://en.wikipedia.org/wiki/Ateez"},
    {"question": "What does ATEEZ stand for?", "options": ["Asian Teens Embracing Every Zone", "A TEEnager Z (A to Z teens)", "ATINY TEENAZ", "Eight members themed around the letter Z"], "correct": 1, "fun_fact": "ATEEZ combines ''A TEENager'' with ''Z,'' suggesting A to Z (or teens who cover everything). Their fandom is called ATINY, combining ATEEZ and tiny.", "source": "https://en.wikipedia.org/wiki/Ateez"},
    {"question": "How many members are in ATEEZ?", "options": ["7", "8", "9", "10"], "correct": 1, "fun_fact": "ATEEZ has 8 members: Hongjoong, Seonghwa, Yunho, Yeosang, San, Mingi, Wooyoung, and Jongho. Hongjoong is the leader and main rapper.", "source": "https://en.wikipedia.org/wiki/Ateez"},
    {"question": "ATEEZ became the first K-pop group to perform at which European festival?", "options": ["Glastonbury (UK)", "Rock am Ring (Germany)", "Primavera Sound (Spain)", "Lollapalooza Berlin (Germany)"], "correct": 1, "fun_fact": "ATEEZ performed at Rock am Ring in Germany in June 2019, becoming the first K-pop act to perform at the iconic rock music festival.", "source": "https://en.wikipedia.org/wiki/Ateez"},
    {"question": "Which ATEEZ album/EP series is named after a pirate-adventure concept?", "options": ["FEVER Series", "ZERO: FEVER", "TREASURE Series", "THE WORLD EP"], "correct": 2, "fun_fact": "The TREASURE EP series (TREASURE EP.1 through TREASURE EP.FIN: All to Zero) was ATEEZ''s debut concept, centered on a pirate-adventure narrative with themes of following your dreams.", "source": "https://en.wikipedia.org/wiki/Ateez_discography"},
    {"question": "Which ATEEZ member is known for his iconic powerful high notes as the main vocalist?", "options": ["Hongjoong", "San", "Mingi", "Jongho"], "correct": 3, "fun_fact": "Jongho (Choi Jong-ho) is the main vocalist of ATEEZ and is renowned for his powerful belting ability and signature high notes. He has been nicknamed the ''Iron Jaw'' for his vocal power.", "source": "https://en.wikipedia.org/wiki/Jongho"},
    {"question": "ATEEZ leader Hongjoong is from which South Korean city?", "options": ["Seoul", "Gwangju", "Incheon", "Busan"], "correct": 0, "fun_fact": "Hongjoong (Kim Hong-joong) was born in Seoul, South Korea. He is the leader and main rapper of ATEEZ and is heavily involved in producing and writing their music.", "source": "https://en.wikipedia.org/wiki/Hongjoong"},
    {"question": "ATEEZ''s music video for which song features a stunning synchronization with a K-Drama clip that went viral?", "options": ["FIREWORKS", "WAVE", "WONDERLAND", "Inception"], "correct": 3, "fun_fact": "ATEEZ''s Inception (2020) went viral when fans edited the dance break to sync perfectly with a scene from the Korean drama Signal. It introduced many new fans to ATEEZ.", "source": "https://en.wikipedia.org/wiki/Zero:_Fever_Part_1"},
    {"question": "ATEEZ topped the Billboard 200 with which album in 2023?", "options": ["THE WORLD EP.2 : OUTLAW", "SPIN OFF: FROM THE WITNESS", "THE WORLD EP.FIN: WILL", "FEVER PART 3"], "correct": 2, "fun_fact": "THE WORLD EP.FIN: WILL debuted at #1 on the Billboard 200 in January 2024, making ATEEZ one of few K-pop groups to top the chart.", "source": "https://en.wikipedia.org/wiki/The_World_EP.Fin:_Will"},
    {"question": "ATEEZ performed on which popular US late-night show, helping to boost their US profile?", "options": ["The Tonight Show", "The Late Show with Stephen Colbert", "Jimmy Kimmel Live", "The Late Late Show with James Corden"], "correct": 0, "fun_fact": "ATEEZ performed on The Tonight Show Starring Jimmy Fallon in 2022, one of several US TV appearances that helped grow their American fanbase.", "source": "https://en.wikipedia.org/wiki/Ateez"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Ateez, Wikipedia Ateez discography, Wikipedia Jongho, Wikipedia Hongjoong, Wikipedia Zero: Fever Part 1, Wikipedia The World EP.Fin: Will'
);

-- 25. ENHYPEN Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'ENHYPEN: Drunk-Dazed Quiz',
  'ENGENE, how well do you know the boys formed through I-LAND? Take the quiz!',
  15,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "ENHYPEN was formed through which survival show?", "options": ["Produce X 101", "The Unit", "I-LAND", "Under Nineteen"], "correct": 2, "fun_fact": "ENHYPEN was formed through I-LAND, a 2020 survival show that was a joint production between HYBE and CJ ENM. Out of 23 trainees, 7 were selected.", "source": "https://en.wikipedia.org/wiki/Enhypen"},
    {"question": "In what year did ENHYPEN debut?", "options": ["2019", "2020", "2021", "2022"], "correct": 1, "fun_fact": "ENHYPEN debuted on November 30, 2020 under BELIFT LAB (a joint label between HYBE and CJ ENM) with the EP BORDER: DAY ONE.", "source": "https://en.wikipedia.org/wiki/Enhypen"},
    {"question": "How many members are in ENHYPEN?", "options": ["6", "7", "8", "9"], "correct": 1, "fun_fact": "ENHYPEN has 7 members: Jungwon, Heeseung, Jay, Jake, Sunghoon, Sunoo, and Ni-ki. Jungwon is the leader.", "source": "https://en.wikipedia.org/wiki/Enhypen"},
    {"question": "Ni-ki is from which country?", "options": ["South Korea", "China", "Japan", "Thailand"], "correct": 2, "fun_fact": "Ni-ki (Nishimura Riki) is from Okayama, Japan. He is the youngest member (maknae) of ENHYPEN and was a competitive dancer before joining I-LAND.", "source": "https://en.wikipedia.org/wiki/Ni-ki"},
    {"question": "Jake is from which country?", "options": ["Australia", "Canada", "United States", "New Zealand"], "correct": 0, "fun_fact": "Jake (Shim Jake) is from Brisbane, Australia, of Korean descent. He discovered K-pop as a child and auditioned online for Big Hit Entertainment before appearing on I-LAND.", "source": "https://en.wikipedia.org/wiki/Jake_(singer)"},
    {"question": "ENHYPEN''s vampire-themed concept is explored in which EP?", "options": ["BORDER: DAY ONE", "BORDER: CARNIVAL", "DIMENSION: DILEMMA", "DARK BLOOD"], "correct": 3, "fun_fact": "DARK BLOOD (2023) fully embraced ENHYPEN''s vampire concept, continuing their broader storyline about existence between the human and supernatural worlds.", "source": "https://en.wikipedia.org/wiki/Dark_Blood"},
    {"question": "What does the name ENHYPEN mean?", "options": ["Eight men hyphen", "Connecting people and deepening connections", "Energy Night Hyphen Youth Pop Era Neon", "Enhancing the meaning of K-pop"], "correct": 1, "fun_fact": "ENHYPEN is named after the hyphen (-) punctuation mark, which connects words. The name symbolizes connecting and discovering each other, and connecting with their fans.", "source": "https://en.wikipedia.org/wiki/Enhypen"},
    {"question": "ENHYPEN''s Jay is from which US city?", "options": ["Los Angeles", "New York", "Seattle", "Chicago"], "correct": 2, "fun_fact": "Jay (Park Jong-seong) was born in Seattle, Washington and grew up in Seattle. He is Korean-American and is known for his English fluency within the group.", "source": "https://en.wikipedia.org/wiki/Jay_(singer)"},
    {"question": "Which ENHYPEN song features a catchy hook about being lost in a hazy state and became a fan favorite?", "options": ["Given-Taken", "Drunk-Dazed", "Fever", "Polaroid Love"], "correct": 1, "fun_fact": "Drunk-Dazed (2021) is the lead track of their EP BORDER: CARNIVAL and one of ENHYPEN''s most beloved songs. Its funky, retro-horror concept was acclaimed for its creativity.", "source": "https://en.wikipedia.org/wiki/Border:_Carnival"},
    {"question": "ENHYPEN debuted under BELIFT LAB. Who are the two parent companies behind BELIFT LAB?", "options": ["HYBE and SM Entertainment", "HYBE and CJ ENM", "Big Hit Music and Pledis", "Source Music and BELIFT"], "correct": 1, "fun_fact": "BELIFT LAB is a joint venture between HYBE (formerly Big Hit Entertainment) and CJ ENM, the media company behind Mnet. The label was specifically created to manage ENHYPEN.", "source": "https://en.wikipedia.org/wiki/Belift_Lab"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Enhypen, Wikipedia Ni-ki, Wikipedia Jake (singer), Wikipedia Dark Blood, Wikipedia Jay (singer), Wikipedia Border: Carnival, Wikipedia Belift Lab'
);

-- 26. TXT Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'TXT: Can''t You See Me? Quiz',
  'MOA, test your knowledge about Tomorrow X Together -- HYBE''s second boy group!',
  16,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did TXT (Tomorrow X Together) debut?", "options": ["2018", "2019", "2020", "2021"], "correct": 1, "fun_fact": "TXT debuted on March 4, 2019 under Big Hit Music (HYBE) with the EP The Dream Chapter: STAR.", "source": "https://en.wikipedia.org/wiki/Tomorrow_X_Together"},
    {"question": "How many members are in TXT?", "options": ["4", "5", "6", "7"], "correct": 1, "fun_fact": "TXT has 5 members: Yeonjun, Soobin, Beomgyu, Taehyun, and Huening Kai. Soobin is the leader.", "source": "https://en.wikipedia.org/wiki/Tomorrow_X_Together"},
    {"question": "Huening Kai is of mixed descent. His father is American and his mother is what nationality?", "options": ["Japanese", "Chinese", "Korean", "German"], "correct": 2, "fun_fact": "Huening Kai (Kai Kamal Huening) is German-Korean-American. His father is of German-American descent and his mother is Korean. He was born in Honolulu, Hawaii.", "source": "https://en.wikipedia.org/wiki/Huening_Kai"},
    {"question": "TXT''s The Dream Chapter series explores which theme?", "options": ["Time travel through K-pop history", "Growing pains and coming-of-age experiences", "Virtual reality and AI romance", "Mythology and superpowers"], "correct": 1, "fun_fact": "TXT''s The Dream Chapter series (STAR, MAGIC, ETERNITY) and subsequent releases explore the universal experiences of youth: friendship, fear, identity, and loss of innocence.", "source": "https://en.wikipedia.org/wiki/Tomorrow_X_Together"},
    {"question": "Yeonjun was a famous trainee before debuting. He held which record at HYBE?", "options": ["Shortest training period (3 months)", "First ever HYBE trainee", "Most viewed trainee teaser video", "Only trainee accepted directly into HYBE without audition"], "correct": 2, "fun_fact": "Yeonjun''s trainee teaser video broke records for the most views before a K-pop debut at the time. He was highly anticipated and is considered one of the best all-round performers of his generation.", "source": "https://en.wikipedia.org/wiki/Yeonjun"},
    {"question": "Which TXT song became an international hit with its heavy rock and pop-punk influences?", "options": ["Blue Hour", "0X1=LOVESONG (I Know I Love You)", "Sugar Rush Ride", "LO$ER=LO♡ER"], "correct": 1, "fun_fact": "0X1=LOVESONG features alternative rock elements and was a collaboration with British rock band Bring Me the Horizon. It introduced TXT to a broader rock music audience.", "source": "https://en.wikipedia.org/wiki/0X1%3DLOVESONG_(I_Know_I_Love_You)"},
    {"question": "TXT''s fandom name MOA stands for what?", "options": ["Moments of Affection", "Moments of Alwaysness", "Ministry of Arts", "Members of Affection"], "correct": 1, "fun_fact": "MOA stands for ''Moments of Alwaysness'' -- when MOA and TXT are together, they become TXT (Tomorrow X Together). The name reflects the bond between the group and their fans.", "source": "https://en.wikipedia.org/wiki/Tomorrow_X_Together"},
    {"question": "Which TXT member is known as the main dancer and ''performance king'' of the group?", "options": ["Taehyun", "Soobin", "Beomgyu", "Yeonjun"], "correct": 3, "fun_fact": "Yeonjun is widely considered TXT''s strongest performer and one of the best dancers in the 4th generation K-pop. He ranked as a top trainee globally before his debut.", "source": "https://en.wikipedia.org/wiki/Yeonjun"},
    {"question": "TXT collaborated with which iconic rock band on the song 0X1=LOVESONG?", "options": ["Paramore", "Bring Me the Horizon", "Fall Out Boy", "Panic! at the Disco"], "correct": 1, "fun_fact": "0X1=LOVESONG (I Know I Love You) features British metalcore band Bring Me the Horizon. The collaboration was praised for blending K-pop with heavy rock elements.", "source": "https://en.wikipedia.org/wiki/The_Chaos_Chapter:_FREEZE"},
    {"question": "TXT''s miniseries concept is centered on what connecting narrative?", "options": ["The Chaos Chapter -- a story of chaos, temptation, and choices", "The Dream Chapter -- a coming-of-age story with magical elements", "Both A and B -- as one continuous story", "A separate narrative called The Youth Chapter"], "correct": 2, "fun_fact": "TXT''s discography forms a continuous narrative: The Dream Chapter covers youth and innocence, The Chaos Chapter explores temptation and loss, forming an interconnected story about growing up.", "source": "https://en.wikipedia.org/wiki/Tomorrow_X_Together"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Tomorrow X Together, Wikipedia Huening Kai, Wikipedia Yeonjun, Wikipedia 0X1=LOVESONG (I Know I Love You), Wikipedia The Chaos Chapter: FREEZE'
);

-- 27. ITZY Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'ITZY: DALLA DALLA Quiz',
  'MIDZY, show what you know about JYP''s self-confident girl group!',
  17,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did ITZY debut?", "options": ["2018", "2019", "2020", "2021"], "correct": 1, "fun_fact": "ITZY debuted on February 12, 2019 under JYP Entertainment with the single DALLA DALLA (달라달라), which became an immediate hit.", "source": "https://en.wikipedia.org/wiki/Itzy"},
    {"question": "How many members are in ITZY?", "options": ["4", "5", "6", "7"], "correct": 1, "fun_fact": "ITZY has 5 members: Yeji, Lia, Ryujin, Chaeryeon, and Yuna. Yeji is the leader.", "source": "https://en.wikipedia.org/wiki/Itzy"},
    {"question": "What is the main message of ITZY''s music and concept?", "options": ["Love and heartbreak", "Self-confidence, individuality, and loving yourself", "Futuristic technology and space travel", "Friendship and loyalty"], "correct": 1, "fun_fact": "ITZY''s concept centers on loving oneself, being confident in your individuality, and not conforming to others'' standards. Their debut song DALLA DALLA means ''different'' in Korean slang.", "source": "https://en.wikipedia.org/wiki/Itzy"},
    {"question": "Yuna is the youngest member of ITZY and is known for her modeling career. She was born in which year?", "options": ["2002", "2003", "2004", "2005"], "correct": 2, "fun_fact": "Yuna (Shin Yu-na) was born on December 9, 2003. She is ITZY''s maknae (youngest member) and is also a successful model and brand ambassador.", "source": "https://en.wikipedia.org/wiki/Yuna_(singer)"},
    {"question": "Which ITZY song became their first to chart on the Billboard Hot 100?", "options": ["LOCO", "WANNABE", "Not Shy", "Checkmate"], "correct": 1, "fun_fact": "WANNABE charted on the Billboard Hot 100 in 2020, becoming ITZY''s first song to appear on the chart. It was praised for its powerful message about self-acceptance.", "source": "https://en.wikipedia.org/wiki/Wannabe_(Itzy_song)"},
    {"question": "Ryujin appeared on a JYPE survival show before ITZY''s debut. Which show was it?", "options": ["Produce 101 Season 2", "Mix Nine", "SIXTEEN", "Stray Kids (2017 show)"], "correct": 1, "fun_fact": "Ryujin (Shin Ryu-jin) appeared on YG Entertainment''s survival show Mix Nine in 2017-2018 before joining JYP. Despite not debuting through that show, she was scouted and became a JYPE trainee.", "source": "https://en.wikipedia.org/wiki/Ryujin"},
    {"question": "Chaeryeon''s older sister is also a K-pop idol. Who is she?", "options": ["Momo of TWICE", "Chaeyeon of IZ*ONE/DIA", "Lisa of BLACKPINK", "Solar of MAMAMOO"], "correct": 1, "fun_fact": "Chaeryeon''s older sister is Lee Chae-yeon (Chaeyeon), a former member of IZ*ONE and current member of DIA. Both sisters competed on different survival shows.", "source": "https://en.wikipedia.org/wiki/Chaeryeon"},
    {"question": "Lia is from which country?", "options": ["South Korea", "United States", "Canada", "Australia"], "correct": 2, "fun_fact": "Lia (Choi Ji-su) was born in Seoul but grew up in Vancouver, Canada, where she attended school before returning to Korea to audition for JYP Entertainment.", "source": "https://en.wikipedia.org/wiki/Lia_(singer)"},
    {"question": "ITZY''s lightstick is called what?", "options": ["Midzy Bong", "ITZY Spark", "Blink Bong", "Checkmate Bong"], "correct": 0, "fun_fact": "ITZY''s lightstick is called the Midzy Bong, named after their fandom Midzy. The fandom name MIDZY comes from combining ITZY and''midzy'' (미지 meaning unknown/mysterious).", "source": "https://en.wikipedia.org/wiki/Itzy"},
    {"question": "Which ITZY song features them in a school setting with a catchy hook and debuted with a record-breaking music video?", "options": ["DALLA DALLA", "LOCO", "ICY", "Mafia In the Morning"], "correct": 0, "fun_fact": "DALLA DALLA set records for the most viewed K-pop girl group debut music video in 24 hours at the time of release in February 2019, with around 17 million views.", "source": "https://en.wikipedia.org/wiki/Dalla_Dalla"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Itzy, Wikipedia Yuna (singer), Wikipedia Wannabe (Itzy song), Wikipedia Ryujin, Wikipedia Chaeryeon, Wikipedia Lia (singer), Wikipedia Dalla Dalla'
);

-- 28. MAMAMOO Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'MAMAMOO: Hip Quiz',
  'Moomoo, prove you know the retro queen divas of K-pop! Take the MAMAMOO quiz.',
  22,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did MAMAMOO debut?", "options": ["2013", "2014", "2015", "2016"], "correct": 1, "fun_fact": "MAMAMOO debuted on June 18, 2014 under Rainbow Bridge World (now RBW Entertainment) with the single Mr. Ambiguous.", "source": "https://en.wikipedia.org/wiki/Mamamoo"},
    {"question": "How many members are in MAMAMOO?", "options": ["3", "4", "5", "6"], "correct": 1, "fun_fact": "MAMAMOO has 4 members: Solar, Moonbyul, Wheein, and Hwasa. The group is known for their powerful vocals and self-confident image.", "source": "https://en.wikipedia.org/wiki/Mamamoo"},
    {"question": "MAMAMOO is known for their retro, vintage concept. Which of these genres best describes their main musical style?", "options": ["Pure bubblegum pop", "Retro pop, R&B, and jazz fusion", "Hard EDM and electronic pop", "Traditional Korean music-infused pop"], "correct": 1, "fun_fact": "MAMAMOO incorporates retro pop, R&B, jazz, and funk into their music, creating a signature sound that stands apart from mainstream K-pop. They are often praised for their ''analog'' feel.", "source": "https://en.wikipedia.org/wiki/Mamamoo"},
    {"question": "Which MAMAMOO member is the main rapper and is known for having a tomboy image?", "options": ["Solar", "Wheein", "Hwasa", "Moonbyul"], "correct": 3, "fun_fact": "Moonbyul (Moon Byul-yi) is MAMAMOO''s main rapper and is celebrated for her charismatic stage presence and gender-fluid styling. She is one of K-pop''s most prominent female rappers.", "source": "https://en.wikipedia.org/wiki/Moonbyul"},
    {"question": "Hwasa''s solo song ''Maria'' (2020) reflects which aspect of her artistry?", "options": ["Her birth name Maria", "Her bold, unapologetic confidence -- ''Maria'' is her inner self", "A love song dedicated to a fan named Maria", "Her concept as a religious figure"], "correct": 1, "fun_fact": "Hwasa released Maria as an ode to self-love and confidence. The name refers to the bold, fearless version of herself she has named Maria, reclaiming her identity on her own terms.", "source": "https://en.wikipedia.org/wiki/Hwasa"},
    {"question": "Which MAMAMOO single is often considered their breakthrough hit and features retro soul influences?", "options": ["Piano Man", "HIP", "Um Oh Ah Yeah", "gogobebe"], "correct": 2, "fun_fact": "Um Oh Ah Yeah (2015) was MAMAMOO''s breakthrough hit that established their signature retro R&B sound. It was a major success on Korean music charts.", "source": "https://en.wikipedia.org/wiki/Hello_(Mamamoo_EP)"},
    {"question": "Solar is MAMAMOO''s leader. She is also known for her popular YouTube channel. What kind of content does she post?", "options": ["Cooking videos", "Daily vlogs and variety content (SOLARSIDO)", "Cover songs only", "Fashion and beauty tutorials"], "correct": 1, "fun_fact": "Solar runs the popular YouTube channel SOLARSIDO where she posts vlogs, challenges, and variety content. It has millions of subscribers and is one of the most successful idol YouTube channels.", "source": "https://en.wikipedia.org/wiki/Solar_(singer)"},
    {"question": "MAMAMOO''s HIP (2019) features lyrics about what theme?", "options": ["Revenge on an ex-lover", "Confidence and self-assurance in their own identity", "Political commentary on Korean society", "The meaning of true friendship"], "correct": 1, "fun_fact": "HIP''s lyrics celebrate self-confidence and individuality. The music video features MAMAMOO in bold, colorful outfits representing their unfiltered personas.", "source": "https://en.wikipedia.org/wiki/Reality_in_Black"},
    {"question": "Wheein is known for her talents beyond singing. What other artistic skill is she celebrated for?", "options": ["Film acting", "Painting and visual art", "Classical piano", "Creative writing"], "correct": 1, "fun_fact": "Wheein (Jung Wheein) is a talented visual artist who has shared her paintings and drawings with fans. She studied at the School of Performing Arts Seoul and often incorporates art into her personal branding.", "source": "https://en.wikipedia.org/wiki/Wheein"},
    {"question": "What is MAMAMOO''s fandom name?", "options": ["MOOBONG", "MOOMOO", "BLOOM", "MAMA"], "correct": 1, "fun_fact": "MAMAMOO''s fandom is called MOOMOO (무무). The name comes from combining two letters from MAMAMOO''s name: MO from MOO and MO from MAMO.", "source": "https://en.wikipedia.org/wiki/Mamamoo"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Mamamoo, Wikipedia Moonbyul, Wikipedia Hwasa, Wikipedia Hello (Mamamoo EP), Wikipedia Solar (singer), Wikipedia Reality in Black, Wikipedia Wheein'
);

-- 29. SHINee Ultimate Quiz (hard, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'SHINee: Ring Ding Dong Quiz',
  'Shawol, test your dedication with this deep-dive SHINee knowledge quiz!',
  23,
  'multiple_choice',
  'hard',
  'group_specific',
  '[
    {"question": "In what year did SHINee debut?", "options": ["2006", "2007", "2008", "2009"], "correct": 2, "fun_fact": "SHINee debuted on May 22, 2008 under SM Entertainment on the SBS Inkigayo stage with their single Replay (누난 너무 예뻐).", "source": "https://en.wikipedia.org/wiki/Shinee"},
    {"question": "How many members were in SHINee''s original lineup?", "options": ["4", "5", "6", "7"], "correct": 1, "fun_fact": "SHINee originally had 5 members: Onew, Jonghyun, Key, Minho, and Taemin. Following Jonghyun''s passing in December 2017, the group has continued as a 4-member group.", "source": "https://en.wikipedia.org/wiki/Shinee"},
    {"question": "SHINee''s genre is often described as what, a term coined for their style?", "options": ["Neo Soul", "Contemporfalry Band", "New Wave K-pop", "Electropop Idol"], "correct": 1, "fun_fact": "SM Entertainment coined the term ''Contemporary Band'' to describe SHINee, emphasizing their musical sophistication, live performance skills, and genre-blending that set them apart from typical idol groups.", "source": "https://en.wikipedia.org/wiki/Shinee"},
    {"question": "What was the name of SHINee''s debut single?", "options": ["Ring Ding Dong", "Lucifer", "Replay (Noona Is So Pretty)", "Amigo"], "correct": 2, "fun_fact": "SHINee debuted with Replay (누난 너무 예뻐 -- Noona Is So Pretty), a song about a younger man''s admiration for an older woman, which was unusual and charming for a K-pop debut.", "source": "https://en.wikipedia.org/wiki/Replay_(SHINee_song)"},
    {"question": "Jonghyun, SHINee''s main vocalist, passed away in December 2017. He was also a prolific songwriter. Which song did he write for another SM artist?", "options": ["SNSD''s Into the New World", "EXO''s Love Me Right", "f(x)''s Rum Pum Pum Pum", "Red Velvet''s Be Natural"], "correct": 2, "fun_fact": "Jonghyun wrote Rum Pum Pum Pum for f(x), demonstrating his exceptional songwriting abilities. He wrote numerous songs for SM artists and released two acclaimed solo albums before his passing.", "source": "https://en.wikipedia.org/wiki/Jonghyun_(singer)"},
    {"question": "Which SHINee member solo debuted in 2014 and has become one of K-pop''s most acclaimed solo artists?", "options": ["Onew", "Key", "Minho", "Taemin"], "correct": 3, "fun_fact": "Taemin debuted solo with Ace in 2014 and has become one of K-pop''s most celebrated solo artists, known for his dark, artistic concepts and exceptional dance ability.", "source": "https://en.wikipedia.org/wiki/Taemin"},
    {"question": "SHINee''s 2013 Japanese album was a major success. What was it called?", "options": ["Boys Meet U", "Chapter 1", "The First", "SHINee WORLD"], "correct": 0, "fun_fact": "Boys Meet U (2013) was SHINee''s third Japanese studio album and a significant commercial success in Japan, where the group has maintained a massive fanbase since 2011.", "source": "https://en.wikipedia.org/wiki/Boys_Meet_U"},
    {"question": "Which award category did SHINee often win at Korean music shows, reflecting their exceptional live performance skills?", "options": ["Best Choreography", "Best Vocal Performance", "Triple Crown (artist, song, album)", "Best Performance (Bonsang)"], "correct": 2, "fun_fact": "SHINee regularly won Triple Crowns (simultaneous #1 on multiple Korean music broadcast shows) and were known for their flawless live vocals and performances.", "source": "https://en.wikipedia.org/wiki/Shinee"},
    {"question": "Taemin''s solo song ''Move'' (2017) is iconic for which reason?", "options": ["First K-pop MV to use only one continuous camera shot", "Its sensual, fluid dance style that became one of K-pop''s most iconic choreographies", "First male idol song to top 100 million streams on Melon", "Featuring the first all-female backup dancer crew in a K-pop MV"], "correct": 1, "fun_fact": "Move features one of K-pop''s most celebrated choreographies, known for its fluid, sensual movements and snake-like quality. The performance cemented Taemin''s status as one of K-pop''s greatest dancers.", "source": "https://en.wikipedia.org/wiki/Move_(Taemin_song)"},
    {"question": "What is the name of SHINee''s fandom?", "options": ["Starlight", "Shawol", "SHINee World", "Pearl Aqua"], "correct": 1, "fun_fact": "SHINee''s fandom is called Shawol, combining SHINee + World. Their official fandom color is Pearl Aqua, and they are known for their passionate and loyal fanbase.", "source": "https://en.wikipedia.org/wiki/Shinee"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Shinee, Wikipedia Replay (SHINee song), Wikipedia Jonghyun (singer), Wikipedia Taemin, Wikipedia Boys Meet U, Wikipedia Move (Taemin song)'
);
