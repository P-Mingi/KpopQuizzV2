// Run O1, lot (c), lane B6: the copy of the network layer on fandomverse.org/anime (copy-keys.md 3, namespace anime.b6). Placeholders
// are filled by lib/network/copy.ts: {brand} is the site name, {network} the network name, {level} the member's level.
export const COPY = {
  'footer.line': '{brand} is one of the fan quiz sites that share one account.',
  'footer.linkLabel': 'Meet the {network} network',
  'menu.heading': 'Your sites',
  'menu.passport': 'Your passport',
  'menu.level': 'Level {level}',
  'llms.networkLine': '{brand} is part of {network}, a network of fan quiz sites that share one account.',
} as const satisfies Readonly<Record<string, string>>;
