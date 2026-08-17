# F2a - Community page v2, part 1 (LIVE + BELONGING layers)

## Claude Code Implementation Prompt

---

F2a: rebuild the community page (`/leaderboard`) from a stack of ranked lists into a page that
feels ALIVE and gives fans a stake. Part 1 of 3 (F2b = conversation layer + Daily Debate,
F2c = personality pack; both later - do NOT build them now).

Hard rules: NO em dashes. Real `<Mascot>` + real badge PNGs only. REAL DATA ONLY - never
fabricate activity, counts, or usernames; every module hides when its data is empty (M1.29
pattern). Git commit only after each step, do NOT push. New public routes (if any) must be
added to the route allowlist (`src/lib/route-allowlist.ts`) - `check:routes` must stay green.
Dual-skill audit: `/ui-ux-pro-max` + `/frontend-design` before and after.

Page stays static/ISR (`revalidate 300`, may drop to 120). All new sections = baked server
queries wrapped in safeFetch, cheap and indexed, NANO-safe. Personal bits = client islands.
Zero new hot-path writes. The existing MIN_BOARD = 4 rule keeps applying to every board.

**Current file:** `apps/quiz/src/app/leaderboard/page.tsx` (+ components in
`components/community/`). Read it fully first. Existing sections: YourStanding island, rising
creators, TopCreatorsTabs (week/all-time), ByFandomFans, legends, community pulse
(ActivityTicker + 3 stats). PersonCard = the identity primitive everywhere.

---

## Target page order (mobile-first single column, 430px reference)

```
1. Header + Today in numbers strip     (F1.2)
2. Your standing v2 (island)           (F1.10)
3. Happening now feed                  (F1.1)
4. Daily ritual cards (compact)        (F1.3)
5. Fandom war map (top 30)             (F1.7)
6. Hall of Fame (one tabbed card)      (F1.9)
7. Badge showcase                      (F1.8)
8. Community pulse (existing, keep)
```

(Numbering F1.x = build steps below. Fresh quizzes / comments wall / battles = F2b, NOT now.)

---

## F1.1 - Happening now feed

The page's heartbeat. Full-feed version of the one-line ActivityTicker, same
`activity_events` table, ZERO new writes.

**New component:** `components/community/happening-now.tsx` (server component, baked at ISR).

- Query: latest 12 events from `activity_events` (indexed on created_at desc), joined to
  profiles for flair fields. New query fn in `lib/db/queries/community.ts`.
- Row = PersonCard `compact` + event phrase + time-ago + chevron. Whole row is a Link:
  - `quiz_created` -> the quiz page ("made a new quiz: {title}")
  - `group_mastered` -> the group page ("mastered {GROUP}")
  - `perfect_score` -> the quiz's group page ("scored a perfect {score}/{total}")
  - `quiz_completed` -> group page ("scored {score}/{total} on a {GROUP} quiz")
  - `blindtest_played` -> /blindtest ("got {correct}/{total} on the blind test")
  - `duel_voted` -> /games/this-or-that ("voted in a duel")
  - `battle_won` -> /games ("won a battle")
  - `streak_milestone` -> nothing special, row not linked ("hit a {streak}-day streak")
- Anonymous events (user_id null / 'someone') render with NO PersonCard, plain text row.
- Time-ago: "2m", "1h", "3d" style, computed client-side in a tiny island OR rendered
  server-side coarse ("today", "1h") to keep the section static - choose server-side coarse,
  it is ISR-friendly and honest at revalidate 300.
- Liveness gate: if fewer than 4 events in the last 48h, the whole section hides and instead
  renders a small "quiet hours" state: `<Mascot variant="sleep" size={56}/>` + "The fandom is
  napping. Play something and wake it up." + one btn-outline to /quizzes. NEVER pad with fake
  rows.
- Cap phrase length, ellipsize quiz titles > ~32 chars.

## F1.2 - Today in numbers strip

Daily rhythm anchor under the header. One cached query, resets midnight UTC.

**New query** `getTodayStats()` in `lib/db/queries/community.ts`: plays today (plays table,
created_at >= UTC midnight), quizzes made today, masters earned today (activity_events
group_mastered today - cheaper than scanning mastery table), most-played group today (top 1
by plays joined to groups; can be null early in the day).

**Render:** 4 metric cells in the existing PulseStat visual style but placed directly under
the H1: "plays today", "quizzes made", "groups mastered", "hottest group" (group name +
logo chip, links to group page). Any zero cell renders "-" instead of 0 before ~9am UTC
(honest but not sad). If ALL are zero, the strip hides entirely.

## F1.3 - Daily ritual cards (compact)

Community joins the daily loop. Reuse, do not rebuild:

- Compact variant of the QOTD card: reuse `HomeQotd` if it accepts a `compact` prop cheaply,
  otherwise a slim strip: lightning icon + "Quiz of the day: {title}" + countdown + Play
  button -> `/q/{slug}?daily=quiz`.
- Beside it (2-up grid like `daily-twoup`, stacks on narrow): the daily GAME strip
  (`GameOfTheDay` data) OR - when Workstream N ships - the Blindtest of the Day card.
  Build against what exists TODAY (GameOfTheDay); leave a one-line TODO for the N swap.
- Both fetched with the existing `getQuizOfTheDay` / `getGameOfTheDay` queries at ISR time.
- "Played today" state: keep it client-side via the existing `hasPlayedDaily` localStorage
  helpers in a tiny island, same as home.

## F1.7 - Fandom war map (top 30)

The centerpiece. Replaces ByFandomFans as the belonging surface (ByFandomFans' fan-list
functionality merges INTO the tile detail).

**New query** `getFandomWarMap(30)`: for the top 30 groups by plays in the last 7 days:
group (name, slug, logo, color, generation), plays this week, active fans this week (distinct
players), plays delta vs previous 7 days (for an up/down arrow). One SQL query with a window
or two cheap grouped queries; must hit existing indexes (plays created_at, group_id). If a
dedicated index is needed, add migration `107_war_map_index.sql` (105 badge notifications and
106 daily blindtest are taken).

**Render:** `components/community/fandom-war-map.tsx` (server, baked):
- Section label: "Fandom war" + sub "Which fandom is strongest this week?"
- Rank 1-3: podium row - bigger tiles, medal accents (reuse the site's medal/rank styling),
  group logo prominent.
- Ranks 4-30: dense 2-col grid (mobile) / 3-col (desktop) of small tiles: rank number, logo,
  name, "{plays} plays · {fans} fans", up/down/flat arrow vs last week.
- Every tile = Link to the group page (`/{slug}-quiz` or the group hub route - use whatever
  the group pill/home uses today).
- Below the grid: one line CTA: "Defend your fandom - play a quiz" -> /quizzes.
- Boards rule: if fewer than 4 groups have plays this week, the section hides.
- The old ByFandomFans component: remove from the page (its "active fans of group X" list
  returns inside F2b or the group pages later - do not delete the component file, just unmount).

## F1.8 - Badge showcase

Makes badges visible outside profiles. Aspiration surface.

**New query** `getLatestBadgeEarns(6)`: latest 6 rows from the user-badges join table
(whatever mig 101-104 named it - read the migrations), joined to badge_definitions (icon,
name, tier) + profiles (flair). Exclude backfill/founding grants older than 30 days from
"latest" so the row reflects recent life.

**Render:** `components/community/badge-showcase.tsx`:
- Section label "Badge watch".
- Horizontal shelf of cards: real badge PNG coin 44px + badge name + PersonCard mini of the
  earner + coarse time ("today", "2d").
- Tap -> the earner's profile.
- If fewer than 3 recent earns, section hides.

## F1.9 - Hall of Fame merge (tabs)

Shorten the page: rising / top creators / legends stack becomes ONE tabbed card.

- Extend the existing `TopCreatorsTabs` pattern into `HallOfFame` tabs:
  `Rising | This week | All time | Legends`.
- Rising keeps its "+N followers" stat + follow buttons; week/all-time keep plays stat;
  legends keeps XP stat. Same PersonRow rendering, same MIN_BOARD hiding per tab (a tab with
  < 4 entries doesn't render its tab button at all; if no tab qualifies the card hides).
- Client-side tab toggle over data baked at ISR time (exactly like TopCreatorsTabs today).
- Delete the now-duplicated standalone sections from the page.

## F1.10 - Your standing v2

Upgrade the existing `YourStanding` island (personal, client-side, page stays static):

- Keep whatever it shows today (read it first).
- Add: "your fandom this week" - if the user has a top/ult group that appears in the war map,
  show "{GROUP} is #7 this week" + delta arrow, linking to the war map section anchor.
- Add: one nudge line when rankable: "N more plays to pass @username" using existing weekly
  leaderboard data (`lib/weekly-leaderboard-padding.ts` and the leaderboard queries exist -
  reuse). Personal-best framing only when the board is thin (MIN_BOARD rule): never show
  "#N of M" when M < 4.
- Signed-out: the island renders a single quiet line "Sign in to see your standing" ->
  /login (no card chrome).

---

## SEO + housekeeping

- Page metadata: refresh description to mention the fandom war + live feed (no em dashes).
- The page renders real `<Link>`s everywhere (feed rows, war tiles, badge earners) - internal
  link graph win; verify no `<a onClick>` patterns.
- `/leaderboard` is already allowlisted; run `check:routes` anyway.
- Keep JSON-LD if present; do not add fake aggregate ratings.

## Build order (commit after each, do NOT push)

1. Queries: getTodayStats, happening-now feed query, getFandomWarMap(30) (+ migration 107
   ONLY if an index is genuinely needed), getLatestBadgeEarns. Test each against prod data
   shape via a scratch route or console. Commit.
2. F1.1 happening-now + F1.2 today-strip. Commit.
3. F1.3 daily cards row. Commit.
4. F1.7 war map (remove ByFandomFans from page). Commit.
5. F1.9 Hall of Fame tabs (remove old stacked sections). Commit.
6. F1.8 badge showcase. Commit.
7. F1.10 your-standing v2. Commit.
8. Consistency pass: dark/light, 430px + desktop, empty-state test with a fresh account,
   page-weight check (HTML should stay lean; no client JS added except the small islands).
   Commit.

## Verification checklist

- [ ] Page order matches the target; old stacked sections gone; pulse kept at bottom
- [ ] Every module hides on empty data (test: filter queries to an impossible date and
      confirm the page still looks intentional, never sad/fake)
- [ ] Quiet-hours mascot state renders when feed is thin (force it once to verify)
- [ ] War map: top 3 podium + 4-30 grid, all 30 tiles link to real group pages, delta arrows
      correct against previous week (spot-check 3 groups by SQL)
- [ ] No fabricated numbers anywhere; every stat traceable to a query
- [ ] Page still static/ISR (build output symbol unchanged), all new queries safeFetch-wrapped
- [ ] Islands only for: your-standing, daily played-state, tab toggles
- [ ] PersonCard used for every human (flair travels); anonymous rows have no fake identity
- [ ] MIN_BOARD = 4 respected on every board/tab
- [ ] check:routes green; tsc clean; build green; zero em/en dashes
- [ ] Analytics: fire existing `cross_promo_click` events on war-map CTA + daily cards
      (from = 'community'); no new event names

/caveman report after each step: what shipped, screenshots (mobile light/dark), query cost
notes (rows scanned), and anything that had to deviate from this spec + why.
