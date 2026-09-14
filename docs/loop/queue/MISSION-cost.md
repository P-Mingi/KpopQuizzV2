# MISSION (COST - cut Vercel invocations hard, and make the nightly SEO gate green. MEASURE FIRST. NO push to main.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's BLOCKED.md, stop.

**`cat` this whole file.** The owner is paying too much on Vercel and it is bleeding daily. This is
pre-existing (the spikes predate the tier list) and it is the priority. This is a MEASURE-FIRST
investigation, not a guessing edit. Read the `anthropic-skills:performance-profiler` skill and obey
its golden rule: measure before AND after, and prove behaviour did not change. Work on a branch off
`main`; push THAT branch so CI runs. Do NOT push `main`. If a fix cannot be proven safe on a live,
SEO-load-bearing surface, STOP and report options rather than shipping it.

## HARD CONSTRAINT: DO NOT TOUCH VERSE
The owner has decided to leave Verse alone for now. Do NOT extract it, do NOT remove its routes, do
NOT change its gating. The verse cookie gate in middleware STAYS exactly as it is. This mission is
only about not paying invocations we do not need.

## WHAT THE AUDITOR ALREADY MEASURED (verify, do not just trust)
Production runtime logs, last 24h, by source:
  middleware 67739   cache 50322   function 27363   redirect 2024
By route, the hogs: /q/[slug] 17139, then /, /leaderboard, /verse, /games, /login, /search,
/api/auth/me 2035, /api/duels/next 854.
Code facts:
- `src/middleware.ts` matcher runs on essentially every HTML request, INCLUDING requests the ISR
  cache would serve for free (middleware runs before the cache). That is the 67k. Most of what it
  does is STATIC (legacy 301s /blind-test, /create-preview, /battle-preview; the
  /which-{group}-member-are-you rewrite; an unknown-route 301-to-home). Only the protected-path auth
  and the verse cookie gate need runtime.
- `/api/auth/me` is force-dynamic and called from the SITE-WIDE top nav, so every page view spawns a
  serverless invocation sitewide.
- `/api/duels/next` is polled by the duel game.
- **141 routes are force-dynamic**: 37 PAGES + 104 API. The 37 dynamic pages never cache and invoke
  a function per request (also an SEO loss).
Re-confirm these numbers yourself (Vercel usage by source + the code) and capture the BEFORE numbers
as proof before changing anything.

## PART 1 - CUT MIDDLEWARE INVOCATIONS (biggest lever, riskiest - prove everything)
Middleware must stop running on high-traffic cached pages that need no runtime logic, WITHOUT
changing a single URL's behaviour.
- Move every STATIC redirect/rewrite out of middleware into `next.config.ts` redirects()/rewrites(),
  which Vercel serves at the CDN edge with NO middleware invocation:
  - `/blind-test` -> `/blindtest` (301), `/create-preview` -> `/create`, `/battle-preview` ->
    `/battle`,
  - the `/which-(.+)-member-are-you(/r/..)?` -> `/personality/...` rewrite (named groups; keep the
    pretty URL in the address bar exactly as today).
- STAYS in middleware (runtime-only): the protected-path `updateSession`, the verse cookie gate
  (do NOT change it), the unknown-route 301-to-home (depends on the runtime `isKnownRoute`
  allowlist). NARROW the matcher so the bulk of cached page requests (/q/*, /, /games, /quizzes,
  /blindtest, /leaderboard, the tier-list pages) never pay a middleware invocation. The
  unknown-route case is the hard one: keep it working for genuinely unknown paths without forcing
  middleware onto every known page (weigh: a broad matcher minus an explicit exclude-list of the
  known prefixes already in `route-allowlist.ts`, or a Next notFound()-based 301 on the catch-all).
  State the tradeoff you pick.
- PROVE behaviour unchanged with tests: each legacy 301 still lands right; the personality pretty
  URL still renders the right page with the address bar unchanged; a gated verse route still 302s an
  anonymous visitor; a truly unknown URL still 301s to home; a normal cached /q/[slug] renders and
  is NOT touched by middleware.

## PART 2 - CUT THE PER-PAGEVIEW FUNCTION CALLS
- `/api/auth/me`: it fires sitewide on every page view. Reduce it to at most once per session per
  browser (SWR global cache with `revalidateOnFocus:false` and a long `dedupingInterval`, or an
  equivalent session cache), so a crawler and a normal session do not each spawn N invocations.
  Prove the nav still shows the correct signed-in vs signed-out state and updates on login/logout.
- `/api/duels/next`: stop it polling when the duel game is off-screen / not focused. Change idle
  chatter only, not the game.
- Never cache per-user data on the CDN; never let a logged-out user see a cached logged-in nav.

## PART 3 - THE 37 FORCE-DYNAMIC PAGES (structural cost + SEO)
List the 37 pages that export force-dynamic (or are dynamic for another reason). For each, decide:
does it TRULY need per-request rendering, or can it be static/ISR like the quiz pages (revalidate +
generateStaticParams, reads through the cookie-free client)? Convert the ones that do not need
per-request rendering back to ISR. Do NOT convert a page that legitimately depends on the request
(auth-gated dashboards, search with query params) - say which stay dynamic and why. This is the
same RENDER-FIX doctrine already in the repo; extend it to the stragglers. Prove each converted page
still renders correctly and its render mode flipped (the route table before/after).

## PART 4 - CONFIRM THE TIER LIST IS NOT A COST DRIVER
Report the real invocation counts of the tier-list routes (the OG route, /api/tier-list/*). The OG
route is cache-hardened; the others are user actions. They should be a rounding error. State it so
the owner knows the launch did not cause this.

## PART 5 - MAKE THE NIGHTLY SEO GATE ACTUALLY GREEN
The `seo-gates.yml` nightly `gates` job last actually ran on the old main and FAILED on
`check:metadata-dupes`. On a push it is SKIPPED, so a push run shows a misleading "success". It will
fail again tonight.
- Run `check:metadata-dupes` against a real build and READ exactly which URLs collide and on which
  field. Do not guess. Then FIX at the source: give each colliding indexable URL a unique title and
  description (or a description where one is blank). If the collisions are pages NOT indexable in
  production (e.g. verse pages inflated only because CI sets VERSE_PUBLIC while prod ships them
  hidden), the gate SCOPE is wrong: make it assert on the URL set prod actually indexes, and say so.
  Either way the nightly `gates` job must RUN and PASS, not be skipped.
- If `check:orphans` also fails, report the offenders as candidates (the three pre-existing ones
  named in earlier proofs) rather than guessing the fix.

## PROOF BATTERY (docs/proofs/cost/, prove on the branch CI + the Vercel dashboard)
1. BEFORE: the invocation split by source and the top routes (paste the dashboard/logs).
2. AFTER: the matcher change reflected in which paths execute middleware; a measured or reasoned
   drop with the arithmetic; the render-mode table showing the pages that flipped dynamic -> ISR.
3. Behaviour proof: the test run showing every redirect/rewrite/gate/unknown-route case still holds.
4. /api/auth/me: a network trace before/after showing it fires at most once per session.
5. The metadata-dupes gate: the exact collisions, the fix, and the gate now PASSING (a real run,
   gates job not skipped).
6. Full existing test suite green on the branch (CI run url). Zero emoji, zero em dashes.

## SCOPE FENCE / GATES
No push to main. No env file touched. No new migration. Do NOT touch Verse. Do NOT change any URL's
behaviour; this is a cost refactor, not a redesign. Do not touch the tier-list feature. No "while I
am here". If PART 1 cannot be made provably safe, ship PARTS 2-5 and REPORT PART 1 as options for
the owner.

## WHEN DONE
Update `docs/loop/REPORT.md`: before/after invocation numbers with the arithmetic, exactly what
moved from middleware to config and what stayed and why, the auth/me + duels/next changes, which of
the 37 dynamic pages flipped to ISR and which stayed dynamic and why, the metadata-dupes fix, and
confirmation the tier list is not a cost driver. Recompute every number. Do not push main. No em
dashes.
