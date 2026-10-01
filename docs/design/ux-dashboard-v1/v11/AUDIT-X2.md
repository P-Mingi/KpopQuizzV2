# X2 strict visual pass (UX v11.2 completeness audit, 2026-09-27)

Auditor: X2 (respawned). Read-only: no app code edit, no commit, no push.

- Implementation: LOCAL flag-on preview http://localhost:3021 (integration + P2 /quizzes, local ref `ux11/p2-quizzes` 4409a10). Drivers: C1's `checks/pixel/harness/drivers.mjs` (same URLs, fixtures, write guard: every POST/PUT/PATCH/DELETE to /api/** or Supabase answered locally), plus an X2 driver for /quizzes. Signed in only through the Playwright setup project; passport states on /u/testtest as a guest; /me and /profile never loaded signed in.
- Reference: `docs/design/ux-dashboard-v1/v11/checks/reference/<w>-<theme>-<state>.png` (main checkout) and the prototype replayed live (same state JS and order as `capture-prototype.mjs`) for the structural outline (`proto/<combo>.json`).
- Harness (scratchpad only): `harness/x2-cap.mjs` (capture + evidence), `harness/x2-crop.mjs` (region crops), `harness/x2-outline.mjs` (headings / controls list, prototype vs implementation), `harness/x2-proto.mjs`.
- Evidence per state: `shots/<state>/<combo>-side.webp` (reference | implementation, full length), `shots/<state>/<combo>-impl.png`, overview tiles `-ov<n>.png`, crops in `crops/`.
- Rules: real data may change text and photos (not a difference); a different layout, component, icon, copy style, colour, spacing, radius, shadow or crop is. Known and recorded deviations (SEO lock, owner decisions in RUN-STATE) are listed as "known", not filed, unless they look worse than documented.
- Severity: blocker (a person would say "this is not the design": wrong or missing component, broken layout), should (clearly visible difference: spacing, colour, icon, copy style, order), nit (small, needs a side-by-side to see).

Owners: A0 shell, nav, tab bar, footer, cards, sheets, tokens; P1 home; P2 quizzes; P3 groups + hubs; P4 quiz, play, end, share; P5 create, signin; P6 blindtest; P7 ranked; P8 community; P9 leaderboard; P10 passport, settings, header sheet; P11 notifications, search, bell.

## quizzes (P2) - checked in detail (never checked before). First pass on 4409a10; re-checked on 63d8ef4, see "quizzes re-check" below (that one is the verdict)

Evidence: `shots/quizzes/{1440-light,1440-dark,390-dark,390-light}-side.webp`; crops `crops/quizzes-1440-light-{head,cards,bottom,foot}.png`, `crops/quizzes-1440-dark-ctl.png`, `crops/quizzes-390-dark-{head,rows,footbottom}.png`. Signed in, /quizzes, 0 writes, no horizontal scroll. Page 1440: 6082px (reference 1990); 390: 8665px (reference 3012).

Measured (prototype vs implementation, 1440): sort control 416.6x44 = 416.7x44; Type / Level / Group 91.6 / 93.9 / ... x44 at the same x; grid 1120 wide at x 160; quiz card 262 x 329.8, cover 260 x 195, body 260 x 132.8 (identical); Load more 195.8 x 48 centred; phone "Create a quiz" 159.5 x 40 (identical); phone stacked rows identical in look (cover, eyebrow, title, level bars, plays). Dark theme: controls, active pill and cards match.

Differences:
| # | Element | Expected (prototype) | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Breadcrumb "Home / Browse All Quizzes" above the H1 | none | shown (+36.8px) | P2 | known (SEO lock: BreadcrumbList kept, P2 deviation 1) |
| 2 | H1 + intro | "Quizzes" + "422 fan-made quizzes on 90 groups. All free, no account needed." (1 line) | "K-pop quizzes" + the live intro (2 lines at 1440, 3 at 390) | P2 | known (SEO lock) |
| 3 | Active sort | Trending (first pill) | Most played (third pill) | P2 | known (live default order = ItemList order, P2 deviation 2) |
| 4 | Cards before "Load more" | 12 | 48 (page is 3x longer) | P2 | known (live page size, link set; P2 report "48 cards per page instead of the sample's 12") |
| 5 | Under the grid | nothing, footer | "Popular today / this week / this month", "Browse trending / newest / most liked / search" links + "K-pop quizzes: FAQ" (4 Q&A) | P2 | known (SEO lock, live browse links + FAQ) |
| 6 | Footer | 4 columns of 4 links, "All 90 groups" | extra live links (Popular quizzes, Trivia, Pulse, Stats, Articles, News, About, Fandoms, Reddit, DMCA), "All groups", "Portugues" link; footer 521.7 vs 392.1px tall at 1440 | A0 | known (A0 deviation 5, every live footer link) |
| 7 | Space under the footer on phones | 64px (tab bar spacer) | 136px: `body` keeps padding-bottom 72px AND `.ux-app` adds 64px, a 72px empty strip under the footer | A0 | should (X2-001, every page at 390) |
| 8 | Nav streak pill "12", pink unread dot on the bell, avatar photo | shown | absent / initial "T" | - | real data (test user: no streak, no unread, no photo) |

Verdict: the page is the prototype's design (header, controls, grid, cards, Load more) within the documented SEO lock. No P2 layout, component, icon or style difference found. The one new gap is the shell's double phone bottom padding (A0).

## home (P1), signed in

Evidence: `shots/home/{1440-light,390-dark}-side.webp`; crops `crops/home-1440-light-{top,groups,railedge,lists,band}.png`. 0 writes. 1440: 3223px (ref 3177); 390: 4697px (ref 4362).

Same as the prototype: nav, ticker (LIVE label colour, size, dot measured equal), greeting + eyebrow + H1 with the pink italic name, quiz of the day card, groups rail tile 88 x 138 at the same x positions, trending cards, numbered lists, blindtest band (gradient, bars, CTA), community rows, footer. Differences:
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Continue playing section, streak pill, "Your best 8/10" in the band | shown | absent | - | real data (test user has no unfinished run, no streak, no best) |
| 2 | Groups rail content | 10 real groups by popularity, the 2 newest last | 19 tiles in the live home order: "General K-pop" (the catch-all bucket, 152 quizzes, grey "K" initial) FIRST, then BTS, BLACKPINK, Cortis, ILLIT... | P1 | known (P1 7: live hub order, link parity). Worth an owner look: the catch-all is not a group and leads the rail |
| 3 | Groups rail right edge (1440) | the 10th tile ends the row | a 1px sliver of the 11th tile's label ("BABYMONSTER" wider than its 88px tile) shows at the rail's right edge | P1 | nit (X2-002) |
| 4 | All time best / New quizzes | 5 rows each, link "Most played" | 6 rows each, "Most liked" | P1 | known (P1 7, live rails) |
| 5 | From the community | 3 rows | 3 rows + two compact lines (Verse spaces, Discord) | P1 | known (P1 7) |
| 6 | Space under the footer (390) | 64px | 136px | A0 | X2-001 |

## home-guest (P1)

Evidence: `shots/home-guest/{1440-light,390-dark}-side.webp`, `crops/home-guest-390-dark-top.png`. Guest, 0 writes. Hero (eyebrow, H1 "Are you a real fan?", both CTAs), quiz of the day, rails and band match the prototype; same known deltas as home (#2 to #6). The QOTD "Replay of the April 22 pick" line is the live pick (C2 verified). No new difference.

## groups (P3), signed in

Evidence: `shots/groups/{1440-light,390-dark}-side.webp`, `crops/groups-1440-light-head.png`. Filter, Most played rail, A to Z columns with letter heads, avatars, counts and "No quiz yet" match; tab bar highlights Quizzes as the prototype does.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | H1 + intro | "K-pop groups" + one short sentence | "All K-pop groups" + the live intro + a generation line "3 2nd Gen · 12 3rd Gen · 13 4th Gen · 4 5th Gen · 13 with no generation recorded" (+2 lines) | P3 | known (SEO lock, P3 report) |
| 2 | Intro vs list | - | the locked intro says "45 groups, A to Z" while the filter says "Filter 91 groups" and the list shows 91 (46 with "No quiz yet"): the page contradicts itself | P3 | nit (X2-003, copy is SEO-locked: owner call) |
| 3 | "General K-pop" in the A to Z list (152) | not in the sample | listed under G | P3 | real data (live directory) |

## hub-blackpink (P3), signed in

Evidence: `shots/hub-blackpink/{1440-light,390-dark}-side.webp`, `crops/hub-blackpink-1440-light-{hero,about}.png`. Crumb, eyebrow, split hero with 16:10 photo (same box), CTAs, facts line, quiz controls (sort seg + Type / Level; on the 390 reference the seg is under the fixed tab bar), text cards, Show all, FAQ accordions, side column all match in style.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | H1 + lead | "BLACKPINK Quiz" + one short lead | + second line "Test How Well You Know BLACKPINK" (20px muted) and the live 4-line lead | P3 | known (SEO lock: H1 word for word) |
| 2 | Quiz cards | 6 + "Show all 24" | 12 + "Show all 24" (native details) | P3 | known (fix loop 1, C3-001) |
| 3 | About | 2 paragraphs with the group name and fandom in bold, trivia link | live paragraph (no bold), members photo row (Jisoo, Jennie, Rose, Lisa), "Updated September 2026", + "Make your own BLACKPINK quiz" link | P3 | known (P3 report: today's About content kept) |
| 4 | Fans also play rows | name + "N quizzes" | name + "N quizzes · <top quiz title>" | P3 | known (P3 report: "3 fans also play with hub + top quiz") |
| 5 | From the community | 3 posts | "No posts about BLACKPINK yet" + link | - | real data (Verse gate) |
| 6 | Extra side section "Newest BLACKPINK quizzes" | none | shown | P3 | known |

## hub-ateez (P3)

Evidence: `shots/hub-ateez/{1440-light,390-dark}-side.webp`. Same layout and same known deltas as hub-blackpink.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Members row in About (1440) | not in the prototype | 8 member photos wrap 7 + 1: "Jongho" alone on a second line under the first photo | P3 | nit (X2-004: orphan wrap of the kept members row) |

## hub-empty (P3), /chungha-quiz

Evidence: `shots/hub-empty/{1440-light,390-dark}-side.webp`. Crumb, H1, "Make the first quiz" + "Notify me" match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Eyebrow | "No quiz yet" | "Byulharang" (the real fandom) | P3 | known (P3: eyebrow = real fandom; "No quiz yet" only as fallback) |
| 2 | Below the actions | nothing (footer) | "14 blindtest songs", About Chungha, Questions fans ask (2), "Read more about Chungha" side link; H1 second line; 3-line lead | P3 | known (SEO lock, live hub content) |

## quiz (P4), /q/ultimate-bts-era-quiz-only-real-armys-survive, signed in

Evidence: `shots/quiz/{1440-light,390-dark}-side.webp`, `crops/quiz-1440-light-hof.png`. Cover, H1, meta line with type glyph, author + Follow(ing), Start + share, Your best row, Did you know, About box, In this quiz, More BTS quizzes text cards, phone layout: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Timer line | "15 seconds per question. Play without a timer" | "15 seconds per question." (no toggle) | P4 | known (hidden until migration v11-p4-relaxed-runs.sql is applied; P4 report) |
| 2 | Hall of fame rows | avatar photo, name in the fandom colour, bias pill (RM, V, Jungkook...) | grey "?" avatar, "someone", no pill, on all 5 rows | P4 | known (guest runs shown as "someone", P4 decision 3: owner call to show signed-in players only). Visually the board loses its colour and pills |
| 3 | Crumb | "Quizzes / BTS / Ultimate BTS era quiz" | "Home / BTS Quiz / Ultimate BTS era quiz - only real ..." | P4 | known (P4 decision 1, BreadcrumbList) |
| 4 | In this quiz | 3 rows + a muted summary row | 3 rows + "5 more questions." + "Show the 8 questions in this quiz" details | P4 | known (P4 decision 2, crawlable) |
| 5 | About box | 2 paragraphs | 1 paragraph + muted "Pass rate 31% · 43 likes · 1 reaction · 1 comment" | P4 | known (P4 decision 2) |

## play (P4)

Evidence: `shots/play/{1440-light,390-dark}-side.webp`. Game bar, segments, timer ring 76px, question, answer rows: match. Real questions differ (data).
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Game bar title | short "Ultimate BTS era quiz" | the real title ellipsized "Ultimate BTS era quiz - on...", the progress segments start 46px further right and are shorter | P4 | nit (real title; P4 decision 1 "the title ellipsizes") |
| 2 | Answer keys on phones | 1-4 | A-D | P4 | known (P4 decision 8, touch) |

## play-answered (P4)

Evidence: `shots/play-answered/{1440-light,390-dark}-side.webp`, `crops/play-answered-1440-light-gbar.png`. Wrong-pick ring (red x), "Question 1 of 8", right row green + "Correct", picked row red + "Your pick", rest rows muted, Did you know box, "Next question Enter" button: match. Same game bar title nit as play.

## play-qotd (P4)

Evidence: `shots/play-qotd/{1440-light,390-dark}-side.webp`, `crops/play-qotd-{1440-light-gbar,390-dark-all}.png`. Pixel-identical game bar, ring and question at 1440 (same quiz of the day, Stray Kids: District 9 Quiz); 390 differs only by the real question and A-D keys (known).

## end (P4), signed in (the save is answered locally: 1 intercepted write)

Evidence: `shots/end/{1440-light,390-dark}-side.webp`, `crops/end-1440-light-card.png`. Photocard (cover, KPOPQUIZ, PLAY NO., stamp, title, 8/8, mascot), stats row You / Average / Time, rank line, Share / Play again / like, Keep playing (next quiz card + rows), Comments, Report: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | "You beat 96% of players" on the card, "+60 XP · streak day 13 saved" | shown | card without the beat line; "Saved to your passport" | - | not verifiable (the save is stubbed, no XP / percentile answer; C1 same note) |
| 2 | Discord line + Brag button under the actions | none | shown | P4 | known (C2-003, RUN-STATE 30) |
| 3 | Stamp word | "대박! PERFECT" | "올킬! PERFECT" | P4 | known (P4 decision 7, getResultLabel) |

## end-guest (P4)

Evidence: `shots/end-guest/{1440-light,390-dark}-side.webp`, `crops/end-guest-390-dark-mid.png`. Same as end with the guest "Sign in to save" line.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Rank line "#95 of 2,375 players · your best 8/8" | shown | absent | - | not verifiable (stubbed save: no standing; C2-008 rule shows it only with real numbers) |
| 2 | Discord + Brag row | none | shown | P4 | known |

## share (P4)

Evidence: `shots/share/{1440-light,390-dark}-side.webp`, `crops/share-1440-light-sheet.png`. Sheet 520 x 479.6 at the same place, header, mini card, 4 share tiles, challenge link row, footnote: match. The mini card title wraps (real full title) and shows "#36 of 41" without "You beat" (stubbed save). The reference draws the focus ring on "Copy link" (prototype focus on open); not a visual defect.

## create-1 (P5), signed in, P5's sample draft

Evidence: `shots/create-1/{1440-light,390-dark}-side.webp`, `crops/create-1-1440-light-fields.png`. Stepper, field labels, hints, counters, inputs (radius, border), type radio cards, group combobox with chip, difficulty seg, language select, cover drop zone + rights checkbox, sticky bar: match (the "About" counter reads 120 / 280 for the 120-character sample: correct; the prototype's 112 is a hard-coded sample).
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Header | "Create a quiz" + 2-line intro | "What's your quiz about?" + the live intro | P5 | known (SEO lock, P5 deviation 1) |
| 2 | Language note, cover sentence, "Remove cover" | absent | shown (+28.8px) | P5 | known (P5 deviation 6, fix loop 1) |

## create-2 (P5)

Evidence: `shots/create-2/{1440-light,390-dark}-side.webp`, `crops/create-2-1440-light-{card,cardbottom}.png`. Question rows (handle, number, text, Ready / "2 answers missing"), open row editor, circle markers, fun fact, Add a question, Paste several at once, sticky bar: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Header | "Create a quiz" | "Your questions" + "Add at least 3. Drag to reorder, tap a row to edit, duplicate or delete." | P5 | known (live copy per step) |
| 2 | Bottom of the open classic question | "Add an image" link | "Move up · Move down" on the right, no "Add an image" | P5 | known (P5 deviations 3 and 5: no per-question picture on classic questions) |

## create-3 (P5)

Evidence: `shots/create-3/{1440-light,390-dark}-side.webp`. "How it will look" card preview (A0 UxQuizCard), checklist rows with ticks and the orange ring on the optional row, sticky bar: match. Copy: "Ready to publish?" header and "question 4 is left out" (P5 deviations 1 and 4, known).

## signin (P5), guest

Evidence: `shots/signin/{1440-light,390-dark}-side.webp`, `crops/signin-390-dark-sheet.png`. Sheet 390 x 512.4 (phone) and its header, Google / Discord buttons, "or" rule, email field, magic-link button and footnote: identical box and styles. The page behind the scrim is scrolled 336px further (the Publish click scrolls the bar into view), not a sheet difference. The reference draws the focus ring on "Continue with Google" (prototype focus on open).

## blindtest (P6), signed in, P6's fixtures (silent audio, generate rounds)

Evidence: `shots/blindtest/{1440-light,390-dark}-side.webp`, `crops/blindtest-1440-light-board.png`. Hero gradient + equaliser, playlist pill, 5/10/15 seg, Start, Ways to play cards, board rows, How it works, Play by group (photo tiles + 4-column index), search field: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | H1 | "Name that K-pop song." | "Name that K-pop song" (no full stop) + the live 2-line intro | P6 | known (SEO lock) |
| 2 | "2 challenges waiting", "Your best 8/10 · Idol", Ranked footer "Gold I · 8,290 points" | shown | hidden | - | real data / ranked not live (P6 section 6, P7) |
| 3 | Today's board right column | points "2,410" | total answer time "68.6s" | P6 | known (P6 report: "total answer time on the right", the live board has no points) |
| 4 | Board names | fandom colour + bias pill | plain names (the two players today have no flair) | - | real data |
| 5 | Under Play by group | FAQ "Questions about the blindtest" | "Theme playlists" link row + FAQ titled "Frequently asked questions" | P6 | known (live links and FAQ, SEO) |

## blindtest-playlist-open (P6)

Evidence: `shots/blindtest-playlist-open/{1440-light,390-dark}-side.webp`, `crops/blindtest-playlist-open-1440-light-menu.png`. Menu: "All K-pop 4,120 songs" row in pink, "Groups 79 playlists", "Find a group" field, avatar rows with song counts: identical in look. Only the page behind differs (no challenges section: data).

## blindtest-group-search (P6)

Evidence: `shots/blindtest-group-search/{1440-light,390-dark}-side.webp`, `crops/blindtest-group-search-1440-light-search.png`. "nct" gives NCT 127 and NCT DREAM rows as in the prototype. Same known extras (#5 above).

## btplay (P6)

Evidence: `shots/btplay/{1440-light,390-dark}-side.webp`, `crops/btplay-1440-light-all.png`. Game bar (playlist, segments, 0 pts, replay, sound), white orb with pink ring and glow, equaliser, "Song 1 of 10 · listening", "Song round" chip, question, 4 answers: match (fixture song titles).

## btplay-answered (P6)

Evidence: `shots/btplay-answered/{1440-light,390-dark}-side.webp`, `crops/btplay-answered-390-dark-all.png`. Reveal (cover, Correct, title, artist · album, Song 1 of 10), "+200 SPEED +100" pop, right answer green, auto-next bar and line, Next: match. Fixture cover (mascot) instead of the album photo; A-D keys and no "Enter" hint on touch (known 16.7 / 16.9).

## ranked (P7), signed in: not-live state only

Evidence: `shots/ranked/{1440-light,390-dark}-side.webp`, `crops/ranked-390-dark-hero.png`. The populated state (tier shield, season points, progress, ladder, your best 5 runs) is NOT verified until the ranked migration is applied (RUN-STATE). Checked: the not-live state keeps the prototype frame: crumb, shield (empty, outlined), "Ranked blindtest / Not live yet", rules, CTA "Play the blindtest", Tiers row (desaturated medals), How ranked works accordions, Season rewards. No broken layout. No filing.

## btend-ranked (P7)

Evidence: `shots/btend-ranked/{1440-light,390-dark}-side.webp` (the driver lands on the not-live /blindtest/ranked). NOT verified (needs the ranked migration: no ranked run can end). No filing.

## community (P8), signed in

Evidence: `shots/community/{1440-light,390-dark}-side.webp`, `crops/community-1440-light-post.png`. Header, composer (720 x 48), For you / Following / Blogs tabs, All groups dropdown, feed post cards (padding, radius, border, eyebrow chip, poll bars with the leading option in pink), rail panels (320 wide: Daily debate, Happening now, Badge watch), phone rail: match in style.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Feed content | challenge, debate, blog, thread mix with hearts | mostly closed daily debates and BTS threads, debates without a heart count (comment count only) | - | real data (Verse gate, no challenge store yet, no like store for debates: P8 "no dead controls") |
| 2 | Daily debate panel | 2 named options with photos | "Agree / Disagree" on today's statement | - | real data |

## post-challenge (P8)

Evidence: `shots/post-challenge/{1440-light,390-dark}-side.webp` (driver falls back to /community/thread/3). NOT verified: no challenge post can exist until the P8 migration (challenge store) is applied. The shared post layout is covered by post-blog and post-debate. No filing.

## post-blog (P8), /community/blog/2

Evidence: `shots/post-blog/{1440-light,390-dark}-side.webp`. Crumb, author line, H1, cover (4:3, radius), body column, like / reply counts, share, replies block with the reply box, "More from the community" rows: match. Reply placeholder "Write a reply" vs the prototype's "Reply with your score" (the sample post is a challenge context): not filed.

## post-debate (P8), /community/debate/2026-09-27

Evidence: `shots/post-debate/{1440-light,390-dark}-side.webp`, `crops/post-debate-1440-light-top.png`. Crumb, author line, H1, vote option rows, votes line, More from the community: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Reply | "96 replies" block with "Reply with your score" composer under the post | "Add a reply to your vote (Optional)" textarea inside the vote, "0 replies" and no separate composer | P8 | known (RUN-STATE 27: the daily debate reply is sent with the vote) |
| 2 | Heart count, report flag, Follow | shown | hidden (system author KpopQuiz; hearts hidden until the like store is live) | P8 | known (P8 report) |

## editor (P8)

Evidence: `shots/editor/{1440-light,390-dark}-side.webp`, `crops/editor-1440-light-sheet.png`. Sheet 640 x 746 (744.4 in the reference) at the same place, mode seg, hint, Group / Question / Options fields, "Add an option", Closes in seg, Cancel / Post: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Footer | Cancel + Post (pink) | "Fan debates open soon. Vote on the daily debate meanwhile." + Post disabled (pale) | P8 | known (debate store is a pending migration, 503 not_live) |
| 2 | Group field | prefilled "Stray Kids" chip | empty "Search groups" | - | prototype sample prefill (the driver opens a fresh editor) |

## leaderboard (P9), signed in

Evidence: `shots/leaderboard/{1440-light,390-dark}-side.webp`, `crops/leaderboard-{1440-light-podium,390-dark-top}.png`. Tabs (Fandom war pill on), podium (#1 ring, pink score, sizes), numbered rows, How points work accordions: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | H1 + sub | "Leaderboard" + "Week 38 · resets Monday at 00:00 KST" | "Community" + "Discover fans, creators, and rising stars." | P9 | known (SEO lock, RUN-STATE 25) |
| 2 | Weekly change column | rank moves "+3", "-1", "0" | percent "+7%", "+152%" | P9 | known (RUN-STATE 25) |
| 3 | Pinned row | "STAY is #2 · you added 1,240 points" + Play for STAY | "Pick your main group in Settings to see your fandom here." + Settings | - | real data (test user has no main group) |
| 4 | "Show all 30 fandoms" link, "Around the community" section | none | shown | P9 | known (P9, SEO / link parity) |

## passport (P10), guest on /u/testtest

Evidence: `shots/passport/{1440-light,390-dark}-side.webp`, `crops/passport-1440-light-band.png`. Band 120 radius 24, 96 avatar with the page ring overlapping the band, name + level chip, meta line, XP bar with the number, stats row, tabs, pinned badges, groups mastered: match in style. The public view is compared to the owner view of the prototype (never /me signed in, owner decision 1).
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Band | blurred header photo | flat pink tint | - | real data (no header, no main group: P10 "else flat tint") |
| 2 | Owner controls, History tab, Recent activity, "This week STAY is #2" strip | shown | absent | - | public view (guest), real data |
| 3 | Stats | played / average / streak / made / blindtest rank | streak / groups mastered / quizzes made / plays received | P10 | known (public stats set, P10 passport-model owner / public stats) |

## passport-badges (P10), guest on /u/testtest

Evidence: `shots/passport-badges/{1440-light,390-dark}-side.webp`. Legend (Common, Uncommon, Rare, Epic, Legendary), medal tiles (earned in colour, locked grey outline), rarity labels and "Locked - ..." lines: match. The page lists all 62 badges (1 earned) instead of the sample's 20: real catalog.

## settings (P10), signed in

Evidence: `shots/settings/{1440-light,390-dark}-side.webp`, `crops/settings-1440-light-fandom.png`. Sections Profile, Fandom, Your look (preview card, name colour chips, name font chips, bias tag, passport theme swatches, header picture, pinned badge), Notifications toggles: match in style.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Fandom | group chips + Add a group | Add a group + "Up to 3 groups. The first one is your main group." + "Stan since" field | P10 | known (P10: Stan since kept, it feeds the meta line) |
| 2 | Display name empty, no bias chips | filled | empty / "No bias tag" | - | real data (test user) |

## header-sheet (P10), signed in on /u/testtest (never /me)

Evidence: `shots/header-sheet/{1440-light,390-dark}-side.webp`, `crops/header-sheet-{1440-light,390-dark}-sheet.png`. Sheet 480 x 428.4 (1440) and 390 x 467.2 (phone), header, dashed drop zone in its resting look, "or paste a link", URL row + Use, note, "Use the theme colour instead": identical (boxes measured equal; a 4px offset in one phone shot is the slide-in still settling).

## notifications (P11), signed in, P11's fixture rows

Evidence: `shots/notifications/{1440-light,390-dark}-side.webp`. Header + "4 unread" + Mark all read, filter seg, streak row, Today / Yesterday / Earlier groups, unread dots, type icons, times, footnote: match. Footnote copy "Read notifications older than 60 days are cleared" vs "Notifications older than 30 days are cleared": known (RUN-STATE 24, the real rule).

## search (P11), signed in

Evidence: `shots/search/{1440-light,390-dark}-side.webp`, `crops/search-1440-light-ov.png`. Overlay 640 x 529.6 at the same place, field row, Esc chip, "Popular groups" and "Most played quizzes" rows with avatars and counts, active row tint: identical in look (live counts / third quiz differ: data). The focused field draws a 2px pink line: known (A0 / P11 documented a11y deviation).

## bell (P11), signed in

Evidence: `shots/bell/{1440-light,390-dark}-side.webp`, `crops/bell-1440-light-pop.png`. Popover 380 x 534.6, header, Mark all read, 6 rows with unread dots and times, "See all notifications" row: identical.

## Other two combos for the states with a filed difference

Captured `home`, `groups`, `hub-ateez` at 1440-dark and 390-light (`shots/<state>/{1440-dark,390-light}-side.webp`): the same layout as 1440-light / 390-dark, no theme-specific difference (dark tokens, borders and pinks follow the reference). X2-001 is CSS (legacy `body { padding-bottom: 72px }` under the flag-on `.ux-app` 64px) and shows in both phone themes; X2-002 / X2-004 are layout and show in both desktop themes; X2-003 is copy.

## quizzes re-check (P2) on the swapped preview ux11/p2-quizzes 63d8ef4 (verdict)

Evidence (overwritten by the re-run): `shots/quizzes/{1440-light,1440-dark,390-dark,390-light}-side.webp`, `crops/quizzes-1440-light-{head2,bottom2}.png`. Signed in, 0 writes, no horizontal scroll. Page 1440: 6011px; 390: 8539px.

Measured (prototype vs implementation): sort control 416.6 x 44 (390: 350 x 48) equal; active pill 36px high, same fill, shadow and pink ink; Type / Level / Group 91.6 / 93.9 wide at the same x; quiz card 262 x 329.8 (390 row: 350 x 118.8) equal; Load more 195.8 x 48 centred; phone "Create a quiz" 159.5 x 40. Computed styles of these landmarks equal (only the invisible H1 focus radius differs). The grid starts 40px (1440) / 68px (390) lower than the reference: the live breadcrumb (now with the hub's 28px spacing) and the 2-line live intro, owner decisions A and B, known. The FAQ is now the prototype's accordion (720px column, hairlines, chevrons) like the hub's "Questions fans ask".

Differences on 63d8ef4: rows 1 to 6 and 8 of the first pass stand as known / real data (breadcrumb, H1 + intro, default sort Most played, 48 cards, browse links + FAQ, footer links, nav data); row 7 (X2-001, shell phone bottom padding) still shows. No new P2 difference. Verdict: P2's /quizzes matches the prototype within the documented SEO decisions.

# Extension (ORCH, X1-008): prototype states outside the 38 capture states

Method: no reference PNG exists, so X2 captured the prototype itself with the capture-prototype.mjs method (fresh prototype page, notes hidden, `closeAll()`, the state JS, then a wait; full page unless overlay or in-game): `ref-extra/<w>-<theme>-<id>.png` (harness `harness/x2-protoshot.mjs`, state JS and drivers in `harness/extra-states.mjs`). The results screens needed a 3 s wait (the view's reveal animation leaves the page faded at 700 ms). Implementation drivers reuse C1's drivers and the page agents' spec fixtures (P6 board / questions / silent audio / challenge view, P5 fake publish answer, P11 notification rows, P4 recorded answers); every write answered locally. Combos 1440-light and 390-dark.

## x-btend-free: blindtest results, free run 8/10 (P6)

Evidence: `shots/x-btend-free/{1440-light,390-dark}-side.webp`, `crops/x-btend-free-1440-light-{card,songs}.png`. Mascot on the seam, pink-lilac card, 8/10, "Sharp listener · 1,740 points", stats row, Play again + Share, challenge row with Copy link, "Your songs" rows (play button, cover, title / artist, points · time or Missed): match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Kicker | "All K-pop" | "All K-pop blindtest" | P6 | nit (copy, folded into X2-005) |
| 2 | Third stat | "+50 XP" | "0.1s Fastest answer" | P6 | known (P6 decision 6: free play awards no XP today) |

## x-btend-daily: blindtest of the day results 7/10 (P6)

Evidence: `shots/x-btend-daily/{1440-light,390-dark}-side.webp`, `crops/x-btend-daily-1440-light-card.png`. Kicker "Blindtest of the day", 7/10, "Solid fan · 1,820 points", "See today's board" primary with the trophy icon, Share: match. 2 writes (daily submit + complete) answered locally.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Third stat | "+45 XP" | "Fastest answer" | - | not verifiable (the XP comes from /api/daily/complete, answered locally) |
| 2 | "Challenge a friend with these exact songs · Copy link" row | shown under the actions | absent | P6 | known (P6 build list: the challenge row on free runs only; the daily songs are the same for everyone) |

## x-btend-challenge: challenge results, lost 6/10 vs blink_edits 9/10 (P6)

Evidence: `shots/x-btend-challenge/{1440-light,390-dark}-side.webp`, `crops/x-btend-challenge-1440-light-card.png`. Card, "blink_edits wins this one (9/10). Same songs, one more try?" sentence (same weight and colours), Play again + Share, songs list: match. The attempt write answered locally.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Kicker | "Challenge from blink_edits" | "All K-pop blindtest" (the playlist) | P6 | nit (X2-005: the card does not say it was a challenge; the sentence below does) |
| 2 | Challenge row | shown | absent | P6 | known (p6.spec asserts no Copy link on a challenge result) |
| 3 | Third stat | "+40 XP" | "Fastest answer" | P6 | known (no XP awarded) |

## x-share-bt: blindtest results Share sheet (P6 with A0's ShareSheet)

Evidence: `shots/x-share-bt/{1440-light,390-dark}-side.webp`, `crops/x-share-bt-390-dark-{sheet,err}.png`.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Sheet title | "Share your blindtest" | "Share your score" (A0 default) | P6 | should (X2-006) |
| 2 | Share tiles | Copy link, Story image, More apps, Discord (4) | Copy link, More apps, Discord (3): no Story image | P6 | should (X2-006: P4's result sheet has the story image; P6 passes no `onStoryImage`) |
| 3 | Challenge link block | "Challenge link · They play your exact questions · 48 hours", link row + Copy, footnote | absent (the sheet is ~170px shorter) | P6 | should (X2-006: A0's `challenge` prop not passed; the results page has its own challenge row) |
| 4 | Mini card line 2 | "1,740 points · best combo x3" | "Sharp listener · 1,740 points" | P6 | nit |

## x-bt-daily-played: blindtest hub after today's daily (P6)

Evidence: `shots/x-bt-daily-played/{1440-light,390-dark}-side.webp`, `crops/x-bt-daily-played-1440-light-board.png`. Ways to play card footer "Played · 8/10 · #212 today", board rows with flair (P6 fixture), your row: match. Known deltas as the blindtest state (time column, UTC, Ranked footer hidden).

## x-home-daily-played: home band after today's daily (P1)

Evidence: `shots/x-home-daily-played/{1440-light,390-dark}-side.webp`, `crops/x-home-daily-played-1440-light-band.png`. "Blindtest of the day · played", "You scored 8/10 today.", "#212 of 1,205 fans", "See today's board" with the trophy, "Your best 8/10": match (the countdown "in 8h 15m" instead of "at midnight KST" is the real rule).
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Kicker dot | no pulse dot once played | the pink pulse dot stays before "Blindtest of the day · played" | P1 | nit (X2-007) |

## x-streakpop: streak popover, saved day (A0)

Evidence: `shots/x-streakpop/{1440-light,390-dark}-side.webp`, `crops/x-streakpop-{1440-light,390-dark}-pop.png`. With P11's stub the day is already played, so the popover shows the saved variant ("13 days", "Today is played. Come back tomorrow to make it 14.", day chips, ghost "See your passport"); the reference shows the at-risk variant. Box, radius, shadow, title size, chip style: match. At-risk variant: see x-streakpop-risk.

## x-streakpop-risk: streak popover, day at risk (A0)

Evidence: `shots/x-streakpop-risk/{1440-light,390-dark}-side.webp`, `crops/x-streakpop-risk-1440-light-pop.png`. "12 days", day chips with today ringed, "Play today's quiz" primary: match. Sentence "Play the daily quiz or the daily blindtest in the next 11h 0m" instead of "Play any quiz or blindtest in the next 5h 12m": known (RUN-STATE 24, the real streak rule).

## x-avamenu: avatar menu (A0)

Evidence: `shots/x-avamenu/1440-light-side.webp`, `crops/x-avamenu-1440-light-pop.png`. Header (avatar, name, level), Passport, My quizzes, Settings, Dark mode, Sign out with icons and dividers: match. "Preview as guest" and "Design notes" are prototype-only tools (not product); "1 draft" absent (no local draft: data). 390: phones have no avatar button in either (the You tab), not applicable.

## x-quit-confirm: leave-quiz confirm sheet (P4)

Evidence: `shots/x-quit-confirm/{1440-light,390-dark}-side.webp`, `crops/x-quit-confirm-{1440-light,390-dark}-sheet.png`. "Leave this quiz?", "You answered 1 of 8. You can pick it up later from Continue playing.", Leave (ghost) + Keep playing (primary), dialog on desktop and bottom sheet on phones: identical.

## x-end-below: results below the average, 3/8 (P4)

Evidence: `shots/x-end-below/{1440-light,390-dark}-side.webp`, `crops/x-end-below-1440-light-card.png`. Play again is the primary action, sad mascot, 38% / 52% stats: match. Stamp "다시! KEEP TRYING" vs "다시! TRY AGAIN" (getResultLabel, P4 decision 7, known); XP line and beat % not verifiable (save stubbed).

## x-end-comments: results with Comments open (P4)

Evidence: `shots/x-end-comments/{1440-light,390-dark}-side.webp`, `crops/x-end-comments-1440-light-com.png`. Accordion open, composer with avatar, comment rows with flair name + bias chip + score + age: match. No heart count / Reply under comments: known (P4 decision 9, no store). Real data: 1 comment.

## x-share-quiz and x-share-challenge: quiz page share sheets (P4)

Evidence: `shots/x-share-quiz/{1440-light,390-dark}-side.webp`, `shots/x-share-challenge/{1440-light,390-dark}-side.webp`, `crops/x-share-quiz-390-dark-sheet.png`, `crops/x-share-challenge-1440-light-sheet.png`. Titles "Share this quiz" / "Challenge a friend", mini card, challenge link block, footnote: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Share tiles | Copy link, Story image, More apps, Discord | Copy link, More apps, Discord (no Story image; only the result sheet has it, P4 report) | P4 | nit (X2-008) |
| 2 | Challenge link | short kpopquiz.org/c/7KQ2PX | the signed /q/<slug>?c=<id>.<sig> link, ellipsized | P4 | known (P4 decision 5) |

## x-quizzes-chips and x-quizzes-empty: /quizzes filtered (P2)

Evidence: `shots/x-quizzes-chips/{1440-light,390-dark}-side.webp`, `shots/x-quizzes-empty/{1440-light,390-dark}-side.webp`, `crops/x-quizzes-chips-1440-light-chips.png`, `crops/x-quizzes-empty-1440-light-empty.png`. Removable pink chips row, empty state "No quizzes match these filters / Try another level or group." + Clear filters: match (the prototype keeps "Load more" under its empty state, the implementation does not: better).
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Dropdown trigger with a value | stays "Type" / "Group" (the chip carries the value) | "Type: True/false", "Group: BTS" (wider triggers, value shown twice) | A0 (P2 consumer) | nit, known open request (requests/P2.md item 4: a UxDropdown option that keeps the label) |

## x-groups-filtered and x-groups-empty: /groups filter (P3)

Evidence: `shots/x-groups-filtered/{1440-light,390-dark}-side.webp`, `shots/x-groups-empty/{1440-light,390-dark}-side.webp`, `crops/x-groups-{filtered-1440-light-list,empty-1440-light-empty}.png`. "nct" hides Most played and lists the matches under N with "3 of 91 groups"; empty state "No group matches "zzqx"" + hint, centred: match (the prototype's own empty state overlaps its grid columns; the implementation is clean).

## x-create-done: quiz published (P5), publish answered by P5's local fake

Evidence: `shots/x-create-done/{1440-light,390-dark}-side.webp`, `crops/x-create-done-{1440-light-all,1440-light-bottom,390-dark-bottom}.png`. Stepper all done, mascot, URL row + Copy, Open your quiz + Post a challenge: match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Done block title and sentence | "It's live" (h2) + "The first plays decide if it trends this week. Share it with your fandom." | absent; the creator line "8 more quizzes to the Prolific Creator badge" sits under the mascot (the page H1 says "Your quiz is live!") | P5 | should (X2-009) |
| 2 | Buttons on phones | full-width stacked (Open your quiz, Post a challenge) | content-width, centred | P5 | should (X2-009) |
| 3 | Header copy, "Create another quiz" link | "Create a quiz" | "Your quiz is live!" + live intro; extra link | P5 | known (P5 deviations 1 and 6) |

## x-editor-thread, x-editor-blog, x-editor-challenge: composer modes (P8)

Evidence: `shots/x-editor-{thread,blog,challenge}/{1440-light,390-dark}-side.webp`, `crops/x-editor-{thread,challenge}-1440-light-sheet.png`. Sheet, mode seg, hints, Group / Title / Text fields, the challenge "Your score to beat" rows (cover, score · title, age · time), Message: match. Empty group field (prototype prefill), real scores, no preselected score; challenge Post disabled with "Challenge posts open soon..." (pending migration, known).

## x-post-thread: thread post page (P8)

Evidence: `shots/x-post-thread/{1440-light,390-dark}-side.webp`. Crumb, author line, H1, body, counts, share / report icons, replies block with the reply box, More from the community: match. The stored title stops mid-word at 80 characters (data, C1 note).

## x-share-post: post Share sheet (P8)

Evidence: `shots/x-share-post/{1440-light,390-dark}-side.webp`, `crops/x-share-post-390-dark-sheet.png`. "Share this post", mini card (cover, title, "Community · BTS"): match. No Story image tile (see X2-008).

## x-lb-players, x-lb-ranked, x-lb-creators: leaderboard tabs (P9)

Evidence: `shots/x-lb-{players,ranked,creators}/{1440-light,390-dark}-side.webp`, `crops/x-lb-players-1440-light-{rows,ranknum}.png`. Tab pill, podium, numbered rows (4 to 6 pink: measured rgb(201,56,104) on every tab), pinned "you" row, How points work: match. Known: Players = all-time XP with no weekly change column (RUN-STATE 25); rows show the level title ("Lv 13 · Bias") where the sample shows the fandom (players without a main group: data); Ranked tab is the not-live line (P7 migration pending, deferred).

## x-passport-quizzes: passport Quizzes tab, guest on /u/testtest (P10)

Evidence: `shots/x-passport-quizzes/{1440-light,390-dark}-side.webp`. Tab on, "Quizzes" section title, "No quizzes yet" (the test user made none): the populated list (rows, Published / Draft, Continue) is NOT verified (no quiz by the test user, owner view never loaded). History tab: owner only, NOT verified (never /me signed in).

## x-share-passport: passport Share sheet, guest (P10)

Evidence: `shots/x-share-passport/{1440-light,390-dark}-side.webp`, `crops/x-share-passport-390-dark-sheet.png`. Title "Share testtest's passport" (guest wording), mini card with the passport image, tiles: match except no Story image (X2-008).

## x-settings-savebar: unsaved-changes bar (P10)

Evidence: `shots/x-settings-savebar/{1440-light,390-dark}-side.webp`, `crops/x-settings-savebar-390-dark-bar.png`. Floating pill "You have unsaved changes" + Discard + Save changes above the tab bar: match. Username hint "Changing it breaks old links to your passport." vs "You can change it once every 30 days.": live rule copy (P10).

## x-notifs-social, x-notifs-empty: notification filter and empty (P11)

Evidence: `shots/x-notifs-{social,empty}/{1440-light,390-dark}-side.webp`, `crops/x-notifs-{social,empty}-1440-light-top.png`. Filter pill on "Social", filtered rows; empty "Nothing here yet / New activity shows up here.": match.
| # | Element | Expected | Actual | Owner | Severity |
|---|---|---|---|---|---|
| 1 | Unread count under the H1 with a filter on | follows the filter ("1 unread" on Social) | total "4 unread" | P11 | nit (X2-010) |
| 2 | Empty page | streak row + "Mark all read" stay | both hidden (no unread, test user without a streak) | - | real data |

## x-search-typed, x-search-none: search overlay typed and no results (P11)

Evidence: `shots/x-search-{typed,none}/{1440-light,390-dark}-side.webp`, `crops/x-search-{typed,none}-1440-light-ov.png`. Groups / Quizzes / Songs in the blindtest sections, rows with thumbnails and meta, active row; "No results for "zzzzqx"" + hint: identical (live counts differ).

## Extension: not covered

- Quiz challenge game chip ("Beat blink_edits: 7/8" in the game bar) and relaxed chip: NOT verified (a signed `?c=` link needs a real battles row; relaxed is deferred until its migration). The blindtest challenge chip is covered by x-btend-challenge's run.
- Passport History tab and the populated Quizzes tab: NOT verified (owner view, decision 1).

# Gap list (X2)

No blocker: every one of the 38 capture states and the 33 extra states shows the prototype's layout, components, icons, type, colours, radii and shadows; the differences left are known SEO locks / owner decisions (listed per state above), real data, or the items below.

| Id | Owner | Severity | What | Where |
|---|---|---|---|---|
| X2-001 | A0 | should | Phones: 136px of blank page under the footer instead of 64px. The legacy `styles/globals.css:632` `body { padding-bottom: 72px }` still applies under the flag-on shell, which adds its own `.ux-app { padding-bottom: 64px }` (a0.css:533). Every page at 390, both themes. | quizzes, home, all full pages at 390 (`crops/quizzes-390-dark-footbottom.png`) |
| X2-002 | P1 | nit | Home groups rail at 1440: a 1px sliver of the 11th tile's label (BABYMONSTER, wider than its 88px tile) shows at the rail's right edge. | home 1440 (`crops/home-1440-light-railedge.png`) |
| X2-003 | P3 | nit | /groups: the SEO-locked intro says "45 groups, A to Z" while the filter says "Filter 91 groups" and the list shows 91 (46 "No quiz yet"). Copy is locked: owner call. | groups (`crops/groups-1440-light-head.png`) |
| X2-004 | P3 | nit | Hub About members row wraps with an orphan (ATEEZ: 7 photos + "Jongho" alone on a second line) at 1440. | hub-ateez (`crops/hub-ateez-1440-dark-members.png`) |
| X2-005 | P6 | nit | Blindtest results kicker names the playlist ("All K-pop blindtest") where the prototype names the run: "All K-pop" (free) and "Challenge from blink_edits" (challenge result). | x-btend-free, x-btend-challenge |
| X2-006 | P6 | should | Blindtest results Share sheet: title "Share your score" (prototype "Share your blindtest"), no Story image tile, no Challenge link block (link row, Copy, "They play your exact questions · 48 hours", footnote); mini line "Sharp listener · points" vs "points · best combo". P6 does not pass A0 ShareSheet's `onStoryImage` / `challenge`. | x-share-bt (`crops/x-share-bt-390-dark-sheet.png`) |
| X2-007 | P1 | nit | Home blindtest band, played state: the pink pulse dot stays before "Blindtest of the day · played" (the prototype drops it once played). | x-home-daily-played |
| X2-008 | P4, P8, P10 (A0 ShareSheet) | nit | Story image tile missing on the "Share this quiz", "Challenge a friend", "Share this post" and passport share sheets (3 tiles instead of 4); only P4's result sheet has it. | x-share-quiz, x-share-challenge, x-share-post, x-share-passport |
| X2-009 | P5 | should | Create done state: no "It's live" heading and no "The first plays decide if it trends this week. Share it with your fandom." sentence under the mascot; on phones Open your quiz / Post a challenge are content-width instead of full-width stacked. | x-create-done (`crops/x-create-done-390-dark-bottom.png`) |
| X2-010 | P11 | nit | Notifications: with a filter on, the line under the H1 keeps the total ("4 unread") instead of the filtered count ("1 unread" on Social). | x-notifs-social |
| X2-011 | A0 (P2 consumer) | nit | /quizzes dropdown triggers show "Type: True/false" / "Group: BTS" once a value is picked, duplicating the chip; the prototype keeps "Type" / "Group". Already tracked: requests/P2.md item 4. | x-quizzes-chips, x-quizzes-empty |

Counts: blocker 0; should 3 (A0 1, P5 1, P6 1); nit 8 (A0 1, P1 2, P3 2, P6 1, P11 1, P4/P8/P10 1 shared). P2 (quizzes): 0 new, the page matches within its documented SEO decisions A and B.

NOT verified (unchanged by this pass): ranked populated states + btend-ranked (P7 migration), post-challenge and fan debate / challenge posting (P8 migration), passport owner view, History tab and populated Quizzes tab (decision 1), quiz challenge / relaxed game chips (signed battles row / P4 migration), XP line, "You beat N%" and guest rank line on results (save answered locally).
