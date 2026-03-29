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
