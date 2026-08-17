# /games UX audit (for cowork)

Report only. No code changed. Audit of `http://localhost:3021/games` as it renders
today, from the live page + the source (`src/components/game/games-hub.tsx`,
`src/app/games/page.tsx`, `.games-*` in `globals.css`). Handoff input for a UX
redesign; findings and options, not a prescribed final design. No em dashes.

## 1. What the page is right now

The page is TWO things stacked into one: a game-picker landing page AND a full
catalog dump of every This-or-That category and every Name-all challenge. Section
order as rendered (`games-hub.tsx`):

1. **Hero** (`games-hub.tsx:101`) - eyebrow "Games", headline "Pick. Type. Win.",
   subtitle.
2. **Mode grid** (`:113`) - 4 GameModeCards in a 2x2: This or That (Most played),
   Name all members, Blindtest (New), 1v1 Battle (New).
3. **Fan rankings strip** (`TrendingRankingsStrip`, `:156`) - horizontal scroll,
   top 10 duel rankings.
4. **Filter row** (`:159`) - pills All / Stray Kids / TWICE / ... that filter the
   two sections below.
5. **This or That** section - "See all 20+", a grid of ~20 category cards.
6. **Name all members** section - "See all 24+", a grid of ~24 challenge cards.
7. **Which member are you?** section (personality, appended in
   `games/page.tsx`, OUTSIDE `GamesHub` and OUTSIDE the filter) - 15 group tiles.

Container: `.games-page { max-width: 800px; margin: 0 auto }` (`globals.css:1502`).

## 2. Key problems (prioritized)

### P1 - This or That is surfaced three times
The same game appears as (a) the "This or That" mode card (`:114`), (b) the entire
"Fan rankings" strip (`TrendingRankingsStrip`, which IS duel/matchup data), and
(c) a full "This or That" section with a 20+ category grid + its own filter. A
first-time visitor meets This-or-That three times before reaching anything else,
and cannot tell that the fan-rankings strip and the This-or-That section are the
same underlying game. This is the single biggest source of visual noise and
confusion on the page.

### P1 - Desktop layout wastes ~60% of the width
`max-width: 800px` centered means on a 1280px+ screen the entire page is a narrow
column with ~240px of empty margin on each side. The 2x2 mode grid, the catalog
grids, everything is cramped mid-screen. This is a mobile-first layout never
adapted for desktop (same class of issue U-5 flagged for /quizzes). A games hub
is a lean-back, browse-heavy surface where desktop users expect a wide grid.

### P1 - The page tries to be a landing page and a full catalog at once
Showing all ~20 This-or-That categories AND all ~24 Name-all challenges inline
makes the page extremely long (2 large card walls of visually near-identical
cards) and blurs the job. Is this "pick a game" or "browse every challenge"? The
"See all 20+" / "See all 24+" links exist (good, and now land on real indexes per
U-1), but the page still dumps the near-complete lists below them, so the links
feel redundant and the page never ends.

### P2 - Stale / inaccurate hero copy
Subtitle (`:109`): "Two game modes, hundreds of challenges." There are at least
FOUR modes (This or That, Name all, Blindtest, 1v1 Battle) plus Fan rankings plus
the new personality quizzes. The count is wrong and undersells the hub.

### P2 - The newest, most viral format is buried last and detached
"Which member are you?" (personality) sits at the very bottom, after the 24-card
Name-all wall, and is rendered outside `GamesHub` so it is not covered by the
group filter and does not share the section styling/rhythm. It is the highest
share-velocity format on the page and currently the least visible.

### P2 - Fan-rankings strip is mostly empty state
Of the ~10 trending cards, one is a live ranking and the rest read "Vote to
unlock" (grey placeholder tiles). The strip that is supposed to showcase fan
rankings mostly showcases things that do not exist yet, which reads as
unfinished. This is honest (they genuinely have not crossed the vote threshold),
but visually the empty state dominates.

### P3 - Name-all cards use cryptic initial-letter avatars
Each Name-all card shows stacked single letters (H, J, Y, J, ... +2) as member
placeholders. They are unrecognizable and add visual clutter without conveying
which group it is beyond the title.

### P3 - Inconsistent card "stat" lines
Mode cards mix concrete stats ("20+ categories", "3.9k songs, Gen 1-5") with a
vague one ("Anyone, anytime" for 1v1 Battle). The Battle card underperforms the
others on information scent.

### P3 - The group filter only meaningfully applies to Name-all
Selecting a group hides This-or-That entirely (it is cross-group) and filters
Name-all. So the filter silently removes a whole section, which is a confusing
state change, and it does not touch the personality section (which is per-group
and would be the most natural thing to filter).

## 3. Content / data reality (what a redesign must respect)

- 4 real game modes + Fan rankings + 15 personality quizzes. All real, all
  playable.
- This-or-That: ~20 real categories, play counts ~107-213 (modest but real).
- Name-all: ~24 real challenges with difficulty + timer + play counts (64-99).
- Fan rankings: 1 live, ~9 locked "vote to unlock" (real threshold gating).
- Personality: 15 groups, real member photos, real (currently zero) fan counts.
- Blindtest: 3.9k songs. 1v1 Battle: real.

Everything is real data, so a redesign does not need fabricated filler; it needs
better prioritization and density.

## 4. Opportunities / directions (for cowork to weigh, not final)

- **Collapse This-or-That to one presence.** Pick ONE home for it (either the
  mode card leading to the /games/this-or-that index, or an inline strip, not
  both + the fan-rankings duplication). Consider merging "Fan rankings" and "This
  or That" conceptually since they are the same engine (play = vote = ranking).
- **Split "hub" from "catalog."** Make /games a lean picker: the mode cards +
  a curated/trending row per mode + strong entry to each mode's full index. Move
  the exhaustive 20+/24+ grids off the landing page (they already have real index
  pages). The landing page should fit ~1.5 screens, not 6.
- **Go wide on desktop.** Raise/replace the 800px cap with a responsive grid so
  desktop shows a real multi-column game gallery; keep the single column on
  mobile.
- **Promote personality.** It is the viral format; it deserves a top-tier slot
  (a mode card or a prominent band near the top), not the basement, and should
  share the section system.
- **Fix the hero copy** to the true mode count and lead with the strongest hook.
- **Rethink the empty-state-heavy rankings strip** (show fewer, or frame the
  locked ones as a single "help unlock" affordance rather than 9 grey tiles).
- **Replace initial-letter avatars** on Name-all cards with the real group logo
  or a cleaner single mark.

## 5. Open questions for the redesign brief

1. Is /games meant to be a lean picker (send people INTO each game's own index)
   or a full browseable catalog? The current page is both; the redesign should
   pick one primary job.
2. Where should the personality quizzes rank against the older modes on this
   page (top-tier mode, its own band, or a tile row)?
3. Should "Fan rankings" and "This or That" be unified into one surface, given
   they share the duel engine?
4. Desktop target: how wide, how many columns, and is there an appetite to make
   /games a genuinely desktop-first gallery vs just un-capping the width?
5. Keep the group filter? If so, it should apply to everything per-group
   (Name-all + personality), and its section-hiding behavior needs rethinking.

## Appendix - primary files
- `src/components/game/games-hub.tsx` (all sections + the filter logic)
- `src/app/games/page.tsx` (data fetch + the appended personality section)
- `src/components/game/trending-rankings-strip.tsx` (fan-rankings strip)
- `src/components/personality/personality-entry.tsx` (personality hub section)
- `.games-*`, `.gm-*`, `.pqh-*` in `src/styles/globals.css` (`:1499+`)
