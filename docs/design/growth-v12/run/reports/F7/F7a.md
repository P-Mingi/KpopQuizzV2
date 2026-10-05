# F7a: blindtest fixes after the owner's Firefox test

## Progress
- Done: item 1 (crash), item 2 (covers), spec `apps/quiz/e2e/ux-v12/f7a.spec.ts`, sweep (see section 3).
- Next: nothing in F7a.
- Blockers: none.

Branch `v12/f7a-blindtest` (from `feat/v12` d93905c). Dev server port 3062, both flags on.

## 1. "Something went wrong" on /blindtest/kpop-demon-hunters (Firefox)

**Not a code error in the page.** Reproduced against ORCH's build on :3071 in Playwright Firefox 155 and in
the owner's own Firefox 156.0.1 (Playwright `moz-firefox` channel, fresh profile): load, client navigation
from /blindtest and from /kpop-demon-hunters-quiz, a full 10-song run, Share, every "Your songs" clip,
Play again, back and forward, French locale, dark theme, 390 wide. No error in any of them.

The exact screen appears when a script file of the page is missing: with the page's controller chunk
answered 404 (`/_next/static/chunks/0ia3tj7iv_-re.js` on :3071), Firefox raises
`ChunkLoadError: Failed to load chunk /_next/static/chunks/0ia3tj7iv_-re.js from module 998296` and
app/error.tsx shows "Something went wrong" with no header, the owner's screen.

Why Firefox gets such a page and Chromium does not:
- `next start` sends a prerendered page (this one is: `x-nextjs-prerender: 1`) with
  `Cache-Control: s-maxage=3600, stale-while-revalidate=31532400` and no max-age (also on the RSC payload).
- Firefox honours stale-while-revalidate on a page load: measured with a local page sent with the same
  header, a link click shows the cached copy ("build 1") while the server has already sent "build 2";
  Chromium shows "build 2". So Firefox shows a page from an earlier `next build`, whose chunk names the
  current build no longer has (Turbopack names chunks by content; ORCH rebuilt :3071 at 18:25).
- Production is not exposed the same way: kpopquiz.org answers `cache-control: public, max-age=0,
  must-revalidate` (Vercel rewrites the header), checked on /blindtest/4th-gen and /blindtest.

What could not be proven: the owner's own cache at the moment of his test (it is his Firefox profile, not
read). The chain above is the only path found to that screen; ORCH's server log has no error, as expected
for a client-side chunk failure.

**Fix** (G3, `apps/quiz/src/app/(site)/blindtest/error.tsx`, `components/blindtest/ux-v1/chunk-reload.ts`):
flag on, a ChunkLoadError under /blindtest reloads the page once (a reload revalidates the page, so the
current HTML and its current chunks arrive); a second failure on the same path within 60 s, any other
error, and everything with the flag off are thrown on to app/error.tsx, the same screen in the same place.
No reload when sessionStorage cannot be read or written (no loop possible). Verified in Firefox and Chromium
(spec), and that a chunk that stays missing still ends on the error screen after one reload (probe).

## 2. Covers

"이리 溫 Bear Hug" by Suho: the stored and the refreshed cover are the same URL,
`https://cdn-images.dzcdn.net/images/cover/8b78e4ef83c0bba7f209dc87fcf50cc0/500x500-000000-80-0-0.jpg`,
**HTTP 200, image/jpeg, 107,797 bytes**. All 2,444 distinct stored `album_cover_big` URLs load in Firefox
(0 failures, read-only census). The request does not fail: **Firefox paints the alt text ("Bear Hug by Suho,
cover art") inside an image that is still downloading**, and the reveal requested its 500 px cover only at
the reveal. Chromium paints nothing while loading. Reproduced in Firefox with the cover delayed (alt text in
the tile) and failing (alt text again).

Fix:
- A1 `components/ux-v1/cover-img.tsx` + `styles/ux-v1/a0.css` (v12 block): `CoverImg` keeps the alt for
  assistive tech, paints it transparent, sits on the theme gradient while loading, and on error (or an image
  already broken at hydration) is replaced by a placeholder: gradient + music note, `role="img"` with the alt
  as its label. Flag off: the plain `<img>` as before. The share sheet preview uses it.
- G3: the game reveal and the results' song rows use `CoverImg`; the reveal's cover is fetched while the
  clip plays; hub group photos (popular groups, playlist menu avatars) fall back to the initials on error.
- Theme pages, landings and the theme cards have no pictures (typographic covers): nothing to change.
  The story image (`story-image.ts`) already resolves a failed picture to none.

## 3. Sweep: every playlist and every /blindtest page starts a run

`F7A_SWEEP=1` in `f7a.spec.ts`, against dev :3062 (both flags on). Each item: a fresh page behind
guardWrites, Play (or the hub's menu item, then Start), four live answers, one answer, the reveal, no
painted alt text in the cover, no "Something went wrong", no write.

| | /blindtest/<mode> pages (all 48 the modes API lists: 5 difficulty, 25 group, 4 era, 14 special incl. the 4 themes) | hub playlist menu (96 items: All K-pop, every group, themes, mixes, every generation) | total |
|---|---|---|---|
| Firefox 155 | 48/48 | 96/96 | **144/144** |
| Chromium | 48/48 | 95/96 | **143/144** |

The one Chromium miss, "hub menu: f(x)", was a 30 s click timeout during the sweep (the dev server was
answering hub reads in 5 s then); retried alone twice in Chromium, both runs started (four live answers).
A first Chromium pass clicked Play before hydration (nothing starts, 12 false failures); the spec now waits
for the client controller (`[data-live]`) before Play / the menu, as a person's click would land.

## Tests
- vitest: whole app 100 files, 1960 tests green (7 new in `chunk-reload.test.ts`).
- tsc whole app (e2e included): green.
- `e2e/ux-v12/f7a.spec.ts` (`--project=ux-1440 --no-deps`, PLAYWRIGHT_BASE_URL=:3062): chunk reload
  Firefox + Chromium pass; covers slow + failing Firefox, Chromium, WebKit pass; sweep as above.
  guardWrites on every page; generate (a read) passes through; clips are a local silent file. No write.

## Not verified
- WebKit chunk reload: the reload happens, but WebKit does not fetch the same chunk URL again after it, so
  the simulation cannot model a stale page there (a real one names a different URL). Skipped in the spec.
- The owner's actual Firefox cache (see section 1). `next build` not run (ORCH's), so the fix is proven on
  dev and with a refused chunk, not across two real builds.
- Found on the way, not fixed (G2's generate route): under a burst of generate calls Deezer's quota refuses
  the preview refresh and the stored, expired preview URL is kept (403, a silent clip). One normal call for
  KPDH: 0 of 10 expired.

## Flag off
Every change is behind `isUxV12()` (the a0.css rules are in the v12 block, stripped flag off). One structural
note: `app/(site)/blindtest/error.tsx` exists in every flag state; flag off it rethrows at once, so the root
screen shows exactly as before, but the RSC payload of /blindtest pages carries one more client reference.
