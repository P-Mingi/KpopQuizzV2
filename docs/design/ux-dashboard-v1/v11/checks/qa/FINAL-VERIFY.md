<!-- Copied by C3 on 2026-09-29 from the final verifier V's session scratchpad (final-v/verify.md), text unchanged below this note. The evidence it names (harness/, shots/, crops/, probe-*.json, specs-*.json, *.log, results*.jsonl) stayed in that scratchpad and is not committed. -->

# V: final verification of UX v11.2 (read-only)

- Build under test: flag-on production build of 2a6cbef served by ORCH on http://localhost:3021 (never started or stopped by V).
- V worktree: agent-a879a7e4937bda6cd detached at origin/feat/ux-v1-v11 = eeb2e13 (2a6cbef + RUN-STATE.md only: `git diff --stat 2a6cbef HEAD` = 1 doc file).
- Reference: v11/checks/reference/ (main checkout) + X2 ref-extra captures.
- Rules: no app edit, no commit, no push; every POST/PUT/PATCH/DELETE to /api/** or Supabase answered locally; signed in only through the Playwright setup project; never /me or /profile signed in; passport on /u/testtest as a guest.
- Harness: scratchpad/final-v/harness (adapted from X2's x2-cap.mjs and C1's drivers.mjs).

Fix map (from `git log --first-parent`): X1-001 P6 #67 9fd6cbe; X1-004 P10 #68 827803b; X1-005 + X2-004 P3 #69 00728c6; X2-009 P5 #70 7f06581; X2-005/006 P6 #71 66933a3; X2-001/008/011 + X1-003 A0 #72 2e54e48; X2-010 P11 #73 8e1fcef; X2-002/007 P1 #74 7579d4a; X1-003 P10 #75 2e82db3; owner requests A0 #76 4ed5acf; X1-006 P2 #77 ab6fd66; X1-002 P4 #78 6fd6810; X1-007 C3 #79 c0b6826; warm sweep S1 #80 a282bf5; tablet A0 #81 cd8f8d4; toast A0 #82 8ee2e1e; save bar P10 #83 6ab0566; P4 fix4 #84 2a6cbef.

(sections are appended one at a time)

## 5. The 38 capture states at 1440 light and 390 dark (76 captures)

Method: `harness/vcap.mjs` = C1's drivers (same URLs, fixtures, signed-in state, write guard) + X2's capture recipe; each capture compared numerically (100px bands, a pixel differs when a channel moves > 24; the page ground of each image is treated as equal) against (a) the reference PNG and (b) X2's own capture of the same state (`audit-x2/shots`, build 63d8ef4, the capture X2 audited line by line against the reference), plus an outline diff (headings, buttons, fields: text, box, font, colours) against X2's outline. Anything that differs from X2's capture is either data, a merged fix, an owner deviation, or new. Evidence: `final-v/shots/<state>/<combo>-impl.{png,json}`, `results.jsonl`, crops in `final-v/crops/`.

Result: 76/76 rendered, 0 driver errors, signed in where the driver asks, horizontal scroll 0 on all 76, 11 writes attempted and all answered locally (6 x POST /api/quiz/<id>/play, 2 x POST /api/share/generate), page errors: only the known local `/_vercel/insights` "Unexpected token '<'" (RUN-STATE 2026-09-29, next start only), no other.

390 dark vs X2's capture: pixel-identical (0.00 to 0.05% over the common area) on groups, hub-empty, create-1/2/3, ranked, btend-ranked, post-challenge, post-blog, passport, passport-badges, settings, header-sheet, notifications, bell, btplay, btplay-answered, editor, share: dark is unchanged. Every full page is 71px shorter (136 -> 65px under the footer, X2-001). The rest differ only by:
- data: home/search/bell quiz of the day ("K-pop Viral Dance Challenges" today vs "BTS: The Ultimate Quiz"), greeting (evening/afternoon), trending order; play/play-answered/play-qotd drawn questions; community/editor/post-debate today's debate ("Dark concept or bright concept"); leaderboard and quizzes order; blindtest "Today's board" empty today (`crops/blindtest-*`, section 85px shorter); end/end-guest same-group quiz row (`crops/end-390-dark-mid.png`); signin page behind the scrim scrolled a little further (X2 noted the same).
- fixes: hub-blackpink / hub-ateez About members row is now one scrolling rail (X2-004, `crops/hub-ateez-1440-light-members.png`); blindtest-playlist-open lost "Title tracks only" (RUN-STATE 33, owner-documented).

1440 light vs X2's capture (ground normalised): the same data items, the members rail, and three documented token changes seen in the outline diff: `--ux-surface` rgb(247,246,244) -> rgb(241,239,234) (Mark all read, Copy, Add a group, Next, streak pill...), `--ux-pink-ink` rgb(201,56,104) -> rgb(196,53,101) (links, active segments, letter heads), page #FFFFFF -> #FAF8F5; the nav band (y 0-100) moves 3.2 to 3.9% on every page (nav spacing, owner request 1). Nothing else.

Verdict section 5: no difference beyond data, merged fixes and the owner deviations (warm ground, nav spacing, SEO locks and the known deviations of AUDIT-X2 / RUN-STATE). Nothing new.

## 2. Owner request 1: nav spacing (A0 fix 5, PR #76)

Probe `harness/vprobe.mjs --mode nav` (`probe-nav.json`): guest on /, signed in on /quizzes (test user, no live streak), then the same read with a streak of 7 / 42 / 365 / 1000 days (read stub of /api/auth/me, like shell.spec), light and dark, 1280 and 1440. Gap = left of pill n+1 minus right of pill n.

| width | guest | signed in, no streak | streak 7 | 42 | 365 | 1000 |
|---|---|---|---|---|---|---|
| 1280 | 8 8 8 8 8 | 8 8 8 8 8 | 5.5 x5 | 3.6-3.7 | 1.8 | 0 |
| 1440 | 8 8 8 8 8 | 8 8 8 8 8 | 5.5 x5 | 3.6-3.7 | 1.8 | 0 |

Same numbers in dark. Every case: 6 pills on one line (one top, y 13), nav 64px high, the right cluster on one line (one centre y 32) ending exactly at the content edge (1200 / 1280), 20px between the last pill and the right cluster, horizontal scroll 0, 0 writes. The shell.spec "nav fits" tests (guest 1440/1280/1100, signed in with 7/42/365/1000) run in the owner spec pass (section 7).

Verdict: FIXED as specified (8px, shrinking evenly to 5.5 / 3.7 / 1.8 / 0 with a 1 to 4 digit streak pill, bar on one line). Note for the owner: with a 4-digit streak the pills touch again (0px), the documented owner call in RUN-STATE 34.

## 3. Owner request 2: warm light page (A0 fix 5 #76 + S1 sweep #80)

Computed styles on the live build (`probe-ground.json`, guest, 1440, 10 pages + 390 tab bar / sheet + search overlay):
- Light: body and .ux-app rgb(250,248,245) = #FAF8F5 on all 10 pages; nav rgba(250,248,245,.86) + saturate(1.4) blur(14px) (warm glass); white rgb(255,255,255): quiz cards (.ux-qcard), text cards (.ux-tcard), quiz About box (.p4-about), blindtest mode cards (.p6-mcard), community posts (.ux-post), leaderboard panels (.ux-panel), create fields (.ux-inp), ticker bar (.p1-ticker > div = --ux-raised), share sheet (390), search overlay box; tab bar rgba(255,255,255,.86); footer and segmented / chips rgb(241,239,234) = --ux-surface (documented step).
- Dark: body #141312, nav rgba(20,19,18,.84), cards / posts / panels / sheets rgb(28,27,25), tcard transparent, fields rgb(20,19,18): the same values as before. `git diff 2e82db3 HEAD -- a0.css`: the dark token blocks only gain --ux-paper = page, --ux-card-fill = transparent, --ux-tabbar-bg = nav-bg (the values dark already used). Pixel proof: 390 dark captures pixel-identical to X2's (section 5); 1440 dark home / groups / hub-ateez / quizzes vs X2's 1440 dark: 0.31 to 1.83% = nav band + data + members rail, 0 style changes in the outline diff.
- 390 light (home, groups, hub-ateez, quizzes): warm body, 65px under the footer, no horizontal scroll.
- Fields (`probe-fields.json`, light 1440): the visible box of every text field is white: /groups filter (.p3-filter), /blindtest group search (.p6-gsearch), /create inputs, textarea, group search, select (.ux-inp), /settings inputs, textarea, select, bias field (.ux-inp).
- Token contrast (harness/aa.py, WCAG): ink, muted, pink-soft-ink, ok, no, lav-ink, the 6 flair accents and 5 rarity words are >= 4.5 on page, surface, surface-2 and white; exceptions only on --ux-surface-2 #EAE7E1, which carries avatar initials and bars, not these inks: pink-ink 4.21, warn 4.39.

NEW, NOT FIXED (A0, owner request 2 follow-up): axe color-contrast (serious) on the nav. qa-a11y.spec "QA axe, guest, light > blindtest ... group-search" fails 3/3 attempts on `a[data-nav="community"]`. Reproduced (`probe-axenav.json`): /blindtest, guest, 1440 light, after typing "nct" in Play by group the page is scrolled 427px and the pink Start button of the setup row sits under the translucent nav behind "Community": axe blends the warm glass over it to #F4DDE2, muted #6B655E on it = 4.46:1 (needs 4.5). Same state with the old white glass rgba(255,255,255,.86) forced: 0 violations; dark: 0. Scan (`navscan.log`: axe color-contrast on .ux-nav at every 60px of scroll, light, guest, 11 pages, 1440 and 1280): 2 hits per width, both 4.46:1 on #F4DDE2: /blindtest at scroll 420 (Community pill) and /blindtest/ranked at scroll 360 (Quizzes pill), each over a pink primary button; 0 on /, /bts-quiz, /blackpink-quiz, /q/<classic>, /quizzes, /leaderboard, /community, /groups, /create. The same scan with the old white glass forced: 0 hits on both pages. Fix idea: a slightly more opaque warm glass (for example .9) or a darker nav muted ink. Owner A0.

Verdict: light #FAF8F5 + warm nav glass FIXED; white cards, panels, sheets, fields, ticker, tab bar FIXED; dark unchanged FIXED; text AA: NOT FIXED in one scrolled state (above).

## 1a. X1 gaps (AUDIT-X1.md), checked on the live build

| Id | Owner / PR | Verdict | Evidence |
|---|---|---|---|
| X1-001 | P6 #67 (+ doors P3/P4/P11) | FIXED | `blindtest/[mode]/page.tsx`: `if (UX_V1) return <BlindtestModeV11/>`. Live: /blindtest/group-bts, /group-blackpink, /girl-groups, /title-tracks = 200 with the v11 game markup (p6-hero, p6-display), no legacy player. `probe-btmode.json`: Start on each sends generate {"playlist":"bts" / "blackpink" / "gg","count":10} (answered locally) and the game shows 4 answers (1440 and 390). Doors: hub hero Blindtest = `/blindtest/group-blackpink` (HTML), results row and search song rows `/blindtest/group-<slug>` (results.tsx:237, search-model.ts:171): all land on that v11 game. |
| X1-002 | P4 #78 | DEFERRED (pending migration), code FIXED | comments.tsx shows heart + count + Reply only when `/api/ux-v1/p4/comments` answers live:true; today it answers `{"live":false,...}` because `docs/pending-migrations/v11-p4-comment-likes.sql` is not applied (RUN-STATE pending migrations). x-end-comments capture: no heart, no dead control. p4.spec "results comments (guest, store live): heart + count, pink when liked, Reply opens a field" (read stub): section 7. |
| X1-003 | A0 #72 + P10 #75 | FIXED | ux-nav-actions.tsx: My quizzes -> `/me#p10-panel-quizzes` + `<small>N draft(s)</small>` from the local draft; shell.spec "account menu: My quizzes opens the passport Quizzes tab (also in place) with the draft count" (/me stubbed with the public passport): section 7. |
| X1-004 | P10 #68 | FIXED | guest `GET /me` = 200 with `<h1 id="p10-gst-h">Your K-pop passport</h1>`, "Play a quiz first", p10-guest markup; `/profile` 307 -> /me. |
| X1-005 | P3 #69 | FIXED | lib/ux-v1/p3/model.ts hubCommunityDoor: open Verse space -> `/community?compose=thread` "Start the first thread"; parked space -> the top quiz. Live: /blackpink-quiz (parked) "No posts about BLACKPINK yet. Play the top quiz and leave the first comment" -> /q/blackpink-ultimate-fan-challenge; /bts-quiz (open) has rows, so no door; p3.spec X1-005 test: section 7. |
| X1-006 | P2 #77 | FIXED | ab6fd66 merged; /quizzes serves `.p2-page` (section 6). |
| X1-007 | C3 #79 | FIXED, report stale (NEW) | REPORT.md is on feat/ux-v1-v11 (e464a46) and in PR #66 (draft, head eeb2e13, MERGEABLE). NEW: it is C3's loop 2 text: still "Quizzes (P2): PENDING", "7 PENDING (P2)", nothing on the X1/X2 fixes, the owner requests, tablet chrome, toast, save bar. RUN-STATE NEXT ACTION asks C3 to refresh it: not done. Owner C3 / ORCH. |
| X1-008 | X2 extension | FIXED | AUDIT-X2.md "Extension": 33 extra prototype states compared; V re-ran the 17 touched by fixes (section 1b). |
| X1-009 | ORCH / owner | DEFERRED: owner decision | parity.spec loads /profile signed in (writes on view): decisions 1 and 4. Not run by V (CHECKERS). |
| X1-010 | ORCH | FIXED as named; NEW leftovers | the X2 worktree (agent-a9bd5520faca1c0ac) and its session file are gone. NEW: three other test-user session files remain (not read): `.claude/worktrees/agent-a8e3dc8641daf2ff9` (ux11/p5-fix2, Sep 27 18:15), `agent-a52d8c4dc12a29667` (ux11/a0-fix5, Sep 27 20:10), `agent-afff962e26376fdcd` (ux11/s1-warm-sweep, Sep 28 00:04), each `apps/quiz/e2e/.auth/test-user.json`. DoD "test-user storage state deleted" not met. Owner ORCH. |

## 1b. X2 gaps (AUDIT-X2.md), checked on the live build

Extra states re-captured with X2's drivers (`results-x.jsonl`, `shots/x-*/<combo>-impl-x.*`), 1440 light + 390 dark, compared with X2's reference PNG (`ref-extra`) and X2's own capture; crops in `crops/`.

| Id | Owner / PR | Verdict | Evidence |
|---|---|---|---|
| X2-001 | A0 #72 | FIXED | space under the phone footer = 65px (64 + rounding) on every full page at 390 dark (38 states) and 390 light (home, groups, hub-ateez, quizzes); X2 measured 136. Pages 71px shorter than X2's captures. |
| X2-002 | P1 #74 | FIXED | `crops/home-1440-light-railedge.png`: the 1px label sliver right of NewJeans is gone. |
| X2-003 | P3 | DEFERRED: owner decision (SEO-locked copy) | live /groups intro still "45 groups, A to Z" while the list and filter show 91 (RUN-STATE 20 / 21). Unchanged, as expected. |
| X2-004 | P3 #69 | FIXED | `crops/hub-ateez-1440-light-members.png`: the members are one scrolling rail (80px faces), no "Jongho" orphan line; same on BLACKPINK. |
| X2-005 | P6 #71 | FIXED | `crops/x-btend-free-1440-light-kicker.png` kicker "All K-pop" (= reference); `crops/x-btend-challenge-1440-light-kicker.png` "Challenge from blink_edits" (= reference). |
| X2-006 | P6 #71 | FIXED | `crops/x-share-bt-390-dark-sheet.png`: title "Share your blindtest", 4 tiles (Copy link, Story image, More apps, Discord), mini line "1,740 points · best combo x3", Challenge link block ("They play your exact songs · 48 hours", link + Copy, footnote). Same at 1440. |
| X2-007 | P1 #74 | FIXED | `crops/x-home-daily-played-1440-light-kicker.png`: no pulse dot before "Blindtest of the day · played". |
| X2-008 | A0 #72 (+ P4, P8, P10) | FIXED | 4 tiles incl. Story image on "Share this quiz", "Challenge a friend", "Share this post", "Share testtest's passport", 1440 and 390 (outlines of x-share-quiz / -challenge / -post / -passport). |
| X2-009 | P5 #70 | FIXED | `crops/x-create-done-390-dark-done.png`: h2 "It's live" + "The first plays decide if it trends this week. Share it with your fandom."; phone buttons full width stacked (Open your quiz 350x48 at y 608, Post a challenge 350x48 at y 668). |
| X2-010 | P11 #73 | FIXED | `crops/x-notifs-social-1440-light-head.png`: Social filter shows "1 unread" (X2 saw "4 unread"; reference "1 unread"). |
| X2-011 | A0 #72 + P2 | FIXED | /quizzes?type=tf: the Type trigger is 92px wide (the label only; X2 measured 174 for "Type: True/false"); the value stays in its accessible name and in the chip. Same on ?group=bts&type=intruder at 390. |

## 4. Tablet, phone chrome up to 900, toast and save bar (A0 #81, #82; P10 #83)

- No horizontal scroll (`probe-tablet.json`, `tablet.log`): 19 pages (/, /quizzes, /groups, /bts-quiz, /blackpink-quiz, /chungha-quiz, /q/<classic>, /blindtest, /blindtest/ranked, /blindtest/group-bts, /community, /community/blog/2, /leaderboard, /create, /u/testtest, /search, + /me guest, + /notifications and /settings signed in) x widths 768, 800, 820, 900, 901, 1024, 1100 x guest and signed in x mouse and touch = 70 page runs, 490 width checks: scrollWidth - clientWidth = 0 everywhere. 0 writes.
- Phone chrome: at 768 to 900 the tab bar shows and the top-bar links are hidden on every page; at 901, 1024, 1100 the links show and the tab bar is hidden. Only /create hides the tab bar at 768-900, which is create mode (tab bar + footer hidden while creating, prototype and X1 1.1), not a gap.
- shell.spec (ux-1440 pass, section 7): "no horizontal scroll from 761 to 1279px, 1px steps", guest and signed in (no streak and a 4-digit streak), light and dark: pass; "tablet (800px) phone chrome ... toasts above the tab bar; none of it from 901px": pass; "legacy toast stack: above the tab bar up to 900px, 24px up from 901px and in create mode": pass.
- v11 toast (`probe-toast.json`, a real "Link copied" from the quiz share sheet): at 390, 768, 820, 900 the toast ends at y 760, the tab bar starts at 779 (19px above it); at 901 and 1280 no tab bar, toast 32px from the bottom. Legacy toast stack `[data-toast-stack]` bottom: 84px up to 900, 24px from 901.
- Settings save bar (`probe-savebar.json`, signed in, Bio edited, nothing saved): at 390, 768, 800, 820, 900 the bar ends at y 768, tab bar top 779 (11px above), the Save button is the top element at its centre; at 901 and 1280 no tab bar, bar 16px from the bottom.

Verdict: FIXED (no sideways scroll at any tested width, guest and signed in; phone chrome up to 900; toast and save bar above the tab bar).

## 6. /quizzes (P2, merged #77) in the 4 combos

Signed in, `/quizzes`, captures `shots/quizzes/{1440-light,390-dark}-impl.*` and `{1440-dark,390-light}-impl-c.*`; landmarks from the outline vs the prototype outline X2 recorded (`audit-x2/proto/<combo>.json`):

| landmark | prototype 1440 | impl 1440 light / dark | prototype 390 | impl 390 dark / light |
|---|---|---|---|---|
| Type / Level / Group | x 978 / 1078 / 1180, 92 / 94 / 100 x 44, y 228 | same x, same boxes, y 276 | x 20 / 120 / 222, same boxes, y 337 | same, y 405 |
| first card title | x 177 / 463 / 749 / 1035, 228 x 43, y 554 | same, y 603 | x 141, 218 x 43, y 462, row pitch 129 | same, y 531, pitch 129 |
| Create a quiz (phone) | - | - | 159 x 40, y 205 | 159 x 40, y 273 |
| Load more quizzes | 196 x 48 at x 622 | 196 x 48 at x 622 | 196 x 48 at x 97 | 196 x 48 at x 97 |

Offset: +48 to +49px at 1440 and +68 to +69px at 390 = owner decisions A (live breadcrumb) and B (live 2-line intro), RUN-STATE 32 (+48.7 / +68.7). H1 "K-pop quizzes" (SEO lock), default sort Most played, 48 cards, browse links + FAQ below: RUN-STATE 19 / 32, as X2 recorded. Dark and light at the same positions; body #FAF8F5 (light) / #141312 (dark); 65px under the phone footer; no horizontal scroll; 0 writes. vs X2's own re-check capture (63d8ef4): only card order (data). Filters: x-quizzes-chips / x-quizzes-empty (section 1b, X2-011) render the chip row, the empty state and Clear filters. p2.spec at 1440: section 7.

Verdict: matches the prototype within the documented P2 decisions in all 4 combos. Nothing new.

## 7. Nothing else broke: every owner spec on the final build

`npx playwright test --project=ux-1440` (all of e2e/ux-v1 except parity.spec, which the config ignores; signed in through the setup project; write guard in every spec), against :3021, 12.5 min: 452 passed, 16 failed, 5 skipped (by design), 0 flaky (`specs-1440.json`, `specs-1440.log`). The 16 failures:
- 14 x qa-a11y "QA axe, guest, light/dark" on legacy pages rendered inside the shell: /blackpink-trivia, /pt, /pt/blindtest, /pt/leaderboard, /articles, /articles/best-kpop-quiz-sites-2026, /stats. Known and documented (REPORT.md owner note: legacy contrast failures, present flag off too, nobody owns these pages in this run). The previous members of that list, /blindtest/<mode> and /quizzes, now pass (X1-001, P2).
- 1 x qa-a11y "blindtest: playlist-open, group-search, ..." light: the nav contrast regression of section 3 (NEW, A0).
- 1 x kit.spec "quiz cards: body line heights and card heights as the prototype" 3/3: the kit grid row has three one-line titles next to a two-line title today, so the grid stretches them to 329.78 (the two-line height) while the test expects 308.18 per one-line card (`probe-kitcards.json`). The prototype grid stretches rows the same way (`.qgrid{display:grid}`, default align stretch) and the home grid measures 308.19 per one-line row: a data-dependent test, not a product change. Owner A0 (test only).
Everything tied to this run's fixes passed at 1440: shell.spec nav fits (guest 1440/1280/1100 with 8px; signed in with 7/42/365/1000), the 761-1279 sweeps (guest, signed in, 4-digit streak, both themes), tablet 800 phone chrome + toasts, legacy toast stack, room under the footer (64 phone, 0 desktop, 72 Verse), nav islands, account menu My quizzes (X1-003); kit warm ground test (owner request 2, light and dark); p1 (X2-002/007), p3 (X1-005, X2-004), p4 (X1-002 with the store stub), p5 (X2-009), p6 (X1-001 mode pages, X2-005/006), p10 (X1-004, save bar), p11 (X2-010), p2 (/quizzes), p7, p8, p9, qa-keyboard.

`--project=ux-390` (390 x 844 touch phone), 11.7 min: 442 passed, 15 failed, 1 flaky, 15 skipped (the desktop-only nav / account-menu tests and the flag-off cases, by design) (`specs-390.json`, `specs-390.log`). Failed: the same 14 legacy-page axe cases + the same kit card-height test. Flaky: kit.spec "a late island hydrates without a mismatch (signed in)" (auth probe still "out" at 15 s on the first try, passed on retry 1; timing under load, not a mismatch). The blindtest axe case passes at 390 (no desktop nav). The touch sweeps 761-1279 (guest, signed in, 4-digit streak, both themes), the tablet / toast / legacy-toast / footer-room tests, the guest You tab (X1-004) and every page spec pass.

Flag off (not rebuilt by V): the only non-v11 source files changed since C3's flag-off / SEO pass (e54b847) are 6: blindtest/[mode]/page.tsx (`if (UX_V1)` early return), me/page.tsx (guest branch only `if (UX_V1)`, else the same redirect), quizzes/page.tsx (flag-on branch behind the inlined env test, `level` facet behind UX_V1, FAQ moved to faq.tsx with the same four questions and answers word for word), toast-provider.tsx (`data-toast-stack` only when UX_V1, else the same HTML), design-tokens.ts (UX_TOKENS_LIGHT, used only by a0.test.ts), quizzes/faq.tsx (new, same text). Flag-off output unchanged by construction.

Unit: `vitest run` in V's worktree (eeb2e13 = 2a6cbef code): 917 / 917 passed.

## 8. Summary

Gaps (21): FIXED 18 (X1-001, 003, 004, 005, 006, 007, 008, 010; X2-001, 002, 004, 005, 006, 007, 008, 009, 010, 011), NOT FIXED 0, DEFERRED 3 (X1-002 pending migration v11-p4-comment-likes.sql, code done; X1-009 owner decisions 1/4; X2-003 owner decision, SEO-locked copy).
Owner requests and follow-ups (6): FIXED 5 (nav spacing; warm ground + white surfaces + dark unchanged; tablet chrome to 900 with no sideways scroll; legacy toast above the tab bar; save bar above the tab bar), NOT FIXED 1 part: text AA of the warm nav glass (owner A0).
38 states x (1440 light, 390 dark) and /quizzes x 4 combos: nothing beyond data, merged fixes and documented owner deviations.
Owner specs: 1440 452 pass / 16 fail; 390 442 pass / 15 fail / 1 flaky; every failure is a documented legacy-page contrast case, the data-dependent kit card-height test, or the nav AA regression.

NEW findings:
1. A0: warm nav glass fails axe AA (4.46:1, muted pill over a pink button under the glass) on /blindtest (scroll ~420) and /blindtest/ranked (scroll ~360), 1280 and 1440 light; qa-a11y blindtest case fails 3/3. White glass passes.
2. C3 / ORCH: REPORT.md on the PR branch is stale (P2 PENDING, loop 2 numbers, none of the X1/X2/owner fixes).
3. ORCH: 3 test-user session files left in agent worktrees (p5-fix2, a0-fix5, s1-warm-sweep).
4. A0 (test only): kit.spec card-height test fails on today's data (grid row stretch, same as the prototype).
