# G-HUB v2 - fork worker REPORT (play-ghub)

Caveman mode. This is the PLAY fork report (Games hub redesign, ledger
L-032..L-034), separate from the main worker's Verse REPORT on `main`.

Branch `play-ghub`, off base `79577c4`. NEVER pushed, NEVER merged, main never
touched. Owner reviews + merges (owner act, not mine).

## Commits (one per step, plus one bug fix)

- `dc5f7d0` step 1 - inventory + BEFORE indexable baseline
- `6d10596` step 2 - new hub page per prototype
- `d393716` step 3a - registry lobbies as image mode-card grids
- `a616b5c` step 3b - DB lobbies CSS-art (legal wall) + tot mapping fix
- `d175538` step 4a - variant auto-start + last-played (registry games)
- `a55bcc5` step 4b - in-game mode rail (registry games)
- `30cb784` step 5 - daily ranking rotation (date-deterministic, ISR-safe)
- `5dc2227` step 6 fix - namespace collision `.ghub-` -> `.gh2-`
- `2fae286` step 6 - sweep + render verification

## What built

- Hub /games rebuilt to prototype: no hero carousel. Slim header ("Pick your
  game. You're in, in one tap." + "1 tap = playing") -> TODAY rail (blind test of
  the day + real streak, min-gate; K-pop Idle coming-soon teaser = non-link div)
  -> ALL GAMES grid of CSS-art photocard tiles, each two actions (Play -> default
  variant, "All modes . N" -> lobby, N>=2) -> live-ranking bar.
- 5 lobbies -> image mode-card grids (CSS-art covers).
- Variant pages AUTO-START on 3 registry games (sort-it, match-up, name-them-all):
  interstitial dead, game plays on arrival, SEO copy (H1 + intro + JSON-LD) stays
  server-rendered above. this-or-that already auto-starts.
- In-game mode rail on the 3 registry games: CSS-art image cards, links to live
  siblings, current highlighted. Cross-links siblings (SEO).
- Last-played memory: players write {game:slug} to localStorage; hub upgrades
  Play href client-side (server href stays crawlable default).
- Daily ranking rotation: pickDaily() picks by UTC day, deterministic, ISR-safe.

## Findings (bugs found + fixed by the sweep)

1. LEGAL WALL (step 3b): /games/this-or-that/all + /games/name-all showed idol
   photos (top_entity.image / item.image_url). Replaced with CSS-art. 0 idol
   refs after. Proof: step3b/legal-wall.txt.
2. TOT MAPPING INVERSION (step 3b): step 2 sent Play -> catalog, All modes ->
   game (backwards). /games/this-or-that IS the game; /all is the catalog. Fixed.
3. CSS NAMESPACE COLLISION (step 6): `.ghub-*` is the pre-existing GROUP-hub
   namespace; my games-hub reused it (.ghub-hero/-play/-tile collided, group-hub
   rules won on /games). Renamed my whole namespace to `.gh2-*`. Proven fixed:
   .gh2-play computed bg = --brand in the browser. Proof: step6/collision.txt.

## BEFORE/AFTER indexable diffs (non-byte-identical, justified per SEO parity law)

Per-step diffs live in docs/proofs/ghub-v2/step*/parity*.md. Summary of the
non-identical ones (all identical-or-richer, zero links/headings lost):

- HUB (step2/parity-diff.md): every BEFORE link kept (personality, blindtest,
  this-or-that/all, name-them-all, sort-it, match-up, rankings, rankings/{g}/{t});
  ADDED variant deep-links + /battle + /games/this-or-that. One H1. JSON-LD
  ItemList kept + Duel added. Card microcopy reworded per prototype (names +
  links intact); blind test moved to TODAY rail (link kept); eyebrow "Games"
  dropped (nav tab + H1 still name the page). Justification: the locked redesign.
- LOBBIES (step3/step3b): covers ADDED only (aria-hidden art); H1, header, variant
  links, JSON-LD unchanged. this-or-that/all: dropped decorative idol <img alt="">
  + arrow (legal wall) - no indexable text/link lost.
- VARIANT PAGES (step4a): page H1 + intro + JSON-LD untouched; killing the
  interstitial DROPS a duplicate h2, cleaner headings. Mode rail (step4b) ADDS
  sibling links (richer). One H1 each.
- RANKING BAR (step5): still emits /rankings/{g}/{t} + /rankings every day; only
  the featured ranking rotates. Link set unchanged.

## Verification (step 6)

- Production `next build`: EXIT 0, 606/606 static pages, 0 errors. Variant pages
  prerender as SSG. Proof: step6/build.txt.
- Browser render (worktree dev server :3099): hub faithful in LIGHT + DARK, no
  hydration errors; sort-it variant AUTO-STARTS (game playing, timer, mode rail,
  no interstitial); 375px no horizontal overflow, 44px+ targets; collision fix
  proven live. Proof: step6/verification.md. (Screenshots inline in session; the
  in-app browser has no disk-capture path - documented with measured state.)
- Known benign: React "script tag" dev warning x2 = the SEO JSON-LD scripts,
  pre-existing in the base, correct (JSON-LD must be a <script> for crawlers).

## Gates green

tsc 0 . check:routes 335 . build green . em-dash/en-dash 0 across all authored
files . collision resolved . no gate/test file edited (ratchet) . no push (law
15) . no new deps (law 16, prototype Unbounded/Instrument-Sans NOT added).

## Owner decisions flagged (not blockers)

- FONT: prototype uses Unbounded + Instrument Sans (Google Fonts). Rendered
  through the app's own fonts + Play tokens instead (law 16 + app pipeline). Want
  Unbounded display face? Say so, scoped add.
- name-all placement: kept as its own rosters lobby + the name-them-all cross-
  link (not folded into name-them-all). Reconcilable if you prefer folding.
- Duel 1v1 tile -> /battle (no /duel route exists).

## DEFERRED (honest gap, flagged - NOT done)

- name-all (Name All Members) auto-start + in-game mode rail: name-all-player is
  structurally different (inline conditional render, plain startGame(), roster
  variants) - higher render-blind risk, so NOT auto-started. Its "Start game"
  interstitial is STILL LIVE. Its lobby got the legal-wall CSS-art fix (done).
  Recommend doing its auto-start next with a live render check.

## Status

Steps 1-6 substantially DONE + verified (build + browser). One deferred gap
(name-all auto-start/rail) flagged above. Nothing pushed, nothing merged, main
untouched. Awaiting owner + Cowork review.
