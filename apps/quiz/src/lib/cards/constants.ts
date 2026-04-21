export const GROUPS = [
  { slug: 'bts', name: 'BTS', abbr: 'BTS', color: '#1a3a5a' },
  { slug: 'blackpink', name: 'BLACKPINK', abbr: 'BP', color: '#5a2a3a' },
  { slug: 'aespa', name: 'aespa', abbr: 'ae', color: '#2a2a4a' },
  { slug: 'stray-kids', name: 'Stray Kids', abbr: 'SKZ', color: '#0a3a2a' },
  { slug: 'newjeans', name: 'NewJeans', abbr: 'NJ', color: '#2a2a3a' },
] as const;

export const RARITY_CONFIG = {
  R: {
    label: 'R', order: 1, drop: '60%',
    color: '#4a4a6a',
    badgeBg: 'rgba(74,74,106,0.85)', badgeText: '#c0c0d0',
    glow: 'none', borderWidth: 2,
  },
  S: {
    label: 'S', order: 2, drop: '28%',
    color: '#9a7acc',
    badgeBg: 'rgba(154,122,204,0.85)', badgeText: '#f0e8ff',
    glow: 'rgba(154,122,204,0.3)', borderWidth: 2,
  },
  SS: {
    label: 'SS', order: 3, drop: '10%',
    color: '#c0a0e8',
    badgeBg: 'rgba(192,160,232,0.85)', badgeText: '#fff',
    glow: 'rgba(192,160,232,0.4)', borderWidth: 3,
  },
  SSS: {
    label: 'SSS', order: 4, drop: '2%',
    color: '#e8a060',
    badgeBg: 'rgba(232,160,96,0.9)', badgeText: '#fff',
    glow: 'rgba(232,160,96,0.5)', borderWidth: 3,
  },
} as const;

export type Rarity = keyof typeof RARITY_CONFIG;

export function getGroupMeta(slug: string) {
  return GROUPS.find(g => g.slug === slug) ?? { slug, name: slug, abbr: '?', color: '#2a2a2a' };
}
