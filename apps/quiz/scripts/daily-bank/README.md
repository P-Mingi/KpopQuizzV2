# Daily quiz bank tools (Mission U, 2026-10-15)

Local scripts. They read the database with the service role key of `apps/quiz/.env.local`,
read only, and never write to it. The owner applies the generated SQL himself.

Kpop only (lot 2, owner 2026-10-25). After the OtakuQuiz launch the same tables also hold anime
rows (Run O1 adds `site_id`, default `'kpop'`). Every read of these scripts goes through
`src/lib/daily-bank/kpop-scope.ts`: the database filters on `site_id = 'kpop'`, then each row is
checked again and a row of another site stops the run. Before the column exists, every row is a
kpop row. The lot SQL (`src/lib/daily-bank/lot-sql.ts`) names no `site_id`, so the default
`'kpop'` applies; a check after the insert stops the transaction if a row of the lot is on
another site, and the date check and the rollback touch kpop rows only. Tests:
`src/lib/daily-bank/kpop-scope.test.ts` (fails if a row of another site gets through) and
`lot-sql.test.ts`.

1. `npx tsx scripts/daily-bank/lint-lot.mts <lot.json>`: automatic checks before review
   (shape, sources and their domains, dashes, quoted titles in music questions, forbidden
   words, titles, schedule rules, duplicates against the bank and the catalogue). Exit 1 on any error.
2. `npx tsx scripts/daily-bank/simulate.mts --from 2026-10-16 --days 110 --null-far-future <lot.json>`:
   replays the real rotation (rotateQotd) on an in-memory store and prints the quiz of each day.
3. `npx tsx scripts/daily-bank/to-sql.mts --lot 2 --reviewer Louis --reviewed 2026-11-05 <lot.json>`:
   writes `docs/pending-migrations/daily-bank-<month of the first date>-lot<N>.sql` and its
   rollback, after the review (lot 1 kept `daily-bank-2026-10-lot1.sql`).

Run them from `apps/quiz` with `--tsconfig tsconfig.json` if the `@/` imports do not resolve.
