# MISSION (SOFT-404 - a bogus /q slug must return a real 404, not 200. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**`cat` this file, all of it.** RENDER-FIX is merged and pushed (75dcabb on origin/main).
This is the honest miss RENDER-FIX named and left open: proof 4, the soft-404. It is small
and precise, but it has ONE trap that looks like the obvious answer and is a product
regression. The trap is pre-proven below so you do not have to rediscover it. Read the trap
section before you write a line.

## THE GOAL, in one sentence
A request for a /q slug that is not a published quiz (unpublished, deleted, or never existed)
returns HTTP **404** with the not-found body, instead of today's soft-404 (HTTP 200 + the
not-found body + noindex), and it does this WITHOUT regressing two things RENDER-FIX and the
current design depend on: newly-published quizzes must still appear without a redeploy, and a
build-time DB timeout must still degrade gracefully rather than wipe the catalogue.

## THE SYMPTOM, exact
- Route: `src/app/(site)/q/[slug]/page.tsx`. Now `revalidate = 3600`, render mode `●` (ISR),
  `generateStaticParams` returns the top `TOP_PRERENDER = 1000` published slugs, `dynamicParams`
  is the default (true).
- `getQuizBySlug(slug)` (`src/lib/db/queries/quizzes.ts:96`) selects `.eq('status','published').single()`;
  PGRST116 (no row) returns null. An unpublished-but-existing quiz and a nonexistent slug both
  land on null, and the page calls `notFound()` (lines 79 and 148; metadata and body).
- Observed on the built artefact during RENDER-FIX: `/q/pick-out-the-odd-artms-picture` returns
  HTTP 200, not 404. The not-found UI renders and carries noindex, but the status line is 200.
  That is a soft-404: Google fetches a 200, parses it, finds noindex, and books it in the
  soft-404 bucket instead of dropping it on a clean 404.

## THE TRAP, pre-proven. Do not reach for `dynamicParams = false`.
It is the idiomatic Next answer for "a route whose generateStaticParams covers the full known
set should 404 everything else", and here generateStaticParams even covers the full set (about
400 published quizzes, well under the 1000 limit). It is still FORBIDDEN in this repo, because
two guarantees this codebase already relies on both break under it, and I have checked both:

1. **Newly-published quizzes would 404 until the next deploy.** There is NO `revalidatePath` or
   `revalidateTag` anywhere on the quiz publish path (grepped: zero hits across src/app, src/lib,
   src/actions). Freshness comes entirely from ISR + `dynamicParams = true`: a slug published in
   the admin after build renders on-demand on its first request. With `dynamicParams = false`
   that slug has no static entry and no on-demand fallback, so it 404s until someone runs a new
   `next build` (a git push). A creator publishing a quiz and finding it 404 is a real
   regression, not a theoretical one.
2. **A build-time DB timeout would wipe the whole catalogue.** `generateStaticParams` is
   fail-soft by design: on a 10s timeout or error it returns `[]` and logs "on-demand ISR only
   for this build". That `[]` is safe ONLY because `dynamicParams = true` still serves every
   slug on demand. Under `dynamicParams = false`, `[]` means every /q page 404s. The fail-soft
   becomes a fail-catastrophic.

So the fix must keep `dynamicParams = true` and make the on-demand not-found render carry a
real 404 status. If you believe you can defeat BOTH hazards above with proof (for instance a
revalidation path that genuinely makes a new slug reachable under dynamicParams=false, AND a
generateStaticParams that cannot silently yield []), that is a different mission with its own
risk surface: do not fold it in here. BLOCK and lay it out instead.

## THE INVESTIGATION (this is the mission's real work)
Next is 16.2.1. `notFound()` sets 404 for a dynamic render; the question is why an on-demand
ISR render of this route serves 200. Establish the mechanism from the built artefact before
changing anything. Likely leads, none of them assumed correct:
- Whether the 200 is the on-demand generation response or an ISR cache HIT of a previously
  generated not-found entry, and whether that cached entry stored a 200.
- Whether a not-found triggered inside `generateMetadata` (line 79) versus the page body (line
  148) reaches the framework differently.
- Whether Next 16 offers a status-preserving not-found for ISR routes, or whether the correct
  shape here is to detect the missing quiz and return the not-found UI through a path that Next
  statuses as 404 on every serve, cache HIT included.
- Whether the two /q twins differ: `src/app/embed/q/[slug]/page.tsx` has the same `notFound()`
  shape. Fix the `(site)` one (the SEO-relevant, sitemap'd one). Apply the same fix to the embed
  twin ONLY if it is the identical mechanism at zero extra risk and does not touch the W4b
  covenant; otherwise say plainly why it is left, do not silently skip it.

## SCOPE FENCE
Only the not-found status of `/q/[slug]` (and its embed twin under the rule above). No push, no
DDL, no DB writes. No edits to titles, metadata templates, sitemap.ts, robots.ts, or copy. No
"while I am here": if you find a second soft-404 on another route, name it in the REPORT as a
candidate, do not fix it. `revalidate = 3600`, the ISR render mode RENDER-FIX just won, and
`generateStaticParams` all stay exactly as they are unless the fix provably requires touching
one, in which case say why.

## THE PROOF BATTERY (docs/proofs/soft-404/, prove against `next build` + `next start`, never dev)
1. **The status flips, on the built artefact.** `/q/<a-known-bogus-slug>` returns HTTP 404
   AFTER, where it returned 200 BEFORE. Show the status line both ways (curl -I or equivalent),
   named slug, on the served production-style build. The not-found body and noindex must still
   be present; only the status changes.
2. **A real published quiz is untouched.** A known-good `/q/<real-published-slug>` still returns
   HTTP 200, still renders, still `●` ISR, still HITs on repeat (x-nextjs-cache). Render mode
   table entry for `/q/[slug]` unchanged from RENDER-FIX (`●`, 1h).
3. **Newly-published reachability preserved (the hazard-1 guard).** Demonstrate that a slug NOT
   in generateStaticParams but valid still renders on-demand with 200. The mechanism proof:
   `dynamicParams` is still true (or its equivalent), so an unknown-at-build valid slug is not
   pre-404'd. State exactly how you proved a valid non-prerendered slug still serves.
4. **Fail-soft preserved (the hazard-2 guard).** Confirm in the code and in words that a
   generateStaticParams returning `[]` still yields on-demand-served pages, not a blanket 404.
   If your fix cannot preserve this, that is a BLOCK, not a ship.
5. **W4b covenant intact** if the embed twin was touched: `/embed/q/<slug>` served HTML AND RSC
   payload still carry zero chrome markers. If the embed twin was NOT touched, say so and skip
   this, do not claim a proof you did not run.
6. **All five gates green**: docs-secrets, routes, indexability (complete crawl), orphans,
   metadata-dupes. The L-215 verse-inflation caveat on the local sitemap stands; note it, it is
   not a regression.
7. **No URL, sitemap, or metadata changed**: `git diff` shows sitemap.ts / robots.ts untouched
   and no title/description edits. The route table paths are identical to RENDER-FIX's after-set.

## IF YOU HIT A WALL
If no fix keeps all of goal + hazard-1 + hazard-2 + covenant true at once, do NOT ship a
partial one and do NOT reach for the forbidden `dynamicParams=false`. Write BLOCKED.md with:
the mechanism you established, each candidate fix and which invariant it broke, and the one
decision (if any) that is the owner's, such as whether the publish cadence could tolerate a
redeploy dependency. A soft-404 that stays open and honest is better than a real 404 that
sometimes eats a freshly published quiz.

## WHEN DONE
Update `docs/loop/REPORT.md` describing what you did (a mission is not finished until REPORT.md
describes it). If you skipped any part, say so and why. Recompute every number before you write
it. Do not push. No em dashes anywhere in anything you write.
