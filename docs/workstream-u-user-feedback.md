# Workstream U - user feedback round 1 (Reddit, Jul 2026)

## Claude Code Implementation Prompt

---

A real fan (Reddit, Top 1% commenter) sent detailed feedback. Every item gets
investigated and fixed or upgraded. Verify-first discipline: several items may
already exist or be half-true; report actual state before changing anything.

Hard rules: NO em dashes. Real data only. Commit per step, do NOT push. Routes ->
allowlist. Dual-skill on UI changes. Q workstream is mid-flight: coordinate - do NOT
touch the create funnel here (U-7 is answered by Q, not built here).

## The items

### U-1 - Games section "See all" bugs (FIX FIRST, confirmed bugs)
a. Fan rankings "see all" shows only the first ranking (female idols one).
b. This-or-that "see all 20+" redirects to the BTS category instead of an index.
Find the routes/links in the games hub (components/game/games-hub.tsx per repo
structure), fix both to land on real index pages listing ALL rankings / ALL
categories. If an index page does not exist, build the minimal honest version
(list of cards, ISR, allowlisted).

### U-2 - Blindtest: multi-group + round count + gg/bg discoverability
a. VERIFY FIRST: the generate API already supports 'gg' and 'bg' playlists
   (GENERAL_PLAYLISTS). Is there UI for them in the setup picker? If missing, add
   "Girl groups" / "Boy groups" picks to the setup screen (cheap, API-ready).
b. Multi-group pick: let a player select 2-3 specific groups (not a generation).
   API: extend generate to accept a small array of group slugs (cap 3), pool =
   union, same tier mix. UI: group picker allows up to 3 selections with chips.
   Keep single-group flow unchanged for deep links.
c. Round count: setup option 5 / 10 / 15 songs (default 10). API already builds
   from SONGS_COUNT; parameterize it (cap 15, min 5). Score screens + ResultLoop
   share text adapt to /N. Daily blindtest stays FIXED at 10 (leaderboard
   comparability - do not touch).
d. Slow song loading: profile the real cause. Known suspect: generate re-fetches
   every Deezer preview URL serially-ish at game start + previews load per
   question. Options to implement as sensible: parallel fetch (already
   Promise.all? verify), preload next question's audio during the current one
   (audio preload hint), and a loading state that starts the game when the first
   2 songs are ready instead of all 10. Measure before/after (report ms).

### U-3 - Profile: created quizzes list
User says the "your created quizzes" list disappeared. VERIFY: M1.29 passport has
a Quizzes tab - does it show on /me AND public /u? Does it list the creator's
quizzes with plays/likes ("see how they're doing")? If the tab exists but lacks
per-quiz stats, add plays + likes per row. If it is missing somewhere, restore.
Report the actual state honestly (owner believes it partly exists).

### U-4 - Mastery: per-group drill-down inside generations
Collection card shows generation mini-bars. Add: tapping a generation expands the
groups of that gen with the user's per-group progress (plays/accuracy toward
mastery threshold, from player_group_mastery). Personal mode (/me) rich version;
public /u keeps current compact behavior. Reuse existing passport data queries
where possible; one new cheap query max.

### U-5 - /quizzes browse filters: desktop UX
The horizontal chip scroller is mobile-designed; on PC there are no arrows and
it needs keyboard tricks. Fix: on desktop (pointer:fine / min-width), the group
select (the longest) becomes a searchable dropdown (reuse Q-B1's searchable
group picker component if mergeable); category/type/sort become regular dropdown
selects. Mobile keeps the chip scroller. No URL/param changes (SEO faceted URLs
untouched).

### U-6 - (from the same thread) nothing else - do not scope-creep.

### U-7 - Other quiz types in creation: DO NOT BUILD (answered by Workstream Q's
roadmap; the Reddit reply covers it). Zero changes here.

## Order
U-1 (bugs) -> U-2a+d (cheap blindtest wins + perf) -> U-5 (desktop filters) ->
U-3 (verify/restore) -> U-4 (drill-down) -> U-2b+c (multi-group + rounds).

## Verify
- [ ] Both see-all links land on full indexes (click-verified)
- [ ] gg/bg playable from UI; multi-group 3-cap works; rounds 5/15 play + share
      correctly; daily untouched at 10
- [ ] Blindtest start latency measured before/after (report numbers)
- [ ] Created-quizzes state reported + fixed with per-quiz plays/likes
- [ ] Gen drill-down shows real per-group progress, /u compact unchanged
- [ ] Desktop dropdowns + mobile chips both verified; faceted URLs unchanged
- [ ] check:routes, tsc, build green; zero em dashes

/caveman report per step, verify-first findings included.
