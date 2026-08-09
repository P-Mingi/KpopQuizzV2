# REPORT - SEO-5: cron reconcile + entity-level did-you-know

Two small adds on the play-seo worktree (branch play-seo). No schema (migrations 149 +
150 already applied by Cowork; this only READS the trivia table / CALLS the reconcile
function). Committed, NOT pushed.

## PART A - the plays-counter reconcile CRON route
- NEW apps/quiz/src/app/api/cron/plays-counter-reconcile/route.ts, modelled EXACTLY on
  duel-reconcile: same `export const dynamic = 'force-dynamic'`, the SAME auth guard
  (x-vercel-cron header OR Bearer CRON_SECRET, 401 otherwise), createServiceRoleClient.
  Body: `supabase.rpc('reconcile_quiz_counters')` -> returns `{ fixed: <n> }`, logs the count.
- vercel.json: added the cron `{ "/api/cron/plays-counter-reconcile", "15 4 * * *" }` (04:15,
  clear of the 3:00 / 3:30 / 4:00 / 5:00 jobs).
- NO-OP SAFETY NET: reconcile_quiz_counters() returns 0 today (verified live) - Cowork's
  migration-150 trigger keeps counters in sync; the nightly run self-heals future drift only.
- Receipt: docs/proofs/play-seo/seo5-cron/receipt.txt (route + vercel diff + the auth guard
  quoted next to duel-reconcile's + the rpc=0 note).

## PART B - did-you-know reads the stored trivia table too (O1 -> O3 enrichment)
- NEW lib/trivia/stored-facts.ts: getStoredGroupTrivia(groupId) -> published rows from the
  `trivia` table (migration 149), mapped to the SAME TriviaFact shape (category clamped to the
  enum, else 'fun'; source fields ''). cache()'d + fail-closed ([] on error).
- q/[slug]/page.tsx: the did-you-know pool is now DERIVED facts CONCAT STORED facts, deduped by
  the shared normalizeFactKey (derived wins on a tie), THEN the existing stableIndex(quiz.id,
  pool.length) pick. One fact, still distinct + stable per quiz, now possibly entity-level.
- Covenant + honest emptiness unchanged; card CSS + placement untouched (SEO-4 accepted as-is).
- Receipt: docs/proofs/play-seo/seo5-dyk/merged-pool.txt. BTS: derived 98 + stored 14 (all 14
  NEW, 0 dupes) = merged pool 112. 3 quiz ids -> indices [110, 55, 38] = 3 distinct; and a
  stored entity-level fact ("V, born Kim Taehyung...") now surfaces on a quiz page.

## GATES (worktree; deps symlinked from main, then removed)
- tsc --noEmit: EXIT 0.
- full build (check:routes + check:verse-tokens + next build): EXIT 0. check:routes PASS
  (352 page routes; the new API cron route compiled: `ƒ /api/cron/plays-counter-reconcile`).
  verse-tokens pass. "Compiled successfully".
- em-dash / en-dash scan on the changed files: clean.

## STOP
SEO-5 complete on play-seo. Committed, nothing pushed. Awaits a future integration (like SEO-4,
it is NOT part of the play-seo -> main merge that already shipped SEO-1..3c).
