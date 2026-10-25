# Daily quiz bank, lot 3 (Mission U, 2026-10-25)

20 daily quizzes for 2026-12-03 to 2026-12-22, one per day, published by the KpopQuizz Team
account as public /q/ pages, right after lot 2 (2026-11-13 to 2026-12-02). Without this lot the
bank is empty from 2026-12-03. SQL: `docs/pending-migrations/daily-bank-2026-12-lot3.sql` and its
rollback. It is a DRAFT: the review is not recorded yet, so the SQL stops with an error and changes
nothing if someone runs it. Applied in production by Claude only on the owner's go, after the
review. Lots 1 and 2 are not touched.

Kpop only, as for lot 2: the tools that checked and wrote this lot read kpopquiz.org rows only
(`apps/quiz/src/lib/daily-bank/kpop-scope.ts`), the SQL names no `site_id`, a check after the
insert stops the transaction if a row of the lot is on another site, and the date check and the
rollback touch kpop rows only.

## Mix (same targets as lots 1 and 2: 25/20/20/20/15 per 100, 40/45/15 % difficulty)

| | |
|---|---|
| Categories | group_specific 5, knowledge 4, era 4, fun 4, true_false 3 |
| Difficulty | easy 8, medium 9, hard 3 |
| Types | multiple choice 17, true or false 3 |
| Groups | ITZY, EXO, GOT7, MAMAMOO, SHINee, STAYC, Apink, NCT 127, NCT DREAM, 2NE1, P1Harmony (none of them in lot 1 or 2), plus 9 multi-group quizzes (group_id null) |

## How it was made and checked

1. Written by four writers (5 quizzes each) from the lot 2 brief, updated with the lessons of
   lot 2: every count, ranking and "first" checked in those words against its source, exact
   award, chart and release names, no sentence copied from a source, no question or fun fact
   that gives away another answer of the same quiz, of another lot 3 quiz or of lot 2, nothing
   from the winter quiz of 2026-12-02.
2. `scripts/daily-bank/lint-lot.mts`, run on lot 2 and lot 3 together so the dates run without a
   gap from 2026-11-13 to 2026-12-22 and repeats across the two lots are caught: shape, sources and
   domains, dashes, quotes in music questions, forbidden words, titles, schedule rules, exact and
   near duplicates against the 120 kpop bank rows, the 20 quizzes of lot 2 and the 483 published
   kpop quizzes, same-topic titles, repeated facts, predictable answer positions. Final run: no
   error, no warning.
3. Independent second reading of every question from its cited source only:
   `verify-lot3-A.md` to `verify-lot3-D.md` (200 questions: 145 OK, 49 FIX, 6 DROP). No marked
   answer was wrong. What was found: four wrong options of the year-end chart quiz that were
   No. 1 of that year on another Circle list (one a real second right answer), a P1Harmony tour
   count on which the sources disagree, a quiz whose other questions ruled out every wrong option,
   two answers given away by another quiz (Gentleman, ETA), a bank topic already asked (BTS's
   Idol video), three phone songs too obscure for an easy quiz, an outdated "former I.O.I member"
   (I.O.I reunited in 2026), credits that left out a co-writer, and fun facts too close to their
   source. Every FIX was applied and every DROP replaced.
4. Recheck of every flagged point (owner's rule: a dedicated agent proves each flagged point on a
   page it opened, and replaces anything not 100 % sure): `recheck-lot3-A.md` to
   `recheck-lot3-D.md`, in French. 73 points: 52 kept, 20 corrected, 1 replaced. Among them: the
   new NCT 127 question had a second right answer (Sticker is NCT 127's third Korean studio album
   but the fourth overall, with the Japanese Awaken), the leader of STAYC is no longer certain in
   2026 (question replaced), Poppy peaked at No. 13 on Oricon's weekly chart, not No. 7, and the
   Dreamcatcher teaser code is not Morse.
5. Last independent reading of the 26 items changed during the recheck: `verify-lot3-final.md`
   (21 OK, 5 wording or sourcing fixes, applied).
6. Right answers were moved (option swaps, the right answer text unchanged) so that no run of four
   answer positions repeats inside lot 3 or with the last five multiple choice quizzes of lot 2
   (2026-11-27 to 2026-12-02); against all of lot 2 it cannot be done, too few runs of four are
   left. Questions whose options read in a natural order (numbers, years, ordinals) have them
   sorted. Each quiz has 2 or 3 right answers on each position and never the same position three
   times in a row.
7. Dry run of the real rotation over 75 days from 2026-10-26 with lots 2 and 3:
   `simulate-lot3.txt`. Every lot quiz lands on its own date; the bank is empty again from
   2026-12-23, so lot 4 is due by about 2026-12-16.
8. The SQL and its rollback were run on a throwaway local Postgres in three shapes: today's
   production (20 rows, a second run fails on the date key and changes nothing, the rollback
   removes exactly those rows), after Run O1 with anime rows on lot dates and one anime row named
   like a lot quiz (20 kpop rows next to them, the anime rows untouched by the insert and the
   rollback), and a trap where the default site is not 'kpop' (the check stops everything, 0
   rows). The draft itself stops on "review not recorded" and leaves 0 rows.

The source files of the lot are `lot3-A.json` to `lot3-D.json` (regenerate the SQL with
`npx tsx scripts/daily-bank/to-sql.mts --lot 3 --reviewer <name> --reviewed <date> <files>`).

## Pour le propriétaire

1. Relecture : la page de relecture du lot 3 montre les 26 points signalés et 50 questions tirées
   au hasard. Le lien est donné dans la PR.
2. Après votre « go » : je régénère le SQL avec votre nom et la date de relecture, puis Claude
   l'applique en production et vérifie ligne par ligne (20 lignes, une par date du 3 au 22
   décembre, 200 questions), comme pour les lots 1 et 2. Le lot 2 doit être appliqué avant ou en
   même temps. À faire avant le 3 décembre, 1 h 05 heure de Paris (le cron du quiz du jour tourne
   à 00 h 05 UTC). Retour arrière : `daily-bank-2026-12-lot3-rollback.sql`.
3. Le 3 décembre au matin, ouvrir /daily : le quiz du jour doit être
   « ITZY: From Debut to Born to Be ».
