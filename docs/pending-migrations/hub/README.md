# Run O1, lot H2b: SQL of the data behind the FanQuiz home

Written by lot H2b, applied by nobody yet. Tried only on the `o1-scratch` branch. Both files are optional: the blocks of
`apps/quiz/src/lib/site/hub/data/` work without them (they page the plays rows and estimate the week from plays) and use the tables once
they exist and are filled.

- `001-quiz-daily-plays.sql` (+ rollback): plays per quiz per UTC day for Hot right now, and the `started` column the completion rate needs.
  Filled by `select public.hub_refresh_quiz_daily(8);` once a night.
- `002-xp-daily-snapshots.sql` (+ rollback): the XP of each member per site per day, for the XP of the week in Top fans.
  Filled by `select public.hub_snapshot_xp();` once a day. Service role only.

Not in `docs/o1/contracts/manifest.md` (a new file is a change request there): see `docs/o1/requests/H2b.md`. Rules of the manifest followed here:
header (what, why, rows, verify, undo), idempotent statements, `-- o1-transaction: single`, RLS on, writes by the service role only.
