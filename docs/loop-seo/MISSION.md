# SEO-5 MISSION (PLAY-SEO fork · 2026-08-09) - cron reconcile + did-you-know entity-level

Two small code adds on the play-seo worktree (branch play-seo). Never push,
covenant, em-dash gate, receipts docs/proofs/play-seo/seo5-*/, report to
docs/loop-seo/REPORT.md, STOP after the report. NO schema (migration 149 +
150 are already applied by Cowork; you only READ the trivia table / CALL the
reconcile function).

## PART A - the plays-counter reconcile CRON route

Migration 150 already created the trigger + reconcile_quiz_counters() in the
DB. Build ONLY the thin nightly wrapper (this is the queued NEXT.md item):
- New route apps/quiz/src/app/api/cron/plays-counter-reconcile/route.ts,
  modelled EXACTLY on apps/quiz/src/app/api/cron/duel-reconcile/route.ts:
  copy its cron authorization guard (CRON_SECRET / header check), its runtime
  + response shape. Do NOT invent a new auth scheme.
  Body: call supabase.rpc('reconcile_quiz_counters'), return { fixed: <n> }
  as JSON, log the fixed count.
- Add ONE entry to vercel.json crons:
    { "path": "/api/cron/plays-counter-reconcile", "schedule": "15 4 * * *" }
  (04:15, not colliding with the 3/3:30/4-based jobs already there).
- Receipt seo5-cron/: the route + the vercel.json diff, the auth guard quoted
  next to duel-reconcile's to prove it matches, and a note that
  reconcile_quiz_counters returns 0 today (Cowork verified full sync) so the
  first run is a no-op safety net.

## PART B - did-you-know also reads the trivia table (O1 -> O3 enrichment)

The SEO-4 did-you-know card (already shipped, commit 054c000) currently draws
ONLY from getOverriddenFacts (derived group fun_facts). Migration 149 added a
stored `trivia` table (entity-level, sourced, covenant-checked) that Cowork is
seeding with BTS facts. MERGE the two sources so the card is richer and the
entity-level facts appear:
- New reader lib/trivia/stored-facts.ts: getStoredGroupTrivia(groupId) ->
  SELECT fact, category FROM trivia WHERE group_id = $1 AND status='published'
  (published-only; the RLS policy already enforces this, but filter anyway).
  Map each row to the SAME TriviaFact shape the derived pool uses
  ({ fact, category, sourceQuizTitle:'', sourceQuizSlug:'' } or the minimal
  shape the card consumes - do NOT invent fields).
- In q/[slug]/page.tsx, build the did-you-know pool as the derived facts
  CONCAT the stored facts, dedupe by the existing normalizeFactKey, THEN apply
  the existing stableIndex(quiz.id, pool.length) pick. One fact, still distinct
  + stable per quiz, now possibly an entity-level sourced one.
- Covenant + honest emptiness unchanged: if BOTH sources are empty, render
  nothing. Never invent a fact; stored facts are already sourced by CHECK.
- Do NOT change the card's CSS or placement (SEO-4 is accepted as-is).
- Receipt seo5-dyk/: for BTS, the merged pool size (derived + stored - dupes),
  and that 3 quiz ids still map to distinct facts.

## GATES
tsc on changed paths, check:routes (a NEW route.ts is added, so check:routes
MUST pass), em-dash scan, full build if the worktree allows (deps symlink from
main worked in SEO-4; do the same) else say so. STOP after the report.
