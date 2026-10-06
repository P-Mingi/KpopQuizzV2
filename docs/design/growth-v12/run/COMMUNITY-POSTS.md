# V12 private test: fans post Threads and Blogs from /community (2026-10-06)

Branch `v12/private-fixes`, not merged and not pushed. Everything is behind the flags
(`NEXT_PUBLIC_UX_V1`, `NEXT_PUBLIC_UX_V12`); the flags-off site is unchanged (parity below).
Built on what exists: `verse_threads`, `verse_discussions`, `verse_essays`, `verse_flags`,
`verse_banned_terms`, `lib/verse/moderation.ts` and the `/api/verse/*` routes. No new table for posts.

## What changed

| # | Ask | Done |
|---|-----|------|
| 1 | Editor | The 4 tabs (Debate, Challenge, Thread, Blog) for every signed-in fan, for every group and General K-pop, the Verse open or not. A thread or blog posted from /community carries `origin = 'community'`. A blog is published at once (`featured`, no curator, no space to join). One photo per thread or blog. Existing rate limits kept (threads and replies as before, blogs 10 an hour, photos 20 an hour). The /verse pages stay closed ("The Verse is being built"): the gate (`verseWriteGate`) lets through only POST create, reply, heart and report on community content (`lib/ux-v1/p8/community-write.ts`). |
| 2 | Banned words | 175 terms (en, fr, es, id, ko: sexual, NSFW, serious insults, slurs), action `block`. Checked on title, text and replies of threads, blogs, debates (vote comment) and challenges. Refusal: 422 `blocked_term`, message "This has words that are not allowed here (insults or sexual content). Edit them and try again. Nothing was posted." Whole words only (`lib/verse/banned-match.ts`). |
| 3 | NSFW photos | nsfwjs 4.4.0, its MobileNetV2 model shipped inside the package, on the TensorFlow.js CPU backend. No account, no subscription, no outside call. The photo is analysed on the server before it is stored; refused = 422 `nsfw_image`, nothing stored. Rule: Porn 0.6 or Hentai 0.6 or both together 0.7. "Sexy" alone never blocks (a STAYC concert photo scores Sexy 0.73). |
| 4 | Reports | The 3rd open report by 3 different accounts hides a thread, blog, debate, challenge or reply for everyone (status `hidden`, nothing deleted). One report per account per content (unique index, 409 "You already reported this."). Restore: `/admin/community-reports` (admins only, "Reports" in the admin bar). |
| 5 | Database | Additive SQL only, applied through the connector (below). |

## Timings of the photo check (measured)

| Where | Model load (once per instance) | One photo |
|-------|-------------------------------|-----------|
| Laptop | about 2.7 s | about 0.7 s |
| Vercel, cold instance | 2.5 to 2.7 s | 2.2 s (total about 4.9 s) |
| Vercel, warm instance (5 calls in a row) | 0 | 1.9 to 2.2 s (wall 2.1 to 2.7 s) |

Probe: `GET /api/ux-v1/p8/photo?probe=1` (private builds only, a built-in grey image, no write).
The function is capped at 30 s; the bundle fits the Vercel limits.

## Banned words: examples tested (`banned-match.test.ts`, the real terms from the SQL file)

- Blocked: `F U C K`, `f.u.c.k`, `fuuuuck`, `fvck`, `f*ck`, `p0rn`, `b!tch!`, `@sshole`,
  `NIQUE TA MERE`, `encule`, `maricon`, `kontolmu`, `씨 발`, `시1발`, `개새끼야`, `강간범`.
- Not blocked: class, assassin, Scunthorpe, therapist, "Sexy Love by T-ara", Hitchcock,
  Japan, Japanese, reputation, computadora, disputa, "PD Kim", spicy, Pussycat Dolls, rapeseed,
  `시발점에서`, `껌을 씹다`, `보지 마`, `자지 마`, "anjing lucu".
- Left out on purpose (too many false hits): pd, con, bite, pedo, chink, anjing, babi, 새끼, 미친,
  걸레, 보지, 자지, spic.

## Database (applied by me through the connector, writes authorized by the owner)

- File: `docs/pending-migrations/v12-community-posts.sql` (migration `v12_community_posts`).
  Adds `verse_threads.origin`, `verse_threads.cover`, `verse_essays.origin`; widens two checks
  (essay status `hidden`; report types thread, essay, debate, challenge, reply); the
  one-report-per-account index; table `community_autohidden` (the hide log, RLS on, no policy);
  the trigger `verse_flags_autohide`; 175 rows in `verse_banned_terms` (note `v12-community:*`).
  No existing row changed or deleted.
- Rollback: `docs/pending-migrations/v12-community-posts-rollback.sql`.
- Checked in the base: 175 terms, 4 new columns, trigger on. Trigger proved in a cancelled
  transaction: visible after the 1st and 2nd report, hidden after the 3rd, logged once,
  a 2nd report by the same account refused.
- Storage: photos in `verse-space-assets/community/<user>/<uuid>.jpg`, written by the server only.

## The 7 Verse items already in the base

All from the account `localdev` ("Local Dev (Owner)", created 2026-07-29), all BTS, July 2026:
threads 1, 2, 3, their 3 opening messages (discussions 3, 4, 5) and blog 2. They have no
`origin`, so they stay out of the /community feed until the owner decides.

## Checks

- `tsc`: 0 errors. `vitest`: 2040 / 2040. Route allowlist: green. Docs gate: green.
- e2e (`e2e/ux-v12/community-posts.spec.ts`, signed-in test user, 1440):
  thread with a photo, blog with a photo (no join step, no review call), banned word refused by
  the real route, NSFW refused by the real route with a simulated verdict (dev-only header
  `x-nsfw-simulate`, ignored in production; the picture is a safe group photo, never a real NSFW
  one), 3rd report hides the post (real base, only with `COMMUNITY_E2E_WRITES=1`). 5 / 5.
  Test rows left: threads 8 and 9 of the test account, status `removed`, reports dismissed.
- Flags-off parity (40 URLs, local build vs kpopquiz.org): only live data differs. Flags off,
  `/api/ux-v1/p8/photo` answers 404 and `/community` stays a 301.

## Deploy

Private only: `dpl_EvYUXM1swAJbJuoztVutR6VDXmmi`, alias https://kpopquiz-private.vercel.app.
kpopquiz.org is still on `dpl_CPRDSnFf57KbPGDzXnc4TxGk8X53`.
