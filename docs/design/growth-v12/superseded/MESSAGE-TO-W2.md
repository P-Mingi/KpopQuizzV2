# Message for W2 (the owner pastes the block below into the W2 session, once W3 is launched)

```
Info from the owner, not a new task. Keep running your plan as it is.

A second run, W3, works in parallel on growth (blindtest tracking, score averages, catalogue, blindtest
landing pages). It lives in ../KpopQuizzV2-w3 on feat/growth-w3, its agents on w3/* branches, ports 3031
to 3035. It never touches your paths or your branches. In return:

1. Never touch, list for cleanup, prune or remove the worktrees ../KpopQuizzV2-w3,
   ../KpopQuizzV2-w3-agents/*, ../KpopQuizzV2-w3-base, or the branches feat/growth-w3, w3/*. Never run
   git stash (the stash is shared by every worktree). Your Phase 4 cleanup only concerns worktrees you
   created.
2. During this run, do not edit these files (W3 owns them): lib/blind-test-modes.ts,
   lib/blind-test-curated.ts, lib/growth/**, lib/tracking/**, lib/quiz/scoring.ts, lib/quiz/teaser.ts,
   lib/db/queries/stats.ts, lib/db/queries/quizzes.ts, lib/db/types.ts, lib/route-allowlist.ts,
   app/sitemap.ts, app/api/blind-test/**, app/api/track/**, app/api/claim-runs/**,
   components/blind-test/**, components/quiz/quiz-card.tsx, components/quiz/quiz-detail-view.tsx,
   components/home/quiz-of-the-day.tsx, components/home/trending-card.tsx, app/(site)/admin/page.tsx,
   app/api/admin/quizzes/route.ts, scripts/w3-*, docs/growth/**, docs/design/growth-v12/**,
   docs/pending-migrations/w3-*.sql. If one of your agents needs a change there, write it in your
   report as an owner decision instead.
3. Averages: clue quizzes store up to 3 points per question, so total_score_sum / total_completions /
   question_count goes up to 300%. In your new components never compute an average or a "score/total"
   label inline. Put them behind one small function per component that W3's helpers
   (avgScorePct, runScoreLabel in lib/quiz/scoring.ts) will replace, and list those spots in your report.
4. P6: the v11 blindtest must be able to record runs. Keep one place in the game where a run starts,
   each round ends, and the results appear (callbacks or a small hook), so W3's trackBtRun() plugs in
   with a few lines after both runs are merged.
5. Group, song and playlist counts are live values (the catalogue is growing: RESCENE, NCT WISH,
   Hearts2Hearts, KickFlip songs). Never hardcode 79 playlists or 90 groups. C2's checks
   "playlists = 79 groups" and "visible groups = 90" become "playlists = getAdvertisablePlaylists()
   length at check time" and "visible groups = live count at check time".
6. W3 uses the same test user only for its own new tracking endpoint. Its tests stub every existing
   write endpoint, so the test user's daily try, XP and plays stay as your checks expect. If your
   data guard ever sees a new table (bt_runs), ignore it: rows there are W3's.
7. Merges: whichever PR reaches main second merges main into its branch (no rebase) and reruns its checks.
```
