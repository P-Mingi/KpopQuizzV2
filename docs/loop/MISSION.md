# WORKER MISSION (written by Cowork · 2026-08-09) - MERGE play-seo INTO main

A pure integration task in a REAL terminal (Cowork could not: the device
bridge forbids the unlink that a working-tree merge needs). NEVER push
(owner pushes). No code changes beyond what the merge itself carries. No
schema. Report to docs/loop/REPORT.md, STOP after the report.

## CONTEXT (verified by Cowork)

- main is at 7320f9a (clean). play-seo is at 19bc845.
- The merge is CLEAN: only apps/quiz/src/app/sitemap.ts and
  apps/quiz/src/styles/globals.css overlap, and both auto-merge with
  ZERO conflict markers (Cowork checked via git merge-file 3-way).
- play-seo carries SEO-1..SEO-3c: sitemap clean, 8 articles noindex
  -tiered + 6 enriched, group-links, quiz-page substance (real stats,
  dynamic intro, crawlable questions, related-by-entity, enriched
  JSON-LD, freshness), and the type-aware score suppression.

## STEPS

1. `git checkout main` (confirm HEAD = 7320f9a, tree clean).
2. `git merge --no-ff play-seo` with a clear merge message. If by some
   drift a conflict appears in sitemap.ts or globals.css, resolve by
   KEEPING BOTH sides' additions (the SEO sitemap filters + the verse
   token CSS are independent); if any OTHER file conflicts, STOP and
   write docs/loop/BLOCKED.md with the conflict, do not guess.
3. Run the FULL gate suite on the merged main and paste the tail of each
   into the report:
   - `cd apps/quiz && npm run build` (this runs check:routes +
     check:verse-tokens + next build)
   - `npx tsc --noEmit -p apps/quiz/tsconfig.json` if build does not
     already typecheck
   - em-dash / en-dash scan across the merge's changed files (must be 0)
4. If everything is green: STOP and report the merge is ready for the
   owner to push (`git push origin main`). DO NOT PUSH.
   If the build fails: STOP, report the exact failure, do not paper over
   it. A red build after merge is a real signal.

## RECEIPT

docs/proofs/merge-play-seo/gates.txt: the merge commit hash, the build
exit code + the "Compiled successfully" / route counts line, tsc result,
em-dash count. STOP after the report.

## HOUSEKEEPING (optional, safe)

Cowork left inert files in .git that the bridge could not unlink
(index.lock.stale*, lk-*, orphan tmp_obj_*). `git gc --prune=now` clears
them. Harmless either way.
