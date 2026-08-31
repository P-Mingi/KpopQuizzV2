# REPORT - RENDER-FIX: 67 routes get their static/ISR render mode back. No push.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd`
printed before every build. Proven against the built artefact (`next build` + `next
start`), never dev mode. No DDL, no DB writes, no push, no title/meta/sitemap/copy
edits. Proofs: `docs/proofs/render-fix/`.

## The decision: route group (option 1), as the owner's prior

Took option 1. The one dynamic call was `layout.tsx` `await headers()` reading
`x-pathname` to branch the `/embed` chrome. Fix: a `(site)` route group holding the
chrome layout with all 52 page-route entries moved inside it (`git mv`, history
preserved); `/embed` stays at the bare root, so its chrome is chosen by folder, not
a runtime header. The root layout is now free of every dynamic API. PPR was not
needed and not tried; the route-group path hit no wall.

The move was mechanical: `git mv` 52 entries into `(site)`, write `(site)/layout.tsx`
(the chrome, verbatim from the old chrome branch), reduce the root layout to
html/body + theme + providers, move the site-wide JSON-LD into `(site)` (so `/embed`
carries no nav labels), and delete the now-unread `x-pathname` from middleware.

Three follow-on fixes the move required, all path-adjustments not logic:
- 5 cross-route `@/app/...` imports repointed to `@/app/(site)/...` (route groups are
  invisible in URLs but real on disk).
- `scripts/check-verse-tokens.mts` hardcoded `src/app/verse` -> `src/app/(site)/verse`.
- `(site)/verse/layout.tsx` relative font paths gained one `../` (moved a level deeper).

## The headline number

    render mode (all routes):   dynamic ƒ 362 -> 295    static ○ 5 -> 64    SSG ● 0 -> 8

67 routes flipped dynamic -> static/ISR, including `/leaderboard`, `/games`, `/q/[slug]`
(now ● SSG, 1h), the knowledge-report page, and the ~36 `revalidate` routes the fix
was for. Full before/after tables: `route-table-before.txt`, `route-table-after.txt`.

## The safety gate (this mission's mirror risk)

Two pages flipped static that the mission flagged to watch: `/settings` and
`/onboarding`. Investigated, both SAFE:
- `/settings` is a `'use client'` page; its `auth.getUser()` runs in the browser. The
  server renders only a shell.
- `/onboarding` is a server shell rendering `OnboardingForm`, a client island.

Neither server-renders user data, which is exactly why Next let them go static. The
mission's "must be f" was a conservative assumption; the reality is these never
server-rendered per-user content. Proven, not assumed: `/settings` and `/leaderboard`
fetched as two different anonymous cookie jars are byte-IDENTICAL. `/me`, `/battle`,
`/notifications`, `/admin` remain `f` (they do read cookies server-side).

## The proof battery (docs/proofs/render-fix/, full detail in gate-results.txt)

1. **Route table before/after**: above. Paths IDENTICAL (367 = 367), so no URL changed
   (proof 6). `sitemap.ts` / `robots.ts` untouched.
2. **W4b covenant, re-proven on the build**: `/embed` served HTML AND RSC/flight payload
   contain ZERO chrome markers (min-h-screen, mobile-tab-bar, SiteNavigationElement, the
   nav labels, footer text). `/quizzes` carries them in both. The RSC-payload half is the
   check that failed silently once; it passes now.
3. **ISR works**: `/leaderboard` 0.007s, `/games` 0.003s, report page 0.004s on repeat,
   all `x-nextjs-cache: HIT`. Interplay stated: `/leaderboard` is now a static page AND
   keeps its PERF-1 `unstable_cache` data cache; a data cache under a static page is fine,
   and the HIT proves both layers coexist.
5. **Gates**: docs-secrets PASS, routes PASS (364), indexability PASS (COMPLETE crawl of
   all 3062 local URLs, 0 contradictions), orphans PASS (718 non-verse, complete). The
   local sitemap is verse-inflated to 3062 (`VERSE_PUBLIC=true` locally; prod ships 708
   via PUSH-GATE-1) - the L-215 caveat, which is why indexability logs 2051 deep-ISR
   warnings. metadata-dupes vs production: 1 pre-existing collision group; RENDER-FIX
   edits no metadata so it adds none (the "baseline 8" is stale).
7. **Mobile nav (7290675)**: `/q` served HTML carries `mobile-tab-bar`; the player still
   writes `document.body.dataset.quizPhase`; the CSS result-phase rule is present. Intact.

## Deviation, named loudly

**Proof 4 (soft-404) did NOT heal.** `/q/pick-out-the-odd-artms-picture` still returns
HTTP 200, not 404. The render-mode change did not fix it: `notFound()` on an ISR
on-demand render still soft-404s (200 + not-found body + noindex) in this Next version.
This is separate L-215 debt, not the layout's doing. Reported and NOT fixed: forcing a
real 404 needs a `dynamicParams`/status change on `/q/[slug]`, which is outside this
mission's scope fence ("no while-I-am-here"). It wants its own mission.

## Scope

3 commits were already local; this builds a 4th on top. No push. `layout.tsx` changed
by design (that is the mission) - 9 insertions, 74 deletions. The middleware lost only
the x-pathname plumbing; its auth and PUSH-GATE paths are untouched.

---

STOP. 67 routes static/ISR, embed covenant re-proven in HTML and RSC, no URL changed,
no per-user page leaked static, all five gates green, mobile nav intact. One honest
miss: the soft-404 is separate debt and stays open. Nothing pushed. Report ready.
