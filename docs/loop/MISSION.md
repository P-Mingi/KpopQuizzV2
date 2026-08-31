# MISSION (RENDER-FIX - give 35 pages their ISR back. The risky one. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**`cat` this file.** PERF-2 is Cowork-approved (05b3c67). This is the mission your own
render-mode measurement called for, owner-approved. It touches the file every page
depends on, so it gets the longest proof battery of the project. Take the time.

## THE GOAL, in one sentence
`src/app/layout.tsx` free of every dynamic API, the build route table showing the ~36
`revalidate` routes as static/ISR instead of `f`, and the W4b embed covenant still true.

## WHAT WE ALREADY KNOW, so you do not re-walk dead ends
Your render-mode run established: the one dynamic call is `layout.tsx:115`
(`await headers()` for `x-pathname`); removing it flips 5 static -> 63, and 1 -> 36 of
the revalidate routes. Two of your four options are pre-eliminated by things this
project already learned the hard way:
- **Client-side embed detection is FORBIDDEN**: chrome decided by `usePathname` (or any
  client branch) puts the chrome tree in the RSC payload of /embed pages. That is the
  exact W4b failure that took two attempts to fix. The covenant is absence from served
  HTML AND the flight payload.
- **A nested /embed layout cannot remove root-layout chrome**: nested layouts nest, they
  do not replace. That is why the x-pathname hack existed at all.

Which leaves two honest paths:
1. **The route group** - `(site)` holding the chrome layout with every normal route moved
   inside it, `(embed)` (or the bare root) for /embed, root layout reduced to html/body
   + providers with NO dynamic API. You refused this in W4b on diff size and I endorsed
   the refusal; we then discovered the "small" fix silently cost every page its ISR for
   weeks. The calculus has flipped. The move is large but MECHANICAL: `git mv` the route
   folders (preserve history), URLs do not change, imports mostly survive.
2. **PPR**, only if you can prove it with measurements in this Next version, and only if
   the route-group path hits a real wall. Do not pick it for novelty.

Decide, and say in the report why. My prior is option 1.

## THE SAFETY GATE, and it points the OTHER way this time
PERF-1/2 guarded against caching per-user data. This mission's mirror risk: **a page
serving per-user content server-side must NOT become static.** Next opts any
cookie-reading page into dynamic automatically, so the danger is only pages that render
user state without reading cookies server-side (there should be none; personal bits are
client islands). Prove it, do not assume it:
- In the after build, `/me`, `/settings`, admin routes, `/battle` must still be `f`.
- Fetch a page as two different anonymous sessions and diff: identical.

## THE PROOF BATTERY (docs/proofs/render-fix/)
1. **Route table before/after**: counts of static/ISR vs dynamic, and the explicit list
   of the ~36 revalidate routes now static. This is the mission's headline number.
2. **The W4b covenant, re-proven from scratch on a production build**: the served HTML of
   an /embed page contains no chrome, AND its RSC/flight payload contains no chrome
   markers (grep the actual strings: nav labels, footer text, chrome class names). This
   is the check that failed silently once. Do it against the real built output.
3. **ISR actually works now**: /leaderboard, /games, a group page, a /q page, the report
   page - repeat requests must show prerendered/ISR behaviour (fast AND with the
   x-nextjs-cache or equivalent evidence where available). Note the interplay: the
   PERF-1/2 data caches remain correct under page ISR (data cache under a static page is
   fine); state it rather than assuming it.
4. **The soft-404 heals**: an unpublished quiz URL should now return a real HTTP 404
   status, not 200+noindex (L-215 debt). Verify one.
5. **All gates**: check:docs-secrets, check:routes, check:indexability (complete),
   check:orphans unscoped, check:metadata-dupes (baseline 8 against production-shaped
   env; the verse-inflated local sitemap caveat from L-215 applies, name it).
6. **No URL changed**: route groups do not affect URLs; prove it by diffing the route
   table paths before/after (paths identical, only render mode changes) and sitemap URL
   count unchanged.
7. **Mobile nav phase behaviour** (commit 7290675 published phase on <body> and CSS shows
   the tab bar at phase=result): still works on a /q page in the after build.

## SCOPE FENCES
- No DDL, no DB writes, no push (3 commits already local; build on top).
- No title/meta edits, no sitemap content changes, no copy changes anywhere.
- The middleware x-pathname header may stay or go; if it goes, check nothing else reads it.
- If the route-group move surfaces a genuine wall (a route that cannot move, a provider
  that must stay dynamic), BLOCK with the wall named rather than half-moving the tree. A
  half-moved route tree is the worst outcome available.

## STANDING RULES
- A mission is not finished until docs/loop/REPORT.md describes it. Skips named loudly.
- Recompute before prose. Prove against the built artefact, never dev mode.
- An incident report names locations, never values.
