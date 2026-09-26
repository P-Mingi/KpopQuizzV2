# UX v11.2 run report (C3, Phase 3)

## Progress

- Status: FINAL. Every checker issue is closed: C1-001..002, C2-001..008, C3-001..009. C3 checked loop 2 on
  `feat/ux-v1-v11` cc6c394; P4's C2-008 fix (e54b847) was re-checked by C2 in loop 3 (5bcd84e, merged at bb9b5a5);
  this report sits on top of the integration head ce46e6f. C1's pixel loop 2 (cd46f34) and C2's wiring loop 3 are
  included.
- Open items (none is a checker issue):
  1. `/quizzes` (P2): pending the owner's push of `ux11/p2-quizzes`.
  2. P7 populated ranked states, and every NOT verified row: waiting for their migrations (list below) or owner
     decision 1 (production writes as the test user).
  3. Lighthouse scores (perf >= 85, SEO 100, a11y >= 95): pending the owner's OK to install and run Lighthouse.
- Branch `ux11/c3-check`, local only: the session permission check refused the push; the owner decides how it
  is published. Worktree `.claude/worktrees/agent-a0c9933401ee9710b`.
- Servers: the shared flag-on production build on http://localhost:3021 (loop 1: dcc3159, loop 2: cc6c394);
  flag off: a production build of the same head in the C3 worktree (`next start` :4203); live:
  https://kpopquiz.org (= main). No production write was sent: every mutating request was answered locally.

## At a glance (loop 2, cc6c394)

| Check | Result | Evidence |
|---|---|---|
| e2e, every owner spec `e2e/ux-v1/*.spec.ts` except parity (563 tests: ux-1440 + ux-390, light + dark, guest + signed in) | **555 passed, 0 failed, 0 flaky, 8 skipped by design** (3 "desktop widths", 1 "desktop nav", 1 "phone only" in shell; 1 "phone only" in p4; 2 "VERSE_PUBLIC=true on this server" in p8). Loop 1: 542 passed, 1 flaky (C3-004) | `checks/qa/e2e-loop2.md`, loop 1 `e2e-run3.md` |
| C3 QA specs (`qa-a11y.spec.ts`, `qa-keyboard.spec.ts`), same projects | 183 passed; 37 failed, all expected: 36 = axe color-contrast on legacy content inside the shell (existing, flag off has more), 1 = keyboard on the pre-P2 /quizzes (pending P2) | `checks/qa/e2e-loop2.md` |
| axe, whole document, every v11 state x 1440 / 390 x light / dark, guest and signed in (read only) | **0 serious or critical on 190 of 190 v11 runs** (loop 1 and loop 2) | `checks/qa/QA-A11Y-loop2.md` |
| Keyboard walk (Tab until focus cycles), 14 v11 pages at 1440 and 390 | every visible control reached; every Tab stop shows a focus indicator (loop 1 gap C3-007 fixed); focus never lost to <body>; dropdowns and comboboxes open by keyboard and close with Escape, focus back | `checks/qa/QA-A11Y-loop2.md` |
| Sheets and popovers (sign-in, search, share, quit confirm, editor, header picture, playlist, bell, account) | 17 of 17 checks clean: role, name, aria-modal, focus in, Tab trapped, X / Escape / backdrop close, focus returns | `checks/qa/QA-A11Y-loop2.md` |
| Game semantics | quiz: named timer ("15 seconds left"), question H1 focused, answers in a named group, live region ("Not quite. The answer is 2016. 0 of 1 so far.", then "Quiz finished. 0 out of 8."); blindtest: "Correct, plus 200 points. God's Menu by Stray Kids.", then "Blindtest finished. 3 out of 10, 600 points."; one H1 on each results screen | `checks/qa/QA-A11Y-loop2.md` |
| SEO, flag on vs flag off vs live, server HTML without JS (loop 1: 34 URLs; loop 2: /, /pt, /groups, 3 hubs, /create, /blindtest) | title, description, robots, canonical, hreflang, og, H1 identical; JSON-LD identical except live counters (plays); robots.txt identical; sitemap 2998 URLs on and off, no new page in it; new pages noindex and 301 / 404 with the flag off. Link set: every flag-off link kept except (a) the live home's two 404 links /quizzes/new and /quizzes/most-liked (replaced by /new and /most-liked) and (b) links to PARKED Verse spaces (/verse/blackpink, /verse/seventeen, /verse/stray-kids on the home, /verse/blackpink and /verse/ateez on those hubs), which 404 locally and 302 to /verse on kpopquiz.org (dropped by the C2-005 / C2-006 fixes: owner to confirm) | `checks/qa/seo-loop2/SUMMARY.md`, `checks/qa/seo/SUMMARY.md` |
| Cached failed reads | P1 home and P3 pages now refuse to cache a render that lost a read (unit-tested; the cc6c394 prerenders are complete); P6 count read throws; runtime failure path not fault-injected (needs a failing production read) | `checks/qa/ISSUES-STATUS.md` |
| Performance (390, DPR 3, 4x CPU, slow 4G; Playwright, not Lighthouse) | LCP flag on / off: home 2.42 / 3.28 s, BLACKPINK hub 3.01 / 3.31 s (loop 1: quiz 2.34 / 2.42 s, /blindtest 2.22 / 2.05 s); CLS at most 0.054 (home; today's home 0.05 to 0.07); home images 495 KB (loop 1: 908; flag off 182, it shows no photos); every photo from public/idols right-sized. Lighthouse scores PENDING the owner's OK | `checks/qa/perf/SUMMARY-loop2.md`, `SUMMARY.md` |
| Whole-app tsc (e2e specs included, with the C3 QA specs) | 0 errors (loop 1 and loop 2) | this run |
| Pixel (C1, loop 2) | 152 checks: 136 pass, 0 fail, 16 not verified (P2 pending, ranked and post-challenge need their migrations) | `checks/pixel/README.md` |
| Wiring (C2, loop 3) | 267 rows: 196 PASS, 0 FAIL, 33 NOT VERIFIED (production writes, migrations), 7 PENDING (P2), 31 N/A; C2-008 fixed (R119 PASS) | `checks/backend/README.md` |

## Per page

Status: DONE = every check passes or is NOT verified for a stated reason; OPEN = an open issue; PENDING =
not merged. Pixel = C1 (`v11/checks/pixel/<state>/`, "pass n/m" = landmarks within 2px and computed
styles equal). Wiring = C2 (`v11/checks/backend/`, WIRING-MAP rows). e2e = C3 loop 2 run, per project.
Thumbnails: C1's reference | implementation side by side (1440 light), under `v11/checks/pixel/`.

### Shell, nav, tab bar, footer, sheets, tokens (A0): DONE

![shell](checks/pixel/home-guest/1440-light-side.webp)

- Pixel: shell landmarks pass in every state; focus ring and hover extras pass; C1-002 (header sheet drop zone
  in its hover look) FIXED in loop 2.
- Wiring: 29 PASS, 2 N/A; C2-001 (/api/quizzes/count 200 with the flag off) FIXED: 37 of 37 new endpoints 404
  with the flag off.
- e2e: kit.spec 22/22 and shell.spec 15 + 1 skip (1440), 12 + 4 skips (390); skips are width-specific cases.
- a11y: sign-in sheet, search overlay, account menu, bell: axe 0, every sheet check passes.
- SEO: the shell adds about 15 links per page (nav, tab bar, footer), removes none (/search is back).
- Owner note: legacy pages rendered inside the shell keep their existing contrast failures (see Owner notes).

### Home (P1): DONE

![home](checks/pixel/home/1440-light-side.webp) ![home guest](checks/pixel/home-guest/1440-light-side.webp)

- Pixel: home 17/17 and home-guest 19/19 at 1440 and 390, light and dark (loop 2 re-run).
- Wiring: 16 PASS, 1 N/A; C2-002 (streak line wording), C2-004 (Continue hid listed quizzes), C2-005 (links to
  parked Verse spaces) FIXED.
- e2e: p1.spec 18/18 at both widths.
- a11y: axe 0 guest and signed in, 4 combos each; keyboard: 103 controls reached at 1440, 101 at 390.
- SEO: fields identical; 76 links on / 70 off / 64 live; lost only the live 404s /quizzes/new, /quizzes/most-liked
  and 3 parked Verse space links (dead doors, C2-005 fix).
- Perf (slow 4G): LCP 2.42 s (off 3.28 s), CLS 0.054, JS 366 KB (off 320), images 495 KB (loop 1: 908).
- C3 issues: C3-003 (page cache kept a failed read), C3-006 (Verse sentence), C3-008 (photo size): FIXED.

### Quizzes (P2): PENDING

![quizzes](checks/pixel/quizzes/1440-light-side.webp)

- P2's branch `ux11/p2-quizzes` is not merged (its push was refused; waits for the owner). The server shows the
  pre-P2 page inside the shell: pixel not verified (C1), 7 rows PENDING (C2).
- On the pre-P2 page: SEO identical to flag off (0 links lost on /quizzes, ?page=2, ?group=bts); legacy contrast
  failures (existing); its "All groups" dropdown does not return focus after Escape (legacy markup; re-check on P2).

### Groups and group hubs (P3): DONE

![groups](checks/pixel/groups/1440-light-side.webp) ![hub](checks/pixel/hub-blackpink/1440-light-side.webp)

- Pixel: /groups 11/11 (C1-001 group tile FIXED), hubs BLACKPINK and ATEEZ 14/14, empty hub 8/8.
- Wiring: 18 PASS, 1 NOT VERIFIED (Notify me: migration pending), 1 N/A; C2-006 (Verse link to parked spaces)
  and C2-007 (empty-state door) FIXED.
- e2e: p3.spec 19/19 at both widths.
- a11y: axe 0 on /groups, three hubs, signed-in hub; keyboard: 173 controls on /groups, 101 on BLACKPINK, all
  reached; hub dropdowns open by keyboard and close with Escape, focus back.
- SEO: fields identical on /groups, 3 hubs, /bts-trivia; every quiz of a hub is now a visible link in the server
  HTML (BLACKPINK 27 visible quiz links vs 18 flag off, no <noscript> list); the only link dropped is the parked
  Verse space (/verse/blackpink, /verse/ateez; dead doors, C2-006 fix).
- Perf (slow 4G, BLACKPINK): LCP 3.01 s (off 3.31 s), images 82 KB (off 713), photos right-sized.
- C3 issues: C3-001 (hub links only in <noscript>), C3-002 (/groups cached a failed read): FIXED.

### Quiz page, game, results, share (P4): DONE

![quiz](checks/pixel/quiz/1440-light-side.webp) ![end](checks/pixel/end-guest/1440-light-side.webp)

- Pixel: quiz, play, play-answered, play-qotd, end, end-guest, share pass, 4 combos each (the live Discord line
  + Brag row under the result actions is recorded as a known deviation, C2-003).
- Wiring (C2 loop 3): 49 PASS, 4 NOT VERIFIED (production writes, the two P4 migrations), 6 N/A. C2-003 (Discord
  line / Brag) FIXED; C2-008 (signed-in results crash when the standing has no rank) FIXED in e54b847 and
  re-checked by C2 (R119 PASS, results and share sheet stay up).
- e2e: p4.spec 22 + 1 skip by design (1440), 23/23 (390); the like test is no longer flaky.
- a11y: axe 0 on quiz (3 types), play, play-answered, play-qotd, end-guest, share, signed-in quiz page; quit
  confirm and share sheet pass every sheet check; live region verified.
- SEO: fields and JSON-LD (BreadcrumbList, Quiz) identical on 3 quiz types, 0 links lost (loop 1).
- Perf (loop 1, slow 4G): LCP 2.34 s (off 2.42 s), JS 402 KB (off 322).
- C3 issues: C3-004 (like count race): FIXED.

### Create (P5): DONE

![create](checks/pixel/create-1/1440-light-side.webp)

- Pixel: create-1, create-2, create-3, signin pass, 4 combos each (loop 2 re-run).
- Wiring: 19 PASS, 4 NOT VERIFIED (publish is a production write), 2 N/A.
- e2e: p5.spec 22/22 at both widths.
- a11y: axe 0 on the three steps, the sign-in sheet and create-1 signed in; the group combobox opens with
  ArrowDown and closes with Escape.
- SEO: noindex, follow as today; fields identical; 0 lost text or links (loop 2).
- C3 issues: C3-005 (cover helper sentence): FIXED.

### Blindtest (P6): DONE

![blindtest](checks/pixel/blindtest/1440-light-side.webp) ![btplay](checks/pixel/btplay/1440-light-side.webp)

- Pixel: blindtest, playlist open, group search, btplay, btplay-answered pass, 4 combos each (loop 2 re-run).
- Wiring: 21 PASS, 3 NOT VERIFIED, 13 N/A.
- e2e: p6.spec 29/29 at both widths.
- a11y: axe 0 on the hub, playlist menu, group search, game, answered, results; keyboard: 117 controls reached;
  live region verified.
- SEO: /blindtest fields, FAQ and JSON-LD identical, 137 links (off 121), 0 lost; the mode pages and
  /pt/blindtest unchanged inside the shell.
- Perf (loop 1, slow 4G): LCP 2.22 s (off 2.05 s), JS 275 KB (off 290).
- C3 issues: C3-009 (today count cached a failed read): FIXED in code.

### Ranked (P7): DONE for the not-live state; populated states NOT verified

![ranked](checks/pixel/ranked/1440-light-side.webp)

- Pixel and wiring: NOT verified until `v11-p7-ranked.sql` is applied (15 rows); the not-live state is checked.
- e2e: p7.spec 17/17 at both widths (the API answers 503 not_live before any write).
- a11y: axe 0 on /blindtest/ranked, 4 combos; keyboard: 56 controls reached.
- SEO: new URL, 200 noindex, follow with the flag on, 404 flag off and live, not in the sitemap.

### Community (P8): DONE

![community](checks/pixel/community/1440-light-side.webp) ![post](checks/pixel/post-blog/1440-light-side.webp)

- Pixel: community, post-blog, post-debate, editor pass; post-challenge NOT verified (no challenge post can exist
  until `v11-p8-community.sql`).
- Wiring: 17 PASS, 1 NOT VERIFIED, 3 N/A.
- e2e: p8.spec 31 + 1 skip at each width (the VERSE_PUBLIC=false case; this server runs with it on; P8 ran both).
- a11y: axe 0 on the feed (guest, signed in), 3 post types, the editor; keyboard: every Tab stop shows its ring.
- SEO: new URLs, 200 noindex with the flag on, 301 to / with the flag off and live, not in the sitemap.
- C3 issues: C3-007 (feed panel without focus ring): FIXED.

### Leaderboard (P9): DONE

![leaderboard](checks/pixel/leaderboard/1440-light-side.webp)

- Pixel: 8/8, 4 combos. Wiring: 5 PASS, 2 N/A. e2e: p9.spec 20/20 at both widths.
- a11y: axe 0 guest and signed in; keyboard: 107 controls reached.
- SEO (loop 1): fields identical; 98 links on vs 78 off, 0 lost. /pt/leaderboard unchanged.

### Passport and settings (P10): DONE

![passport](checks/pixel/passport/1440-light-side.webp)

- Pixel: passport, passport-badges, settings, header-sheet pass (header sheet fixed through A0, C1-002).
- Wiring: 12 PASS, 4 NOT VERIFIED (header storage and email switches: migrations; signed-in /me: owner decision 1).
- e2e: p10.spec 42/42 at both widths.
- a11y: axe 0 on /u/testtest (guest and its owner), /settings, header sheet; header sheet passes every sheet
  check. Signed-in /me NOT verified (it writes on view).
- SEO (loop 1): /u/testtest fields identical (noindex, follow), 0 links lost.

### Notifications, search, bell (P11): DONE

![notifications](checks/pixel/notifications/1440-light-side.webp)

- Pixel: notifications, search, bell pass, 4 combos. Wiring: 8 PASS, 1 NOT VERIFIED. e2e: p11.spec 21/21.
- a11y: axe 0 on /notifications and the bell (signed in), the search overlay and /search (guest).
- SEO (loop 1): /search fields identical, 0 links lost.

## Issues

Full lines (expected, actual, evidence) in `v11/issues/<owner>.md`; loop 2 status lines are appended there.

| Id | Owner | Summary | Loop 2 |
|---|---|---|---|
| C2-008 | P4 | signed-in results crash when the standing has no rank (run not stored yet) | fixed (C2 loop 3) |
| C1-001 | P3 | /groups group tile count line | fixed |
| C1-002 | A0 | header sheet drop zone opened in its hover look | fixed |
| C2-001 | A0 | /api/quizzes/count answered 200 with the flag off | fixed |
| C2-002 | P1 | signed-in home streak line wording | fixed |
| C2-003 | P4 | results Discord line / Brag missing | fixed |
| C2-004 | P1 | Continue playing hid quizzes listed on the home | fixed |
| C2-005 | P1 | home linked parked Verse spaces | fixed |
| C2-006 | P3 | hubs linked parked Verse spaces | fixed |
| C2-007 | P3 | empty hub offered a dead door | fixed |
| C3-001 | P3 | hub quizzes 7+ only inside <noscript> | fixed |
| C3-002 | P3 | /groups served "0 groups" from a failed build read | fixed in code (not fault-injected) |
| C3-003 | P1 | home page cache kept a render that lost reads | fixed in code (not fault-injected) |
| C3-004 | P4 | Like count reverted when the first read answered late | fixed |
| C3-005 | P5 | /create cover helper sentence missing | fixed |
| C3-006 | P1 | home Verse strip sentence missing (VERSE_PUBLIC on) | fixed |
| C3-007 | P8 | community feed panel focus ring removed | fixed |
| C3-008 | P1 | home rail photos served at 640 px on DPR 3 phones | fixed |
| C3-009 | P6 | today-players count cached a failed read as 0 | fixed in code |

## Owner notes from C3 (no owning agent)

- Link set: the v11 home and hubs no longer link parked Verse spaces (/verse/blackpink, /verse/seventeen,
  /verse/stray-kids, /verse/ateez): these 404 on both local builds and 302 to /verse on kpopquiz.org, so the flag-off
  pages link dead doors. Dropped on purpose by the C2-005 / C2-006 fixes; the link-set rule counts them as lost
  internal links: owner to confirm. /verse and /verse/bts stay.
- Legacy content rendered inside the v11 shell keeps its existing serious color-contrast failures (the flag-off
  pages have more): /pt/leaderboard (the "Ranking" label and the #4+ rank numbers, #9E998F on white, 2.8:1),
  /pt, /pt/blindtest, /articles and articles, /stats, the -trivia pages, the /blindtest/<mode> pages, and /quizzes
  until P2 lands. Nobody owns these pages in this run (`checks/qa/evidence/a11y-legacy-pages-on-vs-off.txt`).
- ISR pages outside v11 keep a failed read for their whole window, flag on and flag off alike: seen on the
  dcc3159 build for /most-liked ("No quizzes yet.", 0 quiz links), /data/pulse (empty hasPart, both month links
  missing), /pt (no daily block) and /leaderboard (16 links) until they regenerated. Same class as P2's
  popular.ts note; the P1 / P3 pattern (throw at runtime, short revalidate at build) could be applied there.
- next.config `images.imageSizes` stops at 220 and `deviceSizes` starts at 640: a `fill` image with a small
  `sizes` jumps to 640 px on DPR 3 phones (the v11 case, C3-008, is fixed with fixed-size images).
- The v11 stylesheet route (`/api/ux-v1/a0/styles`, force-static, 160 KB raw, 28 KB gzip) is not compressed by a
  local `next start`; Vercel compresses it. With it compressed, no v11 page measured is slower than today except
  /blindtest (+0.17 s LCP on slow 4G). To confirm on the first Vercel preview (content-encoding of that route).
- The shared checker server runs with VERSE_PUBLIC on; production has it off. C3 checked the Verse-dependent rows
  in the "on" mode only (P8's own e2e covers both modes).

## NOT verified, and why

- Lighthouse (perf >= 85, SEO 100, a11y >= 95): not installed; adding it is a new dependency. PENDING the owner's
  OK. Playwright measurements stand in (`checks/qa/perf/`).
- Anything that writes production data (finishing a quiz or a blindtest for real, liking, commenting, voting,
  posting, saving settings, header upload): owner decision 1. Every such request was answered locally
  (guardWrites) and its payload checked (e2e, C2).
- Signed-in /me and /profile (they write on view): owner decision 1. Passport checked through /u/testtest.
- The runtime failure path of the P1 / P3 / P6 read fixes (throw so the last good ISR page stays): needs a failing
  read on a production server; unit-proven by the owners, not fault-injected by C2 or C3.
- Populated ranked states (ranked board, btend-ranked): until `v11-p7-ranked.sql` is applied.
- post-challenge, fan debates, hearts on posts: until `v11-p8-community.sql` is applied.
- Notify me (empty hub), header storage, email switches, relaxed runs, guest rank line: until their migrations.
- /quizzes (P2): pending the owner (branch not published).
- Vercel previews: behind Vercel SSO with no bypass secret; everything was checked on local production builds.
- Screen readers were not run; their semantics were checked in the DOM (roles, names, live region text).

## Pending migrations (copied from v11/RUN-STATE.md)


- `docs/pending-migrations/v11-p4-relaxed-runs.sql` (P4): plays.relaxed (play without a timer), excluded from the hall of fame and quiz_time_stats.
- `docs/pending-migrations/v11-p4-rank-for-score.sql` (P4): get_quiz_rank_for_score (guest rank line on results).
- `docs/pending-migrations/v11-p10-header-storage.sql` (P10): the profile-headers storage bucket + policies; both header routes answer 503 before any write until it exists.
- `docs/pending-migrations/v11-p10-email-prefs.sql` (P10): email notification switches (disabled in the UI until applied).
- `docs/pending-migrations/v11-p3-group-quiz-alerts.sql` (P3): group quiz alerts table + RLS + publish trigger (the empty hub's Notify me fails soft until applied).
- `docs/pending-migrations/v11-p8-community.sql` (P8): community_likes, community_debates + community_debate_votes, community_challenges, community_replies (fan debates, challenge posts and hearts stay off until applied; they turn on without a deploy).
- `docs/pending-migrations/v11-p7-ranked.sql` (P7): ranked_seasons, ranked_runs (run tokens), ranked_song_stats, ranked_legends; ranked_plays.season + run_token (unique) + index (player_id, season, score desc); 7 service_role-only functions; RLS on, no policy; commented rollback; nightly cron documented, not enabled.


## Owner decisions needed (copied from v11/RUN-STATE.md)

SECURITY, LIVE SITE (found by C2, confirmed by ORCH in code): /auth/callback redirects to returnTo without checking it stays on the site (`NextResponse.redirect(new URL(returnTo, request.url))`): an open redirect after sign-in. Auth is out of this run's scope; handed to the owner as a separate task chip.

FAKE DATA, LIVE SITE (found by P9, confirmed by ORCH): /pt/leaderboard pads the weekly board with made-up accounts from lib/weekly-leaderboard-padding.ts (FAKE_USERS). Handed to the owner as a separate task chip.

DAILY DEBATE ROTATION (P8 + P9): the only caller of ensure_daily_debate is the legacy CommunityContent on /leaderboard (a write on view); no cron calls it. With the flag on, /leaderboard no longer mounts it and /verse/community 302s guests while the Verse is hidden, so the daily debate stops rotating. No write path was added. Owner call before turning the flag on (for example a Vercel cron).

WAITING ON THE OWNER NOW (2 branches the permission check would not let agents push): C3's branch `ux11/c3-check` (4f3ef6c and later, worktree .claude/worktrees/agent-a0c9933401ee9710b; QA specs, SEO diff, REPORT.md) and P2's branch `ux11/p2-quizzes` (9 commits, adea732, local only, worktree .claude/worktrees/agent-a2b9cc4c27e8fa88a) could not be pushed: the permission check refused the agent's push. Either the owner pushes it (`git push -u origin ux11/p2-quizzes`, then a PR into feat/ux-v1-v11) or tells ORCH to push it.

SECURITY, LIVE SITE (found by P2, confirmed by ORCH in code): /quizzes puts user-written quiz titles into an ld+json script tag with a bare JSON.stringify (titles only length-checked), so a title containing </script> could break out: likely stored XSS. The Verse code already has the escaping sink jsonLdScript (lib/verse/jsonld.tsx). Handed to the owner as a separate task chip (fix on main).

BROKEN LINKS, LIVE SITE (found by P1, confirmed by ORCH): the live home links /quizzes/new and /quizzes/most-liked, both 404; /new and /most-liked are the real pages (the v11 home links those).

BUG IN PRODUCTION TODAY (found by P6, confirmed by ORCH in code): every /blindtest/<mode> page (97) fails on Play. The legacy BlindTestPlayer (components/blind-test/blind-test-player.tsx, YouTube) reads `data.songs[0]`, but /api/blind-test/generate was rewritten for Deezer and returns `questions`. Flag-off code, outside this run; flagged to the owner as a separate task.

1. Production writes as the test user. The local dev server and the preview both use the production Supabase, so every signed-in or guest action that saves something (play a quiz, like, comment, vote, save Your look, upload a header) writes production rows. The worker prompt lets agents act as the test user; the launch prompt says never write production data. Until the owner answers: no mutating request at all, e2e stubs POST/PUT/PATCH/DELETE and asserts the payload, C2 proves wiring by request shape plus read-only SQL. Asked 2026-09-25.
2. Ranked go-live (P7): apply v11-p7-ranked.sql, insert the season 1 row, enable the nightly Legend cron, decide whether ranked runs award blindtest XP (default no).
3. Security, existing (found by P7): the ranked_plays insert policy from migration 059 is open to the public, so anyone can insert forged rows today. Tightening it is an RLS change, out of this run's rules; owner call.
4. /me writes on view (found by A0): viewing /me (and /profile, which redirects there) signed in grants badge tiers and writes passport snapshots. No agent loads them signed in; parity.spec runs only with UX_V1_PARITY=1; P10 verifies the passport through /u/testtest and render tests. Folded into decision 1.
5. Logo (A0): the prototype's pink K tile + "KpopQuiz" (17.1) is shipped under the flag; the live site shows the rabbit mascot. One-line swap in components/ux-v1/brand.tsx.
6. Contrast (A0): name accents and badge rarity words are shown through per-theme AA-clamped tokens (same hue); stored values unchanged.
7. Live ticker online count (DESIGN-SPEC 17.11, already marked pending there): the live component floors the online count with a random 12 to 27. Kept as is unless the owner says otherwise (it is not real data).
8. Group hubs with few quizzes: the worker prompt asks for noindex until 3 quizzes; today's hubs have no robots rule, so it is an SEO diff outside 16.10. Not shipped; owner call.
9. New public URLs under the flag (/community and its posts, /blindtest/ranked): noindex and out of the sitemap until the owner decides.
10. P4: hall of fame shows guests as "someone" or signed-in players only.
11. Security, existing (found by P4): the `battles` table accepts public inserts; P4 only trusts signed challenge links. Tightening is an RLS change, owner call. Optional env UX_P4_CHALLENGE_SECRET for the link signature.
12. P6: should every blindtest (not only the dailies) count for the streak; should free hub plays be recorded and earn XP (XP-farming risk); wire bt_players rank titles; blindtest challenge creation is open to guests (require sign-in or rate limit?); "challenges waiting" needs an invitee column; the Recent hits, Legends and Speed round mixes need generate support.
13. P6: the Intro mode 301 (/blindtest/intro-challenge -> /blindtest) was not done in this run (SEO diff); owner go needed.
14. P10: header storage: create the profile-headers bucket or reuse the avatars bucket; an email sender for the email switches; a "flat theme colour" band mode needs a new column; a real delete-account flow (today the confirm sheet sends the fan to /contact). Signed-in /me is NOT verified live (render test only) until decision 1.
15. P1: QOTD rotation stopped because ensure_daily_quiz only publishes a bank row dated exactly today and nothing was scheduled after 2026-06-30 (the cron still answered ok). The fix ships behind the server env QOTD_ROTATION_FIX=1 (off by default, production cron unchanged); until it is set the home shows the real stored pick labelled "Picked on June 30".
16. Security, existing (found by P1): quiz_bank (migration 018) and quiz_time_stats (032) have write-all RLS policies, so anyone with the anon key could insert a bank row the cron would then publish. Not tested. Tightening is an RLS change, owner call.
17. P1 design changes made to keep every live home link: 6 cards per rail instead of 4 or 5, a "Most liked" link, Verse and Discord lines under the community rows; the 17 hub links sit in the scrolling groups rail in the live order (Cortis is 4th there).
18. P7: Season rewards are shown as designed but not built (build them or hide the section before go-live); no /pt mirror for /blindtest/ranked.
19. P2 deviations: the live H1, intro and breadcrumb (SEO lock) push the grid 64.7px lower than the reference; default sort shown as "Most played" (the live default); ?page=N shows pages 1..N; ?level= is noindex with canonical /quizzes (flag on only); no Language dropdown (?lang= still works); no Create banners; the popular-* subpages are not redesigned. P2 also found that lib/db/queries/popular.ts caches a failed plays read as an empty window for an hour (task chip spawned by P2).
20. P3: groups.quiz_count is stale because handle_new_quiz() only ever adds (it never subtracts on unpublish or delete). The v11 pages count published quizzes, but the SEO-locked texts still show the stale number (BLACKPINK 29 vs 24 published) and the locked blindtest counts come from the old table; the locked /groups intro does not match the 90 listed groups. Fixing the trigger is a DB change; changing the locked texts is an SEO change: owner call for both.
21. P3: /groups (flag on) lists all 90 visible groups and so links the 46 hubs that have no quiz yet (thin pages, shown muted); noindex for thin hubs was not shipped (decision 8). Also for review: hub breadcrumb vs BreadcrumbList, the kept Verse link, Notify me, the FAQ heading (P3 report section 9).
22. Cleanup items for the owner (from A0): give lib/streak.ts streakState an optional `now` so streakView never reads the clock (tests now freeze the clock instead); `turbopack.root` in next.config.ts (dev only, P1's note); once P2 is merged, P2 can drop its copy of the link-option rule now that Segmented and UxDropdown accept href options; the inert Phase 1 `.uxv1-*` CSS in globals.css.
23. P5: /create keeps the live H1 "What's your quiz about?" and intro (SEO lock) instead of the prototype's "Create a quiz" (one line to switch; the page is noindex); the paste format; the new Easy and Hard difficulty lines. Existing bug (found by P5): the legacy create-funnel autosave can re-save a draft it just cleared. Cleanup: like P4, make create-funnel.tsx and question-list-editor.tsx import lib/ux-v1/p5 so there is one copy (a flag-off change). The sign-in callback uses NEXT_PUBLIC_SITE_URL, which matters for OAuth round trips on preview deploys.
24. P11 copy states the real rules: read notifications are cleared after 60 days (not 30); the streak counts only the daily quiz and the daily blindtest. Dismiss and Mute of the live center are kept in a row menu (not drawn in the prototype); four filters; search ranks the closest name first; a song row opens /blindtest/<group mode>, which fails on Play today (the production bug P6 reported). /search itself stays the live page inside the shell (no prototype state).
25. P9: the H1 stays "Community" (SEO lock) instead of "Leaderboard"; "Around the community" is kept until /community is indexable; Players = all-time XP (no XP history exists); the weekly change is the real percent change, not rank moves; migration 097 (Rising) is not applied in prod; 19 groups have fandom_name 'fan'; the shared getFandomWarMap caches an empty board for 1h after an RPC error (P9 reads through its own throwing getWarMap).
26. Security, existing (found by P8): the existing /api/verse/* write routes (threads, essays, discussions, reactions, flags) do not check VERSE_PUBLIC or LIVE_SPACES themselves, so a hand-crafted request can write Verse rows for hidden or parked spaces today. The v11 /community never offers them for gated content. Owner call.
27. P8 remaining decisions: apply v11-p8-community.sql; blogs keep curator review and a space Join (no cover upload); the feed shows the last 3 closed daily debates; the daily debate reply is sent with the vote; /community stays noindex until the owner decides. The feed shows no Verse item unless VERSE_PUBLIC is 'true', and never a parked space (lib/ux-v1/p8/verse-gate.ts).
28. Cached failed reads on legacy (flag-off) code, found by P2, P1, P6 and C3: lib/db/queries/popular.ts, getFandomWarMap, getQuizOfTheDay (null for the day), lib/db/queries/blindtest.ts getBlindtestStats (`count ?? 0` inside unstable_cache), and ISR pages keeping a render whose reads failed. The v11 pages no longer do this (P1, P3, P6 fixes). Owner call for the legacy code (one task chip exists for popular.ts).
29. Shared hub reads (found by P3): 10 shared reads used by the group hubs (group-hub, community, freshness, related quizzes, trivia facts) return an empty value when Supabase fails and unstable_cache keeps it up to an hour, on the v11 hubs and the live ones alike (in this loop every flag-on hub lost its fandom war line until the dev cache was cleared). A ready fix is in docs/design/ux-dashboard-v1/v11/reports/P3/fail-closed-queries.patch (39 lines, applies cleanly, type-checks; callers to check are listed in v11/requests/P3.md request 2). It changes shared flag-off code, so it is the owner's call, not applied in this run.
30. P4: the v11 results keep the live Discord line and Brag button (70% and up, hidden while the Discord flex webhook is unset): one centred row that is not in the prototype; the link uses the v11 muted colour because the legacy blue fails AA on dark.
31. Parked Verse links (C3 owner note): the v11 home and hubs no longer link /verse/blackpink, /verse/seventeen, /verse/stray-kids, /verse/ateez (parked spaces: 404 with VERSE_PUBLIC=true as in dev, 302 to the /verse teaser on live). Dropped on purpose by C2-005/006; confirm.
32. Data (P7): `songs` has no accuracy stats; the ranked 4/4/2 draw uses the curated songs.tier until ranked answers build up ranked_song_stats.


## Evidence index (v11/checks/qa/)

- e2e: `e2e-loop2.md` / `.json` (loop 2, owner + QA specs), `e2e-run3.md` (loop 1 owner specs), `e2e-qa2.md`
  (loop 1 QA specs); summariser `e2e-summary.mjs`.
- Accessibility: `QA-A11Y-loop2.md` + `results-loop2/` (loop 2), `QA-A11Y.md` + `results/` (loop 1); specs
  `apps/quiz/e2e/ux-v1/qa-a11y.spec.ts`, `qa-keyboard.spec.ts`; summary `qa-summary.mjs`; legacy pages flag on vs
  off `evidence/a11y-legacy-pages-on-vs-off.txt` (probe `axe-urls.mjs`).
- SEO: `seo-loop2/SUMMARY.md` + `seo-diff.json` (loop 2), `seo/` (loop 1, 34 URLs); scripts `seo-diff.mjs`,
  `seo-summary.mjs`, `link-detail.mjs`.
- Performance: `perf/SUMMARY-loop2.md`, `perf/SUMMARY.md` and the JSON runs; scripts `perf.mjs`, `gzip-proxy.mjs`,
  `perf-summary.mjs`.
- Issues: `ISSUES-STATUS.md` (loop 2 verdicts), `evidence/` (one file per issue), probes `probe-like-race.mjs`,
  `build-cache-state.mjs`.
