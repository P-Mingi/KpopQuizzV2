# Daily quiz bank tools (Mission U, 2026-10-15)

Local scripts. They read the database with the service role key of `apps/quiz/.env.local`,
read only, and never write to it. The owner applies the generated SQL himself.

1. `npx tsx scripts/daily-bank/lint-lot.mts <lot.json>`: automatic checks before review
   (shape, sources and their domains, dashes, quoted titles in music questions, forbidden
   words, titles, schedule rules, duplicates against the bank and the catalogue). Exit 1 on any error.
2. `npx tsx scripts/daily-bank/simulate.mts --from 2026-10-16 --days 110 --null-far-future <lot.json>`:
   replays the real rotation (rotateQotd) on an in-memory store and prints the quiz of each day.
3. `npx tsx scripts/daily-bank/to-sql.mts --lot 1 --reviewer Louis --reviewed 2026-10-17 <lot.json>`:
   writes `docs/pending-migrations/daily-bank-2026-10-lot1.sql` and its rollback, after the review.

Run them from `apps/quiz` with `--tsconfig tsconfig.json` if the `@/` imports do not resolve.
