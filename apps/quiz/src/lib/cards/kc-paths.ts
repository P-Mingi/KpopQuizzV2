// KpopCards: every address of the site in one place (bunnyverse.org/kpopcards, a site inside Bunnyverse). The pages, the top bar, the redirections
// from the old /cards addresses and the hub route map (lib/site/registry.ts CARDS_PATHS) all read it, so an address is spelled once.
export const KC = '/kpopcards';

/** The themes of "Choose your pack" and of /kpopcards/open/<theme>, in the order the shelf shows them. */
export const THEME_IDS = ['all', 'girls', 'boys', 'solo'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const kcPath = {
  lobby: KC,
  collection: `${KC}/collection`,
  group: (slug: string): string => `${KC}/collection/${encodeURIComponent(slug)}`,
  card: (num: string): string => `${KC}/c/${encodeURIComponent(num)}`,
  idol: (name: string): string => `${KC}/idol/${encodeURIComponent(name)}`,
  missions: `${KC}/missions`,
  ranking: `${KC}/ranking`,
  player: (nick: string): string => `${KC}/u/${encodeURIComponent(nick)}`,
  odds: `${KC}/odds`,
  help: `${KC}/help`,
  credits: `${KC}/help#credits`,
  report: `${KC}/report`,
  open: (theme: ThemeId | 'daily', packs: 1 | 5 = 1): string => `${KC}/open/${theme}${packs === 5 ? '?packs=5' : ''}`,
  focus: (group: string): string => `${KC}/open/focus/${encodeURIComponent(group)}`,
} as const;

/**
 * The route patterns of the hub for KpopCards (lib/site/registry.ts hubRouteAllow reads this). The old /cards tree is in too: its pages only
 * redirect (permanently) to the address above, so the old links and bookmarks keep working.
 */
export const KC_ROUTE_PATTERNS: readonly string[] = [
  KC, `${KC}/open/{theme}`, `${KC}/open/focus/{group}`, `${KC}/collection`, `${KC}/collection/{group}`, `${KC}/c/{num}`, `${KC}/idol/{name}`,
  `${KC}/missions`, `${KC}/ranking`, `${KC}/u/{nickname}`, `${KC}/odds`, `${KC}/help`, `${KC}/report`,
  '/cards', '/cards/**',
];

/** Where an old /cards path goes (permanent redirect). Unknown sub-paths go to the lobby. */
export function oldCardsTarget(segments: readonly string[]): string {
  const [a, b] = segments;
  if (!a) return KC;
  if (a === 'binder') return kcPath.collection;
  if (a === 'help') return kcPath.help;
  if (a === 'report') return kcPath.report;
  if (a === 'c' && b) return kcPath.card(b);
  return KC;
}
