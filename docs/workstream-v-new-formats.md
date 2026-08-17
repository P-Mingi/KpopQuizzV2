# Workstream V - new game formats (Sort It, Match-Up, Name Them All)

## Claude Code Implementation Prompt

---

Three new game modes adopted from the proven Sporcle/JetPunk formats (owner-validated
analysis: binary classify 462.9K plays, match-up 247.5K, type-them-all = JetPunk's
whole 8.9M-visit model), rebuilt K-pop-native on OUR substrate with OUR house systems.
The point is not cloning their 2010 table UIs - it is taking the proven MECHANIC and
wrapping it in the living platform (identity, streaks, share, daily, SEO).

Hard rules: NO em dashes. REAL DATA ONLY - every playlist generated from the real
groups/songs/members tables, min-volume gated, never padded. Commit per step, do NOT
push. New public routes -> route allowlist, check:routes green. Pages static/ISR,
NANO-cheap queries, safeFetch. Dual-skill /ui-ux-pro-max + /frontend-design on every
game UI. Mobile-first 430px reference; dark/light parity; reduced-motion respected.

## House-systems contract (EVERY mode, non-negotiable)

1. Result screen ends with <ResultLoop> (game types: widen the union with 'sort-it',
   'match-up', 'name-them-all' - reuse, do not fork).
2. Analytics: existing events only (game_start / game_complete with the new type
   values, share_click via ResultLoop).
3. Daily eligibility: launched via ?daily=game -> completeDaily('game') on finish
   (mirror name-all). GOTD rotation integration is Phase V3 step, not per-mode.
4. Share text per mode (spoiler-free, score + challenge framing).
5. SEO: each playlist = a static page with honest metadata + ItemList-free simple
   WebPage JSON-LD, sitemap, breadcrumbs. Head-term targets: "kpop boy group or
   girl group quiz", "kpop song match game", "name all kpop groups" etc.
6. Games hub: one new mode card per shipped phase (grid 4 -> 5 -> 6 -> 7; the lean
   picker design holds; real counts on cards).
7. No new npm dependency. No new hot-path DB writes v1 (results are client-state;
   the streak call is the only write). Leaderboards = NOT v1 for any mode (decide
   later with real volume; avoids empty boards).

## Phase V1 - "Sort It" (binary classification, the cheapest proven win)

**Mechanic:** a stack of item cards, two buckets, tap left/right (or swipe). 50-100
items per playlist, no typing, speed-run feel. Progress bar, running score, instant
right/wrong flash, end = score + accuracy + time + wrong-answers review list.

**Playlists (programmatic, from real DB columns - verify counts before enabling):**
- Boy group or girl group? (groups.gender; the 462.9K-play format; per-gen variants
  when a gen has >= 30 groups with gender set, else one sitewide list)
- Title track or b-side? (songs.is_title_track, per group for groups with >= 20
  songs, + one all-kpop mix)
- 3rd gen or 4th gen? (groups.generation, only gens with enough entries)
- Company sort: JYP or SM? HYBE or YG? (only if a company column/derivable field
  EXISTS - verify; if not, SKIP, do not hand-author)
A playlist ships only if its query returns >= 30 real items. Report the enabled
list with counts.

**Routes:** /games/sort-it (index of playlists) + /games/sort-it/[slug]. Item order
shuffled client-side per run (replay value); the item SET is baked at ISR.

**Steps:** V1.1 engine + one playlist end-to-end. V1.2 all qualifying playlists +
index + SEO. V1.3 hub card + ResultLoop + daily wiring + analytics. V1.4 verify
(counts vs DB spot-check, mobile swipe + tap both work, a11y: buttons not just
swipe, screenshots). Commit each.

## Phase V2 - "Match-Up" (pair matching)

**Mechanic:** two columns of tiles (or one shuffled grid on mobile), tap one from
each side to pair. Correct = both lock green; wrong = shake, small time penalty.
12-16 pairs per round, timer counting UP (finish time = the score). End = time +
mistakes + review.

**Playlists (programmatic):**
- Song -> its group (songs + groups, per-gen and all-kpop mixes)
- Idol -> their group (name_all_members rosters, flagship groups)
- Song title halves ("DDU-DU" -> "DDU-DU") ONLY for titles that split naturally:
  detect multi-word titles >= 2 words from the songs table; single-word titles
  excluded. If the natural-split pool is < 12 pairs per playlist, drop this
  playlist type rather than inventing splits.
Gate: >= 12 real pairs per playlist.

**Routes:** /games/match-up + /games/match-up/[slug]. Pairs sampled per run from
the playlist pool (bigger pool = replay).

**Steps:** V2.1 engine + one playlist. V2.2 playlists + index + SEO. V2.3 hub card
+ house wiring. V2.4 verify (pair correctness spot-check 10 pairs vs DB, timer
fairness on slow devices, screenshots). Commit each.

## Phase V3 - "Name Them All" (the JetPunk core, generalized)

**Mechanic:** the EXISTING name-all engine (type-with-timer + fuzzy matching +
found-grid) generalized beyond members. Read name-all-player.tsx first: extract the
engine (input matching, timer, reveal grid) into a reusable core WITHOUT breaking
the existing member games (they keep working unchanged - regression test them).

**New dataset types (programmatic):**
- Name all TITLE TRACKS of {group} (songs.is_title_track per group, >= 8 to ship)
- Name all {gen} groups (groups.generation, >= 15 to ship)
- Name all groups from {debut year} (if debut year exists on groups - verify)
- Name ALL the groups (the 87-count flagship page, JetPunk-style long grid)
Answer matching: reuse the existing fuzzy matcher; add per-dataset aliases where the
songs/groups tables already store alternates (verify what exists - do not invent
aliases).

**Grid display:** unrevealed = blank cells with category hints (like JetPunk),
revealed = name + (photo/logo where the dataset has one). Give-up reveals all.

**GOTD rotation (this phase):** add 'sort-it' and 'match-up' and the new
name-them-all datasets to the GOTD ROTATION pool (the documented extension point),
so the daily slot now rotates across 5 mode families.

**Steps:** V3.1 engine extraction + regression (member games unchanged, verified).
V3.2 new datasets + pages + SEO. V3.3 hub card update (name-all card becomes "Name
Them All" with the wider promise) + GOTD rotation extension. V3.4 verify (dataset
counts vs DB, fuzzy matching spot-checks incl. punctuation-heavy names like
(G)I-DLE and f(x), regression suite green, screenshots). Commit each.

## Phase order and shipping

V1 -> V2 -> V3, each phase independently shippable (push-ready at each phase end).
If any phase's data gates leave it with < 2 playlists, STOP and report instead of
shipping a thin mode.

## Global verify (end of each phase)
- [ ] All playlists real-data, gates enforced, enabled list reported with counts
- [ ] House contract: ResultLoop + analytics + daily + share + SEO + hub card
- [ ] Mobile 430px + desktop, dark/light, reduced-motion, a11y (tap alternatives
      to swipe, focus states, aria on game state)
- [ ] tsc, build, check:routes green; zero em dashes; pages static/ISR; no new
      dependency; no new hot-path writes
- [ ] Existing games untouched and regression-checked where shared code moved

/caveman report per step: enabled playlists with real counts, engine decisions,
screenshots, deviations.
