# Fact-check: lot3-C.json (2026-12-13 to 2026-12-17)

Checker: independent second pass (Mission U, step A8), run on 2026-10-25. The lot file was not edited, and nothing in the repo, git or any database was touched.

## Method

- Every cited Wikipedia page was pulled as raw wikitext (generic UA). Each question was answered from that text before looking at `correct`.
- **Year-end chart quiz:** each year's chart was pulled from the circlechart.kr data API, the one that backs the cited `onoff.circle` year pages. That covers every year-end list for every quiz year:
  - Digital, Streaming, Download, BGM, Singing Room, V Coloring, Bell and Ring;
  - Total and Domestic views of each;
  - the Global K-pop year chart for 2022 and 2025.
  I then checked that no wrong option was the year-end No. 1 of that year on any of these lists. The 2011 monthly No. 1s were also pulled, to test the Roly-Poly fun fact.
- **Other cross-checks:**
  - Circle weekly charts: 2020 weeks 16 to 19 (Dumhdurum) and 2025 weeks 18 to 23 (Drowning).
  - NCT 127 discography, a second source for the Global 200 "first".
  - NCT JNJM page.
  - Roy Kim page, for the option name Bom Bom Bom.
  - A UPI/Bandwagon search result confirming NCT 127 performed Sticker on The Late Late Show.
- Searched for overlaps against lot2-A to lot2-D, lot3-A (the only other lot 3 file present) and WINTER-2026-12-02.txt.
- Ran mechanical checks:
  - question length under 120 and fun fact under 220;
  - no U+2013/U+2014 and no quotation marks;
  - banned words;
  - answer-position spread;
  - true/false count (Apink: 5 false).
  All pass.

## Results

### 2026-12-13 Apink True or False

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 12-13 | 1 | OK | none | Debut EP Seven Springs of Apink, April 19, 2011; lead single Mollayo; Lee Gi-kwang of Beast in the video. | none |
| 12-13 | 2 | OK | none | Une Année (May 9, 2012) title track is Hush; NoNoNo led the EP Secret Garden, July 2013. Statement false. | none |
| 12-13 | 3 | OK (note) | Fun fact second clause is a restructured version of the source sentence ("eighth best selling digital song in 2014, according to Gaon's year-end chart"). Acceptable. | Composed by Duble Sidekick; Digipedi video; 8th on Gaon 2014 year-end (Circle API confirms No. 8). | optional rewording |
| 12-13 | 4 | **FIX** | Statement is true and correct. The fun fact tracks one source sentence clause by clause ("The song sold 1,490,824 copies and scored ... triple crown wins in the three major music shows (The Show, Music Core and Inkigayo)"). | Pink Luv is the fifth EP and debuted at No. 1 on the Gaon Album Chart. Luv sold 1,490,824 and won triple crowns on The Show, Music Core and Inkigayo. Shinsadong Tiger composed Luv (Apink page). | New fun fact: "Shinsadong Tiger composed the title song Luv, which earned Apink triple crowns on The Show, Show! Music Core and Inkigayo." Do not add the source's "first girl group" claim. Sources: https://en.wikipedia.org/wiki/Pink_Luv and https://en.wikipedia.org/wiki/Apink |
| 12-13 | 5 | OK | none | First Japanese single NoNoNo, Oct 22, 2014, No. 4 on Oricon weekly. Japanese Mr. Chu on Feb 18, 2015. Statement false. | none |
| 12-13 | 6 | OK | none | Feb 25, 2016 video for the first original Japanese song Brand New Days, the opening theme of the anime Rilu Rilu Fairilu. | none |
| 12-13 | 7 | OK | none | Pink Paradise was held at Olympic Hall, Jan 30 and 31, 2015, and its 7,200 tickets sold out in two minutes. The second concert, Pink Island, was at Jamsil Indoor Stadium. Statement false. | none |
| 12-13 | 8 | OK | none | Dumhdurum entered at No. 4 and peaked at No. 2 on the Gaon Digital Chart; Circle weekly 2020 weeks 16 to 19 confirm it never reached No. 1. It did top the Gaon Download Chart, but the statement names the Digital Chart. All six shows won in week two. Statement false. | none |
| 12-13 | 9 | OK | none | Chobom debuted July 12, 2022 with the single album Copycat, a nu-disco song. Preparation began after the Dilemma promotions. Statement false. | none |
| 12-13 | 10 | OK | none | April 19 marked the first anniversary; lyrics by Park Cho-rong, music by Kim Jin-hwan. Promise U, The Wave and Thank You are later anniversary songs. | none |

**Apink, departed members:** neither departed member (Yookyung, Naeun) appears anywhere in this quiz. Only current members are named (Park Cho-rong, Chorong, Bomi).

**Apink, lot 2 overlap:** lot2-C 11-25 asks Apink's first win (My My; options Mollayo, Hush, My My, LUV). This quiz does not restate that fact, and the lot 2 quiz comes earlier.

### 2026-12-14 NCT 127: The Sticker Era

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 12-14 | 1 | **FIX** | Answer is right. The fun fact is near-verbatim of the source ("Dem Jointz had also co-produced NCT 127's previous singles Cherry Bomb, Kick It, and Punch"). | The song features a prominent flute sound. | New fun fact: "Its co-composer Dem Jointz had worked on three earlier NCT 127 singles: Cherry Bomb, Kick It and Punch." Source: https://en.wikipedia.org/wiki/Sticker_(song) |
| 12-14 | 2 | OK | none | Lyrics by Yoo Young-jin with Taeyong and Mark; Yoo pushed the group's rappers to write their parts. | none |
| 12-14 | 3 | OK | none | The video uses a "futuristic/space cowboy" concept, with neon sets, CGI and video game elements; NME calls it "Las Vegas-esque". | none |
| 12-14 | 4 | OK | Checked the "first" claim; no counterexample found. The Global 200 launched in Sept 2020 and NCT 127 released no Korean single between then and Sticker. NCT 2020 tracks are credited to NCT/NCT U. | The song page says first entry on the Global 200, peak No. 101. The NCT 127 discography independently says "first single to chart on the Billboard Global 200". It was No. 5 on World Digital Song Sales, their 11th top five there. Hot 100: never entered. Billboard 200 is an album chart that they had entered since 2018. | none (second source: https://en.wikipedia.org/wiki/NCT_127_discography) |
| 12-14 | 5 | OK (note) | "More than four times" is a derived ratio (2.2M / 530k = 4.15), not stated in those words. It is true. | Pre-orders passed 2.2 million on release day, above the previous high of 530,000 for Neo Zone and an SM record. | optional: "well above the group's previous high of about 530,000 for Neo Zone" |
| 12-14 | 6 | OK | none | Favorite (Vampire) led the repackage Favorite (Oct 25, 2021). Writers are Kenzie, Darkchild and Rodnae Chikk Bell. Wins: M Countdown Nov 4 and 11, Music Core Nov 6. Lemonade and Breakfast are album tracks, and Ay-Yo is from 2023. | none |
| 12-14 | 7 | OK | none | Neo City: The Link was announced to support Sticker and ran from Dec 2021 to Jan 2023: 28 shows, 17 cities, over 700,000 spectators. The Origin was 2019, The Unity the 3rd tour, The Momentum the 4th tour (2025). | none |
| 12-14 | 8 | OK (note) | The option set (Gocheok, KSPO, Jamsil, Inspire Arena) is identical to lot2-B 11-19 TXT Q10, which has a different answer (KSPO). This is not a fact repeat, but the near-duplicate check may flag it. | Seoul shows Dec 17 to 19, 2021 at Gocheok Sky Dome; 5,000 admitted per show, no shouting, clapping encouraged. | optional: swap one distractor (e.g. Olympic Gymnastics Arena for Inspire Arena) |
| 12-14 | 9 | OK | none | 10 music show wins, including a triple crown on M Countdown; nominated at the 2021 MAMA (Best Dance Performance Male Group). | none |
| 12-14 | 10 | OK (note) | The album page says "promoted ... on The Late Late Show with James Corden" (uncited). A UPI/Bandwagon search result confirms they performed Sticker there in mid-September 2021. Kimmel was their 2018 US TV debut, with Regular. The fun fact's last 8 words follow the source ("engineering students by day and computer hackers by night"). | Same as problem column. | optional: reword the fun fact tail |

### 2026-12-15 Korea's Year-End Chart Toppers

All 10 marked answers are correct. Each is the year-end No. 1 on the Circle Digital Chart (Total), confirmed both by the circlechart.kr API and by the Wikipedia year-end tables (https://en.wikipedia.org/wiki/Circle_Digital_Chart, "Best-performing singles").

Four questions have a wrong option that was the year-end No. 1 of the same year on another Circle list.

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 12-15 | 1 | OK | Checked all 2011 Circle year lists; no wrong option is a No. 1 anywhere. Streaming and Singing Room No. 1 was IU's Good Day; BGM No. 1 was Hyun Bin. | Roly-Poly is the 2011 year-end No. 1 (Lonely 4th, Pinocchio 6th, Tonight 8th). Wikipedia says it never topped a weekly or monthly chart; the Circle monthly No. 1s for 2011 confirm this. | none |
| 12-15 | 2 | **FIX** | (a) **Shower of Tears** (Baechigi feat. Ailee) was the **2013 year-end No. 1 on the Circle Download Chart**, as well as a weekly No. 1 and No. 2 on the year-end Digital list. (b) Cross-quiz hint: lot3-A 12-05 EXO Q8 fun fact says "Psy's Gentleman won the Digital Daesang" at the January 2014 Golden Disc Awards, which points to this answer ten days earlier. | Gentleman: year-end No. 1 in 2013, No. 1 for two weeks in April, and April's monthly No. 1 (fun fact OK). Bom Bom Bom is how the Roy Kim page names it (the list page says Spring Spring Spring), so the name is fine. | Replace Shower of Tears with **What's Your Name?** (4Minute, No. 6 in 2013, No. 1 on no 2013 list). Also delete the Gentleman clause from lot3-A EXO Q8's fun fact. If lot3-A is frozen, swap this question for **2018**: answer Love Scenario (iKON); wrong options Bboom Bboom, Ddu-Du Ddu-Du, Way Back Home, none of them No. 1 on any 2018 Circle list. Sources: https://en.wikipedia.org/wiki/List_of_Gaon_Digital_Chart_number_ones_of_2018 and https://circlechart.kr/page_chart/onoff.circle?nationGbn=T&serviceGbn=ALL&targetTime=2018&hitYear=2018&termGbn=year&yearTime=3 |
| 12-15 | 3 | OK | Checked all 2014 lists. Wild Flower here means Park Hyo-shin's song; lot3-A 12-06 asks about RM's Wild Flower, so a player may misread it, but it stays wrong either way. | Some led the Digital, Streaming, Download and BGM year lists; two weeks at No. 1 in February plus February's monthly No. 1. | none |
| 12-15 | 4 | OK | Checked all 2015 lists. | Bang Bang Bang: 2015 year-end No. 1, 1,581,284 downloads; written by G-Dragon with Teddy Park. | none |
| 12-15 | 5 | **FIX** | Yoon Jong-shin's **Like It** was the **2017 year-end No. 1 on the Circle Singing Room Chart**. It was also No. 3 on the Digital list. | Ailee's I Will Go to You Like the First Snow (composed by Rocoberry) led the year-end Digital, Streaming, Download and Bell lists; the fun fact is accurate. IU (No. 2) and Heize (No. 5) are No. 1 on no 2017 list. | Replace Yoon Jong-shin with **Crush** (Beautiful, No. 11 in 2017; No. 1 on no 2017 list). Source: https://circlechart.kr/page_chart/onoff.circle?nationGbn=T&serviceGbn=ALL&targetTime=2017&hitYear=2017&termGbn=year&yearTime=3 |
| 12-15 | 6 | **FIX** | **If There Was Practice in Love** (Lim Jae-hyun) was the 2019 year-end No. 1 on three Circle lists: the **Domestic view of the Digital Chart**, Domestic Streaming, and the Singing Room Chart. Korean outlets reported it as the year's top domestic song, so the option has a real second-right-answer risk. | 2002 is No. 1 on the Total Digital list. The "first foreign song" claim is stated by the 2019 Wikipedia list, and the 2010 to 2018 No. 1s are all Korean (Circle_Digital_Chart table). It also topped the June monthly chart. Fun fact OK. The Day Was Beautiful is Kassy's 그때가 좋았어 (No. 4). | Replace with **Four Seasons** (Taeyeon, No. 9 in 2019; No. 1 on no 2019 year list). Source: https://circlechart.kr/page_chart/onoff.circle?nationGbn=K&serviceGbn=ALL&targetTime=2019&hitYear=2019&termGbn=year&yearTime=3 (the Domestic view, showing the conflict) |
| 12-15 | 7 | OK | Checked all 2020 lists. Jo Jung-suk's Aloha: No. 3 Digital, No. 2 Ring, never No. 1. | Any Song: year-end No. 1, ahead of Meteor at No. 2. It led the weekly chart for 7 weeks (weeks 3 to 7 and 10 to 11 of 2020). | none |
| 12-15 | 8 | OK | Checked all 2021 lists. Download, BGM, Bell and Ring No. 1s were all by Lim Young-woong, who is not an option. | Celebrity: year-end No. 1, six straight weeks at No. 1 from the week of Jan 30. IU spent 12 weeks at No. 1 with four songs (Nakka shared with AKMU). | none |
| 12-15 | 9 | **FIX** | **Drunken Confession** (Kim Min-seok) was the **2022 year-end No. 1 on the Circle Singing Room Chart**. It was also No. 3 on the Digital list and a 7-week weekly No. 1. The 2022 Global K-pop year No. 1 is Love Dive, so no conflict there. | Love Dive: year-end No. 1, four straight weeks at No. 1; After Like also had four. | Replace with **Still Life** (BIGBANG, No. 7 in 2022; No. 1 on no 2022 list). Source: https://circlechart.kr/page_chart/onoff.circle?nationGbn=T&serviceGbn=ALL&targetTime=2022&hitYear=2022&termGbn=year&yearTime=3 |
| 12-15 | 10 | OK | Checked all 2025 lists. The V Coloring No. 1 was Hwasa's Good Goodbye and the Global K-pop No. 1 was Golden (APT. No. 2); neither is the listed answer. No overlap with lot 2: lot2-B "K-pop Songs of 2025" never mentions Drowning or Woodz, and no lot 2 file names Woodz, Drowning or a year-end chart. | Drowning: year-end No. 1 on the Digital, Streaming and Singing Room lists. Released on the 2023 EP Oo-Li; weekly No. 1 in 2025 week 19 (May). | none |

### 2026-12-16 NCT DREAM: From Chewing Gum to Smoothie

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 12-16 | 1 | OK | none | Formed by SM; third sub-unit after NCT U and NCT 127. | none |
| 12-16 | 2 | OK | none | My First and Last won on Feb 14, 2017, the 100th episode of The Show, NCT's first music show win of any unit. It led The First. | none |
| 12-16 | 3 | **FIX** | 2020 is correct. The fun fact is the source sentence with synonyms swapped: "NCT Dream would function as a fixed group and explore more diverse concepts with each release." | The graduation system was dropped after the Reload promotions in 2020; Mark returned. | New fun fact, which must not name Reload because Q5 asks it: "Mark, who had left under the old rule on December 31, 2018, rejoined the unit once the change took effect." Sources: https://en.wikipedia.org/wiki/NCT_Dream and https://en.wikipedia.org/wiki/NCT_(group) |
| 12-16 | 4 | OK (note) | Q4 lists Reload as a wrong option while Q5's answer is Reload. This is a mild hint only. | Aug 27, 2018: SM confirmed We Go Up (Sept 3, 2018) as Mark's last comeback before graduating. It had a Mandarin version of the title song and was the unit's second Gaon Album No. 1. | optional |
| 12-16 | 5 | OK | none | Ridin' led Reload: five songs, the six members of the time, first No. 1 on Billboard Emerging Artists. | none |
| 12-16 | 6 | OK | none | The Smoothie video shows the members playing a real-life Fruit Ninja; Dream()scape was released March 25, 2024 (pronounced Dreamescape). | none |
| 12-16 | 7 | OK (note) | The second clause of the fun fact follows the source closely ("debuting at number one on the monthly Gaon Chart with 1,646,949 copies sold"). Heatseekers and World Albums are wrong: We Go Up was already a World Albums top five, and a No. 50 Billboard 200 debut makes an album ineligible for Heatseekers. | First Billboard 200 entry, No. 50 on the chart dated April 9, 2022. | optional rewording |
| 12-16 | 8 | OK (note) | Renjun is a current member as of 2026. **Mark left NCT and NCT DREAM on April 8, 2026** (end of contract, no controversy stated). The quiz names him only in neutral 2016 and 2018 facts, which is fine. Do not add any present-tense member count. | Renjun was among the five who joined Mark and Haechan when NCT DREAM was announced on Aug 18, 2016. | none |
| 12-16 | 9 | **FIX** (source) | The fact is right, but the cited NCT (group) page is stale: it says JNJM "will debut on February 23, 2026". | The NCT JNJM page says the duo Jeno and Jaemin, active from 2026, debuted Feb 23, 2026 with the EP Both Sides. The NCT page lists seven sub-units with JNJM last. | Source for Q9: https://en.wikipedia.org/wiki/NCT_JNJM (also add it to `sources`). Keep the NCT (group) page as backup for "seventh". |
| 12-16 | 10 | OK | none | Official ambassadors of the 2017 FIFA U-20 World Cup; Trigger the Fever released March 15 and sung at the opening ceremony. | none |

### 2026-12-17 K-pop Songs With Foreign Titles

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 12-17 | 1 | OK | none | Hola Hola (Spanish): Kard's title track from the debut EP of the same name, July 19, 2017. The video is set in LA, Las Vegas, Mexico and Brazil. KARD is the official styling. | none |
| 12-17 | 2 | **FIX** | The fun fact "climbed to No. 2 ... where it stayed for six weeks" reads as six weeks at No. 2. The source only says it charted for six weeks. | Adios (Spanish) led the single album Hush, Aug 19, 2019. It peaked at No. 2 on World Digital Song Sales and spent six weeks on that chart. | New fun fact: "It led the single album Hush. On Billboard's World Digital Song Sales it got as high as No. 2 and charted for six weeks in all." Source: https://en.wikipedia.org/wiki/Everglow |
| 12-17 | 3 | OK (note) | The group has been named i-dle since 2025 (lot 2 uses i-dle); "(G)I-DLE" is correct for 2019. | Senorita (Spanish) was the title track of I Made (Feb 26, 2019). Lyrics by Soyeon, produced with Big Sancho; castanets, brass and a flamenco feel. | optional: "(G)I-DLE, now i-dle" |
| 12-17 | 4 | OK | TVXQ also released its seventh Korean studio album in 2014 (Tense), but Mamacita is not on it, so there is no second right answer. | Mamacita (Spanish) is the lead single of Super Junior's seventh Korean studio album. Teddy Riley co-composed it; in the western-style video the members play a sheriff, a robber and a matador, among others. | none |
| 12-17 | 5 | OK | Neutral: the departures of Nicole and Jiyoung are not mentioned. | Mamma Mia (Italian) led Day & Night, Aug 18, 2014, the first release with Youngji, who won Kara Project. Composed by Duble Sidekick. | none |
| 12-17 | 6 | OK (note) | The fun fact adds little and echoes "the title track of the same name". | Bon Voyage (French) was YooA's debut solo EP: WM Entertainment, Sept 7, 2020, five songs. | optional: mention the Sept 7, 2020 release and music show promotion instead |
| 12-17 | 7 | OK (note) | The fun fact says Diplo and Baauer "feature on it as co-producers". They are both the featured artists and co-producers. | Coup d'Etat (French) is the title track of G-Dragon's second studio album (2013). It features and was co-produced by Diplo and Baauer, and samples Gil Scott-Heron. | optional: "Diplo and Baauer are featured on it and co-produced it" |
| 12-17 | 8 | **FIX** | The first clause of the fun fact copies the source sentence ("The title of the song was hidden through the morse code ... in the first album teaser"). | Maison is French for home (meaning the Earth); the title was hidden in Morse code in the first teaser; the song is a cry for help to save the Earth. | New fun fact: "A Morse code sequence in the first album teaser spelled out the title, and the lyrics plead for the Earth to be rescued from climate disaster." Source: https://en.wikipedia.org/wiki/Apocalypse:_Save_Us |
| 12-17 | 9 | **FIX** | The second clause of the fun fact is the source sentence with only the subject changed ("Iz*One held their Japanese debut showcase at Tokyo Dome City Hall on January 20, 2019"). | Suki to Iwasetai (Japanese, literally Tell Me You Love Me): Japanese debut single, Feb 6, 2019. Producer and lyricist Yasushi Akimoto; No. 2 on the weekly Oricon chart with 221,640 sold. | New fun fact: "Yasushi Akimoto wrote and produced it, and it entered Oricon's weekly singles chart at No. 2 with 221,640 copies sold." Source: https://en.wikipedia.org/wiki/Suki_to_Iwasetai |
| 12-17 | 10 | OK (note) | The question stem echoes an NME phrase quoted on Wikipedia ("gayageum strings warbling over trap beats"). | Luna (Latin/Spanish; Korean title 월하미인) led Blood Moon, Nov 9, 2021, and won Show Champion on Nov 17, 2021, the group's first win. | optional: "mixes gayageum with trap beats" |

## Other notes (no action required in lot3-C unless the lead wants it)

- **Lot 3-A cross-effect.** The EXO 12-05 Q8 fun fact (Gentleman won the Digital Daesang) hints at 12-15 Q2. See FIX 12-15 Q2.
- **Lot 3-A spelling.** The flower quiz spells the name "Jang Beom-jun"; this file uses "Jang Beom-june", the Wikipedia spelling. Align them.
- **Lot 2 framing.** The year-end quiz description ("the Gaon, now Circle, Digital Chart") restates the rename that lot2-C 11-23 Q6 asks about. This is framing, not a question; low risk.
- **Bank titles I could not inspect** (no DB access per brief), worth a look in the automatic duplicate check:
  - "K-pop Songs With Repeated Words": Hola Hola, Mamma Mia.
  - "NCT system explained quiz" and "NCT Basics (OCT 2026)": the graduation system, JNJM, the sub-unit count.
  - "K-pop on the Billboard Charts": NCT 127 Global 200 and NCT DREAM Billboard 200 firsts.
  - "NCT Dream quiz".
- **Cross-quiz hint.** The NCT 127 12-14 Q2 options show Johnny, Yuta and Doyoung as NCT 127 members, which slightly hints at NCT DREAM 12-16 Q8 (an easy quiz anyway).
- **Unaffected checks.**
  - The winter quiz (Candy, IU, Ailee and others) shares nothing with lot3-C.
  - No content-rule breaks: no private life, no minors' data, no generation numbers, no dashes, no quotation marks, no banned words.

## Totals

- 50 questions checked: **39 OK** (11 of them with optional notes), **11 FIX**, **0 DROP**.
- Of the 11 FIX:
  - 4 are distractor conflicts in the year-end quiz (one also has a cross-lot hint);
  - 6 are fun fact wording or accuracy;
  - 1 is a stale source.

## FIX / DROP list

1. 12-13 Q4: the fun fact closely follows the Pink Luv sentence. Rewrite it (suggested text in the table).
2. 12-14 Q1: the fun fact is near-verbatim ("Dem Jointz had also co-produced ... Cherry Bomb, Kick It, and Punch"). Rewrite it.
3. 12-15 Q2: wrong option Shower of Tears was the 2013 Circle **Download** year-end No. 1. Replace it with What's Your Name? Also the lot3-A EXO Q8 fun fact (Gentleman won the Digital Daesang) gives this answer away: cut that clause, or swap this question to 2018 Love Scenario.
4. 12-15 Q5: wrong option Yoon Jong-shin (Like It) was the 2017 Circle **Singing Room** year-end No. 1. Replace with Crush.
5. 12-15 Q6: wrong option If There Was Practice in Love was the 2019 year-end No. 1 on the **Domestic Digital** list, Domestic Streaming and Singing Room. Replace with Four Seasons.
6. 12-15 Q9: wrong option Drunken Confession was the 2022 Circle **Singing Room** year-end No. 1. Replace with Still Life.
7. 12-16 Q3: the fun fact is a synonym swap of the source sentence ("function as a fixed group and explore more diverse concepts"). Rewrite it without naming Reload, which is Q5's answer.
8. 12-16 Q9: the cited NCT (group) page is stale ("will debut"). Cite https://en.wikipedia.org/wiki/NCT_JNJM instead.
9. 12-17 Q2: the fun fact "No. 2 ... where it stayed for six weeks" misreads the source, which says six weeks on the chart. Rewrite it.
10. 12-17 Q8: the Morse code clause of the fun fact copies the source sentence. Rewrite it.
11. 12-17 Q9: the showcase clause of the fun fact copies the source sentence. Rewrite it (Oricon No. 2, 221,640 copies).
