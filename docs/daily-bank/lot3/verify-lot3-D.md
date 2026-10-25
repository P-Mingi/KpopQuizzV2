# Fact check, lot 3 file D (2026-12-18 to 2026-12-22), done 2026-10-25

Input: lot3-D.json (5 quizzes, 50 questions), not edited. Every cited source was opened: Wikipedia as raw wikitext via curl with a generic User-Agent; billboard.com, rollingstone.com, koreatimes.co.kr, koreajoongangdaily.com, nme.com and fncent.com via curl with the same User-Agent; one archived Vimeo credit page via web.archive.org. Raw files are in `scratchpad/lot3/vD/`. Each question was answered from the source before reading `correct`, then wrong options, fun facts, content rules and overlaps were checked against lot2-*.json, lot3-A/B/C.json, WINTER-2026-12-02.txt and the full bank dump (`lot3B-work/existing-flat.txt`, 5,381 rows).

Mechanical checks (all pass): no U+2013/U+2014, no curly quotes, no banned words, no quotation marks in questions, questions under 120 characters, fun facts under 220, titles 19 to 40 characters, descriptions 113 to 140 characters, answer positions within the rules, the true or false quiz has 5 false statements, every question source is in its quiz's `sources` list.

## 2026-12-18 2NE1: The Crush Era

| Q | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|
| 1 | OK | none | Title recalls the 1995 Seo Taiji and Boys song of the same name (Yang Hyun-suk's former group); CL told Vice it was a homage, video concept different | |
| 2 | OK | none | Entered Gaon Digital at No. 2 behind Girls' Generation's Mr.Mr; rose to No. 1 the next week, stayed two weeks; group's ninth and final No. 1. Distractors are 2013 and 2015 singles | |
| 3 | OK (note) | none on the answer | Video likened to The Matrix (1999); Yang: near-future city, virtual paradise; Dee Shin directed; production value half a million dollars. All four options are 1999 films | Note: the Dongdaemun Design Plaza claim sits in a Wikipedia image caption sourced to a travel blog; acceptable, but it is the weakest claim of the quiz |
| 4 | FIX | Fun fact misnames the Billboard list: it is a December 2017 list of the decade so far, not of the 2010s | MTBD is the CL solo track (Menbung, Mental Breakdown). Billboard, Dec 1 2017: The 40 Best K-Pop Deep Cuts of the Decade So Far, MTBD No. 2 | fun_fact: "Its Korean title, Menbung, translates as Mental Breakdown, and in 2017 Billboard ranked it No. 2 on its list of the best K-pop deep cuts of the decade so far." https://en.wikipedia.org/wiki/Crush_(2NE1_album) + https://www.billboard.com/music/music-news/kpop-deep-cuts-best-8054669/ |
| 5 | OK | none | Video mixes Roy Lichtenstein comics and Andy Warhol's Brillo Boxes; Jeremy Scott; released May 21 2014 for the fifth anniversary | |
| 6 | OK | none | Wikipedia: The 10 Best K-pop Albums of 2014, rank 1. Billboard page (Dec 11 2014) opened: ten entries, 1. 2NE1 Crush. Rolling Stone 20 Best Pop Albums of 2014 opened: Crush is No. 6, no other Asian act on the list | |
| 7 | FIX | Fun fact count "three days" is not stated by the source; the same page also says the release was moved "two days later" | Crush includes the Korean version of the 2012 Japanese single Scream. Release first set for Feb 24 2014, then Feb 27 | fun_fact: "The album was first scheduled for February 24, 2014, before YG moved its release to February 27." https://en.wikipedia.org/wiki/Crush_(2NE1_album) |
| 8 | OK | none | Winner were special guests from the Seoul to the Jakarta shows (March to May 2014); 20 shows, started SK Olympic Handball Gymnasium March 1. iKON debuted 2015 | |
| 9 | OK | none | July 22 2024 YG announces reunion for the 15th anniversary; fourth tour, Welcome Back Tour, opened Olympic Hall Oct 4 2024. Nolza (2011) and New Evolution (2012) are earlier tours. NME (Jul 21 2024) agrees | |
| 10 | OK | none | Melon 2014 page: category Best Electronic Award, winner Come Back Home (the song page also says Best Electronica Song); only the genre is asked. Gaon Song of the Year March; three wins (Inkigayo Mar 16, M Countdown Mar 20 and 27) | |

No departure, private life or health topic appears (the 2NE1 page mentions Minzy leaving and Bom's 2025 hiatus; the quiz avoids both).

## 2026-12-19 K-pop and Korean Tradition True or False

| Q | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|
| 1 | OK (true) | none | Korea Times (Jul 9 2020): members dance in modified hanbok in the How You Like That video; Rose's outfit inspired by cheollik, officials' clothes; hanbok also on The Tonight Show | |
| 2 | OK (false) | none | Haegeum is a two-stringed fiddle used in the song; title is wordplay on liberation; April 21 2023, second single of D-Day | |
| 3 | OK (true) | none | Seo Taiji and Boys II (1993): Kim Duk-soo on taepyeongso and samul nori on track 2, Hayeoga; over 2.2 million sold | |
| 4 | OK (false) | none | Korea Times (Sep 30 2025): Shangri-La layers synths with gugak-inspired melodies; VIXX page: EP and single May 15 2017 | |
| 5 | OK (false) | none | Video draws on the 2012 film Masquerade; Agust D plays the king and his double | |
| 6 | FIX | Statement names ETA as a NewJeans song, which gives away lot3-B 2026-12-11 Q2 (which group shot the ETA video on an iPhone? NewJeans) | Korea Times (May 22 2024): NewJeans in hanbok at Gyeongbok Palace, 2024 Korea On Stage, co-hosted by Korea Heritage Service and KBS; performed Ditto, ETA, Super Shy; pre-filmed Cool With You at Geunjeongjeon | question: "NewJeans performed in hanbok at Gyeongbok Palace in Seoul in May 2024." (still true, fun fact unchanged) same URL |
| 7 | OK (true) | none | Wikipedia: built from wanting to sample a real daechwita, grew into pansori storytelling and kkwaenggwari percussion; Korea Times: samples the royal military music daechwita | |
| 8 | FIX (minor) | Second sentence of the fun fact copies the source ("Sunmi wrote and co-produced the song with Frants") | Billboard (Tamar Herman): Latin pop and dancehall with traditional sounds, taepyeongso; Sunmi wrote it, produced with Frants | fun_fact: "Billboard heard Latin pop and dancehall in it, plus the taepyeongso, a traditional Korean horn. Sunmi shares the production credit with Frants." https://en.wikipedia.org/wiki/Lalalay |
| 9 | OK (true) | none | Korea Times: Oh My Girl reworked Lovelyz's Destiny on Queendom with gayageum; choreography mirrored traditional Korean aesthetics | |
| 10 | DROP (replace) | Repeats a bank topic: the bank already asks how the IDOL video uses traditional Korean art (BTS music video trivia quiz, answer All of the above: pansori, buchaechum, talchum). The statement itself is correct (gqom, janggu) | Idol is gqom from Durban layered with Korean rhythms and a janggu | Replacement, same boolean (false): question "In her 2021 video for Lalisa, BLACKPINK's Lisa wears an outfit modeled on Korean royal court dress." fun_fact "Her costume draws on Thai tradition instead, topped by a rad klao yod, a tall headdress worn in classical dance, and the clip also shows Phanom Rung Historical Park." https://en.wikipedia.org/wiki/Lalisa_(song) (video section: ensemble based on traditional Thai culture, rad klao yod headdress, Phanom Rung Historical Park). Not in the bank as a tradition fact, not in lot 2 or lot 3 |

Instruments named in the quiz were each checked at their source: haegeum (Q2), taepyeongso (Q3 and Q8 fun fact), gayageum (Q9), kkwaenggwari (Q7 fun fact), janggu (Q10). Nothing contradicts lot3-C 2026-12-17 Q10 (Luna, gayageum strings over trap beats): lot3-D never mentions Luna. FYI only: the Korea Times article cited here says Luna opens with a piri line; NME (via the Blood Moon page) says gayageum strings over trap beats; both can be true. Bank topics Pink Venom geomungo, Thunderous, HWAA hanbok and IVE Heya are not used. Style note, not a rule break: three statements are about Agust D (Q2, Q5, Q7), two of them on Daechwita.

## 2026-12-20 P1Harmony: From Siren to Sad Song

Official and second sources for load-bearing facts:
- Members: FNC official page (fncent.com/P1Harmony/b/introduce/45597) lists Keeho, Theo, Jiung, Intak, Soul, Jongseob; Wikipedia (2026 photo caption) and NME agree. All six are adults.
- Debut date and Siren: FNC lists 2020-10-28 first mini DISHARMONY : STAND OUT; Wikipedia and NME (Oct 2021, "their debut single, Siren") agree.
- Label: FNC official site; Wikipedia infobox FNC.
- Leader: no official page names one. NME (Oct 28 2021, bylined interview) writes "Canadian-born leader Keeho"; Wikipedia agrees.
- Fandom P1ece: no official page states it (FNC only lists the Japanese best album Love & P1ece). Korea JoongAng Daily (Aug 6 2022) writes "its fandom P1ece"; Wikipedia gives the April 20 2021 announcement. Two agreeing sources, one Wikipedia.

| Q | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|
| 1 | OK | none | Debut EP Disharmony: Stand Out, Oct 28 2020, lead single Siren; all members wrote lyrics of Intro; Breakthrough; No. 5 Gaon Album Chart | |
| 2 | OK | none | Name = Plus + Number 1 + Harmony; members added together into one group for infinite harmonies; alias P1H | |
| 3 | OK | none | P1ece, announced April 20 2021, fans as indispensable pieces (JoongAng Daily agrees on the name) | |
| 4 | OK | none | Members list: Keeho, leader, vocalist (NME agrees on leader) | |
| 5 | FIX | Elimination giveaway inside the quiz: the stems of Q1 (Siren led the 2020 debut EP), Q6 (Back Down performed November 2022) and Q7 (Jump led the June 2023 EP) rule out all three wrong options, so Scared is left whatever the shuffle | Disharmony: Break Out, Apr 20 2021, lead single Scared; nominated for Album of the Year at the 2021 MAMA (Wikipedia awards table) | options: ["Scared", "Do It Like This", "Doom Du Doom", "Duh!"], correct 0 (lead singles of Disharmony: Find Out, Harmony: Zero In and Duh!, none named elsewhere in the quiz). https://en.wikipedia.org/wiki/P1Harmony |
| 6 | OK | none | Back Down on The Kelly Clarkson Show Nov 29 2022, US TV debut; EP Harmony: Set In out Nov 30 | |
| 7 | OK | none | Korea Times (Jun 22 2023): Harmony: All In first Billboard 200 entry at No. 51; Artist 100 No. 35; over 250,000 sold, double the previous release | |
| 8 | OK | none | First music show win Feb 16 2024 on Music Bank (Chosun Biz ref); Killin' It Feb 5 2024, Billboard 200 No. 39; FNC lists it as first full-length (jeonggyu) album | |
| 9 | OK | none | Sad Song EP: No. 16 Billboard 200, No. 2 Circle Album Chart; loneliness overcome through a superhero concept | |
| 10 | DROP (replace) | Sources disagree on the answer: Wikipedia and JoongAng Daily say Seoul then eight US cities, but the official FNC page says the 2022 US leg of P1ustage H: PEACE covered nine US cities. Also FNC calls it the first US tour, while the stem says first tour | Wikipedia: eight US cities. FNC: "미국 9개 도시" (9 US cities). P1oneer 2023: Wikipedia 39 cities; FNC 39 cities, 40 shows | Replacement, same index (2): question "How many cities did P1Harmony's 2023 tour, P1ustage H: P1oneer, visit around the world?" options ["Twelve", "Twenty", "Thirty-nine", "Fifty"], correct 2; fun_fact "The tour opened on January 14, 2023, and FNC Entertainment counts 40 shows across those cities." https://en.wikipedia.org/wiki/P1Harmony + https://fncent.com/P1Harmony/b/introduce/45597. If applied, change "US tours" to "tours" in the description: "From their 2020 debut with Siren to Sad Song: P1Harmony's name, fandom, leader, singles, tours and Billboard 200 entries." (121 characters) |

Bank overlap: the bank asks which group debuted with Siren in 2020 and which B-side is on Sad Song (WASP); Q1 and Q9 ask different facts. Lot 2 (2026-11-14 Q6) names P1Harmony as an FNC act in a fun fact; no P1Harmony question asks the label, so no giveaway.

## 2026-12-21 Who Directed These K-pop Music Videos?

Every director was checked on a page that names him or her for that exact video. No wrong option directed the same video.

| Q | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|
| 1 | OK | none | Mic Drop remix video directed by Woogie Kim of GDW (Nov 24 2017); mic drop at the end inspired by Obama at his final White House Correspondents' Dinner. The Japanese version is a separate video | |
| 2 | OK | none | TT video by Kim Young-jo and Yoo Seung-woo of Naive, also behind Like Ooh-Ahh and Cheer Up; over 5 million views in under 24 hours. Japanese version by BS Pictures (2017), not an option | |
| 3 | FIX (minor) | Fun fact is the source sentence with two words changed ("choreographed by Parris Goebel, who makes an appearance on the video") | Directed by Seo Hyun-seung; choreography Parris Goebel, who appears in it | fun_fact: "Parris Goebel created the choreography, and she can be spotted in the clip herself." https://en.wikipedia.org/wiki/Bang_Bang_Bang_(BigBang_song) |
| 4 | OK | none | Directed by Cho Soo-hyun; filmed in Seoul over 48 hours in July 2012; he later directed Gentleman | |
| 5 | FIX (minor) | Fun fact copies "art director duo Seong Won-mo and Park Sang-woo" | Digipedi, short for Digital Pedicure, formed by Seong Won-mo and Park Sang-woo; Butterfly in its videography; Butterfly page: Loona's visual director Digipedi | fun_fact: "Digipedi stands for Digital Pedicure, and the studio was started by two art directors, Seong Won-mo and Park Sang-woo." https://en.wikipedia.org/wiki/Digipedi |
| 6 | OK | none | Directed by Yoon Rima and Jang Dongju of Rigend Film; third (G)I-dle video past 100 million. Group renamed i-dle in 2025; (G)I-DLE is right for a 2020 fact | |
| 7 | OK | none | Advertising director Shin Woo-seok, CEO of Dolphiners Films, directed the two-part video; lyrics partly by Oohyo and The Black Skirts | |
| 8 | FIX (minor) | Fun fact copies "founded in 2002 by director Hong Won-ki and videographer Kim Jun-hong" word for word | Super Junior videography: Mr. Simple (Korean and Japanese videos, 2011) directed by Hong Won-ki (Zanybros); Zanybros founded 2002; Goedam web series (2020) acquired by Netflix | fun_fact: "Director Hong Won-ki set it up in 2002 with cameraman Kim Jun-hong, and in 2020 it made the web series Goedam, which Netflix acquired." https://en.wikipedia.org/wiki/Zanybros |
| 9 | OK | none | Lumpens videography: Given-Taken directed by Choi Yongseok and Yoon Jihye (Lumpens); name from a professor's nickname, a German insult | |
| 10 | OK | none | Shin Hee-won page lists 11:11 (2016); original Vimeo credit (archived Mar 2017): Director Shin Hee One (st-wt). He also directed Forever 1 (2022) | |

Cross-quiz: lot3-C 2026-12-13 Q3 fun fact names Digipedi for Apink's Mr. Chu and lot3-C 2026-12-15 Q4 is about Bang Bang Bang's chart year; neither gives away a director asked here.

## 2026-12-22 K-pop Song Titles That Ask a Question

Titles checked as released: What Is Love?, Why Not?, Who Do U Love?, Who You?, What's Your Name?, How's This?, What Do I Call You, What You Waiting For, What Are You Up To, Why Don't You Know (question marks only where the release has them).

| Q | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|
| 1 | OK (note) | none | TWICE, Apr 9 2018; written and composed by Park Jin-young; debuted at No. 1 on Gaon Digital. Note: bank quizzes already show What Is Love? as a TWICE song (video question), low risk | |
| 2 | OK | none | Loona, Oct 19 2020, lead single of [12:00]; video shows members dancing on the surface of the Moon | |
| 3 | FIX (minor) | Fun fact copies two source sentences almost word for word; its first half also repeats a bank fact (WHO DO U LOVE? as MONSTA X's English-language debut) | Monsta X featuring French Montana, Jun 14 2019; first single of All About Luv; No. 26 Mainstream Top 40 Airplay, first single in that chart; Best K-pop nominee, 2019 VMAs | fun_fact: "It climbed to No. 26 on Billboard's Mainstream Top 40 airplay chart, the group's first single to enter it, and was up for Best K-pop at the 2019 MTV VMAs." https://en.wikipedia.org/wiki/Who_Do_U_Love%3F_(Monsta_X_song) |
| 4 | OK | none | Coup d'Etat: Black (feat. then-YG trainee Jennie) and Who You? both out Sep 2 2013. Lot3-C 12-17 Q7 asks about the title track of the same album: different fact, no giveaway | |
| 5 | OK | none | Name Is 4Minute, Apr 26 2013; produced by Brave Brothers; No. 1 Gaon; intro track What's My Name? | |
| 6 | OK | none | Hyuna, Aug 1 2016; co-written by her; hip-hop and trap; club party video with one hundred dancers | |
| 7 | OK | none | Taeyeon's fourth Korean EP, Dec 15 2020; physical edition adds the May 4 2020 single Happy | |
| 8 | OK | none | Jeon Somi, Jul 22 2020; produced by Teddy, R. Tee and 24; she plays several sub-characters, timid to confident | |
| 9 | FIX (minor) | Fun fact repeats the source sentence ("his first music show win as a soloist on Music Bank on August 9, 2019") | Kang Daniel, Jul 25 2019, lead of debut EP Color on Me; first solo win Music Bank Aug 9 2019 | fun_fact: "Music Bank handed him his first trophy as a solo artist for this song on August 9, 2019." https://en.wikipedia.org/wiki/What_Are_You_Up_To |
| 10 | FIX (minor) | Fun fact copies "described as a tropical house song about unrequited love" and "the debut single from her debut EP"; the Hands on Me debut is also in a bank fun fact (Chung Ha true or false) | Chung Ha feat. Nucksal, Jun 6 2017, debut single of the EP Hands on Me; tropical house about unrequited love; video in a vast grassy field | fun_fact: "The tropical house track is about a love that goes unanswered, and its video shows her dancing across a wide grassy field." https://en.wikipedia.org/wiki/Why_Don%27t_You_Know |

## Totals

- 50 questions checked: 37 OK, 11 FIX, 2 DROP (each DROP comes with a ready replacement at the same index or boolean).
- By quiz: 2NE1 8 OK / 2 FIX; Tradition 7 OK / 2 FIX / 1 DROP; P1Harmony 8 OK / 1 FIX / 1 DROP; MV directors 7 OK / 3 FIX; Question titles 7 OK / 3 FIX.
- No marked answer is wrong at its cited source. One answer is disputed between sources (P1Harmony Q10: 8 vs 9 US cities). No wrong option is a second right answer. All 5 false statements of the tradition quiz are clearly false at the source.

## FIX / DROP list

1. 2026-12-18 2NE1 Q4 FIX: fun fact says the Billboard list covers the 2010s; it is the 2017 "Deep Cuts of the Decade So Far" list; reword.
2. 2026-12-18 2NE1 Q7 FIX: fun fact count "three days" is not in the source (which also says "two days later"); drop the count.
3. 2026-12-19 Tradition Q6 FIX: naming ETA gives away lot3-B 12-11 Q2 (ETA is NewJeans); remove the song list from the statement.
4. 2026-12-19 Tradition Q8 FIX: fun fact copies "Sunmi wrote and co-produced the song with Frants"; reword.
5. 2026-12-19 Tradition Q10 DROP: BTS Idol and Korean tradition is already a bank question; replace with the Lalisa statement (false, Thai not Korean court dress).
6. 2026-12-20 P1Harmony Q5 FIX: Siren, Back Down and Jump are ruled out by the stems of Q1, Q6 and Q7; use Do It Like This, Doom Du Doom, Duh!.
7. 2026-12-20 P1Harmony Q10 DROP: FNC official page says 9 US cities, Wikipedia and JoongAng Daily say 8; replace with the 2023 P1oneer tour, 39 cities (Wikipedia and FNC agree), and change "US tours" to "tours" in the description.
8. 2026-12-21 MV Q3 FIX: fun fact is the source sentence on Parris Goebel with two words changed; reword.
9. 2026-12-21 MV Q5 FIX: fun fact copies "art director duo Seong Won-mo and Park Sang-woo"; reword.
10. 2026-12-21 MV Q8 FIX: fun fact copies "founded in 2002 by director Hong Won-ki and videographer Kim Jun-hong"; reword.
11. 2026-12-22 Titles Q3 FIX: fun fact copies two source sentences and repeats a bank fact; use the Mainstream Top 40 No. 26 fact.
12. 2026-12-22 Titles Q9 FIX: fun fact repeats the source sentence on the first solo win; reword.
13. 2026-12-22 Titles Q10 FIX: fun fact copies the source and repeats a bank fun fact (Hands on Me); use the grassy field video.
