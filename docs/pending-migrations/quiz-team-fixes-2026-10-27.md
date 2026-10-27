# Corrections of five Team quizzes, and MAMAMOO Curtain Call to draft (2026-10-27)

Owner decisions of 2026-10-27: the Team quizzes with wrong answers are corrected in one file, with the method of the ITZY fix (md5 checked before and after, a rollback, a proof per change); MAMAMOO "Curtain Call" goes to draft, a checked rewrite comes later. The wrong answers were found by the explanations circuit of lot E1 (docs/seo/strategy-2026-10-27/explanations/e1/QUIZ-ISSUES-E1.md); every question of the five quizzes was then rechecked at its source by a writer, and every corrected question by an independent checker.

SQL: `quiz-team-fixes-2026-10-27.sql` and its rollback, owner-gated. Paste it after `seo-explanations-e1.sql`.

| Quiz | Questions changed | md5 read on 2026-10-27 (quiz / bank) | md5 after (quiz / bank) |
|---|---|---|---|
| gi-dle-the-tomboy-era | 10 of 10 (2 wrong answers, 2 replaced questions, fun facts) | bf08a80bc2fbb78c2987d61d4e9301b5 / 1213132a60f0343afce4138ac03e2a73 | 4e8352a570d9593f2a3a64e088c7964b / 50285d016f4654cf72c4a7f6de6d49b9 |
| 4th-gen-groups-true-or-false | 6 of 10 (Q3 marked False: its statement is false; fun facts) | fac08481609c732d1712e92bea54e6d0 / b021ffdfbb5d356ace9fbd684da2c185 | cff263df134d4efb9f8b22789831723e / fa2efc9b72365531462cde37eb34ac29 |
| k-pop-streaming-records | 10 of 10 (4 replaced questions, 1 wrong option, fun facts) | 2558a858b09e6eee94f39880f4f8bd53 / 2d5366bae2ef6f4c3540af6f59680ac7 | 329bca1a9bc10ecb5bdfca50c23e2c1c / 3207da0654f675d5384a0e2ceb416e84 |
| bts-music-video-trivia-can-you-get-100 | 5 of 5 (2 replaced questions, 1 rewritten stem, fun facts) | 926e323ef1d01afc4d4ac0356746464d / no bank row | cf84b70b2efabf21f0f9d64a48980580 / no bank row |
| twice-members-facts-quiz | 4 of 5 (2 corrected premises, fun facts) | 1100c3aded58bf2f1b436e6ed2668fe5 / no bank row | b7aa85eec09764c6eda1d2419f10f3ca / no bank row |
| mamamoo-the-curtain-call-era | to draft (built on an album that does not exist) | e51d0edfea827c59afdf98e25c86b0af | status draft, questions unchanged |

Same number of questions, same order, the right answer at the same position in every question. Nothing else changes: not the titles, the counters, the slugs or updated_at.

The E1 explanations: three (G)I-DLE explanations follow their question, whose only change is that quotation marks left it (Q1 to Q3); the BTS Q4 explanation is retired, because its question was rewritten (it named its own answer and called the setting a hotel). If seo-explanations-e1.sql is not applied, this part is skipped.

Tested on a local Postgres loaded with the live content (same md5 as production): applied without and with the E1 explanations table; the five quizzes reach exactly the corrected md5, MAMAMOO goes to draft, updated_at does not move, 3 explanations re-matched and 1 retired; a second run is refused by the guard; the rollback restores every md5, MAMAMOO and the explanations, and a second rollback is refused.

## Independent check

A second reader answered every corrected question from the pages before looking at the marked answer: all 40 marked answers right, no second right option. Seven texts were then changed, and these final texts replace the "After" lines below where they differ:

- k-pop-streaming-records Q5 fun fact: the YouTube view counter story is a joke per Wikipedia. Now: In 2014 it also became the first video to pass two billion views, a milestone YouTube marked with a second dancing PSY animation.
- bts-music-video-trivia Q1 fun fact: Now: The video came out in April 2018, but the song itself was only released that August, on the album Love Yourself: Answer.
- gi-dle Q2 fun fact (wording too close to the source): Now: Samson of High Quality Fish directed its music video, which passed 200 million YouTube views on January 17, 2023.
- gi-dle Q8 question (wording too close to the source): Now: Which I NEVER DIE track blends dark electro-pop with hip-hop, rock and violin?
- 4th gen Q2 fun fact (wording): Now: I-LAND aired in 2020, and the group's debut EP, Border: Day One, followed on November 30, 2020.
- k-pop-streaming-records Q10 fun fact (wording): Now: TikTok users had put the song in eight million videos by May 2023, and it later climbed to number 17 on the Billboard Hot 100.
- twice Q2 fun fact (wording): Now: POP! reached second place on South Korea's Circle Digital Chart and also made the top ten in several other Asian markets.

## Fix of /q/gi-dle-the-tomboy-era (owner request, 2026-10-27)

The live quiz "(G)I-DLE: The TOMBOY Era" (bank quiz of 2026-04-08, KpopQuizz Team) is corrected, not unpublished. All ten cited sources were soompi.com article URLs or a YouTube video, none of them allowed sources; every question was rechecked on Wikipedia pages opened on 2026-10-27. The check confirmed the two wrong answers found by E1 (Q4: TOMBOY did not win Song of the Year anywhere; Q9: (G)I-DLE did not win Best Female Group at the 2022 MAMA Awards), the unverifiable piano claim (Q5) and the opinion question (Q8). Fun facts lost their quotation marks, double hyphens, a lyric quote (Q3), two mentions of a former member's departure (Q1, Q7; the departure followed a controversy, a banned topic), unsourced superlatives, and the Q1 fun fact that gave away the answer of Q7 (five members). Q1, Q2 and Q3 keep their wording and answers except for the quotation marks around album and song titles. Same 10 questions in the same order, every right answer at the same position (1,2,1,3,2,1,1,1,2,1). Known limit: the quiz title names TOMBOY, so Q2 (lead single of I NEVER DIE) stays easy; it has a published E1 explanation and is not wrong, so it was kept.

### Q1: changed (quotation marks removed only)

- Before: When was (G)I-DLE's 'I NEVER DIE' album (TOMBOY era) released? Answer: March 2022 (options: 2021, March 2022, November 2022, 2023). Fun fact: (G)I-DLE released 'I NEVER DIE' on March 14, 2022, their first album as a 5-member group after Soojin's departure in August 2021.
- After: When was (G)I-DLE's I NEVER DIE album (TOMBOY era) released? Answer: March 2022 (options: 2021, March 2022, November 2022, 2023). Fun fact: It was the group's first studio album, released digitally on March 14, 2022 and on CD the following day.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: Wikipedia dates the digital release to March 14, 2022 and the physical release to the next day, and calls it the group's first studio album. Only the quotation marks around the album title were removed (rule: no quotation marks in music questions); the words and the answer are unchanged, so the published E1 explanation still fits. The old fun fact named a former member's departure (which followed a controversy) and gave away the answer of Q7 (five members); the new one stays on the release itself. The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/I_Never_Die
- Bank source: https://en.wikipedia.org/wiki/I_Never_Die

### Q2: changed (quotation marks removed only)

- Before: What was the lead single from 'I NEVER DIE'? Answer: TOMBOY (options: HWAA, Nxde, TOMBOY, MY BAG). Fun fact: 'TOMBOY' became one of (G)I-DLE's most iconic songs -- a defiant anthem about rejecting labels and societal expectations.
- After: What was the lead single from I NEVER DIE? Answer: TOMBOY (options: HWAA, Nxde, TOMBOY, MY BAG). Fun fact: Its music video, directed by Samson of High Quality Fish, passed 200 million YouTube views on January 17, 2023.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: the album page names Tomboy as its lead single, released March 14, 2022; MY BAG is the album's closing track, HWAA is a 2021 single (I Burn) and Nxde a later 2022 single (I Love). Only the quotation marks around the album title were removed. The old fun fact had a double hyphen, an unsourced superlative (most iconic) and repeated the theme asked in Q3; the new one is on the Tomboy page (director Samson of High Quality Fish, 200 million views on January 17, 2023). The cited YouTube URL is not an allowed source. https://en.wikipedia.org/wiki/Tomboy_((G)I-dle_song) and https://en.wikipedia.org/wiki/I_Never_Die
- Bank source: https://en.wikipedia.org/wiki/Tomboy_((G)I-dle_song)

### Q3: changed (quotation marks removed only)

- Before: What themes define 'TOMBOY'? Answer: Defiance of gender norms and labels, doing whatever you want (options: Romantic love, Defiance of gender norms and labels, doing whatever you want, Grief and loss, Patriotism). Fun fact: 'TOMBOY' is a powerful statement about rejecting labels -- 'Don't call me baby' -- expressing freedom from societal expectations.
- After: What themes define TOMBOY? Answer: Defiance of gender norms and labels, doing whatever you want (options: Romantic love, Defiance of gender norms and labels, doing whatever you want, Grief and loss, Patriotism). Fun fact: Its inspiration was the fictional villain Cruella de Vil, and Billboard later named it the best K-pop song of 2022.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer stands (E1 checked it): Wikipedia describes the song as being about independence and breaking the mold of an ideal partner stereotype, and the album page says the record speaks out against prejudice; the three other options clearly do not fit. Only the quotation marks around the song title were removed. The old fun fact quoted a lyric (banned) and had a double hyphen; the new one is on the Tomboy page (inspired by the fictional character Cruella de Vil; first on Billboard's list of the 25 best K-pop songs of 2022). The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/Tomboy_((G)I-dle_song)
- Bank source: https://en.wikipedia.org/wiki/Tomboy_((G)I-dle_song)

### Q4: changed

- Before: What milestone did 'TOMBOY' achieve in South Korea? Answer: It won Song of the Year at every major Korean awards show (options: First K-pop song by a girl group to chart for 10 weeks at #1 on Melon simultaneously in multiple countries, It became the best-selling single of 2022 in Korea, It debuted at #1 on Billboard Hot 100, It won Song of the Year at every major Korean awards show). Fun fact: 'TOMBOY' swept major awards at 2022 Korean year-end ceremonies, winning Song of the Year at multiple shows.
- After: Which prize did TOMBOY win at the 2022 Melon Music Awards in South Korea? Answer: Music Video of the Year (options: Song of the Year, Record of the Year, Best Collaboration, Music Video of the Year). Fun fact: On the Gaon Digital Chart, now the Circle Digital Chart, it rose to number one in its second week and ranked second for all of 2022.
- Why and proof: (E1: writer answer_wrong, check CONFIRMED, published explanation: no.) Wrong answer (E1 answer_wrong, confirmed): TOMBOY did not win Song of the Year at every major Korean show; Wikipedia lists only Song of the Year nominations (Melon 2022, Genie 2022, Korean Music Awards 2023), and no other old option was true (it was second, not first, on Circle's 2022 year-end chart, and its page lists no US Billboard Hot 100 entry at all). Same theme, a milestone in South Korea: at the 2022 Melon Music Awards TOMBOY won Music Video of the Year. The other options are prizes it did not win there: Song of the Year went to IVE's Love Dive (TOMBOY was only nominated), Record of the Year to BTS, Best Collaboration to 10cm and Big Naughty. Fun fact from the Tomboy page: number two on the Gaon Digital Chart in its first week, number one the next week, second on Circle's 2022 year-end chart. The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/2022_Melon_Music_Awards and https://en.wikipedia.org/wiki/Tomboy_((G)I-dle_song)
- Bank source: https://en.wikipedia.org/wiki/2022_Melon_Music_Awards

### Q5: changed

- Before: What instrument does Minnie play in (G)I-DLE's live performances? Answer: Piano (options: Violin, Guitar, Piano, Drums). Fun fact: Minnie is a trained pianist who often performs on piano during (G)I-DLE's live stages and concert performances.
- After: Which instrument has Minnie played since childhood and uses to write songs? Answer: Piano (options: Violin, Guitar, Piano, Cello). Fun fact: Minnie made her solo debut with the EP Her on January 21, 2025.
- Why and proof: (E1: writer unverifiable, check CONFIRMED, published explanation: no.) Unverifiable (E1, confirmed): no allowed source says Minnie plays piano in the group's live performances. Reworded to what her Wikipedia page states: she has played piano since she was four and makes her songs on piano. Option Drums was replaced by Cello because the same page says she was a drummer at school, which made Drums a possible second answer for a childhood instrument. The old fun fact (piano on live stages) had no source; the new one is on the same page (solo EP Her, January 21, 2025). The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/Minnie_(singer)
- Bank source: https://en.wikipedia.org/wiki/Minnie_(singer)

### Q6: changed (fun fact only)

- Before: Which (G)I-DLE member is the primary songwriter and producer? Answer: Soyeon (options: Miyeon, Soyeon, Minnie, Shuhua). Fun fact: Soyeon is the central creative force in (G)I-DLE, writing, composing, and producing most of the group's discography since debut.
- After: Which (G)I-DLE member is the primary songwriter and producer? Answer: Soyeon (options: Miyeon, Soyeon, Minnie, Shuhua). Fun fact: Soyeon, the group's leader, won Best Songwriter at the Melon Music Awards in 2022 and again in 2024.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: Soyeon is the leader and has written and produced most of the group's lead singles (Wikipedia, Soyeon), and the I NEVER DIE page says she co-wrote and produced most of the album. Question unchanged. The old fun fact (most of the discography since debut) went beyond the source; the new one is in the awards table of her page (Melon Music Awards, Best Songwriter, won in 2022 and 2024). The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/Soyeon and https://en.wikipedia.org/wiki/I_Never_Die
- Bank source: https://en.wikipedia.org/wiki/Soyeon

### Q7: changed (fun fact only)

- Before: How many members does (G)I-DLE have during the TOMBOY era? Answer: 5 (options: 6, 5, 4, 7). Fun fact: After Soojin's departure in 2021, (G)I-DLE continued as a 5-member group: Miyeon, Minnie, Soyeon, Yuqi, and Shuhua.
- After: How many members does (G)I-DLE have during the TOMBOY era? Answer: 5 (options: 6, 5, 4, 7). Fun fact: The five were Miyeon, Minnie, Soyeon, Yuqi and Shuhua, and the same five took the new group name i-dle in May 2025.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: I NEVER DIE and TOMBOY were the group's first releases as a quintet (Wikipedia, I Never Die and Tomboy pages); the I-dle page lists the five members. Question unchanged. The old fun fact named a former member's departure, which followed a controversy (banned topic); the new one names the five and the renaming to i-dle in May 2025, both on the I-dle page. The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/I-dle and https://en.wikipedia.org/wiki/I_Never_Die
- Bank source: https://en.wikipedia.org/wiki/I-dle

### Q8: changed (replaced, same theme)

- Before: What fan-favorite track from I NEVER DIE became a concert staple? Answer: VILLAIN DIES (options: Already, VILLAIN DIES, My Bag, Oh My God). Fun fact: 'VILLAIN DIES' became an acclaimed performance track from I NEVER DIE, praised for Soyeon's dynamic rapping and Miyeon's powerful vocals.
- After: Which I NEVER DIE track is a dark electro-pop song that also mixes in hip-hop, rock and violin? Answer: VILLAIN DIES (options: Already, VILLAIN DIES, My Bag, Oh My God). Fun fact: The group also performed it on M Countdown and at the 37th Golden Disc Awards, alongside the lead single and My Bag.
- Why and proof: (E1: writer ambiguous, check CONFIRMED, published explanation: no.) Ambiguous (E1, confirmed): fan favorite and concert staple are opinions, and My Bag, another option and another track of the album, was performed next to VILLAIN DIES at the 2022 MAMA, Melon and Golden Disc shows. The new question stays on the album's tracks with a fact the album page states: track 3, VILLAIN DIES, is a dark electro-pop song that combines hip-hop and rock with violin. Already is described there as soft R&B and pop, My Bag as the closing hip-hop rap track, and Oh My God is not on the album (2020 single). Fun fact from the same page (performances on M Countdown and at the 37th Golden Disc Awards with Tomboy and My Bag). The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/I_Never_Die
- Bank source: https://en.wikipedia.org/wiki/I_Never_Die

### Q9: changed

- Before: What award did (G)I-DLE win at the 2022 Mnet Asian Music Awards? Answer: Best Female Group (options: Best Choreography, Artist of the Year, Best Female Group, Song of the Year). Fun fact: The I NEVER DIE era solidified (G)I-DLE as the top girl group of 2022, culminating in major award wins including Best Female Group at MAMAs.
- After: Which award did (G)I-DLE win at the 2022 MAMA Awards? Answer: Favorite Female Group (options: Best Female Group, Artist of the Year, Favorite Female Group, Song of the Year). Fun fact: That edition, held at the Kyocera Dome Osaka in Japan, was the first under the new MAMA Awards name.
- Why and proof: (E1: writer answer_wrong, check CONFIRMED, published explanation: no.) Wrong answer (E1 answer_wrong, confirmed): at the 2022 MAMA Awards, Best Female Group went to BLACKPINK; (G)I-DLE won Favorite Female Group. The stem now uses the name of that edition (Mnet Asian Music Awards was renamed MAMA Awards in August 2022). The right option is now Favorite Female Group, at the same position; the three other options are categories where (G)I-DLE was nominated and lost: Best Female Group (BLACKPINK), Artist of the Year (BTS), Song of the Year (IVE, Love Dive). Best Choreography, an old option, is not a 2022 category. The old fun fact (top girl group of 2022) had no source; the new one is on the same page (Kyocera Dome Osaka, first ceremony under the new name). The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/2022_MAMA_Awards
- Bank source: https://en.wikipedia.org/wiki/2022_MAMA_Awards

### Q10: changed (fun fact only)

- Before: What era preceded TOMBOY that showed (G)I-DLE's traditional/ethnic concept? Answer: HWAA era (options: Latata era, HWAA era, Oh My God era, Lion era). Fun fact: The 'HWAA' era (2021) featured traditional imagery including hanbok-inspired visuals, before TOMBOY's bold contemporary concept pivot.
- After: What era preceded TOMBOY that showed (G)I-DLE's traditional/ethnic concept? Answer: HWAA era (options: Latata era, HWAA era, Oh My God era, Lion era). Fun fact: HWAA came out on January 11, 2021 as the lead single of the EP I Burn and peaked at number four on the Gaon Digital Chart, a first top five hit for the group.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right (E1 checked it): HWAA, the lead single of I Burn (January 11, 2021), uses East Asian instrumentation, and reviewers quoted on the Hwaa page note styling that calls back to traditional East Asian dress; I NEVER DIE was the next release in the I series after I Burn. Question unchanged. The old fun fact claimed hanbok visuals, which no source states, and had quotation marks; the new one is on the Hwaa page (lead single of I Burn, January 11, 2021, number four on the Gaon Digital Chart, the group's first top five hit there). The cited soompi.com URL is not an allowed source. https://en.wikipedia.org/wiki/Hwaa and https://en.wikipedia.org/wiki/I_Never_Die
- Bank source: https://en.wikipedia.org/wiki/Hwaa

## Fix of /q/4th-gen-groups-true-or-false (owner request, 2026-10-27)

The live quiz "4th Gen Groups True or False" (bank quiz of 2026-05-19, KpopQuizz Team) is corrected, not unpublished. Every statement was rechecked on the Wikipedia page of its group, opened on 2026-10-27. One answer was wrong (Q3: the statement says Together X Tomorrow, but the name is Tomorrow X Together, so it is false and was marked true). The fix keeps the statement and marks it false: the quiz had 3 false statements as marked and now has 4 (Q3, Q4, Q6, Q9), inside the 4 to 6 rule. Fun facts were fixed where they had gone stale or past the source: NewJeans (debut release), ENHYPEN (seven members: Heeseung left in March 2026), TXT (Big Hit Music did not exist in 2019), NMIXX and aespa (member counts now dated), (G)I-DLE (unsourced nearly all, and the May 2025 renaming to i-dle). No statement text was changed; all ten have a published E1 explanation except Q3, whose answer changes. Boolean pattern before (as marked): T,T,T,F,T,F,T,T,F,T; after: T,T,F,F,T,F,T,T,F,T. Note for the owner: the title calls (G)I-DLE, ATEEZ, Stray Kids and TXT 4th generation, a label the rules treat as disputed for 2018 and 2019 debuts; the statements themselves do not use it.

### Q1: changed (fun fact only)

- Before: NewJeans debuted in 2022. Answer: True. Fun fact: NewJeans debuted on July 22, 2022 under ADOR (a subsidiary of HYBE) with the EP New Jeans.
- After: NewJeans debuted in 2022. Answer: True. Fun fact: Their first single, Attention, came out on July 22, 2022, and their debut EP, New Jeans, followed in August.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) True: NewJeans released their first single, Attention, on July 22, 2022, and their eponymous debut EP in August 2022 (Wikipedia). Statement unchanged. The old fun fact said they debuted with the EP New Jeans, but the EP came out after the first single; it also named the agency, which is now tied to a contract dispute. https://en.wikipedia.org/wiki/NewJeans
- Bank source: https://en.wikipedia.org/wiki/NewJeans

### Q2: changed (fun fact only)

- Before: ENHYPEN was formed through the survival show I-LAND. Answer: True. Fun fact: ENHYPEN was formed through I-LAND, a joint project between HYBE and CJ ENM that aired in 2020. The seven members were selected from the show.
- After: ENHYPEN was formed through the survival show I-LAND. Answer: True. Fun fact: I-LAND aired in 2020, and ENHYPEN debuted on November 30, 2020 with the EP Border: Day One.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) True: ENHYPEN was formed through the 2020 survival show I-Land and debuted on November 30, 2020 with Border: Day One (Wikipedia). Statement unchanged. The old fun fact said the seven members were selected on the show; the group now has six members (Heeseung left in March 2026, per the same page), and it called the show a joint project of HYBE and CJ ENM, which the page does not say (it calls Belift Lab a former joint venture). The new fun fact keeps to the debut. https://en.wikipedia.org/wiki/Enhypen
- Bank source: https://en.wikipedia.org/wiki/Enhypen

### Q3: changed (answer: true to false)

- Before: TXT stands for Together X Tomorrow. Answer: True. Fun fact: TXT (Tomorrow X Together) debuted in March 2019 under Big Hit Music (HYBE). The name symbolizes different individuals coming together to create a new tomorrow.
- After: TXT stands for Together X Tomorrow. Answer: False. Fun fact: The name is Tomorrow X Together, and Big Hit Entertainment launched the group on March 4, 2019 with The Dream Chapter: Star.
- Why and proof: (E1: writer answer_wrong, check CONFIRMED, published explanation: no.) Wrong answer (E1 answer_wrong, confirmed): the group's name is Tomorrow X Together, commonly abbreviated TXT (first sentence of the Wikipedia page), so the statement as written is false but was marked true. Minimal fix: the statement is kept as a trap and marked false, which also brings the quiz from 3 to 4 false statements (the 4 to 6 rule). The old fun fact said Big Hit Music (HYBE), a label name that did not exist at the 2019 debut, and an unsourced meaning of the name; the new one states the real name and the debut (Big Hit Entertainment, March 4, 2019, The Dream Chapter: Star). https://en.wikipedia.org/wiki/Tomorrow_X_Together
- Bank source: https://en.wikipedia.org/wiki/Tomorrow_X_Together

### Q4: changed (fun fact dated)

- Before: aespa has 6 members. Answer: False. Fun fact: aespa has 4 members: Karina, Giselle, Winter, and Ningning. They debuted under SM Entertainment in November 2020.
- After: aespa has 6 members. Answer: False. Fun fact: As of 2026, aespa has 4 members: Karina, Giselle, Winter and Ningning. They debuted under SM Entertainment in November 2020.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) False: aespa consists of four members, Karina, Giselle, Winter and Ningning, formed by SM Entertainment, debut November 17, 2020 (Wikipedia, current on 2026-10-27). Statement unchanged; the fun fact only gains As of 2026, since a member count can change. https://en.wikipedia.org/wiki/Aespa
- Bank source: https://en.wikipedia.org/wiki/Aespa

### Q5: unchanged, checked

- Before: LE SSERAFIM is under HYBE Labels. Answer: True. Fun fact: LE SSERAFIM is under SOURCE MUSIC, a subsidiary of HYBE. They debuted in May 2022.
- After: same as before.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) True: LE SSERAFIM was formed by Source Music, a sub-label of HYBE, and debuted on May 2, 2022 with Fearless (Wikipedia); the label is still Source on 2026-10-27. Fun fact matches the page. https://en.wikipedia.org/wiki/Le_Sserafim
- Bank source: https://en.wikipedia.org/wiki/Le_Sserafim

### Q6: unchanged, checked

- Before: IVE is under SM Entertainment. Answer: False. Fun fact: IVE is under Starship Entertainment, not SM Entertainment. They debuted in December 2021 with ELEVEN.
- After: same as before.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) False: IVE was formed by Starship Entertainment and debuted on December 1, 2021 with the single album Eleven (Wikipedia). Fun fact matches the page. https://en.wikipedia.org/wiki/Ive_(group)
- Bank source: https://en.wikipedia.org/wiki/Ive_(group)

### Q7: unchanged, checked

- Before: ATEEZ debuted in 2018. Answer: True. Fun fact: ATEEZ debuted on October 24, 2018 under KQ Entertainment with their first EP TREASURE EP.1: All to Zero.
- After: same as before.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) True: ATEEZ, formed by KQ Entertainment, debuted on October 24, 2018 with the EP Treasure EP.1: All to Zero (Wikipedia). Fun fact matches the page. https://en.wikipedia.org/wiki/Ateez
- Bank source: https://en.wikipedia.org/wiki/Ateez

### Q8: unchanged, checked

- Before: Stray Kids was formed through a JYP Entertainment reality show. Answer: True. Fun fact: Stray Kids was formed through a 2017 JYP Entertainment reality survival show also called Stray Kids. The group officially debuted in March 2018.
- After: same as before.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) True: JYP Entertainment announced a reality survival show named Stray Kids in 2017 to launch the group, which officially debuted with I Am Not in March 2018 (Wikipedia). Fun fact matches the page. https://en.wikipedia.org/wiki/Stray_Kids
- Bank source: https://en.wikipedia.org/wiki/Stray_Kids

### Q9: changed (fun fact dated)

- Before: NMIXX is a 5-member group. Answer: False. Fun fact: NMIXX currently has 6 members: Lily, Haewon, Sullyoon, Bae, Jiwoo, and Kyujin. They are under JYP Entertainment and debuted in February 2022.
- After: NMIXX is a 5-member group. Answer: False. Fun fact: As of 2026, NMIXX has 6 members: Lily, Haewon, Sullyoon, Bae, Jiwoo and Kyujin. They are under JYP Entertainment and debuted in February 2022.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) False: NMIXX has six members, Lily, Haewon, Sullyoon, Bae, Jiwoo and Kyujin, formed by Squ4d, a division of JYP Entertainment, debut February 22, 2022 (Wikipedia, current on 2026-10-27). Statement unchanged; currently became As of 2026 in the fun fact. https://en.wikipedia.org/wiki/Nmixx
- Bank source: https://en.wikipedia.org/wiki/Nmixx

### Q10: changed (fun fact only)

- Before: (G)I-DLE is a self-producing girl group. Answer: True. Fun fact: Several (G)I-DLE members, particularly Soyeon, are heavily involved in writing and producing their own music. Soyeon has writing credits on nearly all of their songs.
- After: (G)I-DLE is a self-producing girl group. Answer: True. Fun fact: Soyeon, the group's leader, has written and produced most of its lead singles, and the group took the name i-dle in May 2025.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) True: Wikipedia describes the group as a self-producing idol group known for writing and producing much of its material; it was officially renamed i-dle in May 2025 with the same five members. Statement unchanged (it uses the name the quiz was written with). The old fun fact said Soyeon has writing credits on nearly all of their songs, which no source states; her page says she has written and produced most lead singles. https://en.wikipedia.org/wiki/I-dle and https://en.wikipedia.org/wiki/Soyeon
- Bank source: https://en.wikipedia.org/wiki/I-dle

## Fix of /q/k-pop-streaming-records (owner request, 2026-10-27)

The live quiz "K-pop Streaming Records" (bank quiz of 2026-06-10, KpopQuizz Team) is corrected, not unpublished. Every question was rechecked at an allowed source opened on 2026-10-27 (Wikipedia, NME, the Korea Times with Yonhap). The check confirmed E1: Q6 had a false premise (Dynamite was the first K-pop group song to 2 billion Spotify streams, but Jungkook's solo single Seven got there first), Q2 and Q7 claimed records no allowed source states, and Q10 asked an opinion (which platform launched NewJeans). These four were replaced on the same theme. It also found false or unsourced fun facts: Q1 repeated the false 2 billion claim, Q5 said Gangnam Style was the first video to 3 billion views (Wikipedia lists firsts at 1 and 2 billion only), Q7 and Q2 restated their unsourced records, Q8 called a 2022 record current. In Q4 one wrong option (first K-pop song to enter the Spotify top 10) could not be shown false for How You Like That and was replaced by a clearly false one. No question or answer text with a published E1 explanation was changed. Same 10 questions in the same order, every right answer at the same position (2,3,1,1,1,2,0,1,1,2). Known limit: Q3's stem names Dynamite, the answer of Q1; both have published E1 explanations and are not wrong, so they were kept, and the replaced Q6 no longer has Dynamite as its answer. The Q1 options use a spaced hyphen between artist and title (BTS - Dynamite), not an em or en dash; it was kept because it is part of the answer text with an E1 explanation.

### Q1: changed (fun fact only)

- Before: Which K-pop song was the first by any K-pop act to surpass 1 billion streams on Spotify? Answer: BTS - Dynamite (options: BLACKPINK - DDU-DU DDU-DU, PSY - Gangnam Style, BTS - Dynamite, BLACKPINK - Kill This Love). Fun fact: BTS's Dynamite became the first K-pop song to surpass 1 billion streams on Spotify on July 20, 2021. It also later became the first K-pop song to surpass 2 billion streams.
- After: Which K-pop song was the first by any K-pop act to surpass 1 billion streams on Spotify? Answer: BTS - Dynamite (options: BLACKPINK - DDU-DU DDU-DU, PSY - Gangnam Style, BTS - Dynamite, BLACKPINK - Kill This Love). Fun fact: Dynamite crossed one billion Spotify streams on July 20, 2021, less than a year after its August 2020 release.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: NME (Carmen Chin, July 21, 2021) reports that Dynamite passed one billion Spotify streams on July 20, 2021, making BTS the first Korean act to reach the mark. Question and options unchanged. The old fun fact also said Dynamite later became the first K-pop song past 2 billion streams, which is false: Jungkook's Seven passed 2.1 billion by December 2024 (Korea Herald) and Dynamite reached 2 billion in January 2025 as the first K-pop group song (Korea Times, Yonhap). The new fun fact keeps to the 1 billion date. https://www.nme.com/news/music/bts-dynamite-surpasses-one-billion-streams-on-spotify-2998803
- Bank source: https://www.nme.com/news/music/bts-dynamite-surpasses-one-billion-streams-on-spotify-2998803

### Q2: changed (replaced, same theme)

- Before: Which K-pop girl group was named Spotify's most-streamed girl group globally for five consecutive years from 2019 to 2023? Answer: BLACKPINK (options: TWICE, aespa, Girls' Generation, BLACKPINK). Fun fact: BLACKPINK held the title of Spotify's most-streamed girl group globally every year from 2019 through 2023, accumulating over 10 billion streams all-time.
- After: Which girl group's debut single, Magnetic, was among Spotify's 10 most-streamed K-pop songs worldwide in 2024? Answer: ILLIT (options: TWICE, aespa, Girls' Generation, ILLIT). Fun fact: ILLIT, formed through the 2023 survival show R U Next?, debuted on March 25, 2024, and Magnetic went on to top the Circle Digital Chart.
- Why and proof: (E1: writer unverifiable, check CONFIRMED, published explanation: no.) Unverifiable (E1, confirmed): no allowed source says Spotify named BLACKPINK its most-streamed girl group every year from 2019 to 2023 (the Guinness all-time record of 2023 is a different fact, and it is already Q9). The new question stays on a girl group's Spotify streaming mark: in Spotify Wrapped 2024, ILLIT's debut single Magnetic was number five on the list of the most-streamed K-pop songs worldwide (NME, Carmen Chin, December 5, 2024). TWICE, aespa and Girls' Generation have no song in that top 10. BLACKPINK is no longer the answer, since Q4 and Q9 name BLACKPINK in their stems. Fun fact from the ILLIT Wikipedia page (formed through R U Next?, debut March 25, 2024, Magnetic topped the Circle Digital Chart). https://www.nme.com/news/music/spotify-most-streamed-k-pop-songs-2024-bts-jimin-illit-stray-kids-3819059 and https://en.wikipedia.org/wiki/Illit
- Bank source: https://www.nme.com/news/music/spotify-most-streamed-k-pop-songs-2024-bts-jimin-illit-stray-kids-3819059

### Q3: changed (fun fact only)

- Before: Dynamite by BTS debuted at number one on which Spotify chart, a historic first for a K-pop act? Answer: Spotify Global Daily Top Songs (options: Spotify US Top 50, Spotify Global Daily Top Songs, Spotify Viral 50, Spotify New Music Friday). Fun fact: BTS's Dynamite became the first song by a Korean artist to debut at number one on Spotify's Daily Top Songs Global chart upon its release in August 2020.
- After: Dynamite by BTS debuted at number one on which Spotify chart, a historic first for a K-pop act? Answer: Spotify Global Daily Top Songs (options: Spotify US Top 50, Spotify Global Daily Top Songs, Spotify Viral 50, Spotify New Music Friday). Fun fact: Its agency, Big Hit Entertainment, counted 7,778,950 streams for the song on release day, the best opening day for a K-pop song on Spotify that year.
- Why and proof: (E1: writer ok, check FIX, published explanation: yes.) The answer is right: the Korea Times (Yonhap, August 23, 2020) reports that Dynamite topped Spotify's Global Top 50 (the daily global chart) and, per its agency, made BTS the first K-pop act to do so. Question unchanged. The old fun fact stated the first as a plain fact; the new one keeps the agency's own figure from the same article (7,778,950 release day streams, the year's highest for a K-pop song on Spotify). The cited Wikipedia page does not mention the Spotify chart, so the bank source is now the Korea Times article. https://www.koreatimes.co.kr/entertainment/k-pop/20200823/bts-dynamite-tops-global-top-50-on-spotify
- Bank source: https://www.koreatimes.co.kr/entertainment/k-pop/20200823/bts-dynamite-tops-global-top-50-on-spotify

### Q4: changed (one wrong option and fun fact)

- Before: BLACKPINK's How You Like That reached 1 billion Spotify streams. What milestone did it achieve as a K-pop girl group song? Answer: First K-pop girl group song to reach 1 billion Spotify streams (options: First K-pop song to reach 1 billion streams, First K-pop girl group song to reach 1 billion Spotify streams, First girl group song to debut at #1 on Spotify Global, First K-pop song to enter the Spotify top 10). Fun fact: How You Like That became the first K-pop girl group song to surpass 1 billion streams on Spotify, reaching the milestone in March 2024.
- After: BLACKPINK's How You Like That reached 1 billion Spotify streams. What milestone did it achieve as a K-pop girl group song? Answer: First K-pop girl group song to reach 1 billion Spotify streams (options: First K-pop song to reach 1 billion streams, First K-pop girl group song to reach 1 billion Spotify streams, First girl group song to debut at #1 on Spotify Global, First K-pop song to top the Billboard Hot 100). Fun fact: It got there in March 2024; BLACKPINK member Lisa had already passed the mark as a soloist with Money in 2023.
- Why and proof: (E1: writer ok, check FIX, published explanation: yes.) The answer is right: NME (Puah Ziwei, March 14, 2024) says How You Like That crossed one billion Spotify streams that week, making BLACKPINK the first K-pop girl group to do so; Wikipedia says the same and adds that Lisa's Money got there in 2023. Question and answer unchanged. The wrong option First K-pop song to enter the Spotify top 10 could not be shown false (the song debuted at number five on the daily global chart and no allowed source names an earlier K-pop top 10 entry), so it was replaced by First K-pop song to top the Billboard Hot 100, clearly false (it peaked at 33; Dynamite was the first K-pop number one). The other wrong options stay false: it debuted at number five, not one, on Spotify's global chart, and Dynamite was the first K-pop song to 1 billion Spotify streams. https://www.nme.com/news/music/blackpink-join-spotify-billions-club-how-you-like-that-3600941 and https://en.wikipedia.org/wiki/How_You_Like_That
- Bank source: https://www.nme.com/news/music/blackpink-join-spotify-billions-club-how-you-like-that-3600941

### Q5: changed (fun fact only)

- Before: PSY's Gangnam Style was the first YouTube video to reach 1 billion views. When did it achieve this milestone? Answer: December 2012 (options: November 2012, December 2012, January 2013, March 2013). Fun fact: Gangnam Style became the first YouTube video to reach 1 billion views on December 21, 2012. It was also the first video to reach 2 billion, 3 billion, and eventually even broke YouTube's view counter.
- After: PSY's Gangnam Style was the first YouTube video to reach 1 billion views. When did it achieve this milestone? Answer: December 2012 (options: November 2012, December 2012, January 2013, March 2013). Fun fact: It was also the first video to pass two billion views, on May 31, 2014, and later that year YouTube had to upgrade its view counter because of it.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: Gangnam Style became the first YouTube video to reach a billion views on December 21, 2012 (Wikipedia). Question unchanged. The old fun fact said it was also first to 3 billion, which the page does not say (its list of firsts stops at 1 and 2 billion, and the page says another video passed it as most viewed in July 2017). The new fun fact uses the page: first to two billion on May 31, 2014, and in December 2014 YouTube moved its view counter from 32-bit to 64-bit integers. https://en.wikipedia.org/wiki/Gangnam_Style
- Bank source: https://en.wikipedia.org/wiki/Gangnam_Style

### Q6: changed (replaced, same theme)

- Before: Which BTS song became the first K-pop song to surpass 2 billion streams on Spotify? Answer: Dynamite (options: Boy With Luv, DNA, Dynamite, Butter). Fun fact: BTS's Dynamite became the first K-pop song to surpass 2 billion streams on Spotify on August 10, 2024, continuing its historic streaming records.
- After: Jungkook became the first K-pop soloist to pass 2 billion Spotify streams with which single? Answer: Seven (options: Standing Next to You, 3D, Seven, Dreamers). Fun fact: Released in July 2023, Seven also reached number one on the Billboard Hot 100 and the Billboard Global 200.
- Why and proof: (E1: writer answer_wrong, check CONFIRMED, published explanation: no.) Wrong premise (E1 answer_wrong, confirmed): Dynamite reached 2 billion Spotify streams in January 2025 as the first K-pop group song (Korea Times, Yonhap, January 14, 2025), but Jungkook's solo single Seven had already passed 2.1 billion by December 30, 2024 (Korea Herald). The Korea Herald's own January 14, 2025 article calls Dynamite the first K-pop song, which contradicts its December article, so the first K-pop song wording was dropped. Same theme, the first K-pop act past 2 billion Spotify streams: the Korea Times says that among solo artists Jungkook was the first, with Seven. The other options are other Jungkook singles (Standing Next to You, 3D, Dreamers; Wikipedia, Jung Kook). Dynamite is no longer an answer here, so the quiz no longer has the same answer twice (Q1). Fun fact from the Korea Times (August 21, 2025): Seven topped the Billboard Hot 100 and Global 200. https://www.koreatimes.co.kr/entertainment/20250114/bts-becomes-first-k-pop-group-to-reach-2-billion-spotify-streams-with-dynamite and https://www.koreaherald.com/article/10099535 and https://www.koreatimes.co.kr/entertainment/k-pop/20250821/jung-kooks-seven-becomes-1st-k-pop-song-to-garner-25-bil-streams-on-spotify
- Bank source: https://www.koreatimes.co.kr/entertainment/20250114/bts-becomes-first-k-pop-group-to-reach-2-billion-spotify-streams-with-dynamite

### Q7: changed (replaced, same theme)

- Before: Which K-pop boy group set a record for most-streamed K-pop debut on Spotify? Answer: ENHYPEN (options: ENHYPEN, ATEEZ, TXT, Stray Kids). Fun fact: ENHYPEN set the record for the most-streamed K-pop boy group debut on Spotify, with their debut EP Border: Day One accumulating record streams in 2020.
- After: Which boy group ranked third among Spotify's most-streamed K-pop acts worldwide in 2024? Answer: Stray Kids (options: Stray Kids, ATEEZ, TXT, ENHYPEN). Fun fact: BTS topped that Spotify Wrapped list again, and SEVENTEEN, at number 10, was the only other boy group in it.
- Why and proof: (E1: writer unverifiable, check CONFIRMED, published explanation: no.) Unverifiable (E1, confirmed): no allowed source says ENHYPEN's debut set a Spotify streaming record (Wikipedia gives a sales record only). The new question stays on a boy group's Spotify streaming mark: in Spotify Wrapped 2024, the most-streamed K-pop acts worldwide were BTS, Jungkook, then Stray Kids third, with SEVENTEEN at 10 as the only other boy group (NME, Carmen Chin, December 5, 2024). ATEEZ, TXT and ENHYPEN are not in that top 10. https://www.nme.com/news/music/spotify-most-streamed-k-pop-songs-2024-bts-jimin-illit-stray-kids-3819059
- Bank source: https://www.nme.com/news/music/spotify-most-streamed-k-pop-songs-2024-bts-jimin-illit-stray-kids-3819059

### Q8: changed (fun fact only)

- Before: NewJeans' Hype Boy broke which streaming record on the Billboard Global 200? Answer: Longest-charting song by a K-pop female act (42 weeks) (options: Most streams in one week by K-pop group, Longest-charting song by a K-pop female act (42 weeks), First K-pop girl group song at #1, Most-streamed debut song ever). Fun fact: Hype Boy spent 42 weeks on the Billboard Global 200, setting the record for the longest-charting song by a K-pop girl group on that chart.
- After: NewJeans' Hype Boy broke which streaming record on the Billboard Global 200? Answer: Longest-charting song by a K-pop female act (42 weeks) (options: Most streams in one week by K-pop group, Longest-charting song by a K-pop female act (42 weeks), First K-pop girl group song at #1, Most-streamed debut song ever). Fun fact: It entered the Global 200 at number 116 and peaked at number 52 during that 42 week run.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: Hype Boy broke the record for the longest-running song on the Billboard Global 200 by a K-pop female act, with 42 weeks (Wikipedia). Question unchanged; the past tense keeps it true even if the record has been passed since. The old fun fact repeated the answer and stated the record as current; the new one adds its debut and peak on the chart (116 and 52) from the same page. https://en.wikipedia.org/wiki/Hype_Boy
- Bank source: https://en.wikipedia.org/wiki/Hype_Boy

### Q9: changed (fun fact only)

- Before: BLACKPINK set a Guinness World Record in 2023 by becoming the most-streamed female band on Spotify. How many streams did they have at that point? Answer: 8.8 billion (options: 5.5 billion, 8.8 billion, 12 billion, 3.2 billion). Fun fact: BLACKPINK surpassed 8.8 billion streams to claim the Guinness record for most-streamed female band on Spotify, beating previous titleholders Little Mix.
- After: BLACKPINK set a Guinness World Record in 2023 by becoming the most-streamed female band on Spotify. How many streams did they have at that point? Answer: 8.8 billion (options: 5.5 billion, 8.8 billion, 12 billion, 3.2 billion). Fun fact: They passed the previous holder, the British group Little Mix, by about 400 million streams, according to Guinness World Records.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: NME (Puah Ziwei, March 9, 2023) reports that BLACKPINK became the most-streamed girl group on Spotify with over 8.8 billion streams as of March 8, beating the previous holder Little Mix by 400 million streams, according to Guinness World Records. Question unchanged; the fun fact was reworded so it no longer repeats the answer and adds the 400 million margin. The cited Wikipedia page was replaced by the article that states the figures. https://www.nme.com/news/music/blackpink-most-streamed-girl-group-spotify-3410425
- Bank source: https://www.nme.com/news/music/blackpink-most-streamed-girl-group-spotify-3410425

### Q10: changed (replaced, same theme)

- Before: Which social media platform was instrumental in launching NewJeans to global fame, with their songs going viral in 2022-2023? Answer: TikTok (options: Twitter/X, Instagram, TikTok, YouTube Shorts). Fun fact: NewJeans songs like Hype Boy, Ditto, and OMG went massively viral on TikTok in 2022-2023, exposing their music to global audiences beyond traditional K-pop fans.
- After: A sped-up version of FIFTY FIFTY's Cupid went viral on which platform in 2023? Answer: TikTok (options: Twitter/X, Instagram, TikTok, YouTube Shorts). Fun fact: By May 2023 the song had been used in about eight million TikTok videos, and it later peaked at number 17 on the Billboard Hot 100.
- Why and proof: (E1: writer ambiguous, check CONFIRMED, published explanation: no.) Ambiguous (E1, confirmed): which platform was instrumental in launching NewJeans is an opinion, and no allowed source credits one platform. The new question keeps the theme (a K-pop song going viral on a platform and reaching a global audience) with a fact the source states: the Twin version of Cupid found global success after a sped-up version went viral on TikTok, and by May 2023 the song was in eight million TikTok videos (Wikipedia). Fun fact from the same page (peak of 17 on the Billboard Hot 100). https://en.wikipedia.org/wiki/Cupid_(Fifty_Fifty_song)
- Bank source: https://en.wikipedia.org/wiki/Cupid_(Fifty_Fifty_song)

## Fix of /q/bts-music-video-trivia-can-you-get-100 (owner request, 2026-10-27)

The live quiz "BTS music video trivia - can you get 100%?" (5 questions, KpopQuizz Team, no bank row) is corrected, not unpublished. Every question was rechecked on the Wikipedia page of its song, plus the Korea JoongAng Daily for the IDOL video, opened on 2026-10-27. The check confirmed E1: Q1 had a false premise (no source shows Jungkook jumping off a building into water; the water jump in the Euphoria video is V's, and those scenes imply suicide, a topic to stay away from) and Q3 relied on an All of the above that cannot be proven (no allowed source places the fan dance in the video). It also found that Q4 named its own answer in the stem (a fake love hotel setting, answer Fake Love) and called the setting a hotel where the source describes a maze-like manor: Q4 has a published E1 explanation and its question text was changed, so that explanation has to be withdrawn or rewritten. Fun facts were rewritten where they went past their source. Same 5 questions in the same order, every right answer at the same position (2,1,3,1,2).

### Q1: changed (replaced, same theme)

- Before: In which MV does Jungkook jump off a building into water? Answer: Euphoria (options: Run, I Need U, Euphoria, Spring Day). Fun fact: The Euphoria MV features dreamlike sequences with Jungkook bungee jumping and flying.
- After: In which BTS music video does Debussy's Clair de lune play before the song itself starts? Answer: Euphoria (options: Run, I Need U, Euphoria, Spring Day). Fun fact: The video came out in April 2018, four months before the song itself was released on the album Love Yourself: Answer.
- Why and proof: (E1: writer answer_wrong, check CONFIRMED, published explanation: no.) Wrong premise (E1 answer_wrong, confirmed): Wikipedia's description of the Euphoria video has V jumping into the ocean (a scene from earlier videos) and Jin about to jump at the end; Jungkook is not shown jumping off a building, and no allowed source places such a scene in Run, I Need U or Spring Day. The jump scenes imply suicide, so the new question stays on the same video, Jungkook's solo song, with a neutral fact the page states: Debussy's Clair de lune plays in the background before the song starts. The Run, I Need U and Spring Day pages do not mention Debussy or Clair de lune. The old fun fact (bungee jumping and flying) had no source; the new one is on the same page (video released in April, song in August 2018 with Love Yourself: Answer). https://en.wikipedia.org/wiki/Euphoria_(BTS_song)

### Q2: changed (fun fact only)

- Before: Which MV features BTS in a colorful retro-disco setting? Answer: Dynamite (options: IDOL, Dynamite, Boy With Luv, Permission to Dance). Fun fact: Dynamite was BTS's first fully English-language song and had a vibrant retro concept.
- After: Which MV features BTS in a colorful retro-disco setting? Answer: Dynamite (options: IDOL, Dynamite, Boy With Luv, Permission to Dance). Fun fact: Its YouTube premiere drew more than 3 million viewers at once, a record for a music video premiere at the time.
- Why and proof: (E1: writer ok, check FIX, published explanation: yes.) The answer is right (E1): the Dynamite video was teased with the band in retro-styled outfits dancing to a disco melody in front of a large Disco sign, and the video pays homage to Michael Jackson (Wikipedia). Question unchanged. The old fun fact (first fully English-language song, vibrant retro concept) was replaced by a fact about the video itself from the same page: over 3 million peak concurrent viewers at its premiere, then the biggest music video premiere on YouTube. https://en.wikipedia.org/wiki/Dynamite_(BTS_song)

### Q3: changed (replaced, same theme)

- Before: The IDOL MV incorporates elements from which traditional Korean art? Answer: All of the above (options: Pansori, Buchaechum, Talchum, All of the above). Fun fact: IDOL blends Korean traditional art forms including mask dance (talchum), fan dance, and traditional drumming.
- After: Which traditional Korean mask dance appears in BTS's IDOL video? Answer: Talchum (options: Pansori, Buchaechum, Samulnori, Talchum). Fun fact: By December 2020 the IDOL video had passed 800 million YouTube views, the fifth BTS video to get there.
- Why and proof: (E1: writer unverifiable, check CONFIRMED, published explanation: no.) Unverifiable (E1, confirmed), and the answer All of the above breaks the quiz rules: pansori inspired the song and video (Wikipedia) and the video uses talchum (Korea JoongAng Daily, Lee Jae-lim, December 3, 2020), but no allowed source places buchaechum, the fan dance, in the video, so All of the above cannot be proven and two single options could be right. The new question asks for the mask dance: the JoongAng Daily says BTS use talchum, a mask dance, in the video (it also shows bukcheong sajanoreum, a lion mask dance, which is not an option). The other options are not mask dances: pansori is sung storytelling, buchaechum a fan dance, samulnori percussion. Fun fact from the same article (800 million views, the fifth BTS video to pass that mark). https://www.koreajoongangdaily.com/entertainment/idol-breaks-through-800-million-views/10887633 and https://en.wikipedia.org/wiki/Idol_(BTS_song)

### Q4: changed (question text of an E1 item, see note)

- Before: Which MV features the members in a fake love hotel setting with rooms for each member? Answer: Fake Love (options: Blood Sweat & Tears, Fake Love, Black Swan, ON). Fun fact: Fake Love's MV had multiple versions including an extended version with different storylines.
- After: Which MV shows Jungkook searching for his bandmates in a maze-like manor full of decaying rooms? Answer: Fake Love (options: Blood Sweat & Tears, Fake Love, Black Swan, ON). Fun fact: A second video, for the song's remix, came out on June 1, 2018 and added extended footage to the original.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer stays Fake Love, but the stem was wrong in two ways: it named its own answer (a fake love hotel setting, answer Fake Love), and Wikipedia describes a maze-like manor, not a hotel, with the members in several decaying rooms (not one room per member). The new stem follows the page: Jungkook, the protagonist, searches for his bandmates inside a maze-like manor while the members appear in decaying rooms. This question has a published E1 explanation; its text changed, so that explanation must be withdrawn or rewritten. The old fun fact (versions with different storylines) went past the source; the new one is on the same page (remix video of June 1, 2018 with extended footage). https://en.wikipedia.org/wiki/Fake_Love_(BTS_song)

### Q5: changed (fun fact only)

- Before: In the Spring Day MV, what book is referenced through the setting? Answer: The Ones Who Walk Away from Omelas (options: 1984, The Little Prince, The Ones Who Walk Away from Omelas, Norwegian Wood). Fun fact: The Omelas motel sign and Ursula K. Le Guin's story themes are central to the MV's meaning.
- After: In the Spring Day MV, what book is referenced through the setting? Answer: The Ones Who Walk Away from Omelas (options: 1984, The Little Prince, The Ones Who Walk Away from Omelas, Norwegian Wood). Fun fact: The video also draws on Bong Joon-ho's 2013 film Snowpiercer, and it won Best Music Video at the 2017 Mnet Asian Music Awards.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right (E1): the video was inspired by Ursula K. Le Guin's 1973 story The Ones Who Walk Away from Omelas (Wikipedia). Question unchanged. The old fun fact spoke of an Omelas motel sign (the source says a neon signboard) and repeated the answer; the new one is on the same page (also inspired by Snowpiercer, Best Music Video at the 2017 Mnet Asian Music Awards). https://en.wikipedia.org/wiki/Spring_Day_(song)

## Fix of /q/twice-members-facts-quiz (owner request, 2026-10-27)

The live quiz "TWICE members facts quiz" (5 questions, KpopQuizz Team, no bank row) is corrected, not unpublished. Every question was rechecked on Wikipedia, the Korea Times and Time, opened on 2026-10-27. The check confirmed the two premise errors found by E1: Momo's TV contest before JYP was a South Korean show, not a Japanese one (Q3), and the eagle dance went viral before TWICE, not on Sixteen (Q5). Q5 also had a lyric as an option (Shy shy shy), now replaced. Fun facts were fixed where they had no source (Q2, Q3, Q5) or an opinion (Q4). No question or answer text with a published E1 explanation was changed. Same 5 questions in the same order, every right answer at the same position (1,1,1,1,1, as live). Known limit: Q2's stem names Nayeon, the answer of Q1; both have published E1 explanations and are not wrong, so they were kept.

### Q1: unchanged, checked

- Before: Which TWICE member was the first to release a solo album? Answer: Nayeon (options: Jihyo, Nayeon, Momo, Chaeyoung). Fun fact: Nayeon released IM NAYEON in June 2022, debuting at #7 on the Billboard 200.
- After: same as before.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: the Korea Times (Dong Sun-hwa, July 8, 2022) calls Nayeon the first TWICE member to go solo, with the EP out on June 24, 2022 at number seven on the Billboard 200; Wikipedia (Nayeon) gives the same peak. The fun fact matches both. https://www.koreatimes.co.kr/entertainment/k-pop/20220708/im-nayeon-twices-nayeon-creates-splash-as-soloist and https://en.wikipedia.org/wiki/Nayeon

### Q2: changed (fun fact only)

- Before: What is Nayeon's debut solo single? Answer: POP! (options: ABCD, POP!, Dice, Santa Tell Me). Fun fact: POP! became a viral hit and established Nayeon as a successful solo artist.
- After: What is Nayeon's debut solo single? Answer: POP! (options: ABCD, POP!, Dice, Santa Tell Me). Fun fact: POP! peaked at number two on South Korea's Circle Digital Chart and reached the top ten in several other Asian countries.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: Pop! was released on June 24, 2022 as the lead single of her debut EP, Im Nayeon (Wikipedia, Pop!); ABCD is her 2024 single, Dice is an NMIXX song and Santa Tell Me an Ariana Grande song. Question unchanged. The old fun fact (viral hit, established her as a successful soloist) had no source; the new one is on the Pop! page (number two on the Circle Digital Chart, top ten in Japan, Malaysia, the Philippines, Singapore and Taiwan). https://en.wikipedia.org/wiki/Pop!_(Nayeon_song)

### Q3: changed

- Before: Which member is known as the best dancer and was a contestant on a Japanese TV show? Answer: Momo (options: Mina, Momo, Sana, Jihyo). Fun fact: Momo appeared on a Japanese dance survival show before joining JYP Entertainment.
- After: Which member, considered TWICE's best dancer, was brought back into the lineup by Park Jin-young on Sixteen? Answer: Momo (options: Mina, Momo, Sana, Jihyo). Fun fact: Fans call her Dance Machine, and in July 2023 she debuted in Japan with the TWICE subunit MiSaMo.
- Why and proof: (E1: writer answer_wrong, check CONFIRMED, published explanation: no.) Wrong premise (E1 answer_wrong, confirmed): Momo is the intended answer, but her pre-JYP TV contest was Superstar K (2011), a South Korean show, not a Japanese one (Wikipedia, Momo Hirai). The second clause now uses a better known and sourced fact, from her time as an adult trainee: she was eliminated on Sixteen (2015) and Park Jin-young brought her back into the final lineup for her performance skills (Wikipedia, Momo Hirai and Twice; Time, Kat Moon, September 20, 2019). Mina, Sana and Jihyo were among the seven chosen on the show. Momo is considered TWICE's best dancer (Wikipedia; Time). The old fun fact (Japanese dance survival show) was false; the new one is on her page (nickname Dance Machine, MiSaMo debut in Japan in July 2023). https://en.wikipedia.org/wiki/Momo_Hirai and https://en.wikipedia.org/wiki/Twice and https://time.com/5671342/twice-k-pop-everything-to-know/

### Q4: changed (fun fact only)

- Before: Which member is known for her elegant ballet background? Answer: Mina (options: Momo, Mina, Sana, Tzuyu). Fun fact: Mina trained in ballet for over 10 years and her graceful style is evident in TWICE's performances.
- After: Which member is known for her elegant ballet background? Answer: Mina (options: Momo, Mina, Sana, Tzuyu). Fun fact: Mina studied classical ballet for eleven years, then spent a year at a K-pop dance studio before JYP scouted her.
- Why and proof: (E1: writer ok, check OK, published explanation: yes.) The answer is right: Mina trained in classical ballet for eleven years (Wikipedia, Mina) and Time says more than a decade of ballet explains her elegant poise. Question unchanged. The old fun fact ended on an opinion (graceful style evident in performances); the new one keeps to her training as the page states it. https://en.wikipedia.org/wiki/Mina_(Japanese_singer) and https://time.com/5671342/twice-k-pop-everything-to-know/

### Q5: changed

- Before: Dahyun is known for what signature move from Sixteen? Answer: Eagle dance (options: Shy shy shy, Eagle dance, TT gesture, Heart shake). Fun fact: Dahyun's eagle dance went viral during Sixteen and became one of her most iconic moments.
- After: A viral video of which dance first made Dahyun famous online? Answer: Eagle dance (options: Moonwalk, Eagle dance, TT gesture, Heart shake). Fun fact: Dahyun later trained at JYP Entertainment for more than three years before TWICE debuted in October 2015.
- Why and proof: (E1: writer ok, check DROP, published explanation: no.) Wrong premise (E1 check DROP): the stem said the move came from Sixteen, but Wikipedia (Dahyun) and Time (Kat Moon, September 20, 2019) place the viral eagle dance video before TWICE and before her JYP training, with no link to Sixteen. The new stem asks only what the sources state; it leaves out the childhood details on her page. The option Shy shy shy was a lyric of Cheer Up (lyrics are banned), replaced by Moonwalk. The old fun fact (viral during Sixteen) was false; the new one is on her page (trained at JYP for over three years) and the Twice page (debut October 20, 2015). https://en.wikipedia.org/wiki/Dahyun and https://time.com/5671342/twice-k-pop-everything-to-know/
