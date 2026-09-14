# MISSION (GAMES HUB REDESIGN - rebuild /games pixel for pixel from the validated artboards. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's BLOCKED.md, stop.

**`cat` this whole file, then `cat docs/design/games/README.md`.** The owner validated the new
/games design 100 percent. Your job is to make the live page look exactly like it. This is a
pixel-fidelity mission, not a creative one: the artboards decide, you execute. Use
`/ui-ux-pro-max` and `/frontend-design` for craft (spacing, states, motion, a11y), never to
reinterpret the layout. Same rule as always: if you cannot finish a PART honestly, STOP at a clean
PART boundary and REPORT what is done and what remains. Do not widen scope.

The COST mission that was on this bus is parked at `docs/loop/queue/MISSION-cost.md`. Do NOT
start it. But respect its spirit here: this redesign must add ZERO new server work per request
(see the COST FENCE below).

## SOURCE OF TRUTH
`docs/design/games/` (committed with this mission):
- `Main.dc.html` (1440) and `Mobile.dc.html` (390): the page. `preview/*.html` opens standalone
  with the photos inlined; `renders/*.png` are the full-page renders at exact width with DM Sans
  loaded. The renders are the pixel oracle.
- `CardAnatomy.dc.html` + `renders/CardAnatomy.png`: the five zones of a card and the build
  notes (preview 196px on surface-alt, faces 58px at 12px radius, timer as an ink pill, title
  18/800, hook 14 in txt2, stat 12/600 in txt3, Play = the site's primary button at 36px, icons one
  2px-stroke set at 14 to 18px).
- `MidPlay.dc.html` + `renders/MidPlay.png`: the daily band in play state (PART C only).
- `README.md`: the photo mapping (artboard short names to `/idols/` files), the tokens, and the
  list of SAMPLE values that must never ship as literals.
Reconcile every value against `apps/quiz/src/styles/globals.css` (rose #E8457A, #D13A6E button,
cream #FAF8F5, DM Sans, plum/violet, radius 20, shadow-lift). globals.css wins on any discrepancy;
list each one you hit in the REPORT.

## WHAT EXISTS (reuse, do not rewrite from zero)
- `src/app/(site)/games/page.tsx`: `getGamesData` inside `unstable_cache` (3600s), the JSON-LD,
  `pickDaily(publicRankings)`, counts (nameThemAll / sortIt / matchUp / categories / personality).
  `src/app/(site)/pt/games/page.tsx` renders the SAME `GamesHub`; it must keep working.
- `src/components/game/games-hub.tsx` (the `gh2-*` layout, styled in `globals.css` from line
  ~2198), `blind-streak.tsx` (client streak), `hub-last-played.tsx` (client href upgrade),
  `trending-rankings-strip.tsx`, `games-daily-strip.tsx`.
- Routes the cards point at (unchanged): Name Them All `/games/name-them-all`, Sort It
  `/games/sort-it`, Match-Up `/games/match-up`, This or That `/games/this-or-that/all` (Vote on the
  live ranking: `/rankings/<group>/<type>`), Which member `/personality`, Duel `/battle`, Tier
  Lists `/tier-list`, daily blind test `/blindtest`, all rankings `/rankings`.
- Photos: `apps/quiz/public/idols/` (see README mapping). Use the existing image component and
  sizing the tier-list maker uses for faces; do not add image files to the repo.

## PART A - THE HUB, DESKTOP AND MOBILE, PIXEL FOR PIXEL
Rebuild `GamesHub` (and its CSS) to match `Main.dc.html` at 1440 and `Mobile.dc.html` at 390:
1. Header: kicker "Games", H1 "Prove it.", the sub line, and the two chips top-right (desktop) /
   under the sub (mobile). Chip 1 "N fans playing today": ONLY with a real number from a read that
   lives INSIDE `getGamesData` (one hourly-cached count of plays in the last 24h, or an equivalent
   cheap indexed read). If no cheap real read exists, drop the chip and say so. Chip 2 "Your
   streak: N days": from `BlindStreak`'s existing client logic; hidden when there is no streak.
2. The daily band (the single dark element on the page): kicker with the live countdown to the
   daily reset (client-side, same reset rule the daily blind test actually uses; confirm it and
   name it in the REPORT), the H2 "Name the song from a 10-second clip." (mobile keeps
   "10-second" on one line), the sub line, the waveform (CSS only; bars 9 to 17 in rose), the white
   "Play today's" button to `/blindtest`, the streak pill, the "N played today" note (same rule as
   chip 1: real or absent). The four answer chips on the right: real song titles from the catalog
   picked deterministically per UTC day with `pickDaily` over the cached data, none marked as
   picked in the hub state (the picked state belongs to PART C). Never the answers of today's
   actual daily.
3. "All games" header with the line "See the game before you play it." and the five filter
   chips All / Solo / Timed / Versus / Vote. Client-side filter over the card list, no fetch.
   Tags: Solo = Name Them All, Sort It, Match-Up, Which member, Tier Lists, K-pop Idle; Timed =
   Name Them All, Sort It, Match-Up; Versus = Duel; Vote = This or That. Active chip = brand-light
   fill, brand-dark text.
4. The eight cards in a 2-column grid (desktop) / one column (mobile), in this order: Name Them
   All, Sort It, Match-Up, This or That, Which member are you, Duel 1v1, Tier Lists (badge "New"),
   K-pop Idle (dimmed, last). Each card = the real-game-state preview from the artboard with the
   REAL faces from `/idols/`, the title, the one hook line (copy verbatim from the artboard), one
   stat, one count chip, one primary action with the verb from the artboard (Play / Vote / Play /
   Find a duel / Start ranking / Notify me). Preview tiles are static illustrations of the
   mechanic; their timers and states must be consistent with the real rules (verify Sort It's
   round length and Match-Up's board time in `src/lib/games/*` and use the real values in the
   stat lines).
   Data rules per card (SAMPLE values from the README must never ship):
   - Name Them All: chip = the real nameThemAll count; stat "Your best: X of Y" only if
     HubLastPlayed/local state holds a real best, else "Beat the clock, all members".
   - Sort It: chip = real sortIt count; stat = the real seconds per round.
   - Match-Up: chip = real matchUp count; stat = the real board time.
   - This or That: chip = real categories count; stat "N votes" from `liveRanking.total_votes`
     (no "today" unless the number is a real daily count).
   - Which member: chip "All groups" or the real personality count; stat "Made for sharing".
   - Duel: chip "Ranked"; stat "Elo, best of 7" unless a real online-now count exists.
   - Tier Lists: chip "Any group"; stat "Just launched"; badge "New".
   - K-pop Idle: dimmed as drawn. "Notify me" ONLY if a real notify/subscribe mechanism exists in
     the repo (notifications, newsletter). If none exists, render the pill as non-interactive
     text "Coming soon" in the same slot and state the deviation. No dead buttons.
5. The rankings strip (live ranking, "#1 <entry> · N votes · changes daily", Live chip, Vote,
   All rankings) exactly as drawn, from `liveRanking`. The yellow "What changed and why" note at
   the bottom of Main is a canvas annotation, NOT page content: do not build it.
6. Nav: the artboards show the existing TopNav; do not rebuild it. Mobile artboard shows a
   bottom tab bar as a stand-in for the site's existing mobile nav: do NOT add a tab bar. Keep
   whatever mobile nav the site has today.
7. `/pt/games`: same component. If the pt page already carries translated hub strings, translate
   the new strings the same way; if it does not, English copy with the same layout, and say so.
8. Motion and states (from the skills): hover lifts a card to shadow-lift; press scales 0.98;
   chips and buttons have visible focus rings; `prefers-reduced-motion` stops the waveform; every
   face has alt text (the idol's name); every icon-only control has an aria-label. No emoji
   anywhere; icons from the repo's existing SVG set at 2px stroke.

## PART B - SEO AND METADATA (keep the crawl win)
Metadata title/description/canonical/hreflang unchanged. JSON-LD ItemList gains Tier Lists
(`https://kpopquiz.org/tier-list`) after Duel. Every card and the band stay crawlable server
HTML (the filter only hides with CSS/state, it never removes the cards from the HTML). Route
allowlist, sitemap, robots unchanged. All five SEO gates green.

## PART C - THE DAILY BAND BECOMES THE GAME (only if it costs nothing on load)
`MidPlay.dc.html` says the tap does not navigate: the same band becomes the game (wave animates,
CTA becomes "Answer", chips light up). Do this ONLY if the existing blind test player can be
mounted inside the band lazily on tap (dynamic import, nothing fetched before the tap) without
changing `/blindtest`, without a new API route, and without any new request on page load. If
that is not true within this mission, keep "Play today's" as a link to `/blindtest`, leave the
MidPlay artboard as the target for a later mission, and say so plainly. Either outcome is
acceptable; a half-mounted player is not.

## COST FENCE (hard)
- Zero new server reads per request: everything new lives inside the existing `getGamesData`
  `unstable_cache` (3600s). No new API route. No client fetch on page load (countdown and filter
  are pure client state). No new `force-dynamic`. No new middleware matcher.
- Prove it: `next build` route table for `/games` and `/pt/games` unchanged in render mode, and a
  `next start` request log showing the page makes no request beyond today's.
- Do not touch Verse. Do not start the parked COST mission.

## AUTOMATED TESTS (extend the harness, required)
- e2e (Playwright, desktop + mobile projects): /games renders the band + 8 cards with 8 face
  images actually loaded (`naturalWidth > 0`); the band CTA links to `/blindtest`; Tier Lists
  card links to `/tier-list`; each filter chip shows exactly its set and All restores 8; at 390
  `document.documentElement.scrollWidth === 390` (no horizontal overflow); no emoji in the page
  text; `/pt/games` renders the same eight cards.
- unit (vitest): the filter tag map (each game in the right set), the daily answer-chip picker
  (deterministic per UTC day, never today's real answers if that data is reachable), the
  countdown-to-reset helper.
- Full suite green on `next build` + `next start`, never dev. CI green on the CURRENT head of
  your branch, both jobs running real steps.

## PROOF BATTERY (docs/proofs/games-hub/, prove on build + start, never dev)
1. Full-page screenshots of /games at 1440 and at 390, side by side with
   `docs/design/games/renders/Main.png` and `Mobile.png`, plus a pixel diff per pair (pixelmatch
   or equivalent, same viewport, fonts loaded). State the diff percentage and list EVERY visible
   deviation with its reason (globals.css conflict, real data shorter/longer than sample, a
   mechanism that does not exist). A deviation with no reason is a bug to fix.
2. Each card cropped beside its artboard crop (8 pairs).
3. The hover / focus / reduced-motion states (screenshots or a short note per state).
4. The data-honesty table: for every SAMPLE value in the README, what replaced it and where the
   number comes from.
5. Route table before/after for /games and /pt/games; the request-log proof for the cost fence.
6. Tests: full run output, unit + desktop + mobile, all green; the CI run URL on the current head.
7. Five SEO gates green. No em dashes. Zero emoji.

## SCOPE FENCE / GATES
Branch `feat/games-hub-redesign` from `main` (ba1aaf1). Note: `feat/tierlist-social` carries an
unpushed commit e93315d (OG share card sizing); leave it alone, do not merge it, mention it in
the REPORT. Only /games, /pt/games, `GamesHub` and its children, the `gh2-*` CSS (rename freely),
tests and proofs. No other page. No change to /blindtest, /battle, /tier-list, /personality or
any game route. No DDL, no env, no push. No "while I am here". No em dashes anywhere. If you find
a real adjacent bug, name it in the REPORT as a candidate, do not fix it.

## WHEN DONE
Update `docs/loop/REPORT.md`: what shipped for each PART, the deviation list with reasons, the
data-honesty table, PART C's outcome, what each test covers, and the one owner gate that remains
(push). Recompute every number before you write it. Do not push. No em dashes.
