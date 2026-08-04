# G-HUB v2 step 4b - in-game mode rail (registry games)

## What shipped
GameModeRail: a server-rendered, horizontally-scrollable strip of image mode-
cards (CSS-art .lmc-g* covers, legal wall). Each card is a real <Link> to a
sibling variant URL that auto-starts on arrival (step 4a), so you switch modes
without an interstitial. Wired into the 3 registry variant pages (sort-it,
match-up, name-them-all), placed between the SEO header and the player.

## Correctness
- Min-gate (law 5): renders nothing when < 2 live variants (nothing to switch to).
- Real data (law 10): the sibling list is fetched and filtered to count > 0, so it
  never links to a below-gate variant (no dead door). The current variant reuses
  its already-fetched count; siblings are ISR-cached (revalidate 3600).
- Not a tablist: each variant is its own crawlable URL with its own data + SEO, so
  links (aria-current on the active one) are correct, not client tabs.

## SEO parity (law 1)
The mode rail ADDS internal links (every live sibling) to each variant page -
richer, nothing removed. The page H1 (game-intro-h1) stays 1; header intro +
JSON-LD untouched. Proof (moderail.txt): GameModeRail present + h1=1 + rail-fetch
present in all 3 pages.

## Gates
tsc 0 · check:routes 335 · em-dash clean.

## Deferred (flagged)
- name-all auto-start + mode rail: name-all-player is structurally different
  (inline conditional render, a plain startGame() function, roster variants), so
  its auto-start is riskier to do render-blind. Deferred to do carefully with the
  step 6 render check. Its interstitial is still live.
- this-or-that: already auto-starts (DuelGame renders the matchup directly) and
  ships its own in-game question picker (its mode switcher), so it is covered.
- Render verification of the rail + switching flow: step 6 sweep.
