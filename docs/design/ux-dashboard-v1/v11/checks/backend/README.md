# C2 backend check (UX v11.2 run, Phase 3, loop 1)

Checker: C2 (backend). Branch `ux11/c2-check`. Target: the shared flag-on production build of
`feat/ux-v1-v11` served by ORCH on http://localhost:3021 (48189d5 at spawn, rebuilt at dcc3159 with P8
merged; every row below that cites a :3021 proof taken after 16:00 UTC is on dcc3159). Flag off: my own
`next dev` of the same head on :4202 with `NEXT_PUBLIC_UX_V1=0` (stopped after use). Flag-on dev (for the
nested route check only): `next dev` on :4202 with `NEXT_PUBLIC_UX_V1=1`.

Method (C2.md + CHECKERS.md):
- Each WIRING-MAP row (old tables + v10 + v11), corrected by WIRING-MAP.verified.md, has one file
  `R<line>.md` (row id = the row's line number in WIRING-MAP.md, as the run already cites rows).
- Controls are triggered in headless Chromium 1234 (guest, and the test user through the Playwright
  `setup` project storage state) with a copy of `guardWrites`: every POST/PUT/PATCH/DELETE to /api/** or
  Supabase is answered locally with 200 {} and recorded; its payload is the write evidence. Reads go
  through and are logged with their status. No production write was sent.
- Database side: read-only `select` through supabase-js with the service role (`c2tmp/q.mjs`, scratch,
  not committed), limited to the test user's rows or to head counts. Never insert/update/delete/rpc.
- Pages never loaded signed in: /me, /profile (write on view).
- Fail-soft routes that need an unapplied migration are probed with a body that passes validation, only
  after a read-only check that the table does not exist (so no write is possible): they must answer 503
  before any write. Verdict for such rows: "NOT VERIFIED until <migration>" with the fail-soft proof.
- Flag off: every endpoint added since main answers 404 (one exception filed: C2-001), the new pages are
  301/404, and flag-off pages send no request to a v11 endpoint (`proofs/flag-off-*`).
- Data guard before and after (`proofs/data-guard-before.json`, `proofs/data-guard-after.json`).

Verdicts: PASS, FAIL (issue filed in `v11/issues/<owner>.md`), NOT VERIFIED (why), PENDING (P2 not merged:
/quizzes rows), N/A (dropped by design).

`gen.mjs` builds the row files and this README from `rows/*.json`.

## Counts

| Verdict | Rows |
|---|---:|
| PASS | 187 |
| FAIL | 9 |
| NOT VERIFIED | 33 |
| PENDING | 7 |
| N/A | 31 |
| TODO | 0 |
| Total | 267 |

## Rows

| Row | Owner | Control | Map status | Verdict | Issue |
|---|---|---|---|---|---|
| [R023](R023.md) | A0 | Sidebar Dashboard | EXISTS | PASS | - |
| [R024](R024.md) | A0 | Sidebar Quizzes + count 419 | EXISTS | FAIL (flag off only: C2-001); the control itself passes (link; the count is dropped by design) | C2-001 |
| [R025](R025.md) | A0 | Sidebar Blindtest | EXISTS | PASS | - |
| [R026](R026.md) | A0 (link) / P8 (page) | Sidebar Community | NEW | PASS | - |
| [R027](R027.md) | A0 | Sidebar Leaderboard | EXISTS | PASS | - |
| [R028](R028.md) | A0 | Sidebar Create | EXISTS | PASS | - |
| [R029](R029.md) | A0 | Sidebar user row (name, streak) | EXISTS | PASS | - |
| [R030](R030.md) | A0 (overlay) / P11 (results) | Top search | EXISTS | PASS | - |
| [R031](R031.md) | A0 | Streak pill "12 days" | EXISTS | PASS (streak 0 case); NOT VERIFIED live for a streak > 0 (needs a daily play = a production write, owner decision 1) | - |
| [R032](R032.md) | A0 | Night mode toggle | NEW | PASS | - |
| [R033](R033.md) | A0 (bell) / P11 (panel) | Bell + unread dot | EXISTS | PASS | - |
| [R034](R034.md) | A0 | Avatar button | EXISTS | PASS | - |
| [R035](R035.md) | A0 | Mobile bottom nav (5) | EXISTS | PASS | - |
| [R036](R036.md) | A0 | Footer links | EXISTS | PASS | - |
| [R037](R037.md) | A0 | UX notes drawer | drop | N/A (dropped by design) | - |
| [R043](R043.md) | P1 | Greeting "Good evening, Mingi" | EXISTS | PASS | - |
| [R044](R044.md) | P1 | Hero "Today's Ten" daily challenge | PARTIAL | PASS | - |
| [R045](R045.md) | P1 | "Play now" | EXISTS | PASS | - |
| [R046](R046.md) | P1 | "Daily blindtest" | EXISTS | PASS | - |
| [R047](R047.md) | P1 (home) / P4 (store) | Keep playing (resume rows, progress %) | NEW | PASS (see R334) | - |
| [R048](R048.md) | P1 | Keep playing stats (streak, best BT, rank) | PARTIAL | N/A (not in the v11 home) | - |
| [R049](R049.md) | P1 | Groups of the moment rail (NEW badge) | EXISTS | PASS | - |
| [R050](R050.md) | P1 | Trending this week grid + arrows | EXISTS | PASS | - |
| [R051](R051.md) | P1 | New quizzes grid | EXISTS | PASS | - |
| [R052](R052.md) | P1 | All time best grid | EXISTS | PASS | - |
| [R053](R053.md) | P1 | From the community (3 rows) | PARTIAL | FAIL (C2-005, carried from the live home); the debate and Verse rows pass | C2-005 |
| [R054](R054.md) | P1 | Blindtest panel (Classic, Daily, By group) | EXISTS | PASS | - |
| [R055](R055.md) | A0 (card) / P1 | Quiz card (any) | EXISTS | PASS | - |
| [R061](R061.md) | P2 | Sort tabs Trending / Newest / Most played / Top rated | EXISTS | PENDING (P2 not merged: waiting for the owner's push of ux11/p2-quizzes) | - |
| [R062](R062.md) | P2 | Type chips (5) | EXISTS | PENDING (P2 not merged) | - |
| [R063](R063.md) | P2 | Level chips | EXISTS | PENDING (P2 not merged) | - |
| [R064](R064.md) | P2 | Group rail | EXISTS | PENDING (P2 not merged) | - |
| [R065](R065.md) | P2 | Infinite grid | EXISTS | PENDING (P2 not merged) | - |
| [R066](R066.md) | P2 | SEO landing pages (`/easy-kpop-quizzes`, `/hard-kpop-quizzes`, `/kpop-true-or-false`, `/most-liked`, `/new`, `/trending`, `/quizzes/popular-*`) | EXISTS | PENDING (P2 not merged) | - |
| [R072](R072.md) | P4 | Breadcrumb Quizzes > Group > quiz | EXISTS | PASS | - |
| [R073](R073.md) | P4 | Cover, tags (type, difficulty, language) | EXISTS | PASS | - |
| [R074](R074.md) | P4 | Title H1 | EXISTS | PASS | - |
| [R075](R075.md) | P4 | Author row + level title | EXISTS | PASS | - |
| [R076](R076.md) | P4 | Follow | EXISTS | PASS (payload + read state); DB effect NOT VERIFIED (owner decision 1) | - |
| [R077](R077.md) | P4 | Meta: plays, questions, 15s per question, likes | EXISTS | PASS | - |
| [R078](R078.md) | P4 | Start quiz | EXISTS | PASS | - |
| [R079](R079.md) | P4 | Challenge a friend (battle link) | PARTIAL | PASS (payload + read route against a real row); DB write NOT VERIFIED (owner decision 1) | - |
| [R080](R080.md) | P4 (A0 ShareSheet) | Share Reddit / Discord / X / copy | EXISTS | PASS (payload); DB effect NOT VERIFIED | - |
| [R081](R081.md) | P4 | About text (avg %, perfect count) | EXISTS | PASS | - |
| [R082](R082.md) | P4 | In this quiz (sample questions, answers hidden) | EXISTS | PASS | - |
| [R083](R083.md) | P4 | Did you know + "Learn before you play" | EXISTS | PASS | - |
| [R084](R084.md) | P4 | More group quizzes | EXISTS | PASS | - |
| [R085](R085.md) | P4 | Stats card (6) | EXISTS | PASS | - |
| [R086](R086.md) | P4 | Hall of fame top 5 + times | EXISTS | PASS | - |
| [R087](R087.md) | P4 | Your best + Beat it | EXISTS | PASS | - |
| [R088](R088.md) | P4 | Made by card | EXISTS | PASS | - |
| [R089](R089.md) | P4 | Report | EXISTS | PASS (payload); DB effect NOT VERIFIED (owner decision 1) | - |
| [R090](R090.md) | P4 | Owner actions (edit) | EXISTS | NOT VERIFIED (the test user owns no quiz) | - |
| [R096](R096.md) | P4 | Quit | EXISTS | PASS | - |
| [R097](R097.md) | P4 | Group tag, progress, counter, score pill | EXISTS | N/A (client state, no backend) | - |
| [R098](R098.md) | P4 | Sound toggle | PARTIAL | PASS | - |
| [R099](R099.md) | P4 | Streak dots + fire badge | EXISTS | N/A (client state, no backend) | - |
| [R100](R100.md) | P4 | Timer ring 15s warn/danger | EXISTS | PASS | - |
| [R101](R101.md) | P4 | Answers A-D, correct/wrong/dimmed | EXISTS | PASS | - |
| [R102](R102.md) | P4 | Image / intruder / clues variants | EXISTS | PASS | - |
| [R103](R103.md) | P4 | Fun fact card | EXISTS | N/A (client display, no backend) | - |
| [R104](R104.md) | P4 | Next / See results | EXISTS | PASS | - |
| [R105](R105.md) | P4 | Keyboard 1-4 / Enter | NEW | PASS | - |
| [R106](R106.md) | P4 | Per-question times | EXISTS | PASS (payload); DB effect NOT VERIFIED (owner decision 1) | - |
| [R107](R107.md) | P4 | Animations (pulse, shake, pop) | PARTIAL | N/A (CSS only) | - |
| [R113](R113.md) | P4 | Photocard (score count-up, bar, percentile, mascot, verdict, serial) | EXISTS | PASS (render from the run); percentile NOT VERIFIED live (comes from a real save response, owner decision 1) | - |
| [R114](R114.md) | P4 | Confetti on pass | EXISTS | N/A (client only) | - |
| [R115](R115.md) | P4 | Share this card | EXISTS | PASS (payload); DB effect NOT VERIFIED | - |
| [R116](R116.md) | P4 | Play again | EXISTS | PASS | - |
| [R117](R117.md) | P4 | Discord line / Brag | EXISTS | FAIL (C2-003) | C2-003 |
| [R118](R118.md) | P4 | Run ledger You/Avg/Pass/XP/Time | EXISTS | PASS | - |
| [R119](R119.md) | P4 | Your rank on this quiz | EXISTS | PASS (signed in); guest rank line NOT VERIFIED until v11-p4-rank-for-score.sql | - |
| [R120](R120.md) | P4 | Like | EXISTS | PASS (payload + read state); DB effect NOT VERIFIED | - |
| [R121](R121.md) | P4 | Saved to passport / Put my name on it | EXISTS | PASS (signed in 'Saved to your passport'; guest sheet); claim after a real sign-in NOT VERIFIED (no other sign-in allowed) | - |
| [R122](R122.md) | P4 | Level up overlay | EXISTS | NOT VERIFIED live (needs a real save response with leveled_up, owner decision 1) | - |
| [R123](R123.md) | P4 | Keep playing list | EXISTS | PASS | - |
| [R124](R124.md) | P4 | Share row | EXISTS | PASS | - |
| [R125](R125.md) | P4 | Comments (200 chars, score chip) | EXISTS | PASS (payload + list); DB effect NOT VERIFIED | - |
| [R126](R126.md) | P4 | Reactions | EXISTS | N/A (map wrong: no live control) | - |
| [R127](R127.md) | P4 | Beat my score (battle link) | PARTIAL | PASS (payload); DB effect NOT VERIFIED | - |
| [R128](R128.md) | P4 | Streak backup nudge | EXISTS | PASS (mounted); NOT VERIFIED visually | - |
| [R129](R129.md) | P4 | Report | EXISTS | PASS (payload); DB effect NOT VERIFIED | - |
| [R135](R135.md) | P5 | Autosave chip | EXISTS | PASS | - |
| [R136](R136.md) | P5 | Stepper 1/2/3 | EXISTS | N/A (client state, no backend) | - |
| [R137](R137.md) | P5 | Title (5+) + counter | EXISTS | PASS | - |
| [R138](R138.md) | P5 | About 280 | EXISTS | PASS | - |
| [R139](R139.md) | P5 | Quiz type cards (5) | EXISTS | PASS | - |
| [R140](R140.md) | P5 | Group search with chip | EXISTS | PASS | - |
| [R141](R141.md) | P5 | Difficulty segments | EXISTS | PASS | - |
| [R142](R142.md) | P5 | Language | EXISTS | PASS | - |
| [R143](R143.md) | P5 | Cover + rights checkbox | EXISTS | NOT VERIFIED by C2 live (upload = production write); p5.spec records the multipart POST | - |
| [R144](R144.md) | P5 | Start adding questions | EXISTS | PASS | - |
| [R145](R145.md) | P5 | Question list (drag, expand, duplicate, delete) | EXISTS | PASS (unit parity 59/59) | - |
| [R146](R146.md) | P5 | Answers with circle marker, TF, clues, image labels | EXISTS | PASS | - |
| [R147](R147.md) | P5 | Fun fact | EXISTS | PASS (checklist counts it) | - |
| [R148](R148.md) | P5 | Add an image per question | EXISTS | NOT VERIFIED by C2 live (upload); p5.spec | - |
| [R149](R149.md) | P5 | Add a question | EXISTS | PASS | - |
| [R150](R150.md) | P5 | Paste several at once | NEW | PASS | - |
| [R151](R151.md) | P5 | Preview | NEW | N/A (not in the v11 prototype) | - |
| [R152](R152.md) | P5 | Done -> Publish step | EXISTS | PASS | - |
| [R153](R153.md) | P5 | Checklist (title, type, group, 3+ complete, cover, fun facts) | PARTIAL | PASS | - |
| [R154](R154.md) | P5 | How it will look (card preview) | NEW | PASS | - |
| [R155](R155.md) | P5 | Publish | EXISTS | PASS (payload); DB effect NOT VERIFIED (owner decision 1) | - |
| [R156](R156.md) | P5 | Save as draft | EXISTS | PASS | - |
| [R157](R157.md) | P5 | Done state: URL, Copy, Open, Post a challenge | PARTIAL | NOT VERIFIED live (needs a real create response); p5.spec asserts the done state with a recorded response | - |
| [R158](R158.md) | P5 | Creator XP | EXISTS | NOT VERIFIED (server side award_xp in the unchanged create route; needs a real publish) | - |
| [R164](R164.md) | P8 | New post composer + 4 modes | NEW | PASS (thread payload); fan debate / challenge posts NOT VERIFIED until v11-p8-community.sql (fail-soft proven) | - |
| [R165](R165.md) | P8 | Tabs For you / Following / Trending / Blogs | NEW | PASS | - |
| [R166](R166.md) | P8 | Group chips | EXISTS | PASS | - |
| [R167](R167.md) | P8 | Thread / Blog / Debate / Challenge cards | NEW | PASS | - |
| [R168](R168.md) | P8 | Post view + comments (nested 1 level) | NEW | PASS (thread / blog / daily debate replies: payloads + counts); fan debate / challenge replies NOT VERIFIED until v11-p8-community.sql | - |
| [R169](R169.md) | P8 | Editor modal (title, text, image, group, topic, mode extras) | NEW | PASS (thread payload); image upload not offered in the v11 editor | - |
| [R170](R170.md) | P8 | Your standing (level, xp) | EXISTS | N/A (not in the v11 community rail) | - |
| [R171](R171.md) | P8 | Daily debate (vote, results) | EXISTS | PASS (payload + state); DB effect NOT VERIFIED (owner decision 1) | - |
| [R172](R172.md) | P8 | Today (QOTD + BToTD) | EXISTS | N/A (not in the v11 community page) | - |
| [R173](R173.md) | P8 | Live rooms + chat drawer | NEW | N/A (live rooms not built: owner call on rooms vs party_rooms) | - |
| [R174](R174.md) | P8 | Happening now | EXISTS | PASS | - |
| [R175](R175.md) | P8 | Fandom war (top 3) | EXISTS | PASS | - |
| [R176](R176.md) | P8 | Badge watch | EXISTS | PASS | - |
| [R177](R177.md) | P8 | Community pulse (live, plays, quizzes, groups) | EXISTS | PASS | - |
| [R178](R178.md) | P8 | Cheer (heart on an event) | EXISTS | PASS (payload); DB effect NOT VERIFIED | - |
| [R184](R184.md) | P3 | Breadcrumb, H1, intro paragraph | EXISTS | PASS | - |
| [R185](R185.md) | P3 | Photo hero | EXISTS | PASS | - |
| [R186](R186.md) | P3 | Play the top quiz | EXISTS | PASS | - |
| [R187](R187.md) | P3 | Blindtest N songs | EXISTS | PASS | - |
| [R188](R188.md) | P3 | From the community (3 rows) + composer | PARTIAL | FAIL (C2-007: empty-state CTA); the rows themselves PASS | C2-007 |
| [R189](R189.md) | P3 | Facts strip (gen, members, debut, label, quizzes, plays) | EXISTS | PASS | - |
| [R190](R190.md) | P3 | Updated month | EXISTS | PASS (SEO diff SAME, P3) | - |
| [R191](R191.md) | P3 | Tiles quizzes / blind test | EXISTS | PASS | - |
| [R192](R192.md) | P3 | Sort tabs Popular / Newest / Most liked / Hardest | EXISTS | PASS | - |
| [R193](R193.md) | P3 | Type + level chips | EXISTS | PASS (p3.spec; local filter) | - |
| [R194](R194.md) | P3 | Quiz grid (avg %, likes) | EXISTS | PASS | - |
| [R195](R195.md) | P3 | Show all N | EXISTS | PASS | - |
| [R196](R196.md) | P3 | FAQ (fact-gated, 2 columns) | EXISTS | PASS (FAQ text + FAQPage kept, P3 SEO diff) | - |
| [R197](R197.md) | P3 | Learn before you play (trivia) | EXISTS | PASS | - |
| [R198](R198.md) | P3 | Fandom war line | EXISTS | PASS | - |
| [R199](R199.md) | P3 (link) / P5 (prefill) | Make a group quiz | EXISTS | PASS | - |
| [R200](R200.md) | P3 | Live room panel | NEW | N/A (live rooms not shipped: removed until rooms exist, 16.7) | - |
| [R201](R201.md) | P3 | Verse links | drop from this page | FAIL (C2-006: the kept link is a 404 for parked spaces; owner decision 21) | C2-006 |
| [R207](R207.md) | P10 | Header (theme, avatar, name font/colour, level title, meta) | EXISTS | PASS (public passports, guest); signed-in /me NOT VERIFIED (writes on view, owner decision 1/4) | - |
| [R208](R208.md) | P10 | XP bar | EXISTS | PASS | - |
| [R209](R209.md) | P10 | Stats (streak, mastered, quizzes made, plays received) | EXISTS | PASS (public stats); owner stats NOT VERIFIED (/me) | - |
| [R210](R210.md) | P10 | Tabs Overview / My quizzes / My posts / Mastered / Settings | PARTIAL | PASS | - |
| [R211](R211.md) | P10 (A0 BadgeMedal) | Badge shelf + tiers | EXISTS | PASS | - |
| [R212](R212.md) | P10 | Recent activity | EXISTS | NOT VERIFIED live (owner-only History on /me, which writes on view) | - |
| [R213](R213.md) | P10 | Settings form (all fields) | EXISTS | PASS (payload, changed fields only); DB effect NOT VERIFIED (owner decision 1) | - |
| [R214](R214.md) | P10 | Preferences: sound, email on replies | PARTIAL | PASS (sound, category prefs); email switches NOT VERIFIED until v11-p10-email-prefs.sql | - |
| [R215](R215.md) | A0 / P10 | Appearance System / Light / Dark | NEW | PASS (see R032) | - |
| [R216](R216.md) | P10 | Public passport `/u/[username]` | EXISTS | PASS | - |
| [R222](R222.md) | P9 | Fandom war podium + board + weekly delta | EXISTS | PASS | - |
| [R223](R223.md) | P9 | Your fandom card | EXISTS | PASS (no main group case); a main-group pin NOT VERIFIED live (the test user has no ult_groups; setting one = a write) | - |
| [R224](R224.md) | P9 | How points work | PARTIAL | PASS (copy states the real rule, P9 section 4) | - |
| [R225](R225.md) | P9 | Last weeks | NEW | N/A (not in the v11 prototype) | - |
| [R226](R226.md) | P9 | Players tab | EXISTS | PASS | - |
| [R227](R227.md) | P9 | Creators tab | EXISTS | PASS | - |
| [R228](R228.md) | P9 | Streak leaders | EXISTS | N/A (not in the v11 prototype) | - |
| [R234](R234.md) | P11 | List grouped by day, unread state | EXISTS | PASS | - |
| [R235](R235.md) | P11 | Tabs = 5 categories | EXISTS | PASS | - |
| [R236](R236.md) | P11 | Row icon per type | EXISTS | PASS (unit p11.test) | - |
| [R237](R237.md) | P11 | Row link | EXISTS | PASS | - |
| [R238](R238.md) | P11 | Mark all read | EXISTS | PASS (payload); DB effect NOT VERIFIED (owner decision 1) | - |
| [R239](R239.md) | P11 | Per-row read on click | EXISTS | PASS (payload); DB effect NOT VERIFIED | - |
| [R240](R240.md) | P11 / P10 | Category toggles | EXISTS | PASS (link); toggles checked in the settings rows | - |
| [R241](R241.md) | P11 | Streak at risk card | EXISTS | PASS (none state); at-risk / saved states NOT VERIFIED live (the test user has no streak; creating one is a write) | - |
| [R242](R242.md) | P10 | Weekly recap email toggle | NEW | NOT VERIFIED until v11-p10-email-prefs.sql | - |
| [R243](R243.md) | A0 / P11 | Unread badge in topbar | EXISTS | PASS | - |
| [R244](R244.md) | P11 | `battle_beaten` type | PARTIAL | NOT VERIFIED until migration 154 (the type arrives only then); icon mapping unit-tested | - |
| [R250](R250.md) | P6 | Setup: playlist All / By group (multi) / Girl / Boy / Generation; rounds 5-10-15 | EXISTS | PASS (payload); the run itself: p6.spec on :3021 | - |
| [R251](R251.md) | P6 | Your stats (rank title, best, combo, streak) | DEAD | NOT VERIFIED (bt_players unwired: production writes need the owner, P6 owner item 5) | - |
| [R252](R252.md) | P6 | Quick play | EXISTS | PASS | - |
| [R253](R253.md) | P6 | Blindtest of the day + board | EXISTS | PASS (reads real; submit payload via p6.spec); DB effect NOT VERIFIED | - |
| [R254](R254.md) | P6 / P7 | Ranked | NEW | NOT VERIFIED until v11-p7-ranked.sql (fail-soft proven, see R293) | - |
| [R255](R255.md) | P6 | Challenge a friend | NEW | PASS (payloads + route resolution); DB write NOT VERIFIED (owner decision 1) | - |
| [R256](R256.md) | P6 | Live rooms (Soon) | NEW, phase 3 | N/A (phase 3, not built) | - |
| [R257](R257.md) | P6 | Today's board | EXISTS | PASS | - |
| [R258](R258.md) | P6 | Your recent runs | PARTIAL | N/A (free play records nothing today; owner item 4) | - |
| [R259](R259.md) | P6 | Playlists (title tracks, b-sides, recent, legends, 4th gen gg/bg, solo, speed) | EXISTS (verify each id in blind-test-playlists.ts) | PASS (the 18 theme playlists are linked; the map's 8 ids exist); Recent hits / Legends / Speed round mixes not offered (owner item 7) | - |
| [R260](R260.md) | P6 | How scoring works | NEW | PASS (display only; server scoring is ranked only, P7) | - |
| [R261](R261.md) | P6 | Blindtest by group rail | EXISTS | PASS | - |
| [R262](R262.md) | P6 | How it works, FAQ | EXISTS | PASS (FAQ text kept, SEO lock) | - |
| [R263](R263.md) | P6 | Removed: Intro, Lyrics modes | drop | PASS (Intro page kept, owner item 1) | - |
| [R269](R269.md) | P6 | Quit, progress, counter | EXISTS | N/A (client state, no backend) | - |
| [R270](R270.md) | P6 | Points pill + combo | NEW | PASS (display; not stored) | - |
| [R271](R271.md) | P6 | Orb: ring 10s, equaliser, seconds, danger | EXISTS | N/A (client) | - |
| [R272](R272.md) | P6 | Playing clip / Loading clip | EXISTS | PASS | - |
| [R273](R273.md) | P6 | Song round / Artist round badge, question | EXISTS | PASS | - |
| [R274](R274.md) | P6 | Choices 4 + marks | EXISTS | N/A (client) | - |
| [R275](R275.md) | P6 | Reveal (cover, title, artist, album) | EXISTS | N/A (client) | - |
| [R276](R276.md) | P6 | Points pop, combo badge | NEW | N/A (client) | - |
| [R277](R277.md) | P6 | Auto-next 3s + Skip | PARTIAL | N/A (client) | - |
| [R278](R278.md) | P6 | Keyboard 1-4 | NEW | N/A (client; p6.spec keys 1-4) | - |
| [R279](R279.md) | P6 | Results: mascot, score, label, points, combo, avg answer, XP, today rank | PARTIAL | PASS (daily XP from /api/daily/complete; free play awards none, as today) | - |
| [R280](R280.md) | P6 | Challenge a friend link | NEW | PASS (payload) | - |
| [R281](R281.md) | P6 | Song breakdown with covers | EXISTS | N/A (client) | - |
| [R282](R282.md) | P6 | Level card (rank title, xp) | DEAD -> wire | NOT VERIFIED (bt_players 0 rows, unwired: owner item 5) | - |
| [R283](R283.md) | P6 | Daily results: board + come back tomorrow | EXISTS | PASS | - |
| [R293](R293.md) | P7 | Play a ranked run | Play a ranked run | NOT VERIFIED until v11-p7-ranked.sql (fail-soft + unit proven) | - |
| [R294](R294.md) | P7 | Submit run | Submit run | NOT VERIFIED until v11-p7-ranked.sql (server scoring unit-proven) | - |
| [R295](R295.md) | P7 | Daily cap 15 | Daily cap 15 | NOT VERIFIED live (needs the migration); limit unit-proven | - |
| [R296](R296.md) | P7 | Quit = recorded | Quit = recorded | NOT VERIFIED live; unit-proven | - |
| [R297](R297.md) | P7 | Season score | Season score | NOT VERIFIED live; unit-proven | - |
| [R298](R298.md) | P7 | Tiers + divisions | Tiers + divisions | NOT VERIFIED live; mapping unit-proven | - |
| [R299](R299.md) | P7 | Ladder tabs Global / My fandom / Following | Ladder tabs Global / My fandom / Following | NOT VERIFIED until the migration (fail-soft proven) | - |
| [R300](R300.md) | P7 | Your card (tier, score, best 5, progress to next) | Your card (tier, score, best 5, progress to next) | NOT VERIFIED until the migration (fail-soft proven) | - |
| [R301](R301.md) | P7 | Your ranked runs | Your ranked runs | NOT VERIFIED until the migration | - |
| [R302](R302.md) | P7 | Season impact block on results | Season impact block on results | NOT VERIFIED until the migration; view unit-proven | - |
| [R303](R303.md) | P7 | Placement 3/5 | Placement 3/5 | NOT VERIFIED until the migration; unit-proven | - |
| [R304](R304.md) | P7 | Rewards | Rewards | NOT VERIFIED (shown as designed, not built: owner decision 18) | - |
| [R305](R305.md) | P7 / P6 | Rank title card (Idol, xp) | Rank title card (Idol, xp) | NOT VERIFIED (bt_players 0 rows, unwired) | - |
| [R311](R311.md) | A0 (sheet) + every page | Auth gates (guest vs signed-in) | `lib/use-signed-in.ts`, `/login`, `/onboarding`, anon runs claimable | PASS (gates + continue the action); a real OAuth / magic-link round trip NOT VERIFIED (no other sign-in allowed) | - |
| [R312](R312.md) | P4 / P6 | Guest play | anon_id in `plays`, `claim-runs` | PASS (payload); claim after sign-in NOT VERIFIED | - |
| [R313](R313.md) | all pages (C3 owns the SEO diff) | SEO | every public page keeps H1, intro, FAQ, JSON-LD, canonical, `/pt` mirror, sitemap; the app shell must not turn these into client-only pages | PASS in C2 scope | - |
| [R314](R314.md) | P4 / P6 | Analytics events | `lib/analytics.ts` | PASS | - |
| [R315](R315.md) | A0 | Design tokens | `lib/design-tokens.ts` + globals.css; add dark tokens | PASS (unit) | - |
| [R316](R316.md) | A0 | Fonts | DM Sans + Syne today; prototype uses Inter. Owner decision: the prototype's Inter is the target | PASS | - |
| [R317](R317.md) | A0 | Images | `public/idols/*.jpg`, `public/mascot/*.png`, `public/logos/blackpink.svg`; never redraw logos | PASS (unit) | - |
| [R318](R318.md) | P4 / P6 | Sounds | `lib/sounds.ts`, `lib/haptics.ts` | PASS | - |
| [R319](R319.md) | all | Reduced motion | `reduceMotion` in players | N/A (client, C3) | - |
| [R320](R320.md) | A0 / P4 | Discord / Reddit | `/api/discord/*`, `lib/reddit-api.ts`, share images | FAIL (C2-003 on results); footer links PASS | C2-003 |
| [R321](R321.md) | unowned (RUN-STATE open item) | i18n `/pt` | `lib/i18n` | PASS in C2 scope (no /pt mirror of new pages; /pt renders inside the shell) | - |
| [R330](R330.md) | A0 | Shell · Top nav links, logo, search, Create, streak, bell, avatar | Replace the 232px sidebar shell of Phase 1 | PASS | - |
| [R331](R331.md) | A0 / P11 | Shell · Search overlay | Groups, quizzes (incl. quizzes of a matched group), songs; no-results state; Enter opens first | PASS | - |
| [R332](R332.md) | A0 (+ P1 copy) | Shell · Streak pill + popover | Neutral; pink flame when at risk; switches to "saved" after any quiz or blindtest | FAIL vs the v10 rule (the live rule is kept: owner decision 12); the pill shows the stored value; the home line misstates the rule (C2-002) | C2-002 |
| [R333](R333.md) | A0 | Any · Sign-in sheet | Google, Discord, email magic link; continues the pending action after auth | PASS (continue the action proven with the test user); a real provider round trip NOT VERIFIED | - |
| [R334](R334.md) | P1 (home) / P4 (game) | Home · Continue playing | Resume at the saved question | FAIL for a quiz the home also lists (C2-004); PASS for an unlisted quiz | C2-004 |
| [R335](R335.md) | P1 | Home · Daily band played state | After the daily: score + See today's board | PASS (not played state); NOT VERIFIED played state (needs a daily blindtest play = production write, owner decision 1) | - |
| [R336](R336.md) | P2 | Quizzes · Sort + Type/Level/Group chips | Real server filtering; empty state; ?page=2 link | PENDING (P2 not merged) | - |
| [R337](R337.md) | P4 | Quiz · Play without a timer | Relaxed run; excluded from hall of fame and quiz_time_stats | NOT VERIFIED until v11-p4-relaxed-runs.sql (fail-soft proven) | - |
| [R338](R338.md) | P4 | Quiz game · Quit confirm | Only when answers would be lost; saves the run to Continue | PASS | - |
| [R339](R339.md) | P4 | Quiz game · Challenge chip "Beat X: 7/8" | Shown in challenge runs; results show win/lose | PASS (route + read against a real row); attempt write NOT VERIFIED (owner decision 1) | - |
| [R340](R340.md) | P4 | Results · Primary action by score | Share if pct >= quiz average, else Play again | PASS | - |
| [R341](R341.md) | P4 | Results · Comment field | Real textarea, score chip, Send | PASS (payload); DB effect NOT VERIFIED | - |
| [R342](R342.md) | P4 | Share sheet · Numbers | From the finished run (score, beat %, rank) | PASS | - |
| [R343](R343.md) | P4 (A0 ShareSheet) | Share sheet · More apps | navigator.share with the story image as a file where supported | NOT VERIFIED (the OS share sheet is not reachable headless) | - |
| [R344](R344.md) | P5 | Create · Publish as guest | Opens sign-in, keeps the draft, then publishes | PASS (sheet + draft kept); the resume after a real sign-in NOT VERIFIED (no other sign-in allowed) | - |
| [R345](R345.md) | P6 | Blindtest hub · Accept a challenge | Starts the run with the score to beat | PASS (route + read path); attempt write NOT VERIFIED | - |
| [R346](R346.md) | P6 | Blindtest game · Replay + sound | Replay the clip, mute | N/A (client) | - |
| [R347](R347.md) | P6 | Blindtest game · Autoplay blocked state | "Tap to play the clip" | PASS | - |
| [R348](R348.md) | P6 | Blindtest results · Song row play button | Replays that clip | N/A (client, preview URL) | - |
| [R349](R349.md) | P6 | Blindtest · Daily one try | Second attempt goes to the board | PASS (structure + p6.spec); second real attempt NOT VERIFIED (write) | - |
| [R350](R350.md) | P7 | Ranked · Target number | Lowest of the best 5 runs, list sorted desc, sum shown | NOT VERIFIED until the migration; unit-proven | - |
| [R351](R351.md) | P3 | Group hub · Split hero, 8 FAQ, trivia href, Show all N link | Server-rendered; counts from published quizzes | PASS | - |
| [R352](R352.md) | P3 | Group hub · Empty group (0 quizzes) | Make the first quiz + Notify me; noindex until 3 quizzes | NOT VERIFIED until v11-p3-group-quiz-alerts.sql (fail-soft proven) | - |
| [R353](R353.md) | P8 | Community · Composer, tabs, mobile rail blocks | As section 16.7 | PASS (see R164 to R169) | - |
| [R354](R354.md) | P8 | Post · Reply field | Real field, score chip | PASS (payloads) | - |
| [R355](R355.md) | P10 | Passport · Band default | Main group photo blurred over tint when no image | PASS (flat band case) | - |
| [R356](R356.md) | P10 | Settings · Sign out | Signs out and returns home | PASS | - |
| [R362](R362.md) | P1 | Home · Quiz of the day card (v11.1 minimal) | Real QOTD title, one meta line (type, level, count, average, time), countdown, Play. No group tag, no preview | PASS | - |
| [R363](R363.md) | P1 | Home · Header (v11.2, centred live-site hero) | Guest: eyebrow + "Are you a real fan?" H1, H2, Browse K-pop quizzes (/quizzes) + Create a quiz. Signed in: "Good evening, <name>" + streak line | FAIL (C2-002) | C2-002 |
| [R364](R364.md) | P1 | Home · Live ticker | Cycles recent activity, falls back to fans playing now, hides when neither | PASS | - |
| [R365](R365.md) | A0 | Nav · Pink pill active item + icons + Home link | Route-aware active state | PASS (unit + DOM) | - |
| [R366](R366.md) | P6 | Blindtest · Playlist menu groups | All playable groups under All K-pop, searchable, counts | PASS | - |
| [R367](R367.md) | P6 | Blindtest · Play by group (v11.1) | Popular six photo tiles + searchable index of every playable group, first 24 then Show all | PASS | - |
| [R368](R368.md) | P6 | Blindtest · Day mode | Light hero, game, results, home band | N/A (styles only) | - |
| [R369](R369.md) | P7 | Ranked · Whole system | Scoring, season, tiers, divisions, limits, anti-cheat | NOT VERIFIED until v11-p7-ranked.sql; engine unit-proven (233 tests), API fails soft (503 before any write), flag off 404 | - |
| [R370](R370.md) | P8 | Community · Comment like heart | Toggle like with count | NOT VERIFIED until v11-p8-community.sql (fail-soft + once-per-user structure proven) | - |
| [R371](R371.md) | P8 (A0 PersonName) | Community · Author flair | Accent, font, bias chip on every name | PASS (read side); saving the flair: see R376 | - |
| [R372](R372.md) | P8 | Community · Happening now | Live feed + cheer | PASS | - |
| [R373](R373.md) | P8 | Community · Daily debate | Vote, results after vote | PASS (payload, one vote per day by the unique key); DB effect NOT VERIFIED | - |
| [R374](R374.md) | P10 | Passport · Change header (upload) | Upload to storage, crop 1500x300, save header_url | NOT VERIFIED until v11-p10-header-storage.sql (fail-soft + file checks proven) | - |
| [R375](R375.md) | P10 | Passport · Change header (link) | Server fetch, validate, copy to storage | NOT VERIFIED until v11-p10-header-storage.sql (SSRF block + fail-soft proven) | - |
| [R376](R376.md) | P10 | Settings · Your look | name_accent, name_font, bias, profile_theme, pinned_badge_id | PASS (save payload + shown on posts, comments, hall of fame); DB effect NOT VERIFIED | - |
| [R377](R377.md) | A0 / P10 | Passport · Badge medallions (v11.1) | SVG medallion per badge: frame + gradient by rarity, unique glyph, locked state, live counts; no PNG mascot art | PASS | - |
| [R378](R378.md) | P10 | Passport · Pinned badge next to name | Shows profiles.pinned_badge_id as a 28px medallion | PASS | - |
| [R379](R379.md) | A0 (C3 checks) | All · Sheets close | X, Escape, backdrop close any sheet; focus returns | N/A for C2 (behaviour, no backend) | - |
| [R380](R380.md) | P4 | Quiz page · About box, timer, stats box | Visual only; averages from the played quiz | PASS | - |
| [R381](R381.md) | A0 | All grids · Quiz card (v11.2) | Flush photo, group eyebrow, title, difficulty bars + level, plays | PASS | - |
