# Fix of /q/le-sserafim-fearless-quiz (owner request, 2026-10-25)

The live quiz "LE SSERAFIM: FEARLESS Quiz" (bank quiz of the day of 2026-10-05) is corrected, not unpublished. The owner asked
for three fixes (the ANTIFRAGILE ranking, the contradictory date, a neutral question instead of the one on a member's
departure); every question was then checked at its source, which found four more errors (Q2, Q6, Q7, Q9). Fun facts that
gave away another answer were trimmed, because the page shuffles the questions. Same 10 questions in the same order, every
right answer at the same position.

SQL: `quiz-le-sserafim-fearless-fix.sql` and its rollback, owner-gated. Tested on a local Postgres loaded with the live
content (same md5 as production): the fix changes both rows and leaves `updated_at` alone, a second run is refused by the
guard and changes nothing, the rollback restores the exact live content.

## Q1: changed

- Before: In what year did LE SSERAFIM debut? Answer: 2022. Fun fact: LE SSERAFIM debuted on May 2, 2022 under Source Music (a HYBE subsidiary) with the mini-album FEARLESS.
- After: In what year did LE SSERAFIM debut? Answer: 2022 (options: 2021, 2022, 2023, 2020). Fun fact: LE SSERAFIM debuted on May 2 under Source Music, a label of HYBE.
- Why and proof: Fun fact trimmed: no year and no album name, so it gives away neither Q1 nor Q2 when the questions are shuffled. https://en.wikipedia.org/wiki/Le_Sserafim

## Q2: changed

- Before: What does the name LE SSERAFIM stand for? Answer: I AM FEARLESS (anagram). Fun fact: LE SSERAFIM is an anagram of 'I AM FEARLESS,' reflecting the group's bold and confident concept. The name was revealed shortly before their debut.
- After: What does the name LE SSERAFIM stand for? Answer: I'M FEARLESS (anagram) (options: Light Energy Source Embracing Radiance And Fantasy In Music, I'M FEARLESS (anagram), Leading Every Soul Seeking Real Adventure Forging Incredible Moments, Nothing, it is a purely coined name). Fun fact: The name rearranges the letters of the phrase I'm Fearless and also nods to the six-winged seraphim.
- Why and proof: Right option was I AM FEARLESS: the name is an anagram of I'm Fearless (Wikipedia, and Billboard: I'm fearless). Option 4 lost its double hyphen; the fun fact lost its quotation marks and its reveal date (it gave away Q1). https://en.wikipedia.org/wiki/Le_Sserafim

## Q3: changed

- Before: Which member departed from LE SSERAFIM shortly after the group's debut in 2022? Answer: Kim Garam. Fun fact: Kim Garam left LE SSERAFIM in July 2022, about 2 months after their debut, due to ongoing controversy. The group continued with 5 remaining members.
- After: What was LE SSERAFIM's first concert tour, which opened in Seoul in August 2023? Answer: Flame Rises Tour (options: Easy Crazy Hot Tour, Pureflow Tour, Fearless Tour, Flame Rises Tour). Fun fact: The Flame Rises Tour kicked off in Seoul on August 12, 2023.
- Why and proof: Owner request: the question on a member's departure (due to a controversy) is replaced by a neutral one. The Flame Rises Tour was the first concert tour and opened in Seoul on August 12, 2023; the group's other tours are Easy Crazy Hot and Pureflow, so one option is right (Fearless Tour does not exist). https://en.wikipedia.org/wiki/Flame_Rises_Tour

## Q4: unchanged, checked

- Sakura and Chaewon were both previously in which K-pop project group? Answer: IZ*ONE. Source: https://en.wikipedia.org/wiki/Iz*One

## Q5: changed

- Before: Sakura is from which country? Answer: Japan. Fun fact: Sakura (Miyawaki Sakura) is from Kagoshima, Japan. She was previously a member of the Japanese idol group HKT48/AKB48 before joining IZ*ONE and then LE SSERAFIM.
- After: Sakura is from which country? Answer: Japan (options: South Korea, Japan, China, Taiwan). Fun fact: Sakura (Miyawaki Sakura) is from Kagoshima, Japan, and was a member of the Japanese idol groups HKT48 and AKB48.
- Why and proof: Fun fact trimmed: it named IZ*ONE, the answer of Q4. https://en.wikipedia.org/wiki/Sakura_Miyawaki

## Q6: changed

- Before: Yunjin is from which country, making her a rare Korean-American idol? Answer: United States. Fun fact: Yunjin (Huh Yun-jin) is a Korean-American from New York City. She auditioned for Source Music in the US and is known for her powerful vocals and English-language songwriting.
- After: Yunjin grew up in which country before moving to South Korea to train? Answer: United States (options: Australia, United States, Canada, United Kingdom). Fun fact: Yunjin was born in Seoul but raised in the United States, and she moved to South Korea in 2017 to train. She is credited as a writer on Blue Flame from the debut EP.
- Why and proof: Two right options: Yunjin was born in Seoul (the option South Korea (born) was true too). She grew up in the United States (Wisconsin, then Niskayuna, New York) and moved to South Korea in 2017. The question now asks where she grew up; the option became Australia. The cited page /wiki/Yunjin is about a Chinese silk brocade. https://en.wikipedia.org/wiki/Huh_Yunjin

## Q7: changed

- Before: LE SSERAFIM performed at which major festival in 2023, building on a K-pop festival presence? Answer: Coachella. Fun fact: LE SSERAFIM performed at Coachella 2023 as part of the festival's first Coachella Korea stage, further cementing their global profile.
- After: LE SSERAFIM performed at which major US music festival in April 2024? Answer: Coachella (options: Glastonbury, Coachella, Lollapalooza, Rolling Loud). Fun fact: LE SSERAFIM took the Sahara Tent stage at Coachella in April 2024 and premiered a then unreleased song, 1-800-Hot-N-Fun, during their set.
- Why and proof: Wrong year and an invented stage: they played Coachella in April 2024 (Sahara Tent), not 2023, and there was no Coachella Korea stage. https://www.billboard.com/lists/coachella-2024-saturday-recap-ice-spice-no-doubt-tyler-creator-sublime/

## Q8: changed

- Before: Which LE SSERAFIM song became their breakout international hit in 2023? Answer: Easy. Fun fact: Easy, released in February 2024, became LE SSERAFIM's most internationally successful song to date, gaining massive traction on streaming platforms globally.
- After: Which LE SSERAFIM song, released in February 2024, was the lead single of their third EP? Answer: Easy (options: FEARLESS, ANTIFRAGILE, UNFORGIVEN, Easy). Fun fact: Easy was released on February 19, 2024 together with the EP of the same name, and it climbed to No. 3 on South Korea's Circle Digital Chart.
- Why and proof: Owner request, contradictory date: the question said Easy was a 2023 hit, its fun fact said February 2024. Easy came out on February 19, 2024 as the lead single of the third EP; the unsourced breakout claims are gone. https://en.wikipedia.org/wiki/Easy_(Le_Sserafim_song)

## Q9: changed

- Before: Eunchae is the youngest member of LE SSERAFIM. She was born in which year? Answer: 2006. Fun fact: Eunchae (Hong Eun-chae) was born on November 10, 2006, making her the youngest member of LE SSERAFIM. She joined after the initial lineup was reduced to 5.
- After: Eunchae is the youngest member of LE SSERAFIM. She was born in which year? Answer: 2006 (options: 2004, 2005, 2006, 2007). Fun fact: Hong Eunchae, born November 10, 2006, is the youngest of the five members, and she was a regular MC of KBS2's Music Bank from 2023 to 2024.
- Why and proof: Wrong fun fact: Eunchae was in the debut lineup; she did not join after the group went to five. The cited page /wiki/Eunchae does not exist. Youngest: the other members were born in 1998, 2000, 2001 and 2003 (their own pages). https://en.wikipedia.org/wiki/Hong_Eunchae

## Q10: changed

- Before: LE SSERAFIM's ANTIFRAGILE (2022) peaked at what position on the Billboard Hot 100? Answer: #57. Fun fact: ANTIFRAGILE peaked at #57 on the Billboard Hot 100, making it one of the highest-charting K-pop girl group songs on the chart at the time of release.
- After: LE SSERAFIM's first Billboard Hot 100 entry debuted at what position in March 2024? Answer: #99 (options: #7, #22, #99, #100). Fun fact: It was the group's first time on the chart: none of their earlier songs, ANTIFRAGILE included, had made the Hot 100.
- Why and proof: Owner request, wrong ranking: ANTIFRAGILE never entered the Hot 100 (it was given as #57). The group's first Hot 100 entry debuted at No. 99 on the chart dated March 9, 2024; Billboard's chart history lists Easy (99), Crazy (76), Spaghetti (50) and Iconic By Mistake (38). The question no longer names the song, which is the answer of Q8. https://www.billboard.com/music/chart-beat/le-sserafim-hot-100-debut-easy-new-ep-1235622235/ and https://www.billboard.com/artist/le-sserafim/chart-history/hsi/
