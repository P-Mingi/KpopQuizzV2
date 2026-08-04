# G-HUB v2 - Step 1 inventory + BEFORE indexable baseline

Chantier: Games hub redesign (G-HUB v2, ledger L-032..L-034).
Branch: `play-ghub` (fork worker). Base: `79577c4` (local main, V-BUILDER-2 step 2).
Design contract: `prototypes/games-hub-v2.html` (owner-locked, copied into this worktree).

NOTE on base: my prior-session Play games work (the spotlight hub + extra Sort
It / Match-Up games) lives on `origin/main`, NOT on this base `79577c4`. This
chantier redesigns from the base as instructed (`git worktree add ... -b
play-ghub` off HEAD). The G-HUB v2 design supersedes the spotlight approach
(L-032 forbids a hero carousel), so building from the pre-spotlight base is
correct. The owner reconciles at merge.

## Routes I will touch

| Route | File | Step | Change |
|---|---|---|---|
| `/games` (hub) | `app/games/page.tsx` + `components/game/games-hub.tsx` | 2, 5 | New hub: header, TODAY rail, photocard grid (2 actions/tile), rotating live-ranking bar |
| `/games/name-them-all` (lobby) | `app/games/name-them-all/page.tsx` | 3 | Image mode-card grid, every card = instant play |
| `/games/name-them-all/[slug]` (variant) | `.../[slug]/page.tsx` | 4 | Auto-start; keep SEO copy server-rendered; in-game mode rail |
| `/games/sort-it` + `[slug]` | `app/games/sort-it/**` | 3, 4 | Same lobby + auto-start pattern |
| `/games/match-up` + `[slug]` | `app/games/match-up/**` | 3, 4 | Same |
| `/games/this-or-that` + `/all` + `[slug]` | `app/games/this-or-that/**` | 3, 4 | Same |
| `/games/name-all` + `[slug]` | `app/games/name-all/**` | 3, 4 | Member rosters; lobby + auto-start |

Components in play: `games-hub.tsx`, `games-daily-strip.tsx`, `game-mode-card.tsx`,
`game-card.tsx`, `name-all-landing.tsx`, `tot-category-picker.tsx`,
`trending-rankings-strip.tsx`, and the players (`*-player.tsx`) for the in-game rail.

## Prototype tile -> app route map (the 6 hub tiles)

1. Name Them All -> `/games/name-them-all` (default variant auto-launch)
2. Sort It -> `/games/sort-it`
3. Match-Up -> `/games/match-up`
4. This or That -> `/games/this-or-that/all`
5. Which member are you -> `/personality`
6. Duel 1v1 -> `/battle` (no `/duel` route exists; `/battle` is the Elo 1v1). CONFIRM target.

TODAY rail: Blind test of the day -> `/blindtest`. "K-pop Idle" = static teaser
`<div>`, NO link (min-gate: coming-soon, not a dead door).
Live-ranking bar -> `/rankings` (+ the specific `/rankings/{group}/{type}`).

## BEFORE indexable set - the parity baseline (must stay identical or richer)

`/games` head: title "K-pop Games: Blind Test, This or That, Which Member";
canonical `/games` (+ en / pt-BR / x-default); OG + twitter; CollectionPage
JSON-LD ItemList of 6 games (+ Fan Rankings when a live ranking exists).

`/games` body (one H1 law holds): H1 "Pick your game."; eyebrow "Games"; sub
"Guess songs, pick sides, name members, find your match."; six mode cards with
name + description text, each an `<a href>`:
- Which member are you? -> `/personality`
- Blind test -> `/blindtest`
- This or that -> `/games/this-or-that/all`
- Name Them All -> `/games/name-them-all`
- Sort it -> `/games/sort-it`
- Match-Up -> `/games/match-up`
plus the live-ranking teaser -> `/rankings` and `/rankings/{group}/{type}`.

Full per-route source captures: `docs/proofs/ghub-v2/step1/before/*.txt`.

## SEO parity plan (law 1 gate for each step)

- Every BEFORE link above is preserved in the AFTER. Blind test moves from a
  grid card to the TODAY rail but keeps its `/blindtest` link + descriptive
  text. Duel 1v1 (`/battle`) is ADDED = richer (allowed).
- The CollectionPage JSON-LD ItemList is preserved (and may grow).
- One-H1 law: the new hub keeps exactly one H1 ("Pick your game. You're in, in
  one tap.").
- Variant `[slug]` pages: auto-start must NOT strip the server-rendered SEO copy
  (title, H1, description, links) - the game mounts around/under that copy.
- Proof per step: BEFORE/AFTER indexable diff (identical-or-richer), saved under
  `docs/proofs/ghub-v2/step<N>/`.

## Decisions deferred to Step 2 (noted, not blockers)

- Typography: the prototype uses Unbounded + Instrument Sans (Google Fonts). The
  L-032..L-034 lock is layout/behavior, not the typeface, and law 16 (no new
  deps) plus the app's existing font pipeline argue against adding two web
  fonts. Plan: render the prototype's structure/CSS-art through the app's
  existing display/body fonts and Play tokens. Will state the final call in the
  Step 2 report.
- Colour: prototype pink `#D63A6E` vs app brand `#E8457A`. UI colour routes
  through existing Play tokens; the decorative aria-hidden CSS-art covers use the
  prototype's gradient hexes (art, not semantic UI colour; `/games` is Play, not
  token-gated).
- `name-all` (member rosters) placement: a 7th game not in the prototype's
  6-tile grid. Plan: surface as variants under Name Them All's lobby + mode
  rail, not a separate hub tile. CONFIRM at the Step 3 gate.

## Baseline gates (green at start)

- `check:routes`: 335 page routes reachable (proof:
  `docs/proofs/ghub-v2/step1/before-check-routes.txt`).
