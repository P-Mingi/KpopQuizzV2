# G1 follow-up (tracking requests from the other agents)

Branch `v12/g1-followup` from `feat/v12`. Dev port 3061. Owned paths: the "G1" globs of `run/OWNERSHIP.json`
(`components/ranked/ux-v1/use-ranked-run.ts` was added for this). Read `run/briefs/COMMON.md`, `run/briefs/G1.md`,
`run/reports/G1.md` (your predecessor's Progress block and conventions) and the request files named below.

Do, in this order, each as its own small commit:
1. `run/requests/G1.md` R1: ranked runs are not tracked. Wire `trackBtRun()` with `mode='ranked'` into
   `components/ranked/ux-v1/use-ranked-run.ts` (start, finish, beacon on quit), same rules as `use-run.ts`.
2. `run/requests/G3.md` R1: the SQL function `bt_fans_today()` (G3 gives the exact SQL) as a new file
   `docs/pending-migrations/v12-g1-bt-fans-today.sql` with the usual header; never applied. R2: the `source` for
   runs started from a theme page. R3: the optional `strings` in `use-run.ts`, English output byte for byte equal.
3. `run/requests/G9.md` R5g and R5h for your files: the Team badge on the search page People rows
   (`app/(site)/search/page.tsx`, A1's `isTeam`) and editorial accounts never recorded as players by the tracking
   route (fail soft while `editorial_accounts` does not exist).
4. `run/requests/G1.md` R6: the admin nav link to `/admin/blind-tests/runs`, only if the file is yours; otherwise
   say whose it is.
Leave R5 (p6.spec with tracking on) alone: existing specs are never edited (ratchet law); write in your report the
exact env a checker must use to run it.

Done when: unit tests for each item, tsc and vitest green, `g1.spec.ts` still green in the three flag states,
flag-off diff unchanged, report updated (Progress block first).
