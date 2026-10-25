# Fact-check: lot2-D.json (2026-11-28 to 2026-12-02)

Checker: independent second pass (Mission U, step A8), run on 2026-10-25.
Method: I fetched every cited Wikipedia page fresh through the MediaWiki API (current revision, generic User-Agent). Every URL resolved straight to the intended article, with no redirect and no disambiguation page. I also fetched the Korea Times article (its old URL redirects to `/entertainment/k-pop/20241125/...`, status 200) and the Billboard chart-history pages for ATEEZ (Hot 100 and Billboard 200, via curl). The 2025 debut groups were cross-checked against Wikidata (Q131746784, Q132526762, Q131722593, Q135668928, Q134986635, Q131689681, Q135466598, Q28700294) and against the "Debuting groups" list in 2025 in South Korean music. For each question I answered from the source first, then compared with `correct`. My working copies are in `scratchpad/lot2/verify-D/`.

Mechanical checks, all quizzes: no em or en dash, no straight or curly quotation marks, none of the banned words, all questions under 120 characters, fun facts under 220, descriptions between 90 and 150, titles at most 45 characters, 4 distinct options, and every per-question source is listed in `sources`. Answer positions follow the per-quiz rules (no position used more than 3 times, no run longer than 2). The Wonder Girls true or false quiz has 5 false and 5 true statements.

## 2026-11-28 ATEEZ: The Golden Hour Era

| Date | Q# | Verdict | Problem | What the source says | Proposed correction (source) |
|---|---|---|---|---|---|
| 11-28 | desc | FIX | The description says "Golden Hour series of 2024 and 2025", but the series continues: Part.4 (Feb 2026), Part.5 (Jun 2026) and Part.6 (out Nov 13, 2026, before this quiz goes live). | The Ateez article lists Part.4 (Adrenaline), Part.5 (Bad) and Part.6 announced for 2026-11-13. | "Ten questions on the first three parts of ATEEZ's Golden Hour series (2024 to 2025): Work, Ice on My Teeth, Lemon Drop, charts and festivals." (141 characters) https://en.wikipedia.org/wiki/Ateez |
| 11-28 | 1 | OK | None. Work is the only single on Part.1. | Tenth EP, May 31, 2024, lead single Work; No. 2 on the Billboard 200; over 1.5M first-week sales (Billboard chart history: peak 2, 6/15/24). | None |
| 11-28 | 2 | OK | None. | The MV shows odd jobs such as working at a diner and mining for gold; choreography co-created by San. | None |
| 11-28 | 3 | OK | None. | Three remixes: Pt.2 with Don Diablo (Jun 5), Pt.3 with Eden-ary (Jun 12), Pt.4 with G-Eazy (Aug 9, 2024). | None. The page quotes G-Eazy's verse about Halsey; the quiz rightly leaves it out. |
| 11-28 | 4 | OK | None. | Korea Times: Part.2 debuted at No. 1 with 184,000 units; first No. 1 was The World EP.Fin: Will (2023). Billboard: peak 1, chart dated 11/30/24. | None. "Second No. 1" is framed as a dated past event; ATEEZ have three as of 2026. |
| 11-28 | 5 | OK | None. | The song contains violin over an R&B foundation; released Nov 15, 2024; Yunho calls it a song about knowing your worth. | None |
| 11-28 | 6 | OK | None. Billboard confirms Lemon Drop is the first Hot 100 entry. | Lemon Drop debuted at No. 69, ATEEZ's first Hot 100 entry, third Korean boy band to chart. Billboard: Hot 100 history shows only Lemon Drop (6/28/25, 69) and In Your Fantasy (7/26/25, 68). | None |
| 11-28 | 7 | OK | None. Adrenaline (2026, Part.4) is a valid wrong option. | In Your Fantasy, Jul 11, 2025, lead single of the In Your Fantasy Edition, Hot 100 peak 68. | None |
| 11-28 | 8 | FIX (wording) | The stem copies the source sentence almost word for word ("In 2024, Ateez became the first K-pop boy group to perform at Coachella"). The facts are fine. | Coachella, Apr 12 and 19, 2024; first pitch for the LA Dodgers on Apr 20. | Q: "ATEEZ played which US festival in April 2024, a first for any K-pop boy group?" (same options, same answer) https://en.wikipedia.org/wiki/Ateez |
| 11-28 | 9 | OK | None. | Mawazine is in Rabat, Morocco; ATEEZ were the first K-pop act to headline (Jun 23, 2024), after filming their debut MV in the Moroccan Sahara. | None |
| 11-28 | 10 | FIX (wording) | The fun fact repeats the source almost word for word ("first K-pop group to hold and sell-out a concert in Europe's largest indoor venue"). | European leg from Jan 18, 2025; sold out Paris La Défense Arena. | FF: "ATEEZ became the first K-pop group to headline a sold-out show at this arena, which is billed as the largest indoor venue in Europe." https://en.wikipedia.org/wiki/Ateez |

All ATEEZ questions stay within 2024 to 2025: Q1 to Q5, Q8 and Q9 are in 2024; Q6, Q7 and Q10 are in 2025.

## 2026-11-29 Wonder Girls True or False

| Date | Q# | Verdict | Problem | What the source says | Proposed correction (source) |
|---|---|---|---|---|---|
| 11-29 | 1 (F) | OK | None. | Debuted Feb 2007 with Irony (EP The Wonder Begins); Tell Me was the lead single of The Wonder Years (Sep 2007). | None |
| 11-29 | 2 (T) | OK | Weak sourcing only: the article's sentence is tagged "citation needed". The filmography table lists MTV Wonder Girls (2006 to 2010) as their first reality show. | Introduced through MTV Wonder Girls; at the first showcase they covered Don't Cha plus originals such as Irony. | None needed. Optionally add a second source. |
| 11-29 | 3 (T) | OK | None. | Samples Stacey Q's Two of Hearts (1986); written and produced by Park Jin-young; six non-consecutive weeks at No. 1 on Music Bank. | None |
| 11-29 | 4 (F) | OK | None. The 2010 English version does not make a 2009 first release true. | So Hot released May 22, 2008; Nobody Sep 22, 2008. | Optional: "topped online charts soon after" is source wording; could read "quickly reached No. 1 on online charts". |
| 11-29 | 5 (F) | OK | None. The count is unambiguous. | First signed for 13 US dates, ended up on 45. The Jonas Brothers World Tour 2009 article agrees: they were later asked to open the entire tour. | None |
| 11-29 | 6 (F) | OK | None. No Japanese recording exists: the discography's Japanese compilation Wonder Best has only Korean and English versions of 2 Different Tears. | Recorded in Chinese, Korean and English; MV cameos by Park Jin-young and Bobby Lee. | None |
| 11-29 | 7 (T) | OK | None. | TeenNick movie premiered Feb 2, 2012, featuring the then-unreleased Like Money. | None |
| 11-29 | 8 (F) | FIX (minor) | Name spelling differs within the quiz: the fun fact says "Hyelim", while Q9's fun fact (and the Wonder Girls article) say "Hyerim". | Reboot: Sunmi bass, Yubin drums, Hyelim guitar, Yeeun piano; lead single I Feel You. The Wonder Girls article has Hyerim on guitar and Yeeun on keyboard. | FF: change "Hyelim" to "Hyerim". https://en.wikipedia.org/wiki/Reboot_(Wonder_Girls_album) |
| 11-29 | 9 (T) | OK | None. | Why So Lonely (Jul 5, 2016) is explicitly the first Wonder Girls single not written by Park Jin-young; written by Hyerim, Sunmi, Yubin and Hong Ji-sang; No. 1 on Gaon Digital. | None |
| 11-29 | 10 (T) | OK | None. | Final single Draw Me, Feb 10, 2017, for the 10th anniversary; disbandment announced Jan 26, 2017. | None |

Private life: the quiz correctly avoids Hyuna's health, Sohee's injury, Sunye's marriage and the contract talks behind the split.

## 2026-11-30 Red Velvet: From Happiness to Cosmic

| Date | Q# | Verdict | Problem | What the source says | Proposed correction (source) |
|---|---|---|---|---|---|
| 11-30 | 1 | OK | None. Be Natural came Oct 2014, Automatic 2015. | Debut single Happiness (Aug 2014), produced by Will Simms and Chad Hugo (The Neptunes); debut stage on Music Bank. | None |
| 11-30 | 2 | OK | None. Only the lineup fact is used; nothing personal. | Yeri officially joined Mar 11, 2015, just before the Ice Cream Cake EP (Mar 17); MV filmed at a ranch in Palmdale, California. | None |
| 11-30 | 3 | FIX (wording) | The stem ("smooth, R&B-flavored velvet side") and the fun fact ("bright and bold red side") echo the source's own phrasing ("smooth R&B-influenced velvet side", "bright and bold red persona"). The facts are fine. Russian Roulette is also a 2016 EP but a red-side release, so there is no second right answer. | The Velvet, Mar 17, 2016, lead single One of These Nights, follow-up to The Red. | Q: "Which 2016 EP put the spotlight on Red Velvet's softer, R&B-leaning velvet concept, after the album The Red?" FF: "Released on March 17, 2016 and led by One of These Nights, it answered The Red, which had shown the group's brighter red concept." https://en.wikipedia.org/wiki/Red_Velvet_(group) |
| 11-30 | 4 | OK | None. The other options are not from 2016. | Lead single of the third EP (Sep 7, 2016); cartoon-themed MV of pranks the members play on each other; used in Trolls World Tour (2020). | None |
| 11-30 | 5 | OK | None. | Sang Bad Boy and Red Flavor at Spring Is Coming in Pyongyang (Apr 1, 2018); first SM act there in 15 years, since Shinhwa. | None |
| 11-30 | 6 | OK | Optional: "pays homage to famous artworks" is close to the source wording. | Samples Bach's Air on the G String; the MV is made like an opera, nodding to The Swing, Ophelia and The Garden of Earthly Delights. | Optional: "...an opera-style video full of nods to paintings such as The Swing and Ophelia." |
| 11-30 | 7 | OK | None. 2017 is the only defensible answer. The Perfect Red Velvet (2018) is a reissue and The ReVe Festival: Finale (2019) is a compilation; Chill Kill is "third Korean, fourth overall", so the word "Korean" is needed and present. | First Korean studio album in six years after Perfect Velvet (2017); ten tracks, lead single of the same name. | None |
| 11-30 | 8 | OK | None. Velvet Summer is a real Red Velvet EP but from Aug 2026, so it is clearly wrong here. | Cosmic, Jun 24, 2024; an Aug 1, 2024 version added Sweet Dreams for the 10th anniversary. | None |
| 11-30 | 9 | OK | None. | Irene & Seulgi debuted Jul 6, 2020 with Monster; their SM Rookies cover of Be Natural prompted the unit; second EP Tilt on May 26, 2025. | None |
| 11-30 | 10 | OK | None. | First solo concert Red Room, Aug 18, 2017; third show added due to demand; Red Room in Tokyo, Mar 2018. | None |

## 2026-12-01 K-pop Groups That Debuted in 2025

All ten groups appear in the "Debuting groups" list of 2025 in South Korean music. Label, debut release and month agree between Wikipedia and Wikidata where Wikidata has the item (AtHeart's Wikidata item has no label; its label is confirmed by the Titan Content article instead). No question or fun fact names a member or says anything about a member as a person. The pages' private items (KickFlip's Amaru, IDID's former member, AtHeart's Aurora, AllDay Project members' backgrounds) are correctly left out.

| Date | Q# | Verdict | Problem | What the source says | Proposed correction (source) |
|---|---|---|---|---|---|
| 12-01 | 1 | OK | None. | SM Entertainment; debuted Feb 24, 2025 with the single album The Chase; "S2" is a heart emoticon; revealed by a surprise trailer at SM Town Live 2025 on Jan 12. Wikidata: SM, inception 2025-02-24. | None |
| 12-01 | 2 | OK | None. | Starship Entertainment; EP Uncut Gem, Mar 24, 2025; name plays on Korean "kiki" (giggling) and "key". Wikidata: Starship, inception 2025-03-24. | None |
| 12-01 | 3 | OK | None. Umm Great (pre-release, Jan 6) is not an option; Rendezvous (AHOF) and Chan-Ran (IDID) are valid wrong options. | Flip It, Kick It!, Jan 20, 2025, lead single Mama Said; Park Jin-young teased the group at the 2024 MAMA Awards in LA; name from the skateboard trick. Wikidata: JYP, 2025. | Optional: "first teased" could read "teased", since the members were picked on Loud in 2021. |
| 12-01 | 4 | OK | None. Go! (Aug 11) was a pre-debut single and is not an option; Fashion was Sep 2025, RedRed 2026, Pretty Please is Hearts2Hearts. | Debuted Aug 18, 2025 with What You Want, choreography on treadmills; BigHit Music's third group after BTS and TXT. Wikidata: Big Hit Music, 2025-08-18. | Optional: the second fun-fact sentence is the source's lead phrase word for word. |
| 12-01 | 5 | OK | None. | The Black Label; co-ed; single album Famous, Jun 23, 2025; name reportedly coined by will.i.am. Wikidata: The Black Label. | None |
| 12-01 | 6 | OK | None. Boys Planet featured some members earlier but did not form the group. | Formed through SBS's Universe League (Nov 2024 to Jan 2025); debuted Jul 1, 2025 with Who We Are; All-time Hall Of Famer; sounds like the Korean for nine. | None |
| 12-01 | 7 | OK | None. NouerA (KBS Make Mate 1) and AxMxP (FNC) are also 2025 debuts but not from Project 7. | JTBC Project 7; debuted Apr 2, 2025 with Eternalt; label Uncore (SLL and YG Plus); first music show win 6 days after debut. Wikidata: UNCORE, 2025-04-02. | None |
| 12-01 | 8 | OK | None. | Starship's Debut's Plan; debuted Sep 15, 2025 with I Did It.; lead single Chan-Ran; first Starship boy group in five years since Cravity. Wikidata: Starship. | None |
| 12-01 | 9 | FIX (wording) | The fun fact rebuilds the source's lead sentence nearly word for word ("operates as a record label, entertainment agency, and concert production company founded in 2018 ... Gangnam"). Also, the cited P Nation page never names Baby DONT Cry; the premise comes from the Baby Dont Cry page, which is already in `sources`. | Baby Dont Cry: P Nation, single album F Girl, Jun 23, 2025. P Nation: founded 2018 by Psy after leaving YG; co-hosted Loud with JYP. | FF: "Psy set up P Nation in 2018 after leaving YG Entertainment, and the label co-hosted the 2021 SBS show Loud with JYP, the show that formed KickFlip." https://en.wikipedia.org/wiki/P_Nation (Loud and SBS also at https://en.wikipedia.org/wiki/KickFlip) |
| 12-01 | 10 | OK | None. | Formed by the American agency Titan Content; EP Plot Twist, Aug 13, 2025; Titan co-founded Nov 28, 2023 by Nikki Semin-Han, former SM CEO. The Titan Content article agrees. | None |

## 2026-12-02 K-pop Winter and Christmas Songs

Each item is the named act's own release, and each is a winter or Christmas release per its source. One borderline case is Winter Flower (Jan 6, 2020): it is a winter release built on a winter image, not a holiday special. That fits "winter songs".

| Date | Q# | Verdict | Problem | What the source says | Proposed correction (source) |
|---|---|---|---|---|---|
| 12-02 | 1 | OK | None. | Merry & Happy: Christmas-inspired reissue of TWICE's Twicetagram, Dec 11, 2017; new songs Heart Shaker and Merry & Happy (written by Park Jin-young). | None |
| 12-02 | 2 | OK | Optional: the source calls the two songs dual lead singles, so "second lead single" could read as a later single. | Stray Kids holiday special single album, Nov 29, 2021, pronounced Christmas Evil; dual leads Christmas EveL and Winter Falls. | Optional FF: "...and Winter Falls was its other lead single." |
| 12-02 | 3 | OK | None. NCT 127's Be There for Me (Dec 2022) is a single, not Candy. | NCT Dream's fifth EP, Dec 16, 2022, special winter mini-album; six Christmas-themed tracks; title song first released by H.O.T. in 1996. The cited URL Candy_(EP) is this article. | None |
| 12-02 | 4 | OK | None. | Taeyeon's first winter EP, Dec 12, 2017, marketed as a Christmas album; three concerts, The Magic of Christmas Time, Dec 22 to 24, 2017. | None |
| 12-02 | 5 | OK | Borderline on theme only (see note above). | Younha feat. RM, Jan 6, 2020; RM co-wrote the lyrics; they worked remotely by phone and email. | None |
| 12-02 | 6 | OK | Optional: it actually missed the chart once (2015), so "year after year" is slightly loose. | IU feat. Thunder (MBLAQ), b-side of the EP Real (Dec 9, 2010); re-entered the Circle chart every December except 2015 (and 2012 only at No. 99 monthly). | Optional FF: "...it has returned to Korean charts almost every December since." |
| 12-02 | 7 | OK | None. | GOT7, Jan 20, 2025, title track Python; first reunion in three years, on the 11th anniversary; members wrote and composed all songs; the title recalls the Winter Hexagon. | None |
| 12-02 | 8 | OK | None. | BoA, Dec 1, 2004 (Meri Kuri in Japan, Merry-Chri in Korea); Christmas favorite in Japan; BoA wrote the Korean lyrics; Weezer covered it (Japanese deluxe of their 2008 album). | None |
| 12-02 | 9 | FIX | The stem gives the answer away: "the tenth winter album by SM Town. Which label released it?" contains SM in the stem, so no wrong option is plausible. The facts themselves are right. | Tenth SM Town winter album, released by SM Entertainment Dec 26, 2022; lead single Beautiful Christmas by Red Velvet and aespa; 58 label artists took part. | Q: "Red Velvet teamed up with which girl group on Beautiful Christmas, lead single of 2022 Winter SM Town: SMCU Palace?" Options: ["f(x)", "aespa", "S.E.S.", "Hearts2Hearts"], correct 1 (keeps the position pattern). FF: "The album was SM Town's tenth winter album, released on December 26, 2022, and 58 of the label's artists took part in it." https://en.wikipedia.org/wiki/2022_Winter_SM_Town:_SMCU_Palace |
| 12-02 | 10 | OK | None. Our Beloved Summer premiered Dec 6, 2021, so "the 2021 drama" is accurate. | V, OST of Our Beloved Summer, Dec 24, 2021, Most Contents. | None |

## Cross-lot observation (not a rule break)

All four multiple choice quizzes open with the same answer positions: Q1 = 1 and Q3 = 0 (ATEEZ 1,2,0..., Red Velvet 1,3,0..., 2025 1,2,0..., Winter 1,3,0...). Each quiz passes the per-quiz rules, but on consecutive days the "Q1 is always B" habit could become visible. Optionally reshuffle one or two quizzes.

## Totals

- Questions checked: 50 (5 quizzes x 10), plus 5 descriptions.
- OK: 45 questions (several carry optional wording notes).
- FIX: 5 questions plus 1 quiz description (ATEEZ Q8, ATEEZ Q10, Wonder Girls S8, Red Velvet Q3, 2025 debuts Q9, Winter Q9, ATEEZ description).
- DROP: 0.
- No factual error found: every marked answer matches its cited source and Wikidata/Billboard where checked. The fixes are wording (near-verbatim copying), one in-quiz name spelling, one stem that gives away its answer, and one description outdated by the series continuing in 2026.

### FIX / DROP list

1. 2026-11-28 ATEEZ description: "Golden Hour series of 2024 and 2025" is outdated (Part.4 to Part.6 came in 2026); change to "the first three parts of ATEEZ's Golden Hour series (2024 to 2025)".
2. 2026-11-28 ATEEZ Q8: the stem copies the Wikipedia lead sentence; reword to "ATEEZ played which US festival in April 2024, a first for any K-pop boy group?"
3. 2026-11-28 ATEEZ Q10: the fun fact copies the source sentence; reword (proposal in table).
4. 2026-11-29 Wonder Girls S8: the fun fact says "Hyelim", but S9 says "Hyerim"; use "Hyerim".
5. 2026-11-30 Red Velvet Q3: the stem and fun fact echo the source's phrasing ("smooth R&B-influenced velvet side", "bright and bold red"); reword (proposal in table).
6. 2026-12-01 2025 debuts Q9: the fun fact is a near-verbatim copy of P Nation's lead; replace with the Psy/YG/Loud fun fact (proposal in table).
7. 2026-12-02 Winter Q9: the stem names SM Town and asks for the label, which gives the answer away; replace with the Beautiful Christmas (Red Velvet + aespa) question (proposal in table).
