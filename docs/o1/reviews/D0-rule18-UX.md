# D0 rule 18 audit, profile UX (special audit, not a merge review)

| field | value |
|---|---|
| audit | rule 18 (owner, 16 October 2026): same product, new skin. LEDGER D-018, D-019; CR-001 (approved) and CR-002 to CR-006 (proposed) read as they stood at the end of the audit |
| profile | UX |
| reviewer | R (fresh instance, read only: nothing edited, nothing committed, nothing staged in either worktree) |
| lane | `o1/D0` at dd39d7db46b59e6533c786defefafa699abb50fd (dd39d7d), tree 2ef384c6cc30efa633a5d38c6ffbb3ba67439cc9, worktree `.claude/worktrees/o1-D0`, merge base ffdc9aa |
| reviewed | dd39d7d plus the uncommitted work of the interrupted slice 3 (listed in section 1). The worktree is dirty on purpose: this audit covers both states, so the "not reviewable" refusal of a merge review does not apply |
| evidence folder | none (no gate run on D0 since rule 18; a static lane has no build). This audit relies on no gate output |
| own runs | Playwright (playwright-core 1.63, chromium 1243, remote requests blocked) at 390 and 1440, light and dark: 36 PNG files in `docs/o1/reviews/D0-rule18/` (not committed) and a DOM outline of each page; a CSS rule comparer (scratchpad, every selector and media context of a prototype sheet against the real sheets); `node design/o1-prototype/contrast.mjs --no-write`: PASS, 400 checks, 0 below AA (the tree stayed unchanged, `git status --porcelain` identical before and after) |
| kpop reference | `docs/design/growth-v12/prototype.html` (views `#home`, `#groups`, `#hub`, the top bar and tab bar), `apps/quiz/src/styles/ux-v1/a0.css`, `p1.css`, `p3.css`, `styles/ux-v12/home.css`, and the components named in TWINS rows 1, 2, 3, 26, 27, 28 |
| date | 2026-10-16 |
| verdict | FIX (6 blockers, 10 majors, 7 minors). What stays, what is rebuilt and what is dropped is in sections 4, 5 and 9 |

## 1. What was audited, committed and uncommitted

| file | state | kind |
|---|---|---|
| `assets/tokens.css` | committed (3d59b44) | tokens |
| `assets/ux.css` | committed (3d59b44, dd39d7d), plus 13 uncommitted lines (`[hidden]` rule, `.ux-gtile*`) | copy of a0 component classes |
| `assets/proto.js` | committed, plus 6 uncommitted lines (`d0:state` event, `D0_setState`) | prototype chrome |
| `assets/icons.js` | committed | icon sprite |
| `brand/otakuquiz.html` | committed (3d59b44) | brand kit |
| `contrast.mjs`, `contrast.md` | committed (3d59b44, dd39d7d) | contrast check |
| `index.html` | committed (3d59b44, dd39d7d) | coverage list |
| `anime/404.html` | committed (ec1cacc, dd39d7d) | frame, row 27 (carries the shell, row 28) |
| `anime/home.html` | committed (dd39d7d) | frame, row 1 |
| `anime/series.html` | committed (dd39d7d) | frame, row 2 |
| `anime/footer.html` | committed (dd39d7d) | frame, row 28 |
| `anime/legal.html` | committed (dd39d7d) | frame, row 26 |
| `assets/p1.css`, `assets/series.js` | committed (dd39d7d) | copy of kpop home classes; fixture data |
| `assets/titlecard.js` | committed (dd39d7d), plus 10 uncommitted lines (`data-tc-vars`) | A7 art |
| `assets/oq.css` | committed part (116 lines, dd39d7d) plus 188 uncommitted lines (series hub part) | anime component rules |
| `anime/series-death-note.html`, `anime/series-one-piece.html` | uncommitted, untracked | frames, row 3 |
| `assets/hub.js`, `assets/p3.css` | uncommitted, untracked | hub behaviour; copy of kpop hub classes |

## 2. Method

1. Read COMMON rule 18, REVIEWER point 9, the D0 brief (Rule 18 section), TWINS-draft (re-read after it changed on
   disk during the audit: CR-001 adds twin rows 31 to 36, row 37 and H-0; CR-002 to CR-006 are proposed only),
   REVIEW-LOG, LEDGER, F0's draft `tokens.md` and `routes.md`, and the D0 report.
2. For each frame: the TWINS row, the kpop twin page and the components it renders, then the frame's markup, its
   classes and its CSS. Every difference is checked against the row's closed list (T B V C F N, A1 to A7) or an
   approved CR.
3. For each shared asset: a rule by rule comparison with the real kpop sheet it copies (identical, different,
   absent from kpop), and a check of every declared `--ux-*` name against the frozen list (a0.css names plus the
   4 new names of `tokens.md` 1.2).
4. Render of the anime frames and of the kpop prototype views at 390 and 1440, light and dark: visible section
   outline, `scrollWidth`, page errors, then side by side reading of the screenshots.

## 3. Global checks

- Twin frames: no frame shows its kpop twin, and no difference is marked with a code. All 9 HTML files carry
  `data-site="anime"` (or anime and hub for the index); `grep "twin\|T B V C"` finds no hit in any frame. The
  coverage list has three columns (Frame, Route or Stands for, Status: `index.html` lines 59, 74, 120), not the twin
  and the codes the D0 brief's deliverable 1 asks for. Blocker B1.
- Token names: every `--ux-*` name declared in `tokens.css`, `ux.css`, `p1.css`, `p3.css` and `oq.css` is frozen
  (script over the five sheets: 0 unknown names). Anime orange lives in `--ux-pink*` with the Option A values of
  `tokens.md` 4.2 (each value checked against the table). Kpop values equal a0.css except the font stack order
  (decision 6, a prototype stand in). Selectors are the frozen `html.ux-v1[data-site="anime"]`, `.dark` and system
  dark forms. No anime frame reads a token the anime theme leaves at a kpop value (grep for `acc-*`, `rar-*`, `lt-*`,
  `th-*`, `host-bg`, `good*`: no use). Contrast: PASS on 400 pairs.
- Re-created kpop components under other names: yes, several (B2, B3, M5, M7, M8): `.oq-scard` (a bordered series
  card instead of the A to Z row), `.oq-cov` (an anime version of the kpop typographic cover), `.oq-ch` (a bordered
  character card instead of the `p3-members` tile), `.oq-oshi` (a copy of `.ux-btn-ghost.ux-btn-sm` with a pressed
  state), `.oq-sel` (a select instead of `UxDropdown`), `.oq-mix`, `.oq-toc`, `.oq-net`, `.oq-contact` (new boxes);
  and restyled kpop classes in `ux.css` (`.ux-qgrid` on phones, `.ux-badge-new`, `.ux-kicker`, `.ux-switch`).
- Faithful copies (the prototype's stand in for an import, accepted for a static lane): `p1.css` 65 of 68 rules
  identical to `ux-v1/p1.css` plus `ux-v12/home.css` (the 3 others are the v11 and v12 rules of one selector merged);
  `p3.css` 120 of 120 rules identical to `ux-v1/p3.css`; the uncommitted `.ux-gtile*` block identical to a0.css lines
  737 to 745 and 835.
- Screens without a twin row: none among the built frames. Among the planned frames of the coverage list: the
  welcome card (CR-002, proposed), "How I appear here" (CR-003, proposed), the oshi row as its own frame (CR-005 for
  quiz results, proposed; on /me and /u it is only the V form of the bias), and the passport bounce page (row 37: no
  visible page allowed). Major M10.
- Layout at 390 and 1440, light and dark: `scrollWidth` equals the viewport on every frame, no page error, the dark
  theme applies on every frame (screenshots `*-390-dark.png`, `*-1440-dark.png`).
- Copy: no U+2014 or U+2013 anywhere in `design/`; the only "kpopquiz" words on anime frames sit in `.d0-spec`
  annotations (prototype chrome), see m7.

## 4. Frame by frame

| frame | state | row, kpop twin | verdict | what departs, and the exact change |
|---|---|---|---|---|
| `anime/home.html` (guest, signed in) | committed | 1, `app/(site)/page.tsx` with `components/home/ux-v1/ux-home.tsx` and prototype `#home` | REWORK | Order kept for header, quiz of the day, Continue playing, rail, band, community. Departs: "New quizzes" drawn as the Trending card grid (`.p1-trend .ux-qgrid` of `ux-qcard`, line 101) instead of `NewRows` rows in the `.p1-two` section (ux-home.tsx 79 to 89); rail tiles are rounded squares (`.oq-tc.is-mini`, line 95) instead of the round `p1-gav` avatar (groups-rail.tsx 17); the ticker slot is gone (ActivityTicker hides itself while there is no activity, but the `p1-ticker` slot stays); every card uses the invented `.oq-cov` cover (B3) and an A5 label that row 1 does not list (M4); the community block is an invented card (B6); CTA "Browse anime series" to /series and "See all new" to search, where the twins now exist (`/quizzes` row 31, `/new` row 32, CR-001); band link icon before its text (line 146; `UxLink` puts it after, button.tsx 64); no "Your best" stat state. Change: same sections and components as ux-home.tsx, with `NewRows` in `.p1-two`, the A7 art inside the round `p1-gav`, the ticker slot kept with its min-gate state, CTAs to `/quizzes` and `/new`, community as `CommunityRows` renders it (rows, or nothing; the Verse and Discord lines are F) |
| `anime/series.html` | committed | 2, `app/(site)/groups/page.tsx` with `groups-index.tsx`, `groups-browser.tsx`, `group-avatar.tsx`, prototype `#groups` | REWORK (rebuild the body) | A new directory design: visible breadcrumb (line 52; the kpop page has none), type chips (line 62), A to Z jump bar (69), Anime Mix banner (71), one 4 column grid of `.oq-scard` cards with 3:2 title cards (79). Outline at 1440: kpop `h1, Most played, grail, A to Z, az`; anime `h1, oq-az, oq-mix, oq-sgrid`. Change: header (H1, intro, `p3-genline`), the `p3-filter` field, "Most played" rail (`p3-grail`, min-gated at launch), "A to Z" with its count aside and letter blocks of `p3-azr` rows (32 px round avatar with the A7 art, name, count or "No quiz yet"); Anime Mix is one row of the A to Z, as General K-pop is on kpop. The classes are already in the uncommitted `p3.css` copy and unused |
| `anime/series-death-note.html` (free, progress, all) | uncommitted | 3, `app/(site)/[slug]/page.tsx` with `group/ux-v1/hub.tsx`, `hub-quizzes.tsx`, `hub-growth.tsx`, prototype `#hub` | REWORK | Kept and compliant: crumb, eyebrow, the two part H1, lead, FAQ (`p3-faq`), the side "From the community" slot; anime blocks A1 sources panel, A2 story map and arc grouping, A3 monogram role shapes, A4 openings table, A5 shield and covers; Fans picked absent (F). Departs: invented blocks (B4: Daily quiz tile line 101, "Facts with sources" side list 362, phone sticky bar 399, start note 59, character filter and role chips 161 to 166); quiz list moved into the low main column, cover cards instead of `TextCard`, no sort or filters (M6); no "About Death Note" section (M7); hero art and facts out of their slots (M8); "Related series" (m1). Change: kpop hub order, crumb, hero, HubGrowth (Ways to play only when 2 or more kpop tiles exist: here 1, so the section is absent), HubQuizzes full width with arcs as group headings and A5 covers, then `p3-low` with About (lead, characters in `p3-members`, Updated, links) and FAQ, side with community, Fans also play, newest; anime blocks A2 story map and A4 table in slots the hub owner adds |
| `anime/series-one-piece.html` (free, progress, all) | uncommitted | 3, same twin | REWORK | As Death Note, plus 5 Ways tiles in a 5 column variant (line 105, `oq.css` 168) while `waysToPlay` caps at 4 (growth.ts 24) and has no daily key. Change: at most 4 tiles from the kpop set (Quizzes, Openings for Blindtest, Name them all, Which character for Which member), 4 or 2 columns |
| `anime/404.html` | committed | 27, `app/(site)/not-found.tsx` | REWORK | Kpop order: mascot (think), "404", "This page doesn't exist", one line, search field, "Popular quizzes" label with group pills, three text links (Home, Browse all quizzes, Create a quiz), Discord line (F). The frame (lines 59 to 65): Fuki, H1, line, a primary and ghost button pair (invented), search last with a visible label; no "404", no pills, no link row. Change: the kpop order and slots, Fuki think for the mascot (B), series pills (V), links Home, Browse all quizzes (`/quizzes`, row 31), Create a quiz |
| `anime/footer.html` (flag on, off) | committed | 28, `layout/ux-v1/ux-footer.tsx` | REWORK (small) | Brand, four columns, Top series row (V), A6 notice and the network line are right. Departs: the "Made by fans" brand line removed (note 1 of the frame); columns miss the twins that now exist (All quizzes, Popular quizzes, Trivia, Trending, New quizzes, Leaderboard, Help, DMCA: rows 31 to 36) and add links kpop does not have (Opening of the day, Anime Mix, Search); no locale control and no code for its absence. See M2 |
| `anime/legal.html` (privacy, terms, contact) | committed | 26, `privacy/page.tsx`, `terms/page.tsx`, `contact/page.tsx` | REWORK | Kpop: H1, "Last updated", intro, numbered H2 sections; contact: intro, Email, Community. The frame adds a breadcrumb (52, 87, 115), an "On this page" box (59, 90), a network aside box (55), and three icon panels on contact with two new slots ("A wrong fact", "Rights holders"). Change: kpop structure; the P 8.2 network paragraph is a numbered section of the privacy text (C); contact keeps the Email slot, the Community slot is absent (F: Discord; no Reddit account), rights holders go to `/dmca` (row 36) |
| shell markup repeated in every frame (top bar, tab bar) | committed and uncommitted | 28, `ux-nav-links.tsx`, `ux-nav-actions.tsx`, `ux-tab-bar.tsx`, `lib/ux-v1/a0/nav.ts` | REWORK | See M1 |
| `brand/otakuquiz.html` | committed | B (brand kit, not a screen) | KEEP | Wordmark, Fuki (expressions map to the kpop mascot variants), colours, type. The OQ seal is described for badges, which have no brand stamp on kpop (m6) |
| `index.html` | committed | coverage list | REWORK | Add the kpop twin and the difference codes per frame (B1); add rows 31 to 36 and H-0; mark CR-002, CR-003, CR-005 frames as waiting for the owner and drop the bounce page (M10); hub frames still say "planned" while the uncommitted files exist (m8) |

## 5. Shared assets

| asset | state | verdict | notes |
|---|---|---|---|
| `assets/tokens.css` | committed | KEEP | Frozen names, a0 values for kpop, Option A for anime, neutral hub theme, the three selector forms. Before any frame uses theme covers, letter tiles, rarity or name accents, the anime blocks must set `acc-*`, `rar-*` and the v12 grounds (m4); hub lacks `qotd-*` and `bt-bg` (report open point 6) |
| `assets/p1.css` | committed | KEEP | Faithful subset. Its header calls the ticker "kpop only": the ticker is not in F (m5) |
| `assets/p3.css` | uncommitted | KEEP | 120 of 120 rules identical to the kpop sheet |
| `assets/ux.css` | committed plus uncommitted | REWORK | 153 rules identical, 63 different, 63 absent from a0 (brand, notice, prototype chrome). Material drift in M5. The uncommitted `[hidden]` rule and `.ux-gtile*` block are fine |
| `assets/oq.css` | committed part and uncommitted part | REWORK | Keep: `.oq-tc` title card (A7), `.oq-spl` only where A5 is listed, `.oq-src`/`.oq-srcs` (A1 Sources), `.oq-shield` minus `.oq-sel` (A5), `.oq-cover` (A5), `.oq-arc-h` (A2 grouping, inside the shared list), `.oq-map` (A2), `.oq-themes`/`.oq-kind` (A4), `.oq-chm` role shapes (A3). Drop: `.oq-cov`, `.oq-dir-tools`, `.oq-az`, `.oq-letter`, `.oq-sgrid`, `.oq-scard`, `.oq-mix`, `.oq-toc`, `.oq-net`, `.oq-contact`, `.oq-start-note`, `.oq-ways.is-5`, `.oq-chtools`, `.oq-ch`, `.oq-chars` grid and clamp, `.oq-oshi`, `.oq-sel`, `.oq-facts`, `.oq-sticky`, `.oq-qtools` (unused). Rework: `.oq-hero-tc` into `.p3-photo`, `.oq-hfacts` into `.p3-facts`, `.oq-rel` into the Fans also play row; scope and literal fixes of m3 |
| `assets/hub.js` | uncommitted | REWORK | Keep the shield states, covers, A5 label text, oshi toggle, Sources disclosure. Drop the sticky bar and the character filter |
| `assets/proto.js` | committed plus uncommitted | KEEP | Prototype chrome only |
| `assets/icons.js` | committed | KEEP | App icons plus O1 glyphs (`i-shield-arc` serves the A5 label) |
| `assets/series.js` | committed | KEEP | Fixture data, marked as such |
| `assets/titlecard.js` | committed plus uncommitted | KEEP | A7 art and the A3 colour pair; rename `--tc-*` to `--anime-*` when it moves to the app (m3) |
| `contrast.mjs`, `contrast.md` | committed | KEEP | PASS, 400 checks; re-run after the rework |

## 6. Attack attempts (recorded)

1. Section order of the anime home against the kpop home (prototype `#home` and `ux-home.tsx`), DOM outline at
   1440. Kpop: `ticker, h1, h2.hsub, qotd, Groups, grail, Trending, qgrid, All time best, rows, New quizzes, rows,
   band, From the community, rows`. Anime: `h1, h2.p1-hsub, p1-qotd, Series, p1-grail, New quizzes, ux-qgrid,
   p1-band, From the community` (signed in adds Continue playing in the right place). Result: order holds, but New
   quizzes changed component (rows to card grid) and the community body changed (rows to an invented card). Found M3, B6.
2. Looked for a re-created card or button style: CSS rule comparer over `ux.css`, `p1.css`, `p3.css`, `oq.css`
   against a0, p1, p3, ux-v12 home and g8. Result: `p1.css` and `p3.css` are faithful; `oq.css` re-creates a card
   (`.oq-scard`, `.oq-ch`), a cover (`.oq-cov`), a ghost button (`.oq-oshi`, same height 32, radius 999, edge border
   and hover as `.ux-btn-ghost.ux-btn-sm`) and a select (`.oq-sel`); `ux.css` restyles four kpop classes. Found B2,
   B3, M5, M7, M8.
3. Looked for a block outside A1 to A7 on every frame: found the /series chips, jump bar and Anime Mix banner, the
   home community card, the hub Daily tile, 5 tile grid, Facts with sources, sticky bar, start note, character filter,
   the legal crumb, page index, network box and contact panels, and the 404 button pair. Found B2, B4, B5, B6, M9.
4. Checked the report's claims against the files: "p1.css is a copy of the kpop home classes, values unchanged"
   (true, 65 of 68 identical, 3 merged); "p3.css copied whole" (true, 120 of 120); "ux.css: a0 component classes"
   (partly false: 63 rules differ, for example `.ux-qgrid` on phones, `.ux-badge-new`, `.ux-kicker`); decision 5
   "kpop frames are not changed" by the switch ring (false: `ux.css` line 200 is not scoped by `data-site`).
5. A path the builder did not compare: the phone interaction of the quiz row at 390. Probe: kpop `#h-trend` is
   `display:flex; overflow-x:auto` with 252 px cards side by side (a swipe row); the anime `.p1-trend .ux-qgrid` is
   `display:grid` with two 169 px columns stacked. Found M5.
6. A planted wrong count: the hub Ways to play against `waysToPlay` (growth.ts 23, 24, 81 to 148). Death Note has
   one real kpop tile (Quizzes), so the shared logic renders no section (MIN_TILES 2); the frame adds a Daily quiz
   tile to keep the section. One Piece shows 5 tiles against MAX_TILES 4. Found B4.
7. Token leak probe: grep for every token the anime theme does not set; no frame reads one. No leak today (m4 only).

## 7. Findings

### Blockers

- **B1. No frame is shown next to its kpop twin and no difference carries its code.** Where: every frame,
  `index.html` lines 59, 74, 120. Proof: all frames carry only `data-site="anime"`; no twin, no code in any file; the
  D0 brief (Rule 18 section) asks to build the kpop twin frame from prototype.html with the a0 tokens and to show the
  anime frame next to it at the same width with each difference marked T, B, V, C, F, N, A1 to A7. Change: one page
  per route with the kpop twin frame and the anime frame side by side, difference pins carrying their code, and the
  coverage list gaining "kpop twin" and "codes" columns.
- **B2. /series is a new design, not the kpop directory.** Where: `anime/series.html` 52, 62, 69, 71, 79; `oq.css`
  (committed) 49 to 70. Proof: render outline (section 4); kpop `groups-browser.tsx` renders filter, Most played and
  A to Z letter blocks of rows; the frame renders chips, a jump bar, a promo banner and a card grid
  (`kpop-groups-1440-light.png` against `anime-series-1440-light.png`). Change: rebuild on `p3.css` as in section 4.
- **B3. `.oq-cov` is an anime version of the kpop typographic cover.** Where: `oq.css` 33 to 40; every quiz card of
  `home.html` (from line 101) and of both hubs. Proof: `ux-v1/quiz-card.tsx` 94: the kpop fallback is `.ux-qcov-fb >
  .ux-fbn` (type glyph plus group name); the frame adds a type pill, a display series name block and a Fuki mark on
  every card, and B allows Fuki only where kpop shows its mascot (it does not on a card). Change: the A7 title card
  art in `.ux-qcov` (where kpop shows the group photo), or the kpop `.ux-qcov-fb` fallback with the series name; no
  pill, no Fuki.
- **B4. Invented blocks on the series hub.** Where: `series-death-note.html` 59 (start note), 101 (Daily quiz tile),
  161 to 166 (character filter and role chips), 362 ("Facts with sources" side list; A1 is the header facts only),
  399 (phone sticky "Start the quiz" bar); `series-one-piece.html` 105 and 110; `oq.css` 143, 168, 185, 246, 256;
  `hub.js` (sticky, filter). Proof: none of these exists in `hub.tsx`, `hub-growth.tsx` or `hub-quizzes.tsx`, none is
  in A1 to A7, no CR covers them; `waysToPlay` has no daily tile (attack 6). Change: drop them; the facts go into the
  About prose and the trivia link (row 5 owns facts with sources).
- **B5. Invented blocks on the legal pages.** Where: `legal.html` 52, 55, 59, 87, 90, 115 and the contact panels;
  `oq.css` 80 to 92. Proof: kpop privacy and terms are H1, "Last updated", intro and numbered H2 sections; contact is
  an intro and two label and link pairs (`contact/page.tsx`). Row 26 allows T B C only. Change: section 4.
- **B6. Invented empty state card in the home community section.** Where: `home.html` 158 to 161 (an inline styled
  box with a "Start a thread" button). Proof: `community-rows.tsx` renders the rows or nothing, then the Verse line
  and the Discord lines (both F on anime); no empty card exists. Change: the section as the shared component renders
  it; if a header with nothing under it is not wanted, that is a prop request to the home owner (hide when empty),
  not a new block.

### Majors

- **M1. The top bar and tab bar differ from the kpop shell.** Where: the shell markup of every frame (for example
  `home.html` 25 to 44 and the tab bar at its end). Proof: `lib/ux-v1/a0/nav.ts` 19 and 28, `ux-nav-links.tsx`
  (icon in each link, `ux-lsp` spacers), `ux-nav-actions.tsx` 204 to 228 (`ux-sbtn` search, ghost "Sign in"),
  prototype.html 1973 to 1988 and 2026 to 2032. The frames have no link icons and no spacers, a `ux-ib` search, a
  primary "Sign in", nav Home, Series, Openings, Daily, Community (Daily added, Quizzes and Leaderboard dropped,
  though CR-001 now gives both a twin, rows 31 and 35) and tab bar Home, Series, Openings, Daily, You (kpop: Home,
  Quizzes, Blindtest, Community, You). Change: nav Home, Quizzes, Series, Openings, Community, Leaderboard with the
  kpop icons and spacers; tab bar Home, Quizzes, Openings, Community, You; `ux-sbtn`; ghost Sign in.
- **M2. Footer columns and slots.** Where: the footer of every frame; `anime/footer.html` notes 1, 2, 6. Proof:
  `ux-footer.tsx` columns and brand block. Missing twins that now exist (All quizzes, Popular quizzes, Trivia,
  Trending, New quizzes, Leaderboard, Help, DMCA), extra links with no kpop counterpart (Opening of the day, Anime
  Mix, Search), the "Made by fans" line removed, the locale control absent without a code. Change: kpop columns with
  V and F applied (Ranked, Knowledge Report, Pulse, Stats, Articles, News, Fandoms, Discord, Reddit absent under F and
  CR-001), the brand line kept with anime copy (C), the locale control either shown or listed in F through a CR.
- **M3. Home components and slots.** Where: `home.html` 95, 101, 146, header CTA, "See all new". Proof: section 4,
  attack 1. Change: section 4.
- **M4. A5 spoiler labels on the home, where row 1 lists no A5.** Where: `home.html` 72 ("No spoilers" in the quiz of
  the day line) and `.oq-spl` on all 8 cards. Proof: TWINS row 1 allows T B V C F N A7. The label "No spoilers" is
  also not one of the A5 labels ("Safe for you", "Covers {arc}"). Change: remove from the home, or a CR that adds A5
  to row 1 (ORCH or owner).
- **M5. `ux.css` drifts from a0.css.** Where: `ux.css` 66 (`.ux-nav` border and top), 70 (`.ux-links` gap 8 px, a0
  gap 0 with spacers), 115 (`.ux-kicker` uppercase), 175 (`.ux-badge-new` surface and ink, a0 pink-soft), 200 (switch
  off state, not scoped to anime and hub), the 760 px block (`.ux-qgrid` a 2 column grid, a0 a horizontal snap
  scroller; `.ux-pg` 32 and 72, a0 28 and 64; `.ux-ph h1` 28, a0 26; `.ux-sheet`), `.ux-toast`, `.ux-field` (28, a0
  32), and anime only heading weights 800 and 700 (not a token). Proof: rule comparer, attack 5. Change: copy a0
  values; a ring or weight change is a request to the a0 owner, not a prototype edit.
- **M6. Hub quiz list.** Where: `series-death-note.html` 107 to 156, `series-one-piece.html` 117 to 183. Proof:
  `hub-quizzes.tsx` 111 to 169 renders a full width section after Ways to play (inside HubGrowth), titled
  "{group} quizzes" with the count as sub, a Segmented sort (Popular, Newest, Most liked, Hardest), Type and Level
  `UxDropdown`, a `TextCard` grid and "Show all {n}"; the frames put the list in the low main column, use cover
  cards, drop the controls and "Show all", and title it "Quizzes {n}" with a create link. Change: the kpop list
  structure, with the arcs as group headings and the A5 covers inside it (A2 and A5 through props of its owner).
- **M7. Hub "About" section missing; A3 in a new form.** Where: both hub frames, `oq.css` 185 to 214. Proof:
  `hub.tsx` 282 to 316 (About with answer lead, `p3-members` row, Updated line, links "Learn before you play" and
  "Make your own"). The frames have no About; characters are a bordered card grid with descriptions, a clamp and
  "Show all"; the oshi control re-creates a ghost button. Change: About {series} with the lead, the characters in
  the `p3-members` slot (80 px monogram face with the role shape, name, role; oshi star as A3 allows, on the kpop
  button through a prop), Updated, the trivia and create links.
- **M8. Hub hero slots.** Where: `oq.css` 127, 131, 163, 263; `series-death-note.html` 56 to 75. Proof: `hub.tsx`
  228 to 265 and `p3.css` 60 to 73, 147, 155: the photo sits in `.p3-photo` (16:10, 16:9 on phones, after the text);
  the facts are one `p3-facts` line. The frames place the title card outside `.p3-photo` and above the H1 on phones,
  split A1 into a three line block and a phone chip scroller, use a custom select in the shield, and change "Play
  the top quiz" to "Start the quiz". Change: A7 in `.p3-photo`, A1 in `p3-facts` plus "Sources (i)", the kpop
  `UxDropdown` in the shield, the kpop action copy structure.
- **M9. 404 order and slots.** Where: `anime/404.html` 59 to 65. Proof: `not-found.tsx`. Change: section 4.
- **M10. Planned frames without an approved twin row, and new rows missing from the coverage list.** Where:
  `index.html` (welcome card, How I appear here, oshi row, passport bounce page). Proof: TWINS "Surfaces without a
  kpop twin" (CR-002, CR-003, CR-005 proposed, not approved) and row 37 (no visible page on `/auth/*`); rows 31 to 36
  and H-0 are not in the list. The D0 brief's deliverable list still names the welcome card, "How I appear here" and
  the oshi row: ORCH aligns the brief. Change: mark them "waits CR-00x", drop the bounce page frame, add rows 31 to
  36 and H-0.

### Minors

- **m1.** "Related series" (`series-death-note.html` 379) replaces the kpop "Fans also play" slot (`hub.tsx` 371):
  sub line "Same studio" instead of "{n} quizzes · top quiz", square thumbs instead of the 40 px round avatar. The
  community note has no door link (kpop `p3-com-empty` ends with a `UxLink`). Keep the kpop slot and sub structure.
- **m2.** Ways to play header without its "play" icon; Quizzes tile icon `layers` (kpop `t-classic`) and body copy
  structure ("{n} fan-made {series} quizzes.", foot "Most played first").
- **m3.** For O1's reuse of `oq.css` (`tokens.md` 3.3): anime overrides use `html[data-site="anime"]`, not the frozen
  `html.ux-v1[data-site="anime"]`; most `.oq-*` rules are unscoped; hex duplicates at line 12 (persimmon and indigo
  rgba) and 40 (Fuki colours); `.oq-cov .ux-fuki` redeclares three frozen names locally; `--tc-*` should be `--anime-*`.
- **m4.** The anime theme does not set `acc-*`, `rar-*`, `lt-*`, `th-*`, `host-bg`, `good`, `good-soft`: unused
  today, required before any frame shows them (`tokens.md` 4.2: a kpop pink left on an anime page is a finding).
- **m5.** `/series` count line uses `.ux-meta`, not `p3-genline`; `p1.css` header calls the ticker kpop only.
- **m6.** Brand kit line 124: the OQ seal is a "stamp on badges"; the kpop `badge-medal.tsx` has no brand stamp. Keep
  it for H3 world stamps on the hub only, or a CR.
- **m7.** `.d0-spec` annotations stay visible with `?chrome=0` and name kpopquiz.org on anime frames
  (`series-death-note.html` 393, `series-one-piece.html` 359, 506). Prototype chrome, not UI copy; hide them with
  `?chrome=0` so G5 screenshots show only the screen.
- **m8.** Interrupted slice: the coverage list still marks both hubs "planned"; 8 files are uncommitted.

## 8. Decisions for ORCH or the owner (rule 15)

1. A5 on the home (M4): remove, or a CR that adds A5 to row 1.
2. The locale control in the anime footer (M2): English only, so either F through a CR or shown with one language.
3. Community section on the home with no rows and no F lines (B6): a header with nothing under it, or a prop of the
   home owner that hides the section.
4. Slot placement of A2 story map, A4 openings table and the A5 shield inside the shared hub (props of the hub owner,
   D-018): D0 draws one placement per block; the hub owner confirms the slots.
5. The D0 brief deliverables that have no approved row (M10): align the brief with CR-002 to CR-006 and row 37.

## 9. What stays, what is rebuilt, what is dropped

- KEEP: `assets/tokens.css`, `assets/p1.css`, `assets/p3.css` (uncommitted), `assets/proto.js`, `assets/icons.js`,
  `assets/series.js`, `assets/titlecard.js`, `contrast.mjs` and `contrast.md`, `brand/otakuquiz.html`; inside the
  hubs: crumb, eyebrow, H1, lead, FAQ, the A1 sources panel, A2 story map and arc grouping, A3 role shapes, A4 table,
  A5 shield (without its custom select) and covers; on the home: header, quiz of the day row, Continue playing, band.
- REWORK: `index.html`, `assets/ux.css`, `assets/oq.css`, `assets/hub.js`, `anime/home.html`, `anime/series.html`
  (body rebuilt on `p3.css`), `anime/series-death-note.html`, `anime/series-one-piece.html`, `anime/404.html`,
  `anime/footer.html`, `anime/legal.html`, the shell markup of every frame.
- DROP: the /series type chips, jump bar, Anime Mix banner and card grid; `.oq-cov`; the home community card; the hub
  Daily tile, 5 tile grid, Facts with sources, sticky bar, start note, character filter and role chips; the legal
  crumb, page index, network box and contact panels; the 404 button pair; the planned welcome card, "How I appear
  here" and oshi row frames until their CR is approved; the bounce page frame (row 37).

## 10. Verdict

FIX. Six blockers (B1 to B6) and ten majors (M1 to M10). The tokens, the brand kit, the contrast check and the two
copied kpop sheets are sound and stay. Every frame needs rework: the twin frames and codes are missing everywhere
(B1), /series and the legal pages are new designs (B2, B5), the hub frames move and replace shared components and
add blocks (B4, M6 to M8), and the shell and the quiz card cover depart on every page (M1, B3). Rebuild order:
the shell and `ux.css` first (they carry every frame), then home, /series, the hubs, 404, footer and legal, each
next to its kpop twin.
