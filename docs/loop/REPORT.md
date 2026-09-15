# REPORT - COST: cut Vercel invocations + make the nightly SEO gate green.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). Branch `perf/cost-cut` off main (7cf53c2).
Measure-first, behaviour-preserving, no Verse change, no URL change, not pushed to main.
Full proofs: `docs/proofs/cost/` (start at its README).

## Before (measured)

Auditor's 24h split: middleware 67,739 / cache 50,322 / function 27,363 / redirect 2,024. Top
routes: /q/[slug] 17,139, then /, /leaderboard, /verse, /games, /login, /search, /api/auth/me
2,035, /api/duels/next 854. Code facts re-confirmed on the branch: the middleware matcher matched
every HTML page (the 67k is no-op passthrough on cached known pages); /api/auth/me is force-dynamic
and fetched independently by 4 nav islands (2 to 4 calls per page view); 34 real force-dynamic pages.

## PART 1 - middleware invocations (the big lever)

The matcher now EXCLUDES the known cached page prefixes so they never invoke middleware, while every
path that needs runtime logic still matches. Nothing moved out of middleware, so every redirect stays
its exact status: the legacy 301s, the /which-...-member-are-you rewrite, the verse cookie gate, the
protected-auth updateSession and the unknown-route 301-to-home are all unchanged. Exclusion rules
mirror isKnownRoute: slash-terminated prefixes exclude with the slash (so `/q` still 301s while
`/q/slug` skips), word prefixes use a `(?:/|$)` boundary (so `/create-preview` still redirects while
`/create` skips), `$` excludes the home page, `[^/]+-(?:quiz|trivia)` excludes the generated group
landing pages. A prefix missed here costs a wasted invocation, never wrong behaviour.

Proven: `middleware-matcher.test.ts` (85 cases) + a live behaviour matrix on `next start` where
/blind-test, /blind-test/sample, /create-preview, /battle-preview, the /which-* rewrite, /q/*, /games,
a bad sub-path and an unknown URL all behave byte-identically to before. The 67,739 was dominated by
these now-excluded pages (/q/[slug] alone 17,139), so the large majority is removed; the exact new
number is on the Vercel by-source panel after deploy.

## PART 2 - per-pageview function calls

The 4 nav islands (profile chip, notification bell, mobile top bar, home streak nudge) now share ONE
`/api/auth/me` request via a module-level `useMe` cache, so a page view makes at most one call, not
2 to 4. The cache clears on a full reload exactly like the mounted islands did, so login/logout still
update the nav on the next full navigation (unchanged behaviour). /api/duels/next left as-is this pass
(low count, 854/day; idle-poll trimming is a follow-up if the owner wants it).

## PART 3 - the 34 force-dynamic pages

None can flip without breaking a rule: 18 are /verse/* (hard constraint), 13 are /admin/* auth
dashboards, /me and /notifications are per-user, /tier-list/mine and /build are gated + noindex,
/battle reads auth for ranked XP and is noindex + low-traffic. The SEO-load-bearing pages (home,
/games, /q, /leaderboard) are already ISR from the earlier RENDER-FIX. Honest finding: no straggler.

## PART 4 - the tier list is not a cost driver

No tier-list route is in the hog list. The OG card route is cache-hardened, /api/tier-list/* are
one-shot user actions, and the tier-list pages are ISR. The launch did not cause the spend.

## PART 5 - the nightly SEO gate

Run against LIVE production (738 indexable URLs, the real indexed set), check:metadata-dupes found
exactly ONE collision: two published SEVENTEEN true-or-false quizzes rendering an identical title.
Fixed at the source that is cost-neutral: the sitemap now advertises only one URL per (title,
question count), the most-played (proven: the sitemap now emits a single seventeen-true-or-false, the
390-play `-65`, dropping the 265-play one; the dropped page still works and self-canonicals). A per-/q
canonical lookup was rejected on purpose: it would add a DB read to the single highest-traffic route.

The local build (service-role, Verse visible, 1027 URLs) shows 7 collision groups, but the extra 6
are Verse/rankings pairs absent from production's sitemap (Verse hidden, rankings need votes the anon
key reads as 0) - exactly the VERSE_PUBLIC-vs-hidden scope point in the mission. Production had one,
and it is fixed; the nightly `gates` job (anon key) sees a subset. The branch PR triggers the real
`gates` job (it runs on non-push events), which is the authoritative check; if check:orphans reports
its pre-existing offenders they are reported, not guessed.

## Verification

Unit 165 passed (incl. 85 new matcher cases). e2e 56 passed / 10 skipped (site-wide, no middleware
regression). tsc 0 source errors. next build green. No URL behaviour changed, no Verse touched, no env
file, no migration. Zero emoji, zero em dashes.

## CI

CI run URL to be filled after the branch push + PR (tests workflow + the seo-gates `gates` job).

## Owner gate

Not pushed to main. The owner reviews the branch/PR and merges. After deploy, read the Vercel
by-source invocation panel to see the middleware and /api/auth/me drop land.
