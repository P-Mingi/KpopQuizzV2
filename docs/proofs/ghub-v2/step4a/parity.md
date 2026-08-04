# G-HUB v2 step 4a - auto-start + last-played (3 registry games)

## Auto-start (interstitials die)
sort-it / match-up / name-them-all players: the `start` phase interstitial
("Start X" button, back link, duplicate h2 title) is replaced by a neutral
`.game-loading` state, and a mount effect calls begin()/start() once so the game
auto-starts (timer ready). Proof (autostart.txt): 0 Start-buttons, 1 mount
effect per player.

Hydration safety: SSR + the first client paint both render the loading state
(stable); the shuffled deck / board / input only render after the mount effect
flips to 'playing', so there is no SSR-vs-client mismatch.

## SEO copy preserved (law 1 + one-H1)
The variant PAGE ([slug]/page.tsx) is untouched: it still server-renders the
breadcrumb, `<h1 class="game-intro-h1">`, the intro paragraph, and the WebPage
JSON-LD ABOVE the player. Proof: game-intro-h1 count = 1 per variant page.
Removing the player's interstitial actually removes a second (h2) title that used
to duplicate the page H1, so heading structure is cleaner, not poorer. The
interstitial's "Back to Games" link is covered by the page breadcrumb's Games
link. No indexable text or link lost.

## Last-played memory
- Write: begin()/start() call writeLastPlayed(game, slug) (localStorage, guarded,
  no PII). src/lib/games/last-played.ts.
- Read: HubLastPlayed (client) upgrades each tagged hub Play link's href to the
  last-played variant on mount. The server-rendered Play href stays the DEFAULT
  variant (crawlable); the upgrade is progressive enhancement, so the hub's
  crawlable link set is unchanged (parity holds).

## Gates
tsc 0 · check:routes 335 · em-dash clean.

## Caveat
Auto-start + last-played are runtime/client behaviours. Machine gates are green
and the code is hydration-safe by construction, but a live render check is
deferred to the step 6 sweep (the other chat's dev server occupies this folder;
a worktree dev server would need its own port + env). In-game mode rail and the
name-all / this-or-that auto-start (this-or-that already auto-starts) are step 4b.
