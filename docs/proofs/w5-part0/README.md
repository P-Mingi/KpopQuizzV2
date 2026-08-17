# W5 PART 0 - raw output and the scripts that produced it

Read-only snapshot, 2026-08-17. No writes, no DDL.

| file | what it is |
| --- | --- |
| `query-main.mjs` | sections A, B, C, D, E, F, G |
| `raw-main.txt` | its unedited output |
| `query-addendum.mjs` | pooled-vs-mean method check, general-kpop split, duel winners named |
| `raw-addendum.txt` | its unedited output |
| `query-controlled.mjs` | correlation without general-kpop, difficulty-controlled gg vs bg |
| `raw-controlled.txt` | its output, plus the Mar+Apr / May-Aug regime split |

Every figure in `docs/data/w5-dataset.md` is read back from these files. Where prose and a
raw file disagreed during writing, the raw file won and the prose was corrected.

The scripts read the DB with the service-role key from `apps/quiz/.env.local` and issue
only `select`s, paginated past the 1000-row PostgREST cap.
