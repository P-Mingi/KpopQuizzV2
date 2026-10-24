# Daily quiz bank, lot 2 (Mission U, 2026-10-25)

20 daily quizzes for 2026-11-13 to 2026-12-02, one per day, published by the KpopQuizz Team
account as public /q/ pages, right after lot 1 (2026-10-24 to 2026-11-12). SQL:
`docs/pending-migrations/daily-bank-2026-11-lot2.sql` and its rollback. Owner-gated: applied by
the owner after his review.

Kpop only. The tools that checked and wrote this lot read kpopquiz.org rows only (site filter of
`apps/quiz/src/lib/daily-bank/kpop-scope.ts`, tested by `kpop-scope.test.ts`, which fails if a row
of another site gets through). The SQL names no `site_id`: before Run O1's 002a every row is a kpop
row, after it the column default `'kpop'` fills it. A check after the insert stops the transaction
if a row of the lot is on another site, the date check and the rollback touch kpop rows only, and
the draft refuses to apply while the review is not recorded. Lot 1 is not touched.

## Mix (same targets as lot 1: 25/20/20/20/15 per 100, 40/45/15 % difficulty)

| | |
|---|---|
| Categories | group_specific 5, knowledge 4, era 4, fun 4, true_false 3 |
| Difficulty | easy 8, medium 9, hard 3 |
| Types | multiple choice 17, true or false 3 |
| Groups | ZEROBASEONE, LE SSERAFIM, TREASURE, DAY6, TXT, BOYNEXTDOOR, IVE, NMIXX, ATEEZ, Wonder Girls, Red Velvet (none of them in lot 1), plus 9 multi-group quizzes (group_id null) |

## How it was made and checked

1. Written by four writers from the lot 1 brief, updated with the lessons of lot 1 (dated facts
   only, no lineup changes tied to a reason, minors in 2024 and 2025 groups, generic User-Agent,
   answer positions with no pattern).
2. `scripts/daily-bank/lint-lot.mts`, now kpop only: shape, sources and domains, dashes, quotes in
   music questions, forbidden words, titles, schedule rules (also against the kpop bank rows the
   day before and the day after the lot: 2026-11-12 is a fun quiz, so 2026-11-13 is not),
   exact and near duplicates against the 120 kpop bank rows and the 482 published kpop quizzes,
   same-topic titles, repeated facts across the lot, predictable answer positions. Final run: no
   error, no warning.
3. Independent second reading of every question from its cited source only:
   `verify-lot2-A.md` to `verify-lot2-D.md`. One answer key was wrong (TREASURE were not the first
   Korean act with a fan meeting at Tokyo Dome); every FIX was applied (wording too close to a
   source, a prize name, a date, two questions that gave their own answer, outdated fun facts).
   Two questions were replaced: the magic quiz showed Accendio as a 2024 IVE song, which gave away
   a question of the IVE quiz eight days later, and VIXX's Voodoo Doll did not fit a light quiz.
   Every changed item was checked again: `verify-lot2-final.md`.
4. Right answers were moved (option swaps, the right answer text unchanged) so that no run of four
   answer positions repeats from one quiz to another.
5. Dry run of the real rotation over 110 days from 2026-10-25: `simulate-lot2.txt`. Every lot
   quiz lands on its own date; the bank is empty again from 2026-12-03, so lot 3 is due by
   2026-11-26.
6. The SQL and its rollback were run on a throwaway local Postgres in three shapes: today's
   production (no site_id: 20 rows, a second run fails on the date key and changes nothing, the
   rollback removes exactly those rows), after Run O1 with anime rows on the same dates and one
   anime row sharing a lot title (20 kpop rows next to them, the anime rows untouched by the
   insert and the rollback), and a trap where the default is not 'kpop' (the check stops
   everything, 0 rows).

The source files of the lot are `lot2-A.json` to `lot2-D.json` (regenerate the SQL with
`npx tsx scripts/daily-bank/to-sql.mts --lot 2 --reviewer <name> --reviewed <date> <files>`).

## Pour le propriétaire

1. Relire le lot sur la page de relecture (lien dans la PR) : les 20 titres, les 50 questions
   marquées « À relire » et les 16 points signalés. Deux erreurs dans l'échantillon : le lot repart.
2. Cliquer « Je valide le lot 2 » en bas de la page, puis dire « go » à Claude : il régénère le
   SQL final avec votre nom et la date de la relecture. Le SQL actuel est un brouillon : il refuse
   de s'appliquer tant que le nom et la date ne sont pas inscrits.
3. Lancer le SQL final dans l'éditeur SQL de Supabase avant le 13 novembre, au plus tard avant
   2 h 05 (heure de Paris) la nuit du 12 au 13 (le cron du quiz du jour tourne à 00 h 05 UTC).
   Si c'est plus tard, le quiz du 13 passe simplement après la fin du lot :
   `daily-bank-2026-11-lot2.sql`. Retour arrière : `daily-bank-2026-11-lot2-rollback.sql`.
4. Le 13 novembre au matin, ouvrir /daily : le quiz du jour doit être
   « ZEROBASEONE: From Boys Planet to In Bloom ».
