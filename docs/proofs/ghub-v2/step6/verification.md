# G-HUB v2 step 6 - sweep + render verification

Ran against a dedicated worktree dev server on :3099 (env symlinked). Screenshots
are inline in the session (the in-app browser has no disk-capture path; same
constraint the prior worker flagged) and are documented here with measured state.

## Production build (build.txt)
`next build` EXIT 0. "Compiled successfully in 9.8s", "Generating static pages
(606/606) in 14.1s", zero errors. Every touched route builds: /games (o static,
ISR 1h), lobbies (o static), and the variant pages prerender as SSG (.):
/games/sort-it/[slug], /games/match-up/[slug], /games/name-them-all/[slug] each
list their real slugs. So the SERVER side of all the render-blind work (auto-
start pages, mode-rail sibling fetches, daily rotation, hub client islands) is
validated.

## Browser render (client-runtime + visual)
- Hub /games: renders faithfully to the prototype (header + "1 tap = playing"
  hint, TODAY rail with the blind-test CSS-art cover + streak + K-pop Idle
  coming-soon teaser, ALL GAMES grid of CSS-art photocard tiles with Play + "All
  modes . N"). No console errors (hydration clean).
- Variant /games/sort-it/boy-group-or-girl-group: AUTO-STARTS - the game is
  PLAYING (1/59, timer 0:15 running, "Wonder Girls" card), NO "Start sorting"
  interstitial. The in-game MODE RAIL shows 3 CSS-art cards with the current one
  ("Boy group or girl group? . 59 to sort") highlighted (aria-current). The
  server-rendered breadcrumb + H1 + intro sit above the game. No console errors.
- Collision fix proven: .gh2-play computed background = rgb(232,69,122) = --brand
  (my style wins, not the group-hub .ghub-play). Namespace fully de-collided.

## 375px probe
No horizontal overflow (scrollWidth 375 == viewport). hero + 6 tiles + today
present. Touch targets: .gh2-play 45px, .gh2-allmodes 44px (>= 44).

## Light + dark
Both render cleanly - UI colour is token-driven (dark: dark ground, light text,
brand pink kept), decorative CSS-art covers unaffected. Screenshots captured for
both.

## Known benign warning (NOT a regression)
React dev warning "Encountered a script tag while rendering React component" x2 =
the SEO JSON-LD <script type="application/ld+json"> blocks. Pre-existing (present
in the base 79577c4 hub) and correct: JSON-LD MUST be a <script> for crawlers;
React's client-exec warning does not apply. Kept as-is (ratchet + SEO invariant).

## Gates (final)
tsc 0 . check:routes 335 . build green . em-dash clean . collision resolved.
