# WIRING-MAP.verified.md - Phase 0 audit result

Verification of `WIRING-MAP.md` against `apps/quiz/src` (routes, components, lib) and
`supabase/migrations`, done 2026-09-21 on branch `feat/ux-v1`. Method: every FILE claim opened, every
API route confirmed by its exported method, every table/RPC checked in the migrations, blindtest code
paths grepped. No production DB was mutated; no DDL was run. The base map is **largely accurate**; the
corrections below are the load-bearing ones a worker would otherwise trip on.

Legend unchanged (EXISTS / PARTIAL / NEW / DEAD).

---

## (a) Controls where the MAP WAS WRONG

Each is `section - row : the map's claim -> the truth (file:line)`.

1. **§0 Sidebar Quizzes count** - "count = published quizzes (`lib/db/queries/quizzes.ts`)". There is
   **no published-total count function** in that file (only card-list queries filtered by
   `status='published'`). Real totals live in `app/api/admin/stats/route.ts:64-65` and
   `lib/pulse/compute.ts:140`. Also: there is no sidebar today at all (the app uses
   `components/layout/top-nav*`), so "419" has no current producer. **New count query needed** (a cheap
   `head:true count` on `quizzes` where `status='published'`).
2. **§2 Sort tabs** - "`GET /api/quizzes?sort=`". The real param is **`?tab=`**
   (`app/api/quizzes/route.ts:42`, `browse-quizzes.tsx:50` comments it). No `sort` param is read.
3. **§2 Level chips** - "`difficulty` filter in `GET /api/quizzes` (EXISTS)". That endpoint has **no
   difficulty filter** (`route.ts:46-48` reads only `group_id`, `quiz_type`, `language`). Difficulty
   filtering exists only via `getQuizzesByDifficulty` (`lib/db/queries/quizzes.ts:492`) behind the SEO
   pages. So the browse "Level chips" are **PARTIAL/NEW**, not EXISTS - the browse endpoint needs a
   `difficulty` param added, or the chips wire to the SEO routes.
4. **§3 Owner actions (edit)** - "`POST /api/quiz/[id]/edit`". That route is **GET-only** (loads the
   editor, `edit/route.ts:7`); the save is **`PUT /api/quiz/[id]`** (`route.ts:8`,
   `quiz-editor.tsx:41`).
5. **§3 Challenge a friend / `battles`** - "`battles` written today only by `POST /api/game/[id]/play`".
   FALSE. `/api/game/[id]/play` writes **`game_plays`** (`play/route.ts:129`), not `battles`. A repo
   grep for `.from('battles')` returns **0 hits** - **nothing in the app writes or reads `battles`**.
   The table (+`battle_results`, `pending_questions`, mig 073) is fully DEAD in code. (See the specific
   answer below.)
6. **§4 Timer ring** - "ring in quiz-player (`timer-circle.tsx`)". The ring is **inline** in
   `quiz-player.tsx:903-921`; `timer-circle.tsx` is imported nowhere (dead).
7. **§4 Answers A-D** - "`answer-button.tsx`". A-D chips are **inline** (`quiz-player.tsx:967-981`);
   `answer-button.tsx` is dead (only the dead `image-question.tsx` imports it).
8. **§4 Image variant** - "`image-question.tsx`". Images render **inline** (`quiz-player.tsx:942-951`);
   `image-question.tsx` is dead. (`intruder-question.tsx` IS used, `:959`; clue controls inline - OK.)
9. **§6 Title check** - "`POST /api/quiz/title-check`". The route is **GET** (`title-check/route.ts:17`,
   `create-funnel.tsx:204`).
10. **§7 New post composer** - lists **`debate_votes` as a NEW table to create**. It **already EXISTS**
    (mig `108_daily_debate_cheers.sql:35`) and the same section lists it EXISTS in the Daily-debate row.
    Genuinely new: `posts`, `post_replies`, `post_reactions`, `debate_options` only.
11. **§7 Happening now** - "`happening-now.tsx` -> `GET /api/activity/recent`". `HappeningNow` is
    **server-rendered** from `getHappeningNow` (`community-content.tsx:86`); `/api/activity/recent` is
    used by `activity-ticker.tsx:30`. Both read `activity_events`; only the pairing was wrong.
12. **§8 Blindtest N songs** - source "`lib/db/queries/blindtest.ts`". The group-hub count comes from
    `getGroupBlindtestInfo` (`lib/db/queries/group-hub.ts:56`), which the hub imports. File
    mis-attributed.
13. **§9 Passport tabs** - "ProfileTabs exists (Overview, quizzes, badges)". Actual tabs are
    **`['Quizzes','Liked']`** (owner) / `['Quizzes']` (public) in `u/[username]/profile-tabs.tsx:45`.
    **No Overview tab, no badges tab** (badges are a shelf component). The v1 tab set (Overview / My
    quizzes / My posts / Mastered / Settings) is therefore almost entirely NEW UI.
14. **§12 Playlists file** - "ids in `lib/blind-test-playlists.ts`". **Zero ids there** - it only
    exports `getAdvertisablePlaylists()` (DB group query) + `ROUND_SIZE`. All ids live in
    **`lib/blind-test-modes.ts` `STATIC_MODES`** (see confirmations). The setup picker in
    `blindtest-game.tsx` imports **neither** lib; it is hardcoded (`GENDER_PICKS:62`, `GENERATIONS:67`)
    + server `getBlindtestGroups()`.
15. **§12 "Intro mode not offered" / "Removed: Intro, Lyrics"** - **Intro (`intro-challenge`) IS a live
    SEO page** (`/blindtest/intro-challenge`, built from `STATIC_MODES` by `generateStaticParams`,
    `[mode]/page.tsx:22`). Only the hub *picker* omits it. **"Lyrics" mode does not exist anywhere** -
    nothing to remove. See Open Question 1 (removing Intro deletes an indexed page - SEO rule 2).
16. **§13 XP on results** - "XP from `/api/blind-test/play`". `blindtest-game.tsx` (the Deezer hub)
    **never calls `/api/blind-test/play`**; that endpoint is called only by the YouTube `[mode]` player
    (`blind-test-player.tsx:263`). In the hub, XP is awarded **only in daily mode** (`:236,251`);
    free-play results award none.
17. **§13 Auto-next 3s** - it is **2.6s** (`REVEAL_MS = 2600`, `blindtest-game.tsx:23`).
18. **§1 QOTD `GroupLogo` / §1 cover fallback** - `GroupLogo` lives in `components/ui/group-logo`, not
    `components/group`. Minor path note for the `quiz-card` re-skin.

---

## (b) Endpoints that EXIST but are BROKEN or UNUSED

No throwing/broken endpoints were found. Unused / dead code that the re-skins should NOT re-wire to:

- **`GET /api/blind-test/modes`** (`modes/route.ts:41`) - exists, **no fetch callers** (consumers
  import `STATIC_MODES` directly). Effectively dead.
- **`battles` + `battle_results` + `pending_questions`** (mig 073) - full quiz-battle schema, **0 code
  references**. DEAD until the Phase-3 battle endpoint is built.
- **`bt_players`, `bt_plays`, `players`, `ranked_plays`, `challenges`, `challenge_attempts`,
  `party_rooms`, `party_players`** - all exist, **0 code references**. DEAD until wired (Phases 5/6/9).
- **Dead in-game components** (quiz-player reimplements them inline): `timer-circle.tsx`,
  `running-timer.tsx`, `image-question.tsx`, `answer-button.tsx`. Do not resurrect; re-skin the inline
  markup in `quiz-player.tsx`.
- **`GET /api/quiz/[id]/edit`** is GET-only (loads editor) - not broken, just not the save path
  (save = `PUT /api/quiz/[id]`).

---

## (c) NEW backend work, ordered by dependency

DDL is owner-only: the worker writes each migration into `docs/pending-migrations/` with a note and
STOPS; code fails soft until applied. `docs/pending-migrations/` already exists and 148-156 are queued
(incl. `154_battle_challenge_notification.sql`).

**Tier 0 - migrations to queue (blockers for the tiers below):**
1. `ranked_plays.season INTEGER` + `ranked_plays.points INTEGER` (blocks Phase 6). Confirmed absent.
2. `notification_prefs.email_weekly_recap BOOLEAN` (blocks the Phase 8 email toggle). Confirmed absent.
3. Community tables `posts`, `post_replies`, `post_reactions`, `debate_options` + RLS (blocks Phase 7).
   `debate_votes` already exists - do NOT recreate it.
4. `rooms` + `room_messages` OR a decision to reuse `party_rooms`/`party_players` (Phase 7/9 live
   rooms). Owner call.
5. `154_battle_challenge_notification.sql` - already queued; owner applies for the Phase-3 battle notif.
6. (Optional) `ranked_season_scores` materialised view/table, or compute best-5 in the endpoint.

**Tier 1 - code on existing tables, no DDL (must land before their dependents):**
7. **Blindtest rank wiring (Phase 5).** On play submit: upsert `bt_players`, call `award_bt_xp` then
   `update_player_rank` (RPCs exist, mig 052). **BLOCKER to resolve first (see Open Question 2):**
   `bt_plays.player_id -> players(id)` (legacy, mig 020), while `ranked_plays`/`challenges/_attempts ->
   bt_players(id)`, and the live code records a **third** table `blind_test_plays` (mig 017,
   `play/route.ts:26`). The map's "insert `bt_plays`" points at the legacy table. Decide the canonical
   play+player tables before wiring, or the rank ladder and ranked/challenge FKs will not line up.
8. **Quiz battle endpoint (Phase 3).** `battles` table exists; build `POST /api/quiz/[id]/battle`
   (writes battles row: `question_ids`, `challenger_*`) + `/b/[code]` route; notif needs mig 154.
9. **Keep-playing (Phase 2).** No backend: localStorage per quiz written by quiz-player, read
   client-side. Confirmed there is NO server-side in-progress state today. Optional
   `GET /api/passport/summary` for the 3 dashboard numbers.

**Tier 2 - depend on Tier 0/1:**
10. **Ranked endpoints (Phase 6)** - need #1 (season/points) + #7 (bt_players wired):
    `/api/blind-test/generate` `mode:'ranked'` branch (absent today), `POST /api/blind-test/ranked/submit`
    (server points recompute), `/ranked/me`, `/ranked/ladder?scope=`, nightly Legend cron. Neither
    `/api/blind-test/ranked/*` nor a `ranked` generate branch exists today.
11. **Posts endpoints (Phase 7)** - need #3: `POST /api/posts`, `GET /api/posts?tab=&group=`,
    `POST /api/posts/[id]/reply|react|vote`, all RLS'd. No `/api/posts` exists.
12. **Blindtest challenge endpoints (Phase 9)** - `challenges`/`challenge_attempts` exist
    (public-by-link, no `invitee` column): `POST /api/blind-test/challenge`, `/bt/c/[code]`,
    `POST /api/blind-test/challenge/[code]/attempt`. None exist today.
13. **Live rooms (Phase 7/9)** - depends on #4; `party_rooms`/`party_players` (Realtime, mig 059) can
    be reused. Stub card until then.

---

## Specific confirmations requested by Phase 0

**1. Which `lib/blind-test-playlists.ts` ids exist?**
None - that file has no id constants (only `getAdvertisablePlaylists()` + `ROUND_SIZE=10`). The ids are
`STATIC_MODES` in **`lib/blind-test-modes.ts`**, and all of the map's 8 named ids exist there:
`title-tracks`, `b-sides`, `recent-hits`, `kpop-legends`, `4th-gen-gg`, `4th-gen-bg`, `solo-artists`,
`speed-round`. Full set (18): DIFFICULTY `classic`, `intro-challenge`, `verse-only`, `bridge-or-break`,
`speed-round`; ERA `2nd-gen`, `3rd-gen`, `4th-gen`; SPECIAL `girl-groups`, `boy-groups`,
`solo-artists`, `title-tracks`, `b-sides`, `recent-hits`, `kpop-legends`, `4th-gen-gg`, `4th-gen-bg`,
`random-all`; plus dynamic `group-<slug>`.

**2. Are `bt_players` and `ranked_plays` safe to reuse as-is?**
- `bt_players` (mig 026 + 059): YES, reuse as-is. It has `rank_title`, `rank_level`, `best_score`,
  `best_combo`, `current_streak`, `total_xp` etc.; `user_id -> auth.users` UNIQUE. It is unwritten
  today, so wiring it is additive. Note the XP ladder in the map (0/500/1500/3000/6000/12000/25000 ->
  trainee..legend) must match `award_bt_xp`/`update_player_rank` (mig 052) - verify the thresholds in
  the RPC before trusting the map's numbers.
- `ranked_plays` (mig 059): reusable but **NOT as-is for Phase 6** - it is missing `season` and
  `points` (Tier 0 #1). Its `player_id -> bt_players(id)`, so #7 (wire bt_players) is a hard
  prerequisite. Existing columns: `score, correct_count, total_rounds, best_combo, avg_speed_ms,
  playlist(jsonb), song_ids(uuid[]), played_at`. Permissive RLS (`insert WITH CHECK (true)`).

**3. What is `battles` used for today by `/api/game/[id]/play`?**
Nothing. `/api/game/[id]/play` inserts `game_plays` (`play/route.ts:129`); it never touches `battles`.
The `battles`/`battle_results`/`pending_questions` schema (mig 073) is a complete quiz/group battle
system (`quiz_id` or `group_slug`, `question_ids` = the exact 7, `challenger_*`) that **no code
references** (0 `.from('battles')` hits). It is dead schema awaiting the Phase-3 endpoint.

---

## Open questions for the owner (from the audit)

1. **Removing "Intro" conflicts with SEO rule 2.** `intro-challenge` is a live, indexed page
   (`/blindtest/intro-challenge`). Phase 5 says "remove Intro". Remove it only from the hub *picker*
   (keep the SEO page), or delete the page and 301 it? ("Lyrics" doesn't exist - nothing to do.)
2. **Which play + player tables are canonical for blindtest?** Live code writes `blind_test_plays`
   (+`award_xp` profile XP). The rank/ranked/challenge features are built on `bt_players`, and
   `bt_plays` points at the legacy `players` table. Confirm the target before Phase 5 wires rank, so the
   ladder, ranked, and challenge FKs align.
3. **Live rooms:** new `rooms`/`room_messages`, or reuse the existing `party_rooms`/`party_players`
   (Realtime already enabled)?
4. **Fonts:** the prototype is Inter; the app ships DM Sans + Syne. The prompt says Inter is the target
   - confirm we swap the global font in Phase 1 (affects every page, incl. SEO pages' rendered text,
   though not content).
5. **Reference screenshots in git:** the ~12 MB of `shot-*.png` are committed with the package. Keep
   them in-repo (useful for pixel review) or should they stay out?
