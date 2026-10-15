# Verify lot1, final pass (A8), 2026-10-15

Scope: the 49 items changed after the earlier checks (list from the lead), matched by date and content in the current `lot1-A.json` to `lot1-D.json`. The lot files, the repo, git and the database were not touched.

Method: I opened every cited `source` fresh. Wikipedia came through `action=raw` (current revisions, Jul to Oct 2026). JoongAng Daily, Korea Times, Korea Herald and Billboard came through curl with a generic browser User-Agent. Local copies are in `daily/final/`. I answered each question from its source before looking at `correct`, then checked every wrong option and the fun fact (sourced, still true, not copied). I also ran a script that finds the longest run of words copied from the source (`daily/final/overlap.py`).

Mechanical lint of all in-scope quizzes is clean: no U+2014 or U+2013, no banned words, no quotation marks in questions, questions under 120 characters, fun facts under 220, four distinct options, every source on an allowed domain and listed in `sources`.

**Wrong answer keys: 0.** Every marked answer is right at its source, and no item has a second right answer.

Verdicts: OK = keep as is. FIX = keep the question, apply the change. DROP = remove (none).

## lot1-A

| File | Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|---|
| lot1-A | 2026-10-20 | 1 | OK | none | Illit: formed through the 2023 JTBC survival show R U Next?, which ran ten episodes (June 30 to Sept 1, 2023) with 22 contestants. | none |
| lot1-A | 2026-10-20 | 5 | OK | none. Cherish (My Love), Do the Dance and Almond Chocolate are later releases. | Super Real Me: Lucky Girl Syndrome MV released April 17, 2024. Track list in order: My World, Magnetic, Midnight Fiction, Lucky Girl Syndrome. | none |
| lot1-A | 2026-10-21 | 4 | **FIX** (wording) | The new options are safe: TXT (2019), ENHYPEN (2020) and ATEEZ (Oct 2018) all debuted after the relay. But the fun fact copies the source sentence: the same 8-word run plus "their first original Japanese track", only reordered. | Monsta X: torchbearers in Seoul on Jan 13, 2018. On Jan 31 they released their third Japanese single, which included their first original Japanese track, Spotlight. | FF: "Their third Japanese single followed on January 31 and featured Spotlight, the first original song they recorded in Japanese." |
| lot1-A | 2026-10-22 | 7 | OK | none. The reworded fun fact is no longer copied. | My Universe: Coldplay and BTS. Debuted at No. 1 on the Hot 100, BTS's sixth US chart-topper, and the first track by two co-billed lead groups to top it. | none |
| lot1-A | 2026-10-22 | 9 | OK | none. (Allegiant is technically in Paradise, NV, but the source says Las Vegas, and Paradise is not an option.) | PTD on Stage: the 12-show run ended in Las Vegas on April 16, 2022. Four shows to 200,000 at Allegiant Stadium set Billboard's all-time box office record for Las Vegas. | none |
| lot1-A | 2026-10-23 | 2 | **FIX** (wording) | The question is fine (snow fits the theme, and the three other options are tracks from the same EP). The fun fact is the source sentence with a few words swapped ("Like all ... music until ... Universe ..., the EP ... Korean and Chinese versions"). It also repeats an overbroad source claim: EXO's Japanese releases had no Chinese versions. | Miracles in December: track 5 is The First Snow. The page says that, like all EXO music until Universe (2017), the EP has Korean and Chinese versions. It also says The First Snow became a seasonal favorite played after the first snowfall, and reached No. 1 on the Circle Digital Chart in 2023, ten years after release. | FF: "It became a Korean favorite for the first snowfall of the year, and in 2023, a decade on, it climbed to No. 1 on the Circle Digital Chart." |
| lot1-A | 2026-10-23 | 3 | OK | none. Lies (Korean title: lie), Haru Haru and Fantastic Baby are not season titles. | Still Life: Korean title means Spring Summer Fall Winter. Released April 5, 2022, the first release in four years after Flower Road (2018). | none |
| lot1-A | 2026-10-23 | 7 | OK | none. Page Two (2016 EP), Twicetagram (2017) and Fancy You (2019) are clearly wrong. | Summer Nights: expanded reissue of What Is Love?, released July 9, 2018. Lead single Dance the Night Away, MV filmed in Japan. | none |
| lot1-A | 2026-10-23 | 9 | OK | none | Rain (Taeyeon): released Feb 3, 2016 by SM. Rain and its B-side Secret opened SM Station, a weekly release project. | none |
| lot1-A | 2026-10-24 | 10 | OK (True) | none | I-dle (formerly (G)I-dle): first studio album I Never Die (2022), led by Tomboy, a Circle Digital No. 1. | none |

## lot1-B

| File | Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|---|
| lot1-B | 2026-10-25 | 6 | OK | none. SKZ It Tape is a real but later series, and SKZ-Player and SKZ-Replay are not record series that Hop launched. | Hop: marketed as the first SKZhop Hiptape record. Lead single Walkin on Water. Tablo is featured on the track U. | none |
| lot1-B | 2026-10-25 | 10 | OK | none. The contradictory 335,000 figure is gone. | Giant: Night and Falling Up are themes for Tower of God season 2. The album topped Oricon and Billboard Japan Hot Albums and went double platinum (RIAJ). | none |
| lot1-B | 2026-10-26 | 4 | **FIX** (sourcing) | The answer is right, but (a) the cited JoongAng article never says the 2 million was a group record, so "a group record at the time" comes from elsewhere. (b) The fun fact credits Pledis with a line the reporter wrote, and it closely copies that line. (c) "Over 2 million" is the only option not worded "About", so it stands out. | JoongAng (Shin Min-hee, May 20, 2022): over 2 million pre-orders, per Pledis. The reporter adds that every album and EP since Sept 2019 sold 1M+. The Face the Sun Wikipedia page: 1.74M pre-orders in a week beat the previous high of 1.41M (Attacca), and 2 million was reported on May 20. | Source: https://en.wikipedia.org/wiki/Face_the_Sun (already in `sources`). Options: About 1 million / About 5 million / About 500,000 / About 2 million (correct 3). FF: "It beat the group's previous pre-order best of 1.41 million, set by their EP Attacca." |
| lot1-B | 2026-10-26 | 9 | OK | none. Going Seventeen is a variety series, not a trailer series. | Face the Sun: Inner Shadows, a 13-part YouTube trailer from April 26. Hoshi said the album meant shedding their former image and becoming more mature. | none |
| lot1-B | 2026-10-27 | 1 | OK | none. Love Dive, I've IVE and After Like are other IVE releases. | Baddie: single from I've Mine (Oct 13, 2023). Three weeks at No. 1 on Circle Digital, IVE's fifth No. 1. | none |
| lot1-B | 2026-10-27 | 2 | OK | none | Pink Venom: lead single of Born Pink. Two weeks atop the Global 200, the first girl group to top it. | none |
| lot1-B | 2026-10-27 | 3 | **FIX** (wording, minor) | Answer right. The fun fact lifts the source's credit clause ("composed by longtime collaborator ... Collapsedone and Like ... Written by Danke") with one word changed. | Talk That Talk: lead single of Between 1&2 (Aug 26, 2022). Composed by Collapsedone (who co-composed Knock Knock and The Feels) and Like. Lyrics by Danke. Retro, newtro sound. | FF: "Collapsedone, who had co-composed earlier TWICE singles like Knock Knock and The Feels, wrote the music with Like; Danke penned the lyrics." |
| lot1-B | 2026-10-27 | 4 | OK | none. The infobox also lists the Japanese album Pink Season, which is not an option. | Mr. Chu: lead single of the 4th mini album Pink Blossom (2014). Composed by Duble Sidekick. Six music show trophies. | none |
| lot1-B | 2026-10-27 | 5 | OK (style note) | The fun fact is a close paraphrase of the chart sentence (plain fact, acceptable). | Supernova: lead single of Armageddon. First Circle Digital No. 1 for aespa, eleven non-consecutive weeks at No. 1. | none |
| lot1-B | 2026-10-27 | 6 | OK | none | Ko Ko Bop: lead single of the 4th studio album The War, released in Korean and Chinese. | none |
| lot1-B | 2026-10-27 | 7 | OK | none | Red Flavor: lead single of The Red Summer (July 9, 2017). Korean lyrics by Kenzie, dance-pop, fruit-infused MV. | none |
| lot1-B | 2026-10-27 | 8 | **FIX** (wording, minor) | Answer right. The fun fact is the source sentence with only its last clause swapped ("It was written and produced by Galactika, who also produced the group's debut track Dalla Dalla"). | Wannabe: lead single of It'z Me (March 9, 2020). Written and produced by Galactika, who also produced Dalla Dalla. | FF: "Galactika, the team that made ITZY's debut hit Dalla Dalla, handled both the writing and the production." |
| lot1-B | 2026-10-27 | 9 | **FIX** (wording, minor) | Answer right. The fun fact copies the source clause ("The song was written by members T.O.P, G-Dragon and long-time group collaborator Teddy Park") almost word for word. | Fantastic Baby: released Feb 29, 2012 with the EP Alive. Written by T.O.P, G-Dragon and Teddy Park. G-Dragon and Teddy composed and produced it. | FF: "BigBang's G-Dragon and T.O.P co-wrote it with Teddy Park, and G-Dragon and Teddy also composed and produced it." |
| lot1-B | 2026-10-27 | 10 | OK | none. The repackage Neo Zone: The Final Round is not an option. | Kick It: lead single of the 2nd studio album Neo Zone. Korean title means hero. Martial arts MV. | none |
| lot1-B | 2026-10-28 | 1 | OK | none. The past tense fits, since the duo split in March 2025. | Black Eyed Pilseung: made Like Ooh-Ahh, Cheer Up and TT for TWICE. Launched High Up Entertainment, then debuted STAYC in Nov 2020. | none |
| lot1-B | 2026-10-28 | 2 | OK | none. Teddy (YG), Kenzie and Yoo Young-jin (SM) never fit. | Pdogg: in 2010, with Sleepy's help, found a young RM and brought him to Big Hit, then became BTS's main producer. KOMCA daesang (Feb 2019) as top-earning songwriter and composer of 2018. | none |
| lot1-B | 2026-10-28 | 3 | OK | none. They also worked with TWICE (JYP), but the source says they are best known for SM acts. | LDN Noise: London duo, best known for SM artists (f(x), EXO, Red Velvet, NCT). First writing credit: Chris Brown's Turn Up the Music, a 2012 UK No. 1. | none |
| lot1-B | 2026-10-28 | 4 | OK | Weak but correct: "debut song" alone gives the answer to any Girls' Generation fan. I checked the distractors: Genie (lyrics by Yoo Young-jin) and Run Devil Run (Kenzie did vocal direction only) do not credit her as a writer. | Kenzie: her favourite works include Girls' Generation's debut song Into the New World, which she composed (Into the New World page). Berklee 1999, music production and engineering. | none (optional: drop "debut") |
| lot1-B | 2026-10-28 | 5 | OK | none. g.o.d, Sechs Kies and NRG appear nowhere in his credits. H.O.T. as first generation is undisputed. | Yoo Young-jin: formerly of SM, left in March 2023 after 28 years. Worked for H.O.T. from their 1996 first album, then S.E.S., BoA, TVXQ ... aespa. | none |
| lot1-B | 2026-10-28 | 6 | OK | Note only: Wikipedia flags the "1980s-style synth-pop" line with an Unreliable source tag. It is a descriptor in the stem, not the answer. | Sweetune: founded by Han Jae-ho and Kim Seung-soo. Produced Kara's Lupin (2010) and Step (2011), plus Rainbow, Infinite and Nine Muses. | none |
| lot1-B | 2026-10-28 | 7 | OK | none. 2PM, Beast and Infinite are not tied to 100% Ver. | Duble Sidekick: lyricist Park Jang-geun and composer Mikey (ex-One Way). Rose to fame producing MBLAQ's 2012 EP 100% Ver. | none |
| lot1-B | 2026-10-28 | 8 | OK | Nit: "slightly earlier" is not in the source, which only says first released song vs first hands-on song. | Ryan S. Jhun: first released song Chitty Chitty Bang Bang (Lee Hyori, H-Logic, 2010). First hands-on song Lucifer for SHINee. | Optional: drop "slightly". |
| lot1-B | 2026-10-28 | 9 | OK | The Academy Award claim is confirmed: the source says he won the Academy Award for Best Original Song for the KPop Demon Hunters soundtrack (single Golden), plus a Grammy and a Golden Globe. Precision nit: the Oscar went to the song Golden. | Teddy Park: debuted in 1998 in 1TYM. YG in-house producer after 2006. Won the Oscar for Best Original Song, the Grammy for Best Song Written for Visual Media and a Golden Globe for KPop Demon Hunters / Golden. | Optional FF: "Decades later, his work on Golden from KPop Demon Hunters won him an Academy Award for Best Original Song." |
| lot1-B | 2026-10-28 | 10 | OK | none | J. Y. Park: in Oct 2009 he and Rainstone became the first Korean songwriters on the Hot 100, with Wonder Girls' Nobody at No. 76. | none |
| lot1-B | 2026-10-29 | 1 | OK | none | Orange Blood (Nov 17, 2023), title track Sweet Venom. Hanteo: over 1.38M sold on day one. | none |
| lot1-B | 2026-10-29 | 2 | **FIX** (wording, minor) | Answer right (Twilight), and no other option is plausible. But "the cast" overstates. The Korea Times reports (cited by Wikipedia, AP and Pyo Kyung-min bylines) name director Catherine Hardwicke and two franchise actors, Peter Facinelli and Ashley Greene. | Enhypen (Wikipedia): at a 2026 SDCC panel with the cast of Twilight, the group discussed how vampire stories endure across generations. KT, July 24 and 27, 2026: the panel "Bite Me: Calling All Vampires" on July 23, with Hardwicke, Greene and Facinelli. | Q: "At San Diego Comic-Con 2026, ENHYPEN shared a panel with actors from which vampire film series?" Options and FF unchanged. |
| lot1-B | 2026-10-29 | 5 | OK | none. The stem now says "a single", which matches the source. | Desire: Unleash (June 5, 2025): singles Loose and Bad Desire. Pre-orders over 2.18M, the third double-million seller. | none |

## lot1-C

| File | Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|---|
| lot1-C | 2026-11-02 | 4 | OK | none. "Late-night" rules out the daytime Live!, and the show name "Live!" avoids the Kelly and Michael anachronism. | The Boys: MSG performance on Oct 23, 2011, as part of an SM Town concert. US TV debut on Late Show with David Letterman and Live! in February 2012. | none |
| lot1-C | 2026-11-03 | 1 | OK | none | Bloom Bloom: second single album by The Boyz (April 29, 2019). Their first music show win, on The Show (May 7, 2019). | none |
| lot1-C | 2026-11-03 | 3 | OK | none | Reminiscence: EVERGLOW's first EP (Feb 3, 2020), four tracks, lead single Dun Dun. | none |

## lot1-D

| File | Date | Q# | Verdict | Problem | What the source says (paraphrase) | Proposed correction |
|---|---|---|---|---|---|---|
| lot1-D | 2026-11-04 | 4 | OK | Note: "now known as i-dle" is not in the cited article, but it is true (I-dle Wikipedia page). | Korea Times (Pyo Kyung-min, Dec 1, 2024): aespa won seven awards, including three of four grand prizes (Artist, Album, Song). Record of the Year went to (G)I-DLE. | none |
| lot1-D | 2026-11-05 | 7 | OK (False) | none | Flower: released March 31, 2023 by YG and Interscope, lead single of the single album Me. | none |
| lot1-D | 2026-11-05 | 10 | OK (True) | Note: Baekhyun had earlier non-album singles, but the source treats City Lights as his solo debut. | City Lights: debut EP (July 10, 2019, SM), six tracks, lead single UN Village. | none |
| lot1-D | 2026-11-06 | 9 | OK | none. The reworded fun fact is no longer copied, and "A magic mirror" has replaced "A palm reading". | Yes or Yes: the members face their feelings with a fortune-telling crystal ball. The video hit 100M views on Dec 14, its tenth straight MV to do so. | none |
| lot1-D | 2026-11-08 | 1 | OK | none | Plave: virtual boy band formed by Vlast. In April 2024, CEO Lee Sung-gu announced HYBE and YG Plus investments to support international expansion. | none |
| lot1-D | 2026-11-08 | 2 | **FIX** (wording, minor) | Answer right, fun fact fine. The question stem copies 10 consecutive words of the source ("made their official debut on March 12, 2023, with ..."). | Plave: official debut on March 12, 2023, with the first single album Asterum. The name blends play and rêve (French for dream). | Q: "Which single album marked PLAVE's formal debut in March 2023?" |
| lot1-D | 2026-11-08 | 4 | OK | Note: the "HYBE-run" qualifier gives the answer away and is not on the Plave page (Weverse's HYBE link is common knowledge). Lysn (SM, Dear U), Berriz (Kakao) and Universe (not HYBE) are not HYBE-run. | Plave: announced joining Weverse in a livestream on Dec 12, 2023. Fan club membership opened there in early 2024. The first virtual group on the platform. | none |
| lot1-D | 2026-11-08 | 6 | OK | none. The pairing order matches: Miyeon is Ahri, Soyeon is Akali. | Billboard (11/5/2018): K/DA vocals by Soyeon (Akali) and Miyeon (Ahri) of (G)I-dle, Madison Beer (Evelynn) and Jaira Burns (Kai'Sa). | none |
| lot1-D | 2026-11-08 | 10 | **FIX** (wording, minor) | Answer right. "First" was rightly dropped, but the fun fact still lifts the source clause word for word: "appeared in aespa's Black Mamba music video in November 2020" (a 9-word run). | Korea Herald (Kim Jae-heun, Feb 14, 2025): naevis officially debuted as a singer with Done in Sept 2024. She first appeared in aespa's Black Mamba MV in Nov 2020. (Wikipedia: Done released Sept 10, 2024. Her other songs are Sensitive and Welcome to My World, so I'm Real, Pandora and Dash are all wrong.) | FF: "Years before going solo, she showed up in the video for aespa's Black Mamba, released in November 2020." |

## Quiz-level notes (not counted as items)

- **Answer positions repeat in a cycle** in two lot1-A quizzes, which players can spot. In 2026-10-21, Q4 to Q10 run 3,0,1,2,3,0,1. In 2026-10-23, Q3 to Q10 run 2,3,0,1,2,3,0,1. Shuffle a few of them, as was done for 10-27 and 10-28 (both of which are now well spread).
- 10-27 and 10-28 answer positions are now [2,0,3,1,1,3,0,2,3,0] and [3,1,0,2,0,2,3,1,1,3], so the cycle is fixed.
- No content-rule breaks in scope: no private life, dating, health, weight, height, legal matters or minors' data. No lyrics, no disputed generation numbers (only H.O.T. as first generation) and no unsourced superlatives. The Enhypen page discusses a member's departure and the Illit page mentions disputes, and the quizzes rightly leave both out.

## Totals

- Items checked: 49 (lot1-A 10, lot1-B 27, lot1-C 3, lot1-D 9)
- **OK: 40**
- **FIX: 9** (1 sourcing, 8 wording; 6 of the 8 are minor)
- **DROP: 0**
- Wrong answer keys: 0. Second right answers: 0.

## FIX / DROP list

1. lot1-A 2026-10-21 Q4 (Monsta X torch relay): the new options are fine, but the fun fact copies the source's Japanese-single sentence. New FF: "Their third Japanese single followed on January 31 and featured Spotlight, the first original song they recorded in Japanese."
2. lot1-A 2026-10-23 Q2 (The First Snow): the fun fact is the source sentence with words swapped, and its "all EXO music" claim is too broad. New FF: "It became a Korean favorite for the first snowfall of the year, and in 2023, a decade on, it climbed to No. 1 on the Circle Digital Chart."
3. lot1-B 2026-10-26 Q4 (Face the Sun pre-orders): "a group record at the time" is not in the cited JoongAng article, the FF credits the reporter's line to Pledis, and "Over 2 million" stands out among the "About" options. Cite the Face the Sun Wikipedia page, change the correct option to "About 2 million", and use FF "It beat the group's previous pre-order best of 1.41 million, set by their EP Attacca."
4. lot1-B 2026-10-27 Q3 (Talk That Talk), minor: the FF lifts the credit clause. New FF: "Collapsedone, who had co-composed earlier TWICE singles like Knock Knock and The Feels, wrote the music with Like; Danke penned the lyrics."
5. lot1-B 2026-10-27 Q8 (Wannabe), minor: the FF is the source sentence with one clause swapped. New FF: "Galactika, the team that made ITZY's debut hit Dalla Dalla, handled both the writing and the production."
6. lot1-B 2026-10-27 Q9 (Fantastic Baby), minor: the FF copies the credit clause. New FF: "BigBang's G-Dragon and T.O.P co-wrote it with Teddy Park, and G-Dragon and Teddy also composed and produced it."
7. lot1-B 2026-10-29 Q2 (SDCC 2026, Twilight), minor: "the cast" overstates a panel of one director and two actors. New Q: "At San Diego Comic-Con 2026, ENHYPEN shared a panel with actors from which vampire film series?"
8. lot1-D 2026-11-08 Q2 (PLAVE debut), minor: the stem copies 10 words of the source. New Q: "Which single album marked PLAVE's formal debut in March 2023?"
9. lot1-D 2026-11-08 Q10 (naevis), minor: the FF lifts the Korea Herald clause word for word. New FF: "Years before going solo, she showed up in the video for aespa's Black Mamba, released in November 2020."

Optional (no verdict change): 10-28 Q8, drop "slightly". 10-28 Q9, name Golden as the Oscar song. 10-28 Q4, drop "debut" from the stem. 11-08 Q4, "HYBE-run" gives the answer away. All proposed rewrites were checked: none has a source word run longer than 5 words, a dash, a banned word or excess length.
