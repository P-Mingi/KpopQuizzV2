# QUEUED FOR AFTER SEO-3c (do NOT start until SEO-3c is reported + Cowork promotes this into MISSION.md)

## SEO-4 (small): the plays-counter reconcile CRON route

Migration 150 is ALREADY APPLIED to the DB by Cowork (triggers on
plays keep quizzes.{play_count,total_completions,total_score_sum} in
sync on DELETE/UPDATE; a set-based function reconcile_quiz_counters()
exists as the safety net). Your job is ONLY the thin cron wrapper that
calls it nightly. No schema work, never push, covenant, em-dash gate,
receipts, STOP after report.

BUILD:
- New route apps/quiz/src/app/api/cron/plays-counter-reconcile/route.ts
  modelled EXACTLY on an existing cron route (see
  apps/quiz/src/app/api/cron/duel-reconcile/route.ts for the auth
  pattern, the CRON_SECRET / authorization header check, runtime and
  response shape). It must:
  - enforce the same cron authorization guard the other routes use
    (do not invent a new auth scheme; copy the existing one),
  - call the DB function: supabase.rpc('reconcile_quiz_counters'),
  - return { fixed: <number the function returned> } as JSON,
  - log the fixed count.
- Add ONE entry to vercel.json crons:
    { "path": "/api/cron/plays-counter-reconcile", "schedule": "15 4 * * *" }
  (04:15, a quiet slot not colliding with the 3/3:30/4/4-based jobs
  already listed).

ACCEPTANCE / receipt docs/proofs/play-seo/seo4-cron/:
- the route file + the vercel.json diff,
- proof the auth guard matches the sibling cron routes (quote both),
- a note that reconcile_quiz_counters returns 0 today (Cowork verified
  the table is fully in sync), so the first real run is a no-op safety
  net, which is the intended steady state.
GATES: tsc on changed paths, routes check (a new route.ts IS added,
so check:routes must pass), em-dash scan. Full build still can't run
in the worktree; say so. Merge condition unchanged.
