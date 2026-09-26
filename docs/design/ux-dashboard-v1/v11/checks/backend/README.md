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
| PASS | 89 |
| FAIL | 5 |
| NOT VERIFIED | 5 |
| PENDING | 0 |
| N/A | 11 |
| TODO | 157 |
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
| R061 | 2. | Sort tabs Trending / Newest / Most played / Top rated | - | TODO | - |
| R062 | 2. | Type chips (5) | - | TODO | - |
| R063 | 2. | Level chips | - | TODO | - |
| R064 | 2. | Group rail | - | TODO | - |
| R065 | 2. | Infinite grid | - | TODO | - |
| R066 | 2. | SEO landing pages (`/easy-kpop-quizzes`, `/hard-kpop-quizzes`, `/kpop-true-or-false`, `/most-liked`, `/new`, `/trending`, `/quizzes/popular-*`) | - | TODO | - |
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
| R135 | 6. | Autosave chip | - | TODO | - |
| R136 | 6. | Stepper 1/2/3 | - | TODO | - |
| R137 | 6. | Title (5+) + counter | - | TODO | - |
| R138 | 6. | About 280 | - | TODO | - |
| R139 | 6. | Quiz type cards (5) | - | TODO | - |
| R140 | 6. | Group search with chip | - | TODO | - |
| R141 | 6. | Difficulty segments | - | TODO | - |
| R142 | 6. | Language | - | TODO | - |
| R143 | 6. | Cover + rights checkbox | - | TODO | - |
| R144 | 6. | Start adding questions | - | TODO | - |
| R145 | 6. | Question list (drag, expand, duplicate, delete) | - | TODO | - |
| R146 | 6. | Answers with circle marker, TF, clues, image labels | - | TODO | - |
| R147 | 6. | Fun fact | - | TODO | - |
| R148 | 6. | Add an image per question | - | TODO | - |
| R149 | 6. | Add a question | - | TODO | - |
| R150 | 6. | Paste several at once | - | TODO | - |
| R151 | 6. | Preview | - | TODO | - |
| R152 | 6. | Done -> Publish step | - | TODO | - |
| R153 | 6. | Checklist (title, type, group, 3+ complete, cover, fun facts) | - | TODO | - |
| R154 | 6. | How it will look (card preview) | - | TODO | - |
| R155 | 6. | Publish | - | TODO | - |
| R156 | 6. | Save as draft | - | TODO | - |
| R157 | 6. | Done state: URL, Copy, Open, Post a challenge | - | TODO | - |
| R158 | 6. | Creator XP | - | TODO | - |
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
| R184 | 8. | Breadcrumb, H1, intro paragraph | - | TODO | - |
| R185 | 8. | Photo hero | - | TODO | - |
| R186 | 8. | Play the top quiz | - | TODO | - |
| R187 | 8. | Blindtest N songs | - | TODO | - |
| R188 | 8. | From the community (3 rows) + composer | - | TODO | - |
| R189 | 8. | Facts strip (gen, members, debut, label, quizzes, plays) | - | TODO | - |
| R190 | 8. | Updated month | - | TODO | - |
| R191 | 8. | Tiles quizzes / blind test | - | TODO | - |
| R192 | 8. | Sort tabs Popular / Newest / Most liked / Hardest | - | TODO | - |
| R193 | 8. | Type + level chips | - | TODO | - |
| R194 | 8. | Quiz grid (avg %, likes) | - | TODO | - |
| R195 | 8. | Show all N | - | TODO | - |
| R196 | 8. | FAQ (fact-gated, 2 columns) | - | TODO | - |
| R197 | 8. | Learn before you play (trivia) | - | TODO | - |
| R198 | 8. | Fandom war line | - | TODO | - |
| R199 | 8. | Make a group quiz | - | TODO | - |
| R200 | 8. | Live room panel | - | TODO | - |
| R201 | 8. | Verse links | - | TODO | - |
| R207 | 9. | Header (theme, avatar, name font/colour, level title, meta) | - | TODO | - |
| R208 | 9. | XP bar | - | TODO | - |
| R209 | 9. | Stats (streak, mastered, quizzes made, plays received) | - | TODO | - |
| R210 | 9. | Tabs Overview / My quizzes / My posts / Mastered / Settings | - | TODO | - |
| R211 | 9. | Badge shelf + tiers | - | TODO | - |
| R212 | 9. | Recent activity | - | TODO | - |
| R213 | 9. | Settings form (all fields) | - | TODO | - |
| R214 | 9. | Preferences: sound, email on replies | - | TODO | - |
| R215 | 9. | Appearance System / Light / Dark | - | TODO | - |
| R216 | 9. | Public passport `/u/[username]` | - | TODO | - |
| R222 | 10. | Fandom war podium + board + weekly delta | - | TODO | - |
| R223 | 10. | Your fandom card | - | TODO | - |
| R224 | 10. | How points work | - | TODO | - |
| R225 | 10. | Last weeks | - | TODO | - |
| R226 | 10. | Players tab | - | TODO | - |
| R227 | 10. | Creators tab | - | TODO | - |
| R228 | 10. | Streak leaders | - | TODO | - |
| R234 | 11. | List grouped by day, unread state | - | TODO | - |
| R235 | 11. | Tabs = 5 categories | - | TODO | - |
| R236 | 11. | Row icon per type | - | TODO | - |
| R237 | 11. | Row link | - | TODO | - |
| R238 | 11. | Mark all read | - | TODO | - |
| R239 | 11. | Per-row read on click | - | TODO | - |
| R240 | 11. | Category toggles | - | TODO | - |
| R241 | 11. | Streak at risk card | - | TODO | - |
| R242 | 11. | Weekly recap email toggle | - | TODO | - |
| R243 | 11. | Unread badge in topbar | - | TODO | - |
| R244 | 11. | `battle_beaten` type | - | TODO | - |
| R250 | 12. | Setup: playlist All / By group (multi) / Girl / Boy / Generation; rounds 5-10-15 | - | TODO | - |
| R251 | 12. | Your stats (rank title, best, combo, streak) | - | TODO | - |
| R252 | 12. | Quick play | - | TODO | - |
| R253 | 12. | Blindtest of the day + board | - | TODO | - |
| R254 | 12. | Ranked | - | TODO | - |
| R255 | 12. | Challenge a friend | - | TODO | - |
| R256 | 12. | Live rooms (Soon) | - | TODO | - |
| R257 | 12. | Today's board | - | TODO | - |
| R258 | 12. | Your recent runs | - | TODO | - |
| R259 | 12. | Playlists (title tracks, b-sides, recent, legends, 4th gen gg/bg, solo, speed) | - | TODO | - |
| R260 | 12. | How scoring works | - | TODO | - |
| R261 | 12. | Blindtest by group rail | - | TODO | - |
| R262 | 12. | How it works, FAQ | - | TODO | - |
| R263 | 12. | Removed: Intro, Lyrics modes | - | TODO | - |
| R269 | 13. | Quit, progress, counter | - | TODO | - |
| R270 | 13. | Points pill + combo | - | TODO | - |
| R271 | 13. | Orb: ring 10s, equaliser, seconds, danger | - | TODO | - |
| R272 | 13. | Playing clip / Loading clip | - | TODO | - |
| R273 | 13. | Song round / Artist round badge, question | - | TODO | - |
| R274 | 13. | Choices 4 + marks | - | TODO | - |
| R275 | 13. | Reveal (cover, title, artist, album) | - | TODO | - |
| R276 | 13. | Points pop, combo badge | - | TODO | - |
| R277 | 13. | Auto-next 3s + Skip | - | TODO | - |
| R278 | 13. | Keyboard 1-4 | - | TODO | - |
| R279 | 13. | Results: mascot, score, label, points, combo, avg answer, XP, today rank | - | TODO | - |
| R280 | 13. | Challenge a friend link | - | TODO | - |
| R281 | 13. | Song breakdown with covers | - | TODO | - |
| R282 | 13. | Level card (rank title, xp) | - | TODO | - |
| R283 | 13. | Daily results: board + come back tomorrow | - | TODO | - |
| R293 | 14. | Play a ranked run | - | TODO | - |
| R294 | 14. | Submit run | - | TODO | - |
| R295 | 14. | Daily cap 15 | - | TODO | - |
| R296 | 14. | Quit = recorded | - | TODO | - |
| R297 | 14. | Season score | - | TODO | - |
| R298 | 14. | Tiers + divisions | - | TODO | - |
| R299 | 14. | Ladder tabs Global / My fandom / Following | - | TODO | - |
| R300 | 14. | Your card (tier, score, best 5, progress to next) | - | TODO | - |
| R301 | 14. | Your ranked runs | - | TODO | - |
| R302 | 14. | Season impact block on results | - | TODO | - |
| R303 | 14. | Placement 3/5 | - | TODO | - |
| R304 | 14. | Rewards | - | TODO | - |
| R305 | 14. | Rank title card (Idol, xp) | - | TODO | - |
| R311 | 15. | Auth gates (guest vs signed-in) | - | TODO | - |
| R312 | 15. | Guest play | - | TODO | - |
| R313 | 15. | SEO | - | TODO | - |
| R314 | 15. | Analytics events | - | TODO | - |
| R315 | 15. | Design tokens | - | TODO | - |
| R316 | 15. | Fonts | - | TODO | - |
| R317 | 15. | Images | - | TODO | - |
| R318 | 15. | Sounds | - | TODO | - |
| R319 | 15. | Reduced motion | - | TODO | - |
| R320 | 15. | Discord / Reddit | - | TODO | - |
| R321 | 15. | i18n `/pt` | - | TODO | - |
| R330 | v10 | Shell · Top nav links, logo, search, Create, streak, bell, avatar | - | TODO | - |
| R331 | v10 | Shell · Search overlay | - | TODO | - |
| R332 | v10 | Shell · Streak pill + popover | - | TODO | - |
| R333 | v10 | Any · Sign-in sheet | - | TODO | - |
| [R334](R334.md) | P1 (home) / P4 (game) | Home · Continue playing | Resume at the saved question | FAIL for a quiz the home also lists (C2-004); PASS for an unlisted quiz | C2-004 |
| [R335](R335.md) | P1 | Home · Daily band played state | After the daily: score + See today's board | PASS (not played state); NOT VERIFIED played state (needs a daily blindtest play = production write, owner decision 1) | - |
| R336 | v10 | Quizzes · Sort + Type/Level/Group chips | - | TODO | - |
| [R337](R337.md) | P4 | Quiz · Play without a timer | Relaxed run; excluded from hall of fame and quiz_time_stats | NOT VERIFIED until v11-p4-relaxed-runs.sql (fail-soft proven) | - |
| [R338](R338.md) | P4 | Quiz game · Quit confirm | Only when answers would be lost; saves the run to Continue | PASS | - |
| [R339](R339.md) | P4 | Quiz game · Challenge chip "Beat X: 7/8" | Shown in challenge runs; results show win/lose | PASS (route + read against a real row); attempt write NOT VERIFIED (owner decision 1) | - |
| [R340](R340.md) | P4 | Results · Primary action by score | Share if pct >= quiz average, else Play again | PASS | - |
| [R341](R341.md) | P4 | Results · Comment field | Real textarea, score chip, Send | PASS (payload); DB effect NOT VERIFIED | - |
| [R342](R342.md) | P4 | Share sheet · Numbers | From the finished run (score, beat %, rank) | PASS | - |
| [R343](R343.md) | P4 (A0 ShareSheet) | Share sheet · More apps | navigator.share with the story image as a file where supported | NOT VERIFIED (the OS share sheet is not reachable headless) | - |
| R344 | v10 | Create · Publish as guest | - | TODO | - |
| R345 | v10 | Blindtest hub · Accept a challenge | - | TODO | - |
| R346 | v10 | Blindtest game · Replay + sound | - | TODO | - |
| R347 | v10 | Blindtest game · Autoplay blocked state | - | TODO | - |
| R348 | v10 | Blindtest results · Song row play button | - | TODO | - |
| R349 | v10 | Blindtest · Daily one try | - | TODO | - |
| R350 | v10 | Ranked · Target number | - | TODO | - |
| R351 | v10 | Group hub · Split hero, 8 FAQ, trivia href, Show all N link | - | TODO | - |
| R352 | v10 | Group hub · Empty group (0 quizzes) | - | TODO | - |
| [R353](R353.md) | P8 | Community · Composer, tabs, mobile rail blocks | As section 16.7 | PASS (see R164 to R169) | - |
| [R354](R354.md) | P8 | Post · Reply field | Real field, score chip | PASS (payloads) | - |
| R355 | v10 | Passport · Band default | - | TODO | - |
| R356 | v10 | Settings · Sign out | - | TODO | - |
| [R362](R362.md) | P1 | Home · Quiz of the day card (v11.1 minimal) | Real QOTD title, one meta line (type, level, count, average, time), countdown, Play. No group tag, no preview | PASS | - |
| [R363](R363.md) | P1 | Home · Header (v11.2, centred live-site hero) | Guest: eyebrow + "Are you a real fan?" H1, H2, Browse K-pop quizzes (/quizzes) + Create a quiz. Signed in: "Good evening, <name>" + streak line | FAIL (C2-002) | C2-002 |
| [R364](R364.md) | P1 | Home · Live ticker | Cycles recent activity, falls back to fans playing now, hides when neither | PASS | - |
| R365 | v11 | Nav · Pink pill active item + icons + Home link | - | TODO | - |
| R366 | v11 | Blindtest · Playlist menu groups | - | TODO | - |
| R367 | v11 | Blindtest · Play by group (v11.1) | - | TODO | - |
| R368 | v11 | Blindtest · Day mode | - | TODO | - |
| R369 | v11 | Ranked · Whole system | - | TODO | - |
| [R370](R370.md) | P8 | Community · Comment like heart | Toggle like with count | NOT VERIFIED until v11-p8-community.sql (fail-soft + once-per-user structure proven) | - |
| [R371](R371.md) | P8 (A0 PersonName) | Community · Author flair | Accent, font, bias chip on every name | PASS (read side); saving the flair: see R376 | - |
| [R372](R372.md) | P8 | Community · Happening now | Live feed + cheer | PASS | - |
| [R373](R373.md) | P8 | Community · Daily debate | Vote, results after vote | PASS (payload, one vote per day by the unique key); DB effect NOT VERIFIED | - |
| R374 | v11 | Passport · Change header (upload) | - | TODO | - |
| R375 | v11 | Passport · Change header (link) | - | TODO | - |
| R376 | v11 | Settings · Your look | - | TODO | - |
| R377 | v11 | Passport · Badge medallions (v11.1) | - | TODO | - |
| R378 | v11 | Passport · Pinned badge next to name | - | TODO | - |
| R379 | v11 | All · Sheets close | - | TODO | - |
| [R380](R380.md) | P4 | Quiz page · About box, timer, stats box | Visual only; averages from the played quiz | PASS | - |
| R381 | v11 | All grids · Quiz card (v11.2) | - | TODO | - |
