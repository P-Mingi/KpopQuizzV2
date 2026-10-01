# X1 scope completeness audit (UX v11.2)

Auditor: X1 (read-only). Code under audit: local `ux11/p2-quizzes` @ 4409a10 (= feat/ux-v1-v11 7100725 + P2 /quizzes), app `apps/quiz`, flag `NEXT_PUBLIC_UX_V1`.
Reference: `docs/design/ux-dashboard-v1/prototype.html` (v11.2), DESIGN-SPEC 17, WORKER-PROMPT-V11-MULTIAGENT sections 2/6/8, RUN-STATE (origin 4461dd9).
Preview: http://localhost:3021 (4409a10, flag on). Verdicts: IMPLEMENTED / PARTIAL / MISSING / DEFERRED (DEFERRED only when RUN-STATE names the migration or owner decision).

Prototype inventory (read from prototype.html): 18 views (`<main class="view">`: home, groups, quizzes, quiz, play, end, create, blindtest, btplay, btend, ranked, community, postview, leaderboard, hub, you, settings, notifs), 5 popovers (streakpop, bellpop, avapop, plmenu, ddpop), search overlay (sov), 5 sheets (share, editor, signin, hsheet, confirm), toast + live region, top nav, tab bar, footer, guest preview bar + Design notes (prototype-only controls, 17.10).

(sections below are written one at a time)

Route existence on :3021 (4409a10, curl, guest): 200 for / /quizzes /quizzes?page=2 /quizzes?sort=newest /groups /blackpink-quiz /ateez-quiz /create /blindtest /blindtest/ranked /community /leaderboard /u/testtest /search /ux-v1/kit; 307 (auth redirect) for /settings /notifications /me; 404 for /blindtest/play (prototype linkify path only, the game runs in-page on /blindtest, OK).

## 1. Prototype inventory vs implementation

### 1.1 Shell (A0) - prototype `<header class="nav">`, `.tabbar`, `.foot`, `#sov`, popovers

| Prototype element (function) | Implementation | Verdict |
|---|---|---|
| Brand (`go('home')`, pink K tile) | components/ux-v1/brand.tsx | IMPLEMENTED (logo swap = owner decision 5) |
| Nav links Home/Quizzes/Groups/Blindtest/Community/Leaderboard, icon+label, pink pill, NAVMAP active | components/layout/ux-v1/ux-nav-links.tsx | IMPLEMENTED |
| Search icon button + "/" shortcut (`openSearch()`) | ux-nav-actions.tsx (real `<a href="/search">`, aria-keyshortcuts "/") + ux-search.tsx | IMPLEMENTED |
| Create ghost button (`go('create')`) | ux-nav-actions.tsx | IMPLEMENTED |
| Streak pill + `pop('streakpop')`: N days, at-risk text, week dots, "Play today's quiz" / after play "See your passport" | ux-nav-actions.tsx StreakBody (lib/ux-v1/a0/streak.ts) | IMPLEMENTED (copy states the real rule: daily quiz or daily blindtest, RUN-STATE 24) |
| Bell + `pop('bellpop')`: latest 6 rows, unread dot, Mark all read, See all notifications | ux-nav-actions.tsx Bell + components/notifications/ux-v1/bell-panel.tsx (P11) | IMPLEMENTED |
| Avatar menu `pop('avapop')`: id row (name, Lv, level name), Passport, My quizzes `<small>1 draft</small>` -> `go('you');ptab('quizzes')`, Settings, Dark/Light mode toggle, Sign out | ux-nav-actions.tsx AccountBody | PARTIAL: "My quizzes" links `/u/<username>` (passport default tab), not the Quizzes tab, and has no draft count `<small>` |
| Avatar menu "Preview as guest", "Design notes"; guest preview bar; Design notes panel `tn()` | none | N/A: prototype-only controls (DESIGN-SPEC 17.10) |
| Guest "Sign in" button (`setAuth(true)` -> sign-in sheet) | ux-nav-actions.tsx `openSignIn()` + components/ux-v1/sign-in-sheet.tsx | IMPLEMENTED |
| Mobile tab bar Home/Quizzes/Blindtest/Community/You with TABMAP | ux-tab-bar.tsx (You opens sign-in for guests) | IMPLEMENTED |
| Footer: brand + 2 lines, Play / Explore / Community / Support columns, Top groups row, (c) line + theme toggle | ux-footer.tsx + ux-footer-controls.tsx | IMPLEMENTED (extra live links kept for SEO link-set parity: Popular quizzes, Trivia, Pulse, Stats, Articles, News, Reddit, About, DMCA; "All groups" vs "All 90 groups") |
| Search overlay `#sov`: empty = Popular groups (4) + Most played quizzes (3); typed = Groups / Quizzes (incl. matched group's) / Songs in the blindtest; empty state "No results for"; Enter opens first; Esc | ux-search.tsx + components/search/ux-v1/search-results.tsx + lib/ux-v1/p11/search.ts + api/ux-v1/p11/search | IMPLEMENTED |
| Scrim + Escape closes everything (`closeAll`) | components/ux-v1/sheet.tsx, popover.tsx | IMPLEMENTED (C3: 17/17 sheets and popovers) |
| Toast + `#live` region (`toast`, `announce`) | components/ux-v1/toast.tsx | IMPLEMENTED |
| Focus mode (nav/tabbar/footer hidden on play/btplay), create-mode (tab bar + footer hidden) | ux-chrome-gate.tsx, use-shell-mode.ts | IMPLEMENTED |
| H1 focus on view change (`go()` focuses the h1) | A0 queue (RUN-STATE log 2026-09-26 "H1 focus on navigation") | IMPLEMENTED |

### 1.2 Home (P1) - prototype `<main id="home">`, `renderHome()`, `tickStart()`

| Prototype element | Implementation | Verdict |
|---|---|---|
| Live ticker `.ticker` (LIVE dot, cycling lines 3.5s, "N fans playing now") | components/home/activity-ticker.tsx (live component reused) in ux-home.tsx `.p1-ticker` | IMPLEMENTED (random online floor = owner decision 7) |
| Header signed in: eyebrow "K-pop Quiz", "Good evening, <em>Mingi</em>", streak line, no CTAs | components/home/ux-v1/home-header.tsx (client swap from /api/auth/me) | IMPLEMENTED |
| Header guest: H1 "Are you a real fan?", H2 "Prove it...", CTAs Browse K-pop quizzes + Create a quiz | home-header.tsx | IMPLEMENTED |
| Quiz of the day row: label + countdown, real title, meta line (type, level, questions, average, time), Play `startQuiz(0,null,'qotd')` | qotd-row.tsx + lib/ux-v1/p1/home-data.ts getHomeQotd; Play -> /q/<slug>?daily=quiz | IMPLEMENTED (shows "Picked on June 30" until QOTD_ROTATION_FIX=1: owner decision 15) |
| Continue playing (signed in, 3 rows, progress bar, `startQuiz(n)`) | continue-playing.tsx (lib/ux-v1/p4/continue.ts) | IMPLEMENTED |
| Groups rail + "All 90 groups" | groups-rail.tsx + SectionHeader | IMPLEMENTED (17 live hub links, owner decision 17) |
| Trending this week grid (UxQuizCard) + "See all" `openQuizzes('Trending')` | ux-home.tsx; See all -> /quizzes/popular-this-week | IMPLEMENTED (6 cards instead of 4, link target kept from live: decision 17) |
| All time best rows (rank numbers, top 3 pink) + "Most played" `openQuizzes('Most played')` | quiz-rows.tsx BestRows; link "Most liked" -> /most-liked | PARTIAL: link label/target differ from the prototype ("Most played" -> sorted /quizzes); recorded in decision 17 |
| New quizzes rows (type glyph, age) + "See all new" | quiz-rows.tsx NewRows, /new | IMPLEMENTED |
| Blindtest band: kicker with time left, H2, fans-played line, Play the daily, All blindtest modes, "Your best 8/10"; played state (`markDaily`) | blindtest-band.tsx | IMPLEMENTED |
| From the community rows + "Open community" | community-rows.tsx | IMPLEMENTED (+ Verse/Discord lines kept: decision 17/31) |

### 1.3 Groups index + group hub (P3) - prototype `<main id="groups">` `renderAZ()`, `<main id="hub">` `openG()/renderHub()`

| Prototype element | Implementation | Verdict |
|---|---|---|
| /groups H1 + intro, filter input "Filter 90 groups" (`renderAZ(v)`), Most played rail (hidden while filtering), A to Z with letter groups, count "N of 90 groups", muted "No quiz yet" rows, empty filter state | app/(site)/groups + components/group/ux-v1/groups-index.tsx, groups-browser.tsx | IMPLEMENTED (H1 stays live "All K-pop groups", SEO lock; decision 20/21) |
| Hub breadcrumb Groups / <Group> | hub.tsx `.p3-crumb` | IMPLEMENTED (live trail kept, decision 21 "for review") |
| Split hero: eyebrow (fandom · gen · label), H1 "<Group> Quiz", lead, actions Play the top quiz + Blindtest, facts line, photo right | hub.tsx | IMPLEMENTED |
| Hero "Blindtest" button = `btStart(HUB.name+' blindtest')` (group playlist game, day mode) | hub.tsx:232 -> `/blindtest/group-<slug>` | PARTIAL / BROKEN DOOR: lands on the legacy [mode] page (app/(site)/blindtest/[mode]/page.tsx renders the legacy BlindTestPlayer, which fails on Play today per RUN-STATE "BUG IN PRODUCTION TODAY"). No v11 deep link (`/blindtest?playlist=`) exists: controller.tsx only handles ?daily=true and ?c= (see X1-001) |
| Quizzes section: sort Popular/Newest/Most liked/Hardest, Type + Level dropdowns, cards, "Show all N" real link | hub-quizzes.tsx (12 cards + native `<details>` Show all) | IMPLEMENTED (C1 known deviation: 12 cards + Show all) |
| About <Group> prose + trivia link | hub.tsx | IMPLEMENTED |
| Questions fans ask (8 FAQ, first open) + FAQPage JSON-LD | hub.tsx (live FAQ, JSON-LD unchanged) | IMPLEMENTED |
| From the community rows + All posts; empty: "No posts about X yet. Start the first thread" (`openEditor('thread')`) | hub.tsx:317-341; empty link -> /community | PARTIAL (nit): empty-state link opens /community, not the editor sheet |
| Fans also play rows | hub.tsx:350 | IMPLEMENTED |
| Fandom war line "X is #N ... See the war" | hub.tsx:370 | IMPLEMENTED |
| Empty group state (c=0: "No X quizzes yet...", Make the first quiz, Notify me, lower sections hidden) `openG('ATEEZ')` variant = hub-empty | hub.tsx:226-227 + hub-notify.tsx | IMPLEMENTED (Notify me fails soft until v11-p3-group-quiz-alerts.sql: DEFERRED, pending migration) |
| Empty hubs noindex until 3 quizzes | not shipped | DEFERRED (owner decision 8) |

### 1.4 Quizzes browse (P2) - prototype `<main id="quizzes">`, `qSort()`, `ddOpen()/ddPick()`, `renderQ2()`, `qClear()`

| Prototype element | Implementation | Verdict |
|---|---|---|
| Header H1 "Quizzes" + count line + "Create a quiz" ghost | app/(site)/quizzes/ux-page.tsx + components/quizzes/ux-v1/quizzes-page.tsx:90 | IMPLEMENTED (live H1/intro/breadcrumb kept, SEO lock: decision 19) |
| Sort segmented Trending/Newest/Most played/Top rated | controls.tsx + lib/ux-v1/p2/filters.ts:46-49 (server-side sort, real links) | IMPLEMENTED (default shown "Most played" = live default, decision 19) |
| Type / Level / Group dropdowns (`ddOpen`) | controls.tsx (A0 UxDropdown href options) | IMPLEMENTED (verified on :3021: Type, Level, Group, no Language block) |
| Removable filter chips (`QF[k]=null`) | controls.tsx P2Chip (link without the filter, aria-label "Remove X filter") | IMPLEMENTED |
| Grid of UxQuizCard, rows on phones | results.tsx | IMPLEMENTED |
| Empty state "No quizzes match these filters / Try another level or group / Clear filters" | ux-page.tsx:108-112 (verified live with ?type=intruder&level=hard&group=bts) | IMPLEMENTED |
| "Load more quizzes" real /quizzes?page=2 | results.tsx:96 (?page=N shows 1..N, rel=next) | IMPLEMENTED |
| Home "See all" deep links `openQuizzes('Trending'|'Most played'|'Newest')` -> /quizzes?sort= | /quizzes?sort=newest 200 | IMPLEMENTED (home links keep live targets, see 1.2) |
| Language dropdown, Create banners, popular-* subpages | not redesigned | N/A per decision 19 (not in the prototype either, except popular-* which the prototype does not show) |
| Publication of P2 | branch ux11/p2-quizzes local only, not merged to feat/ux-v1-v11 | OPEN: owner push (RUN-STATE "WAITING ON THE OWNER"); C1 quizzes x4 and C2 7 rows still "pending P2" |

### 1.5 Quiz page, game, results (P4) - prototype `<main id="quiz">`, `#play` (`startQuiz/renderQ/answer/nextQ/quitQuiz`), `#end` (`endQuiz`), `#confirm`, `openShare()`

| Prototype element | Implementation | Verdict |
|---|---|---|
| Breadcrumb Quizzes / <Group> / title, cover, H1, meta line, author + Follow | components/quiz/ux-v1/quiz-page.tsx, intro-islands.tsx P4Follow (/api/follow) | IMPLEMENTED |
| Start quiz + Share this quiz (`openShare('quiz')`) | intro-islands.tsx:44-46 | IMPLEMENTED |
| Timer line + "Play without a timer" / "Use the timer" (`toggleRelaxed`) + "No account needed" (guest) | intro-islands.tsx:52-60, shown only when `quiz.relaxedLive` | DEFERRED (v11-p4-relaxed-runs.sql pending; hidden until applied) |
| Hall of fame rows + "N perfect scores · fastest" + mine row (Your best, Beat it, Challenge a friend `openShare('challenge')`) / guest "Play to put your name on this board." | quiz-page.tsx:146 + intro-islands.tsx P4HofMine | IMPLEMENTED (guests shown as "someone": decision 10) |
| Did you know (yellow bulb) + "Learn before you play: X trivia" | quiz-page.tsx:171-181 | IMPLEMENTED |
| About this quiz (bordered box) | quiz-page.tsx:187 UxBox | IMPLEMENTED |
| In this quiz (3 sample questions + "N more") | quiz-page.tsx:198 | IMPLEMENTED |
| More <Group> quizzes (text cards) + "All N" | quiz-page.tsx:238 | IMPLEMENTED |
| Made by block + Report this quiz (`toast('Report form')`) | quiz-page.tsx madeby + report.tsx (real report sheet) | IMPLEMENTED |
| Sticky Start on phones (`#sstart`, IntersectionObserver) | intro-islands.tsx P4StickyStart | IMPLEMENTED |
| Game bar: quit X, title or challenge chip "Beat X: 7/8", segmented progress (ok/no/cur), "N in a row" from 3, score "correct", sound toggle | components/quiz/ux-v1/game.tsx:130-140 | IMPLEMENTED |
| Timer ring 76px, number only, danger/warn, aria "N seconds left", "5 seconds left" announce, relaxed clock icon | game.tsx:107, quiz-run.tsx:195 | IMPLEMENTED (relaxed clock DEFERRED with the migration) |
| "Question N of M", H1 question, answers 1-4 keys, Correct / Your pick labels, Did you know fact, Next question / See your result + Enter | game.tsx | IMPLEMENTED |
| Quit confirm sheet "Leave this quiz?" Leave / Keep playing, no confirm when 0 answered; left run appears in Continue playing | quiz-run.tsx:543-546 (A0 confirm-sheet) + lib/ux-v1/p4/continue.ts | IMPLEMENTED |
| Results photocard: KpopQuiz / Play no. N, stamp (Korean + English), group kicker, title, count-up score, "You beat N%", mascot, confetti | results.tsx:157-163 | IMPLEMENTED |
| XP + streak line (signed in) / "Save your 7/8 and start a streak. Sign in to save" (guest, `saveScore()`) | results.tsx:173-178 | IMPLEMENTED |
| You / Average / Time bordered row | results.tsx:185-186 | IMPLEMENTED |
| Rank line "#38 of 2,375 players · your best" / challenge win-lose line | results.tsx:194-195 | IMPLEMENTED (guest rank line needs v11-p4-rank-for-score.sql: DEFERRED) |
| Share / Play again, primary by score vs average; like heart with count (`likeQ`) | results.tsx:138-139, 320 (/api/quiz/[id]/like) | IMPLEMENTED (+ live Discord line and Brag kept: decision 30) |
| Keep playing: Next quiz card, a same-group quiz row, "<Group> blindtest" row `btStart('BTS blindtest')`, "All BTS quizzes" | results.tsx:211-239; blindtest row -> `/blindtest/group-<slug>` | PARTIAL: blindtest row lands on the legacy [mode] player (X1-001) |
| Comments accordion "Comments (12)": form with avatar, textarea, score chip, Send; comment rows with flair + heart like `likeC` + Reply | comments.tsx (GET/POST /api/quiz/[id]/comment, PersonName) | PARTIAL: comment hearts and Reply not rendered ("no like or reply store yet", comments.tsx:34); no pending migration covers quiz_comments likes (community_likes targets exclude quiz comments) and no owner decision names it (X1-002) |
| Report this quiz under comments | results.tsx:248 | IMPLEMENTED |
| Share sheet (`#share`): mini card with real numbers, Copy link, Story image, More apps, Discord, challenge link block 48 h | components/ux-v1/share-sheet.tsx + quiz-run.tsx:498 | IMPLEMENTED (challenge link signature env optional: decision 11) |

### 1.6 Create (P5) - prototype `<main id="create">`, `setStep()`, `nextStep()`, `publishNow()`, `openQ()`, `pickAns()`, sign-in at Publish (`requireAuth`)

| Prototype element | Implementation | Verdict |
|---|---|---|
| Header H1 "Create a quiz" + intro | app/(site)/create + components/create/ux-v1/create.tsx | IMPLEMENTED with deviation: live H1 "What's your quiz about?" kept (SEO lock, decision 23) |
| Stepper Details / Questions / Publish (clickable, done state) | create.tsx:35-37 | IMPLEMENTED |
| Step 1: title (5+ chars, inline error), About (280 counter), Quiz type 5 radio rows with examples (locked once questions), Group search chip (90 groups), Difficulty segmented + help line, Language, Cover image drop + rights checkbox | details.tsx:41-168, group-field.tsx | IMPLEMENTED |
| Step 2: question list (drag handle, number, text, Ready / "N answers missing", Duplicate, Delete), open item editor (question, 4 answers with correct circle, fun fact, Add an image), Add a question, Paste several at once | questions.tsx (lib/ux-v1/p5/questions.ts) | IMPLEMENTED |
| Step 3: "How it will look" (UxQuizCard preview) + checklist rows (Title, Type and group, N complete, Cover, Fun fact) + incomplete-question help | publish.tsx | IMPLEMENTED |
| Sticky bar: status line (draft saved), Back, Next label per step (Add questions / Review and publish / Publish quiz) | create.tsx:40, 182 | IMPLEMENTED |
| Sign in at Publish, draft kept (`requireAuth('Sign in to publish'...)`) | create.tsx:99-116 | IMPLEMENTED |
| Done state: mascot, "It's live", URL box + Copy, Open your quiz, Post a challenge (`openEditor('challenge')`) | done.tsx | IMPLEMENTED (Post a challenge -> P8 composer via /community?compose=challenge) |
| Tab bar + footer hidden while creating (create-mode) | A0 use-shell-mode | IMPLEMENTED |

### 1.7 Blindtest hub, game, results (P6) - prototype `<main id="blindtest">`, `pop('plmenu')`, `setPl/plFilter`, `btStart/btRender/btPick/btNext/btQuit/btEnd`, `renderBtg/btgFilter/btgMore`, `markDaily`

| Prototype element | Implementation | Verdict |
|---|---|---|
| Hero (day mode gradient): eyebrow "N fans playing today", H1 "Name that K-pop song.", lead | components/blindtest/ux-v1/hub.tsx:79-80, islands.tsx:35-43 | IMPLEMENTED (lead keeps live copy, SEO lock) |
| Setup row: Playlist button + menu, 5/10/15 songs segmented, Start, "Your best 8/10 · Idol" | setup.tsx | IMPLEMENTED |
| Playlist menu: All K-pop (4,120 songs), Groups header + count + "Find a group" filter, 79 group rows with song counts, Mixes: Girl groups, Boy groups, By generation, Title tracks only, Recent hits 2024-2026, Legends before 2018, Speed round (5-second clips) | setup.tsx + lib/ux-v1/p6/playlists.ts:26-40 | PARTIAL / DEFERRED: Recent hits, Legends and Speed round are absent (owner decision 12: need generate support); By generation opens 1st..5th sub-items instead of one "4th gen" item |
| "2 challenges waiting" section (signed in: rows with Accept, `btStart('Challenge from X',{who,score})`) | none | DEFERRED (owner decision 12: needs an invitee column; no migration file written) |
| Ways to play: Blindtest of the day (count + time left), Ranked (tier/points or season/days), Challenge a friend (48 h) | islands.tsx:49-110, hub.tsx:85-92 | IMPLEMENTED (Ranked foot hidden until ranked is live: decision 2) |
| Today's board top 5 + your row; How it works (3 steps) | islands.tsx:117, hub.tsx:100-106 | IMPLEMENTED ("Resets at midnight UTC" vs prototype "KST": real rule) |
| Play by group: search "Search 79 groups", popular six photo tiles, 4-col index first 24, Show all 79 groups, empty "No group matches...", popular row hidden while searching | islands.tsx:171-234 | IMPLEMENTED |
| FAQ "Questions about the blindtest" (4 accordions) + JSON-LD | hub.tsx:130 (live FAQ kept) | IMPLEMENTED |
| Daily one try: `btStart('Blindtest of the day')` when played -> toast + scroll to board | controller.tsx (PLAYED_TOAST, ?daily=true) | IMPLEMENTED |
| Game bar: quit, playlist or challenge chip, segments, points + combo, Replay, Sound | game.tsx:103-114 | IMPLEMENTED |
| Orb timer (10 s), listening state, Song round / Artist round chip, H1 question, 4 answers 1-4 keys, reveal album art + verdict, "+N speed +x" popup, auto next 3 s + Enter | game.tsx:90-202 | IMPLEMENTED |
| Quit (`btQuit`: toast, ranked "Run recorded...") | game.tsx run.quit | IMPLEMENTED |
| Results card: kicker, score /10, label + points, Best combo / Average answer / XP | results.tsx:47-93 | IMPLEMENTED |
| Mode-aware primary: Play again / Play another ranked run / See today's board; Share; "Challenge a friend with these exact songs" Copy link; Your songs with replay per clip | results.tsx:104-111, challenge-link.tsx | IMPLEMENTED |
| Challenge outcome line on results (`B_.ch`: "You beat X" / "X wins this one") | results.tsx `challenge` prop | IMPLEMENTED |
| Group blindtest entry from other views (`btStart('<Group> blindtest')` on hub, results, search songs) | /blindtest/group-<slug> (legacy player) | PARTIAL: see X1-001 |

### 1.8 Ranked (P7) - prototype `<main id="ranked">`, `btStart('Ranked')`, `btEnd()` ranked branch (`#bt-season` tier chips)

| Prototype element | Implementation | Verdict |
|---|---|---|
| Breadcrumb Blindtest / Ranked, shield + tier, "Season 3 · ends in N days", H1 tier, points + ladder place | app/(site)/blindtest/ranked/page.tsx + components/ranked/ux-v1/card.tsx | IMPLEMENTED, populated state DEFERRED (v11-p7-ranked.sql + decision 2); not-live state shipped (card.tsx:94) |
| Progress bar to next division + "N points to Platinum III" | card.tsx | DEFERRED (same migration) |
| Play a ranked run + "Score over X to count · N of 15 runs left today" | card.tsx:58 | DEFERRED (API answers 503 not_live until the migration) |
| Best 5 runs line with (lowest) and total | card.tsx:71-72 | DEFERRED (same) |
| Tiers track Bronze..Master + Legend, divisions note | strip.tsx RankedTiers + tiers.tsx | IMPLEMENTED |
| Season ladder with Global / My fandom / Following + pinned own row | ladder.tsx (GET /api/ranked/ladder; min-gated while nobody is placed) | DEFERRED populated (migration) |
| How ranked works (6 accordions, first open) | rules.tsx:66 | IMPLEMENTED |
| Season rewards (3 rows) | rules.tsx:77 | PARTIAL: shown as designed but not built (owner decision 18) |
| Ranked run game + results season impact (tier chips Gold I -> Platinum III, "replaces your lowest...") | impact.tsx, controller.tsx, use-ranked-run.ts, lib/ranked/** | IMPLEMENTED in code, NOT live (btend-ranked C1 not verified until migration) |
| Engine rules (17.6) | lib/ranked/** (233 unit tests per C2) | IMPLEMENTED |
| /pt mirror for /blindtest/ranked | none | DEFERRED (decision 18) |

### 1.9 Community feed, post view, editor (P8) - prototype `<main id="community">`, `feedTab()`, `vote()`, `likeP()`, `cheer()`, `openPost(kind)`, `#editor` `openEditor/setMode/postIt`, `sendC/likeC`

| Prototype element | Implementation | Verdict |
|---|---|---|
| Header H1 "Community" + intro; composer (avatar, one field, New post) `openEditor('thread')` | app/(site)/community/page.tsx + components/community/ux-v1/feed.tsx:42 | IMPLEMENTED (noindex until owner decides: decision 9/27) |
| Tabs For you / Following / Blogs + group dropdown | feed.tsx:27-59 | IMPLEMENTED |
| Mobile: fandom war strip + daily debate in the feed; rail folded after 3rd post (Happening now + Badge watch) | war-strip.tsx, debate-panel.tsx, rail.tsx:92-108 | IMPLEMENTED |
| Post cards per type: challenge (score chip, replies strip, Take it), debate (options with %), blog (cover + excerpt), thread; actions heart / replies / share | feed-card.tsx + actions.tsx | PARTIAL / DEFERRED: fan debates, challenge posts and hearts are off until v11-p8-community.sql (decision 27); thread/blog cards only when VERSE_PUBLIC is 'true' (lib/ux-v1/p8/verse-gate.ts), so with production settings the feed is daily debates only |
| Show more posts | feed.tsx:135 | IMPLEMENTED |
| Rail: Daily debate (vote, results after vote), Happening now (pulse line + rows + Cheer), Badge watch (32px medallions) | debate-panel.tsx:139, rail.tsx:75-86, actions.tsx CheerButton (/api/cheer) | IMPLEMENTED (daily debate rotation risk: RUN-STATE "DAILY DEBATE ROTATION" owner call) |
| Post view: breadcrumb Community / group / type, author + Follow, H1 28px, cover (blog), body, debate vote with live results, challenge quiz card "Beat X: 7/8", actions like / replies / share | post-view.tsx, post-debate.tsx, app/(site)/community/[kind] | IMPLEMENTED within the same gates |
| Replies: "N replies", form with avatar + score chip, rows with flair + heart + Reply, nested once, "Show 14 more replies" | replies.tsx | IMPLEMENTED; hearts DEFERRED (community_likes pending) |
| More from the community rows + Open community | post-view.tsx | IMPLEMENTED |
| Editor sheet: modes Thread / Blog / Debate / Challenge, help line, Group chip, Title, Blog cover image, Text, Debate question + options 2..4 + Add an option + Closes in 1/3/7 days, Challenge "Your score to beat" pick + Message, Cancel / Post, sign-in at Post (draft kept) | editor.tsx | PARTIAL: blog cover image not built (decision 27 "no cover upload"); Debate / Challenge Post disabled until the migration; Thread/Blog only in a live Verse space |

### 1.10 Leaderboard (P9) - prototype `<main id="leaderboard">`, `lbTab()`, `renderLB()` (podium, lrows, pinned rows)

| Prototype element | Implementation | Verdict |
|---|---|---|
| H1 + "Week 38 · resets Monday at 00:00 KST" | app/(site)/leaderboard + components/leaderboard/ux-v1/leaderboard.tsx | IMPLEMENTED with deviation: H1 stays "Community" (SEO lock, decision 25) |
| Tabs Fandom war / Players / Ranked / Creators (icons, pink-soft pill) | leaderboard.tsx:48-57 + tabs.tsx (hash tabs) | IMPLEMENTED |
| Podium (frameless, #1 center) + rows with +n / -n change | panes.tsx, board.tsx | IMPLEMENTED (weekly change = real percent change, not rank moves: decision 25) |
| Pinned own row per tab (war: "STAY is #2 · you added N points" + Play for STAY; players/ranked/creators "#N mingi") | pins.tsx | IMPLEMENTED |
| Ranked tab: season line + "How ranked works" link + tier podium | ranked.tsx:72-89 | IMPLEMENTED, populated DEFERRED (ranked migration) |
| How points work (3 accordions) | points.tsx:27-40 | IMPLEMENTED |
| (extra) "Around the community" panels | around.tsx | Kept from live until /community is indexable (decision 25) |

### 1.11 Passport, settings, header sheet (P10) - prototype `<main id="you">` (`ptab()`, `openHeader()`, `openShare('passport')`, `renderBadges()`, `medal()`), `<main id="settings">` (`setFlair/setBias/headerNone/tgl/setTheme/dirty/saveS`), `#hsheet` (`headerFile/headerLink/headerNone`)

| Prototype element | Implementation | Verdict |
|---|---|---|
| Guest "you" view: mascot, H1 "Your K-pop passport", lead, Sign in (`openSignin('Open your passport',...)`), "Play a quiz first" | tab bar "You" opens the sign-in sheet for guests (ux-tab-bar.tsx); /me and /profile as a guest 307 -> legacy /login page | PARTIAL: no guest passport invitation view; a guest who follows a /me link lands on the legacy /login design (X1-004) |
| Band: header picture or main group photo over theme tint, "Change header" (owner) | components/profile/ux-v1/passport-band.tsx + header-picker.tsx | IMPLEMENTED |
| Head: avatar, Edit passport (/settings), Share passport (`openShare('passport')`); visitor gets Follow | passport-actions.tsx:91-97 | IMPLEMENTED |
| Identity row: H1 name in accent + font, bias chip, pinned badge medallion 28px, "Lv 7 · Stan"; meta line; XP bar to next level (theme colour); 5 stats | passport.tsx | IMPLEMENTED |
| Tabs Overview / Quizzes / History / Badges (hash #p10-panel-<id>) | passport.tsx:79-82 + passport-tabs.tsx | IMPLEMENTED (History tab only when history is public/available) |
| Overview: fandom war strip, Pinned badges + "All 20 badges", Groups mastered (bars), Recent activity + Full history | passport.tsx:92-126 | IMPLEMENTED |
| Quizzes tab: Your quizzes rows (Published · plays · likes · average; Draft row + Continue) + Create | passport.tsx:144-156 | IMPLEMENTED (drafts live in localStorage in the live funnel; check: no "Draft · Continue" row is rendered server side) |
| History tab (N quizzes and N blindtests) | passport.tsx:166-169 | IMPLEMENTED |
| Badges tab: "12 of 20 earned · colour and shape show rarity", rarity key (16px frames), 64px medallions, locked state | passport.tsx:175 + components/ux-v1/badge-medal.tsx | IMPLEMENTED |
| Signed-in /me live | render tests + /u/testtest guest only | NOT VERIFIED live (owner decision 1/4) |
| Settings Profile: photo, display name, username (+ 30-day rule), bio counter | settings.tsx:327-341 | IMPLEMENTED |
| Settings Fandom: group chips (main first) + Add a group | settings.tsx:346-367 | IMPLEMENTED |
| Your look (open): live preview "how you appear in Community", Name colour (7), Name font (3), Bias tag (member chips + No bias tag + custom + Use), Passport theme swatches (6), Header picture (Change / Use the theme colour), Pinned badge (22px medallions) | settings.tsx:377-456 (/api/auth/update-profile) | IMPLEMENTED |
| Notifications: 5 category toggles + 2 email toggles | settings.tsx:44-55, 468 | IMPLEMENTED; email toggles DEFERRED (v11-p10-email-prefs.sql) |
| Appearance System / Light / Dark + Sounds in games | settings.tsx:489-493 | IMPLEMENTED |
| Account: sign-in method, Download your data (Request), Sign out, Delete (confirm step) | settings.tsx:499-545 | IMPLEMENTED; real delete flow DEFERRED (decision 14: confirm sends to /contact) |
| Save bar (unsaved changes, Discard, Save changes) | settings.tsx:521-523 | IMPLEMENTED |
| Header picture sheet: upload (JPG/PNG/WebP 5 MB), "or paste a link" + Use, help line, "Use the theme colour instead"; closes by X/Esc/backdrop | components/ux-v1/header-picture-sheet.tsx + profile/ux-v1/header-picker.tsx + P10 upload/link routes | IMPLEMENTED; writes DEFERRED (v11-p10-header-storage.sql: routes answer 503 bucket_missing) |
| Flat theme-colour band mode as its own stored value | none | DEFERRED (decision 14: needs a column) |

### 1.12 Notifications, bell, search (P11) - prototype `<main id="notifs">` (`nrender(f)`, `nread()`, `markAll()`), `#bellpop` (`renderBell()`), `#sov` (`searchFilter()`)

| Prototype element | Implementation | Verdict |
|---|---|---|
| H1 Notifications + "N unread" / "All caught up" + Mark all read | components/notifications/ux-v1/notifications-page.tsx:196-198 | IMPLEMENTED |
| Filters All / Your quizzes / Social / Achievements | P11_FILTERS (lib/ux-v1/p11/notifications.ts) | IMPLEMENTED ("four filters", decision 24) |
| Pinned streak row (at risk: "ends in 5h 12m" + Play today's daily; after play: "Streak saved") | notifications-page.tsx:38-43 streakRow | IMPLEMENTED |
| Rows grouped Today / Yesterday / Earlier, unread dot + bold, whole row opens its target and marks read | notifications-page.tsx:77-97 (groupByDay, targetOf) | IMPLEMENTED (+ Dismiss / Mute row menu kept from live, decision 24) |
| Empty "Nothing here yet" | notifications-page.tsx:215 | IMPLEMENTED |
| Retention line + Notification settings link | notifications-page.tsx | IMPLEMENTED (60 days, the real rule: decision 24) |
| Bell panel latest 6 + Mark all read + See all | bell-panel.tsx (A0 slot) | IMPLEMENTED |
| Search overlay results | see 1.1 | IMPLEMENTED; song rows -> /blindtest/group-<slug> (X1-001) |
| /search page | live page inside the shell | N/A (no prototype state, decision 24) |

### 1.13 Sheets and dialogs (A0 + owners)

| Prototype sheet | Implementation | Verdict |
|---|---|---|
| `#signin` (title/sub from context, Google, Discord, "or", email + "Email me a sign-in link", "New here?" help; `AUTH_NEXT` continues the action) | components/ux-v1/sign-in-sheet.tsx (same Supabase calls + /auth/callback?returnTo=) | IMPLEMENTED (callback open redirect = separate owner task, RUN-STATE "SECURITY, LIVE SITE") |
| `#share` (6 variants: result, challenge, bt, post, passport, quiz) | components/ux-v1/share-sheet.tsx, used by P4, P6, P8, P10 | IMPLEMENTED |
| `#editor` | components/community/ux-v1/editor.tsx | PARTIAL (see 1.9) |
| `#hsheet` | components/ux-v1/header-picture-sheet.tsx | IMPLEMENTED (writes deferred, 1.11) |
| `#confirm` (Leave this quiz?) | components/ux-v1/confirm-sheet.tsx | IMPLEMENTED (also reused for Delete account) |
| `#ddpop` dropdown menus (role=menu, focus first item) | components/ux-v1/dropdown.tsx | IMPLEMENTED |
| Close by X, Escape, backdrop; focus returns (17.10) | components/ux-v1/sheet.tsx | IMPLEMENTED (C3 17/17) |

## 2. Worker prompt section 2 (scope) and section 6 (backend), per agent

| Agent | Section 2 scope | Status | Section 6 backend | Status | Implementing files |
|---|---|---|---|---|---|
| A0 | Tokens (--line/--line-2/--edge/--pink-line, qotd, bulb, hl), nav pill + icons + Home, tab bar, footer, buttons, cards (UxQuizCard v11.2, text card, post card, panel), section header pink icon, tabs/segmented/chips, sheets (sign-in, share, header, confirm), toast + live region, PersonName + BiasTag, BadgeMedal, icons, guard script, /ux-v1/kit | DONE | shell reads (/api/auth/me, notifications unread), /api/quizzes/count gated | DONE | styles/ux-v1/a0.css (tokens as --ux-*), components/ux-v1/*, components/layout/ux-v1/*, app/(site)/ux-v1/kit, scripts/ux11-owner-guard.mjs + scripts/ux11-hooks |
| P1 | ticker + centred header, QOTD calm row, continue, groups rail, trending, all time best, new, blindtest band, community rows | DONE (link deviations: decision 17) | QOTD read (title, type, level, count, real average, countdown), ticker endpoints reused, rotation root cause + code fix, greeting from profile | DONE in code; rotation fix OFF until owner sets QOTD_ROTATION_FIX=1 (decision 15) | app/(site)/page.tsx, components/home/ux-v1/*, lib/ux-v1/p1/*, lib/quiz-bank-scheduling.ts, api/cron/ensure-daily-quiz, api/qotd/publish |
| P2 | /quizzes sort, Type/Level/Group dropdowns + chips, grid, empty state, ?page=2 | DONE on the local branch | server-side filtering/sorting with real counts, ?page=N links | DONE on the local branch | app/(site)/quizzes/ux-page.tsx, components/quizzes/ux-v1/*, lib/ux-v1/p2/filters.ts + queries.ts. OPEN: not published / not merged (owner push) |
| P3 | /groups index, hub (split hero, facts, cards, about, trivia, 8 FAQ + JSON-LD, community, fans also play, empty state) | DONE except hub Blindtest button (X1-001) | counts from published quizzes, FAQ JSON-LD = visible text, photos next/image sizes; empty hubs noindex until 3 | DONE; noindex DEFERRED (decision 8); stale groups.quiz_count in SEO-locked text (decision 20) | app/(site)/groups, app/(site)/[slug], components/group/ux-v1/*, lib/ux-v1/p3/* |
| P4 | quiz page, in-game (ring, states, relaxed, challenge chip, quit confirm), results (photocard, stats, primary by score, share numbers, comments) | PARTIAL: comment hearts + Reply missing (X1-002); blindtest row (X1-001) | relaxed flag on play record (migration) + excluded from HoF/quiz_time_stats; results from the run; comments + heart likes through existing endpoints; challenge win/lose | relaxed DEFERRED (v11-p4-relaxed-runs.sql); "heart likes" done for the quiz like, not for comments; challenge DONE (battles, signed links) | app/(site)/q/**, components/quiz/ux-v1/*, lib/ux-v1/p4/*, api/ux-v1/p4/{challenge,relaxed,standing} |
| P5 | create funnel re-skin, sign-in at Publish | DONE (H1 kept live: decision 23) | sign-in at Publish keeps the draft, publishes after auth | DONE | app/(site)/create, components/create/ux-v1/*, lib/ux-v1/p5/* |
| P6 | /blindtest hub (day mode, playlist menu, play by group, challenges, board, FAQ), game, results, daily one try | PARTIAL: 3 mixes + "challenges waiting" DEFERRED (decision 12) | playlists from getAdvertisablePlaylists (79), daily one try (daily_blindtest_scores), results + replays from the run | DONE | app/(site)/blindtest/page.tsx, components/blindtest/ux-v1/*, lib/ux-v1/p6/* (hub-data.ts uses getAdvertisablePlaylists), api/ux-v1/p6/{board,challenge} |
| P7 | ranked page UI + engine + tests | DONE in code; NOT live | full engine per 17.6 (run token, 4/4/2 draw, 6+4 rounds, scoring, best 5, tiers/divisions, Legend nightly, 15/day, placement, quits, ties, impossible timings), migration, vitest | DONE in code (233 tests); DEFERRED live (v11-p7-ranked.sql, decision 2); draw uses songs.tier until stats exist (decision 32); Season rewards not built (decision 18) | app/(site)/blindtest/ranked, components/ranked/ux-v1/*, lib/ranked/**, api/ranked/{run,me,ladder,cron} |
| P8 | feed, rail, post view per type, editor 4 modes, replies, likes, debates, challenges, happening now, badge watch | PARTIAL: blog cover upload not built; fan debates, challenges, hearts off until migration; Verse items only with VERSE_PUBLIC | posts/blogs/debates/challenges/replies/likes on existing tables; flair names; missing tables -> pending migration, fail soft | DONE fail-soft; DEFERRED (v11-p8-community.sql, decision 27); daily debate rotation owner call | app/(site)/community/**, components/community/ux-v1/*, lib/ux-v1/p8/*, api/ux-v1/p8/* |
| P9 | tabs, podium, rows, pinned row, how points work | DONE (H1 kept "Community": decision 25) | fandom war, players, ranked, creators from real aggregates; pinned row | DONE (Players = all-time XP; ranked tab empty until P7 live) | app/(site)/leaderboard, components/leaderboard/ux-v1/* |
| P10 | passport (band, change header, flair, pinned medallion, badges, tabs), settings (Your look, notifications, appearance, account), header upload + link route | DONE in code; guest passport view missing (X1-004); signed-in /me NOT verified live | Your look via /api/auth/update-profile; header upload (bucket, type, 5 MB, 1500x300) + link (https only, no private IPs, copy to storage); badges rarity + names + art fallback | DONE in code; header writes DEFERRED (v11-p10-header-storage.sql, 503 bucket_missing); email prefs DEFERRED (v11-p10-email-prefs.sql) | components/profile/ux-v1/*, api/profile/header/{upload,link}, api/ux-v1/p10/export, lib/ux-v1/p10/* |
| P11 | notifications page, bell panel, search overlay results | DONE | notifications store + mark-read; bell latest 6; search groups, quizzes (+ matched group's), songs | DONE (song rows -> legacy mode pages: X1-001) | components/notifications/ux-v1/*, components/search/ux-v1/search-results.tsx, lib/ux-v1/p11/*, api/ux-v1/p11/search |
| C1 | pixel check | 136 pass / 0 fail / 16 not verified (quizzes x4 pending P2; ranked x4, btend-ranked x4, post-challenge x4 wait for migrations) | - | - | v11/checks/pixel/ |
| C2 | backend check | 196 pass / 0 fail / 33 not verified / 7 pending P2 / 31 n/a | - | - | v11/checks/backend/ |
| C3 | QA + REPORT.md | DONE locally, unpublished (e464a46); P2 PENDING, P7 populated NOT verified | - | - | v11/REPORT.md on ux11/c3-check (local) |

## 3. DESIGN-SPEC 17.1 to 17.11, bullet by bullet

| Bullet | Where | Verdict |
|---|---|---|
| 17.1 Every box bordered with light tokens (--line #ECE8E3/#2B2826, --line-2, --edge, --pink-line hover, no shadow) | styles/ux-v1/a0.css:22,55,81 (--ux-line etc.) | IMPLEMENTED (C1 44 tokens pass) |
| 17.1 Box list: quiz cards, community posts (r20, 24/26, 16 gap), rail panels + debate options, QOTD card, About this quiz, results stats row, popovers, menus, identity preview | components/ux-v1/{quiz-card,post-card,panel,popover}.tsx, p4 UxBox, p10 preview | IMPLEMENTED (C1 pass; exact values = X2's scope) |
| 17.1 Nav icon + label, Home back, active filled pink pill 38px; mobile tab bar pink-soft pill | ux-nav-links.tsx, ux-tab-bar.tsx | IMPLEMENTED |
| 17.1 Section titles 20px pink line icon | components/ux-v1/section-header.tsx | IMPLEMENTED |
| 17.1 Links pink-ink, underline on hover | a0.css .ux-lnk | IMPLEMENTED |
| 17.1 Tabs active pink-soft pill (community, leaderboard, passport) | components/ux-v1/tabs.tsx | IMPLEMENTED |
| 17.1 Segmented active pink-ink; filter chips and post type chips pink-soft | segmented.tsx, chip.tsx | IMPLEMENTED |
| 17.1 Top 3 ranks pink-ink; pinned leaderboard row pink-soft | leaderboard board.tsx, panel.tsx PinnedRow, home quiz-rows.tsx | IMPLEMENTED |
| 17.1 Logo unchanged (pink K tile + KpopQuiz) | components/ux-v1/brand.tsx | IMPLEMENTED under the flag (live rabbit vs K tile: owner decision 5) |
| 17.1 Search = icon button at every width, "/" opens | ux-nav-actions.tsx:183-190 | IMPLEMENTED |
| 17.2 Ticker, centred header (guest SEO copy / signed-in greeting + streak line) | P1 home-header.tsx, activity-ticker.tsx | IMPLEMENTED |
| 17.2 QOTD: one bordered row, gradient, label + countdown, real title, one meta line, one Play; mobile stacks; no tag, no preview | qotd-row.tsx | IMPLEMENTED |
| 17.2 Backend bug: fix rotation scheduler | lib/quiz-bank-scheduling.ts, api/cron/ensure-daily-quiz (QOTD_ROTATION_FIX) | DEFERRED (env off, owner go: decision 15) |
| 17.3 Global pink/border rules on quizzes, groups, hub, leaderboard | P2, P3, P9 | IMPLEMENTED (P2 unpublished) |
| 17.3 Group photos from public/idols via next/image + sizes, never 480px copies; typographic cover otherwise | quiz-card.tsx:88, hub.tsx:248, group-avatar.tsx:27, groups-rail.tsx | IMPLEMENTED (C3: images served at size) |
| 17.4 About this quiz bordered | quiz-page.tsx:187 | IMPLEMENTED |
| 17.4 Timer ring 76px, number only, aria "N seconds left" | styles/ux-v1/p4.css:125, game.tsx:107 | IMPLEMENTED |
| 17.4 Results You / Average / Time bordered row max 440, real average and plays | results.tsx:185 | IMPLEMENTED |
| 17.5 No plum: hub hero, home band, game, results on pink-lilac gradient | p6.css, p1 band (no plum colour found in p6.css) | IMPLEMENTED |
| 17.5 Game: white orb pink ring, song chip pink-soft, artist chip lavender-soft, standard answer states | game.tsx:158 | IMPLEMENTED |
| 17.5 Playlist menu: All K-pop, every group (79) searchable with counts, then the mixes (girl, boy, generation, title tracks, recent hits, legends, speed round) | setup.tsx, lib/ux-v1/p6/playlists.ts | PARTIAL: recent hits, legends, speed round missing (DEFERRED, decision 12) |
| 17.5 Play by group v11.1 (search, popular six tiles, 4/3/2 col index 48px rows, hover play icon, first 24, Show all 79, live filter, empty line; popular = 30-day blindtest plays) | islands.tsx:171-234 | IMPLEMENTED |
| 17.5 Playlist rule: >= 10 clean active songs in `songs` | lib/blind-test-playlists.ts via lib/ux-v1/p6/hub-data.ts | IMPLEMENTED (C2: 79) |
| 17.6 Ranked rules (scoring, season best 5, tiers + divisions, Legend top 100 nightly, 15/day, 8-week seasons, placement, quits, ties, server-drawn 4/4/2 + 6/4, server timing) | lib/ranked/** | IMPLEMENTED in code; live DEFERRED (v11-p7-ranked.sql + decision 2); draw by songs.tier until stats (decision 32) |
| 17.7 Bordered posts and rail panels | post-card.tsx, panel.tsx | IMPLEMENTED |
| 17.7 Comment likes = heart + count, pink when liked | community replies.tsx LikeButton; quiz results comments.tsx | PARTIAL: community hearts DEFERRED (v11-p8-community.sql); quiz results comment hearts MISSING (X1-002) |
| 17.7 Names with identity flair; more pink (type chips, tabs, liked hearts) | post-card.tsx, person-name.tsx | IMPLEMENTED |
| 17.8 Flair columns + validation reused (lib/passport-flair.ts, passport-themes.ts, /api/auth/update-profile) | settings.tsx | IMPLEMENTED |
| 17.8 Settings > Your look open, live preview, colour, font, bias chips from main group + custom, theme, header, pinned badge | settings.tsx:377-456 | IMPLEMENTED |
| 17.8 Flair everywhere a person is named (posts, comments, hall of fame, happening now, leaderboard players, passport) | PersonName in post-card, replies, comments, quiz-page (HoF), rail, board/pins/ranked/around, ladder, blindtest islands (board), hub; passport H1 accent class + BiasTag | IMPLEMENTED |
| 17.8 Header picture sheet: upload (JPG/PNG/WebP 5 MB, 1500x300), link (server fetch, copy, no hot-link), theme colour; default = main group photo blurred over theme tint | header-picture-sheet.tsx, api/profile/header/{upload,link}, passport-band.tsx | IMPLEMENTED in code; writes DEFERRED (bucket migration, decision 14) |
| 17.8 Badges: BadgeMedal SVG, rarity frames + gradients, glyph map (20 ids + family fallback), earned shadow + hover tilt, locked dashed, sizes 64/32/28/22/16, names + live counts | components/ux-v1/badge-medal.tsx (all 20 glyph ids present), passport.tsx, rail.tsx:60 (32), settings picker | IMPLEMENTED |
| 17.9 Create, new thread: validated, no change | P5, P8 editor | IMPLEMENTED (P5 H1 kept live: decision 23) |
| 17.10 Lighter borders, QOTD minimalist, play by group, medallions | see above | IMPLEMENTED |
| 17.10 Guest state: auth content rendered per session, never display:revert | A0 useUxMe + server rendering | IMPLEMENTED |
| 17.10 Every sheet closes by X, Escape, backdrop and returns focus | components/ux-v1/sheet.tsx | IMPLEMENTED (C3 17/17) |
| 17.10 "Save your 8/8 and start a streak. Sign in to save" one centred line with a space | results.tsx:177-178 | IMPLEMENTED |
| 17.11 Home order ticker > header > QOTD; ticker 44/40px, LIVE, 3.5 s cycle, reduced motion, "N fans playing now", renders nothing when empty | ux-home.tsx:42-46 + activity-ticker.tsx | IMPLEMENTED (random floor: decision 7, not real data) |
| 17.11 Header metrics (max 760, H1 clamp 32-48, eyebrow inside H1, --hl accent, H2 sub for guests, CTAs) | home-header.tsx, p1.css | IMPLEMENTED |
| 17.11 QOTD --qotd-bg / --qotd-edge | a0.css:35,67 | IMPLEMENTED |
| 17.11 UxQuizCard redo (flush 4:3 photo, eyebrow, title 2 lines, difficulty bars + plays, hover lift/zoom; mobile 96px rows) | components/ux-v1/quiz-card.tsx | IMPLEMENTED |
| 17.11 Yellow bulb --bulb / --bulb-fill (quiz page + in-game fact) | a0.css:40,72; quiz-page.tsx:171, game.tsx fact | IMPLEMENTED |
| 17.11 window.UX_VERSION | prototype only | N/A |

## 4. Worker prompt section 8 (definition of done)

| DoD line | Status | Why / evidence |
|---|---|---|
| Every prototype state: C1 pass | OPEN | 136 pass / 0 fail / 16 not verified of 152 (RUN-STATE C1 row): quizzes x4 waited for P2 (P2 now served locally on :3021 but not merged, never re-run by C1); ranked x4 (not-live only), btend-ranked x4 and post-challenge x4 wait for migrations. Also: C1 covers the 38 capture states only; the extra views in section 1 (guest passport, challenges waiting, 3 mixes, comment hearts) have no capture state |
| Every WIRING-MAP row: C2 pass | OPEN | 196 pass / 0 fail / 33 not verified / 7 pending P2 / 31 n/a (267 rows). The 7 /quizzes rows were never run; the 33 NV wait for owner decision 1 (production writes) or pending migrations |
| C3: all green | OPEN | REPORT.md final only on the local, unpublished ux11/c3-check (e464a46): P2 PENDING, P7 populated NOT verified; 37 expected QA failures (36 legacy contrast inside the shell, 1 keyboard on the pre-P2 /quizzes to re-run); Lighthouse "pending the owner" |
| Flag off unchanged (parity e2e + data-guard green) | PARTIAL | data guard green (C2 loops 1-3); per-agent flag-off identity proofs and C3 SEO diff (34 URLs, robots, sitemap 2998) green; `e2e/ux-v1/parity.spec.ts` deliberately not run (loads /profile signed in: decision 1/4), so the "parity e2e" half is not met |
| Pending migrations written, none applied | MET | 7 files in docs/pending-migrations/v11-*.sql (p3 alerts, p4 relaxed, p4 rank-for-score, p7 ranked, p8 community, p10 header storage, p10 email prefs); RUN-STATE lists none applied |
| Owner decisions listed (QOTD job go, ranked go-live, header bucket, new tables) | MET | RUN-STATE "Owner decisions needed" 1-32 + security/fake-data/bug notes |
| One PR feat/ux-v1-v11 -> main, draft until green, with REPORT.md | PARTIAL | PR #66 open, draft (head 56b219f); REPORT.md is not on the PR branch (C3 branch unpublished) and P2 is not in it |
| RUN-STATE says DONE | OPEN | "Phase 4, WAITING ON THE OWNER" |
| Test-user storage state deleted | OPEN (in use) | `.claude/worktrees/agent-a9bd5520faca1c0ac/apps/quiz/e2e/.auth/test-user.json` exists (written 2026-09-27 17:01, likely the running X2 audit); must be deleted when X2 ends. Contents not read |
| No worktree left with uncommitted work | OPEN (not re-checked by X1: git -C into other worktrees is blocked for this agent); RUN-STATE says only .worktrees/play-seo (owner's) |

## 5. Gap list

| Id | Owner | Severity | What is missing | Where the prototype shows it |
|---|---|---|---|---|
| X1-001 | P3, P4, P11 (+ P6 for the entry point) | blocker | Every v11 "play this group's blindtest" door leads to the legacy `/blindtest/group-<slug>` page (app/(site)/blindtest/[mode]/page.tsx renders components/blind-test/blind-test-player.tsx), which fails on Play: it reads `data.songs[0]` (blind-test-player.tsx:244) while /api/blind-test/generate returns `questions` (route.ts:341). Doors: hub hero "Blindtest" (components/group/ux-v1/hub.tsx:232), results "Keep playing" blindtest row (components/quiz/ux-v1/results.tsx:236), search "Songs in the blindtest" rows (lib/ux-v1/p11/search-model.ts:171). The v11 game has no playlist deep link (components/blindtest/ux-v1/controller.tsx handles only ?daily=true and ?c=). Fix idea: P6 adds `/blindtest?playlist=group-<slug>` (or the [mode] page renders the v11 game under the flag), then P3/P4/P11 point to it | hub `btStart(HUB.name+' blindtest')` (renderHub), end view row `btStart('BTS blindtest')`, search `btStart('<artist> blindtest')` (searchFilter): all start the day-mode game in place |
| X1-002 | P4 | should | Results comments have no heart like and no Reply (components/quiz/ux-v1/comments.tsx:34 "no like or reply store yet"). No pending migration covers quiz comment likes (v11-p8-community.sql community_likes targets exclude quiz_comments) and no owner decision names it; DESIGN-SPEC 17.7 and WIRING-MAP line 370 require the heart + count | `#end` Comments: `.cmt .ca` `likeC(this)` heart + count and Reply |
| X1-003 | A0 | nit | Avatar menu "My quizzes" goes to `/u/<username>` (overview), not the Quizzes tab, and has no draft count (`<small>1 draft</small>`). P10 already opens a tab from `#p10-panel-quizzes` (passport-tabs.tsx:37) | `#avapop` `go('you');ptab('quizzes')` |
| X1-004 | P10 (+ A0 for the tab bar) | should | No guest passport view: the prototype's signed-out `you` shows an invitation (mascot, H1 "Your K-pop passport", lead, Sign in, "Play a quiz first"). The tab bar opens the sign-in sheet instead, but /me and /profile as a guest 307 to the legacy /login page (legacy body inside the v11 shell) | `#you section[data-auth=out]` |
| X1-005 | P3 | nit | Hub with no community posts: "Start the first thread" links /community instead of opening the editor; `/community?compose=thread` already exists (components/community/ux-v1/editor.tsx:32) | renderHub `hb-com` empty: `openEditor('thread')` |
| X1-006 | P2 (publish: owner) | blocker | /quizzes v11 exists only on the local branch ux11/p2-quizzes; not merged into feat/ux-v1-v11 / PR #66. C1 quizzes x4 never compared, C2's 7 /quizzes rows never run, C3's keyboard failure on the pre-P2 /quizzes not re-run | `#quizzes` |
| X1-007 | C3 (publish: owner) | blocker (DoD) | REPORT.md, the QA specs and the SEO diff live only on the local ux11/c3-check (e464a46); PR #66 has no REPORT.md, so DoD "one PR ... with REPORT.md" is not met | worker prompt section 8 |
| X1-008 | C1 / X2 (ORCH to schedule) | should | Prototype states outside the 38 capture states were never pixel-checked. Most important: every non-ranked blindtest results screen (quick play `btEnd()`, daily with "See today's board", challenge line) since the only results state, btend-ranked, is "not verified". Also: streak popover, avatar menu, quit confirm sheet, relaxed/challenge game chip, results below average (Play again primary), comments open, /quizzes with chips and empty state, /groups filtered and empty, create done state, editor thread/blog/challenge modes, post-thread, leaderboard Players/Ranked/Creators tabs, passport Quizzes/History tabs, settings save bar, notifications filters and empty, search typed and no-results, share variants (quiz, challenge, blindtest, post, passport), blindtest daily-played band and hub | `v11/capture-prototype.mjs` STATES vs section 1 of this file |
| X1-009 | ORCH / owner | should | DoD "flag off: parity e2e green": e2e/ux-v1/parity.spec.ts was never run (it loads /profile signed in, blocked by decision 1/4); flag-off proof rests on per-agent diffs + C3 SEO diff | worker prompt section 8 |
| X1-010 | ORCH | nit | A live test-user session file exists: `.claude/worktrees/agent-a9bd5520faca1c0ac/apps/quiz/e2e/.auth/test-user.json` (mtime 2026-09-27 17:01, probably the running X2). Delete it when X2 ends (DoD) | worker prompt 3b / 8 |

## 6. Deferred (not counted as gaps: RUN-STATE names the migration or decision)

relaxed mode + clock ring (v11-p4-relaxed-runs.sql); guest rank line (v11-p4-rank-for-score.sql); every populated ranked state, ranked leaderboard tab, btend-ranked (v11-p7-ranked.sql, decision 2); Season rewards (decision 18); /pt ranked (18); fan debates, challenge posts, all community hearts and replies on them (v11-p8-community.sql, 27); Thread/Blog only with VERSE_PUBLIC (27, verse gate); blog cover upload (27); daily debate rotation (DAILY DEBATE ROTATION note); Recent hits / Legends / Speed round mixes and "challenges waiting" (12); header upload/link writes (v11-p10-header-storage.sql, 14); email switches (v11-p10-email-prefs.sql); real delete-account flow and flat band mode (14); Notify me (v11-p3-group-quiz-alerts.sql); noindex for thin hubs (8); QOTD rotation fix env (15); logo swap (5); ticker random floor (7).

## 7. Counts

Blocker 3 (X1-001 P3/P4/P11+P6, X1-006 P2, X1-007 C3), should 4 (X1-002 P4, X1-004 P10, X1-008 C1/X2, X1-009 ORCH), nit 3 (X1-003 A0, X1-005 P3, X1-010 ORCH).
