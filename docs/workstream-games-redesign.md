# /games redesign - lean picker (owner-approved)

## Claude Code Implementation Prompt

---

Rebuild /games per the audit (docs/games-ux-audit.md) + the owner-approved lean-picker
design. The page becomes a MODE PICKER, not a catalog. Target: ~1.5 screens, desktop
1100px, honest copy. Dual-skill /ui-ux-pro-max + /frontend-design. NO em dashes. Real
assets + real data only. Commit per step, do NOT push. check:routes green.

## Target structure (top to bottom)

1. **Hero:** "Games" + honest subtitle ("Guess songs, pick sides, name members, find
   your match." or similar - NO stale mode counts).
2. **Game of the day strip:** slim one-liner (existing GOTD data): icon + "Game of the
   day: {title}" + countdown-aware Play. Reuse the community daily-strip pattern.
3. **Mode grid, 4 cards** (2x2 desktop, stacks mobile), in this order:
   a. Which member are you? (NEW badge, accent border, links /games personality
      section index or the games-hub personality tiles page - whatever P shipped as
      the index; 15-group count real)
   b. Blind test -> /blindtest (real song count, mention daily)
   c. This or that -> /games/this-or-that/all (real category count)
   d. Name all members -> /games/name-all index (real roster count)
   Each card: icon, name, one real-stat line. All counts from real queries baked at
   ISR, formatCount style.
4. **Live ranking teaser:** exactly ONE published fan ranking (most recent live) +
   "All rankings" -> /rankings. If zero live rankings, the teaser hides entirely.
5. Nothing else. DELETE from this page: the inline 20+ ToT category cards, the inline
   24 name-all cards, the 9 grey vote-to-unlock tiles, the group filter, the stale
   "Two game modes" hero copy, the detached personality section (it merges into the
   grid as card a).

## Rules

- Container: widen .games-page to 1100px max (desktop); mobile unchanged 430px column
  behavior. Do NOT globally change .games-page if other routes share the class -
  check first, scope if needed.
- The catalogs live on: /games/this-or-that/all, /rankings, the name-all index, the
  personality tiles - all already exist (U-1 + P). Verify each link 200s logged-out.
- GamesHub component: personality moves INSIDE it (one component renders the whole
  page). Remove now-dead data fetches from the page (the 20-category + 24-game
  inline queries leave; only counts remain - cheap count queries or reuse cached).
- Keep JSON-LD (update the ItemList to the 4 modes + rankings), metadata refresh
  (honest description), sitemap unchanged.
- ISR stays; page should get FASTER (fewer queries, less HTML).
- Mobile tab bar + nav links to /games unchanged.

## Steps
1. New GamesHub structure + mode grid + hero + daily strip. Commit.
2. Ranking teaser + deletions + dead-query cleanup. Commit.
3. Container width + responsive pass (430px, 768px, 1280px) light/dark. Commit.
4. Verify: all links 200 logged-out, counts real (spot-check 3 vs DB), JSON-LD valid,
   page weight before/after (HTML bytes), check:routes, tsc, build, zero em dashes.
   Commit.

/caveman report per step with screenshots (mobile + desktop, light + dark) and the
before/after page-weight numbers.
