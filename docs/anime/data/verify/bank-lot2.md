# Anime daily bank, lot 2: verification summary

Read on 2026-11-09. Full record: `docs/anime/data/verify/bank-lot2.json`. Owner packet: `docs/anime/editorial/packets/bank-lot2.html`.

30 quizzes of the 58 L08 drafts left after lot 1, 2026-12-19 to 2027-01-17, 8 questions each (240 questions): 3 OK, 3 FIX (draft question kept), 234 NEW (questions written from a page read at a pinned revision), 234 DROP (draft questions not kept).

The L08 drafts were built on the same fact pack as the published quizzes: almost every draft question repeated a fact already asked in the 270 published anime quizzes, the taken rows or lot 1 (reason of nearly every DROP). The lot is therefore rebuilt on new facts; each new question carries its own source_url and no fact_ids. Titles or descriptions changed where the new content no longer matched the draft (the draft title stays the key of the SQL guard).

Three readings of every question, each at the pinned revision: the writer, a second reader (check2: 227 confirmed, 11 fixed, 2 replaced) and a third reader (check3: 229 confirmed, 8 fixed, 3 replaced). Duplicates were searched with `scripts/anime/daily/dupcheck.py` (TF-IDF over every question already asked) and by grep; clue-style published quizzes were the main source of duplicates the tool missed.

## Schedule

| Date | Series | Type | Difficulty | Title |
|---|---|---|---|---|
| 2026-12-19 | death-note | multiple_choice | medium | Death Note on Screen, Stage and Console |
| 2026-12-20 | attack-on-titan | multiple_choice | hard | Behind the Titans: Voices, Scores and Spin-offs |
| 2026-12-21 | demon-slayer | true_false | easy | Corps Statements: Fact or Fiction |
| 2026-12-22 | spy-x-family | multiple_choice | easy | Forger Family Credits: Dubs, Music and Film |
| 2026-12-23 | anime-mix | true_false | medium | Bigger or Smaller? True or False |
| 2026-12-24 | jujutsu-kaisen | multiple_choice | medium | Akutami's Jump: Imprints, Influences and Spin-offs |
| 2026-12-25 | chainsaw-man | true_false | medium | Devil Hunter Statements: True or False |
| 2026-12-26 | demon-slayer | multiple_choice | medium | Demon Slayer Sound Test: Songs, Credits and Prizes |
| 2026-12-27 | dragon-ball | multiple_choice | hard | Behind Dragon Ball: Directors, Composers and Crossovers |
| 2026-12-28 | anime-mix | multiple_choice | easy | Hum It, Name It: Which Series Opens With This Song? |
| 2026-12-29 | one-piece | multiple_choice | medium | Grand Line Trivia: Songs, Films and Origins |
| 2026-12-30 | kagurabachi | multiple_choice | medium | Jump Newcomer: Anime, Charts and Prizes |
| 2026-12-31 | demon-slayer | multiple_choice | medium | From Unwavering Resolve to Hashira Training |
| 2027-01-01 | vinland-saga | true_false | hard | Longship Statements: True or False |
| 2027-01-02 | anime-mix | intruder | medium | Odd One Out: Born Online or in Print |
| 2027-01-03 | naruto | true_false | easy | Naruto Behind the Scenes: Fact or Fiction |
| 2027-01-04 | frieren | multiple_choice | easy | One Thousand Years and a Quiet Apprentice |
| 2027-01-05 | dragon-ball | true_false | medium | Dragon Ball Spin-offs and Side Stories: Fact or Fiction |
| 2027-01-06 | cowboy-bebop | multiple_choice | hard | Sessions in 2071 |
| 2027-01-07 | anime-mix | multiple_choice | medium | Writer and Artist: Who Made Which Story? |
| 2027-01-08 | naruto | multiple_choice | medium | Naruto Playlist: Who Sang the Openings |
| 2027-01-09 | dandadan | multiple_choice | easy | Spirits, Staff and Voices: A Dandadan Quiz |
| 2027-01-10 | one-piece | true_false | easy | Straw Hat Statements: Fact or Fiction |
| 2027-01-11 | evangelion | multiple_choice | medium | Tokyo-3, 1995 |
| 2027-01-12 | anime-mix | intruder | hard | Odd One Out: Numbers and Dates |
| 2027-01-13 | attack-on-titan | true_false | easy | Beyond the Walls: Titans True or False |
| 2027-01-14 | hunter-x-hunter | multiple_choice | medium | Two Hunters, Two Anime |
| 2027-01-15 | solo-leveling | multiple_choice | medium | Behind the Webtoon, the Voices and the Screen: Solo Leveling |
| 2027-01-16 | haikyu | true_false | easy | Furudate and Friends: Haikyu!! True or False |
| 2027-01-17 | anime-mix | multiple_choice | easy | Name the Series: Songs First |

## Kept draft questions (OK and FIX)

- 2026-12-20 #8 OK: In which year did Hajime Isayama create the 65-page one-shot version of Attack on Titan?
- 2026-12-24 #1 FIX: Under which imprint did Shueisha collect the Jujutsu Kaisen manga in volumes? (FIX: reworded 'Jump line' to 'imprint' so the question does not leak the answer; infobox of the page gives imprint Jump Comics (draft #1 option set kept))
- 2026-12-29 #3 OK: Which opening is a team-up between Hiroshi Kitadani and the group Kishidan?
- 2027-01-08 #1 FIX: Which band performed Guren, the 15th opening of Naruto: Shippuden? (FIX: draft #4 said '24th opening overall', which the English page does not state; reworded to the page's '15th opening' of Shippuden; source changed from Japanese Wikipedia to the English DOES page; options reduced to four verified-wrong names (Yamazaru removed))
- 2027-01-08 #2 FIX: Which band performed Silhouette, the 16th opening of Naruto: Shippuden? (FIX: draft #5 cited Japanese Wikipedia; question now says the 16th opening of Shippuden and cites the English Silhouette (Kana-Boon song) page; options unchanged)
- 2027-01-14 #1 OK: Which duo sang the last three endings of the 2011 Hunter x Hunter anime?

## Changes by the second and third readers

- 2026-12-20 #8 check2 FIX: Page: one-shot created in 2006 and serialization began in 2009, so 'manga begin' was ambiguous with the 2006 distractor and the description promises the one-shot; rewritten to ask the one-shot year (no dupcheck hit).
- 2026-12-21 #4 check3 FIX: The pinned main page does not state who developed The Hinokami Chronicles (it only links the game); moved the source to the game's own page, which says developed by CyberConnect2 (published by Aniplex in Japan, Sega globally); Capcom false; text and answer unchanged.
- 2026-12-22 #2 check2 FIX: Question said 'group' while the three distractors were single people, so the wording pointed to the answer; reworded and made distractors collectives (page: music composed and produced by (K)now Name).
- 2026-12-23 #1 check3 FIX: Read Monster_(manga) oldid 1378133015 (anime episodes 74) and Cardcaptor_Sakura oldid 1384648739 (anime 70 episodes, Apr 1998-Mar 2000; Clear Card anime is a separate series): true, but 'the Cardcaptor Sakura anime' left open the later Clear Card series, so the 1998 series is named.
- 2026-12-25 #2 check2 FIX: Oshiyama is credited with demon designs, so 'character designs' was arguably true (demons are characters); replaced with the unambiguous chief episode director credit (Makoto Nakazono chief episode director, Tatsuya Yoshihara action director).
- 2026-12-27 #2 check3 FIX: Page: Nakatsuru adapted the designs; option Tadayoshi Yamamuro is credited as animation director on Daima episodes in the episode table, so arguably a role-holder; replaced by Tadashi Hiramatsu (not on the page).
- 2026-12-28 #3 check2 REPLACED: Duplicate: the published FMA quiz 'Bones, Batons and Battle Themes' already asks 'Who sang Again, the first opening of Brotherhood?' (Yui), the same Again/Yui fact reversed. Replaced by Kill la Kill / Sirius, read on Kill_la_Kill oldid 1382024285 (Black Lagoon, Soul Eater, Darker than Black never used Sirius); dupcheck found no earlier Sirius or Eir Aoi opening question.
- 2026-12-30 #1 check2 FIX: Anime has not aired: page says produced by Cypic and set to premiere April 2027; rephrased as an announced fact (answer unchanged).
- 2026-12-30 #1 check3 FIX: Page: Cypic (then known as CygamesPictures) produces the anime, set to premiere April 2027; check2 wording is fine as announced. Options and correct index were missing from the part file after the second reading (only the question text survived); restored four options with the answer starred, distractors are character designers/studios/directors of other anime not named on the Kagurabachi page.
- 2026-12-30 #2 check2 FIX: Anime has not aired: page says it will be directed by Tetsuya Takeuchi; rephrased as announced (answer unchanged).
- 2026-12-30 #2 check3 FIX: Page: anime will be directed by Tetsuya Takeuchi. Options and correct index were missing from the part file after the second reading (only the question text survived); restored four options with the answer starred, distractors are character designers/studios/directors of other anime not named on the Kagurabachi page.
- 2026-12-30 #7 check2 FIX: Anime has not aired: page says Keigo Sasaki handles character designs for a series set to premiere April 2027; rephrased as announced (answer unchanged).
- 2026-12-30 #7 check3 FIX: Page: Keigo Sasaki handles character designs for the series set for April 2027. Options and correct index were missing from the part file after the second reading (only the question text survived); restored four options with the answer starred, distractors are character designers/studios/directors of other anime not named on the Kagurabachi page.
- 2027-01-03 #4 check3 FIX: Image caption says Okayama City but body says Konoha drew on Kishimoto's hometown scenery in Okayama Prefecture (he is from Nagi, a town, not the city); 'Okayama City' risked being arguably false, reworded to the body text.
- 2027-01-04 #2 check3 REPLACED: Duplicate in reverse: published Frieren Who Is This clue for Fern already says 'Raised by the priest Heiter' (same Fern/Heiter relation). Replaced by Himmel's Japanese voice actor; characters list: Himmel = Nobuhiko Okamoto, Stark = Chiaki Kobayashi, Heiter = Hiroki Tochi, Eisen = Yoji Ueda; dupcheck and grep of quizzes: no Okamoto hit.
- 2027-01-04 #4 check2 FIX: Stem said 'cultural prize' and only one option contains 'Cultural Prize', giving away the answer; reworded to 'which award'. Page: 25th Tezuka Osamu Cultural Prize New Creator Prize won in 2021; Eisner and Seiun not on the page; Kodansha Manga Award is a different 2024 award.
- 2027-01-04 #7 check2 REPLACED: Ambiguous year: the lead says 69th Shogakukan Manga Award and 48th Kodansha Manga Award in 2024, but the awards table lists the 69th Shogakukan under 2023 and the 48th Kodansha under 2024, so both 2023 and 2024 are defensible. Replaced by the NA publisher question (infobox publisher_en NA = Viz Media; Kodansha USA, Yen Press, Seven Seas not named). Dupcheck: only other-series Viz Media questions (0.81, different series).
- 2027-01-09 #2 check3 REPLACED: Reverse duplicate: published Voice, Habit, Hint clue quiz already states 'In the Japanese version, she is voiced by Nana Mizuki' (answer Seiko Ayase); the stem also says 'singer'. Replaced by English-dub Momo Ayase (cast table: Abby Trott; Kari Wahlgren = Seiko, Lisa Reimold = Aira, Barbara Goodson = Turbo Granny); dupcheck no hit.
- 2027-01-09 #6 check2 FIX: Distractor Yoshimichi Kameda is credited on the page with alien and supernatural entity designs, so arguably also a character designer; replaced by Kensuke Ushio (composer). Page: character designs by Naoyuki Onda.
- 2027-01-09 #7 check3 REPLACED: Reverse duplicate: published Voice, Habit, Hint clue quiz already states 'In Japanese, this yokai is voiced by Mayumi Tanaka' (answer Turbo Granny). Replaced by the 10th Crunchyroll Anime Awards result (TV page awards table: Dandadan Season 2 won Best Comedy; Anime of the Year, Best Romance, Best Action only nominated; Best Opening Sequence also won but not offered); dupcheck no hit.
- 2027-01-11 #4 check2 FIX: Distractor Manga Entertainment appears on the page as the maker of an English dub (films) in the Ultimate Edition, so arguably also a distributor; replaced by Media Blasters (not on the page). Page: ADV Films distributed in North America and Europe, thirteen English VHS tapes from August 20, 1996 to July 7, 1998.
- 2027-01-12 #4 check2 FIX: Toradora! oldid 1373729757 ran Oct 2008 to Mar 2009; Code_Geass 1383895796: Lelouch of the Rebellion ended 29 Jul 2007 but its sequel R2 ended 28 Sep 2008, so plain 'Code Geass' finishing in 2007 was false for the whole franchise; option relabelled to the first series title. Gurren_Lagann 1382761580 ended 30 Sep 2007; Nana 1384301307 ended 28 Mar 2007.
- 2027-01-12 #7 check2 FIX: Monster_(manga) oldid 1378133015 anime began 7 Apr 2004; Berserk_(1997_TV_series) 1384596143 Oct 1997; Cardcaptor_Sakura 1384648739 Apr 1998; Rurouni_Kenshin 1379954423 first TV series Jan 1996. The page also lists a 2023 TV series, so plain 'Rurouni Kenshin' was ambiguous for 'began before 2000'; option relabelled with (1996) like Berserk (1997).
- 2027-01-12 #7 check3 FIX: Monster_(manga) 1378133015 (anime began 7 Apr 2004); Berserk_(1997_TV_series) 1384596143 (Oct 1997), Cardcaptor_Sakura 1384648739 (TV series 7 Apr 1998), Rurouni_Kenshin 1379954423 (28 vol manga, 1994; TV 1996); option 'Cardcaptor Sakura' left open the Clear Card anime (2018, separate series), so relabelled 'Cardcaptor Sakura (1998)' like Berserk (1997) and Rurouni Kenshin (1996).
