# WORKER MISSION (Cowork · 2026-08-09) - FINAL MERGE play-seo -> main (brings SEO-4 + SEO-5)

Integration in a REAL terminal (the device bridge forbids the unlink a
working-tree merge needs, so Cowork cannot do it). NEVER push (owner pushes).
No code changes beyond the merge. No schema. Report docs/loop/REPORT.md, STOP.

## CONTEXT (verified by Cowork)
- main = adda44f (already has SEO-1..3c + the Verse F3/F4 + docs).
- play-seo = 456c054, ahead of main by exactly TWO commits:
    054c000 SEO-4 the inline did-you-know card
    456c054 SEO-5 cron reconcile route + entity-level did-you-know
- Merge base 19bc845. Cowork previewed the 3 overlapping files
  (q/[slug]/page.tsx, globals.css, vercel.json): ALL auto-merge, ZERO
  conflict markers.

## STEPS
1. git checkout main (HEAD = adda44f, tree clean).
2. git merge --no-ff play-seo  (brings SEO-4 + SEO-5). If any file conflicts
   (not expected), and it is q/[slug]/page.tsx / globals.css / vercel.json,
   keep BOTH sides' additions; any OTHER conflict -> STOP + docs/loop/BLOCKED.md.
3. FULL gate suite on merged main, paste each tail into the report:
   - cd apps/quiz && npm run build   (runs check:routes + check:verse-tokens + next build)
   - the new cron route must appear in the route list
     (ƒ /api/cron/plays-counter-reconcile)
   - em-dash / en-dash scan across the merge-changed files (must be 0)
4. Green -> STOP, report main is ready to push. DO NOT PUSH.
   Red -> STOP, report the exact failure, do not paper over it.

## RECEIPT
docs/proofs/merge-play-seo/final-gates.txt: merge commit hash, build exit code
+ "Compiled successfully" + route count, the cron route line, em-dash count.
STOP after the report.
