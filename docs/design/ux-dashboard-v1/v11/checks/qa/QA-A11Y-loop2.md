# QA accessibility results (C3)

Whole-document axe-core (serious + critical only), keyboard walk, sheets and game semantics on the shared flag-on build. Records: `results/qa-a11y.jsonl`, `results/qa-keyboard.jsonl` (last record per state kept). The number after an axe rule is its failing nodes, counted up to 8.

## axe, serious + critical

| Owner | State | Who | 1440 light | 1440 dark | 390 light | 390 dark |
|---|---|---|---|---|---|---|
| A0 | account menu | signed-in | 0 | 0 | not run | not run |
| A0 | articles (legacy content) | guest | color-contrast (8) | color-contrast (8) | color-contrast (8) | color-contrast (8) |
| A0 | article (legacy content) | guest | color-contrast (8) | color-contrast (8) | color-contrast (8), scrollable-region-focusable (1) | color-contrast (8), scrollable-region-focusable (1) |
| A0 | pt-blindtest (legacy content) | guest | color-contrast (8) | color-contrast (8) | color-contrast (8) | color-contrast (8) |
| A0 | pt-leaderboard (legacy content) | guest | color-contrast (4) | color-contrast (4) | color-contrast (4) | color-contrast (4) |
| A0 | pt (legacy content) | guest | color-contrast (8) | color-contrast (7) | color-contrast (8) | color-contrast (7) |
| A0 | signin (nav) | guest | 0 | 0 | 0 | 0 |
| A0 | stats (legacy content) | guest | color-contrast (8) | color-contrast (8) | color-contrast (8) | color-contrast (8) |
| P10 | header-sheet | signed-in | 0 | 0 | 0 | 0 |
| P10 | passport (owner view of /u/testtest) | signed-in | 0 | 0 | 0 | 0 |
| P10 | passport | guest | 0 | 0 | 0 | 0 |
| P10 | settings | signed-in | 0 | 0 | 0 | 0 |
| P11 | bell | signed-in | 0 | 0 | 0 | 0 |
| P11 | notifications | signed-in | 0 | 0 | 0 | 0 |
| P11 | search-page | guest | 0 | 0 | 0 | 0 |
| P11 | search | guest | 0 | 0 | 0 | 0 |
| P1 | home-guest | guest | 0 | 0 | 0 | 0 |
| P1 | home | signed-in | 0 | 0 | 0 | 0 |
| P2 | quizzes (legacy content) | guest | color-contrast (8) | color-contrast (8) | color-contrast (8) | color-contrast (5) |
| P3 | groups | guest | 0 | 0 | 0 | 0 |
| P3 | hub-ateez | guest | 0 | 0 | 0 | 0 |
| P3 | hub-blackpink | guest | 0 | 0 | 0 | 0 |
| P3 | hub-blackpink | signed-in | 0 | 0 | 0 | 0 |
| P3 | hub-empty | guest | 0 | 0 | 0 | 0 |
| P3 | trivia (legacy content) | guest | color-contrast (8) | color-contrast (8) | color-contrast (8) | color-contrast (8) |
| P4 | end-guest | guest | 0 | 0 | 0 | 0 |
| P4 | play-answered | guest | 0 | 0 | 0 | 0 |
| P4 | play-qotd | guest | 0 | 0 | 0 | 0 |
| P4 | play | guest | 0 | 0 | 0 | 0 |
| P4 | quiz-image | guest | 0 | 0 | 0 | 0 |
| P4 | quiz-tf | guest | 0 | 0 | 0 | 0 |
| P4 | quiz | guest | 0 | 0 | 0 | 0 |
| P4 | quiz | signed-in | 0 | 0 | 0 | 0 |
| P4 | share (quiz page) | guest | 0 | 0 | 0 | 0 |
| P4 | share | guest | 0 | 0 | 0 | 0 |
| P5 | create-1 | guest | 0 | 0 | 0 | 0 |
| P5 | create-1 | signed-in | 0 | 0 | 0 | 0 |
| P5 | create-2 | guest | 0 | 0 | 0 | 0 |
| P5 | create-3 | guest | 0 | 0 | 0 | 0 |
| P5 | signin | guest | 0 | 0 | 0 | 0 |
| P6 | blindtest-group-search | guest | 0 | 0 | 0 | 0 |
| P6 | blindtest-mode (legacy content) | guest | color-contrast (2) | color-contrast (2) | color-contrast (2) | color-contrast (3) |
| P6 | blindtest-playlist-open | guest | 0 | 0 | 0 | 0 |
| P6 | blindtest | guest | 0 | 0 | 0 | 0 |
| P6 | blindtest | signed-in | 0 | 0 | 0 | 0 |
| P6 | btend | guest | 0 | 0 | 0 | 0 |
| P6 | btplay-answered | guest | 0 | 0 | 0 | 0 |
| P6 | btplay | guest | 0 | 0 | 0 | 0 |
| P7 | ranked | guest | 0 | 0 | 0 | 0 |
| P8 | community | guest | 0 | 0 | 0 | 0 |
| P8 | community | signed-in | 0 | 0 | 0 | 0 |
| P8 | editor | guest | 0 | 0 | 0 | 0 |
| P8 | post-blog | guest | 0 | 0 | 0 | 0 |
| P8 | post-debate | guest | 0 | 0 | 0 | 0 |
| P8 | post-thread | guest | 0 | 0 | 0 | 0 |
| P9 | leaderboard | guest | 0 | 0 | 0 | 0 |
| P9 | leaderboard | signed-in | 0 | 0 | 0 | 0 |

Totals: 190 state x width x theme runs with 0 serious / critical; 0 with findings on v11 surfaces; 36 with findings on legacy content inside the shell (all present with the flag off too, see evidence/a11y-legacy-pages-on-vs-off.txt).

## Keyboard walk (Tab from the top until focus cycles; light)

| Owner | State | Width | Controls | Tab stops | Unreached | Stops without a focus indicator | Focus to body | Disclosures ok / checked |
|---|---|---|---|---|---|---|---|---|
| P1 | home-guest | 390 | 101 | 102 | 0 | 0 | 0 | 0 / 0 |
| P1 | home-guest | 1440 | 103 | 104 | 0 | 0 | 0 | 0 / 0 |
| P10 | passport | 390 | 54 | 55 | 0 | 0 | 0 | 0 / 0 |
| P10 | passport | 1440 | 56 | 57 | 0 | 0 | 0 | 0 / 0 |
| P2 | quizzes (pending) | 390 | 169 | 170 | 0 | 0 | 0 | 0 / 0 |
| P2 | quizzes (pending) | 1440 | 118 | 119 | 0 | 0 | 0 | 0 / 1: "All groups": focus did not return to the trigger after Escape |
| P3 | groups | 390 | 171 | 172 | 0 | 0 | 0 | 0 / 0 |
| P3 | hub-blackpink | 390 | 99 | 100 | 0 | 0 | 0 | 2 / 2 |
| P3 | hub-empty | 390 | 52 | 53 | 0 | 0 | 0 | 0 / 0 |
| P3 | groups | 1440 | 173 | 174 | 0 | 0 | 0 | 0 / 0 |
| P3 | hub-blackpink | 1440 | 101 | 102 | 0 | 0 | 0 | 2 / 2 |
| P3 | hub-empty | 1440 | 54 | 55 | 0 | 0 | 0 | 0 / 0 |
| P4 | quiz | 390 | 66 | 68 | 0 | 0 | 0 | 0 / 0 |
| P4 | quiz | 1440 | 68 | 69 | 0 | 0 | 0 | 0 / 0 |
| P5 | create-1 | 390 | 17 | 18 | 0 | 0 | 0 | 1 / 1 |
| P5 | create-1 | 1440 | 24 | 25 | 0 | 0 | 0 | 1 / 1 |
| P6 | blindtest | 390 | 112 | 113 | 0 | 0 | 0 | 1 / 1 |
| P6 | blindtest | 1440 | 117 | 118 | 0 | 0 | 0 | 1 / 1 |
| P7 | ranked | 390 | 54 | 55 | 0 | 0 | 0 | 0 / 0 |
| P7 | ranked | 1440 | 56 | 57 | 0 | 0 | 0 | 0 / 0 |
| P8 | community | 390 | 81 | 82 | 0 | 0 | 0 | 0 / 0 |
| P8 | post-blog | 390 | 56 | 58 | 0 | 0 | 0 | 0 / 0 |
| P8 | post-debate | 390 | 54 | 55 | 0 | 0 | 0 | 0 / 0 |
| P8 | community | 1440 | 90 | 91 | 0 | 0 | 0 | 1 / 1 |
| P8 | post-blog | 1440 | 58 | 60 | 0 | 0 | 0 | 0 / 0 |
| P8 | post-debate | 1440 | 56 | 57 | 0 | 0 | 0 | 0 / 0 |
| P9 | leaderboard | 390 | 105 | 106 | 0 | 0 | 0 | 0 / 0 |
| P9 | leaderboard | 1440 | 107 | 108 | 0 | 0 | 0 | 0 / 0 |

## Sheets and popovers

| Owner | Dialog | Width | Who | Role | Name | Modal | Focus in | Tab trap | Escape (+focus back) | X (+focus back) | Backdrop (+focus back) | Problems |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A0 | account menu | 1440 | signed-in | dialog | Your account | - | NO | - | yes (yes) | - (-) | yes (NO) | none |
| P11/A0 | bell | 390 | signed-in | dialog | Notifications | - | NO | - | yes (yes) | - (-) | yes (NO) | none |
| P11/A0 | bell | 1440 | signed-in | dialog | Notifications | - | NO | - | yes (yes) | - (-) | yes (NO) | none |
| P6/A0 | blindtest-playlist-open | 390 | guest | dialog | Choose a playlist | - | NO | - | yes (yes) | - (-) | yes (NO) | none |
| P6/A0 | blindtest-playlist-open | 1440 | guest | dialog | Choose a playlist | - | NO | - | yes (yes) | - (-) | yes (NO) | none |
| P8/A0 | editor | 390 | guest | dialog | New thread | true | yes | yes | yes (yes) | yes (yes) | yes (yes) | none |
| P8/A0 | editor | 1440 | guest | dialog | New thread | true | yes | yes | yes (yes) | yes (yes) | yes (yes) | none |
| P10/A0 | header-sheet | 390 | signed-in | dialog | Header picture | true | yes | yes | yes (yes) | yes (yes) | yes (yes) | none |
| P10/A0 | header-sheet | 1440 | signed-in | dialog | Header picture | true | yes | yes | yes (yes) | yes (yes) | yes (yes) | none |
| P4/A0 | quit confirm | 390 | guest | alertdialog | Leave this quiz? | true | yes | yes | yes (yes) | - (-) | yes (yes) | none |
| P4/A0 | quit confirm | 1440 | guest | alertdialog | Leave this quiz? | true | yes | yes | yes (yes) | - (-) | yes (yes) | none |
| P11/A0 | search | 390 | guest | dialog | Search | true | yes | yes | yes (yes) | - (-) | yes (yes) | none |
| P11/A0 | search | 1440 | guest | dialog | Search | true | yes | yes | yes (yes) | - (-) | yes (yes) | none |
| P4/A0 | share | 390 | guest | dialog | Share this quiz | true | yes | yes | yes (yes) | yes (yes) | yes (yes) | none |
| P4/A0 | share | 1440 | guest | dialog | Share this quiz | true | yes | yes | yes (yes) | yes (yes) | yes (yes) | none |
| A0 | sign-in sheet | 390 | guest | dialog | Sign in to KpopQuiz | true | yes | yes | yes (yes) | yes (yes) | yes (yes) | none |
| A0 | sign-in sheet | 1440 | guest | dialog | Sign in to KpopQuiz | true | yes | yes | yes (yes) | yes (yes) | yes (yes) | none |

## Game semantics (screen reader)

- P4 quiz game at 1440: timer "15 seconds left", focus on h1.p4-qq, answers group 1, live region after an answer "Not quite. The answer is Dynamite. 0 of 1 so far.", at the end "Quiz finished. 3 out of 8.", H1 ["3/8 on Ultimate BTS era quiz - only real ARMYs survive"]
- P6 blindtest game at 1440: answers group 1, live region after an answer "Correct, plus 200 points. God's Menu by Stray Kids.", at the end "Blindtest finished. 3 out of 10, 600 points.", H1 ["3/10 on the All K-pop blindtest"]
- P4 quiz game at 390: timer "15 seconds left", focus on h1.p4-qq, answers group 1, live region after an answer "Not quite. The answer is 2016. 0 of 1 so far.", at the end "Quiz finished. 0 out of 8.", H1 ["0/8 on Ultimate BTS era quiz - only real ARMYs survive"]
- P6 blindtest game at 390: answers group 1, live region after an answer "Correct, plus 200 points. God's Menu by Stray Kids.", at the end "Blindtest finished. 3 out of 10, 600 points.", H1 ["3/10 on the All K-pop blindtest"]
