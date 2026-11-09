# Award quiz drafts for the owner (lane titles, 2026-11-09)

Two import files, one draft each, in the paste format of the Team quiz import (a JSON array of drafts, validated by
`checkQuizPayload`; the test `apps/quiz/src/lib/events/award-drafts.test.ts` runs both files through it).

| File | Draft | Slug | Group | Difficulty |
|---|---|---|---|---|
| `mma2026-quiz-draft.json` | Melon Music Awards quiz: past Daesang winners and show facts | `mma-awards-quiz` | `general-kpop` | medium |
| `mama-awards-quiz-draft.json` | MAMA Awards quiz: past Daesang winners and show facts | `mama-awards-quiz` | `general-kpop` | medium |

Owner to do before importing: the `account` is the placeholder `kpophistory`. Replace it with the active Team account
that should own award quizzes (open question 1 of the report). Nothing else needs editing. The import files itself as a review
batch; approve, then schedule. MMA2026 is on 14 and 15 November, so approve it before 12 November. MAMA is on 20 and 21 November.

Rules kept: no fan-vote category, no prediction, no age, birth order or height, no lyrics, no image, no fandom ranking, no
nominee question (no official nominee list was readable in the sources below, only a Wikipedia count). Distractors are real
winners of other years or real services. Both slugs are evergreen (no year) so the same URL can be revised after the show.
All facts read on 2026-11-09. Past winners are Wikipedia (an allowed source) at a pinned revision; show facts come from the
official newsroom or the official Melon page. Wikipedia is the single source of each past winner: a second allowed source
(Circle Chart, Melon history page) was not reachable in this run, so treat the winners as one-source facts at review.

## MMA2026 draft, question by question

| Q | Answer | Source (read 2026-11-09) |
|---|---|---|
| 1 | Ditto, Song of the Year 2023 (NewJeans) | https://en.wikipedia.org/w/index.php?title=Melon_Music_Award_for_Song_of_the_Year&oldid=1383792585 |
| 2 | Armageddon, Album of the Year 2024 (aespa) | https://en.wikipedia.org/w/index.php?title=Melon_Music_Award_for_Album_of_the_Year&oldid=1383792579 |
| 3 | Gangnam Style, Song of the Year 2012 (Psy) | same revision as Q1 |
| 4 | BTS, most Artist of the Year wins (3: 2018 to 2020) | https://en.wikipedia.org/w/index.php?title=Melon_Music_Award_for_Artist_of_the_Year&oldid=1351629018 |
| 5 | Jennie, Record of the Year 2025 | https://en.wikipedia.org/w/index.php?title=Melon_Music_Awards&oldid=1383792591 (and the page of the 2025 awards, revision 1383181633, which says the same) |
| 6 | Gocheok Sky Dome, Seoul | https://newsroom.kakaoent.com/news/kakao-entertainment-to-host-mma2026-on-nov-14-15/ (also https://www.melon.com/mma/info.htm) |
| 7 | The 18th edition | Kakao Entertainment newsroom, same link |
| 8 | 6 pm (18:00) | https://www.melon.com/mma/info.htm (official Melon page lists 11.14 and 11.15 at 18:00) |
| 9 | LINE MUSIC (Global-K Chart with Tencent Music) | Kakao Entertainment newsroom, same link |
| 10 | IU, "Dear Name" in 2017 | Kakao Entertainment newsroom, same link |

Note on a claim left out on purpose: the newsroom says the two-day format is a first for the MMA. Wikipedia says the 2020 edition ran
four days online ("MMA Week"), so no question uses "first two-day ceremony".

## MAMA draft, question by question

| Q | Answer | Source (read 2026-11-09) |
|---|---|---|
| 1 | Seventeen, Artist of the Year 2024 | https://en.wikipedia.org/w/index.php?title=MAMA_Award_for_Artist_of_the_Year&oldid=1381566600 |
| 2 | BTS, Artist of the Year every year 2016 to 2022 | same revision |
| 3 | Love Dive, Song of the Year 2022 (IVE) | https://en.wikipedia.org/w/index.php?title=MAMA_Award_for_Song_of_the_Year&oldid=1380497554 |
| 4 | Proof, Album of the Year 2022 (BTS) | https://en.wikipedia.org/w/index.php?title=MAMA_Award_for_Album_of_the_Year&oldid=1367080494 |
| 5 | Karma, Album of the Year 2025 (Stray Kids); the other options are listed nominees | same revision as Q4 |
| 6 | Kyocera Dome Osaka, 20 and 21 November 2026 | https://newsroom.cj.net/2026-mama-awards-to-take-place-in-japan-from-november-20-21/ |
| 7 | 1999 (first launch) | CJ newsroom, same link |
| 8 | Mnet launched it | CJ newsroom, same link |
| 9 | 2024, first edition in the United States | CJ newsroom, same link |
| 10 | Mnet Plus streams the 2026 edition live worldwide | CJ newsroom, same link |

Left out on purpose: the date of the rename to "MAMA Awards" (CJ says 2009 from "Mnet Asian Music Awards", Wikipedia lists the 2008
event as "Mnet KM Music Festival"), and the 2025 edition city (not read in an official source).
