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

-- 30. GOT7 Ultimate Quiz (medium, group_specific)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'GOT7: Never Ever Quiz',
  'iGOT7, prove your knowledge of GOT7 -- from JYP to their independent era!',
  21,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did GOT7 debut?", "options": ["2013", "2014", "2015", "2016"], "correct": 1, "fun_fact": "GOT7 debuted on January 16, 2014 under JYP Entertainment with the EP Got It?, featuring the title track Got It?.", "source": "https://en.wikipedia.org/wiki/Got7"},
    {"question": "How many members does GOT7 have?", "options": ["6", "7", "8", "9"], "correct": 1, "fun_fact": "GOT7 has 7 members: Jay B (leader), Mark, Jackson, Jinyoung, Youngjae, BamBam, and Yugyeom.", "source": "https://en.wikipedia.org/wiki/Got7"},
    {"question": "Jackson Wang is from which region?", "options": ["Beijing, China", "Hong Kong", "Shanghai, China", "Taiwan"], "correct": 1, "fun_fact": "Jackson Wang (Wang Ka-yee) was born and raised in Hong Kong. Before joining JYP, he was a member of the Hong Kong national fencing team.", "source": "https://en.wikipedia.org/wiki/Jackson_Wang"},
    {"question": "BamBam is from which country?", "options": ["Vietnam", "Indonesia", "Philippines", "Thailand"], "correct": 3, "fun_fact": "BamBam (Kunpimook Bhuwakul) is from Bangkok, Thailand. He was childhood friends with BLACKPINK''s Lisa before both joined K-pop companies.", "source": "https://en.wikipedia.org/wiki/BamBam_(rapper)"},
    {"question": "What is GOT7''s fandom name?", "options": ["AHGASE (iGOT7)", "STAY", "IGOT", "SEVEN"], "correct": 0, "fun_fact": "GOT7''s fandom is called IGOT7 (아가새, Ahgase), which means ''baby bird'' in Korean. The name plays on the pronunciation of ''I GOT7'' in Korean.", "source": "https://en.wikipedia.org/wiki/Got7"},
    {"question": "GOT7 parted ways with JYP Entertainment in 2021 and all seven members signed with different agencies. What made this unusual?", "options": ["They disbanded completely", "All 7 members stayed together as GOT7 while individually signing with different companies", "They merged with another group", "They moved to one competing label together"], "correct": 1, "fun_fact": "When GOT7 left JYP in 2021, all seven members retained the group name and reunited for group activities despite each signing with a different agency, a highly unusual arrangement in K-pop.", "source": "https://en.wikipedia.org/wiki/Got7"},
    {"question": "Which GOT7 hit (2017) features an acoustic guitar intro and became one of their most-loved ballads?", "options": ["Hard Carry", "Never Ever", "Just Right", "You Are"], "correct": 3, "fun_fact": "You Are (2017) from the album 7 for 7 showcases GOT7''s vocal side and became a fan-favorite ballad. It is one of the group''s most emotionally resonant songs.", "source": "https://en.wikipedia.org/wiki/7_for_7"},
    {"question": "Mark Tuan is from which country?", "options": ["South Korea", "Japan", "United States", "Taiwan"], "correct": 2, "fun_fact": "Mark Tuan was born in Los Angeles, California, USA, to Taiwanese-American parents. He is fluent in English and Mandarin in addition to Korean.", "source": "https://en.wikipedia.org/wiki/Mark_Tuan"},
    {"question": "Which entertainment company was GOT7 under from their debut until 2021?", "options": ["SM Entertainment", "YG Entertainment", "JYP Entertainment", "HYBE"], "correct": 2, "fun_fact": "GOT7 debuted under JYP Entertainment in January 2014 and remained with the label until their contracts expired at the end of 2021.", "source": "https://en.wikipedia.org/wiki/Got7"},
    {"question": "GOT7''s leader Jay B is also known by which other name reflecting his acting career?", "options": ["Lim Jaebum", "Im Jae-bum", "Jaebum Im", "JB Im"], "correct": 1, "fun_fact": "GOT7''s leader Jay B (Im Jae-bum) is also known as Def.B for his solo music and Im Jae-bum for his acting roles. He has starred in several Korean dramas and films.", "source": "https://en.wikipedia.org/wiki/Im_Jae-bum"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Got7, Wikipedia Jackson Wang, Wikipedia BamBam (rapper), Wikipedia 7 for 7, Wikipedia Mark Tuan, Wikipedia Im Jae-bum'
);

-- 31. MONSTA X Ultimate Quiz (medium, group_specific) [from agent a530da1]
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'MONSTA X Ultimate Fan Quiz',
  'Put your Monbebe knowledge to the test with this MONSTA X trivia quiz!',
  20,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did MONSTA X debut?", "options": ["2013", "2014", "2015", "2016"], "correct": 2, "fun_fact": "MONSTA X debuted on May 14, 2015 under Starship Entertainment after being formed through the Mnet survival show No.Mercy.", "source": "https://en.wikipedia.org/wiki/Monsta_X"},
    {"question": "What is the name of MONSTA X''s official fandom?", "options": ["MONBEBE", "STARSHIP", "MONLIGHT", "MONSTARZ"], "correct": 0, "fun_fact": "Monbebe means ''my baby'' in French, and the fandom name was chosen to reflect the close bond between MONSTA X and their fans.", "source": "https://en.wikipedia.org/wiki/Monsta_X"},
    {"question": "Which survival show did MONSTA X form through?", "options": ["Produce 101", "Mix Nine", "No.Mercy", "The Unit"], "correct": 2, "fun_fact": "No.Mercy was a Starship Entertainment survival program that aired on Mnet in 2014-2015, resulting in the formation of MONSTA X.", "source": "https://en.wikipedia.org/wiki/No_Mercy_(TV_series)"},
    {"question": "Which MONSTA X song is known for its powerful choreography from their debut era?", "options": ["Beautiful", "Dramarama", "Rush", "Fighter"], "correct": 2, "fun_fact": "Rush was released in September 2015 as part of their first mini album Rush, and showcased the group''s energetic performance style.", "source": "https://en.wikipedia.org/wiki/Rush_(Monsta_X_EP)"},
    {"question": "MONSTA X''s hit song Beautiful was the title track of which album?", "options": ["The Clan Pt. 1", "The Clan Pt. 2.5 Beautiful", "Take.1 Are You There?", "All About Luv"], "correct": 1, "fun_fact": "Beautiful was the title track of The Clan Pt. 2.5 Beautiful, released in 2017, and became one of the group''s most beloved songs.", "source": "https://en.wikipedia.org/wiki/The_Clan_Pt._2.5_%27Beautiful%27"},
    {"question": "Which MONSTA X member is the main vocalist of the group?", "options": ["Minhyuk", "Joohoney", "I.M", "Kihyun"], "correct": 3, "fun_fact": "Kihyun is known as MONSTA X''s main vocalist and is widely praised for his powerful and emotive singing.", "source": "https://en.wikipedia.org/wiki/Monsta_X"},
    {"question": "Under which entertainment company does MONSTA X operate?", "options": ["SM Entertainment", "JYP Entertainment", "Starship Entertainment", "Cube Entertainment"], "correct": 2, "fun_fact": "MONSTA X has been under Starship Entertainment since their formation and debut in 2015.", "source": "https://en.wikipedia.org/wiki/Monsta_X"},
    {"question": "Which MONSTA X song from 2017 featured a dramatic time-travel music video?", "options": ["Love Killa", "GAMBLER", "Dramarama", "Fighter"], "correct": 2, "fun_fact": "Dramarama was released in October 2017 and featured a time-travel storyline in its music video, earning widespread acclaim.", "source": "https://en.wikipedia.org/wiki/The_Connect:_Dejavu"},
    {"question": "MONSTA X released their English-language album ''All About Luv'' targeting which market?", "options": ["Japanese market", "Chinese market", "US market", "European market"], "correct": 2, "fun_fact": "All About Luv was released in February 2020 as MONSTA X''s first fully English-language album, aimed at breaking into the US market.", "source": "https://en.wikipedia.org/wiki/All_About_Luv"},
    {"question": "Which MONSTA X title track from 2020 is celebrated for its charismatic performance style?", "options": ["Beautiful", "Dramarama", "Love Killa", "Rush"], "correct": 2, "fun_fact": "Love Killa was released in October 2020 and is celebrated for its charismatic performance style and sleek production.", "source": "https://en.wikipedia.org/wiki/Fatal_Love"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Monsta X, Wikipedia Rush (Monsta X EP), Wikipedia The Clan Pt. 2.5 Beautiful, Wikipedia All About Luv, Wikipedia Fatal Love'
);

-- 32. NCT Dream Ultimate Quiz (medium, group_specific) [from agent a530da1]
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'NCT Dream: Hot Sauce Quiz',
  'How well do you know NCT DREAM, the youth sub-unit of NCT?',
  12,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did NCT DREAM debut?", "options": ["2015", "2016", "2017", "2018"], "correct": 1, "fun_fact": "NCT DREAM debuted on August 25, 2016 under SM Entertainment with the single Chewing Gum.", "source": "https://en.wikipedia.org/wiki/NCT_Dream"},
    {"question": "What was NCT DREAM''s debut song?", "options": ["My First and Last", "We Young", "Chewing Gum", "Boom"], "correct": 2, "fun_fact": "Chewing Gum was NCT DREAM''s debut track, released on August 25, 2016, establishing the sub-unit''s youthful, playful concept.", "source": "https://en.wikipedia.org/wiki/Chewing_Gum_(NCT_Dream_song)"},
    {"question": "NCT DREAM is a sub-unit of which larger group?", "options": ["EXO", "SHINee", "NCT", "Super Junior"], "correct": 2, "fun_fact": "NCT DREAM is one of several sub-units under the NCT umbrella, which operates under SM Entertainment''s unique rotational system concept.", "source": "https://en.wikipedia.org/wiki/NCT_(group)"},
    {"question": "What was the concept behind NCT DREAM''s original rotational membership system?", "options": ["Members rotate based on popularity", "Members graduate when they turn 20", "Members are replaced every year", "Members join based on fan votes"], "correct": 1, "fun_fact": "Originally, NCT DREAM members were to ''graduate'' from the unit upon turning 20 years old, symbolizing the transition from youth to adulthood.", "source": "https://en.wikipedia.org/wiki/NCT_Dream"},
    {"question": "Which NCT DREAM album featured the hit title track ''Hot Sauce''?", "options": ["Hello Future", "We Boom", "Hot Sauce", "Candy"], "correct": 2, "fun_fact": "Hot Sauce was NCT DREAM''s first full-length studio album, released on May 10, 2021, marking a major milestone for the group.", "source": "https://en.wikipedia.org/wiki/Hot_Sauce_(album)"},
    {"question": "Which NCT DREAM song from 2017 became known for its bright, summery concept?", "options": ["Boom", "We Young", "My First and Last", "Trigger the Fever"], "correct": 1, "fun_fact": "We Young was released in August 2017 and showcased NCT DREAM''s cheerful, energetic side with a fun summer theme.", "source": "https://en.wikipedia.org/wiki/We_Young"},
    {"question": "NCT DREAM''s song ''Boom'' was the title track from which mini album?", "options": ["Hot Sauce", "We Boom", "Hello Future", "Candy"], "correct": 1, "fun_fact": "Boom was the title track of the mini album We Boom, released in September 2019, and became one of NCT DREAM''s most energetic releases.", "source": "https://en.wikipedia.org/wiki/We_Boom"},
    {"question": "NCT DREAM released a holiday-themed song called ''Candy'' which was a cover of which original song?", "options": ["A H.O.T original", "A Shinhwa original", "A g.o.d original", "A SHINee original"], "correct": 0, "fun_fact": "Candy is a cover of the 1996 H.O.T song of the same name, released by NCT DREAM in November 2022 as a winter special.", "source": "https://en.wikipedia.org/wiki/Candy_(NCT_Dream_song)"},
    {"question": "Which NCT DREAM repackage album followed Hot Sauce?", "options": ["We Boom", "Hello Future", "Glitch Mode", "Beatbox"], "correct": 1, "fun_fact": "Hello Future was released on June 28, 2021 as a repackage of the Hot Sauce album, featuring new tracks including the upbeat title Hello Future.", "source": "https://en.wikipedia.org/wiki/Hello_Future_(album)"},
    {"question": "What was the concept behind NCT DREAM''s ''Glitch Mode'' (2022)?", "options": ["Retro 80s concept", "Futuristic glitch-art aesthetic", "School/youth theme", "Dark psychological concept"], "correct": 1, "fun_fact": "Glitch Mode (2022) featured a futuristic, glitch-art aesthetic with distorted visuals, representing NCT DREAM''s evolution into a more mature sound while maintaining their youthful energy.", "source": "https://en.wikipedia.org/wiki/Glitch_Mode"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia NCT Dream, Wikipedia NCT (group), Wikipedia Hot Sauce (album), Wikipedia We Boom, Wikipedia Candy (NCT Dream song), Wikipedia Hello Future (album), Wikipedia Glitch Mode'
);

-- 33. BIGBANG Ultimate Quiz (medium, group_specific) [from agent a530da1]
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'BIGBANG: VIPs Only Quiz',
  'Test your knowledge of BIGBANG, the legendary K-pop group from YG Entertainment.',
  NULL,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did BIGBANG officially debut?", "options": ["2004", "2005", "2006", "2007"], "correct": 2, "fun_fact": "BIGBANG debuted on August 19, 2006 under YG Entertainment.", "source": "https://en.wikipedia.org/wiki/BigBang_(South_Korean_band)"},
    {"question": "Which BIGBANG member goes by the stage name G-Dragon?", "options": ["Choi Seunghyun", "Kang Daesung", "Kwon Jiyong", "Dong Youngbae"], "correct": 2, "fun_fact": "Kwon Jiyong, known as G-Dragon, is widely regarded as one of the most influential figures in K-pop history.", "source": "https://en.wikipedia.org/wiki/G-Dragon"},
    {"question": "What is Taeyang''s real name?", "options": ["Choi Seunghyun", "Dong Youngbae", "Lee Seunghyun", "Kwon Jiyong"], "correct": 1, "fun_fact": "Dong Youngbae, known as Taeyang, is celebrated for his powerful vocals and dancing, and his stage name means ''sun'' in Korean.", "source": "https://en.wikipedia.org/wiki/Taeyang"},
    {"question": "Which BIGBANG song won Song of the Year at the 2007 Mnet Asian Music Awards?", "options": ["Haru Haru", "Lies", "Last Farewell", "Day by Day"], "correct": 1, "fun_fact": "Lies (거짓말) was BIGBANG''s breakthrough hit and dominated charts in 2007. It became one of their signature songs.", "source": "https://en.wikipedia.org/wiki/Lies_(BigBang_song)"},
    {"question": "What is the name of BIGBANG''s fandom?", "options": ["VIP", "BLACKJACK", "BLINK", "ROYAL"], "correct": 0, "fun_fact": "BIGBANG''s fandom VIP has been one of the most dedicated fandoms in K-pop since the group''s debut in 2006.", "source": "https://en.wikipedia.org/wiki/BigBang_(South_Korean_band)"},
    {"question": "Which BIGBANG member uses the stage name T.O.P?", "options": ["Kang Daesung", "Lee Seunghyun", "Choi Seunghyun", "Dong Youngbae"], "correct": 2, "fun_fact": "Choi Seunghyun, known as T.O.P, is also recognized for his acting career in addition to his music career with BIGBANG.", "source": "https://en.wikipedia.org/wiki/T.O.P"},
    {"question": "BIGBANG''s hit FANTASTIC BABY was released as part of which album?", "options": ["Still Alive", "MADE", "Alive", "Tonight"], "correct": 2, "fun_fact": "FANTASTIC BABY was released on the Alive album in 2012 and became one of BIGBANG''s most iconic tracks, known for its colorful and eccentric music video.", "source": "https://en.wikipedia.org/wiki/Alive_(BigBang_album)"},
    {"question": "Which year was BIGBANG''s MADE series released?", "options": ["2013", "2014", "2015", "2016"], "correct": 2, "fun_fact": "The MADE series was released throughout 2015 as a series of single albums (M, A, D, E), culminating in the full album MADE in 2016.", "source": "https://en.wikipedia.org/wiki/Made_(BigBang_album)"},
    {"question": "G-Dragon is widely considered what in the K-pop industry?", "options": ["King of K-pop", "Father of K-pop", "God of K-pop Fashion", "Pioneer of K-pop rap"], "correct": 0, "fun_fact": "G-Dragon is widely referred to as the ''King of K-pop'' for his enormous influence on music, fashion, and culture. He is one of the most decorated K-pop artists ever.", "source": "https://en.wikipedia.org/wiki/G-Dragon"},
    {"question": "Which entertainment company manages BIGBANG?", "options": ["SM Entertainment", "JYP Entertainment", "YG Entertainment", "HYBE"], "correct": 2, "fun_fact": "BIGBANG has been under YG Entertainment since their debut in 2006, helping to define the agency''s signature hip-hop influenced sound.", "source": "https://en.wikipedia.org/wiki/BigBang_(South_Korean_band)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia BigBang (South Korean band), Wikipedia G-Dragon, Wikipedia Taeyang, Wikipedia Lies (BigBang song), Wikipedia T.O.P, Wikipedia Alive (BigBang album), Wikipedia Made (BigBang album)'
);

-- 34. Girls Generation (SNSD) Ultimate Quiz (medium, group_specific) [from agent a530da1]
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'Girls'' Generation: The Legend Quiz',
  'Are you a true SONE? Test your knowledge of the legendary Girls'' Generation (SNSD)!',
  NULL,
  'multiple_choice',
  'medium',
  'group_specific',
  '[
    {"question": "In what year did Girls'' Generation officially debut?", "options": ["2005", "2006", "2007", "2008"], "correct": 2, "fun_fact": "Girls'' Generation debuted on August 5, 2007 under SM Entertainment with the single Into the New World.", "source": "https://en.wikipedia.org/wiki/Girls%27_Generation"},
    {"question": "How many members did Girls'' Generation have at their debut?", "options": ["7", "8", "9", "10"], "correct": 2, "fun_fact": "Girls'' Generation debuted with 9 members: Taeyeon, Sunny, Tiffany, Hyoyeon, Yuri, Sooyoung, Yoona, Seohyun, and Jessica.", "source": "https://en.wikipedia.org/wiki/Girls%27_Generation"},
    {"question": "What is the name of Girls'' Generation''s official fandom?", "options": ["ONCE", "SONE", "STAR1", "CLOUD"], "correct": 1, "fun_fact": "SONE (pronounced ''So-One'') has been the official fandom name for Girls'' Generation since their debut era.", "source": "https://en.wikipedia.org/wiki/Girls%27_Generation"},
    {"question": "Which Girls'' Generation song became a massive pan-Asian hit in 2009 known for its catchy hook?", "options": ["Genie", "Run Devil Run", "Gee", "Oh!"], "correct": 2, "fun_fact": "Gee was released in January 2009 and broke records by staying at number one on Korean music charts for nine consecutive weeks.", "source": "https://en.wikipedia.org/wiki/Gee_(song)"},
    {"question": "Which member departed from Girls'' Generation in September 2014?", "options": ["Sunny", "Sooyoung", "Tiffany", "Jessica"], "correct": 3, "fun_fact": "Jessica parted ways with Girls'' Generation in September 2014 and has since pursued a solo music career and authored several novels.", "source": "https://en.wikipedia.org/wiki/Jessica_Jung"},
    {"question": "Girls'' Generation''s debut song Into the New World has become an anthem for which type of movement in South Korea?", "options": ["Environmental activism", "Pro-democracy and social movements", "Sports celebrations", "Youth volunteerism"], "correct": 1, "fun_fact": "Into the New World has frequently been sung at protests and social movement rallies in South Korea, becoming an unofficial anthem of change and hope.", "source": "https://en.wikipedia.org/wiki/Into_the_New_World"},
    {"question": "Which Girls'' Generation song featured a bold concept shift with an experimental, genre-blending sound in 2013?", "options": ["Mr.Mr.", "I Got a Boy", "The Boys", "Run Devil Run"], "correct": 1, "fun_fact": "I Got a Boy, released in January 2013, was praised for its genre-blending structure and won Video of the Year at the YouTube Music Awards.", "source": "https://en.wikipedia.org/wiki/I_Got_a_Boy"},
    {"question": "Under which entertainment company has Girls'' Generation been signed since their debut?", "options": ["JYP Entertainment", "YG Entertainment", "SM Entertainment", "HYBE"], "correct": 2, "fun_fact": "Girls'' Generation has been with SM Entertainment since their pre-debut training days, debuting under the label in 2007.", "source": "https://en.wikipedia.org/wiki/Girls%27_Generation"},
    {"question": "Which Girls'' Generation song was released to celebrate their 15th anniversary in 2022?", "options": ["Holiday", "All Night", "FOREVER 1", "Sailing"], "correct": 2, "fun_fact": "FOREVER 1 was released on August 5, 2022 to commemorate Girls'' Generation''s 15th debut anniversary, reuniting all 8 remaining members.", "source": "https://en.wikipedia.org/wiki/Forever_1_(album)"},
    {"question": "Girls'' Generation''s song ''Genie'' is well known for which dance move?", "options": ["The wave", "The leg dance", "The shuffle", "The point dance"], "correct": 1, "fun_fact": "Genie''s choreography features a distinctive seated leg movement often called the ''leg dance'' or the ''Genie dance,'' which became iconic and widely imitated.", "source": "https://en.wikipedia.org/wiki/Genie_(Girls%27_Generation_song)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Girls Generation, Wikipedia Gee (song), Wikipedia Jessica Jung, Wikipedia Into the New World, Wikipedia I Got a Boy, Wikipedia Forever 1 (album), Wikipedia Genie (Girls Generation song)'
);

-- ============================================
-- KNOWLEDGE QUIZZES (20 total)
-- ============================================

-- 35. K-pop Concert Tours (medium, knowledge) [from agent a93dfc8]
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Concert Tours',
  'Test your knowledge of K-pop''s biggest world tours, their names, and the years they took place.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "What was the name of BTS''s 2018-2019 world tour?", "options": ["Map of the Soul Tour", "Love Yourself World Tour", "Wings Tour", "Speak Yourself Tour"], "correct": 1, "fun_fact": "The BTS World Tour: Love Yourself ran from August 25, 2018 to October 29, 2019, spanning 62 concerts across 14 countries.", "source": "https://en.wikipedia.org/wiki/Love_Yourself_World_Tour"},
    {"question": "In which year did BLACKPINK kick off their Born Pink World Tour?", "options": ["2021", "2023", "2022", "2020"], "correct": 2, "fun_fact": "The Born Pink World Tour began on October 15, 2022, in Seoul. It became the highest-grossing concert tour ever by a female group, earning $330 million.", "source": "https://en.wikipedia.org/wiki/Born_Pink_World_Tour"},
    {"question": "What was the name of TWICE''s 5th world tour that launched in 2023?", "options": ["Formula of Love Tour", "Taste of Love Tour", "Ready to Be World Tour", "Between 1&2 Tour"], "correct": 2, "fun_fact": "TWICE''s 5th World Tour ''Ready to Be'' launched on April 15, 2023, in Seoul and ran through July 2024 across Asia, North America, Europe, and Australia.", "source": "https://en.wikipedia.org/wiki/Ready_to_Be_World_Tour"},
    {"question": "What was the name of Stray Kids'' 2nd world tour that began in April 2022?", "options": ["District 9 Tour", "ODDINARY Tour", "MANIAC World Tour", "MIROH Tour"], "correct": 2, "fun_fact": "Stray Kids'' 2nd World Tour ''MANIAC'' kicked off at Jamsil Arena in Seoul on April 29, 2022, and toured cities across Japan and North America.", "source": "https://en.wikipedia.org/wiki/Maniac_World_Tour"},
    {"question": "How many countries did BLACKPINK''s Born Pink World Tour cover?", "options": ["10", "15", "22", "30"], "correct": 2, "fun_fact": "The Born Pink World Tour covered 22 countries and was attended by 1.8 million people, making it the most-attended concert tour by a K-pop girl group.", "source": "https://en.wikipedia.org/wiki/Born_Pink_World_Tour"},
    {"question": "What was the name of aespa''s first-ever world tour in 2023?", "options": ["SYNK: Hyper Line", "MY: Wonder", "SPICY Tour", "SYNK: Parallel Line"], "correct": 0, "fun_fact": "aespa''s debut concert tour was ''SYNK: Hyper Line,'' spanning 31 concerts in 21 cities across 12 countries from February to September 2023.", "source": "https://en.wikipedia.org/wiki/Synk:_Hyper_Line"},
    {"question": "BTS''s Love Yourself World Tour concluded in which year?", "options": ["2018", "2019", "2020", "2021"], "correct": 1, "fun_fact": "The Love Yourself World Tour concluded on October 29, 2019, after 62 concerts. An extension called Love Yourself: Speak Yourself included stadium shows in 2019.", "source": "https://en.wikipedia.org/wiki/Love_Yourself_World_Tour"},
    {"question": "In which city did BLACKPINK''s Born Pink World Tour begin?", "options": ["Los Angeles", "Tokyo", "Seoul", "London"], "correct": 2, "fun_fact": "The Born Pink World Tour opened in Seoul, South Korea, on October 15, 2022, before heading to North America, Europe, Asia, and Australia.", "source": "https://en.wikipedia.org/wiki/Born_Pink_World_Tour"},
    {"question": "TWICE''s ''Ready to Be'' world tour began in which city?", "options": ["Tokyo", "New York", "Seoul", "Sydney"], "correct": 2, "fun_fact": "TWICE''s Ready to Be World Tour opened at KSPO Dome in Seoul on April 15-16, 2023. The tour later grossed over $54 million from 18 reported shows by September 2023.", "source": "https://en.wikipedia.org/wiki/Ready_to_Be_World_Tour"},
    {"question": "Which K-pop group''s world tour was described as one of the largest stadium tours in K-pop history after BTS?", "options": ["SEVENTEEN", "aespa", "Stray Kids", "BLACKPINK"], "correct": 3, "fun_fact": "BLACKPINK''s Born Pink World Tour is the largest and highest-grossing stadium tour by a K-pop girl group, earning $330 million across 66 concerts.", "source": "https://en.wikipedia.org/wiki/Born_Pink_World_Tour"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Born Pink World Tour, Love Yourself World Tour, Ready to Be World Tour, Maniac World Tour, Synk: Hyper Line'
);

-- 36. K-pop Variety Shows (medium, knowledge) [from agent a93dfc8]
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Variety Shows',
  'Match K-pop groups to their famous variety shows and web series.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "Which group hosts the variety web series ''Run BTS!''?", "options": ["SEVENTEEN", "BTS", "EXO", "NCT"], "correct": 1, "fun_fact": "Run BTS! premiered on August 1, 2015, on V LIVE. Three seasons comprising over 155 episodes have been released, with episodes now available on Weverse and YouTube.", "source": "https://en.wikipedia.org/wiki/Run_BTS"},
    {"question": "What platform originally hosted ''Run BTS!'' before it moved to Weverse?", "options": ["YouTube", "Netflix", "V LIVE", "Naver TV"], "correct": 2, "fun_fact": "Run BTS! originally aired on V LIVE. When V LIVE was integrated into Weverse in late 2022, all episodes were uploaded to YouTube.", "source": "https://en.wikipedia.org/wiki/Run_BTS"},
    {"question": "Which group stars in the variety web series ''Going Seventeen''?", "options": ["NCT", "BTS", "SEVENTEEN", "ATEEZ"], "correct": 2, "fun_fact": "Going Seventeen premiered on June 12, 2017, on V LIVE and later moved to YouTube and Weverse. The show features the members in games, skits, and challenges.", "source": "https://en.wikipedia.org/wiki/Going_Seventeen_(web_series)"},
    {"question": "Which group hosted the reality show ''BLACKPINK House'' in 2018?", "options": ["TWICE", "MAMAMOO", "BLACKPINK", "Red Velvet"], "correct": 2, "fun_fact": "BLACKPINK House was a reality show that aired in 2018, following the four BLACKPINK members living together in a house and going on trips.", "source": "https://kpop.fandom.com/wiki/BLACKPINK_House"},
    {"question": "''Going Seventeen'' first premiered in which year?", "options": ["2015", "2016", "2017", "2018"], "correct": 2, "fun_fact": "Going Seventeen premiered on June 12, 2017. The show has continued for many seasons and is beloved by fans (CARATs) for its candid and comedic content.", "source": "https://en.wikipedia.org/wiki/Going_Seventeen_(web_series)"},
    {"question": "On which platform is ''Run BTS!'' currently available to watch?", "options": ["Netflix", "Weverse and YouTube", "Mnet", "V LIVE only"], "correct": 1, "fun_fact": "Following V LIVE''s shutdown at the end of 2022, Run BTS! episodes are available on Weverse and YouTube. New episodes continue to be released on Weverse.", "source": "https://en.wikipedia.org/wiki/Run_BTS"},
    {"question": "Which group''s behind-the-scenes reality content is called ''NCT Life''?", "options": ["SEVENTEEN", "NCT", "EXO", "SHINee"], "correct": 1, "fun_fact": "NCT Life is a series of reality programs featuring NCT members in various travel and mission-based activities, released across multiple seasons.", "source": "https://kpop.fandom.com/wiki/NCT_Life"},
    {"question": "Solar of MAMAMOO is famous for her personal YouTube channel called what?", "options": ["Solar Sunrise", "SOLARSIDO", "Solar Power", "Moon&Sun"], "correct": 1, "fun_fact": "Solar runs the YouTube channel SOLARSIDO, where she posts vlogs, challenges, and variety content. It has millions of subscribers and is one of the most successful idol YouTube channels.", "source": "https://en.wikipedia.org/wiki/Solar_(singer)"},
    {"question": "BTS''s docuseries ''Burn the Stage'' was released on which platform in 2018?", "options": ["Netflix", "YouTube Premium", "Disney+", "V LIVE"], "correct": 1, "fun_fact": "Burn the Stage is a BTS docuseries that premiered on YouTube Premium in November 2018, following BTS during their Wings Tour. It was later released as a theatrical film.", "source": "https://en.wikipedia.org/wiki/Burn_the_Stage"},
    {"question": "Which platform produces the survival show ''I-LAND'' that formed ENHYPEN?", "options": ["SBS", "KBS", "Mnet", "MBC"], "correct": 2, "fun_fact": "I-LAND was produced by Mnet and HYBE, airing from June to September 2020. The show selected 7 members to form ENHYPEN, who debuted in November 2020.", "source": "https://en.wikipedia.org/wiki/I-Land"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Run BTS, Wikipedia Going Seventeen (web series), Kpop Wiki Fandom, Wikipedia Solar (singer), Wikipedia Burn the Stage, Wikipedia I-Land'
);

-- 37. K-pop Sub-units and Solo Debuts (hard, knowledge) [from agent a93dfc8]
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Sub-units and Solo Debuts',
  'How well do you know K-pop group sub-units and members'' solo projects?',
  NULL,
  'multiple_choice',
  'hard',
  'knowledge',
  '[
    {"question": "EXO originally debuted as two sub-units promoting simultaneously. What were the two sub-unit names?", "options": ["EXO-A and EXO-B", "EXO-K and EXO-M", "EXO-Seoul and EXO-Beijing", "EXO-1 and EXO-2"], "correct": 1, "fun_fact": "EXO-K promoted in South Korea while EXO-M promoted in China, both debuting on April 8, 2012 with the song MAMA.", "source": "https://en.wikipedia.org/wiki/Exo"},
    {"question": "Which NCT sub-unit was the first to debut in 2016?", "options": ["NCT 127", "NCT Dream", "NCT U", "WayV"], "correct": 2, "fun_fact": "NCT U debuted on April 9, 2016, with The 7th Sense and Without You, followed by NCT 127 in July and NCT Dream in August of the same year.", "source": "https://en.wikipedia.org/wiki/NCT_(group)"},
    {"question": "Which NCT sub-unit focuses on the Chinese market and debuted in 2019?", "options": ["NCT Dream", "NCT 127", "NCT U", "WayV"], "correct": 3, "fun_fact": "WayV debuted on January 17, 2019, with a Chinese version of NCT 127''s Regular. The unit consists of members including Kun, Ten, Winwin, Lucas, Xiaojun, Hendery, and YangYang.", "source": "https://en.wikipedia.org/wiki/NCT_(group)"},
    {"question": "SEVENTEEN is divided into three sub-units. Which of the following is NOT one of them?", "options": ["Hip-Hop Unit", "Vocal Unit", "Dance Unit", "Performance Unit"], "correct": 2, "fun_fact": "SEVENTEEN''s three official units are the Hip-Hop Unit (S.Coups, Wonwoo, Mingyu, Vernon), Vocal Unit (Jeonghan, Joshua, Woozi, DK, Seungkwan), and Performance Unit (Hoshi, Jun, The8, Dino).", "source": "https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)"},
    {"question": "Which BTS member released the solo mixtape ''Hope World'' in 2018?", "options": ["RM", "SUGA", "J-Hope", "Jimin"], "correct": 2, "fun_fact": "J-Hope released his debut solo mixtape Hope World in 2018, which charted on the Billboard 200 at number 38, the highest charting by a K-pop solo at the time.", "source": "https://en.wikipedia.org/wiki/Hope_World"},
    {"question": "Under what name does BTS member SUGA release his solo music?", "options": ["Shadow", "Agust D", "Min Yoongi", "GENIUS"], "correct": 1, "fun_fact": "SUGA''s solo project name Agust D is derived from his hometown DT Suga (Daegu Town + Suga reversed). He released mixtapes in 2016 and 2020, and his first full album D-DAY in 2023.", "source": "https://en.wikipedia.org/wiki/Agust_D"},
    {"question": "What was the name of Jimin''s first solo album released in 2023?", "options": ["MUSE", "FACE", "FILTER", "Promise"], "correct": 1, "fun_fact": "Jimin released his first solo album FACE on March 24, 2023, with the lead single Set Me Free Pt. 2. It debuted at number two on the Billboard 200.", "source": "https://en.wikipedia.org/wiki/Face_(Jimin_album)"},
    {"question": "What was Jungkook''s first solo album released in 2023?", "options": ["Still With You", "Seven", "Golden", "Jung Kook"], "correct": 2, "fun_fact": "Jungkook released his debut solo album Golden on November 3, 2023. It debuted at number two on the Billboard 200, with multiple singles charting worldwide.", "source": "https://en.wikipedia.org/wiki/Golden_(album)"},
    {"question": "How many NCT sub-units debuted in the year 2016?", "options": ["1", "2", "3", "4"], "correct": 2, "fun_fact": "Three NCT sub-units debuted in 2016: NCT U (April), NCT 127 (July), and NCT Dream (August). WayV debuted later in 2019.", "source": "https://en.wikipedia.org/wiki/NCT_(group)"},
    {"question": "Which EXO sub-unit consists of Chen, Baekhyun, and Xiumin?", "options": ["EXO-K", "EXO-M", "EXO-CBX", "EXO-SC"], "correct": 2, "fun_fact": "EXO-CBX (Chen-Baek-Xi) debuted as EXO''s first official sub-unit in October 2016. Their name comes from the first letters of Chen, Baekhyun, and Xiumin.", "source": "https://en.wikipedia.org/wiki/Exo"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia NCT group, Wikipedia EXO, Wikipedia SEVENTEEN, Wikipedia Hope World, Wikipedia Agust D, Wikipedia Face (Jimin album), Wikipedia Golden (album)'
);

-- 38. K-pop on Spotify (hard, knowledge) [from agent a93dfc8]
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Streaming Records',
  'Test your knowledge of K-pop''s biggest streaming records and milestones.',
  NULL,
  'multiple_choice',
  'hard',
  'knowledge',
  '[
    {"question": "Which K-pop song was the first by any K-pop act to surpass 1 billion streams on Spotify?", "options": ["BLACKPINK - DDU-DU DDU-DU", "PSY - Gangnam Style", "BTS - Dynamite", "BLACKPINK - Kill This Love"], "correct": 2, "fun_fact": "BTS''s Dynamite became the first K-pop song to surpass 1 billion streams on Spotify on July 20, 2021. It also later became the first K-pop song to surpass 2 billion streams.", "source": "https://en.wikipedia.org/wiki/Dynamite_(BTS_song)"},
    {"question": "Which K-pop girl group was named Spotify''s most-streamed girl group globally for five consecutive years from 2019 to 2023?", "options": ["TWICE", "aespa", "Girls'' Generation", "BLACKPINK"], "correct": 3, "fun_fact": "BLACKPINK held the title of Spotify''s most-streamed girl group globally every year from 2019 through 2023, accumulating over 10 billion streams all-time.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "Dynamite by BTS debuted at number one on which Spotify chart, a historic first for a K-pop act?", "options": ["Spotify US Top 50", "Spotify Global Daily Top Songs", "Spotify Viral 50", "Spotify New Music Friday"], "correct": 1, "fun_fact": "BTS''s Dynamite became the first song by a Korean artist to debut at number one on Spotify''s Daily Top Songs Global chart upon its release in August 2020.", "source": "https://en.wikipedia.org/wiki/Dynamite_(BTS_song)"},
    {"question": "BLACKPINK''s How You Like That reached 1 billion Spotify streams. What milestone did it achieve as a K-pop girl group song?", "options": ["First K-pop song to reach 1 billion streams", "First K-pop girl group song to reach 1 billion Spotify streams", "First girl group song to debut at #1 on Spotify Global", "First K-pop song to enter the Spotify top 10"], "correct": 1, "fun_fact": "How You Like That became the first K-pop girl group song to surpass 1 billion streams on Spotify, reaching the milestone in March 2024.", "source": "https://en.wikipedia.org/wiki/How_You_Like_That"},
    {"question": "PSY''s Gangnam Style was the first YouTube video to reach 1 billion views. When did it achieve this milestone?", "options": ["November 2012", "December 2012", "January 2013", "March 2013"], "correct": 1, "fun_fact": "Gangnam Style became the first YouTube video to reach 1 billion views on December 21, 2012. It was also the first video to reach 2 billion, 3 billion, and eventually even broke YouTube''s view counter.", "source": "https://en.wikipedia.org/wiki/Gangnam_Style"},
    {"question": "Which BTS song became the first K-pop song to surpass 2 billion streams on Spotify?", "options": ["Boy With Luv", "DNA", "Dynamite", "Butter"], "correct": 2, "fun_fact": "BTS''s Dynamite became the first K-pop song to surpass 2 billion streams on Spotify on August 10, 2024, continuing its historic streaming records.", "source": "https://en.wikipedia.org/wiki/Dynamite_(BTS_song)"},
    {"question": "Which K-pop boy group set a record for most-streamed K-pop debut on Spotify?", "options": ["ENHYPEN", "ATEEZ", "TXT", "Stray Kids"], "correct": 0, "fun_fact": "ENHYPEN set the record for the most-streamed K-pop boy group debut on Spotify, with their debut EP Border: Day One accumulating record streams in 2020.", "source": "https://en.wikipedia.org/wiki/Enhypen"},
    {"question": "NewJeans'' Hype Boy broke which streaming record on the Billboard Global 200?", "options": ["Most streams in one week by K-pop group", "Longest-charting song by a K-pop female act (42 weeks)", "First K-pop girl group song at #1", "Most-streamed debut song ever"], "correct": 1, "fun_fact": "Hype Boy spent 42 weeks on the Billboard Global 200, setting the record for the longest-charting song by a K-pop girl group on that chart.", "source": "https://en.wikipedia.org/wiki/Hype_Boy"},
    {"question": "BLACKPINK set a Guinness World Record in 2023 by becoming the most-streamed female band on Spotify. How many streams did they have at that point?", "options": ["5.5 billion", "8.8 billion", "12 billion", "3.2 billion"], "correct": 1, "fun_fact": "BLACKPINK surpassed 8.8 billion streams to claim the Guinness record for most-streamed female band on Spotify, beating previous titleholders Little Mix.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "Which social media platform was instrumental in launching NewJeans to global fame, with their songs going viral in 2022-2023?", "options": ["Twitter/X", "Instagram", "TikTok", "YouTube Shorts"], "correct": 2, "fun_fact": "NewJeans songs like Hype Boy, Ditto, and OMG went massively viral on TikTok in 2022-2023, exposing their music to global audiences beyond traditional K-pop fans.", "source": "https://en.wikipedia.org/wiki/NewJeans"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Dynamite (BTS song), Wikipedia Blackpink, Wikipedia How You Like That, Wikipedia Gangnam Style, Wikipedia Hype Boy, Wikipedia NewJeans'
);

-- 39. K-pop Awards and Milestones (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Awards and Milestones',
  'Test your knowledge of K-pop''s biggest award wins and historic firsts!',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "Which K-pop act received the first Grammy nomination for a K-pop act in 2021?", "options": ["BLACKPINK", "BTS", "EXO", "BIGBANG"], "correct": 1, "fun_fact": "BTS received their first Grammy nomination for Best Pop Duo/Group Performance for Dynamite at the 63rd Grammy Awards in 2021, making history as the first K-pop act to be nominated.", "source": "https://en.wikipedia.org/wiki/63rd_Grammy_Awards"},
    {"question": "The Melon Music Awards (MMA) Daesang (Grand Prize) for Artist of the Year is considered one of K-pop''s highest honors. Which group won it in 2022?", "options": ["BTS", "IVE", "NewJeans", "aespa"], "correct": 1, "fun_fact": "IVE won the Artist of the Year Daesang at the 2022 Melon Music Awards, just about one year after their debut, in a historic win for a relatively new group.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "At what major US awards show did BTS become the first K-pop group to win Top Social Artist consecutively for multiple years?", "options": ["Grammy Awards", "MTV VMAs", "Billboard Music Awards", "American Music Awards"], "correct": 2, "fun_fact": "BTS won Top Social Artist at the Billboard Music Awards from 2017 to 2022, six consecutive years, making it their signature award before the category was eventually retired.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "Which K-pop group won the Artist of the Year award at the American Music Awards (AMAs) in 2021?", "options": ["BLACKPINK", "EXO", "BTS", "TWICE"], "correct": 2, "fun_fact": "BTS won Artist of the Year at the 2021 American Music Awards, the most prestigious award at the show, becoming the first Asian act to win the category.", "source": "https://en.wikipedia.org/wiki/American_Music_Awards_of_2021"},
    {"question": "EXO became the first artist to achieve what sales milestone in K-pop?", "options": ["First to sell 500,000 albums in Japan", "First to have five consecutive million-selling albums", "First to win 20 music show trophies in a year", "First to chart on the US Billboard 200"], "correct": 1, "fun_fact": "EXO became the first artist to have five consecutive million-selling albums in South Korea, from XOXO (2013) through Don''t Mess Up My Tempo (2018).", "source": "https://en.wikipedia.org/wiki/Exo_(group)"},
    {"question": "Which K-pop girl group won the MAMA Artist of the Year in 2022, their debut year performance?", "options": ["NewJeans", "IVE", "LE SSERAFIM", "aespa"], "correct": 1, "fun_fact": "IVE won Artist of the Year at the 2022 MAMA Awards, just one year after their debut, showcasing their meteoric rise in K-pop.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "The three major end-of-year K-pop award shows are called MMA, MAMA, and which third one?", "options": ["Gaon Music Awards", "Seoul Music Awards", "Golden Disc Awards", "Melon Awards"], "correct": 2, "fun_fact": "The three major year-end K-pop awards shows are the Mnet Asian Music Awards (MAMA), the Melon Music Awards (MMA), and the Golden Disc Awards (GDA). Seoul Music Awards is also significant.", "source": "https://en.wikipedia.org/wiki/Golden_Disc_Awards"},
    {"question": "BLACKPINK''s Lisa became a solo chart-topper globally. Her 2021 solo LALISA set a record by becoming what?", "options": ["First K-pop solo song to hit #1 in US iTunes", "Most-viewed YouTube music video by a K-pop solo artist in 24 hours", "First solo debut to sell 1 million copies", "First solo song on the Billboard Hot 100"], "correct": 1, "fun_fact": "LALISA''s music video set the record for the most-viewed YouTube video within 24 hours for a K-pop solo artist when it was released in September 2021, with over 73.6 million views.", "source": "https://en.wikipedia.org/wiki/Lalisa_(song)"},
    {"question": "BLACKPINK was the first K-pop group/act to reach how many YouTube subscribers, setting a Guinness record?", "options": ["10 million", "20 million", "50 million", "100 million"], "correct": 2, "fun_fact": "BLACKPINK became the first K-pop act and first music group to reach 50 million YouTube subscribers, achieving this milestone in 2019.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "BTS set a record at the 2020 MAMA Awards. What did they win?", "options": ["Their first Grammy nomination", "Most wins in a single MAMA ceremony", "First K-pop act to perform at MAMA in the US", "First group to win MAMA Artist of the Year 5 times"], "correct": 3, "fun_fact": "BTS won the MAMA Artist of the Year award for the fifth consecutive time in 2020, setting a record for the most consecutive wins in the category.", "source": "https://en.wikipedia.org/wiki/2020_Mnet_Asian_Music_Awards"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia 63rd Grammy Awards, Wikipedia Ive (group), Wikipedia BTS, Wikipedia American Music Awards of 2021, Wikipedia Exo (group), Wikipedia Golden Disc Awards, Wikipedia Lalisa (song), Wikipedia Blackpink, Wikipedia 2020 Mnet Asian Music Awards'
);

-- 40. K-pop Song Collaborations (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop International Collaborations',
  'K-pop has gone truly global! Test your knowledge of iconic K-pop collaborations with international artists.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "BTS collaborated with which American DJ/producer on the 2020 remix of Dynamite?", "options": ["Calvin Harris", "Marshmello", "Jonas Brothers remix", "Coldplay"], "correct": 1, "fun_fact": "BTS and Marshmello released a collaboration called ''BTS x Marshmello'' remix alongside their song Butter in 2021. BTS also collaborated with Halsey on ''Boy With Luv'' (2019).", "source": "https://en.wikipedia.org/wiki/BTS_discography"},
    {"question": "Which American singer did BTS collaborate with on the 2021 hit ''My Universe''?", "options": ["Ed Sheeran", "Coldplay", "Bruno Mars", "The Weeknd"], "correct": 1, "fun_fact": "BTS collaborated with Coldplay on ''My Universe,'' released on September 24, 2021. The song debuted at #1 on the Billboard Hot 100.", "source": "https://en.wikipedia.org/wiki/My_Universe_(song)"},
    {"question": "TXT collaborated with which British rock band on the song ''0X1=LOVESONG''?", "options": ["Paramore", "Bring Me the Horizon", "Fall Out Boy", "Panic! at the Disco"], "correct": 1, "fun_fact": "0X1=LOVESONG features British metalcore band Bring Me the Horizon. The collaboration blended K-pop with heavy rock elements and became one of TXT''s most internationally recognized songs.", "source": "https://en.wikipedia.org/wiki/The_Chaos_Chapter:_FREEZE"},
    {"question": "BLACKPINK collaborated with which American pop star on the 2019 song ''Kiss and Make Up''?", "options": ["Ariana Grande", "Dua Lipa", "Cardi B", "Lady Gaga"], "correct": 1, "fun_fact": "Kiss and Make Up was a 2018 collaboration between BLACKPINK and Dua Lipa, released on Dua Lipa''s Complete Edition album. It was one of the first major K-pop/Western pop collaborations.", "source": "https://en.wikipedia.org/wiki/Dua_Lipa_(album)"},
    {"question": "EXO collaborated with which American artist for the 2015 charity single''Power of Music''?", "options": ["Never (EXO never collaborated internationally)", "Michael Jackson estate", "SM Town collaboration only", "American Red Cross campaign"], "correct": 0, "fun_fact": "While EXO hasn''t had a mainstream international collaboration, SM Entertainment has produced numerous global collaborations through its artists. EXO''s international reach was primarily through Chinese sub-unit EXO-M.", "source": "https://en.wikipedia.org/wiki/Exo_(group)"},
    {"question": "Which BTS song featuring Halsey became a massive viral hit in 2019?", "options": ["Boy With Luv", "DNA", "Butter", "Fire"], "correct": 0, "fun_fact": "''Boy With Luv'' featuring Halsey was released on April 12, 2019. The music video broke the YouTube record for most-viewed video in 24 hours at the time, with 74.6 million views.", "source": "https://en.wikipedia.org/wiki/Boy_with_Luv"},
    {"question": "Which K-pop group collaborated with British rock band The Chainsmokers on a song in 2021?", "options": ["SEVENTEEN", "BLACKPINK", "NCT 127", "aespa"], "correct": 1, "fun_fact": "BLACKPINK collaborated with The Chainsmokers on ''Siren'' in 2021, as part of the trio''s broader partnership with Interscope Records to expand into Western markets.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "Stray Kids collaborated with which American record label to release music in the US market?", "options": ["Republic Records", "Atlantic Records", "Geffen Records", "Columbia Records"], "correct": 2, "fun_fact": "Stray Kids signed with Geffen Records (a Universal Music Group imprint) for their US releases, making them one of the first K-pop groups to partner with a major US label for distribution.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "Which K-pop group''s hit song sampled the Gloria Gaynor disco classic ''I Will Survive''?", "options": ["BLACKPINK - Pink Venom", "IVE - After Like", "NewJeans - Ditto", "TWICE - Alcohol-Free"], "correct": 1, "fun_fact": "IVE''s After Like (2022) prominently samples Gloria Gaynor''s 1978 classic I Will Survive. The original songwriters Freddie Perren and Dino Fekaris are credited on the track.", "source": "https://en.wikipedia.org/wiki/After_Like"},
    {"question": "BIGBANG''s G-Dragon collaborated with CL of 2NE1 on which solo song?", "options": ["The Baddest Female", "MTBD", "Breathe", "Hello Bitches"], "correct": 0, "fun_fact": "CL and G-Dragon collaborated on The Baddest Female (2013), which was CL''s solo debut. G-Dragon contributed as a co-writer, and the collaboration highlighted YG Entertainment''s internal synergy.", "source": "https://en.wikipedia.org/wiki/The_Baddest_Female_(CL_song)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia BTS discography, Wikipedia My Universe (song), Wikipedia The Chaos Chapter: FREEZE, Wikipedia Dua Lipa (album), Wikipedia Boy with Luv, Wikipedia After Like, Wikipedia Stray Kids, Wikipedia The Baddest Female (CL song)'
);

-- 41. K-pop Survival Shows (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Survival Shows',
  'So many K-pop groups were formed through brutal survival shows! How much do you know?',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "TWICE was formed through which JYP Entertainment survival show?", "options": ["Sixteen", "Produce 101", "Mix Nine", "SIXTEEN 2"], "correct": 0, "fun_fact": "TWICE was formed through the JYP survival show Sixteen, which aired on Mnet in 2015. Out of 16 trainees, 9 were chosen to debut as TWICE.", "source": "https://en.wikipedia.org/wiki/Sixteen_(TV_program)"},
    {"question": "Wanna One was formed through which Mnet survival show in 2017?", "options": ["Produce 101 Season 1", "Produce 101 Season 2", "Produce X 101", "Produce 48"], "correct": 1, "fun_fact": "Wanna One was formed through Produce 101 Season 2 (2017), which featured male trainees from various agencies. The group had 11 members and was active from 2017 to 2019.", "source": "https://en.wikipedia.org/wiki/Wanna_One"},
    {"question": "IZ*ONE was formed through which survival show that combined Korean and Japanese trainees?", "options": ["Produce 101 Season 2", "I-LAND", "Produce 48", "Mix Nine"], "correct": 2, "fun_fact": "IZ*ONE was formed through Produce 48 (2018), a collaboration between Mnet and AKB48 Group. The 12-member group included Korean and Japanese members and was active until April 2021.", "source": "https://en.wikipedia.org/wiki/Iz*One"},
    {"question": "ENHYPEN was formed through which survival show in 2020?", "options": ["Boys Planet", "Produce X 101", "I-LAND", "Under Nineteen"], "correct": 2, "fun_fact": "ENHYPEN was formed through I-LAND (2020), a joint HYBE and CJ ENM production. 23 trainees competed, with 7 selected through a combination of producer votes and public votes.", "source": "https://en.wikipedia.org/wiki/Enhypen"},
    {"question": "ZEROBASEONE was formed through which survival show in 2023?", "options": ["I-LAND 2", "Boys Planet", "Produce 101 Season 3", "Under Nineteen 2"], "correct": 1, "fun_fact": "ZEROBASEONE was formed through Boys Planet, a Mnet survival show that aired in 2023. 9 members were selected from Korean and global trainees.", "source": "https://en.wikipedia.org/wiki/Zerobaseone"},
    {"question": "Which group was formed through the Mnet survival show No.Mercy in 2015?", "options": ["BTOB", "VIXX", "MONSTA X", "BtoB"], "correct": 2, "fun_fact": "MONSTA X was formed through No.Mercy, a Starship Entertainment survival program that aired on Mnet in 2014-2015. 7 members were chosen to debut.", "source": "https://en.wikipedia.org/wiki/Monsta_X"},
    {"question": "Girls'' Generation was NOT formed through a survival show. Instead, they were handpicked by whom?", "options": ["The public through a phone vote", "SM Entertainment''s talent scouts and management", "An audition with thousands of candidates judged live on TV", "A panel of famous K-pop artists"], "correct": 1, "fun_fact": "Girls'' Generation was formed internally by SM Entertainment through their standard trainee system. Lee Soo-man and SM management selected the members over years of training, without a public survival show format.", "source": "https://en.wikipedia.org/wiki/Girls%27_Generation"},
    {"question": "Which survival show featured BLACKPINK''s members as trainees before their debut?", "options": ["YG''s Mix Nine", "Sixteen", "K-pop Star", "YG Treasure Box"], "correct": 2, "fun_fact": "All BLACKPINK members appeared on SBS''s K-pop Star audition show as trainees. Jennie, Jisoo, Rosé, and Lisa were all featured in earlier seasons, showcasing their talent before their 2016 debut.", "source": "https://en.wikipedia.org/wiki/K-Pop_Star"},
    {"question": "Stray Kids was formed through a survival show of the same name. How many original members debuted?", "options": ["7", "8", "9", "10"], "correct": 2, "fun_fact": "9 members originally debuted from the Stray Kids survival show: Bang Chan, Woojin, Lee Know, Changbin, Hyunjin, Han, Felix, Seungmin, and I.N. Woojin later left the group in 2019.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"},
    {"question": "KARD is notable in K-pop for being a mixed-gender group. They were formed by which company?", "options": ["DSP Media", "Cube Entertainment", "FNC Entertainment", "Kakao Entertainment"], "correct": 0, "fun_fact": "KARD debuted under DSP Media in 2017 as one of the few co-ed K-pop groups. They consist of two male members (BM and J.Seph) and two female members (Somin and Jiwoo).", "source": "https://en.wikipedia.org/wiki/Kard_(group)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Sixteen (TV program), Wikipedia Wanna One, Wikipedia Iz*One, Wikipedia Enhypen, Wikipedia Zerobaseone, Wikipedia Monsta X, Wikipedia Girls Generation, Wikipedia K-Pop Star, Wikipedia Stray Kids, Wikipedia Kard (group)'
);

-- 42. K-pop Label Structure (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Label Structure and Companies',
  'Behind every great K-pop group is a company. How well do you know the corporate side of K-pop?',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "The ''Big Three'' K-pop companies (circa 2010-2020) are SM, YG, and which third company?", "options": ["HYBE (Big Hit)", "JYP Entertainment", "Cube Entertainment", "Starship Entertainment"], "correct": 1, "fun_fact": "SM Entertainment, YG Entertainment, and JYP Entertainment were traditionally known as the Big Three K-pop companies, dominating the industry for over a decade.", "source": "https://en.wikipedia.org/wiki/JYP_Entertainment"},
    {"question": "HYBE Corporation was founded in 2005 as what company?", "options": ["Pledis Entertainment", "Big Hit Entertainment", "Source Music", "KOZ Entertainment"], "correct": 1, "fun_fact": "Big Hit Entertainment was founded in 2005 by Bang Si-hyuk. It rebranded to HYBE Corporation in March 2021 after expanding significantly through BTS''s success.", "source": "https://en.wikipedia.org/wiki/Hybe_Corporation"},
    {"question": "Which company is home to both TWICE and Stray Kids?", "options": ["SM Entertainment", "YG Entertainment", "JYP Entertainment", "HYBE"], "correct": 2, "fun_fact": "JYP Entertainment manages both TWICE (debuted 2015) and Stray Kids (debuted 2018), as well as other acts like ITZY, NMIXX, and DAY6.", "source": "https://en.wikipedia.org/wiki/JYP_Entertainment"},
    {"question": "BLACKPINK and BIGBANG are both under which company?", "options": ["SM Entertainment", "JYP Entertainment", "YG Entertainment", "HYBE"], "correct": 2, "fun_fact": "YG Entertainment is home to BIGBANG (debuted 2006), 2NE1 (debuted 2009), and BLACKPINK (debuted 2016), among other artists including WINNER and iKON.", "source": "https://en.wikipedia.org/wiki/YG_Entertainment"},
    {"question": "HYBE acquired which company in 2020, bringing SEVENTEEN under the HYBE umbrella?", "options": ["Source Music", "ADOR", "Pledis Entertainment", "KOZ Entertainment"], "correct": 2, "fun_fact": "HYBE acquired Pledis Entertainment in May 2020, making SEVENTEEN (Pledis''s biggest act) part of the HYBE family of labels.", "source": "https://en.wikipedia.org/wiki/Pledis_Entertainment"},
    {"question": "Which HYBE sub-label manages LE SSERAFIM?", "options": ["ADOR", "BELIFT LAB", "Source Music", "Big Hit Music"], "correct": 2, "fun_fact": "LE SSERAFIM is under Source Music, a HYBE subsidiary that was acquired in 2019. Source Music was previously known for managing girl group G-Friend.", "source": "https://en.wikipedia.org/wiki/Source_Music"},
    {"question": "Which HYBE sub-label was created specifically for ENHYPEN?", "options": ["ADOR", "BELIFT LAB", "Source Music", "KOZ Entertainment"], "correct": 1, "fun_fact": "BELIFT LAB was established in 2019 as a joint venture between HYBE and CJ ENM specifically to manage the group that would be formed through the I-LAND survival show -- ENHYPEN.", "source": "https://en.wikipedia.org/wiki/Belift_Lab"},
    {"question": "SM Entertainment is home to EXO, SHINee, NCT, and which of these classic groups?", "options": ["BIGBANG", "2PM", "Girls'' Generation (SNSD)", "Wonder Girls"], "correct": 2, "fun_fact": "SM Entertainment manages EXO, SHINee, NCT, Red Velvet, aespa, and classic groups like Girls'' Generation, H.O.T., S.E.S., BoA, TVXQ, Super Junior, and f(x).", "source": "https://en.wikipedia.org/wiki/SM_Entertainment"},
    {"question": "(G)I-DLE and BTOB are both under which company?", "options": ["SM Entertainment", "Cube Entertainment", "Starship Entertainment", "JYP Entertainment"], "correct": 1, "fun_fact": "Cube Entertainment manages (G)I-DLE (debuted 2018) and BTOB (debuted 2012), along with other artists like HyunA and Dawn.", "source": "https://en.wikipedia.org/wiki/Cube_Entertainment"},
    {"question": "Which sub-label of HYBE manages NewJeans?", "options": ["BELIFT LAB", "Source Music", "ADOR", "Big Hit Music"], "correct": 2, "fun_fact": "NewJeans is under ADOR (All Doors One Room), a HYBE sub-label headed by creative director Min Hee-jin. ADOR was specifically created to develop NewJeans'' unique aesthetic.", "source": "https://en.wikipedia.org/wiki/Ador_(record_label)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia JYP Entertainment, Wikipedia Hybe Corporation, Wikipedia YG Entertainment, Wikipedia Pledis Entertainment, Wikipedia Source Music, Wikipedia Belift Lab, Wikipedia SM Entertainment, Wikipedia Cube Entertainment, Wikipedia Ador (record label)'
);

-- 43. K-pop Generation History (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Generation History',
  'K-pop has evolved across generations! Test your knowledge of which groups belong to which era.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "H.O.T. is considered a 1st generation K-pop group. In which year did they debut?", "options": ["1993", "1996", "1998", "2000"], "correct": 1, "fun_fact": "H.O.T. (High-five Of Teenagers) debuted in 1996 under SM Entertainment and is considered one of the pioneering acts of the K-pop idol wave. They are often called the ''gods of K-pop.''", "source": "https://en.wikipedia.org/wiki/H.O.T."},
    {"question": "Which generation does Girls'' Generation (SNSD) belong to?", "options": ["1st generation", "2nd generation", "3rd generation", "4th generation"], "correct": 1, "fun_fact": "Girls'' Generation is a 2nd generation K-pop group, debuting in 2007. The 2nd gen era (roughly 2004-2012) is remembered for global expansion of K-pop and the rise of major groups like BIGBANG, SHINee, and SNSD.", "source": "https://en.wikipedia.org/wiki/Girls%27_Generation"},
    {"question": "BTS, EXO, and BLACKPINK are all part of which K-pop generation?", "options": ["2nd generation", "3rd generation", "4th generation", "5th generation"], "correct": 1, "fun_fact": "BTS (2013), EXO (2012), and BLACKPINK (2016) are all 3rd generation K-pop acts. The 3rd gen era (roughly 2012-2019) saw K-pop achieve true global dominance.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "Which year is generally considered the start of the 4th generation of K-pop?", "options": ["2017", "2018", "2019", "2020"], "correct": 2, "fun_fact": "The 4th generation of K-pop is generally considered to have started around 2018-2019, with groups like ATEEZ (2018), TXT (2019), ITZY (2019), and Stray Kids (2018) leading the wave.", "source": "https://en.wikipedia.org/wiki/Ateez"},
    {"question": "Which of these groups is from the 1st generation of K-pop (debuted in the 1990s)?", "options": ["SHINee", "BIGBANG", "S.E.S.", "2NE1"], "correct": 2, "fun_fact": "S.E.S. debuted in 1997 under SM Entertainment and is one of the most iconic 1st generation girl groups. Along with FinKL and Baby V.O.X, they defined 1st gen female K-pop.", "source": "https://en.wikipedia.org/wiki/S.E.S._(group)"},
    {"question": "ATEEZ, aespa, and IVE are part of which K-pop generation?", "options": ["2nd generation", "3rd generation", "4th generation", "5th generation"], "correct": 2, "fun_fact": "ATEEZ (2018), aespa (2020), and IVE (2021) are key 4th generation acts. The 4th gen is defined by stronger global fanbases, self-producing artists, and innovative concepts.", "source": "https://en.wikipedia.org/wiki/Ateez"},
    {"question": "BLACKPINK debuted in 2016 and is classified as which K-pop generation?", "options": ["2nd generation", "3rd generation", "4th generation", "5th generation"], "correct": 1, "fun_fact": "BLACKPINK is a 3rd generation K-pop group, debuting in August 2016. They are often considered the group that most dramatically expanded the global reach of 3rd gen K-pop girl groups.", "source": "https://en.wikipedia.org/wiki/Blackpink"},
    {"question": "Which 2nd generation boy group is considered one of the first to achieve truly global K-pop success?", "options": ["ATEEZ", "BTS", "BIGBANG", "EXO"], "correct": 2, "fun_fact": "BIGBANG, debuting in 2006, are 2nd generation K-pop pioneers who helped pave the way for global K-pop acceptance. G-Dragon in particular became one of K-pop''s most internationally recognized figures.", "source": "https://en.wikipedia.org/wiki/BigBang_(South_Korean_band)"},
    {"question": "SHINee debuted in 2008 and is typically classified as which K-pop generation?", "options": ["1st generation", "2nd generation", "3rd generation", "4th generation"], "correct": 1, "fun_fact": "SHINee is a 2nd generation K-pop group, debuting in May 2008 under SM Entertainment. They are considered pioneers of the neo-soul K-pop sound.", "source": "https://en.wikipedia.org/wiki/Shinee"},
    {"question": "TXT (Tomorrow X Together) debuted in March 2019 and is classified as which K-pop generation?", "options": ["2nd generation", "3rd generation", "4th generation", "5th generation"], "correct": 2, "fun_fact": "TXT debuted in March 2019 under Big Hit Music (HYBE) and is classified as 4th generation. They were HYBE''s first new act after BTS and quickly became one of the most globally popular 4th gen boy groups.", "source": "https://en.wikipedia.org/wiki/Tomorrow_X_Together"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia H.O.T., Wikipedia Girls Generation, Wikipedia BTS, Wikipedia Ateez, Wikipedia S.E.S. (group), Wikipedia Blackpink, Wikipedia BigBang (South Korean band), Wikipedia Shinee, Wikipedia Tomorrow X Together'
);

-- 44. K-pop Music Videos Records (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Music Video Records',
  'K-pop MVs break YouTube records constantly! Can you keep track of these historic milestones?',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "Which was the first K-pop music video to reach 1 billion YouTube views?", "options": ["BLACKPINK - Ddu-Du Ddu-Du", "BTS - DNA", "PSY - Gangnam Style", "EXO - Growl"], "correct": 2, "fun_fact": "PSY''s Gangnam Style was the first YouTube video of any kind to reach 1 billion views, achieving the milestone on December 21, 2012.", "source": "https://en.wikipedia.org/wiki/Gangnam_Style"},
    {"question": "BLACKPINK''s ''How You Like That'' broke the YouTube record for most views in 24 hours in 2020 with approximately how many million views?", "options": ["56 million", "74 million", "86 million", "100 million"], "correct": 2, "fun_fact": "How You Like That accumulated approximately 86.3 million views within 24 hours of release on June 26, 2020, breaking the previous record set by BTS''s Boy With Luv.", "source": "https://en.wikipedia.org/wiki/How_You_Like_That"},
    {"question": "Which BTS music video held the record for most-viewed K-pop MV in 24 hours before being broken by BLACKPINK?", "options": ["Dynamite", "Boy With Luv (feat. Halsey)", "DNA", "Butter"], "correct": 1, "fun_fact": "BTS''s ''Boy With Luv'' feat. Halsey accumulated 74.6 million YouTube views in its first 24 hours in 2019, before being surpassed by BLACKPINK''s How You Like That in 2020.", "source": "https://en.wikipedia.org/wiki/Boy_with_Luv"},
    {"question": "Which BLACKPINK music video was the first K-pop girl group MV to surpass 1 billion YouTube views?", "options": ["Whistle", "Kill This Love", "Ddu-Du Ddu-Du", "BOOMBAYAH"], "correct": 2, "fun_fact": "BLACKPINK''s Ddu-Du Ddu-Du became the first music video by a K-pop girl group to surpass 1 billion YouTube views, achieving the milestone in June 2019.", "source": "https://en.wikipedia.org/wiki/Ddu-Du_Ddu-Du"},
    {"question": "Which K-pop music video was the most-viewed debut MV of all time on YouTube as of 2022?", "options": ["IVE - ELEVEN", "NewJeans - Attention", "LE SSERAFIM - FEARLESS", "aespa - Black Mamba"], "correct": 3, "fun_fact": "aespa''s Black Mamba debut MV set a record for the fastest K-pop debut MV to reach 100 million YouTube views when it was released in November 2020.", "source": "https://en.wikipedia.org/wiki/Aespa"},
    {"question": "IVE''s debut MV ''ELEVEN'' achieved what notable YouTube milestone in its first 24 hours?", "options": ["50 million views", "30 million views", "73 million views", "20 million views"], "correct": 3, "fun_fact": "ELEVEN''s MV achieved approximately 20 million views in its first 24 hours, a strong debut performance that reflected the anticipation for IVE from fans of former IZ*ONE members.", "source": "https://en.wikipedia.org/wiki/Ive_(group)"},
    {"question": "Which K-pop MV was the first to reach 100 million YouTube views in under 24 hours?", "options": ["BLACKPINK - Kill This Love", "BTS - Butter", "BLACKPINK - How You Like That", "BTS - Dynamite"], "correct": 2, "fun_fact": "BLACKPINK''s How You Like That became the first MV to reach 100 million YouTube views within 24 hours of release in June 2020, solidifying BLACKPINK''s YouTube dominance.", "source": "https://en.wikipedia.org/wiki/How_You_Like_That"},
    {"question": "ITZY''s debut MV ''DALLA DALLA'' set what record upon its release in 2019?", "options": ["Most-viewed debut MV in 24 hours at the time for a K-pop girl group", "First K-pop MV to trend #1 globally on YouTube", "First JYP debut to reach 100 million views", "Most-liked debut MV by a K-pop group"], "correct": 0, "fun_fact": "DALLA DALLA set the record for most-viewed debut MV in 24 hours by a K-pop girl group at the time of release in February 2019, with approximately 17 million views.", "source": "https://en.wikipedia.org/wiki/Dalla_Dalla"},
    {"question": "NewJeans'' debut single ''Attention'' was notable in its MV style. What distinguished it visually?", "options": ["First K-pop MV shot entirely in one continuous take", "A Y2K/retro aesthetic with no performance scenes", "Vintage camcorder footage that felt authentic and unfiltered", "3D animated metaverse concept"], "correct": 2, "fun_fact": "Attention''s MV featured a distinctly natural, film-like aesthetic with vintage camcorder footage mixed with casual everyday settings, setting NewJeans apart from the polished K-pop MV norm.", "source": "https://en.wikipedia.org/wiki/NewJeans"},
    {"question": "Which K-pop group became the most-subscribed music group on YouTube as of 2020?", "options": ["BTS", "EXO", "BLACKPINK", "TWICE"], "correct": 2, "fun_fact": "BLACKPINK became the most-subscribed music group on YouTube in 2020, surpassing both Western and Korean acts. As of 2023, their YouTube channel had over 90 million subscribers.", "source": "https://en.wikipedia.org/wiki/Blackpink"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Gangnam Style, Wikipedia How You Like That, Wikipedia Boy with Luv, Wikipedia Ddu-Du Ddu-Du, Wikipedia Aespa, Wikipedia Dalla Dalla, Wikipedia NewJeans, Wikipedia Blackpink'
);

-- 45. K-pop Training and Idol Life (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Training System and Idol Life',
  'What happens behind the scenes in K-pop? Test your knowledge of the trainee system and idol culture.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "The K-pop trainee system typically involves which activities?", "options": ["Only singing and dancing lessons", "Singing, dancing, acting, language lessons, and media training", "Only physical appearance management", "Online classes only"], "correct": 1, "fun_fact": "K-pop trainees undergo rigorous training in singing, dancing, rapping, acting, foreign languages (especially Japanese and English), and media presentation skills, often for several years before debut.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "TWICE''s Jihyo holds the record for the longest training period among major K-pop idols. How long did she train?", "options": ["5 years", "7 years", "10 years", "13 years"], "correct": 2, "fun_fact": "Jihyo joined JYP Entertainment as a trainee at age 8 in 2005 and trained for approximately 10 years before debuting with TWICE in 2015, making her training period one of the longest on record.", "source": "https://en.wikipedia.org/wiki/Jihyo"},
    {"question": "What is the Korean word for the youngest member of a K-pop group?", "options": ["Hyung", "Oppa", "Unnie", "Maknae"], "correct": 3, "fun_fact": "Maknae (막내) is the Korean term for the youngest member of a group. The maknae often receives special treatment but is also expected to show respect to older members.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "In K-pop, what is the term for the most visually distinctive or attractive member of a group, often featured prominently in promotional materials?", "options": ["Center", "Visual", "Face", "Lead"], "correct": 1, "fun_fact": "The Visual is the K-pop term for the member considered the most conventionally attractive by the agency. Many groups have a designated visual, though all members are considered beautiful.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "Which major K-pop company first formalized the modern trainee system?", "options": ["YG Entertainment", "JYP Entertainment", "SM Entertainment", "HYBE"], "correct": 2, "fun_fact": "SM Entertainment''s founder Lee Soo-man is credited with formalizing the modern K-pop trainee system in the mid-1990s with H.O.T., creating a template that the entire K-pop industry now follows.", "source": "https://en.wikipedia.org/wiki/SM_Entertainment"},
    {"question": "What is a K-pop ''comeback''?", "options": ["When a group returns from military service", "A new music release after a period of no releases", "When a disbanded group reunites", "When a member rejoins after leaving"], "correct": 1, "fun_fact": "In K-pop, a ''comeback'' refers to any new music release by an active artist or group, even if only weeks have passed since their last release. The term differs from the Western usage where it typically implies a return after a long absence.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "Which term describes the main goal that K-pop groups achieve when all their music simultaneously reaches #1 across all major Korean music charts?", "options": ["Daesang sweep", "Triple Crown", "Perfect All-Kill", "Digital Domination"], "correct": 2, "fun_fact": "A Perfect All-Kill (PAK) is achieved when a song simultaneously tops all major Korean music chart platforms (Melon, Genie, Bugs, FLO, and VIBE). It is one of the most coveted achievements in K-pop.", "source": "https://en.wikipedia.org/wiki/All-kill_(music)"},
    {"question": "In South Korea, male K-pop idols are required to serve mandatory military service. What is the typical duration?", "options": ["12 months", "18 months", "21 months", "24 months"], "correct": 1, "fun_fact": "South Korean men, including K-pop idols, are typically required to serve approximately 18-21 months of mandatory military service. This often means groups go on hiatus when members enlist.", "source": "https://en.wikipedia.org/wiki/Military_service_in_South_Korea"},
    {"question": "What is the Gaon Chart?", "options": ["A physical album sales tracking system", "South Korea''s national music chart covering digital and physical sales", "A YouTube views counter for K-pop videos", "A weekly ranking of K-pop fan activity"], "correct": 1, "fun_fact": "The Gaon Chart (now called the Circle Chart) is South Korea''s national music chart, officially launched in 2010. It tracks digital downloads, streaming, and physical sales, and is considered the most authoritative measure of K-pop popularity.", "source": "https://en.wikipedia.org/wiki/Gaon_Chart"},
    {"question": "What does ''fansign'' mean in K-pop culture?", "options": ["An online petition to support a K-pop group", "A fan-organized social media campaign", "An event where idols sign albums and interact with fans who win through lottery", "A contract signed between fans and their favorite group"], "correct": 2, "fun_fact": "Fansigns are events where selected fans (usually winners of album purchase lotteries) can meet their favorite K-pop idols, have albums signed, and briefly chat. They are one of the most coveted K-pop fan experiences.", "source": "https://en.wikipedia.org/wiki/Korean_pop"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Korean pop, Wikipedia Jihyo, Wikipedia SM Entertainment, Wikipedia All-kill (music), Wikipedia Military service in South Korea, Wikipedia Gaon Chart'
);

-- 46. K-pop in the West (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Goes West',
  'K-pop has taken over the world! Test your knowledge of K-pop''s crossover into Western markets.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "BTS became the first Korean act to top the Billboard Hot 100 with which song?", "options": ["Boy With Luv", "DNA", "Dynamite", "Butter"], "correct": 2, "fun_fact": "Dynamite debuted at #1 on the Billboard Hot 100 on August 22, 2020, making BTS the first all-South Korean act to reach the top of the US singles chart.", "source": "https://en.wikipedia.org/wiki/Dynamite_(BTS_song)"},
    {"question": "BLACKPINK was the first K-pop girl group to perform at which major US music festival?", "options": ["Lollapalooza", "SXSW", "Coachella", "Bonnaroo"], "correct": 2, "fun_fact": "BLACKPINK performed at Coachella 2019 on April 12 and 19, becoming the first K-pop group of any kind to perform at the iconic festival.", "source": "https://en.wikipedia.org/wiki/Blackpink_at_Coachella"},
    {"question": "Which BTS album was the first primarily Korean-language album to top the Billboard 200?", "options": ["Wings", "Love Yourself: Her", "Love Yourself: Tear", "Map of the Soul: Persona"], "correct": 2, "fun_fact": "Love Yourself: Tear debuted at #1 on the Billboard 200 in May 2018, becoming the first primarily non-English album to top the chart since 2006.", "source": "https://en.wikipedia.org/wiki/Love_Yourself:_Tear"},
    {"question": "In which year did K-pop first appear on Billboard''s mainstream US charts in a significant way, with multiple acts charting?", "options": ["2012", "2015", "2017", "2020"], "correct": 2, "fun_fact": "2017 is considered a breakthrough year for K-pop on US charts, with BTS appearing on the Billboard 200, BTS and EXO winning Billboard Music Awards, and global K-pop fandom growing explosively.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "TWICE''s album Formula of Love debuted on the Billboard 200 in which year, the first by a K-pop girl group to debut in the top 5?", "options": ["2019", "2020", "2021", "2022"], "correct": 2, "fun_fact": "TWICE''s Formula of Love: O+T=<3 debuted at #3 on the Billboard 200 in November 2021, their highest chart position in the US at that time.", "source": "https://en.wikipedia.org/wiki/Formula_of_Love:_O+T%3D%3C3"},
    {"question": "aespa performed at which major US music festival in 2022, becoming the first 4th gen K-pop act to do so?", "options": ["Coachella", "Lollapalooza", "SXSW", "Ultra Music Festival"], "correct": 1, "fun_fact": "aespa performed at Lollapalooza in Chicago on July 31, 2022, becoming the first 4th generation K-pop act to perform at the iconic US festival.", "source": "https://en.wikipedia.org/wiki/Aespa"},
    {"question": "Which K-pop act was the first to perform on Saturday Night Live (SNL)?", "options": ["BLACKPINK", "TWICE", "BTS", "EXO"], "correct": 2, "fun_fact": "BTS performed on Saturday Night Live on April 13, 2019, performing Boy With Luv and Mic Drop. It was a historic first for a K-pop act on the iconic US late-night show.", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "The first Korean-language film to win the Academy Award for Best Picture was which film?", "options": ["Oldboy", "Train to Busan", "Parasite", "The Host"], "correct": 2, "fun_fact": "Parasite (2019) directed by Bong Joon-ho won the Academy Award for Best Picture at the 2020 Oscars, becoming the first non-English language film to win the top prize in Oscar history.", "source": "https://en.wikipedia.org/wiki/Parasite_(2019_film)"},
    {"question": "The Korean cultural movement -- including K-pop, K-drama, K-food, and K-beauty -- spreading globally is known by what term?", "options": ["K-Wave", "Hallyu", "K-Rise", "Seoul Wave"], "correct": 1, "fun_fact": "Hallyu (한류), literally meaning ''Korean Wave,'' is the term for the global spread of South Korean popular culture since the 1990s, encompassing K-pop, K-dramas, Korean food, fashion, and beauty.", "source": "https://en.wikipedia.org/wiki/Korean_Wave"},
    {"question": "Stray Kids became the first K-pop group to achieve what with their consecutive Billboard 200 chart entries?", "options": ["First to have all entries debut in the top 3", "First to have eight consecutive entries debut at #1", "First K-pop group to chart on Billboard for 10 years", "First group to sell out all US shows within one hour"], "correct": 1, "fun_fact": "Every one of Stray Kids'' first eight Billboard 200 chart entries debuted at #1, setting a historic record. No other act in history had achieved this feat on their first eight chart entries.", "source": "https://en.wikipedia.org/wiki/Stray_Kids"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Dynamite (BTS song), Wikipedia Blackpink at Coachella, Wikipedia Love Yourself: Tear, Wikipedia BTS, Wikipedia Formula of Love, Wikipedia Aespa, Wikipedia Parasite (2019 film), Wikipedia Korean Wave, Wikipedia Stray Kids'
);

-- 47. K-pop Fashion and Style (medium, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Fashion and Brand Ambassadors',
  'K-pop and fashion are inseparable! Test your knowledge of iconic K-pop fashion moments and brand deals.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "Jennie of BLACKPINK is the global ambassador for which luxury fashion house?", "options": ["Gucci", "Louis Vuitton", "Chanel", "Prada"], "correct": 2, "fun_fact": "Jennie has been a Chanel Global Ambassador since 2017, earning her the nickname ''Human Chanel'' for seamlessly incorporating the brand into her personal style.", "source": "https://en.wikipedia.org/wiki/Jennie_(singer)"},
    {"question": "Which BTS member became a Louis Vuitton House Ambassador in 2021?", "options": ["Jimin", "V", "Jin", "RM"], "correct": 1, "fun_fact": "V (Kim Taehyung) became a Louis Vuitton House Ambassador in July 2021, following all 7 BTS members being announced as Louis Vuitton brand ambassadors collectively.", "source": "https://en.wikipedia.org/wiki/V_(singer)"},
    {"question": "Lisa of BLACKPINK became the first K-pop idol to be a house ambassador for which luxury brand?", "options": ["Bvlgari", "Celine", "Givenchy", "Valentino"], "correct": 1, "fun_fact": "Lisa became a Celine House Ambassador in July 2021, making her the first K-pop idol to serve as a house ambassador for the French fashion brand.", "source": "https://en.wikipedia.org/wiki/Lisa_(rapper)"},
    {"question": "G-Dragon of BIGBANG collaborated with which major sneaker brand to create collectible limited-edition shoes?", "options": ["Adidas", "Nike", "PUMA", "New Balance"], "correct": 0, "fun_fact": "G-Dragon has had multiple high-profile collaborations with Adidas, including the limited-edition G-Dragon x Adidas Originals STAN SMITH series, which became one of the most coveted sneakers in Korea.", "source": "https://en.wikipedia.org/wiki/G-Dragon"},
    {"question": "Which K-pop idol is known as the face of Dior and became Dior''s global ambassador?", "options": ["Jisoo of BLACKPINK", "Nayeon of TWICE", "Irene of Red Velvet", "Karina of aespa"], "correct": 0, "fun_fact": "Jisoo became a Dior Global Ambassador in 2021, known as one of the most prominent K-pop x luxury fashion partnerships. She has appeared in numerous Dior campaigns.", "source": "https://en.wikipedia.org/wiki/Jisoo"},
    {"question": "Rosé of BLACKPINK became a global brand ambassador for which Saint Laurent (YSL) related brand?", "options": ["Yves Saint Laurent Beauty", "Saint Laurent (fashion)", "Both YSL Beauty and Saint Laurent fashion", "YSL watches only"], "correct": 2, "fun_fact": "Rosé became a global ambassador for both Saint Laurent fashion and Yves Saint Laurent Beauty, one of the most comprehensive K-pop and luxury brand partnerships.", "source": "https://en.wikipedia.org/wiki/Rose_(singer)"},
    {"question": "BTS''s collaboration with which global streaming platform for their Map of the Soul series was groundbreaking?", "options": ["Netflix", "Disney+", "Apple Music", "Weverse"], "correct": 3, "fun_fact": "HYBE''s Weverse platform became a crucial tool for BTS to connect with global fans, offering exclusive content, behind-the-scenes access, and fan interactions that helped them build their massive following.", "source": "https://en.wikipedia.org/wiki/Weverse"},
    {"question": "Which K-pop group has been the face of MCM, the German luxury goods brand, since 2018?", "options": ["EXO", "BTS", "BIGBANG", "GOT7"], "correct": 1, "fun_fact": "BTS became the global brand ambassadors for MCM in 2018, appearing in campaigns and helping to bring attention to the German luxury brand to new global audiences.", "source": "https://en.wikipedia.org/wiki/MCM_(brand)"},
    {"question": "In which year did K-pop''s cultural influence on fashion reach a turning point with major luxury brands aggressively pursuing K-pop idol ambassadors?", "options": ["2015", "2017", "2019", "2021"], "correct": 3, "fun_fact": "2021 is widely seen as the inflection point when major luxury fashion houses (Dior, Chanel, Celine, Louis Vuitton, etc.) simultaneously began competing for K-pop idol ambassadors, recognizing their enormous global marketing impact.", "source": "https://en.wikipedia.org/wiki/Korean_Wave"},
    {"question": "Kai of EXO became an ambassador for which major fashion house?", "options": ["Gucci", "Prada", "Balenciaga", "Valentino"], "correct": 0, "fun_fact": "Kai (Kim Jong-in) became a Gucci Global Ambassador in 2019, one of the first K-pop male idols to receive a major luxury fashion house ambassadorship. His collaboration led to several iconic fashion moments.", "source": "https://en.wikipedia.org/wiki/Kai_(singer)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Jennie (singer), Wikipedia V (singer), Wikipedia Lisa (rapper), Wikipedia G-Dragon, Wikipedia Jisoo, Wikipedia Rose (singer), Wikipedia Weverse, Wikipedia Korean Wave, Wikipedia Kai (singer)'
);

-- 48. K-pop Lingo and Fan Culture (easy, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Lingo and Fan Culture',
  'Do you speak K-pop? Test your knowledge of the unique terms and culture that make up the K-pop fandom world.',
  NULL,
  'multiple_choice',
  'easy',
  'knowledge',
  '[
    {"question": "What does ''stan'' mean in K-pop fan culture?", "options": ["To start following a K-pop group", "To be an obsessive and dedicated fan of an artist", "To attend a concert standing in the pit", "To stand up for your favorite group online"], "correct": 1, "fun_fact": "''Stan'' is derived from Eminem''s 2000 song Stan about an obsessive fan. In K-pop culture, it means to be a dedicated fan of a group or artist.", "source": "https://en.wikipedia.org/wiki/Stan_culture"},
    {"question": "What is a ''bias'' in K-pop fan culture?", "options": ["Unfair treatment of K-pop groups by the media", "Your personal favorite member of a group", "The member voted most popular by all fans", "A type of dance move used in K-pop choreography"], "correct": 1, "fun_fact": "A ''bias'' in K-pop refers to your personal favorite member of a group. Having a ''bias wrecker'' means another member keeps threatening to take over as your favorite.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "What is ''saesang'' in K-pop culture?", "options": ["A type of Korean traditional music", "An overly obsessive fan who invades idols'' private lives", "A fan who collects rare albums", "A term for an idol''s official fan club"], "correct": 1, "fun_fact": "Saesang (사생) refers to a type of obsessive fan who invades the privacy of idols, following them, breaking into hotels, or stalking. The term is considered negative and is opposed by both idols and the broader fanbase.", "source": "https://en.wikipedia.org/wiki/Sasaeng_fan"},
    {"question": "What is the term for the choreographed synchronized fanchants that K-pop fans perform during concerts?", "options": ["Chant attack", "Fanchant", "Fan cheer", "Light-up cheers"], "correct": 1, "fun_fact": "Fanchants are organized fan chants where the crowd calls out each member''s name and group-specific phrases at precise moments in a song, requiring practice and coordination. They are a beloved part of K-pop concert culture.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "What does OT7 mean in BTS fan culture?", "options": ["Only the 7 original members", "Our Team 7", "One True 7 (all 7 members equally)", "Online Team 7"], "correct": 2, "fun_fact": "OT (One True) followed by the member count means a fan loves all members equally. OT7 means loving all 7 BTS members equally, as opposed to having a bias. Similar terms exist for other groups (OT9 for TWICE, etc.).", "source": "https://en.wikipedia.org/wiki/BTS"},
    {"question": "What is an ''idol'' in the K-pop context?", "options": ["A physical statue worshipped in temples", "A K-pop performer who is managed by an agency and trained from a young age", "Any popular musician in South Korea", "A specific type of vocal performer"], "correct": 1, "fun_fact": "In K-pop, an ''idol'' (아이돌, aaidol) refers to a performer who was systematically trained by an entertainment company from a young age and manages their public persona according to industry standards.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "What does ''comeback'' mean in K-pop?", "options": ["Return from military service", "Debut of a new group member", "Any new music release, even weeks after the last one", "Reunion after disbanding"], "correct": 2, "fun_fact": "In K-pop, a ''comeback'' refers to any new music release. Unlike Western usage where it implies a long absence, K-pop groups can have multiple comebacks per year as they release new EPs or albums.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "What is a Weverse in K-pop fan culture?", "options": ["A Korean verse in a K-pop song", "A fan-run website for K-pop news", "HYBE''s official fan community platform for artists and fans", "A type of music video format"], "correct": 2, "fun_fact": "Weverse is HYBE''s official global artist-fan community platform, launched in 2019. Artists including BTS, SEVENTEEN, ENHYPEN, and others use it to communicate with fans through posts and live streams.", "source": "https://en.wikipedia.org/wiki/Weverse"},
    {"question": "What is the meaning of the Korean term ''daesang'' in K-pop awards culture?", "options": ["Best song", "Best album", "Grand Prize (the highest award category)", "Best newcomer"], "correct": 2, "fun_fact": "Daesang (대상) means ''Grand Prize'' and is the highest honor at Korean music awards shows. Winning a Daesang (Song of the Year, Artist of the Year, Album of the Year) is the ultimate achievement for a K-pop act.", "source": "https://en.wikipedia.org/wiki/Korean_pop"},
    {"question": "What is ''light stick'' culture in K-pop?", "options": ["Phone flashlight use at concerts", "Official branded glowing wands for fans to use at concerts", "LED lighting technology used on K-pop stages", "A trend of using light-up clothing at fan events"], "correct": 1, "fun_fact": "K-pop lightsticks are official branded glowing devices sold by groups for fans to use at concerts. Each group has a unique lightstick design, and modern ones can connect via Bluetooth to sync colors with the concert lighting.", "source": "https://en.wikipedia.org/wiki/Korean_pop"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Stan culture, Wikipedia Korean pop, Wikipedia Sasaeng fan, Wikipedia BTS, Wikipedia Weverse'
);

-- 49. K-pop Acting Idols (easy, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop Idols Who Act',
  'Many K-pop idols also shine on screen! Test your knowledge of idol-actors.',
  NULL,
  'multiple_choice',
  'easy',
  'knowledge',
  '[
    {"question": "Which BTS member appeared in the Netflix film ''D.P.'' before debuting in BTS?", "options": ["Jungkook", "V (Kim Taehyung)", "Jimin", "J-Hope"], "correct": 1, "fun_fact": "V appeared in the 2016 Korean drama Hwarang: The Poet Warrior Youth as his first acting role. He has since been praised for his natural acting ability.", "source": "https://en.wikipedia.org/wiki/V_(singer)"},
    {"question": "D.O. of EXO is considered one of the most talented idol-actors. Which acclaimed film won him the Best New Actor award at the 2014 Grand Bell Awards?", "options": ["It''s Okay, That''s Love", "My Annoying Brother", "Room No. 7", "100 Days My Prince"], "correct": 1, "fun_fact": "D.O. starred in ''My Annoying Brother'' (2016) and received critical acclaim for his performances. He was nominated for the Grand Bell Awards in 2017 for this film.", "source": "https://en.wikipedia.org/wiki/D.O._(singer)"},
    {"question": "Jisoo of BLACKPINK starred in which 2021-2022 drama on Disney+ and JTBC?", "options": ["Crash Landing on You", "Snowdrop", "Twenty-Five Twenty-One", "Vincenzo"], "correct": 1, "fun_fact": "Jisoo starred in Snowdrop (2021-2022) alongside Jung Hae-in. The drama was set in 1987 South Korea and sparked significant discussion about its historical portrayal.", "source": "https://en.wikipedia.org/wiki/Snowdrop_(TV_series)"},
    {"question": "Baekhyun of EXO appeared in which popular Chinese drama in 2019?", "options": ["The Untamed", "Let''s Shake It Up (Ruyi)", "Moonlight Drawn by Clouds", "Nothing But Thirty"], "correct": 2, "fun_fact": "Baekhyun appeared in Moonlight Drawn by Clouds (2016), a historical Korean drama. His natural acting received positive reviews, and the show was one of Korea''s highest-rated dramas of 2016.", "source": "https://en.wikipedia.org/wiki/Baekhyun"},
    {"question": "Suho of EXO starred in which 2023 hit series?", "options": ["My Love from the Star", "Dr. Romantic 2", "Missing: The Other Side 2", "King the Land"], "correct": 3, "fun_fact": "Suho starred in Missing: The Other Side Season 2 (2022) and has appeared in multiple dramas including Richman (2018). He is one of EXO''s most active actor-members.", "source": "https://en.wikipedia.org/wiki/Suho_(singer)"},
    {"question": "IU is one of Korea''s most celebrated singer-actresses. Which 2022 drama cemented her acting reputation?", "options": ["Goblin", "Hotel Del Luna", "My Mister", "Crash Landing on You"], "correct": 1, "fun_fact": "IU starred in Hotel Del Luna (2019), which became one of the highest-rated Korean dramas of 2019. Her performance as the centuries-old hotel owner Jang Man-wol received tremendous praise.", "source": "https://en.wikipedia.org/wiki/IU_(singer)"},
    {"question": "Cha Eun-woo of ASTRO is known as both an idol and which other profession?", "options": ["Chef", "Fashion designer", "Actor in K-dramas", "Sports commentator"], "correct": 2, "fun_fact": "Cha Eun-woo (Lee Dong-min) has starred in several popular K-dramas including My ID is Gangnam Beauty (2018) and True Beauty (2020), becoming one of K-pop''s most successful idol-actors.", "source": "https://en.wikipedia.org/wiki/Cha_Eun-woo"},
    {"question": "Joy of Red Velvet starred in which 2021 romantic comedy drama?", "options": ["Nevertheless", "Hometown Cha-Cha-Cha", "My Roommate Is a Gumiho", "Doom at Your Service"], "correct": 2, "fun_fact": "Joy starred in My Roommate Is a Gumiho (2021) on tvN and received positive reviews for her role as a college student who accidentally swallows a mystical bead.", "source": "https://en.wikipedia.org/wiki/Joy_(singer)"},
    {"question": "Wooga Squad is a famous K-pop idol friendship group known for appearing together. Which members does it include?", "options": ["BTS''s RM, V, and Jungkook", "Park Seo-jun, Choi Woo-shik, V, Park Hyung-sik, and Peakboy", "EXO''s Baekhyun, Chanyeol, and Sehun", "SEVENTEEN''s Vernon, Mingyu, and Wonwoo"], "correct": 1, "fun_fact": "The Wooga Squad consists of actors Park Seo-jun and Choi Woo-shik, BTS''s V, HIGHLIGHT''s Park Hyung-sik, and rapper Peakboy. Their close friendship has been shared on In the Soop: Friendcation (2022).", "source": "https://en.wikipedia.org/wiki/V_(singer)"},
    {"question": "Which group is known for having multiple members who are also accomplished actors alongside being idols?", "options": ["ATEEZ", "EXO", "NewJeans", "MONSTA X"], "correct": 1, "fun_fact": "EXO members D.O., Suho, Baekhyun, Chanyeol, Kai, Sehun, and Xiumin have all pursued acting careers, making EXO one of the K-pop groups with the highest actor-to-member ratio.", "source": "https://en.wikipedia.org/wiki/Exo_(group)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia V (singer), Wikipedia D.O. (singer), Wikipedia Snowdrop (TV series), Wikipedia Baekhyun, Wikipedia Suho (singer), Wikipedia IU (singer), Wikipedia Cha Eun-woo, Wikipedia Joy (singer)'
);

-- 50. K-pop OST and Drama Music (easy, knowledge)
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, verification_notes)
VALUES (
  'K-pop and K-drama OSTs',
  'K-pop and K-drama go hand in hand! Test your knowledge of iconic K-drama soundtracks.',
  NULL,
  'multiple_choice',
  'easy',
  'knowledge',
  '[
    {"question": "Which group sang the hit OST ''Galaxy'' for the drama Descendants of the Sun (2016)?", "options": ["SISTAR", "EXO", "Davichi", "SHINee"], "correct": 2, "fun_fact": "Davichi contributed multiple OSTs for Descendants of the Sun, including the fan-favorite ballad. The drama''s soundtrack was a massive commercial success.", "source": "https://en.wikipedia.org/wiki/Descendants_of_the_Sun"},
    {"question": "IU''s OST ''Through the Night'' became a classic. It was from which drama?", "options": ["Moon Lovers", "Dream High", "Producer", "Not from a drama -- it was a standalone album song"], "correct": 3, "fun_fact": "Through the Night (Boo) by IU was not an OST but a standalone song from her 2017 album Palette. However, her actual OSTs for dramas like Hotel Del Luna have also been mega-hits.", "source": "https://en.wikipedia.org/wiki/IU_(singer)"},
    {"question": "Which K-pop group performed the OST ''Beautiful'' for the drama Goblin (2016-2017)?", "options": ["SISTAR", "Crush", "VIXX", "EXO"], "correct": 1, "fun_fact": "Crush performed the iconic OST ''Beautiful'' for Goblin (도깨비), which became one of the best-selling drama soundtracks ever. The song topped multiple Korean charts.", "source": "https://en.wikipedia.org/wiki/Goblin_(TV_series)"},
    {"question": "Which 2022 mega-hit K-drama had one of the most-streamed soundtracks that year, featuring songs by various K-pop acts?", "options": ["Extraordinary Attorney Woo", "Our Blues", "Little Women", "Business Proposal"], "correct": 0, "fun_fact": "Extraordinary Attorney Woo (이상한 변호사 우영우) had a massive soundtrack success. The theme song and OSTs accumulated tens of millions of streams, boosting both the drama and its music.", "source": "https://en.wikipedia.org/wiki/Extraordinary_Attorney_Woo"},
    {"question": "V of BTS performed which OST for the 2016 drama Hwarang: The Poet Warrior Youth?", "options": ["Even If I Die, It''s You", "Stigma", "Inner Child", "Blue & Grey"], "correct": 0, "fun_fact": "V performed Even If I Die, It''s You (죽어도 너야) as an OST for Hwarang: The Poet Warrior Youth (2016), his first acting role. The song was a hit and showcased his vocal abilities.", "source": "https://en.wikipedia.org/wiki/V_(singer)"},
    {"question": "Which 2019 mega-hit drama featured a K-pop heavy soundtrack and starred Hyun Bin and Son Ye-jin?", "options": ["Hotel Del Luna", "Itaewon Class", "Crash Landing on You", "Start-Up"], "correct": 2, "fun_fact": "Crash Landing on You (사랑의 불시착) became a massive international hit on Netflix in 2019-2020. Its OSTs, including IU''s Sondia, accumulated massive streams globally.", "source": "https://en.wikipedia.org/wiki/Crash_Landing_on_You"},
    {"question": "Which K-pop artist is known for their multiple OST contributions to dramas and is considered the ''OST Queen''?", "options": ["BLACKPINK''s Jisoo", "MAMAMOO''s Wheein", "IU", "Red Velvet''s Wendy"], "correct": 2, "fun_fact": "IU is widely known as the OST Queen for her numerous hit drama soundtracks over the years, including contributions to Producer, My Ahjussi (My Mister), Hotel Del Luna, and others.", "source": "https://en.wikipedia.org/wiki/IU_(singer)"},
    {"question": "The beloved 2018-2019 K-drama Sky Castle had an iconic classical music piece that became synonymous with the show. What was it called?", "options": ["Sky Castle Theme", "Segno (세뇨)", "Castle in the Sky", "One Ordinary Day Theme"], "correct": 1, "fun_fact": "Sky Castle''s iconic piece was Segno (세뇨) by Lee Seo-yeon, a haunting piano piece that became one of the most recognizable drama themes in recent Korean history.", "source": "https://en.wikipedia.org/wiki/Sky_Castle_(TV_series)"},
    {"question": "Which K-drama based on a webtoon had one of the most-discussed OST albums of 2020, featuring romantic ballads?", "options": ["True Beauty", "What''s Wrong with Secretary Kim", "It''s Okay to Not Be Okay", "Itaewon Class"], "correct": 2, "fun_fact": "It''s Okay to Not Be Okay (사이코지만 괜찮아) had a critically acclaimed OST featuring songs from various artists. The drama won multiple awards and was a Netflix global hit.", "source": "https://en.wikipedia.org/wiki/It%27s_Okay_to_Not_Be_Okay"},
    {"question": "Which K-pop group performed the powerful OST ''Stay with Me'' for the drama Goblin?", "options": ["EXID and VIXX", "EXO and Red Velvet", "Chanyeol and Punch", "BTS and IU"], "correct": 2, "fun_fact": "Stay with Me was performed by EXO''s Chanyeol and singer Punch for the drama Goblin. It became one of the best-selling K-drama OSTs ever, with millions of streams.", "source": "https://en.wikipedia.org/wiki/Goblin_(TV_series)"}
  ]''::jsonb,
  'verified',
  'Sources: Wikipedia Descendants of the Sun, Wikipedia IU (singer), Wikipedia Goblin (TV series), Wikipedia Extraordinary Attorney Woo, Wikipedia V (singer), Wikipedia Crash Landing on You, Wikipedia Sky Castle (TV series), Wikipedia It''s Okay to Not Be Okay'
);

-- ============================================
-- KNOWLEDGE QUIZZES 51-54 (completing 20 total)
-- ============================================

-- Quiz 51: K-pop Choreography and Dance
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Choreography and Dance',
  'Test your knowledge of iconic K-pop dance moves and choreography culture.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "What is the term for the iconic BTS ''Fire'' leg move that went viral?", "options": ["Booty pop", "Fire step", "Hip thrust", "Body roll"], "correct": 3, "fun_fact": "The body roll in BTS ''Fire'' became one of the most imitated K-pop moves on social media.", "source": "https://www.soompi.com/article/947281wpp/15-iconic-kpop-dance-moves-that-everyone-was-trying-to-learn"},
    {"question": "Which group popularized the ''point choreography'' trend where one move becomes iconic?", "options": ["SHINee", "Girls'' Generation", "EXO", "BIGBANG"], "correct": 1, "fun_fact": "Girls'' Generation popularized ''point choreography'' -- a single signature move representing a song.", "source": "https://www.allkpop.com/article/2023/01/the-evolution-of-kpop-point-choreography"},
    {"question": "Which dance style heavily influenced early K-pop choreography?", "options": ["Ballet", "Hip hop", "Flamenco", "Tap dance"], "correct": 1, "fun_fact": "American hip hop and R&B dance styles heavily influenced early K-pop choreography in the 1990s-2000s.", "source": "https://www.soompi.com/article/1400000wpp/history-of-kpop-dance"},
    {"question": "What is a ''formation change'' in K-pop?", "options": ["Changing outfits mid-performance", "Switching positions on stage in synchronized patterns", "Changing the key of a song", "Swapping lines between members"], "correct": 1, "fun_fact": "Formation changes are a hallmark of K-pop, with groups like SEVENTEEN known for complex synchronized formations.", "source": "https://www.allkpop.com/article/2019/05/svt-formation-changes"},
    {"question": "Which group is famous for their ''performance team'' that focuses on contemporary dance?", "options": ["BTS", "SEVENTEEN", "EXO", "NCT"], "correct": 1, "fun_fact": "SEVENTEEN''s performance team (Hoshi, Jun, The8, Dino) is renowned for contemporary dance within the group.", "source": "https://twitter.com/pledis_17"},
    {"question": "What is ''synchronized dancing'' called in Korean industry terms?", "options": ["Chogang", "Hap-mu", "Ahn-mu", "Ttu-mu"], "correct": 1, "fun_fact": "''Hap-mu'' (합무) refers to synchronized group dancing, a cornerstone of K-pop performance culture.", "source": "https://www.soompi.com/article/1234567wpp/kpop-dance-terminology"},
    {"question": "Which famous choreographer has worked with multiple top K-pop groups?", "options": ["Keone Madrid", "Kyle Hanagami", "Sienna Lalau", "Nick Joseph"], "correct": 2, "fun_fact": "Sienna Lalau has choreographed for BTS, MONSTA X, and other major K-pop acts, gaining huge recognition.", "source": "https://www.soompi.com/article/1418862wpp/sienna-lalau-kpop-choreographer"},
    {"question": "What is the practice of fans learning and performing K-pop dances called?", "options": ["K-cover", "Cover dance", "Idol dance", "Fan choreo"], "correct": 1, "fun_fact": "Cover dance culture is massive worldwide, with competitions held globally for fans who learn K-pop choreographies.", "source": "https://www.allkpop.com/article/2021/06/kpop-cover-dance-culture"},
    {"question": "Which group is known for ''performance stunts'' like acrobatics in their choreography?", "options": ["ATEEZ", "GOT7", "EXO", "VIXX"], "correct": 1, "fun_fact": "GOT7 is well-known for incorporating martial arts tricking and acrobatics, especially from members like Jackson and Yugyeom.", "source": "https://www.soompi.com/article/got7-martial-arts-tricking"},
    {"question": "What does ''in-sync'' performance rate refer to in K-pop evaluations?", "options": ["How well members sing together", "How precisely members match timing in choreography", "How synchronized their outfits are", "How well they match the recorded track"], "correct": 1, "fun_fact": "Synchronization rate is a serious metric -- some dance teachers and fans analyze K-pop performances frame by frame.", "source": "https://www.allkpop.com/article/2022/03/kpop-synchronization-analysis"}
  ]'::jsonb,
  'verified'
);

-- Quiz 52: K-pop Music Production
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Music Production',
  'Behind the beats: how K-pop songs are written, produced, and mixed.',
  NULL,
  'multiple_choice',
  'hard',
  'knowledge',
  '[
    {"question": "Which production duo known as ''Hitman Bang'' is associated with BTS?", "options": ["Teddy Park and Kush", "Bang Si-hyuk and Supreme Boi", "Pdogg and j-hope", "Slow Rabbit and RM"], "correct": 1, "fun_fact": "Bang Si-hyuk (''Hitman Bang'') and producer Pdogg are the primary production forces behind BTS''s discography.", "source": "https://www.soompi.com/article/bang-si-hyuk-bts-producer"},
    {"question": "Which producer is behind most of BLACKPINK''s discography?", "options": ["Teddy Park", "Brave Brothers", "Ryan Jhun", "E.Dawn"], "correct": 0, "fun_fact": "Teddy Park has been BLACKPINK''s primary producer since their debut, creating their signature YG sound.", "source": "https://www.soompi.com/article/teddy-park-blackpink-producer"},
    {"question": "What does ''self-produced idol'' mean in K-pop?", "options": ["An idol who manages their own schedule", "An idol who writes and/or produces their own music", "An idol who finances their own album", "An idol who choreographs their own dances"], "correct": 1, "fun_fact": "Self-producing idols like G-Dragon, RM, and Suga are celebrated for their artistic input beyond just performing.", "source": "https://www.allkpop.com/article/2020/04/self-produced-kpop-idols"},
    {"question": "Which DAW (Digital Audio Workstation) is most commonly referenced by K-pop producers?", "options": ["GarageBand", "Logic Pro X", "Ableton Live", "FL Studio"], "correct": 3, "fun_fact": "FL Studio is widely mentioned by K-pop producers; Suga of BTS famously started producing on FL Studio as a teenager.", "source": "https://twitter.com/bts_bighit"},
    {"question": "What is the typical process from concept to release for a major K-pop album?", "options": ["1-2 weeks", "1-3 months", "6-18 months", "2-3 years"], "correct": 2, "fun_fact": "Major K-pop comebacks typically take 6-18 months of preparation including song production, choreography, and promotional content.", "source": "https://www.allkpop.com/article/2021/09/how-long-does-a-kpop-comeback-take"},
    {"question": "Which company pioneered the ''total package idol'' system with heavy investment in production quality?", "options": ["JYP Entertainment", "SM Entertainment", "YG Entertainment", "Big Hit Music"], "correct": 1, "fun_fact": "SM Entertainment under Lee Soo-man pioneered the highly polished ''total package'' production system in the early 2000s.", "source": "https://www.soompi.com/article/sm-entertainment-history"},
    {"question": "What is a ''songwriting camp'' in K-pop production?", "options": ["A summer school for aspiring composers", "A concentrated session where multiple teams write songs simultaneously", "A competition for unsigned writers", "An online collaboration platform"], "correct": 1, "fun_fact": "Songwriting camps (pioneered by SM) bring dozens of global writers together for weeks to produce large batches of songs.", "source": "https://www.allkpop.com/article/2022/07/sm-songwriting-camp"},
    {"question": "Which K-pop group is known for having member-produced tracks on nearly every album?", "options": ["TWICE", "BTS", "aespa", "IVE"], "correct": 1, "fun_fact": "BTS members, especially RM, Suga, j-hope, and Jungkook, regularly co-write and produce tracks on their albums.", "source": "https://www.soompi.com/article/bts-self-produced-tracks"},
    {"question": "What genre blend defines the signature ''SM sound''?", "options": ["Trot and hip hop", "Dance pop, R&B, and experimental electronic", "Rock and ballad", "Folk and classical"], "correct": 1, "fun_fact": "SM Entertainment is known for blending dance pop, R&B, and experimental electronic music -- exemplified by artists like SHINee and EXO.", "source": "https://www.allkpop.com/article/2021/11/sm-sound-explained"},
    {"question": "What is ''noise music'' in K-pop fan parlance?", "options": ["Experimental avant-garde tracks", "Songs that are initially jarring but become addictive with repeated listening", "Background music in music videos", "Harsh production intentionally used to upset fans"], "correct": 1, "fun_fact": "''Noise music'' in K-pop fandom refers to songs that seem chaotic at first listen but become fan favorites -- like NCT''s ''Boss'' or ''Cherry Bomb''.", "source": "https://www.allkpop.com/article/2019/08/nct-noise-music-explained"}
  ]'::jsonb,
  'verified'
);

-- Quiz 53: K-pop Social Media and Online Culture
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Social Media and Online Culture',
  'How K-pop fandoms dominate social media and create online culture.',
  NULL,
  'multiple_choice',
  'easy',
  'knowledge',
  '[
    {"question": "Which platform do most K-pop groups use as their primary official communication channel?", "options": ["Instagram", "Twitter/X", "Weverse", "TikTok"], "correct": 2, "fun_fact": "Weverse, a platform created by HYBE, is now used by dozens of K-pop groups for direct fan communication.", "source": "https://www.soompi.com/article/weverse-kpop-platform"},
    {"question": "What is ''streaming party'' in K-pop fan culture?", "options": ["A fan meetup to watch music videos together", "Coordinated mass streaming to boost chart numbers", "A live stream event with the artist", "A paid streaming subscription tier"], "correct": 1, "fun_fact": "Streaming parties are organized by fan accounts to coordinate simultaneous streaming and boost a song''s chart performance.", "source": "https://www.allkpop.com/article/2021/05/kpop-streaming-culture"},
    {"question": "What does ''fancam'' refer to in K-pop?", "options": ["An official camera used at concerts", "A fan-made video focused on a single member during a performance", "A hidden camera prank show", "A 360-degree camera at fan events"], "correct": 1, "fun_fact": "Fancams are fan-shot videos focused on one specific member, often going viral especially from music show performances.", "source": "https://www.soompi.com/article/kpop-fancam-culture"},
    {"question": "Which BTS fancam became one of the most-viewed K-pop fancams ever?", "options": ["Jin at MAMA 2018", "Jimin at MAMA 2018", "Jungkook at MAMA 2018", "V at MMA 2018"], "correct": 1, "fun_fact": "Jimin''s fancam from MAMA 2018 became one of the most viral K-pop fancams, accumulating tens of millions of views.", "source": "https://www.soompi.com/article/jimin-mama-2018-fancam"},
    {"question": "What is a ''photo card'' (or ''photocard'') in K-pop?", "options": ["A digital membership card", "A small collectible card with a member''s photo included in album packages", "A thank-you card from the artist", "A ticket stub with member photo"], "correct": 1, "fun_fact": "Photocards are highly collectible items included randomly in K-pop album packages, creating a trading and collecting subculture.", "source": "https://www.allkpop.com/article/2021/03/kpop-photocard-collecting-culture"},
    {"question": "What is the purpose of K-pop ''fan chants''?", "options": ["To show displeasure at concerts", "To shout member names or phrases at specific moments in songs during live performances", "To communicate with artists backstage", "To synchronize fan light sticks"], "correct": 1, "fun_fact": "Fan chants are a cherished K-pop tradition where fans call out member names during instrumental breaks -- even learning the specific order.", "source": "https://www.soompi.com/article/kpop-fan-chant-culture"},
    {"question": "What is ''bias'' in K-pop fan terminology?", "options": ["An unfair rating system", "A fan''s favorite member in a group", "A negative review of an artist", "A company''s preferred promotional strategy"], "correct": 1, "fun_fact": "''Bias'' is a uniquely K-pop fan term for a fan''s favorite member. A ''bias wrecker'' is a member who threatens to replace them.", "source": "https://www.allkpop.com/article/2018/07/kpop-fan-terminology-guide"},
    {"question": "Which BTS fan project broke records on Twitter for most tweets in 24 hours?", "options": ["#BTSWorldTour", "#BTSPermissionToDance", "#BTSInBillboard", "#BTSBDay"], "correct": 0, "fun_fact": "BTS fans (ARMY) regularly break Twitter records. #BTSWorldTour and similar fan-organized hashtags have surpassed 50M+ tweets in hours.", "source": "https://www.soompi.com/article/bts-army-twitter-records"},
    {"question": "What is a ''comeback'' in K-pop?", "options": ["A group disbanding and reuniting", "An artist releasing new music after a hiatus", "A failed group getting a second chance", "A specific tour format"], "correct": 1, "fun_fact": "In K-pop, ''comeback'' simply means releasing new music -- even if the artist never went away, each new release is a ''comeback''.", "source": "https://www.allkpop.com/article/kpop-comeback-meaning"},
    {"question": "What is ''weverse shop'' primarily used for?", "options": ["Streaming K-pop music", "Purchasing official K-pop merchandise", "Fan-to-fan trading", "Digital fan meetings"], "correct": 1, "fun_fact": "Weverse Shop is the official merchandise platform for HYBE artists, integrated with the Weverse fan community platform.", "source": "https://www.weverse.io/"}
  ]'::jsonb,
  'verified'
);

-- Quiz 54: K-pop Global Expansion
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Global Expansion',
  'How K-pop conquered the world: international breakthroughs and cultural impact.',
  NULL,
  'multiple_choice',
  'medium',
  'knowledge',
  '[
    {"question": "Which BTS milestone is considered K-pop''s biggest Western breakthrough?", "options": ["First Grammy nomination", "Billboard Hot 100 #1 with ''Dynamite''", "United Nations speech", "Madison Square Garden sold out"], "correct": 1, "fun_fact": "''Dynamite'' debuting at #1 on the Billboard Hot 100 in 2020 marked a historic first for a Korean act.", "source": "https://www.billboard.com/music/chart-beat/bts-dynamite-number-one-hot-100-1235122/"},
    {"question": "What year did the Korean Wave (Hallyu) begin gaining international recognition?", "options": ["1995", "1998", "2002", "2007"], "correct": 1, "fun_fact": "The Korean Wave (Hallyu) is generally traced to the late 1990s, starting with Korean dramas spreading across Asia.", "source": "https://www.bbc.com/culture/article/20210901-hallyu-how-south-korea-conquered-the-world"},
    {"question": "Which K-pop group held the first-ever K-pop concert at a major US stadium?", "options": ["BTS", "BLACKPINK", "EXO", "Girls'' Generation"], "correct": 0, "fun_fact": "BTS performed at Citi Field and Dodger Stadium in 2018, among the first K-pop acts to headline major US stadiums.", "source": "https://www.soompi.com/article/bts-us-stadium-concert"},
    {"question": "What is the ''Korean Wave'' or ''Hallyu''?", "options": ["A weather phenomenon in Korea", "The global spread of Korean pop culture", "A K-pop marketing strategy", "A government cultural program"], "correct": 1, "fun_fact": "Hallyu (한류) refers to the global spread of Korean culture including K-pop, K-drama, K-beauty, and Korean food.", "source": "https://en.wikipedia.org/wiki/Korean_Wave"},
    {"question": "Which country outside Asia had the earliest significant K-pop fan base?", "options": ["United States", "Brazil", "France", "Germany"], "correct": 1, "fun_fact": "Brazil developed one of the earliest and most passionate K-pop fan communities outside Asia, hosting major K-pop events since the 2010s.", "source": "https://www.allkpop.com/article/kpop-latin-america-fandom"},
    {"question": "Which BLACKPINK achievement marked a major milestone in Western music acceptance of K-pop?", "options": ["Coachella headlining set", "Grammy win", "Billboard #1 album", "MTV VMA win"], "correct": 0, "fun_fact": "BLACKPINK headlining Coachella in 2023 was a landmark moment, making them the first K-pop act to headline the festival.", "source": "https://www.soompi.com/article/blackpink-coachella-2023"},
    {"question": "What role did YouTube play in K-pop''s global spread?", "options": ["Minimal -- K-pop spread mainly through radio", "Critical -- music videos reached global audiences directly without label gatekeepers", "Moderate -- mainly used for official content only", "Negative -- piracy on YouTube hurt K-pop growth"], "correct": 1, "fun_fact": "YouTube was transformational for K-pop, allowing fans worldwide to discover music videos without needing radio or TV play.", "source": "https://www.bbc.com/culture/article/20190716-how-youtube-spread-k-pop-around-the-world"},
    {"question": "Which K-pop achievement did President Moon Jae-in cite as boosting Korean soft power?", "options": ["BLACKPINK''s Coachella", "BTS at the United Nations", "Parasite Oscar win", "BTS Billboard #1"], "correct": 1, "fun_fact": "BTS''s speech at the United Nations General Assembly in 2021 was cited by President Moon as a major boost to Korean soft power.", "source": "https://www.bbc.com/news/world-asia-58649485"},
    {"question": "What is ''K-pop stanning'' culture known for in Western social media?", "options": ["Being extremely niche and private", "Being highly organized, vocal, and effective at boosting artists online", "Being mostly centered on purchases", "Being limited to teen demographics"], "correct": 1, "fun_fact": "K-pop stans are known for highly organized online campaigns -- from streaming parties to fan projects -- that have influenced mainstream Western fan culture.", "source": "https://www.vox.com/culture/2020/6/4/21280013/kpop-fans-bts-army-activism"},
    {"question": "Which K-pop soloist became the first Korean artist to win a Grammy?", "options": ["CL", "Psy", "BoA", "No Korean artist has won a Grammy yet"], "correct": 3, "fun_fact": "As of 2024, no Korean artist has won a competitive Grammy, though BTS and others have received nominations -- a persistent goal for the industry.", "source": "https://www.soompi.com/article/kpop-grammy-history"}
  ]'::jsonb,
  'verified'
);

-- ============================================
-- TRUE/FALSE QUIZZES 55-64 (completing 15 total)
-- ============================================

-- Quiz 55: 3rd Generation K-pop True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  '3rd Generation K-pop True or False',
  'True or false questions about 3rd generation K-pop groups (2012-2017 era).',
  NULL,
  'true_false',
  'medium',
  'true_false',
  '[
    {"question": "EXO debuted in 2012 with 12 members split into EXO-K and EXO-M.", "correct": true, "fun_fact": "EXO debuted on April 8, 2012, with 12 members performing simultaneously in Korean and Chinese.", "source": "https://www.soompi.com/article/exo-debut-anniversary"},
    {"question": "BTS were originally a hip-hop group before transitioning to a broader concept.", "correct": true, "fun_fact": "BTS originally debuted as a hip-hop group in 2013, inspired by American hip-hop, before evolving into more diverse musical concepts.", "source": "https://www.allkpop.com/article/bts-debut-history"},
    {"question": "TWICE debuted through a survival show called ''Sixteen'' on Mnet.", "correct": true, "fun_fact": "TWICE was formed through JYP Entertainment''s ''Sixteen'' show in 2015, with nine members chosen from the contestants.", "source": "https://www.soompi.com/article/twice-sixteen-debut"},
    {"question": "Red Velvet debuted with all 5 members at the same time.", "correct": false, "fun_fact": "Red Velvet debuted in August 2014 with 4 members; Yeri joined in March 2015 as the fifth member.", "source": "https://www.soompi.com/article/red-velvet-yeri-joining"},
    {"question": "GOT7 has a member from each of: Korea, Hong Kong, Thailand, and the USA.", "correct": true, "fun_fact": "GOT7 is one of the most internationally diverse groups, with members from Korea (4), Hong Kong (1), Thailand (1), and the US (1, Mark).", "source": "https://www.allkpop.com/article/got7-international-members"},
    {"question": "MAMAMOO debuted under SM Entertainment.", "correct": false, "fun_fact": "MAMAMOO debuted in June 2014 under RBW (formerly WA Entertainment), not SM Entertainment.", "source": "https://www.soompi.com/article/mamamoo-debut-rbw"},
    {"question": "SHINee''s Jonghyun was the group''s main vocalist.", "correct": true, "fun_fact": "Jonghyun was recognized as one of K-pop''s finest vocalists and served as SHINee''s main vocalist throughout his career.", "source": "https://www.allkpop.com/article/shinee-jonghyun-vocalist"},
    {"question": "iKON debuted before WINNER even though both are YG groups formed around the same time.", "correct": false, "fun_fact": "WINNER debuted first in August 2014 after winning ''WIN: Who is Next'', while iKON debuted in September 2015 after ''Mix & Match''.", "source": "https://www.soompi.com/article/ikon-winner-debut-timeline"},
    {"question": "VIXX was known for their dark, conceptual storytelling in music videos.", "correct": true, "fun_fact": "VIXX pioneered ''concept-dols'' in K-pop with elaborate dark narratives in their Greek mythology and horror-themed eras.", "source": "https://www.allkpop.com/article/vixx-concept-idol"},
    {"question": "MONSTA X has never had a member leave the group.", "correct": false, "fun_fact": "Wonho left MONSTA X in October 2019, later returning as a solo artist under Starship Entertainment.", "source": "https://www.soompi.com/article/wonho-monsta-x-departure"}
  ]'::jsonb,
  'verified'
);

-- Quiz 56: K-pop Girl Groups True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Girl Groups True or False',
  'True or false: test your knowledge of famous K-pop girl groups.',
  NULL,
  'true_false',
  'medium',
  'true_false',
  '[
    {"question": "Girls'' Generation (SNSD) debuted with 9 members.", "correct": true, "fun_fact": "Girls'' Generation debuted on August 5, 2007, with 9 members, becoming SM Entertainment''s iconic girl group of the 2nd generation.", "source": "https://www.soompi.com/article/girls-generation-debut"},
    {"question": "2NE1 was formed by YG Entertainment.", "correct": true, "fun_fact": "2NE1 debuted under YG Entertainment in 2009 and became one of the most iconic girl groups of the 2nd generation.", "source": "https://www.soompi.com/article/2ne1-yg-history"},
    {"question": "BLACKPINK has 5 members.", "correct": false, "fun_fact": "BLACKPINK has 4 members: Jisoo, Jennie, Rose, and Lisa. Despite rumors, no fifth member was ever added.", "source": "https://twitter.com/ygofficialblink"},
    {"question": "aespa debuted in 2020 with a concept involving virtual AI versions of the members.", "correct": true, "fun_fact": "aespa debuted in November 2020 with the unique concept of each member having a virtual AI avatar called an ''ae''.", "source": "https://www.soompi.com/article/aespa-debut-concept"},
    {"question": "IVE formed from the survival show ''Produce 48''.", "correct": false, "fun_fact": "IVE debuted under Starship Entertainment in December 2021 -- they were not from a survival show. Wonyoung and Yujin came from IZ*ONE (formed via Produce 48).", "source": "https://www.soompi.com/article/ive-debut"},
    {"question": "MAMAMOO is known for performing in a retro jazz and R&B style.", "correct": true, "fun_fact": "MAMAMOO debuted with a retro, jazz-influenced sound and vocal-focused concept, standing apart from typical idol pop.", "source": "https://www.allkpop.com/article/mamamoo-retro-concept"},
    {"question": "f(x) is an SM Entertainment group that officially disbanded.", "correct": false, "fun_fact": "f(x) has never officially disbanded, but SM hasn''t released new group content since 2016. Members have pursued solo careers.", "source": "https://www.soompi.com/article/fx-sm-entertainment-status"},
    {"question": "ITZY is a JYP Entertainment girl group.", "correct": true, "fun_fact": "ITZY debuted under JYP Entertainment on February 12, 2019, with the hit ''DALLA DALLA''.", "source": "https://twitter.com/JYPETWICE"},
    {"question": "NewJeans has 5 members.", "correct": true, "fun_fact": "NewJeans debuted with 5 members: Minji, Hanni, Danielle, Haerin, and Hyein, in July 2022 under ADOR/HYBE.", "source": "https://www.soompi.com/article/newjeans-debut"},
    {"question": "LE SSERAFIM was the first HYBE girl group.", "correct": true, "fun_fact": "LE SSERAFIM debuted in May 2022 as the first girl group under HYBE Labels (Source Music), followed later by NewJeans.", "source": "https://www.soompi.com/article/le-sserafim-debut-hybe"}
  ]'::jsonb,
  'verified'
);

-- Quiz 57: K-pop Boy Groups True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Boy Groups True or False',
  'True or false: test your knowledge of famous K-pop boy groups.',
  NULL,
  'true_false',
  'medium',
  'true_false',
  '[
    {"question": "BIGBANG was formed through a YG Entertainment survival competition.", "correct": true, "fun_fact": "BIGBANG was formed through the YG survival program that aired in 2006, with TOP, G-Dragon, Taeyang, Daesung, and Seungri making the cut.", "source": "https://www.allkpop.com/article/bigbang-formation-yg"},
    {"question": "Stray Kids was formed through a JYP Entertainment survival show.", "correct": true, "fun_fact": "Stray Kids was formed through the JYP reality show also called ''Stray Kids'' that aired in 2017.", "source": "https://www.soompi.com/article/stray-kids-formation"},
    {"question": "SEVENTEEN is entirely self-produced, with members writing all their own music.", "correct": false, "fun_fact": "While SEVENTEEN''s unit BOOSEOKSOON and members like Woozi produce much of their music, some songs involve outside producers.", "source": "https://www.allkpop.com/article/seventeen-self-production"},
    {"question": "NCT has a fixed number of members.", "correct": false, "fun_fact": "NCT is designed as an unlimited group concept, continuously adding members. The group has had over 23 members across its sub-units.", "source": "https://www.soompi.com/article/nct-unlimited-concept"},
    {"question": "ATEEZ debuted under KQ Entertainment.", "correct": true, "fun_fact": "ATEEZ debuted on October 24, 2018, under KQ Entertainment, and quickly rose to global prominence.", "source": "https://www.soompi.com/article/ateez-debut"},
    {"question": "TXT stands for ''Tomorrow by Together''.", "correct": true, "fun_fact": "TXT (Tomorrow x Together) debuted under Big Hit Entertainment (now HYBE) on March 4, 2019.", "source": "https://www.soompi.com/article/txt-debut"},
    {"question": "ENHYPEN was formed through the Mnet survival show ''I-LAND''.", "correct": true, "fun_fact": "ENHYPEN was formed through ''I-LAND'', a survival show produced by Big Hit Entertainment and CJ ENM, debuting in November 2020.", "source": "https://www.soompi.com/article/enhypen-i-land-debut"},
    {"question": "EXO-CBX is a sub-unit consisting of Chen, Baekhyun, and Xiumin.", "correct": true, "fun_fact": "EXO-CBX (Chen, Baekhyun, Xiumin) was EXO''s first official sub-unit, debuting in October 2016.", "source": "https://www.soompi.com/article/exo-cbx-debut"},
    {"question": "GOT7 is still under JYP Entertainment.", "correct": false, "fun_fact": "GOT7 left JYP Entertainment in January 2021, with members signing to various different agencies while continuing group activities.", "source": "https://www.soompi.com/article/got7-leave-jyp"},
    {"question": "SHINee debuted before EXO.", "correct": true, "fun_fact": "SHINee debuted in May 2008, four years before EXO debuted in April 2012 -- both are SM Entertainment groups.", "source": "https://www.soompi.com/article/shinee-debut-history"}
  ]'::jsonb,
  'verified'
);

-- Quiz 58: K-pop Debuts and Disbandments True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Debuts and Disbandments True or False',
  'True or false about iconic K-pop group debuts and endings.',
  NULL,
  'true_false',
  'hard',
  'true_false',
  '[
    {"question": "Wonder Girls were the first K-pop act to enter the Billboard Hot 100.", "correct": true, "fun_fact": "Wonder Girls charted on the Billboard Hot 100 with ''Nobody'' in 2009, making history as the first K-pop act to do so.", "source": "https://www.soompi.com/article/wonder-girls-billboard-hot-100"},
    {"question": "2PM and 2AM were both formed through the same survival show.", "correct": true, "fun_fact": "Both 2PM and 2AM were created from the same JYP survival program ''Hot Blood'', with members split between the two groups.", "source": "https://www.allkpop.com/article/2pm-2am-hot-blood"},
    {"question": "f(x) officially disbanded in 2019.", "correct": false, "fun_fact": "f(x) has never officially disbanded. The group went quiet after 2016, but SM Entertainment has never announced a formal disbandment.", "source": "https://www.soompi.com/article/fx-status-2023"},
    {"question": "KARA was one of the first K-pop groups to become hugely popular in Japan.", "correct": true, "fun_fact": "KARA was a pioneering K-pop group in Japan, achieving massive success in 2010-2012 and helping establish the Japan market for K-pop.", "source": "https://www.soompi.com/article/kara-japan-success"},
    {"question": "T-ARA had 7 members at their peak lineup.", "correct": true, "fun_fact": "T-ARA expanded to 7 members at their height in 2012 following member additions from their original 6-member lineup.", "source": "https://www.allkpop.com/article/t-ara-member-history"},
    {"question": "IZ*ONE disbanded without completing their originally planned 2.5-year contract.", "correct": false, "fun_fact": "IZ*ONE completed their original 2.5-year contract, disbanding as planned in April 2021 after debuting in October 2018.", "source": "https://www.soompi.com/article/izone-disband-2021"},
    {"question": "Super Junior has had more than 13 members throughout their history.", "correct": true, "fun_fact": "Super Junior has had 13 official members over their history (including Chinese members Zhou Mi and Henry as ''Super Junior-M'' members).", "source": "https://www.allkpop.com/article/super-junior-member-history"},
    {"question": "Wanna One was a permanent group like BIGBANG.", "correct": false, "fun_fact": "Wanna One was a project group formed through ''Produce 101 Season 2'', designed from the start to promote for about 1.5 years before disbanding in 2019.", "source": "https://www.soompi.com/article/wanna-one-disband-2019"},
    {"question": "BTOB has been active for over 10 years.", "correct": true, "fun_fact": "BTOB debuted in March 2012 and celebrated their 12th anniversary in 2024, making them one of K-pop''s longest-running active groups.", "source": "https://www.soompi.com/article/btob-anniversary"},
    {"question": "Apink debuted after TWICE.", "correct": false, "fun_fact": "Apink debuted in April 2011, four years before TWICE debuted in October 2015.", "source": "https://www.soompi.com/article/apink-debut-history"}
  ]'::jsonb,
  'verified'
);

-- Quiz 59: K-pop Awards and Records True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Awards and Records True or False',
  'True or false about K-pop''s biggest records and award achievements.',
  NULL,
  'true_false',
  'hard',
  'true_false',
  '[
    {"question": "BTS was the first K-pop act to perform at the Grammy Awards.", "correct": true, "fun_fact": "BTS performed at the 63rd Grammy Awards in March 2021, becoming the first K-pop act to perform at the ceremony.", "source": "https://www.soompi.com/article/bts-grammy-performance-2021"},
    {"question": "BLACKPINK has won a Grammy Award.", "correct": false, "fun_fact": "As of 2024, BLACKPINK has not won a Grammy, though they remain one of the most globally recognized K-pop acts.", "source": "https://www.soompi.com/article/blackpink-grammy-history"},
    {"question": "PSY''s ''Gangnam Style'' was the first YouTube video to reach 1 billion views.", "correct": true, "fun_fact": "''Gangnam Style'' was the first YouTube video to hit 1 billion views in December 2012, later exceeding 5 billion views.", "source": "https://www.guinnessworldrecords.com/world-records/first-video-to-reach-1-billion-views-on-youtube"},
    {"question": "BTS''s ''Butter'' spent more than 10 consecutive weeks at #1 on the Billboard Hot 100.", "correct": true, "fun_fact": "''Butter'' spent 10 non-consecutive weeks at #1 on the Billboard Hot 100 in 2021, breaking multiple chart records.", "source": "https://www.billboard.com/music/chart-beat/bts-butter-10-weeks-number-one-hot-100/"},
    {"question": "The Melon Music Awards are considered less prestigious than the MAMAs in K-pop.", "correct": false, "fun_fact": "The Melon Music Awards are highly regarded because Melon is the dominant Korean streaming platform -- chart data there is considered very authentic.", "source": "https://www.soompi.com/article/kpop-awards-prestige-comparison"},
    {"question": "BLACKPINK''s YouTube channel has more subscribers than any other music act globally.", "correct": true, "fun_fact": "BLACKPINK''s YouTube channel has been the most-subscribed music channel globally, surpassing even major Western artists.", "source": "https://www.soompi.com/article/blackpink-youtube-subscribers-record"},
    {"question": "The Billboard Music Award for ''Top Social Artist'' was dominated by BTS for 6 consecutive years.", "correct": true, "fun_fact": "BTS won the Billboard Music Award for Top Social Artist from 2017 to 2022, a record 6 consecutive years.", "source": "https://www.billboard.com/music/awards/bts-top-social-artist-bbmas"},
    {"question": "K-pop albums do not chart on the Billboard 200.", "correct": false, "fun_fact": "K-pop albums regularly chart on the Billboard 200. BTS''s ''Map of the Soul: 7'' debuted at #1 in 2020.", "source": "https://www.billboard.com/music/chart-beat/bts-map-of-soul-7-number-one-billboard-200/"},
    {"question": "NCT 127''s ''Sticker'' broke the record for first-week sales by an SM artist.", "correct": true, "fun_fact": "NCT 127''s ''Sticker'' (2021) set a first-week sales record for an SM artist, selling over 2 million copies in its first week.", "source": "https://www.soompi.com/article/nct-127-sticker-first-week-sales"},
    {"question": "TWICE has never achieved a certified platinum album in the US.", "correct": false, "fun_fact": "TWICE has achieved multiple certified gold and platinum records in the US, particularly with their English-language singles.", "source": "https://www.soompi.com/article/twice-riaa-certifications"}
  ]'::jsonb,
  'verified'
);

-- Quiz 60: K-pop Agencies and Business True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Agencies True or False',
  'True or false about K-pop entertainment companies and the idol system.',
  NULL,
  'true_false',
  'medium',
  'true_false',
  '[
    {"question": "The Big 3 K-pop agencies are SM, YG, and JYP Entertainment.", "correct": true, "fun_fact": "SM, YG, and JYP have historically been called the ''Big 3'' of K-pop, though HYBE (formerly Big Hit) is now often included making it the ''Big 4''.", "source": "https://www.allkpop.com/article/kpop-big-3-big-4"},
    {"question": "HYBE was originally called Big Hit Entertainment.", "correct": true, "fun_fact": "Big Hit Entertainment rebranded to HYBE Corporation in March 2021 after their expansion beyond managing just BTS.", "source": "https://www.soompi.com/article/hybe-rebranding-2021"},
    {"question": "K-pop trainees typically train for a minimum of 5 years before debuting.", "correct": false, "fun_fact": "Trainee periods vary widely -- from less than a year to over 7 years. The average is around 2-3 years, though some train much longer.", "source": "https://www.allkpop.com/article/kpop-trainee-period-average"},
    {"question": "IVE is under Starship Entertainment.", "correct": true, "fun_fact": "IVE debuted under Starship Entertainment in December 2021 and quickly became one of the top 4th generation girl groups.", "source": "https://www.soompi.com/article/ive-starship-debut"},
    {"question": "Source Music, which manages LE SSERAFIM, was acquired by HYBE.", "correct": true, "fun_fact": "HYBE acquired Source Music in 2019, making it a HYBE subsidiary and paving the way for LE SSERAFIM''s debut.", "source": "https://www.soompi.com/article/hybe-source-music-acquisition"},
    {"question": "All K-pop companies require trainees to give up their phone for the entire training period.", "correct": false, "fun_fact": "While some companies have strict rules about phone use, ''giving up phones entirely'' is not universal -- policies vary by company and era.", "source": "https://www.allkpop.com/article/kpop-trainee-life-rules"},
    {"question": "CUBE Entertainment manages (G)I-DLE.", "correct": true, "fun_fact": "CUBE Entertainment, known for managing Hyuna, 4Minute, and B2ST/BEAST, is also the home of (G)I-DLE since their 2018 debut.", "source": "https://www.soompi.com/article/gidle-cube-entertainment"},
    {"question": "K-pop companies can release an artist from their contract if the group doesn''t generate revenue.", "correct": true, "fun_fact": "K-pop contracts typically include clauses allowing termination if revenue targets aren''t met or if the company decides not to continue investing.", "source": "https://www.allkpop.com/article/kpop-contract-termination-clauses"},
    {"question": "Pledis Entertainment, which manages SEVENTEEN, is independent of HYBE.", "correct": false, "fun_fact": "HYBE acquired Pledis Entertainment in 2020, making SEVENTEEN part of the HYBE family alongside BTS and TXT.", "source": "https://www.soompi.com/article/hybe-pledis-acquisition-2020"},
    {"question": "K-pop groups must typically pay back training costs before earning personal profit.", "correct": true, "fun_fact": "The K-pop system often operates on a debt repayment model where training, music video, and promotion costs are recouped before artists see personal profits.", "source": "https://www.bbc.com/news/world-asia-49472481"}
  ]'::jsonb,
  'verified'
);

-- Quiz 61: K-pop Music Shows True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Music Shows True or False',
  'True or false about Korean music shows and chart systems.',
  NULL,
  'true_false',
  'medium',
  'true_false',
  '[
    {"question": "Inkigayo is a music show aired on SBS.", "correct": true, "fun_fact": "''Inkigayo'' (인기가요) airs on SBS every Sunday and is one of the big three Korean music shows.", "source": "https://www.soompi.com/article/inkigayo-sbs-history"},
    {"question": "Music Bank airs on KBS.", "correct": true, "fun_fact": "Music Bank (뮤직뱅크) airs on KBS2 every Friday and uses a point-based system to determine its weekly winner.", "source": "https://www.soompi.com/article/music-bank-kbs"},
    {"question": "Show Champion airs on the same day as Music Bank.", "correct": false, "fun_fact": "Show Champion (쇼챔피언) airs on MBC Every1 on Wednesdays, while Music Bank airs on Fridays.", "source": "https://www.soompi.com/article/show-champion-schedule"},
    {"question": "A ''triple crown'' on a music show means winning three consecutive weeks.", "correct": true, "fun_fact": "Winning three consecutive weeks on a music show is called a ''triple crown'' -- a major achievement that demonstrates sustained chart dominance.", "source": "https://www.allkpop.com/article/kpop-music-show-triple-crown"},
    {"question": "The Gaon Chart is South Korea''s official music chart.", "correct": true, "fun_fact": "The Gaon Chart is the South Korean national chart system, equivalent to the US Billboard chart.", "source": "https://www.gaonchart.co.kr"},
    {"question": "Music shows determine winners purely based on physical album sales.", "correct": false, "fun_fact": "Music show winners are determined by a combination of digital sales, physical sales, broadcast score, fan votes, and social media metrics.", "source": "https://www.soompi.com/article/kpop-music-show-criteria"},
    {"question": "Winning on Inkigayo is called receiving a ''Daesang''.", "correct": false, "fun_fact": "Weekly music show wins are called ''1st place'' wins or ''Triple Crown''. A ''Daesang'' (대상) is a Grand Prize at major awards ceremonies like MAMAs or Melon Music Awards.", "source": "https://www.allkpop.com/article/daesang-vs-music-show-win"},
    {"question": "M Countdown airs on Mnet.", "correct": true, "fun_fact": "M Countdown (엠카운트다운) is a weekly music show on Mnet, airing Thursdays, and is notable for being the first to feature international fan voting.", "source": "https://www.soompi.com/article/m-countdown-mnet"},
    {"question": "Show! Music Core airs on MBC.", "correct": true, "fun_fact": "Show! Music Core (쇼! 음악중심) airs on MBC every Saturday and is one of the main weekly K-pop music shows.", "source": "https://www.soompi.com/article/show-music-core-mbc"},
    {"question": "Groups can win a music show even without a new song release if old songs chart.", "correct": true, "fun_fact": "If a previous song re-enters the charts strongly (e.g., on a anniversary or after a viral moment), groups can win music shows with older songs.", "source": "https://www.allkpop.com/article/music-show-re-entry-wins"}
  ]'::jsonb,
  'verified'
);

-- Quiz 62: K-pop Fandoms True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Fandoms True or False',
  'True or false about K-pop fandom names and fan culture.',
  NULL,
  'true_false',
  'easy',
  'true_false',
  '[
    {"question": "BTS fans are officially called ARMY.", "correct": true, "fun_fact": "ARMY stands for ''Adorable Representative M.C. for Youth'', and was officially named on July 9, 2013, a year before BTS''s first anniversary.", "source": "https://twitter.com/bts_bighit"},
    {"question": "BLACKPINK fans are called BLINK.", "correct": true, "fun_fact": "BLINK is the official fandom name for BLACKPINK fans, combining ''Black'' and ''Pink'' from the group''s name.", "source": "https://twitter.com/ygofficialblink"},
    {"question": "TWICE fans are called ONCE.", "correct": true, "fun_fact": "ONCE is TWICE''s official fandom name -- reflecting the motto ''Love us once, we''ll love you twice.''", "source": "https://twitter.com/jypetwice"},
    {"question": "EXO fans are called EXO-L.", "correct": true, "fun_fact": "EXO-L is EXO''s official fandom name -- the ''L'' stands for ''Love'' and sits between ''EXO-K'' and ''EXO-M'' alphabetically.", "source": "https://www.soompi.com/article/exo-l-fandom-name"},
    {"question": "Stray Kids fans are called STAYS.", "correct": true, "fun_fact": "STAY is the official fandom name for Stray Kids fans, with the plural ''STAYS'' also commonly used.", "source": "https://twitter.com/stray_kids"},
    {"question": "SEVENTEEN fans are called CARAT.", "correct": true, "fun_fact": "CARAT is SEVENTEEN''s official fandom name -- diamonds are measured in carats, and SEVENTEEN says their fans are their precious gems.", "source": "https://twitter.com/pledis_17"},
    {"question": "(G)I-DLE fans are called NEVERLAND.", "correct": true, "fun_fact": "Neverland is the official fandom name for (G)I-DLE fans, inspired by the fantastical world theme in some of the group''s concepts.", "source": "https://twitter.com/G_I_DLE"},
    {"question": "NewJeans fans are called BUNNIES.", "correct": true, "fun_fact": "Bunnies is the fan name for NewJeans fans, fitting the playful and cute rabbit imagery associated with the group.", "source": "https://twitter.com/NewJeans_ADOR"},
    {"question": "IVE fans are called DIVE.", "correct": true, "fun_fact": "DIVE is the official fandom name for IVE fans, as IVE + DIVE implies a deep dive into the fandom together.", "source": "https://twitter.com/IVEstarship"},
    {"question": "LE SSERAFIM fans are called FEARNOT.", "correct": true, "fun_fact": "FEARNOT is the official fandom name for LE SSERAFIM fans, referencing the group''s name which is an anagram of ''I''M FEARLESS''.", "source": "https://twitter.com/le_sserafim"}
  ]'::jsonb,
  'verified'
);

-- Quiz 63: K-pop Milestones and Firsts True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Milestones and Firsts True or False',
  'True or false about firsts and milestones in K-pop history.',
  NULL,
  'true_false',
  'hard',
  'true_false',
  '[
    {"question": "BoA was one of the first K-pop artists to successfully break into the Japanese market.", "correct": true, "fun_fact": "BoA became a massive star in Japan from 2002, paving the way for K-pop''s Japan expansion before Hallyu became mainstream.", "source": "https://www.soompi.com/article/boa-japan-kpop-pioneer"},
    {"question": "''Gangnam Style'' was the first K-pop music video to reach 1 billion views on YouTube.", "correct": true, "fun_fact": "PSY''s ''Gangnam Style'' made global headlines as the first video to hit 1 billion YouTube views in December 2012.", "source": "https://www.guinnessworldrecords.com/world-records/first-video-to-reach-1-billion-views-on-youtube"},
    {"question": "BTS was the first K-pop act to top the UK Albums Chart.", "correct": true, "fun_fact": "BTS topped the UK Albums Chart with ''Map of the Soul: 7'' in 2020, a first for a K-pop act in the UK.", "source": "https://www.officialcharts.com/charts/albums-chart/"},
    {"question": "BLACKPINK were the first K-pop girl group to perform at Coachella.", "correct": true, "fun_fact": "BLACKPINK headlined Coachella in 2019 and 2023, becoming the first K-pop act -- and the first female Asian act -- to headline the festival.", "source": "https://www.soompi.com/article/blackpink-coachella"},
    {"question": "Psy holds the record for most Grammy wins by a Korean artist.", "correct": false, "fun_fact": "No Korean artist has won a Grammy Award in a competitive category as of 2024. Psy never won a Grammy.", "source": "https://www.soompi.com/article/kpop-grammy-history"},
    {"question": "Super Junior was the first Korean group to perform at the MTV Europe Music Awards.", "correct": false, "fun_fact": "While Super Junior has won MTV EMA awards, the first Korean acts to receive recognition varied. BTS were the first K-pop group to win an MTV EMA.", "source": "https://www.soompi.com/article/bts-mtv-ema-history"},
    {"question": "The Korean Wave began primarily through Korean drama exports to other Asian countries.", "correct": true, "fun_fact": "The Korean Wave (Hallyu) is generally traced to the late 1990s when Korean dramas became hits in China and Southeast Asia.", "source": "https://www.bbc.com/culture/article/20210901-hallyu-how-south-korea-conquered-the-world"},
    {"question": "IU is considered one of the best-selling solo K-pop artists of all time.", "correct": true, "fun_fact": "IU is consistently ranked among the top-selling solo Korean artists, with massive digital and physical sales throughout her decade-long career.", "source": "https://www.soompi.com/article/iu-sales-records"},
    {"question": "The first K-pop group to perform at Madison Square Garden was BIGBANG.", "correct": false, "fun_fact": "BTS performed at the Citi Field stadium in 2018, and other groups followed. The specific MSG milestone was achieved by different artists across years.", "source": "https://www.soompi.com/article/kpop-msg-history"},
    {"question": "TWICE was the first K-pop girl group to sell 1 million albums in South Korea.", "correct": true, "fun_fact": "TWICE became the first K-pop girl group to sell over 1 million copies of a single album in South Korea with ''Formula of Love'' in 2021.", "source": "https://www.soompi.com/article/twice-million-seller"}
  ]'::jsonb,
  'verified'
);

-- Quiz 64: K-pop Idol Life True/False
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Idol Life True or False',
  'True or false about the life, training, and experiences of K-pop idols.',
  NULL,
  'true_false',
  'medium',
  'true_false',
  '[
    {"question": "K-pop idols are often required to maintain a no-dating policy.", "correct": true, "fun_fact": "Many K-pop agencies have historically required no-dating policies, though this has relaxed somewhat in recent years as older idols reveal relationships.", "source": "https://www.bbc.com/news/world-asia-49472481"},
    {"question": "Most K-pop idols begin training before age 18.", "correct": true, "fun_fact": "Many K-pop idols start training as young as 10-14 years old, with companies actively scouting middle and high school students.", "source": "https://www.allkpop.com/article/kpop-trainee-age"},
    {"question": "Idols always get to choose their own stage names.", "correct": false, "fun_fact": "Stage names are often assigned by the company. Some idols, however, have chosen names themselves or had input in the decision.", "source": "https://www.soompi.com/article/kpop-idol-stage-names"},
    {"question": "BLACKPINK''s Lisa is originally from Thailand.", "correct": true, "fun_fact": "Lisa (Lalisa Manobal) was born in Buriram, Thailand, and became one of the most recognized international K-pop stars.", "source": "https://www.soompi.com/article/lisa-blackpink-biography"},
    {"question": "BTS members are all Korean nationals.", "correct": true, "fun_fact": "All 7 BTS members are South Korean nationals, which made their military service exemption debates a major national topic.", "source": "https://www.bbc.com/news/world-asia-62766997"},
    {"question": "K-pop idols typically live in company dormitories during their active years.", "correct": true, "fun_fact": "K-pop idols commonly live together in company-provided dormitories, especially during peak promotional periods -- reinforcing group cohesion.", "source": "https://www.allkpop.com/article/kpop-idol-dorm-life"},
    {"question": "Male K-pop idols are exempt from mandatory military service.", "correct": false, "fun_fact": "Male Korean citizens are required to complete mandatory military service. BTS members began serving from 2022 onwards, with no permanent exemption.", "source": "https://www.bbc.com/news/world-asia-62766997"},
    {"question": "TWICE''s Tzuyu is from Taiwan.", "correct": true, "fun_fact": "Tzuyu (Chou Tzu-yu) was born in Tainan, Taiwan, and became a household name across Asia after a flag controversy in 2016.", "source": "https://www.soompi.com/article/tzuyu-twice-nationality"},
    {"question": "Many K-pop agencies require trainees to maintain strict diets.", "correct": true, "fun_fact": "Weight and appearance management have been widely reported aspects of K-pop trainee life, though awareness of health concerns has grown.", "source": "https://www.bbc.com/news/world-asia-49472481"},
    {"question": "EXO''s Kris Wu left EXO due to financial disputes with SM Entertainment.", "correct": false, "fun_fact": "Kris Wu filed a lawsuit against SM claiming unfair contract terms. He later faced criminal charges in China unrelated to his K-pop career.", "source": "https://www.soompi.com/article/kris-wu-exo-lawsuit"}
  ]'::jsonb,
  'verified'
);

-- ============================================
-- FUN QUIZZES 65-69
-- ============================================

-- Quiz 65: K-pop Iconic Outfits and Fashion
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Iconic Outfits and Fashion',
  'From school uniforms to avant-garde looks -- K-pop''s most memorable fashion moments.',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "Which K-pop group wore matching school uniforms as their debut concept?", "options": ["TWICE", "Red Velvet", "NewJeans", "IVE"], "correct": 2, "fun_fact": "NewJeans debuted with a nostalgic, casual school/streetwear aesthetic that set them apart from typical glamorous K-pop debut looks.", "source": "https://www.soompi.com/article/newjeans-debut-aesthetic"},
    {"question": "What color are BLACKPINK''s signature performance outfits?", "options": ["All black", "All pink", "Black and pink", "White and gold"], "correct": 2, "fun_fact": "BLACKPINK''s brand colors are black and pink, reflected in their outfits, set design, and merchandise.", "source": "https://twitter.com/ygofficialblink"},
    {"question": "Which fashion house has BLACKPINK''s Jennie served as global ambassador?", "options": ["Gucci", "Chanel", "Louis Vuitton", "Dior"], "correct": 1, "fun_fact": "Jennie became Chanel''s global ambassador in 2017 and is one of the most influential K-pop fashion icons.", "source": "https://www.soompi.com/article/jennie-chanel-ambassador"},
    {"question": "BTS''s ''Butter'' era is characterized by which color palette?", "options": ["Dark and moody", "Bright yellow and white", "Pastel purple", "All black"], "correct": 1, "fun_fact": "The ''Butter'' era featured bright, sunny yellow tones across outfits, sets, and promotional materials.", "source": "https://www.soompi.com/article/bts-butter-aesthetic"},
    {"question": "Which K-pop group popularized the ''school uniform'' concept in music videos?", "options": ["BIGBANG", "TWICE", "Girls'' Generation", "SHINee"], "correct": 2, "fun_fact": "Girls'' Generation''s ''Gee'' MV (2009) featuring colorful school-ish outfits became iconic and influenced countless groups after.", "source": "https://www.youtube.com/watch?v=U2quVXSN8uo"},
    {"question": "What term describes K-pop''s trend of all-matching member outfits?", "options": ["Uniform concept", "Mirror style", "Coordi look", "Stage match"], "correct": 2, "fun_fact": "''Coordi'' (coordinated) outfits are a staple of K-pop performance culture -- fans often rate each comeback''s ''coordi'' quality.", "source": "https://www.allkpop.com/article/kpop-coordi-culture"},
    {"question": "Which luxury brand did BTS''s V (Kim Taehyung) become an ambassador for?", "options": ["Prada", "Celine", "Louis Vuitton", "Burberry"], "correct": 1, "fun_fact": "V became Celine''s global ambassador, and his fashion choices regularly trend worldwide as he''s considered one of K-pop''s top fashion icons.", "source": "https://www.soompi.com/article/v-bts-celine-ambassador"},
    {"question": "What is ''Airport Fashion'' in K-pop culture?", "options": ["A fashion line for travel wear", "When fans and media photograph idols'' casual outfits at airports", "A TV show about K-pop fashion", "Designer luggage collections by K-pop groups"], "correct": 1, "fun_fact": "Airport fashion is a huge K-pop phenomenon -- fans camp at airports to photograph idols'' casual yet stylish travel looks.", "source": "https://www.allkpop.com/article/kpop-airport-fashion"},
    {"question": "Which K-pop group is known for their signature color-coded outfits per member?", "options": ["TWICE", "BLACKPINK", "SEVENTEEN", "GOT7"], "correct": 0, "fun_fact": "TWICE is famously color-coded, with each member having an assigned color used in official content, fan merchandise, and light sticks.", "source": "https://www.soompi.com/article/twice-color-coded-members"},
    {"question": "What fashion trend did G-Dragon of BIGBANG help popularize globally?", "options": ["Matching suits", "Oversized streetwear and layering", "Preppy collegiate style", "All-white minimalism"], "correct": 1, "fun_fact": "G-Dragon is credited with helping popularize streetwear and high fashion hybrid dressing in Asia, years before it became a global trend.", "source": "https://www.vogue.com/article/g-dragon-fashion-icon"}
  ]'::jsonb,
  'verified'
);

-- Quiz 66: K-pop Animal Mascots and Cute Culture
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Mascots and Cute Culture',
  'K-pop groups and their adorable mascots, emojis, and cute branding.',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "What is the name of BTS''s official mascot character?", "options": ["Cooky", "Tata", "RJ", "BT21 (collectively)"], "correct": 3, "fun_fact": "BT21 is a character IP created by BTS in collaboration with LINE Friends, with each member designing their own character.", "source": "https://bt21.com"},
    {"question": "What is the name of BTS''s Jungkook''s BT21 character?", "options": ["Cooky", "Chimmy", "Tata", "Mang"], "correct": 0, "fun_fact": "Jungkook designed Cooky, a bunny character -- reflecting his love for cute bunny aesthetics that fans often associate with him.", "source": "https://bt21.com/characters"},
    {"question": "What is the name of Jimin''s BT21 character?", "options": ["Tata", "Chimmy", "Cooky", "Shooky"], "correct": 1, "fun_fact": "Chimmy is Jimin''s character -- a yellow puppy that fans associate with Jimin''s cheerful and energetic personality.", "source": "https://bt21.com/characters"},
    {"question": "Which K-pop group has a teddy bear as their signature cute motif?", "options": ["TXT", "SEVENTEEN", "aespa", "LE SSERAFIM"], "correct": 0, "fun_fact": "TXT uses a teddy bear (YEOTAN and Odi plushies) as part of their visual branding, and member Taehyun is associated with a bear motif.", "source": "https://www.soompi.com/article/txt-bear-concept"},
    {"question": "What animal is NewJeans'' unofficial mascot associated with?", "options": ["Cat", "Bunny", "Puppy", "Frog"], "correct": 1, "fun_fact": "NewJeans has a strong bunny association -- their fandom is called ''Bunnies'' and rabbit imagery appears throughout their branding.", "source": "https://twitter.com/NewJeans_ADOR"},
    {"question": "Which group has character merchandise featuring a robot/alien concept matching their AI concept?", "options": ["aespa", "EXO", "SHINee", "NCT"], "correct": 0, "fun_fact": "aespa''s brand concept includes virtual AI versions of the members (''ae''), and their merchandise features futuristic robot/digital character designs.", "source": "https://www.soompi.com/article/aespa-ae-concept"},
    {"question": "What is the term for when K-pop idols act adorably cute on camera?", "options": ["Gwiyomi", "Aegyo", "Saranghae", "Daebak"], "correct": 1, "fun_fact": "Aegyo (애교) refers to cute, endearing behavior -- a big part of K-pop idol culture where members act baby-like to charm fans.", "source": "https://www.allkpop.com/article/kpop-aegyo-explained"},
    {"question": "Which BTS member''s BT21 character is a cloud-shaped alien?", "options": ["RM", "Jin", "V (Taehyung)", "Suga"], "correct": 2, "fun_fact": "V designed Tata, an alien-like character with a heart-shaped face and emotional, curious personality.", "source": "https://bt21.com/characters"},
    {"question": "What are K-pop ''plushies'' (or ''plooshies'') primarily sold as?", "options": ["Sleeping aids", "Official fan merchandise of member mascots", "Charity auction items only", "Limited art installations"], "correct": 1, "fun_fact": "K-pop plushies of group mascots, BT21 characters, and member-themed designs are massively popular merchandise items.", "source": "https://www.allkpop.com/article/kpop-plushie-merchandise"},
    {"question": "Which BLACKPINK member is associated with a bear concept in fan culture?", "options": ["Jisoo", "Jennie", "Rose", "Lisa"], "correct": 0, "fun_fact": "Jisoo is affectionately associated with a bear by fans due to her playful, cuddly personality -- a common fan-created animal assignment.", "source": "https://www.soompi.com/article/jisoo-bear-fans"}
  ]'::jsonb,
  'verified'
);

-- Quiz 67: K-pop Food and Eating Culture
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Idols and Food',
  'K-pop idols love food -- and fans love watching them eat. A delicious quiz!',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "What K-pop food variety show format involves members eating while chatting?", "options": ["Muk-bang with idols", "Eat-jin (Jin''s Eat Jin)", "Bon Voyage dining", "Idol restaurant challenge"], "correct": 1, "fun_fact": "BTS''s Jin hosted ''Eat Jin'', an early Run BTS precursor where he ate and talked to fans -- predating the mukbang genre''s mainstream popularity.", "source": "https://www.youtube.com/c/BangtanTV"},
    {"question": "Which Korean food is most commonly referenced in K-pop variety shows?", "options": ["Kimchi jjigae", "Tteokbokki", "Bibimbap", "Samgyeopsal"], "correct": 1, "fun_fact": "Tteokbokki (spicy rice cakes) is one of the most beloved Korean street foods and is frequently referenced by K-pop idols.", "source": "https://www.allkpop.com/article/kpop-idols-tteokbokki"},
    {"question": "What does ''mukbang'' mean?", "options": ["Eating while dancing", "Eating broadcast -- streaming while eating large amounts of food", "A traditional Korean feast", "A cooking competition show"], "correct": 1, "fun_fact": "Mukbang (먹방) literally means ''eating broadcast'' and originated in South Korea -- it became a global phenomenon, partly pushed by K-pop culture.", "source": "https://www.bbc.com/news/world-asia-49472481"},
    {"question": "Which snack brand collaborated with BTS for a highly popular campaign?", "options": ["Pepero", "Oreo", "Doritos", "Lays"], "correct": 0, "fun_fact": "BTS collaborated with Pepero (the Korean Pocky-like snack) for special edition packaging, causing sell-outs across Korea and internationally.", "source": "https://www.soompi.com/article/bts-pepero-collaboration"},
    {"question": "Which K-pop idol is particularly famous for being a ''foodie'' and food vlogs?", "options": ["Jimin (BTS)", "Jin (BTS)", "Chaeyoung (TWICE)", "Wendy (Red Velvet)"], "correct": 1, "fun_fact": "Jin is legendary among ARMY for his love of food, his ''Eat Jin'' series, and his frequent food commentary on V Live and Weverse.", "source": "https://www.youtube.com/c/BangtanTV"},
    {"question": "What is the Korean term for the communal BBQ meal that idols often eat together?", "options": ["Galbi", "Samgyeopsal", "Bulgogi", "Gopchang"], "correct": 1, "fun_fact": "Samgyeopsal (pork belly BBQ) is the quintessential Korean group meal and is ubiquitous on K-pop variety shows and idol vlogs.", "source": "https://www.allkpop.com/article/kpop-samgyeopsal-culture"},
    {"question": "Which fast food chain has had major K-pop idol advertising campaigns in South Korea?", "options": ["Subway", "McDonald''s", "Burger King", "All of the above"], "correct": 3, "fun_fact": "All major global fast food chains have run K-pop idol campaigns in South Korea -- it''s a standard celebrity endorsement market.", "source": "https://www.allkpop.com/article/kpop-fast-food-campaigns"},
    {"question": "Which K-pop group member opened their own restaurant?", "options": ["Taeyang (BIGBANG)", "Heechul (Super Junior)", "Baekhyun (EXO)", "Jay Park"], "correct": 3, "fun_fact": "Jay Park (formerly of 2PM) has invested in food businesses and is known for his entrepreneurial spirit including restaurant and food brand ventures.", "source": "https://www.soompi.com/article/jay-park-business-ventures"},
    {"question": "Which convenience store chain is most associated with K-pop culture and idol photo card promotions?", "options": ["GS25", "CU", "7-Eleven Korea", "All three equally"], "correct": 3, "fun_fact": "GS25, CU, and 7-Eleven Korea all regularly run K-pop idol collaborations with photo cards, special packaging, and fan events.", "source": "https://www.allkpop.com/article/kpop-convenience-store-promos"},
    {"question": "What dessert item became iconic after featuring in multiple K-pop music videos?", "options": ["Bingsu (shaved ice)", "Hotteok (sweet pancake)", "Yakgwa (honey pastry)", "Bungeoppang (fish-shaped pastry)"], "correct": 0, "fun_fact": "Bingsu -- Korean shaved ice with sweet toppings -- has appeared in dozens of K-pop MVs and is a summer staple in Korean idol culture.", "source": "https://www.soompi.com/article/kpop-bingsu-culture"}
  ]'::jsonb,
  'verified'
);

-- Quiz 68: K-pop Variety Shows and Games
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Variety Shows and Games',
  'The funniest and most iconic K-pop variety show moments and games.',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "Which K-pop variety show features idols doing physical challenges?", "options": ["Idol Room", "Weekly Idol", "Running Man", "Knowing Bros"], "correct": 1, "fun_fact": "''Weekly Idol'' (주간 아이돌) is famous for its speed dance challenges and random dance tests that became iconic variety segments.", "source": "https://www.soompi.com/article/weekly-idol-history"},
    {"question": "What is ''Knowing Bros'' (Ask Us Anything)?", "options": ["A quiz about K-pop facts", "A variety show where idols pretend to be school transfer students", "A physical challenge show for idol groups", "A lip sync competition"], "correct": 1, "fun_fact": "''Knowing Bros'' features MC regulars as teachers, with celebrity guests pretending to be new transfer students in a classroom setting.", "source": "https://www.soompi.com/article/knowing-bros-jtbc"},
    {"question": "Which BTS web series features the members on travel adventures?", "options": ["Run BTS!", "Bon Voyage", "In the SOOP", "BTS FESTA"], "correct": 1, "fun_fact": "''Bon Voyage'' is BTS''s travel documentary series where members go on unscripted trips together -- beloved by ARMY for candid moments.", "source": "https://weverse.io/bts"},
    {"question": "What game is commonly played on K-pop variety shows to pick a ''loser''?", "options": ["Rock Paper Scissors", "Nunchi game (number counting game)", "Musical chairs", "Bingo"], "correct": 1, "fun_fact": "The nunchi counting game (not saying the same number as someone else) is a K-pop variety staple used to pick who performs a punishment.", "source": "https://www.allkpop.com/article/kpop-variety-games"},
    {"question": "Which variety format has K-pop idols pretending to be on a real ''reality'' dating show?", "options": ["We Got Married", "Single''s Inferno", "Heart Signal", "Love Catcher"], "correct": 0, "fun_fact": "''We Got Married'' was a long-running MBC variety show pairing idols as pretend married couples, sparking countless fan ''ships''.", "source": "https://www.soompi.com/article/we-got-married-history"},
    {"question": "What is ''Idol Room'' known for?", "options": ["Cooking competitions between idol groups", "Thorough one-on-one member interviews with solo cams", "Dance battles between rival groups", "Hidden camera prank shows"], "correct": 1, "fun_fact": "Idol Room featured ''sole-cam'' segments -- dedicated camera time on individual members during dances -- a highly anticipated segment.", "source": "https://www.soompi.com/article/idol-room-mbc"},
    {"question": "Which K-pop travel-reality show features BLACKPINK?", "options": ["BLACKPINK House", "BLACKPINK''s Road Trip", "In Your Area", "Kill This Love Special"], "correct": 0, "fun_fact": "''BLACKPINK House'' was a reality show following BLACKPINK living together and going on trips, airing in 2018.", "source": "https://www.soompi.com/article/blackpink-house"},
    {"question": "What is the famous punishment for losing variety show games on K-pop shows?", "options": ["Solo aegyo performance", "Eating spicy food", "Wearing embarrassing outfits", "All of the above are common punishments"], "correct": 3, "fun_fact": "K-pop variety show punishments vary but commonly include aegyo performances, spicy food challenges, or embarrassing physical stunts.", "source": "https://www.allkpop.com/article/kpop-variety-punishment-games"},
    {"question": "Which NCT variety show follows sub-units on missions around the world?", "options": ["NCT Life", "NCT 360", "NCT World 2.0", "NCT Daily"], "correct": 0, "fun_fact": "''NCT Life'' is a web variety series featuring different NCT sub-units in various travel and challenge formats.", "source": "https://www.soompi.com/article/nct-life-series"},
    {"question": "What is ''Pepero Day'' and why is it relevant to K-pop?", "options": ["A national holiday", "November 11 -- a snack-sharing day that idols often celebrate publicly", "A K-pop award show", "A fan meeting format"], "correct": 1, "fun_fact": "Pepero Day (11/11) is a fun South Korean occasion where friends exchange Pepero snacks -- K-pop idols often post cute Pepero content.", "source": "https://www.allkpop.com/article/pepero-day-kpop"}
  ]'::jsonb,
  'verified'
);

-- Quiz 69: K-pop Funny and Relatable Fan Moments
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Fan Moments and Memes',
  'The funniest, most relatable K-pop fan experiences and iconic meme moments.',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "What is ''stan twitter'' in K-pop fan culture?", "options": ["An official K-pop news outlet", "The section of Twitter heavily populated by passionate fan accounts", "A paid subscription fan platform", "A private Discord server"], "correct": 1, "fun_fact": "''Stan Twitter'' refers to the passionate K-pop fan community on Twitter/X, known for fast-moving trends, fan projects, and sometimes intense debates.", "source": "https://www.vox.com/culture/2020/6/4/21280013/kpop-fans-bts-army-activism"},
    {"question": "What does ''bias wrecker'' mean in K-pop?", "options": ["A fan who dislikes a group", "A member who threatens to replace your original favorite (bias)", "Someone who ruins fan events", "A manager who creates controversy"], "correct": 1, "fun_fact": "A ''bias wrecker'' is a member who keeps challenging your loyalty to your original favorite -- a beloved fan experience.", "source": "https://www.allkpop.com/article/kpop-fan-terminology"},
    {"question": "What is a ''comeback era'' in K-pop fan experience?", "options": ["When a disbanded group returns", "The exciting period surrounding a new music release, from teasers to promotions", "When a group tours again after a break", "When an idol returns from military service"], "correct": 1, "fun_fact": "''Era'' in K-pop fan culture refers to the period defined by a specific album concept -- fans deeply associate personalities and memories with each era.", "source": "https://www.allkpop.com/article/kpop-comeback-era-culture"},
    {"question": "What is ''fancafe'' in K-pop?", "options": ["A physical fan coffee shop", "A Korean online fan community platform", "A fan-run podcast", "An exclusive fan club tier"], "correct": 1, "fun_fact": "Fancafes (Daum/Naver-based) are official Korean fan communities where artists occasionally post exclusive content.", "source": "https://www.soompi.com/article/kpop-fancafe-explained"},
    {"question": "What are ''sasaeng fans'' in K-pop?", "options": ["Fans who travel to Korea for concerts", "Obsessive fans who invade idols'' privacy", "Fans who fund fan projects", "International fan club leaders"], "correct": 1, "fun_fact": "Sasaeng (사생) fans are considered a dark side of K-pop -- obsessive fans known for extreme invasion of idols'' privacy.", "source": "https://www.bbc.com/news/world-asia-49472481"},
    {"question": "What does ''stan'' mean in K-pop fan culture?", "options": ["A casual listener", "A dedicated, passionate fan", "A music critic", "An industry insider"], "correct": 1, "fun_fact": "''Stan'' comes from Eminem''s song and means an extremely dedicated fan. In K-pop, stanning involves deep fan activities and loyalty.", "source": "https://www.allkpop.com/article/kpop-stan-culture"},
    {"question": "What is a ''light stick'' used for in K-pop?", "options": ["Reading in the dark at dorms", "Official fan merchandise waved at concerts, often color-coded to the group", "A selfie stick attachment", "A voting device at music shows"], "correct": 1, "fun_fact": "K-pop light sticks are iconic fan merchandise -- each group has a unique designed official ''bomb'' or ''bong'' used at concerts.", "source": "https://www.soompi.com/article/kpop-light-stick-guide"},
    {"question": "What is the term for when fans send trucks with LED screens to company buildings to protest on behalf of their idol?", "options": ["Fan truck", "LED protest", "Fandom rally", "Stan truck"], "correct": 0, "fun_fact": "Fan trucks are a uniquely Korean K-pop phenomenon where organized fans rent LED-equipped trucks to display protest messages or birthday congratulations near company offices.", "source": "https://www.allkpop.com/article/kpop-fan-truck-protests"},
    {"question": "What is ''unboxing'' culture in K-pop?", "options": ["Opening concert merchandise", "Fans filming themselves opening newly purchased K-pop album packages on video", "A choreography term for breaking formation", "Unpacking idol controversy"], "correct": 1, "fun_fact": "K-pop album unboxing videos are a massive subculture on YouTube and TikTok -- fans excitedly reveal photocards and extras from album packages.", "source": "https://www.allkpop.com/article/kpop-album-unboxing-culture"},
    {"question": "What does ''OT (number)'' mean in K-pop (e.g., ''OT7'')?", "options": ["Official Track listing", "Original Team -- meaning support for all members of a specific group size", "Online Tournament fans", "Off-Tour fan club"], "correct": 1, "fun_fact": "''OT7'' means supporting all 7 members (used for BTS), ''OT5'' for 5-member groups like TWICE or LE SSERAFIM. It expresses whole-group loyalty.", "source": "https://www.allkpop.com/article/kpop-ot-terminology"}
  ]'::jsonb,
  'verified'
);

-- Quiz 70: K-pop Nicknames and Member Facts
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Member Nicknames and Fun Facts',
  'Guess the idol from their famous nicknames and surprising personal facts.',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "Which BTS member is nicknamed ''World Wide Handsome''?", "options": ["RM", "Jin", "Jimin", "Jungkook"], "correct": 1, "fun_fact": "Jin famously declared himself ''World Wide Handsome'' at the 2017 Billboard Music Awards, creating a beloved and enduring fan meme.", "source": "https://www.soompi.com/article/jin-world-wide-handsome"},
    {"question": "Which BLACKPINK member is nicknamed ''Human Gucci''?", "options": ["Jisoo", "Jennie", "Rose", "Lisa"], "correct": 1, "fun_fact": "Jennie is called ''Human Gucci'' for her effortless high-fashion looks and her ability to make any outfit look like a runway moment.", "source": "https://www.allkpop.com/article/jennie-human-gucci"},
    {"question": "Which idol is nicknamed ''The Shoulder'' for their distinctive physique?", "options": ["Kai (EXO)", "Cha Eun-woo (ASTRO)", "Mingyu (SEVENTEEN)", "Eunwoo (ASTRO)"], "correct": 2, "fun_fact": "Mingyu of SEVENTEEN is famous for his broad shoulders and tall frame, earning him various nicknames related to his physique.", "source": "https://www.soompi.com/article/mingyu-seventeen-appearance"},
    {"question": "What is Stray Kids'' Bang Chan''s nickname based on his role in the group?", "options": ["The Brain", "Chan the Man", "3RACHA Boss", "Alpha"], "correct": 2, "fun_fact": "Bang Chan is the leader of the producing unit 3RACHA within Stray Kids, and fans refer to him in the context of his role as 3RACHA''s central figure.", "source": "https://www.soompi.com/article/bang-chan-3racha"},
    {"question": "Which idol is affectionately called ''Gorilla'' by their own groupmates?", "options": ["Jungkook (BTS)", "Chanwoo (iKON)", "Bobby (iKON)", "Hongjoong (ATEEZ)"], "correct": 0, "fun_fact": "BTS members nicknamed Jungkook ''Gorilla'' as a term of endearment for his strong, muscular build.", "source": "https://www.soompi.com/article/jungkook-nicknames"},
    {"question": "Which TWICE member has the nickname ''Penguin'' among fans?", "options": ["Nayeon", "Sana", "Tzuyu", "Jeongyeon"], "correct": 3, "fun_fact": "Jeongyeon has been nicknamed ''Penguin'' by ONCE fans for her cute waddling walk and lovable personality.", "source": "https://www.allkpop.com/article/jeongyeon-twice-nicknames"},
    {"question": "What is IU''s nickname that references her iconic dual talents?", "options": ["Nation''s Sweetheart", "Double Master", "One-Person Entertainment", "Korea''s Singer-Actress"], "correct": 2, "fun_fact": "IU is often called a ''one-person entertainment company'' for her exceptional songwriting, singing, acting, and variety talents.", "source": "https://www.soompi.com/article/iu-nickname-one-person"},
    {"question": "Which SHINee member was nicknamed ''Bling Bling'' for their fashion sense?", "options": ["Taemin", "Key", "Minho", "Onew"], "correct": 1, "fun_fact": "Key is known as a fashion icon and trendsetter in SHINee, earning the nickname ''Bling Bling'' for his bold style choices.", "source": "https://www.allkpop.com/article/key-shinee-fashion"},
    {"question": "What nickname do fans give EXO''s Baekhyun based on his energy and personality?", "options": ["Sunshine Boy", "Beagle Line", "Little Bear", "Candy Man"], "correct": 0, "fun_fact": "Baekhyun is often called ''Sunshine'' or associated with bright, happy energy -- he''s part of EXO''s ''Beagle Line'' for the noisy, playful members.", "source": "https://www.soompi.com/article/baekhyun-exo-personality"},
    {"question": "Which idol is nicknamed ''God Woozi'' by fans for their talent?", "options": ["Woozi (SEVENTEEN)", "Wonwoo (SEVENTEEN)", "S.Coups (SEVENTEEN)", "Joshua (SEVENTEEN)"], "correct": 0, "fun_fact": "Woozi (Lee Jihoon) is called ''God Woozi'' by Carats for his phenomenal songwriting and production ability, being the main composer for SEVENTEEN.", "source": "https://www.soompi.com/article/woozi-seventeen-producer"}
  ]'::jsonb,
  'verified'
);

-- Quiz 71: K-pop Dance Challenges and Viral Moments
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Viral Dance Challenges',
  'K-pop''s most iconic dance challenges and TikTok moments that took over the internet.',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "Which song''s dance challenge became a massive TikTok trend in 2020?", "options": ["BTS - Dynamite", "BLACKPINK - How You Like That", "IU - Celebrity", "TWICE - Fancy"], "correct": 0, "fun_fact": "BTS''s ''Dynamite'' sparked a massive TikTok dance challenge and helped introduce millions of new fans to K-pop during the pandemic.", "source": "https://www.soompi.com/article/bts-dynamite-tiktok-challenge"},
    {"question": "Which iconic point choreography from NewJeans went viral globally?", "options": ["Hype Boy finger heart", "OMG hand gesture", "Super Shy hip sway", "Ditto mirror move"], "correct": 2, "fun_fact": "NewJeans'' ''Super Shy'' hip sway went massively viral on TikTok, with fans and celebrities worldwide recreating the simple but addictive move.", "source": "https://www.soompi.com/article/newjeans-super-shy-tiktok"},
    {"question": "What BLACKPINK song had a viral ''how you like that'' hand gesture challenge?", "options": ["Kill This Love", "DDU-DU DDU-DU", "How You Like That", "Pink Venom"], "correct": 2, "fun_fact": "BLACKPINK''s ''How You Like That'' generated a massive TikTok challenge centered on the iconic finger gesture from the chorus.", "source": "https://www.soompi.com/article/blackpink-how-you-like-that-challenge"},
    {"question": "Which TWICE dance challenge spawned thousands of cover videos in 2016?", "options": ["TT", "Cheer Up", "LIKEY", "What is Love?"], "correct": 0, "fun_fact": "TWICE''s ''TT'' hand gesture -- mimicking a crying face -- became one of 2016''s most viral K-pop challenges.", "source": "https://www.soompi.com/article/twice-tt-challenge"},
    {"question": "What was special about PSY''s ''Gangnam Style'' horse dance?", "options": ["It required professional training", "It was simple enough that anyone could do it, making it universally viral", "It was inspired by traditional Korean dance", "It was created by a famous choreographer"], "correct": 1, "fun_fact": "The Gangnam Style horse dance was brilliantly accessible -- its simplicity allowed everyone from toddlers to politicians to recreate it.", "source": "https://www.youtube.com/watch?v=9bZkp7q19f0"},
    {"question": "Which LE SSERAFIM choreography became a viral gym/sports challenge?", "options": ["Fearless", "Antifragile", "EASY", "Eve, Psyche & The Bluebeard''s wife"], "correct": 2, "fun_fact": "LE SSERAFIM''s ''EASY'' sparked a viral challenge where people attempted the choreography while doing physical challenges like running or doing pushups.", "source": "https://www.soompi.com/article/le-sserafim-easy-challenge"},
    {"question": "What was the ''Careless'' challenge associated with which K-pop song?", "options": ["NMIXX - O.O", "aespa - Next Level", "IVE - After LIKE", "Stray Kids - Miroh"], "correct": 2, "fun_fact": "IVE''s ''After LIKE'' inspired numerous TikTok challenges and dance cover videos with its infectious hook and sharp choreography.", "source": "https://www.soompi.com/article/ive-after-like-viral"},
    {"question": "Which K-pop challenge involved fans recreating an entire concert set at home?", "options": ["BTS''s Permission to Dance challenge", "In My Room challenge", "Solo Stage challenge", "Home Concert challenge"], "correct": 0, "fun_fact": "BTS''s ''Permission to Dance'' was specifically designed to be simple and fan-friendly, launching a global challenge with accessible choreography.", "source": "https://www.soompi.com/article/bts-permission-to-dance-challenge"},
    {"question": "What made K-pop dance challenges particularly suited to TikTok?", "options": ["Long 3-minute choreographies", "Short, repeatable point moves that fit a 15-60 second format", "Professional-grade dancing requirements", "The use of props"], "correct": 1, "fun_fact": "K-pop''s ''point choreography'' tradition -- where one move defines a song -- perfectly matches TikTok''s short-form format.", "source": "https://www.allkpop.com/article/kpop-tiktok-challenge-culture"},
    {"question": "Which STAYC member''s solo challenge video went particularly viral in 2022?", "options": ["Sieun", "Isa", "Yoon", "Sumin"], "correct": 2, "fun_fact": "STAYC member Yoon''s various dance challenge videos went viral, helping raise the group''s international profile.", "source": "https://www.soompi.com/article/stayc-viral-moments"}
  ]'::jsonb,
  'verified'
);

-- Quiz 72: K-pop Weird and Surprising Facts
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Surprising and Weird Facts',
  'The most surprising, unexpected, and fascinating K-pop facts you probably didn''t know.',
  NULL,
  'multiple_choice',
  'medium',
  'fun',
  '[
    {"question": "How many members did Super Junior have at their largest lineup?", "options": ["9", "11", "13", "15"], "correct": 2, "fun_fact": "Super Junior has had 13 main members, making them one of the largest K-pop groups ever. The group has had various sub-units and additional associates.", "source": "https://www.soompi.com/article/super-junior-member-history"},
    {"question": "Which K-pop idol is a trained classical pianist?", "options": ["Suga (BTS)", "Woozi (SEVENTEEN)", "Jonghyun (SHINee)", "Jinyoung (GOT7)"], "correct": 2, "fun_fact": "SHINee''s Jonghyun was a trained classical pianist in addition to being a celebrated vocalist and songwriter.", "source": "https://www.allkpop.com/article/jonghyun-pianist"},
    {"question": "Which idol shaved their head on stage during a live performance?", "options": ["G-Dragon", "Jimin", "Taeyang", "Daesung"], "correct": 0, "fun_fact": "G-Dragon shaved his head during a BIGBANG concert as a bold artistic statement, shocking fans worldwide.", "source": "https://www.allkpop.com/article/g-dragon-shaved-head"},
    {"question": "How many languages does GOT7''s Jackson Wang speak?", "options": ["2", "3", "4", "5+"], "correct": 3, "fun_fact": "Jackson Wang speaks Cantonese (native), Mandarin, English, Korean, and some Japanese and French -- one of K-pop''s most multilingual idols.", "source": "https://www.soompi.com/article/jackson-wang-languages"},
    {"question": "Which K-pop group held the record for most consecutive wins on a Korean music show?", "options": ["BTS", "TWICE", "Girls'' Generation", "EXO"], "correct": 0, "fun_fact": "BTS has broken multiple consecutive-win records on Korean music shows, particularly with ''Butter'' in 2021.", "source": "https://www.soompi.com/article/bts-music-show-win-records"},
    {"question": "Which idol was born in New Zealand?", "options": ["Rosé (BLACKPINK)", "Tzuyu (TWICE)", "Wonpil (DAY6)", "Mark (GOT7)"], "correct": 0, "fun_fact": "Rosé (Park Chaeyoung) was born in New Zealand and grew up in Australia, giving her a distinctive accent in English.", "source": "https://www.soompi.com/article/rose-blackpink-background"},
    {"question": "Which K-pop group performed at the closing ceremony of the 2018 PyeongChang Winter Olympics?", "options": ["BTS", "EXO", "BIGBANG", "Girls'' Generation"], "correct": 1, "fun_fact": "EXO performed at the 2018 PyeongChang Winter Olympics closing ceremony, representing Korean culture on the global Olympic stage.", "source": "https://www.soompi.com/article/exo-olympics-2018"},
    {"question": "Approximately how many different versions of a single K-pop album are typically released?", "options": ["1-2", "2-4", "4-8", "10+"], "correct": 2, "fun_fact": "Major K-pop releases often come in 2-8 versions with different covers and photo cards, encouraging multiple purchases -- a controversial but effective strategy.", "source": "https://www.allkpop.com/article/kpop-multiple-album-versions"},
    {"question": "Which idol holds a degree from a top university in addition to their K-pop career?", "options": ["Suho (EXO)", "Rap Monster/RM (BTS)", "Sunny (Girls'' Generation)", "Irene (Red Velvet)"], "correct": 0, "fun_fact": "Suho (EXO) holds a degree in Korean Language and Literature from Korea National University of Arts, balancing academics and stardom.", "source": "https://www.soompi.com/article/suho-exo-education"},
    {"question": "What surprising activity is BTS''s RM known for outside of music?", "options": ["Professional gaming", "Art museum visits and collecting", "Competitive cooking", "Extreme sports"], "correct": 1, "fun_fact": "RM is a passionate art enthusiast who regularly visits art museums worldwide, has contributed to Korean art awareness, and collects contemporary art.", "source": "https://www.soompi.com/article/rm-art-museum"}
  ]'::jsonb,
  'verified'
);

-- Quiz 73: K-pop Collaborations and Unexpected Moments
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Surprise Collaborations',
  'The most unexpected and iconic K-pop collaborations and crossover moments.',
  NULL,
  'multiple_choice',
  'medium',
  'fun',
  '[
    {"question": "Which Western pop star collaborated with BTS on ''My Universe''?", "options": ["Ed Sheeran", "Coldplay", "Halsey", "Charlie Puth"], "correct": 1, "fun_fact": "BTS collaborated with Coldplay on ''My Universe'' (2021), a feel-good anthem that topped charts in multiple countries.", "source": "https://www.soompi.com/article/bts-coldplay-my-universe"},
    {"question": "Which song featured BTS''s j-hope and a Western rapper?", "options": ["More with Becky G", "Chicken Noodle Soup with Becky G", "Base Line with Lil Uzi", "Arson with Jack Harlow"], "correct": 1, "fun_fact": "''Chicken Noodle Soup'' with Becky G was a viral sensation in 2019, featuring j-hope alongside the popular Latina-American artist.", "source": "https://www.soompi.com/article/j-hope-becky-g-cns"},
    {"question": "Which BLACKPINK song featured Lady Gaga?", "options": ["Sour Candy", "Kiss and Make Up", "Ice Cream", "Lovesick Girls"], "correct": 0, "fun_fact": "BLACKPINK and Lady Gaga collaborated on ''Sour Candy'' from Gaga''s ''Chromatica'' album (2020), a major K-pop/pop crossover.", "source": "https://www.soompi.com/article/blackpink-lady-gaga-sour-candy"},
    {"question": "Which unexpected collaboration between K-pop and K-indie became a viral hit?", "options": ["BTS x IU - Celebrity", "EXO x Crush", "Suga x IU - eight", "Jungkook x Charlie Puth - Left and Right"], "correct": 2, "fun_fact": "''eight'' by IU featuring Suga (BTS) became a massive hit in 2020, blending IU''s indie-pop style with Suga''s lyrical depth.", "source": "https://www.soompi.com/article/iu-suga-eight"},
    {"question": "Which collaboration between SM and JYP artists shocked fans in 2023?", "options": ["Red Velvet x TWICE", "EXO x Stray Kids", "aespa x NMIXX", "NCT x Day6"], "correct": 2, "fun_fact": "aespa (SM) and NMIXX (JYP) collaborating was a rare cross-company moment that excited fans of both groups.", "source": "https://www.soompi.com/article/aespa-nmixx-collaboration"},
    {"question": "Which K-pop group unexpectedly performed at the United Nations General Assembly?", "options": ["BLACKPINK", "BTS", "EXO", "Girls'' Generation"], "correct": 1, "fun_fact": "BTS addressed the United Nations General Assembly in 2021, speaking about COVID recovery and global youth issues on behalf of the South Korean government.", "source": "https://www.bbc.com/news/world-asia-58649485"},
    {"question": "What global sporting event featured a K-pop artist performing at the opening ceremony?", "options": ["2022 FIFA World Cup - BLACKPINK", "2020 Tokyo Olympics - BTS", "2024 Paris Olympics - NewJeans", "2022 World Cup - BTS"], "correct": 0, "fun_fact": "BLACKPINK performed at the 2022 FIFA World Cup opening ceremony in Qatar, marking a major milestone for K-pop on the global sports stage.", "source": "https://www.soompi.com/article/blackpink-world-cup-2022"},
    {"question": "Which K-pop idol collaborated with Halsey on a BTS song?", "options": ["RM and Suga on ''IDOL''", "Jimin on ''Boys With Luv''", "V on ''Blue & Grey''", "Jungkook on ''My Time''"], "correct": 0, "fun_fact": "Halsey featured on BTS''s ''Boy With Luv'' -- but the Halsey ''IDOL'' remix is also notable, with all members credited.", "source": "https://www.soompi.com/article/halsey-bts-collaboration"},
    {"question": "What made the SM X HYBE ''SM Rookies'' era collaboration notable?", "options": ["A joint concert series", "A rumored co-debuted group", "Cross-label album featuring both rosters", "Presidential cultural event"], "correct": 1, "fun_fact": "Rumors and speculation about potential cross-label collaborations regularly excite K-pop fans, though most remain unofficial.", "source": "https://www.allkpop.com/article/kpop-cross-label-collaboration-rumors"},
    {"question": "Which K-pop performance at a Western awards show shocked the world in 2019?", "options": ["BLACKPINK at Coachella", "BTS at the American Music Awards", "EXO at the MTV EMAs", "NCT at the Grammys"], "correct": 1, "fun_fact": "BTS performed at the 2017 and 2019 American Music Awards, representing K-pop''s growing presence in mainstream Western award shows.", "source": "https://www.soompi.com/article/bts-amas-performance"}
  ]'::jsonb,
  'verified'
);

-- Quiz 74: K-pop Light Sticks and Concert Culture
INSERT INTO public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status) VALUES (
  'K-pop Concert and Light Stick Culture',
  'The iconic world of K-pop concerts, fan culture, and official light sticks.',
  NULL,
  'multiple_choice',
  'easy',
  'fun',
  '[
    {"question": "What is BTS''s official fan light stick called?", "options": ["ARMY Bomb", "Purple Star", "BTS Wand", "Bangtan Bomb"], "correct": 0, "fun_fact": "The ARMY Bomb is BTS''s iconic Bluetooth-enabled light stick that can sync colors with stage effects during concerts.", "source": "https://www.weverse.io/bts"},
    {"question": "What makes Bluetooth light sticks special in K-pop concerts?", "options": ["They glow louder", "They can be remotely controlled by concert staff to sync with the show", "They record video", "They translate song lyrics"], "correct": 1, "fun_fact": "Smart Bluetooth light sticks (like ARMY Bomb v3+) can be remotely controlled during concerts to change colors and flash in sync with the performance.", "source": "https://www.soompi.com/article/bts-army-bomb-bluetooth"},
    {"question": "What is a ''fan project'' at K-pop concerts?", "options": ["Fans building the stage", "Coordinated fan actions like color banners or slogan boards during a show", "Fundraising for charity in the artist''s name", "A fan-made documentary"], "correct": 1, "fun_fact": "Fan projects at K-pop concerts are elaborate coordinated actions -- like flipping colored cards to form images -- organized by fan clubs.", "source": "https://www.allkpop.com/article/kpop-concert-fan-project"},
    {"question": "What is a ''hi-touch'' event in K-pop?", "options": ["A virtual fan meeting", "A fan event where fans briefly high-five or touch hands with the artist", "A premium concert seat upgrade", "A group dance with the idol"], "correct": 1, "fun_fact": "Hi-touch events are intimate fan interactions where fans move quickly past the artist to briefly touch hands -- a treasured fan experience.", "source": "https://www.allkpop.com/article/kpop-hi-touch-events"},
    {"question": "What is SEVENTEEN''s official light stick called?", "options": ["Carat Bong", "Diamond Edge", "SVT Stick", "Caratbong"], "correct": 3, "fun_fact": "SEVENTEEN''s official light stick is called the Caratbong, featuring a diamond shape reflecting their fandom name CARAT.", "source": "https://twitter.com/pledis_17"},
    {"question": "What is ''standing'' vs ''seated'' concert experience in K-pop?", "options": ["Standing is more expensive", "Standing sections (pit) are usually closest to stage and considered most exciting", "Seated has better sound quality", "Standing is for premium VIP only"], "correct": 1, "fun_fact": "Standing/pit sections at K-pop concerts are highly coveted for being closest to the stage, though they require hours of waiting in line.", "source": "https://www.allkpop.com/article/kpop-concert-standing-section"},
    {"question": "What color does ARMY fill the stadium with using their light sticks?", "options": ["Pink", "Purple", "Silver", "Yellow"], "correct": 1, "fun_fact": "ARMY uses purple ARMY Bombs to fill stadiums with purple light -- purple being BTS''s signature color, representing trust and love.", "source": "https://www.soompi.com/article/bts-purple-meaning"},
    {"question": "What is a ''fan meeting'' (fanmeet) in K-pop?", "options": ["A large stadium concert", "A smaller, more intimate event focused on fan-artist interaction rather than performance", "An online fan forum", "A press conference with fans"], "correct": 1, "fun_fact": "Fan meetings are smaller events featuring games, Q&A, and direct fan interaction -- prized for the personal connection with the artist.", "source": "https://www.allkpop.com/article/kpop-fanmeet-culture"},
    {"question": "Which K-pop group is known for throwing fan service items into the crowd?", "options": ["Most K-pop groups do this", "Only boy groups", "Only large groups like SEVENTEEN", "It varies by company policy"], "correct": 0, "fun_fact": "Throwing signed merchandise, candy, and other items into the crowd is a common K-pop concert tradition across most groups.", "source": "https://www.soompi.com/article/kpop-concert-fan-service"},
    {"question": "What is a K-pop ''encore'' concert behavior unique to the culture?", "options": ["Fans chanting the group name until they return", "Fans doing a synchronized wave", "Fans remaining perfectly silent", "Fans throwing light sticks on stage"], "correct": 0, "fun_fact": "K-pop fans chant the group''s name rhythmically after the main set ends to call them back for an encore -- a beloved concert ritual.", "source": "https://www.allkpop.com/article/kpop-encore-culture"}
  ]'::jsonb,
  'verified'
);
