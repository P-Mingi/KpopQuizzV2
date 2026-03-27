-- ============================================
-- SEED USER (for quiz ownership)
-- ============================================
-- Create a seed user in auth.users so we can assign quizzes to them
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'seed@kpopquizz.com',
  '',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO public.profiles (id, username, display_name, avatar_bg, avatar_text, bio)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'kpopquizz',
  'KpopQuiz Team',
  '#EEEDFE',
  '#3C3489',
  'Official quizzes by the KpopQuiz team'
);

-- ============================================
-- BTS QUIZZES (group_id = 1)
-- ============================================

INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, questions, settings) VALUES
('00000000-0000-0000-0000-000000000001', 1, 'Only real ARMYs can pass this BTS debut quiz', 'only-real-armys-can-pass-this-bts-debut-quiz', 'multiple_choice', 'medium',
'[
  {"question": "When did BTS officially debut?", "options": ["June 13, 2012", "June 13, 2013", "March 13, 2013", "June 13, 2014"], "correct": 1, "fun_fact": "BTS debuted on June 13, 2013 under Big Hit Entertainment (now HYBE)."},
  {"question": "What was BTS''s debut single?", "options": ["No More Dream", "We Are Bulletproof Pt.2", "N.O", "Boy in Luv"], "correct": 0, "fun_fact": "No More Dream was released as part of their debut album 2 Cool 4 Skool."},
  {"question": "What does BTS stand for in Korean?", "options": ["Beyond The Scene", "Bangtan Sonyeondan", "Born To Shine", "Boys That Sing"], "correct": 1, "fun_fact": "Bangtan Sonyeondan translates to Bulletproof Boy Scouts. Beyond The Scene was added as an English meaning in 2017."},
  {"question": "Which company did BTS debut under?", "options": ["SM Entertainment", "YG Entertainment", "JYP Entertainment", "Big Hit Entertainment"], "correct": 3, "fun_fact": "Big Hit Entertainment was later renamed to HYBE Corporation in 2021."},
  {"question": "How many members are in BTS?", "options": ["5", "6", "7", "8"], "correct": 2, "fun_fact": "BTS has 7 members: RM, Jin, Suga, J-Hope, Jimin, V, and Jungkook."},
  {"question": "Who is the leader of BTS?", "options": ["Jin", "Suga", "RM", "J-Hope"], "correct": 2, "fun_fact": "RM (Kim Namjoon) has been the leader since debut. He was the first member recruited by Bang Si-hyuk."},
  {"question": "What was BTS''s debut album called?", "options": ["O!RUL8,2?", "2 Cool 4 Skool", "Skool Luv Affair", "Dark & Wild"], "correct": 1, "fun_fact": "2 Cool 4 Skool was released on June 12, 2013, one day before their official debut stage."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 1, 'BTS discography challenge - name that era', 'bts-discography-challenge-name-that-era', 'multiple_choice', 'hard',
'[
  {"question": "Which album features the song Blood Sweat & Tears?", "options": ["The Most Beautiful Moment in Life", "Wings", "Love Yourself: Her", "Map of the Soul: 7"], "correct": 1, "fun_fact": "Wings was released in October 2016 and marked BTS''s first album to chart on the Billboard 200."},
  {"question": "Spring Day belongs to which album?", "options": ["Wings", "You Never Walk Alone", "Love Yourself: Her", "Love Yourself: Answer"], "correct": 1, "fun_fact": "Spring Day has stayed on the Melon chart for years, making it one of the longest-charting K-pop songs ever."},
  {"question": "What was BTS''s first Billboard Hot 100 #1 song?", "options": ["Boy With Luv", "Dynamite", "Butter", "ON"], "correct": 1, "fun_fact": "Dynamite debuted at #1 in August 2020, making BTS the first all-South Korean act to top the Hot 100."},
  {"question": "Which song features a collaboration with Halsey?", "options": ["Fake Love", "Boy With Luv", "IDOL", "Dynamite"], "correct": 1, "fun_fact": "Boy With Luv feat. Halsey was released in April 2019 as part of Map of the Soul: Persona."},
  {"question": "DNA was the lead single from which album?", "options": ["Love Yourself: Her", "Love Yourself: Tear", "Love Yourself: Answer", "Wings"], "correct": 0, "fun_fact": "DNA was BTS''s first song to enter the Billboard Hot 100, peaking at #67 in 2017."},
  {"question": "Which BTS song has a music video set in a train and bus stop?", "options": ["Run", "Spring Day", "I Need U", "Save Me"], "correct": 1, "fun_fact": "The Spring Day MV is filled with references to the short story The Ones Who Walk Away from Omelas."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 1, 'How well do you know BTS members?', 'how-well-do-you-know-bts-members', 'multiple_choice', 'easy',
'[
  {"question": "Who is the youngest member (maknae) of BTS?", "options": ["Jimin", "V", "Jungkook", "Suga"], "correct": 2, "fun_fact": "Jungkook was born on September 1, 1997, making him the youngest member."},
  {"question": "Who is the oldest member of BTS?", "options": ["RM", "Jin", "Suga", "J-Hope"], "correct": 1, "fun_fact": "Jin (Kim Seokjin) was born on December 4, 1992."},
  {"question": "What is Suga''s solo mixtape name?", "options": ["Hope World", "Agust D", "Mono", "D-Day"], "correct": 1, "fun_fact": "Agust D is Suga spelled backwards plus DT for Daegu Town, his hometown."},
  {"question": "Which BTS member is known for the catchphrase ''I purple you''?", "options": ["Jimin", "V", "Jungkook", "RM"], "correct": 1, "fun_fact": "V (Kim Taehyung) coined the phrase at a fan meeting in 2016, saying purple is the last color of the rainbow meaning trust and love."},
  {"question": "Which member released the solo mixtape Hope World?", "options": ["RM", "Suga", "J-Hope", "Jimin"], "correct": 2, "fun_fact": "Hope World was released in 2018 and debuted at #38 on the Billboard 200."},
  {"question": "What position does Jimin hold in BTS?", "options": ["Main rapper", "Lead vocalist and main dancer", "Visual", "Leader"], "correct": 1, "fun_fact": "Jimin studied contemporary dance at Busan High School of Arts before joining Big Hit."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 1, 'BTS world records and achievements quiz', 'bts-world-records-and-achievements-quiz', 'multiple_choice', 'medium',
'[
  {"question": "What was BTS''s first song to debut at #1 on the Billboard Hot 100?", "options": ["Butter", "Dynamite", "Life Goes On", "Permission to Dance"], "correct": 1, "fun_fact": "Dynamite debuted at #1 in September 2020."},
  {"question": "BTS performed at which major US awards show in 2019 with Lil Nas X?", "options": ["VMAs", "Grammys", "AMAs", "Billboard Music Awards"], "correct": 1, "fun_fact": "They performed Old Town Road remix with Lil Nas X at the 2020 Grammys (62nd ceremony, held Jan 2020)."},
  {"question": "In what year did BTS first speak at the United Nations?", "options": ["2017", "2018", "2019", "2020"], "correct": 1, "fun_fact": "BTS spoke at the 73rd UN General Assembly in September 2018 as part of their UNICEF Love Myself campaign."},
  {"question": "What is the name of BTS''s official fan club?", "options": ["BLINK", "ARMY", "ONCE", "CARAT"], "correct": 1, "fun_fact": "ARMY stands for Adorable Representative M.C. for Youth."},
  {"question": "Which BTS song broke the YouTube record for most views in 24 hours in 2020?", "options": ["ON", "Dynamite", "Life Goes On", "Black Swan"], "correct": 1, "fun_fact": "Dynamite garnered 101.1 million views in its first 24 hours on YouTube."},
  {"question": "How many consecutive #1 Billboard Hot 100 songs did BTS achieve?", "options": ["2", "3", "4", "5"], "correct": 1, "fun_fact": "Dynamite, Butter, and Permission to Dance all debuted at #1 consecutively."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 1, 'BTS music video trivia - can you get 100%?', 'bts-music-video-trivia-can-you-get-100', 'multiple_choice', 'hard',
'[
  {"question": "In which MV does Jungkook jump off a building into water?", "options": ["Run", "I Need U", "Euphoria", "Spring Day"], "correct": 2, "fun_fact": "The Euphoria MV features dreamlike sequences with Jungkook bungee jumping and flying."},
  {"question": "Which MV features BTS in a colorful retro-disco setting?", "options": ["IDOL", "Dynamite", "Boy With Luv", "Permission to Dance"], "correct": 1, "fun_fact": "Dynamite was BTS''s first fully English-language song and had a vibrant retro concept."},
  {"question": "The IDOL MV incorporates elements from which traditional Korean art?", "options": ["Pansori", "Buchaechum", "Talchum", "All of the above"], "correct": 3, "fun_fact": "IDOL blends Korean traditional art forms including mask dance (talchum), fan dance, and traditional drumming."},
  {"question": "Which MV features the members in a fake love hotel setting with rooms for each member?", "options": ["Blood Sweat & Tears", "Fake Love", "Black Swan", "ON"], "correct": 1, "fun_fact": "Fake Love''s MV had multiple versions including an extended version with different storylines."},
  {"question": "In the Spring Day MV, what book is referenced through the setting?", "options": ["1984", "The Little Prince", "The Ones Who Walk Away from Omelas", "Norwegian Wood"], "correct": 2, "fun_fact": "The Omelas motel sign and Ursula K. Le Guin''s story themes are central to the MV''s meaning."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}');

-- ============================================
-- BLACKPINK QUIZZES (group_id = 2)
-- ============================================

INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, questions, settings) VALUES
('00000000-0000-0000-0000-000000000001', 2, 'Are you a true BLINK? BLACKPINK trivia', 'are-you-a-true-blink-blackpink-trivia', 'multiple_choice', 'easy',
'[
  {"question": "When did BLACKPINK debut?", "options": ["August 8, 2015", "August 8, 2016", "November 1, 2016", "January 15, 2017"], "correct": 1, "fun_fact": "BLACKPINK debuted under YG Entertainment with a double single: Boombayah and Whistle."},
  {"question": "How many members are in BLACKPINK?", "options": ["3", "4", "5", "6"], "correct": 1, "fun_fact": "BLACKPINK has 4 members: Jisoo, Jennie, Rose, and Lisa."},
  {"question": "Which company is BLACKPINK under?", "options": ["SM Entertainment", "JYP Entertainment", "YG Entertainment", "HYBE"], "correct": 2, "fun_fact": "YG Entertainment is also home to artists like BIGBANG and WINNER."},
  {"question": "What are BLACKPINK''s two debut songs?", "options": ["DDU-DU DDU-DU and Forever Young", "Boombayah and Whistle", "Playing with Fire and Stay", "As If It''s Your Last and Whistle"], "correct": 1, "fun_fact": "Both Boombayah and Whistle were released simultaneously as a double single on August 8, 2016."},
  {"question": "What is BLACKPINK''s fandom name?", "options": ["ARMY", "BLINK", "ONCE", "Reveluv"], "correct": 1, "fun_fact": "BLINK is a combination of BL from BLACK and INK from PINK."},
  {"question": "Which BLACKPINK member is from Thailand?", "options": ["Jisoo", "Jennie", "Rose", "Lisa"], "correct": 3, "fun_fact": "Lisa (Lalisa Manobal) is from Buriram, Thailand and is the only non-Korean member."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 2, 'BLACKPINK solo careers quiz - test your knowledge', 'blackpink-solo-careers-quiz', 'multiple_choice', 'medium',
'[
  {"question": "What is the name of Jennie''s first solo single?", "options": ["Flower", "SOLO", "LALISA", "On The Ground"], "correct": 1, "fun_fact": "SOLO was released in November 2018, making Jennie the first BLACKPINK member to debut solo."},
  {"question": "What was Rose''s debut solo single?", "options": ["Gone", "On The Ground", "Hard to Love", "Eyes Closed"], "correct": 1, "fun_fact": "On The Ground debuted at #70 on the Billboard Hot 100, the highest for a Korean solo artist at the time."},
  {"question": "What is Lisa''s debut solo song called?", "options": ["Money", "LALISA", "Rockstar", "Swallow"], "correct": 1, "fun_fact": "LALISA set the record for the most-viewed music video by a solo K-pop artist in 24 hours."},
  {"question": "What is the title of Jisoo''s solo debut album?", "options": ["ME", "FLOWER", "CLARITY", "JISOO"], "correct": 0, "fun_fact": "ME was released in March 2023 with lead single Flower, which went viral on TikTok."},
  {"question": "Which Lisa solo song became a massive TikTok trend?", "options": ["LALISA", "Money", "Rockstar", "Swallow"], "correct": 1, "fun_fact": "Money became one of the most-used songs on TikTok in 2021-2022."},
  {"question": "Rose featured on a song with which Bruno Mars track?", "options": ["Apt.", "That''s What I Like", "Die With a Smile", "Locked Out of Heaven"], "correct": 0, "fun_fact": "Apt. became a global hit reaching #3 on the Billboard Hot 100."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 2, 'BLACKPINK title tracks challenge', 'blackpink-title-tracks-challenge', 'multiple_choice', 'medium',
'[
  {"question": "Which BLACKPINK song features the lyrics ''look at you now look at me''?", "options": ["DDU-DU DDU-DU", "How You Like That", "Kill This Love", "Lovesick Girls"], "correct": 1, "fun_fact": "How You Like That was a pre-release single that broke multiple YouTube records in 2020."},
  {"question": "What was BLACKPINK''s first song to reach #1 on a US chart?", "options": ["DDU-DU DDU-DU", "How You Like That", "Ice Cream", "Pink Venom"], "correct": 2, "fun_fact": "Ice Cream with Selena Gomez topped the Billboard Global 200 chart."},
  {"question": "Lovesick Girls is from which BLACKPINK album?", "options": ["Square Up", "Kill This Love EP", "THE ALBUM", "Born Pink"], "correct": 2, "fun_fact": "THE ALBUM (2020) was BLACKPINK''s first full-length studio album after 4 years of releasing only singles and EPs."},
  {"question": "Which song is from the Born Pink album?", "options": ["How You Like That", "Lovesick Girls", "Shut Down", "Kill This Love"], "correct": 2, "fun_fact": "Shut Down samples Paganini''s La Campanella and debuted at #1 in multiple countries."},
  {"question": "Playing with Fire was released in which year?", "options": ["2016", "2017", "2018", "2019"], "correct": 0, "fun_fact": "Playing with Fire was from their second single album Square Two, released in November 2016."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 2, 'BLACKPINK world tour and performances quiz', 'blackpink-world-tour-and-performances', 'multiple_choice', 'hard',
'[
  {"question": "BLACKPINK made history as the first K-pop girl group to perform at which festival?", "options": ["Glastonbury", "Coachella", "Lollapalooza", "Reading Festival"], "correct": 1, "fun_fact": "BLACKPINK performed at Coachella in 2019 and returned as headliners in 2023."},
  {"question": "What was BLACKPINK''s first world tour called?", "options": ["Born Pink World Tour", "In Your Area", "The Show", "Blinks World Tour"], "correct": 1, "fun_fact": "BLACKPINK In Your Area World Tour ran from 2018-2020 across Asia, North America, Europe, and Australia."},
  {"question": "In which year did BLACKPINK headline Coachella?", "options": ["2019", "2020", "2022", "2023"], "correct": 3, "fun_fact": "They were the first K-pop act and Asian act to headline Coachella in 2023."},
  {"question": "BLACKPINK''s Born Pink Tour became the highest-grossing tour by a K-pop act. How many shows did they perform?", "options": ["About 30", "About 45", "About 66", "About 80"], "correct": 2, "fun_fact": "The Born Pink World Tour had 66 shows and grossed over $330 million."},
  {"question": "BLACKPINK''s ''The Show'' online concert was held in which year?", "options": ["2019", "2020", "2021", "2022"], "correct": 2, "fun_fact": "The Show was a paid livestream concert in January 2021 with over 280,000 viewers."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 2, 'BLACKPINK members facts - do you really know them?', 'blackpink-members-facts-do-you-really-know', 'multiple_choice', 'medium',
'[
  {"question": "Where did Jennie live before becoming a trainee?", "options": ["Japan", "New Zealand", "Australia", "United States"], "correct": 1, "fun_fact": "Jennie lived in Auckland, New Zealand for about 5 years as a child and speaks fluent English."},
  {"question": "What nationality is Rose?", "options": ["Korean", "Korean-Australian", "Korean-American", "Korean-New Zealander"], "correct": 1, "fun_fact": "Rose (Park Chaeyoung) was born in New Zealand and raised in Melbourne, Australia."},
  {"question": "What is Jisoo''s birth name?", "options": ["Kim Jisoo", "Park Jisoo", "Lee Jisoo", "Jeon Jisoo"], "correct": 0, "fun_fact": "Kim Jisoo is the oldest member of BLACKPINK, born on January 3, 1995."},
  {"question": "Lisa holds which position in BLACKPINK?", "options": ["Main vocalist", "Lead vocalist", "Main dancer and lead rapper", "Sub vocalist"], "correct": 2, "fun_fact": "Lisa won the YG audition in Thailand out of 4,000 applicants when she was just 13 years old."},
  {"question": "Which BLACKPINK member acted in the K-drama Snowdrop?", "options": ["Jennie", "Rose", "Lisa", "Jisoo"], "correct": 3, "fun_fact": "Jisoo starred as the female lead in the 2021-2022 JTBC drama Snowdrop alongside Jung Hae-in."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}');

-- ============================================
-- STRAY KIDS QUIZZES (group_id = 3)
-- ============================================

INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, questions, settings) VALUES
('00000000-0000-0000-0000-000000000001', 3, 'Only real STAYs can ace this Stray Kids quiz', 'only-real-stays-can-ace-stray-kids-quiz', 'multiple_choice', 'easy',
'[
  {"question": "When did Stray Kids debut?", "options": ["January 8, 2018", "March 25, 2018", "October 1, 2017", "June 15, 2018"], "correct": 1, "fun_fact": "Stray Kids officially debuted on March 25, 2018 with the EP I Am NOT."},
  {"question": "Which company is Stray Kids under?", "options": ["SM Entertainment", "JYP Entertainment", "YG Entertainment", "HYBE"], "correct": 1, "fun_fact": "JYP Entertainment is also home to TWICE, ITZY, and GOT7."},
  {"question": "How many members are currently in Stray Kids?", "options": ["7", "8", "9", "6"], "correct": 1, "fun_fact": "Stray Kids has 8 members: Bang Chan, Lee Know, Changbin, Hyunjin, Han, Felix, Seungmin, and I.N."},
  {"question": "What is Stray Kids'' fandom name?", "options": ["STAY", "Stray", "SKZOO", "JYPnation"], "correct": 0, "fun_fact": "STAY means that fans will always stay with Stray Kids no matter what."},
  {"question": "Which members make up the producing unit 3RACHA?", "options": ["Bang Chan, Hyunjin, Felix", "Bang Chan, Changbin, Han", "Changbin, Han, Lee Know", "Bang Chan, Seungmin, I.N"], "correct": 1, "fun_fact": "3RACHA writes and produces most of Stray Kids'' music, giving them creative control."},
  {"question": "Stray Kids were formed through which TV show?", "options": ["Produce 101", "Kingdom", "Stray Kids (reality show)", "LOUD"], "correct": 2, "fun_fact": "The survival show Stray Kids aired on Mnet in 2017, where the members were selected by Bang Chan."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 3, 'Stray Kids discography challenge', 'stray-kids-discography-challenge', 'multiple_choice', 'hard',
'[
  {"question": "Which Stray Kids song is known as their major breakthrough hit?", "options": ["Miroh", "God''s Menu", "Back Door", "MANIAC"], "correct": 1, "fun_fact": "God''s Menu from the album GO LIVE (2020) significantly boosted Stray Kids'' domestic and international popularity."},
  {"question": "MANIAC is from which album?", "options": ["NOEASY", "ODDINARY", "MAXIDENT", "5-STAR"], "correct": 1, "fun_fact": "ODDINARY debuted at #1 on the Billboard 200, making Stray Kids only the third K-pop act to achieve this."},
  {"question": "S-Class is from which Stray Kids album?", "options": ["ODDINARY", "MAXIDENT", "5-STAR", "Rock-Star"], "correct": 2, "fun_fact": "5-STAR was Stray Kids'' third album to top the Billboard 200."},
  {"question": "What is the Korean title of the song Thunderous?", "options": ["Back Door", "Ssoriggoon", "Miroh", "Hellevator"], "correct": 1, "fun_fact": "Ssoriggoon (Thunderous) incorporates traditional Korean musical elements like gayageum and pansori."},
  {"question": "Which was Stray Kids'' debut track?", "options": ["Miroh", "Hellevator", "District 9", "My Pace"], "correct": 2, "fun_fact": "District 9 was the title track from their debut EP I Am NOT, though Hellevator was their pre-debut single."},
  {"question": "Which Stray Kids album features the song Cheese?", "options": ["ATE", "MAXIDENT", "Rock-Star", "Christmas EveL"], "correct": 0, "fun_fact": "ATE was released in 2024 and features Chk Chk Boom as the title track."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 3, 'How well do you know SKZ members?', 'how-well-do-you-know-skz-members', 'multiple_choice', 'easy',
'[
  {"question": "Which Stray Kids members are from Australia?", "options": ["Bang Chan and Felix", "Felix and Hyunjin", "Bang Chan and Han", "Lee Know and Felix"], "correct": 0, "fun_fact": "Bang Chan is from Sydney and Felix is from Sydney as well. Both are Korean-Australian."},
  {"question": "Who is the leader of Stray Kids?", "options": ["Lee Know", "Changbin", "Bang Chan", "Han"], "correct": 2, "fun_fact": "Bang Chan (Christopher Bang) trained at JYP for about 7 years before debuting."},
  {"question": "Who is the maknae (youngest) of Stray Kids?", "options": ["Felix", "Seungmin", "I.N", "Han"], "correct": 2, "fun_fact": "I.N (Yang Jeongin) was born on February 8, 2001."},
  {"question": "Felix is known for his distinctive what?", "options": ["High-pitched voice", "Deep voice", "Whistle notes", "Falsetto"], "correct": 1, "fun_fact": "Felix''s surprisingly deep voice contrasts with his youthful appearance and is one of his most recognizable traits."},
  {"question": "Which member was a backup dancer before becoming a trainee?", "options": ["Felix", "Hyunjin", "Lee Know", "I.N"], "correct": 2, "fun_fact": "Lee Know was a backup dancer for BTS before auditioning for JYP and joining Stray Kids."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 3, 'Stray Kids achievements and records quiz', 'stray-kids-achievements-and-records', 'multiple_choice', 'medium',
'[
  {"question": "How many Stray Kids albums have reached #1 on the Billboard 200?", "options": ["1", "2", "3", "4"], "correct": 3, "fun_fact": "ODDINARY, 5-STAR, ATE, and Rock-Star all reached #1 on the Billboard 200."},
  {"question": "Stray Kids performed at which major competition show in 2021?", "options": ["Produce 101", "Kingdom: Legendary War", "MAMA", "Road to Kingdom"], "correct": 1, "fun_fact": "Stray Kids won Kingdom: Legendary War in 2021, significantly boosting their profile."},
  {"question": "In what year did Stray Kids first perform at a US stadium?", "options": ["2022", "2023", "2024", "They haven''t yet"], "correct": 1, "fun_fact": "Stray Kids became one of the few K-pop groups to sell out US stadium shows."},
  {"question": "Stray Kids'' SKZOO characters are what type of mascots?", "options": ["Dinosaurs", "Cute animals", "Robots", "Aliens"], "correct": 1, "fun_fact": "Each member has a unique animal character in the SKZOO line, like Wolf Chan, Leebit, and others."},
  {"question": "Which streaming platform hosted Stray Kids'' reality show SKZ Code?", "options": ["Netflix", "YouTube", "Mnet", "V Live"], "correct": 1, "fun_fact": "SKZ Code and other variety content are available on Stray Kids'' official YouTube channel."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 3, 'SKZ producing and self-made trivia', 'skz-producing-and-self-made-trivia', 'multiple_choice', 'hard',
'[
  {"question": "What does 3RACHA stand for or reference?", "options": ["Three rappers", "A play on Sriracha sauce", "Third generation", "A Korean word"], "correct": 1, "fun_fact": "3RACHA is a play on the hot sauce brand Sriracha, with 3 representing the three members."},
  {"question": "Who in 3RACHA goes by the producing alias CB97?", "options": ["Changbin", "Han", "Bang Chan", "None of them"], "correct": 2, "fun_fact": "CB97 stands for Christopher Bang born in 1997."},
  {"question": "Stray Kids are known as a ''self-produced'' group. What percentage of their music do they typically write?", "options": ["About 30%", "About 50%", "About 70%", "Nearly all of it"], "correct": 3, "fun_fact": "Stray Kids members are credited on nearly all their songs, with 3RACHA leading production."},
  {"question": "What is Changbin''s rap alias in 3RACHA?", "options": ["SpearB", "J.ONE", "CB97", "DANCERACHA"], "correct": 0, "fun_fact": "SpearB references the Korean meaning of Changbin''s name which relates to a bright spear."},
  {"question": "What is Han''s alias in 3RACHA?", "options": ["SpearB", "J.ONE", "HAN.zip", "Quokka"], "correct": 1, "fun_fact": "J.ONE is Han Jisung''s producing alias used in 3RACHA credits."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}');

-- ============================================
-- TWICE QUIZZES (group_id = 4)
-- ============================================

INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, questions, settings) VALUES
('00000000-0000-0000-0000-000000000001', 4, 'ONCE check - how well do you know TWICE?', 'once-check-how-well-do-you-know-twice', 'multiple_choice', 'easy',
'[
  {"question": "How many members are in TWICE?", "options": ["7", "8", "9", "10"], "correct": 2, "fun_fact": "TWICE has 9 members: Nayeon, Jeongyeon, Momo, Sana, Jihyo, Mina, Dahyun, Chaeyoung, and Tzuyu."},
  {"question": "TWICE was formed through which survival show?", "options": ["Produce 101", "Sixteen", "Nizi Project", "Finding TWICE"], "correct": 1, "fun_fact": "Sixteen aired on Mnet in 2015. Originally 16 contestants competed for spots in a 7-member group, but JYP decided to debut 9 members."},
  {"question": "Which company manages TWICE?", "options": ["SM Entertainment", "YG Entertainment", "JYP Entertainment", "HYBE"], "correct": 2},
  {"question": "Who is the leader of TWICE?", "options": ["Nayeon", "Jihyo", "Momo", "Sana"], "correct": 1, "fun_fact": "Jihyo trained at JYP for 10 years before debuting, making her one of the longest-training idols."},
  {"question": "How many Japanese members are in TWICE?", "options": ["1", "2", "3", "4"], "correct": 2, "fun_fact": "Momo, Sana, and Mina are the three Japanese members, sometimes called MiSaMo."},
  {"question": "Which member is from Taiwan?", "options": ["Mina", "Sana", "Tzuyu", "Dahyun"], "correct": 2, "fun_fact": "Tzuyu (Chou Tzu-yu) is from Tainan, Taiwan and is the youngest member of TWICE."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 4, 'TWICE title tracks challenge - name that song', 'twice-title-tracks-challenge-name-that-song', 'multiple_choice', 'medium',
'[
  {"question": "What was TWICE''s debut song?", "options": ["Cheer Up", "Like Ooh-Ahh", "TT", "Knock Knock"], "correct": 1, "fun_fact": "Like Ooh-Ahh was the first K-pop debut MV to reach 100 million views on YouTube."},
  {"question": "Which TWICE song is famous for the ''shy shy shy'' part?", "options": ["TT", "Cheer Up", "What is Love?", "Signal"], "correct": 1, "fun_fact": "Cheer Up won Song of the Year at the 2016 Melon Music Awards and Mnet Asian Music Awards."},
  {"question": "The TT in TWICE''s song TT represents what?", "options": ["A dance move", "A crying emoticon", "Their initials", "A drumbeat"], "correct": 1, "fun_fact": "TT represents the crying emoticon T_T and the song''s iconic hand gesture mimics tears falling."},
  {"question": "Which TWICE song marked their shift to a more mature concept?", "options": ["What is Love?", "Fancy", "Signal", "Likey"], "correct": 1, "fun_fact": "Fancy (2019) was widely praised for marking TWICE''s evolution from cute concepts to a more sophisticated style."},
  {"question": "Feel Special was released in which year?", "options": ["2018", "2019", "2020", "2021"], "correct": 1, "fun_fact": "Feel Special has emotional significance as it was released when several members were dealing with health and personal issues."},
  {"question": "What was TWICE''s first English single?", "options": ["The Feels", "Moonlight Sunrise", "Set Me Free", "I Can''t Stop Me"], "correct": 0, "fun_fact": "The Feels was released in October 2021 and peaked at #83 on the Billboard Hot 100."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 4, 'TWICE members facts quiz', 'twice-members-facts-quiz', 'multiple_choice', 'medium',
'[
  {"question": "Which TWICE member was the first to release a solo album?", "options": ["Jihyo", "Nayeon", "Momo", "Chaeyoung"], "correct": 1, "fun_fact": "Nayeon released IM NAYEON in June 2022, debuting at #7 on the Billboard 200."},
  {"question": "What is Nayeon''s debut solo single?", "options": ["ABCD", "POP!", "Dice", "Santa Tell Me"], "correct": 1, "fun_fact": "POP! became a viral hit and established Nayeon as a successful solo artist."},
  {"question": "Which member is known as the best dancer and was a contestant on a Japanese TV show?", "options": ["Mina", "Momo", "Sana", "Jihyo"], "correct": 1, "fun_fact": "Momo appeared on a Japanese dance survival show before joining JYP Entertainment."},
  {"question": "Which member is known for her elegant ballet background?", "options": ["Momo", "Mina", "Sana", "Tzuyu"], "correct": 1, "fun_fact": "Mina trained in ballet for over 10 years and her graceful style is evident in TWICE''s performances."},
  {"question": "Dahyun is known for what signature move from Sixteen?", "options": ["Shy shy shy", "Eagle dance", "TT gesture", "Heart shake"], "correct": 1, "fun_fact": "Dahyun''s eagle dance went viral during Sixteen and became one of her most iconic moments."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 4, 'TWICE from Sixteen to stardom quiz', 'twice-from-sixteen-to-stardom-quiz', 'multiple_choice', 'hard',
'[
  {"question": "In what year did the survival show Sixteen air?", "options": ["2014", "2015", "2016", "2017"], "correct": 1, "fun_fact": "Sixteen aired from May to July 2015 on Mnet, with TWICE debuting in October of the same year."},
  {"question": "How many contestants were originally on Sixteen?", "options": ["12", "14", "16", "20"], "correct": 2, "fun_fact": "16 JYP trainees competed on the show, and JYP surprised everyone by debuting 9 members instead of the planned 7."},
  {"question": "TWICE''s first daesang (grand prize) at year-end awards was for which song?", "options": ["Like Ooh-Ahh", "Cheer Up", "TT", "Signal"], "correct": 1, "fun_fact": "Cheer Up won Song of the Year at both MAMA and MMA in 2016."},
  {"question": "In what year did TWICE hold their first concert tour?", "options": ["2016", "2017", "2018", "2019"], "correct": 2, "fun_fact": "TWICELAND The Opening was their first solo concert tour, starting in February 2017 in Seoul."},
  {"question": "TWICE''s Japanese debut single was which song?", "options": ["TT Japanese ver.", "One More Time", "Candy Pop", "Wake Me Up"], "correct": 1, "fun_fact": "One More Time was released in October 2017 and was an original Japanese song, not a Korean remake."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 4, 'TWICE music videos quiz - visual trivia', 'twice-music-videos-quiz-visual-trivia', 'multiple_choice', 'medium',
'[
  {"question": "In the TT MV, the members dress up as what for Halloween?", "options": ["Superheroes", "Disney characters and movie characters", "Animals", "Historical figures"], "correct": 1, "fun_fact": "Members dressed as Tinker Bell, the Little Mermaid, Pinocchio, a pirate, and other characters."},
  {"question": "Which TWICE MV features a colorful phone booth?", "options": ["What is Love?", "Likey", "Heart Shaker", "Dance The Night Away"], "correct": 1, "fun_fact": "Likey was filmed in Vancouver, Canada and features the members vlogging their adventures."},
  {"question": "What is Love? MV pays tribute to scenes from famous what?", "options": ["Anime", "Movies", "Musicals", "TV shows"], "correct": 1, "fun_fact": "The MV recreates scenes from movies like La La Land, Romeo and Juliet, Ghost, and The Princess Diaries."},
  {"question": "Dance The Night Away MV was filmed at which type of location?", "options": ["An amusement park", "A beach", "A ski resort", "A shopping mall"], "correct": 1, "fun_fact": "The summer-themed MV was filmed at a beach location, fitting the song''s refreshing concept."},
  {"question": "In which MV do the members go to school in different timelines?", "options": ["Signal", "Knock Knock", "Like Ooh-Ahh", "Yes or Yes"], "correct": 0, "fun_fact": "Signal has a time-travel concept with members communicating across different years."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}');

-- ============================================
-- aespa QUIZZES (group_id = 5)
-- ============================================

INSERT INTO public.quizzes (creator_id, group_id, title, slug, quiz_type, difficulty, questions, settings) VALUES
('00000000-0000-0000-0000-000000000001', 5, 'MY quiz - how well do you know aespa?', 'my-quiz-how-well-do-you-know-aespa', 'multiple_choice', 'easy',
'[
  {"question": "When did aespa debut?", "options": ["March 2020", "November 2020", "January 2021", "May 2021"], "correct": 1, "fun_fact": "aespa debuted on November 17, 2020 under SM Entertainment with the single Black Mamba."},
  {"question": "How many members are in aespa?", "options": ["3", "4", "5", "6"], "correct": 1, "fun_fact": "aespa has 4 members: Karina, Giselle, Winter, and NingNing."},
  {"question": "Which company manages aespa?", "options": ["JYP Entertainment", "SM Entertainment", "YG Entertainment", "HYBE"], "correct": 1, "fun_fact": "SM Entertainment is also home to EXO, Red Velvet, and NCT."},
  {"question": "What is aespa''s fandom name?", "options": ["KWANGYA", "MY", "Black Mamba", "Synk"], "correct": 1, "fun_fact": "MY comes from the idea that fans are aespa''s most precious ''MY'' - symbolizing a deep connection."},
  {"question": "What is the name of aespa''s debut song?", "options": ["Next Level", "Savage", "Black Mamba", "Forever"], "correct": 2, "fun_fact": "Black Mamba is also the name of the villain in aespa''s universe lore."},
  {"question": "Who is the leader of aespa?", "options": ["Winter", "Karina", "Giselle", "NingNing"], "correct": 1, "fun_fact": "Karina (Yu Jimin) is the leader and one of the main dancers and rappers."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 5, 'aespa lore and KWANGYA universe trivia', 'aespa-lore-and-kwangya-universe-trivia', 'multiple_choice', 'hard',
'[
  {"question": "What is KWANGYA in aespa''s universe?", "options": ["A planet", "A virtual world/dimension", "A weapon", "A song title"], "correct": 1, "fun_fact": "KWANGYA is the virtual world where aespa''s AI counterparts (ae) exist alongside the human members."},
  {"question": "What are aespa''s AI counterparts called?", "options": ["Avatars", "ae-members", "Synk", "naevis"], "correct": 1, "fun_fact": "Each member has an ae counterpart: ae-Karina, ae-Giselle, ae-Winter, and ae-NingNing."},
  {"question": "Who is naevis in aespa''s lore?", "options": ["The villain", "An AI guide/ally", "A rival group", "A planet"], "correct": 1, "fun_fact": "naevis is an AI being who helps aespa navigate between the real world and KWANGYA."},
  {"question": "Black Mamba in aespa''s universe represents what?", "options": ["An ally", "A powerful weapon", "The main villain/evil force", "A portal"], "correct": 2, "fun_fact": "Black Mamba is an evil entity in KWANGYA that tries to sever the connection between aespa and their ae counterparts."},
  {"question": "The song Next Level references traveling to where?", "options": ["Earth", "KWANGYA", "Neverland", "The metaverse"], "correct": 1, "fun_fact": "Next Level follows aespa''s journey to KWANGYA to fight Black Mamba and find naevis."},
  {"question": "What does the ''ae'' in aespa stand for?", "options": ["Artificial experience", "Avatar and experience", "Augmented experience", "All of the above"], "correct": 1, "fun_fact": "ae represents both the members'' Avatar and Experience, central concepts in their lore."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 5, 'aespa discography challenge', 'aespa-discography-challenge', 'multiple_choice', 'medium',
'[
  {"question": "Next Level was originally a song from which movie franchise?", "options": ["Transformers", "Fast & Furious", "Mission Impossible", "Marvel"], "correct": 1, "fun_fact": "Next Level was originally from the Fast & Furious Presents: Hobbs & Shaw soundtrack, reimagined by SM for aespa."},
  {"question": "What is the name of aespa''s first mini album?", "options": ["Girls", "Savage", "MY WORLD", "Armageddon"], "correct": 1, "fun_fact": "Savage was released in October 2021 and debuted at #20 on the Billboard 200."},
  {"question": "Which song became a massive viral hit in 2024 for aespa?", "options": ["Drama", "Spicy", "Supernova", "Better Things"], "correct": 2, "fun_fact": "Supernova went viral across Asia and became one of the biggest K-pop songs of 2024."},
  {"question": "Spicy is from which aespa album?", "options": ["Savage", "Girls", "MY WORLD", "Armageddon"], "correct": 2, "fun_fact": "MY WORLD was released in May 2023 and marked aespa''s first release in about a year."},
  {"question": "What is the title track of aespa''s first full album?", "options": ["Savage", "Girls", "Armageddon", "Supernova"], "correct": 2, "fun_fact": "Armageddon was released in 2024 as aespa''s first full-length studio album."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 5, 'aespa members facts quiz', 'aespa-members-facts-quiz', 'multiple_choice', 'easy',
'[
  {"question": "Which aespa member is from China?", "options": ["Karina", "Giselle", "Winter", "NingNing"], "correct": 3, "fun_fact": "NingNing (Ning Yizhuo) is from Harbin, China and speaks Mandarin, Korean, and English."},
  {"question": "Giselle is of which nationality?", "options": ["Korean", "Japanese-Korean", "Chinese-Korean", "American-Korean"], "correct": 1, "fun_fact": "Giselle (Aeri Uchinaga) is half Japanese and half Korean, and speaks Japanese, Korean, and English fluently."},
  {"question": "Which member is known for her powerful vocals and high notes?", "options": ["Karina", "Giselle", "Winter", "NingNing"], "correct": 2, "fun_fact": "Winter is the main vocalist of aespa and is known for her strong, stable vocals during live performances."},
  {"question": "What was Karina known for before debut?", "options": ["Acting in dramas", "Being an SM rookie dancer", "Modeling in Japan", "YouTube covers"], "correct": 1, "fun_fact": "Karina appeared in several SM Station videos and was known as an SM rookie before aespa''s debut."},
  {"question": "Who is the youngest member of aespa?", "options": ["Winter", "NingNing", "Karina", "Giselle"], "correct": 1, "fun_fact": "NingNing was born on October 23, 2002, making her the maknae of the group."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}'),

('00000000-0000-0000-0000-000000000001', 5, 'aespa achievements and milestones quiz', 'aespa-achievements-and-milestones-quiz', 'multiple_choice', 'medium',
'[
  {"question": "How quickly did Black Mamba reach 100 million views on YouTube?", "options": ["1 month", "3 months", "About 2 weeks", "6 months"], "correct": 0, "fun_fact": "Black Mamba reached 100 million views in about a month, setting records for SM Entertainment rookie groups."},
  {"question": "aespa performed at which major US music festival?", "options": ["Lollapalooza", "Coachella", "Both Coachella and Lollapalooza", "Glastonbury"], "correct": 2, "fun_fact": "aespa performed at both Coachella and Lollapalooza, cementing their status as global artists."},
  {"question": "Next Level topped music charts for how many consecutive weeks in Korea?", "options": ["2 weeks", "5 weeks", "8 weeks", "Over 10 weeks"], "correct": 2, "fun_fact": "Next Level dominated Korean charts for about 8 weeks, one of the longest runs for a K-pop song in 2021."},
  {"question": "aespa won Rookie of the Year at which major awards show?", "options": ["Only MAMA", "Only MMA", "Both MAMA and MMA", "They didn''t win any"], "correct": 2, "fun_fact": "aespa swept multiple Rookie of the Year awards in 2021, winning at both MAMA and Melon Music Awards."},
  {"question": "In what year did aespa release their first full-length studio album?", "options": ["2022", "2023", "2024", "They haven''t yet"], "correct": 2, "fun_fact": "Armageddon was released in 2024 as aespa''s first full studio album."}
]',
'{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}');
