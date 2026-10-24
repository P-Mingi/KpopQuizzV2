# Withdrawn content (run O1, lane K1 rewrite)

Quizzes and daily rows that could not be rewritten on verified facts only (owner decision of 2026-10-24: a question that cites a draft or
rejected fact is blocked; a quiz or row that cannot be rebuilt into a good one is withdrawn, not padded). The files are kept unchanged. No
loader reads this folder (scripts/anime/k1/data-load.mjs reads series, facts, quizzes, daily and creators only). Note: check.mjs, when
pointed at the whole data folder, walks this folder too (its C3 then fails for the files below, which cite unverified facts, and its C9
compares live questions with them); run it on series, facts, quizzes and daily to check what is live.

## Quizzes (quizzes/<series>/)

| series | file | reason |
|---|---|---|
| attack-on-titan | attack-on-titan-seasons-decoded-parts-chapters-episodes.json | 7 of 10 questions rest on the draft span facts; the verified facts carry one chapter split and songs only |
| bleach | eight-seasons-deep-bleach-in-order.json | all 8 questions cite the draft first-eight-seasons fact; no verified fact carries season names or episode ranges |
| chainsaw-man | from-public-safety-to-school-the-arcs-so-far.json | the Public Safety arc fact is draft; only 4 verified arc facts remain, already used by the 6 kept questions |
| cowboy-bebop | grand-prix-to-adult-swim-cowboy-bebop-odds-and-ends.json | 3 of 8 questions rest on the draft awards fact and the other verified facts are used by the series' other quizzes |
| dragon-ball | the-original-dragon-ball-sagas-in-order.json | all 10 questions cite the single draft saga-list fact; no verified fact about sagas |
| hunter-x-hunter | from-hunter-exam-to-election-the-arcs-in-order.json | 7 of 8 questions rest on the draft arc lists; only the Dark Continent fact is verified |
| jojo | menacing-beginnings-jojo-for-newcomers.json | starter quiz with 5 of 10 questions blocked; the verified arc 0 facts left are too thin and too close to other questions |
| jojo | nine-parts-six-seasons-jojo-in-order.json | all 9 questions rest on draft chapter and season facts |
| jujutsu-kaisen | jujutsu-kaisen-arc-order-chapters-and-episodes.json | all 10 questions rest on the draft arc list and the draft season-two split |
| my-hero-academia | my-hero-academia-season-by-season-episodes-and-chapters.json | 9 of 10 questions rest on draft season-span, episode and volume facts |
| naruto | part-one-arc-by-arc-from-waves-to-sasuke.json | all 9 questions cite the draft Part I arc list |
| one-piece | from-romance-dawn-to-the-desert-one-piece-by-arc.json | all 10 questions cite the draft arc list |

## Daily rows (daily.json)

Each entry holds the original row, its source position and the reason. The rows' dates stay free (the file never carries a date).

| source | title | reason |
|---|---|---|
| daily/b2.json row 12 | Inside the Walls: Seasons and Records | every verified arc 0 Attack on Titan fact is already asked by other daily rows or quizzes; the 4 blocked questions cannot be rebuilt without duplicates |
