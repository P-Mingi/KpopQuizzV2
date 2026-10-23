# Daily quiz bank, lot 1 (Mission U, 2026-10-15)

20 daily quizzes for 2026-10-24 to 2026-11-12, one per day, published by the KpopQuizz Team
account as public /q/ pages. SQL: `docs/pending-migrations/daily-bank-2026-10-lot1.sql` and its
rollback. Owner-gated: applied by the owner after his review.

## Mix (target of the mission: 25/20/20/20/15 per 100, 40/45/15 % difficulty)

| | |
|---|---|
| Categories | group_specific 5, knowledge 4, era 4, fun 4, true_false 3 |
| Difficulty | easy 8, medium 9, hard 3 |
| Types | multiple choice 17, true or false 3 |
| Groups | ILLIT, BTS, Stray Kids, SEVENTEEN, ENHYPEN, BLACKPINK, Girls' Generation, aespa, TWICE, plus 11 multi-group quizzes (group_id null) |

## How it was made and checked

1. Written by four writers from a brief (allowed sources only, two sources for load-bearing
   facts, original wording, no lyrics, no private life, minors by stage name only).
2. `scripts/daily-bank/lint-lot.mts` (PR #101): shape, sources and domains, dashes, quotes in
   music questions, forbidden words, titles, schedule rules, exact and near duplicates against
   the 100 bank rows and the 458 published quizzes, same-topic titles, repeated facts across the
   lot, predictable answer positions. Final run: no error, no warning.
3. Six topics were replaced because an existing quiz already targeted them (debut songs, group
   name meanings, group leaders, maknaes, songs with colors, the Love Yourself era), and several
   questions because a published quiz already asked the same fact.
4. Independent second reading of every question from its cited source only (step A8):
   `verify-lot1-A.md` to `verify-lot1-D.md`, `verify-lot1-CD-pass2.md`, `verify-lot1-final.md`.
   No answer key was wrong in the final state; every FIX (second right answers, outdated or
   wrong fun facts, copied wording) was applied and the changed items checked again.
5. Dry run of the real rotation over 110 days from 2026-10-24: `simulate-lot1.txt`. Every lot
   quiz lands on its own date; the bank is empty again from 2026-11-13, so lot 2 is due by
   2026-11-06.
6. The SQL and its rollback were run verbatim on a throwaway local Postgres with the production
   shape of `quiz_bank` (unique `scheduled_date`, the 4 leftover rows): 20 rows, 200 questions,
   no date conflict; the rollback removes exactly those 20 rows. Run again after the shift
   against today's state (100 published rows, none open): 20 rows, 2026-10-24 to 2026-11-12.

**Dates shifted on 2026-10-23 (owner: "decale le lot").** The lot was not applied in time for
its first planned date, so every date moved 4 days later (2026-10-20 became 2026-10-24, ...,
2026-11-08 became 2026-11-12), same order, so the schedule rules still hold; lint and dry run
were run again (no error, no warning). The fact-check reports listed above still name the original
dates: add 4 days to read them.

The source files of the lot are `lot1-A.json` to `lot1-D.json` (regenerate the SQL with
`npx tsx scripts/daily-bank/to-sql.mts --lot 1 --reviewer <name> --reviewed <date> <files>`).

## Pour le propriétaire

1. Relire le lot sur la page de relecture (lien dans la PR) : les 20 titres, les 50 questions
   marquées « À relire » et les 20 points signalés. Deux erreurs dans l'échantillon : le lot repart.
2. Cliquer « Je valide le lot 1 » en bas de la page. Le SQL final est déjà prêt avec votre nom
   et la date du 23 octobre : ne le lancez qu'après votre relecture.
3. Lancer le SQL dans l'éditeur SQL de Supabase avant 2 h 05 (heure de Paris) la nuit du
   23 au 24 octobre (le cron du quiz du jour tourne à 00 h 05 UTC). Si c'est plus tard, le quiz
   du 24 passe simplement après la fin du lot :
   `daily-bank-2026-10-lot1.sql`, puis, si vous le voulez, `daily-bank-2026-10-14-unpublish-idol-languages.sql`.
4. Le 24 octobre au matin, ouvrir /daily : le quiz du jour doit être « ILLIT: Magnetic Debut Quiz ».
