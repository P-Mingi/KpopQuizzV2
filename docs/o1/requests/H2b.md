# Requests of H2b, the real data of the FanQuiz home (files H2b does not own)

H2b changed only `apps/quiz/src/lib/site/hub/data/**`, `apps/quiz/e2e/o1/H2b/**`, `docs/pending-migrations/hub/**`, `docs/o1/reports/H2/data.md` and this file. For ORCH:

1. `docs/o1/contracts/manifest.md`, section 1: two optional rows after the multisite files (owner H2b, phase `pre`, tx `single`, needs: 001 for `002`'s `sites`, 003 for `world_memberships`), and a section in `schema.sql` for each if `contract.test.ts` should count them. Paths: `docs/pending-migrations/hub/001-quiz-daily-plays.sql` and `docs/pending-migrations/hub/002-xp-daily-snapshots.sql` (rollbacks beside them). They are optional: the blocks work without them.
2. `apps/quiz/vercel.json` (HOT file) and two cron routes, if the owner wants the tables: a nightly call of `select public.hub_refresh_quiz_daily(8)` (after 00:30 UTC) and `select public.hub_snapshot_xp()` (shortly after 00:00 UTC), service role. H2b wrote no route and did not touch `vercel.json`.
3. `docs/o1/contracts/TWINS.md` / `twins.json`: nothing (no page, no component).
4. The page lot (H2a) should print `getRotation().parisTime` (01:05 in winter, 02:05 in summer), not a fixed "2:05", and `getBlindtest().songCount` (10), not "5".
