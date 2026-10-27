# Sync fix: o1/integration after merging origin/main df25774 (Mission U parts C and D, bank lot 1)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-sync, branch o1/sync-main (= o1/integration a612dd2, which
merged origin/main df25774 cleanly). Q = apps/quiz/src. Read this brief, the failing tests and the code they test. Nothing else.
## Rules
- No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets. No en or em dash, no emoji.
- Production now runs origin/main df25774. The kpop render-tree snapshots of the O1 tests were made from the old base 8059cd3: a
  snapshot whose only difference is main's own change (part D settings text, part C covers) is re-made from df25774 files, the way
  the test's header says snapshots are made (never by copying the current output of the o1 tree). Any other difference is a bug.
- Never weaken an assertion; never edit docs/o1/contracts/**, scripts/o1/**.
## Fix the 7 failing tests (`pnpm -C apps/quiz exec vitest run`):
1. Q/components/o1-p1-settings-ready.test.ts (2) and Q/components/name-all/o1-kpop-name-all-tree.test.ts (1): re-base the snapshots
   on df25774 as above; show in the hand-back what changed in each snapshot and that it is main's change.
2. Q/app/api/cron/ensure-daily-quiz/route.test.ts (4): main added bankStatus (a count of quiz_bank rows, verified or scheduled, and
   the refill alert). On o1 the count must be per site: forSite on the build's site (kpop with SITE_SCOPE off: main's exact query),
   the alert names the site off kpop. Extend the mock for the new query; keep every existing assertion and add: kpop response
   equals main's shape; anime counts only anime rows.
Also check that main's other merged code reads site-scoped data where o1 needs it (Q/lib/quiz-bank-scheduling.ts bankRefillAlert and
the lot 1 bank SQL docs/daily-bank/lot1: kpop only, says so); list anything else that reads quiz_bank, ranked or blindtest tables
without a site on a non-kpop build.
## Checks
Full `pnpm -C apps/quiz exec vitest run` green; tsc 0; `/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/check.sh $PWD` ok.
Commit on o1/sync-main ("o1: sync main, tests re-based on df25774, bank status per site"; last line
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 8 lines: sha, files, each snapshot change, checks.
