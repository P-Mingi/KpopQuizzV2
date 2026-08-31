# REPORT - SOFT-404: BLOCKED. No code shipped, nothing pushed.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every build. Proven on `next build` + `next start`, never dev. No DDL, no DB
writes, no push. The route `src/app/(site)/q/[slug]/page.tsx` is byte-identical to HEAD.

## Outcome: blocked, with the wall named

The mission asked for a real 404 on a bogus `/q` slug WITHOUT `dynamicParams = false` and
WITHOUT regressing new-publish reachability or the build-time fail-soft. No fix in Next
16.2.1 holds all of those plus the `●` ISR render mode RENDER-FIX just won. Full write-up:
`docs/loop/BLOCKED.md`. Evidence: `docs/proofs/soft-404/evidence.txt`.

## What I established (not assumed)

- The soft-404 is the ISR render mode, not the `notFound()` call. On `●` `/q/[slug]`,
  `notFound()` is prerendered as a cacheable HTTP 200 (`x-nextjs-prerender: 1`,
  `s-maxage=3600`), even on the first on-demand generation, and then caches (MISS -> HIT).
- The embed twin `/embed/q/[slug]` is `ƒ` (dynamic) with the identical `notFound()` shape
  and returns a real HTTP 404. So dynamic 404s; ISR soft-404s. That is the whole mechanism.

## Candidates tried, each broke an invariant

- `connection()` to force the request dynamic: 500, digest `DYNAMIC_SERVER_USAGE` (a dynamic
  API inside ISR on-demand generation is a hard error).
- `notFound()` in the body only: still 200 (the prerender is independent of which function
  throws).
- `force-dynamic` the route (reasoned, backed by the embed control): 404s, but reverts
  `/q/[slug]` from `●` to `ƒ` - undoes RENDER-FIX on the biggest SEO route.
- `dynamicParams = false` (forbidden, re-verified): 404s, but 404s newly-published slugs
  until redeploy (no `revalidatePath` on the quiz publish path; the one in the repo is for
  `/u/<username>` only) and turns the `generateStaticParams` `[]` fail-soft into a
  catalogue-wide 404.

## What I did NOT do, and why

- Did not ship a partial fix. Every candidate either 500s, does nothing, or trades away an
  invariant the mission protects.
- Did not use `dynamicParams = false`. Forbidden, and the two hazards were confirmed real.
- Did not embark on PPR or a publish-path-revalidation refactor. Both are the owner's call
  and each is its own mission with its own risk surface (laid out in BLOCKED.md).

## The decision handed back to the owner

Option 1 accept the soft-404 for now (it is a 200 + noindex, filed as soft-404, no worse
than today, RENDER-FIX's ISR win intact); option 2 a PPR mission; option 3 a publish-path
revalidation mission that then makes `dynamicParams = false` safe. My recommendation is 1
now, 3 after the pitch window, but it is the owner's to make. Detail in BLOCKED.md.

Named not fixed (scope fence): the same soft-404 applies to any other ISR page that calls
`notFound()`; not investigated here.

---

STOP. Blocked and honest, per the mission's own instruction that a soft-404 left open beats
a real 404 that sometimes eats a freshly published quiz. Nothing shipped, nothing pushed.
