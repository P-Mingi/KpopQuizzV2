# Fact-check: lot2-B.json (2026-11-18 to 2026-11-22)

Independent second pass, done 2026-10-25. Input: `lot2-B.json` (not edited). 5 quizzes x 10 questions = 50 questions.

Method: every cited `source` URL was fetched again (Wikipedia as raw wikitext via the API; NME, Korea Herald, Korea Times, Official Charts, Billboard, JYP and KOZ pages with curl and a generic User-Agent). I answered each question from that source before looking at `correct`. Extra checks:
- the Circle Chart data API (circlechart.kr) for the DAY6 2024 chart claims;
- the NME 2023 MMA page HTML, where winners are in bold;
- the Wikipedia pages 2023 KBS Entertainment Awards, Deadline (EP) and Time of Our Life (song);
- the Wikipedia disambiguation pages Jump, Good Thing, Good Goodbye, Dirty Work, Earthquake, Mona Lisa, Don't Say You Love Me and This Is For, to check whether any wrong option also released a song with the same title.

My working copies are in `scratchpad/lot2/verify-B/`.

Automatic checks passed:
- no em dash or en dash;
- no banned words;
- no quotation marks in any question (only possessives, plus the title Don't Say You Love Me);
- every question is under 120 characters and every fun fact under 220;
- descriptions are 125 to 137 characters and titles are 45 characters or fewer;
- options are distinct;
- answer positions are fine in all 5 quizzes: no position used more than 3 times, no run of 4, no strict cycle.

Verdicts: OK = keep as is. FIX = change needed. The changes are either a factual precision fix or a wording-only fix where the fun fact copies a source sentence. DROP = none.

## 2026-11-18 DAY6: From Congratulations to Fourever

| Q | Verdict | Problem | Source says (paraphrase) | Proposed correction / note |
|---|---|---|---|---|
| 1 | OK | none | Debuted on Sept 7, 2015 with the EP The Day, led by Congratulations; No. 2 on Billboard World Albums a week after release. Daydream, Sunrise and Moonrise are later releases. | https://en.wikipedia.org/wiki/Day6 |
| 2 | OK | none | The Every DAY6 project opened on Jan 6, 2017 with I Wait; You Were Beautiful came in February and I Smile in June. Billboard put I Wait at No. 81 on its 2010s staff list. | https://en.wikipedia.org/wiki/Day6 |
| 3 | OK | none | Sunrise (June 2017) collects the January to May releases; Moonrise (Dec 2017) collects the rest. Sunrise is No. 14 on Billboard's 25 greatest K-pop albums of the 2010s. | https://en.wikipedia.org/wiki/Day6 |
| 4 | FIX (precision) | Answer OK: the infobox lists vocals and bass. The fun fact gives the award as "Radio DJ of the Year". That name comes from the Young K page, which cites Koreaboo (tagged as an unreliable source). The 2023 KBS Entertainment Awards page lists a "DJ Award" with two winners, Lee Eun-ji and Young K (for Kiss the Radio). | DJ Award at the 2023 KBS Entertainment Awards, shared with Lee Eun-ji. | Fun fact: Hosting KBS Cool FM's Kiss the Radio won him one of the two DJ Awards at the 2023 KBS Entertainment Awards. Sources: https://en.wikipedia.org/wiki/2023_KBS_Entertainment_Awards and https://en.wikipedia.org/wiki/Young_K |
| 5 | OK | none | Dowoon is the drummer (vocals, drums). He spent about 3 months as a JYP trainee, one of the fastest debuts at the company. | https://en.wikipedia.org/wiki/Dowoon |
| 6 | OK | Only Wonpil is credited with keyboards and synthesizers. | Pilmography (Feb 7, 2022) peaked at No. 1 on the Gaon Album Chart; the citation is week 7 of 2022, which is its release week. | https://en.wikipedia.org/wiki/Wonpil |
| 7 | OK | Young K is also credited with guitar on the Even of Day page. "Leader" still makes Sungjin the only right answer. | Sungjin is the leader, guitarist and vocalist. His album 30 came out Nov 5, 2024, with his first solo concert Nov 8 to 10. | https://en.wikipedia.org/wiki/Sungjin |
| 8 | OK | none | Gluon (Aug 31, 2020) was led by Where the Sea Sleeps. Park Jin-young named the unit; "even" is an old word for night. Right Through Me (2021) and You Make Me are other releases. | https://en.wikipedia.org/wiki/Day6_(Even_of_Day) |
| 9 | OK | Happy is a track on Fourever but was not a single, so it is not a second right answer. Maybe Tomorrow is a May 2025 single. | Welcome to the Show is the only single listed. Happy reached No. 1 on the Circle Digital Chart in Sept 2024. I confirmed this in the Circle data: weeks 37 to 39 of 2024, one week after Melt Down. | https://en.wikipedia.org/wiki/Fourever ; https://circlechart.kr |
| 10 | OK | The dated chart claim checks out. | Time of Our Life (lead single of Gravity, 2019) was No. 10 on the Circle Digital Chart for H1 2024. I confirmed this in the Circle data: the H1 2024 digital chart has it at rank 10, with TWS at No. 1. The Band Aid title combines band and aid as a promise to help. The other options date from 2017, 2018 and 2020. | https://en.wikipedia.org/wiki/Band_Aid_(EP) ; https://circlechart.kr |

## 2026-11-19 TXT: From Sugar Rush Ride to Deja Vu

| Q | Verdict | Problem | Source says (paraphrase) | Proposed correction / note |
|---|---|---|---|---|
| 1 | OK | none | Won Push Performance of the Year at the 2023 VMAs; the 2023 VMAs page also lists TXT with Sugar Rush Ride. Peaked at No. 1 on World Digital Song Sales. Back for More was performed at the show but did not win. | https://en.wikipedia.org/wiki/Sugar_Rush_Ride |
| 2 | OK | The album type is right: it is TXT's fifth Korean EP. | Inspired by Peter Pan. Coi Leray features on track 3, Happy Fools, and the closing ballad is Farewell, Neverland. | https://en.wikipedia.org/wiki/The_Name_Chapter:_Temptation |
| 3 | OK | none | Act: Sweet Mirage ran from Mar 25, 2023 (KSPO Dome) to Dec 3, 2023 (Gocheok), both in Seoul. Lovesick was 2022, Promise 2024 to 2025, Tomorrow 2025 to 2026. | https://en.wikipedia.org/wiki/List_of_Tomorrow_X_Together_live_performances |
| 4 | FIX (wording) | Answer and date OK: Aug 5, 2023, Bud Light Stage. The fun fact closely copies NME's clause about a late afternoon set on one of the festival's smaller stages. | First Korean group to headline Lollapalooza. Their first appearance was 12 months earlier (July 30, 2022, on the Solana x Perry's stage). | Fun fact: It was their second straight Lollapalooza: on July 30, 2022 they had played an afternoon slot on the smaller Solana x Perry's stage. Sources: https://www.nme.com/reviews/tomorrow-x-together-lollapalooza-2023-live-review-3478932 and https://en.wikipedia.org/wiki/List_of_Tomorrow_X_Together_live_performances |
| 5 | OK (note) | Ryan Tedder co-produced the song with Grant Boutin; "Ryan Tedder produced" is incomplete but not false. | Released July 7, 2023 with the Jonas Brothers. Tedder met TXT while they were touring the US. | Optional fun fact: Ryan Tedder, who met TXT during their US tour, co-produced the track with Grant Boutin. Source: https://en.wikipedia.org/wiki/Do_It_Like_That_(Tomorrow_X_Together_and_Jonas_Brothers_song) |
| 6 | FIX (wording) | Answer OK: Anitta, released Sept 15, 2023 as a pre-release. The fun fact copies the source clause about the first song by a K-pop group to enter the Brazilian charts, with one word changed. | Debuted at No. 41 on the Billboard Brasil Hot 100, the first song by a K-pop group on the Brazilian charts. | Fun fact: Its No. 41 debut on the Billboard Brasil Hot 100 made it the first K-pop group song ever to chart in Brazil. Source: https://en.wikipedia.org/wiki/Back_for_More_(Tomorrow_X_Together_and_Anitta_song) |
| 7 | FIX (wording) | Answer OK: the singles are Do It Like That, Back for More and Chasing That Feeling; Growing Pain is a b-side. The fun fact repeats the source sentence about first-week sales almost word for word. | Released Oct 13, 2023. Sold over 2.4 million copies in its first week in South Korea. Debuted at No. 1 on Circle, Oricon and Billboard Japan. | Fun fact: Released on October 13, 2023, the album moved more than 2.4 million copies in South Korea in week one and opened at No. 1 on the Circle and Oricon album charts. Source: https://en.wikipedia.org/wiki/The_Name_Chapter:_Freefall |
| 8 | OK | none | LeveL was the opening theme of the 2024 anime Solo Leveling, made with Hiroyuki Sawano. | https://en.wikipedia.org/wiki/Tomorrow_X_Together |
| 9 | OK | The other options are tracks on the EP but not singles. | Deja Vu is the only single (Apr 1, 2024). Track 2 runs 0:07 and its title is written in Morse code that reads tomorrow. | https://en.wikipedia.org/wiki/Minisode_3:_Tomorrow |
| 10 | OK | none | Act: Promise opened May 3, 2024 at KSPO Dome. The Japan leg began July 10, 2024 at Tokyo Dome. Gocheok, Jamsil and Inspire opened other tours or are outside Seoul. | https://en.wikipedia.org/wiki/List_of_Tomorrow_X_Together_live_performances |

## 2026-11-20 K-pop Songs of 2025

All ten songs were released in 2025 by the marked act. No wrong option has a song of the same title: Taeyeon has a 2016 Good Thing and Soojin a 2024 Mona Lisa, but neither is an option in those questions.

| Q | Verdict | Problem | Source says (paraphrase) | Proposed correction / note |
|---|---|---|---|---|
| 1 | OK | Jump was released July 11, 2025. The EP Deadline came out Feb 27, 2026 with a second single, Go; Wikipedia still calls Jump its lead single. The question asks only about Jump, so there is no second right answer. | Jump was BLACKPINK's third No. 1 on the Billboard Global 200; Dave Meyers directed the video. | https://en.wikipedia.org/wiki/Jump_(Blackpink_song) |
| 2 | FIX (wording) | Answer OK: June 27, 2025, aespa's first single album. The fun fact copies a 10-word stretch of the source almost unchanged. | The performance video was made with Apple and filmed entirely on an iPhone 16 Pro. The song won four music show trophies. | Fun fact: Apple co-produced its performance video, shot from start to finish on an iPhone 16 Pro, and the song went on to win four music show trophies. Source: https://en.wikipedia.org/wiki/Dirty_Work_(Aespa_song) |
| 3 | OK | none | Released Feb 14, 2025, lead single of Amortage. Jisoo's first No. 1 on World Digital Songs and her first single under her own label, Blissoo. | https://en.wikipedia.org/wiki/Earthquake_(Jisoo_song) |
| 4 | OK | none | Released May 16, 2025, lead single of Echo. The video was shot in Singapore with Shin Se-kyung, the first time Jin worked with an actor. | https://en.wikipedia.org/wiki/Don't_Say_You_Love_Me_(Jin_song) |
| 5 | FIX (wording) | Answer OK: J-Hope previewed it at Barclays Center on Mar 13 and 14 and released it Mar 21, 2025. The fun fact is the source's lead sentence verbatim. | Produced by Blake Slatkin, Cashmere Cat and Misogi. In Brooklyn, J-Hope told the crowd the song was his way of expressing love to ARMY. | Fun fact: Blake Slatkin, Cashmere Cat and Misogi share the production credit, and J-Hope told his Brooklyn crowd the song was his way of showing love to ARMY. Source: https://en.wikipedia.org/wiki/Mona_Lisa_(J-Hope_song) |
| 6 | OK | none | Lead single of We Are (May 19, 2025). Soyeon wrote it with Pop Time, Daily and Likey, drawing on early 2000s autotune. | https://en.wikipedia.org/wiki/Good_Thing_(I-dle_song) |
| 7 | OK | none | ITZY's tenth EP, released June 9, 2025 through JYP and Republic, with five tracks and a title track of the same name. | https://en.wikipedia.org/wiki/Girls_Will_Be_Girls_(EP) |
| 8 | OK | none | Released May 19, 2025, lead single of RIIZE's first studio album Odyssey. 1950s rock and roll influence; four first-place trophies. | https://en.wikipedia.org/wiki/Fly_Up |
| 9 | OK | The count is dated ("By January 2026"), which is acceptable. | Released Oct 15, 2025; it surged after her Nov 20 Blue Dragon stage. In Jan 2026 it had the second-most perfect all-kills (behind Golden) and the most by a soloist. | https://en.wikipedia.org/wiki/Good_Goodbye_(Hwasa_song) |
| 10 | OK (note) | The fun fact describes a creative disagreement over song choice, not a contract dispute, so it does not break the content rules. A softer verb is optional. | Released July 11, 2025, lead single of TWICE's fourth Korean studio album. Jihyo said the group argued with JYP over the lead single and fought for this song. | Optional: replace "argued with" with "debated". https://en.wikipedia.org/wiki/This_Is_For_(song) |

## 2026-11-21 KPop Demon Hunters Quiz

Speaking voices: Arden Cho (Rumi), May Hong (Mira), Ji-young Yoo (Zoey), Yunjin Kim (Celine). Singing voices: EJAE (Rumi), Audrey Nuna (Mira), Rei Ami (Zoey), Lea Salonga (Celine). The quiz uses all of them correctly. No question or fun fact relies on facts that changed after release: the 2026 Golden Globe and Oscar wins and the sequel news are not used.

| Q | Verdict | Problem | Source says (paraphrase) | Proposed correction / note |
|---|---|---|---|---|
| 1 | OK | none | Produced by Sony Pictures Animation for Netflix; animated by Sony Pictures Imageworks in Vancouver and Montreal. | https://en.wikipedia.org/wiki/KPop_Demon_Hunters |
| 2 | OK | none | Co-directed by Maggie Kang and Chris Appelhans. Kang pitched the idea in 2018. Appelhans had planned a long break after Wish Dragon but joined after hearing Kang's ideas. | https://en.wikipedia.org/wiki/KPop_Demon_Hunters |
| 3 | OK | none | Arden Cho voices Rumi. She first auditioned for Celine, then tried for Rumi when Kang encouraged her. | https://en.wikipedia.org/wiki/KPop_Demon_Hunters |
| 4 | OK (note) | Answer OK. The reason she was cast is EJAE's own account, but the fun fact states it as plain fact. | EJAE joined as a songwriter and was then offered Rumi's singing voice. She says the directors got used to hearing her voice on the demos. | Optional fun fact: She joined the film as a songwriter, and she credits her casting to the directors growing used to her voice on the demos. |
| 5 | OK | none | Rei Ami sings for Zoey and Audrey Nuna for Mira; Ji-young Yoo is Zoey's speaking voice. | https://en.wikipedia.org/wiki/Huntrix |
| 6 | OK | none | Your Idol is performed by the Saja Boys, at Namsan Tower, to summon Gwi-Ma. Golden, How It's Done and Takedown are Huntrix songs. | https://en.wikipedia.org/wiki/Your_Idol |
| 7 | OK | none | The end credits version is by TWICE's Jeongyeon, Jihyo and Chaeyoung, released June 20, 2025 as the soundtrack's lead single. | https://en.wikipedia.org/wiki/Takedown_(song) |
| 8 | OK | All three wrong options are clearly wrong at the source: Golden is the ninth K-pop No. 1, and We Don't Talk About Bruno (2022) was an earlier No. 1 by a fictional act from an animated film. | Golden is No. 1 on the Hot 100 dated Aug 16, 2025, the first K-pop No. 1 by female lead vocalists, and the first No. 1 by a women's group of three or more since Bootylicious (2001). The chart page confirms the No. 1. | https://www.billboard.com/lists/huntrx-golden-kpop-demon-hunters-number-1-hot-100/ |
| 9 | OK | none | Official Charts, Aug 1, 2025: first K-pop UK No. 1 since Gangnam Style (2012), which was the first ever. That week Your Idol was No. 10 and Soda Pop No. 11. | https://www.officialcharts.com/chart-news/kpop-demon-hunters-huntrx-golden-number-1-single/ |
| 10 | OK (note) | Answer OK and dated. "A week earlier" is really 8 days (Aug 26 vs Sept 3). | On Sept 3, 2025 it passed Squid Game season 1 as Netflix's most-watched title; on Aug 26 it had passed Red Notice as the most-watched film. | Optional: replace "A week earlier, on August 26" with "Earlier, on August 26". |

## 2026-11-22 BOYNEXTDOOR: From WHO! to No Genre

The quiz uses stage names only. KOZ's profile page lists birth dates, but the quiz does not use them. Lead songs check out: WHO! (all three tracks were singles), WHY.. (But Sometimes), HOW? (Earth, Wind & Fire), 19.99 (Nice Guy as main single, with Dangerous as a pre-release single) and No Genre (I Feel Good, with If I Say, I Love You as an earlier digital single that is not an option).

| Q | Verdict | Problem | Source says (paraphrase) | Proposed correction / note |
|---|---|---|---|---|
| 1 | OK | none | Formed by KOZ Entertainment in 2023. Zico (Block B) founded KOZ and Hybe acquired it in 2020. | https://en.wikipedia.org/wiki/BoyNextDoor |
| 2 | OK (note) | The sources disagree, but the answer does not change: NME 3479688 (in the quiz `sources` list) calls Serenade the title track and the other two B-sides, while Wikipedia and the Korea Herald say all three were singles. The fun fact follows the two agreeing sources. | Debut single album WHO! on May 30, 2023 (the KOZ profile also gives 2023-05-30). All three tracks were released as singles. | https://en.wikipedia.org/wiki/Who!_(single_album) |
| 3 | OK | none | Zico produced One and Only with Pop Time. The members helped make the choreography and open a real door on stage to act out the group's name. | https://www.koreaherald.com/article/3136905 |
| 4 | OK | WHY.. also contains But I Like You, but its title track is But Sometimes (confirmed by the Korea Times). Wikipedia's BOYNEXTDOOR page dates WHY.. Sept 30, 2023 while the other sources say Sept 4; the question only says "in 2023", so it is unaffected. | Lead single But Sometimes; the EP entered the Billboard 200 at No. 162, the group's first appearance on that chart. | https://en.wikipedia.org/wiki/BoyNextDoor |
| 5 | OK | Our and Amnesia are b-sides on HOW?; Nice Guy is from 19.99. | HOW? (Apr 15, 2024) closed the First Love trilogy, led by Earth, Wind & Fire. It was the group's first No. 1 on the Circle Album Chart. | https://en.wikipedia.org/wiki/How%3F_(EP) |
| 6 | OK | none | First music show win on The Show, Apr 23, 2024. First fan meeting, OneDoorful Day, at Olympic Hall on June 1 and 2. | https://en.wikipedia.org/wiki/BoyNextDoor |
| 7 | OK | The answer is inferred: the source states the theme (the anxieties of youth before turning 20, the moment a 19-year-old becomes 20) rather than defining the title outright. No member's age is given. | Main single Nice Guy (Dangerous was a pre-release); passed 1 million cumulative sales in October 2024. | https://en.wikipedia.org/wiki/19.99_(EP) |
| 8 | OK | none | I Feel Good was the primary single of No Genre (May 13, 2025). It sold 1,166,419 copies in five days, the group's best opening week. Step by Step is a b-side; Hollywood Action led The Action in Oct 2025. | https://en.wikipedia.org/wiki/No_Genre_(EP) |
| 9 | OK | The bold winners in the NME HTML show BOYNEXTDOOR was only nominated for Rookie of the Year; RIIZE and ZEROBASEONE won it. So that option is wrong. | Global Rising Artist (special award) at the 2023 MMA. Fadeaway was released Nov 7, 2023 for the webtoon Garbage Time. | https://en.wikipedia.org/wiki/BoyNextDoor ; https://www.nme.com/news/music/2023-melon-music-awards-nominations-winners-3552668 |
| 10 | OK | none | The members are Sungho, Riwoo, Myung Jaehyun, Taesan, Leehan and Woonhak. Jaehyun, Taesan and Woonhak take part in production. | https://en.wikipedia.org/wiki/BoyNextDoor |

## Notes outside the fact check (for the lead engineer)

- The title "K-pop Songs of 2025" continues the bank titles "K-pop songs of 2023 quiz" and "K-pop songs of 2024 quiz". It fits the series, but the automatic same-topic title check may flag it.
- The title "KPop Demon Hunters Quiz" is the bare "{Name} Quiz" form. The rule bans "{Group} Quiz", and this is a film, not a group, so it is acceptable. A topic in the title, for example "KPop Demon Hunters: Songs and Voices", would match the bank pattern better.
- The BOYNEXTDOOR quiz is tagged easy, but Q3 (the One and Only door) and Q9 (the MMA special award) feel medium.
- In the other lot 2 files, the only overlaps are different facts: the IVE and ATEEZ quizzes mention Lollapalooza or a US festival, and lot2-A mentions DAY6's Cinderella. None of them repeats a fact from lot B.

## Totals

- 50 questions checked: 44 OK (6 of them with optional notes), 6 FIX, 0 DROP.
- FIX breakdown: 1 precision fix (an award name) and 5 wording-only fixes (fun facts that copy the source). No answer key is wrong, and no question has a second right answer.

## FIX / DROP list

1. 2026-11-18 DAY6 Q4, FIX (precision): the award name "Radio DJ of the Year" is not the category name. It was a DJ Award, shared with Lee Eun-ji. Use: Hosting KBS Cool FM's Kiss the Radio won him one of the two DJ Awards at the 2023 KBS Entertainment Awards. (https://en.wikipedia.org/wiki/2023_KBS_Entertainment_Awards)
2. 2026-11-19 TXT Q4, FIX (wording): the fun fact closely copies NME's clause about the late afternoon set on a smaller stage. Use: It was their second straight Lollapalooza: on July 30, 2022 they had played an afternoon slot on the smaller Solana x Perry's stage.
3. 2026-11-19 TXT Q6, FIX (wording): the fun fact copies the Wikipedia clause about the Brazilian charts with one word changed. Use: Its No. 41 debut on the Billboard Brasil Hot 100 made it the first K-pop group song ever to chart in Brazil.
4. 2026-11-19 TXT Q7, FIX (wording): the fun fact repeats the Wikipedia sentence on 2.4 million first-week sales. Use: Released on October 13, 2023, the album moved more than 2.4 million copies in South Korea in week one and opened at No. 1 on the Circle and Oricon album charts.
5. 2026-11-20 K-pop Songs of 2025 Q2, FIX (wording): the fun fact copies the Apple and iPhone 16 Pro phrase. Use: Apple co-produced its performance video, shot from start to finish on an iPhone 16 Pro, and the song went on to win four music show trophies.
6. 2026-11-20 K-pop Songs of 2025 Q5, FIX (wording): the fun fact is the Wikipedia lead sentence verbatim. Use: Blake Slatkin, Cashmere Cat and Misogi share the production credit, and J-Hope told his Brooklyn crowd the song was his way of showing love to ARMY.

DROP: none.
