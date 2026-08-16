# PLAY-SEO LOG - the SEO fork's own append-only log (entries S-###)

Kept SEPARATE from docs/VERSE-LEDGER.md so two parallel conversations
never write the same file. One summary entry merges into the main
ledger when the SEO work lands. Same discipline as the main ledger:
append only, never edit an old entry, corrections are new entries.

- S-001 · 2026-08-07 · METHOD · PLAY-SEO forked off the main
  conversation as a parallel workstream (owner request). Isolation
  contract set (docs/PLAY-SEO-HANDOFF.md): own worktree
  .worktrees/play-seo (branch play-seo), own loop bus docs/loop-seo/,
  own log (this file), NO schema changes (shared prod DB owned by the
  main conversation), owner-only push, merge into main at a
  publication after play-games. Spec = docs/PLAY-SEO.md (GSC
  diagnostic L-092: three buckets - by-design noindex/redirects,
  the 336 thin articles, the small middle). First mission SEO-1
  seeded (sitemap hygiene + spot-check); P2 article tiering awaits
  the owner's ruling in this conversation.
- S-002 · 2026-08-08 · AUDIT · SEO-1 ACCEPTED. Worker ran in its own
  worktree (.worktrees/play-seo, branch play-seo forked cleanly off
  main at Phase F; no collision with the Verse F1 build). Receipt
  docs/proofs/play-seo/step1/sitemap-audit.txt verified by Cowork
  (not trusted on prose): live sitemap = 824 URLs, ZERO prohibited
  patterns (/u 0, /group 0, /blind-test 0, ?param 0, /create /battle
  /news /admin 0); redirects solid and single-hop with file+line
  (/group/:slug->/:slug-quiz 308, /blind-test/*->/blindtest/* 301
  belt+braces, how-well-do-you-know->/:slug-quiz 308, ranks/hall->
  /leaderboard 308); 30+ routes correctly noindexed; robots blocks
  /api (except /og) + /auth; lastmod honest (no Date() inflation).
  COWORK OWNS THE MISS: PLAY-SEO.md's central inference (dead-end
  URLs advertised in the sitemap) is REFUTED. It was explicitly
  flagged as inferred (PLAY-SEO.md section 5) and the demanded
  first-receipt killed it: the system working as designed. P1
  hygiene = NO code changes needed (positive deviation). REFRAME:
  the ~27 bucket-A URLs GSC flags come from Google's historical
  crawl state / external backlinks, NOT the current sitemap: they
  age out, nothing to fix. Bucket C: 2 redirect errors need GSC
  URL-level data (owner must open the GSC detail page), 5 robots
  blocks intentional, 27 crawled-not-indexed are content-quality.
  HONEST CONCLUSION: there is NO technical SEO bug. The indexation
  ceiling is a CONTENT problem on the ~336 thin /articles/* pages
  plus normal Google lag. The ONLY real lever is P2 (article
  depth), and even that has a modest ceiling for templated pages.
  Do not spend worker cycles on technical fixes that will not move
  the needle. Next: owner rules P2 (tier/wait/consolidate) in the
  PLAY-SEO conversation; on tier, enrichment must be REAL sourced
  data or genuine editorial only (covenant: never padded filler),
  and the thin long-tail gets noindex/drop. P4 re-measure after the
  Aug 6 push propagates (1-2 weeks).
- S-003 · 2026-08-08 · LOCK + MISSION · Owner ruled P2 = TIER the
  articles (enrich top with real sourced data, noindex/drop thin;
  covenant: never filler). Cowork grounded the numbers first
  (verified): the registry has ONLY ~20 articles
  (apps/quiz/src/lib/articles/registry.ts) and the DB has 399
  published quizzes, so the owner's "30-40 articles" set does not
  exist; tier WITHIN ~20 (expect ~10-12 enrich, ~8-10 noindex).
  HONEST REFRAME logged and flagged to the owner: the GSC "336
  discovered not indexed" is NOT articles (only 20 exist); it is
  dominated by the /q/* individual quiz pages (399 published), so
  enriching articles will NOT move the 336. That is a separate
  strategic decision (P5: accept partial indexing of thin UGC quiz
  pages / enrich quiz pages / internal-link+freshness program),
  owner to rule in a later mission. SEO-2 mission written to
  docs/loop-seo/MISSION.md (step 1 tier receipt -> step 2 enrich top
  via real DB facts + inbound internal links, the real crawl signal
  -> step 3 noindex thin, no hard delete). P5 flagged, not acted on.
- S-004 · 2026-08-08 · AUDIT · SEO-2 ACCEPTED (commits f9ace70 noindex,
  a92bbad enrichment, 42ed33b report, on play-seo). Verified on
  evidence: tiering 11 top / 8 thin (the registry holds 19 real
  articles; the "20" was the sitemap approximation, honestly flagged
  as a count artifact) · noindex = robots {index:false, follow:true}
  + sitemap filter (articles 20 -> 12), pages reachable, no hard
  delete · enrichment = REAL DB data spot-checked in the diff (era
  album tables with true names/dates, counts matching prod: 17 BTS
  albums, 29 blindtest songs, 11 aespa albums; honest sourcing line
  in the copy; covenant holds) with 6 articles enriched and 5 top
  articles left alone because already deep (honest restraint) · THE
  BIG FIX: inbound internal links from every group quiz page to
  relevant articles via group-links.ts (before: zero inbound links
  site-wide) + bidirectional cross-links between the two hub
  articles. Deviations honest (step order swap; full build not run
  in the worktree, tsc clean on changed paths via main). MERGE
  CONDITION recorded: play-seo merges into main ONLY after the F2
  verse worker finishes its current run (single-writer law), and the
  full gate suite (tsc, routes, build) runs on main post-merge
  before the owner's next routine push. Remaining: P5 (the 336 thin
  /q/* quiz pages) = owner strategic decision, untouched · P4
  re-measure GSC ~Aug 20.
