# PLAY-SEO FORK - boot doc for the parallel SEO conversation
(2026-08-07)

You are a SECOND Cowork conversation, running the PLAY-SEO workstream
IN PARALLEL with the main conversation (which is building the Verse
V-FOUNDATION F1). Same repo, same production DB, same owner. This doc
is your boot: read it, then read docs/PLAY-SEO.md (the spec) and
docs/WORKING-SYSTEM.md (the loop). You follow the working system
exactly, with the isolation rules below so the two workstreams never
collide.

## Your scope (and ONLY your scope)

Quiz-side SEO / indexation, per docs/PLAY-SEO.md:
- P1 sitemap + internal-link HYGIENE (emit only final 200 indexable
  URLs; drop noindex pages, redirecting old URLs, ?param variants).
- P2 the 336 thin /articles/* pages (OWNER decision: tier / wait /
  consolidate; recommendation = tier). You get this ruling from the
  owner IN YOUR conversation.
- P3 spot-check the middle bucket (2 redirect errors, 5 robots blocks,
  27 crawled-not-indexed).
- P4 re-measure after the Aug 6 push propagates.

You do NOT touch: /verse, /build, the pages/page_* /nav_menus tables,
anything the F1 build owns. If a task pulls you there, STOP and tell
the owner; that belongs to the main conversation.

## ISOLATION CONTRACT (the rules that keep us from corrupting F1)

1. SEPARATE GIT WORKTREE. Your executor NEVER works in the main
   working tree (the Verse F1 worker owns it right now) and NEVER in
   .worktrees/play-games (the games worker owns that). Your worker's
   FIRST action:
     git worktree add .worktrees/play-seo -b play-seo
   and it runs its dev server + all git ops ONLY from there. This is
   the single-writer law (ledger L-060/L-075): two sessions in one
   tree corrupt each other. Non-negotiable.

2. YOUR OWN LOOP BUS: docs/loop-seo/ (MISSION.md / REPORT.md /
   BLOCKED.md). NEVER write docs/loop/ (that is the Verse worker's
   bus). Your trigger to your worker is the same phrase but pointed
   at your bus:
     "Lis docs/loop-seo/MISSION.md et execute."
   Your worker reports to docs/loop-seo/REPORT.md; the owner says
   "report pret" and you audit it.

3. YOUR OWN LOG: docs/PLAY-SEO-LOG.md (append-only, entries S-###).
   NEVER append to docs/VERSE-LEDGER.md (the main ledger) - two
   writers on one file clobber each other. When the SEO work merges
   back, ONE summary entry is added to the main ledger by whichever
   conversation is holding it; until then, log everything as S-###
   here.

4. NO SCHEMA CHANGES. The two workstreams share ONE production
   database, and the main conversation is the only one applying
   migrations (it just applied 148). SEO P1-P4 need zero DDL. If you
   ever think you need a schema change, do NOT write or apply it:
   write it to BLOCKED.md and route it through the owner to the main
   conversation. Read-only Supabase MCP for audits is fine.

5. PUSH stays owner-only, ONE branch at a time. Your worker commits
   to play-seo locally, never pushes. The owner merges play-seo into
   main at a publication, in a controlled order with play-games (the
   G-HUB pattern, ledger L-035/L-080). Flag any file you touch that
   the games worker also touches, so the merge is clean.

## The loop you run (identical to the main one, scoped)

owner idea/ruling -> you write docs/loop-seo/MISSION.md -> owner:
"Lis docs/loop-seo/MISSION.md et execute." -> worker builds in
.worktrees/play-seo, proofs as files under docs/proofs/play-seo/<step>/,
commits per step -> writes docs/loop-seo/REPORT.md -> owner:
"report pret" -> you audit report + proofs + real GSC/sitemap state,
log S-### -> next mission.

Prototype-first still applies for any UI (unlikely here; SEO is mostly
data + head tags). Real-data law, no fabricated content, em-dash ban,
ratchet law, fail-closed: all the standing laws hold.

## First mission is already seeded

docs/loop-seo/MISSION.md contains SEO-1 (P1 hygiene + P3 spot-check).
P2 waits for the owner's tiering ruling in YOUR conversation. Have the
owner run: "Lis docs/loop-seo/MISSION.md et execute." to start.

## Honest coordination note

Three concurrent workstreams now exist: Verse F1 (main tree), games
backlog (play-games), SEO (play-seo). Git is safe via three
worktrees. The shared surfaces are the prod DB (SEO does not touch it)
and the Vercel deploy (owner serializes pushes). Keep your scope tight
and the isolation holds.
