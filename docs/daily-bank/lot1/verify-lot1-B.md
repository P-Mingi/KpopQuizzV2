# Verify lot1-B (A8 second pass), 2026-10-15

Independent check of `lot1-B.json` (5 quizzes x 10 questions, 2026-10-25 to 2026-10-29).
Method: every cited `source` fetched (Wikipedia via raw wikitext, other sites via curl with a generic UA, local copies in `daily/vB/`),
each question answered from the source before looking at `correct`, wrong options checked, fun facts checked against
the same source and for currency as of 2026-10-15, and an automatic word-run scan for copied wording (runs of 12 or more
identical words flagged). Mechanical checks passed for all 5 quizzes: no em or en dashes, no banned words, titles at most 45 chars,
descriptions 126 to 146 chars, questions under 120 chars, fun facts under 220 chars, four distinct options, no lyrics, no
private-life content. No question depends on ENHYPEN's member count.

Severity: FIX (fact) = something is wrong or contradicted at a source. FIX (wording) = the fact holds but the wording is copied, ambiguous or a giveaway.

## 2026-10-25 Stray Kids: From 5-Star to KARMA

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 10-25 | 1 | OK | none | Yonhap: 5.13 million preorders, a K-pop record; first release in eight months, 12 tracks | none |
| 10-25 | 2 | OK | none | Lalalala: lead single of Rock-Star, first Hot 100 entry at No. 90; Korean title Rak = pleasure | none |
| 10-25 | 3 | OK | none | Chk Chk Boom MV features Ryan Reynolds and Hugh Jackman as Deadpool and Wolverine; I.N wanted Latin music in the group's colors; hip-hop and reggaeton | none |
| 10-25 | 4 | OK | none | Dominate began in Seoul on August 24, 2024, in support of Ate (plus Giant, Hop and others); JYP: global top artists who will dominate the stage | none |
| 10-25 | 5 | OK | none | Rogers Stadium, Toronto: first overall artist to play there; concert film filmed at SoFi, premiered February 6, 2026 | none |
| 10-25 | 6 | FIX (fact) | Answer is right, but the fun fact says Tablo guests on "it" right after naming Walkin on Water, so it reads as Tablo being on the lead single. He is on a different track, U | Hop: first SKZhop Hiptape record; lead single Walkin on Water; Tablo appears on the track U (track list note: featuring Tablo) | Fun fact: "Its lead single was Walkin on Water, and Canadian rapper Tablo is featured on another track, U." |
| 10-25 | 7 | OK | none | Ceremony: lead single of Karma (August 22, 2025); futuristic sport-themed MV with a Faker cameo | none |
| 10-25 | 8 | OK | Still true today: Stray Kids have since added Do It (2025) and This & That (2026), so they now have 9 No. 1s, still ahead of BTS | JoongAng Daily: Karma is their 7th Billboard 200 No. 1, putting them past BTS for most No. 1s by a K-pop act | none |
| 10-25 | 9 | OK | none | Social Path EP features LiSA; No. 1 on Oricon; RIAJ Million | none |
| 10-25 | 10 | FIX (fact + wording) | The fun fact is a 12-word copy of the article's lead. The 335,000 figure is also contradicted inside the same article: the body gives Billboard Japan Hot Albums 446,002 physical copies, so 335,000 cannot be the figure for both charts | Night and Falling Up are themes for Tower of God season 2 (answer correct). Lead: "topped both Oricon and Billboard Japan Hot Albums with 335,000 copies"; body: 446,002 on Hot Albums; RIAJ double platinum | Fun fact: "Giant reached No. 1 on both the Oricon Albums Chart and Billboard Japan Hot Albums and was certified double platinum in Japan." |

## 2026-10-26 SEVENTEEN: The Face the Sun Era

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 10-26 | 1 | OK | none | Hot is the lead single of Face the Sun; written by Woozi, Bumzu, August Rigo and others; Western guitar riffs | none |
| 10-26 | 2 | OK | none | Fourth studio album; first since An Ode (2019); released by Pledis through YG Plus | none |
| 10-26 | 3 | OK | none | JoongAng Daily: Darl+ing, first English-lyric song, released in April ahead of the album, No. 1 on iTunes in 34 countries, dedicated to international fans | none |
| 10-26 | 4 | FIX (wording) | "Passed which mark" makes 500,000 and 1 million technically right too, because 2 million passes both. The "new high" clause rescues it only for readers who know the previous high was 1.41 million (Attacca) | JoongAng Daily: over 2 million pre-orders (a group record per the 05-26 article); every album and EP since September 2019 sold over 1 million | "Roughly how many pre-orders did Face the Sun collect before release, a group record at the time?" Options: About 1 million / About 5 million / About 500,000 / Over 2 million (correct 3) |
| 10-26 | 5 | OK | none | Billboard: debut at No. 7, first top 10; 44,000 units, 42,000 from album sales | none |
| 10-26 | 6 | OK | none | JoongAng Daily: Be the Sun world tour opened with two Seoul shows on June 25 and 26, then 12 US and Canada cities | none |
| 10-26 | 7 | OK | none | JoongAng Daily: repackage Sector 17, released July 18, 2022; over 1.2 million pre-orders as of the Friday before | none |
| 10-26 | 8 | OK | Wrong options are all new songs on Sector 17, but the source names _World as the lead track, so there is only one answer | _World is the lead track; the underscore stands for the open ways SEVENTEEN and fans can read the world | none |
| 10-26 | 9 | FIX (wording) | Answer right. The fun fact reuses Hoshi's quoted words ("shedding ... former image and becoming more mature") without quotation marks | Inner Shadows: 13-part YouTube trailer from April 26; Hoshi quote as above | Fun fact: "Hoshi said the album showed the group leaving its old image behind and growing up." |
| 10-26 | 10 | OK | Only Music Bank is on KBS (Inkigayo is SBS, Music Core is MBC, The Show is SBS M) | Wins on M Countdown (June 2) and Music Bank (June 3); nominated for Best K-Pop at the VMAs | none |

## 2026-10-27 K-pop Hits and Their Albums

Quiz-level note: the correct positions follow a strict cycle, 0,1,2,3,0,1,2,3,0,1, which players can spot. Shuffle them.

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 10-27 | 1 | FIX (wording) | Answer right. The fun fact is a 15-word near-copy of the article's lead | Baddie: single from I've Mine (October 13, 2023); No. 1 on Circle Digital for three weeks, IVE's fifth No. 1 there | Fun fact: "It spent three weeks at No. 1 on the Circle Digital Chart, giving IVE a fifth chart-topper there." |
| 10-27 | 2 | FIX (wording) | Answer right. The fun fact follows the source's sentence clause for clause. (Pink Venom was a pre-release and Shut Down the title track, but Wikipedia calls Pink Venom the lead single, and the album answer is the same either way) | Lead single of Born Pink; two weeks atop the Global 200, the first girl group to reach No. 1 there | Fun fact: "It held No. 1 on the Billboard Global 200 for two weeks; no girl group had led that chart before." |
| 10-27 | 3 | OK | none | Lead single of Between 1&2 (August 26, 2022); composed by Collapsedone and Like (MRCH), written by Danke; retro, newtro | none |
| 10-27 | 4 | OK | The infobox also lists the Japanese album Pink Season, but it is not an option | Lead single of the 4th mini album Pink Blossom; composed by Duble Sidekick; six music show trophies | none |
| 10-27 | 5 | OK | The album had two title tracks (Supernova and Armageddon), but all options are albums, so the answer is unique | Lead single of Armageddon; first Circle Digital No. 1; 11 non-consecutive weeks | none |
| 10-27 | 6 | OK | none | Lead single of the fourth studio album The War; Korean and Chinese versions | none |
| 10-27 | 7 | OK | none | Lead single of the special EP The Red Summer, July 9, 2017; written by Kenzie; fruit-infused MV; dance-pop | none |
| 10-27 | 8 | OK | none | Lead single of It'z Me; written and produced by Galactika, who also made Dalla Dalla | none |
| 10-27 | 9 | OK | The article's lead calls Alive the fourth EP and its body the fifth; the question avoids the number | Released February 29, 2012 together with the EP Alive; written by T.O.P, G-Dragon and Teddy | none |
| 10-27 | 10 | OK | none | Lead single of the second studio album Neo Zone; Korean title means Hero; martial arts MV | none |

## 2026-10-28 K-pop Hitmakers and Their Groups

Quiz-level notes: (a) the correct positions cycle again, 1,2,3,0,1,2,3,0,1,2, so shuffle them. (b) The bank already has "K-pop Music Production". The lead should confirm the topic is distinct enough.

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 10-28 | 1 | OK | Note: the duo split in March 2025 (source). The question's past tense is fine | Wrote Like Ooh-Ahh, Cheer Up, TT for TWICE; launched High Up Entertainment; debuted STAYC in November 2020 | none |
| 10-28 | 2 | OK | none | In 2010, with Sleepy's help, Pdogg found a young RM and brought him to Big Hit; became BTS's main producer; KOMCA daesang in February 2019 for top earner of 2018 | none |
| 10-28 | 3 | FIX (wording) | Giveaway: LDN Noise is literally pronounced "London Noise" (per the source), so a medium question becomes trivial | British duo based in London; best known for SM acts (f(x), EXO, Red Velvet, NCT); co-wrote Chris Brown's 2012 UK No. 1 Turn Up the Music; "hidden heroes" (Korea Times) | Q: "London duo LDN Noise is best known in K-pop for tracks for groups from which agency?" Options: JYP Entertainment / YG Entertainment / HYBE / SM Entertainment (correct 3). Fun fact: "Before K-pop, Greg Bonnick and Hayden Chapman co-wrote Chris Brown's 2012 UK No. 1 Turn Up the Music." |
| 10-28 | 4 | OK | Weak but correct: "debut song" alone gives the answer to any Girls' Generation fan. Confirmed by the Into the New World article (composer Kenzie) | Kenzie's favourite works include Into the New World; Berklee 1999, music production and engineering | Optional: drop "debut" and ask which song she composed, with non-debut decoys |
| 10-28 | 5 | FIX (wording) | "Veteran SM producer" in the present tense is outdated: the source says he is formerly of SM and left in March 2023 after 28 years. H.O.T. is the only right option (Shinhwa is also on his list but not an option) | Produced and wrote for H.O.T. (from their first album in 1996), S.E.S., BoA, Shinhwa, TVXQ ... aespa | "Longtime SM producer Yoo Young-jin, who left the label in 2023, wrote songs for which first-generation boy band?" |
| 10-28 | 6 | OK | none | Founders Han Jae-ho and Kim Seung-soo; Kara's Lupin and Step; also Rainbow, Infinite, Nine Muses; 1980s-style synth-pop | none |
| 10-28 | 7 | OK | Duble Sidekick also wrote Game Over for 2PM (2013), but 100% Ver. is MBLAQ's, so only one answer | Rose to fame producing MBLAQ's 2012 EP 100% Ver.; lyricist Park Jang-geun and composer Mikey, formerly of One Way | none |
| 10-28 | 8 | OK | Minor: "slightly earlier" is not in the source, but it is harmless (April vs July 2010) | First released song Chitty Chitty Bang Bang (Lee Hyori, H-Logic, 2010); first hands-on song Lucifer for SHINee | none |
| 10-28 | 9 | FIX (fact + wording) | Answer right (1TYM, 1998). The fun fact's "co-founded The Black Label in 2016" follows the Teddy Park article's sentence almost word for word, and the year is contradicted by the The Black Label article: founded 2015, announced September 22, 2015 | Teddy Park: after 1TYM's January 2006 hiatus he became an in-house YG producer and co-founded The Black Label in 2016; also won an Academy Award for the KPop Demon Hunters soundtrack (Golden) | Fun fact: "He later co-founded The Black Label, and his work on the KPop Demon Hunters soundtrack won him an Academy Award." (no year) |
| 10-28 | 10 | OK | none | October 2009: Park and Rainstone, first Korean songwriters on the Hot 100, with Wonder Girls' Nobody at No. 76 | none |

## 2026-10-29 ENHYPEN: Sweet Venom to The Sin Quiz

Quiz-level note: the bank already has "ENHYPEN: The DARK BLOOD Era", and Q2 here has Dark Blood as its answer. The overlap is small but should be on the lead's duplicate radar.

| Date | Q# | Verdict | Problem | What the source says | Proposed correction |
|---|---|---|---|---|---|
| 10-29 | 1 | FIX (wording) | Answer right. The fun fact is a 15-word near-copy of the source sentence | Orange Blood (November 17, 2023), title track Sweet Venom; Hanteo: over 1.38 million on day one | Fun fact: "Hanteo counted more than 1.38 million copies of Orange Blood sold on release day alone." |
| 10-29 | 2 | FIX (wording) | Answer right (Dark Blood). The question itself copies 13 words of the source ("teased as the continuation of a blood-themed story that..."). The fun fact also reuses "a sunset that turns orange" | Teased as the continuation of the blood story begun on Dark Blood (May 22, 2023); 25-second logo trailer with solar eclipses and an orange sunset | Q: "Orange Blood picked up the blood storyline ENHYPEN began earlier in 2023 on which EP?" Fun fact: "Its 25-second logo trailer featured solar eclipses and a sky fading to orange." |
| 10-29 | 3 | OK | none | Romance: Untold (July 12, 2024), lead single XO (Only If You Say Yes); short film with director Lee Chung-hyun | none |
| 10-29 | 4 | OK | Daydream is a new track on the reissue but not its lead | Reissue -Daydream- on November 11, 2024 adds Daydream and No Doubt; No Doubt is the lead single | none |
| 10-29 | 5 | FIX (wording) | The cited source does not call Bad Desire the lead single: it lists Loose (April 4) and Bad Desire as singles and calls Bad Desire the "second single". The Enhypen article calls it the lead single. Lead single vs pre-release trap; the album answer is unique either way | Desire: Unleash (June 5, 2025): singles Loose and Bad Desire; pre-orders over 2.18 million, third double-million seller | Q: "Bad Desire (With or Without You), released in June 2025, is a single from which ENHYPEN EP?" (or keep "lead single" and switch the source to https://en.wikipedia.org/wiki/Enhypen) |
| 10-29 | 6 | OK | none | Loose released April 4, 2025; performed on Jimmy Kimmel Live! April 10, their first US TV performance | none |
| 10-29 | 7 | OK | none | Coachella 2025 Sahara Tent, April 12 and 19; next EP title and date announced at the end of the week-two set | none |
| 10-29 | 8 | OK | none | The Sin: Vanish (January 16, 2026), lead single Knife, first of The Sin series; fictional news site Vampire Now | none |
| 10-29 | 9 | OK | No member-count dependency (the source mentions the line-up change, but neither the question nor the fun fact does) | The Sin: Bliss (August 21, 2026), lead single Bloody Paradise; Brazilian funk preview first played at their Brazil concert on the Blood Saga Tour (July 4) | none |
| 10-29 | 10 | OK | none | JoongAng Daily (August 31, 2026): The Sin: Bliss is their first Billboard 200 No. 1; 98,000 units, 92,000 from album sales | none |

## Totals

- Questions checked: 50
- OK: 38
- FIX: 12 (3 fact-level, 9 wording-level)
- DROP: 0
- No marked answer is wrong. No question has a second right answer once 10-26 Q4 is reworded.

## FIX / DROP list

1. 10-25 Q6 FIX (fact): the fun fact reads as if Tablo guests on Walkin on Water; he is on the track U.
2. 10-25 Q10 FIX (fact + wording): the fun fact copies the lead word for word, and the 335,000 figure for "both charts" is contradicted by the article's own body (Billboard Japan: 446,002). Drop the number.
3. 10-26 Q4 FIX (wording): "passed which mark" makes 500,000 and 1 million also true. Reword as "roughly how many".
4. 10-26 Q9 FIX (wording): the fun fact reuses Hoshi's quoted words without quotation marks.
5. 10-27 Q1 FIX (wording): the fun fact copies 15 words of the Baddie article.
6. 10-27 Q2 FIX (wording): the fun fact copies the Pink Venom sentence clause for clause.
7. 10-28 Q3 FIX (wording): giveaway, since LDN Noise is pronounced "London Noise". Replace with the agency question.
8. 10-28 Q5 FIX (wording): "Veteran SM producer" is outdated; Yoo Young-jin left SM in March 2023.
9. 10-28 Q9 FIX (fact + wording): "Black Label in 2016" conflicts with The Black Label article (founded 2015), and the sentence is copied. Drop the year.
10. 10-29 Q1 FIX (wording): the fun fact copies 15 words of the Orange Blood article.
11. 10-29 Q2 FIX (wording): the question stem copies 13 words of the Orange Blood article.
12. 10-29 Q5 FIX (wording): the cited source calls Bad Desire the "second single", not the lead single. Reword, or cite the Enhypen article.

Quiz-level (not counted above): shuffle the correct positions in 10-27 and 10-28, which cycle 0-1-2-3. The lead should confirm that 10-28 is distinct from the bank's "K-pop Music Production" and that 10-29 Q2 is distinct from "ENHYPEN: The DARK BLOOD Era".
