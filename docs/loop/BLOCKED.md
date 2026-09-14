# BLOCKED - SOFT-404: no fix holds all four invariants at once in Next 16.2.1

STATUS: ACCEPTED by owner 2026-08-31 (option 1). Soft-404 is recorded debt, not an open blocker. PPR is the future fix. See VERSE-LEDGER L-220.

Nothing shipped. The route `src/app/(site)/q/[slug]/page.tsx` is byte-identical to HEAD
(75dcabb). Evidence: `docs/proofs/soft-404/evidence.txt`. Proven on `next build` +
`next start`, never dev.

## The mechanism, established from the built artefact

A bogus `/q` slug soft-404s (HTTP 200 + not-found body + noindex) because the route is
ISR (`revalidate = 3600`, mode `●`). In Next 16.2.1, `notFound()` during an ISR render
is PRERENDERED as a cacheable 200 (`x-nextjs-prerender: 1`, `s-maxage=3600`) - even on
the first on-demand generation (cache MISS), and it then caches that 200 (MISS -> HIT).

The control proves it is the render mode, not the `notFound()` call: the embed twin
`src/app/embed/q/[slug]/page.tsx` has the identical `notFound()` shape but is `ƒ`
(dynamic), and it returns a real HTTP 404. Dynamic 404s; ISR soft-404s.

## Every candidate and the invariant it broke

- **A. `connection()` before `notFound()`** (make just this request dynamic): builds, but
  every missing-quiz request 500s with digest `DYNAMIC_SERVER_USAGE`. An ISR on-demand
  render runs in a static-generation context where a dynamic API is a hard error, not a
  graceful bail. Broke the route.
- **B. `notFound()` in the page body only** (metadata returns minimal noindex instead of
  throwing): builds, still 200. The 200 is the ISR prerender of `notFound()`, independent
  of which function throws it. Fixed nothing.
- **C. `export const dynamic = 'force-dynamic'`** (not shipped, reasoned + backed by the
  embed control): would 404, but reverts `/q/[slug]` from `●` to `ƒ`, undoing RENDER-FIX's
  ISR win on the single biggest SEO route (400+ quiz pages, the crawl-wave target). Broke
  the previous mission's headline.
- **D. `dynamicParams = false`** (forbidden by the mission, re-verified): would 404 the
  bogus slugs, but (1) a newly-published slug would 404 until the next deploy - the only
  `revalidatePath` in the repo is for `/u/<username>` profile edits, none on the quiz
  publish path, so freshness relies entirely on `dynamicParams = true` on-demand ISR; and
  (2) a build-time `generateStaticParams` timeout returns `[]`, which under
  `dynamicParams = false` would 404 the whole catalogue. Broke hazard-1 and hazard-2.

No combination keeps goal + hazard-1 + hazard-2 + the `●` render mode true at once without
Partial Prerendering (PPR), which the mission explicitly scopes to a separate mission.

## The owner's decision

Pick one; each is a different mission, none is a silent code change:

1. **Accept the soft-404 for now.** It is a 200 with noindex; Google files it as a soft-404
   rather than indexing it. Cost is a soft-404 bucket entry per dead slug, no worse than
   today, and the RENDER-FIX ISR win stays.
2. **PPR mission.** Partial Prerendering can keep the static shell while letting the
   not-found branch render dynamically and status 404. Needs its own risk pass in this Next
   version (PPR is still gated) and its own proof battery.
3. **Publish-path revalidation mission.** If a `revalidateTag`/`revalidatePath` is added to
   the quiz publish action so a new slug is reachable without a deploy, AND
   `generateStaticParams` is made unable to silently yield `[]`, then `dynamicParams = false`
   becomes safe and the 404 is free. That is real work with its own regression surface
   (every publish/unpublish/delete path must revalidate), not a one-liner.

Recommendation: option 1 until the pitch window closes, then option 3 - it is the smallest
durable fix and it also buys correct 404s for unpublished and deleted quizzes, not just
never-existed ones. Not my call to make.

## Second soft-404 candidate, named not fixed (scope fence)

Every ISR page in this app that calls `notFound()` shares this behaviour (e.g. group pages
under `/[slug]` when a group is missing, if/where they are `●`). Not investigated, not
fixed here - named so it is not a surprise when the same decision reaches them.
