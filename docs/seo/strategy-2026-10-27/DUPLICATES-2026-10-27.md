# Near-duplicate quizzes: kpopquiz.org and otakuquiz.org (O1)

Date: 2026-10-27. Read-only audit. Nothing was changed in any database, redirect map or repo file. Every merge, retitle and regroup below is a proposal for the owner.

## Summary

| Site | Quizzes compared | Questions | Candidate pairs by overlap | Clusters | 301 merges proposed | Retitles proposed | Titles that break the hub rule today |
|---|---|---|---|---|---|---|---|
| kpopquiz.org (production) | 494 | 4,285 | 23 | 104 | 1 | 320 in clusters + 3 single quizzes | 24 |
| otakuquiz.org (O1 dev, site_id anime) | 284 | 2,711 | 1 | 35 | 0 | 82 in clusters + 40 title-only fixes | 19 |

Key findings:

- **One true duplicate.** ILLIT: `this-is-only-for-true-gllits` and `this-is-only-for-true-gllits-2` are the same quiz uploaded twice by the same creator (10 of 10 questions identical). Proposal: keep `this-is-only-for-true-gllits-2`, 301 the other.
- **No other pair reaches the 60% merge line.** The highest overlaps are Kagurabachi odds and ends on OtakuQuiz (56%), (G)I-DLE self-produced vs members and facts (50%), Stray Kids members (40%) and NCT DREAM (40%). These get distinct titles instead.
- **The real problem is same-intent competition.** Many quizzes on one group chase the same query with near-identical titles: 11 Cortis fan tests, 10 ILLIT fan tests, 8 Stray Kids fan tests, 7 BLACKPINK fan tests, 4 BTS true or false quizzes, identical titles such as SEVENTEEN true or false (2), (G)I-DLE true or false (2), SHINee legends quiz (2), TUIDE (2), and topic piles in General K-pop (7 records quizzes, 10 generation quizzes, 8 company quizzes in 2 clusters).
- **24 K-pop titles and 19 anime titles break the hub rule today** (they start with or equal "{Group} Quiz"). Each gets a content-derived qualifier below.
- **OtakuQuiz is cleaner by construction.** Its overlap is low, but three series carry 3-question fixtures (slug prefix `fx-`) that duplicate the intent of full quizzes, 20 series have an easy and a hard quiz both titled "{Series} Quiz", and 40 titles omit the series name.
- Proposed titles fit 49 characters before " | KpopQuiz" and 48 before " | OtakuQuiz", cut no word, carry no brand, dash or quotation mark, and use the groups table spelling. Meta descriptions are 120 to 160 characters.

## Method

- **Normalization:** NFKC, lowercase, every non-word character to a space, spaces collapsed. Question key = normalized question text (plus clues for clue quizzes, plus the image file name for picture questions) and the normalized right answer.
- **Exact match:** same normalized question text and same normalized right answer.
- **Near match:** token Jaccard >= 0.8 on question + right answer tokens (prefix-filtered, exact).
- **Shared share:** questions of the smaller quiz that match a question of the other quiz / questions of the smaller quiz.
- **Candidate pair:** share >= 25% with at least 2 shared questions, or a close title in the same group/series (token Jaccard after removing the group name and filler words), or the same intent in the same group/series.
- **Merge threshold:** share above 60% -> 301 merge proposal; otherwise SEO title, H1 and meta description per quiz.
- **Keep rule:** more plays, then older, then more questions; Team is not a tie breaker.
- **Team:** Team = active row in editorial_accounts on that project; everyone else is Player.
- Clusters were then checked by hand against the questions: a cluster is one group or series plus one search intent (true or false, members, discography, one era, a fan test, one General K-pop topic). Quizzes on different eras or different topics were not clustered even when titles look alike.
- Series links: every quiz links to its hub with the exact anchor "{Group} quiz" and to up to three cluster siblings (prev and next for numbered or ordered series), using the sibling's proposed SEO title as anchor.
- The quiz page helper (`lib/seo/quiz-meta.ts`) appends " · N questions" when it fits; the proposed SEO titles are meant to replace the whole own part of the title.

## 301 merge proposals

### K01 · ILLIT · Duplicate upload: This is only for true Gllits

| Role | Slug | Creator's title | Creator | Account | Plays | Likes | Questions | Created |
|---|---|---|---|---|---|---|---|---|
| Keep | `this-is-only-for-true-gllits-2` | This is only for ~true~ Gllits! | peachyblssom2014 | Player | 105 | 2 | 10 | 2026-09-22 |
| Redirect | `this-is-only-for-true-gllits` | This is only for ~true~ Gllits! | peachyblssom2014 | Player | 41 | 2 | 10 | 2026-09-22 |

Overlap: 100% (10 of 10 questions, 10 exact). Why keep: 105 plays vs 41; same creator, same day, same questions.

301: `/q/this-is-only-for-true-gllits` to `/q/this-is-only-for-true-gllits-2`. The redirected page loses 41 plays and 2 likes on display unless the owner moves them.

Owner steps (proposal, nothing applied):

1. Confirm with the creator that the second upload was a mistake (same creator, same title, same 10 questions, both published 2026-09-22).
2. Set this-is-only-for-true-gllits to unpublished (do not delete) so it leaves feeds, the group page and the sitemap.
3. Add a 301 from /q/this-is-only-for-true-gllits to /q/this-is-only-for-true-gllits-2 in the redirect map (exact successor, no chain).
4. Optional: carry the 41 plays and 2 likes over to the kept quiz (move like rows with a duplicate check), or accept the loss.
5. Queue both URLs for IndexNow through the outbox after the deploy.
6. Note: the kept slug ends in -2. Keeping the clean slug instead would cost the 105 plays of the kept page, so the rule picks the -2 page.

The kept quiz is also retitled in cluster K42 below.

## kpopquiz.org: group clusters

### K02 · BTS · BTS true or false

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BTS quiz](/bts-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `bts-true-or-false-bet-you-cant-get-100` | BTS true or false - bet you can't get 100% | mina | Player | 1327 | 8 | 2026-03-17 |
| `bts-true-or-false-test-your-army-knowledge` | BTS true or false - test your ARMY knowledge | joonified | Team | 767 | 8 | 2026-03-30 |
| `bts-true-or-false-harder-edition` | BTS true or false - harder edition | joonified | Team | 116 | 7 | 2026-04-11 |
| `bts-true-or-false` | BTS True or False | kpopquizz | Player | 28 | 10 | 2026-06-01 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `bts-true-or-false-bet-you-cant-get-100` | BTS True or False: Trainee Days to Enlistment (56) | BTS true or false: from trainee days to military service | Spot the true BTS facts and the fakes: who joined first, Jungkook's audition, the Wembley show, V and Jimin's school and the first member to enlist. (148) |
| `bts-true-or-false-test-your-army-knowledge` | BTS True or False: Name, Label and Fandom (52) | BTS true or false: the name, the label and ARMY | True or false on the BTS basics fans argue about: what Bangtan Sonyeondan means, which label they debuted under, what ARMY stands for and V's drama role. (153) |
| `bts-true-or-false-harder-edition` | BTS True or False: Stage Names and Pre-Debut (55) | BTS true or false: stage names, pre-debut and firsts | Judge BTS facts about stage name origins, Jin's street casting, J-Hope's dance crew before debut, RM's songwriting credits and their first Hot 100 number one. (158) |
| `bts-true-or-false` | BTS True or False for New ARMY (41) | BTS true or false for new ARMY: the basics | A beginner BTS true or false round: debut year, the leader, the member count, the fandom name and the first English single. Good warm-up before harder quizzes. (159) |

Series links:

- `bts-true-or-false-bet-you-cant-get-100` links to [BTS quiz](/bts-quiz); [BTS True or False: Name, Label and Fandom](/q/bts-true-or-false-test-your-army-knowledge); [BTS True or False: Stage Names and Pre-Debut](/q/bts-true-or-false-harder-edition); [BTS True or False for New ARMY](/q/bts-true-or-false)
- `bts-true-or-false-test-your-army-knowledge` links to [BTS quiz](/bts-quiz); [BTS True or False: Trainee Days to Enlistment](/q/bts-true-or-false-bet-you-cant-get-100); [BTS True or False: Stage Names and Pre-Debut](/q/bts-true-or-false-harder-edition); [BTS True or False for New ARMY](/q/bts-true-or-false)
- `bts-true-or-false-harder-edition` links to [BTS quiz](/bts-quiz); [BTS True or False: Trainee Days to Enlistment](/q/bts-true-or-false-bet-you-cant-get-100); [BTS True or False: Name, Label and Fandom](/q/bts-true-or-false-test-your-army-knowledge); [BTS True or False for New ARMY](/q/bts-true-or-false)
- `bts-true-or-false` links to [BTS quiz](/bts-quiz); [BTS True or False: Trainee Days to Enlistment](/q/bts-true-or-false-bet-you-cant-get-100); [BTS True or False: Name, Label and Fandom](/q/bts-true-or-false-test-your-army-knowledge); [BTS True or False: Stage Names and Pre-Debut](/q/bts-true-or-false-harder-edition)

### K03 · BTS · BTS members

Retitle (highest shared share 33%, below the 60% merge line). Shared questions: `bts-members-know-your-biases` and `how-well-do-you-know-bts-members` 33% (2/6); `bts-members-know-your-biases` and `bts-members-real-names-complete-test` 17% (1/6).
Hub link: [BTS quiz](/bts-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `bts-members-know-your-biases` | BTS members - know your biases | joonified | Team | 443 | 7 | 2026-04-10 |
| `bts-members-real-names-complete-test` | BTS members real names - complete test | joonified | Team | 305 | 6 | 2026-04-12 |
| `how-well-do-you-know-bts-members` | How well do you know BTS members? | kpopquizz | Player | 77 | 6 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `bts-members-know-your-biases` | BTS Members: Leader, Maknae and Nicknames (52) | BTS members: the leader, the maknae and their nicknames | Who leads BTS, who is the oldest, who is the Golden Maknae and who is Worldwide Handsome? Test the member basics every ARMY learns first. (137) |
| `bts-members-real-names-complete-test` | BTS Real Names: Match Each Member (44) | BTS real names: match each member to his name | Do you know the real names behind the stage names? Match RM, Jin, Suga, J-Hope, Jimin, V and Jungkook to the names they were born with in this BTS members quiz. (160) |
| `how-well-do-you-know-bts-members` | BTS Members: Mixtapes, Positions and Catchphrases (60) | BTS members: mixtapes, positions and catchphrases | Go past the names: which member released Hope World, what Suga's mixtape alias is, who said I purple you and which position Jimin holds in BTS. (143) |

Series links:

- `bts-members-know-your-biases` links to [BTS quiz](/bts-quiz); [BTS Real Names: Match Each Member](/q/bts-members-real-names-complete-test); [BTS Members: Mixtapes, Positions and Catchphrases](/q/how-well-do-you-know-bts-members)
- `bts-members-real-names-complete-test` links to [BTS quiz](/bts-quiz); [BTS Members: Leader, Maknae and Nicknames](/q/bts-members-know-your-biases); [BTS Members: Mixtapes, Positions and Catchphrases](/q/how-well-do-you-know-bts-members)
- `how-well-do-you-know-bts-members` links to [BTS quiz](/bts-quiz); [BTS Members: Leader, Maknae and Nicknames](/q/bts-members-know-your-biases); [BTS Real Names: Match Each Member](/q/bts-members-real-names-complete-test)

### K04 · BTS · BTS discography

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BTS quiz](/bts-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `bts-discography-challenge` | BTS discography challenge | joonified | Team | 633 | 6 | 2026-03-30 |
| `bts-discography-challenge-name-that-era` | BTS discography challenge - name that era | kpopquizz | Player | 35 | 6 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `bts-discography-challenge` | BTS Discography: Albums and Billboard Firsts (55) | BTS discography: albums and Billboard firsts | The BTS discography through its milestones: the first full Korean album, the album behind Spring Day, the first Billboard 200 number one and Proof. (147) |
| `bts-discography-challenge-name-that-era` | Name the BTS Era: Match Songs to Albums (50) | Name the BTS era: match each song to its album | Blood Sweat and Tears, Spring Day, DNA, Boy With Luv: can you place each BTS song in the right album and era? A quick song to album matching round for ARMY. (156) |

Series links:

- `bts-discography-challenge` links to [BTS quiz](/bts-quiz); [Name the BTS Era: Match Songs to Albums](/q/bts-discography-challenge-name-that-era)
- `bts-discography-challenge-name-that-era` links to [BTS quiz](/bts-quiz); [BTS Discography: Albums and Billboard Firsts](/q/bts-discography-challenge)

### K05 · BTS · BTS debut era

Retitle (highest shared share 33%, below the 60% merge line). Shared questions: `bts-debut-era-how-well-do-you-remember` and `only-real-armys-can-pass-this-bts-debut-quiz` 33% (2/6).
Hub link: [BTS quiz](/bts-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `bts-debut-era-how-well-do-you-remember` | BTS debut era - how well do you remember? | joonified | Team | 437 | 6 | 2026-03-24 |
| `only-real-armys-can-pass-this-bts-debut-quiz` | Only real ARMYs can pass this BTS debut quiz | kpopquizz | Player | 67 | 7 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `bts-debut-era-how-well-do-you-remember` | BTS Debut Era: No More Dream and 2 Cool 4 Skool (58) | BTS debut era: No More Dream and 2 Cool 4 Skool | Go back to where BTS started: the debut single, the debut album, the label, the first member recruited and what Bangtan Sonyeondan means in English. (148) |
| `only-real-armys-can-pass-this-bts-debut-quiz` | BTS Debut Basics: Date, Label and Leader (51) | BTS debut basics: the date, the label and the leader | An easy BTS debut quiz for newer fans: the exact debut date, the first single, the Korean name, the label and who leads the group. Learn the basics in minutes. (159) |

Series links:

- `bts-debut-era-how-well-do-you-remember` links to [BTS quiz](/bts-quiz); [BTS Debut Basics: Date, Label and Leader](/q/only-real-armys-can-pass-this-bts-debut-quiz)
- `only-real-armys-can-pass-this-bts-debut-quiz` links to [BTS quiz](/bts-quiz); [BTS Debut Era: No More Dream and 2 Cool 4 Skool](/q/bts-debut-era-how-well-do-you-remember)

### K06 · BTS · BTS records and achievements

Retitle (highest shared share 20%, below the 60% merge line). Shared questions: `bts-achievements-and-records` and `bts-world-records-and-achievements-quiz` 20% (1/5).
Hub link: [BTS quiz](/bts-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `bts-achievements-and-records` | BTS achievements and records | joonified | Team | 101 | 5 | 2026-03-29 |
| `bts-world-records-and-achievements-quiz` | BTS world records and achievements quiz | kpopquizz | Player | 12 | 6 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `bts-achievements-and-records` | BTS Achievements: UN Speech, UNICEF and Billboard (60) | BTS achievements: the UN speech, UNICEF and Billboard | How much do you know about what BTS achieved? The UN speech, the Love Myself campaign with UNICEF, a YouTube record and their run at the Billboard Music Awards. (160) |
| `bts-world-records-and-achievements-quiz` | BTS Records: Hot 100 Number Ones and the Grammys (59) | BTS records: Hot 100 number ones and the Grammys | The records BTS set: the first Hot 100 debut at number one, the Grammys stage with Lil Nas X, the 24 hour YouTube record and a run of number ones. (146) |

Series links:

- `bts-achievements-and-records` links to [BTS quiz](/bts-quiz); [BTS Records: Hot 100 Number Ones and the Grammys](/q/bts-world-records-and-achievements-quiz)
- `bts-world-records-and-achievements-quiz` links to [BTS quiz](/bts-quiz); [BTS Achievements: UN Speech, UNICEF and Billboard](/q/bts-achievements-and-records)

### K07 · BTS · BTS solo work

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BTS quiz](/bts-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `bts-solo-era-quiz-match-the-member-to-the-music` | BTS solo era quiz - match the member to the music | mina | Player | 1596 | 7 | 2026-03-13 |
| `bts-solo-careers-quiz` | BTS solo careers quiz | joonified | Team | 165 | 6 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `bts-solo-era-quiz-match-the-member-to-the-music` | BTS Solo Albums: Match the Member to the Music (57) | BTS solo albums: match the member to the music | FACE, Jack in the Box, Layover, Indigo, Seven: match each BTS solo album or single to the member who released it. A fast round for fans of every solo era. (154) |
| `bts-solo-careers-quiz` | BTS Solo Careers: Albums, Mixtapes and Festivals (59) | BTS solo careers: albums, mixtapes and festivals | Follow the BTS members on their own: Jungkook's GOLDEN, V's Layover, Jimin's FACE, Agust D, Hope World and the J-Hope headline set at Lollapalooza. (147) |

Series links:

- `bts-solo-era-quiz-match-the-member-to-the-music` links to [BTS quiz](/bts-quiz); [BTS Solo Careers: Albums, Mixtapes and Festivals](/q/bts-solo-careers-quiz)
- `bts-solo-careers-quiz` links to [BTS quiz](/bts-quiz); [BTS Solo Albums: Match the Member to the Music](/q/bts-solo-era-quiz-match-the-member-to-the-music)

### K08 · BTS · BTS music videos

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BTS quiz](/bts-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `bts-guess-the-mv-from-the-screenshot` | BTS - Guess the MV from the screenshot | light_a_matz | Player | 38 | 20 | 2026-07-28 |
| `bts-music-video-trivia-can-you-get-100` | BTS music video trivia - can you get 100%? | kpopquizz | Player | 36 | 5 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `bts-guess-the-mv-from-the-screenshot` | Guess the BTS Music Video from a Screenshot (54) | Guess the BTS music video from a screenshot | One still frame, four choices: name the BTS music video it comes from, from No More Dream and Boy In Luv to FIRE, IDOL and I Need U. A picture round for ARMY. (158) |
| `bts-music-video-trivia-can-you-get-100` | BTS Music Video Trivia: Sets and Symbols (51) | BTS music video trivia: sets, symbols and references | Look closer at BTS music videos: the Euphoria jump, the Dynamite disco set, the Korean art in IDOL, the Fake Love rooms and the book behind Spring Day. (151) |

Series links:

- `bts-guess-the-mv-from-the-screenshot` links to [BTS quiz](/bts-quiz); [BTS Music Video Trivia: Sets and Symbols](/q/bts-music-video-trivia-can-you-get-100)
- `bts-music-video-trivia-can-you-get-100` links to [BTS quiz](/bts-quiz); [Guess the BTS Music Video from a Screenshot](/q/bts-guess-the-mv-from-the-screenshot)

### K09 · BTS · BTS general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BTS quiz](/bts-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `ultimate-bts-era-quiz-only-real-armys-survive` | Ultimate BTS era quiz - only real ARMYs survive | mina | Player | 2757 | 8 | 2026-03-10 |
| `bts-the-ultimate-quiz` | BTS: The Ultimate Quiz | kpopquizz | Player | 55 | 10 | 2026-04-22 |
| `how-well-do-you-know-about-bts-as-a-army` | How well do you know about BTS as a ARMY? | btsarmy4life_kiara | Player | 30 | 10 | 2026-09-07 |
| `only-true-army-can-pass-this-quiz` | Only true ARMY  can pass this quiz | mucho_picante | Player | 28 | 10 | 2026-07-06 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `ultimate-bts-era-quiz-only-real-armys-survive` | BTS Milestones by Era: Billboard to Daesang (54) | BTS milestones by era: Billboard, Grammys and Daesang | Questions that span the BTS eras: the first Billboard 200 number one, the first Grammys stage, Map of the Soul: 7, Life Goes On, MUSTER and the first Daesang. (158) |
| `bts-the-ultimate-quiz` | BTS From Debut to Dynamite: Mixed Questions (54) | BTS from debut to Dynamite: a mixed round | A mixed BTS round from the 2013 debut to Dynamite: the first label, the debut single, the album with DNA, the Halsey feature and where J-Hope grew up. (150) |
| `how-well-do-you-know-about-bts-as-a-army` | BTS Hometowns, Solo Names and Collabs (48) | BTS hometowns, solo names and collabs | A fan made BTS quiz on details: the debut date, which members grew up in Busan and Daegu, Suga's solo name and the band behind My Universe. (139) |
| `only-true-army-can-pass-this-quiz` | BTS Before Debut: Underground Rap and Auditions (58) | BTS before debut: underground rap and auditions | Before the stage: RM's hip-hop crew, Suga's underground rap name, V's audition, Jimin's arts school and how Jin was cast. A harder pre-debut quiz for ARMY. (155) |

Series links:

- `ultimate-bts-era-quiz-only-real-armys-survive` links to [BTS quiz](/bts-quiz); [BTS From Debut to Dynamite: Mixed Questions](/q/bts-the-ultimate-quiz); [BTS Hometowns, Solo Names and Collabs](/q/how-well-do-you-know-about-bts-as-a-army); [BTS Before Debut: Underground Rap and Auditions](/q/only-true-army-can-pass-this-quiz)
- `bts-the-ultimate-quiz` links to [BTS quiz](/bts-quiz); [BTS Milestones by Era: Billboard to Daesang](/q/ultimate-bts-era-quiz-only-real-armys-survive); [BTS Hometowns, Solo Names and Collabs](/q/how-well-do-you-know-about-bts-as-a-army); [BTS Before Debut: Underground Rap and Auditions](/q/only-true-army-can-pass-this-quiz)
- `how-well-do-you-know-about-bts-as-a-army` links to [BTS quiz](/bts-quiz); [BTS Milestones by Era: Billboard to Daesang](/q/ultimate-bts-era-quiz-only-real-armys-survive); [BTS From Debut to Dynamite: Mixed Questions](/q/bts-the-ultimate-quiz); [BTS Before Debut: Underground Rap and Auditions](/q/only-true-army-can-pass-this-quiz)
- `only-true-army-can-pass-this-quiz` links to [BTS quiz](/bts-quiz); [BTS Milestones by Era: Billboard to Daesang](/q/ultimate-bts-era-quiz-only-real-armys-survive); [BTS From Debut to Dynamite: Mixed Questions](/q/bts-the-ultimate-quiz); [BTS Hometowns, Solo Names and Collabs](/q/how-well-do-you-know-about-bts-as-a-army)

### K10 · BLACKPINK · BLACKPINK true or false

Retitle (highest shared share 25%, below the 60% merge line). Shared questions: `blackpink-true-or-false` and `blackpink-true-or-false-1781311005` 25% (2/8).
Hub link: [BLACKPINK quiz](/blackpink-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `blackpink-true-or-false-think-you-know-everything` | BLACKPINK true or false - think you know everything? | roseeeyh | Player | 910 | 7 | 2026-03-14 |
| `blackpink-true-or-false` | BLACKPINK true or false | pinkvelvet | Team | 488 | 8 | 2026-03-27 |
| `blackpink-true-or-false-1781311005` | BLACKPINK True or False | kpopquizz | Player | 25 | 10 | 2026-06-13 |
| `blackpink-easy-quiz` | Blackpink easy quiz | jennie | Player | 2 | 10 | 2026-09-03 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `blackpink-true-or-false-think-you-know-everything` | BLACKPINK True or False: Charts and Coachella (56) | BLACKPINK true or false: charts, Coachella and origins | Decide what is true about BLACKPINK: their Hot 100 peak, the meaning of the name, the Coachella stage, Lisa's birthplace and the last member revealed. (150) |
| `blackpink-true-or-false` | BLACKPINK True or False: Members and Origins (55) | BLACKPINK true or false: the members and where they come from | True or false on the BLACKPINK members: who comes from Thailand and New Zealand, who debuted solo first, the label, the member count and the fandom name. (153) |
| `blackpink-true-or-false-1781311005` | BLACKPINK True or False for New BLINKs (49) | BLACKPINK true or false for new BLINKs | An easy BLACKPINK true or false round: the debut year, how many members, the first solo debut, the right fandom name and the Coachella first. Start here. (153) |
| `blackpink-easy-quiz` | BLACKPINK sant eller falskt: lätta medlemsfakta (58) | BLACKPINK sant eller falskt: lätta frågor om medlemmarna | Ett lätt BLACKPINK quiz på svenska. Sant eller falskt om Lisa, Jennie, Jisoo och Rosé: vem som är äldst, var de kommer ifrån och små fakta om gruppen. (150) |

Series links:

- `blackpink-true-or-false-think-you-know-everything` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK True or False: Members and Origins](/q/blackpink-true-or-false); [BLACKPINK True or False for New BLINKs](/q/blackpink-true-or-false-1781311005); [BLACKPINK sant eller falskt: lätta medlemsfakta](/q/blackpink-easy-quiz)
- `blackpink-true-or-false` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK True or False: Charts and Coachella](/q/blackpink-true-or-false-think-you-know-everything); [BLACKPINK True or False for New BLINKs](/q/blackpink-true-or-false-1781311005); [BLACKPINK sant eller falskt: lätta medlemsfakta](/q/blackpink-easy-quiz)
- `blackpink-true-or-false-1781311005` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK True or False: Charts and Coachella](/q/blackpink-true-or-false-think-you-know-everything); [BLACKPINK True or False: Members and Origins](/q/blackpink-true-or-false); [BLACKPINK sant eller falskt: lätta medlemsfakta](/q/blackpink-easy-quiz)
- `blackpink-easy-quiz` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK True or False: Charts and Coachella](/q/blackpink-true-or-false-think-you-know-everything); [BLACKPINK True or False: Members and Origins](/q/blackpink-true-or-false); [BLACKPINK True or False for New BLINKs](/q/blackpink-true-or-false-1781311005)

### K11 · BLACKPINK · BLACKPINK members

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BLACKPINK quiz](/blackpink-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `blackpink-members-quiz` | BLACKPINK members quiz | pinkvelvet | Team | 188 | 7 | 2026-04-04 |
| `blackpink-members-facts-do-you-really-know` | BLACKPINK members facts - do you really know them? | kpopquizz | Player | 21 | 5 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `blackpink-members-quiz` | BLACKPINK Members: Label, Debut and Origins (54) | BLACKPINK members: label, debut and origins | Start with the BLACKPINK members: how many there are, the label behind them, the debut year and single, and which member comes from Thailand. (141) |
| `blackpink-members-facts-do-you-really-know` | BLACKPINK Members: Positions, Roots and Dramas (57) | BLACKPINK members: positions, roots and dramas | Go further with the BLACKPINK members: where Jennie lived before training, Rosé's background, Jisoo's full name and drama role, and Lisa's position. (148) |

Series links:

- `blackpink-members-quiz` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Members: Positions, Roots and Dramas](/q/blackpink-members-facts-do-you-really-know)
- `blackpink-members-facts-do-you-really-know` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Members: Label, Debut and Origins](/q/blackpink-members-quiz)

### K12 · BLACKPINK · BLACKPINK solo careers

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BLACKPINK quiz](/blackpink-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `blackpink-solo-careers-deep-dive` | BLACKPINK solo careers deep dive | pinkvelvet | Team | 224 | 5 | 2026-04-05 |
| `blackpink-solo-careers-quiz` | BLACKPINK solo careers quiz - test your knowledge | kpopquizz | Player | 27 | 6 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `blackpink-solo-careers-deep-dive` | BLACKPINK Solo Debuts: SOLO to FLOWER (48) | BLACKPINK solo debuts: from SOLO to FLOWER | The BLACKPINK solo debuts one by one: Jennie's SOLO, Rosé's R single album, Lisa's LALISA and the viral MONEY video, and Jisoo's FLOWER. (136) |
| `blackpink-solo-careers-quiz` | BLACKPINK Solo Hits: LALISA, ME and APT. (51) | BLACKPINK solo hits: LALISA, ME and APT. | An easy round on BLACKPINK solo work: the first solo singles, Jisoo's album ME, the Money TikTok trend and Rosé's duet with Bruno Mars on APT. (142) |

Series links:

- `blackpink-solo-careers-deep-dive` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Solo Hits: LALISA, ME and APT.](/q/blackpink-solo-careers-quiz)
- `blackpink-solo-careers-quiz` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Solo Debuts: SOLO to FLOWER](/q/blackpink-solo-careers-deep-dive)

### K13 · BLACKPINK · BLACKPINK music videos

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BLACKPINK quiz](/blackpink-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `blackpink-guess-the-mv-from-the-screenshot` | BLACKPINK - Guess the MV from the screenshot | light_a_matz | Player | 29 | 20 | 2026-08-01 |
| `guess-the-blackpink-mv-by-the-photo` | Guess the BLACKPINK mv by the photo | blink_forever | Player | 4 | 7 | 2026-10-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `blackpink-guess-the-mv-from-the-screenshot` | Guess the BLACKPINK MV from a Screenshot (51) | Guess the BLACKPINK music video from a screenshot | A long picture round: name the BLACKPINK music video, group or solo, from one screenshot. From Playing With Fire and Kill This Love to Shut Down and Jump. (154) |
| `guess-the-blackpink-mv-by-the-photo` | Guess the BLACKPINK MV: A Short Photo Round (54) | Guess the BLACKPINK MV: a short photo round | A short BLACKPINK photo round with the fan's own hints: name the music video from one picture, from As If It's Your Last to Lovesick Girls and Shut Down. (153) |

Series links:

- `blackpink-guess-the-mv-from-the-screenshot` links to [BLACKPINK quiz](/blackpink-quiz); [Guess the BLACKPINK MV: A Short Photo Round](/q/guess-the-blackpink-mv-by-the-photo)
- `guess-the-blackpink-mv-by-the-photo` links to [BLACKPINK quiz](/blackpink-quiz); [Guess the BLACKPINK MV from a Screenshot](/q/blackpink-guess-the-mv-from-the-screenshot)

### K14 · BLACKPINK · BLACKPINK discography and title tracks

Retitle (highest shared share 20%, below the 60% merge line). Shared questions: `blackpink-discography-deep-dive` and `blackpink-title-tracks-challenge` 20% (1/5).
Hub link: [BLACKPINK quiz](/blackpink-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `blackpink-discography-deep-dive` | BLACKPINK discography deep dive | pinkvelvet | Team | 363 | 6 | 2026-04-08 |
| `blackpink-title-tracks-challenge` | BLACKPINK title tracks challenge | kpopquizz | Player | 14 | 5 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `blackpink-discography-deep-dive` | BLACKPINK Discography: THE ALBUM to BORN PINK (56) | BLACKPINK discography: from THE ALBUM to BORN PINK | Test the BLACKPINK discography: the first full album, the second studio album, the first K-pop group MV to pass a billion views and early solo singles. (151) |
| `blackpink-title-tracks-challenge` | BLACKPINK Title Tracks: Albums and Release Years (59) | BLACKPINK title tracks: albums and release years | Place the BLACKPINK title tracks: which album holds Lovesick Girls and Shut Down, when Playing With Fire came out and which song first topped a US chart. (153) |

Series links:

- `blackpink-discography-deep-dive` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Title Tracks: Albums and Release Years](/q/blackpink-title-tracks-challenge)
- `blackpink-title-tracks-challenge` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Discography: THE ALBUM to BORN PINK](/q/blackpink-discography-deep-dive)

### K15 · BLACKPINK · BLACKPINK general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BLACKPINK quiz](/blackpink-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `blackpink-ultimate-fan-challenge` | BLACKPINK ultimate fan challenge | roseeeyh | Player | 1718 | 8 | 2026-03-11 |
| `blackpink` | Blackpink | hii | Player | 73 | 4 | 2026-09-08 |
| `are-you-a-true-blink-blackpink-trivia` | Are you a true BLINK? BLACKPINK trivia | kpopquizz | Player | 43 | 6 | 2026-03-26 |
| `quiz-for-baby-blinks-to-learn-about-blackpink` | Quiz for Baby Blinks to learn about blackpink | freya | Player | 9 | 7 | 2026-07-02 |
| `only-for-blinks` | only for blinks | harshika116 | Player | 5 | 3 | 2026-07-09 |
| `blackpink-fan-quiz` | Blackpink quiz | kpopfanprek | Player | 5 | 3 | 2026-10-25 |
| `hardest-blackpink-quiz` | HARDEST BLACKPINK QUIZ!!! | kpop_life | Player | 4 | 15 | 2026-10-14 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `blackpink-ultimate-fan-challenge` | BLACKPINK Fan Facts: Lightstick, Records, Brands (59) | BLACKPINK fan facts: the lightstick, the records and the brands | For BLINKs who follow everything: the lightstick's name, the training years, a YouTube record, the Netflix documentary and the brands the members represent. (156) |
| `blackpink` | BLACKPINK Basics: Debut, Label and Anniversary (57) | BLACKPINK basics: debut, label and anniversary | A short picture quiz on BLACKPINK basics: the debut year, the member who grew up in New Zealand, the company behind the group and the tenth anniversary. (152) |
| `are-you-a-true-blink-blackpink-trivia` | BLACKPINK Debut Day: Boombayah, Whistle and YG (57) | BLACKPINK debut day: Boombayah, Whistle and YG | Back to the start of BLACKPINK: the debut date, the two debut songs, the label, the member count, the fandom name and the member from Thailand. (143) |
| `quiz-for-baby-blinks-to-learn-about-blackpink` | BLACKPINK for Baby BLINKs: Duos, Nicknames, MVs (58) | BLACKPINK for baby BLINKs: duos, nicknames and MVs | A fan made BLACKPINK quiz for new BLINKs: where Jennie is from, the fan duo names, the Boombayah views milestone and a few fandom in-jokes to learn. (148) |
| `only-for-blinks` | BLACKPINK Members by Age: Oldest and Youngest (56) | BLACKPINK members by age: oldest and youngest | A very short BLACKPINK quiz: who is the oldest member, who is the youngest and which member fans call the golden voice. Three questions, one minute. (148) |
| `blackpink-fan-quiz` | BLACKPINK Nicknames and Roles: A Quick Round (55) | BLACKPINK nicknames and roles: a quick round | A quick BLACKPINK round on the members: who grew up in Australia, which member fans call Sooya and who holds the main dancer role in the group. (143) |
| `hardest-blackpink-quiz` | BLACKPINK Deep Details: Auditions and Producers (58) | BLACKPINK deep details: auditions, ad-libs and producers | A hard BLACKPINK quiz on small details: who says the ad-lib in Boombayah, where Rosé auditioned, the producer's voice in the intro and the bonus CD track. (154) |

Series links:

- `blackpink-ultimate-fan-challenge` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Basics: Debut, Label and Anniversary](/q/blackpink); [BLACKPINK Debut Day: Boombayah, Whistle and YG](/q/are-you-a-true-blink-blackpink-trivia); [BLACKPINK for Baby BLINKs: Duos, Nicknames, MVs](/q/quiz-for-baby-blinks-to-learn-about-blackpink)
- `blackpink` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Fan Facts: Lightstick, Records, Brands](/q/blackpink-ultimate-fan-challenge); [BLACKPINK Debut Day: Boombayah, Whistle and YG](/q/are-you-a-true-blink-blackpink-trivia); [BLACKPINK for Baby BLINKs: Duos, Nicknames, MVs](/q/quiz-for-baby-blinks-to-learn-about-blackpink)
- `are-you-a-true-blink-blackpink-trivia` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Fan Facts: Lightstick, Records, Brands](/q/blackpink-ultimate-fan-challenge); [BLACKPINK Basics: Debut, Label and Anniversary](/q/blackpink); [BLACKPINK for Baby BLINKs: Duos, Nicknames, MVs](/q/quiz-for-baby-blinks-to-learn-about-blackpink)
- `quiz-for-baby-blinks-to-learn-about-blackpink` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Fan Facts: Lightstick, Records, Brands](/q/blackpink-ultimate-fan-challenge); [BLACKPINK Basics: Debut, Label and Anniversary](/q/blackpink); [BLACKPINK Debut Day: Boombayah, Whistle and YG](/q/are-you-a-true-blink-blackpink-trivia)
- `only-for-blinks` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Fan Facts: Lightstick, Records, Brands](/q/blackpink-ultimate-fan-challenge); [BLACKPINK Basics: Debut, Label and Anniversary](/q/blackpink); [BLACKPINK Debut Day: Boombayah, Whistle and YG](/q/are-you-a-true-blink-blackpink-trivia)
- `blackpink-fan-quiz` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Fan Facts: Lightstick, Records, Brands](/q/blackpink-ultimate-fan-challenge); [BLACKPINK Basics: Debut, Label and Anniversary](/q/blackpink); [BLACKPINK Debut Day: Boombayah, Whistle and YG](/q/are-you-a-true-blink-blackpink-trivia)
- `hardest-blackpink-quiz` links to [BLACKPINK quiz](/blackpink-quiz); [BLACKPINK Fan Facts: Lightstick, Records, Brands](/q/blackpink-ultimate-fan-challenge); [BLACKPINK Basics: Debut, Label and Anniversary](/q/blackpink); [BLACKPINK Debut Day: Boombayah, Whistle and YG](/q/are-you-a-true-blink-blackpink-trivia)

### K16 · Stray Kids · Stray Kids true or false

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Stray Kids quiz](/stray-kids-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `skz-true-or-false-only-real-stays-pass` | SKZ true or false - only real STAYs pass | mapple | Player | 2118 | 8 | 2026-03-16 |
| `stray-kids-true-or-false` | Stray Kids true or false | skzrealm | Team | 526 | 7 | 2026-03-27 |
| `true-or-false-stray-kids-quiz` | True or false stray kids quiz | stray_engenes914 | Player | 64 | 5 | 2026-05-31 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `skz-true-or-false-only-real-stays-pass` | Stray Kids True or False: Lineup and 3RACHA (54) | Stray Kids true or false: the lineup and 3RACHA | True or false on Stray Kids: the original lineup, Bang Chan and Felix's Australian roots, the Kingdom result, 3RACHA and where the name STAY comes from. (152) |
| `stray-kids-true-or-false` | Stray Kids True or False: Survival Show to Debut (59) | Stray Kids true or false: from the survival show to debut | Easy true or false statements on how Stray Kids began: the JYP survival show, the label, 3RACHA's members, the member count and who comes from Australia. (153) |
| `true-or-false-stray-kids-quiz` | Stray Kids True or False: Real Names and Voices (58) | Stray Kids true or false: real names and voices | A short fan made Stray Kids true or false round: I.N's real name, Felix's voice, who is youngest in 3RACHA, the member who left and the fandom name. (148) |

Series links:

- `skz-true-or-false-only-real-stays-pass` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids True or False: Survival Show to Debut](/q/stray-kids-true-or-false); [Stray Kids True or False: Real Names and Voices](/q/true-or-false-stray-kids-quiz)
- `stray-kids-true-or-false` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids True or False: Lineup and 3RACHA](/q/skz-true-or-false-only-real-stays-pass); [Stray Kids True or False: Real Names and Voices](/q/true-or-false-stray-kids-quiz)
- `true-or-false-stray-kids-quiz` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids True or False: Lineup and 3RACHA](/q/skz-true-or-false-only-real-stays-pass); [Stray Kids True or False: Survival Show to Debut](/q/stray-kids-true-or-false)

### K17 · Stray Kids · Stray Kids members facts

Retitle (highest shared share 40%, below the 60% merge line). Shared questions: `stray-kids-members-deep-knowledge` and `how-well-do-you-know-skz-members` 40% (2/5).
Hub link: [Stray Kids quiz](/stray-kids-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `stray-kids-members-deep-knowledge` | Stray Kids members deep knowledge | skzrealm | Team | 675 | 5 | 2026-03-25 |
| `stray-kids-know-each-member` | Stray Kids - know each member | skzrealm | Team | 493 | 6 | 2026-04-11 |
| `how-well-do-you-know-skz-members` | How well do you know SKZ members? | kpopquizz | Player | 222 | 5 | 2026-03-26 |
| `stray-kids-members-quiz` | Stray kids members quiz | arianna | Player | 34 | 8 | 2026-08-06 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `stray-kids-members-deep-knowledge` | Stray Kids Members: Chan's Room to the Maknae (56) | Stray Kids members: from Chan's Room to the maknae | Who hosts Chan's Room, which members grew up in Australia, who is the oldest and who is the maknae? An easy Stray Kids members quiz for new STAYs. (146) |
| `stray-kids-know-each-member` | Stray Kids Members: Roles, Real Names, Hobbies (57) | Stray Kids members: roles, real names and hobbies | Get to know each Stray Kids member: Changbin's rap, Hyunjin's dance, Lee Know's cats, Seungmin's baseball and the real names of Han and I.N. (140) |
| `how-well-do-you-know-skz-members` | Stray Kids Members for New STAYs (43) | Stray Kids members for new STAYs | A first Stray Kids members quiz: the leader, the maknae, the two Australian members, Felix's trademark and the member who danced as a backup dancer. (148) |
| `stray-kids-members-quiz` | Stray Kids Members and MVs: A Fan Made Round (55) | Stray Kids members and MVs: a fan made round | A fan made Stray Kids round mixing members and music: the leader, the youngest, the first song, the most viewed MV and a few fandom favorites. (142) |

Series links:

- `stray-kids-members-deep-knowledge` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Members: Roles, Real Names, Hobbies](/q/stray-kids-know-each-member); [Stray Kids Members for New STAYs](/q/how-well-do-you-know-skz-members); [Stray Kids Members and MVs: A Fan Made Round](/q/stray-kids-members-quiz)
- `stray-kids-know-each-member` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Members: Chan's Room to the Maknae](/q/stray-kids-members-deep-knowledge); [Stray Kids Members for New STAYs](/q/how-well-do-you-know-skz-members); [Stray Kids Members and MVs: A Fan Made Round](/q/stray-kids-members-quiz)
- `how-well-do-you-know-skz-members` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Members: Chan's Room to the Maknae](/q/stray-kids-members-deep-knowledge); [Stray Kids Members: Roles, Real Names, Hobbies](/q/stray-kids-know-each-member); [Stray Kids Members and MVs: A Fan Made Round](/q/stray-kids-members-quiz)
- `stray-kids-members-quiz` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Members: Chan's Room to the Maknae](/q/stray-kids-members-deep-knowledge); [Stray Kids Members: Roles, Real Names, Hobbies](/q/stray-kids-know-each-member); [Stray Kids Members for New STAYs](/q/how-well-do-you-know-skz-members)

### K18 · Stray Kids · Guess the Stray Kids member

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Stray Kids quiz](/stray-kids-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `guess-the-skz-member-from-clues` | Guess the SKZ member from clues | mapple | Player | 595 | 6 | 2026-03-21 |
| `stray-kids-guess-the-member-quiz-part-1` | Stray Kids: Guess the member Quiz Part-1 | drunken_spillz | Player | 148 | 9 | 2026-06-18 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `guess-the-skz-member-from-clues` | Guess the Stray Kids Member from Three Clues (55) | Guess the Stray Kids member from three clues | Read three clues and name the Stray Kids member: rap aliases, training years, dance roles and backgrounds. Each clue narrows it down, can you get it early? (155) |
| `stray-kids-guess-the-member-quiz-part-1` | Guess the Stray Kids Member: Likes and Dislikes (58) | Guess the Stray Kids member: likes and dislikes | Which Stray Kids member hates coffee, avoids horror films or has the biggest appetite? Guess the member from the habits STAYs know from content. (144) |

Series links:

- `guess-the-skz-member-from-clues` links to [Stray Kids quiz](/stray-kids-quiz); [Guess the Stray Kids Member: Likes and Dislikes](/q/stray-kids-guess-the-member-quiz-part-1)
- `stray-kids-guess-the-member-quiz-part-1` links to [Stray Kids quiz](/stray-kids-quiz); [Guess the Stray Kids Member from Three Clues](/q/guess-the-skz-member-from-clues)

### K19 · Stray Kids · Stray Kids discography

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Stray Kids quiz](/stray-kids-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `stray-kids-albums-and-b-sides-deep-dive` | Stray Kids albums and B-sides deep dive | mapple | Player | 1192 | 7 | 2026-03-12 |
| `stray-kids-discography-challenge` | Stray Kids discography challenge | kpopquizz | Player | 222 | 6 | 2026-03-26 |
| `stray-kids-discography-test` | Stray Kids discography test | skzrealm | Team | 212 | 6 | 2026-04-11 |
| `stray-kids-song-sorter-what-album-is-it-from` | Stray Kids Song Sorter: What Album Is It From? | chuuchaos | Player | 45 | 15 | 2026-06-02 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `stray-kids-albums-and-b-sides-deep-dive` | Stray Kids Albums and B-sides: ODDINARY to ATE (57) | Stray Kids albums and B-sides: from ODDINARY to ATE | Match Stray Kids tracks to their albums: Muddy Water, Thunderous, CASE 143, Lalalala and Chk Chk Boom, plus the pre-debut single Hellevator. (140) |
| `stray-kids-discography-challenge` | Stray Kids Title Tracks: District 9 to S-Class (57) | Stray Kids title tracks: from District 9 to S-Class | An easy Stray Kids title track quiz: the debut track, the breakthrough hit, where MANIAC and S-Class belong and the Korean title of Thunderous. (143) |
| `stray-kids-discography-test` | Stray Kids Discography: GO LIVE to 5-STAR (52) | Stray Kids discography: from GO LIVE to 5-STAR | Test the Stray Kids discography milestones: the debut song, the first full studio album GO LIVE, God's Menu, 3RACHA and the first Billboard 200 number one. (155) |
| `stray-kids-song-sorter-what-album-is-it-from` | Stray Kids Song Sorter: B-sides to Albums (52) | Stray Kids song sorter: put each B-side in its album | A long Stray Kids sorting round: read a song title and pick its album, from Clé 1: MIROH and NOEASY to GO LIVE, 5-STAR and the Japanese release The Sound. (154) |

Series links:

- `stray-kids-albums-and-b-sides-deep-dive` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Title Tracks: District 9 to S-Class](/q/stray-kids-discography-challenge); [Stray Kids Discography: GO LIVE to 5-STAR](/q/stray-kids-discography-test); [Stray Kids Song Sorter: B-sides to Albums](/q/stray-kids-song-sorter-what-album-is-it-from)
- `stray-kids-discography-challenge` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Albums and B-sides: ODDINARY to ATE](/q/stray-kids-albums-and-b-sides-deep-dive); [Stray Kids Discography: GO LIVE to 5-STAR](/q/stray-kids-discography-test); [Stray Kids Song Sorter: B-sides to Albums](/q/stray-kids-song-sorter-what-album-is-it-from)
- `stray-kids-discography-test` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Albums and B-sides: ODDINARY to ATE](/q/stray-kids-albums-and-b-sides-deep-dive); [Stray Kids Title Tracks: District 9 to S-Class](/q/stray-kids-discography-challenge); [Stray Kids Song Sorter: B-sides to Albums](/q/stray-kids-song-sorter-what-album-is-it-from)
- `stray-kids-song-sorter-what-album-is-it-from` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Albums and B-sides: ODDINARY to ATE](/q/stray-kids-albums-and-b-sides-deep-dive); [Stray Kids Title Tracks: District 9 to S-Class](/q/stray-kids-discography-challenge); [Stray Kids Discography: GO LIVE to 5-STAR](/q/stray-kids-discography-test)

### K20 · Stray Kids · Guess the Stray Kids song

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Stray Kids quiz](/stray-kids-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `stray-kids-guess-the-song-quiz` | Stray Kids: Guess the Song Quiz | drunken_spillz | Player | 122 | 6 | 2026-06-18 |
| `guess-the-stray-kids-song-by-the-lyrics` | guess the stray kids song by the lyrics | stay | Player | 12 | 9 | 2026-10-24 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `stray-kids-guess-the-song-quiz` | Stray Kids Song Trivia: Versions, Units, MVs (55) | Stray Kids song trivia: versions, units and MVs | Spot the odd song out in Stray Kids trivia: B-sides without an MV, unit pairings, Japanese and English versions and the tracks on HAN-POP. (138) |
| `guess-the-stray-kids-song-by-the-lyrics` | Guess the Stray Kids Song from a Line (48) | Guess the Stray Kids song from one line | A fan made Stray Kids round in Korean, Japanese and English: read one short line and name the song, from THIS and THAT and GIANT to the Tower of God opening. (157) |

Series links:

- `stray-kids-guess-the-song-quiz` links to [Stray Kids quiz](/stray-kids-quiz); [Guess the Stray Kids Song from a Line](/q/guess-the-stray-kids-song-by-the-lyrics)
- `guess-the-stray-kids-song-by-the-lyrics` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Song Trivia: Versions, Units, MVs](/q/stray-kids-guess-the-song-quiz)

### K21 · Stray Kids · Stray Kids general fan test

Retitle (highest shared share 33%, below the 60% merge line). Shared questions: `stray-kids-basics` and `only-real-stays-can-ace-stray-kids-quiz` 33% (2/6); `only-real-stays-can-ace-stray-kids-quiz` and `stray-kids-quiz-for-real-stays` 17% (1/6).
Hub link: [Stray Kids quiz](/stray-kids-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `stray-kids-basics` | Stray Kids basics | skzrealm | Team | 1348 | 7 | 2026-04-06 |
| `only-real-stays-can-ace-stray-kids-quiz` | Only real STAYs can ace this Stray Kids quiz | kpopquizz | Player | 176 | 6 | 2026-03-26 |
| `are-a-real-stay` | are a real stay? | skz_johayo | Player | 112 | 3 | 2026-09-26 |
| `a-straykids-quiz` | A Straykids Quiz | talentless_stay | Player | 77 | 14 | 2026-08-25 |
| `only-the-real-stays-can-get-all-right` | Only the real stays can get all right | soleil_912 | Player | 45 | 10 | 2026-10-18 |
| `skz-quiz` | SKZ QUIZ | jini_yaaa | Player | 36 | 6 | 2026-09-02 |
| `stray-kids-quiz-for-real-stays` | Stray kids quiz for real Stays | hyunlix_and_minsung | Player | 17 | 9 | 2026-10-16 |
| `quiz-skz` | Quiz Skz | stay4ever_ot8 | Player | 3 | 5 | 2026-07-14 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `stray-kids-basics` | Stray Kids Basics: Label, Leader and Debut Year (58) | Stray Kids basics: label, leader and debut year | Start here with Stray Kids: the label, the leader, the member count, the fandom name, the debut year and the member with the deep voice. Easy for new STAYs. (156) |
| `only-real-stays-can-ace-stray-kids-quiz` | Stray Kids Origins: Debut Date, 3RACHA, the Show (59) | Stray Kids origins: the debut date, 3RACHA and the show | How did Stray Kids start? The exact debut date, the label, the producing unit 3RACHA, the member count and the reality show that formed the group. (146) |
| `are-a-real-stay` | Stray Kids Speed Round: Leader, Debut, Birthday (58) | Stray Kids speed round: leader, debut and a birthday | Three quick Stray Kids questions for STAYs: who leads the group, which year they started and when Felix was born. A fast warm-up before longer quizzes. (151) |
| `a-straykids-quiz` | Stray Kids Members, Nicknames and Pets (49) | Stray Kids members, nicknames and pets | A longer fan made Stray Kids quiz: the oldest member, the maknae, the member count, the former backup dancer, I.N's nicknames and Hyunjin's dog. (144) |
| `only-the-real-stays-can-get-all-right` | Stray Kids Units: 3RACHA, DanceRacha, VocalRacha (59) | Stray Kids units: 3RACHA, DanceRacha and VocalRacha | Who is in 3RACHA, DanceRacha and VocalRacha? Sort the Stray Kids members into their units, then check birthdays and who grew up in Australia. (141) |
| `skz-quiz` | Guess the Stray Kids Member: Pets and Habits (55) | Guess the Stray Kids member: pets and habits | An easy clue round on Stray Kids: name the member who loves pudding, keeps lizards or has a dog called Kkami, and the unit fans call Paboracha. (143) |
| `stray-kids-quiz-for-real-stays` | Stray Kids Pre-Debut and Lineup History (50) | Stray Kids pre-debut and lineup history | From Hellevator to today: the Stray Kids debut date, the pre-debut song, the DanceRacha members, the member who left and the former BTS backup dancer. (150) |
| `quiz-skz` | Stray Kids: zgadnij biasa i ulubione piosenki (56) | Stray Kids: zgadnij mojego biasa i ulubione piosenki | Osobisty quiz o Stray Kids po polsku: zgadnij, kto jest biasem autora, jakie piosenki z MAXIDENT lubi najbardziej i jaki album chce kupić jako następny. (152) |

Series links:

- `stray-kids-basics` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Origins: Debut Date, 3RACHA, the Show](/q/only-real-stays-can-ace-stray-kids-quiz); [Stray Kids Speed Round: Leader, Debut, Birthday](/q/are-a-real-stay); [Stray Kids Members, Nicknames and Pets](/q/a-straykids-quiz)
- `only-real-stays-can-ace-stray-kids-quiz` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Basics: Label, Leader and Debut Year](/q/stray-kids-basics); [Stray Kids Speed Round: Leader, Debut, Birthday](/q/are-a-real-stay); [Stray Kids Members, Nicknames and Pets](/q/a-straykids-quiz)
- `are-a-real-stay` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Basics: Label, Leader and Debut Year](/q/stray-kids-basics); [Stray Kids Origins: Debut Date, 3RACHA, the Show](/q/only-real-stays-can-ace-stray-kids-quiz); [Stray Kids Members, Nicknames and Pets](/q/a-straykids-quiz)
- `a-straykids-quiz` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Basics: Label, Leader and Debut Year](/q/stray-kids-basics); [Stray Kids Origins: Debut Date, 3RACHA, the Show](/q/only-real-stays-can-ace-stray-kids-quiz); [Stray Kids Speed Round: Leader, Debut, Birthday](/q/are-a-real-stay)
- `only-the-real-stays-can-get-all-right` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Basics: Label, Leader and Debut Year](/q/stray-kids-basics); [Stray Kids Origins: Debut Date, 3RACHA, the Show](/q/only-real-stays-can-ace-stray-kids-quiz); [Stray Kids Speed Round: Leader, Debut, Birthday](/q/are-a-real-stay)
- `skz-quiz` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Basics: Label, Leader and Debut Year](/q/stray-kids-basics); [Stray Kids Origins: Debut Date, 3RACHA, the Show](/q/only-real-stays-can-ace-stray-kids-quiz); [Stray Kids Speed Round: Leader, Debut, Birthday](/q/are-a-real-stay)
- `stray-kids-quiz-for-real-stays` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Basics: Label, Leader and Debut Year](/q/stray-kids-basics); [Stray Kids Origins: Debut Date, 3RACHA, the Show](/q/only-real-stays-can-ace-stray-kids-quiz); [Stray Kids Speed Round: Leader, Debut, Birthday](/q/are-a-real-stay)
- `quiz-skz` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Basics: Label, Leader and Debut Year](/q/stray-kids-basics); [Stray Kids Origins: Debut Date, 3RACHA, the Show](/q/only-real-stays-can-ace-stray-kids-quiz); [Stray Kids Speed Round: Leader, Debut, Birthday](/q/are-a-real-stay)

### K22 · Stray Kids · Lee Know quiz series

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Stray Kids quiz](/stray-kids-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `stray-kids-lee-know-quiz-part-1` | Stray Kids Lee Know Quiz Part-1 | drunken_spillz | Player | 292 | 11 | 2026-06-17 |
| `stray-kids-lee-know-quiz-part-2` | Stray Kids Lee Know Quiz Part-2 | drunken_spillz | Player | 77 | 10 | 2026-06-17 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `stray-kids-lee-know-quiz-part-1` | Stray Kids Lee Know Part 1: Roles and Nicknames (58) | Stray Kids Lee Know quiz, part 1: roles and nicknames | Part 1 of a Lee Know quiz: his position in Stray Kids, his live streams, his time as a music show MC, his nicknames and his favorite dessert. (141) |
| `stray-kids-lee-know-quiz-part-2` | Stray Kids Lee Know Part 2: SKZOO and Hobbies (56) | Stray Kids Lee Know quiz, part 2: SKZOO and hobbies | Part 2 of the Lee Know quiz: his SKZOO character, the luxury brand he represents, his hobbies, his family's cats and his Korean zodiac year. (140) |

Series links:

- `stray-kids-lee-know-quiz-part-1` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Lee Know Part 2: SKZOO and Hobbies](/q/stray-kids-lee-know-quiz-part-2)
- `stray-kids-lee-know-quiz-part-2` links to [Stray Kids quiz](/stray-kids-quiz); [Stray Kids Lee Know Part 1: Roles and Nicknames](/q/stray-kids-lee-know-quiz-part-1)

### K23 · TWICE · TWICE true or false

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [TWICE quiz](/twice-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `twice-true-or-false` | TWICE true or false | twiceland | Team | 608 | 7 | 2026-04-04 |
| `twice-true-or-false-test-your-once-knowledge` | TWICE true or false - test your ONCE knowledge | sanda | Player | 330 | 7 | 2026-03-19 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `twice-true-or-false` | TWICE True or False: Lineup, Label and Debut (55) | TWICE true or false: lineup, label and debut | True or false on TWICE basics: how many members, which show formed them, how many come from Japan, the label, Tzuyu's home and the real debut song. (147) |
| `twice-true-or-false-test-your-once-knowledge` | TWICE True or False: Sixteen and Trainee Years (57) | TWICE true or false: Sixteen and the trainee years | Judge TWICE facts from before and after debut: Jihyo's training years, Momo's return on Sixteen, the first English single and the three home countries. (151) |

Series links:

- `twice-true-or-false` links to [TWICE quiz](/twice-quiz); [TWICE True or False: Sixteen and Trainee Years](/q/twice-true-or-false-test-your-once-knowledge)
- `twice-true-or-false-test-your-once-knowledge` links to [TWICE quiz](/twice-quiz); [TWICE True or False: Lineup, Label and Debut](/q/twice-true-or-false)

### K24 · TWICE · TWICE members

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [TWICE quiz](/twice-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `twice-members-once-test` | TWICE members - Once test | twiceland | Team | 434 | 7 | 2026-03-28 |
| `twice-members-facts-quiz` | TWICE members facts quiz | kpopquizz | Player | 66 | 5 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `twice-members-once-test` | TWICE Members: Sixteen, JYP and the Debut Year (57) | TWICE members: Sixteen, JYP and the debut year | An easy TWICE members quiz: the member count, the label, the survival show Sixteen, the fandom name, the debut year and the Japanese member known as shy. (153) |
| `twice-members-facts-quiz` | TWICE Members: Solos, Dance and Ballet Roots (55) | TWICE members: solos, dance and ballet roots | Learn the TWICE members by their stories: Nayeon's first solo and POP!, Momo's dance, Mina's ballet background and Dahyun's eagle dance on Sixteen. (147) |

Series links:

- `twice-members-once-test` links to [TWICE quiz](/twice-quiz); [TWICE Members: Solos, Dance and Ballet Roots](/q/twice-members-facts-quiz)
- `twice-members-facts-quiz` links to [TWICE quiz](/twice-quiz); [TWICE Members: Sixteen, JYP and the Debut Year](/q/twice-members-once-test)

### K25 · TWICE · TWICE discography

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [TWICE quiz](/twice-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `twice-discography-quiz` | TWICE discography quiz | twiceland | Team | 311 | 6 | 2026-03-23 |
| `twice-title-tracks-challenge-name-that-song` | TWICE title tracks challenge - name that song | kpopquizz | Player | 114 | 6 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `twice-discography-quiz` | TWICE Discography: Cheer Up, TT and Twicetagram (58) | TWICE discography: Cheer Up, TT and Twicetagram | The TWICE songs everyone knows: the shy shy shy hit, the crying face dance in TT, the first full album Twicetagram and Nayeon's solo POP!. (138) |
| `twice-title-tracks-challenge-name-that-song` | TWICE Title Tracks: Like Ooh-Ahh to The Feels (56) | TWICE title tracks: from Like Ooh-Ahh to The Feels | Name the TWICE title tracks across eras: the debut song, the meaning of TT, the mature turn with Fancy, the Feel Special year and the first English single. (155) |

Series links:

- `twice-discography-quiz` links to [TWICE quiz](/twice-quiz); [TWICE Title Tracks: Like Ooh-Ahh to The Feels](/q/twice-title-tracks-challenge-name-that-song)
- `twice-title-tracks-challenge-name-that-song` links to [TWICE quiz](/twice-quiz); [TWICE Discography: Cheer Up, TT and Twicetagram](/q/twice-discography-quiz)

### K26 · TWICE · TWICE Japanese discography

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [TWICE quiz](/twice-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `twice-japanese-discography-and-tours-quiz` | TWICE Japanese discography and tours quiz | sanda | Player | 390 | 7 | 2026-03-13 |
| `twice-japanese-discography` | TWICE Japanese discography | twiceland | Team | 91 | 5 | 2026-04-05 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `twice-japanese-discography-and-tours-quiz` | TWICE in Japan: Singles, Albums and Dome Tours (57) | TWICE in Japan: singles, albums and dome tours | Test what you know about TWICE in Japan: the first original Japanese single, &TWICE, Candy Pop, the compilation #TWICE and their first dome tour. (145) |
| `twice-japanese-discography` | TWICE Japan Line: Hometowns and Candy Pop (52) | TWICE Japan line: hometowns and Candy Pop | A short quiz on TWICE's Japanese side: the hit Candy Pop, the three Japanese members and the cities Momo, Sana and Mina come from. (130) |

Series links:

- `twice-japanese-discography-and-tours-quiz` links to [TWICE quiz](/twice-quiz); [TWICE Japan Line: Hometowns and Candy Pop](/q/twice-japanese-discography)
- `twice-japanese-discography` links to [TWICE quiz](/twice-quiz); [TWICE in Japan: Singles, Albums and Dome Tours](/q/twice-japanese-discography-and-tours-quiz)

### K27 · TWICE · TWICE general fan test

Retitle (highest shared share 25%, below the 60% merge line). Shared questions: `once-check-how-well-do-you-know-twice` and `once-test` 25% (1/4).
Hub link: [TWICE quiz](/twice-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `once-check-how-well-do-you-know-twice` | ONCE check - how well do you know TWICE? | kpopquizz | Player | 37 | 6 | 2026-03-26 |
| `once-test` | once test | isshealive | Player | 17 | 4 | 2026-08-10 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `once-check-how-well-do-you-know-twice` | TWICE Basics for New ONCEs (37) | TWICE basics for new ONCEs | An easy TWICE basics quiz: how many members, the survival show, the label, the leader, how many Japanese members and which member is from Taiwan. (145) |
| `once-test` | TWICE Quick Round: Leader, Ages, Jihyo Solo (54) | TWICE quick round: the leader, the ages and Jihyo's solo | Four quick TWICE questions from a ONCE: who leads the group, the oldest and youngest members, Jihyo's first solo song and the TWICE debut song. (143) |

Series links:

- `once-check-how-well-do-you-know-twice` links to [TWICE quiz](/twice-quiz); [TWICE Quick Round: Leader, Ages, Jihyo Solo](/q/once-test)
- `once-test` links to [TWICE quiz](/twice-quiz); [TWICE Basics for New ONCEs](/q/once-check-how-well-do-you-know-twice)

### K28 · aespa · aespa true or false

Retitle (highest shared share 29%, below the 60% merge line). Shared questions: `aespa-true-or-false-think-you-know-my-girls` and `aespa-true-or-false` 29% (2/7).
Hub link: [aespa quiz](/aespa-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `aespa-true-or-false-think-you-know-my-girls` | aespa true or false - think you know MY girls? | winny | Player | 249 | 7 | 2026-03-22 |
| `aespa-true-or-false` | aespa true or false | soojinnie | Team | 173 | 7 | 2026-04-13 |
| `only-a-real-my-can-pass-this` | ONLY A REAL MY CAN PASS THIS!!!! | fearnot | Player | 25 | 5 | 2026-09-27 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `aespa-true-or-false-think-you-know-my-girls` | aespa True or False: Members and ae Avatars (54) | aespa true or false: the members and their ae avatars | True or false on aespa: the oldest member, the member count, NingNing's languages, Giselle's background, the debut year and the ae avatars. (139) |
| `aespa-true-or-false` | aespa True or False: Debut, KWANGYA, Origins (55) | aespa true or false: debut, KWANGYA and origins | Check your aespa facts: the label, the member count, where NingNing and Giselle come from, the real debut song and the KWANGYA concept. (135) |
| `only-a-real-my-can-pass-this` | aespa True or False: Reveal Order and Albums (55) | aespa true or false: reveal order and albums | A short, harder aespa true or false: who is the maknae, who is the eldest, which member was revealed first, the label and the 2021 mini album title. (148) |

Series links:

- `aespa-true-or-false-think-you-know-my-girls` links to [aespa quiz](/aespa-quiz); [aespa True or False: Debut, KWANGYA, Origins](/q/aespa-true-or-false); [aespa True or False: Reveal Order and Albums](/q/only-a-real-my-can-pass-this)
- `aespa-true-or-false` links to [aespa quiz](/aespa-quiz); [aespa True or False: Members and ae Avatars](/q/aespa-true-or-false-think-you-know-my-girls); [aespa True or False: Reveal Order and Albums](/q/only-a-real-my-can-pass-this)
- `only-a-real-my-can-pass-this` links to [aespa quiz](/aespa-quiz); [aespa True or False: Members and ae Avatars](/q/aespa-true-or-false-think-you-know-my-girls); [aespa True or False: Debut, KWANGYA, Origins](/q/aespa-true-or-false)

### K29 · aespa · aespa discography

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [aespa quiz](/aespa-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `aespa-b-sides-and-deep-cuts-quiz` | aespa B-sides and deep cuts quiz | winny | Player | 542 | 7 | 2026-03-14 |
| `aespa-discography-quiz` | aespa discography quiz | soojinnie | Team | 325 | 5 | 2026-04-09 |
| `aespa-discography-challenge` | aespa discography challenge | kpopquizz | Player | 41 | 5 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `aespa-b-sides-and-deep-cuts-quiz` | aespa B-sides: Yeppi Yeppi to Live My Life (53) | aespa B-sides: from Yeppi Yeppi to Live My Life | Beyond the title tracks: match aespa B-sides like Yeppi Yeppi, Illusion and Live My Life to their releases, and name the first song aespa ever put out. (151) |
| `aespa-discography-quiz` | aespa Discography: Next Level to Supernova (53) | aespa discography: from Next Level to Supernova | The aespa discography in a few questions: the viral Supernova, the first full album Armageddon, the Next Level catchphrase and the ae members. (142) |
| `aespa-discography-challenge` | aespa Albums: Savage, MY WORLD and Armageddon (56) | aespa albums: Savage, MY WORLD and Armageddon | An easy aespa album quiz: the first mini album, where Spicy belongs, the full album title track and the film series behind the original Next Level. (147) |

Series links:

- `aespa-b-sides-and-deep-cuts-quiz` links to [aespa quiz](/aespa-quiz); [aespa Discography: Next Level to Supernova](/q/aespa-discography-quiz); [aespa Albums: Savage, MY WORLD and Armageddon](/q/aespa-discography-challenge)
- `aespa-discography-quiz` links to [aespa quiz](/aespa-quiz); [aespa B-sides: Yeppi Yeppi to Live My Life](/q/aespa-b-sides-and-deep-cuts-quiz); [aespa Albums: Savage, MY WORLD and Armageddon](/q/aespa-discography-challenge)
- `aespa-discography-challenge` links to [aespa quiz](/aespa-quiz); [aespa B-sides: Yeppi Yeppi to Live My Life](/q/aespa-b-sides-and-deep-cuts-quiz); [aespa Discography: Next Level to Supernova](/q/aespa-discography-quiz)

### K30 · aespa · aespa members and basics

Retitle (highest shared share 20%, below the 60% merge line). Shared questions: `aespa-members-and-concepts` and `aespa-members-facts-quiz` 20% (1/5); `aespa-members-and-concepts` and `my-quiz-how-well-do-you-know-aespa` 17% (1/6).
Hub link: [aespa quiz](/aespa-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `aespa-members-and-concepts` | aespa members and concepts | soojinnie | Team | 446 | 7 | 2026-04-05 |
| `my-quiz-how-well-do-you-know-aespa` | MY quiz - how well do you know aespa? | kpopquizz | Player | 40 | 6 | 2026-03-26 |
| `aespa-members-facts-quiz` | aespa members facts quiz | kpopquizz | Player | 22 | 5 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `aespa-members-and-concepts` | aespa Members: Debut, Label and Origins (50) | aespa members: debut, label and origins | Start with the aespa members: how many there are, the label, the debut year and song, the KWANGYA concept and which member comes from Japan. (140) |
| `my-quiz-how-well-do-you-know-aespa` | aespa Basics for MY: Debut, Label and Leader (55) | aespa basics for MY: debut, label and leader | An easy aespa basics quiz: the November 2020 debut, the member count, the label, the fandom name MY, the debut song Black Mamba and the leader. (143) |
| `aespa-members-facts-quiz` | aespa Members: Ages, Hometowns and Pre-Debut (55) | aespa members: ages, hometowns and pre-debut | Who is the oldest and youngest in aespa, who comes from China, what is Giselle's background and what was Karina known for before debut? Find out here. (150) |

Series links:

- `aespa-members-and-concepts` links to [aespa quiz](/aespa-quiz); [aespa Basics for MY: Debut, Label and Leader](/q/my-quiz-how-well-do-you-know-aespa); [aespa Members: Ages, Hometowns and Pre-Debut](/q/aespa-members-facts-quiz)
- `my-quiz-how-well-do-you-know-aespa` links to [aespa quiz](/aespa-quiz); [aespa Members: Debut, Label and Origins](/q/aespa-members-and-concepts); [aespa Members: Ages, Hometowns and Pre-Debut](/q/aespa-members-facts-quiz)
- `aespa-members-facts-quiz` links to [aespa quiz](/aespa-quiz); [aespa Members: Debut, Label and Origins](/q/aespa-members-and-concepts); [aespa Basics for MY: Debut, Label and Leader](/q/my-quiz-how-well-do-you-know-aespa)

### K31 · aespa · aespa lore and KWANGYA

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [aespa quiz](/aespa-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `aespa-my-concept-universe` | aespa MY concept universe | soojinnie | Team | 135 | 5 | 2026-04-06 |
| `aespa-lore-and-kwangya-universe-trivia` | aespa lore and KWANGYA universe trivia | kpopquizz | Player | 14 | 6 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `aespa-my-concept-universe` | aespa Lore: naevis, ae and the Black Mamba (53) | aespa lore: naevis, the ae members and Black Mamba | Go deep into the aespa universe: the villain Black Mamba, the ae members, the world of KWANGYA, the guide naevis and the song that calls her name. (146) |
| `aespa-lore-and-kwangya-universe-trivia` | aespa KWANGYA Explained: An Easy Lore Round (54) | aespa KWANGYA explained: an easy lore round | New to the aespa story? Learn what KWANGYA is, who the ae members and naevis are, what Black Mamba stands for and what the name aespa means. (140) |

Series links:

- `aespa-my-concept-universe` links to [aespa quiz](/aespa-quiz); [aespa KWANGYA Explained: An Easy Lore Round](/q/aespa-lore-and-kwangya-universe-trivia)
- `aespa-lore-and-kwangya-universe-trivia` links to [aespa quiz](/aespa-quiz); [aespa Lore: naevis, ae and the Black Mamba](/q/aespa-my-concept-universe)

### K32 · NewJeans · NewJeans discography

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [NewJeans quiz](/newjeans-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `newjeans-discography-deep-dive-quiz` | NewJeans discography deep dive quiz | bunny | Player | 973 | 8 | 2026-03-15 |
| `newjeans-discography-and-facts` | NewJeans discography and facts | njeansstan | Team | 357 | 5 | 2026-04-12 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `newjeans-discography-deep-dive-quiz` | NewJeans Discography: New Jeans EP to Get Up (55) | NewJeans discography: from the New Jeans EP to Get Up | Test the NewJeans discography: the debut EP, the album behind Ditto, the release with Super Shy, the Coca-Cola single and Ditto's Melon chart run. (146) |
| `newjeans-discography-and-facts` | NewJeans Songs and Facts: Ditto, Super Shy, ADOR (59) | NewJeans songs and facts: Ditto, Super Shy and ADOR | A short NewJeans quiz mixing songs and facts: the late 2022 viral hit, the second EP, the label they debuted under and the oldest member. (137) |

Series links:

- `newjeans-discography-deep-dive-quiz` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Songs and Facts: Ditto, Super Shy, ADOR](/q/newjeans-discography-and-facts)
- `newjeans-discography-and-facts` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Discography: New Jeans EP to Get Up](/q/newjeans-discography-deep-dive-quiz)

### K33 · NewJeans · NewJeans members

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [NewJeans quiz](/newjeans-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `newjeans-members-fun-facts-quiz` | NewJeans members fun facts quiz | bunny | Player | 553 | 7 | 2026-03-21 |
| `newjeans-members-quiz` | NewJeans members quiz | njeansstan | Team | 269 | 6 | 2026-03-29 |
| `how-can-we-memorize-who-they-are-newjeans-for-new-bunnies-33` | How can we memorize who they are? NEWJEANS!! FOR NEW BUNNIES :33 | rebellecup | Player | 16 | 8 | 2026-09-04 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `newjeans-members-fun-facts-quiz` | NewJeans Members: Ages, Roots and Nicknames (54) | NewJeans members: ages, roots and nicknames | Who is the oldest and youngest in NewJeans, where were Hanni and Danielle raised, and which member do fans compare to a cat? A members quiz for Bunnies. (152) |
| `newjeans-members-quiz` | NewJeans Members: Debut, Maknae and Backgrounds (58) | NewJeans members: debut, maknae and backgrounds | The NewJeans members from day one: the member count, the debut year and song, the maknae, and which members are Vietnamese-Australian and Korean-Australian. (156) |
| `how-can-we-memorize-who-they-are-newjeans-for-new-bunnies-33` | Name the NewJeans Member from a Photo (48) | Name the NewJeans member from a photo | New to NewJeans? Learn the faces: look at each photo and name Minji, Hanni, Danielle, Haerin or Hyein. An easy picture quiz made for new Bunnies. (145) |

Series links:

- `newjeans-members-fun-facts-quiz` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Members: Debut, Maknae and Backgrounds](/q/newjeans-members-quiz); [Name the NewJeans Member from a Photo](/q/how-can-we-memorize-who-they-are-newjeans-for-new-bunnies-33)
- `newjeans-members-quiz` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Members: Ages, Roots and Nicknames](/q/newjeans-members-fun-facts-quiz); [Name the NewJeans Member from a Photo](/q/how-can-we-memorize-who-they-are-newjeans-for-new-bunnies-33)
- `how-can-we-memorize-who-they-are-newjeans-for-new-bunnies-33` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Members: Ages, Roots and Nicknames](/q/newjeans-members-fun-facts-quiz); [NewJeans Members: Debut, Maknae and Backgrounds](/q/newjeans-members-quiz)

### K34 · NewJeans · NewJeans OMG era

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [NewJeans quiz](/newjeans-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `newjeans-omg-quiz` | NewJeans: OMG Quiz | kpopquizz | Player | 23 | 10 | 2026-05-30 |
| `newjeans-the-omg-era` | NewJeans: The OMG Era | kpopquizz | Player | 6 | 10 | 2026-10-07 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `newjeans-omg-quiz` | NewJeans Debut to OMG: Label, Ditto and Brands (57) | NewJeans from debut to OMG: label, Ditto and brands | From the July 2022 debut to OMG: the NewJeans label under HYBE, the Y2K hit Ditto, the member count, Hanni's home country and a global brand collab. (148) |
| `newjeans-the-omg-era` | NewJeans OMG Era: Ditto, Y2K Style, Jersey Club (58) | NewJeans OMG era: Ditto, Y2K style and Jersey club | Everything about the NewJeans OMG era: the January 2023 release, the track list, the chart record of Ditto, the Y2K look and the sound of OMG. (142) |

Series links:

- `newjeans-omg-quiz` links to [NewJeans quiz](/newjeans-quiz); [NewJeans OMG Era: Ditto, Y2K Style, Jersey Club](/q/newjeans-the-omg-era)
- `newjeans-the-omg-era` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Debut to OMG: Label, Ditto and Brands](/q/newjeans-omg-quiz)

### K35 · NewJeans · NewJeans general fan test

Retitle (highest shared share 14%, below the 60% merge line). Shared questions: `only-real-bunnies-can-ace-this-newjeans-quiz` and `newjeans-quiz` 14% (1/7).
Hub link: [NewJeans quiz](/newjeans-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `only-real-bunnies-can-ace-this-newjeans-quiz` | Only real Bunnies can ace this NewJeans quiz | mingi | Player | 87 | 7 | 2026-03-26 |
| `are-u-a-real-bunnie` | are u a real Bunnie? | multistancookie | Player | 36 | 5 | 2026-08-22 |
| `only-real-bunnies-can-get-these-correct` | Only REAL bunnies can finish this quiz! | newjeans | Player | 28 | 6 | 2026-07-29 |
| `newjeans-quiz` | NEWJEANS quiz | newjeans | Player | 16 | 15 | 2026-07-29 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `only-real-bunnies-can-ace-this-newjeans-quiz` | NewJeans Basics: Melon Chart, Fandom and MVs (55) | NewJeans basics: Melon chart, fandom and MVs | An easy NewJeans quiz: the first song to top the Melon daily chart, the label, the member count, the Australian member, the fandom name and the flip phone MV. (158) |
| `are-u-a-real-bunnie` | NewJeans Picture Round: Members and Songs (52) | NewJeans picture round: members and songs | A short NewJeans picture quiz: name two members from their photos, then the debut song and a song title from its cover. Quick and easy for Bunnies. (147) |
| `only-real-bunnies-can-get-these-correct` | Spot the Real NewJeans Member: Odd One Out (53) | Spot the real NewJeans member: odd one out | Photos of idols from NewJeans and other groups side by side: find the one who is not in NewJeans. A hard odd one out round that tests face recognition. (151) |
| `newjeans-quiz` | NewJeans Fan Round: Debut, Members and Dance (55) | NewJeans fan round: debut, members and dance | A long fan made NewJeans quiz: the debut song, the member count, the oldest and youngest, who fans pick for footwork and more questions on the group. (149) |

Series links:

- `only-real-bunnies-can-ace-this-newjeans-quiz` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Picture Round: Members and Songs](/q/are-u-a-real-bunnie); [Spot the Real NewJeans Member: Odd One Out](/q/only-real-bunnies-can-get-these-correct); [NewJeans Fan Round: Debut, Members and Dance](/q/newjeans-quiz)
- `are-u-a-real-bunnie` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Basics: Melon Chart, Fandom and MVs](/q/only-real-bunnies-can-ace-this-newjeans-quiz); [Spot the Real NewJeans Member: Odd One Out](/q/only-real-bunnies-can-get-these-correct); [NewJeans Fan Round: Debut, Members and Dance](/q/newjeans-quiz)
- `only-real-bunnies-can-get-these-correct` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Basics: Melon Chart, Fandom and MVs](/q/only-real-bunnies-can-ace-this-newjeans-quiz); [NewJeans Picture Round: Members and Songs](/q/are-u-a-real-bunnie); [NewJeans Fan Round: Debut, Members and Dance](/q/newjeans-quiz)
- `newjeans-quiz` links to [NewJeans quiz](/newjeans-quiz); [NewJeans Basics: Melon Chart, Fandom and MVs](/q/only-real-bunnies-can-ace-this-newjeans-quiz); [NewJeans Picture Round: Members and Songs](/q/are-u-a-real-bunnie); [Spot the Real NewJeans Member: Odd One Out](/q/only-real-bunnies-can-get-these-correct)

### K36 · EXO · EXO true or false

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [EXO quiz](/exo-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `exo-true-or-false-test-your-exo-l-knowledge` | EXO true or false - test your EXO-L knowledge | kirulo | Player | 280 | 7 | 2026-03-17 |
| `exo-true-or-false` | EXO true or false | exoplanet99 | Team | 80 | 7 | 2026-03-30 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `exo-true-or-false-test-your-exo-l-knowledge` | EXO True or False: Original Lineup and Solos (55) | EXO true or false: the original lineup and solos | Judge EXO facts: the debut lineup size, the real leader, Chen's April and a Flower, the lightstick shape, the first solo album and the label. (141) |
| `exo-true-or-false` | EXO True or False: EXO-K, EXO-M and Debut (52) | EXO true or false: EXO-K, EXO-M and the debut | True or false on EXO's start: the label, the debut year, the leader, the EXO-K and EXO-M sub-units, the breakthrough hit and Baekhyun's solo music. (147) |

Series links:

- `exo-true-or-false-test-your-exo-l-knowledge` links to [EXO quiz](/exo-quiz); [EXO True or False: EXO-K, EXO-M and Debut](/q/exo-true-or-false)
- `exo-true-or-false` links to [EXO quiz](/exo-quiz); [EXO True or False: Original Lineup and Solos](/q/exo-true-or-false-test-your-exo-l-knowledge)

### K37 · EXO · EXO members

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [EXO quiz](/exo-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `exo-members-and-positions` | EXO members and positions | exoplanet99 | Team | 192 | 5 | 2026-03-31 |
| `exo-members-quiz` | EXO members quiz | exoplanet99 | Team | 111 | 6 | 2026-04-14 |
| `exo-guess-the-member` | EXO - Guess the member | crisu | Player | 4 | 9 | 2026-10-24 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `exo-members-and-positions` | EXO Members: Acting, Real Names and Solo Work (56) | EXO members: acting, real names and solo work | Go past the stage: D.O.'s acting career, Baekhyun's drama role and City Lights, and the real names behind D.O. and Baekhyun. An EXO members quiz. (145) |
| `exo-members-quiz` | EXO Members Basics: Leader, MAMA and Growl (53) | EXO members basics: the leader, MAMA and Growl | An EXO starter quiz: the label, the debut year and song MAMA, the leader, the two original sub-units and the 2013 breakthrough hit Growl. (137) |
| `exo-guess-the-member` | Guess the EXO Member from Superpowers and Clues (58) | Guess the EXO member from superpowers and clues | Light, earth, fire, teleportation, water, wind: use each EXO member's superpower and two more clues to guess who it is. A clue round for EXO-L. (143) |

Series links:

- `exo-members-and-positions` links to [EXO quiz](/exo-quiz); [EXO Members Basics: Leader, MAMA and Growl](/q/exo-members-quiz); [Guess the EXO Member from Superpowers and Clues](/q/exo-guess-the-member)
- `exo-members-quiz` links to [EXO quiz](/exo-quiz); [EXO Members: Acting, Real Names and Solo Work](/q/exo-members-and-positions); [Guess the EXO Member from Superpowers and Clues](/q/exo-guess-the-member)
- `exo-guess-the-member` links to [EXO quiz](/exo-quiz); [EXO Members: Acting, Real Names and Solo Work](/q/exo-members-and-positions); [EXO Members Basics: Leader, MAMA and Growl](/q/exo-members-quiz)

### K38 · EXO · EXO discography

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [EXO quiz](/exo-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `exo-discography-challenge` | EXO discography challenge | exoplanet99 | Team | 100 | 5 | 2026-04-10 |
| `exo-songs` | EXO-songs | crisu | Player | 3 | 10 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `exo-discography-challenge` | EXO Discography: Growl, Love Shot and Sub-units (58) | EXO discography: Growl, Love Shot and the sub-units | The EXO discography in milestones: the album with Love Shot, the 2013 breakthrough Growl, the EXO-CBX and EXO-SC sub-units and the lineup changes. (146) |
| `exo-songs` | Guess the EXO Song from One Line (43) | Guess the EXO song from one line | Read one line and name the EXO song, from MAMA and Overdose to Monster, Call Me Baby and Sing For You. A fan made song round for EXO-L. (135) |

Series links:

- `exo-discography-challenge` links to [EXO quiz](/exo-quiz); [Guess the EXO Song from One Line](/q/exo-songs)
- `exo-songs` links to [EXO quiz](/exo-quiz); [EXO Discography: Growl, Love Shot and Sub-units](/q/exo-discography-challenge)

### K39 · EXO · EXO general fan test

Retitle (highest shared share 12%, below the 60% merge line). Shared questions: `exo-legends-quiz-only-exo-ls-survive` and `exo-general` 12% (1/8).
Hub link: [EXO quiz](/exo-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `exo-legends-quiz-only-exo-ls-survive` | EXO legends quiz - only EXO-Ls survive | yege | Player | 535 | 8 | 2026-03-12 |
| `exo-funfacts` | EXO-FunFacts | crisu | Player | 9 | 7 | 2026-10-21 |
| `exo-general` | EXO-General | crisu | Player | 3 | 10 | 2026-10-22 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `exo-legends-quiz-only-exo-ls-survive` | EXO History: MAMA Debut to Love Shot (47) | EXO history: from the MAMA debut to Love Shot | Trace EXO from the April 2012 debut: the language based sub-units, the debut lineup, the song that made them a top group and the Love Shot repackage. (149) |
| `exo-funfacts` | EXO Fun Facts: Beagle Line and First Snow (52) | EXO fun facts: the Beagle Line and First Snow | Lighter EXO trivia: who is in the Beagle Line, what EXO-L stands for, the sub-units, how Xiumin was voted strongest and the yearly return of First Snow. (152) |
| `exo-general` | EXO Essentials: XOXO, Growl and Superpowers (54) | EXO essentials: XOXO, Growl and the superpowers | EXO essentials in one quiz: the debut year, the leader, the fandom name, XOXO as the first million seller, the superpower lore and the breakout single Growl. (157) |

Series links:

- `exo-legends-quiz-only-exo-ls-survive` links to [EXO quiz](/exo-quiz); [EXO Fun Facts: Beagle Line and First Snow](/q/exo-funfacts); [EXO Essentials: XOXO, Growl and Superpowers](/q/exo-general)
- `exo-funfacts` links to [EXO quiz](/exo-quiz); [EXO History: MAMA Debut to Love Shot](/q/exo-legends-quiz-only-exo-ls-survive); [EXO Essentials: XOXO, Growl and Superpowers](/q/exo-general)
- `exo-general` links to [EXO quiz](/exo-quiz); [EXO History: MAMA Debut to Love Shot](/q/exo-legends-quiz-only-exo-ls-survive); [EXO Fun Facts: Beagle Line and First Snow](/q/exo-funfacts)

### K40 · SEVENTEEN · SEVENTEEN true or false

Retitle (highest shared share 14%, below the 60% merge line). Shared questions: `seventeen-true-or-false-65` and `how-well-do-you-know-seventeen-` 14% (1/7); `seventeen-true-or-false` and `how-well-do-you-know-seventeen-` 14% (1/7).
Hub link: [SEVENTEEN quiz](/seventeen-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `seventeen-true-or-false-65` | SEVENTEEN true or false | caratland | Team | 447 | 7 | 2026-04-01 |
| `seventeen-true-or-false` | SEVENTEEN true or false | carat | Player | 288 | 7 | 2026-03-23 |
| `how-well-do-you-know-seventeen-` | How well do you know SEVENTEEN ? | mingi | Player | 119 | 7 | 2026-03-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `seventeen-true-or-false-65` | SEVENTEEN True or False: Units, Label, Members (57) | SEVENTEEN true or false: units, label and members | Easy SEVENTEEN true or false: the real member count, Pledis and HYBE, the three units and their leaders, the debut year and the Korean-American members. (152) |
| `seventeen-true-or-false` | SEVENTEEN True or False: Debut Date and the UN (57) | SEVENTEEN true or false: the debut date and the UN | Spot the SEVENTEEN myths: the label, the unit leaders, the exact debut date, where Vernon grew up, the United Nations stage and the Woozi name trick. (149) |
| `how-well-do-you-know-seventeen-` | SEVENTEEN True or False for New CARATs (49) | SEVENTEEN true or false for new CARATs | An easy SEVENTEEN true or false for new CARATs: the member count, the label, the leader, the sub-units, where Jun and The8 are from and the year of Super. (154) |

Series links:

- `seventeen-true-or-false-65` links to [SEVENTEEN quiz](/seventeen-quiz); [SEVENTEEN True or False: Debut Date and the UN](/q/seventeen-true-or-false); [SEVENTEEN True or False for New CARATs](/q/how-well-do-you-know-seventeen-)
- `seventeen-true-or-false` links to [SEVENTEEN quiz](/seventeen-quiz); [SEVENTEEN True or False: Units, Label, Members](/q/seventeen-true-or-false-65); [SEVENTEEN True or False for New CARATs](/q/how-well-do-you-know-seventeen-)
- `how-well-do-you-know-seventeen-` links to [SEVENTEEN quiz](/seventeen-quiz); [SEVENTEEN True or False: Units, Label, Members](/q/seventeen-true-or-false-65); [SEVENTEEN True or False: Debut Date and the UN](/q/seventeen-true-or-false)

### K41 · SEVENTEEN · SEVENTEEN members

Retitle (highest shared share 33%, below the 60% merge line). Shared questions: `seventeen-members-mega-quiz-all-13` and `seventeen-basics-for-carats` 33% (2/6); `seventeen-members-mega-quiz-all-13` and `seventeen-members-nationalities` 17% (1/6).
Hub link: [SEVENTEEN quiz](/seventeen-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `seventeen-members-mega-quiz-all-13` | SEVENTEEN members mega quiz - all 13! | carat | Player | 1285 | 9 | 2026-03-12 |
| `seventeen-basics-for-carats` | SEVENTEEN basics for CARATs | caratland | Team | 228 | 6 | 2026-03-24 |
| `seventeen-members-nationalities` | SEVENTEEN members nationalities | caratland | Team | 104 | 6 | 2026-04-02 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `seventeen-members-mega-quiz-all-13` | SEVENTEEN Members: Units, Leaders and Woozi (54) | SEVENTEEN members: units, leaders and Woozi | Know all the SEVENTEEN members? The unit leaders, the Chinese and Korean-American members, the main producer Woozi and which unit Seungkwan sings in. (149) |
| `seventeen-basics-for-carats` | SEVENTEEN Basics: The Name, Units and CARAT (54) | SEVENTEEN basics: the name, the units and CARAT | Start with SEVENTEEN: the story behind the group name, the member count, the three units, the label, the leader and the fandom name CARAT. (138) |
| `seventeen-members-nationalities` | SEVENTEEN Members by Country: China, USA, Korea (58) | SEVENTEEN members by country: China, the USA and Korea | Where do the SEVENTEEN members come from? Jun and The8 from China, Joshua from Los Angeles, Vernon from New York and their Chinese names. A members origin quiz. (160) |

Series links:

- `seventeen-members-mega-quiz-all-13` links to [SEVENTEEN quiz](/seventeen-quiz); [SEVENTEEN Basics: The Name, Units and CARAT](/q/seventeen-basics-for-carats); [SEVENTEEN Members by Country: China, USA, Korea](/q/seventeen-members-nationalities)
- `seventeen-basics-for-carats` links to [SEVENTEEN quiz](/seventeen-quiz); [SEVENTEEN Members: Units, Leaders and Woozi](/q/seventeen-members-mega-quiz-all-13); [SEVENTEEN Members by Country: China, USA, Korea](/q/seventeen-members-nationalities)
- `seventeen-members-nationalities` links to [SEVENTEEN quiz](/seventeen-quiz); [SEVENTEEN Members: Units, Leaders and Woozi](/q/seventeen-members-mega-quiz-all-13); [SEVENTEEN Basics: The Name, Units and CARAT](/q/seventeen-basics-for-carats)

### K42 · ILLIT · ILLIT general fan test

Retitle (highest shared share 25%, below the 60% merge line). Shared questions: `illit-quiz` and `illit-quiz-are-you-ready` 25% (1/4); `illit-guess-the-idol` and `illit-quiz-are-you-ready` 25% (1/4); `illit-fans-here` and `illit-quiz-are-you-ready` 25% (1/4); `illit-quiz` and `illit-guess-the-idol` 10% (1/10).
Hub link: [ILLIT quiz](/illit-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `are-u-a-real-gllit` | are u a real GLLIT?!! | multistancookie | Player | 1173 | 3 | 2026-08-01 |
| `illit-quiz` | ILLIT quiz | lizra | Player | 622 | 12 | 2026-07-09 |
| `only-a-real-gllit-can-pass-this` | Only a real GLLIT can pass this!!! | fearnot | Player | 313 | 6 | 2026-09-27 |
| `illit-guess-the-idol` | ILLIT - guess the idol! | evaloveillityunah | Player | 305 | 10 | 2026-07-01 |
| `illit-quiz-2` | Illit quiz | newjeans | Player | 199 | 15 | 2026-07-29 |
| `illit-fans-here` | Illit fans here | hii | Player | 194 | 6 | 2026-09-08 |
| `this-is-only-for-true-gllits-2` | This is only for ~true~ Gllits! | peachyblssom2014 | Player | 105 | 10 | 2026-09-22 |
| `illit-quiz-are-you-a-real-gllit` | illit quiz, are you a real GLLIT? | bleh | Player | 17 | 10 | 2026-10-24 |
| `illit-quiz-are-you-ready` | Illit quiz! Are you ready?? | multistanner_sienna | Player | 3 | 4 | 2026-10-27 |
| `illit-quiz-are-you-a-gllit` | Illit quiz are you a gllit | kpopfanprek | Player | 2 | 4 | 2026-10-27 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `are-u-a-real-gllit` | Spot ILLIT: Member Photo and Logo Round (50) | Spot ILLIT: a member photo and logo round | A three question ILLIT picture round: pick the real ILLIT member from the photos, find the right ILLIT logo and finish with a lucky pick for fun. (145) |
| `illit-quiz` | ILLIT Members: R U Next, Ages and Birthdays (54) | ILLIT members: R U Next, ages and birthdays | Who is the maknae, who is the oldest and in what order were the members picked on R U Next? An ILLIT members quiz with birthdays and nicknames. (143) |
| `only-a-real-gllit-can-pass-this` | ILLIT Debut Facts: Magnetic, HYBE and the Leader (59) | ILLIT debut facts: Magnetic, HYBE and the leader | Pick the right picture for each ILLIT debut fact: the leader, the former trainee lineup member, the debut song Magnetic, the label and the exact debut date. (156) |
| `illit-guess-the-idol` | ILLIT Member Details: Full Names and Colors (54) | ILLIT member details: full names and colors | Small details about the ILLIT members: Yunah's full name, Minju's birthday, each member's representative color and who is the youngest in the group. (148) |
| `illit-quiz-2` | ILLIT Lineup and Debut: A Long Fan Round (51) | ILLIT lineup and debut: a long fan round | A long fan made ILLIT quiz on the lineup and the start of the group: the member count, the oldest and youngest, the debut song and the members' news. (149) |
| `illit-fans-here` | ILLIT Quick Facts: Debut Year, Leader, Label (55) | ILLIT quick facts: debut year, leader and label | Six quick ILLIT questions: the debut year, the leader, the debut song, the company that made the group and which member took a break. (133) |
| `this-is-only-for-true-gllits-2` | ILLIT Deep Details: Training Years and Hobbies (57) | ILLIT deep details: training years and hobbies | A hard ILLIT quiz for GLLITs: who trained longest, the exact debut date, which member plays the violin, who loves games and a member who left before debut. (155) |
| `illit-quiz-are-you-a-real-gllit` | ILLIT Name Meaning, Webtoon and Member Colors (56) | ILLIT name meaning, webtoon and member colors | A hard fan made ILLIT quiz: what the name ILLIT means, the title of the official webtoon, each member's representative color and other GLLIT details. (149) |
| `illit-quiz-are-you-ready` | ILLIT Starter: Leader, Maknae and Japan Line (55) | ILLIT starter: leader, maknae and Japanese members | Four easy ILLIT questions to start: who leads the group, who is the maknae, which member is not Korean and who trained the longest before debut. (144) |
| `illit-quiz-are-you-a-gllit` | ILLIT Members by Description: An Easy Round (54) | ILLIT members by description: an easy round | Read a short description and name the ILLIT member: the oldest, the youngest, the most followed and the member who took two breaks. Four easy questions. (152) |

Series links:

- `are-u-a-real-gllit` links to [ILLIT quiz](/illit-quiz); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this); [ILLIT Member Details: Full Names and Colors](/q/illit-guess-the-idol)
- `illit-quiz` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this); [ILLIT Member Details: Full Names and Colors](/q/illit-guess-the-idol)
- `only-a-real-gllit-can-pass-this` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Member Details: Full Names and Colors](/q/illit-guess-the-idol)
- `illit-guess-the-idol` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this)
- `illit-quiz-2` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this)
- `illit-fans-here` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this)
- `this-is-only-for-true-gllits-2` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this)
- `illit-quiz-are-you-a-real-gllit` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this)
- `illit-quiz-are-you-ready` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this)
- `illit-quiz-are-you-a-gllit` links to [ILLIT quiz](/illit-quiz); [Spot ILLIT: Member Photo and Logo Round](/q/are-u-a-real-gllit); [ILLIT Members: R U Next, Ages and Birthdays](/q/illit-quiz); [ILLIT Debut Facts: Magnetic, HYBE and the Leader](/q/only-a-real-gllit-can-pass-this)

### K43 · Cortis · Cortis general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Cortis quiz](/cortis-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `are-you-a-real-coer` | Are you a real coer??!! | mia_lolo123__ | Player | 1541 | 7 | 2026-06-12 |
| `cortis-fun-quiz` | Cortis fun quiz | siipa | Player | 461 | 10 | 2026-06-30 |
| `real-coers-cortis-fans-can-take-this-quiz` | real COERS (cortis fans) can take this quiz! | multistancookie | Player | 274 | 5 | 2026-07-29 |
| `the-coer-quiz` | THE COER QUIZ. | jax_skz | Player | 225 | 10 | 2026-07-18 |
| `cortis-quiz` | Cortis quiz | hii | Player | 208 | 11 | 2026-09-08 |
| `are-you-a-real-coer-2` | Are you a real COER? | shoulderkimchi | Player | 82 | 10 | 2026-09-05 |
| `are-you-real-coer` | Are you real COER | kicoer | Player | 72 | 10 | 2026-09-14 |
| `only-real-coers-can-beat-it` | Only real COERS can beat it! | coer_engene | Player | 69 | 8 | 2026-10-18 |
| `are-you-real-coer-version-2` | Are you real COER (version 2) | kicoer | Player | 60 | 5 | 2026-09-15 |
| `the-ultimate-cortis-coer-trivia-challenge` | The Ultimate CORTIS (COER) Trivia Challenge | cortis_05 | Player | 52 | 5 | 2026-10-10 |
| `gerek-bir-cortis-fanisan` | GERÇEK BİR CORTİS FANISAN? | keonhoahn | Player | 20 | 8 | 2026-07-10 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `are-you-a-real-coer` | Cortis Starter: Maknae, Oldest and Debut Date (56) | Cortis starter: maknae, oldest and debut date | An easy Cortis quiz for new COERs: who is the maknae, who is the oldest, how many members there are and the date Cortis debuted. (128) |
| `cortis-fun-quiz` | Cortis Basics: Leader, Label and Fandom Name (55) | Cortis basics: leader, label and fandom name | Learn the Cortis basics: the member count, the leader, the oldest member, the label behind the group and the name of the fandom. Ten questions for new fans. (156) |
| `real-coers-cortis-fans-can-take-this-quiz` | Cortis Picture Round: Eras and Dance Practices (57) | Cortis picture round: eras and dance practices | Look at a photo or clip and answer: which Cortis era the photoshoot is from, which dance practice the clip shows and which member played ice hockey. (148) |
| `the-coer-quiz` | Cortis Releases: GO! and the REDRED Tracklist (56) | Cortis releases: GO! and the REDRED tracklist | A Cortis quiz on the music and the lineup: who the members are, when GO! came out, the maknae, the fandom name and the REDRED tracklist. (136) |
| `cortis-quiz` | Cortis True or False: Debut Song, Leader, HYBE (57) | Cortis true or false: debut song, leader and HYBE | Easy Cortis true or false questions: the real debut song, the most famous track, who leads the group, the company behind them and their first show. (147) |
| `are-you-a-real-coer-2` | Cortis Members: Birthdays, Visuals and Talents (57) | Cortis members: birthdays, visuals and talents | A fan made Cortis members quiz: whose birthday is on Valentine's Day, the debut date, the visuals of the group and who is quietly good at everything. (149) |
| `are-you-real-coer` | Cortis True or False: Fandom, Lineup, Label (54) | Cortis true or false: fandom, lineup and label | True or false for new COERs: the Cortis fandom name, the member count, the label, who is not a twin and other basics mixed with trick statements. (145) |
| `only-real-coers-can-beat-it` | Cortis Nicknames and Viral Moments: Hard Round (57) | Cortis nicknames and viral moments: a hard round | A hard Cortis round on fan nicknames and viral live moments: who fans call the green alien, the ripped pants on stage and the deep voiced rap switch. (149) |
| `are-you-real-coer-version-2` | Cortis Name Meaning and Members: Picture Round (57) | Cortis name meaning and members: a picture round | A short Cortis picture quiz: the member count, the strongest dancer, the tallest member, the member from Hong Kong and what the name Cortis stands for. (151) |
| `the-ultimate-cortis-coer-trivia-challenge` | Cortis Debut, Streams and Lightstick Facts (53) | Cortis debut, streams and lightstick facts | Five Cortis questions: the debut single, the debut date, the most streamed song on Spotify, the lightstick reveal date and the most viewed music video. (151) |
| `gerek-bir-cortis-fanisan` | Cortis: Üyelerin Gerçek Adları ve Lideri (51) | Gerçek bir Cortis fanı mısın? Gerçek adlar ve lider | Türkçe bir Cortis hayran testi: James'in gerçek adı, grubun lideri, yüzücü olan üye, Martin'in uyruğu ve BTS için yedek dansçı olan üye kim? (140) |

Series links:

- `are-you-a-real-coer` links to [Cortis quiz](/cortis-quiz); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz); [Cortis Releases: GO! and the REDRED Tracklist](/q/the-coer-quiz)
- `cortis-fun-quiz` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz); [Cortis Releases: GO! and the REDRED Tracklist](/q/the-coer-quiz)
- `real-coers-cortis-fans-can-take-this-quiz` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Releases: GO! and the REDRED Tracklist](/q/the-coer-quiz)
- `the-coer-quiz` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz)
- `cortis-quiz` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz)
- `are-you-a-real-coer-2` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz)
- `are-you-real-coer` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz)
- `only-real-coers-can-beat-it` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz)
- `are-you-real-coer-version-2` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz)
- `the-ultimate-cortis-coer-trivia-challenge` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz)
- `gerek-bir-cortis-fanisan` links to [Cortis quiz](/cortis-quiz); [Cortis Starter: Maknae, Oldest and Debut Date](/q/are-you-a-real-coer); [Cortis Basics: Leader, Label and Fandom Name](/q/cortis-fun-quiz); [Cortis Picture Round: Eras and Dance Practices](/q/real-coers-cortis-fans-can-take-this-quiz)

### K44 · IVE · IVE I AM era

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [IVE quiz](/ive-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `ive-after-like-to-i-am-era` | IVE After LIKE to I AM era | njeansstan | Team | 105 | 5 | 2026-04-04 |
| `ive-i-am-quiz` | IVE: I AM Quiz | kpopquizz | Player | 13 | 10 | 2026-10-11 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `ive-after-like-to-i-am-era` | IVE After LIKE to I AM: Samples and Origins (54) | IVE from After LIKE to I AM: samples and origins | The IVE era from After LIKE to I AM: the disco classic it samples, the first EP I've IVE, the center of the group and the survival show two members came from. (158) |
| `ive-i-am-quiz` | IVE Debut to I AM: ELEVEN, Produce 48, Members (57) | IVE from debut to I AM: ELEVEN, Produce 48 and the members | From ELEVEN to I AM: the IVE debut year, the member count, the Produce 48 link, what ELEVEN achieved at debut and which member comes from Japan. (144) |

Series links:

- `ive-after-like-to-i-am-era` links to [IVE quiz](/ive-quiz); [IVE Debut to I AM: ELEVEN, Produce 48, Members](/q/ive-i-am-quiz)
- `ive-i-am-quiz` links to [IVE quiz](/ive-quiz); [IVE After LIKE to I AM: Samples and Origins](/q/ive-after-like-to-i-am-era)

### K45 · IVE · IVE general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [IVE quiz](/ive-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `how-well-do-you-know-ive` | How well do you know IVE? | ersopa | Player | 645 | 7 | 2026-03-18 |
| `how-big-of-a-dive-are-you` | how big of a dive are you? | thosewhosko67 | Player | 92 | 8 | 2026-03-28 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `how-well-do-you-know-ive` | IVE Milestones: ELEVEN, LOVE DIVE and IZ*ONE (55) | IVE milestones: ELEVEN, LOVE DIVE and IZ*ONE | The IVE milestones fans should know: the debut date, the two former IZ*ONE members, the debut song ELEVEN and the Song of the Year wins for LOVE DIVE. (150) |
| `how-big-of-a-dive-are-you` | IVE for DIVEs: Spotify Hits and Member Channels (58) | IVE for DIVEs: Spotify hits and member channels | A fan made IVE quiz with harder details: the member fans call a doppelganger, the top Spotify songs, the oldest member and the members' YouTube channels. (153) |

Series links:

- `how-well-do-you-know-ive` links to [IVE quiz](/ive-quiz); [IVE for DIVEs: Spotify Hits and Member Channels](/q/how-big-of-a-dive-are-you)
- `how-big-of-a-dive-are-you` links to [IVE quiz](/ive-quiz); [IVE Milestones: ELEVEN, LOVE DIVE and IZ*ONE](/q/how-well-do-you-know-ive)

### K46 · (G)I-DLE · (G)I-DLE true or false

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [(G)I-DLE quiz](/g-i-dle-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `gi-dle-true-or-false` | (G)I-DLE true or false | ersopa | Player | 237 | 7 | 2026-03-20 |
| `gi-dle-true-or-false-85` | (G)I-DLE true or false | soojinnie | Team | 133 | 6 | 2026-04-05 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `gi-dle-true-or-false` | (G)I-DLE True or False: Soyeon, K/DA and Lineup (58) | (G)I-DLE true or false: Soyeon, K/DA and the lineup | True or false on (G)I-DLE: the label, Soyeon's survival show past, Yuqi's home country, the debut lineup size and the K/DA song Soyeon wrote. (141) |
| `gi-dle-true-or-false-85` | (G)I-DLE True or False: Producer, Label, Origins (59) | (G)I-DLE true or false: the producer, the label and origins | Spot the false (G)I-DLE facts: who writes most of the songs, which label they debuted under, where Yuqi and Minnie come from and the real debut song. (149) |

Series links:

- `gi-dle-true-or-false` links to [(G)I-DLE quiz](/g-i-dle-quiz); [(G)I-DLE True or False: Producer, Label, Origins](/q/gi-dle-true-or-false-85)
- `gi-dle-true-or-false-85` links to [(G)I-DLE quiz](/g-i-dle-quiz); [(G)I-DLE True or False: Soyeon, K/DA and Lineup](/q/gi-dle-true-or-false)

### K47 · (G)I-DLE · (G)I-DLE TOMBOY era

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [(G)I-DLE quiz](/g-i-dle-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `gi-dle-tomboy-era-quiz` | (G)I-DLE Tomboy era quiz | soojinnie | Team | 86 | 5 | 2026-03-29 |
| `gi-dle-the-tomboy-era` | (G)I-DLE: The TOMBOY Era | kpopquizz | Player | 21 | 10 | 2026-04-08 |
| `gi-dle-tomboy-quiz` | (G)I-DLE: TOMBOY Quiz | kpopquizz | Player | 12 | 10 | 2026-06-21 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `gi-dle-tomboy-era-quiz` | (G)I-DLE TOMBOY Era: I NEVER DIE and the Lineup (58) | (G)I-DLE TOMBOY era: I NEVER DIE and the lineup | The (G)I-DLE TOMBOY era: the 2022 hit, the album I NEVER DIE, the five member lineup after a departure and the shows Soyeon was on before debut. (144) |
| `gi-dle-the-tomboy-era` | (G)I-DLE TOMBOY Era: Themes, Awards and Live (55) | (G)I-DLE TOMBOY era: themes, awards and live stages | Go deeper into the (G)I-DLE TOMBOY era: the March 2022 release, the lead single, the themes of TOMBOY, its Song of the Year wins and Minnie's live piano. (153) |
| `gi-dle-tomboy-quiz` | (G)I-DLE Basics: Debut, Producer and TOMBOY (54) | (G)I-DLE basics: debut, producer and TOMBOY | An easy (G)I-DLE round: the debut year, the member who produces their songs, where Yuqi comes from, the former member and the empowerment hit TOMBOY. (149) |

Series links:

- `gi-dle-tomboy-era-quiz` links to [(G)I-DLE quiz](/g-i-dle-quiz); [(G)I-DLE TOMBOY Era: Themes, Awards and Live](/q/gi-dle-the-tomboy-era); [(G)I-DLE Basics: Debut, Producer and TOMBOY](/q/gi-dle-tomboy-quiz)
- `gi-dle-the-tomboy-era` links to [(G)I-DLE quiz](/g-i-dle-quiz); [(G)I-DLE TOMBOY Era: I NEVER DIE and the Lineup](/q/gi-dle-tomboy-era-quiz); [(G)I-DLE Basics: Debut, Producer and TOMBOY](/q/gi-dle-tomboy-quiz)
- `gi-dle-tomboy-quiz` links to [(G)I-DLE quiz](/g-i-dle-quiz); [(G)I-DLE TOMBOY Era: I NEVER DIE and the Lineup](/q/gi-dle-tomboy-era-quiz); [(G)I-DLE TOMBOY Era: Themes, Awards and Live](/q/gi-dle-the-tomboy-era)

### K48 · (G)I-DLE · (G)I-DLE members and facts (50% overlap)

Retitle (highest shared share 50%, below the 60% merge line). Shared questions: `gi-dle-self-produced-queens-quiz` and `gi-dle-members-and-facts` 50% (3/6).
Hub link: [(G)I-DLE quiz](/g-i-dle-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `gi-dle-self-produced-queens-quiz` | (G)I-DLE self-produced queens quiz | ersopa | Player | 578 | 8 | 2026-03-14 |
| `gi-dle-members-and-facts` | (G)I-DLE members and facts | soojinnie | Team | 79 | 6 | 2026-04-06 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `gi-dle-self-produced-queens-quiz` | (G)I-DLE Self-Produced: Soyeon, Debut and Hits (57) | (G)I-DLE self-produced: Soyeon, the debut and the hits | How well do you know (G)I-DLE as a self-producing group? The debut date, the main songwriter Soyeon, the album with TOMBOY and the member from Taiwan. (150) |
| `gi-dle-members-and-facts` | (G)I-DLE Members: Cube, LATATA and Origins (53) | (G)I-DLE members: Cube, LATATA and origins | Meet the (G)I-DLE members: the label Cube, the leader and songwriter, the debut song LATATA and which members come from China and Thailand. (139) |

Series links:

- `gi-dle-self-produced-queens-quiz` links to [(G)I-DLE quiz](/g-i-dle-quiz); [(G)I-DLE Members: Cube, LATATA and Origins](/q/gi-dle-members-and-facts)
- `gi-dle-members-and-facts` links to [(G)I-DLE quiz](/g-i-dle-quiz); [(G)I-DLE Self-Produced: Soyeon, Debut and Hits](/q/gi-dle-self-produced-queens-quiz)

### K49 · ITZY · ITZY basics, members and discography

Retitle (highest shared share 17%, below the 60% merge line). Shared questions: `itzy-members-and-discography-quiz` and `itzy-members-quiz` 17% (1/6).
Hub link: [ITZY quiz](/itzy-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `itzy-members-and-discography-quiz` | ITZY members and discography quiz | emma_spencer | Player | 480 | 7 | 2026-03-17 |
| `itzy-discography-deep-dive` | ITZY discography deep dive | twiceland | Team | 212 | 5 | 2026-03-31 |
| `itzy-members-quiz` | ITZY members quiz | twiceland | Team | 112 | 6 | 2026-04-06 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `itzy-members-and-discography-quiz` | ITZY Members and Hits: DALLA DALLA to WANNABE (56) | ITZY members and hits: from DALLA DALLA to WANNABE | An ITZY starter on members and hits: the debut song DALLA DALLA, the label, the member count, the leader and the point move from WANNABE. (137) |
| `itzy-discography-deep-dive` | ITZY Discography: WANNABE and CRAZY IN LOVE (54) | ITZY discography: WANNABE and CRAZY IN LOVE | The ITZY discography in a few questions: WANNABE, the first full album CRAZY IN LOVE, the DALLA DALLA debut year, the rapper of the group and the maknae. (153) |
| `itzy-members-quiz` | ITZY Basics: JYP, Leader Yeji and MIDZY (50) | ITZY basics: JYP, the leader Yeji and MIDZY | The ITZY basics in six questions: the member count, the label JYP, the debut song DALLA DALLA, the leader, the fandom name MIDZY and the debut year. (148) |

Series links:

- `itzy-members-and-discography-quiz` links to [ITZY quiz](/itzy-quiz); [ITZY Discography: WANNABE and CRAZY IN LOVE](/q/itzy-discography-deep-dive); [ITZY Basics: JYP, Leader Yeji and MIDZY](/q/itzy-members-quiz)
- `itzy-discography-deep-dive` links to [ITZY quiz](/itzy-quiz); [ITZY Members and Hits: DALLA DALLA to WANNABE](/q/itzy-members-and-discography-quiz); [ITZY Basics: JYP, Leader Yeji and MIDZY](/q/itzy-members-quiz)
- `itzy-members-quiz` links to [ITZY quiz](/itzy-quiz); [ITZY Members and Hits: DALLA DALLA to WANNABE](/q/itzy-members-and-discography-quiz); [ITZY Discography: WANNABE and CRAZY IN LOVE](/q/itzy-discography-deep-dive)

### K50 · ENHYPEN · ENHYPEN music videos

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [ENHYPEN quiz](/enhypen-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `name-10-enhypen-mvs-are-you-a-real-engene` | Name 10 Enhypen M/Vs (Are you a real engene?) | aliicaiik | Player | 123 | 10 | 2026-09-18 |
| `enhypen-guess-the-mv-from-the-screenshot` | ENHYPEN - Guess the MV from the screenshot | light_a_matz | Player | 115 | 20 | 2026-07-27 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `name-10-enhypen-mvs-are-you-a-real-engene` | Name the ENHYPEN MV: Bloody Paradise to Knife (56) | Name the ENHYPEN MV: from Bloody Paradise to Knife | Look at one photo and name the ENHYPEN music video: Bloody Paradise, Stealer, Knife, Tamed-Dashed, Highway 1009 and more. A picture round for ENGENEs. (150) |
| `enhypen-guess-the-mv-from-the-screenshot` | Guess the ENHYPEN MV: Given-Taken to XO (50) | Guess the ENHYPEN MV: from Given-Taken to XO | A long ENHYPEN screenshot round: name the music video from one frame, from the debut Given-Taken to Sweet Venom, Future Perfect and XO (Only If You Say Yes). (157) |

Series links:

- `name-10-enhypen-mvs-are-you-a-real-engene` links to [ENHYPEN quiz](/enhypen-quiz); [Guess the ENHYPEN MV: Given-Taken to XO](/q/enhypen-guess-the-mv-from-the-screenshot)
- `enhypen-guess-the-mv-from-the-screenshot` links to [ENHYPEN quiz](/enhypen-quiz); [Name the ENHYPEN MV: Bloody Paradise to Knife](/q/name-10-enhypen-mvs-are-you-a-real-engene)

### K51 · ENHYPEN · ENHYPEN general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [ENHYPEN quiz](/enhypen-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `enhypen-debut-and-beyond-quiz` | ENHYPEN debut and beyond quiz | mina | Player | 1096 | 7 | 2026-03-19 |
| `enhypen-world-ultimate-fan-challenge` | ENHYPEN Quiz: Ultimate Fan Challenge | engenez_1009 | Player | 933 | 20 | 2026-03-28 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `enhypen-debut-and-beyond-quiz` | ENHYPEN Debut and Beyond: I-LAND to Today (52) | ENHYPEN debut and beyond: from I-LAND to today | An easy ENHYPEN quiz: the survival show I-LAND, the debut song Given-Taken, the member count and which members come from Japan and Australia. (141) |
| `enhypen-world-ultimate-fan-challenge` | ENHYPEN Member Deep Cuts: Pre-Debut Stories (54) | ENHYPEN member deep cuts: pre-debut stories | A long ENHYPEN quiz for ENGENEs who know the details: member friendships, Ni-ki's childhood stage with SHINee, Sunoo's school nickname and Jungwon's training. (158) |

Series links:

- `enhypen-debut-and-beyond-quiz` links to [ENHYPEN quiz](/enhypen-quiz); [ENHYPEN Member Deep Cuts: Pre-Debut Stories](/q/enhypen-world-ultimate-fan-challenge)
- `enhypen-world-ultimate-fan-challenge` links to [ENHYPEN quiz](/enhypen-quiz); [ENHYPEN Debut and Beyond: I-LAND to Today](/q/enhypen-debut-and-beyond-quiz)

### K52 · LE SSERAFIM · LE SSERAFIM UNFORGIVEN era

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [LE SSERAFIM quiz](/le-sserafim-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `le-sserafim-antifragile-to-unforgiven` | LE SSERAFIM ANTIFRAGILE to UNFORGIVEN | njeansstan | Team | 206 | 6 | 2026-04-10 |
| `le-sserafim-the-unforgiven-era` | LE SSERAFIM: The UNFORGIVEN Era | kpopquizz | Player | 8 | 10 | 2026-10-09 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `le-sserafim-antifragile-to-unforgiven` | LE SSERAFIM From ANTIFRAGILE to Perfect Night (56) | LE SSERAFIM from ANTIFRAGILE to Perfect Night | LE SSERAFIM after FEARLESS: the second title track ANTIFRAGILE, Kazuha's ballet past, Sakura's earlier groups and the Overwatch 2 collab Perfect Night. (151) |
| `le-sserafim-the-unforgiven-era` | LE SSERAFIM UNFORGIVEN: Album, Nile Rodgers (54) | LE SSERAFIM UNFORGIVEN: the album and Nile Rodgers | The LE SSERAFIM UNFORGIVEN era: the May 2023 full album, its title track, the Nile Rodgers feature, the I'M FEARLESS anagram and a Spotify milestone. (149) |

Series links:

- `le-sserafim-antifragile-to-unforgiven` links to [LE SSERAFIM quiz](/le-sserafim-quiz); [LE SSERAFIM UNFORGIVEN: Album, Nile Rodgers](/q/le-sserafim-the-unforgiven-era)
- `le-sserafim-the-unforgiven-era` links to [LE SSERAFIM quiz](/le-sserafim-quiz); [LE SSERAFIM From ANTIFRAGILE to Perfect Night](/q/le-sserafim-antifragile-to-unforgiven)

### K53 · LE SSERAFIM · LE SSERAFIM general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [LE SSERAFIM quiz](/le-sserafim-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `le-sserafim-members-and-music-quiz` | LE SSERAFIM members and music quiz | lea_mnm | Player | 670 | 7 | 2026-03-20 |
| `le-sserafim-quiz-are-you-a-real-fearnot` | LE SSERAFIM quiz - are you a real FEARNOT? | yena | Player | 367 | 5 | 2026-03-22 |
| `le-sserafim-basics` | LE SSERAFIM basics | njeansstan | Team | 276 | 6 | 2026-03-31 |
| `only-a-real-fearnot-can-pass-this` | Only a real FEARNOT can pass this! | fearnot | Player | 33 | 4 | 2026-09-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `le-sserafim-members-and-music-quiz` | LE SSERAFIM Members: Leader, Maknae, Anagram (55) | LE SSERAFIM members: leader, maknae and the anagram | Get to know LE SSERAFIM: the member count, the leader, where Yunjin was born, the youngest member and the phrase hidden in the group's name. (140) |
| `le-sserafim-quiz-are-you-a-real-fearnot` | Guess LE SSERAFIM Songs and Members from Clues (57) | Guess LE SSERAFIM songs and members from clues | Three clues per question: name the LE SSERAFIM song or member, from FEARLESS, ANTIFRAGILE and EASY to Sakura and Kazuha. A clue round for FEARNOTs. (147) |
| `le-sserafim-basics` | LE SSERAFIM Basics: Source Music, IZ*ONE, Debut (58) | LE SSERAFIM basics: Source Music, IZ*ONE and the debut | The LE SSERAFIM basics: how many members, the label under HYBE, the debut year, the two former IZ*ONE members and the Korean-American member. (141) |
| `only-a-real-fearnot-can-pass-this` | LE SSERAFIM Positions: Pick the Right Member (55) | LE SSERAFIM positions: pick the right member | Four LE SSERAFIM position questions: pick the right member photo for main dancer, visual, main vocalist and all rounder. Short and quick for FEARNOTs. (150) |

Series links:

- `le-sserafim-members-and-music-quiz` links to [LE SSERAFIM quiz](/le-sserafim-quiz); [Guess LE SSERAFIM Songs and Members from Clues](/q/le-sserafim-quiz-are-you-a-real-fearnot); [LE SSERAFIM Basics: Source Music, IZ*ONE, Debut](/q/le-sserafim-basics); [LE SSERAFIM Positions: Pick the Right Member](/q/only-a-real-fearnot-can-pass-this)
- `le-sserafim-quiz-are-you-a-real-fearnot` links to [LE SSERAFIM quiz](/le-sserafim-quiz); [LE SSERAFIM Members: Leader, Maknae, Anagram](/q/le-sserafim-members-and-music-quiz); [LE SSERAFIM Basics: Source Music, IZ*ONE, Debut](/q/le-sserafim-basics); [LE SSERAFIM Positions: Pick the Right Member](/q/only-a-real-fearnot-can-pass-this)
- `le-sserafim-basics` links to [LE SSERAFIM quiz](/le-sserafim-quiz); [LE SSERAFIM Members: Leader, Maknae, Anagram](/q/le-sserafim-members-and-music-quiz); [Guess LE SSERAFIM Songs and Members from Clues](/q/le-sserafim-quiz-are-you-a-real-fearnot); [LE SSERAFIM Positions: Pick the Right Member](/q/only-a-real-fearnot-can-pass-this)
- `only-a-real-fearnot-can-pass-this` links to [LE SSERAFIM quiz](/le-sserafim-quiz); [LE SSERAFIM Members: Leader, Maknae, Anagram](/q/le-sserafim-members-and-music-quiz); [Guess LE SSERAFIM Songs and Members from Clues](/q/le-sserafim-quiz-are-you-a-real-fearnot); [LE SSERAFIM Basics: Source Music, IZ*ONE, Debut](/q/le-sserafim-basics)

### K54 · LOONA · Guess the LOONA member

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [LOONA quiz](/loona-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `flip-that-teasers-name-the-loona-members` | Flip That Teasers: Name The LOONA Members | chuuchaos | Player | 12 | 12 | 2026-06-06 |
| `guess-the-loona-member-from-the-zoomed-in-concept-picture` | Guess the Loona member from the zoomed in concept picture | stanloona | Player | 0 | 12 | 2026-10-27 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `flip-that-teasers-name-the-loona-members` | Name the LOONA Members from Their Teasers (52) | Name the LOONA members from their teasers | Flip through LOONA teaser photos and name each member, from HeeJin and HyunJin to HaSeul, YeoJin and ViVi. An easy picture quiz for Orbits. (139) |
| `guess-the-loona-member-from-the-zoomed-in-concept-picture` | Guess the LOONA Member: Zoomed Concept Photos (56) | Guess the LOONA member from a zoomed concept photo | Each picture is a close crop of a LOONA concept photo: guess which member it is. A harder picture round than the teasers quiz, with all members in play. (152) |

Series links:

- `flip-that-teasers-name-the-loona-members` links to [LOONA quiz](/loona-quiz); [Guess the LOONA Member: Zoomed Concept Photos](/q/guess-the-loona-member-from-the-zoomed-in-concept-picture)
- `guess-the-loona-member-from-the-zoomed-in-concept-picture` links to [LOONA quiz](/loona-quiz); [Name the LOONA Members from Their Teasers](/q/flip-that-teasers-name-the-loona-members)

### K55 · LOONA · LOONA songs

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [LOONA quiz](/loona-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `loona-songs-quiz-how-well-do-you-know-loona-songs` | LOONA Songs Quiz: How well do you know LOONA songs? | orbithemoon | Player | 44 | 20 | 2026-04-10 |
| `guess-the-loona-song` | Guess the Loona song | stanloona | Player | 0 | 8 | 2026-10-27 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `loona-songs-quiz-how-well-do-you-know-loona-songs` | LOONA Songs by Album: Match Each Track (49) | LOONA songs by album: match each track | Which LOONA release holds PTT, Be Honest, Curiosity or Universe? Match each song to its album or solo single in this long and easy song quiz for Orbits. (152) |
| `guess-the-loona-song` | Guess the LOONA Song: Solos and Sub-unit Tracks (58) | Guess the LOONA song: solos and sub-unit tracks | A hard clue round: guess the LOONA song from hints about the solo, sub-unit or group release, the album year and who sings it. Odd Eye Circle, 1/3 and more. (156) |

Series links:

- `loona-songs-quiz-how-well-do-you-know-loona-songs` links to [LOONA quiz](/loona-quiz); [Guess the LOONA Song: Solos and Sub-unit Tracks](/q/guess-the-loona-song)
- `guess-the-loona-song` links to [LOONA quiz](/loona-quiz); [LOONA Songs by Album: Match Each Track](/q/loona-songs-quiz-how-well-do-you-know-loona-songs)

### K56 · ATEEZ · ATEEZ lyrics series

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [ATEEZ quiz](/ateez-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `ateez-lyrics-quiz` | ATEEZ Lyrics Quiz | light_a_matz | Player | 27 | 20 | 2026-07-11 |
| `ateez-lyrics-quiz-part-2` | ATEEZ Lyrics Quiz (Part. 2) | light_a_matz | Player | 10 | 20 | 2026-07-11 |
| `ateez-lyrics-quiz-part-3` | ATEEZ Lyrics Quiz (Part. 3) | light_a_matz | Player | 6 | 20 | 2026-07-11 |
| `ateez-lyrics-quiz-part-4` | ATEEZ Lyrics Quiz (Part. 4) | light_a_matz | Player | 4 | 20 | 2026-07-11 |
| `ateez-lyrics-quiz-part-5` | ATEEZ Lyrics Quiz (Part. 5) | light_a_matz | Player | 4 | 20 | 2026-07-12 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `ateez-lyrics-quiz` | ATEEZ Lyrics Part 1: Wonderland to The Real (54) | ATEEZ lyrics quiz, part 1: Wonderland to The Real | Part 1 of the ATEEZ lyrics series: name the song from a short line or fill the missing word, with Wonderland, Eternal Sunshine, Blind and The Real. (147) |
| `ateez-lyrics-quiz-part-2` | ATEEZ Lyrics Part 2: Blue Summer to Guerrilla (56) | ATEEZ lyrics quiz, part 2: Blue Summer to Guerrilla | Part 2 of the ATEEZ lyrics series: lines from Blue Summer, Hala Hala, Dune and Guerrilla. Name the song or fill the missing word, then go on to part 3. (151) |
| `ateez-lyrics-quiz-part-3` | ATEEZ Lyrics Part 3: Man on Fire to Still Here (57) | ATEEZ lyrics quiz, part 3: Man on Fire to Still Here | Part 3 of the ATEEZ lyrics series: Man on Fire, Good Lil Boy, Dancing Like Butterfly Wings and Still Here. Pick the song or the missing word. (141) |
| `ateez-lyrics-quiz-part-4` | ATEEZ Lyrics Part 4: Royal, Precious and WIN (55) | ATEEZ lyrics quiz, part 4: Royal, Precious and WIN | Part 4 of the ATEEZ lyrics series, with Japanese songs too: Royal, Precious, Dreamers and WIN. Name the song from a line or complete it. (136) |
| `ateez-lyrics-quiz-part-5` | ATEEZ Lyrics Part 5: Rocky, Siren and Fireworks (58) | ATEEZ lyrics quiz, part 5: Rocky, Siren and Fireworks | The last part of the ATEEZ lyrics series: Rocky, Siren, Fireworks and Inception. Fill the missing word or name the song to finish all five parts. (145) |

Series links:

- `ateez-lyrics-quiz` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Lyrics Part 2: Blue Summer to Guerrilla](/q/ateez-lyrics-quiz-part-2)
- `ateez-lyrics-quiz-part-2` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Lyrics Part 1: Wonderland to The Real](/q/ateez-lyrics-quiz); [ATEEZ Lyrics Part 3: Man on Fire to Still Here](/q/ateez-lyrics-quiz-part-3)
- `ateez-lyrics-quiz-part-3` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Lyrics Part 2: Blue Summer to Guerrilla](/q/ateez-lyrics-quiz-part-2); [ATEEZ Lyrics Part 4: Royal, Precious and WIN](/q/ateez-lyrics-quiz-part-4)
- `ateez-lyrics-quiz-part-4` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Lyrics Part 3: Man on Fire to Still Here](/q/ateez-lyrics-quiz-part-3); [ATEEZ Lyrics Part 5: Rocky, Siren and Fireworks](/q/ateez-lyrics-quiz-part-5)
- `ateez-lyrics-quiz-part-5` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Lyrics Part 4: Royal, Precious and WIN](/q/ateez-lyrics-quiz-part-4)

### K57 · ATEEZ · ATEEZ music videos

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [ATEEZ quiz](/ateez-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `ateez-music-videos-quiz` | ATEEZ Music Videos Quiz | light_a_matz | Player | 21 | 20 | 2026-07-13 |
| `ateez-guess-the-music-video-from-the-screenshot` | ATEEZ: Guess the Music Video from the screenshot | light_a_matz | Player | 14 | 20 | 2026-07-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `ateez-music-videos-quiz` | ATEEZ Music Video Details: Sets and Scenes (53) | ATEEZ music video details: sets and scenes | How closely do you watch ATEEZ music videos? The club in The Real, where Pirate King and Treasure were filmed, the end of Halazia and Eternal Sunshine scenes. (158) |
| `ateez-guess-the-music-video-from-the-screenshot` | Guess the ATEEZ Music Video from a Screenshot (56) | Guess the ATEEZ music video from a screenshot | A long ATEEZ screenshot round: name the music video from one frame, from Say My Name and Eternal Sunshine to Halazia and Crazy Form. (132) |

Series links:

- `ateez-music-videos-quiz` links to [ATEEZ quiz](/ateez-quiz); [Guess the ATEEZ Music Video from a Screenshot](/q/ateez-guess-the-music-video-from-the-screenshot)
- `ateez-guess-the-music-video-from-the-screenshot` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Music Video Details: Sets and Scenes](/q/ateez-music-videos-quiz)

### K58 · ATEEZ · ATEEZ members and basics

Retitle (highest shared share 17%, below the 60% merge line). Shared questions: `ateez-title-tracks-and-members-quiz` and `ateez-basics-for-atinys` 17% (1/6).
Hub link: [ATEEZ quiz](/ateez-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `ateez-title-tracks-and-members-quiz` | ATEEZ title tracks and members quiz | mina | Player | 572 | 7 | 2026-03-21 |
| `ateez-basics-for-atinys` | ATEEZ basics for ATINYs | skzrealm | Team | 245 | 6 | 2026-04-12 |
| `ateez-members-quiz` | ATEEZ members quiz | skzrealm | Team | 153 | 5 | 2026-03-29 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `ateez-title-tracks-and-members-quiz` | ATEEZ Debut, Leader and Title Tracks (47) | ATEEZ debut, leader and title tracks | An ATEEZ quiz mixing members and music: the debut date, the fandom name ATINY, the leader, the member count and the title tracks of each era. (141) |
| `ateez-basics-for-atinys` | ATEEZ Basics for ATINYs: KQ, Hongjoong, Debut (56) | ATEEZ basics for ATINYs: KQ, Hongjoong and the debut | Start with ATEEZ: the member count, the label KQ Entertainment, the debut year, the leader Hongjoong and other basics every new ATINY learns first. (147) |
| `ateez-members-quiz` | ATEEZ Members: Stage Roles and the Maknae (52) | ATEEZ members: stage roles and the maknae | Know the ATEEZ members by role: San's stage presence, the main rapper, the maknae Jongho and his famous strength. A short members quiz for ATINYs. (146) |

Series links:

- `ateez-title-tracks-and-members-quiz` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Basics for ATINYs: KQ, Hongjoong, Debut](/q/ateez-basics-for-atinys); [ATEEZ Members: Stage Roles and the Maknae](/q/ateez-members-quiz)
- `ateez-basics-for-atinys` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Debut, Leader and Title Tracks](/q/ateez-title-tracks-and-members-quiz); [ATEEZ Members: Stage Roles and the Maknae](/q/ateez-members-quiz)
- `ateez-members-quiz` links to [ATEEZ quiz](/ateez-quiz); [ATEEZ Debut, Leader and Title Tracks](/q/ateez-title-tracks-and-members-quiz); [ATEEZ Basics for ATINYs: KQ, Hongjoong, Debut](/q/ateez-basics-for-atinys)

### K59 · KATSEYE · KATSEYE general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [KATSEYE quiz](/katseye-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `are-you-a-real-eyekon` | Are you a real eyekon? | omgiamaeyekon | Player | 317 | 12 | 2026-08-27 |
| `katseye` | Katseye | enji | Player | 169 | 9 | 2026-10-03 |
| `katseye-quiz` | KATSEYE quiz | multikpopstan | Player | 95 | 8 | 2026-08-23 |
| `only-real-katseye-fans-can-pass-this-quiz` | Only real Katseye fans can pass this quiz | kpop_cutie | Player | 28 | 13 | 2026-10-19 |
| `katseye-quiz-are-you-an-eyekon` | katseye quiz are you an eyekon | kpopfanprek | Player | 7 | 3 | 2026-10-24 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `are-you-a-real-eyekon` | KATSEYE Basics: Debut Song, Leader and Lineup (56) | KATSEYE basics: debut song, leader and lineup | A KATSEYE starter for new EYEKONs: the debut song, the year the group was formed, the leader and the latest lineup news, with a dozen questions. (144) |
| `katseye` | KATSEYE Members: Ages and Home Countries (51) | KATSEYE members: ages and home countries | Get to know KATSEYE: the member count, the youngest and oldest members and where each member comes from, including the member from the Philippines. (147) |
| `katseye-quiz` | KATSEYE Clue Round: Member Symbols, Birthdays (56) | KATSEYE clue round: member symbols and birthdays | Guess KATSEYE from clues: whose birthday is in February, whose symbol is a shell, which members took a break and the companies behind the group. (144) |
| `only-real-katseye-fans-can-pass-this-quiz` | KATSEYE Hard Round: Fandom, Label, Lineup News (57) | KATSEYE hard round: fandom, label and lineup news | A harder KATSEYE quiz: the fandom name, the debut year, the companies behind the group, lineup news and more details for EYEKONs who follow closely. (148) |
| `katseye-quiz-are-you-an-eyekon` | Guess the KATSEYE Member: Three Quick Clues (54) | Guess the KATSEYE member: three quick clues | Three easy KATSEYE clue questions: name the member from hints about the leader, the all rounder and the member given a chance to lead. Quick and fun. (149) |

Series links:

- `are-you-a-real-eyekon` links to [KATSEYE quiz](/katseye-quiz); [KATSEYE Members: Ages and Home Countries](/q/katseye); [KATSEYE Clue Round: Member Symbols, Birthdays](/q/katseye-quiz); [KATSEYE Hard Round: Fandom, Label, Lineup News](/q/only-real-katseye-fans-can-pass-this-quiz)
- `katseye` links to [KATSEYE quiz](/katseye-quiz); [KATSEYE Basics: Debut Song, Leader and Lineup](/q/are-you-a-real-eyekon); [KATSEYE Clue Round: Member Symbols, Birthdays](/q/katseye-quiz); [KATSEYE Hard Round: Fandom, Label, Lineup News](/q/only-real-katseye-fans-can-pass-this-quiz)
- `katseye-quiz` links to [KATSEYE quiz](/katseye-quiz); [KATSEYE Basics: Debut Song, Leader and Lineup](/q/are-you-a-real-eyekon); [KATSEYE Members: Ages and Home Countries](/q/katseye); [KATSEYE Hard Round: Fandom, Label, Lineup News](/q/only-real-katseye-fans-can-pass-this-quiz)
- `only-real-katseye-fans-can-pass-this-quiz` links to [KATSEYE quiz](/katseye-quiz); [KATSEYE Basics: Debut Song, Leader and Lineup](/q/are-you-a-real-eyekon); [KATSEYE Members: Ages and Home Countries](/q/katseye); [KATSEYE Clue Round: Member Symbols, Birthdays](/q/katseye-quiz)
- `katseye-quiz-are-you-an-eyekon` links to [KATSEYE quiz](/katseye-quiz); [KATSEYE Basics: Debut Song, Leader and Lineup](/q/are-you-a-real-eyekon); [KATSEYE Members: Ages and Home Countries](/q/katseye); [KATSEYE Clue Round: Member Symbols, Birthdays](/q/katseye-quiz)

### K60 · BABYMONSTER · BABYMONSTER general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BABYMONSTER quiz](/babymonster-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `babymonster-quiz` | BABYMONSTER quiz | lizra | Player | 596 | 15 | 2026-07-07 |
| `do-you-know-babymon-well` | DO YOU KNOW BABYMON WELL | minju_unnie | Player | 23 | 4 | 2026-10-21 |
| `babymon-fan-quiz-freya` | BABYMON FAN QUIZ FREYA | freyaa | Player | 17 | 9 | 2026-09-24 |
| `solo-los-verdaderos-monstiez-pueden-responder-correctamente` | Solo los verdaderos Monstiez pueden responder correctamente | leria_rami1712 | Player | 3 | 20 | 2026-10-12 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `babymonster-quiz` | BABYMONSTER Duos: Rukasa, Rorita and Ramyeon (55) | BABYMONSTER duos: Rukasa, Rorita and Ramyeon | Learn BABYMONSTER through its fan duo names: the rap duo Rukasa, the visual duo Rorita, the vocal duo Ramyeon and the maknae Chiquita, plus more. (145) |
| `do-you-know-babymon-well` | BABYMONSTER Members: Japan Line and High Notes (57) | BABYMONSTER members: the Japan line and high notes | Four quick BABYMONSTER questions: the members from Japan, who hits the high notes, who joined the high note game and who covered Rami's parts. (142) |
| `babymon-fan-quiz-freya` | BABYMONSTER: Maknae, Agensi dan Formasi Awal (55) | BABYMONSTER: maknae, agensi dan jumlah member awal | Kuis fan BABYMONSTER dalam bahasa Indonesia: siapa maknae, dari agensi mana, member dengan wajah bayi dan berapa member di awal. Cocok untuk fan baru. (150) |
| `solo-los-verdaderos-monstiez-pueden-responder-correctamente` | BABYMONSTER difícil: etapa de trainee y debut (56) | BABYMONSTER en modo difícil: trainees, debut y regresos | Un quiz difícil de BABYMONSTER en español: cuándo empezó Ruka como trainee en YG, quiénes pasaron cada evaluación y fechas del debut y los regresos. (148) |

Series links:

- `babymonster-quiz` links to [BABYMONSTER quiz](/babymonster-quiz); [BABYMONSTER Members: Japan Line and High Notes](/q/do-you-know-babymon-well); [BABYMONSTER: Maknae, Agensi dan Formasi Awal](/q/babymon-fan-quiz-freya); [BABYMONSTER difícil: etapa de trainee y debut](/q/solo-los-verdaderos-monstiez-pueden-responder-correctamente)
- `do-you-know-babymon-well` links to [BABYMONSTER quiz](/babymonster-quiz); [BABYMONSTER Duos: Rukasa, Rorita and Ramyeon](/q/babymonster-quiz); [BABYMONSTER: Maknae, Agensi dan Formasi Awal](/q/babymon-fan-quiz-freya); [BABYMONSTER difícil: etapa de trainee y debut](/q/solo-los-verdaderos-monstiez-pueden-responder-correctamente)
- `babymon-fan-quiz-freya` links to [BABYMONSTER quiz](/babymonster-quiz); [BABYMONSTER Duos: Rukasa, Rorita and Ramyeon](/q/babymonster-quiz); [BABYMONSTER Members: Japan Line and High Notes](/q/do-you-know-babymon-well); [BABYMONSTER difícil: etapa de trainee y debut](/q/solo-los-verdaderos-monstiez-pueden-responder-correctamente)
- `solo-los-verdaderos-monstiez-pueden-responder-correctamente` links to [BABYMONSTER quiz](/babymonster-quiz); [BABYMONSTER Duos: Rukasa, Rorita and Ramyeon](/q/babymonster-quiz); [BABYMONSTER Members: Japan Line and High Notes](/q/do-you-know-babymon-well); [BABYMONSTER: Maknae, Agensi dan Formasi Awal](/q/babymon-fan-quiz-freya)

### K61 · Lngshot · Lngshot general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Lngshot quiz](/lngshot-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `lngshot` | Lngshot | coershotie | Player | 42 | 10 | 2026-10-17 |
| `lngshot-quiz` | Lngshot quiz | kpopfan4ever | Player | 8 | 10 | 2026-10-24 |
| `true-or-false-lngshot-edition` | true  or false LNGSHOT edition 👽 | stay | Player | 1 | 7 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `lngshot` | Lngshot for New Fans: Maknae and Albums (50) | Lngshot for new fans: the maknae and the albums | A light fan made Lngshot quiz: who the maknae is, how many albums they have and a few fun picks about biases and the next album. Made for new fans. (147) |
| `lngshot-quiz` | Lngshot Members: Leader, Maknae, Debut Date (54) | Lngshot members: leader, maknae and debut date | A Lngshot members quiz: who leads the group, who is the youngest, member birthdays and the debut date. Ten questions for fans of the new group. (143) |
| `true-or-false-lngshot-edition` | Lngshot True or False: Debut Song and Label (54) | Lngshot true or false: debut song and label | True or false on Lngshot: who runs the label, whether Moonwalkin was the debut song, the real fandom name and who leads the group. (130) |

Series links:

- `lngshot` links to [Lngshot quiz](/lngshot-quiz); [Lngshot Members: Leader, Maknae, Debut Date](/q/lngshot-quiz); [Lngshot True or False: Debut Song and Label](/q/true-or-false-lngshot-edition)
- `lngshot-quiz` links to [Lngshot quiz](/lngshot-quiz); [Lngshot for New Fans: Maknae and Albums](/q/lngshot); [Lngshot True or False: Debut Song and Label](/q/true-or-false-lngshot-edition)
- `true-or-false-lngshot-edition` links to [Lngshot quiz](/lngshot-quiz); [Lngshot for New Fans: Maknae and Albums](/q/lngshot); [Lngshot Members: Leader, Maknae, Debut Date](/q/lngshot-quiz)

### K62 · KickFlip · KickFlip general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [KickFlip quiz](/kickflip-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `kickflip-mega-quiz` | KickFlip mega quiz!! | weflip | Player | 80 | 20 | 2026-06-07 |
| `hardest-kickflip-quiz-in-the-world` | Hardest KickFlip quiz in the world!!!! | weflip | Player | 10 | 13 | 2026-06-12 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `kickflip-mega-quiz` | KickFlip Members: Leader, Maknae and Vocal Line (58) | KickFlip members: leader, maknae and vocal line | A long and easy KickFlip quiz: the leader Kyehoon, the member count, the maknae, the main vocalists and more member facts for WeFlip fans. (138) |
| `hardest-kickflip-quiz-in-the-world` | KickFlip Details: Albums, Songs and Merch (52) | KickFlip details: albums, songs and merch | For WeFlips who know the details: the members' birth years, which songs sit on Kick Out, Flip Now!, album inclusions and how many songs KickFlip has. (149) |

Series links:

- `kickflip-mega-quiz` links to [KickFlip quiz](/kickflip-quiz); [KickFlip Details: Albums, Songs and Merch](/q/hardest-kickflip-quiz-in-the-world)
- `hardest-kickflip-quiz-in-the-world` links to [KickFlip quiz](/kickflip-quiz); [KickFlip Members: Leader, Maknae and Vocal Line](/q/kickflip-mega-quiz)

### K63 · MONSTA X · MONSTA X general fan test

Retitle (highest shared share 17%, below the 60% merge line). Shared questions: `monsta-x-quiz` and `monsta-x-ultimate-fan-quiz` 17% (1/6).
Hub link: [MONSTA X quiz](/monsta-x-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `monsta-x-quiz` | MONSTA X quiz | exoplanet99 | Team | 194 | 6 | 2026-04-04 |
| `monsta-x-ultimate-fan-quiz` | MONSTA X Ultimate Fan Quiz | kpopquizz | Player | 11 | 10 | 2026-04-13 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `monsta-x-quiz` | MONSTA X Basics: No.Mercy, Starship and Debut (56) | MONSTA X basics: No.Mercy, Starship and the debut | The MONSTA X basics: how many members today, the survival show No.Mercy, the debut year and the label Starship Entertainment. A quick start for new fans. (153) |
| `monsta-x-ultimate-fan-quiz` | MONSTA X for MONBEBE: Debut, Rush and Hits (53) | MONSTA X for MONBEBE: the debut, Rush and the hits | An easy MONSTA X quiz: the debut year, the fandom name MONBEBE, the No.Mercy show, the debut era song Rush and later hits. (122) |

Series links:

- `monsta-x-quiz` links to [MONSTA X quiz](/monsta-x-quiz); [MONSTA X for MONBEBE: Debut, Rush and Hits](/q/monsta-x-ultimate-fan-quiz)
- `monsta-x-ultimate-fan-quiz` links to [MONSTA X quiz](/monsta-x-quiz); [MONSTA X Basics: No.Mercy, Starship and Debut](/q/monsta-x-quiz)

### K64 · SHINee · SHINee legends quiz

Retitle (highest shared share 17%, below the 60% merge line). Shared questions: `shinee-legends-quiz-k-pop-pioneers` and `shinee-legends-quiz` 17% (1/6).
Hub link: [SHINee quiz](/shinee-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `shinee-legends-quiz-k-pop-pioneers` | SHINee legends quiz - K-pop pioneers | yege | Player | 452 | 7 | 2026-03-13 |
| `shinee-legends-quiz` | SHINee legends quiz | exoplanet99 | Team | 154 | 6 | 2026-03-24 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `shinee-legends-quiz-k-pop-pioneers` | SHINee Origins: Replay, Members and Taemin (53) | SHINee origins: Replay, the members and Taemin | SHINee from the start: the May 2008 debut, the debut song Replay, the member count and why Taemin is known as one of K-pop's standout dancers. (142) |
| `shinee-legends-quiz` | SHINee Basics: Onew, Taemin and Replay (49) | SHINee basics: Onew, Taemin and Replay | An easy SHINee quiz: the debut year, the debut song Replay, the leader Onew and Taemin's solo dance career. A short first step into SHINee for new Shawols. (155) |

Series links:

- `shinee-legends-quiz-k-pop-pioneers` links to [SHINee quiz](/shinee-quiz); [SHINee Basics: Onew, Taemin and Replay](/q/shinee-legends-quiz)
- `shinee-legends-quiz` links to [SHINee quiz](/shinee-quiz); [SHINee Origins: Replay, Members and Taemin](/q/shinee-legends-quiz-k-pop-pioneers)

### K65 · TREASURE · TREASURE basics

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [TREASURE quiz](/treasure-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `treasure-basics` | TREASURE basics | kpophistory | Team | 107 | 5 | 2026-04-06 |
| `only-treasure-maker-can-pass-this-quiz` | Only Treasure maker can pass this quiz | siipa | Player | 23 | 10 | 2026-06-30 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `treasure-basics` | TREASURE Basics: YG Treasure Box and Debut (53) | TREASURE basics: YG Treasure Box and the debut | Start with TREASURE: the label YG, the member count, the survival show YG Treasure Box and the debut year. Five easy questions for new Teume. (141) |
| `only-treasure-maker-can-pass-this-quiz` | TREASURE Members: Leaders, Nicknames, Characters (59) | TREASURE members: leaders, nicknames and characters | A fan made TREASURE quiz: the leaders, birth years, who owns the woopy character and Doyoung's nickname. Ten questions for Treasure Makers. (139) |

Series links:

- `treasure-basics` links to [TREASURE quiz](/treasure-quiz); [TREASURE Members: Leaders, Nicknames, Characters](/q/only-treasure-maker-can-pass-this-quiz)
- `only-treasure-maker-can-pass-this-quiz` links to [TREASURE quiz](/treasure-quiz); [TREASURE Basics: YG Treasure Box and Debut](/q/treasure-basics)

### K66 · NCT DREAM · NCT DREAM (40% overlap)

Retitle (highest shared share 40%, below the 60% merge line). Shared questions: `nct-dream-quiz` and `nct-dream-hot-sauce-quiz` 40% (2/5).
Hub link: [NCT DREAM quiz](/nct-dream-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `nct-dream-quiz` | NCT Dream quiz | exoplanet99 | Team | 218 | 5 | 2026-03-28 |
| `nct-dream-hot-sauce-quiz` | NCT Dream: Hot Sauce Quiz | kpopquizz | Player | 12 | 10 | 2026-10-15 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `nct-dream-quiz` | NCT DREAM Basics: Chewing Gum to Hot Sauce (53) | NCT DREAM basics: from Chewing Gum to Hot Sauce | NCT DREAM in five questions: the debut song Chewing Gum, the million selling Hot Sauce, the fixed lineup and the members in both NCT 127 and NCT DREAM. (151) |
| `nct-dream-hot-sauce-quiz` | NCT DREAM History: Graduation System to Hot Sauce (60) | NCT DREAM history: the graduation system to Hot Sauce | How NCT DREAM grew up: the 2016 debut, the debut song, the parent group NCT, the original graduation system and the Hot Sauce era. (130) |

Series links:

- `nct-dream-quiz` links to [NCT DREAM quiz](/nct-dream-quiz); [NCT DREAM History: Graduation System to Hot Sauce](/q/nct-dream-hot-sauce-quiz)
- `nct-dream-hot-sauce-quiz` links to [NCT DREAM quiz](/nct-dream-quiz); [NCT DREAM Basics: Chewing Gum to Hot Sauce](/q/nct-dream-quiz)

### K67 · NCT 127 · NCT 127 basics

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [NCT 127 quiz](/nct-127-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `nct-127-basics` | NCT 127 basics | exoplanet99 | Team | 309 | 6 | 2026-04-01 |
| `nct-basics-oct-2026` | NCT Basics (OCT 2026) | staytinyzen | Player | 1 | 6 | 2026-10-24 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `nct-127-basics` | NCT 127 Basics: The Name, Taeyong and SM (51) | NCT 127 basics: the name, Taeyong and SM | What does 127 stand for in NCT 127? Learn the meaning of the name, the label, the leader Taeyong and the debut year in this short NCT 127 starter quiz. (151) |
| `nct-basics-oct-2026` | NCT Units Odd One Out: 127, DREAM, WayV, WISH (56) | NCT units odd one out: 127, DREAM, WayV and WISH | Find the odd one out across the NCT units: who is not in NCT 127, who is not Japanese, who is not Korean and more picture questions on the members. (147) |

Series links:

- `nct-127-basics` links to [NCT 127 quiz](/nct-127-quiz); [NCT Units Odd One Out: 127, DREAM, WayV, WISH](/q/nct-basics-oct-2026)
- `nct-basics-oct-2026` links to [NCT 127 quiz](/nct-127-quiz); [NCT 127 Basics: The Name, Taeyong and SM](/q/nct-127-basics)

### K68 · Girls' Generation · Girls' Generation general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Girls' Generation quiz](/girls-generation-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `one-for-sones` | One for Sones | jellytaengs | Player | 438 | 8 | 2026-09-11 |
| `girls-generation-the-legend-quiz` | Girls' Generation: The Legend Quiz | kpopquizz | Player | 6 | 10 | 2026-05-04 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `one-for-sones` | Girls' Generation Members: Leader and Debut Song (59) | Girls' Generation members: the leader and the debut song | A fan made Girls' Generation quiz: the debut song Into the New World, the leader Taeyeon, the member known for her eye smile and the former member. (147) |
| `girls-generation-the-legend-quiz` | Girls' Generation History: Debut to Gee (50) | Girls' Generation history: from the debut to Gee | An easy Girls' Generation history quiz: the 2007 debut, the debut lineup, the fandom name SONE and Gee, the 2009 hit that spread across Asia. (141) |

Series links:

- `one-for-sones` links to [Girls' Generation quiz](/girls-generation-quiz); [Girls' Generation History: Debut to Gee](/q/girls-generation-the-legend-quiz)
- `girls-generation-the-legend-quiz` links to [Girls' Generation quiz](/girls-generation-quiz); [Girls' Generation Members: Leader and Debut Song](/q/one-for-sones)

### K69 · BIGBANG · BIGBANG general fan test

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [BIGBANG quiz](/bigbang-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `bigbang-legends-quiz` | BIGBANG legends quiz | pinkvelvet | Team | 231 | 6 | 2026-04-01 |
| `bigbang-vips-only-quiz` | BIGBANG: VIPs Only Quiz | kpopquizz | Player | 8 | 10 | 2026-05-18 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `bigbang-legends-quiz` | BIGBANG Basics: YG, G-Dragon and VIP (47) | BIGBANG basics: YG, G-Dragon and VIP | The BIGBANG basics: the debut year, the label YG Entertainment, the leader G-Dragon and the fandom name VIP. Six questions for a quick start. (141) |
| `bigbang-vips-only-quiz` | BIGBANG Real Names and Award Winning Hits (52) | BIGBANG real names and award winning hits | An easy BIGBANG quiz for VIPs: the 2006 debut, the real names of G-Dragon and Taeyang and the songs that won Song of the Year, starting with Lies. (146) |

Series links:

- `bigbang-legends-quiz` links to [BIGBANG quiz](/bigbang-quiz); [BIGBANG Real Names and Award Winning Hits](/q/bigbang-vips-only-quiz)
- `bigbang-vips-only-quiz` links to [BIGBANG quiz](/bigbang-quiz); [BIGBANG Basics: YG, G-Dragon and VIP](/q/bigbang-legends-quiz)

### K70 · TUIDE · TUIDE duplicate titles

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [TUIDE quiz](/tuide-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `only-a-real-tunes-can-pass-this-` | ONLY A REAL TUNES CAN PASS THIS !!! | fearnot | Player | 84 | 8 | 2026-09-27 |
| `only-a-real-tunes-can-pass-this--2` | ONLY A REAL TUNES CAN PASS THIS !!! | fearnot | Player | 19 | 5 | 2026-09-29 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `only-a-real-tunes-can-pass-this-` | TUIDE True or False: Leader, Maknae, Debut (53) | TUIDE true or false: leader, maknae and debut | A hard TUIDE true or false for TUNES: who is the maknae, who leads the group, who is the main vocalist and whether Sun Kiss was the debut song. (143) |
| `only-a-real-tunes-can-pass-this--2` | Guess the TUIDE Member from Clues (44) | Guess the TUIDE member from clues | Read the clues and name the TUIDE member: the second maknae, the center, the former SM trainee and the official dancer and rapper. A clue round for TUNES. (154) |

Series links:

- `only-a-real-tunes-can-pass-this-` links to [TUIDE quiz](/tuide-quiz); [Guess the TUIDE Member from Clues](/q/only-a-real-tunes-can-pass-this--2)
- `only-a-real-tunes-can-pass-this--2` links to [TUIDE quiz](/tuide-quiz); [TUIDE True or False: Leader, Maknae, Debut](/q/only-a-real-tunes-can-pass-this-)

## kpopquiz.org: General K-pop topic clusters

These quizzes all sit in the General K-pop group, so they compete with each other for topic queries such as "kpop fandom names quiz". Hub link for all: [General K-pop quiz](/general-kpop-quiz).

### G01 · General K-pop · Fandom names

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-fandom-names-true-or-false` | K-pop fandom names true or false | kpophistory | Team | 920 | 6 | 2026-04-08 |
| `k-pop-fandom-names-quiz` | K-pop fandom names quiz | kpophistory | Team | 352 | 6 | 2026-03-24 |
| `name-the-group-from-the-fandom-name` | Name the group from the fandom name | kpophistory | Team | 120 | 6 | 2026-03-26 |
| `k-pop-fandoms-true-or-false` | K-pop Fandoms True or False | kpopquizz | Player | 35 | 10 | 2026-04-06 |
| `guess-the-groups-fan-name` | guess the groups fan name😛 | stay | Player | 12 | 19 | 2026-10-24 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-fandom-names-true-or-false` | K-pop Fandom Names: True or False Mixups (51) | K-pop fandom names: true or false mixups | Is ONCE the BLACKPINK fandom? Is STAY the ITZY fandom? Spot the swapped K-pop fandom names in this easy true or false round on big groups. (138) |
| `k-pop-fandom-names-quiz` | K-pop Fandom Names: Match Group to Fandom (52) | K-pop fandom names: match each group to its fandom | Pick the right fandom name for each K-pop group: ARMY, BLINK, ONCE, STAY and more. A multiple choice round on the fandoms of well known groups. (143) |
| `name-the-group-from-the-fandom-name` | Name the Group from Its Fandom Name (46) | Name the K-pop group from its fandom name | The reverse round: read a fandom name like MOA, ENGENE, MY or FEARNOT and name the K-pop group it belongs to. Harder than matching the big names. (145) |
| `k-pop-fandoms-true-or-false` | K-pop Fandoms True or False: An Easy Round (53) | K-pop fandoms true or false: an easy round | An easy K-pop fandom true or false: ARMY, BLINK, ONCE, EXO-L and more statements to check. A good first round before the harder fandom quizzes. (143) |
| `guess-the-groups-fan-name` | Guess the Fan Name: New and Big K-pop Groups (55) | Guess the fan name of new and big K-pop groups | A long fan made round: read a group name and guess its fandom name, from TWICE and SEVENTEEN to newer groups like LNGSHOT. Nineteen groups to name. (147) |

Series links:

- `k-pop-fandom-names-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fandom Names: Match Group to Fandom](/q/k-pop-fandom-names-quiz); [Name the Group from Its Fandom Name](/q/name-the-group-from-the-fandom-name); [K-pop Fandoms True or False: An Easy Round](/q/k-pop-fandoms-true-or-false)
- `k-pop-fandom-names-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fandom Names: True or False Mixups](/q/k-pop-fandom-names-true-or-false); [Name the Group from Its Fandom Name](/q/name-the-group-from-the-fandom-name); [K-pop Fandoms True or False: An Easy Round](/q/k-pop-fandoms-true-or-false)
- `name-the-group-from-the-fandom-name` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fandom Names: True or False Mixups](/q/k-pop-fandom-names-true-or-false); [K-pop Fandom Names: Match Group to Fandom](/q/k-pop-fandom-names-quiz); [K-pop Fandoms True or False: An Easy Round](/q/k-pop-fandoms-true-or-false)
- `k-pop-fandoms-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fandom Names: True or False Mixups](/q/k-pop-fandom-names-true-or-false); [K-pop Fandom Names: Match Group to Fandom](/q/k-pop-fandom-names-quiz); [Name the Group from Its Fandom Name](/q/name-the-group-from-the-fandom-name)
- `guess-the-groups-fan-name` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fandom Names: True or False Mixups](/q/k-pop-fandom-names-true-or-false); [K-pop Fandom Names: Match Group to Fandom](/q/k-pop-fandom-names-quiz); [Name the Group from Its Fandom Name](/q/name-the-group-from-the-fandom-name)

### G02 · General K-pop · Match the group to the company

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-company-quiz-match-the-group-to-the-label` | K-pop company quiz - match the group to the label | mina | Player | 1694 | 8 | 2026-03-24 |
| `k-pop-companies-quiz` | K-pop companies quiz | kpophistory | Team | 184 | 6 | 2026-04-08 |
| `which-company-is-this-group-from` | Which company is this group from? | kpophistory | Team | 65 | 6 | 2026-03-28 |
| `which-company-does-this-idol-belong-to` | Which Company Does This Idol Belong To? | idol_expert | Player | 22 | 10 | 2026-04-05 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-company-quiz-match-the-group-to-the-label` | Match the K-pop Group to Its Label (45) | Match the K-pop group to its label | Which company manages Stray Kids, IVE, (G)I-DLE or NewJeans? Match each K-pop group to its label in this easy round on the agencies behind the groups. (150) |
| `k-pop-companies-quiz` | K-pop Companies: Big 3, HYBE and Pledis (50) | K-pop companies: the Big 3, HYBE and Pledis | Questions on the K-pop companies themselves: the Big 3, what HYBE was called before, which label holds SEVENTEEN and fromis_9 and who manages TWICE. (148) |
| `which-company-is-this-group-from` | Which Label Is This Group From: HYBE and More (56) | Which label is this group from: HYBE labels and more | Name the label behind each group, including the HYBE sub-labels: BELIFT LAB for ENHYPEN, Big Hit Music for TXT, Cube for (G)I-DLE and more. (139) |
| `which-company-does-this-idol-belong-to` | Which Company Is This Idol From? Photo Round (55) | Which company is this idol from? A photo round | Look at an idol's photo and pick the company they belong to: SM, YG, JYP, ADOR and others. An easy picture round on idols and their agencies. (141) |

Series links:

- `k-pop-company-quiz-match-the-group-to-the-label` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Companies: Big 3, HYBE and Pledis](/q/k-pop-companies-quiz); [Which Label Is This Group From: HYBE and More](/q/which-company-is-this-group-from); [Which Company Is This Idol From? Photo Round](/q/which-company-does-this-idol-belong-to)
- `k-pop-companies-quiz` links to [General K-pop quiz](/general-kpop-quiz); [Match the K-pop Group to Its Label](/q/k-pop-company-quiz-match-the-group-to-the-label); [Which Label Is This Group From: HYBE and More](/q/which-company-is-this-group-from); [Which Company Is This Idol From? Photo Round](/q/which-company-does-this-idol-belong-to)
- `which-company-is-this-group-from` links to [General K-pop quiz](/general-kpop-quiz); [Match the K-pop Group to Its Label](/q/k-pop-company-quiz-match-the-group-to-the-label); [K-pop Companies: Big 3, HYBE and Pledis](/q/k-pop-companies-quiz); [Which Company Is This Idol From? Photo Round](/q/which-company-does-this-idol-belong-to)
- `which-company-does-this-idol-belong-to` links to [General K-pop quiz](/general-kpop-quiz); [Match the K-pop Group to Its Label](/q/k-pop-company-quiz-match-the-group-to-the-label); [K-pop Companies: Big 3, HYBE and Pledis](/q/k-pop-companies-quiz); [Which Label Is This Group From: HYBE and More](/q/which-company-is-this-group-from)

### G03 · General K-pop · Company and industry facts

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-industry-business-quiz` | K-pop industry business quiz | kpophistory | Team | 69 | 5 | 2026-04-09 |
| `k-pop-label-structure-and-companies` | K-pop Label Structure and Companies | kpopquizz | Player | 31 | 10 | 2026-04-23 |
| `k-pop-company-facts-true-or-false` | K-pop Company Facts True or False | kpopquizz | Player | 17 | 10 | 2026-10-18 |
| `k-pop-agencies-true-or-false` | K-pop Agencies True or False | kpopquizz | Player | 10 | 10 | 2026-05-29 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-industry-business-quiz` | K-pop Industry Business: Contracts and Fansigns (58) | K-pop industry business: contracts and fansigns | How the K-pop business works: typical contract lengths, the HYBE listing, where album revenue comes from and what a fansign event is. Five questions. (149) |
| `k-pop-label-structure-and-companies` | K-pop Label Structure: Big Three and HYBE Roots (58) | K-pop label structure: the Big Three and HYBE roots | An easy round on how K-pop labels are organized: the Big Three, the company HYBE started as and which agency is home to TWICE, Stray Kids and BLACKPINK. (152) |
| `k-pop-company-facts-true-or-false` | K-pop Company Facts True or False: Founders (54) | K-pop company facts true or false: the founders | True or false on K-pop companies: which agency was founded first, who founded JYP, HYBE's old name and which groups each label manages. (135) |
| `k-pop-agencies-true-or-false` | K-pop Agencies True or False: Big 3, Trainees (56) | K-pop agencies true or false: the Big 3 and trainees | Easy true or false on K-pop agencies: who makes up the Big 3, HYBE's original name, how long trainees train and which label manages IVE. (136) |

Series links:

- `k-pop-industry-business-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Label Structure: Big Three and HYBE Roots](/q/k-pop-label-structure-and-companies); [K-pop Company Facts True or False: Founders](/q/k-pop-company-facts-true-or-false); [K-pop Agencies True or False: Big 3, Trainees](/q/k-pop-agencies-true-or-false)
- `k-pop-label-structure-and-companies` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Industry Business: Contracts and Fansigns](/q/k-pop-industry-business-quiz); [K-pop Company Facts True or False: Founders](/q/k-pop-company-facts-true-or-false); [K-pop Agencies True or False: Big 3, Trainees](/q/k-pop-agencies-true-or-false)
- `k-pop-company-facts-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Industry Business: Contracts and Fansigns](/q/k-pop-industry-business-quiz); [K-pop Label Structure: Big Three and HYBE Roots](/q/k-pop-label-structure-and-companies); [K-pop Agencies True or False: Big 3, Trainees](/q/k-pop-agencies-true-or-false)
- `k-pop-agencies-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Industry Business: Contracts and Fansigns](/q/k-pop-industry-business-quiz); [K-pop Label Structure: Big Three and HYBE Roots](/q/k-pop-label-structure-and-companies); [K-pop Company Facts True or False: Founders](/q/k-pop-company-facts-true-or-false)

### G04 · General K-pop · Debut years and timelines

Retitle (highest shared share 33%, below the 60% merge line). Shared questions: `which-k-pop-group-debuted-first-timeline-challenge` and `k-pop-debut-years-challenge` 33% (2/6).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `which-k-pop-group-debuted-first-timeline-challenge` | Which K-pop group debuted first? Timeline challenge | mina | Player | 1288 | 8 | 2026-03-15 |
| `k-pop-debut-years-challenge` | K-pop debut years challenge | skzrealm | Team | 141 | 6 | 2026-04-04 |
| `k-pop-debut-years-true-or-false` | K-pop debut years true or false | skzrealm | Team | 129 | 7 | 2026-04-10 |
| `k-pop-debuts-and-disbandments-true-or-false` | K-pop Debuts and Disbandments True or False | kpopquizz | Player | 36 | 10 | 2026-05-27 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `which-k-pop-group-debuted-first-timeline-challenge` | Which K-pop Group Debuted First? Head to Head (56) | Which K-pop group debuted first? Head to head | Two or more groups, one question: which debuted first? EXO, MAMAMOO, Stray Kids, aespa and more in a timeline round across the generations. (139) |
| `k-pop-debut-years-challenge` | K-pop Debut Years: Pick the Earlier Group (52) | K-pop debut years: pick the earlier group | Pick the group that debuted earlier, then name the group from a debut year: EXO, BLACKPINK, SHINee, NewJeans and more. Answers show the debut year. (147) |
| `k-pop-debut-years-true-or-false` | K-pop Debut Years True or False (42) | K-pop debut years true or false | Did BTS debut before EXO? Did BLACKPINK and TWICE debut the same year? Check the debut years of big K-pop groups in this true or false round. (141) |
| `k-pop-debuts-and-disbandments-true-or-false` | K-pop Debuts and Disbandments: True or False (55) | K-pop debuts and disbandments: true or false | Easy true or false on K-pop history: Wonder Girls on the Hot 100, 2PM and 2AM's shared origin, the end of f(x) and KARA's success in Japan. (139) |

Series links:

- `which-k-pop-group-debuted-first-timeline-challenge` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Debut Years: Pick the Earlier Group](/q/k-pop-debut-years-challenge); [K-pop Debut Years True or False](/q/k-pop-debut-years-true-or-false); [K-pop Debuts and Disbandments: True or False](/q/k-pop-debuts-and-disbandments-true-or-false)
- `k-pop-debut-years-challenge` links to [General K-pop quiz](/general-kpop-quiz); [Which K-pop Group Debuted First? Head to Head](/q/which-k-pop-group-debuted-first-timeline-challenge); [K-pop Debut Years True or False](/q/k-pop-debut-years-true-or-false); [K-pop Debuts and Disbandments: True or False](/q/k-pop-debuts-and-disbandments-true-or-false)
- `k-pop-debut-years-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [Which K-pop Group Debuted First? Head to Head](/q/which-k-pop-group-debuted-first-timeline-challenge); [K-pop Debut Years: Pick the Earlier Group](/q/k-pop-debut-years-challenge); [K-pop Debuts and Disbandments: True or False](/q/k-pop-debuts-and-disbandments-true-or-false)
- `k-pop-debuts-and-disbandments-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [Which K-pop Group Debuted First? Head to Head](/q/which-k-pop-group-debuted-first-timeline-challenge); [K-pop Debut Years: Pick the Earlier Group](/q/k-pop-debut-years-challenge); [K-pop Debut Years True or False](/q/k-pop-debut-years-true-or-false)

### G05 · General K-pop · Debut songs

Retitle (highest shared share 14%, below the 60% merge line). Shared questions: `k-pop-debut-songs-true-or-false` and `true-or-false-debut-songs` 14% (1/7).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-debut-songs-name-the-group` | K-pop debut songs - name the group | kpophistory | Team | 145 | 7 | 2026-03-25 |
| `k-pop-debut-songs-true-or-false` | K-pop debut songs true or false | kpophistory | Team | 102 | 7 | 2026-03-23 |
| `true-or-false-debut-songs` | True or False: Debut Songs | light_a_matz | Player | 7 | 20 | 2026-07-28 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-debut-songs-name-the-group` | Name the Group from Its Debut Song (45) | Name the K-pop group from its debut song | DALLA DALLA, Black Mamba, ELEVEN, O.O: read the debut song and name the group. A round on the debut tracks of girl and boy groups. (130) |
| `k-pop-debut-songs-true-or-false` | K-pop Debut Songs True or False: Big Groups (54) | K-pop debut songs true or false: the big groups | Was As If It's Your Last the BLACKPINK debut? Was Next Level the aespa debut? Check debut song claims about big K-pop groups, true or false. (140) |
| `true-or-false-debut-songs` | Debut Songs True or False: A Long Round (50) | Debut songs true or false: a long round | A long and easy true or false on K-pop debut songs, from Girls' Generation and BTS to Stray Kids and LE SSERAFIM. Twenty statements to judge. (141) |

Series links:

- `k-pop-debut-songs-name-the-group` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Debut Songs True or False: Big Groups](/q/k-pop-debut-songs-true-or-false); [Debut Songs True or False: A Long Round](/q/true-or-false-debut-songs)
- `k-pop-debut-songs-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [Name the Group from Its Debut Song](/q/k-pop-debut-songs-name-the-group); [Debut Songs True or False: A Long Round](/q/true-or-false-debut-songs)
- `true-or-false-debut-songs` links to [General K-pop quiz](/general-kpop-quiz); [Name the Group from Its Debut Song](/q/k-pop-debut-songs-name-the-group); [K-pop Debut Songs True or False: Big Groups](/q/k-pop-debut-songs-true-or-false)

### G06 · General K-pop · K-pop generations

Retitle (highest shared share 20%, below the 60% merge line). Shared questions: `k-pop-2nd-generation-legends` and `k-pop-generations-quiz` 20% (1/5).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `find-the-3rd-gen-intruder-among-4th-gen` | Find the 3rd Gen Intruder Among 4th Gen | idol_expert | Player | 138 | 10 | 2026-04-05 |
| `k-pop-2nd-generation-legends` | K-pop 2nd generation legends | exoplanet99 | Team | 137 | 5 | 2026-04-13 |
| `k-pop-girl-group-generations-timeline` | K-pop girl group generations timeline | kpophistory | Team | 117 | 5 | 2026-03-31 |
| `k-pop-generations-quiz` | K-pop generations quiz | kpophistory | Team | 97 | 6 | 2026-04-05 |
| `k-pop-boy-group-generations-timeline` | K-pop boy group generations timeline | kpophistory | Team | 79 | 5 | 2026-04-08 |
| `k-pop-generation-history` | K-pop Generation History | kpopquizz | Player | 24 | 10 | 2026-05-11 |
| `4th-gen-groups-true-or-false` | 4th Gen Groups True or False | kpopquizz | Player | 22 | 10 | 2026-05-19 |
| `3rd-generation-k-pop-true-or-false` | 3rd Generation K-pop True or False | kpopquizz | Player | 18 | 10 | 2026-06-03 |
| `gen-5-k-pop-can-you-name-the-group` | Gen 5 K-Pop : Can you name the group? | light_a_matz | Player | 13 | 20 | 2026-07-27 |
| `4th-gen-boy-groups-quiz` | 4th Gen Boy Groups Quiz | light_a_matz | Player | 8 | 20 | 2026-07-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `find-the-3rd-gen-intruder-among-4th-gen` | Find the 3rd Gen Idol Among 4th Gen Idols (52) | Find the 3rd gen idol among 4th gen idols | Each round shows idols from 4th gen groups and one from the 3rd generation: find the odd one out, from Irene and Momo to Jungkook and Mark. (139) |
| `k-pop-2nd-generation-legends` | 2nd Generation K-pop: BIGBANG to Wonder Girls (56) | 2nd generation K-pop: BIGBANG to Wonder Girls | The 2nd generation of K-pop in five questions: BIGBANG, Super Junior and Sorry Sorry, Wonder Girls with Tell Me and Nobody, and the labels behind them. (151) |
| `k-pop-girl-group-generations-timeline` | Girl Group Generations: Put Debuts in Order (54) | Girl group generations: put the debuts in order | Put K-pop girl groups in debut order, from Girls' Generation and 2NE1 to ITZY, aespa, IVE and NewJeans, then settle a few head to head debuts. (142) |
| `k-pop-generations-quiz` | Which K-pop Generation? Seo Taiji to NewJeans (56) | Which K-pop generation? From Seo Taiji to NewJeans | Place groups in their K-pop generation: the 1st generation pioneers, the start of the 2nd, EXO and BTS in the 3rd and NewJeans and IVE in the 4th. (146) |
| `k-pop-boy-group-generations-timeline` | Boy Group Generations: Put Debuts in Order (53) | Boy group generations: put the debuts in order | A hard timeline round: order K-pop boy groups by debut, from BIGBANG and SHINee to EXO and BTS, then Stray Kids, ATEEZ, TXT and later groups. (141) |
| `k-pop-generation-history` | K-pop Generation History: H.O.T. to 4th Gen (54) | K-pop generation history: from H.O.T. to the 4th gen | An easy history of the K-pop generations: when H.O.T. debuted, where Girls' Generation fits, the 3rd generation names and when the 4th began. (141) |
| `4th-gen-groups-true-or-false` | 4th Gen Groups True or False: NewJeans to TXT (56) | 4th gen groups true or false: NewJeans to TXT | True or false on 4th generation groups: NewJeans' debut year, ENHYPEN and I-LAND, what TXT stands for, aespa's member count and more. (133) |
| `3rd-generation-k-pop-true-or-false` | 3rd Gen K-pop True or False: EXO, BTS, TWICE (55) | 3rd gen K-pop true or false: EXO, BTS and TWICE | Easy true or false on the 3rd generation: EXO's debut lineup, BTS's hip-hop start, TWICE and Sixteen, Red Velvet's debut lineup and more. (137) |
| `gen-5-k-pop-can-you-name-the-group` | Name the Newest K-pop Groups from a Photo (52) | Name the newest K-pop groups from a photo | A long picture round on the newest wave of K-pop: name CORTIS, BABYMONSTER, BOYNEXTDOOR, ILLIT and more groups from one photo each. (131) |
| `4th-gen-boy-groups-quiz` | 4th Gen Boy Groups: Match Songs to Groups (52) | 4th gen boy groups: match songs to groups | Which group sang My Turn, which group has no Deja Vu, which songs are not ATEEZ? A long song round on 4th gen boy groups like CRAVITY, TXT and ENHYPEN. (151) |

Series links:

- `find-the-3rd-gen-intruder-among-4th-gen` links to [General K-pop quiz](/general-kpop-quiz); [2nd Generation K-pop: BIGBANG to Wonder Girls](/q/k-pop-2nd-generation-legends)
- `k-pop-2nd-generation-legends` links to [General K-pop quiz](/general-kpop-quiz); [Find the 3rd Gen Idol Among 4th Gen Idols](/q/find-the-3rd-gen-intruder-among-4th-gen); [Girl Group Generations: Put Debuts in Order](/q/k-pop-girl-group-generations-timeline)
- `k-pop-girl-group-generations-timeline` links to [General K-pop quiz](/general-kpop-quiz); [2nd Generation K-pop: BIGBANG to Wonder Girls](/q/k-pop-2nd-generation-legends); [Which K-pop Generation? Seo Taiji to NewJeans](/q/k-pop-generations-quiz)
- `k-pop-generations-quiz` links to [General K-pop quiz](/general-kpop-quiz); [Girl Group Generations: Put Debuts in Order](/q/k-pop-girl-group-generations-timeline); [Boy Group Generations: Put Debuts in Order](/q/k-pop-boy-group-generations-timeline)
- `k-pop-boy-group-generations-timeline` links to [General K-pop quiz](/general-kpop-quiz); [Which K-pop Generation? Seo Taiji to NewJeans](/q/k-pop-generations-quiz); [K-pop Generation History: H.O.T. to 4th Gen](/q/k-pop-generation-history)
- `k-pop-generation-history` links to [General K-pop quiz](/general-kpop-quiz); [Boy Group Generations: Put Debuts in Order](/q/k-pop-boy-group-generations-timeline); [4th Gen Groups True or False: NewJeans to TXT](/q/4th-gen-groups-true-or-false)
- `4th-gen-groups-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Generation History: H.O.T. to 4th Gen](/q/k-pop-generation-history); [3rd Gen K-pop True or False: EXO, BTS, TWICE](/q/3rd-generation-k-pop-true-or-false)
- `3rd-generation-k-pop-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [4th Gen Groups True or False: NewJeans to TXT](/q/4th-gen-groups-true-or-false); [Name the Newest K-pop Groups from a Photo](/q/gen-5-k-pop-can-you-name-the-group)
- `gen-5-k-pop-can-you-name-the-group` links to [General K-pop quiz](/general-kpop-quiz); [3rd Gen K-pop True or False: EXO, BTS, TWICE](/q/3rd-generation-k-pop-true-or-false); [4th Gen Boy Groups: Match Songs to Groups](/q/4th-gen-boy-groups-quiz)
- `4th-gen-boy-groups-quiz` links to [General K-pop quiz](/general-kpop-quiz); [Name the Newest K-pop Groups from a Photo](/q/gen-5-k-pop-can-you-name-the-group)

### G07 · General K-pop · Lightsticks

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-lightstick-colors-and-shapes` | K-pop lightstick colors and shapes | kpophistory | Team | 171 | 6 | 2026-03-28 |
| `guess-the-group-from-their-lightstick-girl-groups` | Guess the group from their lightstick - Girl Groups | light_a_matz | Player | 141 | 20 | 2026-07-31 |
| `k-pop-group-colors-and-lightsticks` | K-pop Group Colors and Lightsticks | kpopquizz | Player | 24 | 10 | 2026-06-23 |
| `guess-the-group-from-their-lightstick-boy-groups` | Guess the group from their lightstick - Boy Groups | light_a_matz | Player | 24 | 20 | 2026-07-30 |
| `k-pop-concert-and-light-stick-culture` | K-pop Concert and Light Stick Culture | kpopquizz | Player | 11 | 10 | 2026-06-14 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-lightstick-colors-and-shapes` | K-pop Lightsticks True or False: Names, Shapes (57) | K-pop lightsticks true or false: names and shapes | True or false on K-pop lightsticks: the color of the ARMY Bomb, TWICE's Candy Bong, the shape of BLACKPINK's lightstick and SEVENTEEN's Carat Bong. (147) |
| `guess-the-group-from-their-lightstick-girl-groups` | Guess the Girl Group from Its Lightstick (51) | Guess the K-pop girl group from its lightstick | A long picture round: see a lightstick and name the girl group, from LOONA and Red Velvet to NewJeans and ILLIT. Twenty lightsticks to recognize. (145) |
| `k-pop-group-colors-and-lightsticks` | K-pop Official Colors and Lightstick Names (53) | K-pop official colors and lightstick names | Match K-pop groups to their official colors and lightstick names: BTS purple and the ARMY Bomb, BLACKPINK pink and black, SEVENTEEN's Carat Bong and more. (154) |
| `guess-the-group-from-their-lightstick-boy-groups` | Guess the Boy Group from Its Lightstick (50) | Guess the K-pop boy group from its lightstick | A long picture round: see a lightstick and name the boy group, from BTS and SHINee to TXT and THE BOYZ. Twenty lightsticks to recognize. (136) |
| `k-pop-concert-and-light-stick-culture` | K-pop Concert Culture: Light Sync, Fan Projects (58) | K-pop concert culture: light sync and fan projects | How K-pop concerts work for fans: what the ARMY Bomb is, why Bluetooth lightsticks matter, what a fan project is and what happens at a hi-touch event. (150) |

Series links:

- `k-pop-lightstick-colors-and-shapes` links to [General K-pop quiz](/general-kpop-quiz); [Guess the Girl Group from Its Lightstick](/q/guess-the-group-from-their-lightstick-girl-groups); [K-pop Official Colors and Lightstick Names](/q/k-pop-group-colors-and-lightsticks); [Guess the Boy Group from Its Lightstick](/q/guess-the-group-from-their-lightstick-boy-groups)
- `guess-the-group-from-their-lightstick-girl-groups` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Lightsticks True or False: Names, Shapes](/q/k-pop-lightstick-colors-and-shapes); [K-pop Official Colors and Lightstick Names](/q/k-pop-group-colors-and-lightsticks); [Guess the Boy Group from Its Lightstick](/q/guess-the-group-from-their-lightstick-boy-groups)
- `k-pop-group-colors-and-lightsticks` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Lightsticks True or False: Names, Shapes](/q/k-pop-lightstick-colors-and-shapes); [Guess the Girl Group from Its Lightstick](/q/guess-the-group-from-their-lightstick-girl-groups); [Guess the Boy Group from Its Lightstick](/q/guess-the-group-from-their-lightstick-boy-groups)
- `guess-the-group-from-their-lightstick-boy-groups` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Lightsticks True or False: Names, Shapes](/q/k-pop-lightstick-colors-and-shapes); [Guess the Girl Group from Its Lightstick](/q/guess-the-group-from-their-lightstick-girl-groups); [K-pop Official Colors and Lightstick Names](/q/k-pop-group-colors-and-lightsticks)
- `k-pop-concert-and-light-stick-culture` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Lightsticks True or False: Names, Shapes](/q/k-pop-lightstick-colors-and-shapes); [Guess the Girl Group from Its Lightstick](/q/guess-the-group-from-their-lightstick-girl-groups); [K-pop Official Colors and Lightstick Names](/q/k-pop-group-colors-and-lightsticks)

### G08 · General K-pop · Idols and food

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-food-quiz-idols-and-their-favorites` | K-pop food quiz - idols and their favorites | kpophistory | Team | 207 | 6 | 2026-04-04 |
| `k-pop-food-and-mukbang-culture` | K-pop food and mukbang culture | twiceland | Team | 203 | 6 | 2026-04-11 |
| `k-pop-idols-and-food` | K-pop Idols and Food | kpopquizz | Player | 18 | 10 | 2026-10-16 |
| `cooking-like-a-chef-food-drinks-in-k-pop` | Cooking Like A Chef - Food & Drinks in K-Pop | light_a_matz | Player | 4 | 20 | 2026-07-13 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-food-quiz-idols-and-their-favorites` | K-pop Idols' Favorite Foods: True or False (53) | K-pop idols' favorite foods: true or false | True or false on K-pop idols and food: Jin's restaurant dream, why fried chicken is everywhere in idol content and what tteokbokki actually is. (143) |
| `k-pop-food-and-mukbang-culture` | K-pop Mukbang Culture: True or False (47) | K-pop mukbang culture: true or false | Judge statements about food in K-pop: Jin's cooking, why idols film mukbang eating broadcasts and how strict trainee diets can be. True or false. (145) |
| `k-pop-idols-and-food` | K-pop Idols and Food: Eat Jin to Tteokbokki (54) | K-pop idols and food: from Eat Jin to tteokbokki | An easy multiple choice round on idols and food: the Eat Jin show, the street food that shows up most in variety shows and what mukbang means. (142) |
| `cooking-like-a-chef-food-drinks-in-k-pop` | Food and Drinks in K-pop Songs (41) | Food and drinks in K-pop songs | Which group sang about Ice Cream Cake and Milkshake? Who says cooking like a chef? A long round on food and drink in K-pop song titles and lines. (145) |

Series links:

- `k-pop-food-quiz-idols-and-their-favorites` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Mukbang Culture: True or False](/q/k-pop-food-and-mukbang-culture); [K-pop Idols and Food: Eat Jin to Tteokbokki](/q/k-pop-idols-and-food); [Food and Drinks in K-pop Songs](/q/cooking-like-a-chef-food-drinks-in-k-pop)
- `k-pop-food-and-mukbang-culture` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Idols' Favorite Foods: True or False](/q/k-pop-food-quiz-idols-and-their-favorites); [K-pop Idols and Food: Eat Jin to Tteokbokki](/q/k-pop-idols-and-food); [Food and Drinks in K-pop Songs](/q/cooking-like-a-chef-food-drinks-in-k-pop)
- `k-pop-idols-and-food` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Idols' Favorite Foods: True or False](/q/k-pop-food-quiz-idols-and-their-favorites); [K-pop Mukbang Culture: True or False](/q/k-pop-food-and-mukbang-culture); [Food and Drinks in K-pop Songs](/q/cooking-like-a-chef-food-drinks-in-k-pop)
- `cooking-like-a-chef-food-drinks-in-k-pop` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Idols' Favorite Foods: True or False](/q/k-pop-food-quiz-idols-and-their-favorites); [K-pop Mukbang Culture: True or False](/q/k-pop-food-and-mukbang-culture); [K-pop Idols and Food: Eat Jin to Tteokbokki](/q/k-pop-idols-and-food)

### G09 · General K-pop · Idols in dramas

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-idols-in-dramas-true-or-false` | K-pop idols in dramas true or false | kpophistory | Team | 205 | 6 | 2026-04-01 |
| `k-pop-idols-in-korean-dramas` | K-pop idols in Korean dramas | kpophistory | Team | 124 | 5 | 2026-03-28 |
| `k-pop-idols-who-act` | K-pop Idols Who Act | kpopquizz | Player | 13 | 10 | 2026-10-19 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-idols-in-dramas-true-or-false` | Idols in K-dramas True or False: Who Starred (55) | Idols in K-dramas true or false: who starred where | Did V act in Hwarang? Was Jennie in Hotel Del Luna? Check which K-pop idols really starred in which Korean dramas in this true or false round. (142) |
| `k-pop-idols-in-korean-dramas` | K-pop Idols in Korean Dramas: Match the Role (55) | K-pop idols in Korean dramas: match the role | Match idols to their Korean drama roles: the BTS member in Hwarang, the BLACKPINK member in Snowdrop and the EXO member in 100 Days My Prince. (142) |
| `k-pop-idols-who-act` | K-pop Idol Actors: Films, Dramas, Streaming (54) | K-pop idol actors: films, dramas and streaming | An easy round on idols who act: D.O.'s film roles, Jisoo in Snowdrop and other idols with roles on TV, in cinemas and on streaming services. (140) |

Series links:

- `k-pop-idols-in-dramas-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Idols in Korean Dramas: Match the Role](/q/k-pop-idols-in-korean-dramas); [K-pop Idol Actors: Films, Dramas, Streaming](/q/k-pop-idols-who-act)
- `k-pop-idols-in-korean-dramas` links to [General K-pop quiz](/general-kpop-quiz); [Idols in K-dramas True or False: Who Starred](/q/k-pop-idols-in-dramas-true-or-false); [K-pop Idol Actors: Films, Dramas, Streaming](/q/k-pop-idols-who-act)
- `k-pop-idols-who-act` links to [General K-pop quiz](/general-kpop-quiz); [Idols in K-dramas True or False: Who Starred](/q/k-pop-idols-in-dramas-true-or-false); [K-pop Idols in Korean Dramas: Match the Role](/q/k-pop-idols-in-korean-dramas)

### G10 · General K-pop · Drama OSTs

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-ost-drama-soundtracks-quiz` | K-pop OST (drama soundtracks) quiz | kpophistory | Team | 132 | 5 | 2026-04-05 |
| `k-pop-and-k-drama-osts` | K-pop and K-drama OSTs | kpopquizz | Player | 10 | 10 | 2026-04-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-ost-drama-soundtracks-quiz` | K-drama OSTs by K-pop Idols: Goblin to Hwarang (57) | K-drama OSTs by K-pop idols: from Goblin to Hwarang | Which idols sang famous drama OSTs? Stay With Me from Goblin, the Hwarang soundtrack by BTS members and the sound of My Mister. Five questions. (143) |
| `k-pop-and-k-drama-osts` | K-drama OST Classics: Goblin and Descendants (55) | K-drama OST classics: Goblin and Descendants of the Sun | An easy round on classic K-drama soundtracks: the OSTs of Goblin and Descendants of the Sun, IU's songs and the singers behind them. (132) |

Series links:

- `k-pop-ost-drama-soundtracks-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-drama OST Classics: Goblin and Descendants](/q/k-pop-and-k-drama-osts)
- `k-pop-and-k-drama-osts` links to [General K-pop quiz](/general-kpop-quiz); [K-drama OSTs by K-pop Idols: Goblin to Hwarang](/q/k-pop-ost-drama-soundtracks-quiz)

### G11 · General K-pop · Survival shows

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-survival-shows-quiz` | K-pop survival shows quiz | skzrealm | Team | 173 | 6 | 2026-04-06 |
| `k-pop-produce-series-quiz` | K-pop Produce series quiz | kpophistory | Team | 161 | 5 | 2026-03-24 |
| `k-pop-survival-shows` | K-pop Survival Shows | kpopquizz | Player | 20 | 10 | 2026-04-09 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-survival-shows-quiz` | K-pop Survival Shows: Sixteen to Kingdom (51) | K-pop survival shows: from Sixteen to Kingdom | Which group came from which survival show? I.O.I and Produce 101, TWICE and Sixteen, the Kingdom winner Stray Kids, and other shows that made groups. (149) |
| `k-pop-produce-series-quiz` | Produce 101 Series: Which Group Each Season Made (59) | Produce 101 series: which group each season made | Name the group each Produce season created: I.O.I from season 1, Wanna One from season 2, IZ*ONE from Produce 48 and X1 from Produce X 101. (139) |
| `k-pop-survival-shows` | Survival Show Groups: TWICE, Wanna One, IZ*ONE (57) | Survival show groups: TWICE, Wanna One and IZ*ONE | A longer round on groups formed on TV: TWICE and Sixteen, Wanna One and Produce 101, IZ*ONE and Produce 48, plus later shows and their groups. (142) |

Series links:

- `k-pop-survival-shows-quiz` links to [General K-pop quiz](/general-kpop-quiz); [Produce 101 Series: Which Group Each Season Made](/q/k-pop-produce-series-quiz); [Survival Show Groups: TWICE, Wanna One, IZ*ONE](/q/k-pop-survival-shows)
- `k-pop-produce-series-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Survival Shows: Sixteen to Kingdom](/q/k-pop-survival-shows-quiz); [Survival Show Groups: TWICE, Wanna One, IZ*ONE](/q/k-pop-survival-shows)
- `k-pop-survival-shows` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Survival Shows: Sixteen to Kingdom](/q/k-pop-survival-shows-quiz); [Produce 101 Series: Which Group Each Season Made](/q/k-pop-produce-series-quiz)

### G12 · General K-pop · Variety shows

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-variety-show-moments` | K-pop variety show moments | skzrealm | Team | 96 | 5 | 2026-03-25 |
| `k-pop-variety-shows-and-games` | K-pop Variety Shows and Games | kpopquizz | Player | 21 | 10 | 2026-04-17 |
| `k-pop-variety-shows` | K-pop Variety Shows | kpopquizz | Player | 8 | 10 | 2026-05-17 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-variety-show-moments` | K-pop Variety Shows: Run BTS to Weekly Idol (54) | K-pop variety shows: from Run BTS to Weekly Idol | A hard round on K-pop variety content: the BTS series, the show every new group visits, Going SEVENTEEN and other idol shows fans rewatch. (138) |
| `k-pop-variety-shows-and-games` | Idol Variety Shows: Knowing Bros to Bon Voyage (57) | Idol variety shows: from Knowing Bros to Bon Voyage | What happens on Weekly Idol and Knowing Bros, and which BTS series is about travel? A round on the TV and web shows idols appear on. (132) |
| `k-pop-variety-shows` | K-pop Web Series: Run BTS and Going Seventeen (56) | K-pop web series: Run BTS and Going Seventeen | Questions on idol web series: who hosts Run BTS!, where it first aired before Weverse, which group stars in Going Seventeen and more group shows. (145) |

Series links:

- `k-pop-variety-show-moments` links to [General K-pop quiz](/general-kpop-quiz); [Idol Variety Shows: Knowing Bros to Bon Voyage](/q/k-pop-variety-shows-and-games); [K-pop Web Series: Run BTS and Going Seventeen](/q/k-pop-variety-shows)
- `k-pop-variety-shows-and-games` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Variety Shows: Run BTS to Weekly Idol](/q/k-pop-variety-show-moments); [K-pop Web Series: Run BTS and Going Seventeen](/q/k-pop-variety-shows)
- `k-pop-variety-shows` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Variety Shows: Run BTS to Weekly Idol](/q/k-pop-variety-show-moments); [Idol Variety Shows: Knowing Bros to Bon Voyage](/q/k-pop-variety-shows-and-games)

### G13 · General K-pop · Weverse and social media

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-weverse-and-social-media-quiz` | K-pop Weverse and social media quiz | kpophistory | Team | 162 | 6 | 2026-04-11 |
| `k-pop-weverse-and-fan-platforms` | K-pop Weverse and fan platforms | kpophistory | Team | 157 | 5 | 2026-03-29 |
| `k-pop-social-media-and-online-culture` | K-pop Social Media and Online Culture | kpopquizz | Player | 17 | 10 | 2026-06-28 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-weverse-and-social-media-quiz` | K-pop Social Media Records: True or False (52) | K-pop social media records: true or false | Which group leads on Instagram or YouTube? How do idols use Weverse? Judge statements about K-pop on social media in this true or false round. (142) |
| `k-pop-weverse-and-fan-platforms` | Fan Platforms: Weverse, bubble and V LIVE (52) | K-pop fan platforms: Weverse, bubble and V LIVE | Where do fans talk to idols? Who built Weverse, which platform SM artists use, what happened to V LIVE and how paid messaging apps work. (136) |
| `k-pop-social-media-and-online-culture` | K-pop Online Fan Culture: Fancams to Streaming (57) | K-pop online fan culture: fancams to streaming parties | An easy round on how fans act online: the main official platform, what a streaming party is, what a fancam is and other online fan terms. (137) |

Series links:

- `k-pop-weverse-and-social-media-quiz` links to [General K-pop quiz](/general-kpop-quiz); [Fan Platforms: Weverse, bubble and V LIVE](/q/k-pop-weverse-and-fan-platforms); [K-pop Online Fan Culture: Fancams to Streaming](/q/k-pop-social-media-and-online-culture)
- `k-pop-weverse-and-fan-platforms` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Social Media Records: True or False](/q/k-pop-weverse-and-social-media-quiz); [K-pop Online Fan Culture: Fancams to Streaming](/q/k-pop-social-media-and-online-culture)
- `k-pop-social-media-and-online-culture` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Social Media Records: True or False](/q/k-pop-weverse-and-social-media-quiz); [Fan Platforms: Weverse, bubble and V LIVE](/q/k-pop-weverse-and-fan-platforms)

### G14 · General K-pop · Fashion

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-fashion-and-style-quiz` | K-pop fashion and style quiz | pinkvelvet | Team | 126 | 6 | 2026-03-27 |
| `k-pop-fashion-true-or-false` | K-pop fashion true or false | pinkvelvet | Team | 113 | 6 | 2026-04-09 |
| `k-pop-fashion-and-brand-ambassadors` | K-pop Fashion and Brand Ambassadors | kpopquizz | Player | 12 | 10 | 2026-05-09 |
| `k-pop-iconic-outfits-and-fashion` | K-pop Iconic Outfits and Fashion | kpopquizz | Player | 12 | 10 | 2026-10-08 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-fashion-and-style-quiz` | K-pop Fashion: BLACKPINK's Luxury Houses (51) | K-pop fashion: BLACKPINK and their luxury houses | Which fashion houses do the BLACKPINK members represent? Match Jennie, Jisoo, Rosé and Lisa to Chanel, Dior, Saint Laurent and more. (132) |
| `k-pop-fashion-true-or-false` | K-pop Fashion True or False: Brand Ambassadors (57) | K-pop fashion true or false: brand ambassadors | True or false on idols and luxury brands: Jennie and Chanel, whether all of BLACKPINK are ambassadors, V and the brand he really represents. (140) |
| `k-pop-fashion-and-brand-ambassadors` | K-pop Brand Ambassadors: Chanel, Louis Vuitton (57) | K-pop brand ambassadors: Chanel, Louis Vuitton and more | Which idol represents which fashion house? Jennie and Chanel, V and Louis Vuitton, Lisa and Celine, and more ambassador deals across groups. (140) |
| `k-pop-iconic-outfits-and-fashion` | Iconic K-pop Outfits and Stage Concepts (50) | Iconic K-pop outfits and stage concepts | An easy round on K-pop looks: the group with school uniform debut outfits, BLACKPINK's signature stage colors and other outfits fans remember. (142) |

Series links:

- `k-pop-fashion-and-style-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fashion True or False: Brand Ambassadors](/q/k-pop-fashion-true-or-false); [K-pop Brand Ambassadors: Chanel, Louis Vuitton](/q/k-pop-fashion-and-brand-ambassadors); [Iconic K-pop Outfits and Stage Concepts](/q/k-pop-iconic-outfits-and-fashion)
- `k-pop-fashion-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fashion: BLACKPINK's Luxury Houses](/q/k-pop-fashion-and-style-quiz); [K-pop Brand Ambassadors: Chanel, Louis Vuitton](/q/k-pop-fashion-and-brand-ambassadors); [Iconic K-pop Outfits and Stage Concepts](/q/k-pop-iconic-outfits-and-fashion)
- `k-pop-fashion-and-brand-ambassadors` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fashion: BLACKPINK's Luxury Houses](/q/k-pop-fashion-and-style-quiz); [K-pop Fashion True or False: Brand Ambassadors](/q/k-pop-fashion-true-or-false); [Iconic K-pop Outfits and Stage Concepts](/q/k-pop-iconic-outfits-and-fashion)
- `k-pop-iconic-outfits-and-fashion` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fashion: BLACKPINK's Luxury Houses](/q/k-pop-fashion-and-style-quiz); [K-pop Fashion True or False: Brand Ambassadors](/q/k-pop-fashion-true-or-false); [K-pop Brand Ambassadors: Chanel, Louis Vuitton](/q/k-pop-fashion-and-brand-ambassadors)

### G15 · General K-pop · Concerts and tours

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-concert-and-tour-facts` | K-pop concert and tour facts | caratland | Team | 154 | 5 | 2026-04-06 |
| `k-pop-concert-facts-true-or-false` | K-pop concert facts true or false | caratland | Team | 100 | 6 | 2026-03-28 |
| `k-pop-concert-tours` | K-pop Concert Tours | kpopquizz | Player | 8 | 10 | 2026-05-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-concert-and-tour-facts` | K-pop Stadium Concerts: SoFi to Wembley (50) | K-pop stadium concerts: from SoFi to Wembley | Big K-pop concert moments: BTS at SoFi Stadium, how far BLACKPINK's BORN PINK tour traveled and the first K-pop act to headline a UK stadium. (141) |
| `k-pop-concert-facts-true-or-false` | K-pop Concert Facts True or False: Headliners (56) | K-pop concert facts true or false: the headliners | A hard true or false on K-pop live milestones: BTS at Wembley, BLACKPINK headlining Coachella, J-Hope at Lollapalooza and other headline stages. (144) |
| `k-pop-concert-tours` | K-pop World Tour Names and Years (43) | K-pop world tour names and years | A hard round on K-pop tours: the name of the BTS 2018 to 2019 tour, the year BORN PINK started, TWICE's Ready to Be tour and more tour names. (141) |

Series links:

- `k-pop-concert-and-tour-facts` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Concert Facts True or False: Headliners](/q/k-pop-concert-facts-true-or-false); [K-pop World Tour Names and Years](/q/k-pop-concert-tours)
- `k-pop-concert-facts-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Stadium Concerts: SoFi to Wembley](/q/k-pop-concert-and-tour-facts); [K-pop World Tour Names and Years](/q/k-pop-concert-tours)
- `k-pop-concert-tours` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Stadium Concerts: SoFi to Wembley](/q/k-pop-concert-and-tour-facts); [K-pop Concert Facts True or False: Headliners](/q/k-pop-concert-facts-true-or-false)

### G16 · General K-pop · Training and idol life

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-training-system-quiz` | K-pop training system quiz | kpophistory | Team | 136 | 5 | 2026-04-07 |
| `k-pop-training-system-and-idol-life` | K-pop Training System and Idol Life | kpopquizz | Player | 17 | 10 | 2026-04-20 |
| `k-pop-idol-life-true-or-false` | K-pop Idol Life True or False | kpopquizz | Player | 16 | 10 | 2026-05-24 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-training-system-quiz` | K-pop Training System: Skills and Evaluations (56) | K-pop training system: skills and evaluations | How do K-pop trainees train? The skills they learn, how long training usually lasts and what happens at the monthly evaluations. Five questions. (144) |
| `k-pop-training-system-and-idol-life` | Trainee to Idol: Training Records and Terms (54) | From trainee to idol: training records and terms | An easy round on the road to debut: what trainees practice, who trained the longest among well known idols and the words fans use, like maknae. (143) |
| `k-pop-idol-life-true-or-false` | K-pop Idol Life True or False: Rules and Names (57) | K-pop idol life true or false: rules and stage names | Easy true or false on idol life: company rules, the age when most trainees start and whether idols always choose their own stage names. (135) |

Series links:

- `k-pop-training-system-quiz` links to [General K-pop quiz](/general-kpop-quiz); [Trainee to Idol: Training Records and Terms](/q/k-pop-training-system-and-idol-life); [K-pop Idol Life True or False: Rules and Names](/q/k-pop-idol-life-true-or-false)
- `k-pop-training-system-and-idol-life` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Training System: Skills and Evaluations](/q/k-pop-training-system-quiz); [K-pop Idol Life True or False: Rules and Names](/q/k-pop-idol-life-true-or-false)
- `k-pop-idol-life-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Training System: Skills and Evaluations](/q/k-pop-training-system-quiz); [Trainee to Idol: Training Records and Terms](/q/k-pop-training-system-and-idol-life)

### G17 · General K-pop · Dance and choreography

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-tiktok-viral-moments` | K-pop TikTok viral moments | soojinnie | Team | 146 | 5 | 2026-03-31 |
| `k-pop-choreography-quiz` | K-pop choreography quiz | soojinnie | Team | 119 | 5 | 2026-03-31 |
| `k-pop-iconic-dances-name-that-move` | K-pop iconic dances - name that move | skzrealm | Team | 92 | 5 | 2026-04-02 |
| `k-pop-choreography-and-dance` | K-pop Choreography and Dance | kpopquizz | Player | 19 | 10 | 2026-06-24 |
| `k-pop-viral-dance-challenges` | K-pop Viral Dance Challenges | kpopquizz | Player | 13 | 10 | 2026-04-24 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-tiktok-viral-moments` | K-pop TikTok Hits: Supernova, Hype Boy, Cupid (56) | K-pop TikTok hits: Supernova, Hype Boy and Cupid | Which K-pop songs blew up on TikTok? aespa's Supernova challenge, NewJeans and Hype Boy, the year FIFTY FIFTY's Cupid went viral and more. (138) |
| `k-pop-choreography-quiz` | K-pop Dance Terms: Point Choreo to Relay Dance (57) | K-pop dance terms: point choreography to relay dance | Learn the words of K-pop dance: what point choreography is, what a dance practice video shows, how a relay dance works and other terms fans use. (144) |
| `k-pop-iconic-dances-name-that-move` | Name the K-pop Dance Move: Gangnam Style to TT (57) | Name the K-pop dance move: from Gangnam Style to TT | Read the move, name the song: the horse riding dance, the TT pose, the shy shy shy step and other signature K-pop choreography. (127) |
| `k-pop-choreography-and-dance` | K-pop Choreography History: Styles and Moves (55) | K-pop choreography history: styles and moves | Where did K-pop dance come from? The styles that shaped early choreography, the group behind the point move trend and famous moves from BTS songs. (146) |
| `k-pop-viral-dance-challenges` | K-pop Dance Challenges: Dynamite to Super Shy (56) | K-pop dance challenges: from Dynamite to Super Shy | The dance challenges that spread online: BTS and Dynamite, the Super Shy hip sway, the How You Like That gesture and other viral K-pop moves. (141) |

Series links:

- `k-pop-tiktok-viral-moments` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Dance Terms: Point Choreo to Relay Dance](/q/k-pop-choreography-quiz); [Name the K-pop Dance Move: Gangnam Style to TT](/q/k-pop-iconic-dances-name-that-move); [K-pop Choreography History: Styles and Moves](/q/k-pop-choreography-and-dance)
- `k-pop-choreography-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-pop TikTok Hits: Supernova, Hype Boy, Cupid](/q/k-pop-tiktok-viral-moments); [Name the K-pop Dance Move: Gangnam Style to TT](/q/k-pop-iconic-dances-name-that-move); [K-pop Choreography History: Styles and Moves](/q/k-pop-choreography-and-dance)
- `k-pop-iconic-dances-name-that-move` links to [General K-pop quiz](/general-kpop-quiz); [K-pop TikTok Hits: Supernova, Hype Boy, Cupid](/q/k-pop-tiktok-viral-moments); [K-pop Dance Terms: Point Choreo to Relay Dance](/q/k-pop-choreography-quiz); [K-pop Choreography History: Styles and Moves](/q/k-pop-choreography-and-dance)
- `k-pop-choreography-and-dance` links to [General K-pop quiz](/general-kpop-quiz); [K-pop TikTok Hits: Supernova, Hype Boy, Cupid](/q/k-pop-tiktok-viral-moments); [K-pop Dance Terms: Point Choreo to Relay Dance](/q/k-pop-choreography-quiz); [Name the K-pop Dance Move: Gangnam Style to TT](/q/k-pop-iconic-dances-name-that-move)
- `k-pop-viral-dance-challenges` links to [General K-pop quiz](/general-kpop-quiz); [K-pop TikTok Hits: Supernova, Hype Boy, Cupid](/q/k-pop-tiktok-viral-moments); [K-pop Dance Terms: Point Choreo to Relay Dance](/q/k-pop-choreography-quiz); [Name the K-pop Dance Move: Gangnam Style to TT](/q/k-pop-iconic-dances-name-that-move)

### G18 · General K-pop · Western collaborations and global reach

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-collaboration-with-western-artists` | K-pop collaboration with Western artists | kpophistory | Team | 198 | 7 | 2026-03-29 |
| `k-pop-goes-west` | K-pop Goes West | kpopquizz | Player | 12 | 10 | 2026-05-21 |
| `k-pop-global-expansion` | K-pop Global Expansion | kpopquizz | Player | 10 | 10 | 2026-10-13 |
| `k-pop-surprise-collaborations` | K-pop Surprise Collaborations | kpopquizz | Player | 9 | 10 | 2026-04-28 |
| `k-pop-international-collaborations` | K-pop International Collaborations | kpopquizz | Player | 6 | 10 | 2026-06-07 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-collaboration-with-western-artists` | Western Collabs in K-pop: True or False (50) | Western collabs in K-pop: true or false | True or false on K-pop and Western artists: BTS with Halsey and Ed Sheeran, BLACKPINK with Lady Gaga and other features that crossed over. (138) |
| `k-pop-goes-west` | K-pop in the US Charts: Hot 100 to Coachella (55) | K-pop in the US: the Hot 100 to Coachella | How K-pop broke through in the US: the first Hot 100 number one, the first girl group at Coachella and the first Korean language Billboard 200 topper. (150) |
| `k-pop-global-expansion` | Hallyu Goes Global: K-pop's Overseas Milestones (58) | Hallyu goes global: K-pop's overseas milestones | How K-pop went global: when the Korean Wave got noticed abroad, the milestone seen as the biggest Western breakthrough and the first US stadium show. (149) |
| `k-pop-surprise-collaborations` | K-pop Collabs: My Universe to Sour Candy (51) | K-pop collabs: from My Universe to Sour Candy | Name the partner on famous K-pop collaborations: BTS and Coldplay on My Universe, J-Hope on Chicken Noodle Soup, BLACKPINK and Lady Gaga on Sour Candy. (151) |
| `k-pop-international-collaborations` | K-pop Collab Credits: Remixes and Rock Bands (55) | K-pop collab credits: remixes and rock bands | Who remixed Dynamite, who joined BTS on My Universe and which British rock band worked with TXT? A round on K-pop credits with artists abroad. (142) |

Series links:

- `k-pop-collaboration-with-western-artists` links to [General K-pop quiz](/general-kpop-quiz); [K-pop in the US Charts: Hot 100 to Coachella](/q/k-pop-goes-west); [Hallyu Goes Global: K-pop's Overseas Milestones](/q/k-pop-global-expansion); [K-pop Collabs: My Universe to Sour Candy](/q/k-pop-surprise-collaborations)
- `k-pop-goes-west` links to [General K-pop quiz](/general-kpop-quiz); [Western Collabs in K-pop: True or False](/q/k-pop-collaboration-with-western-artists); [Hallyu Goes Global: K-pop's Overseas Milestones](/q/k-pop-global-expansion); [K-pop Collabs: My Universe to Sour Candy](/q/k-pop-surprise-collaborations)
- `k-pop-global-expansion` links to [General K-pop quiz](/general-kpop-quiz); [Western Collabs in K-pop: True or False](/q/k-pop-collaboration-with-western-artists); [K-pop in the US Charts: Hot 100 to Coachella](/q/k-pop-goes-west); [K-pop Collabs: My Universe to Sour Candy](/q/k-pop-surprise-collaborations)
- `k-pop-surprise-collaborations` links to [General K-pop quiz](/general-kpop-quiz); [Western Collabs in K-pop: True or False](/q/k-pop-collaboration-with-western-artists); [K-pop in the US Charts: Hot 100 to Coachella](/q/k-pop-goes-west); [Hallyu Goes Global: K-pop's Overseas Milestones](/q/k-pop-global-expansion)
- `k-pop-international-collaborations` links to [General K-pop quiz](/general-kpop-quiz); [Western Collabs in K-pop: True or False](/q/k-pop-collaboration-with-western-artists); [K-pop in the US Charts: Hot 100 to Coachella](/q/k-pop-goes-west); [Hallyu Goes Global: K-pop's Overseas Milestones](/q/k-pop-global-expansion)

### G19 · General K-pop · Records and awards

Retitle (highest shared share 10%, below the 60% merge line). Shared questions: `k-pop-awards-and-records-true-or-false` and `k-pop-records-true-or-false` 10% (1/10).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-albums-that-sold-millions` | K-pop albums that sold millions | caratland | Team | 146 | 5 | 2026-03-28 |
| `k-pop-music-video-records` | K-pop Music Video Records | kpopquizz | Player | 30 | 10 | 2026-10-10 |
| `k-pop-streaming-records` | K-pop Streaming Records | kpopquizz | Player | 22 | 10 | 2026-06-10 |
| `k-pop-awards-and-milestones` | K-pop Awards and Milestones | kpopquizz | Player | 16 | 10 | 2026-06-26 |
| `k-pop-awards-and-records-true-or-false` | K-pop Awards and Records True or False | kpopquizz | Player | 15 | 10 | 2026-06-22 |
| `k-pop-records-true-or-false` | K-pop Records True or False | kpopquizz | Player | 11 | 10 | 2026-10-03 |
| `k-pop-milestones-and-firsts-true-or-false` | K-pop Milestones and Firsts True or False | kpopquizz | Player | 9 | 10 | 2026-05-05 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-albums-that-sold-millions` | K-pop Million Sellers: FML, MOTS 7 and NOEASY (56) | K-pop million sellers: FML, Map of the Soul: 7 and NOEASY | Albums that sold millions: the SEVENTEEN record for first week sales, how far Map of the Soul: 7 went and the first million seller from a newer group. (150) |
| `k-pop-music-video-records` | K-pop Music Video Records: YouTube Firsts (52) | K-pop music video records: YouTube firsts | The YouTube records of K-pop: the first video to a billion views, How You Like That's first day, Boy With Luv and other music video milestones. (143) |
| `k-pop-streaming-records` | K-pop Streaming Records: Spotify Milestones (54) | K-pop streaming records: Spotify milestones | Questions on K-pop streaming: the first song to pass a billion Spotify streams, the most streamed girl group and Dynamite's historic chart debut. (145) |
| `k-pop-awards-and-milestones` | K-pop Awards: Grammy Nods, Daesangs and BBMAs (56) | K-pop awards: Grammy nods, Daesangs and the BBMAs | The awards side of K-pop: the first Grammy nomination, recent Melon Music Awards Daesang winners and the first K-pop wins at the Billboard Music Awards. (152) |
| `k-pop-awards-and-records-true-or-false` | K-pop Awards True or False: Grammys and YouTube (58) | K-pop awards true or false: the Grammys and YouTube | Easy true or false on K-pop awards and records: the first act on the Grammys stage, whether BLACKPINK has a Grammy and Gangnam Style's billion views. (149) |
| `k-pop-records-true-or-false` | K-pop Records True or False: Hard Mode (49) | K-pop records true or false: hard mode | A hard true or false on K-pop records: YouTube firsts, Grammy performances, How You Like That's debut day and other records with tricky details. (144) |
| `k-pop-milestones-and-firsts-true-or-false` | K-pop Firsts True or False: BoA to UK Charts (55) | K-pop firsts true or false: from BoA to the UK charts | True or false on K-pop firsts: BoA's success in Japan, the first K-pop video to a billion views and the first act to top the UK Albums Chart. (141) |

Series links:

- `k-pop-albums-that-sold-millions` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Music Video Records: YouTube Firsts](/q/k-pop-music-video-records); [K-pop Streaming Records: Spotify Milestones](/q/k-pop-streaming-records); [K-pop Awards: Grammy Nods, Daesangs and BBMAs](/q/k-pop-awards-and-milestones)
- `k-pop-music-video-records` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Million Sellers: FML, MOTS 7 and NOEASY](/q/k-pop-albums-that-sold-millions); [K-pop Streaming Records: Spotify Milestones](/q/k-pop-streaming-records); [K-pop Awards: Grammy Nods, Daesangs and BBMAs](/q/k-pop-awards-and-milestones)
- `k-pop-streaming-records` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Million Sellers: FML, MOTS 7 and NOEASY](/q/k-pop-albums-that-sold-millions); [K-pop Music Video Records: YouTube Firsts](/q/k-pop-music-video-records); [K-pop Awards: Grammy Nods, Daesangs and BBMAs](/q/k-pop-awards-and-milestones)
- `k-pop-awards-and-milestones` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Million Sellers: FML, MOTS 7 and NOEASY](/q/k-pop-albums-that-sold-millions); [K-pop Music Video Records: YouTube Firsts](/q/k-pop-music-video-records); [K-pop Streaming Records: Spotify Milestones](/q/k-pop-streaming-records)
- `k-pop-awards-and-records-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Million Sellers: FML, MOTS 7 and NOEASY](/q/k-pop-albums-that-sold-millions); [K-pop Music Video Records: YouTube Firsts](/q/k-pop-music-video-records); [K-pop Streaming Records: Spotify Milestones](/q/k-pop-streaming-records)
- `k-pop-records-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Million Sellers: FML, MOTS 7 and NOEASY](/q/k-pop-albums-that-sold-millions); [K-pop Music Video Records: YouTube Firsts](/q/k-pop-music-video-records); [K-pop Streaming Records: Spotify Milestones](/q/k-pop-streaming-records)
- `k-pop-milestones-and-firsts-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Million Sellers: FML, MOTS 7 and NOEASY](/q/k-pop-albums-that-sold-millions); [K-pop Music Video Records: YouTube Firsts](/q/k-pop-music-video-records); [K-pop Streaming Records: Spotify Milestones](/q/k-pop-streaming-records)

### G20 · General K-pop · Music shows

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-music-show-programs-quiz` | K-pop music show programs quiz | twiceland | Team | 133 | 5 | 2026-04-06 |
| `k-pop-music-shows-true-or-false` | K-pop Music Shows True or False | kpopquizz | Player | 10 | 10 | 2026-05-15 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-music-show-programs-quiz` | K-pop Music Shows: Match the Show to the Channel (59) | K-pop music shows: match each show to its channel | Music Bank, Inkigayo, M Countdown and more: match each K-pop music show to the channel that airs it. Five questions on the weekly show circuit. (143) |
| `k-pop-music-shows-true-or-false` | K-pop Music Shows True or False: Channels, Days (58) | K-pop music shows true or false: channels and days | Easy true or false on K-pop music shows: which channel airs Inkigayo and Music Bank, which shows share a day and how music show wins work. (138) |

Series links:

- `k-pop-music-show-programs-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Music Shows True or False: Channels, Days](/q/k-pop-music-shows-true-or-false)
- `k-pop-music-shows-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Music Shows: Match the Show to the Channel](/q/k-pop-music-show-programs-quiz)

### G21 · General K-pop · Group name meanings

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-group-name-meanings-true-or-false` | K-pop group name meanings true or false | kpophistory | Team | 174 | 6 | 2026-04-14 |
| `k-pop-group-name-meanings` | K-pop group name meanings | kpophistory | Team | 115 | 6 | 2026-03-27 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-group-name-meanings-true-or-false` | K-pop Group Name Meanings: True or False (51) | K-pop group name meanings: true or false | Does SEVENTEEN mean seventeen members? Does NCT stand for Neo Culture Technology? Judge the stories behind K-pop group names in this true or false round. (153) |
| `k-pop-group-name-meanings` | What K-pop Group Names Mean: BTS, TWICE, EXO (55) | What K-pop group names mean: BTS, TWICE and EXO | Learn the meaning behind group names: what Bangtan Sonyeondan means, why TWICE is called TWICE, where EXO's name comes from and more. (133) |

Series links:

- `k-pop-group-name-meanings-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [What K-pop Group Names Mean: BTS, TWICE, EXO](/q/k-pop-group-name-meanings)
- `k-pop-group-name-meanings` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Group Name Meanings: True or False](/q/k-pop-group-name-meanings-true-or-false)

### G22 · General K-pop · Birthplaces and nationalities

Retitle (highest shared share 33%, below the 60% merge line). Shared questions: `k-pop-birthplace-quiz-where-are-they-from` and `k-pop-idol-nationalities` 33% (2/6).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-birthplace-quiz-where-are-they-from` | K-pop birthplace quiz - where are they from? | kpophistory | Team | 162 | 6 | 2026-04-07 |
| `k-pop-birthplace-true-or-false` | K-pop birthplace true or false | kpophistory | Team | 84 | 7 | 2026-04-04 |
| `k-pop-idol-nationalities` | K-pop Idol Nationalities | kpopquizz | Player | 36 | 10 | 2026-06-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-birthplace-quiz-where-are-they-from` | Where Are K-pop Idols From? Pick the Country (55) | Where are K-pop idols from? Pick the country | Lisa, Felix, Ni-ki and more: pick the country each idol comes from. A multiple choice round on K-pop idols born or raised outside Korea. (136) |
| `k-pop-birthplace-true-or-false` | K-pop Idol Birthplaces: True or False (48) | K-pop idol birthplaces: true or false | Is Felix from the United Kingdom? Did Hanni grow up in Australia? Check where K-pop idols come from in this true or false round. (128) |
| `k-pop-idol-nationalities` | Idols Born Outside Korea: Hong Kong to Thailand (58) | K-pop idols born outside Korea: Hong Kong to Thailand | An easy round on K-pop idols from abroad: Jackson Wang and Hong Kong, Tzuyu and Taiwan, Minnie and Thailand and more members from other countries. (146) |

Series links:

- `k-pop-birthplace-quiz-where-are-they-from` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Idol Birthplaces: True or False](/q/k-pop-birthplace-true-or-false); [Idols Born Outside Korea: Hong Kong to Thailand](/q/k-pop-idol-nationalities)
- `k-pop-birthplace-true-or-false` links to [General K-pop quiz](/general-kpop-quiz); [Where Are K-pop Idols From? Pick the Country](/q/k-pop-birthplace-quiz-where-are-they-from); [Idols Born Outside Korea: Hong Kong to Thailand](/q/k-pop-idol-nationalities)
- `k-pop-idol-nationalities` links to [General K-pop quiz](/general-kpop-quiz); [Where Are K-pop Idols From? Pick the Country](/q/k-pop-birthplace-quiz-where-are-they-from); [K-pop Idol Birthplaces: True or False](/q/k-pop-birthplace-true-or-false)

### G23 · General K-pop · Which group is this member from

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `which-group-is-this-member-from-boy-groups` | Which group is this member from? (boy groups) | kpophistory | Team | 517 | 6 | 2026-04-10 |
| `which-group-is-this-member-from` | Which group is this member from? | kpophistory | Team | 88 | 6 | 2026-04-01 |
| `name-the-group-from-its-members-girl-groups` | Name the group from its members - Girl Groups | light_a_matz | Player | 8 | 12 | 2026-07-26 |
| `name-the-group-from-its-members-boy-groups` | Name the group from its members - Boy Groups | light_a_matz | Player | 5 | 10 | 2026-07-26 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `which-group-is-this-member-from-boy-groups` | Which Boy Group Is This Member In? (45) | Which boy group is this member in? | Felix, Hoshi, San and more: read a member's name and pick his boy group. An easy round across Stray Kids, SEVENTEEN, ATEEZ and other groups. (140) |
| `which-group-is-this-member-from` | Which Girl Group Is This Member In? (46) | Which girl group is this member in? | Karina, Wonyoung, Minji and more: read a member's name and pick her girl group. A round across aespa, IVE, NewJeans and other groups. (133) |
| `name-the-group-from-its-members-girl-groups` | Name the Girl Group from Its Member List (51) | Name the girl group from its member list | Read a full member list and name the girl group, from aespa and BLACKPINK to NMIXX and more. An easy round for fans of many groups. (131) |
| `name-the-group-from-its-members-boy-groups` | Name the Boy Group from Its Member List (50) | Name the boy group from its member list | Read a full member list and name the boy group, from ATEEZ and SHINee to Cortis and more. An easy round for fans of many groups. (128) |

Series links:

- `which-group-is-this-member-from-boy-groups` links to [General K-pop quiz](/general-kpop-quiz); [Which Girl Group Is This Member In?](/q/which-group-is-this-member-from); [Name the Girl Group from Its Member List](/q/name-the-group-from-its-members-girl-groups); [Name the Boy Group from Its Member List](/q/name-the-group-from-its-members-boy-groups)
- `which-group-is-this-member-from` links to [General K-pop quiz](/general-kpop-quiz); [Which Boy Group Is This Member In?](/q/which-group-is-this-member-from-boy-groups); [Name the Girl Group from Its Member List](/q/name-the-group-from-its-members-girl-groups); [Name the Boy Group from Its Member List](/q/name-the-group-from-its-members-boy-groups)
- `name-the-group-from-its-members-girl-groups` links to [General K-pop quiz](/general-kpop-quiz); [Which Boy Group Is This Member In?](/q/which-group-is-this-member-from-boy-groups); [Which Girl Group Is This Member In?](/q/which-group-is-this-member-from); [Name the Boy Group from Its Member List](/q/name-the-group-from-its-members-boy-groups)
- `name-the-group-from-its-members-boy-groups` links to [General K-pop quiz](/general-kpop-quiz); [Which Boy Group Is This Member In?](/q/which-group-is-this-member-from-boy-groups); [Which Girl Group Is This Member In?](/q/which-group-is-this-member-from); [Name the Girl Group from Its Member List](/q/name-the-group-from-its-members-girl-groups)

### G24 · General K-pop · Idol nicknames

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-idol-nicknames` | K-pop Idol Nicknames | kpopquizz | Player | 25 | 10 | 2026-10-12 |
| `k-pop-member-nicknames-and-fun-facts` | K-pop Member Nicknames and Fun Facts | kpopquizz | Player | 15 | 10 | 2026-05-16 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-idol-nicknames` | K-pop Idol Nicknames: Golden Maknae and More (55) | K-pop idol nicknames: the Golden Maknae and more | Who is the Golden Maknae, who is the God of Destruction and what do fans call Hwasa? Match famous K-pop nicknames to the right idols. (133) |
| `k-pop-member-nicknames-and-fun-facts` | Idol Nicknames, Hard Mode: Human Gucci and More (58) | K-pop idol nicknames, hard mode: Human Gucci and more | A hard round on idol nicknames and the facts behind them: Worldwide Handsome, Human Gucci, The Shoulder and more names fans gave their favorites. (145) |

Series links:

- `k-pop-idol-nicknames` links to [General K-pop quiz](/general-kpop-quiz); [Idol Nicknames, Hard Mode: Human Gucci and More](/q/k-pop-member-nicknames-and-fun-facts)
- `k-pop-member-nicknames-and-fun-facts` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Idol Nicknames: Golden Maknae and More](/q/k-pop-idol-nicknames)

### G25 · General K-pop · Sub-units

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-sub-units-and-solo-debuts` | K-pop Sub-units and Solo Debuts | kpopquizz | Player | 17 | 10 | 2026-05-06 |
| `k-pop-sub-units-their-songs` | K-Pop sub-units & their songs | light_a_matz | Player | 3 | 20 | 2026-07-09 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-sub-units-and-solo-debuts` | K-pop Sub-units: EXO-K, NCT U and WayV (49) | K-pop sub-units: EXO-K, NCT U and WayV | How K-pop sub-units work: EXO-K and EXO-M, the first NCT unit, WayV and other units and solo debuts that grew out of bigger groups. (131) |
| `k-pop-sub-units-their-songs` | K-pop Sub-unit Songs: Jus2 to Orange Caramel (55) | K-pop sub-unit songs: Jus2 to Orange Caramel | A long round on sub-units and their songs: Jus2 from GOT7, Orange Caramel from After School, WayV from NCT and many more unit releases. (135) |

Series links:

- `k-pop-sub-units-and-solo-debuts` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Sub-unit Songs: Jus2 to Orange Caramel](/q/k-pop-sub-units-their-songs)
- `k-pop-sub-units-their-songs` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Sub-units: EXO-K, NCT U and WayV](/q/k-pop-sub-units-and-solo-debuts)

### G26 · General K-pop · Song titles

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `complete-the-k-pop-song-title` | Complete the K-pop song title | twiceland | Team | 316 | 7 | 2026-04-07 |
| `guess-the-common-song-title-from-the-list-of-artists` | Guess the common song title from the list of artists | light_a_matz | Player | 8 | 20 | 2026-07-12 |
| `guess-the-common-song-title-from-the-list-of-artists-2` | Guess the common song title from the list of artists (2) | light_a_matz | Player | 4 | 20 | 2026-07-19 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `complete-the-k-pop-song-title` | Complete the K-pop Song Title: Big Hits (50) | Complete the K-pop song title: the big hits | Boy With what? How You Like what? Fill in the missing word of famous K-pop song titles from BTS, BLACKPINK, TWICE and more. An easy round. (138) |
| `guess-the-common-song-title-from-the-list-of-artists` | Same Title, Different Groups: K-pop Song Names (57) | Same title, different groups: K-pop song names | Several artists, one shared song title: find the title BLACKPINK, HyunA and TWICE all used, and more. Part 1 of a hard round on repeated titles. (144) |
| `guess-the-common-song-title-from-the-list-of-artists-2` | Same Title, Different Groups, Part 2 (47) | Same title, different groups, part 2 | Part 2 of the shared song title round: find the title that LE SSERAFIM, ATEEZ and SEVENTEEN share, then Deja Vu, XOXO and more repeated names. (142) |

Series links:

- `complete-the-k-pop-song-title` links to [General K-pop quiz](/general-kpop-quiz); [Same Title, Different Groups: K-pop Song Names](/q/guess-the-common-song-title-from-the-list-of-artists)
- `guess-the-common-song-title-from-the-list-of-artists` links to [General K-pop quiz](/general-kpop-quiz); [Complete the K-pop Song Title: Big Hits](/q/complete-the-k-pop-song-title); [Same Title, Different Groups, Part 2](/q/guess-the-common-song-title-from-the-list-of-artists-2)
- `guess-the-common-song-title-from-the-list-of-artists-2` links to [General K-pop quiz](/general-kpop-quiz); [Same Title, Different Groups: K-pop Song Names](/q/guess-the-common-song-title-from-the-list-of-artists)

### G27 · General K-pop · Fun facts

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-fun-facts-true-or-false-volume-2` | K-pop fun facts true or false - volume 2 | kpophistory | Team | 128 | 7 | 2026-03-31 |
| `k-pop-surprising-and-weird-facts` | K-pop Surprising and Weird Facts | kpopquizz | Player | 13 | 10 | 2026-04-15 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-fun-facts-true-or-false-volume-2` | K-pop Fun Facts True or False, Volume 2 (50) | K-pop fun facts true or false, volume 2 | Volume 2 of K-pop fun facts: BTS at the United Nations, where Lisa is really from, the first video to a billion views and more facts to judge. (142) |
| `k-pop-surprising-and-weird-facts` | Surprising K-pop Facts: A Hard Round (47) | Surprising K-pop facts: a hard round | A hard round of surprising facts: the biggest Super Junior lineup, the idol who trained as a classical pianist and on stage moments fans still talk about. (154) |

Series links:

- `k-pop-fun-facts-true-or-false-volume-2` links to [General K-pop quiz](/general-kpop-quiz); [Surprising K-pop Facts: A Hard Round](/q/k-pop-surprising-and-weird-facts)
- `k-pop-surprising-and-weird-facts` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fun Facts True or False, Volume 2](/q/k-pop-fun-facts-true-or-false-volume-2)

### G28 · General K-pop · Photocards and merch

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-photocard-culture-quiz` | K-pop photocard culture quiz | njeansstan | Team | 181 | 5 | 2026-04-10 |
| `k-pop-album-packaging-quiz` | K-pop album packaging quiz | njeansstan | Team | 78 | 6 | 2026-04-09 |
| `k-pop-merchandise-and-collecting` | K-pop Merchandise and Collecting | kpopquizz | Player | 9 | 10 | 2026-05-10 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-photocard-culture-quiz` | K-pop Photocards: Collecting and Trading Basics (58) | K-pop photocards: collecting and trading basics | What is a photocard, where do fans find them and how does trading work? An easy round on photocard culture for new K-pop collectors. (132) |
| `k-pop-album-packaging-quiz` | K-pop Album Packaging: True or False (47) | K-pop album packaging: true or false | Do all copies hold the same photocard? Do albums come in several versions? Judge statements about what comes inside a K-pop album, true or false. (145) |
| `k-pop-merchandise-and-collecting` | K-pop Collecting Lingo: Random PCs and WTS (53) | K-pop collecting lingo: random PCs and WTS | Learn the words collectors use: what a random photocard is, how trading works and what WTS and WTB mean in photocard communities. (129) |

Series links:

- `k-pop-photocard-culture-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Album Packaging: True or False](/q/k-pop-album-packaging-quiz); [K-pop Collecting Lingo: Random PCs and WTS](/q/k-pop-merchandise-and-collecting)
- `k-pop-album-packaging-quiz` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Photocards: Collecting and Trading Basics](/q/k-pop-photocard-culture-quiz); [K-pop Collecting Lingo: Random PCs and WTS](/q/k-pop-merchandise-and-collecting)
- `k-pop-merchandise-and-collecting` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Photocards: Collecting and Trading Basics](/q/k-pop-photocard-culture-quiz); [K-pop Album Packaging: True or False](/q/k-pop-album-packaging-quiz)

### G29 · General K-pop · Fan lingo and culture

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-korean-language-basics-for-fans` | K-pop Korean language basics for fans | kpophistory | Team | 133 | 6 | 2026-04-10 |
| `k-pop-fan-moments-and-memes` | K-pop Fan Moments and Memes | kpopquizz | Player | 18 | 10 | 2026-06-02 |
| `k-pop-lingo-and-fan-culture` | K-pop Lingo and Fan Culture | kpopquizz | Player | 9 | 10 | 2026-05-14 |
| `k-pop-inside-jokes-and-running-gags` | K-pop Inside Jokes and Running Gags | kpopquizz | Player | 9 | 10 | 2026-05-02 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-korean-language-basics-for-fans` | Korean Words for K-pop Fans: Saranghae, Daebak (57) | Korean words for K-pop fans: saranghae and daebak | The Korean words fans hear in every video: saranghae, hwaiting, daebak and more. Pick the right meaning in this easy language round. (132) |
| `k-pop-fan-moments-and-memes` | K-pop Fan Terms: Bias Wrecker to Comeback Era (56) | K-pop fan terms: bias wrecker to comeback era | What is stan Twitter, what is a bias wrecker and what does a comeback era feel like? An easy round on the words of K-pop fan culture. (133) |
| `k-pop-lingo-and-fan-culture` | K-pop Lingo Basics: Stan, Bias and More (50) | K-pop lingo basics: stan, bias and more | New to K-pop? Learn what stan and bias mean and other fan words you will see in comments. A short round on basic K-pop lingo. (125) |
| `k-pop-inside-jokes-and-running-gags` | K-pop Inside Jokes and Fandom Memes (46) | K-pop inside jokes and fandom memes | Jungkook is everywhere, TWICE's running jokes and what hyung line and maknae line mean: an easy round on the jokes fans repeat across groups. (141) |

Series links:

- `k-pop-korean-language-basics-for-fans` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Fan Terms: Bias Wrecker to Comeback Era](/q/k-pop-fan-moments-and-memes); [K-pop Lingo Basics: Stan, Bias and More](/q/k-pop-lingo-and-fan-culture); [K-pop Inside Jokes and Fandom Memes](/q/k-pop-inside-jokes-and-running-gags)
- `k-pop-fan-moments-and-memes` links to [General K-pop quiz](/general-kpop-quiz); [Korean Words for K-pop Fans: Saranghae, Daebak](/q/k-pop-korean-language-basics-for-fans); [K-pop Lingo Basics: Stan, Bias and More](/q/k-pop-lingo-and-fan-culture); [K-pop Inside Jokes and Fandom Memes](/q/k-pop-inside-jokes-and-running-gags)
- `k-pop-lingo-and-fan-culture` links to [General K-pop quiz](/general-kpop-quiz); [Korean Words for K-pop Fans: Saranghae, Daebak](/q/k-pop-korean-language-basics-for-fans); [K-pop Fan Terms: Bias Wrecker to Comeback Era](/q/k-pop-fan-moments-and-memes); [K-pop Inside Jokes and Fandom Memes](/q/k-pop-inside-jokes-and-running-gags)
- `k-pop-inside-jokes-and-running-gags` links to [General K-pop quiz](/general-kpop-quiz); [Korean Words for K-pop Fans: Saranghae, Daebak](/q/k-pop-korean-language-basics-for-fans); [K-pop Fan Terms: Bias Wrecker to Comeback Era](/q/k-pop-fan-moments-and-memes); [K-pop Lingo Basics: Stan, Bias and More](/q/k-pop-lingo-and-fan-culture)

### G30 · General K-pop · Member counts

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-numbers-quiz-how-many-members` | K-pop numbers quiz - how many members? | kpophistory | Team | 573 | 6 | 2026-04-13 |
| `which-k-pop-group-has-more-members` | Which K-pop Group Has More Members? | kpopquizz | Player | 13 | 10 | 2026-10-02 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-numbers-quiz-how-many-members` | How Many Members? K-pop Group Sizes (46) | How many members? K-pop group sizes | Which group has the most members, which girl groups have four and how many members are in NewJeans? An easy round on K-pop group sizes. (135) |
| `which-k-pop-group-has-more-members` | Which K-pop Group Has More Members? Head to Head (59) | Which K-pop group has more members? Head to head | BTS or BLACKPINK, SEVENTEEN or BTS, TWICE or aespa: pick the group with more members. An easy head to head round on group sizes. (128) |

Series links:

- `k-pop-numbers-quiz-how-many-members` links to [General K-pop quiz](/general-kpop-quiz); [Which K-pop Group Has More Members? Head to Head](/q/which-k-pop-group-has-more-members)
- `which-k-pop-group-has-more-members` links to [General K-pop quiz](/general-kpop-quiz); [How Many Members? K-pop Group Sizes](/q/k-pop-numbers-quiz-how-many-members)

### G31 · General K-pop · Music videos

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-music-video-themes-quiz` | K-pop music video themes quiz | soojinnie | Team | 62 | 5 | 2026-03-30 |
| `find-the-music-video-that-does-not-belong` | Find the Music Video That Does Not Belong | idol_expert | Player | 38 | 10 | 2026-04-05 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-music-video-themes-quiz` | K-pop MV Themes: Art, Settings and One Takes (55) | K-pop MV themes: art, settings and one takes | The ideas behind K-pop music videos: the art in Blood Sweat and Tears, the school dance-off in Boy In Luv and the one take filming of Growl. (140) |
| `find-the-music-video-that-does-not-belong` | Find the MV That Is Not by This Group (48) | Find the music video that is not by this group | Each round names a group and shows music videos: find the one by another group, like TOMBOY among BLACKPINK videos. An easy odd one out round. (142) |

Series links:

- `k-pop-music-video-themes-quiz` links to [General K-pop quiz](/general-kpop-quiz); [Find the MV That Is Not by This Group](/q/find-the-music-video-that-does-not-belong)
- `find-the-music-video-that-does-not-belong` links to [General K-pop quiz](/general-kpop-quiz); [K-pop MV Themes: Art, Settings and One Takes](/q/k-pop-music-video-themes-quiz)

### G32 · General K-pop · Colors in K-pop

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `k-pop-songs-with-colors-in-the-title` | K-pop songs with colors in the title | soojinnie | Team | 74 | 6 | 2026-04-03 |
| `taste-the-rainbow-colors-in-k-pop` | Taste the Rainbow - Colors in K-Pop | light_a_matz | Player | 5 | 20 | 2026-07-09 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `k-pop-songs-with-colors-in-the-title` | K-pop Songs with Colors in the Title (47) | K-pop songs with colors in the title | Red Flavor, Blue Hour, Black Mamba and more: name the group behind each K-pop song with a color in its title. Six questions. (124) |
| `taste-the-rainbow-colors-in-k-pop` | Colors in K-pop: Songs, Fandoms and Groups (53) | Colors in K-pop: songs, fandoms and groups | A long round on colors across K-pop: songs with a color in the title, fandom colors like Pink Panda and groups linked to a color. (129) |

Series links:

- `k-pop-songs-with-colors-in-the-title` links to [General K-pop quiz](/general-kpop-quiz); [Colors in K-pop: Songs, Fandoms and Groups](/q/taste-the-rainbow-colors-in-k-pop)
- `taste-the-rainbow-colors-in-k-pop` links to [General K-pop quiz](/general-kpop-quiz); [K-pop Songs with Colors in the Title](/q/k-pop-songs-with-colors-in-the-title)

### G33 · General K-pop · Album covers

Retitle (highest shared share 10%, below the 60% merge line). Shared questions: `name-that-album-cover` and `name-that-boy-group-album` 10% (1/10).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `name-that-album-cover` | Name That Album Cover | kpopfan_official | Player | 65 | 10 | 2026-04-05 |
| `name-that-boy-group-album` | Name That Boy Group Album | kpopfan_official | Player | 3 | 10 | 2026-04-05 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `name-that-album-cover` | Name the K-pop Album from Its Cover (46) | Name the K-pop album from its cover | See an album cover, name the album: Proof, THE ALBUM, Armageddon and more from boy and girl groups. A picture round for album collectors. (137) |
| `name-that-boy-group-album` | Name the Boy Group Album from Its Cover (50) | Name the boy group album from its cover | A hard picture round on boy group albums: see the cover and name it, from 5-STAR and Wings to SEVENTEENTH HEAVEN and more. (122) |

Series links:

- `name-that-album-cover` links to [General K-pop quiz](/general-kpop-quiz); [Name the Boy Group Album from Its Cover](/q/name-that-boy-group-album)
- `name-that-boy-group-album` links to [General K-pop quiz](/general-kpop-quiz); [Name the K-pop Album from Its Cover](/q/name-that-album-cover)

### G34 · General K-pop · Recognize the idol (photos)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [General K-pop quiz](/general-kpop-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `can-you-recognize-these-k-pop-idols-` | Can You Recognize These K-pop Idols ? | mingi | Player | 116 | 10 | 2026-04-05 |
| `can-you-recognize-these-idols-as-kids` | Can You Recognize These Idols as Kids? | kpopquizz | Player | 104 | 10 | 2026-04-05 |
| `can-you-name-these-male-kpop-idols` | Can You Name These Male K-pop Idols? | kpopquizz | Player | 55 | 10 | 2026-04-05 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `can-you-recognize-these-k-pop-idols-` | Recognize K-pop Idols from Their Photos (50) | Recognize K-pop idols from their photos | See a photo and name the idol, from Karina and Lisa to Jungkook and more members of big groups. An easy picture round for fans of many groups. (142) |
| `can-you-recognize-these-idols-as-kids` | Recognize K-pop Idols from Childhood Photos (54) | Recognize K-pop idols from childhood photos | Can you tell who these idols are from photos taken when they were children? Jungkook, IU, Lisa and more well known stars in a picture round. (140) |
| `can-you-name-these-male-kpop-idols` | Name the Male K-pop Idol from a Photo (48) | Name the male K-pop idol from a photo | See a photo and name the male idol, from Bang Chan and Soobin to Hoshi and more members of boy groups. An easy picture round. (125) |

Series links:

- `can-you-recognize-these-k-pop-idols-` links to [General K-pop quiz](/general-kpop-quiz); [Recognize K-pop Idols from Childhood Photos](/q/can-you-recognize-these-idols-as-kids); [Name the Male K-pop Idol from a Photo](/q/can-you-name-these-male-kpop-idols)
- `can-you-recognize-these-idols-as-kids` links to [General K-pop quiz](/general-kpop-quiz); [Recognize K-pop Idols from Their Photos](/q/can-you-recognize-these-k-pop-idols-); [Name the Male K-pop Idol from a Photo](/q/can-you-name-these-male-kpop-idols)
- `can-you-name-these-male-kpop-idols` links to [General K-pop quiz](/general-kpop-quiz); [Recognize K-pop Idols from Their Photos](/q/can-you-recognize-these-k-pop-idols-); [Recognize K-pop Idols from Childhood Photos](/q/can-you-recognize-these-idols-as-kids)

## kpopquiz.org: single quizzes that break the hub rule

Not part of a cluster, but their titles normalize to "{Group} quiz" or to the bare group name.

| Slug | Creator's title | Creator | Plays | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|---|---|---|
| `kiiikiii-quiz` | Kiiikiii quiz! | luvzxmoka | 19 | Kiiikiii True or False: Members and Name Meaning (59) | Kiiikiii true or false: the members and the name meaning | A hard Kiiikiii true or false round: what the group name means, who leads, who is the oldest and youngest and which member trained alongside another idol. (154) |
| `zerobaseone-quiz` | ZEROBASEONE quiz | about_zb1 | 22 | ZEROBASEONE Basics: Boys Planet to Melting Point (59) | ZEROBASEONE basics: from Boys Planet to Melting Point | An easy ZEROBASEONE quiz: the survival show Boys Planet, the debut date, the fandom name, the first comeback Melting Point, the leader and the maknae. (150) |
| `p1harmony` | p1harmony | fai | 5 | P1Harmony Fan Details: Emojis, Nicknames, Debut (58) | P1Harmony fan details: emojis, nicknames and the debut | A fan made P1Harmony quiz full of inside jokes: the members' emojis and nicknames, what Intak's fans are called and the year the group debuted. (143) |

## otakuquiz.org (O1 dev): clusters

Plays are near zero everywhere (the site is not live), so the keep rule never had to decide anything here. Hub paths assume the KpopQuiz pattern `/{series}-quiz`; adjust if the anime hub route differs.

### A01 · Death Note · Death Note true or false

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Death Note quiz](/death-note-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `name-and-face-death-note-true-or-false` | Name and Face: Death Note True or False | oq_creator_01 | Team | 0 | 10 | 2026-10-20 |
| `fx-death-note-true-or-false` | Death Note: True or False | o1_dual | Player | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `name-and-face-death-note-true-or-false` | Death Note True or False: Creators and Jump Run (59) | Death Note true or false: the creators and the Jump run | True or false on how Death Note was made: who writes and who draws it, what the Japanese title means and when the manga ran in Weekly Shōnen Jump. (146) |
| `fx-death-note-true-or-false` | Death Note True or False: Quick Warmup (50) | Death Note true or false: a quick warmup | A very short Death Note true or false to warm up: what Ryuk is, which studio really made the anime and where Light is when the story begins. (140) |

Series links:

- `name-and-face-death-note-true-or-false` links to [Death Note quiz](/death-note-quiz); [Death Note True or False: Quick Warmup](/q/fx-death-note-true-or-false)
- `fx-death-note-true-or-false` links to [Death Note quiz](/death-note-quiz); [Death Note True or False: Creators and Jump Run](/q/name-and-face-death-note-true-or-false)

### A02 · Death Note · Death Note basics

Retitle (highest shared share 10%, below the 60% merge line). Shared questions: `the-notebook-hits-the-ground-death-note-basics` and `fx-death-note-basics-rules-and-creators` 10% (1/10).
Hub link: [Death Note quiz](/death-note-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `the-notebook-hits-the-ground-death-note-basics` | The Notebook Hits the Ground: Death Note Basics | oq_creator_01 | Team | 0 | 10 | 2026-10-20 |
| `fx-death-note-basics-rules-and-creators` | Death Note Basics: Rules and Creators | oq_creator_01 | Team | 0 | 10 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `the-notebook-hits-the-ground-death-note-basics` | Death Note Basics: Obata, Shueisha and L (52) | Death Note basics: Obata, Shueisha and L | An easy start on Death Note: who draws the manga, which company published it in Weekly Shōnen Jump, what L never stops eating and other first facts. (148) |
| `fx-death-note-basics-rules-and-creators` | Death Note Rules and Creators: Madhouse to Jump (59) | Death Note rules and creators: from Madhouse to Jump | Who made Death Note and how does the notebook work? The writer and artist, the first magazine, the Madhouse anime and the rules of the Death Note. (146) |

Series links:

- `the-notebook-hits-the-ground-death-note-basics` links to [Death Note quiz](/death-note-quiz); [Death Note Rules and Creators: Madhouse to Jump](/q/fx-death-note-basics-rules-and-creators)
- `fx-death-note-basics-rules-and-creators` links to [Death Note quiz](/death-note-quiz); [Death Note Basics: Obata, Shueisha and L](/q/the-notebook-hits-the-ground-death-note-basics)

### A03 · Death Note · Death Note odd one out

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Death Note quiz](/death-note-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `which-one-is-not-a-shinigami-death-note-odd-one-out` | Which One Is Not a Shinigami? Death Note Odd One Out | oq_creator_01 | Team | 0 | 10 | 2026-10-25 |
| `fx-death-note-odd-one-out` | Death Note: Odd One Out | o1_anime_new | Player | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `which-one-is-not-a-shinigami-death-note-odd-one-out` | Death Note Odd One Out: Shinigami and Yotsuba (57) | Death Note odd one out: Shinigami, Yotsuba and more | Three belong, one does not: find the human among the Shinigami, the outsider among the Yotsuba executives and other Death Note odd ones out. (140) |
| `fx-death-note-odd-one-out` | Death Note Odd One Out: Songs, Cast, Creators (57) | Death Note odd one out: songs, cast and creators | A short odd one out round: spot the song that is not a Death Note theme, the character from another series and the creator who did not make Death Note. (151) |

Series links:

- `which-one-is-not-a-shinigami-death-note-odd-one-out` links to [Death Note quiz](/death-note-quiz); [Death Note Odd One Out: Songs, Cast, Creators](/q/fx-death-note-odd-one-out)
- `fx-death-note-odd-one-out` links to [Death Note quiz](/death-note-quiz); [Death Note Odd One Out: Shinigami and Yotsuba](/q/which-one-is-not-a-shinigami-death-note-odd-one-out)

### A04 · Death Note · Death Note characters

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Death Note quiz](/death-note-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `task-force-roll-call-death-note-who-is-who` | Task Force Roll Call: Death Note Who Is Who | oq_creator_01 | Team | 0 | 10 | 2026-10-20 |
| `fx-guess-the-death-note-character` | Guess the Death Note Character | oq_creator_02 | Team | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `task-force-roll-call-death-note-who-is-who` | Death Note Who Is Who: L and the Task Force (55) | Death Note who is who: L and the task force | Read a short description and name the Death Note character: the student who finds the notebook, the famous detective, the bored Shinigami and the task force. (157) |
| `fx-guess-the-death-note-character` | Guess the Death Note Character from Clues (53) | Guess the Death Note character from clues | Three clues per character: a Shinigami who loves apples, a detective known by one letter and the police chief who leads the task force. Name them. (146) |

Series links:

- `task-force-roll-call-death-note-who-is-who` links to [Death Note quiz](/death-note-quiz); [Guess the Death Note Character from Clues](/q/fx-guess-the-death-note-character)
- `fx-guess-the-death-note-character` links to [Death Note quiz](/death-note-quiz); [Death Note Who Is Who: L and the Task Force](/q/task-force-roll-call-death-note-who-is-who)

### A05 · Death Note · Death Note later cast (hard)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Death Note quiz](/death-note-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `before-and-after-episode-26-death-note-by-part` | Shinigami, Wammy's House and the Later Cast: Death Note | oq_creator_01 | Team | 0 | 10 | 2026-10-20 |
| `fx-death-note-part-2-new-detectives` | Death Note Part 2: The New Detectives | oq_creator_02 | Team | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `before-and-after-episode-26-death-note-by-part` | Death Note Hard: Shinigami and the Later Cast (57) | Death Note, hard: the Shinigami and the later cast | A hard Death Note quiz across both parts: the main characters lists, the Shinigami who give out notebooks, Wammy's House and the cast of the later story. (153) |
| `fx-death-note-part-2-new-detectives` | Death Note Part 2: Wammy's House and Openings (57) | Death Note part 2: Wammy's House and the openings | A short hard round on the second part of Death Note: which part brings in the new detectives, where they grew up and who performed the second opening. (150) |

Series links:

- `before-and-after-episode-26-death-note-by-part` links to [Death Note quiz](/death-note-quiz); [Death Note Part 2: Wammy's House and Openings](/q/fx-death-note-part-2-new-detectives)
- `fx-death-note-part-2-new-detectives` links to [Death Note quiz](/death-note-quiz); [Death Note Hard: Shinigami and the Later Cast](/q/before-and-after-episode-26-death-note-by-part)

### A06 · Spy × Family · Spy x Family true or false

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Spy × Family quiz](/spy-x-family-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `cover-story-or-truth-spy-x-family-true-or-false` | Cover Story or Truth: Spy x Family True or False | oq_creator_03 | Team | 0 | 10 | 2026-10-20 |
| `fx-spy-x-family-true-or-false` | Spy x Family: True or False | o1_dual | Player | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `cover-story-or-truth-spy-x-family-true-or-false` | Spy × Family True or False: Endo, Title, Fans (57) | Spy × Family true or false: Endo, the title and the fans | True or false on Spy × Family facts: whether Tatsuya Endo writes and draws it, how the Japanese title is spelled and a fan survey about Anya's peanuts. (151) |
| `fx-spy-x-family-true-or-false` | Spy × Family True or False: The Forgers (51) | Spy × Family true or false: the Forgers | A very short Spy × Family true or false on the Forger family: where Yor works, what Anya can do and what Loid really does for a living. (135) |

Series links:

- `cover-story-or-truth-spy-x-family-true-or-false` links to [Spy × Family quiz](/spy-x-family-quiz); [Spy × Family True or False: The Forgers](/q/fx-spy-x-family-true-or-false)
- `fx-spy-x-family-true-or-false` links to [Spy × Family quiz](/spy-x-family-quiz); [Spy × Family True or False: Endo, Title, Fans](/q/cover-story-or-truth-spy-x-family-true-or-false)

### A07 · Spy × Family · Spy x Family basics

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Spy × Family quiz](/spy-x-family-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `a-fake-family-on-day-one-spy-x-family-basics` | A Fake Family on Day One: Spy x Family Basics | oq_creator_03 | Team | 0 | 10 | 2026-10-20 |
| `fx-spy-x-family-basics-the-forgers` | Spy x Family Basics: The Forgers | oq_creator_04 | Team | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `a-fake-family-on-day-one-spy-x-family-basics` | Spy × Family Basics: Endo, Volumes and Sales (56) | Spy × Family basics: Endo, the volumes and the sales | An easy start on Spy × Family: the creator Tatsuya Endo, how many volumes the manga has filled, its circulation and other first facts about the series. (151) |
| `fx-spy-x-family-basics-the-forgers` | Spy × Family Basics: Twilight, Anya, Studios (56) | Spy × Family basics: Twilight, Anya and the studios | Three quick Spy × Family basics: Loid's spy codename, Anya's secret power and the two studios that made the anime. A short warmup for new viewers. (146) |

Series links:

- `a-fake-family-on-day-one-spy-x-family-basics` links to [Spy × Family quiz](/spy-x-family-quiz); [Spy × Family Basics: Twilight, Anya, Studios](/q/fx-spy-x-family-basics-the-forgers)
- `fx-spy-x-family-basics-the-forgers` links to [Spy × Family quiz](/spy-x-family-quiz); [Spy × Family Basics: Endo, Volumes and Sales](/q/a-fake-family-on-day-one-spy-x-family-basics)

### A08 · Spy × Family · Spy x Family characters

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Spy × Family quiz](/spy-x-family-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `forgers-friends-and-classmates-spy-x-family-who-is-who` | Forgers, Friends and Classmates: Spy x Family Who Is Who | oq_creator_03 | Team | 0 | 10 | 2026-10-20 |
| `fx-guess-the-spy-x-family-character` | Guess the Spy x Family Character | oq_creator_04 | Team | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `forgers-friends-and-classmates-spy-x-family-who-is-who` | Spy × Family Who Is Who: Forgers and Eden (53) | Spy × Family who is who: the Forgers and Eden | Read a short description and name the Spy × Family character: Twilight, the telepath Anya, Yor the city hall clerk, their friends and Anya's classmates. (152) |
| `fx-guess-the-spy-x-family-character` | Guess the Spy × Family Character from Clues (55) | Guess the Spy × Family character from clues | Three clues per character: the spy called Twilight, the city hall clerk known as the Thorn Princess and the informant with gadgets. Name each one. (146) |

Series links:

- `forgers-friends-and-classmates-spy-x-family-who-is-who` links to [Spy × Family quiz](/spy-x-family-quiz); [Guess the Spy × Family Character from Clues](/q/fx-guess-the-spy-x-family-character)
- `fx-guess-the-spy-x-family-character` links to [Spy × Family quiz](/spy-x-family-quiz); [Spy × Family Who Is Who: Forgers and Eden](/q/forgers-friends-and-classmates-spy-x-family-who-is-who)

### A09 · Spy × Family · Spy x Family songs and staff

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Spy × Family quiz](/spy-x-family-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `hige-dandism-to-lilas-ikuta-spy-x-family-songs-and-staff` | Hige Dandism to Lilas Ikuta: Spy x Family Songs and Staff | oq_creator_03 | Team | 0 | 10 | 2026-10-20 |
| `four-blocks-and-a-crowd-spy-x-family-by-season` | Directors, Songs and Cast: Spy x Family Mixed Round | oq_creator_03 | Team | 0 | 10 | 2026-10-20 |
| `fx-spy-x-family-season-2` | Spy x Family: Season 2 and the Songs | oq_creator_05 | Team | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `hige-dandism-to-lilas-ikuta-spy-x-family-songs-and-staff` | Spy × Family Openings and Endings: Who Sang (55) | Spy × Family openings and endings: who sang them | Who sang Mixed Nuts, Kura Kura and Hi o Mamoru? Match each Spy × Family opening and ending to its artist, from Official Hige Dandism to Ado and Spitz. (150) |
| `four-blocks-and-a-crowd-spy-x-family-by-season` | Spy × Family by Season: Directors, Dates, Songs (59) | Spy × Family by season: directors, dates and songs | A hard mixed round on the Spy × Family anime season by season: the directors, when the seasons aired, the openings and the cast behind the Forgers. (147) |
| `fx-spy-x-family-season-2` | Spy × Family Season 2: Cruise Arc and Kura Kura (59) | Spy × Family season 2: the cruise arc and Kura Kura | A short Spy × Family season 2 round: where Yor's mission happens during the family trip, who sang Kura Kura and who sang the first opening Mixed Nuts. (150) |

Series links:

- `hige-dandism-to-lilas-ikuta-spy-x-family-songs-and-staff` links to [Spy × Family quiz](/spy-x-family-quiz); [Spy × Family by Season: Directors, Dates, Songs](/q/four-blocks-and-a-crowd-spy-x-family-by-season); [Spy × Family Season 2: Cruise Arc and Kura Kura](/q/fx-spy-x-family-season-2)
- `four-blocks-and-a-crowd-spy-x-family-by-season` links to [Spy × Family quiz](/spy-x-family-quiz); [Spy × Family Openings and Endings: Who Sang](/q/hige-dandism-to-lilas-ikuta-spy-x-family-songs-and-staff); [Spy × Family Season 2: Cruise Arc and Kura Kura](/q/fx-spy-x-family-season-2)
- `fx-spy-x-family-season-2` links to [Spy × Family quiz](/spy-x-family-quiz); [Spy × Family Openings and Endings: Who Sang](/q/hige-dandism-to-lilas-ikuta-spy-x-family-songs-and-staff); [Spy × Family by Season: Directors, Dates, Songs](/q/four-blocks-and-a-crowd-spy-x-family-by-season)

### A10 · One Piece · One Piece true or false

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [One Piece quiz](/one-piece-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `pirates-honor-one-piece-true-or-false` | Pirate's Honor: One Piece True or False | oq_creator_02 | Team | 0 | 10 | 2026-10-20 |
| `fx-one-piece-true-or-false` | One Piece: True or False | o1_dual | Player | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `pirates-honor-one-piece-true-or-false` | One Piece True or False: Oda, Jump and Volumes (58) | One Piece true or false: Oda, Jump and the volumes | True or false on the One Piece manga: whether Eiichiro Oda writes and draws it alone, when it started in Weekly Shōnen Jump and how many volumes are out. (153) |
| `fx-one-piece-true-or-false` | One Piece True or False: Straw Hat Warmup (53) | One Piece true or false: a Straw Hat warmup | A very short One Piece true or false on the Straw Hats: Luffy's rubber body, how many swords Zoro uses and who is really the crew's navigator. (142) |

Series links:

- `pirates-honor-one-piece-true-or-false` links to [One Piece quiz](/one-piece-quiz); [One Piece True or False: Straw Hat Warmup](/q/fx-one-piece-true-or-false)
- `fx-one-piece-true-or-false` links to [One Piece quiz](/one-piece-quiz); [One Piece True or False: Oda, Jump and Volumes](/q/pirates-honor-one-piece-true-or-false)

### A11 · One Piece · One Piece basics

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [One Piece quiz](/one-piece-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `raising-the-flag-one-piece-basics` | Raising the Flag: One Piece Basics | oq_creator_02 | Team | 0 | 10 | 2026-10-20 |
| `fx-one-piece-basics-creator-and-crew` | One Piece Basics: Creator and Crew | oq_creator_03 | Team | 1 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `raising-the-flag-one-piece-basics` | One Piece Basics: Oda, Jump Start and Volumes (57) | One Piece basics: Oda, the Jump start and the volumes | An easy start on One Piece: who writes and draws it, the year it started in Weekly Shōnen Jump, how many volumes are out and other first facts. (143) |
| `fx-one-piece-basics-creator-and-crew` | One Piece Basics: Oda, Toei and Luffy's Dream (57) | One Piece basics: Oda, Toei and Luffy's dream | Three quick One Piece basics: who created the manga, which studio animates the TV series and what Luffy wants to become. A warmup for new viewers. (146) |

Series links:

- `raising-the-flag-one-piece-basics` links to [One Piece quiz](/one-piece-quiz); [One Piece Basics: Oda, Toei and Luffy's Dream](/q/fx-one-piece-basics-creator-and-crew)
- `fx-one-piece-basics-creator-and-crew` links to [One Piece quiz](/one-piece-quiz); [One Piece Basics: Oda, Jump Start and Volumes](/q/raising-the-flag-one-piece-basics)

### A12 · One Piece · One Piece characters

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [One Piece quiz](/one-piece-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `straw-hats-and-early-rivals-one-piece-who-is-who` | Straw Hats and Early Rivals: One Piece Who Is Who | oq_creator_02 | Team | 0 | 10 | 2026-10-20 |
| `fx-guess-the-straw-hat` | Guess the Straw Hat | oq_creator_03 | Team | 0 | 3 | 2026-10-20 |
| `fx-one-piece-east-blue-villains` | One Piece: East Blue Villains | oq_creator_05 | Team | 0 | 3 | 2026-10-20 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `straw-hats-and-early-rivals-one-piece-who-is-who` | One Piece Who Is Who: Straw Hats and Rivals (55) | One Piece who is who: the Straw Hats and early rivals | Read a short description and name the One Piece character: the rubber pirate, the three sword swordsman, Shanks and the rivals of the early voyage. (147) |
| `fx-guess-the-straw-hat` | Guess the One Piece Straw Hat from Clues (52) | Guess the One Piece Straw Hat from clues | Three clues per pirate: the navigator who reads the weather, the sharpshooter with tall tales and the cook who fights with his legs. Name each Straw Hat. (153) |
| `fx-one-piece-east-blue-villains` | One Piece East Blue Villains: Buggy to Arlong (57) | One Piece East Blue villains: from Buggy to Arlong | A short round on the first One Piece villains: the clown captain Buggy, what kind of being Arlong is and which Straw Hat comes from the village he ruled. (153) |

Series links:

- `straw-hats-and-early-rivals-one-piece-who-is-who` links to [One Piece quiz](/one-piece-quiz); [Guess the One Piece Straw Hat from Clues](/q/fx-guess-the-straw-hat); [One Piece East Blue Villains: Buggy to Arlong](/q/fx-one-piece-east-blue-villains)
- `fx-guess-the-straw-hat` links to [One Piece quiz](/one-piece-quiz); [One Piece Who Is Who: Straw Hats and Rivals](/q/straw-hats-and-early-rivals-one-piece-who-is-who); [One Piece East Blue Villains: Buggy to Arlong](/q/fx-one-piece-east-blue-villains)
- `fx-one-piece-east-blue-villains` links to [One Piece quiz](/one-piece-quiz); [One Piece Who Is Who: Straw Hats and Rivals](/q/straw-hats-and-early-rivals-one-piece-who-is-who); [Guess the One Piece Straw Hat from Clues](/q/fx-guess-the-straw-hat)

### A13 · Kagurabachi · Kagurabachi odds and ends (56% overlap)

Retitle (highest shared share 56%, below the 60% merge line). Shared questions: `cloud-gouger-to-smelting-kagurabachi-odds-and-ends` and `swords-and-sorcerers-kagurabachi-odds-and-ends` 56% (5/9).
Hub link: [Kagurabachi quiz](/kagurabachi-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `cloud-gouger-to-smelting-kagurabachi-odds-and-ends` | Cloud Gouger to Smelting: Kagurabachi Odds and Ends | oq_creator_25 | Team | 0 | 9 | 2026-10-20 |
| `swords-and-sorcerers-kagurabachi-odds-and-ends` | Swords and Sorcerers: Kagurabachi Odds and Ends | oq_creator_25 | Team | 0 | 9 | 2026-10-23 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `cloud-gouger-to-smelting-kagurabachi-odds-and-ends` | Kagurabachi Story Blocks: Arcs by Chapter (53) | Kagurabachi story blocks: the arcs by chapter | A hard Kagurabachi round on how the story is split: which block covers which chapters, from Cloud Gouger and Rakuzaichi to the later sword bearer arcs. (151) |
| `swords-and-sorcerers-kagurabachi-odds-and-ends` | Kagurabachi World: Seitei War, Kamunabi, Views (58) | Kagurabachi world: the Seitei War, Kamunabi and views | Questions on the world of Kagurabachi: when the story is set after the Seitei War, what the Kamunabi is and how many page views the series drew online. (151) |

Series links:

- `cloud-gouger-to-smelting-kagurabachi-odds-and-ends` links to [Kagurabachi quiz](/kagurabachi-quiz); [Kagurabachi World: Seitei War, Kamunabi, Views](/q/swords-and-sorcerers-kagurabachi-odds-and-ends)
- `swords-and-sorcerers-kagurabachi-odds-and-ends` links to [Kagurabachi quiz](/kagurabachi-quiz); [Kagurabachi Story Blocks: Arcs by Chapter](/q/cloud-gouger-to-smelting-kagurabachi-odds-and-ends)

### A14 · Anime Mix · Guess the anime from three words or clues

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Anime Mix quiz](/anime-mix-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `three-words-one-brawl-guess-the-battle-shonen` | Three Words, One Brawl: Guess the Battle Shonen | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-one-portal-guess-the-fantasy-and-isekai-anime` | Three Words, One Portal: Guess the Fantasy and Isekai Anime | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-one-secret-guess-the-mystery-and-mind-game-anime` | Three Words, One Secret: Guess the Mystery and Mind-Game Anime | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-one-oddball-guess-the-strange-and-quirky-anime` | Three Words, One Oddball: Guess the Strange and Quirky Anime | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-from-the-clubroom-guess-the-sports-music-and-drama-anime` | Three Words from the Clubroom: Guess the Sports, Music and Drama Anime | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-from-the-retro-shelf-guess-the-early-tv-classics` | Three Words from the Retro Shelf: Guess the Early TV Classics | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-from-the-noughties-guess-the-anime-that-debuted-2002-to-2012` | Three Words from the Noughties: Guess the Anime That Debuted 2002 to 2012 | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-from-the-mid-2010s-guess-the-anime-that-debuted-2013-to-2018` | Three Words from the Mid-2010s: Guess the Anime That Debuted 2013 to 2018 | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-from-the-new-decade-guess-the-anime-that-debuted-2019-to-2022` | Three Words from the New Decade: Guess the Anime That Debuted 2019 to 2022 | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-words-from-the-newest-shelf-guess-the-latest-anime-and-webcomic-hits` | Three Words from the Newest Shelf: Guess the Latest Anime and Webcomic Hits | otakuquiz_team | Team | 0 | 10 | 2026-10-26 |
| `three-clues-one-anime-studio-year-and-plot-hint` | Three Clues, One Anime: Studio, Year and Plot Hint | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `three-words-one-brawl-guess-the-battle-shonen` | Guess the Battle Shonen Anime from Three Words (58) | Guess the battle shonen anime from three words | Hokage, Ninja Academy, Team 7: three words point to one anime. An easy round on battle shonen like Naruto and Bleach. Read the words and pick the series. (153) |
| `three-words-one-portal-guess-the-fantasy-and-isekai-anime` | Guess the Isekai or Fantasy Anime: Three Words (58) | Guess the isekai or fantasy anime from three words | A NEET, a fantasy world, time that rewinds: three words lead to one isekai or fantasy anime. An easy round with Re:Zero, Reincarnated as a Slime and more. (154) |
| `three-words-one-secret-guess-the-mystery-and-mind-game-anime` | Guess the Mystery Anime from Three Words (52) | Guess the mystery and mind game anime from three words | Shinigami, apples and a detective who loves sweets: name the mystery or mind game anime from three words. Death Note, Detective Conan and more. (143) |
| `three-words-one-oddball-guess-the-strange-and-quirky-anime` | Guess the Quirky Anime from Three Words (51) | Guess the strange and quirky anime from three words | Devil hunters, a yakuza debt and Division 4: three words, one odd anime. Name the strangest series, from Chainsaw Man to Dandadan. (130) |
| `three-words-from-the-clubroom-guess-the-sports-music-and-drama-anime` | Guess the Sports or Music Anime: Three Words (56) | Guess the sports, music or club anime from three words | Volleyball, Karasuno and the Little Giant: name the sports, music or club drama anime from three words. Haikyu!!, Slam Dunk and more. (133) |
| `three-words-from-the-retro-shelf-guess-the-early-tv-classics` | Guess the Early TV Classic Anime: Three Words (57) | Guess the early TV classic anime from three words | Master Roshi, a shape shifting pig and a giant ape: name the long running TV classic from three words. Dragon Ball, One Piece and other early hits. (147) |
| `three-words-from-the-noughties-guess-the-anime-that-debuted-2002-to-2012` | Guess the 2002 to 2012 Anime from Three Words (57) | Guess the anime that debuted from 2002 to 2012 | Three words, one anime that first aired between 2002 and 2012: Shippuden, a suit of armor, the Philosopher's Stone. Naruto, Fullmetal Alchemist and more. (153) |
| `three-words-from-the-mid-2010s-guess-the-anime-that-debuted-2013-to-2018` | Guess the 2013 to 2018 Anime from Three Words (57) | Guess the anime that debuted from 2013 to 2018 | A hard round on anime that first aired from 2013 to 2018: the Garrison and the Training Corps, a prodigy setter and more. Read three words, name the series. (156) |
| `three-words-from-the-new-decade-guess-the-anime-that-debuted-2019-to-2022` | Guess the 2019 to 2022 Anime from Three Words (57) | Guess the anime that debuted from 2019 to 2022 | Three words, one anime that first aired between 2019 and 2022: a boar mask and the Hashira, a typewriter and an old tale. Demon Slayer, Kaguya-sama and more. (157) |
| `three-words-from-the-newest-shelf-guess-the-latest-anime-and-webcomic-hits` | Guess the Newest Anime Hits from Three Words (56) | Guess the newest anime and webcomic hits from three words | A hard round on recent hits: peanuts and the Thorn Princess, an acting prodigy and tears on cue. Name the newest anime and webcomic series from three words. (156) |
| `three-clues-one-anime-studio-year-and-plot-hint` | Guess the Anime from Studio, Year and Plot (54) | Guess the anime from its studio, year and plot | Three clues per anime: the studio that made it, the year it began airing and a plot hint. From Black Clover to Bocchi the Rock!, name each series. (146) |

Series links:

- `three-words-one-brawl-guess-the-battle-shonen` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the Isekai or Fantasy Anime: Three Words](/q/three-words-one-portal-guess-the-fantasy-and-isekai-anime)
- `three-words-one-portal-guess-the-fantasy-and-isekai-anime` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the Battle Shonen Anime from Three Words](/q/three-words-one-brawl-guess-the-battle-shonen); [Guess the Mystery Anime from Three Words](/q/three-words-one-secret-guess-the-mystery-and-mind-game-anime)
- `three-words-one-secret-guess-the-mystery-and-mind-game-anime` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the Isekai or Fantasy Anime: Three Words](/q/three-words-one-portal-guess-the-fantasy-and-isekai-anime); [Guess the Quirky Anime from Three Words](/q/three-words-one-oddball-guess-the-strange-and-quirky-anime)
- `three-words-one-oddball-guess-the-strange-and-quirky-anime` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the Mystery Anime from Three Words](/q/three-words-one-secret-guess-the-mystery-and-mind-game-anime); [Guess the Sports or Music Anime: Three Words](/q/three-words-from-the-clubroom-guess-the-sports-music-and-drama-anime)
- `three-words-from-the-clubroom-guess-the-sports-music-and-drama-anime` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the Quirky Anime from Three Words](/q/three-words-one-oddball-guess-the-strange-and-quirky-anime); [Guess the Early TV Classic Anime: Three Words](/q/three-words-from-the-retro-shelf-guess-the-early-tv-classics)
- `three-words-from-the-retro-shelf-guess-the-early-tv-classics` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the Sports or Music Anime: Three Words](/q/three-words-from-the-clubroom-guess-the-sports-music-and-drama-anime); [Guess the 2002 to 2012 Anime from Three Words](/q/three-words-from-the-noughties-guess-the-anime-that-debuted-2002-to-2012)
- `three-words-from-the-noughties-guess-the-anime-that-debuted-2002-to-2012` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the Early TV Classic Anime: Three Words](/q/three-words-from-the-retro-shelf-guess-the-early-tv-classics); [Guess the 2013 to 2018 Anime from Three Words](/q/three-words-from-the-mid-2010s-guess-the-anime-that-debuted-2013-to-2018)
- `three-words-from-the-mid-2010s-guess-the-anime-that-debuted-2013-to-2018` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the 2002 to 2012 Anime from Three Words](/q/three-words-from-the-noughties-guess-the-anime-that-debuted-2002-to-2012); [Guess the 2019 to 2022 Anime from Three Words](/q/three-words-from-the-new-decade-guess-the-anime-that-debuted-2019-to-2022)
- `three-words-from-the-new-decade-guess-the-anime-that-debuted-2019-to-2022` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the 2013 to 2018 Anime from Three Words](/q/three-words-from-the-mid-2010s-guess-the-anime-that-debuted-2013-to-2018); [Guess the Newest Anime Hits from Three Words](/q/three-words-from-the-newest-shelf-guess-the-latest-anime-and-webcomic-hits)
- `three-words-from-the-newest-shelf-guess-the-latest-anime-and-webcomic-hits` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the 2019 to 2022 Anime from Three Words](/q/three-words-from-the-new-decade-guess-the-anime-that-debuted-2019-to-2022); [Guess the Anime from Studio, Year and Plot](/q/three-clues-one-anime-studio-year-and-plot-hint)
- `three-clues-one-anime-studio-year-and-plot-hint` links to [Anime Mix quiz](/anime-mix-quiz); [Guess the Newest Anime Hits from Three Words](/q/three-words-from-the-newest-shelf-guess-the-latest-anime-and-webcomic-hits)

### A15 · Anime Mix · Anime odd one out

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Anime Mix quiz](/anime-mix-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `not-in-that-magazine-manga-odd-one-out` | Not in That Magazine: Manga Odd One Out | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `where-did-it-begin-origins-and-adaptations-odd-one-out` | Where Did It Begin? Origins and Adaptations Odd One Out | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `same-studio-same-length-anime-odd-one-out` | Same Studio, Same Length: Anime Odd One Out | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `not-in-that-magazine-manga-odd-one-out` | Manga Odd One Out: Which Magazine Ran It? (53) | Manga odd one out: which magazine ran it? | Three of these manga ran in Weekly Shonen Jump, one did not. Find the odd one out by magazine, from Jump to Weekly Shonen Magazine and beyond. (142) |
| `where-did-it-begin-origins-and-adaptations-odd-one-out` | Anime Origins Odd One Out: Web Novel or Manga? (58) | Anime origins odd one out: web novel, light novel or manga? | Three began as web novels, one began as a webtoon: find the series with a different origin, from light novels and manga to webtoons and web fiction. (148) |
| `same-studio-same-length-anime-odd-one-out` | Anime Odd One Out: Studios and Episode Counts (57) | Anime odd one out: studios and episode counts | Three were made by Pierrot, one by Bones: find the odd one out by studio, season length or premiere year, with Madhouse, Sunrise, Gainax and more. (146) |

Series links:

- `not-in-that-magazine-manga-odd-one-out` links to [Anime Mix quiz](/anime-mix-quiz); [Anime Origins Odd One Out: Web Novel or Manga?](/q/where-did-it-begin-origins-and-adaptations-odd-one-out); [Anime Odd One Out: Studios and Episode Counts](/q/same-studio-same-length-anime-odd-one-out)
- `where-did-it-begin-origins-and-adaptations-odd-one-out` links to [Anime Mix quiz](/anime-mix-quiz); [Manga Odd One Out: Which Magazine Ran It?](/q/not-in-that-magazine-manga-odd-one-out); [Anime Odd One Out: Studios and Episode Counts](/q/same-studio-same-length-anime-odd-one-out)
- `same-studio-same-length-anime-odd-one-out` links to [Anime Mix quiz](/anime-mix-quiz); [Manga Odd One Out: Which Magazine Ran It?](/q/not-in-that-magazine-manga-odd-one-out); [Anime Origins Odd One Out: Web Novel or Manga?](/q/where-did-it-begin-origins-and-adaptations-odd-one-out)

### P01 · Code Geass · Code Geass quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Code Geass quiz](/code-geass-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `sunrise-clamp-and-area-11-code-geass-quiz` | Code Geass Quiz: Sunrise, Clamp and Area 11 | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `geass-users-knightmares-and-zero-requiem-code-geass-hard-quiz` | Code Geass Hard Quiz: Geass Users, Knightmares and Zero Requiem | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `sunrise-clamp-and-area-11-code-geass-quiz` | Code Geass Basics: Sunrise, Clamp and Area 11 (57) | Code Geass basics: Sunrise, Clamp and Area 11 | An easy start on Code Geass: the studio Sunrise, the character designs by Clamp, Area 11 and other first facts about the series and how it was made. (148) |
| `geass-users-knightmares-and-zero-requiem-code-geass-hard-quiz` | Code Geass Hard Mode: Geass Users, Knightmares (58) | Code Geass hard mode: Geass users and Knightmares | A hard Code Geass quiz for fans who finished the series: the powers of each Geass user, the Knights of the Round, Knightmare details and the final plan. (152) |

Series links:

- `sunrise-clamp-and-area-11-code-geass-quiz` links to [Code Geass quiz](/code-geass-quiz); [Code Geass Hard Mode: Geass Users, Knightmares](/q/geass-users-knightmares-and-zero-requiem-code-geass-hard-quiz)
- `geass-users-knightmares-and-zero-requiem-code-geass-hard-quiz` links to [Code Geass quiz](/code-geass-quiz); [Code Geass Basics: Sunrise, Clamp and Area 11](/q/sunrise-clamp-and-area-11-code-geass-quiz)

### P02 · Mob Psycho 100 · Mob Psycho 100 quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Mob Psycho 100 quiz](/mob-psycho-100-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `ura-sunday-bones-and-the-100-percent-meter-mob-psycho-100-quiz` | Mob Psycho 100 Quiz: Ura Sunday, Bones and the 100% Meter | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `claw-scars-and-the-mystery-meter-mob-psycho-100-hard-quiz` | Mob Psycho 100 Hard Quiz: Claw, the Scars and the Mystery Meter | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `ura-sunday-bones-and-the-100-percent-meter-mob-psycho-100-quiz` | Mob Psycho 100 Basics: Ura Sunday and Bones (55) | Mob Psycho 100 basics: Ura Sunday and Bones | An easy start on Mob Psycho 100: the website where the webcomic began, the app that carried it, the studio Bones and the 100 percent meter. (139) |
| `claw-scars-and-the-mystery-meter-mob-psycho-100-hard-quiz` | Mob Psycho 100 Hard Mode: Claw and the Espers (57) | Mob Psycho 100 hard mode: Claw and the espers | A hard Mob Psycho 100 quiz on the esper group Claw: who leads it, why Serizawa stayed indoors and what happens to its members after the fight. (142) |

Series links:

- `ura-sunday-bones-and-the-100-percent-meter-mob-psycho-100-quiz` links to [Mob Psycho 100 quiz](/mob-psycho-100-quiz); [Mob Psycho 100 Hard Mode: Claw and the Espers](/q/claw-scars-and-the-mystery-meter-mob-psycho-100-hard-quiz)
- `claw-scars-and-the-mystery-meter-mob-psycho-100-hard-quiz` links to [Mob Psycho 100 quiz](/mob-psycho-100-quiz); [Mob Psycho 100 Basics: Ura Sunday and Bones](/q/ura-sunday-bones-and-the-100-percent-meter-mob-psycho-100-quiz)

### P03 · Sword Art Online · Sword Art Online quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Sword Art Online quiz](/sword-art-online-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `nervegear-aincrad-and-kajiura-sword-art-online-quiz` | Sword Art Online Quiz: NerveGear, Aincrad and Kajiura | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `pen-names-rifles-and-integrity-knights-sword-art-online-hard-quiz` | Sword Art Online Hard Quiz: Pen Names, Rifles and Integrity Knights | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `nervegear-aincrad-and-kajiura-sword-art-online-quiz` | Sword Art Online Basics: NerveGear and Aincrad (58) | Sword Art Online basics: NerveGear and Aincrad | An easy start on Sword Art Online: the author Reki Kawahara, the Dengeki Bunko imprint, the floating castle Aincrad, the NerveGear and the music. (145) |
| `pen-names-rifles-and-integrity-knights-sword-art-online-hard-quiz` | Sword Art Online Hard Mode: Alicization, Rifles (59) | Sword Art Online hard mode: Alicization and rifles | A hard Sword Art Online quiz: who directed Alicization, what Yui really is, the name of Sinon's rifle and the Integrity Knights of the Underworld. (146) |

Series links:

- `nervegear-aincrad-and-kajiura-sword-art-online-quiz` links to [Sword Art Online quiz](/sword-art-online-quiz); [Sword Art Online Hard Mode: Alicization, Rifles](/q/pen-names-rifles-and-integrity-knights-sword-art-online-hard-quiz)
- `pen-names-rifles-and-integrity-knights-sword-art-online-hard-quiz` links to [Sword Art Online quiz](/sword-art-online-quiz); [Sword Art Online Basics: NerveGear and Aincrad](/q/nervegear-aincrad-and-kajiura-sword-art-online-quiz)

### P04 · Steins;Gate · Steins;Gate quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Steins;Gate quiz](/steins-gate-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `akihabara-the-phonewave-and-d-mails-steins-gate-quiz` | Steins;Gate Quiz: Akihabara, the PhoneWave and D-Mails | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `john-titor-amadeus-and-the-beta-timeline-steins-gate-hard-quiz` | Steins;Gate Hard Quiz: John Titor, Amadeus and the Beta Timeline | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `akihabara-the-phonewave-and-d-mails-steins-gate-quiz` | Steins;Gate Basics: Akihabara and D-Mails (53) | Steins;Gate basics: Akihabara and D-Mails | An easy start on Steins;Gate: the companies behind the visual novel, the console it first came out on, the lab in Akihabara and the D-Mails. (140) |
| `john-titor-amadeus-and-the-beta-timeline-steins-gate-hard-quiz` | Steins;Gate Hard Mode: John Titor and Amadeus (57) | Steins;Gate hard mode: John Titor and Amadeus | A hard Steins;Gate quiz for fans who finished it: the time traveler's alias, family ties in the lab, Amadeus and the beta world line. Spoilers ahead. (149) |

Series links:

- `akihabara-the-phonewave-and-d-mails-steins-gate-quiz` links to [Steins;Gate quiz](/steins-gate-quiz); [Steins;Gate Hard Mode: John Titor and Amadeus](/q/john-titor-amadeus-and-the-beta-timeline-steins-gate-hard-quiz)
- `john-titor-amadeus-and-the-beta-timeline-steins-gate-hard-quiz` links to [Steins;Gate quiz](/steins-gate-quiz); [Steins;Gate Basics: Akihabara and D-Mails](/q/akihabara-the-phonewave-and-d-mails-steins-gate-quiz)

### P05 · Tokyo Ghoul · Tokyo Ghoul quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Tokyo Ghoul quiz](/tokyo-ghoul-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `anteiku-kaneki-and-young-jump-tokyo-ghoul-quiz` | Tokyo Ghoul Quiz: Anteiku, Kaneki and Young Jump | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `pen-names-secret-titles-and-last-stands-tokyo-ghoul-hard-quiz` | Tokyo Ghoul Hard Quiz: Pen Names, Secret Titles and Last Stands | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `anteiku-kaneki-and-young-jump-tokyo-ghoul-quiz` | Tokyo Ghoul Basics: Anteiku and Young Jump (54) | Tokyo Ghoul basics: Anteiku and Young Jump | An easy start on Tokyo Ghoul: the magazine that ran the manga, the coffee shop Anteiku that takes Kaneki in and the actor from the live action film. (148) |
| `pen-names-secret-titles-and-last-stands-tokyo-ghoul-hard-quiz` | Tokyo Ghoul Hard Mode: Root A and Secret Titles (59) | Tokyo Ghoul hard mode: Root A and secret titles | A hard Tokyo Ghoul quiz for fans who read to the end: the anime season that leaves the manga, Kaneki's later identity and the secret titles. Spoilers. (150) |

Series links:

- `anteiku-kaneki-and-young-jump-tokyo-ghoul-quiz` links to [Tokyo Ghoul quiz](/tokyo-ghoul-quiz); [Tokyo Ghoul Hard Mode: Root A and Secret Titles](/q/pen-names-secret-titles-and-last-stands-tokyo-ghoul-hard-quiz)
- `pen-names-secret-titles-and-last-stands-tokyo-ghoul-hard-quiz` links to [Tokyo Ghoul quiz](/tokyo-ghoul-quiz); [Tokyo Ghoul Basics: Anteiku and Young Jump](/q/anteiku-kaneki-and-young-jump-tokyo-ghoul-quiz)

### P06 · Re:Zero · Re:Zero quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Re:Zero quiz](/re-zero-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `naro-roots-white-fox-and-four-seasons-re-zero-quiz` | Re:Zero Quiz: Naro Roots, White Fox and Four Seasons of Return by Death | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `witches-of-sin-cult-leaders-and-the-cost-of-return-by-death-re-zero-hard-quiz` | Re:Zero Hard Quiz: Witches of Sin, Cult Leaders and the Cost of Return by Death | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `naro-roots-white-fox-and-four-seasons-re-zero-quiz` | Re:Zero Basics: Narō Roots and White Fox (52) | Re:Zero basics: the Narō roots and White Fox | An easy start on Re:Zero: the author Tappei Nagatsuki, the web novel site where it began, the first light novel publisher and the anime studio White Fox. (153) |
| `witches-of-sin-cult-leaders-and-the-cost-of-return-by-death-re-zero-hard-quiz` | Re:Zero Hard Mode: Witches of Sin and the Cult (58) | Re:Zero hard mode: the Witches of Sin and the cult | A hard Re:Zero quiz for fans deep in the story: Roswaal's long life, the Witches of Sin, the Witch Cult leaders and Puck's true nature. Spoilers ahead. (151) |

Series links:

- `naro-roots-white-fox-and-four-seasons-re-zero-quiz` links to [Re:Zero quiz](/re-zero-quiz); [Re:Zero Hard Mode: Witches of Sin and the Cult](/q/witches-of-sin-cult-leaders-and-the-cost-of-return-by-death-re-zero-hard-quiz)
- `witches-of-sin-cult-leaders-and-the-cost-of-return-by-death-re-zero-hard-quiz` links to [Re:Zero quiz](/re-zero-quiz); [Re:Zero Basics: Narō Roots and White Fox](/q/naro-roots-white-fox-and-four-seasons-re-zero-quiz)

### P07 · That Time I Got Reincarnated as a Slime · That Time I Got Reincarnated as a Slime quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [That Time I Got Reincarnated as a Slime quiz](/that-time-i-got-reincarnated-as-a-slime-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `fuse-eight-bit-and-300-years-of-sealing-reincarnated-as-a-slime-quiz` | Reincarnated as a Slime Quiz: Fuse, Eight Bit and a Dragon Sealed for 300 Years | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `demon-lords-megiddo-and-the-true-hero-reincarnated-as-a-slime-hard-quiz` | Reincarnated as a Slime Hard Quiz: Demon Lords, Megiddo and the True Hero | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `fuse-eight-bit-and-300-years-of-sealing-reincarnated-as-a-slime-quiz` | Reincarnated as a Slime Basics: Fuse, Eight Bit (59) | Reincarnated as a Slime basics: Fuse and Eight Bit | An easy start on That Time I Got Reincarnated as a Slime: the author Fuse, the web novel site, the GC Novels publisher, the studio Eight Bit and Veldora. (153) |
| `demon-lords-megiddo-and-the-true-hero-reincarnated-as-a-slime-hard-quiz` | Reincarnated as a Slime Hard Mode: Demon Lords (58) | Reincarnated as a Slime hard mode: the Demon Lords | A hard Slime quiz on the later story: Hinata's attack, the spell Megiddo, the demon Diablo and the Demon Lords. For fans past the first season. (143) |

Series links:

- `fuse-eight-bit-and-300-years-of-sealing-reincarnated-as-a-slime-quiz` links to [That Time I Got Reincarnated as a Slime quiz](/that-time-i-got-reincarnated-as-a-slime-quiz); [Reincarnated as a Slime Hard Mode: Demon Lords](/q/demon-lords-megiddo-and-the-true-hero-reincarnated-as-a-slime-hard-quiz)
- `demon-lords-megiddo-and-the-true-hero-reincarnated-as-a-slime-hard-quiz` links to [That Time I Got Reincarnated as a Slime quiz](/that-time-i-got-reincarnated-as-a-slime-quiz); [Reincarnated as a Slime Basics: Fuse, Eight Bit](/q/fuse-eight-bit-and-300-years-of-sealing-reincarnated-as-a-slime-quiz)

### P08 · Black Clover · Black Clover quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Black Clover quiz](/black-clover-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `jump-magazines-studio-pierrot-and-tabatas-habits-black-clover-quiz` | Black Clover Quiz: Jump Magazines, Studio Pierrot and Tabata's Habits | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `elves-devils-and-the-secrets-of-the-wizard-kings-black-clover-hard-quiz` | Black Clover Hard Quiz: Elves, Devils and the Secrets of the Wizard Kings | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `jump-magazines-studio-pierrot-and-tabatas-habits-black-clover-quiz` | Black Clover Basics: Tabata, Jump and Pierrot (57) | Black Clover basics: Tabata, Jump and Pierrot | An easy start on Black Clover: the creator Yūki Tabata, the Jump magazines that ran it, the studio Pierrot and a few habits of the author. (138) |
| `elves-devils-and-the-secrets-of-the-wizard-kings-black-clover-hard-quiz` | Black Clover Hard Mode: Elves, Devils, Kings (56) | Black Clover hard mode: elves, devils and Wizard Kings | A hard Black Clover quiz for readers of the later arcs: the elf behind the Golden Dawn captain, Yuno's grimoire, the devil Zagred and the Wizard Kings. (151) |

Series links:

- `jump-magazines-studio-pierrot-and-tabatas-habits-black-clover-quiz` links to [Black Clover quiz](/black-clover-quiz); [Black Clover Hard Mode: Elves, Devils, Kings](/q/elves-devils-and-the-secrets-of-the-wizard-kings-black-clover-hard-quiz)
- `elves-devils-and-the-secrets-of-the-wizard-kings-black-clover-hard-quiz` links to [Black Clover quiz](/black-clover-quiz); [Black Clover Basics: Tabata, Jump and Pierrot](/q/jump-magazines-studio-pierrot-and-tabatas-habits-black-clover-quiz)

### P09 · Tokyo Revengers · Tokyo Revengers quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Tokyo Revengers quiz](/tokyo-revengers-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `ken-wakui-liden-films-and-a-twelve-year-leap-tokyo-revengers-quiz` | Tokyo Revengers Quiz: Ken Wakui, Liden Films and a Twelve Year Leap | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `bonten-bloody-halloween-and-the-final-rewrite-tokyo-revengers-hard-quiz` | Tokyo Revengers Hard Quiz: Bonten, Bloody Halloween and the Final Rewrite | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `ken-wakui-liden-films-and-a-twelve-year-leap-tokyo-revengers-quiz` | Tokyo Revengers Basics: Ken Wakui, Liden Films (58) | Tokyo Revengers basics: Ken Wakui and Liden Films | An easy start on Tokyo Revengers: the creator Ken Wakui, the magazine that ran it, how many volumes it filled, the studio Liden Films and the time leap. (152) |
| `bonten-bloody-halloween-and-the-final-rewrite-tokyo-revengers-hard-quiz` | Tokyo Revengers Hard Mode: Bonten and Valhalla (58) | Tokyo Revengers hard mode: Bonten and Valhalla | A hard Tokyo Revengers quiz for fans who finished it: Bloody Halloween, Baji and Valhalla, Kisaki's motive, Bonten and the final rewrite. Spoilers ahead. (153) |

Series links:

- `ken-wakui-liden-films-and-a-twelve-year-leap-tokyo-revengers-quiz` links to [Tokyo Revengers quiz](/tokyo-revengers-quiz); [Tokyo Revengers Hard Mode: Bonten and Valhalla](/q/bonten-bloody-halloween-and-the-final-rewrite-tokyo-revengers-hard-quiz)
- `bonten-bloody-halloween-and-the-final-rewrite-tokyo-revengers-hard-quiz` links to [Tokyo Revengers quiz](/tokyo-revengers-quiz); [Tokyo Revengers Basics: Ken Wakui, Liden Films](/q/ken-wakui-liden-films-and-a-twelve-year-leap-tokyo-revengers-quiz)

### P10 · Fairy Tail · Fairy Tail quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Fairy Tail quiz](/fairy-tail-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `mashimas-guild-tv-tokyo-and-328-episodes-fairy-tail-quiz` | Fairy Tail Quiz: Mashima's Guild, TV Tokyo and 328 Episodes | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `black-wizards-dragon-kings-and-the-final-war-fairy-tail-hard-quiz` | Fairy Tail Hard Quiz: Black Wizards, Dragon Kings and the Final War | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `mashimas-guild-tv-tokyo-and-328-episodes-fairy-tail-quiz` | Fairy Tail Basics: Mashima, TV Tokyo, the Guild (59) | Fairy Tail basics: Mashima, TV Tokyo and the guild | An easy start on Fairy Tail: the magazine that ran the manga, how many volumes it filled, the first TV Tokyo episode and the guild at the heart of it. (150) |
| `black-wizards-dragon-kings-and-the-final-war-fairy-tail-hard-quiz` | Fairy Tail Hard Mode: Black Wizards, Final War (58) | Fairy Tail hard mode: black wizards and the final war | A hard Fairy Tail quiz on the later arcs: Natsu's hidden identity, the black wizard Zeref, the Fairy Sphere and the final war. Spoilers for the whole story. (156) |

Series links:

- `mashimas-guild-tv-tokyo-and-328-episodes-fairy-tail-quiz` links to [Fairy Tail quiz](/fairy-tail-quiz); [Fairy Tail Hard Mode: Black Wizards, Final War](/q/black-wizards-dragon-kings-and-the-final-war-fairy-tail-hard-quiz)
- `black-wizards-dragon-kings-and-the-final-war-fairy-tail-hard-quiz` links to [Fairy Tail quiz](/fairy-tail-quiz); [Fairy Tail Basics: Mashima, TV Tokyo, the Guild](/q/mashimas-guild-tv-tokyo-and-328-episodes-fairy-tail-quiz)

### P11 · Fruits Basket · Fruits Basket quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Fruits Basket quiz](/fruits-basket-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `zodiac-curses-a-rice-ball-and-two-anime-fruits-basket-quiz` | Fruits Basket Quiz: Zodiac Curses, a Rice Ball and Two Anime | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `akito-s-secret-kazuma-s-boy-and-the-last-season-fruits-basket-hard-quiz` | Fruits Basket Hard Quiz: Akito's Secret, Kazuma's Boy and the Last Season | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `zodiac-curses-a-rice-ball-and-two-anime-fruits-basket-quiz` | Fruits Basket Basics: Zodiac Curse and Two Anime (60) | Fruits Basket basics: the zodiac curse and two anime | An easy start on Fruits Basket: the shojo magazine Hana to Yume, the creator Natsuki Takaya, the game behind the title and the two anime versions. (146) |
| `akito-s-secret-kazuma-s-boy-and-the-last-season-fruits-basket-hard-quiz` | Fruits Basket Hard Mode: The Sohma Secrets (54) | Fruits Basket hard mode: the Sohma secrets | A hard Fruits Basket quiz for fans who finished it: Akito's secret, who among the zodiac knew, Kazuma's ties to Kyo and the last season. Spoilers ahead. (152) |

Series links:

- `zodiac-curses-a-rice-ball-and-two-anime-fruits-basket-quiz` links to [Fruits Basket quiz](/fruits-basket-quiz); [Fruits Basket Hard Mode: The Sohma Secrets](/q/akito-s-secret-kazuma-s-boy-and-the-last-season-fruits-basket-hard-quiz)
- `akito-s-secret-kazuma-s-boy-and-the-last-season-fruits-basket-hard-quiz` links to [Fruits Basket quiz](/fruits-basket-quiz); [Fruits Basket Basics: Zodiac Curse and Two Anime](/q/zodiac-curses-a-rice-ball-and-two-anime-fruits-basket-quiz)

### P12 · Bocchi the Rock! · Bocchi the Rock! quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Bocchi the Rock! quiz](/bocchi-the-rock-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `zip-ties-shimokitazawa-and-twelve-weeks-of-distortion-bocchi-the-rock-quiz` | Bocchi the Rock! Quiz: Zip Ties, Shimokitazawa and Twelve Weeks of Distortion | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `gibsons-onikoroshi-and-sideros-bocchi-the-rock-hard-quiz` | Bocchi the Rock! Hard Quiz: Gibsons, Onikoroshi and the Bands of Folt | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `zip-ties-shimokitazawa-and-twelve-weeks-of-distortion-bocchi-the-rock-quiz` | Bocchi the Rock! Basics: CloverWorks and Kirara (59) | Bocchi the Rock! basics: CloverWorks and Kirara | An easy start on Bocchi the Rock!: the studio CloverWorks, the Manga Time Kirara Max magazine, the 2022 TV run and Shimokitazawa where the band plays. (150) |
| `gibsons-onikoroshi-and-sideros-bocchi-the-rock-hard-quiz` | Bocchi the Rock! Hard Mode: Gear and Folt Bands (59) | Bocchi the Rock! hard mode: gear and the Folt bands | A hard Bocchi the Rock! quiz on the details: Hitori's second guitar, the name of Kikuri's bass, her favorite sake and the bands that play at Folt. (146) |

Series links:

- `zip-ties-shimokitazawa-and-twelve-weeks-of-distortion-bocchi-the-rock-quiz` links to [Bocchi the Rock! quiz](/bocchi-the-rock-quiz); [Bocchi the Rock! Hard Mode: Gear and Folt Bands](/q/gibsons-onikoroshi-and-sideros-bocchi-the-rock-hard-quiz)
- `gibsons-onikoroshi-and-sideros-bocchi-the-rock-hard-quiz` links to [Bocchi the Rock! quiz](/bocchi-the-rock-quiz); [Bocchi the Rock! Basics: CloverWorks and Kirara](/q/zip-ties-shimokitazawa-and-twelve-weeks-of-distortion-bocchi-the-rock-quiz)

### P13 · Detective Conan · Detective Conan quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Detective Conan quiz](/detective-conan-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `a-shrunken-sleuth-two-names-and-a-town-detective-conan-quiz` | Detective Conan Quiz: A Shrunken Sleuth, Two Titles and a Town Named After Him | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `codenames-cover-identities-and-a-missing-brother-detective-conan-hard-quiz` | Detective Conan Hard Quiz: Codenames, Cover Identities and a Missing Brother | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `a-shrunken-sleuth-two-names-and-a-town-detective-conan-quiz` | Detective Conan Basics: Aoyama, Sunday, Themes (58) | Detective Conan basics: Aoyama, Sunday and the themes | An easy start on Detective Conan: the creator Gosho Aoyama, the 1994 start in Weekly Shōnen Sunday, the two titles and the singer of many theme songs. (150) |
| `codenames-cover-identities-and-a-missing-brother-detective-conan-hard-quiz` | Detective Conan Hard Mode: Codenames, Disguises (59) | Detective Conan hard mode: codenames and disguises | A hard Detective Conan quiz on the Black Organization arc: who hides behind which disguise, the codenames, the agents' real jobs and a missing brother. (151) |

Series links:

- `a-shrunken-sleuth-two-names-and-a-town-detective-conan-quiz` links to [Detective Conan quiz](/detective-conan-quiz); [Detective Conan Hard Mode: Codenames, Disguises](/q/codenames-cover-identities-and-a-missing-brother-detective-conan-hard-quiz)
- `codenames-cover-identities-and-a-missing-brother-detective-conan-hard-quiz` links to [Detective Conan quiz](/detective-conan-quiz); [Detective Conan Basics: Aoyama, Sunday, Themes](/q/a-shrunken-sleuth-two-names-and-a-town-detective-conan-quiz)

### P14 · Gintama · Gintama quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Gintama quiz](/gintama-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `silver-souls-aliens-in-edo-and-201-first-episodes-gintama-quiz` | Gintama Quiz: Silver Souls, Aliens in Edo and 201 First Episodes | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `tenshouin-naraku-a-teacher-s-name-and-a-borrowed-arm-gintama-hard-quiz` | Gintama Hard Quiz: Tenshouin Naraku, a Teacher's Name and a Borrowed Arm | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `silver-souls-aliens-in-edo-and-201-first-episodes-gintama-quiz` | Gintama Basics: Silver Soul, Amanto and Jump (56) | Gintama basics: Silver Soul, the Amanto and Jump | An easy start on Gintama: what the title means, the magazine where the manga began, the Amanto who took over Edo and the long first TV run. (139) |
| `tenshouin-naraku-a-teacher-s-name-and-a-borrowed-arm-gintama-hard-quiz` | Gintama Hard Mode: Naraku and Shoyo's Students (58) | Gintama hard mode: Naraku and Shoyo's students | A hard Gintama quiz for fans of the serious arcs: Utsuro and Tenshouin Naraku, the teacher Shoyo Yoshida, his three students and a borrowed arm. Spoilers. (154) |

Series links:

- `silver-souls-aliens-in-edo-and-201-first-episodes-gintama-quiz` links to [Gintama quiz](/gintama-quiz); [Gintama Hard Mode: Naraku and Shoyo's Students](/q/tenshouin-naraku-a-teacher-s-name-and-a-borrowed-arm-gintama-hard-quiz)
- `tenshouin-naraku-a-teacher-s-name-and-a-borrowed-arm-gintama-hard-quiz` links to [Gintama quiz](/gintama-quiz); [Gintama Basics: Silver Soul, Amanto and Jump](/q/silver-souls-aliens-in-edo-and-201-first-episodes-gintama-quiz)

### P15 · Violet Evergarden · Violet Evergarden quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Violet Evergarden quiz](/violet-evergarden-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `auto-memory-dolls-kyoto-animation-and-evan-call-violet-evergarden-quiz` | Violet Evergarden Quiz: Auto Memory Dolls, Kyoto Animation and Evan Call | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `gilberts-brooch-clara-s-letters-and-an-island-violet-evergarden-hard-quiz` | Violet Evergarden Hard Quiz: Gilbert's Brooch, Clara's Letters and an Island | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `auto-memory-dolls-kyoto-animation-and-evan-call-violet-evergarden-quiz` | Violet Evergarden Basics: KyoAni and Evan Call (58) | Violet Evergarden basics: Kyoto Animation and Evan Call | An easy start on Violet Evergarden: the novelist Kana Akatsuki, Kyoto Animation as studio and publisher, the composer Evan Call and the Auto Memory Dolls. (154) |
| `gilberts-brooch-clara-s-letters-and-an-island-violet-evergarden-hard-quiz` | Violet Evergarden Hard Mode: Films and Letters (58) | Violet Evergarden hard mode: the films and the letters | A hard Violet Evergarden quiz on the films and side stories: the movie premiere date, the boarding school story, Clara's letters and the island ending. (151) |

Series links:

- `auto-memory-dolls-kyoto-animation-and-evan-call-violet-evergarden-quiz` links to [Violet Evergarden quiz](/violet-evergarden-quiz); [Violet Evergarden Hard Mode: Films and Letters](/q/gilberts-brooch-clara-s-letters-and-an-island-violet-evergarden-hard-quiz)
- `gilberts-brooch-clara-s-letters-and-an-island-violet-evergarden-hard-quiz` links to [Violet Evergarden quiz](/violet-evergarden-quiz); [Violet Evergarden Basics: KyoAni and Evan Call](/q/auto-memory-dolls-kyoto-animation-and-evan-call-violet-evergarden-quiz)

### P16 · Slam Dunk · Slam Dunk quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Slam Dunk quiz](/slam-dunk-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `fifty-rejections-a-gorilla-captain-and-a-national-dream-slam-dunk-quiz` | Slam Dunk Quiz: Fifty Rejections, a Gorilla Captain and a National Dream | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `sannoh-a-red-monkey-and-500-threes-a-day-slam-dunk-hard-quiz` | Slam Dunk Hard Quiz: Sannoh, a Red Monkey and 500 Threes a Day | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `fifty-rejections-a-gorilla-captain-and-a-national-dream-slam-dunk-quiz` | Slam Dunk Basics: Sakuragi, Gori and Shohoku (56) | Slam Dunk basics: Sakuragi, Gori and Shohoku | An easy start on Slam Dunk: why Sakuragi joins the team, the gang he leads, his nickname for the Shohoku captain and the dream of the nationals. (144) |
| `sannoh-a-red-monkey-and-500-threes-a-day-slam-dunk-hard-quiz` | Slam Dunk Hard Mode: Sannoh and the Nationals (57) | Slam Dunk hard mode: Sannoh and the nationals | A hard Slam Dunk quiz on the Sannoh game: the captain and point guard, the top all round player, the star center and the training behind the threes. (148) |

Series links:

- `fifty-rejections-a-gorilla-captain-and-a-national-dream-slam-dunk-quiz` links to [Slam Dunk quiz](/slam-dunk-quiz); [Slam Dunk Hard Mode: Sannoh and the Nationals](/q/sannoh-a-red-monkey-and-500-threes-a-day-slam-dunk-hard-quiz)
- `sannoh-a-red-monkey-and-500-threes-a-day-slam-dunk-hard-quiz` links to [Slam Dunk quiz](/slam-dunk-quiz); [Slam Dunk Basics: Sakuragi, Gori and Shohoku](/q/fifty-rejections-a-gorilla-captain-and-a-national-dream-slam-dunk-quiz)

### P17 · Sakamoto Days · Sakamoto Days quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Sakamoto Days quiz](/sakamoto-days-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `a-retired-hitman-a-convenience-store-and-one-rule-sakamoto-days-quiz` | Sakamoto Days Quiz: a Retired Hitman, a Convenience Store and One Rule | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `the-jaa-a-reindeer-mask-and-a-final-battle-sakamoto-days-hard-quiz` | Sakamoto Days Hard Quiz: the JAA, a Reindeer Mask and a Final Battle | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `a-retired-hitman-a-convenience-store-and-one-rule-sakamoto-days-quiz` | Sakamoto Days Basics: Hitman, Store, One Rule (57) | Sakamoto Days basics: a hitman, a store and one rule | An easy start on Sakamoto Days: the one-shot it grew from, the convenience store the retired hitman runs and the one rule his wife set for him. (143) |
| `the-jaa-a-reindeer-mask-and-a-final-battle-sakamoto-days-hard-quiz` | Sakamoto Days Hard Mode: The JAA and Slur (53) | Sakamoto Days hard mode: the JAA and Slur | A hard Sakamoto Days quiz: when serialization began, the length of the first anime season, the killer known as X and Slur and the assassin association. (151) |

Series links:

- `a-retired-hitman-a-convenience-store-and-one-rule-sakamoto-days-quiz` links to [Sakamoto Days quiz](/sakamoto-days-quiz); [Sakamoto Days Hard Mode: The JAA and Slur](/q/the-jaa-a-reindeer-mask-and-a-final-battle-sakamoto-days-hard-quiz)
- `the-jaa-a-reindeer-mask-and-a-final-battle-sakamoto-days-hard-quiz` links to [Sakamoto Days quiz](/sakamoto-days-quiz); [Sakamoto Days Basics: Hitman, Store, One Rule](/q/a-retired-hitman-a-convenience-store-and-one-rule-sakamoto-days-quiz)

### P18 · Kaguya-sama: Love Is War · Kaguya-sama: Love Is War quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Kaguya-sama: Love Is War quiz](/kaguya-sama-love-is-war-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `shuchiin-academy-cockroaches-and-a-bamboo-princess-kaguya-sama-quiz` | Kaguya-sama: Love Is War Quiz: Shuchiin Academy, Cockroaches and a Bamboo Princess | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `the-shinomiya-clan-a-bamboo-emperor-and-a-last-film-kaguya-sama-hard-quiz` | Kaguya-sama Hard Quiz: the Shinomiya Clan, a Bamboo Emperor and a Last Film | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `shuchiin-academy-cockroaches-and-a-bamboo-princess-kaguya-sama-quiz` | Kaguya-sama Basics: Shuchiin and the Bamboo Tale (60) | Kaguya-sama: Love Is War basics: Shuchiin and the bamboo tale | An easy start on Kaguya-sama: Love Is War: the old tale behind the names, the magazines that ran the manga, Shuchiin Academy and Miyuki's fear of insects. (154) |
| `the-shinomiya-clan-a-bamboo-emperor-and-a-last-film-kaguya-sama-hard-quiz` | Kaguya-sama Hard Mode: Shinomiya and Shijo Clans (60) | Kaguya-sama: Love Is War hard mode: the Shinomiya and Shijo clans | A hard Kaguya-sama quiz on the later story: the Shijo family and its twins, the emperor from the bamboo tale and the final film. For fans who read to the end. (158) |

Series links:

- `shuchiin-academy-cockroaches-and-a-bamboo-princess-kaguya-sama-quiz` links to [Kaguya-sama: Love Is War quiz](/kaguya-sama-love-is-war-quiz); [Kaguya-sama Hard Mode: Shinomiya and Shijo Clans](/q/the-shinomiya-clan-a-bamboo-emperor-and-a-last-film-kaguya-sama-hard-quiz)
- `the-shinomiya-clan-a-bamboo-emperor-and-a-last-film-kaguya-sama-hard-quiz` links to [Kaguya-sama: Love Is War quiz](/kaguya-sama-love-is-war-quiz); [Kaguya-sama Basics: Shuchiin and the Bamboo Tale](/q/shuchiin-academy-cockroaches-and-a-bamboo-princess-kaguya-sama-quiz)

### P19 · Dr. Stone · Dr. Stone quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Dr. Stone quiz](/dr-stone-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `petrified-for-3700-years-a-kingdom-of-science-dr-stone-quiz` | Dr. Stone Quiz: Petrified for 3,700 Years, Rebuilt with Science | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `platinum-a-second-wave-and-a-rocket-to-the-moon-dr-stone-hard-quiz` | Dr. Stone Hard Quiz: Platinum, a Second Wave and a Rocket to the Moon | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `petrified-for-3700-years-a-kingdom-of-science-dr-stone-quiz` | Dr. Stone Basics: Boichi and the Stone World (56) | Dr. Stone basics: Boichi and the stone world | An easy start on Dr. Stone: the artist Boichi and writer Riichiro Inagaki, how long humanity stays petrified and the lion skin of Tsukasa. (138) |
| `platinum-a-second-wave-and-a-rocket-to-the-moon-dr-stone-hard-quiz` | Dr. Stone Hard Mode: Platinum and the Moon (54) | Dr. Stone hard mode: platinum and the moon | A hard Dr. Stone quiz on the later arcs: Byakuya's platinum, who stays awake after the second wave, Dr. Xeno's colony and the rocket to the moon. Spoilers. (155) |

Series links:

- `petrified-for-3700-years-a-kingdom-of-science-dr-stone-quiz` links to [Dr. Stone quiz](/dr-stone-quiz); [Dr. Stone Hard Mode: Platinum and the Moon](/q/platinum-a-second-wave-and-a-rocket-to-the-moon-dr-stone-hard-quiz)
- `platinum-a-second-wave-and-a-rocket-to-the-moon-dr-stone-hard-quiz` links to [Dr. Stone quiz](/dr-stone-quiz); [Dr. Stone Basics: Boichi and the Stone World](/q/petrified-for-3700-years-a-kingdom-of-science-dr-stone-quiz)

### P20 · Inuyasha · Inuyasha quiz and hard quiz (both compete for the series quiz query)

Retitle (no shared questions; same intent, so the pages compete for the same query).
Hub link: [Inuyasha quiz](/inuyasha-quiz).

| Slug | Creator's title (kept as subtitle) | Creator | Account | Plays | Q | Created |
|---|---|---|---|---|---|---|
| `a-well-a-jewel-and-a-half-demon-inuyasha-quiz` | Inuyasha Quiz: a Well, a Shattered Jewel and a Half-Demon | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |
| `eighth-detachments-a-last-wish-and-the-final-act-inuyasha-hard-quiz` | Inuyasha Hard Quiz: Eighth Detachments, a Last Wish and the Final Act | otakuquiz_team | Team | 0 | 10 | 2026-10-25 |

| Slug | Proposed SEO title (chars with suffix) | H1 | Meta description (chars) |
|---|---|---|---|
| `a-well-a-jewel-and-a-half-demon-inuyasha-quiz` | Inuyasha Basics: The Well and the Shikon Jewel (58) | Inuyasha basics: the well and the Shikon Jewel | An easy start on Inuyasha: the Bone Eater's Well, Inuyasha's parents, the Shikon Jewel that shatters and the Sengoku period where the story takes place. (152) |
| `eighth-detachments-a-last-wish-and-the-final-act-inuyasha-hard-quiz` | Inuyasha Hard Mode: Naraku's Detachments (52) | Inuyasha hard mode: Naraku's detachments | A hard Inuyasha quiz on Naraku and The Final Act: which detachment is which, the Band of Seven and its leader and the last wish on the jewel. (141) |

Series links:

- `a-well-a-jewel-and-a-half-demon-inuyasha-quiz` links to [Inuyasha quiz](/inuyasha-quiz); [Inuyasha Hard Mode: Naraku's Detachments](/q/eighth-detachments-a-last-wish-and-the-final-act-inuyasha-hard-quiz)
- `eighth-detachments-a-last-wish-and-the-final-act-inuyasha-hard-quiz` links to [Inuyasha quiz](/inuyasha-quiz); [Inuyasha Basics: The Well and the Shikon Jewel](/q/a-well-a-jewel-and-a-half-demon-inuyasha-quiz)

## otakuquiz.org: titles that omit the series name

Not clusters. These titles read the same across series in results ("Who Is Who?", "True or False") because the series name is missing. Title-only suggestions, 48 characters or fewer before " | OtakuQuiz". Skip any the page template already prefixes with the series name.

| Slug | Series | Creator's title | Suggested SEO title (chars) |
|---|---|---|---|
| `survey-corps-and-cadets-name-the-character` | Attack on Titan | Survey Corps and Cadets: Name the Character | Attack on Titan Characters: Survey Corps Clues (46) |
| `faces-of-konoha-who-is-this-ninja` | Naruto | Faces of Konoha: Who Is This Ninja? | Naruto Characters: Who Is This Ninja? (37) |
| `tokyo-jujutsu-high-roll-call` | Jujutsu Kaisen | Tokyo Jujutsu High Roll Call | Jujutsu Kaisen Characters: Tokyo Jujutsu High (45) |
| `u-a-class-1-a-roll-call-who-is-this-hero` | My Hero Academia | U.A. Class 1-A Roll Call: Who Is This Hero? | My Hero Academia: Who Is This Class 1-A Hero? (45) |
| `elf-time-check-frieren-true-or-false` | Frieren: Beyond Journey's End | Elf Time Check: True or False | Frieren True or False: Elf Time Check (37) |
| `hunters-and-knights-who-is-who` | Solo Leveling | Hunters and Knights: Who Is Who | Solo Leveling Who Is Who: Hunters and Knights (45) |
| `joestars-and-their-rivals-who-is-this` | JoJo's Bizarre Adventure | Joestars and Their Rivals: Who Is This? | JoJo Characters: Joestars and Their Rivals (42) |
| `the-hunter-exam-roll-call-who-is-this` | Hunter × Hunter | The Hunter Exam Roll Call: Who Is This? | Hunter × Hunter Characters: The Hunter Exam (43) |
| `ora-or-muda-jojo-true-or-false` | JoJo's Bizarre Adventure | Ora or Muda: True or False | JoJo True or False: Ora or Muda (31) |
| `the-old-hero-party-and-after-who-is-this` | Frieren: Beyond Journey's End | The Old Hero Party and After: Who Is This? | Frieren Characters: The Hero Party and After (44) |
| `arise-from-the-shadow-and-the-road-ahead` | Solo Leveling | Arise from the Shadow and the Road Ahead | Solo Leveling Story Arcs: Arise and Beyond (42) |
| `behind-the-madhouse-curtain-screens-songs-and-films` | Hunter × Hunter | Behind the Madhouse Curtain: Screens, Songs and Films | Hunter × Hunter on Screen: Madhouse and Songs (45) |
| `nen-detector-hunter-x-hunter-true-or-false` | Hunter × Hunter | Nen Detector: True or False | Hunter × Hunter True or False: Nen Detector (43) |
| `special-division-4-who-is-this` | Chainsaw Man | Special Division 4: Who Is This? | Chainsaw Man Characters: Special Division 4 (43) |
| `gate-check-solo-leveling-true-or-false` | Solo Leveling | Gate Check: True or False | Solo Leveling True or False: Gate Check (39) |
| `devil-hunter-licence-check-chainsaw-man-true-or-false` | Chainsaw Man | Devil Hunter Licence Check: True or False | Chainsaw Man True or False: Devil Hunter Check (46) |
| `karakura-roll-call-who-is-this` | Bleach | Karakura Roll Call: Who Is This? | Bleach Characters: Karakura Roll Call (37) |
| `zanpakuto-check-bleach-true-or-false` | Bleach | Zanpakutō Check: True or False | Bleach True or False: Zanpakutō Check (37) |
| `behind-the-gate-staff-songs-and-idol-guests` | Solo Leveling | Behind the Gate: Staff, Songs and Idol Guests | Solo Leveling on Screen: Staff, Songs, Guests (45) |
| `steel-and-sums-fma-true-or-false` | Fullmetal Alchemist | Steel and Sums: True or False | Fullmetal Alchemist True or False: Steel, Sums (46) |
| `floor-by-floor-the-anime-arcs-so-far` | Tower of God | Floor by Floor: The Anime Arcs So Far | Tower of God Anime Arcs: Floor by Floor (39) |
| `egos-on-the-pitch-who-is-who` | Blue Lock | Egos on the Pitch: Who Is Who? | Blue Lock Who Is Who: Egos on the Pitch (39) |
| `two-anime-one-story-fma-adaptations` | Fullmetal Alchemist | Two Anime, One Story: Which Adaptation? | Fullmetal Alchemist: 2003 Anime or Brotherhood? (47) |
| `stage-names-meet-the-cast-of-the-idol-story` | Oshi no Ko | Stage Names: Meet the Cast of the Idol Story | Oshi no Ko Who Is Who: Stage Names and Cast (43) |
| `three-seasons-in-the-spotlight-the-timeline` | Oshi no Ko | Three Seasons in the Spotlight: The Timeline | Oshi no Ko Timeline: Three Seasons in Order (43) |
| `studios-singers-and-strings-the-tower-on-screen` | Tower of God | Studios, Singers and Strings: The Tower on Screen | Tower of God on Screen: Studios and Singers (43) |
| `crows-on-court-who-plays-where` | Haikyu!! | Crows on Court: Who Plays Where? | Haikyu!! Positions: Who Plays Where? (36) |
| `faces-at-the-foot-of-the-tower-early-cast` | Tower of God | Faces at the Foot of the Tower | Tower of God Early Cast: Faces at the Foot (42) |
| `first-floor-basics-welcome-to-tower-of-god` | Tower of God | First Floor Basics: Welcome to the Tower | Tower of God Basics: Welcome to the Tower (41) |
| `brothers-mentors-and-soldiers-who-is-this` | Fullmetal Alchemist | Brothers, Mentors and Soldiers: Who Is This? | Fullmetal Alchemist Characters: Who Is This? (44) |
| `bones-batons-and-battle-themes-fma-production` | Fullmetal Alchemist | Bones, Batons and Battle Themes | Fullmetal Alchemist Production: Bones, Music (44) |
| `psychics-yokai-and-aliens-who-is-who` | Dandadan | Psychics, Yōkai and Aliens: Who Is Who? | Dandadan Who Is Who: Psychics, Yōkai, Aliens (44) |
| `consorts-officials-and-servants-apothecary-diaries-who-is-who` | The Apothecary Diaries | Consorts, Officials and Servants: Who Is Who? | Apothecary Diaries Who Is Who: The Rear Palace (46) |
| `pilots-nerv-and-family-evangelion-who-is-who` | Neon Genesis Evangelion | Pilots, Nerv and Family: Who Is Who? | Evangelion Who Is Who: Pilots, NERV and Family (46) |
| `bounties-and-bad-blood-cowboy-bebop-who-is-who` | Cowboy Bebop | Bounties and Bad Blood: Who Is Who? | Cowboy Bebop Who Is Who: Bounties and Bad Blood (47) |
| `guardians-cats-and-rivals-sailor-moon-who-is-who` | Sailor Moon | Guardians, Cats and Rivals: Who Is Who? | Sailor Moon Who Is Who: Guardians, Cats, Rivals (47) |
| `defense-force-roll-call-kaiju-no-8-who-is-who` | Kaiju No. 8 | Defense Force Roll Call: Who Is Who? | Kaiju No. 8 Who Is Who: Defense Force Roll Call (47) |
| `class-rank-and-rivalry-one-punch-man-who-is-who` | One-Punch Man | Class, Rank and Rivalry: Who Is Who? | One-Punch Man Who Is Who: Class, Rank, Rivalry (46) |
| `real-or-made-up-love-war-facts-from-shuchiin-academy` | Kaguya-sama: Love Is War | Real or Made Up: Love War Facts from Shuchiin Academy | Kaguya-sama Real or Made Up: Shuchiin Facts (43) |
| `the-tower-by-the-numbers-floors-families-and-years` | Tower of God | The Tower by the Numbers: Years, Episodes and Floors | Tower of God by the Numbers: Years and Floors (45) |

## Candidate pairs from question overlap

Every pair with a shared share of 25% or more and at least 2 shared questions, and what happened to it.

| Site | Quiz A | Quiz B | Shared | Exact | Share of smaller quiz | Status |
|---|---|---|---|---|---|---|
| K-pop | `this-is-only-for-true-gllits` | `this-is-only-for-true-gllits-2` | 10/10 | 10 | 100% | in cluster K01 |
| K-pop | `gi-dle-self-produced-queens-quiz` | `gi-dle-members-and-facts` | 3/6 | 3 | 50% | in cluster K48 |
| K-pop | `stray-kids-members-deep-knowledge` | `how-well-do-you-know-skz-members` | 2/5 | 0 | 40% | in cluster K17 |
| K-pop | `nct-dream-quiz` | `nct-dream-hot-sauce-quiz` | 2/5 | 1 | 40% | in cluster K66 |
| K-pop | `seventeen-members-mega-quiz-all-13` | `seventeen-basics-for-carats` | 2/6 | 2 | 33% | in cluster K41 |
| K-pop | `bts-debut-era-how-well-do-you-remember` | `only-real-armys-can-pass-this-bts-debut-quiz` | 2/6 | 2 | 33% | in cluster K05 |
| K-pop | `bts-solo-careers-quiz` | `how-well-do-you-know-bts-members` | 2/6 | 0 | 33% | different intent: retitled apart in K03 and K07 |
| K-pop | `twice-discography-quiz` | `once-check-how-well-do-you-know-twice` | 2/6 | 2 | 33% | different intent: retitled apart in K25 and K27 |
| K-pop | `red-velvet-dual-concept-queens-quiz` | `red-velvet-members-quiz` | 2/6 | 2 | 33% | different intent (a few shared basics questions); no action |
| K-pop | `are-you-a-true-blink-blackpink-trivia` | `blackpink-members-quiz` | 2/6 | 1 | 33% | different intent: retitled apart in K11 and K15 |
| K-pop | `which-k-pop-group-debuted-first-timeline-challenge` | `k-pop-debut-years-challenge` | 2/6 | 0 | 33% | in cluster G04 |
| K-pop | `only-real-stays-can-ace-stray-kids-quiz` | `stray-kids-basics` | 2/6 | 1 | 33% | in cluster K21 |
| K-pop | `how-well-do-you-know-bts-members` | `bts-members-know-your-biases` | 2/6 | 2 | 33% | in cluster K03 |
| K-pop | `mamamoo-members-and-facts` | `mamamoo-hip-quiz` | 2/6 | 1 | 33% | different intent (a few shared basics questions); no action |
| K-pop | `ateez-basics-for-atinys` | `ateez-fireworks-quiz` | 2/6 | 1 | 33% | different intent (a few shared basics questions); one of them is retitled in K58 |
| K-pop | `itzy-members-quiz` | `itzy-dalla-dalla-quiz` | 2/6 | 1 | 33% | different intent (a few shared basics questions); one of them is retitled in K49 |
| K-pop | `k-pop-birthplace-quiz-where-are-they-from` | `k-pop-idol-nationalities` | 2/6 | 0 | 33% | in cluster G22 |
| K-pop | `newjeans-members-quiz` | `newjeans-quiz` | 2/6 | 2 | 33% | different intent: retitled apart in K33 and K35 |
| K-pop | `ive-members-quiz` | `ive-i-am-quiz` | 2/6 | 1 | 33% | different intent (a few shared basics questions); one of them is retitled in K44 |
| K-pop | `aespa-true-or-false-think-you-know-my-girls` | `aespa-true-or-false` | 2/7 | 2 | 29% | in cluster K28 |
| K-pop | `blackpink-members-quiz` | `blackpink-how-you-like-that-quiz` | 2/7 | 0 | 29% | different intent (a few shared basics questions); one of them is retitled in K11 |
| K-pop | `le-sserafim-members-and-music-quiz` | `le-sserafim-the-unforgiven-era` | 2/7 | 0 | 29% | different intent: retitled apart in K52 and K53 |
| K-pop | `blackpink-true-or-false` | `blackpink-true-or-false-1781311005` | 2/8 | 1 | 25% | in cluster K10 |
| Anime | `cloud-gouger-to-smelting-kagurabachi-odds-and-ends` | `swords-and-sorcerers-kagurabachi-odds-and-ends` | 5/9 | 5 | 56% | in cluster A13 |

## Notes and flags for the owner

- **Team vs player.** Team means an active row in `editorial_accounts`. On production that is kpophistory, soojinnie, joonified, pinkvelvet, caratland, skzrealm, njeansstan, twiceland and exoplanet99. The `kpopquizz` account (130 published quizzes) is not in that table, so it is shown as Player. On O1, almost every anime quiz is Team (otakuquiz_team and oq_creator_*); `o1_dual` and `o1_anime_new` are Player.
- **Group quizzes filed under General K-pop** (they compete with group hubs from the wrong hub; moving `group_id` is an owner write): `bts-true-or-false` to BTS, `blackpink-true-or-false-1781311005` to BLACKPINK, `nct-dream-quiz` to NCT DREAM, `mamamoo-members-and-facts` and `mamamoo-true-or-false` to MAMAMOO, `bigbang-vips-only-quiz` to BIGBANG, `girls-generation-the-legend-quiz` to Girls' Generation, `treasure-basics` to TREASURE, `kep1er-quiz` to Kep1er, `day6-quiz` to DAY6, `2ne1-legacy-quiz` to 2NE1, `fx-quiz-sms-unique-girl-group` to f(x), `iu-the-nations-little-sister` to IU, `psy-and-gangnam-style-era` to PSY. `super-junior-legacy-quiz` has no Super Junior row in `groups`. Also filed under the parent NCT row: `nct-dream-hot-sauce-quiz` (NCT DREAM) and `nct-127-basics` (NCT 127); `can-you-recognize-these-k-pop-idols-` (many groups) sits under ITZY.
- **Name styling.** Titles follow the `groups` table as asked: `Cortis`, `Lngshot` and `Young posse` are stored that way although the groups style themselves CORTIS, LNGSHOT and YOUNG POSSE. If the rows are corrected first, swap the spelling in the proposed titles. On O1 the rows use `Spy × Family` and `Hunter × Hunter`; people search with a plain x. `That Time I Got Reincarnated as a Slime` is shortened to `Reincarnated as a Slime` in titles to fit 48 characters (the H1 or meta keeps the full name where it fits).
- **Lyrics (owner rule: no lyrics on pages).** These quizzes quote song lines: `ateez-lyrics-quiz` parts 1 to 5, `guess-the-stray-kids-song-by-the-lyrics`, `exo-songs`, and one question in `p1harmony`. The retitles avoid the word lyrics where the format allows, but the content itself needs a decision (noindex, edit or keep).
- **Content seen while reading that may need moderation or a fact check** (outside the duplicate scope): `illit-quiz-are-you-a-real-gllit` asks about a member's health hiatus and hate allegations; the two `young-posse` quizzes use odd personal framing about real members; `k-pop-idols-who-act` says V appeared in the film D.P. before debuting (looks wrong); `blackpink-members-quiz` names a BLACKPINK leader (the group has no official leader); `blackpink-easy-quiz` is in Swedish, `quiz-skz` in Polish, `gerek-bir-cortis-fanisan` in Turkish and Azerbaijani, `babymon-fan-quiz-freya` in Indonesian and `solo-los-verdaderos-monstiez-pueden-responder-correctamente` in Spanish, so their proposals are in those languages.
- **OtakuQuiz fixtures.** The `fx-` quizzes in Death Note, Spy × Family and One Piece (mostly 3 questions, partly by `o1_dual` and `o1_anime_new`) repeat the intent of full 10-question quizzes in clusters A01 to A12. The site is not live, so unpublishing them before launch removes those clusters with no 301 needed. Retitles are given in case they stay.
- **OtakuQuiz fact reuse.** 45 quiz pairs share facts (`fact_ids`) on at least 80% of the smaller quiz, almost all inside one series (for example basics and true or false built from the same fact set). The question text differs, so this method does not count them as duplicates, but the pages teach the same facts; worth a rule in the generator.
- **Picture questions** were compared by image file name. A picture uploaded twice gets a new file name, so visual duplicates across uploads are not detected (no image hashing was done).
- **Titles with a hard quiz twin.** On OtakuQuiz the 20 easy quizzes titled "{Series} Quiz: ..." break the hub rule, and their "{Series} Hard Quiz: ..." twins compete for the same query; clusters P01 to P20 rename them to Basics and Hard Mode.

Files: this report and `dupes.json` (same folder) with every cluster, quiz, overlap, proposal, title, H1, description and series link in machine-readable form.
