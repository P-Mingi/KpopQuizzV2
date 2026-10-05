# AU3 audit: hubs, creators, community, editorial (2026-10-04)

## Progress
- Done: every feature of the AU3 scope checked on :3071 (or marked NOT checked with the reason).
- Counts (25 rows): 15 ok, 6 with an issue (AU3-001 and AU3-003 medium, AU3-002 medium-low, AU3-004 to 006 low),
  4 NOT checked.
- Blocker: the share-link test play was NOT made (no creator share link exists in production; see "Test writes").

## Method
- Target: ORCH's flag-on production build of the feat/v12 head on http://localhost:3071, production data.
- Browser sweep (`AU3-sweep.mjs`, scratchpad, Playwright with the cached headless shell): every page at 1440 and
  390 light, every non-GET request answered locally (wider than `guardWrites`: any host, server actions included),
  console errors, responses >= 400, broken images, sideways scroll, Team tags counted. Screenshots
  `run/audit/AU3/<name>-<width>.png` (local only).
- `e2e/ux-v12/g8.spec.ts` re-run against :3071 (`G8_EXPECT=v12`, guardWrites in every test, signed in only through
  the setup project).
- Read-only SQL through supabase-js with the service role (selects and head counts only).
- Normalisation: `/s/<code>` on :3071 redirects to `http://localhost:3021/api/share/click/<code>` because the build
  bakes `NEXT_PUBLIC_SITE_URL`; the sweep rewrites that host to :3071 (environment, not a product issue).
- Normalisation: every page logs one `SyntaxError: Unexpected token '<'`: `/_vercel/insights/script.js` is not served
  outside Vercel, the middleware 301s it to `/` and the browser runs the home HTML as a script (environment only).
- Normalisation: `/api/ranked/ladder` and `/api/ranked/me` answer 503 `not_live` (v11 behaviour: no ranked season
  has started); the Ranked tab says so. The two console lines come from those 503s.

## Feature table

Screenshots are under `run/audit/AU3/` as `<name>-1440.png` and `<name>-390.png`.

| # | Feature | URL(s) | Visible | Works | How checked | Screenshot | Issue |
|---|---|---|---|---|---|---|---|
| 1 | Ways to play, big hubs (2 to 4 tiles, only what exists) | `/stray-kids-quiz`, `/bts-quiz`, `/blackpink-quiz`, `/aespa-quiz`, `/seventeen-quiz` | yes | yes | sweep (tile hrefs and copy), g8.spec on :3071 (every tile answers 200) | `hub-*` | - |
| 2 | Fans picked section on the hubs | same | no | no | sweep, `GET /api/duel/fans-picked?group=bts`, SQL | `hub-bts-1440.png` | AU3-001 |
| 3 | Empty hub "Be the first" (real songs count, 3 templates, Create prefilled) | `/riize-quiz`, `/zerobaseone-quiz`, `/boynextdoor-quiz`, `/nct-dream-quiz` | yes | yes | sweep (copy, template hrefs), counts vs SQL (0 quizzes; 21, 21, 21, 18 songs) | `hub-riize-*` | AU3-002 at 390 |
| 4 | Thin hub nudge (real 60-day plays, fandom) | `/katseye-quiz` (2 quizzes, 202 plays), `/hearts2hearts-quiz` (1, 36) | yes | yes | sweep, g8.spec | `hub-katseye-*` | - |
| 5 | New groups' hubs | `/rescene-quiz` (empty, 10 songs), `/nct-wish-quiz` (empty, 25), `/kickflip-quiz` (3 quizzes, 10 songs), `/hearts2hearts-quiz` (thin, 16) | yes | yes | sweep, SQL counts | `hub-rescene-*`, `hub-nct-wish-*`, `hub-kickflip-*`, `hub-hearts2hearts-*` | AU3-005 (name casing, data) |
| 6 | "Play live" tile when it fits (live open) | `/katseye-quiz`, `/kickflip-quiz`, `/hearts2hearts-quiz` | yes | yes | sweep: `/live?playlist=<slug>&name=<name>` | `hub-kickflip-1440.png` | - |
| 7 | First creator line, editorial skipped with fallback | every non-empty hub | yes | yes | sweep (mapple, mina, roseeeyh, winny, carat, omgiamaeyekon, weflip, kicoer: none editorial) | `hub-*` | - |
| 8 | Editorial accounts out of hub rows (From the community, Fan knowledge) | hubs | n/a | yes | visible text search for the 9 usernames and display names: 0 hits | - | - |
| 9 | Share kit (link, QR, captions with fandom, challenge door) | create done | yes | yes | g8.spec share-kit on :3071 (publish and kit API answered locally), 4 runs green | `g8spec/` | AU3-003 |
| 10 | `/creators` this month, all time, rising, rules, tiers; noindex | `/creators` | yes | yes | sweep, g8.spec, server HTML grep (no editorial name) | `creators-*` | - |
| 11 | Leaderboard Fandom war tab | `/leaderboard` | yes | yes | tab click 1440 and 390 (30 rows) | `leaderboard-fandom-war-*` | - |
| 12 | Leaderboard Players tab (10 rows, no editorial) | `/leaderboard#players` | yes | yes | tab click, text search | `leaderboard-players-*` | - |
| 13 | Leaderboard Ranked tab | `/leaderboard#ranked` | yes | yes (not live) | tab click; API 503 not_live (normalised) | `leaderboard-ranked-*` | - |
| 14 | Leaderboard Creators tab (10 rows, link to `/creators`) | `/leaderboard#creators` | yes | yes | tab click, text search | `leaderboard-creators-*` | - |
| 15 | Quiz page by line and Made by box: Team tag, team avatar, no level (9 of 9 accounts) | `/q/<top quiz of each>` | yes | yes | sweep: 2 Team tags per page, "N quizzes · N plays" without a level | `q-<username>-*` | - |
| 16 | Quiz comments by an editorial account badged | quiz pages | - | - | SQL: 0 comments and 0 replies by them, 0 comments on their 155 quizzes | - | NOT checked (no data) |
| 17 | Profiles: Team tag and the editorial line, no level | `/u/<username>` x 9 | yes | yes | sweep: 1 Team tag + the note on 9 of 9 | `u-<username>-*` | AU3-004 (low) |
| 18 | Search People rows badged | `/search?q=soojinnie`, `?q=KpopProf`, `?q=twiceland` | yes | yes | sweep: Team tag on the row (by username and by display name) | `search-*` | - |
| 19 | Community feed, posts, replies: Team badge | `/community` | - | - | `editorial_posts` has 0 rows; the feed shows no editorial account | `community-*` | NOT checked (no data) |
| 20 | Notifications Team badge | bell, `/notifications` | - | - | needs a signed-in session with a notification from them | - | NOT checked |
| 21 | Editorial accounts absent from boards and lists | `/leaderboard` (4 tabs), `/creators`, `/blindtest/leaderboard`, `/`, `/new`, `/trending`, `/most-liked`, hubs, `/community` | n/a | yes | visible text of every page searched for the 9 usernames and display names: 0 hits | - | - |
| 22 | `/admin/editorial` gate (no session) | `/admin/editorial` | n/a | yes | redirect to `/login?returnTo=%2Fadmin%2Feditorial` | `admin-editorial-*` | - |
| 23 | `/admin/blind-tests/runs` gate (no session) | `/admin/blind-tests/runs` | n/a | yes | redirect to `/login?returnTo=...` | `admin-bt-runs-*` | - |
| 24 | Quiz play from a creator share link (`/s/<code>`) | `/s/<code>` | - | - | `dev_share_links` has 0 rows | - | NOT checked (Test writes) |
| 25 | Hub counts consistent (legacy intro) | `/katseye-quiz` | yes | partly | intro "3+ tests", "272 plays", About "3 quizzes" vs 2 listed | `hub-katseye-1440.png` | AU3-006 (low, v11) |

## Issues

### AU3-001 (medium) Fans picked never shows, though three groups have enough votes
- Expected: the hub section "<Fandom> picked" (and the This or that tile) on groups whose song question passed its
  floor: aespa 2,262 votes, BLACKPINK 1,282, BTS 1,160 (`duel_votes` on active song questions; `min_votes` 500).
- Actual: hidden on every hub; `GET /api/duel/fans-picked?group=bts` answers `ranked: false, songs: []`;
  `duel_song_rankings` has 0 rows.
- Evidence: `hub-bts-1440.png`, `hub-aespa-1440.png`, read-only SQL (counts above).
- Suspected cause: the ranking is written only by the nightly `/api/cron/fans-picked` (`vercel.json` L62), which
  never ran on this data: on production it answers 404 while `NEXT_PUBLIC_UX_V12` is off, and nobody ran it after
  the G7 SQL. The hub hides it correctly (`lib/ux-v1/p3/growth-data.ts` L155). Owner: G7 / ORCH (run the cron once
  when the flag goes on, or a first ranking as an owner step).

### AU3-002 (medium-low) Sideways scroll at 390 on empty hubs with a long name
- Expected: no horizontal scroll at 390.
- Actual: `/zerobaseone-quiz` and `/boynextdoor-quiz` at 390: the button "Create the first ZEROBASEONE quiz" ends at
  x = 393, so the page scrolls sideways. RIIZE, NCT DREAM, RESCENE, NCT WISH fit.
- Evidence: `hub-zerobaseone-390.png`, `hub-boynextdoor-390.png`; probe `A.ux-btn.ux-btn-primary.ux-btn-lg r=393`.
- Suspected cause: `components/group/ux-v1/hub-growth.tsx` L61 (`UxButton size="lg"`, label does not wrap) inside
  `.g8-fcreate-a` (`styles/ux-v12/g8.css` L13, L113). Owner: G8. Idea: let the label wrap, or a shorter label
  under 400px.

### AU3-003 (medium) "Plays from your link" can never move
- Expected (SYSTEM.md 5.4): the share kit shows the live count of plays that came through the creator's link.
- Actual: `v12-g8-share-link-plays.sql` is applied (table present, 0 rows), so `readLinkPlays`
  (`lib/creators/link-plays.ts` L79) now answers a number instead of null and the kit will show "0 plays"; but
  nothing writes the table: G8 requests R1 (cookie in `app/api/share/click/[code]/route.ts`) and R2
  (`recordLinkPlay` after `record_play` in `app/api/quiz/[id]/play/route.ts`) were never implemented
  (`recordLinkPlay` has no caller, the click route sets no cookie). The number would stay 0 for ever (rule 7).
- Evidence: grep of `recordLinkPlay` and `LINK_COOKIE` in `apps/quiz/src` (the lib only); `share_link_plays` 0 rows.
- Owner: ORCH (R1, R2 are in files nobody owns, `run/requests/G8.md`). Until then the line should stay hidden.

### AU3-004 (low) Editorial profiles still show fan stats
- `/u/<username>` of the 9 accounts shows "0 days streak", "0 groups mastered" and a Badges tab ("Soojin has no
  badges yet") under the editorial line; bios are in a fan voice ("girl group enthusiast. deep trivia lover.",
  "been here since 2nd gen. I quiz everything."). SYSTEM.md 5.6: never pose as fans, no streak, no badge. Level is
  gone; streak, mastered and badges remain. Evidence: `u-soojinnie-1440.png`, `u-kpophistory-1440.png`.
  Owner: F2 (passport, `/u/[username]`); bios are data (owner).

### AU3-005 (low, data) Group name casing "Hearts2hearts"
- Hub H1, tiles and nudge read "Hearts2hearts" (`groups.name`, id 91, a row older than v12); the group writes it
  Hearts2Hearts. Its `fandom_name` (and KickFlip's) is "fan", correctly treated as none by `realFandomName`.
  Owner: data, owner decision (the H1 is an SEO field).

### AU3-006 (low, v11 code, same on main) KATSEYE hub counts disagree
- Intro "play 3+ free tests ... 272 plays" and About "3 free fan-made KATSEYE quizzes" vs 2 published quizzes (list,
  v12 tile, nudge). `groups.quiz_count` = 3 is a stale stored counter. Not v12.

## Test writes
- Allowed: one guest quiz play from a creator share link (`/s/<code>`). NOT made. Reason: `dev_share_links` has
  0 rows in production (read-only count; `dev_share_clicks` 0, `share_link_plays` 0), so no creator share code
  exists to start from. Minting one needs `POST /api/share/generate` signed in (a write to `dev_share_links`
  outside the allowance). Even with a code, R1 and R2 are not wired (AU3-003): the play would land in `plays`
  (and the click route would write `dev_share_clicks` and update `dev_share_links`), never in `share_link_plays`.
- Rows created by AU3: none. Every other mutating request of every page was answered locally (0 were attempted
  on the anonymous sweep; g8.spec answered its publish and generate calls locally).
- Owner decision: allow AU3 (or the owner) to create one share link from the test account, after R1 and R2 land.

## NOT checked
- Comment and reply badges (no comment by or on the 9 accounts), community feed and post badges (`editorial_posts`
  0 rows), notifications (signed in), the share-link play (above). Dark mode only through g8.spec (green).

## Re-check after F6 (AU4, 2026-10-04)

Target: ORCH's flag-on production build of the feat/v12 head e00e8f4 (F6a, F6b, F6c, F6d merged) on
http://localhost:3071, production data, light scheme, 1440x900 and 390x844 (Playwright headless shell 1234).
Every mutating request was answered locally; the only POST that reached the server is the read-only
`/api/blind-test/generate` (it reads `songs` and Deezer). 0 production write. Read-only SQL with the service role
(selects only). Screenshots: `run/audit/AU3/recheck/` (local only). Scratch scripts and raw JSON: the session
scratchpad (`au4-run.mjs`, `au4-sweep.mjs`, `au4-genprobe.mjs`, `au4-db.mjs` and their `.json`).

| # | Re-check | Result | Evidence |
|---|---|---|---|
| 1 | KPDH songs show no cover anywhere; other songs keep theirs (AU1 I1) | pass | below |
| 2 | kpop-legends and title-tracks play as named (AU1 I2) | pass | below |
| 3 | No sideways scroll at 390 on the 4 empty hubs (AU3-002) | pass | below |
| 4 | Editorial profiles: Team badge, no streak, no groups mastered, no badges; normal profile unchanged (AU3-004) | pass | below |
| 5 | Regression of every feature AU1, AU2, AU3 marked ok | pass, 90 of 90 URLs | below |

### 1. KPop Demon Hunters covers (rule 10)
- Theme page `/blindtest/kpop-demon-hunters` and its track list: 0 `<img>` at 1440 and 390, 0 Deezer image
  (`i1-blindtest_kpop-demon-hunters-{1440,390}.png`). Hub `/blindtest` (Playlists rail): 6 images, all idol photos,
  0 Deezer image (`i1-blindtest-*.png`). `/blindtest/group-twice` track list: 0 image.
- KPDH run, 1440 and 390: 10 of 10 questions with `album_cover_medium`, `album_cover_big` and `reveal.cover` all
  null; 10 of 10 reveals show the typographic `span.p6-cv`, 0 `img`; results "Your songs" 10 of 10 rows
  `span.p6-scv` (`d-run-kpdh-reveal-kpdh{1,2}.png`, `d-run-kpdh-results.png`, `m-run-kpdh-*`).
- TWICE group run (`/blindtest/group-twice`), 1440 and 390: each run drew both TWICE KPDH songs (Strategy,
  TAKEDOWN): those 2 reveals and 2 result rows have no cover; the other 8 reveals and 8 rows show their loaded
  cover (`d-run-twice-a1-reveal-kpdh{1,2}.png`, `d-run-twice-a1-results.png`, `m-run-twice-a1-*`). TWICE's
  own "Strategy (feat. Megan Thee Stallion)" is a different track, not in the 12, and keeps its cover (correct).
- All K-pop runs (`/blindtest` Start, 3 at 1440 + 1 at 390): 40 of 40 reveals and rows with a loaded cover. No
  KPDH song was drawn in a browser All K-pop run (2 eligible songs in a pool of thousands).
- Generate probe (read only, count 15): `twice` 25 calls, 50 KPDH questions, 0 with any cover field, 325 other
  questions, 0 without a cover; `all` 15 calls, 225 questions, 0 without a cover, 0 KPDH drawn.
- Not re-checked live: daily blindtest, ranked and the Verse song page (F6d, unit tests only: calling them
  writes production or needs a session).

### 2. Named modes
- Served HTML: `/blindtest/kpop-legends` "Play 10 songs from K-pop legends", `/blindtest/title-tracks` "Play 10
  songs from Title tracks only". Generate bodies: `playlist: "kpop-legends"` and `"title-tracks"`.
- Runs at 1440 and 390 plus 3 probe calls each, read back with SQL: legends 46 distinct songs, years 2008 to
  2017, 0 after 2017, 0 null year; title tracks 26 distinct songs, 26 of 26 `is_title_track = true`. Every
  question carries a cover (`d-run-legends-*`, `m-run-legends-*`, `d-run-titletracks-*`, `m-run-titletracks-*`).

### 3. Empty hubs at 390
- `/zerobaseone-quiz`, `/boynextdoor-quiz`, `/riize-quiz`, `/nct-dream-quiz`: `scrollWidth` 390 at 390 and 1440
  at 1440, no sideways scroll; the Create button wraps on two lines ("Create the first / ZEROBASEONE quiz")
  (`i3-<hub>-{390,1440}.png`).

### 4. Editorial profiles
- The 9 `/u/<username>`, 1440 and 390: 1 Team tag and the editorial note, stats "quizzes made" and "plays
  received" only, one tab (Quizzes); the words streak, groups mastered and badges are absent; no level
  (`i4-u_<username>-{1440,390}.png`). Bios in a fan voice remain (data, owner decision, as AU3-004 said).
- `/u/testtest`: unchanged, tabs Overview, Quizzes, Badges, streak, groups mastered and level shown, no Team tag.
  At 390 a stat row inside its passport is wider than the viewport (r=489) but clipped: page `scrollWidth`
  stays 390 (no sideways scroll); fan profile code is untouched by F6c.

### 5. Regression pass (1440, one load each)
- 90 URLs: AU1 (hub, 4 landings, 5 themes, recent-hits, 4th-gen-gg/bg, 4 new group modes, `/live`, `/join`),
  AU2 (15 Which member, KPDH quiz, 17 Name them all, 4 quiz pages with This or that), AU3 (14 hubs, `/creators`,
  `/leaderboard`, 9 editorial quiz pages, 3 searches, `/blindtest/leaderboard`, `/`, `/new`, `/trending`,
  `/most-liked`, `/community`, 2 admin gates).
- 90 of 90: status 200, `main` visible, 0 page error, 0 broken image, 0 sideways scroll, 0 unexpected console
  error, 0 mutating request attempted. The 2 admin gates redirect to `/login?returnTo=...` as before.
  Normalised as in the audits: the `/_vercel/insights` SyntaxError and `/api/ranked/me` 503 on `/blindtest`.
- Screenshots `reg-<path>-1440.png` (viewport only). Interactions (plays, tabs, votes) were not replayed.

### NOT verified
- A KPDH song inside a browser All K-pop run (not drawn; the generate path is the same as TWICE's, proven).
- Daily, ranked, Verse song page, legacy player covers (live calls write or need a session).
- Share link plays (AU3-003, F6b): still no creator share link in production; unit tests only.
- Dark mode; the regression pass at 390.
- Probe note: two probe calls were invalid on my side (`girl-groups` is not a playlist id; KPDH has 12 songs, so
  count 15 is refused with "Not enough songs"); they are excluded from the numbers above.
