# Verify lot1-A (A8 second pass, independent checker, 2026-10-15)

Input: `lot1-A.json` (5 quizzes x 10 questions, 2026-10-20 to 2026-10-24). Not edited.
Method: every cited source was fetched fresh (Wikipedia via `action=raw`, the Belift Lab profile, Billboard via curl with a generic UA, plus the supplementary JoongAng Daily, NME and Billboard Hot 100 pages). I answered each question from its source before looking at `correct`, then checked distractors, fun facts, the content rules and copying. My own copies are in `daily/vA/`.

Format lint (all 5 quizzes): titles 26 to 39 chars, descriptions 107 to 126 chars, no em or en dashes, no banned words, no quotation marks in questions or fun facts, 4 distinct options, answers spread across positions 0 to 3, T/F has 5 false. Every question source is on an allowed domain.

Verdicts: **OK** = correct and unambiguous at the source. **FIX** = keep the question but change it. **DROP** = remove.

## 2026-10-20 ILLIT: Magnetic Debut Quiz

| Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|
| 10-20 | 1 | OK | Style only: "R U Next?." gives a double punctuation mark. | Illit wiki: formed through the 2023 JTBC survival show R U Next?. It ran 10 episodes, June 30 to Sept 1 2023, with 22 contestants. | Optional: "Which TV channel aired R U Next?, the 2023 show that formed ILLIT?" |
| 10-20 | 2 | OK | None. | Belift Lab wiki: the label manages Enhypen, Illit and Evan, and co-produced I-Land (2020), which formed Enhypen. | None. |
| 10-20 | 3 | OK | None. | Illit wiki: Hybe chairman Bang Si-hyuk took part as producer of the debut EP, released March 25, 2024. | None. |
| 10-20 | 4 | OK | None. Distractors are later releases (I'll Like You, Bomb, Not Cute Anymore). | Super Real Me wiki: debut EP. It sold 380,000+ copies in week one and passed 500,000 by end of April. | None. |
| 10-20 | 5 | OK | Minor: the FF lists the tracks out of order (My World is track 1). It does not claim an order. | Illit wiki: the Lucky Girl Syndrome MV came out April 17. The EP has four tracks: Magnetic, My World, Midnight Fiction, Lucky Girl Syndrome. | Optional: list them in track order (My World, Magnetic, Midnight Fiction, Lucky Girl Syndrome). |
| 10-20 | 6 | OK | None. | Billboard (6/28/2024): Magnetic entered the Hot 100 at No. 91, a first for a K-pop group's debut song. ILLIT was Billboard's first-ever K-Pop Rookie of the Month (June 2024). | None. |
| 10-20 | 7 | OK | None. | Illit wiki: on Feb 28, 2024 they made their first public appearance as a group at the Acne Studios show at Paris Fashion Week. They became the faces of the SS24 campaign in March 2024. | None. |
| 10-20 | 8 | OK | None. Only stage names are used; no birth dates (note that the cited official page itself shows them). | Belift Lab profile: members YUNAH, MINJU, MOKA, WONHEE, IROHA. | None. |
| 10-20 | 9 | OK | None. | Belift Lab profile: the name joins "I will" (independent spirit, adventurous will) with "It" (something unique). | None. |
| 10-20 | 10 | OK | None. Tick-Tack (not an option) was a later MV track, not the lead. | I'll Like You wiki: Cherish (My Love) was the lead single, Oct 21, 2024. Baby It's Both, the English version of Tick-Tack, featured Ava Max (Nov 22, 2024). | None. |

## 2026-10-21 K-pop at Big Sporting Events

| Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|
| 10-21 | 1 | OK | None. | Dreamers wiki: Jung Kook with Fahad Al Kubaisi, part of the Qatar 2022 official soundtrack, performed at the opening ceremony. | None. |
| 10-21 | 2 | OK | None. | 2018 Winter Olympics closing ceremony: CL, leader of 2NE1, performed The Baddest Female and I Am the Best. EXO performed Growl and Power. Martin Garrix headlined the afterparty. | None. |
| 10-21 | 3 | OK | None. | 2023 LoL Worlds wiki: Gods by NewJeans was the theme song. T1 won (3 to 0 over Weibo Gaming). | None. |
| 10-21 | 4 | **FIX** | **Possible second right answer.** VIXX is an option, and VIXX member Leo also carried the flame in Seoul that same weekend. Korea JoongAng Daily (Jan 2018, "Olympic torch spent weekend in capital city") names Leo of VIXX among the Seoul torchbearers. The VIXX wiki also says member N was picked as a 2018 torchbearer. | Monsta X wiki: on Jan 13, 2018 the group carried the torch as torchbearers in Seoul, then released its third Japanese single on Jan 31. | Replace VIXX with ATEEZ. ATEEZ debuted Oct 24, 2018 (Ateez wiki), after the relay, so it cannot be a second answer. Optional: also swap ASTRO and SF9 for groups that debuted after Jan 2018. I found no evidence that their members carried the torch, but that cannot be proved. You could also tighten the question: "Which boy group ran a Seoul leg of the PyeongChang 2018 torch relay together on January 13, 2018?" |
| 10-21 | 5 | OK | Framing note: Koreana (1988) predates K-pop, while the description says "K-pop stars". | Hand in Hand wiki: Koreana sang the official 1988 Seoul Olympics theme. Giorgio Moroder composed and produced it, and Tom Whitlock wrote the English lyrics. | Optional: in the description, say "Korean stars" or "from Koreana to NewJeans". |
| 10-21 | 6 | OK | None. | 2018 Asian Games closing ceremony: Super Junior and iKON performed, along with Indian singer Sidharth Slathia and Indonesian artists. | None. |
| 10-21 | 7 | OK | None. | 2014 Asian Games opening ceremony: JYJ performed a medley of Only One (the official theme song), Flame and Empty during the torch relay section. | None. |
| 10-21 | 8 | OK | None. | Same page: the ceremony ended with Psy performing a remake of Champion with pianist Lang Lang, then Gangnam Style. | None. |
| 10-21 | 9 | OK | None. Suga, RM and J-Hope were not torchbearers. | Jin wiki: he was a torchbearer for the South Korean delegation at Paris 2024. Run Jin first aired Aug 13, 2024. | None. |
| 10-21 | 10 | OK | None. Kai (also SuperM) is a fair distractor but is not named. | 2023 LoL Worlds wiki: Heartsteel's human counterparts were Baekhyun (EXO, SuperM), ØZI, Tobi Lou and Cal Scruby. | None. |

Quiz-level note: the description says "K-pop stars who performed", but Q4 and Q9 are about torchbearers. Suggest "performed or carried the torch".

## 2026-10-22 BTS: The Dynamite to Proof Era

| Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|
| 10-22 | 1 | OK | Light overlap: the FF clause "the band's first song fully recorded in English" is word for word from the source (a factual phrase, acceptable). | Dynamite wiki: it made BTS the first all-South Korean act to top the Hot 100, and it sold 265,000 downloads in week one. BTS had already topped the Billboard 200, Oricon and Circle charts before. | Optional: "the first BTS song recorded entirely in English". |
| 10-22 | 2 | OK | None. | Dynamite wiki: first Grammy nomination, Best Pop Duo/Group Performance at the 63rd Grammys. First Korean pop act nominated. | None. |
| 10-22 | 3 | OK | None. Dynamite (on BE as a prior standalone single) is not an option. | Life Goes On wiki: lead single of BE, Nov 20, 2020. First primarily Korean-language song to debut at No. 1 on the Hot 100. | None. |
| 10-22 | 4 | OK | None. | Life Goes On and BE wikis: Jungkook directed the MV. Jimin handled A&R, and V and RM supervised graphics and design. | None. |
| 10-22 | 5 | OK | None. | Butter wiki: ten non-consecutive weeks atop the Hot 100. 108.2M YouTube views in 24 hours. Four Guinness World Records. | None. |
| 10-22 | 6 | OK | None. | Permission to Dance wiki: written by Ed Sheeran, Johnny McDaid, Steve Mac and Jenna Andrews. The MV choreography uses sign language. Performed at the 76th UN General Assembly. | None. |
| 10-22 | 7 | **FIX** | The fact is correct, but the fun-fact clause is near-verbatim: 12 consecutive words copied ("the first track by two co-billed lead groups to top the..."). | My Universe wiki: debuted at No. 1. BTS's sixth US chart-topper. First track by two co-billed lead groups to top the Hot 100. | Reword: "It was the first Hot 100 No. 1 credited to two lead groups, and BTS's sixth US chart-topper." |
| 10-22 | 8 | OK | None. | Yet to Come wiki: lead single of the anthology Proof. First original Korean single since Life Goes On. Co-written by RM, Suga and J-Hope (with Pdogg, Max, Dan Gleyzer). | None. |
| 10-22 | 9 | **FIX** | The fact is correct, but the fun-fact sentence copies the source's opening sentence ("The 12-show run began in Seoul ... on October 24, 2021"). | PTD on Stage wiki: 12 shows, Oct 24, 2021 to Apr 16, 2022, ending in Las Vegas. Four shows at Allegiant Stadium. The Oct 24 Seoul show was online only. | Reword: "The series opened with an online-only show at Seoul Olympic Stadium on October 24, 2021, and closed with four nights at Allegiant Stadium." |
| 10-22 | 10 | OK | None. | BTS wiki: an Oct 15 benefit concert in Busan, under the banner Yet to Come, supported the city's 2030 World Expo bid. The concert film BTS Yet to Come in Busan confirms it took place. | None. |

## 2026-10-23 K-pop Weather and Season Songs

| Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|
| 10-23 | 1 | OK | Season word: spring. | Spring Day wiki: BTS, Feb 13, 2017. Lead single of You Never Walk Alone, the Wings repackage. Writers include RM and Suga. | None. |
| 10-23 | 2 | **FIX** | (a) **Theme break:** the answer title Miracles in December names a month, not a weather or season word. Only the source's "special winter album" label links it to the theme. (b) The question copies the source phrase "presented as a special winter album". (c) The FF says "every EXO release until 2017", but the source says "until the Universe EP in 2017" (The War, also from 2017, still had a Chinese version). | Miracles in December wiki: EXO's 2nd EP (Dec 9, 2013), presented as a special winter album. It has Korean and Chinese versions, like all their music until Universe (2017). Track 5 is The First Snow. | Replace with: "Which track on EXO's December 2013 winter EP Miracles in December is named after a snowfall?" Options: The First Snow (correct), Christmas Day, The Star, My Turn to Cry (all tracks on the EP, same source). FF: "The EP came out in Korean and Chinese versions, as all EXO music did until the Universe EP in 2017." Then update the description, which cites Miracles in December. |
| 10-23 | 3 | OK | Season words: the Korean title 봄여름가을겨울 means Spring Summer Fall Winter. | Still Life wiki: BIGBANG, Apr 5, 2022. First release in four years, after Flower Road (2018). | None. |
| 10-23 | 4 | OK | Weather word: thunder (in the English title). The Korean title Sori-kkun means a pansori singer, as the FF says. | Thunderous wiki: lead single of Noeasy, Aug 23, 2021. Hip hop and trap with Korean traditional music (gugak). | None. |
| 10-23 | 5 | OK | Season word: summer. | Hot Summer wiki: first recorded by Monrose (released June 2007). The f(x) version came out June 14, 2011. | None. |
| 10-23 | 6 | OK | Season word: summer. The Red Summer is a fair distractor (2017, led by Red Flavor). | Summer Magic wiki: Aug 6, 2018, lead single Power Up. Bonus English version of Bad Boy, their first English release. | None. |
| 10-23 | 7 | OK | Season word: summer. | Summer Nights wiki: expanded reissue of What Is Love?, July 9, 2018, lead single Dance the Night Away. The MV was filmed in Japan. | None. |
| 10-23 | 8 | OK | Weather and season words: sunny, summer (Korean 여름여름해). | Sunny Summer wiki: GFriend title track of their 7th EP of the same name, Source Music, July 19, 2018. | None. |
| 10-23 | 9 | OK | Borderline theme: Wind Flower is the name of a flower (anemone), but it does contain the weather word "wind". The source makes no weather or season claim. | Wind Flower wiki: MAMAMOO, Nov 29, 2018, lead single of Blue;s. Lyrics by Moonbyul (with Kim Do-hoon and Park Woo-sang). Peaked No. 9 on the Gaon Digital Chart. | Keep. If you want a strict theme, swap it for a clearer weather title. |
| 10-23 | 10 | OK | Season and weather words: spring, breeze. | 1¹¹=1 (Power of Destiny) wiki: Wanna One's only studio album and final release, Nov 19, 2018, lead single Spring Breeze. The group disbanded in Jan 2019. | None. |

## 2026-10-24 K-pop First Studio Albums True or False

| Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|
| 10-24 | 1 | OK (false) | None. | Girls' Generation (2007 album) wiki: debut studio album, SM, Nov 1, 2007. The Boys is not the first. | None. |
| 10-24 | 2 | OK (true) | None. A good trap: the album's full title is "Big Bang Vol. 1: Since 2007", yet it came out in 2006. | Big Bang Vol.1 wiki: debut studio album, Dec 22, 2006, YG. Over 110,000 copies sold. | None. |
| 10-24 | 3 | OK (true) | None. | The Shinee World wiki: first studio album, Aug 28, 2008. Lead single Love Like Oxygen, a remake of Martin Hoberg Hedegaard's Show the World. | None. |
| 10-24 | 4 | OK (false) | None. "Final" still holds per the source after the 2024 reunion. | Crush wiki: the second and final studio album (Feb 27, 2014). The first was To Anyone (2010). | None. |
| 10-24 | 5 | OK (true) | None. | XOXO wiki: debut studio album, June 3, 2013. Won Album of the Year at the 2013 MAMA. | None. |
| 10-24 | 6 | OK (false) | None. | Dark & Wild wiki: debut studio album, Aug 20, 2014, lead single Danger. (Wings is the second Korean studio album.) | None. |
| 10-24 | 7 | OK (true) | None. | Melting wiki: debut studio album, Feb 26, 2016. First music show win on Inkigayo (Mar 6) for You're the Best. | None. |
| 10-24 | 8 | OK (false) | None. | Super Junior wiki: debut album Twins released Nov 28, 2005. Sorry, Sorry was the third studio album (Mar 12, 2009). | None. |
| 10-24 | 9 | OK (false) | None. | Go Live wiki: debut studio album, June 17, 2020, lead single God's Menu (5-Star is the 3rd studio album, 2023). | None. |
| 10-24 | 10 | **FIX** | The fact is correct, but the group name is out of date. Cube rebranded the group as i-dle on May 2, 2025, and the cited page is now titled I-dle. The quiz description also says (G)I-DLE. | I-dle wiki: formerly (G)I-dle. First studio album I Never Die (2022). Its lead single Tomboy hit No. 1 on the Circle Digital Chart. | Statement: "i-dle's first studio album, released when the group was still called (G)I-DLE, was I Never Die." Or keep "(G)I-DLE" and add "now i-dle". Update the description the same way. |

## Totals

- Questions checked: 50
- **OK: 45**
- **FIX: 5**
- **DROP: 0**
- Wrong answer keys: 0. Every marked answer matches its source.

### FIX list
1. 10-21 Q4 (Monsta X torch relay): VIXX is a possible second right answer, because VIXX's Leo carried the flame in Seoul that weekend (Korea JoongAng Daily, Jan 2018). Replace VIXX with ATEEZ (debuted Oct 2018).
2. 10-22 Q7 (My Universe): the fun fact copies 12 words of the source. Reword.
3. 10-22 Q9 (PTD on Stage): the fun fact mirrors the source's opening sentence. Reword.
4. 10-23 Q2 (Miracles in December): the title is a month, not a weather or season word. The question also copies a source phrase, and the FF's "until 2017" is imprecise. Rewrite as a The First Snow question and update the description.
5. 10-24 Q10 ((G)I-DLE): the group has been named i-dle since May 2, 2025. Update the statement and the description.

### Notes (no change required)
- 10-21: the description says "performed", but Q4 and Q9 are torchbearer questions. Koreana (Q5) predates K-pop.
- 10-23 Q9: Wind Flower is a borderline theme fit (a flower name containing "wind").
- 10-20 Q1: double punctuation after "R U Next?". 10-20 Q5: FF track order.
- No content-rule breaks: no private life, health, legal or dating content, no minors' personal data, no lyrics, no generation numbers, no unsourced superlatives. The cited Illit and Belift pages mention a member's 2026 health hiatus and legal disputes. The quiz rightly leaves these out.
