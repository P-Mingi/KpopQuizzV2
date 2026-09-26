# C2 backend check (UX v11.2 run, Phase 3, loop 1)

Checker: C2 (backend). Branch `ux11/c2-check`. Target: the shared flag-on production build of
`feat/ux-v1-v11` served by ORCH on http://localhost:3021 (48189d5 at spawn, rebuilt at dcc3159 with P8
merged; every page probe below ran on dcc3159). Flag off: my own `next dev` of the same head on :4202
with `NEXT_PUBLIC_UX_V1=0`. Flag-on dev (nested route check, Verse-hidden check): `next dev` on :4202
with `NEXT_PUBLIC_UX_V1=1` (and `VERSE_PUBLIC=false` for the hidden-Verse run). Every dev server was
stopped after use; :3021 was never started or stopped by C2.

## Method

- One file per WIRING-MAP row (old tables + v10 + v11), corrected by WIRING-MAP.verified.md:
  `R<line>.md`, row id = the row's line number in WIRING-MAP.md (the run already cites rows by line).
- Controls triggered in headless Chromium 1234 as a guest and as the test user (the Playwright `setup`
  project storage state), with a copy of `guardWrites`: every POST/PUT/PATCH/DELETE to /api/** or Supabase
  is answered locally with 200 {} and recorded (the payload is the write evidence); reads go through and
  are logged with their status. No production write was sent by a page.
- Database side: read-only `select` through supabase-js with the service role, limited to the test user's
  rows, head counts, or public board rows. Never insert / update / delete / rpc.
- Fail-soft probes: a POST was sent to a route only after reading its code and proving (read-only select)
  that it answers before any write for that body (validation, auth, a missing table or bucket, a zero-row
  update on a missing column): P8 like / debates / debate-vote / challenges / replies (503), P3 notify
  (401 / 503), P4 relaxed (403 / 503), P10 header upload / link (400 / 401 / 503), ranked run / start /
  answer / submit (503), P6 challenge create with invalid bodies (400).
- Never loaded signed in: /me, /profile. Passports were checked as a guest on /u/testtest and /u/mingi.
- Flag off: every endpoint added since main answers 404 except /api/quizzes/count (C2-001); the new pages
  301 or 404; 16 flag-off pages (guest) and 9 (test user) send no request to a v11 endpoint.
- Data guard before and after (`proofs/data-guard-diff.md`: every count only grew, from site traffic) and
  the test user's own rows (`proofs/test-user-after.txt`: unchanged).

## Must-prove list (C2.md)

| Item | Result | Where |
|---|---|---|
| QOTD = the stored pick with its real average, truthful label while rotation is stopped | PASS: replay index 100 % 84 = mamamoo-the-curtain-call-era (picked 2026-04-21), 71% = 50 / 7 / 10, "Replay of the April 21 pick", same pick as /daily | R362 |
| Ticker lines are real recent activity | PASS: every line is an activity_events row (14 of 14 ids exist) | R364 |
| Filters and counts on /quizzes and /groups | /groups PASS (90 listed, 46 muted + 1 quarantine = 47 with 0 published, 10 most-played counts = published counts); hub sorts ALL SAME; /quizzes PENDING (P2 not merged) | proofs/groups-index.txt, R192, R061 |
| Blindtest playlists = 79 groups | PASS: 79 in the menu, 79 links in the HTML, 79 recomputed | R261, R366 |
| Daily one try | PASS: UNIQUE (date, user_id) + ON CONFLICT DO NOTHING; p6.spec on :3021 | R349 |
| Ranked math (20+ table cases), season / tier / division, limits, token replay | PASS at unit level (233 ranked tests: scoring 63, tiers 49, season 17, limits 8, run + service replay cases); every /api/ranked/* route answers 503 before any write | R294, R298, R369 |
| Comment like toggles once per user | NOT VERIFIED until v11-p8-community.sql: 503 before any write; PK (target_type, target_id, user_id) + delete-or-upsert toggle | R370 |
| Debate vote once | PASS (daily debate: UNIQUE (date, user_id), payload {side}); fan debates pending (PK (debate_id, user_id)) | R171, R373 |
| Flair saved (payload) and shown on posts, comments, hall of fame | PASS: update-profile payload = changed fields only; shown on the hall of fame, quiz comments and passports (community posts are editorial today) | R376, R371 |
| Header upload and link: type, size, SSRF block, 503 fail-soft | NOT VERIFIED until v11-p10-header-storage.sql; 400 not_https / private_address, 401, 503 bucket_missing before any fetch or write; 158 P10 unit tests | R374, R375 |
| Badge rarity mapping | PASS: rarity words = lib/badges.ts badgeRarity() | R211 |
| Sign-in returns to the action | PASS: redirect_to = /auth/callback?returnTo=<same path>; the test user back with the pending action -> the page posted /api/follow by itself | R311, R333 |
| Streak rule (spec: any quiz or blindtest) vs the live rule | The live rule is kept (daily quiz + daily blindtest only; owner decision 12); pill and P11 copy truthful; the home header line is not (C2-002) | R332, R363 |
| Notifications mark read (payload) | PASS: {} and {ids:[id]}; dismiss DELETE {id}; mute prefs {muteQuiz} | R238, R239 |
| Nested challenge attempt routes (P4, P6) | PASS on the production build and on a flag-on dev server: the routes' own JSON (400 invalid_json / 404 not_found + no-store), not Next's HTML 404 | proofs/nested-routes-*.txt |
| Verse gate (P8) | PASS: bts only while public; with VERSE_PUBLIC=false no Verse item, Blogs tab and composer gone, thread / blog URLs 404; parked case = unit tests (no parked row exists) | R167 |

## Findings filed (v11/issues)

- C2-001 (A0): /api/quizzes/count answers 200 with the flag off.
- C2-002 (P1): signed-in home header says any quiz or blindtest starts / keeps the streak (not the real rule).
- C2-003 (P4): results lost the Discord line and the Brag button (/api/discord/flex).
- C2-004 (P1): Continue playing hides a saved run when its quiz is also listed on the home.
- C2-005 (P1): home links parked Verse spaces that answer 404 (carried from the live strip).
- C2-006 (P3): hub "Explore the <fandom> space on Verse" links 404 for parked spaces (carried, owner decision 21).
- C2-007 (P3): empty community state "Start the first thread" cannot be done for non-BTS groups.

Live-site note for ORCH (not a v11 file, not filed to an owner): `/auth/callback` redirects to `returnTo`
without checking it stays on the site (`new URL(returnTo, request.url)`), an open redirect after sign-in.

## Environment notes (local only)

- Every page logs `Unexpected token '<'`: Vercel Analytics loads `/_vercel/insights/script.js`, which a
  local `next start` does not serve (it answers the page HTML). Vercel serves it; not a product bug.
- Flag-off dev pages log a hydration mismatch as a guest (dev only, flag-off code).

## Verdicts

PASS, FAIL (issue filed in `v11/issues/<owner>.md`), NOT VERIFIED (why: a pending migration, owner
decision 1 for real writes, or /me), PENDING (P2 not merged: /quizzes rows), N/A (dropped by design,
client-only display, or not in the v11 prototype).

`gen.mjs` builds the row files and this README from `rows/*.json`.
