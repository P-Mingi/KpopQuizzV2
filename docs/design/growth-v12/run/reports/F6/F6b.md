# F6b: hubs and share links

Progress: done. Branch `v12/f6b-hubs` (from feat/v12 d251d8e). Next: none. Blockers: none.

| Item | Commit (owner) | Test |
|---|---|---|
| 1. AU3-002, no sideways scroll at 390 on the empty hubs | 7613f42 (G8) | `F6b-hub-probe.mjs` on dev :3068, both flags on: 6 empty hubs x 390/1440 x light/dark = 24 rows, 0 sideways, Create button right edge 349 at 390 (was 393). `F6b/probe.json`, screenshots `F6b/*.png` |
| 2. AU3-003, G8 R1 (cookie on the share click) | cddd1ac (F6) | `api/share/click/[code]/route.test.ts`, 5 tests |
| 2. AU3-003, G8 R2 (share_link_plays row from the play route) | cddd1ac (F6) | `api/quiz/[id]/play/route.test.ts`, 7 tests |

Whole app: tsc green, vitest 93 files, 1918 tests green. No em or en dash in the touched files.

## What changed
- `styles/ux-v12/g8.css`: under 760px the empty hub's Create button takes the column width and its label wraps
  (long names like ZEROBASEONE, BOYNEXTDOOR now render on two lines). The sheet is served only with the v12 flag.
- Click route: after the existing redirect is built, only when `isUxV12()`, the quiz was found and the code has the
  share code shape, sets `kq_sl=<code>` (httpOnly, Secure, SameSite=Lax, Path=/, Max-Age 86400). No new query.
- Play route: after `record_play` succeeded (and after the anon stamp), only when `isUxV12()`, reads `kq_sl` and
  awaits `recordLinkPlay(service role, {code, quizId, playerId, anonId, isTest: VERCEL_ENV !== 'production'})`.
  The lib skips another quiz, an unknown code and the link's owner, never throws (plus a `.catch`), and answers
  `not_live` without the table. The response body is built as before.

## Flag-off proof
- Click route test: flag off, no `set-cookie`, same location and the same two writes as today.
- Play route test: flag off with the cookie present, `request.cookies.get` is never called, no `dev_share_links` or
  `share_link_plays` access, the response equals the no-cookie response.
- g8.css: v12 sheets are appended by the stylesheet route only with the flag (`lib/ux-v1/a0/stylesheet.ts`).

## NOT verified
- No live click or play against the dev server: `/api/share/click/<code>` writes on GET (`dev_share_clicks`,
  `dev_share_links` counters) and the play route writes `plays`, so a real run would write production. No
  Playwright e2e was added for item 2: answering both requests locally would prove nothing about the server code,
  and no `e2e/ux-v12/f6*` path is owned. The route handlers themselves are exercised end to end with fake stores.
- The share kit's "plays from your link" line moving in production: needs one real share link (AU3 owner decision).
- Item 1 at widths other than 390 and 1440, and the flag-off view (the empty hub section does not exist then).
