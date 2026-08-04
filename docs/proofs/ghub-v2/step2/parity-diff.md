# G-HUB v2 Step 2 - /games SEO parity diff (BEFORE vs AFTER)

Baseline: `docs/proofs/ghub-v2/step1/before/hub-indexable.txt` (base 79577c4).
After: the new hub (`games-hub.tsx`) + `page.tsx` JSON-LD.
Machine capture of AFTER hrefs: `docs/proofs/ghub-v2/step2/after-hrefs.txt`.

## HEAD

- title / description / canonical / alternates (en, pt-BR, x-default) / OG /
  twitter: UNCHANGED (metadata export not touched).
- JSON-LD CollectionPage ItemList: all 6 original items preserved; ADDED
  `Duel 1v1 -> /battle` (position 7); `K-pop Fan Rankings -> /rankings` shifted
  to 8, still conditional. RICHER, nothing removed.

## One-H1 law

AFTER hub `<h1>` count = 1 (grep proof). H1 text: "Pick your game. You're in,
in one tap." (was "Pick your game."). Same single H1, reworded.

## Link set (the load-bearing parity gate)

BEFORE (8): /personality, /blindtest, /games/this-or-that/all,
/games/name-them-all, /games/sort-it, /games/match-up, /rankings,
/rankings/{group}/{type}

AFTER (13): all 8 BEFORE links PRESENT, plus ADDED:
/games/name-them-all/{slug}, /games/sort-it/{slug}, /games/match-up/{slug},
/games/this-or-that, /battle

Result: identical-or-richer. ZERO links lost. The variant deep-links (Play) and
the lobby links (All modes) both appear, so the hub now points DEEPER than
before, never shallower.

## Text diffs (non-byte-identical, justified per the task's SEO parity law)

Every difference below is copy/structure from the L-032..L-034 locked redesign;
no indexable link or heading is lost.

1. Sub reworded: "Guess songs, pick sides, name members, find your match." ->
   "No lobby screens. Every button below drops you straight into play."
   Justification: the prototype's promise line. Supporting copy, not a heading.
2. Eyebrow "Games" removed. Justification: the redesign has no eyebrow; the H1 +
   nav "Games" tab still name the page. Not an indexable heading (was a span).
3. Blind test moved from a grid card to the TODAY rail and renamed "Blind test
   of the day". Its /blindtest link + descriptive text are KEPT. Justification:
   L-032 TODAY rail. Link preserved.
4. Game card descriptions shortened to one honest line each (prototype). Game
   NAMES preserved (minor casing: "Sort it" -> "Sort It", "This or that" ->
   "This or That", "Which member are you?" -> "Which member are you").
   Justification: photocard microcopy per the prototype; names + links intact.
5. ADDED visible text: hint "1 tap = playing", "K-pop Idle" coming-soon teaser
   (min-gate: static `<div>`, NO link), "Duel 1v1" tile, "All modes . N" chips,
   "changes daily" badge. All richer.

## Min-gate + real-data checks

- "K-pop Idle" is a non-link `<div>` with a "Coming soon" tag: teaser only, no
  dead door (law 5).
- "All modes . N" chip renders only when N >= 2 (single-mode games personality /
  duel show Play only).
- Blind-test streak (`BlindStreak`) reads /api/daily/streak and renders nothing
  when streak <= 0 (anon or none): no fabricated number (laws 5 + 10).

## Gates green

- tsc: 0 errors (docs/proofs/ghub-v2/step2/tsc.txt).
- check:routes: passed (docs/proofs/ghub-v2/step2/check-routes.txt).
- em/en-dash scan of changed files: clean.

Note: /pt/games mirrors the hub and was updated the same way (drop game-of-the-
day, add registry counts, new GamesHub call). Its pt metadata + JSON-LD are
unchanged; its link set matches the en hub (identical-or-richer).
